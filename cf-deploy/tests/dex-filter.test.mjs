/* 图鉴页筛选（任务 74，2026-11-09：学小红书 Lonee 文创笔记图鉴页的筛选 chips）
 * node --test tests/dex-filter.test.mjs
 * 覆盖：
 * ① 筛选 chips 一行在页顶进度卡下方、分组列表上方：全部 / 已获得 / 未获得 ＋ 按属性；
 * ② 属性列表以图鉴数据实际出现的类型为准（不硬编码），双属性按任一属性命中；
 * ③ 来源分组保留作默认视图；非默认筛选下空分组整个隐藏（不留空标题）；
 * ④ 151 折叠区参与筛选，展开态在筛选切换重渲染后保持；
 * ⑤ 选中态沿用 .movechip.pick.on；390px 下横向滚动不换行；触控区 ≥48px（任务 102 A4）；双语。
 * 数据口径（写死在实现注释里，勿当 bug 改）：正式站未获得条目不带 types/type
 * （后端 details() 防剧透），属性筛选只能命中类型已知的条目；测试站 TEST_MODE 下
 * 全部条目都算已获得，未获得筛选在测试站恒为空，由此处的夹具数据覆盖。
 * 真实 Azure 调用 0 次。 */
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

describe('filter chips markup', () => {
  test('筛选行在进度卡下方、分组列表上方', () => {
    const head = template.indexOf('<div class="card dex-head">');
    const chips = template.indexOf('${dexFilterChipsHtml(j)}');
    const firstGroup = template.indexOf("groupHtml('伙伴进化线'");
    assert.ok(head >= 0 && head < chips && chips < firstGroup);
  });

  test('chips：全部 / 已获得 / 未获得 ＋ 属性，点 chip 调 setter', () => {
    assert.ok(source.includes("scopeBtn('all', '全部', 'All')"));
    assert.ok(source.includes("scopeBtn('owned', '已获得', 'Owned')"));
    assert.ok(source.includes("scopeBtn('missing', '未获得', 'Not owned')"));
    assert.ok(source.includes("onclick=\"setDexFilterScope('${scope}')\""));
    assert.ok(source.includes("onclick=\"setDexFilterType('${t}')\""));
    assert.match(source, /'全部', 'All'/);
    assert.match(source, /'已获得', 'Owned'/);
    assert.match(source, /'未获得', 'Not owned'/);
    // 选中态沿用 .movechip.pick.on（chips 本身就是 movechip pick）
    assert.ok(source.includes('class="movechip pick dex-filter-chip'));
    assert.ok(source.includes("dexFilter.scope === scope ? ' on' : ''"));
    assert.ok(source.includes("dexFilter.type === t ? ' on' : ''"));
    assert.ok(source.includes('aria-pressed='));
  });

  test('属性列表从数据派生，不硬编码', () => {
    assert.ok(source.includes('function dexFilterTypes(j)'));
    assert.ok(source.includes('dexEntryTypes(e)'));
    assert.ok(source.includes('DEX_FILTER_TYPE_ORDER'));
    // 类型 chip 带属性图标（有图标的类型才放 img，无图标的只留文字；轮换后带 hash token）
    assert.match(source, /src="\/static\/img\/types\/\$\{en\}(?:\.[0-9a-f]{8})?\.webp"/);
  });

  test('分组按筛选收窄、空分组隐藏；151 区同样参与筛选', () => {
    assert.ok(template.includes("const fLine = j.lineEntries.filter((e) => e.current || e.unlocked).filter(dexFilterMatch);"));
    assert.ok(template.includes("const fWild = (j.wild || []).filter(dexFilterMatch);"));
    assert.ok(template.includes("const fOthers = (j.others || []).filter(dexFilterMatch);"));
    assert.ok(template.includes("const fCollection = (j.collection || []).filter(dexFilterMatch);"));
    assert.ok(template.includes("const fEggs = (j.eggSpecies || []).filter(dexFilterMatch);"));
    assert.ok(template.includes("const f151 = (j.dex151 || []).filter(dexFilterMatch);"));
    assert.ok(template.includes("list.length ? `<div class=\"section-title\">"));
    assert.ok(template.includes('${f151.length ? `<section id="dex151-section">'));
    // 默认视图仍是 6 组原样（标题都在）
    for (const t of ['伙伴进化线', '野外伙伴', '道馆与稀有', '收藏进化', '封印蛋孵化', '关都图鉴 151']) {
      assert.ok(template.includes(t), t);
    }
  });

  test('进度头与 172/179 口径未动', () => {
    assert.ok(template.includes('全图鉴共 151 只 已收录 ${j.progress.owned}/151'));
    assert.ok(template.includes('皮丘（172）、咩利羊（179）在原分册，不计入 151 进度。'));
  });

  test('筛选切换不请求后端，只重渲染已拿到的数据', () => {
    const setter = source.slice(source.indexOf('window.setDexFilterScope'), source.indexOf('function renderPokedexPage'));
    assert.ok(setter.includes('renderPokedexPage(state.childId, dexData)'));
    assert.doesNotMatch(setter, /api\(/);
    assert.doesNotMatch(setter, /goPokedex\(/);
  });

  test('选中态 chip 被横向滚动藏住时滚回视野（只动行内滚动）', () => {
    assert.ok(template.includes("document.querySelectorAll('.dex-filter-chip.on')"));
    assert.ok(template.includes("onChip.scrollIntoView({ inline: 'nearest', block: 'nearest' })"));
  });

  test('CSS：横向滚动一行、不换行、触控区 ≥48px', () => {
    assert.match(css, /\.dex-filter\{[^}]*display:flex;[^}]*overflow-x:auto/);
    assert.match(css, /\.dex-filter-chip\{[^}]*min-height:48px;[^}]*white-space:nowrap/);
    assert.match(css, /\.dex-filter-chip\{[^}]*flex-direction:row/);
    assert.ok(css.includes('.dex-filter::-webkit-scrollbar{display:none}'));
  });
});

