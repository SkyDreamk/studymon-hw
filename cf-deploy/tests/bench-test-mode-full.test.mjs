// tests/bench-test-mode-full.test.mjs
// 测试站备战选择（2026-11-06 用户 20:07 提问、22:20 追问；道馆 2026-11-14 改仓库口径）：
// 兄弟对战加入方改 pv.benchOptions || bColl；道馆选择器 2026-11-14 起只列随身队（j.collection＝携带，
// 最多 4 只＋主宠＝5 球），不再吃 j.benchOptions——服务端测试模式仍返回 164 种 benchOptions，
// ownsSpecies 在测试模式仍对全部收藏种放行（供直接调 API 测对战），与前端选择器口径不再一致是故意的。
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
  '0021_skill_levels.sql', '0022_warehouse.sql', '0043_pet_instances_ability.sql',
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
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
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
// 复现用户测试站状态：孩子 1 只携带六尾（wild:37），其余收藏种一律未携带。
function seedOnlyVulpixCarried() {
  raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(1, 'wild:37', '2026-01-01', 1)").run();
  raw.prepare("INSERT INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(1, 'wild:50', '2026-01-01', 0)").run();
}

describe('测试站备战选择（2026-11-06；道馆前端选择区 2026-11-16 已撤，后端 benchNo 能力保留）', () => {
  test('0. 前端接线（任务 127）：道馆备战选择区已撤，随身 5 球即全部可用；PvP 加入方选择器用 benchOptions 回落到携带列表', () => {
    const src = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    // 任务 127：道馆页不再有备战选择（先发与换宠都在战斗里扔球选，换备战去仓库换携带）。
    // 2026-11-16 用户纠正：5 球是查看携带精灵的窗口，不能撤——benchList 回来只供展示（gymPartyBallsHtml，无选中态）。
    assert.ok(src.includes('const benchList = (j.collection || []).filter((c) => c.no !== mainNo);'), '道馆 benchList 应在（供随身队伍展示）');
    assert.ok(src.includes('gymPartyBallsHtml(mainPet, benchList, G.id)'), '道馆应画随身队伍展示');
    assert.ok(!src.includes('benchPickerHtml(benchList,'), '道馆备战球选择器应已移除');
    assert.ok(!src.includes('function benchPickerHtml('), 'benchPickerHtml 函数应已移除');
    assert.ok(!src.includes('function openGymBenchCard('), 'openGymBenchCard 函数应已移除');
    assert.ok(!src.includes('j.benchOptions || j.collection'), '道馆不得再用 benchOptions 回落');
    assert.ok(!src.includes('benchFoldBtn'), '「全部 151 只」折叠已删');
    // 房号模式：旧加入表单已撤（pvpJoinFormHtml 含 bColl = pv.benchOptions），加入方改在道馆页
    // 选备战（与发起方同一栏，只列携带列表；服务端仍校验备战须已收集）。
    assert.ok(!src.includes('pvpJoinFormHtml'), '旧加入表单应已撤');
    assert.ok(!src.includes('const bColl = pv.benchOptions || ('), '旧加入方 benchOptions 写法应已撤');
    // A 方栏仍只读、只列携带：不得出现 aColl 用 benchOptions 的写法。
    assert.ok(!src.includes('aColl = pv.benchOptions'), 'A 方栏不得用 benchOptions');
  });

  test('1. 道馆：测试模式 /api/gym/status 返回 164 种 benchOptions；只携带六尾时 collection 仅 1 只', async () => {
    const { c1 } = await setup();
    seedOnlyVulpixCarried();
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.ok, true, JSON.stringify(st.j));
    assert.equal(st.j.collection.length, 1, '复现用户状态：携带列表只剩六尾');
    assert.equal(st.j.collection[0].no, 37);
    assert.ok(Array.isArray(st.j.benchOptions), '测试模式应返回 benchOptions');
    assert.equal(st.j.benchOptions.length, 164, 'benchOptions 应为全部 164 种收藏种');
    assert.ok(st.j.benchOptions.some((c) => c.no === 143), 'benchOptions 应含卡比兽 143（非携带）');
    assert.ok(!st.j.collection.some((c) => c.no === 143), '143 不在携带列表里');
  });

  test('2. 道馆端到端：非携带的卡比兽 143 能选为备战并正常开局', async () => {
    const { c1 } = await setup();
    seedOnlyVulpixCarried();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, M.xpForLevel(10));
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1, benchNo: 143 } });
    assert.equal(start.j.ok, true, `非携带 143 开局应成功：${JSON.stringify(start.j)}`);
    // 队伍人数不限（原版全随身队）：主宠＋备战 143＋携带六尾 37，共 3 只。
    assert.equal(start.j.battle.sides.A.pets.length, 3, '备战与携带队都应进局');
    assert.equal(start.j.battle.sides.A.pets[1].no, 143);
    assert.ok(start.j.battle.sides.A.pets.some((p) => p.no === 37), '携带六尾应在队里');
  });

  test('3. 兄弟对战：测试模式 /api/battle/pvp/status 返回 164 种 benchOptions；加入方可用非携带 143', async () => {
    const { c1, c2 } = await setup();
    seedOnlyVulpixCarried();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    seedApprovedDays(2, weekStart, 4);
    setXp(1, M.xpForLevel(12));
    setXp(2, M.xpForLevel(5));
    const pv = await call('/api/battle/pvp/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(pv.j.ok, true, JSON.stringify(pv.j));
    assert.ok(Array.isArray(pv.j.benchOptions), 'PvP 状态应返回 benchOptions');
    assert.equal(pv.j.benchOptions.length, 164);
    assert.ok(pv.j.benchOptions.some((c) => c.no === 143));
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 37 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const battleId = create.j.battle.battleId;
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c2, body: { battleId, childId: 2, password: '2222', benchNo: 143 } });
    assert.equal(join.j.ok, true, `加入方用非携带 143 应成功：${JSON.stringify(join.j)}`);
    assert.equal(join.j.battle.sides.B.pets.length, 2);
    assert.equal(join.j.battle.sides.B.pets[1].no, 143);
  });
});
