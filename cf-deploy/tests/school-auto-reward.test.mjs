/* 学校成绩奖励自动发放单测（2026-10-29 §87）：node --test tests/school-auto-reward.test.mjs
 * 覆盖：普通随机三类（球／经验+20／回血药四段权重）、95+ 两份都得、活力碎片进转盘且可领取、
 * 手动发放 UI 已删、孩子端不再显示“等爸爸妈妈发奖励”、重复发放 CAS 挡住、周 caps／照片条件未动。
 * 脚手架与 tests/evo-items.test.mjs 同款（真实 Azure 调用 0 次）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
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
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
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

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function toProd() {
  env = { ...env };
  delete env.TEST_MODE;
  await M.applyDebugTime(env.DB, env);
}

function seqRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
async function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return await fn(); } finally { Math.random = orig; }
}
async function withSeqRandom(values, fn) {
  const orig = Math.random;
  Math.random = seqRng(values);
  try { return await fn(); } finally { Math.random = orig; }
}

function todayStr() { return M.shDateStr(); }
function invQty(childId, key) {
  const r = raw.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').get(childId, key);
  return r ? r.qty : 0;
}
function insertPendingSchoolTest(childId, subject, unit, score, fullScore, photoKey) {
  const today = todayStr();
  const now = Math.floor(Date.now() / 1000);
  const pct = Math.round((score / fullScore) * 1000) / 10;
  const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, photo_key, photo_expires_epoch, reward_granted, status, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,?,?,0,'pending',?,?)")
    .run(childId, subject, unit, score, fullScore, pct, today, photoKey, photoKey ? now + 15 * 86400 : null, now, today);
  return Number(ins.lastInsertRowid);
}
function insertActiveSchoolTest(childId, subject, unit, score, fullScore) {
  const today = todayStr();
  const now = Math.floor(Date.now() / 1000);
  const pct = Math.round((score / fullScore) * 1000) / 10;
  const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?,'active',0,?,?)")
    .run(childId, subject, unit, score, fullScore, pct, today, now, today);
  return Number(ins.lastInsertRowid);
}

describe('rollSchoolOrdinary', () => {
  test('0.1 落球段：普通球', () => {
    const r = M.rollSchoolOrdinary(() => 0.1);
    assert.equal(r.kind, 'ball');
    assert.equal(r.key, 'ball:normal');
  });
  test('0.5 落经验段：经验+20', () => {
    const r = M.rollSchoolOrdinary(() => 0.5);
    assert.equal(r.kind, 'xp');
    assert.equal(r.xp, 20);
    assert.equal(r.key, 'xp:20');
  });
  test('回血药四段权重：0→伤药、42.5→好伤药、59.5→树果汁、76.5→美味之水', () => {
    assert.equal(M.rollSchoolOrdinary(seqRng([0.9, 0.0])).key, 'medicine:potion');
    assert.equal(M.rollSchoolOrdinary(seqRng([0.9, 0.5])).key, 'medicine:super-potion');
    assert.equal(M.rollSchoolOrdinary(seqRng([0.9, 0.7])).key, 'medicine:berry-juice');
    assert.equal(M.rollSchoolOrdinary(seqRng([0.9, 0.9])).key, 'medicine:water');
  });
});

describe('rollWheelPrize revive', () => {
  test('0.72 落活力碎片段（147 权重下 105.8 落 100~110 段）', () => {
    const prize = M.rollWheelPrize(() => 0.72, new Set(), new Set());
    assert.equal(prize.kind, 'medicine');
    assert.equal(prize.key, 'medicine:revive');
  });
});

describe('school auto reward review/save/grant', () => {
  test('审核 88 分无照片：自动发普通球，无转盘机会', async () => {
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '第一单元', 88, 100, null);
    const before = raw.prepare('SELECT balls FROM children WHERE id=1').get().balls;
    const r = await withRandom(0.1, () => call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ordinary.granted.kind, 'ball', JSON.stringify(r.j));
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(rec).reward_granted, 1);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls - before, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM ball_grants WHERE child_id=1 AND kind='normal'").get().n, 1);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 0);
  });

  test('审核 90 分：自动发经验+20 并补 item_grants 审计行', async () => {
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '第一单元', 90, 100, null);
    const before = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    const r = await withRandom(0.5, () => call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ordinary.granted.kind, 'xp', JSON.stringify(r.j));
    assert.equal(raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp - before, 20);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM item_grants WHERE child_id=1 AND item_key='xp:20'").get().n, 1);
  });

  test('审核 92 分：自动发回血药（伤药）并写 item_ledger', async () => {
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '第一单元', 92, 100, null);
    const r = await withSeqRandom([0.9, 0.0], () => call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ordinary.granted.key, 'medicine:potion', JSON.stringify(r.j));
    assert.equal(invQty(1, 'medicine:potion'), 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM item_ledger WHERE child_id=1 AND item_key='medicine:potion' AND reason='school-test'").get().n, 1);
  });

  test('审核 96 分+照片：普通＋转盘两份都得；重复审核 400', async () => {
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '期中考试', 96, 100, 'school/1/1.jpg');
    const r = await withRandom(0.1, () => call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ordinary.granted.kind, 'ball', JSON.stringify(r.j));
    assert.equal(r.j.wheelChance, true);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 1);
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(rec).reward_granted, 1);
    const r2 = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } });
    assert.equal(r2.status, 400);
  });

  test('审核 80 分：不发普通；补发入口 400（85 分以上）', async () => {
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '期中考试', 80, 100, null);
    const r = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.ok(!r.j.ordinary || !r.j.ordinary.granted, JSON.stringify(r.j));
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(rec).reward_granted, 0);
    const g = await call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec } });
    assert.equal(g.status, 400);
    assert.match(g.j.error, /85 分以上/);
  });

  test('补发入口：active 未发记录补发一次普通；再发 409', async () => {
    const cookie = await parentCookie();
    const rec = insertActiveSchoolTest(1, '数学', '第3单元', 100, 100);
    const r = await withRandom(0.5, () => call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.granted.kind, 'xp', JSON.stringify(r.j));
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(rec).reward_granted, 1);
    const r2 = await call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec } });
    assert.equal(r2.status, 409);
  });

  test('补发入口拒发：pending 400（含还在等审核）；rejected 400（含已被驳回）', async () => {
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '期中考试', 90, 100, null);
    const g1 = await call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec } });
    assert.equal(g1.status, 400);
    assert.match(g1.j.error, /还在等审核/);
    raw.prepare("UPDATE school_test_records SET status='rejected' WHERE id=?").run(rec);
    const g2 = await call('/api/parent/school-test/grant', { method: 'POST', cookie, body: { recordId: rec } });
    assert.equal(g2.status, 400);
    assert.match(g2.j.error, /已被驳回/);
  });

  test('家长直登保存 90 分：自动发普通球', async () => {
    const cookie = await parentCookie();
    const r = await withRandom(0.1, () => call('/api/parent/school-test/save', { method: 'POST', cookie, body: { childId: 1, subject: '数学', unit: '期中考试', score: 90, fullScore: 100, examDate: todayStr() } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ordinary.granted.kind, 'ball', JSON.stringify(r.j));
    assert.equal(r.j.record.rewardGranted, true);
  });

  test('照片条件未动（正式模式）：96 分无照片不记转盘，但普通仍发', async () => {
    await toProd();
    const cookie = await parentCookie();
    const rec = insertPendingSchoolTest(1, '数学', '期中考试', 96, 100, null);
    const r = await withRandom(0.1, () => call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec, decision: 'approve' } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.wheelChance, false);
    assert.match(r.j.wheelReason, /上传试卷照片/);
    assert.equal(r.j.ordinary.granted.kind, 'ball', JSON.stringify(r.j));
  });

  test('周 caps 未动（正式模式）：同科目同周第二条不记转盘，但普通仍发', async () => {
    await toProd();
    const cookie = await parentCookie();
    const rec1 = insertPendingSchoolTest(1, '数学', '期中考试', 96, 100, 'school/1/1.jpg');
    const a = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec1, decision: 'approve' } });
    assert.equal(a.j.wheelChance, true);
    const rec2 = insertPendingSchoolTest(1, '数学', '单元测验', 97, 100, 'school/1/2.jpg');
    const b = await call('/api/parent/school-test/review', { method: 'POST', cookie, body: { recordId: rec2, decision: 'approve' } });
    assert.equal(b.status, 200, JSON.stringify(b.j));
    assert.equal(b.j.wheelChance, false);
    assert.match(b.j.wheelReason, /这门科目本周已经有过一次高级转盘机会啦/);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM wheel_chances').get().n, 1);
    assert.equal(raw.prepare('SELECT reward_granted FROM school_test_records WHERE id=?').get(rec2).reward_granted, 1);
  });

  test('转盘转到活力碎片：prize medicine，进背包，机会耗尽', async () => {
    const cookie = await parentCookie();
    const today = todayStr();
    const ins = raw.prepare("INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, status, reward_granted, created_epoch, date_shanghai) VALUES(1,'数学','第3单元',96,100,96,?,'active',0,0,?)").run(today, today);
    raw.prepare('INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(1,?,?,0,?)').run(Number(ins.lastInsertRowid), M.weekStartMon(today), today);
    const r = await withRandom(0.72, () => call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } }));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.prize.kind, 'medicine', JSON.stringify(r.j));
    assert.equal(r.j.prize.key, 'medicine:revive', JSON.stringify(r.j));
    assert.equal(invQty(1, 'medicine:revive'), 1);
    assert.equal(r.j.chancesLeft, 0);
    const r2 = await call('/api/evo/wheel/spin', { method: 'POST', cookie, body: { childId: 1 } });
    assert.equal(r2.status, 400);
  });
});

describe('school auto reward frontend', () => {
  test('手动发放 UI 已删、孩子端等待文案已删、自动规则文案在位', () => {
    const app = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    assert.doesNotMatch(app, /等爸爸妈妈发奖励/);
    assert.doesNotMatch(app, /st-grant-/);
    assert.doesNotMatch(app, /SCHOOL_GRANT_OPTIONS/);
    assert.doesNotMatch(app, /grantSchoolTest\(/);
    assert.match(app, /schoolRewardLabel/);
    assert.match(app, /自动发普通奖励/);
    assert.match(app, /活力碎片/);
  });
});
