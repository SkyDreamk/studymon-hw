/* 大木博士每日英语单测：node --test tests/oak.test.mjs */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const OAK_BUNDLE = new Set(readdirSync(new URL('../public/static/audio/oak', import.meta.url), 'utf8'));

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

async function assessFixture() {
  const cookie = await parentCookie();
  const today = await call('/api/oak/today?child_id=1', { cookie });
  assert.equal(today.status, 200);
  const ref = today.j.sentences[0].en;
  return { cookie, body: mkWavBody(2000),
    headers: { 'Content-Type': 'audio/wav', 'x-ref-text': encodeURIComponent(ref) } };
}

/* mock 讯飞点评：首帧后自动回指定消息（真实讯飞调用 0 次）。
 * reply 为字符串时当最终 XML 回；为对象时当原始消息 JSON 回（错误码用）。 */
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

const assessXml = '<?xml version="1.0" encoding="utf-8" ?>'
  + '<FinalResult><ret value="0"/>'
  + '<read_sentence content="x" total_score="81.26" accuracy_score="82" fluency_score="83" integrity_score="84" standard_score="85">'
  + '<sentence content="x" total_score="81.26">'
  + '<word content="Hello" dp_message="0" total_score="55"/>'
  + '<word content="world" dp_message="16"/>'
  + '</sentence></read_sentence></FinalResult>';
const assessExpected = { ok: true, pron: 81.3, acc: 82, flu: 83, comp: 84, pros: 85, provider: 'iflytek',
  stars: 4, fiveStarCount: 0, fourStarCount: 1, fiveStarTotal: 6, assessedCount: 1, drawGranted: false, justGranted: false,
  /* MP-15 §2：assess 回包新增 completed/xpAwarded/listenedCount；单句跟读、未听时不完成、不发经验。 */
  completed: false, xpAwarded: 0, listenedCount: 0,
  words: [{ w: 'Hello', score: 55, err: 'None' }, { w: 'world', score: null, err: 'Omission' }] };
const assessPath = '/api/oak/assess?child_id=1';

/* MP-15 §2：按指定 pron 点评某句（mock 讯飞回指定 total_score 的 XML）。 */
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

test('oak assess: missing key', async () => {
  const r = await callRaw(assessPath, await assessFixture());
  // 未配 key 回 200 + ok:false（不用 503）：前端在 !response.ok 时直接抛通用报错、读不到 body，
  // 友好提示“AI 点评还没开通”永远走不到；与 not_recognized 的 200 惯例一致。
  assert.equal(r.status, 200);
  assert.equal(r.j.ok, false);
  assert.equal(r.j.error, 'not_configured');
});

test('oak assess: rejects non-WAV', async () => {
  const f = await assessFixture();
  setIflytekEnv();
  f.headers['Content-Type'] = 'application/json';
  const r = await callRaw(assessPath, f);
  assert.equal(r.status, 415);
  assert.equal(r.j.error, 'bad_type');
});

test('oak assess: rejects missing, empty, long and malformed refs', async () => {
  const f = await assessFixture();
  setIflytekEnv();
  for (const ref of [undefined, '', 'x'.repeat(201), '%', ' ']) {
    const headers = { ...f.headers };
    if (ref === undefined) delete headers['x-ref-text'];
    else headers['x-ref-text'] = ref;
    const r = await callRaw(assessPath, { ...f, headers });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'bad_ref');
  }
});

test('oak assess: rejects short audio', async () => {
  setIflytekEnv();
  const r = await callRaw(assessPath, { ...await assessFixture(), body: new Uint8Array(10) });
  assert.equal(r.status, 413);
  assert.equal(r.j.error, 'bad_size');
});

test('oak assess: scores and words', async () => {
  setIflytekEnv();
  const f = await assessFixture();
  await withIflytek(assessXml, async () => {
    const r = await callRaw(assessPath, f);
    assert.equal(r.status, 200);
    assert.deepEqual(r.j, assessExpected);
  });
});

test('oak assess: words dp_message mapping', async () => {
  setIflytekEnv();
  const f = await assessFixture();
  const xml = '<?xml version="1.0" encoding="utf-8" ?>'
    + '<FinalResult><ret value="0"/>'
    + '<read_sentence content="x" total_score="90" accuracy_score="90" fluency_score="90" integrity_score="100" standard_score="90">'
    + '<sentence content="x" total_score="90">'
    + '<word content="a" dp_message="0" total_score="80"/>'
    + '<word content="b" dp_message="16" total_score="70"/>'
    + '<word content="c" dp_message="32" total_score="60"/>'
    + '<word content="d" dp_message="64" total_score="50"/>'
    + '<word content="e" dp_message="128" total_score="40"/>'
    + '</sentence></read_sentence></FinalResult>';
  await withIflytek(xml, async () => {
    const r = await callRaw(assessPath, f);
    assert.equal(r.status, 200);
    assert.deepEqual(r.j.words, [
      { w: 'a', score: 80, err: 'None' },
      { w: 'b', score: 70, err: 'Omission' },
      { w: 'c', score: 60, err: 'Insertion' },
      { w: 'd', score: 50, err: 'Repetition' },
      { w: 'e', score: 40, err: 'Mispronunciation' },
    ]);
  });
});

