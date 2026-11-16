// tests/warehouse-d1-limit.test.mjs
// D1 单条语句 100 绑定参数上限模拟：测试 DB 的 bind 层加守卫，任何单条语句绑定 >100 即抛
// 'D1_ERROR: too many SQL variables'（真实 D1 行为，见 Cloudflare D1 Limits 页
// "Maximum bound parameters per query: 100"）。本地 node:sqlite 上限 999，
// 无守卫时仓库 take 的 146-key IN 列表（共 149 参数）全量回归也测不出来。
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
  '0021_skill_levels.sql', '0022_warehouse.sql',
];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) {
      // D1 100 参数上限模拟：超了即抛错，与真实 D1 行为一致。
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

async function loginChild(env, childId = 1) {
  const pLogin = await rawCall(env, '/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  await rawCall(env, '/api/parent/settings/update', {
    method: 'POST',
    cookie: pLogin.cookie,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  const c = await rawCall(env, '/api/child/login', {
    method: 'POST',
    body: { childId, password: childId === 2 ? '0000' : '0000' },
  });
  return c.cookie;
}

async function callApi(env, path, { method = 'GET', body = null, cookie = '' } = {}) {
  return rawCall(env, path, { method, body, cookie });
}

describe('仓库 take/store/swap 在 D1 100 参数上限下（2026-11-06 生产站 take 报 500）', () => {
  test('1. take/store/swap 全流程在 100 参数守卫下通过（旧代码：take 的 UPDATE 绑 149 参数 → 500）', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'wild:16', '2026-01-01', 1),
        (1, 'wild:50', '2026-01-01', 1),
        (1, 'wild:54', '2026-01-01', 1),
        (1, 'wild:37', '2026-01-01', 0),
        (1, 'wild:74', '2026-01-01', 0);
    `);

    // take：旧代码 UPDATE 子查询绑 149 参数（3 + 146），守卫下抛错 → Worker 500。
    const takeOk = await callApi(env, '/api/warehouse/take', {
      method: 'POST', cookie, body: { child_id: 1, no: 37 },
    });
    assert.equal(takeOk.status, 200);
    assert.equal(takeOk.json.ok, true);
    assert.equal(takeOk.json.carried.length, 4);

    // store：只绑 2 参数，旧代码也能过；守卫下仍须通过。
    const storeOk = await callApi(env, '/api/warehouse/store', {
      method: 'POST', cookie, body: { child_id: 1, no: 16 },
    });
    assert.equal(storeOk.status, 200);
    assert.equal(storeOk.json.carried.length, 3);

    // take 满员后应返回 400 PARTY_FULL_SWAP_REQUIRED（旧代码：兜底 count 查询绑 147 参数 → 500）。
    const take74 = await callApi(env, '/api/warehouse/take', {
      method: 'POST', cookie, body: { child_id: 1, no: 74 },
    });
    assert.equal(take74.status, 200);
    const takeFull = await callApi(env, '/api/warehouse/take', {
      method: 'POST', cookie, body: { child_id: 1, no: 16 },
    });
    assert.equal(takeFull.status, 400);
    assert.equal(takeFull.json.error, 'PARTY_FULL_SWAP_REQUIRED');

    // swap：只绑 2 个 key，守卫下通过。
    const swapOk = await callApi(env, '/api/warehouse/swap', {
      method: 'POST', cookie, body: { child_id: 1, take_no: 16, store_no: 50 },
    });
    assert.equal(swapOk.status, 200);
    assert.deepEqual(swapOk.json.carried.map((c) => c.no).sort((a, b) => a - b), [16, 37, 54, 74]);
  });

  test('2. 生产数据形态：逐只取出 10 只仓库宠，携带始终 ≤4，gym:95 不计入', async () => {
    const { raw, env } = makeEnv();
    const cookie = await loginChild(env, 1);
    // 按 2026-11-06 生产站孩子 1 的真实行 seed：gym:95 carried=1（0022 回填产物）、
    // form:pikachu:0-3（主宠形态行，carried=0）、gym:121、egg:143 + 9 个 wild:。
    raw.exec(`
      INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES
        (1, 'gym:95', '2026-01-01', 1),
        (1, 'form:pikachu:0', '2026-01-01', 0),
        (1, 'form:pikachu:1', '2026-01-01', 0),
        (1, 'form:pikachu:2', '2026-01-01', 0),
        (1, 'form:pikachu:3', '2026-01-01', 0),
        (1, 'gym:121', '2026-01-01', 0),
        (1, 'egg:143', '2026-01-01', 0),
        (1, 'wild:16', '2026-01-01', 0),
        (1, 'wild:50', '2026-01-01', 0),
        (1, 'wild:54', '2026-01-01', 0),
        (1, 'wild:58', '2026-01-01', 0),
        (1, 'wild:74', '2026-01-01', 0),
        (1, 'wild:98', '2026-01-01', 0),
        (1, 'wild:111', '2026-01-01', 0),
        (1, 'wild:123', '2026-01-01', 0),
        (1, 'wild:179', '2026-01-01', 0);
    `);
    const storedNos = [16, 50, 54, 58, 74, 98, 111, 123, 179, 143];
    for (const no of storedNos) {
      const take = await callApi(env, '/api/warehouse/take', {
        method: 'POST', cookie, body: { child_id: 1, no },
      });
      assert.equal(take.status, 200, `take ${no} 应成功`);
      assert.equal(take.json.ok, true);
      assert.ok(take.json.carried.length <= 4, `take ${no} 后携带 ${take.json.carried.length} 只，超 4 只`);
      assert.ok(!take.json.carried.some((c) => c.no === 95), 'gym:95 不应计入携带');
      // 满 4 只后先存回刚取出的这只，再取下一只（否则第 5 只起应报满员）。
      if (take.json.carried.length === 4) {
        const storeBack = await callApi(env, '/api/warehouse/store', {
          method: 'POST', cookie, body: { child_id: 1, no },
        });
        assert.equal(storeBack.status, 200, `store ${no} 应成功`);
      }
    }
    // gym:95 行原样未动（仍为 carried=1），只是不计入 4 只上限。
    const gym95 = raw.prepare("SELECT carried FROM pokedex WHERE child_id=1 AND entry_key='gym:95'").get();
    assert.equal(gym95.carried, 1);
  });
});
