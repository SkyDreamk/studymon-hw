/* 道馆每日随机天气仿真：node scripts/sim-gym-daily-weather.mjs
 * 用真实道馆引擎（createBattleState + resolveGymRound），测每关 × 四种天气的胜率。
 * 目的（2026-11-17 每日随机天气任务）：确认没有哪种天气组合把某关变成硬墙——
 * 胜率跌到个位数（<10%）即硬墙。雨天是第一次进道馆，单独验。
 * 第二轮（2026-11-17 硬墙修复）：S4 剔雨、S5 剔晴后重跑，只仿真每关可达的天气
 * （S4 雨天、S5 晴天已从池里剔掉，不再出现）；确认其余格子没有变差、没有新的 0%。
 *
 * 口径（与 gym-real-teams.test.mjs 对齐）：
 * - 等级用调谐时的挑战等级：S1 Lv.8、S2 Lv.8、S3 Lv.11、S4 Lv.14、S5 Lv.17、S6 Lv.20
 *   （S1 不用 needLevel 5：Lv.5 主宠只有弱招，实测最佳队也是 0%，与已验证的 34.75% 矛盾；
 *   孩子实际挑战时已靠打卡升到 Lv.8 左右，needLevel 5 只是进门槛）。
 * - 天气赛前可见，孩子可按天气换队：因此每格测两孩各自的全部副宠（大宝 111/123/98、
 *   小宝 43/54/179），取“最佳队”＝全部副宠里的最高胜率——这是“今天能不能赢”的数。
 *   另报“有克制”（克制副宠，类型 ×2）和“无克制”（不克制的副宠里的最高胜率），
 *   看不带克制类型时能不能赢。
 * - 策略：贪心按期望伤害（威力×命中率×克制）选招、带道具（与 gym-real-teams 同口径）。
 * 固定种子（mulberry32），结果可复现。输出到 stdout，另存 work/sim-gym-daily-weather.txt。 */
import { writeFileSync } from 'node:fs';

const N = 1000;
const WEATHERS = ['sun', 'rain', 'sand', null];
// 每关可达的天气 = 该关的收窄池（S4 剔雨、S5 剔晴，2026-11-17 硬墙修复）；
// 不可达的天气不再仿真。M 在下方 import，调用时已初始化。
const stageWeathers = (stage) => (M.GYM_WEATHER_POOLS?.[stage] ?? WEATHERS);
const WEATHER_NAME = { sun: '晴天', rain: '雨天', sand: '沙暴', null: '无' };
// 调谐时的挑战等级（gym-real-teams.test.mjs 的口径）
const SIM_LEVEL = { 1: 8, 2: 8, 3: 11, 4: 14, 5: 17, 6: 20 };
// 两孩的副宠池（正式库亲查）
const BENCH_POOL = { pikachu: [111, 123, 98], charmander: [43, 54, 179] };
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