describe('pure filter functions', () => {
  const pureStart = app.indexOf("let dexFilter = { scope: 'all', type: null };");
  const pureEnd = app.indexOf('function dexFilterChipsHtml(j) {', pureStart);
  assert.ok(pureStart >= 0 && pureEnd > pureStart);
  const pure = app.slice(pureStart, pureEnd);
  const factory = new Function(`${pure}; return { dexEntryTypes, dexFilterMatch, dexFilterTypes, getFilter: () => dexFilter, setFilter: (f) => { dexFilter = f; } };`);
  const F = factory();
  const e = (over) => ({ key: 'x', no: 1, name: '测', img: '/i.webp', unlocked: true, ...over });

  test('默认筛选匹配全部条目（含未获得、无类型）', () => {
    F.setFilter({ scope: 'all', type: null });
    assert.equal(F.dexFilterMatch(e({})), true);
    assert.equal(F.dexFilterMatch(e({ unlocked: false })), true);
    assert.equal(F.dexFilterMatch(e({ no: null, egg: {} })), true);
  });

  test('已获得 / 未获得按 unlocked 分流', () => {
    F.setFilter({ scope: 'owned', type: null });
    assert.equal(F.dexFilterMatch(e({ unlocked: true })), true);
    assert.equal(F.dexFilterMatch(e({ unlocked: false })), false);
    F.setFilter({ scope: 'missing', type: null });
    assert.equal(F.dexFilterMatch(e({ unlocked: true })), false);
    assert.equal(F.dexFilterMatch(e({ unlocked: false })), true);
  });

  test('双属性按任一属性命中；type 字段作 types 缺失时的回退', () => {
    F.setFilter({ scope: 'all', type: '妖精' });
    assert.equal(F.dexFilterMatch(e({ types: ['超能力', '妖精'] })), true);
    assert.equal(F.dexFilterMatch(e({ types: ['超能力'] })), false);
    F.setFilter({ scope: 'all', type: '水' });
    assert.equal(F.dexFilterMatch(e({ type: '水' })), true);
    assert.equal(F.dexFilterMatch(e({ types: [], type: '水' })), true);
  });

  test('无类型信息的条目不命中任何属性筛选（正式站未获得条目即此形状）', () => {
    F.setFilter({ scope: 'all', type: '火' });
    assert.equal(F.dexFilterMatch(e({ unlocked: false })), false);
    assert.equal(F.dexFilterMatch(e({ no: null, egg: {}, unlocked: true })), false);
    // 类型已知的未获得条目（测试站形状）可命中
    assert.equal(F.dexFilterMatch(e({ unlocked: false, types: ['火'] })), true);
  });

  test('属性列表只含数据中出现的类型，按既定顺序排、其余追加', () => {
    F.setFilter({ scope: 'all', type: null });
    const j = {
      lineEntries: [e({ types: ['电'] })],
      wild: [e({ types: ['火'] }), e({ unlocked: false })],
      others: [e({ types: ['超能力', '妖精'] })],
      collection: [e({ type: '钢' })],
      eggSpecies: [e({ types: ['水', '冰'] })],
      dex151: [e({ types: ['毒'] })],
    };
    assert.deepEqual(F.dexFilterTypes(j), ['电', '火', '水', '妖精', '冰', '毒', '超能力', '钢']);
    assert.deepEqual(F.dexFilterTypes({ lineEntries: [], wild: [], others: [] }), []);
  });
});

