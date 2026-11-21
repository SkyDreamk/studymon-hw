// tests/routing-async-error.test.mjs
// 任务 29：验证路由分发层正确 await 异步 handler，异步抛错不再逃出 try/catch，
// 统一返回 500 JSON { ok: false, error: 'SERVER_ERROR', message }，且不吞正常预期错误码。
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
  '0021_skill_levels.sql', '0022_warehouse.sql', '0023_care_qa_and_friendship.sql', '0043_pet_instances_ability.sql',
];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  let failPattern = null;
  let failMessage = 'DB_ASYNC_BOOM';

  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() {
      if (failPattern && failPattern.test(sql)) throw new Error(failMessage);
      const r = raw.prepare(sql).get(...this._args);
      return r ?? null;
    },
    async all() {
      if (failPattern && failPattern.test(sql)) throw new Error(failMessage);
      return { results: raw.prepare(sql).all(...this._args) };
    },
    async run() {
      if (failPattern && failPattern.test(sql)) throw new Error(failMessage);
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });

  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };

  return {
    env: {
      DB: db,
      TEST_MODE: '1',
      ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) },
    },
    raw,
    injectDbFailure(regex, msg = 'DB_ASYNC_BOOM') {
      failPattern = regex;
      failMessage = msg;
    },
    clearDbFailure() {
      failPattern = null;
    },
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
  const contentType = res.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await res.json() : null;
  return { status: res.status, contentType, json, cookie: cookiePair };
}

async function loginChild1(env) {
  const pLogin = await rawCall(env, '/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  await rawCall(env, '/api/parent/settings/update', {
    method: 'POST',
    cookie: pLogin.cookie,
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  const cLogin = await rawCall(env, '/api/child/login', {
    method: 'POST',
    body: { childId: 1, password: '1111' },
  });
  return cLogin.cookie;
}

describe('任务 29：路由异步抛错收敛为 500 JSON SERVER_ERROR', () => {
  test('1. switch 内 handler (apiWarehouseTake) 异步 DB 抛错：不逃出 fetch，返回 500 JSON SERVER_ERROR', async () => {
    const { env, injectDbFailure, clearDbFailure } = makeEnv();
    const cookie = await loginChild1(env);

    // 放行 getSession 查 sessions 表，仅在 handler 查 pokedex 时异步抛错
    injectDbFailure(/FROM\s+pokedex|UPDATE\s+pokedex/i, 'WAREHOUSE_TAKE_DB_CRASH');
    try {
      const res = await rawCall(env, '/api/warehouse/take', {
        method: 'POST',
        cookie,
        body: { child_id: 1, no: 16 },
      });
      assert.equal(res.status, 500);
      assert.ok(res.contentType.includes('application/json'), '响应应为 application/json');
      assert.equal(res.json.ok, false);
      assert.equal(res.json.error, 'SERVER_ERROR');
      assert.match(res.json.message, /WAREHOUSE_TAKE_DB_CRASH/);
    } finally {
      clearDbFailure();
    }
  });

  test('2. 孩子登录路由 (/api/child/login) 异步抛错：纳入 try/catch 保护，返回 500 JSON SERVER_ERROR', async () => {
    const { env, injectDbFailure, clearDbFailure } = makeEnv();
    injectDbFailure(/SELECT|INSERT/i, 'CHILD_LOGIN_DB_CRASH');
    try {
      const res = await rawCall(env, '/api/child/login', {
        method: 'POST',
        body: { childId: 1, password: '1111' },
      });
      assert.equal(res.status, 500);
      assert.ok(res.contentType.includes('application/json'));
      assert.equal(res.json.ok, false);
      assert.equal(res.json.error, 'SERVER_ERROR');
      assert.match(res.json.message, /CHILD_LOGIN_DB_CRASH/);
    } finally {
      clearDbFailure();
    }
  });

  test('3. 家长登录路由 (/api/parent/login) 异步抛错：纳入 try/catch 保护，返回 500 JSON SERVER_ERROR', async () => {
    const { env, injectDbFailure, clearDbFailure } = makeEnv();
    injectDbFailure(/SELECT|INSERT/i, 'PARENT_LOGIN_DB_CRASH');
    try {
      const res = await rawCall(env, '/api/parent/login', {
        method: 'POST',
        body: { pin: '0000' },
      });
      assert.equal(res.status, 500);
      assert.ok(res.contentType.includes('application/json'));
      assert.equal(res.json.ok, false);
      assert.equal(res.json.error, 'SERVER_ERROR');
      assert.match(res.json.message, /PARENT_LOGIN_DB_CRASH/);
    } finally {
      clearDbFailure();
    }
  });

  test('4. 预期业务错误与 HTTP 状态码（401/404/400）原样返回，不被外层 try/catch 吞成 500', async () => {
    const { env } = makeEnv();

    // 未登录访问受保护接口 -> 401 NEED_LOGIN
    const unauth = await rawCall(env, '/api/overview');
    assert.equal(unauth.status, 401);
    assert.equal(unauth.json.ok, false);
    assert.equal(unauth.json.error, 'NEED_LOGIN');

    const cookie = await loginChild1(env);

    // 不存在的 API 路径 -> 404 NOT_FOUND
    const notFoundRoute = await rawCall(env, '/api/non-existent-endpoint', { cookie });
    assert.equal(notFoundRoute.status, 404);
    assert.equal(notFoundRoute.json.ok, false);
    assert.equal(notFoundRoute.json.error, 'NOT_FOUND');

    // 业务预期 404（查询不存在的对战）-> 404 NOT_FOUND
    // /api/battle/state 要求 POST（GET 会先回 405 METHOD），battleId 走 JSON body
    const noBattle = await rawCall(env, '/api/battle/state', { method: 'POST', cookie, body: { battleId: 999999 } });
    assert.equal(noBattle.status, 404);
    assert.equal(noBattle.json.ok, false);
    assert.equal(noBattle.json.error, 'NOT_FOUND');

    // 业务预期 400（取出非收藏种）-> 400 INVALID_SPECIES
    // 注：2026-11-14 仓库全量批后，测试模式下未拥有的收藏种会被直接发放（take 授权），
    // 故 NOT_IN_WAREHOUSE 在测试模式已不可达；正式站（DEBUG_GATES_OPEN 关）仍按原逻辑返回。
    const notInWh = await rawCall(env, '/api/warehouse/take', {
      method: 'POST',
      cookie,
      body: { child_id: 1, no: 152 },
    });
    assert.equal(notInWh.status, 400);
    assert.equal(notInWh.json.ok, false);
    assert.equal(notInWh.json.error, 'INVALID_SPECIES');
  });
});
