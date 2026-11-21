import { assetPath } from './asset-path.mjs';
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(assetPath('app.js'), 'utf8');
const css = readFileSync(assetPath('style.css'), 'utf8');
const start = app.indexOf('async function goPokedex(id) {');
const end = app.indexOf('async function goEggs(id) {', start);
assert.ok(start >= 0 && end > start);
const source = app.slice(start, end);
const template = source.slice(0, source.indexOf('window.toggleDex151'));

test('dex151 follows the conditional egg section and precedes the tabbar', () => {
  const egg = template.indexOf('封印蛋孵化');
  const title = template.indexOf('关都图鉴 151');
  const tabs = template.indexOf('${tabbar()}');
  assert.ok(egg >= 0 && egg < title && title < tabs);
  assert.ok(template.indexOf('</section>', title) < tabs);
  assert.ok(template.includes("groupHtml('封印蛋孵化', 'Sealed egg hatches', fEggs)"));
});

test('dex151 grid is initially hidden with an accessible expand button', () => {
  assert.ok(template.includes('<div id="dex151-grid" hidden><div class="dex"></div></div>'));
  assert.ok(!template.includes('j.dex151.map'));
  assert.ok(template.includes('aria-controls="dex151-grid"') && template.includes('aria-expanded="false"') && template.includes('onclick="toggleDex151()"') && template.includes('展开 ▸'));
});

test('toggleDex151 renders the grid on first expansion', () => {
  const toggle = source.slice(source.indexOf('window.toggleDex151'));
  assert.ok(toggle.includes('.map(dex151SlotHtml)'));
  assert.ok(toggle.includes('hasChildNodes'));
  // 单格渲染已抽到 dex151SlotHtml（任务 74，与筛选重填同源），不在 toggle 内联
  const helper = source.slice(source.indexOf('function dex151SlotHtml(e)'));
  assert.ok(helper.includes('dexSlot(e, `dex151:${e.no}`)'));
  assert.ok(helper.includes('No.${e.no}'));
  assert.ok(app.includes('function dexSlot(e, key)'));
  const go = source.slice(0, source.indexOf('function openDexCard'));
  assert.ok(!go.includes('const slot ='));
});

test('toggleDex151 changes hidden, aria-expanded and both button labels', () => {
  assert.match(source, /window\.toggleDex151 = function\(\)/);
  assert.match(source, /document\.getElementById\('dex151-section'\)/);
  assert.match(source, /section\.querySelector\('#dex151-grid'\)/);
  assert.match(source, /section\.querySelector\('\.dex151-toggle'\)/);
  assert.match(source, /grid\.hidden = !grid\.hidden;/);
  assert.match(source, /button\.setAttribute\('aria-expanded', String\(!grid\.hidden\)\);/);
  assert.match(source, /button\.textContent = grid\.hidden \? tr\('展开 ▸', 'Expand ▸'\) : tr\('收起 ▾', 'Collapse ▾'\);/);
  const toggle = source.slice(source.indexOf('window.toggleDex151'));
  assert.doesNotMatch(toggle, /\bstate\b/);
});

test('the unchanged progress head stays above dex151', () => {
  const head = template.indexOf('<div class="card dex-head">');
  assert.ok(head >= 0 && head < template.indexOf('关都图鉴 151'));
  assert.ok(template.includes('全图鉴共 151 只 已收录 ${j.progress.owned}/151'))
  assert.ok(template.includes(
    '    <div class="xpbar progress"><i style="clip-path:inset(0 ${100 - j.progress.pct}% 0 0)"></i></div>'
  ));
  assert.ok(template.includes('皮丘（172）、咩利羊（179）在原分册，不计入 151 进度。'));
});

test('minimal dex151 styles reuse section-title and iconbtn', () => {
  assert.match(css, /\.dex151-head\{[^}]*display:flex;[^}]*align-items:center/);
  assert.match(css, /\.dex151-toggle\{[^}]*font-size:var\(--fs-label\)/);
  assert.match(template, /class="section-title dex151-head"/);
  assert.match(template, /class="iconbtn dex151-toggle"/);
});

/* ---------- 运行时：首次展开才渲染网格（真实函数＋最小 DOM stub） ---------- */

