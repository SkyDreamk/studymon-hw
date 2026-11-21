/* 讯飞评测（流式版）Oak 接线（2026-11-03）：node --test tests/iflytek-oak.test.mjs
 * 覆盖：WAV→PCM 剥头（含附加 chunk、非 WAV、截断）；最终 XML 解析（总分/四维/词级
 * dp_message 映射、无 read_sentence、无总分）；HMAC 签名固定向量（openssl 独立算出，
 * 密钥为测试专用假值）；鉴权 URL 结构；WebSocket 全流程（ssb 首帧＋auw 分帧顺序与
 * aus/status、错误码、提前断连、无配置）；HTTP 层未配密钥门；HTTP 层端到端（FakeWS
 * 注入、成绩落库）。脚手架与 history-reward.test.mjs 同一手法，外加 0014 的三列
 * ALTER（不引其 174 行真实题库，单测自插 6 句单集题）。 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql']) {
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
      IFLYTEK_APPID: 'test-appid', IFLYTEK_API_KEY: 'test-apikey-0123456789abcdef', IFLYTEK_API_SECRET: 'test-secret-dummy-0123456789abcdef' },
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

function mkWav(pcmLen, extraChunk = false) {
  const chunks = [];
  const hdr = new Uint8Array(44);
  const view = new DataView(hdr.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  if (extraChunk) {
    const list = new Uint8Array(8 + 6);
    const lv = new DataView(list.buffer);
    for (let i = 0; i < 4; i++) lv.setUint8(i, 'LIST'.charCodeAt(i));
    lv.setUint32(4, 6, true);
    chunks.push(list);
    view.setUint32(4, 36 + 8 + 6 + pcmLen, true);
    str(36, 'data'); view.setUint32(40, pcmLen, true);
    return Buffer.concat([Buffer.from(hdr), Buffer.from(list), Buffer.alloc(pcmLen)]);
  }
  view.setUint32(4, 36 + pcmLen, true);
  str(36, 'data'); view.setUint32(40, pcmLen, true);
  return Buffer.concat([Buffer.from(hdr), Buffer.alloc(pcmLen)]);
}

const SAMPLE_XML = '<?xml version="1.0" encoding="utf-8" ?>'
  + '<FinalResult><ret value="0"/>'
  + '<read_sentence beg_pos="0" end_pos="100" content="Hello world" total_score="85.5" accuracy_score="88.0" fluency_score="82.0" integrity_score="100.0" standard_score="80.0">'
  + '<sentence beg_pos="0" end_pos="100" content="Hello world" total_score="85.5">'
  + '<word beg_pos="0" end_pos="50" content="Hello" dp_message="0" total_score="90.0"/>'
  + '<word beg_pos="50" end_pos="100" content="world" dp_message="128" total_score="55.0"/>'
  + '</sentence></read_sentence></FinalResult>';

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
function stubWS() { FakeWS.last = null; globalThis.WebSocket = FakeWS; }
afterEach(() => { globalThis.WebSocket = RealWS; FakeWS.last = null; });

async function waitForWS() {
  for (let i = 0; i < 100 && !FakeWS.last; i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(FakeWS.last, 'WebSocket 应已创建');
  return FakeWS.last;
}

describe('WAV→PCM', () => {
  test('标准 44 字节头剥离后长度与内容一致', () => {
    const wav = mkWav(3200);
    const pcm = M.iflytekWavToPcm(wav);
    assert.equal(pcm.length, 3200);
    assert.deepEqual([...pcm.slice(0, 4)], [0, 0, 0, 0]);
  });
  test('附加 chunk 在 data 段之前仍能定位', () => {
    const wav = mkWav(1280, true);
    assert.equal(M.iflytekWavToPcm(wav).length, 1280);
  });
  test('非 WAV、截断返回 null', () => {
    assert.equal(M.iflytekWavToPcm(new Uint8Array(100)), null);
    assert.equal(M.iflytekWavToPcm(new Uint8Array(10)), null);
  });
});

describe('XML 解析', () => {
  test('总分、四维、词级映射', () => {
    const r = M.iflytekParseResultXml(SAMPLE_XML);
    assert.equal(r.pron, 85.5);
    assert.equal(r.acc, 88);
    assert.equal(r.flu, 82);
    assert.equal(r.comp, 100);
    assert.equal(r.pros, 80);
    assert.deepEqual(r.words, [
      { w: 'Hello', score: 90, err: 'None' },
      { w: 'world', score: 55, err: 'Mispronunciation' },
    ]);
  });
  test('dp_message 全表映射', () => {
    assert.deepEqual([0, 16, 32, 64, 128, 999].map((d) => M.iflytekDpToErr(d)),
      ['None', 'Omission', 'Insertion', 'Repetition', 'Mispronunciation', 'None']);
  });
  test('无 read_sentence、无总分返回 null', () => {
    assert.equal(M.iflytekParseResultXml('<FinalResult><ret value="0"/></FinalResult>'), null);
    assert.equal(M.iflytekParseResultXml('<read_sentence accuracy_score="88.0"></read_sentence>'), null);
    assert.equal(M.iflytekParseResultXml(''), null);
  });
  test('真实引擎结构：内层 read_chapter、0–5 分制换算 ×20', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<xml_result>'
      + '<read_sentence lan="en" type="study" version="V4.1.0R6.81.20.10M9.81.20.2"><rec_paper>'
      + '<read_chapter accuracy_score="4.525598" content="Old things have stories." fluency_score="4.777792"'
      + ' integrity_score="5.000000" is_rejected="false" standard_score="4.829763" total_score="4.631673">'
      + '<sentence total_score="4.631673">'
      + '<word content="old" dp_message="0" total_score="4.052495"/>'
      + '<word content="things" dp_message="0" total_score="4.559610"/>'
      + '</sentence></read_chapter></rec_paper></read_sentence></xml_result>';
    const r = M.iflytekParseResultXml(xml);
    assert.equal(r.pron, 92.6);
    assert.equal(r.acc, 90.5);
    assert.equal(r.flu, 95.6);
    assert.equal(r.comp, 100);
    assert.equal(r.pros, 96.6);
    assert.deepEqual(r.words, [
      { w: 'old', score: 81, err: 'None' },
      { w: 'things', score: 91.2, err: 'None' },
    ]);
  });
  test('乱说拒识返回 null', () => {
    const xml = '<xml_result><read_sentence><rec_paper>'
      + '<read_chapter total_score="4.6" accuracy_score="4.5" fluency_score="4.7" integrity_score="5" standard_score="4.8" is_rejected="true">'
      + '</read_chapter></rec_paper></read_sentence></xml_result>';
    assert.equal(M.iflytekParseResultXml(xml), null);
  });
});

describe('签名与鉴权 URL', () => {
  test('固定向量与 openssl 独立计算一致', async () => {
    const sig = await M.iflytekSignature('test-secret-dummy-0123456789abcdef', 'Wed, 04 Nov 2026 03:00:00 GMT');
    assert.equal(sig, 'VaT+VjN6YU5FIT4tF+D5TkjJfLaHI3SB12zlEtZHFC0=');
  });
  test('URL 含 host/date/authorization，解码后含 api_key 与算法', async () => {
    const url = await M.iflytekAuthUrl('test-appid', 'test-apikey-0123456789abcdef', 'test-secret-dummy-0123456789abcdef');
    const u = new URL(url);
    assert.equal(u.hostname, 'ise-api.xfyun.cn');
    assert.equal(u.searchParams.get('host'), 'ise-api.xfyun.cn');
    assert.ok(u.searchParams.get('date'));
    const auth = Buffer.from(u.searchParams.get('authorization'), 'base64').toString('utf8');
    assert.match(auth, /api_key="test-apikey-0123456789abcdef"/);
    assert.match(auth, /algorithm="hmac-sha256"/);
    assert.match(auth, /headers="host date request-line"/);
    assert.match(auth, /signature="[^"]+"/);
  });
});

describe('WebSocket 流程（FakeWS）', () => {
  test('ssb 首帧＋auw 分帧顺序、aus/status、最终分', async () => {
    stubWS();
    const pcm = new Uint8Array(3000);
    const p = M.iflytekAssess(pcm, 'Hello world', env);
    const ws = await waitForWS();
    ws.emit('open', {});
    const frames = ws.sent.map((s) => JSON.parse(s));
    assert.equal(frames[0].common.app_id, 'test-appid');
    assert.equal(frames[0].business.cmd, 'ssb');
    assert.equal(frames[0].business.ent, 'en_vip');
    assert.equal(frames[0].business.category, 'read_sentence');
    assert.equal(frames[0].business.text, '\uFEFFHello world');
    assert.equal(frames[0].data.status, 0);
    assert.deepEqual(frames.slice(1).map((f) => [f.business.cmd, f.business.aus, f.data.status]),
      [['auw', 1, 1], ['auw', 2, 1], ['auw', 4, 2]]);
    assert.equal(frames[1].data.data.length, Math.ceil(1280 / 3) * 4);
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(SAMPLE_XML).toString('base64') } }) });
    const r = await p;
    assert.equal(r.ok, true);
    assert.equal(r.pron, 85.5);
    assert.equal(r.words.length, 2);
  });
  test('服务端错误码直通 iflytek', async () => {
    stubWS();
    const p = M.iflytekAssess(new Uint8Array(1280), 'Hi', env);
    const ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 10165, message: 'param error' }) });
    const r = await p;
    assert.equal(r.ok, false);
    assert.equal(r.error, 'iflytek');
    assert.equal(r.status, 10165);
  });
  test('最终帧前断连返回 network', async () => {
    stubWS();
    const p = M.iflytekAssess(new Uint8Array(1280), 'Hi', env);
    const ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('close', {});
    const r = await p;
    assert.equal(r.error, 'network');
  });
  test('缺任一密钥返回 not_configured，不建连', async () => {
    stubWS();
    const r = await M.iflytekAssess(new Uint8Array(1280), 'Hi', {});
    assert.deepEqual(r, { ok: false, error: 'not_configured' });
    assert.equal(FakeWS.last, null);
  });
});

describe('HTTP 层', () => {
  test('未配密钥返回 200 not_configured（前端友好提示口径）', async () => {
    delete env.IFLYTEK_APPID; delete env.IFLYTEK_API_KEY; delete env.IFLYTEK_API_SECRET;
    const pc = await parentCookie();
    const wav = mkWav(3200);
    const r = await call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent('Hi') }, body: wav });
    assert.equal(r.status, 200);
    assert.equal(r.j.error, 'not_configured');
  });

  test('端到端：FakeWS 评分落库、星级与五星计数', async () => {
    stubWS();
    const grade = M.gradeNumFromLabel(raw.prepare('SELECT grade_label FROM children WHERE id=1').get().grade_label);
    const texts = ['Hello world', 'Good morning', 'Thank you', 'How are you', 'Nice to meet you', 'See you later'];
    for (let i = 0; i < texts.length; i++) {
      raw.prepare(`INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,oak_episode,oak_topic,oak_audio)
        VALUES('oak',?,'英语',?,'["x"]',0,? ,1,0,1,'ep-test','test',?)`).run(grade, texts[i], texts[i], `s00${i}.mp3`);
    }
    const pc = await parentCookie();
    const wav = mkWav(3200);
    const p = call('/api/oak/assess?child_id=1', { method: 'POST', cookie: pc,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(texts[0]) }, body: wav });
    const ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(SAMPLE_XML).toString('base64') } }) });
    const r = await p;
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.pron, 85.5);
    assert.equal(r.j.stars, 5);
    assert.equal(r.j.fiveStarCount, 1);
    assert.equal(r.j.fiveStarTotal, 6);
    const row = raw.prepare('SELECT best_pron FROM oak_assessments WHERE child_id=1').get();
    assert.ok(row);
    assert.equal(row.best_pron, 85.5);
  });
});
