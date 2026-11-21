/* 友好度战斗加成（2026-11-07，用户“带上吧”并进第一期）：node --test tests/friendship-battle.test.mjs
 * 口径（ARGON C 包 §2.4/§2.6＋任务表第 32 行）：友好度 0–255，51 分一颗心；
 * 硬撑 ≥153 留 1 HP（3 心 10%、4 心 15%、5 心 20%，每场限 1 次）；
 * 闪避 ≥204 时 +5%（只动官方分支命中检定行）；暴击 255 时主宠出招暴击率 1/16→1/8。
 * 作用范围：只进道馆单人战、只作用于主宠（key==='main'）；备战宠、PvP、合作战一律不吃。
 * 脚本化 rng 的掷骰构成（探针 /tmp/probe-abilities.mjs 实测）：一回合 9 次＝
 * 馆主决策 2 次（蓄力判定＋选招）＋玩家 calcDamage 3 次（命中＋随机＋暴击）＋馆主 calcDamage 3 次＋硬撑 1 次；
 * 免疫短路时不消耗随机数。测试按此构成排第 6/9 次掷骰。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

/* ---------------- 纯函数：档位与 tryEndure ---------------- */

describe('endureRate 档位', () => {
  test('0/152→0，153→0.10，204→0.15，255→0.20', () => {
    assert.equal(M.endureRate(0), 0);
    assert.equal(M.endureRate(152), 0);
    assert.equal(M.endureRate(153), 0.10);
    assert.equal(M.endureRate(203), 0.10);
    assert.equal(M.endureRate(204), 0.15);
    assert.equal(M.endureRate(254), 0.15);
    assert.equal(M.endureRate(255), 0.20);
    assert.equal(M.endureRate(300), 0.20);
    assert.equal(M.endureRate(undefined), 0);
  });
});

describe('tryEndure', () => {
  const st = (friendship, used = false) => ({ gym: { friendship, endureUsed: used } });
  const main = { key: 'main', name: '皮卡丘', hp: 0 };
  const bench = { key: 'dex:123', name: '飞天螳螂', hp: 0 };
  test('3 心 10%：掷骰 0.05 触发留 1 HP 并标记已用；再触发失败', () => {
    const s = st(153);
    assert.equal(M.tryEndure(s, 'A', main, () => 0.05), true);
    assert.equal(main.hp, 1);
    assert.equal(s.gym.endureUsed, true);
    main.hp = 0;
    assert.equal(M.tryEndure(s, 'A', main, () => 0.01), false);
    assert.equal(main.hp, 0);
  });
  test('掷骰未中、友好度不足、备战宠、B 方、无 gym 字段均不触发', () => {
    const m1 = { key: 'main', name: '皮卡丘', hp: 0 };
    assert.equal(M.tryEndure(st(153), 'A', m1, () => 0.5), false);
    assert.equal(m1.hp, 0);
    const m2 = { key: 'main', name: '皮卡丘', hp: 0 };
    assert.equal(M.tryEndure(st(152), 'A', m2, () => 0.01), false);
    const m3 = { key: 'main', name: '皮卡丘', hp: 0 };
    assert.equal(M.tryEndure(st(255), 'B', m3, () => 0.01), false);
    assert.equal(M.tryEndure(st(255), 'A', bench, () => 0.01), false);
    assert.equal(bench.hp, 0);
    const m4 = { key: 'main', name: '皮卡丘', hp: 0 };
    assert.equal(M.tryEndure({}, 'A', m4, () => 0.01), false);
    assert.equal(M.tryEndure(null, 'A', m4, () => 0.01), false);
  });
});

/* ---------------- calcDamage 级：闪避与暴击 ---------------- */

