/* 洲一把 · 三角洲行动猜测游戏 · 纯静态单机版(无后端,双击 index.html 即玩)
 * ---------------------------------------------------------------
 * 双模式架构:
 * - 猜干员(operators.js):阵营 / 职业 / 性别 精确,身高(±3) / 年龄(±1) 数值判定;
 *   登场赛季 / 称号不上棋盘,只在结算页展示。
 * - 猜武器(weapons.js):分「烽火地带」「全面战场」两个子模式卡池;
 *   类型 / 口径 精确,射击模式 集合重叠,伤害(±2) / 射速(±30) / 弹匣(±5) 数值判定;
 *   伤害默认取「伤害」字段(烽火地带口径),全面战场若数值不同则读「战场伤害」。
 *
 * 输入联想:
 * - 支持 名称 / 别名 / 全拼 / 首字母缩写 模糊搜索;
 * - 联想只提供候选项,**不参与提交判定**:按回车不会把拼音当成有效猜测,
 *   必须点选候选项(或输入完整名称)后手动提交。
 *
 * 空白守卫:某个模式的数据库为空时,开始该模式只弹提示,不会白屏或报错。
 *
 * 数据库: window.ZHOUYIBA_OPERATORS (operators.js) / window.ZHOUYIBA_WEAPONS (weapons.js)
 */
