/* 大木博士跟读奖励单测：node --test tests/oak-draw.test.mjs
 * 两档：没到 4 句 5 星只有听完的 10 XP；6 句里至少 4 句 5 星（每句 pron ≥85，按当日最好成绩）时
 * 在 10 XP 之外再抽一次，每天一次。奖池（2026-11-07 转盘升级扩池，权重和 100）：
 * 经验+10 20%、普通球 10%、care 食物 6 种各 5%、care 洗澡 4 种各 3%、
 * 伤药 6%/好伤药 4%/树果汁 3%/美味之水 3%、雷火水叶四石各 3%。
 * 抽奖服务端做、每天一次、幂等。点评接口用 mock 讯飞分数，真实讯飞调用 0 次。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0018_oak_draw.sql', '0017_diagnosis.sql', '0019_evo_items.sql', '0020_sync.sql', '0025_oak_draw_item.sql'];

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
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) },
      IFLYTEK_APPID: 'test-appid', IFLYTEK_API_KEY: 'test-apikey-fedcba9876543210', IFLYTEK_API_SECRET: 'test-secret-dummy-fedcba9876543210' },
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

async function callRaw(path, { method = 'POST', body, headers = {}, cookie } = {}) {
  const req = new Request('https://test.local' + path, { method, headers, body });
  if (cookie) req.headers.set('Cookie', cookie);
  const res = await M.default.fetch(req, env);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

function mkWavBody(totalLen = 2000) {
  const buf = Buffer.alloc(totalLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + (totalLen - 44), 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(16000, 24); buf.writeUInt32LE(32000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(totalLen - 44, 40);
  return buf;
}

/* mock 讯飞点评：返回指定 pron 的成功评分（首帧后自动回最终 XML） */
async function withIflytekScores(pron, fn) {
  const RealWS = globalThis.WebSocket;
  let calls = 0;
  const xml = `<?xml version="1.0" encoding="utf-8" ?><FinalResult><ret value="0"/>`
    + `<read_sentence content="x" total_score="${pron}" accuracy_score="${pron}" fluency_score="${pron}" integrity_score="100" standard_score="${pron}"></read_sentence></FinalResult>`;
  class FakeWS {
    constructor(url) { this.url = url; this.sent = []; this.listeners = {}; calls++; }
    addEventListener(t, fn2) {
      (this.listeners[t] ||= []).push(fn2);
      if (t === 'open') setTimeout(() => this.emit('open', {}), 0);
    }
    send(s) {
      this.sent.push(s);
      let f;
      try { f = JSON.parse(s); } catch (_) { return; }
      if (f.business && f.business.cmd === 'auw' && f.business.aus === 4) {
        setTimeout(() => this.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xml).toString('base64') } }) }), 0);
      }
    }
    close() {}
    emit(t, ev) { for (const fn2 of this.listeners[t] || []) fn2(ev); }
  }
  globalThis.WebSocket = FakeWS;
  try {
    const r = await fn();
    assert.equal(calls, 1);
    return r;
  } finally { globalThis.WebSocket = RealWS; }
}

async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}

async function assess(cookie, childId, refText, pron) {
  return withIflytekScores(pron, async () => callRaw(`/api/oak/assess?child_id=${childId}`, {
    body: mkWavBody(2000),
    headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(refText) },
    cookie,
  }));
}

