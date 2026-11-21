/* Fable 优化 #2（图鉴静态拆分）的新契约测试：
 * - 静态骨架路由 /static/pokedex.<hash>.json（immutable、免会话、hash 只作缓存键）
 * - 卡片端 /api/pokedex/card（已获得/锁定/未知/蛋形态/dex151 解析/收藏胜出/bench 仅测试站）
 * - 动态响应体积（测试站实测口径：31/22 行图鉴的孩子）
 * - 前端真实 mergePokedexData 的合并行为（从 app.js.orig 切出原函数跑，不手写替身）
 */
import { assetPath, assetHash } from './asset-path.mjs';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const H = assetHash();
const appJs = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8'); // 合并函数切自源码 .orig（不是 hash 后的 bundle，与轮换状态无关）

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql',
  '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql',
  '0010_pvp_rematch.sql', '0019_evo_items.sql', '0023_care_qa_and_friendship.sql', '0043_pet_instances_ability.sql',
];
let raw, env;
function makeEnv() {
  raw = new DatabaseSync(':memory:');
  for (const name of MIGRATIONS) raw.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  raw.exec("UPDATE children SET name='测试伙伴'");
  const db = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return raw.prepare(sql).get(...args) || null; },
        async all() { return { results: raw.prepare(sql).all(...args) }; },
        async run() { const r = raw.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
      };
    },
    async batch(stmts) { return Promise.all(stmts.map((s) => s.run())); },
  };
  return { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
}
async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await M.default.fetch(new Request('https://test.local' + path, {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  }), env);
  const text = await res.clone().text().catch(() => '');
  return { status: res.status, j: await res.json().catch(() => null), text, cookie: res.headers.get('set-cookie')?.split(';')[0], res };
}
async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function pokedex(childId, cookie) {
  const r = await call('/api/pokedex', { method: 'POST', body: { childId }, cookie });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}
async function cardRaw(childId, key, cookie) {
  return call('/api/pokedex/card', { method: 'POST', body: { childId, key }, cookie });
}
async function card(childId, key, cookie) {
  const r = await cardRaw(childId, key, cookie);
  assert.equal(r.status, 200, key);
  assert.equal(r.j.ok, true, key);
  return r.j;
}
function insertEntry(childId, key) {
  const columns = raw.prepare('PRAGMA table_info(pokedex)').all().filter((c) => c.name !== 'id');
  const names = columns.map((c) => `"${c.name}"`).join(', ');
  const values = columns.map((c) => c.name === 'entry_key' ? '?' : `"${c.name}"`).join(', ');
  const r = raw.prepare(`INSERT INTO pokedex (${names}) SELECT ${values} FROM pokedex WHERE child_id=? AND entry_key LIKE 'form:%' LIMIT 1`).run(key, childId);
  assert.equal(r.changes, 1);
}
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

