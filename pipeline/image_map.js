// 图片资源下载辅助:武器图标映射(游戏不依赖本文件)
// dfttk 原始数据(raw_dfttk/ff_weapons.json 等)带有腾讯官方 CDN 的武器图标,
// 本表把 weapons.js 的 nickname 映射到 dfttk 记录名;null = dfttk 未收录(S11 新枪/特殊武器)。
'use strict';

var WEAPON_DFTTK = {
  'CAR-15': 'CAR-15', 'AKS-74U': 'AKS-74U', 'M4A1': 'M4A1', 'AKM': 'AKM',
  'QBZ-95-1': 'QBZ95-1', 'K416': 'K416', 'K437': 'K437', 'AK-12': 'AK12',
  'PTR-32': 'PTR-32', 'AS Val': 'AS-Val', '腾龙': '腾龙', 'AUG': 'AUG',
  'SG552': 'SG552', 'M16A4': 'M16A4', 'G3': 'G3', 'M7': 'M7',
  'SCAR-H': 'SCAR-H', 'ASh-12': 'ASh-12', 'KC17': 'KC17', 'MK47': 'MK47',
  'MCX LT': 'MCX-LT', 'AR-57': 'AR57', 'RM277': 'RM277', 'MDR': null,
  'UZI': 'UZI', '野牛冲锋枪': '野牛', '勇士冲锋枪': '勇士', 'MP5': 'MP5',
  'SMG-45': 'SMG-45', 'SR-3M': 'SR-3M', 'P90': 'P90', 'MP7': 'MP7',
  'Vector': 'Vector', 'QCQ171': 'QCQ171', 'MK4': 'MK4', '汤姆逊': null,
  'G17': 'G17', 'QSZ-92G': 'QSZ92G', '沙漠之鹰': '沙漠之鹰', '93R': '93R',
  'G18': 'G18', '.357左轮': '.357左轮', 'M1911': 'M1911',
  'SR9': 'SR9', 'Mini-14': 'Mini-14', 'M14': 'M14', 'SKS': 'SKS',
  'PSG-1': 'PSG-1', 'VSS': 'VSS', 'SVD': 'SVD', 'SR-25': 'SR25',
  '杠杆式步枪': 'Marlin杠杆步枪', 'SVCH': 'SVCH', 'M249': 'M249', 'M250': 'M250',
  'PKM': 'PKM', 'QJB-201': 'QJB201', 'M870': 'M870', 'M1014': 'M1014',
  'S12K': 'S12K', '725': '725双管', 'FS12': null,
  'SV-98': 'SV98', 'R93': 'R93', 'M700': 'M700', 'AWM': 'AWM', 'M82': 'M82',
  '复合弓': null,
};

// 文件名 slug(ASCII)
var WEAPON_SLUG = {
  'CAR-15': 'car-15', 'AKS-74U': 'aks-74u', 'M4A1': 'm4a1', 'AKM': 'akm',
  'QBZ-95-1': 'qbz-95-1', 'K416': 'k416', 'K437': 'k437', 'AK-12': 'ak-12',
  'PTR-32': 'ptr-32', 'AS Val': 'as-val', '腾龙': 'tenglong', 'AUG': 'aug',
  'SG552': 'sg552', 'M16A4': 'm16a4', 'G3': 'g3', 'M7': 'm7',
  'SCAR-H': 'scar-h', 'ASh-12': 'ash-12', 'KC17': 'kc17', 'MK47': 'mk47',
  'MCX LT': 'mcx-lt', 'AR-57': 'ar-57', 'RM277': 'rm277', 'MDR': 'mdr',
  'UZI': 'uzi', '野牛冲锋枪': 'yeniu', '勇士冲锋枪': 'yongshi', 'MP5': 'mp5',
  'SMG-45': 'smg-45', 'SR-3M': 'sr-3m', 'P90': 'p90', 'MP7': 'mp7',
  'Vector': 'vector', 'QCQ171': 'qcq171', 'MK4': 'mk4', '汤姆逊': 'tangmuxun',
  'G17': 'g17', 'QSZ-92G': 'qsz-92g', '沙漠之鹰': 'shamozhiying', '93R': '93r',
  'G18': 'g18', '.357左轮': '357', 'M1911': 'm1911',
  'SR9': 'sr9', 'Mini-14': 'mini-14', 'M14': 'm14', 'SKS': 'sks',
  'PSG-1': 'psg-1', 'VSS': 'vss', 'SVD': 'svd', 'SR-25': 'sr-25',
  '杠杆式步枪': 'marlin', 'SVCH': 'svch', 'M249': 'm249', 'M250': 'm250',
  'PKM': 'pkm', 'QJB-201': 'qjb-201', 'M870': 'm870', 'M1014': 'm1014',
  'S12K': 's12k', '725': '725', 'FS12': 'fs12',
  'SV-98': 'sv-98', 'R93': 'r93', 'M700': 'm700', 'AWM': 'awm', 'M82': 'm82',
  '复合弓': 'fuhegong',
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WEAPON_DFTTK: WEAPON_DFTTK, WEAPON_SLUG: WEAPON_SLUG };
}