test('oak assess: no total score', async () => {
  setIflytekEnv();
  const f = await assessFixture();
  await withIflytek('<FinalResult><ret value="0"/></FinalResult>', async () => {
    const r = await callRaw(assessPath, f);
    assert.equal(r.status, 200);
    assert.equal(r.j.error, 'not_recognized');
  });
});

test('oak assess: iflytek error code', async () => {
  setIflytekEnv();
  const f = await assessFixture();
  await withIflytek({ code: 10165, message: 'param error' }, async () => {
    const r = await callRaw(assessPath, f);
    assert.equal(r.status, 502);
    assert.equal(r.j.error, 'iflytek');
    assert.equal(r.j.status, 10165);
  });
});

test('oak assess: only exact daily references', async () => {
  setIflytekEnv();
  const f = await assessFixture();
  for (const ref of ['This is not a daily sentence.', decodeURIComponent(f.headers['x-ref-text']) + ' ']) {
    const r = await callRaw(assessPath, { ...f,
      headers: { ...f.headers, 'x-ref-text': encodeURIComponent(ref) } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'bad_ref');
  }
});

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}
test('oak assess: parent setting defaults on and follows updates', async () => {
  const cookie = await parentCookie();
  assert.equal((await call('/api/parent/settings', { cookie })).j.settings.oakAssess, true);
  assert.equal((await call('/api/oak/today?child_id=1', { cookie })).j.assessEnabled, true);
  for (const oakAssess of [false, true]) {
    // 全站开关需 settings.global 权限：旧版（无账号）家长会话改不了（403，值不变）；开关值直接写库后验证读取跟随
    const denied = await call('/api/parent/settings/update', { method: 'POST', cookie, body: { oakAssess } });
    assert.equal(denied.status, 403);
    raw.prepare("INSERT INTO settings(key,value) VALUES('oak_assess',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(oakAssess ? '1' : '0');
    assert.equal((await call('/api/parent/settings', { cookie })).j.settings.oakAssess, oakAssess);
    assert.equal((await call('/api/oak/today?child_id=1', { cookie })).j.assessEnabled, oakAssess);
  }
});

test('oak assess: child cannot update parent settings', async () => {
  const parent = await parentCookie();
  await call('/api/parent/settings/update', { method: 'POST', cookie: parent,
    body: { childPasswords: [{ id: 1, password: '4321' }] } });
  const cookie = await childCookie(1, '4321');
  const r = await call('/api/parent/settings/update', { method: 'POST', cookie, body: { oakAssess: false } });
  assert.ok(r.status === 403 || r.j.error === 'NEED_PIN');
  assert.equal((await call('/api/parent/settings', { cookie: parent })).j.settings.oakAssess, true);
});

test('oak assess: successful assessment writes no progress or XP', async () => {
  setIflytekEnv();
  const f = await assessFixture();
  const count = () => raw.prepare('SELECT COUNT(*) AS n FROM quiz_attempts').get().n;
  const xp = () => raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
  const before = { count: count(), xp: xp() };
  const today = (await call('/api/oak/today?child_id=1', { cookie: f.cookie })).j;
  await withIflytek(assessXml, async () => {
    const r = await callRaw(assessPath, f);
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
  });
  assert.deepEqual({ count: count(), xp: xp() }, before);
  const after = (await call('/api/oak/today?child_id=1', { cookie: f.cookie })).j;
  assert.equal(after.listenedCount, today.listenedCount);
  assert.equal(after.xpAwardedToday, today.xpAwardedToday);
});

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

/* 真实上海日期（不能用 M.shDateStr——它读的是模块内虚拟时钟，拨过一次后基准会漂移） */
function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
/* 把虚拟日期拨到「从今天起最近的某个星期几」（0=周日 … 6=周六），返回该日期与该周周一 */
function gotoWeekday(targetDow) {
  const todayStr = realTodayStr();
  const [y, m, d] = todayStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (targetDow - dow + 7) % 7;
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(delta));
  const dateStr = M.addDays(todayStr, delta);
  return { dateStr, weekStart: M.weekStartMon(dateStr) };
}
function seedApprovedDays(childId, weekStart, n = 4) {
  for (let i = 0; i < n; i++) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, M.addDays(weekStart, i));
  }
}
function setXp(childId, xp) { raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(xp, childId); }
function giveDex(childId, key) {
  raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,'2026-01-01')").run(childId, key);
}

