// 洲一把 · 三角洲行动干员数据库(2026-09-29 按 S11「群星」赛季调研并经玩家人工审核后录入,共 17 名)
// 数据来源:萌娘百科各干员页(游戏内官方档案转录)+ fandom 英文代号总表 + 官方赛季公告交叉验证
//
// 字段说明:
//   nickname    干员代号(游戏内显示名),棋盘首列与提交判定以它为准
//   alias       英文代号(如 D-Wolf),搜索联想用,也可直接提交
//   可用        false = 仅存档,不参与对局
//   阵营        GTI / 哈夫克 / 无(无名,设定上无阵营)—— 精确匹配:相同绿,不同灰
//   职业        突击 / 工程 / 支援 / 侦察(精确匹配)
//   性别        男 / 女(精确匹配)
//   登场赛季    公测 / S3 ~ S11(精确匹配,不上棋盘,结算页展示)
//   身高        cm(棋盘数值列,±3 判「接近」+ ▲▼)
//   年龄        岁(棋盘数值列,±1 判「接近」+ ▲▼)
//   本名        档案真名(结算页展示)
//   称号        档案称号/履历(结算页展示)
//   备注        分部、CV 等(结算页展示)
//   标签        技能 / 道具关键词(备查,暂无数据,不上棋盘)
//   pinyin      干员名全拼 / pinyinAbbr 首字母 —— 仅用于候选联想,不能直接提交
//               两者都支持「字符串或数组」:数组用于多音字与常见误拼
//               (如 旅人 lvren/luren;骇爪 haizhua 与旧数据笔误 huaizhua 都保留)
//   avatar / images   头像与立绘路径(空则自动隐藏,不出现破图)

