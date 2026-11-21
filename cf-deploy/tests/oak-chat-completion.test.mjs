/* 大木博士英语交流新完成规则单测（MP-15 §2：4×5★+2×4★）：node --test tests/oak-chat-completion.test.mjs
 * 完成 = 6 句听完且 6 句跟读均 ≥4★（best_pron >= OAK_FOUR_STAR_PRON = 75）且 ≥4 句
 * ≥5★（best_pron >= OAK_FIVE_STAR_PRON = 85）——与转盘门同线；10 XP 只发一次，
 * 无论 listen 还是 assess 落下最后一块拼图；低于 4★ 的跟读不计，复读到 ≥75 后计入（best 取 MAX）。
 * 点评接口用 mock 讯飞分数，真实讯飞调用 0 次。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0032_oak_dialogue.sql', '0043_pet_instances_ability.sql'];

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
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw } = makeEnv()); });

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

function mkWavBody(totalLen = 2000) {
  const buf = Buffer.alloc(totalLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + (totalLen - 44), 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(16000, 24); buf.writeUInt32LE(32000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(totalLen - 44, 40);
  return buf;
}

function setIflytekEnv() {
  env.IFLYTEK_APPID = 'test-appid';
  env.IFLYTEK_API_KEY = 'test-apikey-0123456789abcdef';
  env.IFLYTEK_API_SECRET = 'test-secret-dummy-0123456789abcdef';
}

/* mock 讯飞点评：首帧后自动回指定消息（真实讯飞调用 0 次）。 */
async function withIflytek(reply, fn) {
  const RealWS = globalThis.WebSocket;
  let calls = 0;
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
        const msg = typeof reply === 'string'
          ? { code: 0, sid: 't', data: { status: 2, data: Buffer.from(reply).toString('base64') } }
          : reply;
        setTimeout(() => this.emit('message', { data: JSON.stringify(msg) }), 0);
      }
    }
    close() {}
    emit(t, ev) { for (const fn2 of this.listeners[t] || []) fn2(ev); }
  }
  globalThis.WebSocket = FakeWS;
  try { const r = await fn(); assert.equal(calls, 1); return r; }
  finally { globalThis.WebSocket = RealWS; }
}

/* 按指定 pron 点评某句（mock 讯飞回指定 total_score 的 XML）。 */
async function assessAt(cookie, childId, refText, pron) {
  setIflytekEnv();
  const xml = '<?xml version="1.0" encoding="utf-8" ?>'
    + '<FinalResult><ret value="0"/>'
    + `<read_sentence content="x" total_score="${pron}" accuracy_score="${pron}" fluency_score="${pron}" integrity_score="100" standard_score="${pron}">`
    + `<sentence content="x" total_score="${pron}">`
    + '<word content="Hello" dp_message="0" total_score="80"/>'
    + '</sentence></read_sentence></FinalResult>';
  return withIflytek(xml, async () => callRaw(`/api/oak/assess?child_id=${childId}`, {
    body: mkWavBody(2000),
    headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(refText) },
    cookie,
  }));
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
}

