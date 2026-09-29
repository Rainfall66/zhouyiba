// 洲一把 · weapons.js 生成脚本(数据流水线,游戏不依赖本文件)
// 用法:node gen_weapons.js   —— 读取 ./deltaforce_weapons.json(数值调研结果),
// 按下面的映射规则合并模式归属(A 名单调研)后,生成 ../weapons.js。
// 原始调研说明见同目录 README.md;新增武器优先手改 ../weapons.js 也可。
'use strict';
var fs = require('fs');
var path = require('path');

var raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'deltaforce_weapons.json'), 'utf8'));

// ---------- 名称映射:B 记录名 -> { nick, alias } ----------
var NAME_MAP = {
  '九五式自动步枪(QBZ-95-1)': { nick: 'QBZ-95-1', alias: '九五式' },
  'AS Val突击步枪(巨浪)': { nick: 'AS Val', alias: '巨浪' },
  '腾龙突击步枪(QBZ-191/二〇式自动步枪)': { nick: '腾龙', alias: 'QBZ-191' },
  'QCQ171冲锋枪(二〇式冲锋枪)': { nick: 'QCQ171', alias: '二〇式冲锋枪' },
  'QJB-201轻机枪(二〇式轻机枪)': { nick: 'QJB-201', alias: '二〇式轻机枪' },
  'QSZ-92G手枪(九二式改进型)': { nick: 'QSZ-92G', alias: '九二式' },
  'M82狙击步枪(半自动反器材步枪)': { nick: 'M82', alias: '巴雷特' },
  '野牛冲锋枪(PP-19)': { nick: '野牛冲锋枪', alias: 'PP-19' },
  '勇士冲锋枪(PP-19-01)': { nick: '勇士冲锋枪', alias: 'PP-19-01' },
  '725双管霰弹枪': { nick: '725', alias: '双管霰弹枪' },
  'Marlin杠杆步枪': { nick: '杠杆式步枪', alias: 'Marlin' },
  'SR-3M紧凑突击步枪': { nick: 'SR-3M' },
  'M14战斗射手步枪': { nick: 'M14' },
  '.357左轮手枪': { nick: '.357左轮' },
  '沙漠之鹰手枪': { nick: '沙漠之鹰' },
  '汤姆逊冲锋枪': { nick: '汤姆逊' },
};

// 类型归类(后缀推导 + 覆盖)
var TYPE_OVERRIDE = { 'SR-3M紧凑突击步枪': '冲锋枪', 'Marlin杠杆步枪': '射手步枪', '复合弓': '特殊武器' };

// 口径覆盖(B 的 extra.caliber 缺失、被缩写或被污染时;补值来自 A 名单调研)
var CALIBER_OVERRIDE = {
  'M1911手枪': '.45 ACP',
  'M82狙击步枪(半自动反器材步枪)': '12.7×99mm',
  'ASh-12战斗步枪': '12.7×55mm',
  'AWM狙击步枪': '.338 Lapua Magnum',
  'Marlin杠杆步枪': '.45-70 Govt',
  '沙漠之鹰手枪': '.50 AE',
  '汤姆逊冲锋枪': '.45 ACP',
  'MDR突击步枪': '7.62×51mm',
  'FS12霰弹枪': '12Gauge',
};

// 备注表(合并 B.notes 的关键信息)
var NOTES = {
  'M250通用机枪': '扳机延迟 0.1 秒,全游戏最高',
  'Vector冲锋枪': '全游戏射速第二,仅次于 G18',
  'G18手枪': '全游戏最高射速;唯一全自动手枪',
  'AS Val突击步枪(巨浪)': '自带消音,使用亚音速弹',
  'VSS射手步枪': '自带消音,与 AS Val 共用配件',
  'M870霰弹枪': '伤害为 8 弹丸合计(游戏内面板可能显示每弹丸值)',
  'M1014霰弹枪': '伤害为 8 弹丸合计',
  'S12K霰弹枪': '伤害为 8 弹丸合计;撞火枪托可全自动',
  '725双管霰弹枪': '伤害为全弹丸合计',
  'SKS射手步枪': '射速新旧资料有出入(510/411),以 411 为准',
  'M1911手枪': '战场伤害 25 仅供参考(数值源该枪战场条目异常)',
  'RM277突击步枪': '弹匣容量待核实',
  'M82狙击步枪(半自动反器材步枪)': '弹匣容量待核实;全面战场中可伤害载具',
  'MK4冲锋枪': '默认三连发,换枪管可解锁全自动',
  'M16A4突击步枪': '仅单发/三连发,无全自动',
  'FS12霰弹枪': '烽火伤害未查到;战场基础伤害约 18(单发口径存疑)',
  '汤姆逊冲锋枪': 'S11「群星」新枪,面板数值待补',
  'MDR突击步枪': 'S11「群星」新枪,无托结构,面板数值待补',
  '复合弓': 'S5 上线的冷兵器主武器;全面战场为突击兵与侦察兵的特殊武器',
};

