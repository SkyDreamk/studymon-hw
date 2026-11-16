/* 后续道馆关卡设计仿真：node scripts/sim-gym-stages.mjs
 * 驱动真实道馆引擎（createBattleState + resolveGymRound + gymBossChoose），验证
 * DESIGN-道馆后续关卡规范-v1.md 的胜率目标表。玩家策略为保守基线：每回合选期望
 * 伤害（威力×克制）最高的招式，不用 shell/weak 保命招——真实玩家会打得更好，
 * 故仿真胜率是下限口径。
 *
 * 网格：等级差（玩家等级 − 馆主等级）× 克制关系 × 有无副宠。
 *   克制关系定义（PvE 官方口径：弱点 ×2、抗性 ×0.5、免疫 ×0；三档对子仍按玩家/馆主倍率划分：
 *     克制   = 玩家 ×2、馆主 ×0.5；中性   = 双方 ×1；被克制 = 玩家 ×1、馆主 ×2）：
 *     克制   = 玩家招式属性克馆主（玩家伤害 ×2，馆主伤害 ×1）
 *     中性   = 双方互不克制（均为 ×1）
 *     被克制 = 馆主招式属性克玩家（玩家 ×1，馆主 ×2）
 *   副宠：与主宠同级（副宠等级同步主宠经验的定案）、同主宠属性、威力取该等级下最强招式（25+6×min(等级,11)，技能 1 级）；
 *   馆主：单宠、hpMult=2.0（取 S2 口径作参考中值；hpMult 是独立调参旋钮，
 *   提高它等效于馆主等级上浮，见规范文档 §4）。
 * 固定种子（mulberry32），结果可复现。 */
import { readFileSync } from 'node:fs';

const N = 2000;
const BOSS_LEVEL = 10;
const BOSS_HP_MULT = 2.0;
const MAIN_POWER = 60; // 主宠代表招式威力（25+6×招式等级的中段口径）
const BENCH_POWER = (level) => 25 + 6 * Math.min(level, 11); // 备战最强招式威力（等级招式表口径：技能 1 级，贪心必选最强招；旧 COLLECTION_MOVES 40–60 已退役）
const DIFFS = [-2, -1, 0, 1, 2];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 期望威力＝威力 × 命中率（未收录招式按 100 计）；贪心按期望伤害选招，
// 不是按纸面威力——否则会死磕暴风/打雷（70% 命中）而不用神鸟猛击/伏特攻击（100%）。
const expPower = (m) => m.power * ((M.officialAccuracy(m.name) ?? 100) / 100);

const M = await import(new URL('../src/index.js', import.meta.url));

// 属性对：[玩家属性, 馆主属性] —— 用克制表真实存在的对子
const TYPE_PAIRS = {
  '克制': ['水', '火'],   // 水克火
  '中性': ['电', '火'],   // 电不克火、火不克电
  '被克制': ['水', '电'], // 电克水（馆主电系打玩家水系 ×2）
};

function playOne(playerLevel, pair, withBench, rng, benchCountersBoss = false) {
  const [pType, bType] = TYPE_PAIRS[pair];
  const main = M.makePet({ key: 'main', name: '主宠', type: pType, level: playerLevel, moves: [{ name: '主招', type: pType, power: MAIN_POWER }] });
  const pets = [main];
  if (withBench) {
    // benchCountersBoss：副宠属性克馆主（设计推荐：主宠被克时用克制副宠兜底）
    const benchType = benchCountersBoss ? '地面' : pType; // 地面克电（被克制对子的馆主属性）
    pets.push(M.makePet({ key: 'dex:bench', name: '副宠', type: benchType, level: playerLevel, moves: [{ name: '副招', type: benchType, power: BENCH_POWER(playerLevel) }] }));
  }
  const boss = M.makePet({
    key: 'boss', name: '馆主', type: bType, level: BOSS_LEVEL, hpMult: BOSS_HP_MULT,
    moves: [
      { name: '馆主招1', type: bType, power: 50 },
      { name: '馆主招2', type: bType, power: 55 },
      { name: '馆主招3', type: bType, power: 60 },
    ],
  });
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A',
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: playerLevel, activeIdx: 0, pets },
      B: { childId: null, childName: '馆主', battleLevel: BOSS_LEVEL, activeIdx: 0, pets: [boss] },
    },
  });
  let guard = 0;
  while (!st.winner && guard++ < 100) {
    const pet = st.sides.A.pets[st.sides.A.activeIdx];
    const move = pet.moves.reduce((a, b) => (expPower(b) * M.typeMultOfficial(b.type, bType) > expPower(a) * M.typeMultOfficial(a.type, bType) ? b : a), pet.moves[0]);
    M.resolveGymRound(st, { moveName: move.name }, rng);
  }
  return st.winner === 'A' ? 1 : 0;
}

