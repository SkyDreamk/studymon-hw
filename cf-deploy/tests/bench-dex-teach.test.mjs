/* 备战图鉴与仙子伊布教学：node --test tests/bench-dex-teach.test.mjs
 * 真实 Azure 调用 0 次。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { readBackendSource } from './backend-src.mjs';

const src = readBackendSource();
const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0043_pet_instances_ability.sql'];

function makeEnv(migrations = MIGRATIONS) {
  const raw = new DatabaseSync(':memory:');
  for (const f of migrations) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

/* 全面解锁（2026-10-28）：DEBUG_GATES_OPEN 改为 = isTestMode(env) 后，以下旧断言须在正式模式（无 TEST_MODE）下跑才仍成立；测试站放行行为改由 tests/test-mode-unlock.test.mjs 覆盖。 */
async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

function seqRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}

function giveItem(childId, key, qty = 1) {
  raw.prepare('INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?,?,?,0) ON CONFLICT(child_id, item_key) DO UPDATE SET qty=qty+excluded.qty').run(childId, key, qty);
}
function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}
function setLevel(childId, level) {
  raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(M.xpForLevel(level), childId);
}
function setLine(childId, line) {
  raw.prepare('UPDATE children SET line=? WHERE id=?').run(line, childId);
}
function todayStr() { return M.shDateStr(); }

/* 种子库里没有任何 pokedex 行：第一批后 180/181/208/212/464/466/900 已进野外池（有 wild 条目），
 * benchDex 只剩无任何图鉴条目的 5 种伊布进化形（196/197/470/471/700）。
 * 线上大宝已进化仙子伊布，进化时写了 egg:700 行，线上 benchDex 是 4 种、不含 700。 */
const BENCH_NOS = [196, 197, 470, 471, 700];

async function pokedex() {
  const cookie = await parentCookie();
  const r = await call('/api/pokedex', {
    method: 'POST', body: { childId: 1 }, cookie,
  });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}

function nonEmpty(value, label) {
  assert.ok(value != null, label);
  if (typeof value === 'string' || Array.isArray(value)) {
    assert.ok(value.length > 0, label);
  } else if (typeof value === 'object') {
    assert.ok(Object.keys(value).length > 0, label);
  } else {
    assert.ok(value, label);
  }
}

function seedSylveon() {
  setLine(1, 'eevee');
  setLevel(1, 8);
  raw.prepare("UPDATE children SET fairy_moves='[]' WHERE id=1").run();
  raw.prepare("DELETE FROM pet_instances WHERE child_id=1 AND line_key='eevee'").run();
  raw.prepare(`INSERT INTO pet_instances
    (child_id, line_key, species_no, branch, form_idx, source, created_epoch, updated_epoch)
    VALUES(1,'eevee',700,'sylveon',1,'main',0,0)`).run();
  giveItem(1, 'stone:fairy-skill', 1);
}

async function teach(cookie) {
  return withRandom(0.0, () => call('/api/evo/use-stone', {
    method: 'POST',
    body: { childId: 1, target: 'eevee', action: 'teach' },
    cookie,
  }));
}

async function card(key) {
  const cookie = await parentCookie();
  const r = await call('/api/pokedex/card', {
    method: 'POST', body: { childId: 1, key }, cookie,
  });
  assert.equal(r.status, 200, key);
  assert.equal(r.j.ok, true, key);
  return r.j.details;
}

test('测试模式 benchDex 精确补齐缺失种，且卡片详情完整', async () => {
  const j = await pokedex();
  const skel = M.pokedexStaticSkeleton().data;
  const benchNos = j.benchDexKeys.map((k) => skel.benchDex.find((e) => e.key === k)?.no);
  assert.deepEqual(benchNos, BENCH_NOS);
  for (const key of j.benchDexKeys) {
    assert.ok(j.unlocked.includes(key), key + ' 应在已获得集里（测试模式补齐）');
    const skelEntry = skel.benchDex.find((e) => e.key === key);
    const no = skelEntry?.no;
    // 名字/图片/属性是静态骨架字段；招式/双属性/进化/克制是卡片详情字段（Fable 优化 #2 拆分后各归其位）
    for (const field of ['name', 'img', 'type']) nonEmpty(skelEntry[field], `${no}.${field}`);
    const d = await card(key);
    for (const field of ['moves', 'types', 'evo', 'matchups']) {
      nonEmpty(d[field], `${no}.${field}`);
    }
  }
  for (const no of [179, 133, 143, 151]) {
    assert.ok(!benchNos.includes(no));
  }
});