/* 以下为 Oak 用例辅助函数；表名、列名由实际迁移读取，不修改 harness。 */
function ident(name) {
  return '"' + name.replaceAll('"', '""') + '"';
}

function tableNames() {
  return raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all().map(r => r.name);
}

function columns(table) {
  return raw.prepare(`PRAGMA table_info(${ident(table)})`).all();
}

function questionTable() {
  const matches = tableNames().filter(name => {
    const names = new Set(columns(name).map(c => c.name));
    return names.has('kind') && names.has('oak_episode');
  });
  assert.equal(matches.length, 1, '应有唯一包含 Oak 字段的题库表');
  return matches[0];
}

function oakRows(grade) {
  const table = ident(questionTable());
  return grade === undefined
    ? raw.prepare(`SELECT * FROM ${table} WHERE kind='oak' ORDER BY id`).all()
    : raw.prepare(`SELECT * FROM ${table} WHERE kind='oak' AND grade=? ORDER BY id`).all(grade);
}

function episodePool(grade) {
  return [...new Set(oakRows(grade).map(r => r.oak_episode))].sort();
}

function questionById(id) {
  return raw.prepare(`SELECT * FROM ${ident(questionTable())} WHERE id=?`).get(id);
}

function nonempty(value, label) {
  assert.equal(typeof value, 'string', label);
  assert.ok(value.trim().length > 0, label);
}

function childXp(id) {
  return raw.prepare('SELECT total_xp FROM children WHERE id=?').get(id).total_xp;
}

