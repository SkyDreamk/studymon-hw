/* 假期合作道馆（批 1）集成测试：node --test tests/coop.test.mjs
 * harness 同 battle.test（node:sqlite 内存库＋迁移 0001–0008）；时间用 TEST_MODE 的
 * debug_day_offset / debug_hour 拨虚拟时钟；集结数据用已通过打卡行作 fixture。
 * 场景日历相对真实今日 R 推导：假期开始 = R+2，集结窗口 = [开始-21, 开始-1]。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql'];
const SUBJS = ['语文', '数学', '英语', '阅读'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() { const r = raw.prepare(sql).run(...this._args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } }, raw };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  return { status: res.status, j: await res.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : cookie };
}

/* ---------- 日期工具（真实上海日期基准） ---------- */
function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {}; for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
const R = realTodayStr();
function addD(s, n) { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`; }
function diffD(a, b) { const pa = a.split('-').map(Number), pb = b.split('-').map(Number); return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000); }
function isWeekday(s) { const [y, m, d] = s.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w >= 1 && w <= 5; }
function mondayOf(s) { const [y, m, d] = s.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return addD(s, -((w + 6) % 7)); }

function setToday(dateStr) {
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(diffD(R, dateStr)));
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_hour','10')").run();
}

/* ---------- 账号与配置 ---------- */
async function parentCookie() { const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } }); assert.equal(r.status, 200); return r.cookie; }
async function childCookie(id, pw) { const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } }); assert.equal(r.status, 200); return r.cookie; }
async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', { method: 'POST', cookie: pc, body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] } });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '0000'), c2: await childCookie(2, '0000') };
}

const HOL_START = addD(R, 2);
const HOL_END = addD(HOL_START, 13);
async function configHoliday(pc, { master = true, baseLevel = 3 } = {}) {
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

/* 插入已通过打卡：kid 在 date 当天 subjects 各科 approved */
function seedApproved(kid, date, subjects) {
  for (const s of subjects) {
    raw.prepare("INSERT OR REPLACE INTO checkins(child_id, date, subjects, subject, note, status, submitted_at, submitted_epoch, is_early, reviewed_at, xp_awarded) VALUES(?,?,json_array(?),?,'','approved','09:00',1,0,'10:00',15)")
      .run(kid, date, s, s);
  }
}
/* 集结窗口内造达标数据：kid 每上学日 4 科全通过；kid2 可削减（readingDays 上限、skipHomeworkDays 天作业只交 3 科） */
function seedWindow(kid, { readingCap = 99, shortDays = 0 } = {}) {
  const start = addD(HOL_START, -21), end = addD(HOL_START, -1);
  let rd = 0, shortLeft = shortDays;
  for (let d = start; d <= end; d = addD(d, 1)) {
    if (!isWeekday(d)) continue;
    let subjs = SUBJS;
    if (rd >= readingCap) subjs = subjs.filter((s) => s !== '阅读');
    else rd++;
    if (shortLeft > 0 && subjs.length === 4) { subjs = subjs.filter((s) => s !== '英语'); shortLeft--; }
    seedApproved(kid, d, subjs);
  }
}
function seedDailyGate(date) { seedApproved(1, date, ['语文', '阅读']); seedApproved(2, date, ['数学', '阅读']); }
function boostLevels() { raw.exec('UPDATE children SET total_xp=2200'); }

/* 达标全家桶：配置假期＋双孩窗口达标＋拨到假期首日＋当日门槛 */
async function readyFamily(opts = {}) {
  const s = await setup();
  await configHoliday(s.pc, opts);
  seedWindow(1); seedWindow(2);
  boostLevels();
  setToday(HOL_START);
  seedDailyGate(HOL_START);
  const g = await call('/api/coop/gathering?childId=1', { cookie: s.c1 });
  assert.equal(g.j.available, true, JSON.stringify(g.j));
  assert.equal(g.j.me.state, 'gathered', JSON.stringify(g.j.me));
  return s;
}

/* 打一整场到分出胜负：双方每回合选当前上场宠威力最大的攻击招 */
async function playBattle(cookies, battleId, token1) {
  let view = null;
  for (let round = 0; round < 40; round++) {
    const st1 = await call('/api/battle/coop/state', { method: 'POST', cookie: cookies.c1, body: { battleId, token: token1 } });
    view = st1.j.battle;
    if (!view || view.status === 'finished' || view.status === 'abandoned') break;
    if (view.status !== 'active') throw new Error('unexpected status ' + view.status);
    const pick = (v, mine) => {
      const side = v.sides[v.mySeat === 'L' ? 'A' : 'B'];
      const pet = side.pets[side.activeIdx || 0];
      const atk = [...pet.moves].sort((a, b) => (b.power || 0) - (a.power || 0))[0];
      return atk.name;
    };
    const m1 = pick(view, true);
    const r1 = await call('/api/battle/coop/submit', { method: 'POST', cookie: cookies.c1, body: { battleId, token: token1, roundNo: view.roundNo, action: { type: 'move', moveName: m1 } } });
    assert.equal(r1.j.ok, true, JSON.stringify(r1.j));
    const st2 = await call('/api/battle/coop/state', { method: 'POST', cookie: cookies.c2, body: { battleId } });
    const v2 = st2.j.battle;
    if (v2.status !== 'active') { view = v2; break; }
    const m2 = pick(v2, true);
    const r2 = await call('/api/battle/coop/submit', { method: 'POST', cookie: cookies.c2, body: { battleId, roundNo: v2.roundNo, action: { type: 'move', moveName: m2 } } });
    assert.equal(r2.j.ok, true, JSON.stringify(r2.j));
    view = r2.j.battle;
    if (view.status === 'finished') break;
  }
  return view;
}
async function createAndJoin(s) {
  const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1', benchNo: null } });
  assert.equal(cr.j.ok, true, JSON.stringify(cr.j));
  const jn = await call('/api/battle/coop/join', { method: 'POST', cookie: s.c2, body: { battleId: cr.j.battleId, childId: 2, password: '0000', benchNo: null } });
  assert.equal(jn.j.ok, true, JSON.stringify(jn.j));
  return { battleId: cr.j.battleId, token1: cr.j.token, token2: jn.j.joinToken };
}

/* ================= 用例 ================= */

describe('合作道馆 批1', () => {
  test('迁移 0007/0008：coop 表与 battles 新列齐备', () => {
    const tables = raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    for (const t of ['coop_events', 'coop_node_progress', 'coop_gatherings', 'coop_rounds', 'coop_submissions', 'coop_runs', 'coop_settlements', 'coop_grants']) assert.ok(tables.includes(t), t);
    const cols = raw.prepare('PRAGMA table_info(battles)').all().map((r) => r.name);
    for (const c of ['coop_event_id', 'node_id', 'run_id', 'seat_meta', 'since_epoch', 'version', 'round_no']) assert.ok(cols.includes(c), c);
  });

  test('总开关关：孩子端不可见、coop 接口一律拒绝', async () => {
    const s = await setup();
    await configHoliday(s.pc, { master: false });
    const g = await call('/api/coop/gathering?childId=1', { cookie: s.c1 });
    assert.equal(g.j.available, false); assert.equal(g.j.reason, 'coop_disabled');
    const mp = await call('/api/coop/map?childId=1', { cookie: s.c1 });
    assert.equal(mp.j.available, false);
    const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1' } });
    assert.equal(cr.j.ok, false); assert.equal(cr.j.error, 'coop_disabled');
    const st = await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId: 1 } });
    assert.equal(st.j.error, 'coop_disabled');
  });

  test('家长配置回读＋科目锁定（已有集结快照后改科目被拒）', async () => {
    const s = await readyFamily();
    const cfg = await call('/api/parent/holiday/config', { cookie: s.pc });
    assert.equal(cfg.j.masterEnabled, true);
    assert.equal(cfg.j.holiday.holiday_id, 'test_hol');
    assert.deepEqual(cfg.j.subjects[1], SUBJS);
    const bad = await call('/api/parent/holiday/config/update', { method: 'POST', cookie: s.pc, body: { subjects: { 1: ['语文'] } } });
    assert.equal(bad.j.ok, false); assert.equal(bad.j.error, 'subjects_locked');
  });

  test('账号隔离：孩子会话不能读队友的集结数据', async () => {
    const s = await readyFamily();
    const g = await call('/api/coop/gathering?childId=2', { cookie: s.c1 });
    assert.equal(g.j.ok, false);
  });

  test('未达标：队友阅读差天数 → 集结未成、建局被拒 not_gathered', async () => {
    const s = await setup();
    await configHoliday(s.pc);
    seedWindow(1); seedWindow(2, { readingCap: 10 });
    boostLevels();
    setToday(HOL_START); seedDailyGate(HOL_START);
    const g = await call('/api/coop/gathering?childId=1', { cookie: s.c1 });
    assert.equal(g.j.me.state, 'gathered');
    assert.notEqual(g.j.team.state, 'all_gathered');
    const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1' } });
    assert.equal(cr.j.ok, false); assert.equal(cr.j.error, 'not_gathered');
  });

  test('节点未开放：n3 锁定 → node_locked', async () => {
    const s = await readyFamily();
    const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n3' } });
    assert.equal(cr.j.ok, false); assert.equal(cr.j.error, 'node_locked');
  });

  test('全链路：建局→加入→打完 N1→双边结算落账、零经验、幂等', async () => {
    const s = await readyFamily();
    const xpBefore = raw.prepare('SELECT id, total_xp, balls, balls_super FROM children ORDER BY id').all();
    const { battleId, token1 } = await createAndJoin(s);
    const view = await playBattle(s, battleId, token1);
    assert.equal(view.status, 'finished', JSON.stringify(view).slice(0, 300));
    assert.equal(view.ended, 'win');
    // 节点推进与 grants
    const np = raw.prepare("SELECT state FROM coop_node_progress WHERE node_id IN ('n1','n2') ORDER BY node_id").all();
    assert.equal(np[0].state, 'cleared'); assert.equal(np[1].state, 'open');
    const grants = raw.prepare('SELECT user_id, reward_type FROM coop_grants ORDER BY user_id').all();
    assert.ok(grants.length >= 2 && grants.every((g) => g.reward_type === 'node_sticker'));
    const kid1 = raw.prepare('SELECT stickers FROM children WHERE id=1').get();
    assert.ok(JSON.parse(kid1.stickers).includes('合作贴纸·波波'), kid1.stickers);
    const run = raw.prepare('SELECT end_reason, counts_toward_cap FROM coop_runs').get();
    assert.equal(run.end_reason, 'win'); assert.equal(run.counts_toward_cap, 1);
    // 红线：经验/球不变
    const xpAfter = raw.prepare('SELECT id, total_xp, balls, balls_super FROM children ORDER BY id').all();
    assert.deepEqual(xpAfter, xpBefore);
    // 幂等：再次拉状态不重复发奖
    await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId, token: token1 } });
    const n2 = raw.prepare('SELECT COUNT(*) AS c FROM coop_grants').get();
    assert.equal(n2.c, grants.length);
    // 场次：当日第二场被拒
    seedDailyGate(HOL_START);
    const cr2 = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n2' } });
    assert.equal(cr2.j.ok, false); assert.equal(cr2.j.error, 'daily_cap_reached');
  });

  test('并发双提交：同一回合只结算一次', async () => {
    const s = await readyFamily();
    const { battleId, token1 } = await createAndJoin(s);
    const st = await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId, token: token1 } });
    const v = st.j.battle;
    const pet = v.sides.A.pets[v.sides.A.activeIdx || 0];
    const mv = [...pet.moves].sort((a, b) => (b.power || 0) - (a.power || 0))[0].name;
    const pet2 = v.sides.B.pets[v.sides.B.activeIdx || 0];
    const mv2 = [...pet2.moves].sort((a, b) => (b.power || 0) - (a.power || 0))[0].name;
    const [r1, r2] = await Promise.all([
      call('/api/battle/coop/submit', { method: 'POST', cookie: s.c1, body: { battleId, token: token1, roundNo: 1, action: { type: 'move', moveName: mv } } }),
      call('/api/battle/coop/submit', { method: 'POST', cookie: s.c2, body: { battleId, roundNo: 1, action: { type: 'move', moveName: mv2 } } }),
    ]);
    assert.equal(r1.j.ok, true, JSON.stringify(r1.j)); assert.equal(r2.j.ok, true, JSON.stringify(r2.j));
    const subs = raw.prepare('SELECT COUNT(*) AS c FROM coop_submissions WHERE battle_id=? AND round_no=1').get(battleId);
    assert.equal(subs.c, 2);
    const rd = raw.prepare('SELECT COUNT(*) AS c FROM coop_rounds WHERE battle_id=? AND round_no=1 AND resolved_at IS NOT NULL').get(battleId);
    assert.equal(rd.c, 1);
    // 只结算一次：要么进入第 2 回合，要么第 1 回合已分胜负（馆主被双杀时 round_no 停在 1、status=finished）
    const brow = raw.prepare('SELECT round_no, status FROM battles WHERE id=?').get(battleId);
    assert.ok((brow.round_no === 2 && brow.status === 'active') || (brow.round_no === 1 && brow.status === 'finished'), JSON.stringify(brow));
  });

  test('退出计场次：quit 后当日再建局被拒', async () => {
    const s = await readyFamily();
    const { battleId, token1 } = await createAndJoin(s);
    const q = await call('/api/battle/coop/quit', { method: 'POST', cookie: s.c1, body: { battleId, token: token1 } });
    assert.equal(q.j.ok, true);
    const run = raw.prepare('SELECT end_reason, counts_toward_cap FROM coop_runs').get();
    assert.equal(run.end_reason, 'quit'); assert.equal(run.counts_toward_cap, 1);
    const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1' } });
    assert.equal(cr.j.ok, false); assert.equal(cr.j.error, 'daily_cap_reached');
  });

  test('waiting 超时作废不计场次：可立即重建', async () => {
    const s = await readyFamily();
    const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1' } });
    assert.equal(cr.j.ok, true);
    raw.prepare('UPDATE battles SET created_epoch = created_epoch - 700 WHERE id=?').run(cr.j.battleId);
    const st = await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId: cr.j.battleId, token: cr.j.token } });
    assert.equal(st.j.battle.status, 'abandoned');
    const run = raw.prepare('SELECT counts_toward_cap FROM coop_runs').get();
    assert.equal(run.counts_toward_cap, 0);
    const cr2 = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1' } });
    assert.equal(cr2.j.ok, true, JSON.stringify(cr2.j));
  });

  test('挂起与恢复：自动代选两次转 suspended，密码 resume 回同一 run/回合', async () => {
    const s = await readyFamily({ baseLevel: 12 });
    raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_coop_fast_clock','1')").run();
    const { battleId, token1 } = await createAndJoin(s);
    // 直接拨推进器：两席在线、计时接近自动代选阈值 → kid2 被代选（kid1 已真实提交）
    const st = await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId, token: token1 } });
    const pet = st.j.battle.sides.A.pets[st.j.battle.sides.A.activeIdx || 0];
    const mv = [...pet.moves].sort((a, b) => (b.power || 0) - (a.power || 0))[0].name;
    await call('/api/battle/coop/submit', { method: 'POST', cookie: s.c1, body: { battleId, token: token1, roundNo: 1, action: { type: 'move', moveName: mv } } });
    const bump = () => {
      const row = raw.prepare('SELECT seat_meta FROM battles WHERE id=?').get(battleId);
      const meta = JSON.parse(row.seat_meta);
      const nowV = meta.L.last_seen_epoch; // 模块虚拟时钟基准（带 debug 偏移），不能用真实 epoch
      meta.L.last_seen_epoch = nowV; meta.R.last_seen_epoch = nowV;
      meta.timer.both_online_ms = 18000; meta.timer.last_tick_epoch = nowV;
      raw.prepare('UPDATE battles SET seat_meta=? WHERE id=?').run(JSON.stringify(meta), battleId);
    };
    bump();
    await M.advanceCoopBattle(env.DB, env, battleId, 'L');
    let sub = raw.prepare("SELECT is_auto_pick FROM coop_submissions WHERE battle_id=? AND round_no=1 AND seat='R'").get(battleId);
    assert.equal(sub.is_auto_pick, 1);
    // 第二回合再代选一次 → streak=2 → suspended
    const st2 = await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId, token: token1 } });
    if (st2.j.battle.status === 'active') {
      const pet2 = st2.j.battle.sides.A.pets[st2.j.battle.sides.A.activeIdx || 0];
      const mv2 = [...pet2.moves].sort((a, b) => (b.power || 0) - (a.power || 0))[0].name;
      await call('/api/battle/coop/submit', { method: 'POST', cookie: s.c1, body: { battleId, token: token1, roundNo: st2.j.battle.roundNo, action: { type: 'move', moveName: mv2 } } });
      bump();
      await M.advanceCoopBattle(env.DB, env, battleId, 'L');
    }
    const brow = raw.prepare('SELECT status, run_id, round_no FROM battles WHERE id=?').get(battleId);
    assert.equal(brow.status, 'suspended', JSON.stringify(brow));
    // resume：kid2 输密码换新 token，两席在线后恢复 active，run 不变
    const rs = await call('/api/battle/coop/resume', { method: 'POST', cookie: s.c2, body: { battleId, childId: 2, password: '0000' } });
    assert.equal(rs.j.ok, true, JSON.stringify(rs.j));
    assert.ok(rs.j.token);
    const after = await call('/api/battle/coop/state', { method: 'POST', cookie: s.c1, body: { battleId, token: token1 } });
    assert.equal(after.j.battle.status, 'active');
    const brow2 = raw.prepare('SELECT run_id FROM battles WHERE id=?').get(battleId);
    assert.equal(brow2.run_id, brow.run_id);
  });

  test('补集结：缺口固定、集结日补齐后 makeup_pass 且可开战', async () => {
    const s = await setup();
    await configHoliday(s.pc);
    seedWindow(1);
    seedWindow(2, { readingCap: 10, shortDays: 2 }); // 阅读差 2 天、作业差少量 → D=3
    boostLevels();
    setToday(HOL_START); seedDailyGate(HOL_START);
    let g = await call('/api/coop/gathering?childId=2', { cookie: s.c2 });
    assert.equal(g.j.me.state, 'continue_in_holiday', JSON.stringify(g.j.me));
    // 缺口在假期首日 24:00 终结算时固定：拨到次日刷新后可见（R=2、H=0 → D=3）
    setToday(addD(HOL_START, 1));
    g = await call('/api/coop/gathering?childId=2', { cookie: s.c2 });
    assert.ok(g.j.me.makeup && g.j.me.makeup.need === 3, JSON.stringify(g.j.me.makeup));
    // 三个集结日
    for (let i = 0; i < 3; i++) {
      const d = addD(HOL_START, i);
      setToday(d);
      seedApproved(2, d, ['语文', '阅读']);
      seedApproved(1, d, ['语文', '阅读']);
      g = await call('/api/coop/gathering?childId=2', { cookie: s.c2 });
    }
    assert.equal(g.j.me.state, 'gathered', JSON.stringify(g.j.me));
    assert.equal(g.j.team.state, 'all_gathered');
    seedDailyGate(addD(HOL_START, 2));
    const cr = await call('/api/battle/coop/create', { method: 'POST', cookie: s.c1, body: { childId: 1, nodeId: 'n1' } });
    assert.equal(cr.j.ok, true, JSON.stringify(cr.j));
  });
});
