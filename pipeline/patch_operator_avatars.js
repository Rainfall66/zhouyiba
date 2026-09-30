// 一次性补丁:把已下载的干员头像/立绘路径写入 operators.js(数据流水线辅助脚本)
'use strict';
var fs = require('fs');
var exists = function (p) { return fs.existsSync(p); };

var SLUG = {
  红狼: 'honglang', 威龙: 'weilong', 牧羊人: 'muyangren', 蜂医: 'fengyi',
  露娜: 'luna', 骇爪: 'haizhua', 蛊: 'gu', 乌鲁鲁: 'wululu',
  深蓝: 'shenlan', 无名: 'wuming', 疾风: 'jifeng', 银翼: 'yinyi',
  比特: 'bite', 蝶: 'die', 回响: 'huixiang', 液氮: 'yedan', 旅人: 'lvren',
};
// 兜底:回响 / 液氮 现已有从立绘顶部裁出的 head-*.webp;若缺图则降级用立绘当头像
var ART_ONLY = { huixiang: true, yedan: true };

var src = fs.readFileSync('operators.js', 'utf8');
var lines = src.split('\n');
var patched = 0;
lines = lines.map(function (line) {
  var m = line.match(/nickname: "([^"]+)"/);
  if (!m) return line;
  var slug = SLUG[m[1]];
  if (!slug) return line;
  var head = 'images/head-' + slug + '.webp';
  var art = 'images/art-' + slug + '.webp';
  var avatar = exists(head) ? head : (exists(art) ? art : '');
  var images = exists(art) ? '["' + art + '"]' : (exists(head) ? '["' + head + '"]' : '[]');
  if (!avatar && !images.length) return line;
  var out = line
    .replace(/avatar: "[^"]*"/, 'avatar: "' + avatar + '"')
    .replace(/images: \[[^\]]*\]/, 'images: ' + images);
  patched++;
  return out;
});
fs.writeFileSync('operators.js', lines.join('\n'));
console.log('patched records:', patched);