describe('filter at runtime (DOM stub, same harness as dex151-collapse)', () => {
  const sliceFn = (startMarker) => {
    const s = app.indexOf(startMarker);
    if (s < 0) throw new Error('not found: ' + startMarker);
    let i = app.indexOf('{', s);
    let depth = 0;
    for (; i < app.length; i++) {
      if (app[i] === '{') depth++;
      else if (app[i] === '}') { depth--; if (depth === 0) return app.slice(s, i + 1); }
    }
    throw new Error('unbalanced braces');
  };
  const typeEnStart = app.indexOf('const TYPE_EN = {');
  const typeEn = app.slice(typeEnStart, app.indexOf(';', typeEnStart) + 1);
  const filterBlockStart = app.indexOf("let dexFilter = { scope: 'all', type: null };");
  const filterBlock = app.slice(filterBlockStart, app.indexOf('function renderPokedexPage(id, j) {', filterBlockStart));
  // 任务 94 (JS-M1)：bi/biTitle 已提全局；抽出的 renderPokedexPage 依赖它们，须一并拼进沙箱
  const biGlobals = sliceFn('function bi(zh, en) {') + '\n' + sliceFn('function biTitle(zh, en) {');

  const fixture = () => {
    const dex151 = Array.from({ length: 151 }, (_, i) => {
      const no = i + 1;
      if (no === 4) return { no, unlocked: true, name: '小火龙', img: '/static/img/p4.webp', types: ['火'] };
      if (no === 25) return { no, unlocked: true, name: '皮卡丘', img: '/static/img/p25.webp', types: ['电'] };
      return { no, unlocked: false, name: null, img: null };
    });
    return {
      ok: true,
      progress: { owned: 4, total: 151, pct: 3 },
      lineEntries: [
        { key: 'form:pikachu:0', line: 'pikachu', formIdx: 0, name: '神秘的蛋', no: null, img: null, egg: { bg: '#FFD93B', pat: 'dot', c1: '#fff', c2: '#000' }, unlocked: true, current: true },
        { key: 'form:pikachu:1', line: 'pikachu', formIdx: 1, name: '皮丘', no: 172, img: '/static/img/p172.webp', unlocked: true, current: true, types: ['电'] },
      ],
      wild: [
        { key: 'wild:4', no: 4, name: '小火龙', img: '/static/img/p4.webp', unlocked: true, types: ['火'] },
        { key: 'wild:7', no: 7, name: '杰尼龟', img: '/static/img/p7.webp', unlocked: false, types: ['水'] },
        { key: 'wild:25', no: 25, name: '皮卡丘', img: '/static/img/p25.webp', unlocked: false },
      ],
      others: [
        { key: 'gym:143', no: 143, name: '卡比兽', img: '/static/img/p143.webp', unlocked: true, types: ['普通'], kind: '道馆主' },
        { key: 'gym:122', no: 122, name: '魔墙人偶', img: '/static/img/p122.webp', unlocked: true, types: ['超能力', '妖精'], kind: '道馆主' },
      ],
      collection: [],
      eggSpecies: [
        { key: 'egg:131', no: 131, name: '拉普拉斯', img: '/static/img/p131.webp', unlocked: false, types: ['水', '冰'], kind: '封印蛋' },
      ],
      dex151,
    };
  };

  async function loadPage(lang = 'zh') {
    const appStub = { innerHTML: '' };
    const bodyStub = { innerHTML: '', hasChildNodes() { return this.innerHTML.length > 0; } };
    const gridStub = { hidden: true, querySelector: (sel) => (sel === '.dex' ? bodyStub : null) };
    const buttonStub = { textContent: '展开 ▸', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
    const sectionStub = { querySelector: (sel) => (sel === '#dex151-grid' ? gridStub : sel === '.dex151-toggle' ? buttonStub : null) };
    const stateObj = { childId: null, view: null, childCache: {}, lang };
    const factory = new Function('window', 'document', 'app', 'state', 'api', 'childTop', 'tabbar', 'esc', 'tr', 'careRoomUnmount',
      "let dexData = null;\n"
      + biGlobals + '\n'
      // Fable 优化 #2：goPokedex 改走 loadPokedex（动态＋静态骨架合并）。本桩只测筛选逻辑，
      // 用 api 夹具直接当合并结果——夹具故意给未获得条目带 types（测“类型已知可命中”），
      // 真实合并会按防剧透剥掉它们，绝不能把夹具喂给真实 mergePokedexData；合并行为由 pokedex-split.test.mjs 覆盖。
      + "const DEX_SHAPE_VERSION = 2;\n"
      + "async function loadPokedex(id) { return api('/api/pokedex', { method: 'POST', body: { childId: id } }); }\n"
      + "const EGG_FALLBACK = { bg: '#fff', pat: 'dot', c1: '#fff', c2: '#000' };\n"
      + "function eggHtml() { return '<i class=\"egg-stub\"></i>'; }\n"
      + typeEn + '\n'
      + filterBlock + '\n'
      + sliceFn('function dexSlot(e, key) {') + '\n'
      + sliceFn('function dex151SlotHtml(e) {') + '\n'
      + sliceFn('function cacheMap(name) {') + '\n'
      + sliceFn('async function goPokedex(id) {') + '\n'
      + sliceFn('function renderPokedexPage(id, j) {') + '\n'
      + sliceFn('window.toggleDex151 = function() {') + '\n'
      + 'return { goPokedex, toggleDex151: window.toggleDex151, setDexFilterScope: window.setDexFilterScope, setDexFilterType: window.setDexFilterType };');
    const fns = factory({}, { getElementById: () => sectionStub, querySelectorAll: () => [] }, appStub, stateObj,
      async () => fixture(),
      () => '<div class="topbar">顶栏</div>', () => '<div class="tabbar">tab</div>',
      (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), (zh, en) => (stateObj.lang === 'en' ? en : zh),
      () => {}); // careRoomUnmount：goPokedex 离开养成页时卸房间（任务 122），本节只测筛选，桩为空操作
    await fns.goPokedex(1);
    return { ...fns, appStub, bodyStub, gridStub, buttonStub, stateObj };
  }
  const slots = (html) => (html.match(/class="slot/g) || []).length;

  test('默认视图：6 组都在，chips 含范围＋数据中出现的属性', async () => {
    const p = await loadPage();
    for (const t of ['伙伴进化线', '野外伙伴', '道馆与稀有', '封印蛋孵化', '关都图鉴 151']) {
      assert.ok(p.appStub.innerHTML.includes(t), t);
    }
    assert.ok(!p.appStub.innerHTML.includes('收藏进化'), '空的收藏组默认也不留标题');
    assert.ok(p.appStub.innerHTML.includes('class="dex-filter"'));
    for (const c of ['全部', '已获得', '未获得', '电', '火', '水', '普通', '妖精', '冰', '超能力']) {
      assert.ok(p.appStub.innerHTML.includes(`>${c}<`) || p.appStub.innerHTML.includes(`>${c}</button>`), c);
    }
    assert.ok(!p.appStub.innerHTML.includes('>草<'), '数据里没有草属性，就不该出现草 chip');
    const idx = (s) => p.appStub.innerHTML.indexOf(`>${s}<`);
    assert.ok(idx('电') < idx('火') && idx('火') < idx('水') && idx('水') < idx('普通') && idx('普通') < idx('妖精') && idx('妖精') < idx('冰') && idx('冰') < idx('超能力'));
    assert.equal(slots(p.appStub.innerHTML), 8, '默认格数：进化线 2＋野外 3＋道馆 2＋封印蛋 1');
  });

  test('已获得：只留已解锁格，无已解锁的组整个隐藏', async () => {
    const p = await loadPage();
    p.setDexFilterScope('owned');
    assert.ok(!p.appStub.innerHTML.includes('杰尼龟'));
    assert.ok(!p.appStub.innerHTML.includes('封印蛋孵化'), '封印蛋组只剩未获得，整组隐藏');
    assert.ok(p.appStub.innerHTML.includes('小火龙'));
    assert.ok(p.appStub.innerHTML.includes('魔墙人偶'));
    assert.equal(slots(p.appStub.innerHTML), 5, '已获得格数：进化线 2＋野外 1＋道馆 2');
  });

  test('未获得：只留未解锁格', async () => {
    const p = await loadPage();
    p.setDexFilterScope('missing');
    assert.ok(!p.appStub.innerHTML.includes('小火龙'));
    assert.ok(!p.appStub.innerHTML.includes("openDexCard('form:pikachu:1')"), '皮丘已获得，不在未获得视图（页顶注释里的“皮丘”二字不算）');
    // 未获得格只露剪影＋编号，不显示名字：按 No. 断言
    assert.ok(p.appStub.innerHTML.includes('No.7'), '杰尼龟（未获得）');
    assert.ok(p.appStub.innerHTML.includes('No.131'), '拉普拉斯（未获得）');
    assert.equal(slots(p.appStub.innerHTML), 3, '未获得格数：野外 2＋封印蛋 1');
  });

  test('按属性：双属性任一命中；无类型信息的格不命中；再点一次取消', async () => {
    const p = await loadPage();
    p.setDexFilterType('妖精');
    assert.ok(p.appStub.innerHTML.includes('魔墙人偶'), '122 超能力/妖精按妖精命中');
    assert.ok(!p.appStub.innerHTML.includes('小火龙'));
    assert.ok(!p.appStub.innerHTML.includes('神秘的蛋'), '蛋无类型信息，不命中属性筛选');
    assert.ok(!p.appStub.innerHTML.includes('野外伙伴'), '野外组无妖精，整组隐藏');
    p.setDexFilterType('妖精');
    assert.ok(p.appStub.innerHTML.includes('小火龙'), '再点一次取消属性筛选');
    p.setDexFilterType('水');
    assert.ok(p.appStub.innerHTML.includes('No.7'), '杰尼龟（未获得但类型已知）可命中');
    assert.ok(p.appStub.innerHTML.includes('No.131'), '拉普拉斯（未获得但类型已知）可命中');
    assert.ok(!p.appStub.innerHTML.includes('No.25'), '皮卡丘（未获得且类型未知）不命中');
    assert.equal(slots(p.appStub.innerHTML), 2, '水系格数：野外 1＋封印蛋 1');
  });

  test('151 网格参与筛选，展开态在筛选切换后保持', async () => {
    const p = await loadPage();
    p.toggleDex151();
    assert.equal(slots(p.bodyStub.innerHTML), 151);
    p.setDexFilterType('火');
    assert.equal(p.gridStub.hidden, false, '重渲染后仍展开');
    assert.equal(slots(p.bodyStub.innerHTML), 1, '151 网格只剩火系小火龙');
    assert.ok(p.bodyStub.innerHTML.includes('小火龙'));
    assert.ok(!p.bodyStub.innerHTML.includes('皮卡丘'));
    p.setDexFilterType('火');
    assert.equal(slots(p.bodyStub.innerHTML), 151, '取消筛选后 151 格全回');
  });

  test('英文模式：范围 chip 用英文，属性名首字母大写', async () => {
    const p = await loadPage('en');
    assert.ok(p.appStub.innerHTML.includes('>All<'));
    assert.ok(p.appStub.innerHTML.includes('>Owned<'));
    assert.ok(p.appStub.innerHTML.includes('>Not owned<'));
    assert.ok(p.appStub.innerHTML.includes('>Fire<'));
    assert.ok(p.appStub.innerHTML.includes('>Fairy<'));
    assert.match(p.appStub.innerHTML, /\/static\/img\/types\/fire(?:\.[0-9a-f]{8})?\.webp/);
  });
});
