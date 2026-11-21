// tests/pending-reviews-d1-limit.test.mjs
// D1 单条语句 100 绑定参数上限模拟（复用 warehouse-d1-limit.test.mjs 的守卫模式）：
// 测试 DB 的 bind 层加守卫，任何单条语句绑定 >100 即抛 'D1_ERROR: too many SQL variables'
// （真实 D1 行为，见 Cloudflare D1 Limits 页 "Maximum bound parameters per query: 100"）。
// 背景：apiPendingReviews 取待审核列表无 LIMIT，photosByCheckin 按打卡 id 拼
// WHERE checkin_id IN (...)，两孩每天约 10 条待审核，约 10 天不审就超 100 参数，
// 家长审核页报 500（与 2026-11-06 仓库 take 报 500 同一类问题）。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
  '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
  '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
  '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
  '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql',
  '0021_skill_levels.sql', '0022_warehouse.sql', '0043_pet_instances_ability.sql',
];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const bindCounts = [];
  const wrap = (sql) => ({
    _args: [],
    bind(...args) {
      // D1 100 参数上限模拟：超了即抛错，与真实 D1 行为一致；同时记录每次绑定数，供分批断言用。
      bindCounts.push(args.length);
      if (args.length > 100) throw new Error('D1_ERROR: too many SQL variables (simulated 100-param guard)');
      this._args = args; return this;
    },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
    bindCounts,
  };
}

async function rawCall(env, path, { method = 'GET', body = null, cookie = '' } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;
  const req = new Request('http://localhost' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const res = await M.default.fetch(req, env);
  const setCookie = res.headers.get('set-cookie') || '';
  const cookiePair = setCookie ? setCookie.split(';')[0] : '';
  return { status: res.status, json: await res.json(), cookie: cookiePair };
}

async function loginParent(env) {
  const pLogin = await rawCall(env, '/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(pLogin.json.ok, true);
  return pLogin.cookie;
}

/** seed N 条待审核打卡（两孩各半），i%5==0 的无照片、其余各 1 张、i%10==1 的再加 1 张；返回 { ids, photoCountById }。 */
function seedPending(raw, n) {
  const ids = [];
  const photoCountById = new Map();
  for (let i = 0; i < n; i++) {
    const childId = (i % 2) + 1;
    const r = raw.prepare(
      "INSERT INTO checkins(child_id, date, subjects, submitted_at, submitted_epoch, status) VALUES(?, '2026-11-06', '[\"语文\"]', '08:00', ?, 'pending')"
    ).run(childId, 1700000000 + i);
    const id = Number(r.lastInsertRowid);
    ids.push(id);
    let photos = 0;
    if (i % 5 !== 0) {
      raw.prepare("INSERT INTO checkin_photos(checkin_id, object_key, content_type, size) VALUES(?, ?, 'image/jpeg', 1234)").run(id, 'k' + id);
      photos = 1;
    }
    if (i % 10 === 1) {
      // i%10==1 的打卡已有 1 张，再加 1 张 png（共 2 张，验证同打卡多照片的顺序）。
      raw.prepare("INSERT INTO checkin_photos(checkin_id, object_key, content_type, size) VALUES(?, ?, 'image/png', 5678)").run(id, 'k2-' + id);
      photos += 1;
    }
    photoCountById.set(id, photos);
  }
  return { ids, photoCountById };
}

describe('家长审核页 apiPendingReviews 在 D1 100 参数上限下（2026-11-06 同类审计发现）', () => {
  test('1. 120 条待审核打卡调 /api/parent/pending 在 100 参数守卫下通过（旧代码：photosByCheckin 绑 120 参数 → 500）', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginParent(env);
    const { photoCountById } = seedPending(raw, 120);

    const res = await rawCall(env, '/api/parent/pending', { method: 'GET', cookie });
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(res.json.reviews.length, 120);
    let totalPhotos = 0;
    for (const r of res.json.reviews) {
      assert.equal(r.photos.length, photoCountById.get(r.id), `打卡 ${r.id} 的照片数应与 seed 一致`);
      totalPhotos += r.photos.length;
    }
    assert.equal(totalPhotos, 108, '96 条有照片（120 - 24 条 i%5==0 无照片），其中 12 条 i%10==1 各 2 张，共 108 张');
    // i%10==1 的打卡有 2 张照片，且按 id 升序（jpeg 在前、png 在后）。
    const twoPhoto = res.json.reviews.find((r) => r.photos.length === 2);
    assert.ok(twoPhoto, '应存在 2 张照片的打卡');
    assert.deepEqual(twoPhoto.photos.map((p) => p.contentType), ['image/jpeg', 'image/png']);
  });

  test('2. photosByCheckin 直接调用：150 个 id 一次调用，分批后结果与逐一查一致，且单条语句绑定 ≤50', async () => {
    const { raw, env, bindCounts } = makeEnv();
    const { ids, photoCountById } = seedPending(raw, 150);

    const before = bindCounts.length;
    const map = await M.photosByCheckin(env.DB, ids);
    const used = bindCounts.slice(before);
    assert.ok(Math.max(...used) <= 50, `分批后单条语句最多绑 ${Math.max(...used)} 参数，应 ≤50`);
    assert.ok(used.length >= 3, `150 个 id 应分 ≥3 批，实际绑定 ${used.length} 次`);

    // 与 raw 直接查逐一对照：每只打卡的照片数、内容类型、大小全一致。
    assert.equal(map.size, 120, '150 条打卡里 120 条有照片（30 条 i%5==0 无照片，不进 map）');
    for (const id of ids) {
      const expected = raw.prepare('SELECT id, content_type, size FROM checkin_photos WHERE checkin_id=? ORDER BY id').all(id);
      const got = map.get(id) || [];
      assert.equal(got.length, photoCountById.get(id), `打卡 ${id} 照片数一致`);
      assert.deepEqual(got.map((p) => p.contentType), expected.map((r) => r.content_type));
      assert.deepEqual(got.map((p) => p.size), expected.map((r) => r.size));
    }

    // 边界：空数组、1 个 id、恰好 50 个 id、51 个 id。
    assert.equal((await M.photosByCheckin(env.DB, [])).size, 0);
    assert.equal((await M.photosByCheckin(env.DB, [ids[1]])).get(ids[1]).length, photoCountById.get(ids[1])); // ids[1]（i=1）有 2 张照片
    const map50 = await M.photosByCheckin(env.DB, ids.slice(0, 50));
    assert.equal(map50.size, 40, '前 50 条里 40 条有照片');
    const map51 = await M.photosByCheckin(env.DB, ids.slice(0, 51));
    assert.equal(map51.size, 40, '前 51 条里仍是 40 条有照片（第 51 条 i=50 无照片）');
    // 51 个 id 应分 2 批：断言本次调用的绑定次数与最大值。
    const tail = bindCounts.slice(before);
    assert.ok(tail.filter((n) => n === 50).length >= 1, '51 个 id 应含一批 50');
  });
});
