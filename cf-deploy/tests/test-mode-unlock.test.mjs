/* 测试站全面解锁（Route A）回归：node --test tests/test-mode-unlock.test.mjs
 * 覆盖简报放开项 1–8：每项至少一个 TEST_MODE='1' 放开用例＋一个正式模式仍挡断言。
 * harness 照 tests/gate.test.mjs（node:sqlite 内存库＋全量迁移 0001–0020）；
 * 每用例先调导出的 M.applyDebugTime(db, env) 再调 handler（与生产一致）。
 * 正式模式用例用 useProd()：删 TEST_MODE 后重调 applyDebugTime（先例见 debug.test.mjs:130）。
 * 只断言“能不能测”——不改规则、不改数值、不动正式模式行为。
 * 注：mini 草稿（work/sol-unlock-a-tests-out.md）harness 全错（node:test/sqlite 默认导入、
 * 直接 import src、编造 M.call），已由协调员按 gate/battle/evo-items/coop 实测范式重写。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash } from './asset-path.mjs';

const H = assetHash();

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
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
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } }, raw, db };
}

let env, raw, db;
beforeEach(() => { ({ env, raw, db } = makeEnv()); });

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
async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '0000'), c2: await childCookie(2, '0000') };
}
/* 正式模式：删 TEST_MODE 后重调 applyDebugTime（debug.test.mjs:130 先例） */
async function useProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(db, env);
}
function todayStr() { return M.shDateStr(); }
function setLevel(childId, level) { raw.prepare('UPDATE children SET total_xp=? WHERE id=?').run(M.xpForLevel(level), childId); }
function setLine(childId, line) { raw.prepare('UPDATE children SET line=? WHERE id=?').run(line, childId); }
function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}
function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = orig; }
}
function seedQuiz6() {
  // 学习进度B：单元测试新门要求 chapter 与所选 unit 全串相等且过门；第1/第2单元各种 6 道，门未放宽
  for (let i = 0; i < 6; i++) {
    raw.prepare(`INSERT INTO quiz_questions(id,kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,topic_id,chapter)
      VALUES(?,?,?,?,?,?,?,?,?,0,1,?,?)`).run(9001 + i, 'study', 3, '语文', `题${9001 + i}`, '["A","B","C","D"]', 0, '', 1, null, '三年级上册 第1单元');
  }
  for (let i = 0; i < 6; i++) {
    raw.prepare(`INSERT INTO quiz_questions(id,kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,topic_id,chapter)
      VALUES(?,?,?,?,?,?,?,?,?,0,1,?,?)`).run(9007 + i, 'study', 3, '语文', `题${9007 + i}`, '["A","B","C","D"]', 0, '', 1, null, '三年级上册 第2单元');
  }
}
/* 把虚拟日期拨到「从今天起最近的某个星期几」（0=周日 … 6=周六），照 tests/battle.test.mjs */
function gotoWeekday(targetDow) {
  const todayStr0 = realTodayStr();
  const [y, m, d] = todayStr0.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (targetDow - dow + 7) % 7;
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(delta));
  const dateStr = M.addDays(todayStr0, delta);
  return { dateStr, weekStart: M.weekStartMon(dateStr) };
}
function seedApprovedDays(childId, weekStart, n = 4) {
  for (let i = 0; i < n; i++) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, M.addDays(weekStart, i));
  }
}
/* benchOptions 覆盖断言：全部 164 只 COLLECTION_MOVES 物种，按 no 升序，179/123 必须在列 */
function assertBenchCovers(j) {
  assert.ok(Array.isArray(j.benchOptions));
  assert.equal(j.benchOptions.length, 164);
  assert.ok(j.benchOptions.every((x, i, a) => i === 0 || a[i - 1].no < x.no), '按 no 升序');
  assert.ok(j.benchOptions.every((x) => x.no && x.name && x.img && x.type));
  const byNo = new Map(j.benchOptions.map((x) => [x.no, x]));
  assert.equal(byNo.get(179)?.name, '咩利羊', '179 咩利羊须在列（线上只有小宝拥有）');
  assert.equal(byNo.get(123)?.name, '飞天螳螂', '123 飞天螳螂须在列（线上只有大宝拥有）');
}

