/* Server-Timing 响应头测试（任务 89）：node --test tests/server-timing.test.mjs
 * 用 node:sqlite 内存库依次应用迁移，再以 D1 适配层驱动 Worker 的真实 fetch
 * 处理函数，验证 total/session/handler 三段计时头的有无与自洽性。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  // 假 D1：bind 刻意做成不可变语义（返回新语句），与真实 D1 一致；
  // 否则 wrapper 丢掉 bind 返回值这类 bug 会被测试掩住（任务 89 实测教训）。
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
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}

function timing(res) {
  const h = res.headers.get('server-timing') || '';
  const m = {};
  for (const part of h.split(',')) {
    const mm = part.trim().match(/^(\w+);dur=([\d.]+)$/);
    if (mm) m[mm[1]] = Number(mm[2]);
  }
  return m;
}

function d1stats(res) {
  const h = res.headers.get('x-d1-stats') || '';
  const m = {};
  for (const part of h.split(';')) {
    const mm = part.trim().match(/^(\w+)=(.+)$/);
    if (mm) m[mm[1]] = mm[2];
  }
  return { raw: h, q: Number(m.q || 0), wall: Number(m.wall || 0), exec: Number(m.exec || 0), read: Number(m.read || 0), written: Number(m.written || 0) };
}

function d1queries(res) {
  const h = res.headers.get('x-d1-queries') || '';
  if (!h) return [];
  return h.split(';').map((part) => {
    const mm = part.trim().match(/^(\d+):([\d.]+):(.*)$/);
    return mm ? { i: Number(mm[1]), wall: Number(mm[2]), sql: mm[3].trim() } : null;
  }).filter(Boolean);
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

describe('Server-Timing（任务 89）', () => {
  test('未登录 /api/overview → 401，三段都在且 total 不小于各段之和', async () => {
    const r = await call('/api/overview');
    assert.equal(r.status, 401);
    const t = timing(r.res);
    assert.ok('total' in t, '应有 total');
    assert.ok('session' in t, '应有 session');
    assert.ok('handler' in t, '应有 handler');
    assert.ok(t.total >= 0 && t.session >= 0 && t.handler >= 0);
    assert.ok(t.total + 0.001 >= t.session + t.handler, `total ${t.total} 应 ≥ session ${t.session} + handler ${t.handler}`);
  });

  test('家长登录后 /api/overview → 200，三段都在且自洽', async () => {
    const pc = await parentCookie();
    const r = await call('/api/overview', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    const t = timing(r.res);
    assert.ok('total' in t && 'session' in t && 'handler' in t);
    assert.ok(t.total + 0.001 >= t.session + t.handler);
  });

  test('家长登录后 /api/overview：db 段与 X-D1-Stats 齐全，查询数>10', async () => {
    const pc = await parentCookie();
    const r = await call('/api/overview', { cookie: pc });
    assert.equal(r.status, 200);
    const t = timing(r.res);
    assert.ok('db' in t, '应有 db 段');
    const s = d1stats(r.res);
    assert.ok(s.q > 10, `overview 应有数十次查询，实得 q=${s.q}`);
    assert.ok(s.wall >= 0 && s.exec >= 0 && s.read >= 0 && s.written >= 0);
    assert.ok(s.raw.includes('slow1='), '应有最慢查询');
  });

  test('家长登录后 /api/overview：X-D1-Queries 按顺序列出全部查询', async () => {
    const pc = await parentCookie();
    const r = await call('/api/overview', { cookie: pc });
    assert.equal(r.status, 200);
    const qs = d1queries(r.res);
    const s = d1stats(r.res);
    assert.ok(qs.length > 10, `查询清单应有数十条，实得 ${qs.length}`);
    assert.ok(qs.length <= s.q, 'batch 一次记一条，清单条数不应超过 q');
    qs.forEach((e, i) => assert.equal(e.i, i + 1, '序号应连续'));
    assert.ok(qs[0].sql.includes('SELECT value FROM settings'), '首条应为调试配置查询');
    assert.ok(qs.some((e) => e.sql.includes('FROM sessions')), '应含 session 查找');
  });

  test('未登录 /api/overview：401 也有 db 段（测试模式 applyDebugTime 查库）', async () => {
    const r = await call('/api/overview');
    assert.equal(r.status, 401);
    const t = timing(r.res);
    assert.ok('db' in t);
    const s = d1stats(r.res);
    assert.ok(s.q >= 2, `测试模式开头 2 次调试配置查询，实得 q=${s.q}`);
  });

  test('静态资源只有 total，没有 session/handler', async () => {
    const r = await call('/static/style.' + H + '.css');
    assert.equal(r.status, 200);
    const t = timing(r.res);
    assert.ok('total' in t, '应有 total');
    assert.ok(!('session' in t), '静态资源不应有 session');
    assert.ok(!('handler' in t), '静态资源不应有 handler');
    // 测试模式下开头仍有 2 次调试配置查询，故 db 段存在；正式环境 applyDebugTime 为 no-op，静态资源无 db 段。
    const s = d1stats(r.res);
    assert.ok(s.q >= 2, `测试模式调试查询，实得 q=${s.q}`);
  });

  test('登录接口有 total＋db，没有 session/handler', async () => {
    const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    assert.equal(r.status, 200);
    const t = timing(r.res);
    assert.ok('total' in t);
    assert.ok('db' in t, '登录查库，应有 db');
    assert.ok(!('session' in t));
    assert.ok(!('handler' in t));
    const s = d1stats(r.res);
    assert.ok(s.q >= 1, '登录至少 1 次查询');
  });
});