/* 同时覆盖这些状态以独立表或 children 字段存储的情况。 */
function protectedState() {
  const tables = tableNames();
  const childColumns = columns('children').map(c => c.name);
  const snapshot = {};

  for (const name of ['quiz_correct_total', 'quiz_fragments', 'balls']) {
    let found = false;
    if (tables.includes(name)) {
      snapshot[name + ':table'] = raw.prepare(`SELECT * FROM ${ident(name)}`).all();
      found = true;
    }
    if (childColumns.includes(name)) {
      snapshot[name + ':children'] = raw.prepare(
        `SELECT id, ${ident(name)} FROM children ORDER BY id`
      ).all();
      found = true;
    }
    assert.ok(found, `迁移应提供 ${name} 状态`);
  }

  assert.ok(tables.includes('encounters'), '迁移应提供 encounters 表');
  snapshot.encounters = raw.prepare('SELECT * FROM encounters').all();
  return snapshot;
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

async function finishEpisode(cookie, childId, today) {
  for (const sentence of today.sentences) {
    const r = await listen(cookie, childId, sentence.id);
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
  }
}

/* 直接插一条已听记录作防守题池 fixture（与 apiOakListen 同款列口径）。 */
function seedOakAttempt(childId, questionId, date) {
  raw.prepare(
    `INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
     VALUES(?,?,?,?,?,?,?)`
  ).run(childId, questionId, date, 1, 0, 0, 1);
}

describe('大木博士每日英语', () => {
  test('pickOakEpisode：稳定、365 天覆盖两对话池、空池返回 null', () => {
    assert.equal(M.OAK_GROUP_SIZE, 6);
    // 对话池：库里分年级的对话集（k=card/video，2026-11-13 内容分工后 Oak 只取这些）
    const dialoguePool = (grade) => episodePool(grade).filter((ep) => {
      const k = (M.DAILY_ENGLISH_EPISODES[ep] || {}).k;
      return k === 'card' || k === 'video';
    });
    const small = dialoguePool(1);
    const big = dialoguePool(3);
    assert.equal(small.length, 16);
    assert.equal(big.length, 27);

    for (const [pool, childId] of [[small, 2], [big, 1]]) {
      const covered = new Set();
      // 2026-11-13：哈希由 oakHash（djb2）改 FNV-1a。旧哈希在 27 集池里 6 集全年轮不到
      //（losteverything×2、makingfriends×2、strikinggold×2）；FNV 需 365 天才覆满两池。
      for (let offset = 0; offset < 365; offset++) {
        const date = M.addDays('2026-01-01', offset);
        const picked = M.pickOakEpisode(pool, childId, date);
        assert.ok(pool.includes(picked));
        assert.equal(M.pickOakEpisode(pool, childId, date), picked);
        covered.add(picked);
      }
      assert.deepEqual([...covered].sort(), [...pool].sort());
    }

    const date = '2026-01-15';
    for (const childId of [1, 2]) {
      const picked = M.pickOakEpisode(big, childId, date);
      assert.equal(M.pickOakEpisode(big, childId, date), picked);
    }
    assert.equal(M.pickOakEpisode([], 1, date), null);
  });

  test('0014+0016 迁移：174 句、各年级数量正确、每集六句、音频值与 bundle 文件名一致', () => {
    // 0032 行（远程音频）不在此断言里，只验 0014 本地 bundle 行
    const rows = oakRows().filter((r) => !String(r.oak_audio).startsWith('http'));
    assert.equal(rows.length, 174);
    assert.equal(rows.filter(r => Number(r.grade) === 1).length, 84);
    assert.equal(rows.filter(r => Number(r.grade) === 3).length, 90);
    assert.equal(new Set(rows.map(r => r.oak_audio)).size, 174);

    const episodes = new Map();
    for (const row of rows) {
      nonempty(row.oak_episode, 'oak_episode');
      nonempty(row.oak_topic, 'oak_topic');
      nonempty(row.oak_audio, 'oak_audio');
      // 0016：oak_audio 必须是带集前缀的完整 bundle 文件名（裸文件名会 404）
      assert.match(row.oak_audio, /^[\w-]+__s\d+-n-[0-9a-f]+\.mp3$/);
      assert.equal(row.oak_audio, `${row.oak_episode}__${row.oak_audio.split('__').at(-1)}`);
      assert.ok(OAK_BUNDLE.has(row.oak_audio), row.oak_audio);
      const group = episodes.get(row.oak_episode) ?? [];
      group.push(row);
      episodes.set(row.oak_episode, group);
    }

    assert.equal(episodes.size, 29);
    for (const [episode, group] of episodes) {
      assert.equal(group.length, 6, episode);
      assert.equal(new Set(group.map(r => Number(r.grade))).size, 1, episode);
    }
    assert.ok(episodePool(1).every(id => !episodePool(3).includes(id)));
  });

  test('selectDailyQuestions 不选 Oak 行', () => {
    const rows = raw.prepare(`SELECT * FROM ${ident(questionTable())} ORDER BY id`).all();
    assert.ok(rows.some(r => r.kind === 'oak'));
    assert.ok(rows.some(r => r.kind !== 'oak'));

    const picked = M.selectDailyQuestions(rows, { gradeNum: 1, subjects: ['语文', '数学', '英语', '阅读', '其他'], today: '2026-01-15' });
    assert.ok(Array.isArray(picked));
    assert.ok(picked.length > 0, '普通每日题池不应为空');
    for (const row of picked) {
      assert.notEqual(row.kind, 'oak');
      const stored = questionById(row.id);
      assert.ok(stored, '所选题应存在于题库');
      assert.notEqual(stored.kind, 'oak');
    }
  });

  test('GET today 返回完整六句，并按孩子年级选择题池', async () => {
    const { c1, c2 } = await setup();
    const big = await todayFor(c1, 1);
    assert.equal(big.childId, 1);
    assert.equal(big.childGrade, '三年级');
    assert.equal(big.sentences.length, 6);
    assert.equal(big.listenedCount, 0);
    assert.equal(big.completed, false);
    assert.equal(big.xpAwardedToday, 0);
    nonempty(big.topic, 'topic');
    assert.ok(episodePool(3).includes(big.episodeId));

    for (const sentence of big.sentences) {
      nonempty(sentence.en, 'en');
      nonempty(sentence.zh, 'zh');
      nonempty(sentence.audio, 'audio');
      assert.ok(sentence.audio.startsWith('/static/audio/oak/') || sentence.audio.startsWith('https://english.example.com/audio/'), `audio 应为本地 bundle 或跟读站原链接，实为 ${sentence.audio}`);
      assert.equal(sentence.listened, false);
      const row = questionById(sentence.id);
      assert.ok(row);
      assert.equal(row.kind, 'oak');
      assert.equal(Number(row.grade), 3);
      assert.equal(row.oak_episode, big.episodeId);
    }

    const small = await todayFor(c2, 2);
    assert.equal(small.childId, 2);
    assert.equal(small.childGrade, '一年级');
    // 2026-11-13 补句：5 句集按日哈希从同年级其他对话集补 1 句，组长恒为 6
    assert.equal(small.sentences.length, 6, `小宝组长应为 6，实为 ${small.sentences.length}`);
    assert.ok(episodePool(1).includes(small.episodeId));
    assert.ok(!episodePool(3).includes(small.episodeId));
    const smallInEp = small.sentences.filter((s) => questionById(s.id).oak_episode === small.episodeId);
    const smallExtra = small.sentences.filter((s) => questionById(s.id).oak_episode !== small.episodeId);
    assert.equal(smallInEp.length, oakRows(1).filter((r) => r.oak_episode === small.episodeId).length, '本集句子数应与库里行数一致');
    assert.ok(smallExtra.length <= 1, '补句最多 1 句');
    for (const sentence of small.sentences) {
      const row = questionById(sentence.id);
      assert.ok(row);
      assert.equal(Number(row.grade), 1);
      if (row.oak_episode !== small.episodeId) {
        const k = (M.DAILY_ENGLISH_EPISODES[row.oak_episode] || {}).k;
        assert.ok(k === undefined || k === 'card' || k === 'video', `补句应来自对话集，实为 ${row.oak_episode}`);
      }
    }
  });

  test('顺序听完一集只奖励一次 +10 XP，不增加答对、碎片、球或遭遇（MP-15 §2：只听不完成，跟读 4×5★+2×4★ 才完成）', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    assert.equal(Number(today.quizXp), 10);
    const initialXp = childXp(1);
    const untouched = protectedState();
    const n = today.sentences.length;

    // 只听 6 句：不完成、不发经验（MP-15 §2：4×5★+2×4★）
    for (let i = 0; i < n; i++) {
      const r = await listen(c1, 1, today.sentences[i].id);
      assert.equal(r.status, 200);
      assert.equal(r.j.ok, true);
      assert.equal(r.j.listened, true);
      assert.equal(r.j.listenedCount, i + 1);
      assert.equal(r.j.completed, false);
      assert.equal(r.j.xpAwarded, 0);
      assert.ok(Object.hasOwn(r.j, 'level'));
      assert.equal(childXp(1), initialXp);
      assert.deepEqual(protectedState(), untouched);
    }

    const duplicate = await listen(c1, 1, today.sentences[n - 1].id);
    assert.equal(duplicate.status, 400);
    assert.equal(childXp(1), initialXp);
    assert.deepEqual(protectedState(), untouched);

    // 再跟读 6 句（4 句 90 分 5★＋2 句 80 分 4★）：最后一句跟读落下最后一块拼图，只发一次 10 XP
    const mixScores = [90, 90, 90, 90, 80, 80];
    for (let i = 0; i < n; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, mixScores[i]);
      assert.equal(a.status, 200);
      assert.equal(a.j.ok, true);
      assert.equal(a.j.completed, i === n - 1);
      assert.equal(a.j.xpAwarded, i === n - 1 ? 10 : 0);
      assert.equal(childXp(1), initialXp + (i === n - 1 ? 10 : 0));
    }
    // 完成后复读不再发经验
    const again = await assessAt(c1, 1, today.sentences[n - 1].en, 90);
    assert.equal(again.status, 200);
    assert.equal(again.j.completed, true);
    assert.equal(again.j.xpAwarded, 0);
    assert.equal(childXp(1), initialXp + 10);
    assert.deepEqual(protectedState(), untouched);

    const after = await todayFor(c1, 1);
    assert.equal(after.listenedCount, n);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fourStarCount, n);
    assert.equal(after.fiveStarCount, 5); // 复读把第 6 句从 80 提到了 90
    assert.equal(after.assessedCount, n);
  });

  test('未听第一句直接听第二句返回 400', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    const initialXp = childXp(1);
    const r = await listen(c1, 1, today.sentences[1].id);
    assert.equal(r.status, 400);
    assert.equal(childXp(1), initialXp);

    const after = await todayFor(c1, 1);
    assert.equal(after.listenedCount, 0);
    assert.equal(after.completed, false);
    assert.ok(after.sentences.every(s => s.listened === false));
  });

  test('孩子 2 的会话不能替孩子 1 听句子', async () => {
    const { c1, c2 } = await setup();
    const today = await todayFor(c1, 1);
    const r = await listen(c2, 1, today.sentences[0].id);
    assert.equal(r.status, 403);

    const after = await todayFor(c1, 1);
    assert.equal(after.listenedCount, 0);
    assert.equal(after.completed, false);
  });

  test('听完且跟读达标后 GET today 显示完成状态（MP-15 §2：只听不完成）', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    await finishEpisode(c1, 1, today);

    // 只听 6 句：未完成、0 经验
    let after = await todayFor(c1, 1);
    assert.equal(after.episodeId, today.episodeId);
    assert.equal(after.listenedCount, today.sentences.length);
    assert.equal(after.completed, false);
    assert.equal(after.xpAwardedToday, 0);
    assert.ok(after.sentences.every(s => s.listened === true));

    // 6 句跟读 4×5★+2×4★ 后完成、+10 XP
    const mixScores = [90, 90, 90, 90, 80, 80];
    for (let i = 0; i < today.sentences.length; i++) {
      const a = await assessAt(c1, 1, today.sentences[i].en, mixScores[i]);
      assert.equal(a.status, 200);
      assert.equal(a.j.ok, true);
    }

    after = await todayFor(c1, 1);
    assert.equal(after.episodeId, today.episodeId);
    assert.equal(after.listenedCount, today.sentences.length);
    assert.equal(after.completed, true);
    assert.equal(after.xpAwardedToday, 10);
    assert.equal(after.fourStarCount, 6);
    assert.equal(after.fiveStarCount, 4);
    assert.equal(after.sentences.length, today.sentences.length);
    assert.ok(after.sentences.every(s => s.listened === true));
  });

  test('pickDefenseQuestion 排除今日作答历史中的 Oak 句', async () => {
    const { c1 } = await setup();
    const today = await todayFor(c1, 1);
    seedOakAttempt(1, today.sentences[0].id, today.date);

    const picked = await M.pickDefenseQuestion(
      env.DB, 1, today.date, M.weekStartMon(today.date)
    );
    if (picked !== null) {
      assert.ok(picked, '无可用防守题时应返回 null');
      const id = picked.id ?? picked.question_id;
      assert.ok(id !== undefined && id !== null, '防守题应包含题目 ID');
      const row = questionById(id);
      assert.ok(row, '防守题应存在于题库');
      assert.notEqual(row.kind, 'oak');
    }
  });

  test('虚拟日期换日后换集，最多尝试三天并恢复偏移', async () => {
    const { c1 } = await setup();
    raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset','0')").run();
    const today = await todayFor(c1, 1);
    const baseDate = realTodayStr();
    assert.equal(today.date, baseDate);

    let different = null;
    try {
      for (let offset = 1; offset <= 3; offset++) {
        raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)")
          .run(String(offset));
        const next = await todayFor(c1, 1);
        assert.equal(next.date, M.addDays(baseDate, offset));
        assert.ok(episodePool(3).includes(next.episodeId));
        if (next.episodeId !== today.episodeId) {
          different = next;
          break;
        }
      }
      assert.ok(different, '未来三天内应选到不同集');
      assert.notEqual(different.episodeId, today.episodeId);
    } finally {
      raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset','0')").run();
      const restored = await todayFor(c1, 1);
      assert.equal(restored.date, baseDate);
      assert.equal(restored.episodeId, today.episodeId);
    }
  });

  test('无 0014 的旧迁移链：总览与孩子详情不 500，oakToday 为空组', async () => {
    // 回归：oakToday 装配点（apiOverview／apiChildDetail）曾直接查 oak_episode 列，
    // 导致迁移链不含 0014 的库（如 access／subjects 测试）整个总览 500。
    // oakGroupForChild 现先按 kind='oak' 做 LIMIT 1 探针（Fable #1；原 COUNT(*) 全表），
    // 无种子行时返回空组、不碰 oak_* 列。
    // Fable #4：夹具补 0019——pet_instances / reward_eggs 由迁移 0019（v11 进化道具，
    // 2026-10-26）创建，测试站与正式站早已应用，热路径不再为这两表做 sqlite_master
    // 守卫；本测试只钉“无 0014”的 Oak 行为，0019 必须在链上，否则总览会在 unlockForms
    // 取实例时直接报缺表。
    ({ env, raw } = makeEnv(['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0011_parent_grants.sql', '0019_evo_items.sql', '0043_pet_instances_ability.sql']));
    const { pc } = await setup();
    const ov = await call('/api/overview', { cookie: pc });
    assert.equal(ov.status, 200);
    assert.equal(ov.j.ok, true);
    for (const k of ov.j.children) {
      assert.deepEqual(k.oakToday, { listenedCount: 0, completed: false, total: 0 });
    }
    const cd = await call('/api/child?id=1', { cookie: pc });
    assert.equal(cd.status, 200);
    assert.deepEqual(cd.j.child.oakToday, { listenedCount: 0, completed: false, total: 0 });
    // 旧链上 Oak 接口应温和报“不在今日组里”，而不是 500
    const t = await call('/api/oak/today?child_id=1', { cookie: pc });
    assert.equal(t.status, 200);
    assert.equal(t.j.episodeId, null);
    assert.deepEqual(t.j.sentences, []);
  });
});

