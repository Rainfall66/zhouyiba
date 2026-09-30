/* 洲一把 · 端到端冒烟测试驱动(仅测试用,不参与游戏运行)
 * ---------------------------------------------------------------
 * 本文件假定页面里已经按真实 index.html 的顺序加载了
 * operators.js / weapons.js / core.js / app.js,然后驱动真实 DOM 走完:
 *   开始页渲染 → 规则弹窗 → 猜干员(拼音候选 + 回车命中)→ 结算重开
 *   → 猜武器·全面战场(未收录提示 / 局内规则 / 续局)→ 每日一题 → 战绩清零
 * 结果写入 document.title(SMOKE-OK-n / SMOKE-FAIL-n)与页面末尾的
 * <pre id="smoke-report">。
 *
 * 运行方式:
 *   node test/smoke.js                       # 用 jsdom 跑(推荐,见 test/smoke.js)
 *   浏览器:把本文件作为 <script> 追加到 index.html 的副本上,用无头 Chrome/Edge 打开并 --dump-dom
 */
(function () {
  'use strict';

  var out = [];
  var checks = [];
  var NO_LAYOUT = !!window.__NO_LAYOUT__; // jsdom 没有布局,offsetParent 恒为 null

  function log(line) { out.push(line); }
  function check(name, ok, detail) {
    checks.push((ok ? 'PASS' : 'FAIL') + ' :: ' + name + (detail ? ' :: ' + detail : ''));
  }
  function el(id) { return document.getElementById(id); }
  function visible(node) {
    if (!node || node.classList.contains('hidden')) return false;
    return NO_LAYOUT ? true : node.offsetParent !== null;
  }
  function fire(node, type, init) {
    var Ctor = type === 'keydown' || type === 'keyup' ? KeyboardEvent : Event;
    node.dispatchEvent(new Ctor(type, Object.assign({ bubbles: true }, init || {})));
  }
  function typeGuess(text) {
    var input = el('guess-input');
    input.value = text;
    fire(input, 'input');
  }
  function pressEnter() { fire(el('guess-input'), 'keydown', { key: 'Enter' }); }
  /** 模拟真实点击:先聚焦再点击(HTMLElement.click() 不会移动焦点,而真实指针点击会) */
  function click(id) { var node = el(id); if (node.focus) node.focus(); node.click(); }
  function rows() { return document.querySelectorAll('#board-body tr').length; }
  function storage(store, key) { try { return JSON.parse(store.getItem(key)); } catch (e) { return null; } }

  function finish() {
    var failures = checks.filter(function (c) { return c.indexOf('FAIL') === 0; });
    var pre = document.createElement('pre');
    pre.id = 'smoke-report';
    var report = ['=== 冒烟测试报告 ===', '检查项 ' + checks.length + ' · 失败 ' + failures.length]
      .concat(checks, ['--- 备注 ---'], out);
    if (window.__ERRORS.length) report = report.concat(['--- 运行时错误 ---'], window.__ERRORS);
    pre.textContent = report.join('\n');
    document.body.appendChild(pre);
    document.title = failures.length ? 'SMOKE-FAIL-' + failures.length : 'SMOKE-OK-' + checks.length;
  }

  function run() {
    window.confirm = function () { return true; };  // 无头环境原生弹窗默认返回 false,这里直接放行
    var UI = window.ZHOUYIBA_UI;
    var Z = window.ZHOUYIBA;
    if (!UI || !Z) { check('core.js + app.js 已加载', false); return finish(); }
    check('core.js + app.js 已加载', true);

    // ---------- 开始页渲染 ----------
    log('干员卡:' + el('operator-count').textContent);
    log('武器卡:' + el('weapon-count').textContent);
    log('战绩行:' + el('start-stats').textContent);
    check('干员收录数渲染', /17 名干员/.test(el('operator-count').textContent));
    check('武器卡显示卡池与未收录提示', /68 把/.test(el('weapon-count').textContent) && /未收录/.test(el('weapon-count').textContent));
    check('初始开始按钮禁用', el('start-btn').disabled === true);
    check('开始页无候选列表', !el('suggestions').classList.contains('open'));

    // ---------- 规则弹窗(开始页两块都显示 + 焦点 + Esc) ----------
    click('rules-trigger');
    var blocks = document.querySelectorAll('.rules-mode');
    check('规则弹窗打开', el('rules-overlay').classList.contains('show'));
    check('开始页规则两块都可见', !blocks[0].hidden && !blocks[1].hidden);
    check('规则弹窗焦点进入', document.activeElement === el('rules-close'));
    fire(document, 'keydown', { key: 'Escape' });
    check('Esc 关闭规则弹窗', !el('rules-overlay').classList.contains('show'));
    check('关闭后焦点归还触发按钮', document.activeElement === el('rules-trigger'));

    // ---------- 猜干员:拼音候选 → 回车采纳 ----------
    click('mode-operator');
    check('模式卡选中态', el('card-operator').classList.contains('selected'));
    click('start-btn');
    check('进入游戏页', visible(el('game-screen')));
    var target = UI.state.target;
    log('猜干员目标:' + target.nickname);
    check('棋盘表头 6 列(干员名 + 5)', document.querySelectorAll('#board-head th').length === 6);
    check('th 带 scope=col', document.querySelector('#board-head th').getAttribute('scope') === 'col');
    check('caption 已填', /猜测记录/.test(el('board-caption').textContent));

    typeGuess(Array.isArray(target.pinyin) ? target.pinyin[0] : target.pinyin);
    var opt = document.querySelectorAll('#suggestions li');
    log('拼音候选:' + Array.prototype.map.call(opt, function (o) { return o.textContent; }).join(','));
    check('拼音联想出候选', opt.length > 0, '候选数=' + opt.length);
    check('候选项 role=option', opt.length > 0 && opt[0].getAttribute('role') === 'option');
    check('输入框 aria-expanded=true', el('guess-input').getAttribute('aria-expanded') === 'true');
    check('aria-activedescendant 指向候选', el('guess-input').getAttribute('aria-activedescendant') === 'sug-0');
    check('未提交前不算猜测', rows() === 0);
    pressEnter();
    check('回车采纳候选并命中', UI.state.status === 'finished' && UI.state.lastResult === 'won', 'status=' + UI.state.status);
    check('棋盘出现 1 行', rows() === 1);
    check('候选列表已关闭', !el('suggestions').classList.contains('open'));
    check('结算弹窗打开', el('result-overlay').classList.contains('show'));
    check('结算标题为胜利', /猜对了/.test(el('result-title').textContent));
    check('结算弹窗焦点进入', document.activeElement === el('again-btn'));
    log('结算统计:' + el('result-stats').textContent);
    log('结算信息:' + el('result-info').textContent.replace(/\s+/g, ' ').slice(0, 80));
    var stats = storage(localStorage, 'zhou-yiba:stats');
    var opBucket = storage(localStorage, 'zhou-yiba:stats:operator');
    check('总计战绩已记录', !!stats && stats.wins === 1, JSON.stringify(stats));
    check('干员分桶战绩已记录', !!opBucket && opBucket.wins === 1, JSON.stringify(opBucket));
    check('结束后 session 已清空', !sessionStorage.getItem('zhou-yiba:session'));
    var share = UI.buildShare();
    log('分享文案:' + JSON.stringify(share));
    check('分享文案含 emoji 网格与次数', /\uD83D\uDFE9|\u2B1B/.test(share) && /1\/6/.test(share));

    // ---------- 结算可重开 ----------
    click('view-btn');
    check('收起结算后弹窗关闭', !el('result-overlay').classList.contains('show'));
    check('顶栏出现「查看结算」', visible(el('result-btn')));
    click('result-btn');
    check('结算弹窗可重开', el('result-overlay').classList.contains('show'));
    click('view-btn');

    // ---------- 猜武器 · 全面战场:未知伤害提示 / 局内规则过滤 / 续局 ----------
    click('back-btn');
    check('返回开始页', visible(el('start-screen')));
    click('mode-weapon');
    click('mode-weapon-warfare');
    check('子模式选中态', el('mode-weapon-warfare').classList.contains('selected'));
    check('子模式 radio 语义', el('mode-weapon-warfare').getAttribute('aria-checked') === 'true');
    check('未选中的子模式 tabindex=-1', el('mode-weapon-ops').tabIndex === -1);
    click('start-btn');
    check('进入武器局', visible(el('game-screen')) && UI.state.modeId === 'weapon');
    var status = el('status-text').textContent;
    log('战场状态行:' + status);
    check('战场状态行提示未收录伤害', /未收录/.test(status));
    check('棋盘表头 7 列(武器名 + 6)', document.querySelectorAll('#board-head th').length === 7);
    check('表头 data-mode 已切换', el('board').getAttribute('data-mode') === 'weapon');
    click('rules-trigger-game');
    blocks = document.querySelectorAll('.rules-mode');
    check('局内规则只显示当前模式', blocks[0].hidden === true && blocks[1].hidden === false);
    click('rules-close');

    var pool = UI.state.pool;
    var wrong = pool.filter(function (w) { return w.nickname !== UI.state.target.nickname; })[0];
    typeGuess(wrong.nickname);
    typeGuess(wrong.nickname);
    click('guess-submit');
    check('错误猜测不结束对局', UI.state.status === 'playing', 'status=' + UI.state.status);
    check('已猜 1 次', rows() === 1);
    check('状态行显示剩余次数', /还剩/.test(el('status-text').textContent));
    var session = storage(sessionStorage, 'zhou-yiba:session');
    check('未完成对局写入 session', !!session && session.target === UI.state.target.nickname && session.guesses.length === 1,
      JSON.stringify(session));
    var sessionTarget = session.target;

    click('back-btn');
    check('继续上一局按钮可见', visible(el('resume-btn')));
    log('续玩按钮:' + el('resume-btn').textContent);
    click('resume-btn');
    check('续局恢复棋盘', UI.state.status === 'playing' && rows() === 1, 'rows=' + rows());
    check('续局目标一致', UI.state.target.nickname === sessionTarget);

    click('giveup-btn');
    check('查看答案按失败结算', UI.state.status === 'finished' && UI.state.lastResult === 'lost');
    var wfBucket = storage(localStorage, 'zhou-yiba:stats:weapon:warfare');
    check('武器·战场分桶独立记录', !!wfBucket && wfBucket.losses === 1, JSON.stringify(wfBucket));
    opBucket = storage(localStorage, 'zhou-yiba:stats:operator');
    check('干员分桶未被污染', !!opBucket && opBucket.wins === 1 && opBucket.losses === 0, JSON.stringify(opBucket));

    // ---------- 每日一题 ----------
    click('view-btn');
    click('back-btn');
    click('mode-operator');
    el('daily-toggle').checked = true;
    fire(el('daily-toggle'), 'change');
    check('每日一题写入按钮文案', /每日一题/.test(el('start-btn').textContent));
    click('start-btn');
    var expected = Z.dailyTarget(Z.getPool(Z.MODES.operator, null), Z.dailySeed(Z.dayKey(), Z.MODES.operator, null));
    check('每日一题目标与算法一致', UI.state.target.nickname === expected.nickname,
      UI.state.target.nickname + ' vs ' + expected.nickname);
    check('每日一题状态行标记', /每日一题/.test(el('status-text').textContent));
    typeGuess(UI.state.target.nickname);
    pressEnter();
    var daily = storage(localStorage, 'zhou-yiba:daily');
    check('每日一题成绩已记录', !!daily && Object.keys(daily).some(function (k) {
      return k.indexOf(Z.dayKey() + '|operator') === 0 && daily[k].result === 'won';
    }), JSON.stringify(daily));

    // ---------- 开始页战绩 + 清零 ----------
    click('view-btn');
    click('back-btn');
    log('清空前战绩行:' + el('start-stats').textContent);
    check('开始页显示战绩汇总', /总场次/.test(el('start-stats').textContent) && /胜率/.test(el('start-stats').textContent));
    check('清零按钮可见', visible(el('stats-reset')));
    check('今日已答状态写入每日提示', /今日已答/.test(document.querySelector('.daily-toggle small').textContent));
    click('stats-reset');
    var afterReset = storage(localStorage, 'zhou-yiba:stats');
    check('清零后总计归零', !!afterReset && afterReset.wins === 0 && afterReset.losses === 0, JSON.stringify(afterReset));

    check('全程无运行时错误', window.__ERRORS.length === 0, window.__ERRORS.join(' | '));
    finish();
  }

  // 收集运行时错误
  window.__ERRORS = window.__ERRORS || [];
  window.addEventListener('error', function (e) {
    window.__ERRORS.push('onerror: ' + (e.message || e.type) + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0));
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.__ERRORS.push('unhandledrejection: ' + e.reason);
  });
  var origError = console.error;
  console.error = function () {
    window.__ERRORS.push('console.error: ' + Array.prototype.join.call(arguments, ' '));
    origError.apply(console, arguments);
  };

  try {
    run();
  } catch (err) {
    check('冒烟脚本自身抛错', false, err && err.message);
    window.__ERRORS.push('smoke threw: ' + (err && err.stack ? err.stack : err));
    finish();
  }
})();
