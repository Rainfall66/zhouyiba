// 从萌百干员页 HTML 提取头像 icon 与默认立绘(支持 /fw/ 缩略图格式,还原为原图 URL)
'use strict';
var fs = require('fs');
var pages = {
  honglang: '红狼', weilong: '威龙', muyangren: '牧羊人', fengyi: '蜂医',
  luna: '露娜', huaizhua: '骇爪', gu: '蛊', wululu: '乌鲁鲁',
  shenlan: '深蓝', wuming: '无名', jifeng: '疾风', yinyi: '银翼',
  bite: '比特', die: '蝶', huixiang: '回响', yedan: '液氮', lvren: '旅人',
};
var out = [], missing = [];
// 输出文件名用的 slug 修正表(输入页仍是早期缓存的文件名,但产物按正确拼音命名:
// 骇爪 = haizhua,旧的 huaizhua 只是笔误)
var OUT_SLUG = { huaizhua: 'haizhua' };
Object.keys(pages).forEach(function (slug) {
  var name = pages[slug];
  var outSlug = OUT_SLUG[slug] || slug;
  var html = fs.readFileSync('pipeline/raw_pages/' + slug + '.html', 'utf8');
  var urls = html.match(/https:\/\/storage\.moegirl\.org\.cn\/moegirl\/commons\/[^"'\s\\<>]+/g) || [];
  var seen = {}, icon = null, art = null;
  var iconFile = '三角洲行动-' + name + 'icon.png';
  var artFile = '三角洲行动-' + name + '.jpg';
  urls.forEach(function (u) {
    var dec;
    try { dec = decodeURIComponent(u.split('?')[0]); } catch (e) { return; }
    var segs = dec.split('/');
    var commonsIdx = segs.indexOf('commons');
    if (commonsIdx === -1) return;
    // 还原原图:取 commons/<x>/<xx>/ 后的文件名段(去掉缩略变换 '!...' 后缀)
    var fileSeg = segs.slice(commonsIdx + 3).join('/').split('!')[0];
    try { fileSeg = decodeURIComponent(fileSeg); } catch (e) { /* 已解码则忽略 */ }
    var plain = segs.slice(0, commonsIdx + 3).join('/') + '/' + fileSeg;
    if (!seen[plain]) seen[plain] = 1;
    if (fileSeg === iconFile && !icon) icon = plain;
    if (fileSeg === artFile && !art) art = plain;
  });
  if (icon) out.push(icon + '|' + 'images/raw/head-' + outSlug + '.png');
  else missing.push(slug + '(icon)');
  if (art) out.push(art + '|' + 'images/raw/art-' + outSlug + '.jpg');
  else missing.push(slug + '(art)');
});
fs.writeFileSync('pipeline/dl_operators.txt', out.join('\n') + '\n');
console.log('queued:', out.length, '| missing:', missing.join(', ') || '(none)');
