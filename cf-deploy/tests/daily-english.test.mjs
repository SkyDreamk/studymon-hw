/* 每日英语打卡单测：node --test tests/daily-english.test.mjs
 * 覆盖：内容池快照（两孩句数 464/1462、每句 en/zh/双音频齐全、池内 (episode_id, sid) 不重复、
 * 音频均为跟读站原链接、口语 card/video 句带说话人）；每日选题（种子固定：同一天同一孩子恒为同一 5 句、5 句互不重复、
 * 次日换批、两孩池子互不串、未知年级 fail-closed 不编句子）；内容分工（2026-11-13：每日英语只取课本句、
 * 口语归 Oak；混选器口语不足时用课本句补满不崩）；打卡接口（首次记完成、
 * 同一天重复点只记一次、未登录拒绝、跨孩拒绝；完成打卡发 1 次养成转盘机会（每孩每天 1 次、
 * 重复打卡不重发）；v1 不加经验（打卡前后 total_xp 不变）。
 * 不部署、不碰 staging D1；不消耗真实打卡记录（内存库）。
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql', '0043_pet_instances_ability.sql'];

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
  // 夹具孩子密码（与 access.test 同一做法）：家长登录后经设置接口下发
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

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200, `child ${id} 登录应成功：${JSON.stringify(r.j)}`);
  return r.cookie;
}

// 取当日 5 句 sid 键（episodeId:sid）
async function todayKeys(childId, cookie) {
  const r = await call('/api/daily-english?child_id=' + childId, { cookie });
  assert.equal(r.j.ok, true);
  return { date: r.j.date, sentences: r.j.sentences, keys: r.j.sentences.map((s) => M.dailyEnglishSidKey(s)) };
}
// 直接往 daily_english_assessments 插成绩（绕过评测管线，专测打卡门禁）
function seedScores(childId, date, keys, bests) {
  const now = Math.floor(Date.now() / 1000);
  keys.forEach((k, i) => {
    raw.prepare('INSERT INTO daily_english_assessments(child_id, sid, date_shanghai, best_pron, attempts, updated_epoch) VALUES(?,?,?,?,?,?)')
      .run(childId, k, date, bests[i], 1, now);
  });
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
// FakeWS（照抄 iflytek-oak.test.mjs 的手法）：拦截讯飞 WebSocket，喂指定总分的评测结果
class FakeWS {
  constructor(url) { this.url = url; this.sent = []; this.listeners = {}; FakeWS.last = this; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  send(s) { this.sent.push(s); }
  close() {}
  emit(t, ev) { for (const fn of this.listeners[t] || []) fn(ev); }
}
const RealWS = globalThis.WebSocket;
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
    + `<read_sentence beg_pos="0" end_pos="100" content="Hello world" total_score="${score}" accuracy_score="88.0" fluency_score="82.0" integrity_score="100.0" standard_score="80.0">`
    + `<sentence beg_pos="0" end_pos="100" content="Hello world" total_score="${score}">`
    + '<word beg_pos="0" end_pos="50" content="Hello" dp_message="0" total_score="90.0"/>'
    + '<word beg_pos="50" end_pos="100" content="world" dp_message="128" total_score="55.0"/>'
    + '</sentence></read_sentence></FinalResult>';
}

describe('内容池快照（src/data/daily-english.js，源自 work/daily-english-pool.json）', () => {
  test('两孩句数 464/1462，集数 43/54', () => {
    assert.equal(M.DAILY_ENGLISH_POOL.xiaobao.length, 464);
    assert.equal(M.DAILY_ENGLISH_POOL.dabao.length, 1462);
    assert.equal(Object.keys(M.DAILY_ENGLISH_EPISODES).length, 94);
  });
  test('每句 en/zh/双音频齐全，音频均为跟读站原链接', () => {
    for (const [kid, pool] of Object.entries(M.DAILY_ENGLISH_POOL)) {
      for (const s of pool) {
        assert.ok(s.en && s.en.trim(), `${kid} ${s.e}:${s.s} 缺英文`);
        assert.ok(s.zh && s.zh.trim(), `${kid} ${s.e}:${s.s} 缺中文`);
        assert.ok(s.an && s.an.startsWith('https://english.example.com/audio/'), `${kid} ${s.e}:${s.s} 缺常速音频`);
        assert.ok(s.as && s.as.startsWith('https://english.example.com/audio/'), `${kid} ${s.e}:${s.s} 缺慢速音频`);
        assert.ok(M.DAILY_ENGLISH_EPISODES[s.e], `${kid} ${s.e} 无集信息`);
      }
    }
  });
  test('池内 (episode_id, sid) 不重复', () => {
    for (const [kid, pool] of Object.entries(M.DAILY_ENGLISH_POOL)) {
      const keys = pool.map((s) => `${s.e}:${s.s}`);
      assert.equal(new Set(keys).size, keys.length, `${kid} 池内有重复句子`);
    }
  });
  test('口语 card/video 句带说话人，课本句说话人为 null；句带集类型 k', () => {
    for (const [kid, pool] of Object.entries(M.DAILY_ENGLISH_POOL)) {
      for (const s of pool) {
        assert.ok(['textbook', 'card', 'video'].includes(s.k), `${kid} ${s.e}:${s.s} 缺集类型 k`);
        if (s.k === 'card' || s.k === 'video') {
          assert.ok(s.sp && s.sp.trim(), `${kid} ${s.e}:${s.s} 口语句缺说话人`);
        } else {
          assert.equal(s.sp, null, `${kid} ${s.e}:${s.s} 课本句说话人应为 null`);
        }
      }
    }
    assert.equal(M.DAILY_ENGLISH_POOL.xiaobao.filter((s) => s.k === 'card').length, 137, '小宝口语 137 句');
    assert.equal(M.DAILY_ENGLISH_POOL.dabao.filter((s) => s.k === 'card' || s.k === 'video').length, 1137, '大宝口语 1137 句');
  });
});

describe('每日选题（种子 = child_id＋当天日期）', () => {
  const dabao = { id: 1, grade_label: '三年级' };
  const xiaobao = { id: 2, grade_label: '一年级' };
  test('同一天同一孩子恒为同一 5 句，5 句互不重复', () => {
    const a = M.dailyEnglishTodayFor(dabao, '2026-11-07');
    const b = M.dailyEnglishTodayFor(dabao, '2026-11-07');
    assert.deepEqual(a, b);
    assert.equal(a.sentences.length, 5);
    const keys = a.sentences.map((s) => `${s.episodeId}:${s.sid}`);
    assert.equal(new Set(keys).size, 5);
  });
  test('次日换批', () => {
    const a = M.dailyEnglishTodayFor(dabao, '2026-11-07').sentences.map((s) => `${s.episodeId}:${s.sid}`);
    const b = M.dailyEnglishTodayFor(dabao, '2026-11-08').sentences.map((s) => `${s.episodeId}:${s.sid}`);
    assert.notDeepEqual(a, b);
  });
  test('两孩池子互不串：大宝只取 g3 句，小宝只取 g1/starter 句', () => {
    const g3 = new Set(M.DAILY_ENGLISH_POOL.dabao.map((s) => `${s.e}:${s.s}`));
    const g1 = new Set(M.DAILY_ENGLISH_POOL.xiaobao.map((s) => `${s.e}:${s.s}`));
    for (const s of M.dailyEnglishTodayFor(dabao, '2026-11-07').sentences) {
      assert.ok(g3.has(`${s.episodeId}:${s.sid}`), `大宝取到非 g3 句 ${s.episodeId}:${s.sid}`);
    }
    for (const s of M.dailyEnglishTodayFor(xiaobao, '2026-11-07').sentences) {
      assert.ok(g1.has(`${s.episodeId}:${s.sid}`), `小宝取到非 g1 句 ${s.episodeId}:${s.sid}`);
    }
  });
  test('未知年级 fail-closed：不编句子', () => {
    assert.deepEqual(M.dailyEnglishTodayFor({ id: 9, grade_label: '五年级' }, '2026-11-07'), { error: 'NO_POOL' });
    assert.equal(M.dailyEnglishPoolFor(5), null);
    assert.equal(M.dailyEnglishPoolFor(null), null);
  });
  test('池子小于 5 句时全取不崩', () => {
    const tiny = [{ s: 's001', e: 'ep-x', en: 'Hi!', zh: '嗨！', an: 'https://x/a.mp3', as: 'https://x/b.mp3' }];
    const got = M.pickDailyEnglish(tiny, 5, M.mulberry32(1));
    assert.equal(got.length, 1);
  });
  test('mulberry32 确定性：同种子同序列', () => {
    const a = M.mulberry32(42);
    const b = M.mulberry32(42);
    assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
    assert.notEqual(M.mulberry32(1)(), M.mulberry32(2)());
  });
});

describe('内容分工（2026-11-13：每日英语只取课本句，口语归 Oak）', () => {
  const dabao = { id: 1, grade_label: '三年级' };
  const xiaobao = { id: 2, grade_label: '一年级' };
  const isSpoken = (s) => s.type === 'card' || s.type === 'video';
  test('两孩、60 天每天都是 5 句课本、0 口语，5 句互不重复', () => {
    const base = new Date('2026-11-01T00:00:00+08:00');
    for (const child of [dabao, xiaobao]) {
      for (let d = 0; d < 60; d++) {
        const dt = new Date(base.getTime() + d * 86400000);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const got = M.dailyEnglishTodayFor(child, date);
        assert.equal(got.sentences.length, 5, `${child.id} ${date} 应为 5 句`);
        const spoken = got.sentences.filter(isSpoken);
        assert.equal(spoken.length, 0, `${child.id} ${date} 口语应为 0 句，实得 ${spoken.length}：${got.sentences.map((s) => s.type).join(',')}`);
        assert.ok(got.sentences.every((s) => s.type === 'textbook'), `${child.id} ${date} 应全为课本句`);
        assert.equal(new Set(got.sentences.map((s) => `${s.episodeId}:${s.sid}`)).size, 5, `${child.id} ${date} 5 句互不重复`);
      }
    }
  });
  test('课本句说话人为 null（30 天两孩）', () => {
    for (const child of [dabao, xiaobao]) {
      for (let d = 1; d <= 30; d++) {
        const date = `2026-11-${String(d).padStart(2, '0')}`;
        for (const s of M.dailyEnglishTodayFor(child, date).sentences) {
          assert.equal(s.speaker, null, `${child.id} ${date} 课本句说话人应为 null`);
        }
      }
    }
  });
  test('口语池不足时用课本句补满不崩；口语为 0 时全取课本句', () => {
    const mk = (k, i) => ({ s: `s${i}`, e: `ep-${k}-${i}`, k, sp: k === 'textbook' ? null : 'Kenzo', en: 'Hi', zh: '嗨', an: 'https://x/a.mp3', as: 'https://x/b.mp3' });
    const textOnly = [mk('textbook', 1), mk('textbook', 2), mk('textbook', 3), mk('textbook', 4), mk('textbook', 5), mk('textbook', 6)];
    const got0 = M.pickDailyEnglishMixed(textOnly, 5, 2, M.mulberry32(7));
    assert.equal(got0.length, 5, '无口语时补满 5 句');
    assert.equal(got0.filter(M.isDailyEnglishSpoken).length, 0);
    const oneSpoken = [mk('card', 1), ...textOnly];
    const got1 = M.pickDailyEnglishMixed(oneSpoken, 5, 2, M.mulberry32(7));
    assert.equal(got1.length, 5, '仅 1 句口语时补满 5 句');
    assert.equal(got1.filter(M.isDailyEnglishSpoken).length, 1, '仅有的 1 句口语应被选中');
    assert.equal(new Set(got1.map((s) => `${s.e}:${s.s}`)).size, 5, '补满后仍互不重复');
  });
  test('混选器口语数为 0 时全取课本句（DAILY_ENGLISH_SPOKEN_COUNT=0 的实际行为）', () => {
    const got = M.pickDailyEnglishMixed(M.DAILY_ENGLISH_POOL.dabao, 5, 0, M.mulberry32(3));
    assert.equal(got.length, 5);
    assert.equal(got.filter(M.isDailyEnglishSpoken).length, 0);
    assert.equal(new Set(got.map((s) => `${s.e}:${s.s}`)).size, 5);
  });
});

describe('接口 GET /api/daily-english', () => {
  test('大宝取到 5 句 g3，同一天两次相同；小宝取到 g1 句', async () => {
    const c1 = await childCookie(1, '1111');
    const r1 = await call('/api/daily-english?child_id=1', { cookie: c1 });
    assert.equal(r1.status, 200);
    assert.equal(r1.j.ok, true);
    assert.equal(r1.j.sentences.length, 5);
    assert.equal(r1.j.completed, false);
    const g3 = new Set(M.DAILY_ENGLISH_POOL.dabao.map((s) => `${s.e}:${s.s}`));
    for (const s of r1.j.sentences) assert.ok(g3.has(`${s.episodeId}:${s.sid}`));
    const r2 = await call('/api/daily-english?child_id=1', { cookie: c1 });
    assert.deepEqual(r2.j.sentences, r1.j.sentences);
    const c2 = await childCookie(2, '2222');
    const r3 = await call('/api/daily-english?child_id=2', { cookie: c2 });
    assert.equal(r3.j.sentences.length, 5);
    const g1 = new Set(M.DAILY_ENGLISH_POOL.xiaobao.map((s) => `${s.e}:${s.s}`));
    for (const s of r3.j.sentences) assert.ok(g1.has(`${s.episodeId}:${s.sid}`));
  });
  test('未登录拒绝；跨孩拒绝；不存在的孩子 404', async () => {
    const anon = await call('/api/daily-english?child_id=1');
    assert.equal(anon.status, 401);
    assert.equal(anon.j.error, 'NEED_LOGIN');
    const c1 = await childCookie(1, '1111');
    const cross = await call('/api/daily-english?child_id=2', { cookie: c1 });
    assert.equal(cross.status, 403);
    assert.equal(cross.j.error, 'FORBIDDEN');
    const ghostCross = await call('/api/daily-english?child_id=99', { cookie: c1 });
    assert.equal(ghostCross.status, 403, '孩子请求不存在的他人 id 同样先判越权');
    const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    const ghost = await call('/api/daily-english?child_id=99', { cookie: parent.cookie });
    assert.equal(ghost.status, 404);
    assert.equal(ghost.j.error, 'NOT_FOUND');
  });
});

describe('接口 POST /api/daily-english/checkin', () => {
  test('首次记完成、同一天重复点只记一次、GET 后 completed 为 true', async () => {
    const c1 = await childCookie(1, '1111');
    const today = M.shDateStr();
    const { keys } = await todayKeys(1, c1);
    seedScores(1, today, keys, [85, 88, 80, 92, 81]);
    const xpBefore = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    const r1 = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r1.status, 200);
    assert.equal(r1.j.ok, true);
    assert.equal(r1.j.childId, 1);
    assert.equal(r1.j.date, today);
    assert.equal(r1.j.completed, true);
    assert.equal(r1.j.careWheelGranted, true, '首次完成应发 1 次养成转盘机会');
    assert.equal(r1.j.careWheelChances, 1);
    let rows = raw.prepare('SELECT * FROM daily_english_logs WHERE child_id=1 AND date_shanghai=?').all(today);
    assert.equal(rows.length, 1);
    assert.equal(JSON.parse(rows[0].sids).length, 5);
    const r2 = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r2.status, 200);
    assert.equal(r2.j.careWheelGranted, false, '同一天重复打卡不再发养成转盘机会');
    assert.equal(r2.j.careWheelChances, 1, '重复打卡不增发机会');
    rows = raw.prepare('SELECT * FROM daily_english_logs WHERE child_id=1 AND date_shanghai=?').all(today);
    assert.equal(rows.length, 1, '重复打卡不得多记一行');
    const g = await call('/api/daily-english?child_id=1', { cookie: c1 });
    assert.equal(g.j.completed, true);
    const xpAfter = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    assert.equal(xpAfter, xpBefore, 'v1 打卡不加经验');
  });
  test('两孩分开记；未登录拒绝；跨孩拒绝', async () => {
    const c1 = await childCookie(1, '1111');
    const c2 = await childCookie(2, '2222');
    const t1 = await todayKeys(1, c1);
    const t2 = await todayKeys(2, c2);
    seedScores(1, t1.date, t1.keys, [85, 88, 80, 92, 81]);
    seedScores(2, t2.date, t2.keys, [86, 84, 90, 80, 83]);
    await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 2 }, cookie: c2 });
    const n = raw.prepare('SELECT COUNT(*) n FROM daily_english_logs').get().n;
    assert.equal(n, 2);
    const anon = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 } });
    assert.equal(anon.status, 401);
    const cross = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 2 }, cookie: c1 });
    assert.equal(cross.status, 403);
  });
  test('未知年级的孩子打卡返回 NO_POOL，不记行', async () => {
    raw.exec("INSERT INTO children (name, grade_label, line) VALUES ('测试五年级', '五年级', 'pikachu')");
    const id = Number(raw.prepare('SELECT id FROM children WHERE name=?').get('测试五年级').id);
    // 新插孩子无小密码：用家长会话调接口（家长可代任意孩子查）
    const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    assert.equal(parent.status, 200);
    const r = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: id }, cookie: parent.cookie });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'NO_POOL');
    const n = raw.prepare('SELECT COUNT(*) n FROM daily_english_logs WHERE child_id=?').get(id).n;
    assert.equal(n, 0);
  });
});

describe('75 分线口径（2026-11-10，任务 82：75 分＝4 星，全 5 句达标才打卡）', () => {
  test('打卡线是 75 分；75 分显示 4 星、85 分显示 5 星、74 分显示 3 星', () => {
    assert.equal(M.DAILY_ENGLISH_PASS_PRON, 75);
    assert.equal(M.dailyEnglishStarsFromPron(75), 4);
    assert.equal(M.dailyEnglishStarsFromPron(85), 5);
    assert.equal(M.dailyEnglishStarsFromPron(74), 3, '74 分显示 3 星，未达 75 分线');
    assert.equal(M.dailyEnglishStarsFromPron(60), 3);
    // 任务 82：Oak 与每日统一口径（≥75 为 4 星、≥60 为 3 星）。
    assert.equal(M.oakStarsFromPron(79), 4);
    assert.equal(M.oakStarsFromPron(70), 3);
  });
  test('sid 键与打卡日志同一格式 episodeId:sid', () => {
    assert.equal(M.dailyEnglishSidKey({ episodeId: 'ep1', sid: 's3' }), 'ep1:s3');
  });
});

describe('接口 POST /api/daily-english/assess', () => {
  beforeEach(() => {
    env.IFLYTEK_APPID = 'test-appid';
    env.IFLYTEK_API_KEY = 'test-apikey-0123456789abcdef';
    env.IFLYTEK_API_SECRET = 'test-secret-dummy-0123456789abcdef';
  });
  afterEach(() => { globalThis.WebSocket = RealWS; FakeWS.last = null; });

  test('未配密钥返回 200 not_configured', async () => {
    delete env.IFLYTEK_APPID; delete env.IFLYTEK_API_KEY; delete env.IFLYTEK_API_SECRET;
    const c1 = await childCookie(1, '1111');
    const wav = mkWav(3200);
    const r = await callRaw('/api/daily-english/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent('Hi') }, body: wav });
    assert.equal(r.status, 200);
    assert.equal(r.j.error, 'not_configured');
  });
  test('未登录拒绝；跨孩拒绝；ref 不在当日 5 句返回 bad_ref；非 wav 返回 bad_type', async () => {
    const c1 = await childCookie(1, '1111');
    const wav = mkWav(3200);
    const anon = await callRaw('/api/daily-english/assess?child_id=1', { method: 'POST',
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent('Hi') }, body: wav });
    assert.equal(anon.status, 401);
    const cross = await callRaw('/api/daily-english/assess?child_id=2', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent('Hi') }, body: wav });
    assert.equal(cross.status, 403);
    const badRef = await callRaw('/api/daily-english/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent('不在今日 5 句里的英文') }, body: wav });
    assert.equal(badRef.status, 400);
    assert.equal(badRef.j.error, 'bad_ref');
    const { sentences } = await todayKeys(1, c1);
    const badType = await callRaw('/api/daily-english/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'application/json', 'x-ref-text': encodeURIComponent(sentences[0].en) }, body: wav });
    assert.equal(badType.status, 415);
    assert.equal(badType.j.error, 'bad_type');
  });
  test('端到端：FakeWS 评分落库、最好分留存、75 分线与星级', async () => {
    stubWS();
    const c1 = await childCookie(1, '1111');
    const { date, sentences, keys } = await todayKeys(1, c1);
    const ref = sentences[0].en;
    const wav = mkWav(3200);
    // 第一遍 75 分：落库、未达标
    let p = callRaw('/api/daily-english/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(ref) }, body: wav });
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
    p = callRaw('/api/daily-english/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(ref) }, body: wav });
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
    p = callRaw('/api/daily-english/assess?child_id=1', { method: 'POST', cookie: c1,
      headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(ref) }, body: wav });
    ws = await waitForWS();
    ws.emit('open', {});
    ws.emit('message', { data: JSON.stringify({ code: 0, sid: 't', data: { status: 2, data: Buffer.from(xmlForScore(70)).toString('base64') } }) });
    r = await p;
    assert.equal(r.j.best, 82, '重录低分不覆盖最好分');
    assert.equal(r.j.attempts, 3);
    assert.equal(r.j.passed, true);
    const row = raw.prepare('SELECT best_pron, attempts FROM daily_english_assessments WHERE child_id=1 AND sid=? AND date_shanghai=?').get(keys[0], date);
    assert.equal(row.best_pron, 82);
    assert.equal(row.attempts, 3);
  });
});

describe('打卡门禁：5 句 best 全 ≥75 才记完成（2026-11-10，任务 82）', () => {
  test('无成绩打卡被拒，missing 列出 5 句，不记日志、不发转盘机会', async () => {
    const c1 = await childCookie(1, '1111');
    const r = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, false);
    assert.equal(r.j.error, 'NOT_PASSED');
    assert.equal(r.j.missing.length, 5);
    assert.deepEqual(r.j.missing.map((m) => m.index), [1, 2, 3, 4, 5]);
    assert.ok(r.j.missing.every((m) => m.best === null));
    const n = raw.prepare('SELECT COUNT(*) n FROM daily_english_logs WHERE child_id=1').get().n;
    assert.equal(n, 0, '被拒不记日志');
    const w = raw.prepare('SELECT COUNT(*) n FROM care_wheel_chances WHERE child_id=1').get().n;
    assert.equal(w, 0, '被拒不发转盘机会');
  });
  test('4 句达标、1 句 74 分：被拒，missing 只列那 1 句', async () => {
    const c1 = await childCookie(1, '1111');
    const { date, keys } = await todayKeys(1, c1);
    seedScores(1, date, keys, [88, 90, 82, 80, 74]);
    const r = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r.j.ok, false);
    assert.equal(r.j.error, 'NOT_PASSED');
    assert.equal(r.j.missing.length, 1);
    assert.equal(r.j.missing[0].index, 5);
    assert.equal(r.j.missing[0].best, 74);
  });
  test('边界：best 恰 75 通过、74 不通过', async () => {
    const c1 = await childCookie(1, '1111');
    const { date, keys } = await todayKeys(1, c1);
    seedScores(1, date, keys, [75, 75, 75, 75, 74]);
    let r = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r.j.ok, false);
    assert.equal(r.j.missing.length, 1);
    assert.equal(r.j.missing[0].index, 5);
    raw.prepare('UPDATE daily_english_assessments SET best_pron=75 WHERE child_id=1 AND sid=? AND date_shanghai=?').run(keys[4], date);
    r = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.completed, true);
  });
  test('5 句全达标才记日志并发机会，重复打卡不重发', async () => {
    const c1 = await childCookie(1, '1111');
    const { date, keys } = await todayKeys(1, c1);
    seedScores(1, date, keys, [85, 88, 80, 92, 81]);
    const r1 = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r1.j.ok, true);
    assert.equal(r1.j.careWheelGranted, true);
    assert.equal(r1.j.careWheelChances, 1);
    const r2 = await call('/api/daily-english/checkin', { method: 'POST', body: { childId: 1 }, cookie: c1 });
    assert.equal(r2.j.ok, true);
    assert.equal(r2.j.careWheelGranted, false);
    assert.equal(r2.j.careWheelChances, 1);
  });
  test('GET 返回每句最好分与达标态', async () => {
    const c1 = await childCookie(1, '1111');
    const { date, keys } = await todayKeys(1, c1);
    seedScores(1, date, keys, [88, 74, 80, 60, 95]);
    const r = await call('/api/daily-english?child_id=1', { cookie: c1 });
    assert.equal(r.j.ok, true);
    assert.equal(Object.keys(r.j.scores).length, 5);
    assert.equal(r.j.scores[keys[0]].best, 88);
    assert.equal(r.j.scores[keys[0]].passed, true);
    assert.equal(r.j.scores[keys[1]].best, 74);
    assert.equal(r.j.scores[keys[1]].passed, false);
    assert.equal(r.j.scores[keys[2]].best, 80);
    assert.equal(r.j.scores[keys[2]].passed, true);
  });
});