describe('闪避与暴击（calcDamage 级）', () => {
  const boss = { key: 'boss', name: '小拉达', type: '普通', no: 19, level: 18, maxHp: 100, hp: 100, defTypes: ['普通'], moves: [{ name: '撞击', type: '普通', power: 35 }] };
  const main = { key: 'main', name: '皮卡丘', type: '电', no: 25, level: 18, maxHp: 100, hp: 100, defTypes: ['电'], moves: [{ name: '电光一闪', type: '电', power: 40 }] };
  test('闪避边界：命中 100 的招，掷骰 0.96 时 dodge 5 落空、dodge 0 命中', () => {
    const miss = M.calcDamage({ name: '撞击', type: '普通', power: 35 }, boss, main, () => 0.96, { chart: 'official', dodgePct: 5 });
    assert.equal(miss.missed, true);
    const hit = M.calcDamage({ name: '撞击', type: '普通', power: 35 }, boss, main, () => 0.96, { chart: 'official' });
    assert.equal(hit.missed, undefined);
    assert.ok(hit.dmg > 0);
  });
  test('经典分支不做命中检定：dodgePct 在经典分支无效', () => {
    const r = M.calcDamage({ name: '撞击', type: '普通', power: 35 }, boss, main, () => 0.96, { dodgePct: 5 });
    assert.equal(r.missed, undefined);
    assert.ok(r.dmg > 0);
  });
  test('暴击边界：掷骰 0.10 时 1/8 暴击、1/16 不暴击', () => {
    const crit = M.calcDamage({ name: '电光一闪', type: '电', power: 40 }, main, boss, () => 0.10, { chart: 'official', critRate: 1 / 8 });
    assert.equal(crit.critical, true);
    const noCrit = M.calcDamage({ name: '电光一闪', type: '电', power: 40 }, main, boss, () => 0.10, { chart: 'official', critRate: 1 / 16 });
    assert.equal(noCrit.critical, false);
  });
});

/* ---------------- 道馆集成：脚本化 rng ---------------- */

// 馆主决策 2 次＋玩家 3 次＋馆主 3 次＋硬撑 1 次＝9 次；第 n 次掷骰取 overrides[n]，其余 0.5。
function scriptedRng(overrides) {
  let n = 0;
  return () => { n++; return overrides[n] !== undefined ? overrides[n] : 0.5; };
}
function gymState(mainDesc, bossDesc, friendship, benchDesc = null) {
  const pets = [M.makePet(mainDesc)];
  if (benchDesc) pets.push(M.makePet(benchDesc));
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A',
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: benchDesc ? 1 : 0, pets },
      B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
    },
  });
  st.gym.friendship = friendship;
  st.gym.endureUsed = false;
  return st;
}
const MAIN25 = { key: 'main', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] };
const BOSS19 = { key: 'boss', name: '小拉达', type: '普通', no: 19, defTypes: ['普通'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] };
const BENCH123 = { key: 'dex:123', name: '飞天螳螂', type: '飞行', no: 123, defTypes: ['飞行'], level: 18, moves: [{ name: '连斩', type: '虫', power: 40 }] };

