/* 副宠等级与主宠经验同步：node --test tests/bench.test.mjs
 * 核查口径（用户 2026-10-24）：副宠（备战宠）战斗等级取主宠 total_xp 换算的等级，
 * 道馆/PvP/合作三条线一致，展示只显示主宠当前等级、不另存一套副宠等级。
 * 实测结论：战斗侧三条线本就以 battleLevel 建副宠（buildPlayerSide 全宠同级，
 * flattenSideLevel 全宠压平），本文件以回归断言锁住该行为；展示侧等级已移到
 * 卡片内（2026-10-27 紧凑版：备战选择器球下只显示名字，不再显示等级行）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
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
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } }, raw };
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
      VALUES(?,?,'["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, M.addDays(weekStart, i));
  }
}

describe('副宠等级同步主宠经验', () => {
  test('flattenSideLevel：主副宠一并压平到同一等级、HP 一并重算', () => {
    const main = M.makePet({ key: 'main', name: '皮丘', type: '电', level: 8, moves: [{ name: '电击', type: '电', power: 50 }] });
    const bench = M.makePet({ key: 'dex:54', name: '可达鸭', type: '水', level: 8, moves: [{ name: '头痛水花', type: '水', power: 46 }] });
    const side = { childId: 1, childName: '大宝', battleLevel: 8, activeIdx: 0, pets: [main, bench] };
    M.flattenSideLevel(side, 5);
    assert.equal(side.battleLevel, 5);
    assert.equal(side.pets[0].level, 5);
    assert.equal(side.pets[1].level, 5, '副宠应与主宠一同压平到 5 级');
    assert.equal(side.pets[1].maxHp, M.pvpMaxHp(5));
    assert.equal(side.pets[1].hp, M.pvpMaxHp(5));
  });

  test('道馆开局：副宠等级＝主宠 total_xp 换算等级（Lv.5），HP 同口径', async () => {
    const { dateStr, weekStart } = gotoWeekday(6);
    void dateStr;
    seedApprovedDays(1, weekStart, 4);
    raw.prepare('UPDATE children SET total_xp=400 WHERE id=1').run(); // xpForLevel(5)=400 → Lv.5
    raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(1,'wild:54','2026-01-01')").run();
    const pc = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    assert.equal(pc.status, 200);
    await call('/api/parent/settings/update', { method: 'POST', cookie: pc.cookie, body: { childPasswords: [{ id: 1, password: '0000' }] } });
    const c1 = await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '0000' } });
    assert.equal(c1.status, 200);
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1.cookie, body: { childId: 1, stage: 1, benchNo: 54 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    const sideA = start.j.battle.sides.A;
    assert.equal(sideA.battleLevel, 11); // 等比换算：战斗内等级用有效等级 floor(5×2.25)=11；展示等级见 pets[].level（appLevel=5）
    assert.equal(sideA.pets[0].level, 5);
    assert.equal(sideA.pets[1].level, 5, '副宠等级应与主宠同为 Lv.5');
    assert.equal(sideA.pets[1].maxHp, M.statsFor(54, 11).hp); // 可达鸭有效 Lv.11 实际 HP 32（等比换算口径；展示等级仍为 App Lv.5）
  });

  test('等级换算单源：levelFromXp 与主宠展示等级同一函数，无副宠独立等级字段', () => {
    assert.equal(M.levelFromXp(400), 5);
    assert.equal(M.levelFromXp(399), 4);
    // pokedex 收藏行无等级列：副宠等级无处可存，只能取主宠等级
    const cols = raw.prepare("SELECT name FROM pragma_table_info('pokedex')").all().map((c) => c.name);
    assert.ok(!cols.includes('level'), 'pokedex 不应有 level 列');
  });
});
