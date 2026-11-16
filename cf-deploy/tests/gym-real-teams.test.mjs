/* 真实队伍通关测试（2026-10-28 收紧实施，用户点选主选组合：S1 ×2.33 / S2 ×1.7 / S3 ×1.7 / S4 ×1.85，S4 hpMult 4.0——2026-11-07 天气后收紧，2.7→4.0）：
 * 用生产导出常量建宠跑仿真，与筛查表 work/sim-tighten-20261028.txt 逐数对照；
 * S4 通关断言从 battle.test.mjs:603 移入此处（设计备战波波 16 新模型下无道具单场 0.0%）。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const M = await import(new URL('../src/index.js', import.meta.url));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SIM_N = 2000;

// 期望威力＝威力 × 命中率（未收录招式按 100 计）；贪心按期望伤害选招。
const expPower = (m) => m.power * ((M.officialAccuracy(m.name) ?? 100) / 100);

function v11MainPet(line, appLevel) {
  const moves = M.effectiveMoves(line, appLevel, []).map((m) => { const off = M.officialMove(m.name); return { name: m.name, type: off ? off.type : M.LINE_TYPE[line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * m.level }; });
  return M.makePet({ key: 'main', name: '主宠', type: M.LINE_TYPE[line], no: M.lineFormNo(line, appLevel), defTypes: M.playerDefTypes(M.lineFormNo(line, appLevel)), level: M.effPlayerLevel(appLevel), moves: moves.length ? moves : [{ name: '撞击', type: '普通', power: 35 }] });
}
function v11BenchPet(no, appLevel) {
  const sp = M.SPECIES[no];
  // 招式按真实等级（appLevel）学，战斗等级仍取等比换算（与 buildPlayerSide 同口径）。
  const eff = M.collectionMovesFor({ move_levels: '{}' }, no, appLevel);
  const moves = eff.length
    ? eff.map((m) => ({ name: m.name, type: m.type, damage_class: m.damage_class, power: m.power }))
    : [{ name: '撞击', type: '普通', power: 35 }];
  return M.makePet({ key: `dex:${no}`, name: sp.name, type: sp.type, no, defTypes: M.playerDefTypes(no), level: M.effPlayerLevel(appLevel), moves });
}

function playStageReal(stageCfg, appLevel, line, benchNo, useItems, rng) {
  const bossType = (M.SPECIES[stageCfg.bossNo] || {}).type || '普通';
  const bossTypes = M.bossDefTypes(stageCfg.bossNo);
  const pets = [v11MainPet(line, appLevel)];
  if (benchNo) pets.push(v11BenchPet(benchNo, appLevel));
  const bossEff = M.effBossLevel(stageCfg);
  const boss = M.makePet({
    key: 'boss', name: '馆主', type: bossType, defTypes: bossTypes, no: stageCfg.bossNo, level: bossEff, hpMult: stageCfg.hpMult,
    moves: stageCfg.bossMoves.map(([name, type, power]) => { const off = M.officialMove(name); return { name, type, damage_class: off ? off.damage_class : undefined, power }; }),
  });
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A', weather: stageCfg.weather || null, // 天气（第三期简化版）：按关卡配置生效，S4＝晴天
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: M.effPlayerLevel(appLevel), activeIdx: 0, pets },
      B: { childId: null, childName: '馆主', battleLevel: bossEff, activeIdx: 0, pets: [boss] },
    },
  });
  const attackMoves = (pet) => pet.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; });
  const bestMove = (pet) => {
    const atk = attackMoves(pet);
    return atk.reduce((a, b) => (expPower(b) * M.typeMultOfficialMulti(b.type, bossTypes) > expPower(a) * M.typeMultOfficialMulti(a.type, bossTypes) ? b : a), atk[0]);
  };
  const bestHit = (pet) => Math.max(...attackMoves(pet).map((m) => expPower(m) * M.typeMultOfficialMulti(m.type, bossTypes)));
  const bossExpHit = (pet) => {
    const foeFrac = pet.hp / pet.maxHp;
    const pCharge = foeFrac <= 0.3 ? 0.1 : 0.25;
    const topW = foeFrac <= 0.3 ? 0.75 : 0.5;
    const sorted = [...boss.moves].sort((a, b) => b.power - a.power);
    const rest = (1 - topW) / Math.max(1, sorted.length - 1);
    let exp = 0;
    sorted.forEach((m, i) => { exp += (i === 0 ? topW : rest) * expPower(m) * M.typeMultOfficialMulti(m.type, pet.defTypes || [pet.type]); });
    return (1 - pCharge) * exp * (1 + pCharge * 0.5);
  };
  let heals = 0, revives = 0, guard = 0;
  while (!st.winner && guard++ < 200) {
    const A = st.sides.A;
    const active = A.pets[A.activeIdx];
    const bossPet = st.sides.B.pets[st.sides.B.activeIdx];
    if (useItems) {
      const faintIdx = A.pets.findIndex((p, i) => i !== A.activeIdx && p.hp <= 0);
      if (faintIdx >= 0 && revives < 1 && active.hp <= bossExpHit(active) && bossPet.hp > bestHit(active)) {
        const r = M.resolveGymRound(st, { itemKey: 'medicine:revive', targetIdx: faintIdx }, rng);
        if (!r.error) { revives++; continue; }
      }
    }
    if (active.key === 'main' && active.hp / active.maxHp < 0.35) {
      const bi = A.pets.findIndex((p, i) => i !== A.activeIdx && p.hp > 0 && p.hp / p.maxHp > active.hp / active.maxHp + 0.2 && bestHit(p) > bestHit(active));
      if (bi >= 0) {
        const r = M.resolveGymRound(st, { swapToIdx: bi }, rng);
        if (!r.error) continue;
      }
    }
    if (useItems) {
      if (active.hp > 0 && active.hp < active.maxHp && active.hp <= bossExpHit(active) && bossPet.hp > bestHit(active) && bossPet.hp <= 2 * bestHit(active) && heals < 2) {
        const r = M.resolveGymRound(st, { itemKey: 'medicine:potion' }, rng);
        if (!r.error) { heals++; continue; }
      }
    }
    const move = bestMove(active);
    M.resolveGymRound(st, { moveName: move.name }, rng);
  }
  return st.winner === 'A' ? 1 : 0;
}

function simCellReal(stageCfg, appLevel, line, benchNo, useItems, seed) {
  let wins = 0;
  const rng = mulberry32(seed);
  for (let i = 0; i < SIM_N; i++) wins += playStageReal(stageCfg, appLevel, line, benchNo, useItems, rng);
  return wins / SIM_N * 100;
}

// 真实队伍（正式库亲查）：大宝 pikachu 备宠 111/123/98；小宝 charmander 备宠 43/54/179。
const cfgOf = (stage) => M.GYM_STAGES.find((g) => g.stage === stage);
const seedBase = (stage, pl, benchNo, line) => 424242 + stage * 10000 + pl * 100 + (benchNo || 0) + (line === 'charmander' ? 7 : 0);
function runCell(stage, appLv, line, benchNo, useItems) {
  return simCellReal(cfgOf(stage), appLv, line, benchNo, useItems, seedBase(stage, appLv, benchNo, line) + 777777);
}

describe('等比换算常量（生产口径）', () => {
  test('玩家 ×2.25、馆主 S1 ×2.33 / S2 ×1.7 / S3 ×1.7 / S4 ×1.85 / S5 ×1.85 / S6 ×1.85；S4 hpMult 4.0、S5 2.4、S6 2.6', () => {
    assert.equal(M.PLAYER_SCALE, 2.25);
    assert.deepEqual(M.BOSS_SCALE, { 1: 2.33, 2: 1.7, 3: 1.7, 4: 1.85, 5: 1.85, 6: 1.85 });
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 2).hpMult, 1.8);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 4).hpMult, 4.0);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 5).hpMult, 2.4);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 6).hpMult, 2.6);
    assert.equal(M.effPlayerLevel(8), 18);
    assert.equal(M.effBossLevel(cfgOf(2)), 20);
    assert.equal(M.effBossLevel(cfgOf(4)), 33);
    assert.equal(M.effBossLevel(cfgOf(1)), 13);
    assert.equal(M.effBossLevel(cfgOf(3)), 22);
    assert.equal(M.effBossLevel(cfgOf(5)), 38);
    assert.equal(M.effBossLevel(cfgOf(6)), 42);
    // 形态守卫（2026-10-27 已纠正过一次）：大宝 App 8 级主宠是皮丘 172，不是皮卡丘 25。
    assert.equal(M.lineFormNo('pikachu', 8), 172);
  });
});

// STAB ×1.5 让玩家本系克制招从 ×2 变 ×3，馆主也被 STAB 但克制面不如玩家，净胜率上升；难度未调，数值只报不改。
// 2026-11-06 招式系统升级后重测：备战改走等级招式表、贪心按期望伤害（威力×命中率×克制）选招；
// 以下三格以重测值为准（±5 容差），旧筛查表 work/sim-tighten-20261028.txt 的数值仅作历史对照。
// 2026-11-06 玩家宠双属性防御重测：S2 小宝＋43 84.2%→28.15%（走路草毒属性被馆主大地之力克制，地面 0.5→1.0；
// 走路草 Lv.8 招式全为草/普通、无毒系招，无 STAB 抵消），仅此格更新期望；S4 小宝＋43 29.1%→26.2% 仍在容差内不改。
describe('PvE 收紧实施后真实队伍仿真（带道具，N=2000；2026-11-05 招式表升级后重测值 ±5 容差）', () => {
  test('S2 周六 Lv.8：小宝＋走路草 43（2026-11-06 双属性防御重测 28.15%，旧值 84.2%）', () => {
    const w = runCell(2, 8, 'charmander', 43, true);
    assert.ok(w >= 23.15 && w <= 33.15, `小宝 S2 胜率 ${w}% 应在双属性防御重测值附近（28.15% ±5）`);
  });
  test('S2 周六 Lv.8：大宝＋飞天螳螂 123 基本必赢（收紧筛查表 98.0%，旧 561869fa 为 100.0%）', () => {
    const w = runCell(2, 8, 'pikachu', 123, true);
    assert.ok(w >= 90, `大宝 S2 胜率 ${w}% 应基本必赢（新筛查表 100.0%）`);
  });
  test('S4 Lv.14：大宝＋飞天螳螂 123（招式表升级后重测 97.2%，旧筛查表 61.6%）', () => {
    const w = runCell(4, 14, 'pikachu', 123, true);
    assert.ok(w >= 92.2 && w <= 100, `大宝 S4 胜率 ${w}% 应在招式表升级后重测值附近（97.2% ±5）`);
  });
  test('S4 Lv.14：小宝＋走路草 43（特性第一期后重测 33.25% 友好度 0；友好度 153/204/255 时 37.35%/39.65%/44.45%，用户 2026-11-07 接受）', () => {
    const w = runCell(4, 14, 'charmander', 43, true);
    assert.ok(w >= 28.25 && w <= 38.25, `小宝 S4 胜率 ${w}% 应在特性第一期后重测值附近（33.25% ±5，友好度 0）`);
  });
  test('S1 Lv.8：大宝＋飞天螳螂 123 不崩（S1 系数 2.33 官方比对齐）', () => {
    const w = runCell(1, 8, 'pikachu', 123, true);
    assert.ok(w > 50, `大宝 S1 胜率 ${w}% 不应崩`);
  });
  test('S3 Lv.11：大宝＋独角犀牛 111 不崩（地面免疫，S3 系数 1.7）', () => {
    const w = runCell(3, 11, 'pikachu', 111, true);
    assert.ok(w > 50, `大宝 S3 胜率 ${w}% 不应崩`);
  });
  test('S5 火系（21×1.85=38, hpMult 2.4）：小宝 Lv17＋可达鸭 54 约 47.05%（目标带 40–55%），大宝 Lv17＋独角犀牛 111 ≥90%', () => {
    const xb = runCell(5, 17, 'charmander', 54, true);
    assert.ok(Math.abs(xb - 47.05) <= 5, `S5 小宝+54 实得 ${xb}%，期望 47.05%±5`);
    const db = runCell(5, 17, 'pikachu', 111, true);
    assert.ok(db >= 90, `S5 大宝+111 实得 ${db}%，期望 ≥90%`);
  });
  test('S6 地面（23×1.85=42, hpMult 2.6）：大宝 Lv20＋大钳蟹 98 约 46.50%（目标带 40–55%），小宝 Lv20＋走路草 43 约 76.65%', () => {
    const db = runCell(6, 20, 'pikachu', 98, true);
    assert.ok(Math.abs(db - 46.5) <= 5, `S6 大宝+98 实得 ${db}%，期望 46.50%±5`);
    const xb = runCell(6, 20, 'charmander', 43, true);
    assert.ok(Math.abs(xb - 76.65) <= 5, `S6 小宝+43 实得 ${xb}%，期望 76.65%±5`);
  });
});

/* ---------------- API 梯子（harness 逐字抄自 tests/battle.test.mjs） ---------------- */

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql'];

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
function giveDex(childId, key) {
  raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,'2026-01-01')").run(childId, key);
}

