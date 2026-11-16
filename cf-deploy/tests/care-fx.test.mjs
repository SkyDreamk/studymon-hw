// tests/care-fx.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const appJs = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const cssOrig = readFileSync(new URL('../public/static/style.css.orig', import.meta.url), 'utf8');
const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
  '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
  '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
  '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
  '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql',
  '0021_skill_levels.sql', '0022_warehouse.sql', '0023_care_qa_and_friendship.sql',
];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; INSERT OR REPLACE INTO settings(key, value) VALUES('care_enabled', '1');");
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
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>') } },
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
  const parentCookie = pLogin.cookie;
  await rawCall(env, '/api/parent/settings/update', {
    method: 'POST',
    cookie: parentCookie,
    body: {
      childPasswords: [
        { id: 1, password: '0000' },
        { id: 2, password: '0000' },
      ],
    },
  });
  const pwd = childId === 2 ? '0000' : '0000';
  const cLogin = await rawCall(env, '/api/child/login', {
    method: 'POST',
    body: { childId, password: pwd },
  });
  return cLogin.cookie;
}

describe('养成页演出扩展 (.care-fx)', () => {
  test('1. 前端语法检查 (node --check) 与接线断言：按钮传参、careWaitWithSkip、跳过保飘字、replayCare 两参数兼容', () => {
    const tmpFile = join(tmpdir(), `app-check-${process.pid}.js`);
    writeFileSync(tmpFile, appJs, 'utf8');
    try {
      execFileSync(process.execPath, ['--check', tmpFile]);
    } finally {
      try { unlinkSync(tmpFile); } catch (_) {}
    }

    assert.match(appJs, /doCareFeed\(button\.dataset\.careKey,\s*button\)/, '点击绑定应将 button 传给 doCareFeed');
    assert.match(appJs, /doCareBath\(button\.dataset\.careKey,\s*button\)/, '点击绑定应将 button 传给 doCareBath');
    assert.match(appJs, /await\s+careWaitWithSkip\(careReducedMotion\(\)\s*\?\s*200\s*:\s*750\)/, 'careSubmit 应调 careWaitWithSkip');
    assert.match(appJs, /if\s*\(kind\s*===\s*'feed'\s*&&\s*!impactTriggered\)\s*\{\s*triggerImpact\(\);/, 'B2：跳过时若未触发 impact 须立即执行 triggerImpact 保证飘字不丢');
    assert.match(appJs, /if\s*\(!opts\s*\|\|\s*!opts\.kind\)/, 'replayCare 两参数调用须走原有分支');
  });

  test('2. 后端 apiCareFeed（最爱 berry +5 XP 与重复拦截）及 apiCareBath 每日一次回归（带登录会话）', async () => {
    const { env, raw } = makeEnv();
    const cookie = await loginChild(env, 1);
    raw.prepare("INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(1, 'care:berry', 1, 1000), (1, 'care:bubble', 1, 1000)").run();

    const feed1 = await rawCall(env, '/api/care/feed', {
      method: 'POST', cookie, body: { childId: 1, food: 'berry' },
    });
    assert.equal(feed1.status, 200);
    assert.equal(feed1.json.ok, true);
    assert.equal(feed1.json.favorite, true);
    assert.equal(feed1.json.xpAwarded, 5);
    assert.equal(feed1.json.friendshipAwarded, 10);
    assert.equal(feed1.json.friendship, 10);

    const feed2 = await rawCall(env, '/api/care/feed', {
      method: 'POST', cookie, body: { childId: 1, food: 'apple' },
    });
    assert.equal(feed2.status, 400);
    assert.equal(feed2.json.code, 'ALREADY_DONE');

    const bath1 = await rawCall(env, '/api/care/bath', {
      method: 'POST', cookie, body: { childId: 1, bath: 'bubble' },
    });
    assert.equal(bath1.status, 200);
    assert.equal(bath1.json.ok, true);
    assert.equal(bath1.json.friendshipAwarded, 10);
    assert.equal(bath1.json.friendship, 20);

    const bath2 = await rawCall(env, '/api/care/bath', {
      method: 'POST', cookie, body: { childId: 1, bath: 'shower' },
    });
    assert.equal(bath2.status, 400);
    assert.equal(bath2.json.code, 'ALREADY_DONE');
  });
});

describe('养成页小图标格子 + 舞台留空间（2026-11-05 用户验收）', () => {
  test('1. 食物/洗澡格子用每项 emoji＋名字，最爱为角标爱心，不再用通用餐具/水滴图标和口味文案', () => {
    assert.match(appJs, /careFxEmojiFor\(kind, key\)/);
    assert.match(appJs, /class="care-grid care-grid-feed"/);
    assert.match(appJs, /class="care-grid care-grid-bath"/);
    assert.match(appJs, /<span class="care-name">/);
    assert.doesNotMatch(appJs, /ic\('droplets'\) : ic\('utensils'\)/);
  });
  test('2. 格子单行小图标：食物 6 列、洗澡 4 列；舞台加高、主宠放大', () => {
    assert.match(cssOrig, /\.care-grid-feed \{[^}]*repeat\(6, minmax\(0, 1fr\)\)/);
    assert.match(cssOrig, /\.care-grid-bath \{[^}]*repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(cssOrig, /\.care-hero \{[^}]*min-height: 220px/);
    assert.match(cssOrig, /\.care-hero img \{[^}]*width: 150px/);
    assert.match(cssOrig, /\.carefood \.fav \{[^}]*position: absolute/);
  });
});
