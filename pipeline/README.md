# 数据流水线(不参与游戏运行)

本目录存放猜武器模式的原始调研数据与生成脚本。**游戏只读取根目录的 `weapons.js`**。

## 文件

- `deltaforce_weapons.json` —— 数值调研原始结果(68 条:射击模式 / 射速 / 弹匣 / 初速等附加字段,
  分模式伤害 `damageOps`(烽火)与 `damageWarfare`(全面战场,`null` = 未收录),
  战场伤害的来源与置信度 `warfareSource` / `warfareConfidence`,以及逐条信源 URL 与 `confidence`);
- `raw_dfttk/` —— 调研时从 dfttk.com 抓取的**完整原始数据**(烽火 82 条含枪管改件 / 战场 44 条 / 弹药系数表等),比上面的整理版更全,可追溯每个数值;
- `gen_weapons.js` —— 生成脚本:读取上面的 JSON,归一口径与射击模式词表后输出 `../weapons.js`(68 条,全部两模式通用)。运行:`node gen_weapons.js`(或根目录 `npm run gen:weapons`)。
  仓库里的 `weapons.js` 与生成结果**逐字节一致**,可放心重跑。

## 信源(按权重)

1. **dfttk.com** —— 三角洲行动 TTK 查询站,`/data/firefight/weapons.json`(烽火地带)与 `/data/battlefield/weapons.json`(全面战场)两个数据文件,**伤害分模式记录**(两模式数值确实不同,如 M4A1 烽火 31 / 战场 20);
2. **wiki.bittopup.com/deltaforce/guns** —— 42 把武器的旧版本面板快照(约 2024 底~2025 初),用于交叉核对;与 dfttk 有 12 处版本差异,已按 dfttk(新)为准;
3. **萌娘百科「三角洲行动/武器与配件」** —— 全武器清单、口径、射击模式描述、模式归属旁证;
4. 辅助:官方赛季公告转载(4399 / 游侠 / TapTap / 巴哈姆特)确认 S5/S9/S11 新枪与卡池注入。

## 伤害的「未知」与「相同」是两件事(2026-09-30 修订)

`weapons.js` 里 `战场伤害: null` 的含义是**该模式的数值没有信源**,而不是「与烽火相同」:

- 游戏侧:棋盘显示未知「-」,判灰,**不参与 ±2 容差判定**(见 `core.js` 的 `damageOf`);
- 如需表达两模式数值确实相同,在数据里写 `战场伤害同烽火: true`,此时才取 `伤害` 的值;
- 修订依据:原始调研 68 条中 `damageWarfare` 有值 40 条、为 `null` 28 条,
  而**没有任何一条** `damageWarfare === damageOps` —— 旧版「留空 = 相同」会把 25 把
  (含玩家核对修正补入的 3 把)没有战场信源的枪当成实测值展示;
- 生成脚本里的白名单 `SAME_AS_OPS` 用于显式声明「同烽火」,当前含 **FS12**(2026-10-01 玩家确认);
  运行 `node gen_weapons.js` 会打印「战场伤害未收录」清单与「同烽火」条数。

**当前仍未收录(全面战场伤害,共 7 把)**:M16A4、Marlin杠杆步枪(杠杆式步枪)、725、M870、S12K、
M1014、93R —— 即 4 把霰弹枪 + 杠杆式步枪 + M16A4 + 93R。
`gen_weapons.js` 每次运行都会打印这份清单。

**2026-10-01 变更**:M82 补入战场伤害 **100**(玩家确认);FS12 确认**两模式数值相同**,
改用 `SAME_AS_OPS` 白名单显式声明(而非留空),棋盘战场模式下沿用烽火值 112。

## 全面战场伤害补充调研(2026-09-30)

dfttk 的战场数据集只有 44 条(不含狙击枪 / 霰弹枪 / 手枪),此前有 25 把武器的战场伤害为空。
本次补入 **16 条**,来源是社区伤害计算器使用的静态数据集:

