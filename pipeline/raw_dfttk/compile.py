# -*- coding: utf-8 -*-
import json

ff = {w['name']: w for w in json.load(open('ff_weapons.json', encoding='utf-8')) if not w.get('isModification')}
bf = {w['name']: w for w in json.load(open('bf_weapons.json', encoding='utf-8'))}
bf['QBZ95-1'] = bf.get('QBZ95')  # 战场数据条目名为 QBZ95

SRC_DFTTK_FF = "https://dfttk.com/data/firefight/weapons.json"
SRC_DFTTK_BF = "https://dfttk.com/data/battlefield/weapons.json"
SRC_MOEGIRL  = "https://zh.moegirl.org.cn/zh-cn/%E4%B8%89%E8%A7%92%E6%B4%B2%E8%A1%8C%E5%8A%A8/%E6%AD%A6%E5%99%A8%E4%B8%8E%E9%85%8D%E4%BB%B6"
SRC_BITTOPUP = "https://wiki.bittopup.com/deltaforce/guns"

# (dfttk名FF索引, dfttk名BF索引, 中文名, rpm_override, mag, fireModes, confidence, notes, bittopup旧版烽火伤害, 额外sources)
W = [
 ("UZI","UZI","UZI冲锋枪",None,25,["全自动"],"high","初速450;UZI有67ms扳机延迟。bittopup旧版面板与当前一致",28,[]),
 ("野牛","野牛","野牛冲锋枪(PP-19)",None,32,["全自动"],"high","可加64发弹筒;初速500",32,[]),
 ("勇士","勇士","勇士冲锋枪(PP-19-01)",None,30,["全自动"],"medium","萌百未明说射击模式,按冲锋枪类自动火力推断;初速500",36,[]),
 ("MP5","MP5","MP5冲锋枪",None,30,["全自动"],"high","初速450",30,[]),
 ("SMG-45","SMG-45","SMG-45冲锋枪",None,25,["全自动"],"high","初速500",35,[]),
 ("SR-3M","SR-3M","SR-3M紧凑突击步枪",None,15,["全自动"],"high","9x39亚音速,初速330;萌百:全面战场远距离衰减更小、基础伤害更高",36,[]),
 ("P90","P90","P90冲锋枪",None,50,["全自动"],"high","初速450;战场另有P90长弓枪管变体(rpm785/初速600)",32,[]),
 ("MP7","MP7","MP7冲锋枪",None,20,["全自动"],"high","初速450;烽火伤害旧版29->当前32(版本调整)",29,[]),
 ("Vector","Vector","Vector冲锋枪",None,17,["全自动"],"high","初速500;全游戏射速第二(仅次于G18);bittopup详情页与dfttk完全一致(32/1091/17发/初速500)",32,["https://wiki.bittopup.com/deltaforce/guns/18020000003"]),
 ("QCQ171","QCQ171","QCQ171冲锋枪(二〇式冲锋枪)",None,30,["全自动"],"medium","初速450;穿甲/修脚双玩法流行(S10)",None,[]),
 ("MK4","MK4","MK4冲锋枪",None,24,["单发","三连发"],"high","默认三连发(连内1200rpm,间隔135ms)+单发;换枪管(深空镀铬/击剑)可解锁全自动;战场存在MK4全自动变体(dmg23/rpm872);胸腹同伤、四肢0.5倍率;初速475",None,[]),
 (None,None,"汤姆逊冲锋枪",None,None,[],"low","S11重新校准(Reorientation)赛季新枪,.45ACP大口径高射速冲锋枪;未查到任何面板数值(dfttk尚未收录)",None,[]),
 ("CAR-15","CAR-15","CAR-15突击步枪",None,20,["全自动"],"high","俗称豌豆射手;初速575;另有AR特勤一体消音组合枪管变体",27,[]),
 ("AKS-74U","AKS-74U","AKS-74U突击步枪",None,20,["全自动"],"high","初速500",34,[]),
 ("M4A1","M4A1","M4A1突击步枪",None,30,["全自动"],"medium","初速575(战场550);烽火伤害旧版27->当前31(版本调整);战场伤害20与9game攻略站战场面板一致;另有AR特勤一体消音枪管变体",27,["https://wiki.bittopup.com/deltaforce/guns/18010000001"]),
 ("AKM","AKM","AKM突击步枪",None,30,["全自动"],"high","初速525;性能枪管组合可将爆头倍率提至2.5;有性能枪管变体",40,[]),
 ("QBZ95-1","QBZ95-1","九五式自动步枪(QBZ-95-1)",None,30,["全自动"],"high","初速575;战场dfttk条目名为QBZ95;烽火伤害旧版27->当前28",27,[]),
 ("K416","K416","K416突击步枪",None,30,["全自动"],"medium","HK416原型;初速575(战场550);烽火伤害旧版29->当前31",29,[]),
 ("K437","K437","K437突击步枪",None,30,["全自动"],"medium","HK437原型,.300BLK;初速575",None,[]),
 ("AK12","AK12","AK-12突击步枪",None,30,["单发","两连发","全自动"],"high","萌百明确三种射击模式;初速575(战场550);S10四肢倍率0.4->0.45(与dfttk当前0.45吻合,证明数据为新版本);烽火伤害旧版27->当前30",27,[]),
 ("PTR-32","PTR-32","PTR-32突击步枪",None,30,["全自动"],"high","与AUG通用弹匣(30发,bittopup确认);初速630(战场550);烽火伤害旧版34->当前36",34,["https://wiki.bittopup.com/deltaforce/guns/18010000024"]),
 ("AS-Val","AS-Val","AS Val突击步枪(巨浪)",None,15,["全自动"],"high","9x39,初速300;射速972媲美冲锋枪;刺客高级枪管变体为四连发(850rpm):烽火dmg37,战场dmg26/rpm680;烽火伤害旧版29->当前28",29,[]),
 ("腾龙","腾龙","腾龙突击步枪(QBZ-191/二〇式自动步枪)",None,30,["全自动"],"medium","初速575;爆头倍率2.1(有额外爆头加成)",None,[]),
 ("AUG","AUG","AUG突击步枪",None,30,["全自动"],"medium","初速575(战场550);萌百未明说模式,按自动步枪推断;烽火伤害旧版29->当前32",29,[]),
 ("SG552","SG552","SG552突击步枪",None,20,["全自动"],"medium","俗称糖豆发射器;高射速906;初速575(战场550);烽火伤害旧版22->当前25",22,[]),
 ("M16A4","M16A4","M16A4突击步枪",None,20,["单发","三连发"],"high","三连发(连内1200rpm,间隔250ms)+单发,无全自动(萌百+dfttk双确认);dfttk战场数据未收录该枪",33,[]),
 ("G3","G3","G3战斗步枪",None,20,["全自动"],"high","初速630(战场550);萌百称有效射程最远的步枪",39,[]),
 ("M7","M7","M7战斗步枪",None,20,["全自动"],"medium","6.8x51;初速630(战场600);bittopup确认弹匣20发;堤风超长枪管变体烽火dmg39;烽火伤害旧版40->当前37",40,["https://wiki.bittopup.com/deltaforce/guns/18010000016"]),
 ("SCAR-H","SCAR-H","SCAR-H战斗步枪",None,20,["全自动"],"high","初速630",40,[]),
 ("ASh-12","ASh-12","ASh-12战斗步枪",None,20,["全自动"],"medium","12.7x55;初速340;战斧重型枪管变体:烽火dmg75,战场dmg50/rpm400",56,[]),
 ("KC17","KC17","KC17突击步枪",None,30,["全自动"],"medium","5.45x39;初速575(战场500);S7加强+限定4级超压弹",None,[]),
 ("MK47","MK47","MK47突击步枪",None,20,["全自动"],"medium","7.62x39;初速525;鏖战枪管烽火dmg46、余烬枪管烽火dmg45",None,[]),
 ("MCX-LT","MCX-LT","MCX LT突击步枪",None,30,["全自动"],"medium",".300BLK;初速450;焰魂枪管变体烽火dmg36",None,[]),
 ("AR57","AR57","AR-57突击步枪",None,50,["全自动"],"medium","5.7x28,沿用P90弹匣(50发);初速525;S9赛季新枪",None,[]),
 ("RM277","RM277","RM277突击步枪",None,None,["全自动"],"medium","6.8x51;初速650(战场600);S10裂变赛季新枪;胸腹同伤(与dfttk腹部倍率1.0吻合);弹匣容量未查到",None,[]),
 (None,None,"MDR突击步枪",None,None,[],"low","7.62x51;重新校准(Reorientation)赛季新枪;未查到任何面板数值",None,[]),
 ("QJB201","QJB201","QJB-201轻机枪(二〇式轻机枪)",None,125,["全自动"],"medium","5.8x42;初速575(战场550);扳机延迟67ms",None,[]),
 ("M250","M250","M250通用机枪",None,125,["全自动"],"high","6.8x51;初速630(战场633);扳机延迟0.1秒全游戏最高(萌百+dfttk双确认);可改75发弹链;有钛金长枪管变体",55,[]),
 ("M249","M249","M249轻机枪",None,100,["全自动"],"high","5.56x45;初速575(战场550);扳机延迟50ms",30,[]),
 ("PKM","PKM","PKM通用机枪",None,75,["全自动"],"high","7.62x54R;初速630(战场546);扳机延迟50ms",45,[]),
 ("PSG-1","PSG-1","PSG-1射手步枪",None,10,["半自动"],"high","7.62x51;初速750;旧版射速300->当前249(DMR射速调整)",50,[]),
 ("SR9","SR9","SR9射手步枪",None,10,["半自动"],"high","7.62x51;初速750",None,[]),
 ("SR25","SR-25","SR-25射手步枪",None,10,["半自动"],"high","7.62x51;初速550;瞬息短枪管变体烽火dmg55/rpm364;旧版射速364->当前303",50,[]),
 ("SKS","SKS","SKS射手步枪",None,10,["半自动"],"medium","7.62x39;初速575;固定10发弹仓;旧版伤害44/射速510->当前48/411(版本调整,萌百2025-06仍记载510)",44,[]),
 ("M14","M14","M14战斗射手步枪",None,10,["半自动","全自动"],"high","7.62x51;初速575(战场633)",40,[]),
 ("SVD","SVD","SVD射手步枪",None,10,["半自动"],"high","7.62x54R;初速500;爆头倍率2.32;旧版射速300->当前261",56,[]),
 ("VSS","VSS","VSS射手步枪",None,15,["半自动","全自动"],"high","9x39亚音速,初速330;萌百明确半自动+全自动双模式;旧版伤害35->当前40",35,[]),
 ("Mini-14","Mini-14","Mini-14射手步枪",None,10,["半自动"],"high","5.56x45;初速650;旧版伤害32/射速590->当前34/475",32,[]),
 ("Marlin杠杆步枪","Marlin杠杆步枪","Marlin杠杆步枪",None,10,["单发(杠杆式)"],"medium",".45-70 Govt;初速750;犀牛杠杆烽火dmg100、蜂鸟杠杆烽火dmg75",None,[]),
 ("SVCH","SVCH","SVCH射手步枪",None,10,["半自动"],"medium","7.62x54R;初速680(战场600);扩容20发;全自动枪管配件:前三发700rpm后回600;萌百记肉伤46/甲伤47,dfttk为肉伤47/甲伤46(互换,存疑);战场伤害30与萌百所称战场甲伤30一致",None,[]),
 ("SV98","SV-98","SV-98狙击步枪",None,7,["栓动"],"high","7.62x54R;初速650;爆头倍率2.5;旧版伤害55->当前60",55,[]),
 ("R93","R93","R93狙击步枪",None,10,["直拉栓动"],"high","7.62x51;初速550;爆头倍率2.5;旧版伤害55->当前61",55,[]),
 ("M700","M700","M700狙击步枪",None,5,["栓动"],"high","7.62x51;初速650;爆头倍率2.5;旧版伤害55->当前61",55,[]),
 ("AWM","AWM","AWM狙击步枪",None,5,["栓动"],"high",".338 Lapua Magnum;初速975(萌百记最高约1200m/s,以dfttk 975为准,存疑);旧版射速35->当前31",100,[]),
 ("M82","M82","M82狙击步枪(半自动反器材步枪)",None,None,["半自动"],"medium",".50BMG;初速525;S9赛季新枪,烽火可对载具造成伤害;弹匣容量未查到(现实原型10发,巴哈姆特转述公告疑提及20发,归属不明,故留空);dfttk战场数据未收录",None,[]),
 ("725双管","725双管","725双管霰弹枪",None,2,["双管单发"],"medium","12Gauge;伤害为全弹丸合计(dfttk口径);dfttk未给出部位倍率",None,[]),
 ("M870","M870","M870霰弹枪",None,6,["泵动"],"high","12Gauge,8弹丸;伤害为8弹丸合计;旧版每弹丸14(bittopup,合计112)与当前合计136存在版本/口径差异,存疑",None,[]),
 ("S12K","S12K","S12K霰弹枪",None,5,["半自动"],"high","12Gauge,8弹丸;合计104约为每弹丸13(与bittopup一致);装撞火枪托可全自动(萌百)",None,[]),
 ("M1014","M1014","M1014霰弹枪",None,7,["半自动"],"high","12Gauge,8弹丸;合计112=每弹丸14(与bittopup完全一致)",None,[]),
 (None,None,"FS12霰弹枪",None,6,["泵动","半自动"],"low","12Gauge;S8/S9赛季新枪;烽火伤害未查到(dfttk未收录);战场基础伤害18/优势射程12米(TapTap攻略,单发口径存疑);S9削弱半自动散布",None,["https://www.taptap.cn/moment/774407533556140443"]),
 ("G17","G17","G17手枪",None,17,["半自动"],"high","初速400",27,[]),
 ("QSZ92G","QSZ92G","QSZ-92G手枪(九二式改进型)",None,15,["半自动"],"high","9x19;初速400",34,[]),
 ("沙漠之鹰","沙漠之鹰","沙漠之鹰手枪",None,7,["半自动"],"high",".50AE;初速340",50,[]),
 ("93R","93R","93R手枪",None,12,["三连发"],"high","9x19;初速400;萌百:S11可改全自动;可能另有单发档(未证实)",34,[]),
 ("G18","G18","G18手枪",None,17,["全自动"],"high","9x19;初速400;全游戏最高射速1172;旧版伤害22->当前23",22,[]),
 (".357左轮",".357左轮",".357左轮手枪",None,6,["半自动(双动)"],"high",".357 Magnum;初速340;扳机延迟0.1秒(萌百+dfttk双确认)",56,[]),
 ("M1911","M1911","M1911手枪",None,7,["半自动"],"medium",".45ACP;初速400;战场dfttk条目疑似数据错误(口径标9x19、rpm706),战场伤害25仅供参考",40,[]),
 (None,None,"复合弓",None,1,["单发(拉弓)"],"low","特殊武器;比枪械更安静;无面板数值",None,[]),
]

