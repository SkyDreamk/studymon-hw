/* 道馆平衡蒙特卡洛模拟：node scripts/battle-balance-sim.mjs [config.json]
 * 复用 src/index.js 的纯函数引擎（与线上同一套规则），玩家每回合用当前上场宠的
 * 最高威力招式，馆主随机选招，先攻 50/50（先攻方首回合跳过，同线上）。
 * config.json 可覆盖调参（结构见 DEFAULT_CONFIG），不传则用脚本内当前参数。
 * 定参结论见 DEPLOY.md 第 11 节。 */
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));
const {
  SPECIES, COLLECTION_MOVES, GYM_STAGES, LINE_TYPE, learnedMoves,
  makePet, createBattleState, applyBattleAction, canSideAttack, activePetOf,
} = M;

/* 招式按名定属性后的馆主配置（与 src GYM_STAGES 保持一致；2026-10-20 定参版） */
const DEFAULT_CONFIG = {
  hpMultAll: 1.4,
  stages: {
    1: { bossLevel: 6, hpMult: 1.2, moves: [['岩石猛击', '岩石', 38], ['尾巴横扫', '普通', 32], ['大地重压', '地面', 28]] },
    2: { bossLevel: 12, hpMult: 1.4, moves: [['水炮冲击', '水', 54], ['宝石光线', '岩石', 62], ['旋转突进', '普通', 46]] },
    3: { bossLevel: 13, hpMult: 1.2, moves: [['雷电重拳', '电', 64], ['十万电光', '电', 72], ['疾风电爪', '电', 54]] },
    4: { bossLevel: 18, hpMult: 1.7, moves: [['花瓣狂舞', '草', 60], ['巨叶拍打', '草', 52], ['日光花炮', '草', 68]] },
  },
};

let CONFIG = DEFAULT_CONFIG;
if (process.argv[2]) {
  CONFIG = JSON.parse(readFileSync(process.argv[2], 'utf8'));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPlayer(line, level, benchNo) {
  const moves = learnedMoves(line, level).map((m) => ({ name: m[1], type: LINE_TYPE[line], power: 25 + 6 * m[0] }));
  const pets = [makePet({ key: 'main', name: '主宠', type: LINE_TYPE[line], level, moves })];
  if (benchNo) {
    const sp = SPECIES[benchNo];
    pets.push(makePet({
      key: `dex:${benchNo}`, name: sp.name, type: sp.type, level,
      moves: COLLECTION_MOVES[benchNo].map(([n, p]) => ({ name: n, type: sp.type, power: p })),
    }));
  }
  return { childId: 1, childName: '玩家', battleLevel: level, activeIdx: 0, pets };
}

function buildBoss(stage) {
  const g = GYM_STAGES.find((x) => x.stage === stage);
  const cfg = CONFIG.stages[stage];
  const sp = SPECIES[g.bossNo];
  return {
    childId: null, childName: '馆主', battleLevel: cfg.bossLevel, activeIdx: 0,
    pets: [makePet({
      key: 'boss', name: sp.name, type: sp.type, no: g.bossNo, level: cfg.bossLevel,
      hpMult: cfg.hpMult ?? CONFIG.hpMultAll,
      moves: cfg.moves.map(([n, t, p]) => ({ name: n, type: t, power: p })),
    })],
  };
}

function simBattle({ line, level, benchNo = null, stage }, rng) {
  const st = createBattleState({
    mode: 'gym', firstSide: rng() < 0.5 ? 'A' : 'B',
    sides: { A: buildPlayer(line, level, benchNo), B: buildBoss(stage) },
  });
  let guard = 0;
  while (!st.winner && guard++ < 300) {
    const side = st.turn;
    if (!canSideAttack(st, side)) {
      const r = applyBattleAction(st, side, null, rng);
      if (r.error) throw new Error(r.error);
      continue;
    }
    const pet = activePetOf(st, side);
    if (!pet) break;
    let moveName;
    if (side === 'A') {
      moveName = pet.moves.reduce((a, b) => (b.power > a.power ? b : a)).name;
    } else {
      moveName = pet.moves[Math.floor(rng() * pet.moves.length) % pet.moves.length].name;
    }
    const r = applyBattleAction(st, side, moveName, rng);
    if (r.error) throw new Error(r.error);
  }
  return st.winner === 'A';
}

const GROUPS = [
  { label: '第1关 Lv.5 电线 单主宠', args: { line: 'pikachu', level: 5, stage: 1 }, target: '35–60%' },
  { label: '第1关 Lv.5 电线 ＋水备战(可达鸭)', args: { line: 'pikachu', level: 5, benchNo: 54, stage: 1 }, target: '≥70%' },
  { label: '第1关 Lv.5 电线 ＋草备战(走路草)', args: { line: 'pikachu', level: 5, benchNo: 43, stage: 1 }, target: '≥70%' },
  { label: '第1关 Lv.7 电线 单主宠', args: { line: 'pikachu', level: 7, stage: 1 }, target: '≥70%' },
  { label: '第2关 Lv.8 电线 单主宠', args: { line: 'pikachu', level: 8, stage: 2 }, target: '50–70%' },
  { label: '第3关 Lv.11 火线 单主宠', args: { line: 'charmander', level: 11, stage: 3 }, target: '35–60%' },
  { label: '第4关 Lv.14 火线 单主宠', args: { line: 'charmander', level: 14, stage: 4 }, target: '50–70%' },
];

const N = Number(process.env.SIM_N || 2000);
for (const [i, g] of GROUPS.entries()) {
  const rng = mulberry32(20261020 + i * 7919);
  let wins = 0;
  for (let k = 0; k < N; k++) if (simBattle(g.args, rng)) wins++;
  console.log(`${g.label}：胜率 ${(100 * wins / N).toFixed(1)}%（目标 ${g.target}，${N} 场）`);
}
