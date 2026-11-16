// 覆盖点：① 隐藏未获得的伊布分支并移除前端分区；② 仅点亮已进化的分支；
// ③ 按孩子区分封印蛋成员并校验改名；④ 转盘与单测奖池主线蛋去重、伊布可重复；
// ⑤ grantEgg 拒绝已获得或待孵化的主线蛋，伊布例外可重复。
// 运行命令：node --test tests/dex-eevee-hidden.test.mjs
// 真实 Azure 调用 0 次
import { assetPath, assetHash } from './asset-path.mjs';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const H = assetHash();

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql',
  '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql',
  '0010_pvp_rematch.sql', '0019_evo_items.sql',
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
  return { status: res.status, j: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0], res };
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

/* 全面解锁（2026-10-28）：DEBUG_GATES_OPEN 改为 = isTestMode(env) 后，以下旧断言须在正式模式（无 TEST_MODE）下跑才仍成立；测试站放行行为改由 tests/test-mode-unlock.test.mjs 覆盖。 */
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

function insertDexRow(childId, key) {
  raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)").run(childId, key, '2026-10-27');
}

describe('dex eevee hidden 2026-10-27', () => {
  beforeEach(() => { env = makeEnv(); });
  afterEach(() => raw.close());

  test('分支分区已消失：后端无 eeveeBranches、前端无分区/格子函数/点开例外、未获得分支全藏', async () => {
    await toProd();
    const cookie = await parentCookie();
    const j = await pokedex(1, cookie);
    assert.equal(Object.hasOwn(j, 'eeveeBranches'), false);
    const app = readFileSync(assetPath('app.js'), 'utf8');
    assert.doesNotMatch(app, /伊布进化分支/);
    assert.doesNotMatch(app, /function dexBranchSlot\(/);
    assert.doesNotMatch(app, /EVO_STONE_NAMES/);
    assert.doesNotMatch(app, /form:eevee:branch:/);
    const card = app.slice(app.indexOf('function openDexCard('), app.indexOf('window.toggleDex151'));
    assert.match(card, /if \(!e\.unlocked\) return;/);
    assert.doesNotMatch(card, /未获得 · 仅展示资料/);
    const allNos = [...j.lineEntries, ...j.wild, ...j.others, ...j.eggSpecies, ...j.collection].map((e) => e.no);
    for (const no of [134, 135, 136, 196, 197, 470, 471, 700]) assert.equal(allNos.includes(no), false, `#${no} 不应出现`);
    for (const no of [134, 135, 136]) assert.deepEqual(j.dex151[no - 1], { no, unlocked: false, name: null, img: `/static/img/p${no}.${H}.webp` });
    insertDexRow(1, 'form:eevee:1');
    const j2 = await pokedex(1, cookie);
    const eevee = j2.lineEntries.find((e) => e.key === 'form:eevee:1');
    assert.equal(eevee.evo.chain.length, 1);
    assert.equal(eevee.evo.chain[0].name, '伊布');
    assert.equal(eevee.evo.branches, null);
  });

  test('进化一个点亮一个：只进化水伊布，就只点亮水伊布', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    insertDexRow(1, 'form:eevee:branch:vaporeon');
    insertDexRow(1, 'egg:134');
    insertDexRow(1, 'form:eevee:1');
    const j = await pokedex(1, cookie);
    const col = j.collection.find((e) => e.no === 134);
    assert.ok(col && col.unlocked === true);
    assert.equal(col.name, '水伊布');
    assert.equal(j.dex151[133].unlocked, true);
    assert.equal(j.dex151[133].name, '水伊布');
    const allNos = [...j.lineEntries, ...j.wild, ...j.others, ...j.eggSpecies, ...j.collection].map((e) => e.no);
    for (const no of [135, 136, 196, 197, 470, 471, 700]) assert.equal(allNos.includes(no), false, `#${no} 不应出现`);
    for (const no of [135, 136]) assert.deepEqual(j.dex151[no - 1], { no, unlocked: false, name: null, img: `/static/img/p${no}.${H}.webp` });
    const eevee = j.lineEntries.find((e) => e.key === 'form:eevee:1');
    assert.deepEqual(eevee.evo.branches, [{ no: 134, name: '水伊布', cond: '16级＋水之石' }]);
    assert.equal(eevee.evo.chain.length, 1);
  });

  test('封印蛋孵化按孩子区分成员＋改名', async () => {
    await toProd();
    const cookie = await parentCookie();
    const j1 = await pokedex(1, cookie);
    assert.deepEqual(j1.eggSpecies.map((e) => e.no), [143, 131, 133, 147, 126, 208, 1, 4, 7]);
    assert.ok(j1.eggSpecies.every((e) => e.kind === '封印蛋'));
    assert.ok(j1.eggSpecies.every((e) => e.unlocked === false));
    const j2 = await pokedex(2, cookie);
    assert.deepEqual(j2.eggSpecies.map((e) => e.no), [143, 131, 133, 147, 126, 208, 1, 7, 25]);
    assert.ok(j2.eggSpecies.every((e) => e.kind === '封印蛋'));
    insertDexRow(1, 'egg:4');
    const j1b = await pokedex(1, cookie);
    assert.equal(j1b.eggSpecies.find((e) => e.no === 4).unlocked, true);
    assert.equal(j1b.eggSpecies.find((e) => e.no === 7).unlocked, false);
    const app = readFileSync(assetPath('app.js'), 'utf8');
    const go = app.slice(app.indexOf('async function goPokedex(id) {'), app.indexOf('async function goEggs(id) {'));
    assert.match(go, /封印蛋孵化/);
    assert.doesNotMatch(go, /道馆封印蛋孵化/);
  });

  test('转盘去重：伊布可重复、其余主线各一只、获得了不再掉', () => {
    // 新池合计 147，蛋段为 85~100/147，0.6 落段内（旧 0.85 现落叶之石段）
    const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
    assert.deepEqual(M.rollWheelPrize(seq([0.6, 0.0]), new Set([1, 4, 7, 25]), new Set()), { kind: 'egg', key: 'egg:133', species: 133 });
    assert.deepEqual(M.rollWheelPrize(seq([0.6, 0.0]), new Set(), new Set()), { kind: 'egg', key: 'egg:1', species: 1 });
    assert.deepEqual(M.rollWheelPrize(seq([0.6, 0.0]), new Set(), new Set([1, 4])), { kind: 'egg', key: 'egg:7', species: 7 });
    assert.deepEqual(M.rollUnitTestPrize(seq([0.65, 0.0]), new Set([1, 4, 7, 25]), new Set(), new Set()), { kind: 'egg', key: 'egg:133', species: 133 });
    assert.deepEqual(M.rollUnitTestPrize(seq([0.65, 0.0]), new Set(), new Set(), new Set()), { kind: 'egg', key: 'egg:1', species: 1 });
  });

  test('发蛋守卫 grantEgg：已获得的不再发，伊布例外可重复', async () => {
    await toProd();
    const cookie = await parentCookie();
    await pokedex(1, cookie);
    raw.prepare("INSERT INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)").run(1, 4, 'test', 1);
    assert.equal((await M.grantEgg(env.DB, 1, 4, 'wheel', 1, '2026-10-27')).granted, false);
    assert.equal((await M.grantEgg(env.DB, 1, 133, 'wheel', 1, '2026-10-27')).granted, true);
    assert.equal((await M.grantEgg(env.DB, 1, 133, 'wheel', 2, '2026-10-27')).granted, true);
    raw.prepare("INSERT INTO reward_eggs(child_id, species_no, source, ref_id, status, unlock_date, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,?)").run(1, 7, 'test', null, 'pending', '2026-11-03', 1, '2026-10-27');
    assert.equal((await M.grantEgg(env.DB, 1, 7, 'wheel', 1, '2026-10-27')).granted, false);
  });
});