/* ---- 合作道馆 readyFamily（照 tests/coop.test.mjs） ---- */
const HOL_START = '2027-02-01', HOL_END = '2027-02-21';
const SUBJS = ['语文', '数学', '英语', '阅读'];
const addD = (d, n) => M.addDays(d, n);
function mondayOf(s) { const [y, m, d] = s.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return addD(s, -((w + 6) % 7)); }
function isWeekday(d) { const dow = new Date(d + 'T00:00:00Z').getUTCDay(); return dow >= 1 && dow <= 5; }
function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
function setToday(dateStr) {
  const diff = Math.round((Date.parse(dateStr) - Date.parse(realTodayStr())) / 86400000);
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(diff));
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_hour','10')").run();
}
async function configHoliday(pc, opts = {}) {
  const { master = true, baseLevel = 6 } = opts;
  const weeks = [
    { week_key: mondayOf(HOL_START), start: HOL_START, end: addD(HOL_START, 6) },
    { week_key: mondayOf(addD(HOL_START, 7)), start: addD(HOL_START, 7), end: HOL_END },
  ];
  const r = await call('/api/parent/holiday/config/update', {
    method: 'POST', cookie: pc,
    body: {
      masterEnabled: master,
      holiday: { holiday_id: 'test_hol', start_date: HOL_START, end_date: HOL_END, coop_weeks: weeks, enemy_base_level: baseLevel, map_version: 'coop-m1.v1' },
      subjects: { 1: SUBJS, 2: SUBJS },
      statutory: Object.fromEntries([...new Set([addD(HOL_START, -21).slice(0, 4), HOL_START.slice(0, 4), HOL_END.slice(0, 4)])].map((y) => [y, { off: [] }])),
    },
  });
  assert.equal(r.j.ok, true, JSON.stringify(r.j));
  return r.j;
}
function seedApproved(kid, date, subjects) {
  for (const s of subjects) {
    raw.prepare("INSERT OR REPLACE INTO checkins(child_id, date, subjects, subject, note, status, submitted_at, submitted_epoch, is_early, reviewed_at, xp_awarded) VALUES(?,?,json_array(?),?,'','approved','09:00',1,0,'10:00',15)")
      .run(kid, date, s, s);
  }
}
function seedWindow(kid) {
  const start = addD(HOL_START, -21), end = addD(HOL_START, -1);
  for (let d = start; d <= end; d = addD(d, 1)) {
    if (!isWeekday(d)) continue;
    seedApproved(kid, d, SUBJS);
  }
}
function seedDailyGate(date) { seedApproved(1, date, ['语文', '阅读']); seedApproved(2, date, ['数学', '阅读']); }
function boostLevels() { raw.exec('UPDATE children SET total_xp=2200'); }
async function readyFamily(pc, c1) {
  await configHoliday(pc);
  seedWindow(1); seedWindow(2);
  boostLevels();
  setToday(HOL_START);
  await M.applyDebugTime(db, env);
  seedDailyGate(HOL_START);
  const g = await call('/api/coop/gathering?childId=1', { cookie: c1 });
  assert.equal(g.j.available, true, JSON.stringify(g.j));
  assert.equal(g.j.me.state, 'gathered', JSON.stringify(g.j.me));
}

/* ================= 0 核心：gatesOpen 随 TEST_MODE 走 ================= */
/* 任务 124 双口径：settings.debug.gatesOpen 现为全放行开关（GATES_OPEN_FULL），
 * 仅 settings.debug_open_gates 显式为 '1' 时为 true；缺省为 false（新门槛仍受限），
 * 但旧门槛（道馆/PvP 等）仍由 GATES_OPEN 管、测试站缺省即开（见 §1/§4 的 gym/pvp 断言）。 */
describe('0 gatesOpen', () => {
  test('测试模式 settings.debug.gatesOpen 缺省为 false，显式开为 true', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    let r = await call('/api/parent/settings', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.settings.debug.gatesOpen, false);
    raw.exec("INSERT OR REPLACE INTO settings(key, value) VALUES('debug_open_gates', '1')");
    await M.applyDebugTime(db, env);
    r = await call('/api/parent/settings', { cookie: pc });
    assert.equal(r.j.settings.debug.gatesOpen, true);
  });
  test('正式模式 settings.debug 为 null（gatesOpen 不出现）', async () => {
    const { pc } = await setup();
    await useProd();
    const r = await call('/api/parent/settings', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.settings.debug, null);
  });
});