async function todayFor(cookie, childId) {
  const r = await call(`/api/oak/today?child_id=${childId}`, { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, true);
  return r.j;
}

async function listen(cookie, childId, questionId) {
  return call('/api/oak/listen', {
    method: 'POST',
    cookie,
    body: { child_id: childId, question_id: questionId },
  });
}

function childXp(id) {
  return raw.prepare('SELECT total_xp FROM children WHERE id=?').get(id).total_xp;
}

function bestPron(childId, questionId) {
  const row = raw.prepare('SELECT best_pron FROM oak_assessments WHERE child_id=? AND question_id=?').get(childId, questionId);
  return row ? Number(row.best_pron) : null;
}

describe('MP-15 §2：英语交流完成规则 4×5★+2×4★', () => {
  test('先听完 6 句、再跟读：最后一句跟读才完成，10 XP 只发一次', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    const n = today.sentences.length;
    assert.equal(n, 6);

    for (let i = 0; i < n; i++) {
      const r = await listen(c1, 1, today.sentences[i].id);
      assert.equal(r.status, 200);
      assert.equal(r.j.completed, false, '只听不完成');
      assert.equal(r.j.xpAwarded, 0);
    }
    assert.equal(childXp(1), initialXp);
    let after = await todayFor(c1, 1);
    assert.equal(after.completed, false);
    assert.equal(after.xpAwardedToday, 0);
    assert.equal(after.fourStarCount, 0);
    assert.equal(after.fiveStarCount, 0);
    assert.equal(after.assessedCount, 0);

    // 4 句 5★（90）＋ 2 句 4★（80）：只有最后一句跟读落下最后一块拼图时才完成
    const scores = [90, 90, 90, 90, 80, 80];
    for (let i = 0; i < n; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, scores[i]);
      assert.equal(a.status, 200);
      assert.equal(a.j.ok, true);
      assert.equal(a.j.listenedCount, n);
      assert.equal(a.j.completed, i === n - 1);
      assert.equal(a.j.xpAwarded, i === n - 1 ? 10 : 0);
      assert.equal(childXp(1), initialXp + (i === n - 1 ? 10 : 0));
    }

    // 完成后重复提交最后一句听：仍 400；复读不再发经验
    assert.equal((await listen(c1, 1, today.sentences[n - 1].id)).status, 400);
    const again = await assessAt(c1, 1, today.sentences[n - 1].en, 90);
    assert.equal(again.j.completed, true);
    assert.equal(again.j.xpAwarded, 0);
    assert.equal(childXp(1), initialXp + 10);

    after = await todayFor(c1, 1);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fourStarCount, n);
    assert.equal(after.fiveStarCount, 5); // 复读把第 6 句从 80 提到了 90
    assert.equal(after.assessedCount, n);
  });

  test('先跟读 6 句、再听：最后一句听才完成，10 XP 只发一次', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    const n = today.sentences.length;

    // 4 句 5★（90）＋ 2 句 4★（80）：跟读达标但没听完，不完成
    const scores = [90, 90, 90, 90, 80, 80];
    for (let i = 0; i < n; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, scores[i]);
      assert.equal(a.status, 200);
      assert.equal(a.j.completed, false, '没听完不完成');
      assert.equal(a.j.xpAwarded, 0);
    }
    assert.equal(childXp(1), initialXp);

    for (let i = 0; i < n; i++) {
      const r = await listen(c1, 1, today.sentences[i].id);
      assert.equal(r.status, 200);
      assert.equal(r.j.completed, i === n - 1);
      assert.equal(r.j.xpAwarded, i === n - 1 ? 10 : 0);
      assert.equal(childXp(1), initialXp + (i === n - 1 ? 10 : 0));
    }
    assert.equal((await listen(c1, 1, today.sentences[n - 1].id)).status, 400);
    assert.equal(childXp(1), initialXp + 10);

    const after = await todayFor(c1, 1);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fourStarCount, n);
    assert.equal(after.fiveStarCount, 4);
    assert.equal(after.assessedCount, n);
  });

  test('只听 6 句不跟读：不完成、0 经验', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    for (const s of today.sentences) {
      const r = await listen(c1, 1, s.id);
      assert.equal(r.status, 200);
      assert.equal(r.j.completed, false);
      assert.equal(r.j.xpAwarded, 0);
    }
    assert.equal(childXp(1), initialXp);
    const after = await todayFor(c1, 1);
    assert.equal(after.listenedCount, 6);
    assert.equal(after.completed, false);
    assert.equal(after.xpAwardedToday, 0);
    assert.equal(after.fourStarCount, 0);
    assert.equal(after.fiveStarCount, 0);
    assert.equal(after.assessedCount, 0);
  });

  test('6 句都 80 分（全 4★、0×5★）：不完成；补到 4×5★ 才完成', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    const n = today.sentences.length;
    for (const s of today.sentences) await listen(c1, 1, s.id);

    // 6 句都 80 分：4★ 数 6、5★ 数 0，不完成
    for (const s of today.sentences) {
      const a = await assessAt(c1, 1, s.en, 80);
      assert.equal(a.status, 200);
      assert.equal(a.j.completed, false, '全 4★ 无 5★ 不完成');
      assert.equal(a.j.xpAwarded, 0);
    }
    assert.equal(childXp(1), initialXp);
    let after = await todayFor(c1, 1);
    assert.equal(after.fourStarCount, 6);
    assert.equal(after.fiveStarCount, 0);
    assert.equal(after.assessedCount, 6);
    assert.equal(after.completed, false);
    assert.equal(after.xpAwardedToday, 0);

    // 前 3 句复读到 90：5★ 数 3，仍不完成
    for (let i = 0; i < 3; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, 90);
      assert.equal(a.status, 200);
      assert.equal(a.j.completed, false, '5★ 数 3 不完成');
      assert.equal(a.j.xpAwarded, 0);
    }
    assert.equal(childXp(1), initialXp);
    after = await todayFor(c1, 1);
    assert.equal(after.fiveStarCount, 3);
    assert.equal(after.completed, false);

    // 第 4 句复读到 90：5★ 数 4，最后一块拼图落下，完成、+10 XP（只一次）
    const last = await assessAt(c1, 1, today.sentences[3].en, 90);
    assert.equal(last.j.completed, true);
    assert.equal(last.j.xpAwarded, 10);
    assert.equal(childXp(1), initialXp + 10);
    after = await todayFor(c1, 1);
    assert.equal(after.fourStarCount, 6);
    assert.equal(after.fiveStarCount, 4);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
  });

  test('跟读 70 分不计入；复读到 4★/5★ 后计入（best 取 MAX），4×5★ 才完成', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    const n = today.sentences.length;
    for (const s of today.sentences) await listen(c1, 1, s.id);

    // 6 句都只读到 70 分（3★）：跟读数 6，但 4★ 数 0、5★ 数 0，不完成
    for (const s of today.sentences) {
      const a = await assessAt(c1, 1, s.en, 70);
      assert.equal(a.status, 200);
      assert.equal(a.j.completed, false);
      assert.equal(a.j.xpAwarded, 0);
    }
    assert.equal(childXp(1), initialXp);
    let after = await todayFor(c1, 1);
    assert.equal(after.assessedCount, 6);
    assert.equal(after.fourStarCount, 0);
    assert.equal(after.fiveStarCount, 0);
    assert.equal(after.completed, false);
    assert.equal(bestPron(1, today.sentences[0].id), 70);

    // 第 1 句复读到 90 分：best 变成 90，4★ 数 1、5★ 数 1，仍不完成
    const re1 = await assessAt(c1, 1, today.sentences[0].en, 90);
    assert.equal(re1.j.completed, false);
    assert.equal(bestPron(1, today.sentences[0].id), 90);
    after = await todayFor(c1, 1);
    assert.equal(after.fourStarCount, 1);
    assert.equal(after.fiveStarCount, 1);
    assert.equal(after.completed, false);

    // 其余 5 句复读：前 3 句到 90、第 4 句到 80 时仍不完成（4★ 数 5），
    // 第 5 句到 80 后 4★ 数 6、5★ 数 4，最后一句完成、+10 XP（只一次）
    const reScores = [90, 90, 90, 80, 80];
    for (let i = 1; i < n; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, reScores[i - 1]);
      assert.equal(a.j.completed, i === n - 1);
      assert.equal(a.j.xpAwarded, i === n - 1 ? 10 : 0);
    }
    assert.equal(childXp(1), initialXp + 10);
    after = await todayFor(c1, 1);
    assert.equal(after.fourStarCount, 6);
    assert.equal(after.fiveStarCount, 4);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
  });

  test('网页顺序（每句先跟读再听）：第 6 对才完成，10 XP 只发一次', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    const n = today.sentences.length;
    // 4 句 5★（90）＋ 2 句 4★（80）：跟读达标线与完成线同为 4×5★+2×4★
    const scores = [90, 90, 90, 90, 80, 80];
    for (let i = 0; i < n; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, scores[i]);
      assert.equal(a.status, 200);
      assert.equal(a.j.completed, false, '第 6 句听之前不完成');
      assert.equal(a.j.xpAwarded, 0);
      const r = await listen(c1, 1, today.sentences[i].id);
      assert.equal(r.status, 200);
      assert.equal(r.j.completed, i === n - 1);
      assert.equal(r.j.xpAwarded, i === n - 1 ? 10 : 0);
      assert.equal(childXp(1), initialXp + (i === n - 1 ? 10 : 0));
    }
    const after = await todayFor(c1, 1);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fourStarCount, 6);
    assert.equal(after.fiveStarCount, 4);
  });
});

