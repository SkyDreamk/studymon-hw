// tests/cache.test.mjs — 静态资源缓存策略（Worker 层）
// Harness 与 tests/access.test.mjs 同款：node:sqlite 内存库 + 迁移 + D1 适配层驱动
// Worker 的真实 fetch 处理函数；唯一区别是 ASSETS 按磁盘实际文件列表回显 200/404。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const M = await import(new URL('../src/index.js', import.meta.url));
const publicRoot = new URL('../public/', import.meta.url);

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory()
      ? listFiles(new URL(entry.name + '/', dir), name + '/')
      : ['/' + name];
  });
}
const existingFiles = new Set(listFiles(publicRoot));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  // 与测试环境一致的孩子名（种子在部署时改名，非迁移内容）
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
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async (req) => {
      const path = new URL(req.url).pathname;
      return new Response('x', {
        status: existingFiles.has(path) ? 200 : 404,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    } } },
    raw,
  };
}

async function request(path) {
  const { env } = makeEnv();
  return M.default.fetch(
    new Request('https://test.local' + path),
    env,
  );
}

test('hashed static assets are immutable', async () => {
  const paths = [
    `/static/app.${H}.js`,
    `/static/style.${H}.css`,
    `/static/img/p25.${H}.webp`,
    `/static/img/types/fire.${H}.webp`,
    `/static/icon-192.${H}.png`,
  ];
  for (const path of paths) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.equal(
      response.headers.get('Cache-Control'),
      'public, max-age=31536000, immutable',
      path,
    );
  }
});

test('fixed-name resources retain revalidation', async () => {
  for (const path of [
    '/static/sw.js',
    '/sw.js',
    '/manifest.json',
    '/static/manifest.json',
    '/static/audio/moves/manifest.json',
  ]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.equal(
      response.headers.get('Cache-Control'),
      'public, max-age=0, must-revalidate',
      path,
    );
  }
});

test('old app filename is absent and returns 404', async () => {
  assert.ok(!existingFiles.has('/static/app.js'));
  const response = await request('/static/app.js');
  assert.equal(response.status, 404);
});

test('anonymous HTML is no-store', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('HTML references and Worker cache callsites are updated', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('"/static/app.js"'));
  assert.ok(!html.includes('"/static/style.css"'));
  assert.ok(html.includes(`"/static/app.${H}.js"`));
  assert.ok(html.includes(`"/static/style.${H}.css"`));
  assert.ok(src.includes('HASHED_ASSET_RE'));
  assert.ok(src.includes('max-age=31536000, immutable'));
  assert.ok(!src.includes(
    'return pinStaticCache(await env.ASSETS.fetch(req));',
  ));
  assert.ok(!src.includes(
    'return pinStaticCache(await env.ASSETS.fetch(new Request(new URL(ASSET_ALIAS[path], url), req)));',
  ));
  assert.ok(src.includes(
    'return pinStaticCache(await env.ASSETS.fetch(req), path);',
  ));
  assert.ok(src.includes(
    'return pinStaticCache(await env.ASSETS.fetch(new Request(new URL(ASSET_ALIAS[path], url), req)), ASSET_ALIAS[path]);',
  ));
});