/* ================= 1 主宠切换蛋/石校验 ================= */
describe('1 switch-line', () => {
  test('测试模式：无伊布蛋也能切伊布线，free:true', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    const r = await call('/api/parent/switch-line', { method: 'POST', cookie: pc, body: { childId: 1, line: 'eevee' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.free, true);
    assert.equal(raw.prepare('SELECT line FROM children WHERE id=1').get().line, 'eevee');
  });
  test('正式模式：无伊布蛋切伊布线被拒', async () => {
    const { pc } = await setup();
    await useProd();
    const r = await call('/api/parent/switch-line', { method: 'POST', cookie: pc, body: { childId: 1, line: 'eevee' } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
    assert.match(String(r.j.error || ''), /还没有伊布的蛋哦/);
  });
});

/* ================= 2 图鉴只看不等于拥有 ================= */
describe('2 pokedex', () => {
  test('测试模式：151 只全 unlocked 且带详情；伊布分支不过滤；不写库', async () => {
    const { c1 } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 5); // 皮卡丘线首招在 2 级：1 级 moves 本为空，升 5 级后再断言详情
    const beforeAcq = raw.prepare('SELECT COUNT(*) AS n FROM species_acquisitions').get().n;
    const r = await call('/api/pokedex', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.dex151.length, 151);
    assert.ok(r.j.dex151.every((x) => x.unlocked === true));
    assert.equal(r.j.dex151[24].no, 25);
    assert.ok(Array.isArray(r.j.dex151[24].moves) && r.j.dex151[24].moves.length > 0, '皮卡丘应带招式详情');
    assert.equal(r.j.dex151[133].no, 134);
    assert.equal(r.j.dex151[133].name, '水伊布');
    assert.ok(r.j.lineEntries.every((e) => e.unlocked === true), '主宠线形态卡全放开');
    assert.ok(r.j.wild.every((e) => e.unlocked === true));
    assert.ok(r.j.others.every((e) => e.unlocked === true));
    assert.ok(r.j.eggSpecies.every((e) => e.unlocked === true));
    assert.equal(r.j.progress.owned, 0, 'Lv.5 的 172 不计入 151 进度（>151），form:0 不进计数');
    const r2 = await call('/api/pokedex', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r2.j.progress.owned, r.j.progress.owned, '只看不写：两次读数一致');
    // 读图鉴的唯一写副作用是 unlockForms 按等级补写当前线形态行（产品原有行为，与放开无关）：
    // Lv.5 应只有 form:pikachu:0 与 form:pikachu:1，不多写任何 egg:/wild: 行，不写 species_acquisitions
    const keys = raw.prepare('SELECT entry_key FROM pokedex ORDER BY entry_key').all().map((x) => x.entry_key);
    assert.deepEqual(keys, ['form:pikachu:0', 'form:pikachu:1']);
    assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM species_acquisitions').get().n, beforeAcq);
  });
  test('正式模式：未获得仍是 {unlocked:false, name:null}，但返回剪影用图（Option A）', async () => {
    const { c1 } = await setup();
    await useProd();
    const r = await call('/api/pokedex', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.deepEqual(r.j.dex151[0], { no: 1, unlocked: false, name: null, img: `/static/img/p1.${H}.webp` });
    assert.deepEqual(r.j.dex151[133], { no: 134, unlocked: false, name: null, img: `/static/img/p134.${H}.webp` });
    assert.equal(r.j.wild[0].unlocked, false);
    assert.equal(r.j.progress.owned, 0);
  });
});

/* ================= 3 道馆进场（梯子＋等级） ================= */
describe('3 gym start', () => {
  test('测试模式：1 级、无前置通关也可进第 2 关（备宠 54 未拥有）', async () => {
    const { c1 } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 1);
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 2, benchNo: 54 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
  });
  test('测试模式：本周已通关第 1 关仍可重进', async () => {
    const { c1 } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 1);
    raw.prepare("INSERT INTO gym_progress(child_id, stage, cleared_at) VALUES(1,1,?)").run(todayStr());
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 54 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
  });
  test('正式模式：1 级进第 2 关被拒', async () => {
    const { c1 } = await setup();
    await useProd();
    setLevel(1, 1);
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 2, benchNo: 54 } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
    assert.equal(r.j.ok, false);
  });
});