// 拼音联想(中文昵称才需要;拉丁名靠名称本身即可搜到)
var PINYIN = {
  '腾龙': ['tenglong', 'tl'], '野牛冲锋枪': ['yeniuchongfengqiang', 'yncfq'],
  '勇士冲锋枪': ['yongshichongfengqiang', 'yscfq'], '沙漠之鹰': ['shamozhiying', 'smzy'],
  '汤姆逊': ['tangmuxun', 'tmx'], '杠杆式步枪': ['ganganshibuqiang', 'ggsbq'],
  '复合弓': ['fuhegong', 'fhg'], '蜜罐': ['miguan', 'mg'], '蝎式': ['xieshi', 'xs'],
  '.357左轮': ['357zuolun', 'zl'], 'QCQ171': ['qcq171', ''], 'QJB-201': ['qjb201', ''],
  'QBZ-95-1': ['qbz951', ''], 'QSZ-92G': ['qsz92g', ''],
};

// 射击模式值归一(把过细的描述归到共享词表)
var FIRE_MODE_NORMALIZE = {
  '单发(杠杆式)': '单发', '单发(拉弓)': '单发', '半自动(双动)': '半自动',
  '双管单发': '单发', '直拉栓动': '栓动',
};

// 玩家核对修正(2026-09-29,游戏内实测,覆盖调研值;改数值优先改这里再重新生成)
var CORRECTIONS = {
  'MDR突击步枪': { 射击模式: ['全自动'], 伤害: 41, 战场伤害: 25, 射速: 650, 弹匣: 20, 备注: 'S11「群星」新枪,无托结构' },
  '汤姆逊冲锋枪': { 射击模式: ['全自动'], 伤害: 37, 战场伤害: 22, 射速: 900, 弹匣: 20, 备注: 'S11「群星」新枪' },
  'RM277突击步枪': { 弹匣: 30, 备注: '' },
  'SKS射手步枪': { 射速: 510, 备注: '' },
  'M82狙击步枪(半自动反器材步枪)': { 弹匣: 5, 备注: '全面战场中可伤害载具' },
  'M1911手枪': { 战场伤害: 35, 备注: '' },
  '复合弓': { 伤害: 90, 战场伤害: 112, 射速: 182, 备注: 'S5 上线的冷兵器主武器;全面战场为突击兵与侦察兵的特殊武器' },
  // FS12 双射击模式数值不同,面板按半自动档记录,泵动档写进备注
  'FS12霰弹枪': { 射击模式: ['泵动', '半自动'], 伤害: 112, 战场伤害: null, 射速: 300, 弹匣: 6, 伤害明细: '14×8',
    备注: '面板按半自动档记录;泵动模式伤害 18×8(总伤 144)、射速 71' },
};

// 霰弹枪伤害明细(弹丸数×单弹丸),显示用;比对仍按总伤。
// 弹丸数按 8 计(dfttk 口径);725 弹丸数未经核实,暂不生成明细、只显示总伤。
var SHOTGUN_PELLETS = 8;
var NO_PELLET_DETAIL = ['725双管霰弹枪'];

// 模式归属:全部两模式通用。复合弓在全面战场为突击兵/侦察兵的特殊武器(玩家核实,2026-09-29)。
// 曾据爆料收录的蜜罐/蝎式/98K/AA-12 经玩家核实**不存在于游戏**(S11 爆料文疑似 AI 乱纹),已剔除。

// ---------- 工具 ----------
function baseType(name) {
  var n = name.replace(/（[^）]*）|\([^)]*\)/g, '');
  if (/突击步枪$|战斗步枪$|自动步枪$/.test(n)) return '突击步枪';
  if (/冲锋枪$/.test(n)) return '冲锋枪';
  if (/轻机枪$|通用机枪$/.test(n)) return '机枪';
  if (/射手步枪$|战斗射手步枪$/.test(n)) return '射手步枪';
  if (/狙击步枪$/.test(n)) return '狙击枪';
  if (/霰弹枪$/.test(n)) return '霰弹枪';
  if (/手枪$/.test(n)) return '手枪';
  return null;
}
function normCaliber(cal) {
  if (!cal) return null;
  return cal.replace(/x/g, '×').replace(/ACP/, ' ACP').replace(/BLK/, ' BLK')
    .replace(/\s+/g, ' ').trim();
}

