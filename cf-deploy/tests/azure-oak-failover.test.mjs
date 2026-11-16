/* Oak 主备线路（2026-11-04）：讯飞主、Azure 备。node --test tests/azure-oak-failover.test.mjs
 * 覆盖：Azure 直连分数/词级映射、非 200/未识别/未配密钥；HTTP 层主线未配走备线、
 * 主线断网切换备线、主线 not_recognized 不切换、双线故障报主线错误、两线全无。
 * 脚手架与 iflytek-oak.test.mjs 同一手法（内存库＋迁移＋6 句单集题）。 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("ALTER TABLE quiz_questions ADD COLUMN oak_episode TEXT");
  raw.exec("ALTER TABLE quiz_questions ADD COLUMN oak_topic TEXT");
  raw.exec("ALTER TABLE quiz_questions ADD COLUMN oak_audio TEXT");
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
      IFLYTEK_APPID: 'test-appid', IFLYTEK_API_KEY: 'test-apikey-fedcba9876543210', IFLYTEK_API_SECRET: 'test-secret-dummy-fedcba9876543210',
      AZURE_SPEECH_KEY: 'test-azure-key' },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json';
  const req = new Request('https://test.local' + path, {
    method, headers: h, body: body !== undefined ? (body instanceof Uint8Array ? body : (typeof body === 'string' || body instanceof ArrayBuffer ? body : JSON.stringify(body))) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

function mkWav(pcmLen) {
  const hdr = new Uint8Array(44);
  const view = new DataView(hdr.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  view.setUint32(4, 36 + pcmLen, true);
  str(36, 'data'); view.setUint32(40, pcmLen, true);
  return Buffer.concat([Buffer.from(hdr), Buffer.alloc(pcmLen)]);
}

function seedGroup() {
  const grade = M.gradeNumFromLabel(raw.prepare('SELECT grade_label FROM children WHERE id=1').get().grade_label);
  const texts = ['Hello world', 'Good morning', 'Thank you', 'How are you', 'Nice to meet you', 'See you later'];
  for (let i = 0; i < texts.length; i++) {
    raw.prepare(`INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,oak_episode,oak_topic,oak_audio)
      VALUES('oak',?,'英语',?,'["x"]',0,?,1,0,1,'ep-test','test',?)`).run(grade, texts[i], texts[i], `s00${i}.mp3`);
  }
  return texts;
}

class FakeWS {
  constructor(url) {
    this.url = url;
    this.sent = [];
    this.listeners = {};
    FakeWS.last = this;
  }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  send(s) { this.sent.push(s); }
  close() {}
  emit(t, ev) { for (const fn of this.listeners[t] || []) fn(ev); }
}

const RealWS = globalThis.WebSocket;
const RealFetch = globalThis.fetch;
function stubWS() { FakeWS.last = null; globalThis.WebSocket = FakeWS; }
afterEach(() => { globalThis.WebSocket = RealWS; globalThis.fetch = RealFetch; FakeWS.last = null; });

async function waitForWS() {
  for (let i = 0; i < 100 && !FakeWS.last; i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(FakeWS.last, 'WebSocket 应已创建');
  return FakeWS.last;
}

const AZURE_OK = {
  RecognitionStatus: 'Success',
  NBest: [{
    PronunciationAssessment: { PronScore: 88.4, AccuracyScore: 90, FluencyScore: 85.5, CompletenessScore: 100, ProsodyScore: 78.2 },
    Words: [
      { Word: 'Hello', PronunciationAssessment: { AccuracyScore: 92, ErrorType: 'None' } },
      { Word: 'world', PronunciationAssessment: { AccuracyScore: 55, ErrorType: 'Mispronunciation' } },
    ],
  }],
};

function stubFetch(map) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), headers: opts?.headers || {} });
    return map(url, opts);
  };
  return calls;
}

describe('azureAssess 直连', () => {
  test('成功映射分数与词级', async () => {
    const calls = stubFetch(async () => ({ status: 200, json: async () => AZURE_OK }));
    const r = await M.azureAssess(new Uint8Array(3200), 'Hello world', env);
    assert.equal(r.ok, true);
    assert.equal(r.pron, 88.4);
    assert.equal(r.acc, 90);
    assert.equal(r.flu, 85.5);
    assert.equal(r.comp, 100);
    assert.equal(r.pros, 78.2);
    assert.deepEqual(r.words, [
      { w: 'Hello', score: 92, err: 'None' },
      { w: 'world', score: 55, err: 'Mispronunciation' },
    ]);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes('southeastasia.stt.speech.microsoft.com'));
    assert.equal(calls[0].headers['Ocp-Apim-Subscription-Key'], 'test-azure-key');
    assert.ok(String(calls[0].headers['Pronunciation-Assessment']).length > 0);
  });

  test('非 200 报 azure 带状态、未识别报 not_recognized、缺 key 报 not_configured', async () => {
    stubFetch(async () => ({ status: 401, json: async () => ({}) }));
    assert.deepEqual(await M.azureAssess(new Uint8Array(3200), 'Hi', env), { ok: false, error: 'azure', status: 401 });
    stubFetch(async () => ({ status: 200, json: async () => ({ RecognitionStatus: 'NoMatch' }) }));
    assert.deepEqual(await M.azureAssess(new Uint8Array(3200), 'Hi', env), { ok: false, error: 'not_recognized', status: 'NoMatch' });
    assert.deepEqual(await M.azureAssess(new Uint8Array(3200), 'Hi', {}), { ok: false, error: 'not_configured' });
  });
});

describe('HTTP 层主备', () => {
  test('主线未配走备线、provider 标注 azure、成绩落库', async () => {
    delete env.IFLYTEK_APPID; delete env.IFLYTEK_API_KEY; delete env.IFLYTEK_API_SECRET;
    stubFetch(async () => ({ status: 200, json: async () => AZURE_OK }));
    const texts = seedGroup();
    const pc = await parentCookie();
    const r = await call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(texts[0]) }, body: mkWav(3200) });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.provider, 'azure');
    assert.equal(r.j.pron, 88.4);
    assert.equal(r.j.stars, 5);
    const row = raw.prepare('SELECT best_pron FROM oak_assessments WHERE child_id=1').get();
    assert.ok(row);
    assert.equal(row.best_pron, 88.4);
  });

  test('主线断网切换备线', async () => {
    stubWS();
    const calls = stubFetch(async () => ({ status: 200, json: async () => AZURE_OK }));
    const texts = seedGroup();
    const pc = await parentCookie();
    const p = call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(texts[0]) }, body: mkWav(3200) });
    const ws = await waitForWS();
    ws.emit('error', {});
    const r = await p;
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.provider, 'azure');
    assert.equal(r.j.pron, 88.4);
    assert.equal(calls.length, 1);
  });

  test('主线 not_recognized 不切换、不调备线', async () => {
    stubWS();
    const calls = stubFetch(async () => ({ status: 200, json: async () => AZURE_OK }));
    const texts = seedGroup();
    const pc = await parentCookie();
    const p = call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(texts[0]) }, body: mkWav(3200) });
    const ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from('<xml_result></xml_result>').toString('base64') } }) });
    const r = await p;
    assert.equal(r.status, 200);
    assert.equal(r.j.error, 'not_recognized');
    assert.equal(calls.length, 0);
  });

  test('双线都故障报主线错误', async () => {
    stubWS();
    stubFetch(async () => ({ status: 500, json: async () => ({}) }));
    const texts = seedGroup();
    const pc = await parentCookie();
    const p = call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(texts[0]) }, body: mkWav(3200) });
    const ws = await waitForWS();
    ws.emit('error', {});
    const r = await p;
    assert.equal(r.status, 502);
    assert.equal(r.j.error, 'network');
  });

  test('两线全无返回 not_configured', async () => {
    delete env.IFLYTEK_APPID; delete env.IFLYTEK_API_KEY; delete env.IFLYTEK_API_SECRET; delete env.AZURE_SPEECH_KEY;
    const texts = seedGroup();
    const pc = await parentCookie();
    const r = await call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(texts[0]) }, body: mkWav(3200) });
    assert.equal(r.status, 200);
    assert.equal(r.j.error, 'not_configured');
  });
});