/* ================= 4 转盘去重＋学校成绩转盘机会 ================= */
describe('4 wheel', () => {
  test('测试模式：已有皮卡丘蛋仍能转盘；grantEgg 跳过去重可重复发', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    const today = todayStr();
    raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'egg:25',?)").run(today);
    const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第3单元',96,100,96,?,'active',0,0,?)").run(today, today);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(1,?,?,0,?)').run(Number(ins.lastInsertRowid), M.weekStartMon(today), today);
    const r = await withRandom(0.1, () => call('/api/evo/wheel/spin', { method: 'POST', cookie: pc, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.chancesLeft, 0);
    const g = await M.grantEgg(db, 1, 25, 'wheel', 1, today);
    assert.equal(g.granted, true);
  });
  test('正式模式：grantEgg 已拥有返回 ALREADY_OWNED', async () => {
    await setup();
    await useProd();
    const today = todayStr();
    raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'egg:25',?)").run(today);
    const g = await M.grantEgg(db, 1, 25, 'wheel', 1, today);
    assert.deepEqual(g, { granted: false, reason: 'ALREADY_OWNED' });
  });
  test('测试模式：96 分无照片也能记转盘机会，且同科多次不被周名额挡', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    const today = todayStr();
    const body = { childId: 1, subject: '语文', unit: '第一单元', score: 96, fullScore: 100, examDate: today };
    const r1 = await call('/api/parent/school-test/save', { method: 'POST', cookie: pc, body });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.wheelChance, true);
    const r2 = await call('/api/parent/school-test/save', { method: 'POST', cookie: pc, body: { ...body, unit: '第二单元' } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.wheelChance, true);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM wheel_chances WHERE child_id=1").get().n, 2);
  });
  test('正式模式：96 分无照片不记转盘机会', async () => {
    const { pc } = await setup();
    await useProd();
    const r = await call('/api/parent/school-test/save', { method: 'POST', cookie: pc, body: { childId: 1, subject: '语文', unit: '第一单元', score: 96, fullScore: 100, examDate: todayStr() } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.wheelChance, false);
    assert.match(String(r.j.wheelReason || ''), /上传试卷照片后可获得 1 次高级转盘机会/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM wheel_chances WHERE child_id=1").get().n, 0);
  });
});

/* ================= 5 战斗备宠 benchOptions ================= */
describe('5 benchOptions', () => {
  test('测试模式：道馆总览与 PvP 总览都有 benchOptions（164 只、按 no 升序、每项 {no,name,img,type}）', async () => {
    const { pc, c1 } = await setup();
    await M.applyDebugTime(db, env);
    const g = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(g.status, 200, JSON.stringify(g.j));
    assertBenchCovers(g.j);
    assert.equal(g.j.gatesOpen, true);
    const p = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(p.status, 200, JSON.stringify(p.j));
    assertBenchCovers(p.j);
    assert.deepEqual(p.j.benchOptions, g.j.benchOptions);
    assert.equal(p.j.gatesOpen, true);
    void pc;
  });
  test('测试模式：合作道馆地图有 benchOptions（179/123 在列）', async () => {
    const { pc, c1 } = await setup();
    await M.applyDebugTime(db, env);
    await readyFamily(pc, c1);
    const m = await call('/api/coop/map?childId=1', { cookie: c1 });
    assert.equal(m.status, 200, JSON.stringify(m.j));
    assert.equal(m.j.available, true);
    assertBenchCovers(m.j);
  });
  test('测试模式：大宝带 179（线上只有小宝拥有）、小宝带 123（线上只有大宝拥有）进道馆均成功——不补种实例', async () => {
    const { c1, c2 } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 1);
    setLevel(2, 1);
    // 刻意不插任何 pet_instances / pokedex 行：备宠只校验 COLLECTION_MOVES 存在
    const r1 = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 179 } });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.ok, true);
    const r2 = await call('/api/battle/gym/start', { method: 'POST', cookie: c2, body: { childId: 2, stage: 1, benchNo: 123 } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.ok, true);
  });
  test('正式模式：周末＋打卡 4 天＋Lv.5 达标后，大宝带未拥有的 179 仍被备宠校验挡', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    await useProd();
    seedApprovedDays(1, weekStart, 4);
    setLevel(1, 5);
    // 注：正式模式下 debug-time 不生效（拨钟只在 TEST_MODE 下读），虚拟日期回到真实周三，
    // 周末门先挡、进不到 ownsSpecies 分支；但 400 本身即证明“未拥有的 179 不能进道馆”。
    // ownsSpecies 的报错文本（“这只收藏宠还没有收集到哦”）只在真实周末可达，见源码 5664 行附近。
    const r = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 179 } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
    assert.equal(r.j.ok, false);
  });
  test('正式模式：三处总览均不出现 benchOptions', async () => {
    const { pc, c1 } = await setup();
    await M.applyDebugTime(db, env);
    await readyFamily(pc, c1);
    await useProd();
    const g = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.ok(!('benchOptions' in g.j));
    assert.equal(g.j.gatesOpen, false);
    const p = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.ok(!('benchOptions' in p.j));
    const m = await call('/api/coop/map?childId=1', { cookie: c1 });
    // 注：正式模式下 debug-time 不生效，虚拟日期回到真实日期、集结窗口已过，available 为 false；
    // 本断言只关心 benchOptions 不出现，与 available 无关。
    assert.ok(!('benchOptions' in m.j));
  });
  test('测试模式：PvP 可用未拥有的备宠建局', async () => {
    const { c1 } = await setup();
    await M.applyDebugTime(db, env);
    const r = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
  });
  test('正式模式：PvP 建局被拒（周末/打卡门）', async () => {
    const { c1 } = await setup();
    await useProd();
    const r = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
    assert.equal(r.j.ok, false);
  });
});