async function playGymToEnd(cookie, battleId, view) {
  let v = view;
  let rewards = null;
  let guard = 0;
  while (v.status === 'active' && guard++ < 120) {
    const sideA = v.sides.A;
    const pet = sideA.pets[sideA.activeIdx];
    const bossPet = v.sides.B.pets[v.sides.B.activeIdx];
    let body = null;
    if (pet.key === 'main' && pet.hp / pet.maxHp < 0.35) {
      const bi = sideA.pets.findIndex((p, i) => i !== sideA.activeIdx && !p.fainted);
      if (bi >= 0 && sideA.pets[bi].hp / sideA.pets[bi].maxHp > pet.hp / pet.maxHp + 0.2) body = { battleId, swapToIdx: bi };
    }
    if (!body) {
      let moveName = null;
      if (v.fx && v.fx.B && v.fx.B.charge) {
        const maxEv = Math.max(...bossPet.moves.map((m) => m.power * (0.5 + 0.05 * bossPet.level) * M.typeMultOfficialMulti(m.type, pet.defTypes || [pet.type]))) * 1.5;
        if (pet.hp <= maxEv) {
          const sh = pet.moves.find((m) => M.moveEffectOf(m.name) === 'shell');
          const wk = pet.moves.find((m) => M.moveEffectOf(m.name) === 'weak');
          moveName = (sh || wk || {}).name || null;
        }
      }
      if (!moveName) {
        const dmgMoves = pet.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; });
        const pool = dmgMoves.length ? dmgMoves : pet.moves;
        moveName = pool.reduce((a, b) => (expPower(b) * M.typeMultOfficialMulti(b.type, M.bossDefTypes(bossPet.no)) > expPower(a) * M.typeMultOfficialMulti(a.type, M.bossDefTypes(bossPet.no)) ? b : a), pool[0]).name;
      }
      body = { battleId, moveName };
    }
    const r = await call('/api/battle/move', { method: 'POST', cookie, body });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    if (r.j.rewards) rewards = r.j.rewards;
    v = r.j.battle;
  }
  assert.ok(guard < 120, '对战应在有限回合内结束');
  return { view: v, rewards };
}

