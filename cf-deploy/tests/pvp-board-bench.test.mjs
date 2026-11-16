/* 兄弟对战棋盘备战宠上板（任务 73，2026-11-09）端到端测试：
 * node --test tests/pvp-board-bench.test.mjs
 * harness 同 battle.test（node:sqlite 内存库＋迁移），另加 0022_warehouse（carried 列）；
 * 覆盖：建局时备战快照、加入后两方备战、裁剪回备战、无收藏宠时 bench 为空数组、
 * 备战等级/体力按当前 battleLevel 现算（满血、同 PvP 体力口径）、出战阵容与规则不动。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql', '0022_warehouse.sql'];

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
/* 给孩子一只携带收藏宠（carried=1） */
function giveCarried(childId, no) {
  raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, carried, unlocked_at) VALUES(?,?,1,'2026-01-01')").run(childId, M.dexKeyForSpecies(no));
}

async function pvpFixture() {
  const s = await setup();
  const { weekStart } = gotoWeekday(6); // 周六
  seedApprovedDays(1, weekStart, 4);
  seedApprovedDays(2, weekStart, 4);
  setXp(1, M.xpForLevel(12)); // 大宝 Lv.12
  setXp(2, M.xpForLevel(5));  // 小宝 Lv.5
  return s;
}

describe('任务 73：备战宠上板（端到端）', () => {
  test('建局时快照：备战 = 携带宠减去出战宠，满血、等级按建局等级', async () => {
    const { c1 } = await pvpFixture();
    giveCarried(1, 54); giveCarried(1, 37); giveCarried(1, 74); giveCarried(1, 98);
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const v = create.j.battle;
    assert.equal(v.status, 'waiting');
    // 出战阵容不动：主宠＋54
    assert.equal(v.sides.A.pets.length, 2);
    assert.equal(v.sides.A.pets[1].no, 54);
    // 备战 3 只（按 no 升序），不含出战的 54，不含主宠物种
    assert.deepEqual(v.sides.A.bench.map((p) => p.no), [37, 74, 98]);
    for (const p of v.sides.A.bench) {
      assert.equal(p.level, 12, '备战等级按建局 battleLevel 现算');
      assert.equal(p.hp, p.maxHp, '备战满血');
      assert.equal(p.maxHp, Math.round(M.statsFor(p.no, 12).hp * M.PVP_HP_MULT), '备战体力同 PvP 口径');
      assert.equal(p.fainted, false);
      assert.equal(p.moves, undefined, '备战展示不带招式');
    }
  });

  test('加入后两方备战：等级按压平等级重算，出战阵容与回合规则不动', async () => {
    const { c1 } = await pvpFixture();
    giveCarried(1, 54); giveCarried(1, 37); giveCarried(1, 74); giveCarried(1, 98);
    giveCarried(2, 43); giveCarried(2, 16);
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c1, body: { battleId: create.j.battle.battleId, childId: 2, password: '0000', benchNo: 43 } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    const v = join.j.battle;
    assert.equal(v.status, 'active');
    // 出战 2v2，压平到 Lv.5
    assert.equal(v.sides.A.pets.length, 2);
    assert.equal(v.sides.B.pets.length, 2);
    assert.equal(v.sides.A.pets[0].level, 5);
    // A 方备战 3 只（37/74/98），B 方备战 1 只（16）
    assert.deepEqual(v.sides.A.bench.map((p) => p.no), [37, 74, 98]);
    assert.deepEqual(v.sides.B.bench.map((p) => p.no), [16]);
    for (const p of [...v.sides.A.bench, ...v.sides.B.bench]) {
      assert.equal(p.level, 5, '加入展平后备战等级按 battleLevel 现算');
      assert.equal(p.hp, p.maxHp);
      assert.equal(p.maxHp, Math.round(M.statsFor(p.no, 5).hp * M.PVP_HP_MULT));
    }
  });

  test('裁剪回备战：对方无收藏宠 → 出战数取 1v1，被裁掉的出战宠回备战展示', async () => {
    const { c1 } = await pvpFixture();
    giveCarried(1, 54); giveCarried(1, 37); giveCarried(1, 74); giveCarried(1, 98);
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1, benchNo: 54 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    const join = await call('/api/battle/pvp/join', { method: 'POST', cookie: c1, body: { battleId: create.j.battle.battleId, childId: 2, password: '0000' } });
    assert.equal(join.j.ok, true, JSON.stringify(join.j));
    const v = join.j.battle;
    assert.equal(v.sides.A.pets.length, 1, '出战数取较少一方，A 方裁到只剩主宠');
    assert.equal(v.sides.B.pets.length, 1);
    // 被裁掉的 54 回到备战，A 方备战 4 只
    assert.deepEqual(v.sides.A.bench.map((p) => p.no), [37, 54, 74, 98]);
    assert.deepEqual(v.sides.B.bench, [], '无收藏宠一方 bench 为空数组（非 undefined）');
  });

  test('无收藏宠：建局备战为空数组，出战只有主宠', async () => {
    const { c1 } = await pvpFixture();
    const create = await call('/api/battle/pvp/create', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(create.j.ok, true, JSON.stringify(create.j));
    assert.equal(create.j.battle.sides.A.pets.length, 1);
    assert.deepEqual(create.j.battle.sides.A.bench, []);
  });
});