// ---------- 主流程 ----------
var records = [];
raw.forEach(function (w) {
  var map = NAME_MAP[w.name] || {};
  var nick = map.nick || w.name.replace(/（[^）]*）|\([^)]*\)/g, '').replace(/(突击步枪|战斗步枪|冲锋枪|轻机枪|通用机枪|射手步枪|战斗射手步枪|狙击步枪|霰弹枪|手枪)$/, '');
  var type = TYPE_OVERRIDE[w.name] || baseType(w.name);
  var caliber = CALIBER_OVERRIDE[w.name] || normCaliber(w.extra && w.extra.caliber) || null;
  var fireModes = (w.fireModes && w.fireModes.length)
    ? w.fireModes.map(function (m) { return FIRE_MODE_NORMALIZE[m] || m; })
    : null;
  var rec = {
    nickname: nick,
    alias: map.alias || '',
    模式: '通用',
    类型: type,
    口径: caliber,
    射击模式: fireModes,
    伤害: w.damageOps,
    战场伤害: w.damageWarfare,
    射速: w.rpm,
    弹匣: w.mag,
    备注: NOTES[w.name] || '',
    pinyin: (PINYIN[nick] && PINYIN[nick][0]) || '',
    pinyinAbbr: (PINYIN[nick] && PINYIN[nick][1]) || '',
  };
  // 霰弹枪伤害明细(显示「单弹丸×弹丸数」)
  if (type === '霰弹枪' && typeof rec.伤害 === 'number' && rec.伤害 % SHOTGUN_PELLETS === 0
    && NO_PELLET_DETAIL.indexOf(w.name) === -1) {
    rec['伤害明细'] = (rec.伤害 / SHOTGUN_PELLETS) + '×' + SHOTGUN_PELLETS;
  }
  // 应用玩家核对修正(存在即覆盖,含 null)
  var fix = CORRECTIONS[w.name];
  if (fix) {
    Object.keys(fix).forEach(function (k) { rec[k] = fix[k]; });
  }
  records.push(rec);
});
records.forEach(function (r, i) { r.id = i + 1; r['可用'] = true; r.avatar = ''; r.images = []; });

// ---------- 输出 ----------
var FIELDS = ['nickname', 'alias', '可用', '模式', '类型', '口径', '射击模式', '伤害', '战场伤害', '射速', '弹匣', '伤害明细', '备注', 'pinyin', 'pinyinAbbr'];
var IMG = require('./image_map.js');
var js = '// 洲一把 · 三角洲行动武器数据库(由数据流水线 pipeline/gen_weapons.js 生成,可手改但会在下次生成时被覆盖)\n' +
  '// 数值核心源:dfttk.com 双模式数据文件(firefight=烽火地带 / battlefield=全面战场),伤害两模式独立;\n' +
  '// 名单与模式归属:萌娘百科「三角洲行动/武器与配件」+ 官方赛季公告;玩家核对修正(2026-09-29)已合并,\n' +
  '// 修正清单见 gen_weapons.js 的 CORRECTIONS。详见 README「数据来源与致谢」。\n' +
  '// 字段说明:\n' +
  '//   nickname 武器名(游戏内名称) / alias 别名(原型名、中文旧称,搜索联想用) / 可用 false=仅存档不参与对局\n' +
  '//   模式 "通用"=两模式卡池都有;"仅烽火地带"=只进烽火地带卡池\n' +
  '//   类型 突击步枪/冲锋枪/机枪/狙击枪/射手步枪/霰弹枪/手枪/特殊武器(精确匹配)\n' +
  '//   口径 如 5.56×45mm / 12Gauge(精确匹配) / 射击模式 数组(集合匹配:完全一致绿,有共同项黄)\n' +
  '//   伤害 烽火地带基础伤害 / 战场伤害 全面战场基础伤害(留空=与伤害相同)(数值列,±2 判「接近」+▲▼)\n' +
  '//   伤害明细 霰弹枪面板显示「单弹丸×弹丸数」(如 14×8);比对仍按「伤害」总伤进行,非霰弹枪无此字段\n' +
  '//   射速 RPM(±30) / 弹匣 基础弹匣容量(±5)\n' +
  '//   备注 结算页展示 / pinyin·pinyinAbbr 拼音联想(仅联想,不可直接提交)\n' +
  '//   avatar 武器官方图标(images/,源:游戏内资源,经 dfttk 引用) — 无图标(MDR/汤姆逊/FS12/复合弓)为空\n' +
  '//   null = 未知(数据未查到),对局中显示 "-";FS12 双射击模式数值不同,面板按半自动档记录(见备注)。\n\nwindow.ZHOUYIBA_WEAPONS = [\n';
records.forEach(function (r) {
  js += ' { id: ' + r.id;
  FIELDS.forEach(function (f) {
    js += ', ' + f + ': ' + JSON.stringify(r[f] == null ? null : r[f]);
  });
  var slug = IMG.WEAPON_SLUG[r.nickname];
  var avatar = slug && IMG.WEAPON_DFTTK[r.nickname] ? 'images/w-' + slug + '.webp' : '';
  js += ', avatar: ' + JSON.stringify(avatar) + ', images: [] },\n';
});
js += '];\n';
fs.writeFileSync(path.join(__dirname, '..', 'weapons.js'), js, 'utf8');
console.log('weapons.js generated:', records.length, 'records');
var ops = records.filter(function (r) { return r.模式 !== '仅全面战场'; }).length;
var wf = records.filter(function (r) { return r.模式 !== '仅烽火地带'; }).length;
console.log('ops pool:', ops, '/ warfare pool:', wf);
var noStats = records.filter(function (r) { return r.伤害 == null; }).map(function (r) { return r.nickname; });
console.log('no damage stat:', noStats.join(', ') || '(none)');