async function clearGymStage(cookie, stage, benchNo, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const body = { childId: 1, stage };
    if (benchNo) body.benchNo = benchNo;
    const start = await call('/api/battle/gym/start', { method: 'POST', cookie, body });
    assert.equal(start.j.ok, true, `stage ${stage} 开局失败：${JSON.stringify(start.j)}`);
    const last = await playGymToEnd(cookie, start.j.battle.battleId, start.j.battle);
    if (last.view.winnerChildId === 1) return last;
  }
  assert.fail(`stage ${stage} 在 ${maxAttempts} 次挑战内应能通关`);
}

/* 四关全通（真实队伍版）：从 battle.test.mjs:603 移入 S4 通关断言。
 * 603 原用设计备战 {1:43, 2:179, 3:50, 4:16}；设计 bench 16（波波）在新模型下无道具单场
 * 0.0%，断言它等于断言不可能。真实队伍（正式库亲查）：大宝主宠皮丘＋备宠 111/123/98；
 * 各关用当关最强真实备宠（S1 123、S2 123、S3 111 地面免疫、S4 123）。603 保留 S1–S3
 * 设计阵容＋奖励流断言（见简报 C）。奖励断言与 603 逐字一致。 */
/* 六关全通（真实队伍版）：从 battle.test.mjs:603 移入 S4–S6 通关断言。
 * 真实队伍（正式库亲查）：大宝主宠皮丘/皮卡丘＋备宠 111/123/98；
 * 各关用当关最强真实备宠（S1 123、S2 123、S3 111 地面免疫、S4 123、S5 111 抗火克火、S6 98 水系四倍克地面/岩石）。
 * 603 保留 S1–S3 设计阵容＋奖励流断言（见简报 C）。 */
