/* 真实队伍通关测试（2026-10-28 收紧实施，用户点选主选组合：S1 ×2.33 / S2 ×1.7 / S3 ×1.7 / S4 ×1.85；2026-11-17 设计定稿 8.md 热修 hpMult [1.0, 1.0, 1.1, 1.5, 1.0, 1.3, 1.65, 1.5]）：
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

// 天气调谐基线（2026-11-17 每日随机天气后）：各关 hpMult/胜率期望是在固定天气下调谐的
// （S1 沙暴：大岩蛇岩石特防×1.5；S4 晴天：霸王花叶绿素加速），仿真固定用调谐天气，
// 其余关 null。随机天气下的胜率变化由 scripts/sim-gym-daily-weather.mjs 另行覆盖。
const TUNING_WEATHER = { 1: 'sand', 4: 'sun' };

function playStageReal(stageCfg, appLevel, line, benchNos, useItems, rng) {
  // 全队仿真（2026-11-17 用户纠正）：玩家方主宠＋全部备宠，任意先发、轮换磨过；
  // 馆主方 bossTeam 多只轮换（王牌最后），全队同有效等级；倒下后引擎自动换下一只上场。
  const bossTeam = stageCfg.bossTeam || [{ no: stageCfg.bossNo, moves: stageCfg.bossMoves }];
  const bossEff = M.effBossLevel(stageCfg);
  const bossPets = bossTeam.map((m) => {
    const sp = M.SPECIES[m.no];
    return M.makePet({
      key: `boss:${m.no}`, name: sp.name, type: sp.type, defTypes: M.bossDefTypes(m.no), no: m.no, level: bossEff, hpMult: stageCfg.hpMult,
      moves: m.moves.map(([name, type, power]) => { const off = M.officialMove(name); return { name, type, damage_class: off ? off.damage_class : undefined, power }; }),
    });
  });
  const pets = [v11MainPet(line, appLevel), ...benchNos.map((no) => v11BenchPet(no, appLevel))];
  // 最佳先发：对第一只馆主宠期望伤害最高的宠放队首
  const firstTypes = bossPets[0].defTypes || [bossPets[0].type];
  const hitVs = (pet, defTypes) => Math.max(...pet.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; }).map((m) => expPower(m) * M.typeMultOfficialMulti(m.type, defTypes)));
  let leadIdx = 0;
  pets.forEach((p, i) => { if (hitVs(p, firstTypes) > hitVs(pets[leadIdx], firstTypes)) leadIdx = i; });
  if (leadIdx > 0) { const [lead] = pets.splice(leadIdx, 1); pets.unshift(lead); }
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A', weather: TUNING_WEATHER[stageCfg.stage] || null, // 天气调谐基线（2026-11-17 每日随机天气后）：仿真固定用调谐时的天气（S1 沙暴、S4 晴天，其余 null）与筛查表逐数对照，不再读关卡配置；随机天气下各关胜率由 scripts/sim-gym-8-expansion.mjs 另行覆盖
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: M.effPlayerLevel(appLevel), activeIdx: 0, pets },
      B: { childId: null, childName: '馆主', battleLevel: bossEff, activeIdx: 0, pets: bossPets },
    },
  });
  const attackMoves = (pet) => pet.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; });
  const bestMoveVs = (pet, defTypes) => {
    const atk = attackMoves(pet);
    return atk.reduce((a, b) => (expPower(b) * M.typeMultOfficialMulti(b.type, defTypes) > expPower(a) * M.typeMultOfficialMulti(a.type, defTypes) ? b : a), atk[0]);
  };
  const bestHitVs = (pet, defTypes) => Math.max(...attackMoves(pet).map((m) => expPower(m) * M.typeMultOfficialMulti(m.type, defTypes)));
  const bossExpHit = (pet) => {
    const bossPet = st.sides.B.pets[st.sides.B.activeIdx];
    const foeFrac = pet.hp / pet.maxHp;
    const pCharge = foeFrac <= 0.3 ? 0.1 : 0.25;
    const topW = foeFrac <= 0.3 ? 0.75 : 0.5;
    const sorted = [...bossPet.moves].sort((a, b) => b.power - a.power);
    const rest = (1 - topW) / Math.max(1, sorted.length - 1);
    let exp = 0;
    sorted.forEach((m, i) => { exp += (i === 0 ? topW : rest) * expPower(m) * M.typeMultOfficialMulti(m.type, pet.defTypes || [pet.type]); });
    return (1 - pCharge) * exp * (1 + pCharge * 0.5);
  };
  let heals = 0, revives = 0, guard = 0;
  while (!st.winner && guard++ < 300) {
    const A = st.sides.A;
    const active = A.pets[A.activeIdx];
    const bossPet = st.sides.B.pets[st.sides.B.activeIdx];
    const bossTypes = bossPet.defTypes || [bossPet.type];
    if (useItems) {
      const faintIdx = A.pets.findIndex((p, i) => i !== A.activeIdx && p.hp <= 0);
      if (faintIdx >= 0 && revives < 1 && active.hp <= bossExpHit(active) && bossPet.hp > bestHitVs(active, bossTypes)) {
        const r = M.resolveGymRound(st, { itemKey: 'medicine:revive', targetIdx: faintIdx }, rng);
        if (!r.error) { revives++; continue; }
      }
    }
    // 轮换：另一只活宠期望伤害显著更高（>1.5×），或当前宠血量过低且另一只更健康更强，则换宠
    const activeHit = bestHitVs(active, bossTypes);
    let swapIdx = -1;
    A.pets.forEach((p, i) => {
      if (i === A.activeIdx || p.hp <= 0) return;
      const h = bestHitVs(p, bossTypes);
      const better = h > activeHit * 1.5;
      const lowHpSwap = active.hp / active.maxHp < 0.35 && p.hp / p.maxHp > active.hp / active.maxHp + 0.2 && h > activeHit;
      if ((better || lowHpSwap) && (swapIdx < 0 || bestHitVs(p, bossTypes) > bestHitVs(A.pets[swapIdx], bossTypes))) swapIdx = i;
    });
    if (swapIdx >= 0) {
      const r = M.resolveGymRound(st, { swapToIdx: swapIdx }, rng);
      if (!r.error) continue;
    }
    if (useItems) {
      if (active.hp > 0 && active.hp < active.maxHp && active.hp <= bossExpHit(active) && bossPet.hp > bestHitVs(active, bossTypes) && bossPet.hp <= 2 * bestHitVs(active, bossTypes) && heals < 2) {
        const r = M.resolveGymRound(st, { itemKey: 'medicine:potion' }, rng);
        if (!r.error) { heals++; continue; }
      }
    }
    const move = bestMoveVs(active, bossTypes);
    M.resolveGymRound(st, { moveName: move.name }, rng);
  }
  return st.winner === 'A' ? 1 : 0;
}

function simCellReal(stageCfg, appLevel, line, benchNos, useItems, seed) {
  let wins = 0;
  const rng = mulberry32(seed);
  for (let i = 0; i < SIM_N; i++) wins += playStageReal(stageCfg, appLevel, line, benchNos, useItems, rng);
  return wins / SIM_N * 100;
}

// 真实队伍（正式库亲查）：大宝 pikachu 备宠 111/123/98；小宝 charmander 备宠 43/54/179。
// 全队口径（2026-11-17 用户纠正）：runCell 传入整支备宠队（数组），不再单只。
const BENCH_POOL = { pikachu: [111, 123, 98], charmander: [43, 54, 179] };
const cfgOf = (stage) => M.GYM_STAGES.find((g) => g.stage === stage);
const seedBase = (stage, pl, benchNos, line) => 424242 + stage * 10000 + pl * 100 + benchNos.reduce((a, n) => a + n, 0) + (line === 'charmander' ? 7 : 0);
function runCell(stage, appLv, line, benchNos, useItems) {
  return simCellReal(cfgOf(stage), appLv, line, benchNos, useItems, seedBase(stage, appLv, benchNos, line) + 777777);
}

describe('等比换算常量（生产口径）', () => {
  test('玩家 ×2.25、馆主 S1 ×2.33 / S2 ×1.7 / S3 ×1.7 / S4–S8 ×1.85；hpMult [1.0, 1.0, 1.1, 1.5, 0.9, 1.85, 1.8, 1.5]（2026-11-20 馆主血量回调：S5 1.0→0.9、S7 2.0→1.8，胜率回 35–55% 带；2026-11-17 设计定稿 8.md 热修；S5 设计值 1.35 仍留硬墙，降到 1.0 才清零；2026-11-17 道馆重调 S6/S7：bossLevel 30/29、hpMult 1.85/2.0）', () => {
    assert.equal(M.PLAYER_SCALE, 2.25);
    assert.deepEqual(M.BOSS_SCALE, { 1: 2.33, 2: 1.7, 3: 1.7, 4: 1.85, 5: 1.85, 6: 1.85, 7: 1.85, 8: 1.85 });
    assert.equal(M.GYM_STAGES.length, 8);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 1).hpMult, 1.0);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 2).hpMult, 1.0);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 3).hpMult, 1.1);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 4).hpMult, 1.5);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 5).hpMult, 0.9);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 6).hpMult, 1.85);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 7).hpMult, 1.8);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 8).hpMult, 1.5);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 6).bossLevel, 30);
    assert.equal(M.GYM_STAGES.find((g) => g.stage === 7).bossLevel, 29);
    assert.equal(M.effPlayerLevel(8), 18);
    assert.equal(M.effBossLevel(cfgOf(2)), 20);
    assert.equal(M.effBossLevel(cfgOf(4)), 33);
    assert.equal(M.effBossLevel(cfgOf(1)), 13);
    assert.equal(M.effBossLevel(cfgOf(3)), 22);
    assert.equal(M.effBossLevel(cfgOf(5)), 42);
    assert.equal(M.effBossLevel(cfgOf(6)), 55);
    assert.equal(M.effBossLevel(cfgOf(7)), 53);
    assert.equal(M.effBossLevel(cfgOf(8)), 49);
    // 形态守卫（2026-10-27 已纠正过一次）：大宝 App 8 级主宠是皮丘 172，不是皮卡丘 25。
    assert.equal(M.lineFormNo('pikachu', 8), 172);
  });
});

// STAB ×1.5 让玩家本系克制招从 ×2 变 ×3，馆主也被 STAB 但克制面不如玩家，净胜率上升；难度未调，数值只报不改。
// 2026-11-06 招式系统升级后重测：备战改走等级招式表、贪心按期望伤害（威力×命中率×克制）选招；
// 以下三格以重测值为准（±5 容差），旧筛查表 work/sim-tighten-20261028.txt 的数值仅作历史对照。
// 2026-11-06 玩家宠双属性防御重测：S2 小宝＋43 84.2%→28.15%（走路草毒属性被馆主大地之力克制，地面 0.5→1.0；
// 走路草 Lv.8 招式全为草/普通、无毒系招，无 STAB 抵消），仅此格更新期望；S4 小宝＋43 29.1%→26.2% 仍在容差内不改。
// STAB ×1.5 让玩家本系克制招从 ×2 变 ×3，馆主也被 STAB 但克制面不如玩家，净胜率上升；难度未调，数值只报不改。
// 2026-11-06 招式系统升级后重测：备战改走等级招式表、贪心按期望伤害（威力×命中率×克制）选招；
// 以下三格以重测值为准（±5 容差），旧筛查表 work/sim-tighten-20261028.txt 的数值仅作历史对照。
// 2026-11-06 玩家宠双属性防御重测：S2 小宝＋43 84.2%→28.15%（走路草毒属性被馆主大地之力克制，地面 0.5→1.0；
// 走路草 Lv.8 招式全为草/普通、无毒系招，无 STAB 抵消），仅此格更新期望；S4 小宝＋43 29.1%→26.2% 仍在容差内不改。
// 2026-11-17 8 关扩围重测（全队口径：主宠＋全部备宠，任意先发、轮换磨过；馆主方多只轮换；
// 暴击无视能力等级已修；N=2000，调谐天气 S1 沙暴、S4 晴天、其余无）。
// 2026-11-17 设计定稿 8.md 第一阶段热修后重测：hpMult [1.0, 1.0, 1.1, 1.5, 1.0, 1.3, 1.65, 1.5]
// ＋合法补盲招式（可达鸭精神强念、走路草污泥炸弹＋月亮之力、咩利羊力量宝石）＋S8 剔沙暴；
// 以下期望值即实测值（±8 容差覆盖 N/种子差），硬墙格已清零（全天气仿真最低 10.2%，见
// scripts/sim-gym-8-expansion.mjs N=1000）；S6 小宝无恶调谐天气（无）30.6%，进设计预期 30–50%。
// 2026-11-17 道馆重调 S6/S7（bossLevel 30/29、hpMult 1.85/2.0、魔墙人偶魔法闪耀＋S7 特殊火）：
// 以下 S6/S7 期望值即重调后实测值（±8 容差）；S6 pinned 队（无恶/无虫/无鬼）~0%、S7 小宝 pinned 队 0.2%——
// 重调达标口径是测试站 5 只随身队（见 work/sim-gym-retune-verify-20261117.txt），pinned 队不达标是已知后果，推正式站前须另议。
describe('8 关扩围后真实队伍仿真（全队，带道具，N=2000；调谐天气）', () => {
  const DB = BENCH_POOL.pikachu, XB = BENCH_POOL.charmander;
  test('S1 沙暴 Lv.8：全队胜率 100%（两孩；hpMult 1.0 玻璃大炮，设计预期 95–100%）', () => {
    const db = runCell(1, 8, 'pikachu', DB, true);
    const xb = runCell(1, 8, 'charmander', XB, true);
    assert.ok(db >= 92, `S1 大宝全队实得 ${db}%，期望 100%±8`);
    assert.ok(xb >= 92, `S1 小宝全队实得 ${xb}%，期望 100%±8`);
  });
  test('S2 无天气 Lv.8：大宝 100%、小宝 100%（热修后 hpMult 1.0）', () => {
    const db = runCell(2, 8, 'pikachu', DB, true);
    const xb = runCell(2, 8, 'charmander', XB, true);
    assert.ok(db >= 92, `S2 大宝全队实得 ${db}%，期望 100%±8`);
    assert.ok(xb >= 92, `S2 小宝全队实得 ${xb}%，期望 100%±8`);
  });
  test('S3 无天气 Lv.11：大宝 100%、小宝 100%（热修后 hpMult 1.1）', () => {
    const db = runCell(3, 11, 'pikachu', DB, true);
    const xb = runCell(3, 11, 'charmander', XB, true);
    assert.ok(db >= 92, `S3 大宝全队实得 ${db}%，期望 100%±8`);
    assert.ok(xb >= 92, `S3 小宝全队实得 ${xb}%，期望 100%±8`);
  });
  test('S4 晴天 Lv.14：大宝 60.7%、小宝 47.1%（死亡回合修正后：顶上新宠本回合不再行动，双方胜率回落；热修后 hpMult 1.5，硬墙已清）', () => {
    const db = runCell(4, 14, 'pikachu', DB, true);
    const xb = runCell(4, 14, 'charmander', XB, true);
    assert.ok(Math.abs(db - 60.7) <= 8, `S4 大宝全队实得 ${db}%，期望 60.7%±8`);
    assert.ok(Math.abs(xb - 47.1) <= 8, `S4 小宝全队实得 ${xb}%，期望 47.1%±8`);
  });
  test('S5 无天气 Lv.17：大宝 48.6%、小宝 50.3%（馆主血量回调 hpMult 1.0→0.9，胜率回 35–55% 带；热修后＋可达鸭精神强念，硬墙已清）', () => {
    const db = runCell(5, 17, 'pikachu', DB, true);
    const xb = runCell(5, 17, 'charmander', XB, true);
    assert.ok(Math.abs(db - 48.6) <= 8, `S5 大宝全队实得 ${db}%，期望 48.6%±8`);
    assert.ok(Math.abs(xb - 50.3) <= 8, `S5 小宝全队实得 ${xb}%，期望 50.3%±8`);
  });
  test('S6 无天气 Lv.20：重调后 pinned 队（无恶/无虫/无鬼）实得 ~0%（2026-11-17 道馆重调：bossLevel 30/hpMult 1.85＋魔法闪耀；此 pinned 队无克制答案，见下注）', () => {
    const db = runCell(6, 20, 'pikachu', DB, true);
    const xb = runCell(6, 20, 'charmander', XB, true);
    // 2026-11-17 道馆重调：pinned 备宠队（大宝 111/123/98、小宝 43/54/179，正式库 10-28 快照，无恶/无虫/无鬼）
    // 在新配置下实得 ~0%——boss 有效 55＋hpMult 1.85，无克制招打不动 1.85 倍血。重调的达标口径是测试站
    // 5 只随身队（含月亮伊布，大宝 81.1%/小宝 91.0%，见 work/sim-gym-retune-verify-20261117.txt）；
    // 正式库现随身队（拉普拉斯/伊布/卡比兽）S6 也仅 0.15%/3.25%，推正式站前须另议（伊布→月亮伊布可解）。
    assert.ok(db <= 8, `S6 大宝全队（无恶）实得 ${db}%，期望 ~0%±8`);
    assert.ok(xb <= 8, `S6 小宝全队（无恶）实得 ${xb}%，期望 ~0%±8`);
  });
  test('S7 无天气 Lv.23：重调后大宝 46.5%、小宝 0.2%（馆主血量回调 hpMult 2.0→1.8，胜率回 35–55% 带；2026-11-17 道馆重调：bossLevel 29＋特殊火；小宝 pinned 队弱，见下注）', () => {
    const db = runCell(7, 23, 'pikachu', DB, true);
    const xb = runCell(7, 23, 'charmander', XB, true);
    // 2026-11-17 道馆重调：大宝 pinned 队 60.2%；小宝 pinned 队（43/54/179）仅 0.2%，正式库现随身队
    // （拉普拉斯/伊布/卡比兽）S7 为 79.8%/84.9%。重调达标口径是测试站 5 只随身队（大宝 80.8%/小宝 74.3%，
    // 见 work/sim-gym-retune-verify-20261117.txt）。
    assert.ok(Math.abs(db - 46.5) <= 8, `S7 大宝全队实得 ${db}%，期望 46.5%±8`);
    assert.ok(Math.abs(xb - 0.2) <= 8, `S7 小宝全队实得 ${xb}%，期望 0.2%±8`);
  });
  test('S8 无天气 Lv.26：大宝 69.6%、小宝 49.3%（死亡回合修正后；热修后 hpMult 1.5＋剔沙暴，硬墙已清）', () => {
    const db = runCell(8, 26, 'pikachu', DB, true);
    const xb = runCell(8, 26, 'charmander', XB, true);
    assert.ok(Math.abs(db - 69.6) <= 8, `S8 大宝全队实得 ${db}%，期望 69.6%±8`);
    assert.ok(Math.abs(xb - 49.3) <= 8, `S8 小宝全队实得 ${xb}%，期望 49.3%±8`);
  });
});

/* ---------------- API 梯子（harness 逐字抄自 tests/battle.test.mjs） ---------------- */

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0019_evo_items.sql', '0043_pet_instances_ability.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  // 2026-11-17 8 关扩围：随身 5 只即全队，备战宠须 carried=1 才进战斗。
  // carried 列来自迁移 0022（仓库），但 0022 的回填依赖 species_acquisitions 表（本测试库没有），
  // 故只在此补列（与 0022 的列定义一致），不跑整条迁移。
  raw.exec('ALTER TABLE pokedex ADD COLUMN carried INTEGER NOT NULL DEFAULT 0;');
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
// 2026-11-17 8 关扩围：仿真口径“最佳队”含道具（复活×1＋药水×2/场）；无道具时 S5/S8 即使 Lv.26＋最佳先发＋积极轮换仍 0%（硬墙，见 sim 脚本注）。
// 直接插库存（测试库，跳过流水；正式流程走 addItem）。8 关×15 次挑战×（2 药水＋1 复活）= 上限 240 药水＋120 复活，
// 给 300 药水＋150 复活，免得中途“没有活力碎片啦”导致 API 报错（2026-11-17 实测 flaky 根因）。
function giveItems(childId) {
  raw.prepare("INSERT OR REPLACE INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?, 'medicine:potion', 300, 1)").run(childId);
  raw.prepare("INSERT OR REPLACE INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(?, 'medicine:revive', 150, 1)").run(childId);
}
function giveDex(childId, key) {
  raw.prepare("INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,'2026-01-01')").run(childId, key);
}

