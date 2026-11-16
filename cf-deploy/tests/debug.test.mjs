/* 测试调试面板单测：node --test tests/debug.test.mjs
 * 覆盖：debugMovesFor 纯函数、非测试环境 404、未登录拒绝、快照只读、
 * 设等级/经验/技能/指标、整体校验不部分写入、孩子隔离、降级同步形态、
 * 空操作与不存在的孩子、重置清超级球、设等级无其他副作用。
 * Harness 照抄 tests/oak.test.mjs（node:sqlite 内存库＋DatabaseSync wrap＋call＋parentCookie）；
 * MIGRATIONS 用 care-api.test.mjs 同一份清单（无新迁移）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
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
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

const row = (id = 1) => raw.prepare('SELECT * FROM children WHERE id=?').get(id);
const forms = () => raw.prepare(
  "SELECT entry_key FROM pokedex WHERE child_id=1 AND entry_key LIKE 'form:pikachu:%' ORDER BY entry_key",
).all().map((r) => r.entry_key);
const setDebug = (pc, body) => call('/api/parent/debug-set', { method: 'POST', cookie: pc, body });

describe('调试累计经验满级上限', () => {
  test('累计经验 17401 越界且不写库', async () => {
    const pc = await parentCookie();
    const before = row();
    const r = await setDebug(pc, { childId: 1, totalXp: 17401 });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /0–17400/);
    assert.deepEqual(row(), before);
  });
  test('只设等级 30 自动换算累计经验 17400', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, level: 30 });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.level, 30);
    assert.equal(r.j.child.totalXp, 17400);
    assert.equal(row().total_xp, 17400);
  });
  test('等级 30 与累计经验 17400 一致，可保存', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, level: 30, totalXp: 17400 });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.totalXp, 17400);
    assert.equal(row().total_xp, 17400);
  });
  test('等级 29 与累计经验 17400 不一致且不写库', async () => {
    const pc = await parentCookie();
    const before = row();
    const r = await setDebug(pc, { childId: 1, level: 29, totalXp: 17400 });
    assert.equal(r.status, 400);
    assert.match(r.j.error, /等级与经验不一致/);
    assert.deepEqual(row(), before);
  });
});

describe('debugMovesFor', () => {
  test('Lv.1 全部未学会', () => {
    const moves = M.debugMovesFor('pikachu', 1);
    assert.equal(moves.length, 10);
    for (const m of moves) {
      assert.equal(m.learned, false);
      assert.equal(m.early, false);
    }
  });
  test('Lv.5 随等级学会，已解锁且 learned 优先', () => {
    const moves = M.debugMovesFor('pikachu', 5, ['十万伏特', '电光一闪']);
    for (const m of moves) {
      assert.equal(m.learned, m.level <= 5);
      assert.equal(m.early, m.name === '十万伏特');
    }
    for (const m of M.debugMovesFor('pikachu', 5)) {
      assert.equal(m.learned, m.level <= 5);
      assert.equal(m.early, false);
    }
  });
});

describe('调试路由权限', () => {
  test('非测试环境一律 404（含已登录家长会话）', async () => {
    const savedEnv = env;
    env = { ...env };
    delete env.TEST_MODE;
    try {
      const pc = await parentCookie();
      for (const [path, method, body] of [
        ['/api/parent/debug-state', 'GET', undefined],
        ['/api/parent/debug-set', 'POST', { childId: 1, level: 5 }],
        ['/api/parent/debug-time', 'POST', { dayOffset: 0 }],
      ]) {
        const r = await call(path, { method, cookie: pc, body });
        assert.equal(r.status, 404, path);
      }
    } finally {
      env = savedEnv;
    }
  });
  test('测试环境未登录被拒绝，与 debug-time 一致', async () => {
    const a = await call('/api/parent/debug-state');
    const b = await call('/api/parent/debug-time', { method: 'POST', body: { dayOffset: 0 } });
    assert.notEqual(a.status, 200);
    assert.equal(a.status, b.status);
  });
});

describe('调试读写', () => {
  test('出厂两孩快照字段齐全，纯读不写库', async () => {
    const pc = await parentCookie();
    const before = raw.prepare('SELECT * FROM children ORDER BY id').all();
    const r = await call('/api/parent/debug-state', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.children.length, 2);
    for (const c of r.j.children) {
      for (const key of ['id', 'name', 'line', 'lineLabel', 'level', 'totalXp',
        'xpIntoLevel', 'xpForLevelSpan', 'xpToNext', 'formIdx', 'balls',
        'ballsSuper', 'fragments', 'quizCorrectTotal', 'streak', 'moves']) {
        assert.ok(Object.hasOwn(c, key), key);
      }
      assert.equal(c.level, 1);
      assert.equal(c.totalXp, 0);
      assert.equal(c.balls, 3);
      for (const key of ['ballsSuper', 'fragments', 'quizCorrectTotal', 'streak']) assert.equal(c[key], 0);
      assert.equal(c.moves.length, 10);
    }
    assert.deepEqual(raw.prepare('SELECT * FROM children ORDER BY id').all(), before);
  });
  test('设等级同步经验和形态', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, level: 5 });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.level, 5);
    assert.equal(r.j.child.formIdx, 1);
    assert.equal(r.j.child.totalXp, 400);
    assert.equal(row().total_xp, 400);
    assert.deepEqual(forms(), ['form:pikachu:0', 'form:pikachu:1']);
  });
  test('累计经验推导等级与进度', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, totalXp: 1000 });
    assert.equal(r.status, 200);
    assert.equal(row().total_xp, 1000);
    assert.equal(r.j.child.level, 7);
    assert.equal(r.j.child.xpIntoLevel, 1000 - M.xpForLevel(7));
    assert.equal(r.j.child.xpToNext, M.xpForLevel(8) - 1000);
    assert.equal(r.j.child.xpForLevelSpan, M.xpForLevel(8) - M.xpForLevel(7));
  });
  test('等级经验不一致不写库', async () => {
    const pc = await parentCookie();
    const before = row();
    assert.equal((await setDebug(pc, { childId: 1, level: 5, totalXp: 401 })).status, 400);
    assert.deepEqual(row(), before);
  });
  test('越界和整体校验不部分写入', async () => {
    const pc = await parentCookie();
    for (const body of [{ level: 0 }, { level: 31 }, { totalXp: -1 },
      { totalXp: 1000000 }, { balls: 100 }, { ballsSuper: 100 },
      { fragments: 1000 }, { streak: 366 }]) {
      const before = row();
      assert.equal((await setDebug(pc, { childId: 1, ...body, unlockedMoves: ['十万伏特'] })).status, 400);
      assert.deepEqual(row(), before);
    }
    const before = row();
    assert.equal((await setDebug(pc, { childId: 1, level: 5, balls: 100 })).status, 400);
    assert.deepEqual(row(), before);
  });
  test('技能只保存尚未学会的招，去重', async () => {
    const pc = await parentCookie();
    await setDebug(pc, { childId: 1, level: 5 });
    const r = await setDebug(pc, { childId: 1, unlockedMoves: ['十万伏特', '电光一闪', '十万伏特'] });
    assert.equal(r.status, 200);
    const thunder = r.j.child.moves.find((m) => m.name === '十万伏特');
    const quick = r.j.child.moves.find((m) => m.name === '电光一闪');
    assert.equal(thunder.early, true);
    assert.equal(thunder.learned, false);
    assert.equal(quick.learned, true);
    assert.equal(quick.early, false);
    assert.deepEqual(JSON.parse(row().unlocked_moves), ['十万伏特']);
  });
  test('非法招式不写库', async () => {
    const pc = await parentCookie();
    await setDebug(pc, { childId: 1, unlockedMoves: ['十万伏特'] });
    const before = row();
    assert.equal((await setDebug(pc, { childId: 1, balls: 10, unlockedMoves: ['不存在的招'] })).status, 400);
    assert.deepEqual(row(), before);
  });
  test('指标和碎片计数不变量', async () => {
    const pc = await parentCookie();
    assert.equal((await setDebug(pc, { childId: 1, balls: 10, ballsSuper: 2, fragments: 3, streak: 7 })).status, 200);
    const c = row();
    assert.equal(c.balls, 10);
    assert.equal(c.balls_super, 2);
    assert.equal(c.quiz_fragments, 3);
    assert.equal(c.quiz_correct_total, 15);
    assert.equal(c.streak, 7);
  });
  test('孩子隔离', async () => {
    const pc = await parentCookie();
    const before = row(2);
    await setDebug(pc, { childId: 1, level: 5, balls: 10, unlockedMoves: ['十万伏特'] });
    assert.deepEqual(row(2), before);
  });
  test('降级删除当前线高阶形态，不动其他图鉴', async () => {
    const pc = await parentCookie();
    await setDebug(pc, { childId: 1, level: 12 });
    assert.ok(forms().includes('form:pikachu:2'));
    raw.prepare('INSERT OR IGNORE INTO pokedex(child_id,entry_key,unlocked_at) VALUES(?,?,?)')
      .run(1, 'form:charmander:2', '2026-10-25');
    await setDebug(pc, { childId: 1, level: 5 });
    assert.equal(row().total_xp, 400);
    assert.deepEqual(forms(), ['form:pikachu:0', 'form:pikachu:1']);
    assert.ok(raw.prepare("SELECT * FROM pokedex WHERE child_id=1 AND entry_key='form:charmander:2'").get());
  });
  test('空操作与不存在的孩子', async () => {
    const pc = await parentCookie();
    const before = row();
    const r = await setDebug(pc, { childId: 1 });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, '没有要改的项');
    assert.equal((await setDebug(pc, { childId: 99, level: 5 })).status, 404);
    assert.deepEqual(row(), before);
  });
  test('重置清超级球并恢复出厂数值', async () => {
    const pc = await parentCookie();
    await setDebug(pc, { childId: 1, level: 5, balls: 10, ballsSuper: 5, fragments: 3, streak: 7, unlockedMoves: ['十万伏特'] });
    const r = await call('/api/parent/debug-reset', { method: 'POST', cookie: pc, body: { confirm: true } });
    assert.equal(r.status, 200);
    const c = row();
    assert.equal(c.balls, 3);
    for (const key of ['balls_super', 'total_xp', 'streak', 'quiz_fragments', 'quiz_correct_total']) assert.equal(c[key], 0);
    assert.deepEqual(JSON.parse(c.unlocked_moves), []);
  });
  test('设等级不产生问答、打卡和通知', async () => {
    const pc = await parentCookie();
    const before = row();
    const notices = raw.prepare('SELECT COUNT(*) AS n FROM child_notices').get().n;
    await setDebug(pc, { childId: 1, level: 5 });
    assert.equal(row().total_xp, 400);
    for (const table of ['quiz_attempts', 'checkins']) {
      assert.equal(raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
    }
    assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM child_notices').get().n, notices);
    for (const key of ['titles', 'stickers', 'last_checkin_date', 'pwd_hash', 'name', 'grade_label', 'line', 'streak']) {
      assert.equal(row()[key], before[key]);
    }
  });
});