/* -------- 硬门禁与上一句：前端静态守卫（2026-10-26） -------- */
const APP = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
function fnBody(text, startMarker, endMarker) {
  const a = text.indexOf(startMarker);
  assert.ok(a >= 0, '缺失：' + startMarker);
  const b = text.indexOf(endMarker, a);
  assert.ok(b > a, '缺失：' + endMarker);
  return text.slice(a, b);
}

describe('Oak 硬门禁与上一句（前端静态守卫）', () => {
  test('硬门禁：没录音时下一句一律拦截，麦克风被拒／不支持不再放行', () => {
    const fn = fnBody(APP, 'async function submitOakListen()', 'window.submitOakListen');
    // 旧旁路：mic 被拒／不支持时跳过拦截，必须消失（2026-10-26 大宝第 1 句就是这么跳过去的）
    assert.ok(!fn.includes("O.mic !== 'denied'"), '旁路条件 denied 仍在');
    assert.ok(!fn.includes("O.mic !== 'unsupported'"), '旁路条件 unsupported 仍在');
    // 新门禁：只要没录音就拦截，按 mic 状态给不同提示
    // 2026-10-31 切片 4b：提示文案改为 LANG.oakSlice4* 键，字典仍含原中文提示，submit 函数内用键名引用
    assert.ok(fn.includes('if (!O.rec)'), '硬门禁 if (!O.rec) 缺失');
    assert.ok(fn.includes('oakSlice4Denied'), 'denied 提示键缺失');
    assert.ok(fn.includes('oakSlice4Unsupported'), 'unsupported 提示键缺失');
    assert.ok(fn.includes('oakSlice4RecordFirst'), '通用跟读提示键缺失');
    assert.ok(APP.includes('麦克风没打开，请让大人帮忙检查一下'), 'denied 提示缺失');
    assert.ok(APP.includes('这个浏览器不能录音，请用 Safari 打开再试'), 'unsupported 提示缺失');
    assert.ok(APP.includes('先点「跟读录音」，读一遍再往下走'), '通用跟读提示缺失');
  });

  test('上一句：按钮只在第 2 句起出现，点后回退一句并重渲染', () => {
    const render = fnBody(APP, 'function renderOakStep()', 'async function submitOakListen()');
    // 2026-10-31 切片 4b：上一句按钮文案改为 LANG.oakSlice4Previous，字典仍含“上一句”
    assert.ok(render.includes('oakSlice4Previous'), '上一句按钮缺失');
    assert.ok(APP.includes("oakSlice4Previous: ['上一句', 'Previous']"), '上一句字典缺失');
    assert.ok(render.includes('prevOakStep()'), '上一句未接 prevOakStep');
    assert.ok(render.includes('O.idx > 0'), '上一句应在第 1 句隐藏');
    const prev = fnBody(APP, 'function prevOakStep()', 'window.prevOakStep');
    assert.ok(prev.includes('O.idx--'), 'prevOakStep 未回退 idx');
    assert.ok(prev.includes('oakLoadAssess(O)'), '回退后未重载已存点评');
    assert.ok(prev.includes('renderOakStep()'), '回退后未重渲染');
    assert.ok(prev.includes('O.idx <= 0'), '第 1 句应拒绝回退');
  });

  test('已听过的句子：下一句本地前进，不重复提交（后端重提会 400）', () => {
    const fn = fnBody(APP, 'async function submitOakListen()', 'window.submitOakListen');
    const branch = fnBody(fn, 'if (s.listened)', 'if (!O.rec)');
    assert.ok(branch.includes('O.idx++'), '已听句子未本地前进');
    assert.ok(branch.includes('renderOakStep()'), '已听句子前进后未重渲染');
    assert.ok(!branch.includes('/api/oak/listen'), '已听句子不应重复调提交接口');
  });

  test('大木博士之家（2026-11-13 用户定：英语入口只留首页，屋内删除）', () => {
    assert.ok(APP.includes("tr('大木博士之家'"), '入口按钮不是大木博士之家');
    const hub = fnBody(APP, 'async function openOak(', 'window.openOak');
    assert.ok(hub.includes("bi('大木博士之家'"), '对话框标题不是大木博士之家');
    assert.ok(hub.includes('你好呀！今天想在家里做些什么呢？'), '对话框问候仍写研究所');
    assert.ok(!hub.includes('openOakEnglish'), '屋内仍有英语入口（应只留首页）');
    assert.ok(!hub.includes("bi('每日英语'"), '屋内仍有每日英语按钮');
    assert.ok(!APP.includes('大木博士研究所'), '研究所旧名仍在');
    assert.ok(!APP.includes('childSlice2Oak'), '已听旧切片仍在');
  });

  test('首页孩子卡片英语进度 chip 直接进英语交流（2026-11-13）', () => {
    assert.ok(APP.includes('openOakEnglish(${esc(k.id)})'), '孩子卡片英语 chip 未指向 openOakEnglish');
    assert.ok(APP.includes('每日英语'), '孩子卡片英语 chip 文案丢失');
  });
});

