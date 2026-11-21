/* 8 关扩围仿真：node scripts/sim-gym-8-expansion.mjs
 * 用真实道馆引擎（createBattleState + resolveGymRound），测 8 关 × 各关可达天气的胜率。
 * 目的（2026-11-17 8 关扩围任务）：确认多只轮换＋8 关后没有哪格变成硬墙——
 * 最佳队胜率跌到个位数（<10%）即硬墙。S6 胡地另分有/无恶系反制两种队伍测。
 *
 * 口径（2026-11-17 用户纠正：以“最佳队”为准，不以“无克制”为准）：
 * - 玩家方为随身全队（主宠＋全部备宠），任意先发、轮换磨过，不限主宠＋1 备战。
 *   大宝 pikachu 备宠 111/123/98；小宝 charmander 备宠 43/54/179（正式库亲查）。
 * - 先发：对第一只馆主宠期望伤害最高的宠；轮换：另一只活宠期望伤害显著更高（>1.5×）
 *   或当前宠血量过低且另一只更健康更强时换宠（换宠耗一整回合）。
 * - 策略：贪心按期望伤害（威力×命中率×克制）选招、带道具（与 gym-real-teams 同口径）。
 * - 等级用调谐时的挑战等级：S1 Lv.8、S2 Lv.8、S3 Lv.11、S4 Lv.14、S5 Lv.17、S6 Lv.20、
 *   S7 Lv.23、S8 Lv.26（S7/S8 取各自 needLevel，与 S5/S6 口径一致）。
 * - 每关只仿真可达的天气（GYM_WEATHER_POOLS 收窄池：S4 剔雨、S7 剔晴，其余完整池）。
 * - S6 分组：无恶系反制＝现有全队（无恶系招）；有恶系反制＝全队＋伊布 #133（咬住，恶 60）——
 *   大宝已拥有伊布，S3 通关蛋也是伊布，小宝可获得；恶系招对胡地 2×，且恶系宠免疫超能力招。
 * - 固定种子（mulberry32），结果可复现。输出到 stdout，另存 work/sim-gym-8-expansion.txt。
 *
 * ⚠️ 本次仿真用修正后玩家招式（招式表修正 feature/learnset-levelup-tm 已合入 main，1470 招、官方表 233 招）；
 * 报告里的胜率是修正后招式下的数，可作平衡结论的依据（调参仍由用户定）。
 * 2026-11-17 设计定稿 8.md 第一阶段热修：hpMult [1.0, 1.0, 1.1, 1.5, 1.35→S5 1.0, 1.3, 1.65, 1.5]
 * （S5 设计值 1.35 仍留 4 硬墙格，1.1 仍留小宝雨天 5.0%，降到 1.0 才清零）；
 * 合法补盲招式已进招式表（可达鸭精神强念、走路草污泥炸弹＋月亮之力、咩利羊力量宝石）；
 * 天气池 S8 新增剔沙暴（GYM_WEATHER_POOLS）。 */
import { writeFileSync } from 'node:fs';