- **主源**:[`delta-force-plugin/resources/data/weapons_mp.json`](https://raw.githubusercontent.com/Entropy-Increase-Team/delta-force-plugin/main/resources/data/weapons_mp.json)
  —— Yunzai / AstrBot / NoneBot / Koishi / Karin 各版三角洲插件共用的计算器数据(算法与数据由繁星攻略组整理);
  同仓库的 [`battlefield_weapons.json`](https://raw.githubusercontent.com/Entropy-Increase-Team/delta-force-plugin/main/resources/data/battlefield_weapons.json)
  是它的子集,两者在所有重叠条目上一致;
- **采用依据(关键校验)**:该数据集里 M1911 的战场伤害为 **35**,与本项目「玩家游戏内实测」修正后的值一致
  (dfttk 给的 25 是错的)—— 说明它对战场伤害比 dfttk 准,故选它补值而不是沿用 dfttk;
- **第二源交叉核对**:与 2024-10 的 [全面战场 47 武器数据表](https://palygamer.com/delta-force-weapon-range/) 对比,
  16 条中 14 条完全一致(PSG-1 / SR-9 / SR-25 / SVD / VSS / Mini-14 / M700 / R93 / SV-98 / G17 / G18 / 沙漠之鹰 / .357左轮 / QSZ92G);
- **两处版本差异**:SKS 取 27(旧表 26)、AWM 取 100(旧表 85)。AWM 的 100 与社区实测讨论
  「大战场 AWM 基础伤害 100」一致(即与烽火同值),但**尚未游戏内实测**;
- 每条记录都写入了来源与置信度:`warfareSource`(数据集路径)、`warfareConfidence`
  (`medium-high` = 两个来源一致 / `medium` = 单源),并在 `notes` 里注明抓取日期与「尚未游戏内实测」。

**跨源冲突(未改动现有数据,待游戏内实测)**:同一份数据集与 dfttk 在 3 把枪上不一致 ——
全面战场基础伤害 `AS VAL` 20 vs 21、`QBZ95-1` 22 vs 23、`QJB-201` 35 vs 21(dfttk 值在后)。
其中 QJB-201 差异过大(35 会高于 6.8mm 口径 M250 的 34),更像数据集自身有误,**暂不采纳**;
保留 dfttk 值并把冲突记录在此,等游戏内靶场实测确认后再改。

**如何继续补**:游戏内读到数值后直接改 `deltaforce_weapons.json` 的 `damageWarfare`,
把 `warfareConfidence` 改成 `verified`,再运行 `node gen_weapons.js` 重新生成 `weapons.js` 即可。

## 干员图片辅助脚本

这两个脚本只服务 `operators.js` 的头像 / 立绘字段,与武器数值无关:

- `extract_operator_images.js` —— 从萌百干员页缓存 HTML 里提取官方 icon 与默认立绘的原图 URL,生成下载清单
  `dl_operators.txt`;产物 slug 走内部的 `OUT_SLUG` 修正表(输入缓存页仍叫 `huaizhua.html`,产物按正确拼音
  写成 `head-haizhua.*`);
- `patch_operator_avatars.js` —— 按「有 head-* 用 head-*,否则降级用立绘」的规则把头像/立绘路径写回 `operators.js`
  (幂等,可重复运行;在仓库根目录执行)。

> 回响 / 液氮 原先把整张立绘当头像(裁切位置偏),现已从各自立绘顶部裁出 `head-huixiang.webp` /
> `head-yedan.webp`(105×105,与其余头像同规格),因此 16/17 名干员都有独立头像,仅旅人暂无图。

## 已知数据边界(2026-09-29 / 修订 2026-09-30,S11「群星」时点)

- **全面战场伤害分三部分**:43 把来自 dfttk(M4A1、FS12 另有第二来源佐证)、16 把来自社区计算器数据集
  (见上一节,双源一致的标 `medium-high`)、剩下 7 把仍未收录(棋盘按未知「-」处理);
  另有 M82(玩家补 100)与 FS12(声明与烽火相同)不在此三类内;
- **玩家核对修正(2026-09-29)** 已合并进生成脚本 `gen_weapons.js` 的 `CORRECTIONS`:MDR/汤姆逊 全套面板、RM277 弹匣 30、SKS 射速 510、M82 弹匣 5、M1911 战场伤害 35、复合弓伤害 90/112、FS12 双档(面板按半自动 14×8/300 记录,泵动 18×8/71 写入备注);**2026-10-01** 追加 M82 战场伤害 100,FS12 移入 `SAME_AS_OPS`;
- **霰弹枪伤害显示「单弹丸×弹丸数」、按总伤比对**(弹丸数按 8 计);725 弹丸数未经核实,暂只显示总伤 120;
- **蜜罐 / 蝎式 / 98K / AA-12 已剔除**(2026-09-29):这 4 把出自 S11 爆料文(疑似 AI 乱纹),玩家核实**不存在于游戏**;
- 复合弓为两模式通用:全面战场中是突击兵与侦察兵的特殊武器(玩家核实);
- **全面战场卡池是否真的包含全部 68 把仍未核实**:dfttk 的战场数据集只有 44 条(仅冲锋枪 / 步枪 / 机枪 / 射手步枪,唯一的例外是 M1911),无法据此判断狙击枪 / 霰弹枪 / 手枪在该模式的可用性;当前按「通用」处理,如确认某个模式不含某把武器,把该条 `模式` 改成 `仅烽火地带` / `仅全面战场` 即可(卡池过滤已生效,不再静默回退);
- 后续赛季新增武器需重新调研后追加。
