/* 测试调试面板单测：node --test tests/debug.test.mjs
 * 覆盖（2026-11-17 问题 2 简化后）：只留“等级”和“道具”两项。
 * 设等级自动换算累计经验（招式/技能按等级自动匹配，不再手动填）；
 * 道具用下拉＋数量发放（累加到当前数量，封顶）；旧字段（累计经验/球数/
 * 碎片/连击/招式勾选）后端不再接收、前端不再展示（旧缓存页面发来的旧字段直接忽略）。
 * 非测试环境 404、未登录拒绝、快照只读、整体校验不部分写入、孩子隔离、
 * 降级同步形态、空操作与不存在的孩子、重置清超级球、设等级无其他副作用。
 * Harness 照抄 tests/oak.test.mjs（node:sqlite 内存库＋DatabaseSync wrap＋call＋parentCookie）；
 * MIGRATIONS 用 care-api.test.mjs 同一份清单（无新迁移）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql'];

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

describe('调试等级', () => {
  test('只设等级 30 自动换算累计经验 17400', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, level: 30 });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.level, 30);
    assert.equal(row().total_xp, 17400);
  });
  test('等级 0 与 31 越界且不写库', async () => {
    const pc = await parentCookie();
    for (const level of [0, 31]) {
      const before = row();
      const r = await setDebug(pc, { childId: 1, level });
      assert.equal(r.status, 400, `level=${level}`);
      assert.match(r.j.error, /等级需为 1–30/);
      assert.deepEqual(row(), before);
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
  test('出厂两孩快照只含等级与道具字段，纯读不写库', async () => {
    const pc = await parentCookie();
    const before = raw.prepare('SELECT * FROM children ORDER BY id').all();
    const r = await call('/api/parent/debug-state', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.children.length, 2);
    for (const c of r.j.children) {
      for (const key of ['id', 'name', 'lineLabel', 'level', 'balls',
        'ballsSuper', 'ballsHyper', 'ballsMaster', 'fragments']) {
        assert.ok(Object.hasOwn(c, key), key);
      }
      // 旧字段不再返回：累计经验/招式/技能等级/连击/答对总数
      for (const key of ['totalXp', 'xpIntoLevel', 'xpForLevelSpan', 'xpToNext',
        'formIdx', 'quizCorrectTotal', 'streak', 'moves', 'skillLevels', 'line']) {
        assert.ok(!Object.hasOwn(c, key), `不应再返回 ${key}`);
      }
      assert.equal(c.level, 1);
      assert.equal(c.balls, 3);
      for (const key of ['ballsSuper', 'ballsHyper', 'ballsMaster', 'fragments']) assert.equal(c[key], 0);
    }
    assert.deepEqual(raw.prepare('SELECT * FROM children ORDER BY id').all(), before);
  });
  test('设等级同步经验和形态', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, level: 5 });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.level, 5);
    assert.equal(row().total_xp, 400);
    assert.deepEqual(forms(), ['form:pikachu:0', 'form:pikachu:1']);
  });
  test('越界和整体校验不部分写入', async () => {
    const pc = await parentCookie();
    for (const body of [{ level: 0 }, { level: 31 },
      { item: '不存在', qty: 1 }, { item: 'balls', qty: 0 },
      { item: 'balls', qty: 1000 }, { item: 'balls', qty: -1 },
      { item: 'balls' }, { qty: 5 }, { level: 5, item: 'balls', qty: 0 }]) {
      const before = row();
      assert.equal((await setDebug(pc, { childId: 1, ...body })).status, 400, JSON.stringify(body));
      assert.deepEqual(row(), before);
    }
    const before = row();
    assert.equal((await setDebug(pc, { childId: 1, level: 5, item: '不存在', qty: 1 })).status, 400);
    assert.deepEqual(row(), before);
  });
  test('发放道具累加到当前数量，五种道具各归其位', async () => {
    const pc = await parentCookie();
    // 出厂精灵球 3 颗，发放 10 颗 → 13；其余从 0 起发。
    assert.equal((await setDebug(pc, { childId: 1, item: 'balls', qty: 10 })).status, 200);
    assert.equal((await setDebug(pc, { childId: 1, item: 'ballsSuper', qty: 2 })).status, 200);
    assert.equal((await setDebug(pc, { childId: 1, item: 'ballsHyper', qty: 1 })).status, 200);
    assert.equal((await setDebug(pc, { childId: 1, item: 'ballsMaster', qty: 1 })).status, 200);
    const c = row();
    assert.equal(c.balls, 13);
    assert.equal(c.balls_super, 2);
    assert.equal(c.balls_hyper, 1);
    assert.equal(c.balls_master, 1);
    // 快照同步反映发放后数量
    const st = await call('/api/parent/debug-state', { cookie: pc });
    const c1 = st.j.children.find((x) => x.id === 1);
    assert.equal(c1.balls, 13);
    assert.equal(c1.ballsSuper, 2);
  });
  test('发放碎片维持答对总数不变量（多发 N 碎片即视同多答对 5N 题）', async () => {
    const pc = await parentCookie();
    assert.equal((await setDebug(pc, { childId: 1, item: 'fragments', qty: 3 })).status, 200);
    let c = row();
    assert.equal(c.quiz_fragments, 3);
    assert.equal(c.quiz_correct_total, 15);
    // 再发 2 枚：累加到 5，答对总数 25，不变量仍成立
    assert.equal((await setDebug(pc, { childId: 1, item: 'fragments', qty: 2 })).status, 200);
    c = row();
    assert.equal(c.quiz_fragments, 5);
    assert.equal(c.quiz_correct_total, 25);
    assert.equal(Math.floor(c.quiz_correct_total / 5), c.quiz_fragments);
  });
  test('发放封顶到各道具上限（球 99、碎片 999）', async () => {
    const pc = await parentCookie();
    raw.exec("UPDATE children SET balls=95, quiz_fragments=998, quiz_correct_total=4990 WHERE id=1;");
    assert.equal((await setDebug(pc, { childId: 1, item: 'balls', qty: 10 })).status, 200);
    assert.equal(row().balls, 99);
    assert.equal((await setDebug(pc, { childId: 1, item: 'fragments', qty: 10 })).status, 200);
    const c = row();
    assert.equal(c.quiz_fragments, 999);
    assert.equal(c.quiz_correct_total, 999 * 5);
  });
  test('等级与发放可一次同改', async () => {
    const pc = await parentCookie();
    const r = await setDebug(pc, { childId: 1, level: 5, item: 'ballsSuper', qty: 4 });
    assert.equal(r.status, 200);
    assert.equal(r.j.child.level, 5);
    assert.equal(row().total_xp, 400);
    assert.equal(row().balls_super, 4);
  });
  test('旧字段忽略不处理（旧缓存页面照常能改等级）', async () => {
    const pc = await parentCookie();
    const before = row();
    const r = await setDebug(pc, {
      childId: 1, level: 5,
      totalXp: 999, balls: 99, ballsSuper: 99, ballsHyper: 99, ballsMaster: 99,
      fragments: 99, streak: 99, unlockedMoves: ['十万伏特'],
    });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.child.level, 5);
    assert.equal(row().total_xp, 400);
    // 旧字段一律不生效：球数/碎片/连击/解锁招保持原值
    assert.equal(row().balls, before.balls);
    assert.equal(row().balls_super, before.balls_super);
    assert.equal(row().quiz_fragments, before.quiz_fragments);
    assert.equal(row().streak, before.streak);
    assert.deepEqual(JSON.parse(row().unlocked_moves), JSON.parse(before.unlocked_moves));
  });
  test('孩子隔离', async () => {
    const pc = await parentCookie();
    const before = row(2);
    await setDebug(pc, { childId: 1, level: 5, item: 'balls', qty: 10 });
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
    await setDebug(pc, { childId: 1, level: 5 });
    await setDebug(pc, { childId: 1, item: 'balls', qty: 7 });
    await setDebug(pc, { childId: 1, item: 'ballsSuper', qty: 5 });
    await setDebug(pc, { childId: 1, item: 'fragments', qty: 3 });
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