async function playGymToEnd(cookie, battleId, view) {
  let v = view;
  let rewards = null;
  let guard = 0;
  let heals = 0, revives = 0; // 仿真口径：每场药水≤2、复活≤1
  while (v.status === 'active' && guard++ < 120) {
    const sideA = v.sides.A;
    const pet = sideA.pets[sideA.activeIdx];
    const bossPet = v.sides.B.pets[v.sides.B.activeIdx];
    const bossTypes = bossPet.defTypes || [bossPet.type];
    const bestHit = (pp) => Math.max(...pp.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; }).map((m) => expPower(m) * M.typeMultOfficialMulti(m.type, bossTypes)));
    // 馆主期望伤害（与引擎仿真 playStageReal 同款 bossExpHit：蓄力招概率＋招式权重；只在当前宠真要被打倒时才用药，避免浪费）
    const bossExpHit = (pp) => {
      const foeFrac = pp.hp / pp.maxHp;
      const pCharge = foeFrac <= 0.3 ? 0.1 : 0.25;
      const topW = foeFrac <= 0.3 ? 0.75 : 0.5;
      const sorted = [...bossPet.moves].sort((a, b) => b.power - a.power);
      const rest = (1 - topW) / Math.max(1, sorted.length - 1);
      let exp = 0;
      sorted.forEach((m, i) => { exp += (i === 0 ? topW : rest) * expPower(m) * M.typeMultOfficialMulti(m.type, pp.defTypes || [pp.type]); });
      return (1 - pCharge) * exp * (1 + pCharge * 0.5);
    };
    let body = null;
    // 道具（仿真口径 bossExpHit 门控）：当前宠将被打倒且打不倒馆主时复活/喝药（馆主 2 招内能打倒才喝药）
    const faintIdx = sideA.pets.findIndex((pp, i) => i !== sideA.activeIdx && pp.fainted);
    if (faintIdx >= 0 && revives < 1 && pet.hp <= bossExpHit(pet) && bossPet.hp > bestHit(pet)) { body = { battleId, itemKey: 'medicine:revive', targetIdx: faintIdx }; revives++; }
    else if (pet.hp > 0 && pet.hp < pet.maxHp && pet.hp <= bossExpHit(pet) && bossPet.hp > bestHit(pet) && bossPet.hp <= 2 * bestHit(pet) && heals < 2) { body = { battleId, itemKey: 'medicine:potion' }; heals++; }
    // 积极轮换（仿真口径）：有活宠期望伤害 >1.5×当前，或当前 <35% 且有更健康更强者时换
    if (!body) {
      const activeHit = bestHit(pet);
      let swapIdx = -1;
      sideA.pets.forEach((pp, i) => {
        if (i === sideA.activeIdx || pp.fainted) return;
        const h = bestHit(pp);
        const better = h > activeHit * 1.5;
        const lowHpSwap = pet.hp / pet.maxHp < 0.35 && pp.hp / pp.maxHp > pet.hp / pet.maxHp + 0.2 && h > activeHit;
        if ((better || lowHpSwap) && (swapIdx < 0 || bestHit(pp) > bestHit(sideA.pets[swapIdx]))) swapIdx = i;
      });
      if (swapIdx >= 0) body = { battleId, swapToIdx: swapIdx };
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
    if (benchNo) { body.benchNo = benchNo; body.leadNo = benchNo; } // 最佳先发：当关最强备宠先发（仿真口径）
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
/* 八关全通（真实队伍版）：从 battle.test.mjs:603 移入 S4–S6 通关断言，2026-11-17 8 关扩围续到 S7/S8。
 * 真实队伍（正式库亲查）：大宝主宠皮丘/皮卡丘＋备宠 111/123/98；
 * 各关用当关最强真实备宠（S1 123、S2 123、S3 111 地面免疫、S4 123、S5 111 地面克毒、S6 123 虫克超能力、S7 98 水克火、S8 98 水克地面）。
 * 603 保留 S1–S3 设计阵容＋奖励流断言（见简报 C）。 */
describe('八关全通（真实队伍，大宝）', () => {
  test('Lv.26 真实队伍：八关逐关通关，终奖蛋 151', async () => {
    const { c1 } = await setup();
    const { weekStart } = gotoWeekday(6);
    seedApprovedDays(1, weekStart, 4);
    setXp(1, M.xpForLevel(26)); // Lv.26，过全部八关等级门槛（S8 needLevel=26）
    const realBench = { 1: 123, 2: 123, 3: 111, 4: 123, 5: 111, 6: 123, 7: 98, 8: 98 };
    // 2026-11-17 8 关扩围：馆主多只轮换，单备宠（主宠＋1）打不过 S5/S8（实测 0%）；须带全队（主宠＋3 备宠）。
    // giveDex 只插图鉴行（carried 默认 0），须显式标记随身携带，apiBattleGymStart 才会经 opts.carried 带上全队。
    for (const no of [111, 123, 98]) {
      giveDex(1, `wild:${no}`);
      raw.prepare('UPDATE pokedex SET carried=1 WHERE child_id=1 AND entry_key=?').run(`wild:${no}`);
    }
    giveItems(1); // 仿真口径：最佳队用道具（复活×1＋药水×2/场）
    const expectEggs = { 1: 143, 2: 131, 3: 133, 4: 147, 5: 94, 6: 122, 7: 126, 8: 208 };
    for (let stage = 1; stage <= 8; stage++) {
      const { view, rewards } = await clearGymStage(c1, stage, realBench[stage]);
      assert.equal(view.winnerChildId, 1, `stage ${stage} 应获胜`);
      assert.equal(rewards.eggSpecies, expectEggs[stage]);
      if (stage === 8) assert.equal(rewards.finalEgg, true);
    }
    const eggs = await call('/api/eggs', { method: 'POST', cookie: c1, body: { childId: 1 } });
    const species = eggs.j.eggs.map((e) => e.species).sort((a, b) => a - b);
    assert.deepEqual(species, [94, 122, 126, 131, 133, 143, 147, 151, 208]);
    const st = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(st.j.clearedCount, 8);
    assert.equal(st.j.finalEggAwarded, true);
    assert.ok(st.j.badges.every((b) => b.lit));
  });
});