for (const withBench of [false, true]) {
  console.log(`\n== ${withBench ? '主宠＋副宠（同级）' : '主宠单打'} · 馆主 Lv.${BOSS_LEVEL} hpMult=${BOSS_HP_MULT} · 每格 ${N} 局 ==`);
  console.log('等级差 | 克制 | 中性 | 被克制');
  for (const diff of DIFFS) {
    const row = [];
    for (const rel of ['克制', '中性', '被克制']) {
      let wins = 0;
      const rng = mulberry32(1000 + (diff + 2) * 100 + (withBench ? 50 : 0) + ['克制', '中性', '被克制'].indexOf(rel));
      for (let i = 0; i < N; i++) wins += playOne(BOSS_LEVEL + diff, rel, withBench, rng);
      row.push(`${(wins / N * 100).toFixed(1)}%`);
    }
    console.log(`${diff >= 0 ? '+' : ''}${diff}    | ${row.join(' | ')}`);
  }
}

// 第三表：主宠被克制、副宠属性克馆主（地面克电）——验证「克制副宠兜底」设计
console.log(`\n== 主宠被克制＋副宠克馆主（地面克电）· 馆主 Lv.${BOSS_LEVEL} hpMult=${BOSS_HP_MULT} · 每格 ${N} 局 ==`);
console.log('等级差 | 胜率');
for (const diff of DIFFS) {
  let wins = 0;
  const rng = mulberry32(7777 + (diff + 2) * 100);
  for (let i = 0; i < N; i++) wins += playOne(BOSS_LEVEL + diff, '被克制', true, rng, true);
  console.log(`${diff >= 0 ? '+' : ''}${diff}    | ${(wins / N * 100).toFixed(1)}%`);
}
console.log('\n注：等级差 = 玩家等级 − 馆主等级；胜率含馆主蓄势/暴击随机性，种子固定可复现。');

/* ============ v11 仿真门（新增）：真实关卡配置 × 设计点 × 道馆用药 ============
 * 设计点：S2 大宝 Lv8（电主宠＋地面备战·独角犀牛）、小宝 Lv9（火主宠＋草备战·走路草）；
 *   S1 Lv5、S3 Lv11、S4 Lv14 各关门槛。
 * 队伍口径与锁定版校准一致（sim-gym-rework/rec.json、results-final.json）：
 *   主宠 effectiveMoves（威力 25+6×招式等级）；备战走等级招式表（collectionMovesFor，技能 1 级口径），
 *   备战等级 = bossLevel−2（S1 43号 Lv4、S3 50号 Lv11、S4 16号 Lv16）；
 *   唯 S2 沿用 2026-10-24 改版实测队伍（大宝＋111 同级、小宝＋43 同级，见 sim-s2-rework.mjs）。
 * 馆主取 GYM_STAGES 真实配置（bossLevel / hpMult / bossMoves / SPECIES 属性）。
 * 道具组：伤药×2（回 25%）＋活力碎片×1（复活 50%），走真实 resolveGymRound {itemKey}；
 *   强化×1 未建模：引擎里强化道具首期未入池（GYM_ITEM_EFFECTS 无 boost 项），本表按 0 效果计；
 *   待强化入池后重跑本表。
 * 玩家策略（锁定版 playerGreedy 的血量口径 ＋ 换上打得更疼的宠才换，真实引擎执行）：
 *   每回合选期望伤害最高的攻击招（变化招伤害 0，贪心不选）；
 *   主宠残血 <35% 且备战明显更健康、且备战对馆主的期望伤害高于上场宠时换宠保命
 *   （备战更弱时不换：S2 大宝的独角犀牛弱于主宠，换宠白丢一回合输出）。
 * 用药策略（合理玩家口径，策略固定、两组同阵容对照）：
 *   回血：上场宠下回合会被馆主期望伤害打倒（hp ≤ 馆主期望单回合伤害，且本回合打不死馆主、
 *     且回血后两回合内能收尾）时才用，不在馆主血还厚时浪费出招机会；
 *   复活：备战宠倒下且上场宠下回合大概率倒下、本回合又打不死馆主时才用——不复活则上场宠一倒即判负。
 *   期望伤害按 gymBossChoose 权重估算（蓄势回合不攻击、蓄势后一击 ×1.5 粗估；不含暴击浮动）。
 * 验收：带道具胜率 40–55%（设计目标区间；保守基线口径可放宽到 35–60%，见关卡规范 §6）；
 *   超带则收紧道具次数或重调 boss 参数并重仿真。单宠行仅作参考：双宠是设计前提假设，
 *   中性单宠胜率 0–2% 为预期，不纳入验收。镜像关 S4 取难线（电线）验收，火线行仅参考。 */