/* ---------- ① 静态骨架路由 ---------- */
describe('pokedex static skeleton route', () => {
  beforeEach(() => { env = makeEnv(); });
  afterEach(() => raw.close());

  test('GET /static/pokedex.<hash>.json：免会话、immutable、内容与导出骨架一致', async () => {
    const { hash, data } = M.pokedexStaticSkeleton();
    const r = await call(`/static/pokedex.${hash}.json`);
    assert.equal(r.status, 200);
    assert.ok(r.res.headers.get('content-type').startsWith('application/json'));
    assert.equal(r.res.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.deepEqual(r.j, data);
    // 体积量级：静态骨架约 38.5KB（2026-11-17 实测 38,511B），一次下发后浏览器缓存一年
    const bytes = JSON.stringify(r.j).length;
    assert.ok(bytes > 30000 && bytes < 45000, `静态骨架 ${bytes}B 应在 30–45KB`);
  });

  test('hash 只是缓存键：过期 hash 仍返回当前内容，不 404', async () => {
    const { data } = M.pokedexStaticSkeleton();
    const r = await call('/static/pokedex.00000000.json');
    assert.equal(r.status, 200);
    assert.deepEqual(r.j, data);
  });

  test('无 hash 的路径不走骨架路由', async () => {
    const r = await call('/static/pokedex.json');
    assert.equal(r.text.startsWith('<html>'), true, '应落到静态资源分支（桩返回 html），而非骨架 JSON');
  });
});

/* ---------- ② 卡片端矩阵 ---------- */
describe('pokedex card endpoint', () => {
  beforeEach(() => { env = makeEnv(); });
  afterEach(() => raw.close());

  test('已获得→详情完整；锁定→403 LOCKED；未知→404 NOT_FOUND；蛋形态→404', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    insertEntry(1, 'wild:54');
    raw.exec("UPDATE pokedex SET unlocked_at='2026-01-02' WHERE child_id=1");
    const wild = await card(1, 'wild:54', cookie);
    assert.equal(wild.sourceKey, 'wild:54');
    assert.equal(wild.no, 54);
    assert.equal(wild.details.type, '水');
    assert.deepEqual(wild.details.types, ['水']);
    assert.ok(Array.isArray(wild.details.moves) && wild.details.moves.length > 0);
    assert.equal(wild.details.obtainedAt, '2026-01-02');
    const locked = await cardRaw(1, 'wild:55', cookie);
    assert.equal(locked.status, 403);
    assert.equal(locked.j.error, 'LOCKED');
    for (const key of ['wild:9999', 'bogus', 'dex151:0', 'dex151:152', 'dex151:abc']) {
      const r = await cardRaw(1, key, cookie);
      assert.equal(r.status, 404, key);
      assert.equal(r.j.error, 'NOT_FOUND');
    }
    // 蛋形态（no 为空）没有卡片：form:pikachu:0 行存在，但按 no 为空返回 NOT_FOUND
    const egg = await cardRaw(1, 'form:pikachu:0', cookie);
    assert.equal(egg.status, 404);
    assert.equal(egg.j.error, 'NOT_FOUND');
  });

  test('dex151:N 解析到源条目；锁定行 403 而非 404', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    insertEntry(1, 'wild:54');
    const via151 = await card(1, 'dex151:54', cookie);
    const viaWild = await card(1, 'wild:54', cookie);
    assert.deepEqual(via151.details, viaWild.details);
    assert.equal(via151.sourceKey, 'wild:54');
    const locked = await cardRaw(1, 'dex151:55', cookie);
    assert.equal(locked.status, 403);
    assert.equal(locked.j.error, 'LOCKED');
  });

  test('egg:N 歧义时收藏胜出：egg:4 行进收藏，卡片带 obtainedAt', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    // egg:4 既在封印蛋格子里，又是可收藏种（非道馆蛋、进 COLLECTION_MOVES）：同 key 两条目时解析走 collection 在先
    insertEntry(1, 'egg:4');
    raw.exec("UPDATE pokedex SET unlocked_at='2026-01-05' WHERE child_id=1 AND entry_key='egg:4'");
    const j = await pokedex(1, cookie);
    const col = j.collection.find((e) => e.no === 4);
    assert.ok(col, 'egg:4 应进 collection');
    assert.equal(col.source, 'egg');
    const c = await card(1, 'egg:4', cookie);
    assert.equal(c.details.obtainedAt, '2026-01-05', '收藏条目带获得时间；若解析到封印蛋条目则无此字段');
  });

  test('benchDex 键只在测试站：测试模式 200，正式模式 404', async () => {
    const cookie = await parentCookie();
    const j = await pokedex(1, cookie); // TEST_MODE
    assert.ok(j.benchDexKeys.includes('egg:196'), '测试站 bench 键应含 egg:196');
    const t = await card(1, 'egg:196', cookie);
    assert.equal(t.no, 196);
    assert.ok(t.details.types.includes('超能力'));
    await toProd();
    const p = await cardRaw(1, 'egg:196', cookie);
    assert.equal(p.status, 404);
    assert.equal(p.j.error, 'NOT_FOUND');
  });
});

