/* 洲一把 · 核心逻辑(纯函数,零 DOM 依赖,浏览器与 node 通用)
 * ---------------------------------------------------------------
 * 这里只有「模式配置 + 判定 + 联想 + 卡池 + 存档键 + 每日一题 + 分享文案」,
 * 不碰任何 DOM;界面与事件在 app.js。浏览器通过 window.ZHOUYIBA 取用,
 * node 通过 require('./core.js') 取用(见 test/core.test.js)。
 *
 * 双模式:
 * - 猜干员(operators.js):阵营 / 职业 / 性别 精确,身高(±3) / 年龄(±1) 数值判定;
 *   登场赛季 / 称号不上棋盘,只在结算页展示。
 * - 猜武器(weapons.js):分「烽火地带」「全面战场」两个子模式卡池;
 *   类型 / 口径 精确,射击模式 集合重叠,伤害(±2) / 射速(±30) / 弹匣(±5) 数值判定。
 *
 * 伤害取值(重要语义,2026-09-30 修订):
 * - 烽火地带读 `伤害`;
 * - 全面战场优先读 `战场伤害`;**未收录时按「未知」处理(null → 棋盘显示 "-")**,
 *   不再默认等于烽火数值 —— 原始调研里没有任何一条两模式数值相同的记录;
 * - 若某把武器确认两模式数值相同,在数据里显式写 `战场伤害同烽火: true`。
 *
 * 存档键:战绩按「模式 + 子模式」分桶存放,另有跨模式总计;最近目标按模式分键。
 */
