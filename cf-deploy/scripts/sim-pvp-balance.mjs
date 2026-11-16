/* PvP 兄弟对战平衡蒙特卡洛模拟：node scripts/sim-pvp-balance.mjs [--verify]
 * 复用 src/index.js 的纯函数引擎，走与线上完全相同的 PvP 路径：
 * stagePvpAttack 预演 → 防守方以给定答对率答题 → pickDefenseKind → resolveStagedAttack 结算；
 * 先攻方首回合跳过（canSideAttack/applyBattleAction 的 skip 路径），双方随机选招。
 * 队伍 = 两孩真实进化线（A=皮卡丘线·电，B=小火龙线·火），同级（压平后等级），仅主宠
 * （与 2026-10-24 审计的真实对局形态一致）；另附主宠+卡比兽(143)备战的参考场景。
 *
 * 候选参数注入方式：调参阶段把 src 源码里的 CRIT_RATE / CRIT_MULT / ward ratio 字面量
 * 在内存副本中替换后 import（不改生产源码）；index.js 已是 ESM（相对 import ./data/*.js），
 * data: URL 无法解析相对 import，故替换后源码写到 src/index.tuned.mjs 临时文件再用文件 URL
 * 导入（查询串保证每次拿到新模块实例），导入完成后即删临时文件。HP 倍率走 makePet 的 hpMult 参数
 * （= 生产改法 round(battleMaxHp(L) × PVP_HP_MULT)，同式）。
 * --verify 模式：不做任何替换，直接读生产源码导出的 PVP_* 常量复跑，验证定版参数。
 * 固定种子（mulberry32），结果可复现。定参结论见 DEPLOY.md 第 17 节。 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const VERIFY = process.argv.includes('--verify');
const N = 3000; // 每格对局数
const LEVELS = [3, 4, 5, 6, 7, 8, 9, 10];
const CORRECT_RATES = [0.5, 0.7];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let tunedCounter = 0;

async function loadEngine({ critRate, critMult, wardRatio }) {
  let src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  if (!VERIFY) {
    const reps = [
      ['const CRIT_RATE = 1 / 16;', `const CRIT_RATE = ${critRate};`],
      ['const CRIT_MULT = 1.5;', `const CRIT_MULT = ${critMult};`],
      ["{ kind: 'ward', label: '守护', ratio: 0.9, weight: 20 },", `{ kind: 'ward', label: '守护', ratio: ${wardRatio}, weight: 20 },`],
    ];
    for (const [from, to] of reps) {
      if (!src.includes(from)) throw new Error(`源码替换锚点缺失: ${from}`);
      src = src.replace(from, to);
    }
  }
  // 临时文件落在 src/ 下，相对 import ./data/*.js 才能正常解析；查询串区分各次实例。
  const tunedUrl = new URL('../src/index.tuned.mjs', import.meta.url);
  writeFileSync(tunedUrl, src, 'utf8');
  tunedCounter += 1;
  try {
    return await import(`${tunedUrl.href}?v=${tunedCounter}`);
  } finally {
    rmSync(tunedUrl, { force: true });
  }
}

/* 与 buildPlayerSide 同构的主宠（招式 = learnedMoves，威力 25+6×招式等级，属性按线计） */
function buildSide(M, line, childName, level, hpMult, benchNo) {
  const moves = M.learnedMoves(line, level).map((m) => { const off = M.officialMove(m[1]); return { name: m[1], type: off ? off.type : M.LINE_TYPE[line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * m[0] }; });
  const pets = [M.makePet({ key: 'main', name: '主宠', type: M.LINE_TYPE[line], no: M.lineFormNo(line, level), level, moves, hpMult })];
  if (benchNo) {
    const sp = M.SPECIES[benchNo];
    pets.push(M.makePet({
      key: `dex:${benchNo}`, name: sp.name, type: sp.type, no: benchNo, level, hpMult,
      moves: M.COLLECTION_MOVES[benchNo].map(([n, p]) => { const off = M.officialMove(n); return { name: n, type: sp.type, damage_class: off ? off.damage_class : undefined, power: p }; }),
    }));
  }
  return { childId: 1, childName, battleLevel: level, activeIdx: 0, pets };
}

/* 跑一局：返回 { winner, actions, attacks, loserAbsorbed }。
 * selectMode: 'strongest' 在伤害招里挑最高威力（孩子实际打法＋本仓道馆定参 sim 惯例，
 *   也是审计「3–4 招倒下」的口径）；'uniform' 全部招式均匀随机（任务书字面口径，作参考）。 */
function runBattle(M, level, correctRate, hpMult, rng, benchNo = null, selectMode = 'strongest') {
  const sides = {
    A: buildSide(M, 'pikachu', '哥哥', level, hpMult, benchNo),
    B: buildSide(M, 'charmander', '弟弟', level, hpMult, benchNo),
  };
  const firstSide = rng() < 0.5 ? 'A' : 'B';
  const st = M.createBattleState({ mode: 'pvp', firstSide, sides });
  let actions = 0;
  const attacksBy = { A: 0, B: 0 };
  while (!st.winner && actions < 1000) {
    const side = st.turn;
    actions += 1;
    if (!M.canSideAttack(st, side)) {
      const r = M.applyBattleAction(st, side, null, rng); // 先攻首回合跳过
      if (r.error) throw new Error(`skip 出错: ${r.error}`);
      continue;
    }
    const pet = M.activePetOf(st, side);
    let move;
    if (selectMode === 'uniform') {
      move = pet.moves[Math.floor(rng() * pet.moves.length)];
    } else {
      const dmgMoves = pet.moves.filter((m) => !M.moveEffectOf(m.name));
      move = dmgMoves.reduce((a, b) => (b.power > a.power ? b : a), dmgMoves[0]);
    }
    const staged = M.stagePvpAttack(st, side, move.name, rng);
    if (staged.error) throw new Error(`stage 出错: ${staged.error}`);
    if (staged.effectKind) { M.applyStagedEffect(st, { ...staged, attacker: side }); continue; }
    if (staged.smokeMiss) { M.applyStagedMiss(st, { ...staged, attacker: side }); continue; }
    attacksBy[side] += 1;
    const correct = rng() < correctRate;
    const defense = correct ? { kind: M.pickDefenseKind(rng).kind } : { correct: false };
    M.resolveStagedAttack(st, { ...staged, attacker: side }, defense);
  }
  const attacks = attacksBy.A + attacksBy.B;
  return {
    winner: st.winner, firstSide, actions, attacks,
    loserAbsorbed: st.winner ? attacksBy[st.winner] : 0, draw: !st.winner,
  };
}

function runCell(M, level, correctRate, hpMult, benchNo = null, selectMode = 'strongest') {
  const rng = mulberry32(20261024 + level * 1000 + Math.round(correctRate * 100) * 7 + (benchNo || 0));
  let actions = 0, attacks = 0, absorbed = 0, firstWins = 0, draws = 0, n = 0;
  for (let i = 0; i < N; i++) {
    const r = runBattle(M, level, correctRate, hpMult, rng, benchNo, selectMode);
    actions += r.actions; attacks += r.attacks;
    if (r.draw) draws += 1;
    else { n += 1; absorbed += r.loserAbsorbed; if (r.winner === r.firstSide) firstWins += 1; }
  }
  return {
    rounds: (actions / N) / 2,           // 回合数：双方各行动一次为一回合
    actions: actions / N,
    attacks: attacks / N,
    loserAbsorbed: n ? absorbed / n : 0, // 败方承受出招数（≈「几招打倒」，主 tuning 指标）
    firstWinPct: n ? (firstWins / n) * 100 : 0,
    draws,
  };
}

/* 解析指标：以某等级双方伤害招（非变化类）的平均期望伤害为基准 */
function luckMetrics(M, level, critRate, critMult, wardRatio) {
  const powers = [];
  for (const line of ['pikachu', 'charmander']) {
    for (const m of M.learnedMoves(line, level)) {
      if (!M.moveEffectOf(m[1])) powers.push(25 + 6 * m[0]);
    }
  }
  const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
  const eDmg = avgPower * (0.5 + 0.05 * level); // 区间 [0.9,1.1] 与克制倍率期望均按 1（电/火互不克）
  const eRatio = M.DEFENSE_KINDS.reduce((a, d) => a + d.ratio * d.weight, 0) / M.DEFENSE_KINDS.reduce((a, d) => a + d.weight, 0);
  return {
    eDmg,
    critBonusOnce: (critMult - 1) * eDmg,           // 单次暴击增伤（暴击发生时）
    critExpectPerAttack: critRate * (critMult - 1) * eDmg, // 每次出招的暴击期望增伤
    defenseSavingOnce: (1 - eRatio) * eDmg,          // 一次成功防守的期望减伤
    eRatio,
    wardRatio,
  };
}

function fmt(x, d = 2) { return Number(x).toFixed(d); }

async function tableFor(M, params, label, selectMode = 'strongest') {
  console.log(`\n===== ${label} =====`);
  console.log(`参数: 暴击率=${params.critRate} 暴击倍率=${params.critMult} 守护=${params.wardRatio} HP倍率=${params.hpMult} 选招=${selectMode}`);
  console.log('等级 | 答对率 | 平均回合 | 平均行动 | 平均出招 | 败方承受出招 | 先攻胜率% | 后攻胜率% | 平局');
  for (const L of LEVELS) {
    for (const cr of CORRECT_RATES) {
      const c = runCell(M, L, cr, params.hpMult, null, selectMode);
      console.log(`${L} | ${cr} | ${fmt(c.rounds, 1)} | ${fmt(c.actions, 1)} | ${fmt(c.attacks, 1)} | ${fmt(c.loserAbsorbed, 1)} | ${fmt(c.firstWinPct, 1)} | ${fmt(100 - c.firstWinPct, 1)} | ${c.draws}`);
    }
  }
  const lm = luckMetrics(M, 5, params.critRate, params.critMult, params.wardRatio);
  console.log(`Lv.5 期望单招伤害=${fmt(lm.eDmg, 1)}；防守期望保留比例=${fmt(lm.eRatio, 3)}（守护=${lm.wardRatio}）`);
  console.log(`  单次暴击增伤=${fmt(lm.critBonusOnce, 1)}（=成功防守减伤的 ${fmt((lm.critBonusOnce / lm.defenseSavingOnce) * 100, 0)}%）`);
  console.log(`  每次出招暴击期望增伤=${fmt(lm.critExpectPerAttack, 2)}；一次成功防守期望减伤=${fmt(lm.defenseSavingOnce, 1)}`);
}

if (VERIFY) {
  const M = await loadEngine({});
  const params = {
    critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT,
    wardRatio: M.DEFENSE_KINDS.find((d) => d.kind === 'ward').ratio,
    hpMult: M.PVP_HP_MULT,
  };
  await tableFor(M, params, '生产定版参数复验（--verify，源码零替换）', 'strongest');
  await tableFor(M, params, '生产定版参数复验（均匀随机选招参考）', 'uniform');
  const c = runCell(M, 5, 0.7, params.hpMult, 143, 'strongest');
  console.log(`\n参考场景 Lv.5 答对0.7 主宠+卡比兽备战（最强招）: 平均回合=${fmt(c.rounds, 1)} 平均出招=${fmt(c.attacks, 1)} 先攻胜率=${fmt(c.firstWinPct, 1)}%`);
} else {
  // 基线（现行参数，最强招口径与审计一致）
  {
    const M = await loadEngine({ critRate: 1 / 16, critMult: 1.5, wardRatio: 0.9 });
    await tableFor(M, { critRate: 1 / 16, critMult: 1.5, wardRatio: 0.9, hpMult: 1 }, '调整前（现行参数）', 'strongest');
    await tableFor(M, { critRate: 1 / 16, critMult: 1.5, wardRatio: 0.9, hpMult: 1 }, '调整前（均匀随机参考）', 'uniform');
  }
  // HP 网格（守护 0.75、暴击 1/24×1.3 固定，最强招口径定 HP 倍率）
  for (const hpMult of [1.3, 1.4, 1.5]) {
    const M = await loadEngine({ critRate: 1 / 24, critMult: 1.3, wardRatio: 0.75 });
    console.log(`\n----- HP 倍率候选 ${hpMult}（守护0.75/暴击1/24×1.3，最强招，仅 Lv.5） -----`);
    for (const cr of CORRECT_RATES) {
      const c = runCell(M, 5, cr, hpMult, null, 'strongest');
      console.log(`Lv.5 答对率=${cr}: 败方承受出招=${fmt(c.loserAbsorbed, 1)} 平均出招=${fmt(c.attacks, 1)} 平均回合=${fmt(c.rounds, 1)} 先攻胜率=${fmt(c.firstWinPct, 1)}%`);
    }
  }
  // 暴击候选解析对照（Lv.5，守护 0.75）
  {
    const M = await loadEngine({ critRate: 1 / 24, critMult: 1.3, wardRatio: 0.75 });
    console.log('\n----- 暴击候选对照（Lv.5 解析值，守护=0.75） -----');
    for (const [r, m] of [[1 / 16, 1.5], [1 / 16, 1.3], [1 / 24, 1.3], [1 / 24, 1.25], [1 / 32, 1.3]]) {
      const lm = luckMetrics(M, 5, r, m, 0.75);
      console.log(`暴击 ${r.toFixed(4)}×${m}: 单次增伤=${fmt(lm.critBonusOnce, 1)}（成功防守减伤 ${fmt(lm.defenseSavingOnce, 1)} 的 ${fmt((lm.critBonusOnce / lm.defenseSavingOnce) * 100, 0)}%），每出招期望增伤=${fmt(lm.critExpectPerAttack, 2)}`);
    }
  }
}