describe('dex151 deferred render at runtime', () => {
  // 从 app.js 抽取真实 dexSlot/goPokedex/toggleDex151 源码执行（非字符串断言）。
  // goPokedex 自 2026-10-28 切页缓存改动起依赖顶层 helper：cacheMap（读 dex 缓存）与
  // renderPokedexPage（渲染函数），一并抽进来；其余 helper（cacheFresh/clearAllCaches/
  // refreshDexInBackground）本沙箱路径走不到（无缓存、state.childId 为 null），不抽。
  const sliceFn = (startMarker) => {
    const start = app.indexOf(startMarker);
    if (start < 0) throw new Error('not found: ' + startMarker);
    let i = app.indexOf('{', start);
    let depth = 0;
    for (; i < app.length; i++) {
      if (app[i] === '{') depth++;
      else if (app[i] === '}') { depth--; if (depth === 0) return app.slice(start, i + 1); }
    }
    throw new Error('unbalanced braces');
  };
  // 任务 94 (JS-M1)：bi/biTitle 已提全局；抽出的 renderPokedexPage 依赖它们，须一并拼进沙箱
  const biGlobals = sliceFn('function bi(zh, en) {') + '\n' + sliceFn('function biTitle(zh, en) {');
  const fixture = () => {
    const dex151 = Array.from({ length: 151 }, (_, i) => {
      const no = i + 1;
      const unlocked = [25, 54, 151].includes(no);
      return unlocked
        ? { no, unlocked: true, name: { 25: '皮卡丘', 54: '可达鸭', 151: '梦幻' }[no], img: `/static/img/p${no}.webp` }
        : { no, unlocked: false, name: null, img: null };
    });
    return {
      ok: true,
      progress: { owned: 3, total: 151, pct: 2 },
      lineEntries: [{ key: 'form:pikachu:1', no: 172, unlocked: true, name: '皮丘', img: '/static/img/p172.webp' }],
      wild: [{ key: 'wild:54', no: 54, unlocked: true, name: '可达鸭', img: '/static/img/p54.webp' }],
      others: [],
      eggSpecies: null,
      dex151,
    };
  };
  async function loadPage() {
    const appStub = { innerHTML: '' };
    const bodyStub = {
      innerHTML: '',
      hasChildNodes() { return this.innerHTML.length > 0; },
    };
    const gridStub = { hidden: true, querySelector: (sel) => (sel === '.dex' ? bodyStub : null) };
    const buttonStub = {
      textContent: '展开 ▸',
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
    };
    const sectionStub = {
      querySelector: (sel) => (sel === '#dex151-grid' ? gridStub : sel === '.dex151-toggle' ? buttonStub : null),
    };
    const factory = new Function('window', 'document', 'app', 'state', 'api', 'childTop', 'tabbar', 'esc', 'tr', 'careRoomUnmount',
      "let dexData = null;\n"
      + biGlobals + '\n'
      // Fable 优化 #2：goPokedex 改走 loadPokedex（动态＋静态骨架合并）。本桩只测折叠渲染，
      // 用 api 夹具直接当合并结果；真实合并行为由 pokedex-split.test.mjs 覆盖。
      + "const DEX_SHAPE_VERSION = 2;\n"
      + "async function loadPokedex(id) { return api('/api/pokedex', { method: 'POST', body: { childId: id } }); }\n"
      + "const EGG_FALLBACK = { bg: '#fff', pat: 'dot', c1: '#fff', c2: '#000' };\n"
      + "function eggHtml() { return '<i class=\"egg-stub\"></i>'; }\n"
      // 图鉴筛选（任务 74）：renderPokedexPage/toggleDex151 依赖这些定义，须一并抽进来
      + app.slice(app.indexOf('const TYPE_EN = {'), app.indexOf(';', app.indexOf('const TYPE_EN = {')) + 1) + '\n'
      + app.slice(app.indexOf("let dexFilter = { scope: 'all', type: null };"), app.indexOf('function renderPokedexPage(id, j) {')) + '\n'
      + "const escFn = (s) => String(s ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n"
      + sliceFn('function dexSlot(e, key) {') + '\n'
      + sliceFn('function dex151SlotHtml(e) {') + '\n'
      + sliceFn('function cacheMap(name) {') + '\n'
      + sliceFn('async function goPokedex(id) {') + '\n'
      + sliceFn('function renderPokedexPage(id, j) {') + '\n'
      + sliceFn('window.toggleDex151 = function() {') + '\n'
      + 'return { goPokedex, toggleDex151: window.toggleDex151 };');
    const fns = factory({}, { getElementById: () => sectionStub }, appStub,
      { childId: null, view: null, childCache: {} },
      async () => fixture(),
      () => '<div class="topbar">顶栏</div>', () => '<div class="tabbar">tab</div>',
      (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), (zh) => zh,
      () => {}); // careRoomUnmount：goPokedex 离开养成页时卸房间（任务 122），本节只测图鉴，桩为空操作
    await fns.goPokedex(1);
    return { ...fns, appStub, bodyStub, gridStub, buttonStub };
  }

  test('goPokedex 首屏：网格为空容器，无 dex151 卡片、无网格图片', async () => {
    const p = await loadPage();
    assert.ok(p.appStub.innerHTML.includes('<div id="dex151-grid" hidden><div class="dex"></div></div>'));
    assert.ok(!p.appStub.innerHTML.includes('dex151:'));
    assert.ok(!p.appStub.innerHTML.includes('/static/img/p25.webp'));
    // 可见分册正常渲染（皮丘、野外可达鸭）
    assert.ok(p.appStub.innerHTML.includes('皮丘'));
    assert.ok(p.appStub.innerHTML.includes('可达鸭'));
  });

  test('首次展开渲染 151 格，已解锁带懒加载图与详情弹窗入口；再收起/展开不重复渲染', async () => {
    const p = await loadPage();
    p.toggleDex151();
    assert.equal(p.gridStub.hidden, false);
    assert.equal(p.buttonStub.attrs['aria-expanded'], 'true');
    assert.equal(p.buttonStub.textContent, '收起 ▾');
    assert.equal((p.bodyStub.innerHTML.match(/class="slot/g) || []).length, 151);
    assert.ok(p.bodyStub.innerHTML.includes('<img loading="lazy" src="/static/img/p25.webp">'));
    assert.ok(p.bodyStub.innerHTML.includes(`onclick="openDexCard('dex151:25')"`));
    assert.ok(p.bodyStub.innerHTML.includes('<div class="dex-no">No.1</div>'));
    assert.ok(p.bodyStub.innerHTML.includes('???'));
    const first = p.bodyStub.innerHTML;
    p.toggleDex151();
    assert.equal(p.gridStub.hidden, true);
    assert.equal(p.buttonStub.textContent, '展开 ▸');
    p.toggleDex151();
    assert.equal(p.gridStub.hidden, false);
    assert.equal(p.bodyStub.innerHTML, first, '二次展开不得重复渲染');
  });
});