/* ---------- ③ 动态响应体积（测试站实测口径） ---------- */
describe('pokedex dynamic response size', () => {
  beforeEach(() => { env = makeEnv(); });
  afterEach(() => raw.close());

  test('31/22 行图鉴的孩子：动态响应 ≤15KB（旧接口 866KB）', async () => {
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    await pokedex(2, cookie);
    for (let n = 2; n <= 32; n++) insertEntry(1, 'wild:' + n); // 孩子 1：31 行
    for (let n = 2; n <= 23; n++) insertEntry(2, 'wild:' + n); // 孩子 2：22 行
    const j1 = await pokedex(1, cookie);
    const j2 = await pokedex(2, cookie);
    const b1 = JSON.stringify(j1).length;
    const b2 = JSON.stringify(j2).length;
    assert.ok(b1 <= 15360, `孩子 1 动态 ${b1}B 应 ≤15KB`);
    assert.ok(b2 <= 15360, `孩子 2 动态 ${b2}B 应 ≤15KB`);
    await toProd();
    const p1 = await pokedex(1, cookie);
    const p2 = await pokedex(2, cookie);
    const pb1 = JSON.stringify(p1).length;
    const pb2 = JSON.stringify(p2).length;
    assert.ok(pb1 <= 15360, `正式模式孩子 1 动态 ${pb1}B 应 ≤15KB`);
    assert.ok(pb2 <= 15360, `正式模式孩子 2 动态 ${pb2}B 应 ≤15KB`);
  });
});

