/* 大木博士跟读奖励单测：node --test tests/oak-draw.test.mjs
 * 两档：没到 4 句 5 星只有听完的 10 XP；6 句里至少 4 句 5 星（每句 pron ≥85，按当日最好成绩）
 * 且 6 句全 ≥75（每句 pron ≥75）时，在 10 XP 之外再发 1 次普通转盘机会，每天一次。
 * 奖池（2026-11-07 转盘升级扩池，权重和 100）：经验+10 20%、普通球 10%、care 食物 6 种各 5%、
 * care 洗澡 4 种各 3%、伤药 6%/好伤药 4%/树果汁 3%/美味之水 3%、活力碎片 6%、高级球 6%。
 * 2026-11-17 用户定：够格不再当场掷骰、不再记 oak_draws 行，只发机会（oak_wheel_chances，
 * 迁移 0040），孩子去大木博士之家 → 转盘中心扭一下才掷骰、才发奖。
 * 抽奖服务端做、每天一次、幂等。点评接口用 mock 讯飞分数，真实讯飞调用 0 次。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0018_oak_draw.sql', '0017_diagnosis.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0040_oak_wheel_chances.sql', '0043_pet_instances_ability.sql'];

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
      IFLYTEK_APPID: 'test-appid', IFLYTEK_API_KEY: 'test-apikey-0123456789abcdef', IFLYTEK_API_SECRET: 'test-secret-dummy-0123456789abcdef' },
    raw,
  };
}

let env, raw;
beforeEach(async () => {
  ({ env, raw } = makeEnv());
  // 夹具孩子密码（与 care-wheel.test 同一做法）：家长登录后经设置接口下发，转盘 spin 用孩子会话
  const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(parent.status, 200);
  const set = await call('/api/parent/settings/update', {
    method: 'POST', cookie: parent.cookie,
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(set.j.ok, true);
});

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

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200, `child ${id} 登录应成功：${JSON.stringify(r.j)}`);
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

async function backpackChances(childId, cookie) {
  const r = await call('/api/evo/backpack?childId=' + childId, { cookie });
  assert.equal(r.status, 200, `child ${childId} 背包应可读：${JSON.stringify(r.j)}`);
  return { wheel: r.j.wheelChances, rare: r.j.rareWheelChances, care: r.j.careWheelChances, oak: r.j.oakWheelChances };
}

async function spin(childId, cookie) {
  return call('/api/oak-wheel/spin', { method: 'POST', body: { childId }, cookie });
}

function childState(id) {
  return raw.prepare('SELECT total_xp, balls, balls_super FROM children WHERE id=?').get(id);
}
function oakChances(childId = 1) { return raw.prepare('SELECT * FROM oak_wheel_chances WHERE child_id=? ORDER BY id').all(childId); }
function assessments() { return raw.prepare('SELECT * FROM oak_assessments ORDER BY question_id').all(); }
function ballGrants() { return raw.prepare('SELECT * FROM ball_grants ORDER BY id').all(); }
function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}

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

describe('跟读奖励：触发与发机会（HTTP＋mock 讯飞）', () => {
  test('点评 90 分记 5 星、五星数 1，不发机会', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const r = await assess(cookie, 1, t.sentences[0].en, 90);
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.stars, 5);
    assert.equal(r.j.fiveStarCount, 1);
    assert.equal(r.j.fiveStarTotal, 6);
    assert.equal(r.j.drawGranted, false);
    assert.equal(r.j.justGranted, false);
    const rows = assessments();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].best_pron, 90);
    assert.equal(rows[0].attempts, 1);
    assert.equal(oakChances().length, 0);
  });

  test('3 句 5 星＋3 句 4 星不发机会', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    for (let i = 0; i < 3; i++) {
      const r = await assess(cookie, 1, t.sentences[i].en, 90);
      assert.equal(r.j.stars, 5);
      assert.equal(r.j.drawGranted, false);
    }
    let last;
    for (let i = 3; i < 6; i++) {
      last = await assess(cookie, 1, t.sentences[i].en, 75);
      assert.equal(last.j.stars, 4);
      assert.equal(last.j.drawGranted, false);
    }
    assert.equal(last.j.fiveStarCount, 3);
    assert.equal(last.j.fiveStarTotal, 6);
    assert.equal(last.j.drawGranted, false);
    assert.equal(oakChances().length, 0);
    assert.equal(childState(1).total_xp, 0);
  });

  test('4 句 5 星够格但不发机会：6 句读完那一刻才发', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    // 前 4 句 5 星：已够格（4 句 5 星），但只读了 4 句、未读完 6 句，不发
    for (let i = 0; i < 4; i++) {
      const r = await assess(cookie, 1, t.sentences[i].en, 90);
      assert.equal(r.j.stars, 5);
      assert.equal(r.j.fiveStarCount, i + 1);
      assert.equal(r.j.drawGranted, false);
    }
    assert.equal(oakChances().length, 0);
    assert.equal(childState(1).total_xp, before.total_xp);
    // 第 5 句 4 星：5 星仍 4 句，已读 5 句，仍未读完，不发
    const fifth = await assess(cookie, 1, t.sentences[4].en, 75);
    assert.equal(fifth.j.stars, 4);
    assert.equal(fifth.j.fiveStarCount, 4);
    assert.equal(fifth.j.drawGranted, false);
    assert.equal(oakChances().length, 0);
    // 第 6 句 4 星：6 句都读完，5 星 4 句已够格，发机会（只发机会，不掷骰、不发奖）
    const sixth = await assess(cookie, 1, t.sentences[5].en, 75);
    assert.equal(sixth.j.stars, 4);
    assert.equal(sixth.j.fiveStarCount, 4);
    assert.equal(sixth.j.drawGranted, true);
    assert.equal(sixth.j.justGranted, true);
    assert.equal(oakChances().length, 1);
    assert.equal(oakChances()[0].source, 'oak');
    assert.equal(childState(1).total_xp, before.total_xp, '发机会时不加经验，经验等转盘里转到才发');
    assert.equal(childState(1).balls, before.balls, '发机会时不发球');
  });

  test('4 句 5 星＋1 句 3 星（60 分）不发机会：6 句须全 ≥75', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    // 前 4 句 5 星（90 分）
    for (let i = 0; i < 4; i++) {
      const r = await assess(cookie, 1, t.sentences[i].en, 90);
      assert.equal(r.j.stars, 5);
      assert.equal(r.j.drawGranted, false);
    }
    // 第 5 句 4 星（75 分）
    const fifth = await assess(cookie, 1, t.sentences[4].en, 75);
    assert.equal(fifth.j.stars, 4);
    assert.equal(fifth.j.drawGranted, false);
    // 第 6 句 3 星（60 分）：6 句读完、5 星 4 句已够格，但有一句 <75，不发
    const sixth = await assess(cookie, 1, t.sentences[5].en, 60);
    assert.equal(sixth.j.stars, 3);
    assert.equal(sixth.j.fiveStarCount, 4);
    assert.equal(sixth.j.fourStarCount, 5);
    assert.equal(sixth.j.drawGranted, false);
    assert.equal(oakChances().length, 0);
    assert.equal(childState(1).total_xp, before.total_xp);
  });

  test('6 句 5 星发机会：不发经验、不发球，每天只一次', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    let last;
    for (let i = 0; i < 6; i++) {
      last = await assess(cookie, 1, t.sentences[i].en, 90);
      assert.equal(last.j.stars, 5);
      if (i === 5) {
        assert.equal(last.j.drawGranted, true);
        assert.equal(last.j.justGranted, true);
      }
    }
    assert.equal(last.j.fiveStarCount, 6);
    assert.deepEqual(childState(1), before, '发机会时不加经验、不加球');
    assert.equal(oakChances().length, 1);
    assert.equal(ballGrants().length, 0);
  });

  test('幂等：发机会后重评不重复发', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    for (let i = 0; i < 6; i++) await assess(cookie, 1, t.sentences[i].en, 90);
    assert.equal(oakChances().length, 1);
    const mid = childState(1);
    const again = await assess(cookie, 1, t.sentences[0].en, 95);
    assert.equal(again.j.fiveStarCount, 6);
    assert.equal(again.j.drawGranted, true);
    assert.equal(again.j.justGranted, false, '重评只复读已发状态，不重复发机会');
    assert.equal(oakChances().length, 1);
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

  test('today 返回五星进度与发机会态', async () => {
    const cookie = await parentCookie();
    const t0 = await today(cookie, 1);
    assert.equal(t0.fiveStarCount, 0);
    assert.equal(t0.fiveStarTotal, 6);
    assert.equal(t0.drawGranted, false);
    for (let i = 0; i < 3; i++) await assess(cookie, 1, t0.sentences[i].en, 90);
    const t1 = await today(cookie, 1);
    assert.equal(t1.fiveStarCount, 3);
    assert.equal(t1.fiveStarTotal, 6);
    assert.equal(t1.drawGranted, false);
    await assess(cookie, 1, t0.sentences[3].en, 90);
    await assess(cookie, 1, t0.sentences[4].en, 90);
    const t4 = await today(cookie, 1);
    assert.equal(t4.fiveStarCount, 5);
    assert.equal(t4.drawGranted, false);
    await assess(cookie, 1, t0.sentences[5].en, 90);
    const t2 = await today(cookie, 1);
    assert.equal(t2.fiveStarCount, 6);
    assert.equal(t2.drawGranted, true);
  });

  test('发机会与听完奖励叠加：发机会不加经验，听完 6 句 +10 XP', async () => {
    const cookie = await parentCookie();
    const t = await today(cookie, 1);
    const before = childState(1);
    for (let i = 0; i < 6; i++) await assess(cookie, 1, t.sentences[i].en, 90);
    assert.equal(childState(1).total_xp, before.total_xp, '发机会不加经验');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM quiz_attempts').get().n, 0);
    for (const s of t.sentences) {
      const r = await listen(cookie, 1, s.id);
      assert.equal(r.status, 200);
      assert.equal(r.j.ok, true);
    }
    assert.equal(childState(1).total_xp, before.total_xp + 10);
    const after = await today(cookie, 1);
    assert.equal(after.listenedCount, 6);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fiveStarCount, 6);
    assert.equal(after.drawGranted, true);
  });
});

describe('普通转盘：转盘中心扭一下才掷骰（HTTP）', () => {
  async function grantFor(childId, cookie, pron = 90) {
    const t = await today(cookie, childId);
    for (let i = 0; i < 6; i++) await assess(cookie, childId, t.sentences[i].en, pron);
    assert.equal(oakChances(childId).length, 1);
  }

  test('转盘中心能看到普通盘次数：发机会后背包 oakWheelChances 为 1，高级/养成盘不动', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    const before = await backpackChances(1, c1);
    assert.equal(before.oak, 0);
    assert.equal(before.wheel, 0);
    assert.equal(before.care, 0);
    await grantFor(1, pc);
    const after = await backpackChances(1, c1);
    assert.equal(after.oak, 1);
    assert.equal(after.wheel, 0, 'Oak 机会不占高级转盘机会');
    assert.equal(after.care, 0, 'Oak 机会不占养成转盘机会');
  });

  test('扭一下才掷骰：抽中经验 +10、机会清零、再抽报无机会', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    const before = childState(1);
    await grantFor(1, pc);
    assert.equal(childState(1).total_xp, before.total_xp, '没扭之前不发奖');
    const r = await withRandom(0.1, () => spin(1, c1));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.deepEqual(r.j.prize, { kind: 'xp', key: 'xp', name: '经验+10', emoji: '⭐' });
    assert.equal(r.j.chancesLeft, 0);
    assert.equal(r.j.wheel.sectors.length, 18);
    assert.equal(r.j.wheel.total, 100);
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'xp');
    assert.equal(childState(1).total_xp, before.total_xp + 10);
    assert.notEqual(oakChances(1)[0].used_epoch, null, '机会行应标记已用');
    const again = await spin(1, c1);
    assert.equal(again.status, 400);
    assert.match(again.j.error, /没有普通转盘机会/);
    assert.equal(childState(1).total_xp, before.total_xp + 10, '再抽失败不得重复发奖');
  });

  test('抽中普通球：球 +1、有发球审计行', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    const before = childState(1);
    await grantFor(1, pc, 92);
    const r = await withRandom(0.25, () => spin(1, c1));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.deepEqual(r.j.prize, { kind: 'ball', key: 'ball', name: '普通精灵球', emoji: '🔴' });
    assert.equal(r.j.wheel.sectors[r.j.wheel.winnerIndex].key, 'ball');
    assert.equal(childState(1).total_xp, before.total_xp);
    assert.equal(childState(1).balls, before.balls + 1);
    const gs = ballGrants();
    assert.equal(gs.length, 1);
    assert.equal(gs[0].kind, 'normal');
    assert.equal(gs[0].qty, 1);
    assert.equal(gs[0].checkin_id, null);
  });

  test('抽中 care:apple：背包 +1、流水 reason oak-wheel', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    await grantFor(1, pc);
    const r = await withRandom(0.32, () => spin(1, c1));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'item');
    assert.equal(r.j.prize.key, 'care:apple');
    assert.equal(r.j.prize.name, '红苹果');
    assert.equal(invQty(1, 'care:apple'), 1);
    const led = raw.prepare("SELECT * FROM item_ledger WHERE child_id=1 AND item_key='care:apple'").all();
    assert.equal(led.length, 1);
    assert.equal(led[0].delta, 1);
    assert.equal(led[0].reason, 'oak-wheel');
    assert.equal(led[0].ref_type, 'oak_wheel_chance');
  });

  test('抽中活力碎片：走 addItem 进背包、奖品名/emoji 正确', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    await grantFor(1, pc);
    const r = await withRandom(0.89, () => spin(1, c1));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'item');
    assert.equal(r.j.prize.key, 'medicine:revive');
    assert.equal(r.j.prize.name, '活力碎片');
    assert.equal(r.j.prize.emoji, '✨');
    assert.equal(invQty(1, 'medicine:revive'), 1);
  });

  test('没机会时不发奖、不动库存', async () => {
    const c1 = await childCookie(1, '1111');
    const r = await spin(1, c1);
    assert.equal(r.status, 400);
    assert.match(r.j.error, /没有普通转盘机会/);
    for (const [key] of M.OAK_WHEEL_POOL) {
      if (key === 'xp' || key === 'ball') continue;
      assert.equal(invQty(1, key), 0, `${key} 不应凭空进库存`);
    }
  });

  test('未登录拒绝、跨孩拒绝', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    await grantFor(1, pc);
    const anon = await call('/api/oak-wheel/spin', { method: 'POST', body: { childId: 1 } });
    assert.equal(anon.status, 401);
    const cross = await call('/api/oak-wheel/spin', { method: 'POST', body: { childId: 2 }, cookie: c1 });
    assert.equal(cross.status, 403);
    assert.equal(oakChances(1).length, 1, '拒绝的请求不得消耗机会');
    assert.equal(oakChances(1)[0].used_epoch, null);
  });

  test('两孩互不干扰', async () => {
    const pc = await parentCookie();
    const c1 = await childCookie(1, '1111');
    const c2 = await childCookie(2, '2222');
    await grantFor(1, pc);
    const b1 = await backpackChances(1, c1);
    const b2 = await backpackChances(2, c2);
    assert.equal(b1.oak, 1);
    assert.equal(b2.oak, 0, '大宝够格不应给小宝发机会');
    const r = await spin(2, c2);
    assert.equal(r.status, 400);
  });
});
