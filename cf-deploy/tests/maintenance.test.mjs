/* 维护模式测试（2026-11-12 用户令）：node --test tests/maintenance.test.mjs
 * MAINTENANCE_MODE=1 时全站停用：首页与所有页面返回维护页（503），API 返回 503 MAINTENANCE；
 * 变量不存在时守卫不触发，正常路径不受影响。
 * 复用 server-timing.test.mjs 的假 D1  harness（node:sqlite 内存库＋迁移）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv(maintenance) {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => {
    const stmt = {
      _args: [],
      bind(...args) { const next = wrap(sql); next._args = [...args]; return next; },
      async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
      async all() { return { results: raw.prepare(sql).all(...this._args) }; },
      async run() {
        const r = raw.prepare(sql).run(...this._args);
        return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
      },
    };
    return stmt;
  };
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  const env = { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
  if (maintenance) env.MAINTENANCE_MODE = '1';
  return { env, raw };
}

async function call(env, path, { method = 'GET', body, host = 'test.local' } = {}) {
  const req = new Request('https://' + host + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const text = await res.text();
  return { status: res.status, text, ct: res.headers.get('Content-Type') || '' };
}

describe('维护模式开', () => {
  let env;
  beforeEach(() => { ({ env } = makeEnv(true)); });

  test('首页返回 503 维护页', async () => {
    const r = await call(env, '/');
    assert.equal(r.status, 503);
    assert.match(r.text, /无法让网瘾少年使用/);
    assert.match(r.ct, /text\/html/);
  });

  test('API 返回 503 MAINTENANCE，不进登录逻辑', async () => {
    const r = await call(env, '/api/child/login', { method: 'POST', body: {} });
    assert.equal(r.status, 503);
    assert.deepEqual(JSON.parse(r.text), { ok: false, error: 'MAINTENANCE' });
  });

  test('静态资源路径也被拦住', async () => {
    const r = await call(env, '/static/app.00000000.js');
    assert.equal(r.status, 503);
    assert.match(r.text, /打卡站维护中/);
  });

  test('其他路径也返回维护页', async () => {
    const r = await call(env, '/login');
    assert.equal(r.status, 503);
    assert.match(r.text, /打卡站维护中/);
  });

  test('example.com 域名被拦', async () => {
    const r = await call(env, '/', { host: 'example.com' });
    assert.equal(r.status, 503);
    assert.match(r.text, /无法让网瘾少年使用/);
  });

  test('workers.dev 域名也被拦（不在豁免里）', async () => {
    const r = await call(env, '/', { host: 'studymon-hw.test.workers.dev' });
    assert.equal(r.status, 503);
    assert.match(r.text, /无法让网瘾少年使用/);
  });
});

describe('维护模式开，但 exempt.example.com 豁免', () => {
  let env;
  beforeEach(() => { ({ env } = makeEnv(true)); });

  test('exempt.example.com 首页正常，不含维护文案', async () => {
    const r = await call(env, '/', { host: 'exempt.example.com' });
    assert.equal(r.status, 200);
    assert.doesNotMatch(r.text, /无法让网瘾少年使用/);
  });

  test('www.exempt.example.com 首页正常', async () => {
    const r = await call(env, '/', { host: 'www.exempt.example.com' });
    assert.equal(r.status, 200);
    assert.doesNotMatch(r.text, /无法让网瘾少年使用/);
  });

  test('exempt.example.com 的 API 也不拦（进正常登录逻辑，非 503）', async () => {
    const r = await call(env, '/api/child/login', { method: 'POST', body: {}, host: 'exempt.example.com' });
    assert.notEqual(r.status, 503);
    assert.doesNotMatch(r.text, /MAINTENANCE/);
  });
});

describe('维护模式关（变量不存在）', () => {
  let env;
  beforeEach(() => { ({ env } = makeEnv(false)); });

  test('首页正常走入口页，不含维护文案', async () => {
    const r = await call(env, '/');
    assert.equal(r.status, 200);
    assert.doesNotMatch(r.text, /打卡站维护中/);
  });

  test('API 正常走登录逻辑（缺参数报 400，非 503）', async () => {
    const r = await call(env, '/api/child/login', { method: 'POST', body: {} });
    assert.notEqual(r.status, 503);
    assert.doesNotMatch(r.text, /MAINTENANCE/);
  });
});