/* -------- Oak 对话集（2026-11-13 内容分工：每日英语走课本，Oak 走口语对话） -------- */
describe('Oak 对话集（2026-11-13）', () => {
  const isDialogue = (ep) => {
    const k = (M.DAILY_ENGLISH_EPISODES[ep] || {}).k;
    return k === 'card' || k === 'video';
  };
  function setOffset(n) {
    raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(n));
  }

  test('oakAudioUrl：本地 bundle 拼前缀，远程地址原样直通', () => {
    assert.equal(M.oakAudioUrl('ep-card-01__s001-n-0dbfe1.mp3'), '/static/audio/oak/ep-card-01__s001-n-0dbfe1.mp3');
    assert.equal(M.oakAudioUrl('https://english.example.com/audio/ep/ep-card-intro-g1/s001-n-60ddfc.mp3'), 'https://english.example.com/audio/ep/ep-card-intro-g1/s001-n-60ddfc.mp3');
    assert.equal(M.oakAudioUrl(null), null);
  });

  test('0032 迁移：225 行、两孩集数正确、新集音频均为跟读站原链接', () => {
    const rows = oakRows().filter((r) => String(r.oak_audio).startsWith('http'));
    assert.equal(rows.length, 225);
    assert.equal(rows.filter((r) => Number(r.grade) === 1).length, 75);
    assert.equal(rows.filter((r) => Number(r.grade) === 3).length, 150);
    const eps = new Set(rows.map((r) => r.oak_episode));
    assert.equal(eps.size, 40);
    for (const r of rows) {
      assert.ok(r.oak_audio.startsWith('https://english.example.com/audio/'), r.oak_audio);
      assert.ok(isDialogue(r.oak_episode), `${r.oak_episode} 应为对话集`);
      assert.ok(r.oak_topic && r.oak_topic.trim(), 'oak_topic 不应为空');
    }
    for (const ep of eps) {
      const n = rows.filter((r) => r.oak_episode === ep).length;
      assert.ok(n === 5 || n === 6, `${ep} 应为 5 或 6 句，实为 ${n}`);
    }
  });

  test('Oak 只取对话集：30 个虚拟日两孩都只抽到 card/video 集', async () => {
    const { c1, c2 } = await setup();
    try {
      for (let offset = 0; offset < 30; offset++) {
        setOffset(offset);
        for (const [cookie, childId] of [[c1, 1], [c2, 2]]) {
          const t = await todayFor(cookie, childId);
          assert.ok(t.episodeId, `offset ${offset} child ${childId} 应有集`);
          assert.ok(isDialogue(t.episodeId), `offset ${offset} child ${childId} 应抽对话集，实为 ${t.episodeId}`);
          assert.equal(t.sentences.length, 6, `组长应为 6，实为 ${t.sentences.length}`);
          for (const s of t.sentences) {
            assert.ok(s.audio.startsWith('/static/audio/oak/') || s.audio.startsWith('https://english.example.com/audio/'), `audio 非法：${s.audio}`);
          }
        }
      }
    } finally {
      setOffset(0);
    }
  });

  test('5 句集补 1 句成 6 句：补句来自同年级其他对话集、同一天内恒定、第 6 句完成＋10 XP', async () => {
    const { c2 } = await setup();
    let found = null;
    try {
      for (let offset = 0; offset < 60; offset++) {
        setOffset(offset);
        const t = await todayFor(c2, 2);
        const n = raw.prepare("SELECT COUNT(*) n FROM quiz_questions WHERE kind='oak' AND oak_episode=? AND grade=1").get(t.episodeId).n;
        if (n === 5) { found = { offset, today: t }; break; }
      }
      assert.ok(found, '60 天内应找到一个 5 句集');
      const { today } = found;
      assert.equal(today.sentences.length, 6);
      assert.equal(today.fiveStarTotal, 6);
      // 前 5 句属本集，第 6 句（补句）属同年级其他对话集
      const eps = today.sentences.map((s) => raw.prepare('SELECT oak_episode ep FROM quiz_questions WHERE id=?').get(s.id).ep);
      assert.ok(eps.slice(0, 5).every((ep) => ep === today.episodeId), '前 5 句应属本集');
      assert.notEqual(eps[5], today.episodeId);
      assert.ok(isDialogue(eps[5]), '补句应来自对话集');
      assert.ok(today.sentences.every((s) => s.audio.startsWith('https://english.example.com/audio/')), '新 5 句集音频应为跟读站原链接');
      // 同一天内再取一次，6 句恒定不变
      const again = await todayFor(c2, 2);
      assert.deepEqual(again.sentences.map((s) => s.id), today.sentences.map((s) => s.id));
      const initialXp = childXp(2);
      for (let i = 0; i < 6; i++) {
        const r = await listen(c2, 2, today.sentences[i].id);
        assert.equal(r.status, 200);
        assert.equal(r.j.completed, false);
        assert.equal(r.j.xpAwarded, 0);
        assert.equal(r.j.listenedCount, i + 1);
      }
      assert.equal(childXp(2), initialXp);
      const mixScores = [90, 90, 90, 90, 80, 80];
      for (let i = 0; i < 6; i++) {
        const a = await assessAt(c2, 2, today.sentences[i].en, mixScores[i]);
        assert.equal(a.status, 200);
        assert.equal(a.j.completed, i === 5);
        assert.equal(a.j.xpAwarded, i === 5 ? 10 : 0);
      }
      assert.equal(childXp(2), initialXp + 10);
      const after = await todayFor(c2, 2);
      assert.equal(after.listenedCount, 6);
      assert.equal(after.completed, true);
      assert.equal(after.fiveStarTotal, 6);
      assert.equal(after.fourStarCount, 6);
      assert.equal(after.fiveStarCount, 4);
    } finally {
      setOffset(0);
    }
  });
});