// 与 tests/gym-real-teams.test.mjs 的 playStageReal 同口径，唯独天气改为参数。
function playStageReal(stageCfg, appLevel, line, benchNo, useItems, rng, weather) {
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
    mode: 'gym', firstSide: 'A', weather,
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

function simCell(stage, appLevel, line, benchNo, weather, seed) {
  const stageCfg = M.GYM_STAGES.find((g) => g.stage === stage);
  const rng = mulberry32(seed);
  let wins = 0;
  for (let i = 0; i < N; i++) wins += playStageReal(stageCfg, appLevel, line, benchNo, true, rng, weather);
  return wins / N * 100;
}

// 副宠是否克制馆主：按它实际招式——最强招式属性对馆主防御属性 ≥2×
// （不能按副宠本系类型判：如 123 飞天螳螂本系飞行，但虫招对超能力 ×2 才是它克 S2 的原因）
function benchCounters(benchNo, bossDefTypes, appLevel) {
  const pet = v11BenchPet(benchNo, appLevel);
  let best = 0;
  for (const m of pet.moves) {
    const mult = M.typeMultOfficialMulti(m.type, bossDefTypes);
    if (mult > best) best = mult;
  }
  return best >= 2;
}

const lines = [];
lines.push(`道馆每日随机天气仿真·收窄池第二轮（真实引擎，N=${N}/格，贪心选招＋道具，固定种子）`);
lines.push(`生成：${new Date().toISOString()}；天气池：S4 剔雨（晴/沙暴/无）、S5 剔晴（雨/沙暴/无），其余关完整池 晴/雨/沙暴/无；等级：S1 Lv.8、S2 Lv.8、S3 Lv.11、S4 Lv.14、S5 Lv.17、S6 Lv.20（调谐口径）`);
lines.push('');
lines.push('判定：最佳队（全部副宠里最高）胜率跌到个位数（<10%）即硬墙。无克制＝不克制的副宠里最高。');
lines.push('');
const bestValues = []; // [label, winRate]
for (const stageCfg of M.GYM_STAGES) {
  const stage = stageCfg.stage;
  const appLevel = SIM_LEVEL[stage];
  const bossName = (M.SPECIES[stageCfg.bossNo] || {}).name || stageCfg.bossNo;
  const bossDefTypes = M.bossDefTypes(stageCfg.bossNo);
  lines.push(`S${stage} ${stageCfg.gymName}（馆主 ${bossName} #${stageCfg.bossNo}，Lv.${appLevel}，bossLevel ${stageCfg.bossLevel}，hpMult ${stageCfg.hpMult}）`);
  lines.push('天气   | 大宝最佳 | 大宝有克制 | 大宝无克制 | 小宝最佳 | 小宝有克制 | 小宝无克制');
  lines.push('-------|---------|-----------|-----------|---------|-----------|----------');
  for (const w of stageWeathers(stage)) {
    const row = [];
    for (const kid of KIDS) {
      const seedBase = 424242 + stage * 10000 + appLevel * 100 + (kid.line === 'charmander' ? 7 : 0) + WEATHERS.indexOf(w) * 101;
      const results = [];
      for (const benchNo of [null, ...BENCH_POOL[kid.line]]) {
        const v = simCell(stage, appLevel, kid.line, benchNo, w, seedBase + (benchNo || 0) * 1000 + 777777);
        results.push({ benchNo, v, counters: benchNo ? benchCounters(benchNo, bossDefTypes, appLevel) : false });
      }
      const best = Math.max(...results.map((r) => r.v));
      const bestCounter = Math.max(...results.filter((r) => r.counters).map((r) => r.v), -1);
      const bestNonCounter = Math.max(...results.filter((r) => !r.counters).map((r) => r.v), -1);
      row.push(best, bestCounter, bestNonCounter);
      bestValues.push([`S${stage} ${WEATHER_NAME[w]} ${kid.name}最佳队`, best]);
      bestValues.push([`S${stage} ${WEATHER_NAME[w]} ${kid.name}无克制`, bestNonCounter]);
    }
    const fmt = (v) => (v < 0 ? '  —  ' : `${v.toFixed(1).padStart(5)}%`);
    const flag = (v) => (v >= 0 && v < 10 ? ' ⚠️' : '');
    lines.push(`${WEATHER_NAME[w].padEnd(6)} | ${fmt(row[0])}${flag(row[0])} | ${fmt(row[1])} | ${fmt(row[2])}${flag(row[2])} | ${fmt(row[3])}${flag(row[3])} | ${fmt(row[4])} | ${fmt(row[5])}${flag(row[5])}`);
  }
  lines.push('');
}
let minBest = 100, minBestCell = '';
let minNoAdv = 100, minNoAdvCell = '';
for (const [label, v] of bestValues) {
  if (label.includes('最佳队') && v < minBest) { minBest = v; minBestCell = label; }
  if (label.includes('无克制') && v < minNoAdv) { minNoAdv = v; minNoAdvCell = label; }
}
lines.push(`最佳队最低：${minBest.toFixed(1)}%（${minBestCell}）${minBest < 10 ? ' —— 有硬墙，需调参' : ' —— 无硬墙'}`);
lines.push(`无克制最低：${minNoAdv.toFixed(1)}%（${minNoAdvCell}）${minNoAdv < 10 ? ' —— 无克制有硬墙' : ' —— 无克制无硬墙'}`);

const out = lines.join('\n');
console.log(out);
writeFileSync(new URL('../work/sim-gym-daily-weather.txt', import.meta.url), out + '\n');
console.log('\n已存 work/sim-gym-daily-weather.txt');