(function () {
  'use strict';

  var ZHOUYIBA = {};

  /** 最近猜过的目标在多长时间内不再抽到(避免连续抽到同一目标) */
  var RECENT_WINDOW_MS = 60 * 60 * 1000;

  /** 存档键(集中在此,便于测试与迁移) */
  var KEYS = {
    stats: 'zhou-yiba:stats',            // 跨模式总计
    statsBucket: 'zhou-yiba:stats:',     // + bucket(见 statsBucket)
    recent: 'zhou-yiba:recent:',         // + 模式(见各模式 recentKey)
    session: 'zhou-yiba:session',        // 未完成对局(续玩)
    daily: 'zhou-yiba:daily',            // 每日一题完成记录
  };

  function warn(message) {
    if (typeof console !== 'undefined' && console && console.warn) {
      console.warn('[洲一把] ' + message);
    }
  }

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
          key: '伤害', label: '伤害', type: 'numeric', close: 2,
          // 霰弹枪显示「单弹丸×弹丸数」,比对仍按总伤(伤害字段)
          displayValue: function (item) { return item['伤害明细'] || null; },
        },
        { key: '射速', label: '射速', type: 'numeric', close: 30 },
        { key: '弹匣', label: '弹匣', type: 'numeric', close: 5 },
      ],
      /** 数值取值:伤害按子模式取(未收录 → null,即棋盘上的未知 "-") */
      resolveValue: function (item, key, subModeId) {
        return key === '伤害' ? damageOf(item, subModeId) : item[key];
      },
      /** 未收录数值时的状态行提示(UI 用) */
      unknownHint: function (key, count) {
        return '该模式下有 ' + count + ' 把武器的「' + key + '」未收录,棋盘按未知「-」显示';
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
        var dmg = damageOf(t, subModeId);
        var dmgText;
        if (dmg == null) dmgText = '未收录';
        else if (t['伤害明细']) dmgText = t['伤害明细'] + '(总伤 ' + dmg + ')';
        else dmgText = dmg;
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

  /** 当前子模式下的伤害值:数字 = 已收录;null = 未收录(未知) */
  function damageOf(item, subModeId) {
    if (!item) return null;
    if (subModeId !== 'warfare') return item['伤害'];
    if (typeof item['战场伤害'] === 'number') return item['战场伤害'];
    if (item['战场伤害同烽火'] === true) return item['伤害'];
    return null;
  }

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

  /** 卡池里某个数值列「未收录」的条目数(0 = 都有数据) */
  function countUnknown(cfg, pool, key, subModeId) {
    return pool.filter(function (item) {
      var v = cfg.resolveValue ? cfg.resolveValue(item, key, subModeId) : item[key];
      return v === null || v === undefined || v === '';
    }).length;
  }

  /** 随机挑一张图(对局开始时确定并固定,避免重渲染时换图);
   *  没有立绘(images)时退回 avatar —— 武器只有官方 2:1 横版图标,存在 avatar 字段里 */
  function pickPortrait(item) {
    var list = (item && item.images) || [];
    if (list.length) return list[Math.floor(Math.random() * list.length)];
    return (item && item.avatar) || '';
  }

  /** 把任意字段统一成非空字符串数组(支持「单个字符串」与「数组」两种写法) */
  function asArray(value) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map(function (v) { return String(v).trim(); }).filter(Boolean);
    }
    var text = String(value).trim();
    return text ? [text] : [];
  }

  /** 归一化联想串:小写、去掉空格/中点/连字符等分隔符 */
  function normalizeSearch(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[\s\u00b7\-_'’.,，。、]/g, '');
  }

  /** 单个条目的联想优先级(越小越靠前);null = 不匹配。
   *  顺序:名称精确 > 别名精确 > 名称前缀 > 全拼精确 > 首字母精确 > 名称包含 > 别名包含 > 全拼包含 > 首字母包含
   *  别名 / 全拼 / 首字母均支持「数组」写法(多音、多别名、多语言)。 */
  function matchRank(item, query) {
    if (!query) return null;
    var nickname = normalizeSearch(item.nickname);
    var aliases = asArray(item.alias).map(normalizeSearch).filter(Boolean);
    var pinyins = asArray(item.pinyin).map(normalizeSearch).filter(Boolean);
    var abbrs = asArray(item.pinyinAbbr).map(normalizeSearch).filter(Boolean);
    if (nickname === query) return 0;
    if (aliases.indexOf(query) !== -1) return 1;
    if (nickname.indexOf(query) === 0) return 2;
    if (pinyins.indexOf(query) !== -1) return 3;
    if (abbrs.indexOf(query) !== -1) return 4;
    if (nickname.indexOf(query) !== -1) return 5;
    if (aliases.some(function (a) { return a.indexOf(query) !== -1; })) return 6;
    if (pinyins.some(function (p) { return p.indexOf(query) !== -1; })) return 7;
    if (abbrs.some(function (a) { return a.indexOf(query) !== -1; })) return 8;
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

  /** 提交判定:只认名称 / 别名的完全一致。
   *  拼音(全拼、首字母)仅用于候选联想,不能直接提交 —— 避免「打拼音就自动算提交」。 */
  function findItem(list, input) {
    var q = String(input || '').trim().toLowerCase();
    if (!q) return null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (normalizeSearch(c.nickname) === normalizeSearch(q)) return c;
      if (asArray(c.alias).some(function (a) { return normalizeSearch(a) === normalizeSearch(q); })) return c;
    }
    return null;
  }

  /** ---------- 卡池 ---------- */
  function getDB(key) {
    return (typeof window !== 'undefined' && window[key]) || [];
  }

  /** 按模式取可猜池:可用 === false 的条目只做存档,不参与对局;
   *  武器再按「模式」字段过滤子模式卡池(仅烽火地带/仅全面战场/通用)。
   *  过滤后为空时**不再静默回退到全量卡池**,只告警并返回空池(由 UI 弹提示)。 */
  function getPool(cfg, subModeId) {
    var db = getDB(cfg.dbKey);
    if (!db.length) return [];
    var playable = db.filter(function (c) { return c['可用'] !== false; });
    if (!playable.length) {
      warn(cfg.dbKey + ' 里所有条目都是「可用: false(仅存档)」,该模式无法开局');
      return [];
    }
    if (cfg.id === 'weapon' && subModeId) {
      var scoped = playable.filter(function (w) {
        var scope = w['模式'] || '通用';
        if (subModeId === 'ops') return scope !== '仅全面战场';
        if (subModeId === 'warfare') return scope !== '仅烽火地带';
        return true;
      });
      if (!scoped.length) {
        warn('武器「' + subModeId + '」子模式过滤后卡池为空,请检查 weapons.js 的「模式」字段');
      }
      return scoped;
    }
    return playable;
  }

  /** ---------- 战绩分桶 ---------- */
  /** 战绩桶 id:operator / weapon:ops / weapon:warfare */
  function statsBucket(cfg, subModeId) {
    return cfg.id + (cfg.subModes && subModeId ? ':' + subModeId : '');
  }
  function statsKey(bucket) { return KEYS.statsBucket + bucket; }

  /** 最近目标存档键(按模式或模式+子模式) */
  function recentKey(cfg, subModeId) {
    return cfg.recentKey + (cfg.subModes && subModeId ? ':' + subModeId : '');
  }

  /** 由最近记录(带时间戳)算出仍在窗口内的目标名集合 */
  function activeRecentNames(list, now) {
    var cutoff = (now || Date.now()) - RECENT_WINDOW_MS;
    return (list || [])
      .filter(function (item) { return item && typeof item.t === 'number' && item.t >= cutoff; })
      .map(function (item) { return item.n; });
  }

  /** ---------- 每日一题 ---------- */
  /** 本地日期键 YYYY-MM-DD */
  function dayKey(date) {
    var d = date || new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
  }

  /** FNV-1a 32 位散列:同一个种子串在任何浏览器/时区下都得到同一结果 */
  function hashString(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** 每日一题的目标:同一天、同一模式(子模式)所有玩家抽到同一目标 */
  function dailyTarget(pool, seed) {
    if (!pool || !pool.length) return null;
    return pool[hashString(String(seed)) % pool.length];
  }

  /** 每日一题的种子串 */
  function dailySeed(day, cfg, subModeId) {
    return 'zhou-yiba:daily:' + day + ':' + statsBucket(cfg, subModeId);
  }

  /** ---------- 分享文案 ---------- */
  var LEVEL_EMOJI = { correct: '\uD83D\uDFE9', close: '\uD83D\uDFE8', wrong: '\u2B1B' };

  /** 生成 Wordle 式分享文本(纯函数,便于测试) */
  function buildShareText(options) {
    var o = options || {};
    var guesses = o.guesses || [];
    var lines = [];
    lines.push('洲一把 · ' + (o.modeLabel || '') + (o.daily ? ' · 每日一题' : ''));
    lines.push((o.result === 'won' ? '✅ ' : '❌ ') + guesses.length + '/' + (o.maxGuesses || '?') + ' 次');
    guesses.forEach(function (row) {
      lines.push((row.cells || []).map(function (cell) {
        return LEVEL_EMOJI[cell && cell.level] || LEVEL_EMOJI.wrong;
      }).join(''));
    });
    if (o.url) lines.push(o.url);
    return lines.join('\n');
  }

  ZHOUYIBA.RECENT_WINDOW_MS = RECENT_WINDOW_MS;
  ZHOUYIBA.KEYS = KEYS;
  ZHOUYIBA.MODES = MODES;
  ZHOUYIBA.damageOf = damageOf;
  ZHOUYIBA.compare = compare;
  ZHOUYIBA.exactAttr = exactAttr;
  ZHOUYIBA.numericAttr = numericAttr;
  ZHOUYIBA.overlapAttr = overlapAttr;
  ZHOUYIBA.toList = toList;
  ZHOUYIBA.countUnknown = countUnknown;
  ZHOUYIBA.pickPortrait = pickPortrait;
  ZHOUYIBA.asArray = asArray;
  ZHOUYIBA.normalizeSearch = normalizeSearch;
  ZHOUYIBA.matchRank = matchRank;
  ZHOUYIBA.searchItems = searchItems;
  ZHOUYIBA.findItem = findItem;
  ZHOUYIBA.getDB = getDB;
  ZHOUYIBA.getPool = getPool;
  ZHOUYIBA.statsBucket = statsBucket;
  ZHOUYIBA.statsKey = statsKey;
  ZHOUYIBA.recentKey = recentKey;
  ZHOUYIBA.activeRecentNames = activeRecentNames;
  ZHOUYIBA.dayKey = dayKey;
  ZHOUYIBA.hashString = hashString;
  ZHOUYIBA.dailyTarget = dailyTarget;
  ZHOUYIBA.dailySeed = dailySeed;
  ZHOUYIBA.buildShareText = buildShareText;

  if (typeof window !== 'undefined') window.ZHOUYIBA = ZHOUYIBA;
  if (typeof module !== 'undefined' && module.exports) module.exports = ZHOUYIBA;
})();