describe('道馆集成：硬撑', () => {
  test('友好度 153、硬撑掷骰 0.05：第 9 次掷骰触发，主宠留 1 HP、未分胜负', () => {
    const st = gymState(MAIN25, BOSS19, 153);
    st.sides.A.pets[0].hp = 1;
    const r = M.resolveGymRound(st, { moveName: '电光一闪' }, scriptedRng({ 9: 0.05 }));
    assert.equal(r.error, undefined);
    const ev = r.events.find((e) => e.type === 'endure');
    assert.ok(ev, JSON.stringify(r.events));
    assert.match(ev.text, /撑住了/);
    assert.equal(st.sides.A.pets[0].hp, 1);
    assert.equal(st.gym.endureUsed, true);
    assert.equal(st.winner, null);
  });
  test('友好度 153、掷骰全 0.5：硬撑不触发，主宠倒下、馆主胜', () => {
    const st = gymState(MAIN25, BOSS19, 153);
    st.sides.A.pets[0].hp = 1;
    const r = M.resolveGymRound(st, { moveName: '电光一闪' }, () => 0.5);
    assert.ok(r.events.some((e) => e.type === 'faint' && e.side === 'A'));
    assert.ok(!r.events.some((e) => e.type === 'endure'));
    assert.equal(st.winner, 'B');
  });
  test('每场限 1 次：第一回合硬撑，第二回合再致命即倒下', () => {
    const st = gymState(MAIN25, BOSS19, 153);
    st.sides.A.pets[0].hp = 1;
    const r1 = M.resolveGymRound(st, { moveName: '电光一闪' }, scriptedRng({ 9: 0.05 }));
    assert.ok(r1.events.some((e) => e.type === 'endure'));
    assert.equal(st.sides.A.pets[0].hp, 1);
    const r2 = M.resolveGymRound(st, { moveName: '电光一闪' }, scriptedRng({ 9: 0.05 }));
    assert.ok(!r2.events.some((e) => e.type === 'endure'));
    assert.ok(r2.events.some((e) => e.type === 'faint' && e.side === 'A'));
    assert.equal(st.winner, 'B');
  });
  test('备战宠不吃硬撑：友好度 255，飞天螳螂被打倒不触发', () => {
    const mainFainted = { ...MAIN25, key: 'main' };
    const st = gymState(mainFainted, BOSS19, 255, BENCH123);
    st.sides.A.pets[0].hp = 0; // 主宠已倒，备战宠上场
    st.sides.A.pets[1].hp = 1;
    const r = M.resolveGymRound(st, { moveName: '连斩' }, scriptedRng({ 9: 0.01 }));
    assert.ok(!r.events.some((e) => e.type === 'endure'), JSON.stringify(r.events));
    assert.ok(r.events.some((e) => e.type === 'faint' && e.side === 'A'));
  });
  test('旧存量对局无 friendship 字段：默认 0，不触发硬撑', () => {
    const st = gymState(MAIN25, BOSS19, 0);
    delete st.gym.friendship;
    delete st.gym.endureUsed;
    st.sides.A.pets[0].hp = 1;
    const r = M.resolveGymRound(st, { moveName: '电光一闪' }, scriptedRng({ 9: 0.01 }));
    assert.ok(!r.events.some((e) => e.type === 'endure'));
    assert.equal(st.gym.friendship, 0);
  });
});

describe('道馆集成：闪避与暴击', () => {
  test('闪避：友好度 204，馆主命中掷骰 0.96 落空；友好度 0 则命中', () => {
    const st = gymState(MAIN25, BOSS19, 204);
    const hpBefore = st.sides.A.pets[0].hp;
    const r = M.resolveGymRound(st, { moveName: '电光一闪' }, scriptedRng({ 6: 0.96 }));
    const miss = r.events.find((e) => e.type === 'miss' && e.side === 'B');
    assert.ok(miss, JSON.stringify(r.events));
    assert.equal(st.sides.A.pets[0].hp, hpBefore);
    const st2 = gymState(MAIN25, BOSS19, 0);
    const hp2 = st2.sides.A.pets[0].hp;
    M.resolveGymRound(st2, { moveName: '电光一闪' }, scriptedRng({ 6: 0.96 }));
    assert.ok(st2.sides.A.pets[0].hp < hp2);
  });
  test('暴击：友好度 255，主宠暴击掷骰 0.10 会心一击；友好度 0 则不暴击', () => {
    const st = gymState(MAIN25, BOSS19, 255);
    const r = M.resolveGymRound(st, { moveName: '电光一闪' }, scriptedRng({ 4: 0.10 })); // 暴击掷骰：第 4 掷（馆主 AI 2 掷＋命中 1 掷之后；2026-11-17 暴击移到 A/D 计算之前，顺序提前一掷）
    const atkEv = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(atkEv, JSON.stringify(r.events));
    assert.equal(atkEv.critical, true);
    assert.match(atkEv.text, /会心一击/);
    const st2 = gymState(MAIN25, BOSS19, 0);
    const r2 = M.resolveGymRound(st2, { moveName: '电光一闪' }, scriptedRng({ 4: 0.10 }));
    const atkEv2 = r2.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.equal(atkEv2.critical, false);
  });
  test('备战宠不吃暴击加成：友好度 255，飞天螳螂暴击掷骰 0.10 不暴击', () => {
    const st = gymState(MAIN25, BOSS19, 255, BENCH123);
    st.sides.A.pets[0].hp = 0;
    const r = M.resolveGymRound(st, { moveName: '连斩' }, scriptedRng({ 4: 0.10 })); // 第 4 掷 0.10：备战宠暴击率仍 1/16，0.10 > 1/16 不暴击
    const atkEv = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(atkEv, JSON.stringify(r.events));
    assert.equal(atkEv.critical, false);
  });
});