const N = 1000;
const WEATHERS = ['sun', 'rain', 'sand', null];
const stageWeathers = (stage) => (M.GYM_WEATHER_POOLS?.[stage] ?? WEATHERS);
const WEATHER_NAME = { sun: '晴天', rain: '雨天', sand: '沙暴', null: '无' };
const SIM_LEVEL = { 1: 8, 2: 8, 3: 11, 4: 14, 5: 17, 6: 20, 7: 23, 8: 26 };
const BENCH_POOL = { pikachu: [111, 123, 98], charmander: [43, 54, 179] };
const DARK_COUNTER = 133; // 伊布（咬住，恶 60）：S6 有恶系反制组的追加宠
const KIDS = [
  { name: '大宝', line: 'pikachu' },
  { name: '小宝', line: 'charmander' },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = await import(new URL('../src/index.js', import.meta.url));
const expPower = (m) => m.power * ((M.officialAccuracy(m.name) ?? 100) / 100);

function v11MainPet(line, appLevel) {
  const moves = M.effectiveMoves(line, appLevel, []).map((m) => { const off = M.officialMove(m.name); return { name: m.name, type: off ? off.type : M.LINE_TYPE[line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * m.level }; });
  return M.makePet({ key: 'main', name: '主宠', type: M.LINE_TYPE[line], no: M.lineFormNo(line, appLevel), defTypes: M.playerDefTypes(M.lineFormNo(line, appLevel)), level: M.effPlayerLevel(appLevel), moves: moves.length ? moves : [{ name: '撞击', type: '普通', power: 35 }] });
}
function v11BenchPet(no, appLevel) {
  const sp = M.SPECIES[no];
  const eff = M.collectionMovesFor({ move_levels: '{}' }, no, appLevel);
  const moves = eff.length
    ? eff.map((m) => ({ name: m.name, type: m.type, damage_class: m.damage_class, power: m.power }))
    : [{ name: '撞击', type: '普通', power: 35 }];
  return M.makePet({ key: `dex:${no}`, name: sp.name, type: sp.type, no, defTypes: M.playerDefTypes(no), level: M.effPlayerLevel(appLevel), moves });
}

// 全队仿真（2026-11-17 用户纠正口径）：玩家方主宠＋全部备宠，任意先发、轮换磨过。
// 馆主方 bossTeam 多只轮换（王牌最后），全队同有效等级；倒下后引擎自动换下一只上场。
function playStageReal(stageCfg, appLevel, line, benchNos, useItems, rng, weather) {
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
    mode: 'gym', firstSide: 'A', weather,
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

function simCell(stage, appLevel, line, benchNos, weather, seed) {
  const stageCfg = M.GYM_STAGES.find((g) => g.stage === stage);
  const rng = mulberry32(seed);
  let wins = 0;
  for (let i = 0; i < N; i++) wins += playStageReal(stageCfg, appLevel, line, benchNos, true, rng, weather);
  return wins / N * 100;
}

const lines = [];
lines.push(`8 关扩围仿真（真实引擎，N=${N}/格，全队＋轮换＋道具，固定种子）`);
lines.push(`生成：${new Date().toISOString()}；天气池：S4 剔雨（晴/沙暴/无）、S7 剔晴（雨/沙暴/无）、S8 剔沙暴（晴/雨/无），其余关完整池 晴/雨/沙暴/无；等级：S1 Lv.8、S2 Lv.8、S3 Lv.11、S4 Lv.14、S5 Lv.17、S6 Lv.20、S7 Lv.23、S8 Lv.26`);
lines.push('口径：玩家方随身全队（主宠＋全部备宠），任意先发、轮换磨过；馆主方多只轮换（王牌最后）。');
lines.push('本次仿真用修正后玩家招式（招式表修正 feature/learnset-levelup-tm 已合入 main，1470 招、官方表 233 招），可作平衡结论依据。');
lines.push('');
lines.push('判定：最佳队胜率跌到个位数（<10%）即硬墙。');
lines.push('');
const bestValues = [];
for (const stageCfg of M.GYM_STAGES) {
  const stage = stageCfg.stage;
  const appLevel = SIM_LEVEL[stage];
  const teamNames = stageCfg.bossTeam.map((m) => (M.SPECIES[m.no] || {}).name || m.no).join('＋');
  const bossName = (M.SPECIES[stageCfg.bossNo] || {}).name || stageCfg.bossNo;
  lines.push(`S${stage} ${stageCfg.gymName}（${teamNames}，王牌 ${bossName} #${stageCfg.bossNo}，Lv.${appLevel}，bossLevel ${stageCfg.bossLevel}，有效 ${M.effBossLevel(stageCfg)}，hpMult ${stageCfg.hpMult}）`);
  if (stage === 6) {
    lines.push('天气   | 大宝最佳（无恶） | 大宝最佳（有恶） | 小宝最佳（无恶） | 小宝最佳（有恶）');
    lines.push('-------|---------------|---------------|---------------|---------------');
    for (const w of stageWeathers(stage)) {
      const row = [];
      for (const kid of KIDS) {
        const seedBase = 424242 + stage * 10000 + appLevel * 100 + (kid.line === 'charmander' ? 7 : 0) + WEATHERS.indexOf(w) * 101;
        const noDark = simCell(stage, appLevel, kid.line, BENCH_POOL[kid.line], w, seedBase + 777777);
        const withDark = simCell(stage, appLevel, kid.line, [...BENCH_POOL[kid.line], DARK_COUNTER], w, seedBase + 999999);
        row.push(noDark, withDark);
        bestValues.push([`S${stage} ${WEATHER_NAME[w]} ${kid.name}最佳队（无恶）`, noDark]);
        bestValues.push([`S${stage} ${WEATHER_NAME[w]} ${kid.name}最佳队（有恶）`, withDark]);
      }
      const fmt = (v) => `${v.toFixed(1).padStart(5)}%`;
      const flag = (v) => (v < 10 ? ' ⚠️' : '');
      lines.push(`${WEATHER_NAME[w].padEnd(6)} | ${fmt(row[0])}${flag(row[0])} | ${fmt(row[1])}${flag(row[1])} | ${fmt(row[2])}${flag(row[2])} | ${fmt(row[3])}${flag(row[3])}`);
    }
  } else {
    lines.push('天气   | 大宝最佳队 | 小宝最佳队');
    lines.push('-------|-----------|----------');
    for (const w of stageWeathers(stage)) {
      const row = [];
      for (const kid of KIDS) {
        const seedBase = 424242 + stage * 10000 + appLevel * 100 + (kid.line === 'charmander' ? 7 : 0) + WEATHERS.indexOf(w) * 101;
        const v = simCell(stage, appLevel, kid.line, BENCH_POOL[kid.line], w, seedBase + 777777);
        row.push(v);
        bestValues.push([`S${stage} ${WEATHER_NAME[w]} ${kid.name}最佳队`, v]);
      }
      const fmt = (v) => `${v.toFixed(1).padStart(5)}%`;
      const flag = (v) => (v < 10 ? ' ⚠️' : '');
      lines.push(`${WEATHER_NAME[w].padEnd(6)} | ${fmt(row[0])}${flag(row[0])} | ${fmt(row[1])}${flag(row[1])}`);
    }
  }
  lines.push('');
}
let minBest = 100, minBestCell = '';
for (const [label, v] of bestValues) {
  if (v < minBest) { minBest = v; minBestCell = label; }
}
lines.push(`最佳队最低：${minBest.toFixed(1)}%（${minBestCell}）${minBest < 10 ? ' —— 有硬墙，需调参' : ' —— 无硬墙'}`);

const out = lines.join('\n');
console.log(out);
writeFileSync(new URL('../work/sim-gym-8-expansion.txt', import.meta.url), out + '\n');
console.log('\n已存 work/sim-gym-8-expansion.txt');
