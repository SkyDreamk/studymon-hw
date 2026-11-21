/* 审核触发遭遇的日期口径（2026-11-15 用户纠正）：按审批当天，不按打卡提交日。
 * 背景：打卡提交日（checkins.date）与审批日可能隔天——补审旧打卡时，遭遇若按提交日
 * 落库，一出生就是过期日期：pendingEncounter 只读当天、投球拒绝非当天日期，孩子永远
 * 打不开；随后新遭遇一生成，看起来就是“第一个被第二个顶掉”（测试站蚊香君 id 86）。
 * 覆盖：周末必触发下补审旧打卡，遭遇日期＝审批当天、孩子当天能打开；同一审批日只生成
 * 一场；工作日补审即使触发，遭遇日期也不得早于审批当天。
 * 不部署、不碰 staging D1；不消耗真实打卡记录（内存库）。
 * node --test tests/encounter-approval-date.test.mjs */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0027_daily_english.sql', '0028_care_wheel.sql', '0029_daily_english_assess.sql', '0030_daily_chinese.sql', '0031_daily_math.sql', '0043_pet_instances_ability.sql'];

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

let env, raw, parentCookie;
beforeEach(async () => {
  ({ env, raw } = makeEnv());
  const parent = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(parent.status, 200);
  parentCookie = parent.cookie;
  const set = await call('/api/parent/settings/update', {
    method: 'POST', cookie: parentCookie,
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

function realShanghaiToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}

function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// 把模拟今天拨到最近的目标星期（0=周日..6=周六），返回模拟今天的日期串
function shiftTodayTo(targetDow) {
  const realToday = realShanghaiToday();
  const [y, m, d] = realToday.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (targetDow - dow + 7) % 7;
  raw.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('debug_day_offset',?)").run(String(delta));
  return addDaysStr(realToday, delta);
}

function insertPendingCheckin(childId, date, subject) {
  const r = raw.prepare(
    "INSERT INTO checkins(child_id,date,subjects,submitted_at,submitted_epoch,is_early,status) VALUES(?,?,?, '18:00',1790000000,0,'pending')"
  ).run(childId, date, JSON.stringify([subject]));
  return Number(r.lastInsertRowid);
}

test('补审旧打卡触发的遭遇按审批当天日期（周末必触发）', async () => {
  const today = shiftTodayTo(6); // 最近的周六，周末必触发、确定性生成
  const yesterday = addDaysStr(today, -1); // 周五的打卡，今天补审
  const checkinId = insertPendingCheckin(1, yesterday, '语文');
  const r = await call('/api/parent/review', { method: 'POST', cookie: parentCookie, body: { checkinId, decision: 'approve' } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.ok(r.j.encounter, '周末应必触发遭遇');
  const rows = raw.prepare('SELECT * FROM encounters WHERE child_id=1').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, today, `遭遇日期应为审批当天 ${today}，不是打卡提交日 ${yesterday}`);
  assert.equal(rows[0].status, 'pending');
  // 孩子当天就能打开这场遭遇（旧口径下它一出生就过期）
  const ck = await childCookie(1, '1111');
  const p = await call('/api/encounter/pending', { method: 'POST', cookie: ck, body: { childId: 1 } });
  assert.equal(p.status, 200, JSON.stringify(p.j));
  assert.ok(p.j.encounter, '审批当天应能打开这场遭遇');
  assert.equal(p.j.encounter.id, rows[0].id);
});

test('同一审批日只生成一场遭遇（新口径守卫按当天日期）', async () => {
  const today = shiftTodayTo(6); // 周六
  const yesterday = addDaysStr(today, -1);
  const firstId = insertPendingCheckin(1, yesterday, '语文');
  const secondId = insertPendingCheckin(1, today, '数学');
  const r1 = await call('/api/parent/review', { method: 'POST', cookie: parentCookie, body: { checkinId: firstId, decision: 'approve' } });
  assert.equal(r1.status, 200, JSON.stringify(r1.j));
  assert.ok(r1.j.encounter, '首条审批应触发遭遇');
  const r2 = await call('/api/parent/review', { method: 'POST', cookie: parentCookie, body: { checkinId: secondId, decision: 'approve' } });
  assert.equal(r2.status, 200, JSON.stringify(r2.j));
  assert.equal(r2.j.encounter, null, '同一审批日已有遭遇，不应再生成第二场');
  const rows = raw.prepare('SELECT * FROM encounters WHERE child_id=1').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, today);
});

test('工作日补审：即使触发，遭遇日期也不得早于审批当天', async () => {
  const today = shiftTodayTo(1); // 最近的周一，25% 概率触发
  const yesterday = addDaysStr(today, -1);
  const checkinId = insertPendingCheckin(1, yesterday, '语文');
  const r = await call('/api/parent/review', { method: 'POST', cookie: parentCookie, body: { checkinId, decision: 'approve' } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  const rows = raw.prepare('SELECT * FROM encounters WHERE child_id=1').all();
  for (const row of rows) {
    assert.ok(row.date >= today, `遭遇日期 ${row.date} 不得早于审批当天 ${today}`);
  }
});
