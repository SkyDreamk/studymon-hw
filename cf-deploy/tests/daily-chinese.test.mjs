/* 每日语文朗读单测：node --test tests/daily-chinese.test.mjs
 * 覆盖：内容池快照（16 篇：一年级 6 篇、三年级 10 首；id 唯一无空白、text ≤200 字、kind/grade 齐全）；
 * 每日选题（种子固定：同一天同一孩子恒为同一篇、两孩池子互不串、未知年级 fail-closed）；
 * 中文评测管线参数（讯飞首帧 business.ent='cn_vip'；Azure 直连 language=zh-CN；不传 opts 默认 en-US）；
 * 评测端点（未配密钥 not_configured、未登录/跨孩拒绝、ref 不在当日篇目 bad_ref、非 wav bad_type、
 * FakeWS 评分落库、最好分留存、75 分线与星级（2026-11-10，任务 82）；
 * 打卡门禁（无成绩/未达 75 分不记日志、不发转盘机会；75 分达标记完成并发 1 次养成转盘机会，重复打卡不重发）。
 * 不部署、不碰 staging D1；不消耗真实打卡记录（内存库）。
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql', '0030_daily_chinese.sql'];

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
beforeEach(async () => {
  ({ env, raw } = makeEnv());
  const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(parent.status, 200);
  const set = await call('/api/parent/settings/update', {
    method: 'POST', cookie: parent.cookie,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
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

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200, `child ${id} 登录应成功：${JSON.stringify(r.j)}`);
  return r.cookie;
}

// 取当日篇目
async function todayItem(childId, cookie) {
  const r = await call('/api/daily-chinese?child_id=' + childId, { cookie });
  assert.equal(r.j.ok, true);
  return { date: r.j.date, item: r.j.item };
}
// 直接往 daily_chinese_assessments 插成绩（绕过评测管线，专测打卡门禁）
function seedScore(childId, date, itemId, best) {
  const now = Math.floor(Date.now() / 1000);
  raw.prepare('INSERT INTO daily_chinese_assessments(child_id, item_id, date_shanghai, best_pron, attempts, updated_epoch) VALUES(?,?,?,?,?,?)')
    .run(childId, itemId, date, best, 1, now);
}
function wheelChances(childId, source) {
  return raw.prepare('SELECT COUNT(*) n FROM care_wheel_chances WHERE child_id=? AND source=?').get(childId, source).n;
}
// 二进制请求（评测端点传 WAV 用）
async function callRaw(path, { method = 'POST', body, cookie, headers = {} } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers: h, body: body !== undefined ? body : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}
// FakeWS（照抄 daily-english.test.mjs 的手法）：拦截讯飞 WebSocket，喂指定总分的评测结果
class FakeWS {
  constructor(url) { this.url = url; this.sent = []; this.listeners = {}; FakeWS.last = this; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  send(s) { this.sent.push(s); }
  close() {}
  emit(t, ev) { for (const fn of this.listeners[t] || []) fn(ev); }
}
const RealWS = globalThis.WebSocket;
const RealFetch = globalThis.fetch;
function stubWS() { FakeWS.last = null; globalThis.WebSocket = FakeWS; }
async function waitForWS() {
  for (let i = 0; i < 100 && !FakeWS.last; i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(FakeWS.last, 'WebSocket 应已创建');
  return FakeWS.last;
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
function xmlForScore(score) {
  return '<?xml version="1.0" encoding="utf-8" ?>'
    + '<FinalResult><ret value="0"/>'
    + `<read_sentence beg_pos="0" end_pos="100" content="鹅鹅鹅" total_score="${score}" accuracy_score="88.0" fluency_score="82.0" integrity_score="100.0" standard_score="80.0">`
    + `<sentence beg_pos="0" end_pos="100" content="鹅鹅鹅" total_score="${score}">`
    + '<word beg_pos="0" end_pos="50" content="鹅" dp_message="0" total_score="90.0"/>'
    + '<word beg_pos="50" end_pos="100" content="鹅" dp_message="128" total_score="55.0"/>'
    + '</sentence></read_sentence></FinalResult>';
}
const AZURE_OK = {
  RecognitionStatus: 'Success',
  NBest: [{
    PronunciationAssessment: { PronScore: 88.4, AccuracyScore: 90, FluencyScore: 85.5, CompletenessScore: 100, ProsodyScore: 78.2 },
    Words: [
      { Word: '鹅', PronunciationAssessment: { AccuracyScore: 92, ErrorType: 'None' } },
      { Word: '鹅', PronunciationAssessment: { AccuracyScore: 55, ErrorType: 'Mispronunciation' } },
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

describe('内容池快照（src/data/daily-chinese.js，课本原文核对）', () => {
  test('共 16 篇：一年级 6 篇、三年级 10 首', () => {
    assert.equal(M.DAILY_CHINESE_POOL.xiaobao.length, 6);
    assert.equal(M.DAILY_CHINESE_POOL.dabao.length, 10);
  });
  test('每篇 id/title/author/unit/text/kind 齐全，id 无空白、text ≤200 字', () => {
    for (const [key, pool] of Object.entries(M.DAILY_CHINESE_POOL)) {
      for (const it of pool) {
        assert.ok(it.id && !/\s/.test(it.id), `${key} ${it.id} id 含空白`);
        assert.ok(it.title && it.title.trim(), `${key} ${it.id} 缺标题`);
        assert.ok(typeof it.author === 'string', `${key} ${it.id} 缺作者字段`);
        if (it.kind === 'poem') assert.ok(it.author.trim(), `${key} ${it.id} 古诗缺作者`);
        assert.ok(it.unit && it.unit.trim(), `${key} ${it.id} 缺单元`);
        assert.ok(it.text && it.text.trim(), `${key} ${it.id} 缺正文`);
        assert.ok(it.text.length <= 200, `${key} ${it.id} 正文超 200 字`);
        assert.ok(['poem', 'passage'].includes(it.kind), `${key} ${it.id} kind 非法`);
      }
    }
  });
  test('池内 id 不重复；一年级池 id 全为 g1- 前缀、三年级池全为 g3- 前缀', () => {
    const ids = [...M.DAILY_CHINESE_POOL.xiaobao, ...M.DAILY_CHINESE_POOL.dabao].map((it) => it.id);
    assert.equal(new Set(ids).size, ids.length, '池内有重复 id');
    assert.ok(M.DAILY_CHINESE_POOL.xiaobao.every((it) => it.id.startsWith('g1-')));
    assert.ok(M.DAILY_CHINESE_POOL.dabao.every((it) => it.id.startsWith('g3-')));
  });
  test('三年级 5 首期中复习已核对篇目在池内（夜书所见/望洞庭/山行/所见/舟夜书所见）', () => {
    const titles = M.DAILY_CHINESE_POOL.dabao.map((it) => it.title);
    for (const t of ['夜书所见', '望洞庭', '山行', '所见', '舟夜书所见']) assert.ok(titles.includes(t), `缺 ${t}`);
  });
});

describe('每日选题（种子 child_id＋当天日期）', () => {
  test('同一天同一孩子恒为同一篇；两孩池子互不串', () => {
    const dabao = { id: 1, grade_label: '三年级' };
    const xiaobao = { id: 2, grade_label: '一年级' };
    const a = M.dailyChineseTodayFor(dabao, '2026-11-09');
    const b = M.dailyChineseTodayFor(dabao, '2026-11-09');
    assert.equal(a.item.id, b.item.id, '同孩同日应恒为同一篇');
    assert.ok(a.item.id.startsWith('g3-'), '大宝应取三年级池');
    const c = M.dailyChineseTodayFor(xiaobao, '2026-11-09');
    assert.ok(c.item.id.startsWith('g1-'), '小宝应取一年级池');
    assert.notEqual(a.item.id, c.item.id, '两孩当日篇目不应相同（池子互不串）');
  });
  test('30 天内轮换覆盖池子多篇，不卡在同一篇', () => {
    const dabao = { id: 1, grade_label: '三年级' };
    const seen = new Set();
    for (let d = 1; d <= 30; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      seen.add(M.dailyChineseTodayFor(dabao, date).item.id);
    }
    assert.ok(seen.size >= 5, `30 天应覆盖多篇，实际只覆盖 ${seen.size} 篇`);
  });
  test('未知年级 fail-closed：返回 NO_POOL，不编篇目', () => {
    assert.equal(M.dailyChineseTodayFor({ id: 9, grade_label: '五年级' }, '2026-11-09').error, 'NO_POOL');
    assert.equal(M.dailyChineseTodayFor({ id: 9, grade_label: '' }, '2026-11-09').error, 'NO_POOL');
  });
  test('75 分线与星级：85→5、75→4、74→3、60→3、40→2、39→1', () => {
    assert.equal(M.DAILY_CHINESE_PASS_PRON, 75);
    assert.equal(M.dailyChineseStarsFromPron(85), 5);
    assert.equal(M.dailyChineseStarsFromPron(75), 4);
    assert.equal(M.dailyChineseStarsFromPron(74), 3, '74 分显示 3 星，未达 75 分线');
    assert.equal(M.dailyChineseStarsFromPron(60), 3);
    assert.equal(M.dailyChineseStarsFromPron(40), 2);
    assert.equal(M.dailyChineseStarsFromPron(39), 1);
  });
});

describe('接口 GET /api/daily-chinese', () => {
  test('返回当日篇目、未完成、score null、转盘机会 0', async () => {
    const c1 = await childCookie(1, '0000');
    const r = await call('/api/daily-chinese?child_id=1', { cookie: c1 });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.ok(r.j.item && r.j.item.id, '应返回当日篇目');
    assert.ok(r.j.item.id.startsWith('g3-'), '大宝当日篇目应为三年级');
    assert.equal(r.j.completed, false);
    assert.equal(r.j.score, null);
    assert.equal(r.j.careWheelChances, 0);
  });
  test('未登录 401；跨孩 403', async () => {
    const anon = await call('/api/daily-chinese?child_id=1');
    assert.equal(anon.status, 401);
    const c1 = await childCookie(1, '0000');
    const cross = await call('/api/daily-chinese?child_id=2', { cookie: c1 });
    assert.equal(cross.status, 403);
  });
});

describe('中文评测管线参数（讯飞 cn_vip / Azure zh-CN）', () => {
  afterEach(() => { globalThis.WebSocket = RealWS; globalThis.fetch = RealFetch; FakeWS.last = null; });

  test('讯飞首帧 business.ent 为 cn_vip（中文），不是 en_vip', async () => {
    stubWS();
    env.IFLYTEK_APPID = 'test-appid'; env.IFLYTEK_API_KEY = 'test-apikey-fedcba9876543210'; env.IFLYTEK_API_SECRET = 'test-secret-dummy-fedcba9876543210';
    const c1 = await childCookie(1, '0000');
    const { item } = await todayItem(1, c1);
    const wav = mkWav(3200);
    const p = callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    const ws = await waitForWS();
    ws.emit('open', {});
    const first = JSON.parse(ws.sent[0]);
    assert.equal(first.business.ent, 'cn_vip', '中文评测讯飞 ent 应为 cn_vip');
    assert.equal(first.business.category, 'read_sentence');
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xmlForScore(82)).toString('base64') } }) });
    const r = await p;
    assert.equal(r.j.ok, true);
    assert.equal(r.j.provider, 'iflytek');
  });
  test('Azure 直连：传 { lang: "zh" } 时 URL language=zh-CN；不传时默认 en-US', async () => {
    env.AZURE_SPEECH_KEY = 'test-azure-key';
    const calls = stubFetch(async () => ({ status: 200, json: async () => AZURE_OK }));
    const zh = await M.azureAssess(new Uint8Array(3200), '鹅鹅鹅', env, { lang: 'zh' });
    assert.equal(zh.ok, true);
    assert.ok(calls[0].url.includes('language=zh-CN'), `中文应走 zh-CN，实际 URL：${calls[0].url}`);
    const en = await M.azureAssess(new Uint8Array(3200), 'Hello world', env);
    assert.equal(en.ok, true);
    assert.ok(calls[1].url.includes('language=en-US'), `默认应走 en-US，实际 URL：${calls[1].url}`);
  });
});

describe('接口 POST /api/daily-chinese/assess', () => {
  beforeEach(() => {
    env.IFLYTEK_APPID = 'test-appid';
    env.IFLYTEK_API_KEY = 'test-apikey-fedcba9876543210';
    env.IFLYTEK_API_SECRET = 'test-secret-dummy-fedcba9876543210';
  });
  afterEach(() => { globalThis.WebSocket = RealWS; FakeWS.last = null; });

  test('未配密钥返回 200 not_configured', async () => {
    delete env.IFLYTEK_APPID; delete env.IFLYTEK_API_KEY; delete env.IFLYTEK_API_SECRET;
    const c1 = await childCookie(1, '0000');
    const { item } = await todayItem(1, c1);
    const wav = mkWav(3200);
    const r = await callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    assert.equal(r.status, 200);
    assert.equal(r.j.error, 'not_configured');
  });
  test('未登录拒绝；跨孩拒绝；ref 不在当日篇目返回 bad_ref；非 wav 返回 bad_type', async () => {
    const c1 = await childCookie(1, '0000');
    const { item } = await todayItem(1, c1);
    const wav = mkWav(3200);
    const anon = await callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST',
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    assert.equal(anon.status, 401);
    const cross = await callRaw('/api/daily-chinese/assess?child_id=2', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    assert.equal(cross.status, 403);
    const badRef = await callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent('不在当日篇目里的中文') }, body: wav });
    assert.equal(badRef.status, 400);
    assert.equal(badRef.j.error, 'bad_ref');
    const badType = await callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'application/json', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    assert.equal(badType.status, 415);
    assert.equal(badType.j.error, 'bad_type');
  });
  test('端到端：FakeWS 评分落库、最好分留存、75 分线与星级', async () => {
    stubWS();
    const c1 = await childCookie(1, '0000');
    const { date, item } = await todayItem(1, c1);
    const wav = mkWav(3200);
    // 第一遍 75 分：落库、未达标
    let p = callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    let ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xmlForScore(75)).toString('base64') } }) });
    let r = await p;
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.pron, 75);
    assert.equal(r.j.stars, 4, '75 分显示 4 星，达 75 分线');
    assert.equal(r.j.best, 75);
    assert.equal(r.j.attempts, 1);
    assert.equal(r.j.passed, true, '75 分达 75 分线');
    assert.equal(r.j.provider, 'iflytek');
    // 第二遍 82 分：最好分更新为 82、尝试次数 2、达标
    stubWS();
    p = callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xmlForScore(82)).toString('base64') } }) });
    r = await p;
    assert.equal(r.j.ok, true);
    assert.equal(r.j.pron, 82);
    assert.equal(r.j.best, 82);
    assert.equal(r.j.attempts, 2);
    assert.equal(r.j.passed, true, '82 分达 75 分线');
    // 第三遍 70 分：最好分仍是 82（不回退）、尝试次数 3
    stubWS();
    p = callRaw('/api/daily-chinese/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(item.text) }, body: wav });
    ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xmlForScore(70)).toString('base64') } }) });
    r = await p;
    assert.equal(r.j.best, 82, '重录低分不覆盖最好分');
    assert.equal(r.j.attempts, 3);
    assert.equal(r.j.passed, true);
    const row = raw.prepare('SELECT best_pron, attempts FROM daily_chinese_assessments WHERE child_id=1 AND item_id=? AND date_shanghai=?').get(item.id, date);
    assert.equal(row.best_pron, 82);
    assert.equal(row.attempts, 3);
  });
});

describe('打卡门禁：best ≥75 才记完成（2026-11-10，任务 82）', () => {
  test('无成绩打卡被拒，不记日志、不发转盘机会', async () => {
    const c1 = await childCookie(1, '0000');
    const r = await call('/api/daily-chinese/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, false);
    assert.equal(r.j.error, 'NOT_PASSED');
    assert.equal(r.j.best, null);
    const log = raw.prepare('SELECT COUNT(*) n FROM daily_chinese_logs WHERE child_id=1').get();
    assert.equal(log.n, 0, '未达标不应记日志');
    assert.equal(wheelChances(1, 'daily-chinese'), 0, '未达标不应发转盘机会');
  });
  test('74 分打卡被拒，不记日志、不发转盘机会', async () => {
    const c1 = await childCookie(1, '0000');
    const { date, item } = await todayItem(1, c1);
    seedScore(1, date, item.id, 74);
    const r = await call('/api/daily-chinese/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, false);
    assert.equal(r.j.error, 'NOT_PASSED');
    assert.equal(r.j.best, 74);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM daily_chinese_logs WHERE child_id=1').get().n, 0);
    assert.equal(wheelChances(1, 'daily-chinese'), 0);
  });
  test('75 分打卡成功：记日志、发 1 次养成转盘机会；重复打卡不重发', async () => {
    const c1 = await childCookie(1, '0000');
    const { date, item } = await todayItem(1, c1);
    seedScore(1, date, item.id, 75);
    const r = await call('/api/daily-chinese/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.completed, true);
    // GET 复核：已完成、成绩 75 分
    const g = await call('/api/daily-chinese?child_id=1', { cookie: c1 });
    assert.equal(g.j.completed, true);
    assert.equal(g.j.score.best, 75);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM daily_chinese_logs WHERE child_id=1 AND date_shanghai=?').get(date).n, 1, '达标应记日志');
    assert.equal(wheelChances(1, 'daily-chinese'), 1, '达标应发 1 次养成转盘机会');
    // 重复打卡：不重记、不重发
    const r2 = await call('/api/daily-chinese/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r2.j.ok, true);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM daily_chinese_logs WHERE child_id=1 AND date_shanghai=?').get(date).n, 1);
    assert.equal(wheelChances(1, 'daily-chinese'), 1, '重复打卡不应重发机会');
  });
  test('打卡不加经验（total_xp 不变）', async () => {
    const c1 = await childCookie(1, '0000');
    const { date, item } = await todayItem(1, c1);
    const before = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    seedScore(1, date, item.id, 90);
    await call('/api/daily-chinese/checkin', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const after = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    assert.equal(after, before, '每日语文打卡不应加经验');
  });
});
