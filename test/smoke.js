/* 洲一把 · 冒烟测试运行器(可选,需要 jsdom)
 * ---------------------------------------------------------------
 * 用 jsdom 载入真实的 index.html 结构 + 四个脚本,再执行 test/smoke-driver.js,
 * 驱动真实的 DOM 与事件走完一局(猜干员、猜武器、续局、每日一题、战绩清零)。
 *
 * 运行:
 *   npm i -D jsdom && npm run smoke      # 本仓库不强制依赖 jsdom
 *   JSDOM_PATH=<path-to-jsdom> node test/smoke.js
 *
 * 注意:jsdom 没有排版引擎,只覆盖逻辑与 DOM 行为;CSS 布局请在浏览器里目测
 * (把 test/smoke-driver.js 追加到 index.html 副本上,用无头 Chrome/Edge --dump-dom 打开)。
 * 未安装 jsdom 时本脚本会打印提示并以 0 退出,不阻塞 CI。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['operators.js', 'weapons.js', 'core.js', 'app.js'];

function loadJsdom() {
  const candidates = [process.env.JSDOM_PATH, 'jsdom'].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* 继续尝试下一个位置 */ }
  }
  return null;
}

const jsdomModule = loadJsdom();
if (!jsdomModule) {
  console.log('[smoke] 未找到 jsdom,跳过端到端冒烟测试。');
  console.log('[smoke] 安装后即可运行:npm i -D jsdom && npm run smoke');
  console.log('[smoke] 或用 JSDOM_PATH=<已安装的 jsdom 路径> node test/smoke.js');
  process.exit(0);
}
const { JSDOM, VirtualConsole } = jsdomModule;

// 用 https 源(而非 file://),这样 localStorage / sessionStorage 才可用
const problems = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => problems.push('jsdomError: ' + err.message));
virtualConsole.on('error', (...args) => problems.push('console.error: ' + args.join(' ')));

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  url: 'https://zhouyiba.test/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
window.addEventListener('error', (e) => problems.push('onerror: ' + (e.message || e.type)));

window.__NO_LAYOUT__ = true; // jsdom 没有布局,offsetParent 恒为 null

// 按真实顺序注入脚本(jsdom 不会自己去取 file:// 或相对资源)
for (const file of SCRIPTS) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  try {
    window.eval(code + '\n//# sourceURL=' + file);
  } catch (err) {
    console.error(`[smoke] 注入 ${file} 失败:`, err.message);
    process.exit(1);
  }
}
window.eval(fs.readFileSync(path.join(__dirname, 'smoke-driver.js'), 'utf8') + '\n//# sourceURL=smoke-driver.js');

const report = window.document.getElementById('smoke-report');
if (!report) {
  console.error('[smoke] 冒烟脚本没有产出报告,页面标题:' + window.document.title);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

const text = report.textContent;
const fails = text.split('\n').filter((l) => l.startsWith('FAIL'));
console.log(text);
if (problems.length) {
  console.log('--- 运行器额外捕获 ---');
  problems.forEach((p) => console.log(p));
}
console.log('\n[smoke] ' + window.document.title);
if (fails.length || problems.length) process.exit(1);
console.log('[smoke] 端到端冒烟测试通过 ✅');