const SIM_N = 5000;

function v11MainPet(line, level) {
  const moves = M.effectiveMoves(line, level, []).map((m) => { const off = M.officialMove(m.name); return { name: m.name, type: off ? off.type : M.LINE_TYPE[line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * m.level }; });
  return M.makePet({ key: 'main', name: '主宠', type: M.LINE_TYPE[line], no: M.lineFormNo(line, level), level, moves: moves.length ? moves : [{ name: '撞击', type: '普通', power: 35 }] });
}
function v11BenchPet(no, level) {
  const sp = M.SPECIES[no];
  const eff = M.collectionMovesFor({ move_levels: '{}' }, no, level);
  const moves = eff.length
    ? eff.map((m) => ({ name: m.name, type: m.type, damage_class: m.damage_class, power: m.power }))
    : [{ name: '撞击', type: '普通', power: 35 }];
  return M.makePet({ key: `dex:${no}`, name: sp.name, type: sp.type, no, level, moves });
}

function playStageV11(stageCfg, playerLevel, line, benchNo, benchLevel, useItems, rng) {
  const bossType = (M.SPECIES[stageCfg.bossNo] || {}).type || '普通';
  const bossTypes = M.bossDefTypes(stageCfg.bossNo); // 馆主战斗按官方双属性
  const pets = [v11MainPet(line, playerLevel)];
  if (benchNo) pets.push(v11BenchPet(benchNo, benchLevel));
  const boss = M.makePet({
    key: 'boss', name: '馆主', type: bossType, defTypes: bossTypes, no: stageCfg.bossNo, level: stageCfg.bossLevel, hpMult: stageCfg.hpMult,
    moves: stageCfg.bossMoves.map(([name, type, power]) => { const off = M.officialMove(name); return { name, type, damage_class: off ? off.damage_class : undefined, power }; }),
  });
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A',
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: playerLevel, activeIdx: 0, pets },
      B: { childId: null, childName: '馆主', battleLevel: stageCfg.bossLevel, activeIdx: 0, pets: [boss] },
    },
  });
  // 攻击招只计造成伤害的招（变化招伤害 0，贪心不选；与锁定版 playerGreedy 同口径）
  const attackMoves = (pet) => pet.moves.filter((m) => { const e = M.moveEffectOf(m.name); return !e || e === 'drain'; });
  const bestMove = (pet) => {
    const atk = attackMoves(pet);
    return atk.reduce((a, b) => (expPower(b) * M.typeMultOfficialMulti(b.type, bossTypes) > expPower(a) * M.typeMultOfficialMulti(a.type, bossTypes) ? b : a), atk[0]);
  };
  const bestHit = (pet) => Math.max(...attackMoves(pet).map((m) => expPower(m) * M.typeMultOfficialMulti(m.type, bossTypes)));
  // 馆主期望单回合伤害（按 gymBossChoose 权重：蓄势回合不攻击、蓄势后一击 ×1.5 粗估 +pCharge×0.5）：
  // 用期望而非最强招估算——最强招触发率仅 50–75%，按最强招算会过早浪费回血。
  const bossExpHit = (pet) => {
    const foeFrac = pet.hp / pet.maxHp;
    const pCharge = foeFrac <= 0.3 ? 0.1 : 0.25;
    const topW = foeFrac <= 0.3 ? 0.75 : 0.5;
    const sorted = [...boss.moves].sort((a, b) => b.power - a.power);
    const rest = (1 - topW) / Math.max(1, sorted.length - 1);
    let exp = 0;
    sorted.forEach((m, i) => { exp += (i === 0 ? topW : rest) * expPower(m) * M.typeMultOfficial(m.type, pet.type); });
    return (1 - pCharge) * exp * (1 + pCharge * 0.5);
  };
  let heals = 0, revives = 0, guard = 0;
  while (!st.winner && guard++ < 200) {
    const A = st.sides.A;
    const active = A.pets[A.activeIdx];
    const bossPet = st.sides.B.pets[st.sides.B.activeIdx];
    if (useItems) {
      const faintIdx = A.pets.findIndex((p, i) => i !== A.activeIdx && p.hp <= 0);
      // 复活：备战宠倒下且上场宠下回合大概率倒下、本回合又打不死馆主——不复活则上场宠一倒即判负
      if (faintIdx >= 0 && revives < 1 && active.hp <= bossExpHit(active) && bossPet.hp > bestHit(active)) {
        const r = M.resolveGymRound(st, { itemKey: 'medicine:revive', targetIdx: faintIdx }, rng);
        if (!r.error) { revives++; continue; }
      }
    }
    // 换宠保命（锁定版 playerGreedy 的血量口径 ＋ 换上打得更疼的宠才换）：
    // 主宠残血 <35% 且备战明显更健康、且备战对馆主的期望伤害高于上场宠时换宠；
    // 备战更弱时不换（S2 大宝例：独角犀牛 62 < 主宠十万伏特 146，换宠白丢一回合输出）。
    if (active.key === 'main' && active.hp / active.maxHp < 0.35) {
      const bi = A.pets.findIndex((p, i) => i !== A.activeIdx && p.hp > 0 && p.hp / p.maxHp > active.hp / active.maxHp + 0.2 && bestHit(p) > bestHit(active));
      if (bi >= 0) {
        const r = M.resolveGymRound(st, { swapToIdx: bi }, rng);
        if (!r.error) continue;
      }
    }
    if (useItems) {
      // 回血：下回合大概率被打倒、且回血后两回合内能收尾时才用，不在馆主血还厚时浪费出招机会
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

function simCellV11(stageCfg, playerLevel, line, benchNo, benchLevel, useItems, seed) {
  let wins = 0;
  const rng = mulberry32(seed);
  for (let i = 0; i < SIM_N; i++) wins += playStageV11(stageCfg, playerLevel, line, benchNo, benchLevel, useItems, rng);
  return wins / SIM_N * 100;
}

// 设计点队伍：[孩子, 主宠线, 备战物种号(null=单宠参考行), 备战等级]；S2 小宝 Lv9，其余取门槛等级
// 备战等级：S1/S3/S4 取 bossLevel−2（锁定版口径）；S2 沿用改版实测队伍（同级备战）
const V11_TEAMS = {
  1: [['大宝', 'pikachu', 43, 4], ['小宝', 'charmander', 43, 4], ['大宝', 'pikachu', null, 0], ['小宝', 'charmander', null, 0]],
  2: [['大宝', 'pikachu', 111, 8], ['小宝', 'charmander', 43, 9], ['大宝', 'pikachu', null, 0], ['小宝', 'charmander', null, 0]],
  3: [['大宝', 'pikachu', 50, 11], ['小宝', 'charmander', 50, 11], ['大宝', 'pikachu', null, 0], ['小宝', 'charmander', null, 0]],
  4: [['大宝', 'pikachu', 16, 16], ['小宝', 'charmander', 16, 16], ['大宝', 'pikachu', null, 0], ['小宝', 'charmander', null, 0]],
  5: [['大宝', 'pikachu', 111, 17], ['小宝', 'charmander', 54, 17], ['大宝', 'pikachu', null, 0], ['小宝', 'charmander', null, 0]],
  6: [['大宝', 'pikachu', 98, 20], ['小宝', 'charmander', 43, 20], ['大宝', 'pikachu', null, 0], ['小宝', 'charmander', null, 0]],
};

console.log(`\n== v11 仿真门：真实关卡 × 真实队伍 × 道具组（伤药×2＋活力碎片×1；强化未入池按 0 计）· 每格 ${SIM_N} 局 ==`);
console.log('关卡 | 队伍 | 无道具 | 带道具 | 变化 | 验收(带道具 40–55%，单宠行仅参考)');
for (const cfg of M.GYM_STAGES) {
  for (const [who, line, benchNo, benchLevel] of V11_TEAMS[cfg.stage]) {
    const pl = cfg.stage === 2 && who === '小宝' ? 9 : cfg.needLevel;
    const benchName = benchNo ? `${(M.SPECIES[benchNo] || {}).name} Lv${benchLevel}` : '单宠';
    const seedBase = 424242 + cfg.stage * 10000 + pl * 100 + (benchNo || 0) + (line === 'charmander' ? 7 : 0);
    const noItem = simCellV11(cfg, pl, line, benchNo, benchLevel, false, seedBase);
    const withItem = simCellV11(cfg, pl, line, benchNo, benchLevel, true, seedBase + 777777);
    const delta = withItem - noItem;
    let verdict;
    if (!benchNo) verdict = '参考';
    else if ((cfg.stage === 4 && line === 'charmander') || (cfg.stage === 5 && line === 'pikachu') || (cfg.stage === 6 && line === 'charmander')) verdict = '参考（镜像关取难线）';
    else if (withItem >= 40 && withItem <= 55) verdict = '通过';
    else if (withItem > 55) verdict = '超带！需收紧';
    else verdict = '偏低';
    console.log(`S${cfg.stage} ${cfg.gymName} | ${who} Lv${pl}＋${benchName} | ${noItem.toFixed(1)}% | ${withItem.toFixed(1)}% | ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pt | ${verdict}`);
  }
}
console.log('\n注：强化×1 未建模（引擎未入池，按 0 效果计）；待入池后重跑本表。胜率含馆主蓄势/暴击随机性，种子固定可复现。');