window.ZHOUYIBA_OPERATORS = [
 { id: 1, nickname: "红狼", alias: "D-Wolf", 可用: true, 阵营: "GTI", 职业: "突击", 性别: "男", 登场赛季: "公测", 身高: 183, 年龄: 29, 本名: "凯·席尔瓦 Kai Silva", 称号: "单兵外骨骼首个使用者", 备注: "GTI 北美分部 · CV 青琳昊", 标签: [], pinyin: "honglang", pinyinAbbr: "hl", avatar: "images/head-honglang.webp", images: ["images/art-honglang.webp"] },
 { id: 2, nickname: "威龙", alias: "Vyron", 可用: true, 阵营: "GTI", 职业: "突击", 性别: "男", 登场赛季: "公测", 身高: 178, 年龄: 27, 本名: "王宇昊", 称号: "", 备注: "GTI 亚洲分部 · CV 王天资", 标签: [], pinyin: "weilong", pinyinAbbr: "wl", avatar: "images/head-weilong.webp", images: ["images/art-weilong.webp"] },
 { id: 3, nickname: "牧羊人", alias: "Shepherd", 可用: true, 阵营: "GTI", 职业: "工程", 性别: "男", 登场赛季: "公测", 身高: 193, 年龄: 34, 本名: "泰瑞·缪萨 Terry Musa", 称号: "", 备注: "GTI 北美分部 · CV 孟祥龙", 标签: [], pinyin: "muyangren", pinyinAbbr: "myr", avatar: "images/head-muyangren.webp", images: ["images/art-muyangren.webp"] },
 { id: 4, nickname: "蜂医", alias: "Stinger", 可用: true, 阵营: "GTI", 职业: "支援", 性别: "男", 登场赛季: "公测", 身高: 176, 年龄: 27, 本名: "罗伊·斯米 Roy Smee", 称号: "", 备注: "GTI 欧洲分部 · CV 张远韬", 标签: [], pinyin: "fengyi", pinyinAbbr: "fy", avatar: "images/head-fengyi.webp", images: ["images/art-fengyi.webp"] },
 { id: 5, nickname: "露娜", alias: "Luna", 可用: true, 阵营: "GTI", 职业: "侦察", 性别: "女", 登场赛季: "公测", 身高: 170, 年龄: 30, 本名: "金卢娜 Luna Kim", 称号: "", 备注: "GTI 北美分部 · CV 姜英俊", 标签: [], pinyin: "luna", pinyinAbbr: "ln", avatar: "images/head-luna.webp", images: ["images/art-luna.webp"] },
 { id: 6, nickname: "骇爪", alias: "Hackclaw", 可用: true, 阵营: "GTI", 职业: "侦察", 性别: "女", 登场赛季: "公测", 身高: 164, 年龄: 22, 本名: "麦晓雯", 称号: "电子攻防专家", 备注: "GTI 亚洲分部 · CV 周越 · 广东出身", 标签: [], pinyin: ["haizhua", "huaizhua"], pinyinAbbr: "hz", avatar: "images/head-haizhua.webp", images: ["images/art-haizhua.webp"] },
 { id: 7, nickname: "蛊", alias: "Toxik", 可用: true, 阵营: "GTI", 职业: "支援", 性别: "女", 登场赛季: "公测", 身高: 171, 年龄: 33, 本名: "佐娅·庞琴科娃 Зоя Панченкова", 称号: "前SSO·神经化学研究者", 备注: "GTI 欧洲分部 · CV 穆雪婷", 标签: [], pinyin: "gu", pinyinAbbr: "", avatar: "images/head-gu.webp", images: ["images/art-gu.webp"] },
 { id: 8, nickname: "乌鲁鲁", alias: "Uluru", 可用: true, 阵营: "GTI", 职业: "工程", 性别: "男", 登场赛季: "公测", 身高: 191, 年龄: 40, 本名: "大卫·费莱尔 David Fletcher", 称号: "", 备注: "GTI 大洋洲分部 · CV 戴海嘉 · 澳大利亚出身", 标签: [], pinyin: "wululu", pinyinAbbr: "wll", avatar: "images/head-wululu.webp", images: ["images/art-wululu.webp"] },
 { id: 9, nickname: "深蓝", alias: "Sineva", 可用: true, 阵营: "GTI", 职业: "工程", 性别: "男", 登场赛季: "S3", 身高: 198, 年龄: 45, 本名: "阿列克谢·彼得罗夫 Алексей Петров", 称号: "前阿尔法小队教官", 备注: "GTI 欧洲分部 · CV 赵梓涵", 标签: [], pinyin: "shenlan", pinyinAbbr: "sl", avatar: "images/head-shenlan.webp", images: ["images/art-shenlan.webp"] },
 { id: 10, nickname: "无名", alias: "Nox", 可用: true, 阵营: "无", 职业: "突击", 性别: "男", 登场赛季: "S4", 身高: 178, 年龄: 25, 本名: "埃利·德·蒙贝尔 Hélie De Montbel", 称号: "前哈夫克受训佣兵", 备注: "设定上无阵营(前脑机项目逃脱实验体) · CV 黑石稔", 标签: [], pinyin: "wuming", pinyinAbbr: "wm", avatar: "images/head-wuming.webp", images: ["images/art-wuming.webp"] },
 { id: 11, nickname: "疾风", alias: "Tempest", 可用: true, 阵营: "哈夫克", 职业: "突击", 性别: "女", 登场赛季: "S5", 身高: 174, 年龄: 29, 本名: "克莱尔·安·拜尔斯 Claire Ann Byers", 称号: "", 备注: "哈夫克安全防卫部 · CV Mace · 目前唯一哈夫克干员", 标签: [], pinyin: "jifeng", pinyinAbbr: "jf", avatar: "images/head-jifeng.webp", images: ["images/art-jifeng.webp"] },
 { id: 12, nickname: "银翼", alias: "Raptor", 可用: true, 阵营: "GTI", 职业: "侦察", 性别: "男", 登场赛季: "S6", 身高: 181, 年龄: 61, 本名: "兰登·哈里森 Landon Harrison", 称号: "前GTI情报主管·赏金猎人", 备注: "现属哈里森情报事务所 · CV 图特哈蒙 · 游戏内首位男侦察", 标签: [], pinyin: "yinyi", pinyinAbbr: "yy", avatar: "images/head-yinyi.webp", images: ["images/art-yinyi.webp"] },
 { id: 13, nickname: "比特", alias: "Gizmo", 可用: true, 阵营: "GTI", 职业: "工程", 性别: "男", 登场赛季: "S7", 身高: 187, 年龄: 26, 本名: "拉希德·拉哈尔 Rashid Lahar", 称号: "哨兵蜘蛛「T仔」设计者", 备注: "GTI 非洲分部 · CV 李洋 · 首位阿萨拉出身干员", 标签: [], pinyin: "bite", pinyinAbbr: "bt", avatar: "images/head-bite.webp", images: ["images/art-bite.webp"] },
 { id: 14, nickname: "蝶", alias: "Vlinder", 可用: true, 阵营: "GTI", 职业: "支援", 性别: "女", 登场赛季: "S8", 身高: 167, 年龄: 27, 本名: "莉娜·范德梅尔 Lina van der Meer", 称号: "", 备注: "GTI 欧洲分部 · CV 龟娘 · 荷兰出身", 标签: [], pinyin: "die", pinyinAbbr: "", avatar: "images/head-die.webp", images: ["images/art-die.webp"] },
 { id: 15, nickname: "回响", alias: "Morse", 可用: true, 阵营: "GTI", 职业: "侦察", 性别: "男", 登场赛季: "S9", 身高: 180, 年龄: 32, 本名: "卢克·埃弗利 Luke Everley", 称号: "声学情报专家", 备注: "GTI 欧洲分部 · CV 苏至豪", 标签: [], pinyin: "huixiang", pinyinAbbr: "hx", avatar: "images/head-huixiang.webp", images: ["images/art-huixiang.webp"] },
 { id: 16, nickname: "液氮", alias: "N-Two", 可用: true, 阵营: "GTI", 职业: "工程", 性别: "男", 登场赛季: "S10", 身高: 187, 年龄: 33, 本名: "加布里埃尔·默里尔 Gabriel Mercier", 称号: "", 备注: "GTI 北美分部 · CV 森中人", 标签: [], pinyin: "yedan", pinyinAbbr: "yd", avatar: "images/head-yedan.webp", images: ["images/art-yedan.webp"] },
 { id: 17, nickname: "旅人", alias: "Rover", 可用: true, 阵营: "GTI", 职业: "支援", 性别: "男", 登场赛季: "S11", 身高: 178, 年龄: 23, 本名: "罗温·沃尔什 Rowan Walsh", 称号: "前户外探险家", 备注: "GTI 欧洲分部 · CV 鱼冻(一说李春胤,待核) · 搭档军犬「四叶」", 标签: [], pinyin: ["lvren", "luren"], pinyinAbbr: "lr", avatar: "", images: [] },
];