out = []
for ffkey, bfkey, cn, rpm_ov, mag, fm, conf, notes, old, extra_src in W:
    rec = {"name": cn, "fireModes": fm, "rpm": None, "mag": mag,
           "damageOps": None, "damageWarfare": None, "extra": {}, "sources": [], "confidence": conf, "notes": notes}
    srcs = []
    ffv = ff.get(ffkey) if ffkey else None
    bfv = bf.get(bfkey) if bfkey else None
    if ffv:
        rec["rpm"] = rpm_ov if rpm_ov else ffv["fireRate"]
        rec["damageOps"] = ffv["damage"]
        rec["extra"]["caliber"] = ffv["caliber"].replace("*", "x")
        rec["extra"]["muzzleVelocityOps"] = ffv["muzzleVelocity"]
        rec["extra"]["armorDamageOps"] = ffv["armorDamage"]
        rt = [r for r in (ffv.get("range1"), ffv.get("range2"), ffv.get("range3")) if r]
        if rt: rec["extra"]["rangeTiersOps"] = rt
        if ffv.get("headMultiplier"): rec["extra"]["headMultiplierOps"] = ffv["headMultiplier"]
        if ffv.get("triggerDelay"): rec["extra"]["triggerDelayMs"] = ffv["triggerDelay"]
        srcs.append(SRC_DFTTK_FF)
    if bfv:
        rec["damageWarfare"] = bfv["damage"]
        rec["extra"]["muzzleVelocityWarfare"] = bfv["muzzleVelocity"]
        srcs.append(SRC_DFTTK_BF)
    if old is not None:
        srcs.append(SRC_BITTOPUP)
    srcs.extend(extra_src)
    if (mag is not None or fm) and SRC_MOEGIRL not in srcs:
        srcs.append(SRC_MOEGIRL)
    rec["sources"] = srcs
    out.append(rec)

with open("../deltaforce_weapons.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

print("records:", len(out))
n_ops = sum(1 for r in out if r["damageOps"] is not None)
n_bf = sum(1 for r in out if r["damageWarfare"] is not None)
print("with damageOps:", n_ops, "| with damageWarfare:", n_bf)
for r in out:
    print(r["name"], "| rpm", r["rpm"], "| mag", r["mag"], "| ops", r["damageOps"], "| bf", r["damageWarfare"], "|", "/".join(r["fireModes"]), "|", r["confidence"])