describe('MP-15 §6.1：GET /api/daily-modules', () => {
  test('返回三科描述，kind 与服务端常量一致', async () => {
    // /api/* 一律要会话（与其他接口一致）；小程序经 api() 带 famsess 调用
    const { pc } = await setup();
    const r = await call('/api/daily-modules', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.deepEqual(r.j.modules.map((m) => m.key), ['english', 'chinese', 'math']);
    assert.deepEqual(r.j.modules.map((m) => m.kind), ['recite', 'quiz', 'quiz']);
    assert.deepEqual(M.DAILY_MODULE_KINDS, { english: 'recite', chinese: 'quiz', math: 'quiz' });
    assert.equal(M.OAK_FOUR_STAR_PRON, 75);
    for (const m of r.j.modules) {
      assert.ok(typeof m.title === 'string' && m.title.length > 0);
      assert.ok(typeof m.icon === 'string' && m.icon.startsWith('/images/'));
      assert.ok(typeof m.unit === 'string' && m.unit.length > 0);
      assert.equal(m.count, 5);
      assert.ok(typeof m.intro === 'string' && m.intro.length > 0);
    }
    assert.equal(r.j.modules.find((m) => m.key === 'chinese').unit, '道题');
    assert.equal(r.j.modules.find((m) => m.key === 'english').unit, '句');
  });
});
