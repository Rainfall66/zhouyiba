/* 洲一把 · core.js 单元测试 + 数据/资源/选择器完整性校验
 * 运行:node --test(或 npm test)  零依赖,只用 node 内置模块。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// 数据文件是给浏览器用的普通脚本(挂 window.*),这里造一个最小 window 再加载
global.window = {};
require(path.join(ROOT, 'operators.js'));
require(path.join(ROOT, 'weapons.js'));
const Z = require(path.join(ROOT, 'core.js'));

const OPERATORS = global.window.ZHOUYIBA_OPERATORS;
const WEAPONS = global.window.ZHOUYIBA_WEAPONS;
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

// ---------------------------------------------------------------- 判定逻辑

test('exactAttr:任一方为空按未知灰处理,不做错误判定', () => {
  assert.equal(Z.exactAttr('GTI', 'GTI').level, 'correct');
  assert.equal(Z.exactAttr('GTI', '哈夫克').level, 'wrong');
  assert.equal(Z.exactAttr('', 'GTI').level, 'wrong');
  assert.equal(Z.exactAttr('GTI', null).level, 'wrong');
  assert.equal(Z.exactAttr(null, null).value, '');
});

test('numericAttr:相同绿 / 容差内黄+箭头 / 超容差灰+箭头 / 空值不出箭头', () => {
  assert.equal(Z.numericAttr(183, 183, 3).level, 'correct');
  const close = Z.numericAttr(183, 185, 3);
  assert.equal(close.level, 'close');
  assert.equal(close.hint, 'higher');
  const far = Z.numericAttr(183, 200, 3);
  assert.equal(far.level, 'wrong');
  assert.equal(far.hint, 'higher');
  assert.equal(Z.numericAttr(200, 183, 3).hint, 'lower');
  // Number(null) === 0 的陷阱:未知目标值不能得出「答案=0」的箭头
  const unknownGuess = Z.numericAttr(null, 178, 3);
  assert.equal(unknownGuess.level, 'wrong');
  assert.equal(unknownGuess.hint, undefined);
  const unknownTarget = Z.numericAttr(193, null, 3);
  assert.equal(unknownTarget.level, 'wrong');
  assert.equal(unknownTarget.hint, undefined);
});

test('overlapAttr:集合完全相同绿、有交集黄、无交集灰', () => {
  assert.equal(Z.overlapAttr(['全自动', '单发'], ['单发', '全自动']).level, 'correct');
  assert.equal(Z.overlapAttr(['全自动'], ['全自动', '单发']).level, 'close');
  assert.equal(Z.overlapAttr(['全自动'], ['栓动']).level, 'wrong');
  assert.equal(Z.overlapAttr(['全发'], ['全自动']).level, 'wrong', '集合项按精确字符串比较,不做模糊包含');
  assert.equal(Z.overlapAttr([], ['单发']).level, 'wrong');
});

test('toList:数组原样,字符串按分隔符拆分', () => {
  assert.deepEqual(Z.toList(['a', 'b']), ['a', 'b']);
  assert.deepEqual(Z.toList('全自动、单发'), ['全自动', '单发']);
  assert.deepEqual(Z.toList('全自动 / 单发'), ['全自动', '单发']);
  assert.deepEqual(Z.toList(''), []);
  assert.deepEqual(Z.toList(null), []);
});

// ------------------------------------------------- 伤害取值:未知 vs 同烽火

test('damageOf:烽火读伤害;全面战场读战场伤害;未收录返回 null(未知)', () => {
  const known = { 伤害: 31, 战场伤害: 20 };
  assert.equal(Z.damageOf(known, 'ops'), 31);
  assert.equal(Z.damageOf(known, 'warfare'), 20);

  const unknown = { 伤害: 50, 战场伤害: null };
  assert.equal(Z.damageOf(unknown, 'ops'), 50);
  assert.equal(Z.damageOf(unknown, 'warfare'), null, '未收录必须是未知,不能回落成烽火数值');

  const same = { 伤害: 30, 战场伤害: null, 战场伤害同烽火: true };
  assert.equal(Z.damageOf(same, 'warfare'), 30, '显式声明相同时才沿用烽火数值');
});

test('compare:全面战场未收录的伤害列判灰且无箭头,不产生 green/yellow', () => {
  const cfg = Z.MODES.weapon;
  const unknown = WEAPONS.find((w) => Z.damageOf(w, 'warfare') === null);
  assert.ok(unknown, '应存在战场伤害未收录的武器');
  const cell = Z.compare(unknown, unknown, cfg, 'warfare').cells[3];
  assert.equal(cell.value, '', '未知数值渲染成空值(棋盘显示 "-")');
  assert.equal(cell.level, 'wrong');
  assert.equal(cell.hint, undefined);
  assert.notEqual(cell.level, 'correct');
  assert.notEqual(cell.level, 'close');

  // 已收录的武器在同模式下正常判定:PSG-1 战场 35 / 烽火 50
  const psg = WEAPONS.find((w) => w.nickname === 'PSG-1');
  const wfCell = Z.compare(psg, psg, cfg, 'warfare').cells[3];
  assert.equal(wfCell.level, 'correct');
  assert.equal(wfCell.value, 35);
  const opsCell = Z.compare(psg, psg, cfg, 'ops').cells[3];
  assert.equal(opsCell.level, 'correct');
  assert.equal(opsCell.value, 50);
});

test('compare:霰弹枪显示「单弹丸×弹丸数」,判定仍按总伤', () => {
  const cfg = Z.MODES.weapon;
  const m870 = WEAPONS.find((w) => w.nickname === 'M870');
  const m1014 = WEAPONS.find((w) => w.nickname === 'M1014');
  const fs12 = WEAPONS.find((w) => w.nickname === 'FS12');

  const far = Z.compare(m870, m1014, cfg, 'ops').cells[3];
  assert.equal(far.value, '17×8', '面板显示猜测方的单弹丸×弹丸数');
  assert.equal(far.level, 'wrong', '136 与 112 相差 24,超出 ±2 容差');

  const same = Z.compare(fs12, m1014, cfg, 'ops').cells[3];
  assert.equal(same.value, '14×8');
  assert.equal(same.level, 'correct', '两者总伤都是 112');
});

test('countUnknown:统计卡池里未收录的数值列条目数', () => {
  const pool = Z.getPool(Z.MODES.weapon, 'warfare');
  const unknown = Z.countUnknown(Z.MODES.weapon, pool, '伤害', 'warfare');
  assert.ok(unknown > 0, '全面战场确实存在未收录伤害的武器');
  assert.equal(Z.countUnknown(Z.MODES.weapon, pool, '射速', 'warfare'), 0);
  assert.equal(Z.countUnknown(Z.MODES.weapon, Z.getPool(Z.MODES.weapon, 'ops'), '伤害', 'ops'), 0);
});

// ---------------------------------------------------------------- 联想

test('findItem:只认名称与别名完全一致,拼音不可直接提交,忽略标点空格与大小写', () => {
  const pool = Z.getPool(Z.MODES.operator);
  assert.equal(Z.findItem(pool, '红狼').nickname, '红狼');
  assert.equal(Z.findItem(pool, 'd-wolf').nickname, '红狼');
  assert.equal(Z.findItem(pool, 'honglang'), null, '全拼不能直接提交');
  assert.equal(Z.findItem(pool, '红'), null);

  const weapons = Z.getPool(Z.MODES.weapon, 'ops');
  assert.equal(Z.findItem(weapons, 'as val').nickname, 'AS Val', '忽略空格');
  assert.equal(Z.findItem(weapons, '.357左轮').nickname, '.357左轮');
});

test('searchItems:全拼 / 首字母 / 别名 / 名称前缀都能联想,且按优先级排序', () => {
  const pool = Z.getPool(Z.MODES.operator);
  assert.equal(Z.searchItems(pool, 'hl', 8)[0].nickname, '红狼');
  assert.equal(Z.searchItems(pool, 'honglang', 8)[0].nickname, '红狼');
  assert.equal(Z.searchItems(pool, 'D-Wolf', 8)[0].nickname, '红狼');
  assert.equal(Z.searchItems(pool, '骇', 8)[0].nickname, '骇爪');
});

test('多音/误拼:骇爪 haizhua 与 huaizhua 都可联想,旅人 lvren 与 luren 都可联想', () => {
  const pool = Z.getPool(Z.MODES.operator);
  assert.equal(Z.searchItems(pool, 'haizhua', 8)[0].nickname, '骇爪');
  assert.equal(Z.searchItems(pool, 'huaizhua', 8)[0].nickname, '骇爪');
  assert.equal(Z.searchItems(pool, 'hz', 8)[0].nickname, '骇爪');
  assert.equal(Z.searchItems(pool, 'lvren', 8)[0].nickname, '旅人');
  assert.equal(Z.searchItems(pool, 'luren', 8)[0].nickname, '旅人');
});

test('matchRank:名称精确优先于拼音精确,拼音精确优先于名称包含', () => {
  const byName = { nickname: '猎手', alias: '', pinyin: 'lieshou', pinyinAbbr: 'ls' };
  const byPinyin = { nickname: '红狼', alias: '', pinyin: 'hl', pinyinAbbr: 'hl2' };
  const list = [byPinyin, byName];
  assert.equal(Z.searchItems(list, '猎手', 8)[0].nickname, '猎手');
  assert.equal(Z.matchRank(byName, 'lieshou') < Z.matchRank(byName, 'lie'), true);
});

// ---------------------------------------------------------------- 卡池

test('getPool:干员 17 名;武器两子模式各 68 把;空库返回空数组且不抛错', () => {
  assert.equal(Z.getPool(Z.MODES.operator).length, 17);
  assert.equal(Z.getPool(Z.MODES.weapon, 'ops').length, 68);
  assert.equal(Z.getPool(Z.MODES.weapon, 'warfare').length, 68);
  assert.deepEqual(Z.getPool({ dbKey: 'NOT_EXIST' }), []);
});

test('getPool:可用 false 只做存档;需要开局的模式全为仅存档时返回空池而不是回退全量', () => {
  global.window.ZHOUYIBA_TEST_ALL_STORED = [{ nickname: 'A', 可用: false }, { nickname: 'B', 可用: false }];
  const cfg = { id: 'test', dbKey: 'ZHOUYIBA_TEST_ALL_STORED' };
  assert.deepEqual(Z.getPool(cfg), [], '不能静默回退成包含仅存档条目');
  delete global.window.ZHOUYIBA_TEST_ALL_STORED;
});

test('getPool:武器「模式」字段真正决定子模式卡池(不再静默回退)', () => {
  global.window.ZHOUYIBA_TEST_SCOPE = [
    { nickname: '通用枪', 可用: true, 模式: '通用' },
    { nickname: '烽火枪', 可用: true, 模式: '仅烽火地带' },
    { nickname: '战场枪', 可用: true, 模式: '仅全面战场' },
  ];
  const cfg = { id: 'weapon', dbKey: 'ZHOUYIBA_TEST_SCOPE' };
  assert.deepEqual(Z.getPool(cfg, 'ops').map((w) => w.nickname), ['通用枪', '烽火枪']);
  assert.deepEqual(Z.getPool(cfg, 'warfare').map((w) => w.nickname), ['通用枪', '战场枪']);
  delete global.window.ZHOUYIBA_TEST_SCOPE;
});

// ---------------------------------------------------------------- 存档键 / 最近目标

test('分桶键:战绩按模式与子模式分开存放', () => {
  assert.equal(Z.statsBucket(Z.MODES.operator, null), 'operator');
  assert.equal(Z.statsBucket(Z.MODES.weapon, 'ops'), 'weapon:ops');
  assert.equal(Z.statsBucket(Z.MODES.weapon, 'warfare'), 'weapon:warfare');
  assert.equal(Z.statsKey('weapon:ops'), 'zhou-yiba:stats:weapon:ops');
  assert.notEqual(Z.statsBucket(Z.MODES.weapon, 'ops'), Z.statsBucket(Z.MODES.weapon, 'warfare'));
});

test('recentKey:最近目标按模式(含子模式)分开存档', () => {
  assert.equal(Z.recentKey(Z.MODES.operator, null), 'zhou-yiba:recent:operator');
  assert.equal(Z.recentKey(Z.MODES.weapon, 'ops'), 'zhou-yiba:recent:weapon:ops');
  assert.equal(Z.recentKey(Z.MODES.weapon, 'warfare'), 'zhou-yiba:recent:weapon:warfare');
});

test('activeRecentNames:1 小时窗口外自动过期', () => {
  const now = 1_700_000_000_000;
  const list = [
    { n: '新', t: now - 10_000 },
    { n: '旧', t: now - Z.RECENT_WINDOW_MS - 1 },
    { n: '坏', t: 'x' },
    null,
  ];
  assert.deepEqual(Z.activeRecentNames(list, now), ['新']);
});

// ---------------------------------------------------------------- 每日一题

test('dayKey:补零成 YYYY-MM-DD', () => {
  assert.equal(Z.dayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(Z.dayKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('dailyTarget:同一天同一模式目标固定,不同模式/日期种子不同', () => {
  const pool = Z.getPool(Z.MODES.weapon, 'ops');
  const seedA = Z.dailySeed('2026-09-30', Z.MODES.weapon, 'ops');
  const seedA2 = Z.dailySeed('2026-09-30', Z.MODES.weapon, 'ops');
  const seedB = Z.dailySeed('2026-09-30', Z.MODES.weapon, 'warfare');
  const seedC = Z.dailySeed('2026-10-01', Z.MODES.weapon, 'ops');
  assert.equal(seedA, seedA2);
  assert.notEqual(seedA, seedB);
  assert.notEqual(seedA, seedC);
  assert.equal(Z.dailyTarget(pool, seedA).nickname, Z.dailyTarget(pool, seedA2).nickname);
  assert.ok(pool.some((w) => w.nickname === Z.dailyTarget(pool, seedA).nickname));
  assert.equal(Z.dailyTarget([], seedA), null);
  // 散列分布:同一天不同种子的目标不应全部相同
  const picks = new Set([seedA, seedB, seedC].map((s) => Z.dailyTarget(pool, s).nickname));
  assert.ok(picks.size >= 2, '不同种子应能抽到不同目标');
});

// ---------------------------------------------------------------- 分享文案

test('buildShareText:生成 Wordle 式 emoji 战绩', () => {
  const text = Z.buildShareText({
    modeLabel: '猜干员',
    daily: true,
    result: 'won',
    maxGuesses: 6,
    url: 'https://example.com/',
    guesses: [
      { cells: [{ level: 'wrong' }, { level: 'close' }, { level: 'correct' }] },
      { cells: [{ level: 'correct' }, { level: 'correct' }, { level: 'correct' }] },
    ],
  });
  const lines = text.split('\n');
  assert.match(lines[0], /洲一把 · 猜干员 · 每日一题/);
  assert.equal(lines[1], '✅ 2/6 次');
  assert.equal(lines[2], '⬛🟨🟩');
  assert.equal(lines[3], '🟩🟩🟩');
  assert.equal(lines[4], 'https://example.com/');
  // 未命中的局用 ❌,未知级别按 ⬛ 兜底
  const lose = Z.buildShareText({ modeLabel: '猜武器', result: 'lost', maxGuesses: 8, guesses: [{ cells: [{ level: 'unknown' }] }] });
  assert.match(lose, /❌ 1\/8 次/);
  assert.match(lose, /⬛/);
});

// ---------------------------------------------------------------- 数据完整性

const WEAPON_TYPES = ['突击步枪', '冲锋枪', '机枪', '狙击枪', '射手步枪', '霰弹枪', '手枪', '特殊武器'];
const OP_CLASSES = ['突击', '工程', '支援', '侦察'];

test('干员数据:字段齐全、取值合法、昵称唯一', () => {
  const seen = new Set();
  for (const op of OPERATORS) {
    assert.ok(op.nickname, '干员必须有 nickname');
    assert.ok(!seen.has(op.nickname), `干员重名:${op.nickname}`);
    seen.add(op.nickname);
    assert.ok(['GTI', '哈夫克', '无'].includes(op.阵营), `${op.nickname} 阵营非法:${op.阵营}`);
    assert.ok(OP_CLASSES.includes(op.职业), `${op.nickname} 职业非法:${op.职业}`);
    assert.ok(['男', '女'].includes(op.性别), `${op.nickname} 性别非法:${op.性别}`);
    assert.ok(Number.isFinite(op.身高) && Number.isFinite(op.年龄), `${op.nickname} 身高/年龄必须是数字`);
    assert.ok(op.可用 !== undefined, `${op.nickname} 缺 可用 字段`);
    for (const field of ['pinyin', 'pinyinAbbr', 'alias']) {
      const v = op[field];
      assert.ok(Array.isArray(v) || typeof v === 'string', `${op.nickname}.${field} 必须是字符串或数组`);
    }
  }
});

test('武器数据:字段齐全、类型/射击模式合法、需要开局的列都有数值', () => {
  const seen = new Set();
  for (const w of WEAPONS) {
    assert.ok(w.nickname, '武器必须有 nickname');
    assert.ok(!seen.has(w.nickname), `武器重名:${w.nickname}`);
    seen.add(w.nickname);
    assert.ok(WEAPON_TYPES.includes(w.类型), `${w.nickname} 类型非法:${w.类型}`);
    assert.ok(Array.isArray(w.射击模式) && w.射击模式.length, `${w.nickname} 射击模式必须是非空数组`);
    assert.ok(Number.isFinite(w.伤害) && w.伤害 > 0, `${w.nickname} 伤害必须是正数`);
    assert.ok(Number.isFinite(w.射速) && w.射速 > 0, `${w.nickname} 射速必须是正数`);
    assert.ok(Number.isFinite(w.弹匣) && w.弹匣 > 0, `${w.nickname} 弹匣必须是正数`);
    assert.ok(w.战场伤害 === null || Number.isFinite(w.战场伤害), `${w.nickname} 战场伤害必须是数字或 null`);
    assert.equal(typeof w.战场伤害同烽火, 'boolean', `${w.nickname} 缺 战场伤害同烽火 布尔标记`);
    // 「战场伤害: null + 同烽火: true」是**合法且有意的**表达(见 core.js damageOf:
    // 显式声明两模式数值相同,此时取「伤害」值),2026-10-01 FS12 即采用该写法。
    // 真正矛盾的是:既给了具体战场伤害,又声明「同烽火」(两个源打架,难以裁决)。
    if (w.战场伤害 !== null && w.战场伤害同烽火) {
      assert.fail(`${w.nickname} 已给出战场伤害却又标注「同烽火」,语义冲突`);
    }
  }
});

test('全面战场伤害覆盖率:已补到 59/68,未收录不超过 10 把且都有明确来源', () => {
  const pool = Z.getPool(Z.MODES.weapon, 'warfare');
  const unknown = Z.countUnknown(Z.MODES.weapon, pool, '伤害', 'warfare');
  assert.ok(unknown <= 10, `未收录条目过多(${unknown} 把),疑似数据回退`);
  assert.equal(pool.length - unknown >= 58, true, '已收录的战场伤害不应少于 58 把');

  // 调研 JSON 里凡是标了战场伤害来源的记录,都必须真的带数值(防「标了来源却没数据」)
  const research = JSON.parse(read('pipeline/deltaforce_weapons.json'));
  for (const rec of research) {
    const hasValue = rec.damageWarfare !== null && rec.damageWarfare !== undefined;
    const annotated = typeof rec.warfareSource === 'string' || typeof rec.warfareConfidence === 'string';
    if (annotated) {
      assert.equal(hasValue, true, `${rec.name} 标注了战场伤害来源却没有数值`);
      assert.equal(typeof rec.damageWarfare, 'number', `${rec.name} 战场伤害必须是数字`);
    }
  }
  const annotated = research.filter((r) => typeof r.warfareSource === 'string').length;
  assert.ok(annotated >= 16, '本次补入的 16 条应带 warfareSource 标注');
});

test('本次补入的 16 把战场伤害与来源记录一致(防回退)', () => {
  const expected = {
    'PSG-1': 35, SR9: 35, 'SR-25': 35, SKS: 27, SVD: 40, VSS: 33, 'Mini-14': 25,
    AWM: 100, M700: 72, R93: 74, 'SV-98': 76, G17: 33, G18: 14, 沙漠之鹰: 50, '.357左轮': 52, 'QSZ-92G': 34,
  };
  for (const [nickname, damage] of Object.entries(expected)) {
    const w = WEAPONS.find((x) => x.nickname === nickname);
    assert.ok(w, `缺少武器 ${nickname}`);
    assert.equal(Z.damageOf(w, 'warfare'), damage, `${nickname} 战场伤害应为 ${damage}`);
  }
  // M1911 是采用该数据集的依据:游戏内实测 35,而 dfttk 给的是 25
  assert.equal(Z.damageOf(WEAPONS.find((w) => w.nickname === 'M1911'), 'warfare'), 35);
});

test('霰弹枪「伤害明细」等于 单弹丸×弹丸数,且乘回去≈总伤', () => {
  const shotguns = WEAPONS.filter((w) => w.类型 === '霰弹枪' && w.伤害明细);
  assert.ok(shotguns.length >= 3);
  for (const sg of shotguns) {
    const m = /^(\d+)×(\d+)$/.exec(sg.伤害明细);
    assert.ok(m, `${sg.nickname} 伤害明细格式应为「单弹丸×弹丸数」`);
    assert.equal(Number(m[1]) * Number(m[2]), sg.伤害, `${sg.nickname} 明细与总伤不一致`);
  }
});

test('数据引用的图片文件全部存在(不留破图)', () => {
  const missing = [];
  for (const file of ['operators.js', 'weapons.js']) {
    const text = read(file);
    for (const m of text.matchAll(/"(images\/[^"]+)"/g)) {
      if (!fs.existsSync(path.join(ROOT, m[1]))) missing.push(`${file} → ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('图片目录里的游戏资源没有孤儿文件(除 .gitkeep)', () => {
  const text = read('operators.js') + read('weapons.js') + read('index.html');
  const orphans = fs.readdirSync(path.join(ROOT, 'images'))
    .filter((f) => f !== '.gitkeep')
    .filter((f) => !text.includes('images/' + f));
  assert.deepEqual(orphans, [], '存在没有任何数据引用的图片');
});

// ---------------------------------------------------------------- 页面结构

test('app.js 引用的元素 id 都存在于 index.html', () => {
  const app = read('app.js');
  const html = read('index.html');
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const used = new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]));
  const missing = [...used].filter((id) => !ids.has(id));
  assert.deepEqual(missing, [], 'app.js 里引用了 HTML 中不存在的 id');
});

test('index.html 脚本顺序:core.js 必须先于 app.js,数据文件先于两者', () => {
  const html = read('index.html');
  const order = ['operators.js', 'weapons.js', 'core.js', 'app.js']
    .map((f) => html.indexOf('src="' + f + '"'));
  assert.ok(order.every((i) => i >= 0), '缺少脚本引用');
  assert.deepEqual(order, [...order].sort((a, b) => a - b), '脚本加载顺序错误');
});

test('index.html 无内联事件处理器与内联 style(便于后续启用 CSP)', () => {
  const html = read('index.html');
  const inlineHandlers = /\son(click|dblclick|error|load|change|input|focus|blur|submit|keydown|keyup|keypress|pointerdown|mousedown)\s*=/i;
  assert.equal(inlineHandlers.test(html), false, 'index.html 不应有内联事件处理器');
  assert.equal(/\sstyle="/i.test(html), false, 'index.html 不应有内联 style');
  assert.equal(/onerror\s*=/.test(read('app.js')), false, 'app.js 不应拼接内联 onerror');
});

test('已删除的死代码不再出现(MAX_GUESSES / perMode / empty-hint)', () => {
  const css = read('style.css');
  assert.equal(/MAX_GUESSES/.test(read('core.js') + read('app.js')), false);
  assert.equal(/perMode/.test(read('core.js')), false);
  assert.equal(/empty-hint/.test(css), false);
  assert.equal(/\.input-bar \.input\b/.test(css), false, '无效选择器 .input-bar .input 应已修正');
});
