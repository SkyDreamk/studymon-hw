/* 水系道馆（S2）改版仿真：node scripts/sim-s2-rework.mjs [--bossLevel N] [--hpMult X] [--moves 水:40,地面:60,普通:60] [--levels 7,8,9,10,11,12] [--n 2000]
 * 驱动真实道馆引擎（createBattleState + resolveGymRound，馆主 AI 在内），队伍取两孩真实配置：
 *   大宝：主宠皮丘线·电（effectiveMoves 按等级解锁，威力 25+6×招式等级）＋备战独角犀牛·地面（58/62）
 *   小宝：主宠小火龙线·火（同上）＋备战走路草·草（48/40，克水解法）／另附可达鸭·水（46/60，中性备战对照）
 * 玩家策略为保守基线：每回合选期望伤害（威力×克制）最高的招式，不用 shell/weak 保命招——
 * 真实玩家会打得更好，故表内胜率是下限口径。固定种子可复现。
 * 口径：PvE 官方（弱点 ×2、抗性 ×0.5、免疫 ×0）。
 * 用途：DESIGN-道馆后续关卡规范-v1.md §6 规则 E —— 新关卡数值锁定前附胜率表，目标带 40–55%。 */
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.+)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), '1'];
}));
const N = Number(args.n || 2000);
const BOSS_LEVEL = Number(args.bossLevel || 12);
const BOSS_HP_MULT = Number(args.hpMult || 2.0);
const LEVELS = (args.levels || '7,8,9,10,11,12').split(',').map(Number);
const BOSS_MOVES = (args.moves || '水:40,地面:60,普通:60').split(',').map((s) => {
  const [t, p] = s.split(':');
  return { name: `${t}招`, type: t, power: Number(p) };
});

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

function mainPet(line, level) {
  const moves = M.effectiveMoves(line, level, []).map((m) => { const off = M.officialMove(m.name); return { name: m.name, type: off ? off.type : M.LINE_TYPE[line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * m.level }; });
  return M.makePet({ key: 'main', name: '主宠', type: M.LINE_TYPE[line], no: M.lineFormNo(line, level), level, moves: moves.length ? moves : [{ name: '撞击', type: '普通', power: 35 }] });
}
function benchPet(no, level) {
  const sp = M.SPECIES[no];
  return M.makePet({ key: `dex:${no}`, name: sp.name, type: sp.type, no, level, moves: M.COLLECTION_MOVES[no].map(([n, p]) => { const off = M.officialMove(n); return { name: n, type: sp.type, damage_class: off ? off.damage_class : undefined, power: p }; }) });
}

function playOne(team, playerLevel, rng) {
  const pets = [mainPet(team.line, playerLevel)];
  if (team.bench) pets.push(benchPet(team.bench, playerLevel));
  const boss = M.makePet({
    key: 'boss', name: '宝石海星', type: '水', defTypes: M.bossDefTypes(121), no: 121, level: BOSS_LEVEL, hpMult: BOSS_HP_MULT,
    moves: BOSS_MOVES.map((m) => { const off = M.officialMove(m.name); return { name: m.name, type: m.type, damage_class: off ? off.damage_class : undefined, power: m.power }; }),
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
    const move = pet.moves.reduce((a, b) => (b.power * M.typeMultOfficialMulti(b.type, M.bossDefTypes(121)) > a.power * M.typeMultOfficialMulti(a.type, M.bossDefTypes(121)) ? b : a), pet.moves[0]);
    M.resolveGymRound(st, { moveName: move.name }, rng);
  }
  return st.winner === 'A' ? 1 : 0;
}

const TEAMS = [
  { label: '大宝（电主宠＋地面备战·独角犀牛）', line: 'pikachu', bench: 111 },
  { label: '小宝（火主宠＋草备战·走路草，克水解法）', line: 'charmander', bench: 43 },
  { label: '小宝（火主宠＋水备战·可达鸭，中性对照）', line: 'charmander', bench: 54 },
];

console.log(`\n== 水系道馆 S2 改版仿真 · 馆主 宝石海星 Lv.${BOSS_LEVEL} hpMult=${BOSS_HP_MULT} 招式 ${BOSS_MOVES.map((m) => `${m.type}${m.power}`).join('/')} · 每格 ${N} 局 ==`);
for (const team of TEAMS) {
  console.log(`\n-- ${team.label} --`);
  console.log('玩家等级 | 胜率');
  for (const lv of LEVELS) {
    let wins = 0;
    const rng = mulberry32(5000 + lv * 100 + team.label.length);
    for (let i = 0; i < N; i++) wins += playOne(team, lv, rng);
    console.log(`Lv.${lv}      | ${(wins / N * 100).toFixed(1)}%`);
  }
}
console.log('\n注：胜率为保守基线（贪心最高伤害招，不用保命招）；目标带 40–55%。');