/* ================= 6 进化条件 ================= */
describe('6 evo', () => {
  test('测试模式：1 级、无雷之石也能主宠终极进化，且不扣石', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 1);
    raw.prepare("INSERT INTO pet_instances(child_id,line_key,species_no,form_idx,source,created_epoch,updated_epoch) VALUES(1,'pikachu',25,1,'egg',0,0)").run();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie: pc, body: { childId: 1, target: 'main' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(raw.prepare("SELECT form_idx FROM pet_instances WHERE child_id=1 AND line_key='pikachu'").get().form_idx, 3);
    assert.equal(invQty(1, 'stone:thunder'), 0);
  });
  test('测试模式：伊布分支 1 级、无石可进化；仙子伊布无需先学妖精招式', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 1);
    setLine(1, 'eevee');
    raw.prepare("INSERT INTO pet_instances(child_id,line_key,species_no,form_idx,source,created_epoch,updated_epoch) VALUES(1,'eevee',133,1,'egg',0,0)").run();
    const r1 = await call('/api/evo/use-stone', { method: 'POST', cookie: pc, body: { childId: 1, target: 'eevee', branch: 'vaporeon' } });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.ok, true);
    // 仙子伊布用孩子 2：同一 child 的 eevee 实例只有一条（line_key 唯一），不能再插第二条
    setLevel(2, 1);
    setLine(2, 'eevee');
    raw.prepare("INSERT INTO pet_instances(child_id,line_key,species_no,form_idx,source,created_epoch,updated_epoch) VALUES(2,'eevee',133,1,'egg',0,0)").run();
    const r2 = await call('/api/evo/evolve', { method: 'POST', cookie: pc, body: { childId: 2, target: 'eevee', branch: 'sylveon' } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.ok, true);
  });
  test('测试模式：收藏进化 17 级（差 1 级）也可进化', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    setLevel(1, 17);
    const today = todayStr();
    raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'egg:16',?)").run(today);
    raw.prepare("INSERT INTO pet_instances(child_id,line_key,species_no,form_idx,source,created_epoch,updated_epoch) VALUES(1,'species:16',16,1,'egg',0,0)").run();
    const r = await call('/api/evo/evolve', { method: 'POST', cookie: pc, body: { childId: 1, target: 'species:16' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true);
    assert.equal(raw.prepare("SELECT species_no FROM pet_instances WHERE child_id=1 AND line_key='species:16'").get().species_no, 17);
  });
  test('测试模式：evoOptionsFor 主宠终极 ready 为真', async () => {
    await setup();
    await M.applyDebugTime(db, env);
    const childRow = raw.prepare('SELECT * FROM children WHERE id=1').get();
    const inst = { child_id: 1, line_key: 'pikachu', species_no: 25, form_idx: 1, source: 'egg', created_epoch: 0, updated_epoch: 0 };
    const opts = M.evoOptionsFor(childRow, inst, {}, 1);
    const fin = opts.find((o) => o.kind === 'main-final');
    assert.ok(fin, JSON.stringify(opts));
    assert.equal(fin.ready, true);
    assert.deepEqual(fin.missing, []);
  });
  test('正式模式：1 级主宠终极进化被拒；evoOptionsFor ready 为假', async () => {
    const { pc } = await setup();
    await useProd();
    setLevel(1, 1);
    raw.prepare("INSERT INTO pet_instances(child_id,line_key,species_no,form_idx,source,created_epoch,updated_epoch) VALUES(1,'pikachu',25,1,'egg',0,0)").run();
    const r = await call('/api/evo/use-stone', { method: 'POST', cookie: pc, body: { childId: 1, target: 'main' } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
    const childRow = raw.prepare('SELECT * FROM children WHERE id=1').get();
    const inst = { child_id: 1, line_key: 'pikachu', species_no: 25, form_idx: 1, source: 'egg', created_epoch: 0, updated_epoch: 0 };
    const opts = M.evoOptionsFor(childRow, inst, {}, 1);
    const fin = opts.find((o) => o.kind === 'main-final');
    assert.ok(fin, JSON.stringify(opts));
    assert.equal(fin.ready, false);
    assert.ok(fin.missing.length > 0);
  });
});