describe('六关全通（真实队伍，大宝）', () => {
  test('Lv.20 真实队伍：六关逐关通关，终奖蛋 151', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, M.xpForLevel(20)); // Lv.20，过全部六关等级门槛（S6 needLevel=20）
    const realBench = { 1: 123, 2: 123, 3: 111, 4: 123, 5: 111, 6: 98 };
    for (const no of [111, 123, 98]) giveDex(1, `wild:${no}`);
    const expectEggs = { 1: 143, 2: 131, 3: 133, 4: 147, 5: 126, 6: 208 };
    for (let stage = 1; stage <= 6; stage++) {
      const { view, rewards } = await clearGymStage(c1, stage, realBench[stage]);
      assert.equal(view.winnerChildId, 1, `stage ${stage} 应获胜`);
      assert.equal(rewards.eggSpecies, expectEggs[stage]);
      if (stage === 6) assert.equal(rewards.finalEgg, true);
    }
    const eggs = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const species = eggs.j.eggs.map((e) => e.species).sort((a, b) => a - b);
    assert.deepEqual(species, [126, 131, 133, 143, 147, 151, 208]);
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.clearedCount, 6);
    assert.equal(st.j.finalEggAwarded, true);
    assert.ok(st.j.badges.every((b) => b.lit));
  });
});