(function () {
  'use strict';

  var ZHOUYIBA = {};

  // ---------- 纯逻辑(可被 node 测试) ----------
  var MAX_GUESSES = 6;

  /** 模式配置:棋盘列 / 卡池 / 文案都由这里驱动,增删列只需改配置 + style.css 列宽 */
  var MODES = {
    operator: {
      id: 'operator',
      label: '猜干员',
      dbKey: 'ZHOUYIBA_OPERATORS',
      fileHint: 'operators.js',
      maxGuesses: 6,
      recentKey: 'zhou-yiba:recent:operator',
      nameLabel: '干员名',
      inputPlaceholder: '输入干员名...',
      statusStart: '输入干员名开始猜测,共 {n} 次机会',
      emptyHint: '干员数据库为空:请先在 operators.js 中录入干员数据',
      countText: function (pool) {
        return pool.length ? '已收录 ' + pool.length + ' 名干员' : '干员数据待填充';
      },
      columns: [
        { key: '阵营', label: '阵营', type: 'exact' },
        { key: '职业', label: '职业', type: 'exact' },
        { key: '性别', label: '性别', type: 'exact' },
        { key: '身高', label: '身高', type: 'numeric', close: 3 },
        { key: '年龄', label: '年龄', type: 'numeric', close: 1 },
      ],
      /** 结算页附加信息行(不上棋盘的属性都放这里) */
      resultRows: function (t) {
        return [
          ['登场赛季', t['登场赛季']],
          ['身高', t['身高'] != null && t['身高'] !== '' ? t['身高'] + 'cm' : ''],
          ['年龄', t['年龄'] != null && t['年龄'] !== '' ? t['年龄'] + '岁' : ''],
          ['本名', t['本名']],
          ['称号', t['称号']],
          ['备注', t['备注']],
        ];
      },
      resultBasicRows: function (t) {
        return [['阵营', t['阵营']], ['职业', t['职业']], ['性别', t['性别']]];
      },
    },
    weapon: {
      id: 'weapon',
      label: '猜武器',
      dbKey: 'ZHOUYIBA_WEAPONS',
      fileHint: 'weapons.js',
      maxGuesses: 8,
      recentKey: 'zhou-yiba:recent:weapon',
      nameLabel: '武器名',
      inputPlaceholder: '输入武器名...',
      statusStart: '输入武器名开始猜测,共 {n} 次机会',
      emptyHint: '武器数据库为空:请先在 weapons.js 中录入武器数据',
      subModes: [
        { id: 'ops', label: '烽火地带' },
        { id: 'warfare', label: '全面战场' },
      ],
      countText: function (pool) {
        return pool.length ? '已收录 ' + pool.length + ' 把武器' : '武器数据待填充';
      },
      columns: [
        { key: '类型', label: '类型', type: 'exact' },
        { key: '口径', label: '口径', type: 'exact' },
        { key: '射击模式', label: '射击模式', type: 'overlap' },
        {
          key: '伤害', label: '伤害', type: 'numeric', close: 2, perMode: true,
          // 霰弹枪显示「单弹丸×弹丸数」,比对仍按总伤(伤害字段)
          displayValue: function (item) { return item['伤害明细'] || null; },
        },
        { key: '射速', label: '射速', type: 'numeric', close: 30 },
        { key: '弹匣', label: '弹匣', type: 'numeric', close: 5 },
      ],
      /** 数值取值:伤害在全面战场下优先读「战场伤害」(缺省视为与烽火地带相同) */
      resolveValue: function (item, key, subModeId) {
        if (key === '伤害' && subModeId === 'warfare' && item['战场伤害'] != null && item['战场伤害'] !== '') {
          return item['战场伤害'];
        }
        return item[key];
      },
      resultRows: function (t) {
        return [
          ['口径', t['口径']],
          ['弹匣', t['弹匣'] != null && t['弹匣'] !== '' ? t['弹匣'] + ' 发' : ''],
          ['有效射程', t['有效射程'] != null && t['有效射程'] !== '' ? t['有效射程'] + 'm' : ''],
          ['备注', t['备注']],
        ];
      },
      resultBasicRows: function (t, subModeId) {
        var dmg = subModeId === 'warfare' && t['战场伤害'] != null && t['战场伤害'] !== '' ? t['战场伤害'] : t['伤害'];
        var dmgText = t['伤害明细'] ? t['伤害明细'] + '(总伤 ' + dmg + ')' : dmg;
        var rows = [
          ['类型', t['类型']],
          ['射击模式', toList(t['射击模式']).join(' / ')],
          ['伤害(当前模式)', dmgText],
          ['射速', t['射速'] != null && t['射速'] !== '' ? t['射速'] + ' RPM' : ''],
        ];
        var scope = t['模式'] || '通用';
        if (scope !== '通用') rows.push(['可用模式', scope]);
        return rows;
      },
    },
  };

  /** 精确匹配:两边都有值且一致 = 绿,否则灰(空值视为未知) */
  function exactAttr(guessValue, targetValue) {
    var g = String(guessValue == null ? '' : guessValue).trim();
    var t = String(targetValue == null ? '' : targetValue).trim();
    if (!g || !t) return { value: g, level: 'wrong' };
    return { value: g, level: g === t ? 'correct' : 'wrong' };
  }

  /** 数值匹配:相同 = 绿;相差 ≤ close = 黄 + ▲▼ 方向箭头;否则灰(任一方空值 = 未知) */
  function numericAttr(guessValue, targetValue, close) {
    var g = Number(guessValue);
    if (guessValue === '' || guessValue === null || guessValue === undefined || !Number.isFinite(g)) {
      return { value: guessValue == null ? '' : String(guessValue), level: 'wrong' };
    }
    // 注意 Number(null) === 0,空目标值必须先拦下,否则会得出「答案=0」的错误箭头
    if (targetValue === '' || targetValue === null || targetValue === undefined || !Number.isFinite(Number(targetValue))) {
      return { value: guessValue, level: 'wrong' };
    }
    var t = Number(targetValue);
    if (g === t) return { value: guessValue, level: 'correct' };
    var level = Math.abs(g - t) <= close ? 'close' : 'wrong';
    return { value: guessValue, level: level, hint: t > g ? 'higher' : 'lower' };
  }

  /** 把属性值统一成「字符串数组」:字符串按空白/、/,/|/· 拆分,数组原样。 */
  function toList(value) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map(function (v) { return String(v).trim(); }).filter(Boolean);
    }
    return String(value)
      .split(/[\s、,，/|·]+/)
      .map(function (v) { return v.trim(); })
      .filter(Boolean);
  }

  /** 集合匹配:完全相同 = 绿;有共同项 = 黄;否则灰(空值 = 未知)。 */
  function overlapAttr(guessValue, targetValue) {
    var g = toList(guessValue);
    var t = toList(targetValue);
    var display = g.join(' / ');
    if (!g.length || !t.length) return { value: display, level: 'wrong' };
    var same =
      g.length === t.length &&
      g.every(function (v) { return t.indexOf(v) !== -1; });
    if (same) return { value: display, level: 'correct' };
    var tSet = {};
    t.forEach(function (v) { tSet[v] = true; });
    var hit = g.filter(function (v) { return tSet[v]; });
    if (hit.length) return { value: display, level: 'close' };
    return { value: display, level: 'wrong' };
  }

  /** 单元格判定分派 */
  function cellAttr(col, guessValue, targetValue) {
    if (col.type === 'numeric') return numericAttr(guessValue, targetValue, col.close);
    if (col.type === 'overlap') return overlapAttr(guessValue, targetValue);
    return exactAttr(guessValue, targetValue);
  }

  /** 逐属性对比:cfg = 模式配置,subModeId = 武器子模式(其他模式传 null)。
   *  返回 { nickname, correct, cells }。
   *  列可带 displayValue(item):面板显示值与比对值分离(如霰弹枪显示「14×8」、按总伤比对)。 */
  function compare(guess, target, cfg, subModeId) {
    var cells = cfg.columns.map(function (col) {
      var guessValue = cfg.resolveValue ? cfg.resolveValue(guess, col.key, subModeId) : guess[col.key];
      var targetValue = cfg.resolveValue ? cfg.resolveValue(target, col.key, subModeId) : target[col.key];
      var attr = cellAttr(col, guessValue, targetValue);
      if (col.displayValue) {
        var dv = col.displayValue(guess, subModeId);
        if (dv != null && dv !== '') {
          attr = { value: dv, level: attr.level, hint: attr.hint };
        }
      }
      return attr;
    });
    return {
      nickname: guess.nickname,
      correct: guess.nickname === target.nickname,
      cells: cells,
    };
  }

  /** 随机挑一张图(对局开始时确定并固定,避免重渲染时换图);无图返回 '' */
  function pickPortrait(item) {
    var list = (item && item.images) || [];
    if (!list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
  }

  /** 归一化联想串:小写、去掉空格/中点/连字符等分隔符 */
  function normalizeSearch(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[\s\u00b7\-_'’.,，。、]/g, '');
  }

  /** 单个条目的联想优先级(越小越靠前);null = 不匹配。
   *  顺序:名称精确 > 别名精确 > 名称前缀 > 全拼精确 > 首字母精确 > 名称包含 > 别名包含 > 全拼包含 > 首字母包含 */
  function matchRank(item, query) {
    if (!query) return null;
    var nickname = normalizeSearch(item.nickname);
    var alias = normalizeSearch(item.alias);
    var pinyin = normalizeSearch(item.pinyin);
    var abbr = normalizeSearch(item.pinyinAbbr);
    if (nickname === query) return 0;
    if (alias && alias === query) return 1;
    if (nickname.indexOf(query) === 0) return 2;
    if (pinyin && pinyin === query) return 3;
    if (abbr && abbr === query) return 4;
    if (nickname.indexOf(query) !== -1) return 5;
    if (alias && alias.indexOf(query) !== -1) return 6;
    if (pinyin && pinyin.indexOf(query) !== -1) return 7;
    if (abbr && abbr.indexOf(query) !== -1) return 8;
    return null;
  }

  /** 联想搜索:支持名称 / 别名 / 全拼 / 首字母缩写;同分保持原数据顺序。
   *  仅用于候选联想,不参与提交判定(见 findItem)。 */
  function searchItems(list, input, limit) {
    var query = normalizeSearch(input);
    if (!query) return [];
    var hits = [];
    list.forEach(function (c, index) {
      var rank = matchRank(c, query);
      if (rank !== null) hits.push({ c: c, rank: rank, index: index });
    });
    hits.sort(function (a, b) { return a.rank - b.rank || a.index - b.index; });
    return hits.slice(0, limit || 8).map(function (h) { return h.c; });
  }

  ZHOUYIBA.MAX_GUESSES = MAX_GUESSES;
  ZHOUYIBA.MODES = MODES;
  ZHOUYIBA.compare = compare;
  ZHOUYIBA.exactAttr = exactAttr;
  ZHOUYIBA.numericAttr = numericAttr;
  ZHOUYIBA.overlapAttr = overlapAttr;
  ZHOUYIBA.toList = toList;
  ZHOUYIBA.pickPortrait = pickPortrait;
  ZHOUYIBA.normalizeSearch = normalizeSearch;
  ZHOUYIBA.matchRank = matchRank;
  ZHOUYIBA.searchItems = searchItems;

  // ---------- 数据库与卡池 ----------
  function getDB(key) {
    return (typeof window !== 'undefined' && window[key]) || [];
  }

  /** 按模式取可猜池:可用 === false 的条目只做存档,不参与对局;
   *  武器再按「模式」字段过滤子模式卡池(仅烽火地带/仅全面战场/通用)。 */
  function getPool(cfg, subModeId) {
    var db = getDB(cfg.dbKey);
    var playable = db.filter(function (c) { return c['可用'] !== false; });
    if (!playable.length) playable = db; // 兜底:字段缺失时不影响可玩性
    if (cfg.id === 'weapon' && subModeId) {
      var scoped = playable.filter(function (w) {
        var scope = w['模式'] || '通用';
        if (subModeId === 'ops') return scope !== '仅全面战场';
        if (subModeId === 'warfare') return scope !== '仅烽火地带';
        return true;
      });
      if (!scoped.length) scoped = playable;
      return scoped;
    }
    return playable;
  }

  ZHOUYIBA.getDB = getDB;
  ZHOUYIBA.getPool = getPool;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZHOUYIBA;
  }

  // ---------- 浏览器 UI ----------
  if (typeof document === 'undefined') return;

  var STATS_KEY = 'zhou-yiba:stats';
  var RECENT_WINDOW_MS = 60 * 60 * 1000;

  var state = {
    modeId: null, cfg: null, subModeId: null, pool: [],
    target: null, guesses: [], status: 'ready', portrait: '',
  };
  var $ = function (id) { return document.getElementById(id); };

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* 忽略 */ }
  }

  function loadRecent(cfg, subModeId) {
    var key = cfg.recentKey + (cfg.subModes && subModeId ? ':' + subModeId : '');
    var list = storageGet(key) || [];
    var cutoff = Date.now() - RECENT_WINDOW_MS;
    return list.filter(function (item) { return item && item.t >= cutoff; });
  }
  function rememberRecent(cfg, subModeId, nickname) {
    var key = cfg.recentKey + (cfg.subModes && subModeId ? ':' + subModeId : '');
    var list = loadRecent(cfg, subModeId).filter(function (item) { return item.n !== nickname; });
    list.push({ n: nickname, t: Date.now() });
    storageSet(key, list.slice(-20));
  }
  function loadStats() {
    return storageGet(STATS_KEY) || { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
  }
  function saveStats(stats) { storageSet(STATS_KEY, stats); }

  function pickTarget(cfg, subModeId) {
    var pool = state.pool;
    var recent = new Set(loadRecent(cfg, subModeId).map(function (item) { return item.n; }));
    var candidates = pool.filter(function (c) { return !recent.has(c.nickname); });
    if (!candidates.length) candidates = pool;
    var target = candidates[Math.floor(Math.random() * candidates.length)];
    rememberRecent(cfg, subModeId, target.nickname);
    return target;
  }

  /** 提交判定:只认名称 / 别名的完全一致。
   *  拼音(全拼、首字母)仅用于候选联想,不能直接提交 —— 避免「打拼音就自动算提交」。 */
  function findItem(input) {
    var q = String(input || '').trim().toLowerCase();
    return state.pool.find(function (c) {
      return c.nickname.toLowerCase() === q
        || (c.alias && c.alias.toLowerCase() === q);
    }) || null;
  }

  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }

  // ---------- 棋盘渲染 ----------
  function cellHtml(attr) {
    if (!attr) return '<td class="wrong">-</td>';
    var arrow = attr.hint && attr.level !== 'correct'
      ? '<span class="dir">' + (attr.hint === 'higher' ? '&#9650;' : '&#9660;') + '</span>'
      : '';
    var raw = String(attr.value === undefined || attr.value === null ? '' : attr.value);
    var display = (raw === '') ? '-' : raw;
    return '<td class="' + attr.level + '">' + escapeHtml(display) + arrow + '</td>';
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /** 动态表头:列随模式变化 */
  function renderBoardHead() {
    var thead = $('board-head');
    thead.innerHTML = '';
    var tr = document.createElement('tr');
    var nameTh = document.createElement('th');
    nameTh.textContent = state.cfg.nameLabel;
    tr.appendChild(nameTh);
    state.cfg.columns.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = col.label;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    $('board').setAttribute('data-mode', state.modeId);
    $('board').setAttribute('data-submode', state.subModeId || '');
  }

  function renderBoard() {
    var tbody = $('board-body');
    tbody.innerHTML = '';
    state.guesses.forEach(function (row, index) {
      var tr = document.createElement('tr');
      if (index === state.guesses.length - 1) tr.className = 'row-latest';
      if (row.correct) tr.className = (tr.className ? tr.className + ' ' : '') + 'row-correct';
      var avatarHtml = row.avatar
        ? '<img class="row-avatar" src="' + escapeHtml(row.avatar) + '" alt="" loading="lazy" onerror="this.remove()" />'
        : '';
      tr.innerHTML = '<td class="name' + (row.correct ? ' correct' : '') + '">' + avatarHtml + escapeHtml(row.nickname) + '</td>'
        + row.cells.map(cellHtml).join('');
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
    $('progress').innerHTML = dots;
  }

  // ---------- 对局流程 ----------
  function startGame(modeId, subModeId) {
    var cfg = MODES[modeId];
    if (!cfg) return;
    var pool = getPool(cfg, subModeId);
    if (!pool.length) {
      toast(cfg.emptyHint);
      return;
    }
    state.modeId = modeId;
    state.cfg = cfg;
    state.subModeId = subModeId || null;
    state.pool = pool;
    state.target = pickTarget(cfg, state.subModeId);
    state.guesses = [];
    state.status = 'playing';
    state.portrait = pickPortrait(state.target);

    var modeLabel = cfg.label + (cfg.subModes && state.subModeId
      ? ' · ' + cfg.subModes.find(function (s) { return s.id === state.subModeId; }).label : '');
    $('mode-tag').textContent = modeLabel;
    $('mode-tag-mobile').textContent = modeLabel;
    renderBoardHead();
    $('guess-input').value = '';
    closeSuggestions();
    renderBoard();
    $('status-text').textContent = cfg.statusStart.replace('{n}', cfg.maxGuesses);
    $('guess-input').placeholder = cfg.inputPlaceholder;
    $('guess-input').disabled = false;
    $('guess-submit').disabled = false;
    $('start-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    $('guess-input').focus();
  }

  function backToStart() {
    $('game-screen').classList.add('hidden');
    $('start-screen').classList.remove('hidden');
    refreshCounts(); // 开始页保留上次的模式选择,按「开始游戏」即可再来一局
  }

  function submitGuess(item) {
    if (!item || state.status !== 'playing') return;
    if (state.guesses.some(function (g) { return g.nickname === item.nickname; })) {
      toast('已经猜过这个了');
      return;
    }
    var row = compare(item, state.target, state.cfg, state.subModeId);
    row.avatar = item.avatar || '';
    row.guessedAt = Date.now();
    state.guesses.push(row);
    renderBoard();

    if (row.correct) {
      finish('won');
    } else if (state.guesses.length >= state.cfg.maxGuesses) {
      finish('lost');
    } else {
      $('guess-input').value = '';
      closeSuggestions();
      $('guess-input').focus();
    }
  }

  function finish(result) {
    state.status = 'finished';
    $('guess-input').disabled = true;
    $('guess-submit').disabled = true;
    var stats = loadStats();
    if (result === 'won') {
      stats.wins += 1;
      stats.streak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    } else {
      stats.losses += 1;
      stats.streak = 0;
    }
    saveStats(stats);
    showResult(result, stats);
  }

  function showResult(result, stats) {
    var t = state.target;
    var cfg = state.cfg;
    $('result-title').textContent = result === 'won' ? '恭喜,猜对了!' : '很遗憾,未能猜中';
    $('result-tone').className = result === 'won' ? 'overlay-card win' : 'overlay-card lose';
    $('result-name').textContent = t.nickname;
    $('result-stats').textContent = '共 ' + state.guesses.length + ' 次 · 总场次 ' + (stats.wins + stats.losses)
      + ' · 胜 ' + stats.wins + ' · 负 ' + stats.losses
      + ' · 当前连胜 ' + stats.streak;
    var html = '';
    cfg.resultBasicRows(t, state.subModeId).forEach(function (pair) {
      html += row2(pair[0], pair[1]);
    });
    cfg.resultRows(t).forEach(function (pair) {
      html += row2(pair[0], pair[1]);
    });
    $('result-info').innerHTML = html;
    var portrait = $('result-portrait');
    var portraitWrap = $('result-portrait-wrap');
    if (state.portrait) {
      portrait.src = state.portrait;
      portraitWrap.classList.remove('hidden');
    } else {
      portrait.removeAttribute('src');
      portraitWrap.classList.add('hidden');
    }
    $('result-overlay').classList.add('show');
  }

  function row2(label, value) {
    return '<tr><td class="label">' + escapeHtml(label) + '</td><td>' + escapeHtml(value || '-') + '</td></tr>';
  }

  function hideResult() { $('result-overlay').classList.remove('show'); }

  // ---------- 输入补全 ----------
  var suggestions = [];

  function closeSuggestions() { suggestions = []; $('suggestions').innerHTML = ''; $('suggestions').classList.remove('open'); }

  function updateSuggestions() {
    var q = $('guess-input').value.trim();
    if (!q) { closeSuggestions(); return; }
    // 名称 / 别名 / 全拼 / 首字母都能联想;只给候选,不自动提交
    suggestions = searchItems(state.pool, q, 8);
    var list = $('suggestions');
    list.innerHTML = '';
    if (!suggestions.length) { list.classList.remove('open'); return; }
    suggestions.forEach(function (c, index) {
      var li = document.createElement('li');
      if (c.avatar) {
        var thumb = document.createElement('img');
        thumb.className = 'sug-avatar';
        thumb.src = c.avatar;
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.onerror = function () { this.remove(); };
        li.appendChild(thumb);
      }
      li.appendChild(document.createTextNode(c.nickname));
      li.className = index === 0 ? 'active' : '';
      li.onmousedown = function (event) {
        // 只把候选填入输入框,提交由玩家手动点击"提交猜测"
        event.preventDefault();
        $('guess-input').value = c.nickname;
        closeSuggestions();
      };
      list.appendChild(li);
    });
    list.classList.add('open');
  }

  // ---------- 规则弹窗 ----------
  function toggleRules(show) {
    $('rules-overlay').classList.toggle('show', show);
    if (show) {
      // 规则内容随模式切换:未开局(modeId 为空)时两块都隐藏,只显示通用开场白
      document.querySelectorAll('.rules-mode').forEach(function (el) {
        el.hidden = el.getAttribute('data-mode') !== state.modeId;
      });
    }
  }

  // ---------- 事件绑定 ----------
  // 开始页交互:先选模式(猜武器再选子模式,默认烽火地带),再按「开始游戏」开局
  var selection = { modeId: null, subModeId: null };

  function updateStartBtn() {
    var btn = $('start-btn');
    if (selection.modeId === 'operator') {
      btn.disabled = false;
      btn.textContent = '开始游戏 · 猜干员';
    } else if (selection.modeId === 'weapon' && selection.subModeId) {
      btn.disabled = false;
      btn.textContent = '开始游戏 · ' + (selection.subModeId === 'ops' ? '烽火地带' : '全面战场');
    } else {
      btn.disabled = true;
      btn.textContent = '请先选择模式';
    }
  }

  function selectMode(modeId) {
    selection.modeId = modeId;
    selection.subModeId = null;
    var isOperator = modeId === 'operator';
    var isWeapon = modeId === 'weapon';
    $('mode-operator').classList.toggle('selected', isOperator);
    $('mode-operator').setAttribute('aria-pressed', isOperator ? 'true' : 'false');
    $('mode-weapon').classList.toggle('selected', isWeapon);
    $('mode-weapon').setAttribute('aria-pressed', isWeapon ? 'true' : 'false');
    $('mode-weapon-ops').disabled = !isWeapon;
    $('mode-weapon-warfare').disabled = !isWeapon;
    if (isWeapon) selectSubMode('ops'); // 选中猜武器时默认烽火地带
    updateStartBtn();
  }

  function selectSubMode(subId) {
    selection.subModeId = subId;
    $('mode-weapon-ops').classList.toggle('selected', subId === 'ops');
    $('mode-weapon-warfare').classList.toggle('selected', subId === 'warfare');
    updateStartBtn();
  }

  function bind() {
    $('mode-operator').addEventListener('click', function () { selectMode('operator'); });
    $('mode-weapon').addEventListener('click', function (event) {
      if (event.target !== event.currentTarget) return; // 子模式按钮的冒泡不当作卡片点击
      selectMode('weapon');
    });
    $('mode-weapon').addEventListener('keydown', function (event) {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
        event.preventDefault();
        selectMode('weapon');
      }
    });
    $('mode-weapon-ops').addEventListener('click', function () { selectSubMode('ops'); });
    $('mode-weapon-warfare').addEventListener('click', function () { selectSubMode('warfare'); });
    $('start-btn').addEventListener('click', function () {
      if (!selection.modeId) return;
      startGame(selection.modeId, selection.modeId === 'weapon' ? selection.subModeId : null);
    });
    $('back-btn').addEventListener('click', function () {
      if (state.status === 'playing') {
        if (!confirm('返回首页将结束本局,确定吗?')) return;
      }
      state.status = 'ready';
      backToStart();
    });
    $('restart-btn').addEventListener('click', function () {
      if (state.status === 'playing' && !confirm('重新开始将清除本局进度,确定吗?')) return;
      startGame(state.modeId, state.subModeId);
    });
    $('again-btn').addEventListener('click', function () { hideResult(); startGame(state.modeId, state.subModeId); });
    $('view-btn').addEventListener('click', hideResult);
    $('giveup-btn').addEventListener('click', function () {
      if (state.status !== 'playing') return;
      if (!confirm('查看答案将按失败结束本局,确定吗?')) return;
      finish('lost');
    });
    $('rules-trigger').addEventListener('click', function () { toggleRules(true); });
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
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if ($('rules-overlay').classList.contains('show')) toggleRules(false);
        else if ($('result-overlay').classList.contains('show')) hideResult();
      }
    });

    var input = $('guess-input');
    // 手动提交:输入必须与某个名称/别名完全一致
    function submitFromInput() {
      if (state.status !== 'playing') return;
      var q = input.value.trim();
      if (!q) { toast('请输入名称'); return; }
      var item = findItem(q);
      if (!item) {
        toast('没有完全匹配的条目(拼音仅用于联想),请点选候选项后提交');
        return;
      }
      input.value = item.nickname;
      closeSuggestions();
      submitGuess(item);
    }
    $('guess-submit').addEventListener('click', submitFromInput);
    input.addEventListener('input', updateSuggestions);
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('blur', function () { setTimeout(closeSuggestions, 150); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitFromInput();
      } else if (event.key === 'ArrowDown' && suggestions.length) {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === 'ArrowUp' && suggestions.length) {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === 'Tab' && suggestions.length) {
        event.preventDefault();
        $('guess-input').value = suggestions[0].nickname;
        updateSuggestions();
      }
    });
  }

  function moveActive(direction) {
    var items = $('suggestions').children;
    var current = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains('active')) { current = i; break; }
    }
    var next = (current + direction + items.length) % items.length;
    for (var j = 0; j < items.length; j++) items[j].classList.toggle('active', j === next);
    $('guess-input').value = suggestions[next].nickname;
  }

  /** 开始页两张模式卡上的收录数/待填充提示 */
  function refreshCounts() {
    var opPool = getPool(MODES.operator);
    $('operator-count').textContent = MODES.operator.countText(opPool);
    var opDb = getDB(MODES.operator.dbKey);
    if (opDb.length && !opPool.length) {
      $('operator-count').textContent = '数据全部为「仅存档」';
    }
    var weaponDb = getDB(MODES.weapon.dbKey);
    if (weaponDb.length) {
      var opsPool = getPool(MODES.weapon, 'ops');
      var wfPool = getPool(MODES.weapon, 'warfare');
      $('weapon-count').textContent = '烽火地带 ' + opsPool.length + ' 把 · 全面战场 ' + wfPool.length + ' 把';
    } else {
      $('weapon-count').textContent = '武器数据待填充';
    }
  }

  bind();
  refreshCounts();
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
})();
