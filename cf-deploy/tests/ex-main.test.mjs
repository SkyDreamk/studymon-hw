// tests/ex-main.test.mjs
// 任务 110：招式跟宠走——前主宠进携带、备战走自己线的招式表。
// harness 照 tests/bench-test-mode-full.test.mjs（node:sqlite 内存库＋全量迁移 0001–0022）。
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = [
  '0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql',
  '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql',
  '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql',
  '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql',
  '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql',
  '0021_skill_levels.sql', '0022_warehouse.sql',
];

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
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
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
function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
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
// 小宝切到伊布线（测试模式 free），并把周末道馆的进场条件备齐。
async function switchToEevee(pc) {
  const r = await call('/api/parent/switch-line', { method: 'POST', cookie: pc, body: { childId: 2, line: 'eevee' } });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(r.j.ok, true);
  assert.equal(r.j.free, true);
  return r;
}

describe('任务 110：前主宠招式跟宠走', () => {
  test('0. 纯函数：lineMovesFor 按线给招，不读 child.line', () => {
    const child = { line: 'eevee', total_xp: M.xpForLevel(10), move_levels: '{}', unlocked_moves: '[]', fairy_moves: '[]' };
    const ch = M.lineMovesFor(child, 'charmander', 10, '火');
    assert.deepEqual(ch.map((m) => m.name), ['抓', '叫声', '火花', '烟幕', '火焰牙', '劈开', '喷射火焰', '龙爪', '闪焰冲锋']);
    assert.equal(ch.find((m) => m.name === '火花').power, 25 + 6 * 4);
    assert.ok(!ch.some((m) => m.name === '大字爆炎'), 'Lv.10 还没学会大字爆炎（Lv.11）');
    const ev = M.lineMovesFor(child, 'eevee', 10, '普通');
    assert.ok(ev.some((m) => m.name === '影子球'), '伊布线独有招：影子球');
    assert.ok(!ev.some((m) => m.fairy), 'fairy_moves 为空时不追加妖精招');
    // 招式等级按招式名共享（move_levels 与主宠/收藏同一张表）
    const leveled = M.lineMovesFor({ ...child, move_levels: JSON.stringify({ '火花': 3 }) }, 'charmander', 10, '火');
    assert.equal(leveled.find((m) => m.name === '火花').skillLevel, 3);
    assert.equal(leveled.find((m) => m.name === '火花').power, 25 + 6 * 4 + 6 * 2);
  });

  test('1. 切线后旧主宠进携带：火恐龙 5 号 carried=1、仓库带 exMain', async () => {
    const { pc } = await setup();
    setXp(2, M.xpForLevel(10));
    await switchToEevee(pc);
    const row = raw.prepare("SELECT entry_key, carried FROM pokedex WHERE child_id=2 AND entry_key='egg:5'").get();
    assert.ok(row, '应写出 egg:5 行');
    assert.equal(row.carried, 1, '携带未满（0/4）时旧主宠应进携带');
    const wh = await call('/api/warehouse/status?childId=2', { cookie: pc });
    assert.equal(wh.j.ok, true, JSON.stringify(wh.j));
    const five = wh.j.carried.find((c) => c.no === 5);
    assert.ok(five, '仓库携带列表应有火恐龙');
    assert.equal(five.name, '火恐龙');
    assert.equal(five.type, '火');
    assert.equal(five.exMain, true);
    assert.equal(five.lineKey, 'charmander');
    assert.equal(wh.j.mainPet.no, 133, '主宠已是伊布');
    assert.ok(!wh.j.carried.some((c) => c.no === 133), '新主宠伊布不得同时出现在携带（去重）');
  });

  test('2. 备战：测试模式 benchOptions 含火恐龙（164 只）、道馆开局带线招式', async () => {
    const { pc } = await setup();
    setXp(2, M.xpForLevel(10));
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(2, weekStart, 4);
    await switchToEevee(pc);
    const st = await call('/api/gym/status', { method: 'POST', cookie: pc, body: { childId: 2 } });
    assert.equal(st.j.ok, true, JSON.stringify(st.j));
    assert.equal(st.j.benchOptions.length, 164, '164 收藏种（含已进名册的前主宠火恐龙，去重后不重复）');
    assert.ok(st.j.benchOptions.some((c) => c.no === 5 && c.name === '火恐龙'), 'benchOptions 应含火恐龙');
    assert.equal(st.j.benchOptions.filter((c) => c.no === 5).length, 1, '不重复');
    assert.ok(st.j.collection.some((c) => c.no === 5), '正式口径（collection）同样含火恐龙');
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: pc, body: { childId: 2, stage: 1, benchNo: 5 } });
    assert.equal(start.j.ok, true, `备战火恐龙开局应成功：${JSON.stringify(start.j)}`);
    const bench = start.j.battle.sides.A.pets[1];
    assert.equal(bench.no, 5);
    assert.equal(bench.name, '火恐龙');
    assert.equal(bench.type, '火');
    const names = bench.moves.map((m) => m.name);
    assert.ok(names.includes('火花'), '线招式：火花');
    assert.ok(names.includes('喷射火焰'), '线招式：喷射火焰');
    assert.ok(!names.includes('大字爆炎'), 'Lv.10 未学会的线招不应出现');
  });

  test('3. 招式升级：前主宠的线招能升（走 lineMovesFor，不走收藏表）', async () => {
    const { pc, c2 } = await setup();
    setXp(2, M.xpForLevel(10));
    await switchToEevee(pc);
    raw.prepare('UPDATE children SET quiz_fragments=3 WHERE id=2').run();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie: c2,
      body: { childId: 2, moveName: '火花', benchNo: 5 },
    });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.move.name, '火花');
    assert.equal(r.j.move.skillLevel, 2);
    assert.equal(r.j.move.power, 25 + 6 * 4 + 6 * 1, '升 2 级后威力应按线招等级重算');
    assert.equal(raw.prepare('SELECT quiz_fragments FROM children WHERE id=2').get().quiz_fragments, 0);
  });

  test('4. 对称：切回小火龙线后，伊布进携带、备战走伊布线招式', async () => {
    const { pc } = await setup();
    setXp(2, M.xpForLevel(10));
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(2, weekStart, 4);
    await switchToEevee(pc);
    const back = await call('/api/parent/switch-line', { method: 'POST', cookie: pc, body: { childId: 2, line: 'charmander' } });
    assert.equal(back.j.ok, true, JSON.stringify(back.j));
    assert.equal(back.j.free, true, '切回当过主宠的线免费');
    const row5 = raw.prepare("SELECT carried FROM pokedex WHERE child_id=2 AND entry_key='egg:5'").get();
    assert.equal(row5.carried, 0, '火恐龙升回主宠后 carried 应清零');
    const row133 = raw.prepare("SELECT carried FROM pokedex WHERE child_id=2 AND entry_key='egg:133'").get();
    assert.ok(row133, '应写出 egg:133 行');
    assert.equal(row133.carried, 1, '伊布应进携带');
    const wh = await call('/api/warehouse/status?childId=2', { cookie: pc });
    const ev = wh.j.carried.find((c) => c.no === 133);
    assert.ok(ev, '仓库携带应有伊布');
    assert.equal(ev.exMain, true);
    assert.equal(ev.lineKey, 'eevee');
    // 关键判别：备战伊布的招必须是线表（影子球）而非收藏表——收藏表 133 号没有影子球
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: pc, body: { childId: 2, stage: 1, benchNo: 133 } });
    assert.equal(start.j.ok, true, `备战伊布开局应成功：${JSON.stringify(start.j)}`);
    const bench = start.j.battle.sides.A.pets[1];
    assert.equal(bench.no, 133);
    assert.equal(bench.name, '伊布');
    const names = bench.moves.map((m) => m.name);
    assert.ok(names.includes('影子球'), '线招式：影子球（收藏表 133 没有）');
    assert.ok(names.includes('摇尾巴'));
  });
});