describe('PvP 不吃友好度加成', () => {
  function pvpState() {
    const a = M.makePet(MAIN25);
    const b = M.makePet(BOSS19);
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [a] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b] },
      },
    });
    st.turn = 'A'; st.acted = { A: 1, B: 1 }; // 模拟已过首回合：双方均可出招
    return st;
  }
  test('主宠出招仍走 PvP 暴击率 1/24：掷骰 0.10 不暴击（道馆 1/8 会暴击）', () => {
    const st = pvpState();
    const r = M.applyBattleAction(st, 'A', '电光一闪', () => 0.10, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    const atkEv = r.events.find((e) => e.type === 'attack');
    assert.equal(atkEv.critical, false);
    // 即使有人误把 st.gym 挂上 PvP 对局，applyBattleAction 也不读它。
    const st2 = pvpState();
    st2.gym = { friendship: 255, endureUsed: false };
    const r2 = M.applyBattleAction(st2, 'A', '电光一闪', () => 0.10, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    assert.equal(r2.events.find((e) => e.type === 'attack').critical, false);
  });
  test('PvP 被打不吃闪避：掷骰 0.96 命中（道馆 204 会落空）', () => {
    const st = pvpState();
    st.turn = 'B'; // 轮到 B 出招
    const r = M.applyBattleAction(st, 'B', '撞击', () => 0.96, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    const atkEv = r.events.find((e) => e.type === 'attack');
    assert.ok(atkEv);
    assert.ok(atkEv.dmg > 0);
  });
});

/* ---------------- API 集成：开局读友好度、/api/child 带字段 ---------------- */

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql', '0023_care_qa_and_friendship.sql', '0043_pet_instances_ability.sql'];

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

describe('API 集成：友好度进对局', () => {
  test('道馆开局把友好度挂到 st.gym，/api/child 返回 friendship 字段', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, M.xpForLevel(8)); // S1 需 Lv.5
    // 主宠实例友好度 200（4 心档）：开局应原样挂进 state。
    raw.prepare("INSERT INTO pet_instances(child_id, line_key, species_no, form_idx, branch, source, egg_id, evolved_via, has_been_main, created_epoch, updated_epoch, friendship) VALUES(1,'pikachu',25,0,NULL,'main',NULL,NULL,1,1,1,200)").run();
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    const row = raw.prepare('SELECT state FROM battles WHERE id=?').get(start.j.battle.battleId);
    const stState = JSON.parse(row.state);
    assert.equal(stState.gym.friendship, 200);
    assert.equal(stState.gym.endureUsed, false);
    const child = await call('/api/child?id=1', { cookie: c1 });
    assert.equal(child.j.ok, true, JSON.stringify(child.j));
    assert.equal(child.j.child.friendship, 200);
  });
  test('友好度 0（无实例行）：开局默认 0，/api/child 返回 0', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, M.xpForLevel(8));
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie: c1, body: { childId: 1, stage: 1 } });
    assert.equal(start.j.ok, true, JSON.stringify(start.j));
    const row = raw.prepare('SELECT state FROM battles WHERE id=?').get(start.j.battle.battleId);
    assert.equal(JSON.parse(row.state).gym.friendship, 0);
    const child = await call('/api/child?id=1', { cookie: c1 });
    assert.equal(child.j.child.friendship, 0);
  });
});