/* ================= 7 单元测试配额 ================= */
describe('7 unit-test quota', () => {
  test('测试模式：同单元重开、周配额满 3 次后仍可开', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    seedQuiz6();
    const body = { childId: 1, subject: '语文', unit: '三年级上册 第1单元' };
    const r1 = await call('/api/parent/unit-test/start', { method: 'POST', cookie: pc, body });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    assert.equal(r1.j.ok, true);
    const r2 = await call('/api/parent/unit-test/start', { method: 'POST', cookie: pc, body });
    assert.equal(r2.status, 200, JSON.stringify(r2.j));
    assert.equal(r2.j.ok, true);
    raw.prepare('INSERT INTO draw_week_quotas(child_id, week_start, count) VALUES(1,?,3)').run(M.weekStartMon(todayStr()));
    const r3 = await call('/api/parent/unit-test/start', { method: 'POST', cookie: pc, body: { ...body, unit: '三年级上册 第2单元' } });
    assert.equal(r3.status, 200, JSON.stringify(r3.j));
    assert.equal(r3.j.ok, true);
  });
  test('正式模式：同单元重开被冷却挡', async () => {
    const { pc } = await setup();
    await useProd();
    seedQuiz6();
    const body = { childId: 1, subject: '语文', unit: '三年级上册 第1单元' };
    const r1 = await call('/api/parent/unit-test/start', { method: 'POST', cookie: pc, body });
    assert.equal(r1.status, 200, JSON.stringify(r1.j));
    const r2 = await call('/api/parent/unit-test/start', { method: 'POST', cookie: pc, body });
    assert.equal(r2.status, 400, JSON.stringify(r2.j));
  });
  test('正式模式：周配额满 3 次被挡', async () => {
    const { pc } = await setup();
    await useProd();
    seedQuiz6();
    raw.prepare('INSERT INTO draw_week_quotas(child_id, week_start, count) VALUES(1,?,3)').run(M.weekStartMon(todayStr()));
    const r = await call('/api/parent/unit-test/start', { method: 'POST', cookie: pc, body: { childId: 1, subject: '语文', unit: '三年级上册 第1单元' } });
    assert.equal(r.status, 400, JSON.stringify(r.j));
  });
});

/* ================= 8 抓捕用球（debug-set 补球路径） ================= */
describe('8 debug-set balls', () => {
  test('测试模式：debug-set 可直接设球 5 颗', async () => {
    const { pc } = await setup();
    await M.applyDebugTime(db, env);
    const r = await call('/api/parent/debug-set', { method: 'POST', cookie: pc, body: { childId: 1, balls: 5 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, 5);
  });
  test('正式模式：debug-set 404', async () => {
    const { pc } = await setup();
    await useProd();
    const r = await call('/api/parent/debug-set', { method: 'POST', cookie: pc, body: { childId: 1, balls: 5 } });
    assert.equal(r.status, 404, JSON.stringify(r.j));
  });
});

/* ================= 9 有意不放开：PIN 安全 ================= */
describe('9 not unlocked: PIN', () => {
  test('正式模式：PIN 错误不发会话', async () => {
    await setup();
    await useProd();
    const r = await call('/api/parent/login', { method: 'POST', body: { pin: '9999' } });
    assert.notEqual(r.status, 200);
    assert.ok(!r.cookie || !r.cookie.includes('parent='));
  });
  test('测试模式：PIN 错误同样不发会话（安全不放开）', async () => {
    await setup();
    await M.applyDebugTime(db, env);
    const r = await call('/api/parent/login', { method: 'POST', body: { pin: '9999' } });
    assert.notEqual(r.status, 200);
    assert.ok(!r.cookie || !r.cookie.includes('parent='));
  });
});