test('benchDex 不进入 collection，且不改变 progress.total', async () => {
  const j = await pokedex();
  const skel = M.pokedexStaticSkeleton().data;
  const benchNos = j.benchDexKeys.map((k) => skel.benchDex.find((e) => e.key === k)?.no);
  assert.deepEqual(benchNos, BENCH_NOS);
  const collectionNos = new Set(j.collection.map((e) => e.no));
  for (const no of benchNos) assert.ok(!collectionNos.has(no));
  assert.equal(j.progress.total, 151);
  await toProd();
  const prod = await pokedex();
  assert.equal(j.collection.length, prod.collection.length);
  assert.deepEqual(j.progress, prod.progress);
});

test('正式模式 /api/pokedex 不含 benchDex 字段', async () => {
  await toProd();
  const j = await pokedex();
  assert.ok(!('benchDex' in j));
});

test('测试模式已进化仙子伊布可教学，扣石并在背包返回招式', async () => {
  seedSylveon();
  const cookie = await parentCookie();
  const r = await teach(cookie);
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  assert.equal(r.j.move.name, '魅惑之声');
  assert.equal(r.j.move.type, '妖精');
  assert.equal(invQty(1, 'stone:fairy-skill'), 0);

  const row = raw.prepare('SELECT fairy_moves FROM children WHERE id=1').get();
  const moves = JSON.parse(row.fairy_moves);
  assert.equal(moves.length, 1);
  assert.ok(moves.some((m) => m.name === '魅惑之声' && m.type === '妖精'));

  const backpack = await call('/api/evo/backpack?childId=1', { cookie });
  assert.equal(backpack.status, 200);
  assert.equal(backpack.j.ok, true);
  assert.ok(backpack.j.fairyMoves.some(
    (m) => m.name === '魅惑之声' && m.type === '妖精',
  ));
});

test('正式模式教学接口未新增分支门控', async () => {
  await toProd();
  seedSylveon();
  const cookie = await parentCookie();
  // 正式站的门控只在前端按钮条件，接口本来就不校验分支。
  const r = await teach(cookie);
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  assert.equal(r.j.move.type, '妖精');
});

test('前端两处卡片查找包含 benchDex，教学条件放开仙子伊布且 early return 未动', () => {
  const app = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
  // 任务 127：道馆备战卡片 openGymBenchCard 已撤（道馆页不再点球开卡）；两处卡片查找现为
  // openPartyPetCard（伙伴页）与 openDexCard（图鉴页），都须含 benchDex（测试站 151 全量）。
  assert.ok(!app.includes('function openGymBenchCard('), 'openGymBenchCard 应已移除');
  const gymStart = app.indexOf('function openPartyPetCard(');
  const dexStart = app.indexOf('function openDexCard(');
  assert.ok(gymStart >= 0);
  assert.ok(dexStart >= 0);
  const gymAll = app.slice(gymStart).match(/const all = ([\s\S]*?);/);
  const dexEntries = app.slice(dexStart).match(/const entries = ([\s\S]*?);/);
  assert.ok(gymAll);
  assert.ok(dexEntries);
  assert.ok(gymAll[1].includes('...(dx.benchDex || [])'));
  assert.ok(dexEntries[1].includes('...(dexData.benchDex || [])'));
  assert.ok(app.includes(
    "inst.lineKey === 'eevee' && (!inst.branch || inst.branch === 'sylveon') && !taughtFairy && hasFairyStone",
  ));
  const evoStart = src.indexOf('function evoOptionsFor(');
  assert.ok(evoStart >= 0);
  const evoEnd = src.indexOf('\n}', evoStart);
  assert.ok(evoEnd > evoStart);
  assert.ok(src.slice(evoStart, evoEnd).includes('if (inst.branch) return opts;'));
});

test('evoOptionsFor 对已进化仙子伊布仍返回空数组', () => {
  const child = { total_xp: M.xpForLevel(8), fairy_moves: '[]' };
  const inst = { line_key: 'eevee', form_idx: 1, species_no: 700, branch: 'sylveon' };
  assert.deepEqual(M.evoOptionsFor(child, inst), []);
});