async function today(cookie, childId) {
  const r = await call(`/api/oak/today?child_id=${childId}`, { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}

async function listen(cookie, childId, questionId) {
  return call('/api/oak/listen', { method: 'POST', cookie, body: { child_id: childId, question_id: questionId } });
}

function childState(id) {
  return raw.prepare('SELECT total_xp, balls, balls_super FROM children WHERE id=?').get(id);
}
function draws() { return raw.prepare('SELECT * FROM oak_draws ORDER BY created_epoch').all(); }
function assessments() { return raw.prepare('SELECT * FROM oak_assessments ORDER BY question_id').all(); }
function ballGrants() { return raw.prepare('SELECT * FROM ball_grants ORDER BY id').all(); }

describe('跟读奖励：星级与掷骰（纯函数）', () => {
  test('oakStarsFromPron 阈值与前端同口径', () => {
    assert.equal(M.oakStarsFromPron(95), 5);
    assert.equal(M.oakStarsFromPron(85), 5);
    assert.equal(M.oakStarsFromPron(84.9), 4);
    assert.equal(M.oakStarsFromPron(75), 4);
    assert.equal(M.oakStarsFromPron(74.9), 3);
    assert.equal(M.oakStarsFromPron(60), 3);
    assert.equal(M.oakStarsFromPron(59.9), 2);
    assert.equal(M.oakStarsFromPron(40), 2);
    assert.equal(M.oakStarsFromPron(39.9), 1);
    assert.equal(M.oakStarsFromPron(null), 1);
    assert.equal(M.oakStarsFromPron(NaN), 1);
  });

  test('oakRollDraw：新奖池加权（权重和 100）：经验 20 / 球 10 / care 食物各 5 / 洗澡各 3 / 伤药 / 活力碎片 6 / 高级球 6（2026-11-07 起普通转盘不出进化石）', () => {
    assert.equal(M.OAK_WHEEL_POOL.reduce((a, [, w]) => a + w, 0), 100);
    assert.deepEqual(M.oakRollDraw(() => 0), { prize: 'xp', prizeKey: 'xp', xpAwarded: 10, ballsAwarded: 0 });
    assert.deepEqual(M.oakRollDraw(() => 0.1999), { prize: 'xp', prizeKey: 'xp', xpAwarded: 10, ballsAwarded: 0 });
    assert.deepEqual(M.oakRollDraw(() => 0.2), { prize: 'ball', prizeKey: 'ball', xpAwarded: 0, ballsAwarded: 1 });
    assert.deepEqual(M.oakRollDraw(() => 0.2999), { prize: 'ball', prizeKey: 'ball', xpAwarded: 0, ballsAwarded: 1 });
    assert.equal(M.oakRollDraw(() => 0.3).prizeKey, 'care:apple');
    assert.equal(M.oakRollDraw(() => 0.62).prizeKey, 'care:bubble');
    assert.equal(M.oakRollDraw(() => 0.75).prizeKey, 'medicine:potion');
    assert.equal(M.oakRollDraw(() => 0.89).prizeKey, 'medicine:revive');
    assert.equal(M.oakRollDraw(() => 0.99).prizeKey, 'ball:hyper');
    assert.equal(M.OAK_DRAW_XP, 10);
    assert.equal(M.OAK_FIVE_STAR_PRON, 85);
    assert.equal(M.OAK_DRAW_MIN_FIVE_STAR, 4);
  });
});

describe('跟读奖励：触发与发放（HTTP＋mock 讯飞）', () => {
  test('点评 90 分记 5 星、五星数 1，不抽奖', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const r = await assess(cookie, 1, t.sentences[0].en, 90);
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.stars, 5);
    assert.equal(r.j.fiveStarCount, 1);
    assert.equal(r.j.fiveStarTotal, 6);
    assert.equal(r.j.draw, null);
    const rows = assessments();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].best_pron, 90);
    assert.equal(rows[0].attempts, 1);
    assert.equal(draws().length, 0);
  });

  test('3 句 5 星＋3 句 4 星不抽奖', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    for (let i = 0; i < 3; i++) {
      const r = await assess(cookie, 1, t.sentences[i].en, 90);
      assert.equal(r.j.stars, 5);
      assert.equal(r.j.draw, null);
    }
    let last;
    for (let i = 3; i < 6; i++) {
      last = await assess(cookie, 1, t.sentences[i].en, 75);
      assert.equal(last.j.stars, 4);
      assert.equal(last.j.draw, null);
    }
    assert.equal(last.j.fiveStarCount, 3);
    assert.equal(last.j.fiveStarTotal, 6);
    assert.equal(last.j.draw, null);
    assert.equal(draws().length, 0);
    assert.equal(childState(1).total_xp, 0);
  });

  test('4 句 5 星够格但不发奖：6 句读完那一刻才抽', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    await withRandom(0.1, async () => {
      // 前 4 句 5 星：已够格（4 句 5 星），但只读了 4 句、未读完 6 句，不抽
      for (let i = 0; i < 4; i++) {
        const r = await assess(cookie, 1, t.sentences[i].en, 90);
        assert.equal(r.j.stars, 5);
        assert.equal(r.j.fiveStarCount, i + 1);
        assert.equal(r.j.draw, null);
      }
      assert.equal(draws().length, 0);
      assert.equal(childState(1).total_xp, before.total_xp);
      // 第 5 句 4 星：5 星仍 4 句，已读 5 句，仍未读完，不抽
      const fifth = await assess(cookie, 1, t.sentences[4].en, 75);
      assert.equal(fifth.j.stars, 4);
      assert.equal(fifth.j.fiveStarCount, 4);
      assert.equal(fifth.j.draw, null);
      assert.equal(draws().length, 0);
      // 第 6 句 4 星：6 句都读完，5 星 4 句已够格，抽
      const sixth = await assess(cookie, 1, t.sentences[5].en, 75);
      assert.equal(sixth.j.stars, 4);
      assert.equal(sixth.j.fiveStarCount, 4);
      assert.deepEqual(sixth.j.draw, { prize: 'xp', prizeKey: 'xp', prizeName: '经验+10', prizeEmoji: '⭐', xpAwarded: 10, ballsAwarded: 0, justDrawn: true, wheel: M.oakWheelFor('xp') });
      assert.equal(draws().length, 1);
      assert.equal(childState(1).total_xp, before.total_xp + 10);
    });
  });

  test('6 句 5 星抽中经验：+10 XP，每天只一注', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    let last;
    await withRandom(0.1, async () => {
      for (let i = 0; i < 6; i++) {
        last = await assess(cookie, 1, t.sentences[i].en, 90);
        assert.equal(last.j.stars, 5);
        if (i === 5) {
          assert.deepEqual(last.j.draw, { prize: 'xp', prizeKey: 'xp', prizeName: '经验+10', prizeEmoji: '⭐', xpAwarded: 10, ballsAwarded: 0, justDrawn: true, wheel: M.oakWheelFor('xp') });
        }
      }
    });
    assert.equal(last.j.fiveStarCount, 6);
    assert.equal(childState(1).total_xp, before.total_xp + 10);
    const ds = draws();
    assert.equal(ds.length, 1);
    assert.equal(ds[0].prize, 'xp');
    assert.equal(ds[0].xp_awarded, 10);
    assert.equal(ds[0].balls_awarded, 0);
    assert.equal(ballGrants().length, 0);
  });

  test('6 句 5 星抽中普通球：球 +1、有发球审计行', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    let last;
    await withRandom(0.25, async () => {
      for (let i = 0; i < 6; i++) {
        last = await assess(cookie, 1, t.sentences[i].en, 92);
        if (i === 5) {
          assert.deepEqual(last.j.draw, { prize: 'ball', prizeKey: 'ball', prizeName: '普通精灵球', prizeEmoji: '🔴', xpAwarded: 0, ballsAwarded: 1, justDrawn: true, wheel: M.oakWheelFor('ball') });
        }
      }
    });
    assert.equal(childState(1).total_xp, before.total_xp);
    assert.equal(childState(1).balls, before.balls + 1);
    const gs = ballGrants();
    assert.equal(gs.length, 1);
    assert.equal(gs[0].kind, 'normal');
    assert.equal(gs[0].qty, 1);
    assert.equal(gs[0].checkin_id, null);
    assert.equal(draws().length, 1);
  });

  test('幂等：抽奖后重评不重复发', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    await withRandom(0.1, async () => {
      for (let i = 0; i < 6; i++) await assess(cookie, 1, t.sentences[i].en, 90);
    });
    assert.equal(draws().length, 1);
    const mid = childState(1);
    const again = await assess(cookie, 1, t.sentences[0].en, 95);
    assert.equal(again.j.fiveStarCount, 6);
    assert.deepEqual(again.j.draw, { prize: 'xp', prizeKey: 'xp', prizeName: '经验+10', prizeEmoji: '⭐', xpAwarded: 10, ballsAwarded: 0, justDrawn: false, wheel: M.oakWheelFor('xp') });
    assert.equal(draws().length, 1);
    assert.deepEqual(childState(1), mid);
  });

  test('当日最好成绩：先 60 分再 90 分，该句算 5 星', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const low = await assess(cookie, 1, t.sentences[0].en, 60);
    assert.equal(low.j.stars, 3);
    assert.equal(low.j.fiveStarCount, 0);
    const high = await assess(cookie, 1, t.sentences[0].en, 90);
    assert.equal(high.j.stars, 5);
    assert.equal(high.j.fiveStarCount, 1);
    const rows = assessments();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].best_pron, 90);
    assert.equal(rows[0].attempts, 2);
  });

  test('today 返回五星进度与抽奖态', async () => {
    const cookie = await parentCookie();
    const t0 = await today(cookie, 1);
    assert.equal(t0.fiveStarCount, 0);
    assert.equal(t0.fiveStarTotal, 6);
    assert.equal(t0.draw, null);
    for (let i = 0; i < 3; i++) await assess(cookie, 1, t0.sentences[i].en, 90);
    const t1 = await today(cookie, 1);
    assert.equal(t1.fiveStarCount, 3);
    assert.equal(t1.fiveStarTotal, 6);
    assert.equal(t1.draw, null);
    await withRandom(0.1, async () => {
      await assess(cookie, 1, t0.sentences[3].en, 90);
      await assess(cookie, 1, t0.sentences[4].en, 90);
    });
    const t4 = await today(cookie, 1);
    assert.equal(t4.fiveStarCount, 5);
    assert.equal(t4.draw, null);
    await withRandom(0.1, async () => {
      await assess(cookie, 1, t0.sentences[5].en, 90);
    });
    const t2 = await today(cookie, 1);
    assert.equal(t2.fiveStarCount, 6);
    assert.deepEqual(t2.draw, { prize: 'xp', prizeKey: 'xp', prizeName: '经验+10', prizeEmoji: '⭐', xpAwarded: 10, ballsAwarded: 0, wheel: M.oakWheelFor('xp') });
  });

  test('抽奖与听完奖励叠加：抽中经验后再听完 6 句，共 +20 XP', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    await withRandom(0.1, async () => {
      for (let i = 0; i < 6; i++) await assess(cookie, 1, t.sentences[i].en, 90);
    });
    assert.equal(childState(1).total_xp, before.total_xp + 10);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM quiz_attempts').get().n, 0);
    for (const s of t.sentences) {
      const r = await listen(cookie, 1, s.id);
      assert.equal(r.status, 200);
      assert.equal(r.j.ok, true);
    }
    assert.equal(childState(1).total_xp, before.total_xp + 20);
    const after = await today(cookie, 1);
    assert.equal(after.listenedCount, 6);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fiveStarCount, 6);
    assert.deepEqual(after.draw, { prize: 'xp', prizeKey: 'xp', prizeName: '经验+10', prizeEmoji: '⭐', xpAwarded: 10, ballsAwarded: 0, wheel: M.oakWheelFor('xp') });
  });
});