/* ---------- ④ 前端真实合并 ---------- */
describe('mergePokedexData (real function from app.js.orig)', () => {
  const start = appJs.indexOf('const DEX_SHAPE_VERSION = 2;');
  const end = appJs.indexOf('async function loadPokedex(id) {', start);
  assert.ok(start > 0 && end > start, '应能在 app.js.orig 中切出合并函数段');
  const factory = new Function(`${appJs.slice(start, end)}; return { mergePokedexData, dexRememberDetails, dexForgetDetails, DEX_SHAPE_VERSION };`);
  const { mergePokedexData, dexRememberDetails, dexForgetDetails, DEX_SHAPE_VERSION } = factory();
  assert.equal(DEX_SHAPE_VERSION, 2);

  const skel = M.pokedexStaticSkeleton().data;
  const eggKeysForPikachu = skel.eggSpecies.filter((e) => e.key !== 'egg:25').map((e) => e.key);
  const dyn = (over = {}) => ({
    ok: true, staticHash: M.pokedexStaticSkeleton().hash,
    unlocked: ['form:pikachu:0', 'form:pikachu:1', 'wild:54'],
    obtained: { 'form:pikachu:0': '2026-01-01', 'form:pikachu:1': '2026-01-01', 'wild:54': '2026-01-02' },
    currentLine: 'pikachu', eeveeBranch: null, mainFriendship: 0,
    progress: { owned: 2, total: 151, pct: 1 },
    level: 1, xp: { total: 0, intoLevel: 0, span: 80, toNext: 80 }, fragments: 0,
    dex151Owned: [25, 54], collection: [], eggSpeciesKeys: eggKeysForPikachu,
    ...over,
  });

  test('锁定 151 行精确为 {no, unlocked:false, name:null, img}；已获得行带名字与属性', () => {
    const m = mergePokedexData(skel, dyn(), 1);
    assert.equal(m.dexShapeVersion, 2);
    assert.equal(m.staticHash, M.pokedexStaticSkeleton().hash);
    assert.equal(m.childId, 1);
    assert.deepEqual(m.dex151[0], { no: 1, unlocked: false, name: null, img: skel.dex151[0].img });
    const owned54 = m.dex151[53];
    assert.equal(owned54.unlocked, true);
    assert.equal(owned54.name, '可达鸭');
    assert.equal(owned54.img, skel.dex151[53].img);
    assert.equal(owned54.type, '水');
    assert.deepEqual(owned54.types, ['水']);
    assert.equal(Object.hasOwn(owned54, 'moves'), false, '未取卡片前不带详情');
  });

  test('锁定条目不带 type/types；已获得条目带；主线 current 按 currentLine', () => {
    const m = mergePokedexData(skel, dyn(), 1);
    const lockedWild = m.wild.find((e) => e.key === 'wild:10');
    assert.ok(lockedWild);
    assert.equal(lockedWild.unlocked, false);
    assert.equal(lockedWild.name, '绿毛虫');
    assert.equal(Object.hasOwn(lockedWild, 'type'), false);
    assert.equal(Object.hasOwn(lockedWild, 'types'), false);
    assert.equal(Object.hasOwn(lockedWild, 'moves'), false);
    const ownedWild = m.wild.find((e) => e.key === 'wild:54');
    assert.equal(ownedWild.unlocked, true);
    assert.equal(ownedWild.type, '水');
    assert.deepEqual(ownedWild.types, ['水']);
    const egg = m.lineEntries.find((e) => e.key === 'form:pikachu:0');
    assert.equal(egg.unlocked, true);
    assert.equal(egg.current, true);
    assert.ok(egg.egg, '蛋形态带蛋设计');
    const other = m.lineEntries.find((e) => e.key === 'form:charmander:1');
    assert.equal(other.current, false);
    assert.equal(other.unlocked, false);
  });

  test('封印蛋按本孩 eggSpeciesKeys 过滤（自家线蛋不在其中）；正式模式无 benchDex 字段', () => {
    const m = mergePokedexData(skel, dyn(), 1);
    assert.equal(m.eggSpecies.length, 11);
    assert.equal(m.eggSpecies.some((e) => e.key === 'egg:25'), false, '皮卡丘线孩子的蛋格子不应含自家线蛋 egg:25');
    assert.ok(m.eggSpecies.every((e) => e.unlocked === false));
    assert.ok(m.eggSpecies.every((e) => !Object.hasOwn(e, 'type') && !Object.hasOwn(e, 'types')));
    assert.equal(Object.hasOwn(m, 'benchDex'), false, '动态无 benchDexKeys 时合并结果不应有 benchDex 字段');
    const withBench = mergePokedexData(skel, dyn({ benchDexKeys: ['egg:196'] }), 1);
    assert.equal(withBench.benchDex.length, 1);
    assert.equal(withBench.benchDex[0].no, 196);
  });

  test('卡片详情经缓存贴回条目与 151 行；遗忘后剥离；collection 原样照搬', () => {
    const det = { type: '水', types: ['水'], moves: [{ name: '水枪', power: 37 }], evo: { chain: [], branches: null } };
    dexRememberDetails(1, 'wild:54', det, 54);
    const m = mergePokedexData(skel, dyn(), 1);
    assert.deepEqual(m.wild.find((e) => e.key === 'wild:54').moves, [{ name: '水枪', power: 37 }]);
    assert.deepEqual(m.dex151[53].moves, [{ name: '水枪', power: 37 }], '151 已获得行从源条目取缓存详情');
    dexForgetDetails(1, 'wild:54');
    const m2 = mergePokedexData(skel, dyn(), 1);
    assert.equal(Object.hasOwn(m2.wild.find((e) => e.key === 'wild:54'), 'moves'), false);
    assert.equal(Object.hasOwn(m2.dex151[53], 'moves'), false);
    const col = { key: 'egg:133', no: 133, name: '伊布', img: '/static/img/p133.webp', type: '普通', source: 'egg', obtainedAt: '2026-01-05' };
    const m3 = mergePokedexData(skel, dyn({ collection: [col] }), 1);
    assert.deepEqual(m3.collection[0], { ...col, unlocked: true });
  });
});
