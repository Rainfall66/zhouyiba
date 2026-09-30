/* 洲一把 · 界面与交互(纯静态单机版,双击 index.html 即玩)
 * ---------------------------------------------------------------
 * 逻辑(模式配置 / 判定 / 联想 / 卡池 / 存档键 / 每日一题 / 分享文案)全部在 core.js,
 * 本文件只负责渲染、事件、存档读写与弹窗。
 *
 * 玩法要点:
 * - 开始页先选模式(猜武器再选子模式,默认烽火地带),可勾选「每日一题」;
 * - 输入支持 名称 / 别名 / 全拼 / 首字母 联想,回车采纳当前高亮候选;
 * - 战绩按「模式 + 子模式」分桶存放,另有跨模式总计;最近目标按模式分键(1 小时内不重复);
 * - 对局中状态写入 sessionStorage,刷新或误退出后可从开始页「继续上一局」;
 * - 结束后可随时用顶栏「查看结算」重开结算弹窗,并可一键复制 Wordle 式战绩。
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var Z = typeof window !== 'undefined' && window.ZHOUYIBA;
  if (!Z) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[洲一把] core.js 未加载:请确认 index.html 中 core.js 在 app.js 之前。');
    }
    return;
  }

  var MODES = Z.MODES;
  var KEYS = Z.KEYS;
  var RECENT_LIMIT = 20;
  var SUGGESTION_LIMIT = 8;
  var PROJECT_URL = 'https://github.com/Rainfall66/zhouyiba';
  var SUB_MODE_LABELS = { ops: '烽火地带', warfare: '全面战场' };

  var state = {
    modeId: null, cfg: null, subModeId: null, pool: [],
    target: null, guesses: [], status: 'ready', portrait: '',
    daily: false, dayKey: null, lastResult: null,
  };
  /** 开始页的当前选择(与对局中的 state 分离,返回首页后保留) */
  var selection = { modeId: null, subModeId: null, daily: false };

  var $ = function (id) { return document.getElementById(id); };

  // ---------- 存档 ----------
  function readJSON(store, key) {
    try { return JSON.parse(store.getItem(key)); } catch (_) { return null; }
  }
  function writeJSON(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (_) { /* 无痕模式等场景静默降级 */ }
  }
  function localGet(key) { return readJSON(window.localStorage, key); }
  function localSet(key, value) { writeJSON(window.localStorage, key, value); }
  function sessionGet(key) { return readJSON(window.sessionStorage, key); }
  function sessionSet(key, value) { writeJSON(window.sessionStorage, key, value); }
  function sessionRemove(key) {
    try { window.sessionStorage.removeItem(key); } catch (_) { /* 忽略 */ }
  }

  // ---------- 战绩(分桶 + 总计) ----------
  function emptyStats() { return { wins: 0, losses: 0, streak: 0, bestStreak: 0 }; }

  function loadStats(key) {
    var raw = localGet(key) || {};
    var s = emptyStats();
    ['wins', 'losses', 'streak', 'bestStreak'].forEach(function (k) {
      var v = Number(raw[k]);
      s[k] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    });
    return s;
  }
  function saveStats(key, stats) { localSet(key, stats); }
  function applyResult(stats, result) {
    if (result === 'won') {
      stats.wins += 1;
      stats.streak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    } else {
      stats.losses += 1;
      stats.streak = 0;
    }
    return stats;
  }
  /** 记一场:分桶与总计各记一次(桶键 = operator / weapon:ops / weapon:warfare) */
  function recordResult(result) {
    var bucketKey = Z.statsKey(Z.statsBucket(state.cfg, state.subModeId));
    saveStats(bucketKey, applyResult(loadStats(bucketKey), result));
    saveStats(KEYS.stats, applyResult(loadStats(KEYS.stats), result));
  }
  function bucketStats() {
    return loadStats(Z.statsKey(Z.statsBucket(state.cfg, state.subModeId)));
  }
  function totalStats() { return loadStats(KEYS.stats); }

  function statsSummary(stats) {
    var games = stats.wins + stats.losses;
    var rate = games ? Math.round(stats.wins / games * 100) : 0;
    return '总场次 ' + games + ' · 胜 ' + stats.wins + ' · 负 ' + stats.losses
      + ' · 胜率 ' + rate + '% · 当前连胜 ' + stats.streak;
  }
  /** 结算页用:本模式一行、总计一行,避免同一句话重复两遍 */
  function bucketSummary(stats) {
    return '本模式 胜 ' + stats.wins + ' · 负 ' + stats.losses + ' · 连胜 ' + stats.streak;
  }
  function totalSummary(stats) {
    var games = stats.wins + stats.losses;
    var rate = games ? Math.round(stats.wins / games * 100) : 0;
    return '总计 ' + games + ' 场 · 胜率 ' + rate + '% · 最高连胜 ' + stats.bestStreak;
  }

  // ---------- 每日一题 ----------
  function loadDaily() { return localGet(KEYS.daily) || {}; }
  function dailyRecordKey() {
    return state.dayKey + '|' + Z.statsBucket(state.cfg, state.subModeId);
  }
  function recordDaily(result) {
    if (!state.daily) return;
    var all = loadDaily();
    all[dailyRecordKey()] = { result: result, guesses: state.guesses.length, t: Date.now() };
    localSet(KEYS.daily, all);
  }
  function todayRecords() {
    var all = loadDaily();
    var day = Z.dayKey();
    return Object.keys(all).filter(function (k) { return k.indexOf(day + '|') === 0; })
      .map(function (k) { return { bucket: k.split('|')[1], rec: all[k] }; });
  }

  // ---------- 最近目标(避免连续撞同一目标,仅随机模式) ----------
  function rememberRecent(cfg, subModeId, nickname) {
    var key = Z.recentKey(cfg, subModeId);
    var list = (localGet(key) || []).filter(function (item) { return item && item.n !== nickname; });
    list.push({ n: nickname, t: Date.now() });
    localSet(key, list.slice(-RECENT_LIMIT));
  }

  function pickRandomTarget(cfg, subModeId, pool) {
    var recent = {};
    Z.activeRecentNames(localGet(Z.recentKey(cfg, subModeId))).forEach(function (n) { recent[n] = true; });
    var candidates = pool.filter(function (c) { return !recent[c.nickname]; });
    if (!candidates.length) candidates = pool;
    var target = candidates[Math.floor(Math.random() * candidates.length)];
    rememberRecent(cfg, subModeId, target.nickname);
    return target;
  }

  // ---------- 对局续存(sessionStorage) ----------
  function saveSession() {
    if (state.status !== 'playing' || !state.target) { sessionRemove(KEYS.session); return; }
    sessionSet(KEYS.session, {
      modeId: state.modeId,
      subModeId: state.subModeId,
      daily: state.daily,
      dayKey: state.dayKey,
      target: state.target.nickname,
      guesses: state.guesses.map(function (row) { return row.nickname; }),
      status: 'playing',
      ts: Date.now(),
    });
  }
  function readSession() {
    var raw = sessionGet(KEYS.session);
    if (!raw || raw.status !== 'playing' || !raw.modeId || !Array.isArray(raw.guesses)) return null;
    var cfg = MODES[raw.modeId];
    if (!cfg) return null;
    var subModeId = raw.subModeId || null;
    var pool = Z.getPool(cfg, subModeId);
    var target = Z.findItem(pool, raw.target);
    if (!target) return null;
    return {
      modeId: raw.modeId, subModeId: subModeId, daily: !!raw.daily,
      dayKey: raw.dayKey || null, target: target, guesses: raw.guesses,
    };
  }

  // ---------- 提示 ----------
  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // ---------- 弹窗(焦点管理 + Tab 圈闭) ----------
  var dialogStack = [];
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function openDialog(overlay, initialFocus) {
    if (dialogStack.some(function (d) { return d.overlay === overlay; })) return;
    overlay.classList.add('show');
    dialogStack.push({ overlay: overlay, previous: document.activeElement });
    var target = initialFocus || overlay.querySelector(FOCUSABLE);
    if (target && target.focus) target.focus();
  }
  function closeDialog(overlay) {
    overlay.classList.remove('show');
    for (var i = dialogStack.length - 1; i >= 0; i--) {
      if (dialogStack[i].overlay === overlay) {
        var entry = dialogStack.splice(i, 1)[0];
        if (entry.previous && entry.previous.focus && document.contains(entry.previous)) entry.previous.focus();
        return;
      }
    }
  }
  function isOpen(overlay) { return overlay.classList.contains('show'); }
  function topDialog() { return dialogStack[dialogStack.length - 1] || null; }

  function trapTab(event) {
    var top = topDialog();
    if (!top) return false;
    var nodes = Array.prototype.filter.call(top.overlay.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
    if (!nodes.length) return false;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return true; }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); return true; }
    return false;
  }

  // ---------- 棋盘渲染 ----------
  function cellHtml(attr) {
    if (!attr) return '<td class="wrong">-</td>';
    var arrow = attr.hint && attr.level !== 'correct'
      ? '<span class="dir">' + (attr.hint === 'higher' ? '&#9650;' : '&#9660;') + '</span>'
      : '';
    var raw = String(attr.value === undefined || attr.value === null ? '' : attr.value);
    var display = (raw === '') ? '-' : raw;
    var title = attr.level === 'wrong' && display === '-' ? ' title="未知:数据未收录"' : '';
    return '<td class="' + attr.level + '"' + title + '>' + escapeHtml(display) + arrow + '</td>';
  }

  /** 动态表头:列随模式变化 */
  function renderBoardHead() {
    var cfg = state.cfg;
    var thead = $('board-head');
    thead.innerHTML = '';
    var tr = document.createElement('tr');
    var nameTh = document.createElement('th');
    nameTh.scope = 'col';
    nameTh.textContent = cfg.nameLabel;
    tr.appendChild(nameTh);
    cfg.columns.forEach(function (col) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = col.label;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    var board = $('board');
    board.setAttribute('data-mode', state.modeId);
    board.setAttribute('data-submode', state.subModeId || '');
    $('board-caption').textContent = cfg.label + '猜测记录:列为 '
      + [cfg.nameLabel].concat(cfg.columns.map(function (c) { return c.label; })).join(' / ');
  }

  function renderBoard() {
    var tbody = $('board-body');
    tbody.innerHTML = '';
    state.guesses.forEach(function (row, index) {
      var tr = document.createElement('tr');
      var classes = [];
      if (index === state.guesses.length - 1) classes.push('row-latest');
      if (row.correct) classes.push('row-correct');
      if (classes.length) tr.className = classes.join(' ');
      var avatarHtml = row.avatar
        ? '<img class="row-avatar" src="' + escapeHtml(row.avatar) + '" alt="" loading="lazy" />'
        : '';
      tr.innerHTML = '<td class="name' + (row.correct ? ' correct' : '') + '">' + avatarHtml
        + escapeHtml(row.nickname) + '</td>' + row.cells.map(cellHtml).join('');
      tbody.appendChild(tr);
    });
    renderProgress();
  }

  function renderProgress() {
    var total = state.cfg.maxGuesses;
    var dots = '';
    for (var i = 0; i < total; i++) {
      dots += '<i' + (i < state.guesses.length ? ' class="used"' : '') + '></i>';
    }
    var el = $('progress');
    el.innerHTML = dots;
    el.setAttribute('aria-label', '已猜 ' + state.guesses.length + ' / ' + total + ' 次');
  }

  /** 状态行:模式说明 + 剩余次数 + 未知数值提示 + 每日一题标记 */
  function renderStatus() {
    var cfg = state.cfg;
    if (!cfg) return;
    var text;
    if (state.status === 'finished') {
      text = '本局结束 · 共猜 ' + state.guesses.length + ' 次';
    } else if (state.guesses.length) {
      text = '已猜 ' + state.guesses.length + ' / ' + cfg.maxGuesses + ' 次,还剩 '
        + (cfg.maxGuesses - state.guesses.length) + ' 次机会';
    } else {
      text = cfg.statusStart.replace('{n}', cfg.maxGuesses);
    }
    var notes = [];
    if (state.daily && state.dayKey) notes.push('每日一题 ' + state.dayKey);
    if (cfg.unknownHint) {
      var unknown = Z.countUnknown(cfg, state.pool, '伤害', state.subModeId);
      if (unknown) notes.push(cfg.unknownHint('伤害', unknown));
    }
    $('status-text').textContent = text + (notes.length ? ' · ' + notes.join(' · ') : '');
  }

  // ---------- 对局流程 ----------
  function subModeLabel(subModeId) {
    return SUB_MODE_LABELS[subModeId] || '';
  }
  function modeLabel() {
    var cfg = state.cfg;
    if (!cfg) return '';
    return cfg.label + (cfg.subModes && state.subModeId ? ' · ' + subModeLabel(state.subModeId) : '');
  }

  function makeRow(item) {
    var row = Z.compare(item, state.target, state.cfg, state.subModeId);
    row.avatar = item.avatar || '';
    row.guessedAt = Date.now();
    return row;
  }

  function startGame(modeId, subModeId, options) {
    var cfg = MODES[modeId];
    if (!cfg) return;
    var opts = options || {};
    var sub = subModeId || null;
    var pool = Z.getPool(cfg, sub);
    if (!pool.length) { toast(cfg.emptyHint); return; }

    state.modeId = modeId;
    state.cfg = cfg;
    state.subModeId = sub;
    state.pool = pool;
    state.daily = !!opts.daily;
    state.dayKey = state.daily ? (opts.dayKey || Z.dayKey()) : null;
    state.lastResult = null;
    state.status = 'playing';

    if (opts.target) {
      state.target = opts.target;
    } else if (state.daily) {
      state.target = Z.dailyTarget(pool, Z.dailySeed(state.dayKey, cfg, sub));
    } else {
      state.target = pickRandomTarget(cfg, sub, pool);
    }
    if (!state.target) { toast(cfg.emptyHint); return; }

    state.guesses = [];
    state.portrait = Z.pickPortrait(state.target);
    (opts.restored || []).forEach(function (name) {
      var item = Z.findItem(pool, name);
      if (item) state.guesses.push(makeRow(item));
    });

    var label = modeLabel() + (state.daily ? ' · 每日一题' : '');
    $('mode-tag').textContent = label;
    $('mode-tag-mobile').textContent = label;
    renderBoardHead();
    $('guess-input').value = '';
    closeSuggestions();
    renderBoard();
    $('guess-input').placeholder = cfg.inputPlaceholder;
    $('guess-input').disabled = false;
    $('guess-submit').disabled = false;
    $('result-btn').classList.add('hidden');
    $('giveup-btn').disabled = false;
    $('start-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');

    if (state.guesses.some(function (row) { return row.correct; })) {
      finish('won');
      return;
    }
    if (state.guesses.length >= cfg.maxGuesses) {
      finish('lost');
      return;
    }
    renderStatus();
    saveSession();
    $('guess-input').focus();
  }

  function backToStart() {
    $('game-screen').classList.add('hidden');
    $('start-screen').classList.remove('hidden');
    refreshCounts();
    refreshStartStats();
    refreshDailyState();
    refreshResume();
  }

  function submitGuess(item) {
    if (!item || state.status !== 'playing') return;
    if (state.guesses.some(function (g) { return g.nickname === item.nickname; })) {
      toast('已经猜过这个了');
      return;
    }
    state.guesses.push(makeRow(item));
    renderBoard();
    var last = state.guesses[state.guesses.length - 1];
    if (last.correct) { finish('won'); return; }
    if (state.guesses.length >= state.cfg.maxGuesses) { finish('lost'); return; }
    $('guess-input').value = '';
    closeSuggestions();
    renderStatus();
    saveSession();
    $('guess-input').focus();
  }

  function finish(result) {
    state.status = 'finished';
    state.lastResult = result;
    $('guess-input').disabled = true;
    $('guess-submit').disabled = true;
    $('giveup-btn').disabled = true;
    $('result-btn').classList.remove('hidden');
    recordResult(result);
    recordDaily(result);
    sessionRemove(KEYS.session);
    renderStatus();
    showResult(result);
  }

  function row2(label, value) {
    return '<tr><td class="label">' + escapeHtml(label) + '</td><td>' + escapeHtml(value || '-') + '</td></tr>';
  }

  function showResult(result) {
    var t = state.target;
    var cfg = state.cfg;
    $('result-title').textContent = result === 'won' ? '恭喜,猜对了!' : '很遗憾,未能猜中';
    $('result-tone').className = 'overlay-card ' + (result === 'won' ? 'win' : 'lose');
    $('result-name').textContent = t.nickname;
    $('result-stats').textContent = bucketSummary(bucketStats()) + ' · ' + totalSummary(totalStats())
      + (state.daily ? ' · 每日一题 ' + state.dayKey : '');
    var html = '';
    cfg.resultBasicRows(t, state.subModeId).forEach(function (pair) { html += row2(pair[0], pair[1]); });
    cfg.resultRows(t).forEach(function (pair) { html += row2(pair[0], pair[1]); });
    $('result-info').innerHTML = html;
    var portrait = $('result-portrait');
    var portraitWrap = $('result-portrait-wrap');
    // 武器只有 2:1 横版图标,单独一个样式类;干员用立绘
    portrait.className = state.modeId === 'weapon' ? 'result-portrait result-portrait-weapon' : 'result-portrait';
    if (state.portrait) {
      portrait.src = state.portrait;
      portraitWrap.classList.remove('hidden');
    } else {
      portrait.removeAttribute('src');
      portraitWrap.classList.add('hidden');
    }
    $('again-btn').textContent = state.daily ? '随机再来一把' : '再来一把';
    openDialog($('result-overlay'), $('again-btn'));
  }

  function hideResult() { closeDialog($('result-overlay')); }

  // ---------- 分享 ----------
  function buildShare() {
    return Z.buildShareText({
      modeLabel: modeLabel() + (state.daily && state.dayKey ? ' · ' + state.dayKey : ''),
      daily: state.daily,
      result: state.lastResult,
      guesses: state.guesses,
      maxGuesses: state.cfg ? state.cfg.maxGuesses : 0,
      url: PROJECT_URL,
    });
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'sr-only';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (_) { return false; }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  // ---------- 输入补全 ----------
  var suggestions = [];
  var activeIndex = -1;

  function closeSuggestions() {
    suggestions = [];
    activeIndex = -1;
    var list = $('suggestions');
    list.innerHTML = '';
    list.classList.remove('open');
    var input = $('guess-input');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function syncActiveDescendant() {
    var input = $('guess-input');
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      input.setAttribute('aria-activedescendant', 'sug-' + activeIndex);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function setActive(index) {
    var items = $('suggestions').children;
    if (!items.length) return;
    activeIndex = (index + items.length) % items.length;
    for (var i = 0; i < items.length; i++) {
      var on = i === activeIndex;
      items[i].classList.toggle('active', on);
      items[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    syncActiveDescendant();
    $('guess-input').value = suggestions[activeIndex].nickname;
  }

  function updateSuggestions() {
    var input = $('guess-input');
    var list = $('suggestions');
    if (state.status !== 'playing') { closeSuggestions(); return; }
    var q = input.value.trim();
    // 名称 / 别名 / 全拼 / 首字母都能联想;只给候选,不自动提交
    suggestions = q ? Z.searchItems(state.pool, q, SUGGESTION_LIMIT) : [];
    list.innerHTML = '';
    if (!suggestions.length) { closeSuggestions(); return; }
    suggestions.forEach(function (c, index) {
      var li = document.createElement('li');
      li.id = 'sug-' + index;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      li.className = index === 0 ? 'active' : '';
      if (c.avatar) {
        var thumb = document.createElement('img');
        // 武器图标是 2:1 横版图,用单独的样式(contain,不裁切)
        thumb.className = state.modeId === 'weapon' ? 'sug-avatar sug-avatar-weapon' : 'sug-avatar';
        thumb.src = c.avatar;
        thumb.alt = '';
        thumb.loading = 'lazy';
        li.appendChild(thumb);
      }
      li.appendChild(document.createTextNode(c.nickname));
      // pointerdown + preventDefault:避免 iOS 上 blur 竞态导致「点了候选没反应」
      li.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        acceptSuggestion(index);
      });
      list.appendChild(li);
    });
    list.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    activeIndex = 0;
    syncActiveDescendant();
  }

  /** 点选候选:填入输入框并直接提交 */
  function acceptSuggestion(index) {
    var item = suggestions[index];
    if (!item) return;
    $('guess-input').value = item.nickname;
    closeSuggestions();
    submitGuess(item);
  }

  // ---------- 规则弹窗 ----------
  function toggleRules(show) {
    var overlay = $('rules-overlay');
    if (!show) { closeDialog(overlay); return; }
    // 对局中只显示当前模式的规则;开始页(或已返回首页)两块都显示,便于新玩家通读
    var inGame = !$('game-screen').classList.contains('hidden');
    document.querySelectorAll('.rules-mode').forEach(function (el) {
      el.hidden = !!(inGame && el.getAttribute('data-mode') !== state.modeId);
    });
    openDialog(overlay, $('rules-close'));
  }

  // ---------- 开始页 ----------
  function updateStartBtn() {
    var btn = $('start-btn');
    var daily = selection.daily ? '(每日一题)' : '';
    if (selection.modeId === 'operator') {
      btn.disabled = false;
      btn.textContent = '开始游戏 · 猜干员' + daily;
    } else if (selection.modeId === 'weapon' && selection.subModeId) {
      btn.disabled = false;
      btn.textContent = '开始游戏 · ' + subModeLabel(selection.subModeId) + daily;
    } else {
      btn.disabled = true;
      btn.textContent = '请先选择模式';
    }
  }

  function selectMode(modeId) {
    selection.modeId = modeId;
    if (modeId !== 'weapon') selection.subModeId = null;
    var isOperator = modeId === 'operator';
    var isWeapon = modeId === 'weapon';
    $('card-operator').classList.toggle('selected', isOperator);
    $('card-weapon').classList.toggle('selected', isWeapon);
    $('mode-operator').setAttribute('aria-pressed', isOperator ? 'true' : 'false');
    $('mode-weapon').setAttribute('aria-pressed', isWeapon ? 'true' : 'false');
    $('mode-weapon-ops').disabled = !isWeapon;
    $('mode-weapon-warfare').disabled = !isWeapon;
    if (isWeapon && !selection.subModeId) selectSubMode('ops'); // 选中猜武器时默认烽火地带
    if (!isWeapon) $('weapon-submode').setAttribute('aria-disabled', 'true');
    else $('weapon-submode').removeAttribute('aria-disabled');
    updateStartBtn();
  }

  function selectSubMode(subId) {
    selection.subModeId = subId;
    [['mode-weapon-ops', 'ops'], ['mode-weapon-warfare', 'warfare']].forEach(function (pair) {
      var el = $(pair[0]);
      var on = subId === pair[1];
      el.classList.toggle('selected', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
      el.tabIndex = on ? 0 : -1;
    });
    updateStartBtn();
  }

  /** 开始页两张模式卡上的收录数/待填充提示 */
  function refreshCounts() {
    var opPool = Z.getPool(MODES.operator);
    $('operator-count').textContent = MODES.operator.countText(opPool);
    var opDb = Z.getDB(MODES.operator.dbKey);
    if (opDb.length && !opPool.length) $('operator-count').textContent = '数据全部为「仅存档」';
    var weaponDb = Z.getDB(MODES.weapon.dbKey);
    if (weaponDb.length) {
      var opsPool = Z.getPool(MODES.weapon, 'ops');
      var wfPool = Z.getPool(MODES.weapon, 'warfare');
      var unknown = Z.countUnknown(MODES.weapon, wfPool, '伤害', 'warfare');
      $('weapon-count').textContent = '烽火地带 ' + opsPool.length + ' 把 · 全面战场 ' + wfPool.length + ' 把'
        + (unknown ? '(其中 ' + unknown + ' 把战场伤害未收录)' : '');
    } else {
      $('weapon-count').textContent = '武器数据待填充';
    }
  }

  function refreshStartStats() {
    var stats = totalStats();
    var games = stats.wins + stats.losses;
    var el = $('start-stats');
    if (!games) {
      el.textContent = '还没有战绩,来一把?';
      $('stats-reset').classList.add('hidden');
      return;
    }
    el.textContent = statsSummary(stats) + ' · 最高连胜 ' + stats.bestStreak;
    $('stats-reset').classList.remove('hidden');
  }

  function refreshDailyState() {
    $('daily-toggle').checked = selection.daily;
    var records = todayRecords();
    var text = '同一天所有玩家抽到同一目标';
    if (records.length) {
      text += ' · 今日已答:' + records.map(function (r) {
        var label = r.bucket === 'operator' ? '猜干员'
          : r.bucket === 'weapon:ops' ? '武器·烽火' : '武器·战场';
        return label + (r.rec.result === 'won' ? ' ✓' : ' ✗');
      }).join(' / ');
    }
    var small = document.querySelector('.daily-toggle small');
    if (small) small.textContent = text;
  }

  function refreshResume() {
    var session = readSession();
    var btn = $('resume-btn');
    if (!session) { btn.classList.add('hidden'); return; }
    var cfg = MODES[session.modeId];
    var label = cfg.label + (cfg.subModes && session.subModeId ? ' · ' + subModeLabel(session.subModeId) : '');
    btn.textContent = '继续上一局(' + label + ' · 已猜 ' + session.guesses.length + '/' + cfg.maxGuesses + ')';
    btn.classList.remove('hidden');
  }

  // ---------- 事件绑定 ----------
  function bind() {
    $('mode-operator').addEventListener('click', function () { selectMode('operator'); });
    $('mode-weapon').addEventListener('click', function () { selectMode('weapon'); });
    $('mode-weapon-ops').addEventListener('click', function () { selectSubMode('ops'); });
    $('mode-weapon-warfare').addEventListener('click', function () { selectSubMode('warfare'); });
    // 子模式是 radiogroup:方向键在两项间切换
    $('weapon-submode').addEventListener('keydown', function (event) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(event.key) === -1) return;
      if (selection.modeId !== 'weapon') return;
      event.preventDefault();
      var next = selection.subModeId === 'warfare' ? 'ops' : 'warfare';
      selectSubMode(next);
      $(next === 'ops' ? 'mode-weapon-ops' : 'mode-weapon-warfare').focus();
    });
    $('daily-toggle').addEventListener('change', function () {
      selection.daily = $('daily-toggle').checked;
      updateStartBtn();
    });
    $('start-btn').addEventListener('click', function () {
      if (!selection.modeId) return;
      startGame(selection.modeId, selection.modeId === 'weapon' ? selection.subModeId : null,
        { daily: selection.daily });
    });
    $('resume-btn').addEventListener('click', function () {
      var session = readSession();
      if (!session) { toast('没有可继续的对局'); refreshResume(); return; }
      startGame(session.modeId, session.subModeId, {
        daily: session.daily, dayKey: session.dayKey, target: session.target, restored: session.guesses,
      });
    });
    $('stats-reset').addEventListener('click', function () {
      if (!confirm('清零全部战绩(含各模式分桶与每日一题记录),确定吗?')) return;
      saveStats(KEYS.stats, emptyStats());
      ['operator', 'weapon:ops', 'weapon:warfare'].forEach(function (bucket) {
        saveStats(Z.statsKey(bucket), emptyStats());
      });
      localSet(KEYS.daily, {});
      refreshStartStats();
      refreshDailyState();
      toast('战绩已清零');
    });
    $('back-btn').addEventListener('click', function () {
      if (state.status === 'playing' && !confirm('返回首页将结束本局,确定吗?')) return;
      state.status = 'ready';
      backToStart();
    });
    $('restart-btn').addEventListener('click', function () {
      if (state.status === 'playing' && !confirm('重新开始将清除本局进度,确定吗?')) return;
      startGame(state.modeId, state.subModeId, { daily: state.daily });
    });
    $('again-btn').addEventListener('click', function () {
      var wasDaily = state.daily;
      hideResult();
      if (wasDaily) { selection.daily = false; $('daily-toggle').checked = false; updateStartBtn(); }
      startGame(state.modeId, state.subModeId, { daily: false });
    });
    $('view-btn').addEventListener('click', hideResult);
    $('result-btn').addEventListener('click', function () {
      if (state.lastResult && state.status === 'finished') showResult(state.lastResult);
    });
    $('share-btn').addEventListener('click', function () {
      if (!state.lastResult) return;
      copyText(buildShare()).then(function (ok) {
        toast(ok ? '战绩已复制,去粘贴分享吧' : '复制失败,请手动截图分享');
      });
    });
    $('giveup-btn').addEventListener('click', function () {
      if (state.status !== 'playing') return;
      if (!confirm('查看答案将按失败结束本局,确定吗?')) return;
      finish('lost');
    });
    $('rules-trigger').addEventListener('click', function () { toggleRules(true); });
    $('rules-trigger-game').addEventListener('click', function () { toggleRules(true); });
    $('rules-close').addEventListener('click', function () { toggleRules(false); });
    $('rules-overlay').addEventListener('mousedown', function (event) {
      if (event.target === $('rules-overlay')) toggleRules(false);
    });
    $('result-overlay').addEventListener('mousedown', function (event) {
      if (event.target === $('result-overlay')) hideResult();
    });
    // 立绘加载失败时收起图片区,避免出现破图
    $('result-portrait').addEventListener('error', function () {
      $('result-portrait-wrap').classList.add('hidden');
    });
    // 棋盘与候选里的头像加载失败即移除(事件委托,避免内联 onerror,便于将来加 CSP)
    document.addEventListener('error', function (event) {
      var el = event.target;
      if (el && el.tagName === 'IMG' && (el.classList.contains('row-avatar') || el.classList.contains('sug-avatar'))) {
        el.remove();
      }
    }, true);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Tab' && trapTab(event)) return;
      if (event.key !== 'Escape') return;
      var top = topDialog();
      if (top) closeDialog(top.overlay);
    });

    var input = $('guess-input');
    // 手动提交:输入必须与某个名称/别名一致,或采纳当前高亮候选
    function submitFromInput() {
      if (state.status !== 'playing') return;
      var q = input.value.trim();
      if (!q) { toast('请输入名称'); return; }
      var item = Z.findItem(state.pool, q);
      if (!item && activeIndex >= 0 && suggestions[activeIndex]) {
        // 回车采纳高亮候选:拼音、首字母、部分输入都能直接提交
        item = suggestions[activeIndex];
      }
      if (!item) {
        toast('没有匹配的条目,输入拼音/首字母后请点选候选或直接回车');
        return;
      }
      input.value = item.nickname;
      closeSuggestions();
      submitGuess(item);
    }

    $('guess-submit').addEventListener('click', submitFromInput);
    input.addEventListener('input', updateSuggestions);
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitFromInput();
      } else if (event.key === 'ArrowDown' && suggestions.length) {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp' && suggestions.length) {
        event.preventDefault();
        setActive(activeIndex - 1);
      } else if (event.key === 'Tab' && suggestions.length) {
        event.preventDefault();
        $('guess-input').value = suggestions[activeIndex >= 0 ? activeIndex : 0].nickname;
        updateSuggestions();
      }
    });
    // 点击输入区以外关闭候选(不再依赖 blur 定时器)
    document.addEventListener('pointerdown', function (event) {
      var dock = document.querySelector('.input-dock');
      if (dock && !dock.contains(event.target)) closeSuggestions();
    });
  }

  bind();
  refreshCounts();
  refreshStartStats();
  refreshDailyState();
  refreshResume();
  updateStartBtn();

  // ---------- 手机端优化:输入框聚焦 = 键盘弹起 ----------
  var gameScreenEl = $('game-screen');
  var guessInputEl = $('guess-input');
  function syncKeyboardActive() {
    if (gameScreenEl) {
      gameScreenEl.classList.toggle('keyboard-active', document.activeElement === guessInputEl);
    }
  }
  if (guessInputEl) {
    guessInputEl.addEventListener('focus', syncKeyboardActive);
    guessInputEl.addEventListener('blur', syncKeyboardActive);
  }
  // 视觉视口高度(移动端键盘弹起时输入坞贴底)
  function syncViewportHeight() {
    var vh = window.visualViewport && window.visualViewport.height;
    if (vh) document.documentElement.style.setProperty('--visual-viewport-height', Math.round(vh) + 'px');
  }
  syncViewportHeight();
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncViewportHeight);

  // 供调试与冒烟测试使用(不影响游戏逻辑)
  window.ZHOUYIBA_UI = {
    state: state,
    selection: selection,
    startGame: startGame,
    submitGuess: submitGuess,
    finish: finish,
    buildShare: buildShare,
  };
})();
