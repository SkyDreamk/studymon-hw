/* 战斗特性第二期（2026-11-07）：node --test tests/abilities-phase2.test.mjs
 * 2a 阶段系统：威吓/避雷针/电气引擎/恒净之躯/怪力钳（5 个特性、15 种）；
 * 2b 状态系统：中毒/麻痹/灼伤/睡眠＋接触触发（静电/毒刺/孢子/火焰之躯）＋回合末钩子（13 个特性、40 种）。
 * 口径：D3 四种状态、D4 物理默认接触＋白名单、D5 先阶段后状态、D6 速度不进 PvP。
 * 确定性：固定 rng；精确伤害数均由 /tmp/probe-phase2.mjs 实测（makePet 带 stats，走官方分支）。
 * 主宠线（1–9、25、26）与传说种不在 SPECIES 表，纯函数宠按 SPECIES 口径用 type '普通'＋playerDefTypes 建。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const M = await import(new URL('../src/index.js', import.meta.url));
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
const pet = (no, name, moves, hp = 100, maxHp = 100) => {
  const sp = M.SPECIES[no];
  return M.makePet({ key: `p${no}`, name, type: sp ? sp.type : '普通', no, defTypes: M.playerDefTypes(no), level: 18, moves });
};
// 带 stats 的纯函数宠（不走 makePet，用于精确伤害对照）。
const atk = (no, hp, maxHp, type, defTypes, stats) => ({ key: 'a', name: `攻方${no}`, type, no, level: 18, maxHp, hp, defTypes, stats, moves: [{ name: '撞击', type: '普通', power: 35 }] });
const def = (no, defTypes, hp = 100, stats) => ({ key: 'b', name: `守方${no}`, type: '普通', no, level: 18, maxHp: 100, hp, defTypes, stats, moves: [{ name: '撞击', type: '普通', power: 35 }] });
const pikaStats = { hp: 40, attack: 24, defense: 19, sp_attack: 23, sp_defense: 23, speed: 37 };
const popoStats = { hp: 42, attack: 21, defense: 19, sp_attack: 17, sp_defense: 17, speed: 25 };

describe('范围守卫', () => {
  test('2a 生效 5 个特性、15 种（威吓 6、避雷针 3、电气引擎 1、怪力钳 3、恒净之躯 2）', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (['威吓', '避雷针', '电气引擎', '怪力钳', '恒净之躯'].includes(a)) got[no] = a;
    }
    assert.deepEqual(got, {
      23: '威吓', 24: '威吓', 58: '威吓', 59: '威吓', 128: '威吓', 130: '威吓',
      111: '避雷针', 112: '避雷针', 464: '避雷针', 466: '电气引擎',
      98: '怪力钳', 99: '怪力钳', 127: '怪力钳', 72: '恒净之躯', 73: '恒净之躯',
    });
  });
  test('2a dormant：健壮胸肌首特性 0 种；阶段被降时触发的特性（好胜/不服输/正义之心/自信过度/不屈之心/胆怯/碎裂铠甲/神奇鳞片/愤怒穴位/下载）首特性全为 0', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (['健壮胸肌', '好胜', '不服输', '正义之心', '自信过度', '不屈之心', '胆怯', '碎裂铠甲', '神奇鳞片', '愤怒穴位', '下载'].includes(a)) got[no] = a;
    }
    assert.deepEqual(got, {});
  });
  test('2b 实际生效 13 个特性、40 种', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (['静电', '毒刺', '同步', '蜕皮', '柔软', '毅力', '孢子', '干劲', '不眠', '免疫', '火焰之躯', '自然回复', '早起'].includes(a)) got[no] = a;
    }
    assert.deepEqual(got, {
      25: '静电', 26: '静电', 125: '静电', 172: '静电', 179: '静电', 180: '静电', 181: '静电',
      29: '毒刺', 30: '毒刺', 31: '毒刺', 32: '毒刺', 33: '毒刺', 34: '毒刺', 117: '毒刺',
      63: '同步', 64: '同步', 65: '同步', 151: '同步', 196: '同步', 197: '同步',
      11: '蜕皮', 14: '蜕皮', 147: '蜕皮', 148: '蜕皮',
      53: '柔软', 106: '柔软', 132: '柔软', 66: '毅力', 67: '毅力', 68: '毅力',
      46: '孢子', 47: '孢子', 56: '干劲', 57: '干劲', 96: '不眠', 97: '不眠',
      143: '免疫', 126: '火焰之躯', 113: '自然回复', 115: '早起',
    });
  });
  test('2b dormant：迷人之躯 5、迟钝 3、我行我素 1（首特性在状态档但本期不做，着迷/混乱不在 D3 范围内）；毒手/飞毛腿/水幕/神奇鳞片首特性 0 种', () => {
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (['迷人之躯', '迟钝', '我行我素', '毒手', '飞毛腿', '水幕', '神奇鳞片'].includes(a)) got[no] = a;
    }
    assert.deepEqual(got, {
      35: '迷人之躯', 36: '迷人之躯', 39: '迷人之躯', 40: '迷人之躯', 700: '迷人之躯',
      79: '迟钝', 80: '迟钝', 124: '迟钝', 108: '我行我素',
    });
  });
  test('接触判定白名单 63 条（7 官方＋56 原创），56 原创全在 328 招内', () => {
    assert.equal(M.NON_CONTACT_MOVES.size, 63);
    const official = ['地震', '尖石攻击', '岩崩', '岩石封锁', '落石', '重踏', '飞叶快刀'];
    for (const name of official) {
      assert.ok(M.NON_CONTACT_MOVES.has(name), name);
      assert.ok(M.officialMove(name), `${name} 应为官方招式`);
    }
    // 328 原创招式名：COLLECTION_MOVES 的（种，招）对数（2026-11-14 全量 151 批：146 种→164 种，292→328）。
    const names = new Set();
    let total = 0;
    for (const pairs of Object.values(M.COLLECTION_MOVES)) for (const [name] of pairs) { total++; names.add(name); }
    assert.equal(total, 328);
    for (const name of M.NON_CONTACT_MOVES) {
      if (official.includes(name)) continue;
      assert.ok(names.has(name), `${name} 应在 292 招内`);
    }
    // 2c 统计（只统计、不打标签）：声音类 5、拳类 16、切割类 12（2026-11-14 全量 151 批：11→12）。
    const all = [...names];
    assert.equal(all.filter((n) => /音|吼|叫|歌|声|鸣|啸|哨|笛|铃|唱/.test(n)).length, 5);
    assert.equal(all.filter((n) => /拳|掌/.test(n)).length, 16);
    assert.equal(all.filter((n) => /斩|刀|镰|刃|剑|剪|切割/.test(n)).length, 12);
  });
  test('isContactMove：物理默认接触、白名单不接触、特殊不接触', () => {
    assert.equal(M.isContactMove({ name: '撞击', damage_class: 'physical' }), true);
    assert.equal(M.isContactMove({ name: '地震', damage_class: 'physical' }), false);
    assert.equal(M.isContactMove({ name: '飞叶快刀', damage_class: 'physical' }), false);
    assert.equal(M.isContactMove({ name: '十万伏特', damage_class: 'special' }), false);
    assert.equal(M.isContactMove({ name: '暗影球', damage_class: 'special' }), false);
    assert.equal(M.isContactMove(null), false);
    assert.equal(M.isContactMove({ name: '岩石利刃', damage_class: 'physical' }), false);
  });
});

describe('阶段系统（2a）', () => {
  test('stageMult：-6→0.25、-1→2/3、0→1、+1→1.5、+2→2、+6→4', () => {
    assert.equal(M.stageMult(-6), 0.25);
    assert.equal(M.stageMult(-2), 0.5);
    assert.equal(M.stageMult(-1), 2 / 3);
    assert.equal(M.stageMult(0), 1);
    assert.equal(M.stageMult(1), 1.5);
    assert.equal(M.stageMult(2), 2);
    assert.equal(M.stageMult(6), 4);
    assert.equal(M.stageMult(9), 4);
    assert.equal(M.stageMult(-9), 0.25);
  });
  test('changeStage：钳制 ±6；恒净之躯挡全部降档；怪力钳只挡攻击降档', () => {
    const p = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    assert.deepEqual(M.changeStage(p, 'atk', 9), { applied: true, blocked: false, guard: null, from: 0, to: 6 });
    assert.deepEqual(M.changeStage(p, 'atk', -20), { applied: true, blocked: false, guard: null, from: 6, to: -6 });
    assert.deepEqual(M.changeStage(p, 'atk', 0), { applied: false, blocked: false, guard: null, from: -6, to: -6 });
    const jelly = pet(72, '玛瑙水母', [{ name: '撞击', type: '普通', power: 35 }]);
    assert.deepEqual(M.changeStage(jelly, 'atk', -1), { applied: false, blocked: true, guard: '恒净之躯', from: 0, to: 0 });
    assert.deepEqual(M.changeStage(jelly, 'spa', -1), { applied: false, blocked: true, guard: '恒净之躯', from: 0, to: 0 });
    assert.equal(jelly.stages.atk, 0);
    const kairos = pet(127, '凯罗斯', [{ name: '撞击', type: '普通', power: 35 }]);
    assert.deepEqual(M.changeStage(kairos, 'atk', -1), { applied: false, blocked: true, guard: '怪力钳', from: 0, to: 0 });
    assert.deepEqual(M.changeStage(kairos, 'def', -1), { applied: true, blocked: false, guard: null, from: 0, to: -1 });
    assert.equal(kairos.stages.atk, 0);
    assert.equal(kairos.stages.def, -1);
  });
  test('stagesOf 防御性补全：旧存量宠无 stages/status 字段时按需建', () => {
    const bare = { key: 'x', name: '旧宠', no: 16, level: 18, hp: 40, maxHp: 40 };
    assert.deepEqual(M.stagesOf(bare), { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    assert.deepEqual(bare.stages, { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    assert.equal(M.stagesOf(null).atk, 0);
    M.resetStages(bare);
    assert.deepEqual(bare.stages, { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  });
  test('makePet 带 stages/status 初始字段', () => {
    const p = pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]);
    assert.deepEqual(p.stages, { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    assert.equal(p.status, null);
  });
  test('calcDamage 阶段进 A/D：物攻 atk+1 时 10→13、atk-1 时 10→7、防守 def+1 时 10→7；特攻 spa+1 时 30→42（分步取整）', () => {
    const mv = { name: '电光一闪', type: '电', power: 40, damage_class: 'physical' };
    const a = atk(25, 100, 100, '电', ['电'], pikaStats);
    const d = def(16, ['普通', '飞行'], 100, popoStats);
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 10);
    a.stages = { atk: 1, def: 0, spa: 0, spd: 0, spe: 0 };
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 13); // 分步取整
    a.stages.atk = -1;
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 7);
    a.stages.atk = 0;
    d.stages = { atk: 0, def: 1, spa: 0, spd: 0, spe: 0 };
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 7);
    d.stages.def = 0;
    const mvSp = { name: '十万伏特', type: '电', power: 40, damage_class: 'special' };
    assert.equal(M.calcDamage(mvSp, a, d, R, OFF).dmg, 30);
    a.stages.spa = 1;
    assert.equal(M.calcDamage(mvSp, a, d, R, OFF).dmg, 42);
  });
  test('避雷针/电气引擎：电招免疫（dmg 0）且条目带 stage，applyAbilityStages 升档', () => {
    const mvSp = { name: '十万伏特', type: '电', power: 40, damage_class: 'special' };
    const a = atk(25, 100, 100, '电', ['电'], pikaStats);
    const rhino = pet(111, '独角犀牛', [{ name: '撞击', type: '普通', power: 35 }]);
    const r1 = M.calcDamage(mvSp, a, rhino, R, OFF);
    assert.equal(r1.dmg, 0);
    assert.equal(r1.mult, 0);
    assert.deepEqual(r1.ability, [{ name: '避雷针', kind: 'immune', side: 'def', pet: '独角犀牛', moveType: '电', heal: 0, stage: { key: 'spa', delta: 1 } }]);
    M.applyAbilityStages(rhino, r1.ability);
    assert.equal(rhino.stages.spa, 1);
    const electivire = pet(466, '电击魔兽', [{ name: '撞击', type: '普通', power: 35 }]);
    const r2 = M.calcDamage(mvSp, a, electivire, R, OFF);
    assert.equal(r2.dmg, 0);
    assert.deepEqual(r2.ability[0].stage, { key: 'spe', delta: 1 });
    M.applyAbilityStages(electivire, r2.ability);
    assert.equal(electivire.stages.spe, 1);
    // 非电招不触发
    const r3 = M.calcDamage({ name: '撞击', type: '普通', power: 35, damage_class: 'physical' }, a, rhino, R, OFF);
    assert.deepEqual(r3.ability, []);
  });
  test('effectiveSpeed：基础 37、麻痹 ×0.5 得 18.5、spe+1 得 55.5', () => {
    const p = pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]);
    assert.equal(M.effectiveSpeed(p), 37);
    p.status = { kind: 'paralysis' };
    assert.equal(M.effectiveSpeed(p), 18.5);
    p.status = null;
    p.stages.spe = 1;
    assert.equal(M.effectiveSpeed(p), 55.5);
    assert.equal(M.effectiveSpeed(null), 0);
    assert.equal(M.effectiveSpeed({}), 0);
  });
});

describe('威吓（2a）', () => {
  function gymState(mainDesc, bossDesc) {
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [M.makePet(mainDesc)] },
        B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
      },
    });
    st.gym.friendship = 0;
    st.gym.endureUsed = false;
    return st;
  }
  test('开局触发：卡蒂狗出场降波波攻击 1 档，log 有威吓事件', () => {
    const st = gymState(
      { key: 'main', name: '卡蒂狗', type: '火', no: 58, defTypes: ['火'], level: 18, moves: [{ name: '火花', type: '火', power: 40 }] },
      { key: 'boss', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    assert.equal(st.sides.B.pets[0].stages.atk, -1);
    const ev = st.log.find((e) => e.type === 'ability' && e.ability === '威吓');
    assert.ok(ev, JSON.stringify(st.log));
    assert.match(ev.text, /威吓/);
  });
  test('怪力钳挡威吓：凯罗斯攻击不降，log 有怪力钳事件', () => {
    const st = gymState(
      { key: 'main', name: '卡蒂狗', type: '火', no: 58, defTypes: ['火'], level: 18, moves: [{ name: '火花', type: '火', power: 40 }] },
      { key: 'boss', name: '凯罗斯', type: '普通', no: 127, defTypes: M.playerDefTypes(127), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    assert.equal(st.sides.B.pets[0].stages.atk, 0);
    const ev = st.log.find((e) => e.type === 'ability' && e.ability === '怪力钳');
    assert.ok(ev, JSON.stringify(st.log));
  });
  test('恒净之躯挡威吓：玛瑙水母攻击不降', () => {
    const st = gymState(
      { key: 'main', name: '卡蒂狗', type: '火', no: 58, defTypes: ['火'], level: 18, moves: [{ name: '火花', type: '火', power: 40 }] },
      { key: 'boss', name: '玛瑙水母', type: '水', no: 72, defTypes: M.playerDefTypes(72), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    assert.equal(st.sides.B.pets[0].stages.atk, 0);
    const ev = st.log.find((e) => e.type === 'ability' && e.ability === '恒净之躯');
    assert.ok(ev, JSON.stringify(st.log));
  });
  test('PvP 开局同样触发威吓（B 为空时不推事件，加入时补触发）', () => {
    const a = pet(58, '卡蒂狗', [{ name: '火花', type: '火', power: 40 }]);
    const b = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [a] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b] },
      },
    });
    assert.equal(b.stages.atk, -1);
    assert.ok(st.log.some((e) => e.type === 'ability' && e.ability === '威吓'));
  });
  test('换宠顶上触发威吓：昏厥后备战卡蒂狗顶上，降对方攻击', () => {
    const main = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    const bench = pet(58, '卡蒂狗', [{ name: '火花', type: '火', power: 40 }]);
    const boss = pet(19, '小拉达', [{ name: '撞击', type: '普通', power: 35 }]);
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [main, bench] },
        B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [boss] },
      },
    });
    st.gym.friendship = 0;
    st.gym.endureUsed = false;
    // 波波先被打倒（hp 1，馆主撞击必定击倒），顶上卡蒂狗触发威吓
    main.hp = 1;
    const r = M.resolveGymRound(st, { moveName: '撞击' }, R);
    assert.equal(r.error, undefined);
    assert.equal(st.sides.A.activeIdx, 1);
    assert.equal(boss.stages.atk, -1);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '威吓'), JSON.stringify(r.events));
  });
});

describe('状态系统（2b）：挂状态与免疫', () => {
  const contact = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
  test('灼伤物理攻击减半（10→5，带 burn 条目）；特殊招不受影响（30 不变，分步取整）', () => {
    const mv = { name: '电光一闪', type: '电', power: 40, damage_class: 'physical' };
    const a = atk(25, 100, 100, '电', ['电'], pikaStats);
    const d = def(16, ['普通', '飞行'], 100, popoStats);
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 10);
    a.status = { kind: 'burn' };
    const burned = M.calcDamage(mv, a, d, R, OFF);
    assert.equal(burned.dmg, 5);
    assert.deepEqual(burned.ability, [{ name: '灼伤', kind: 'burn', side: 'atk', pet: '攻方25', moveType: '普通' }]);
    const mvSp = { name: '十万伏特', type: '电', power: 40, damage_class: 'special' };
    assert.equal(M.calcDamage(mvSp, a, d, R, OFF).dmg, 30);
  });
  test('毅力：异常时物理攻击 ×1.5 且无视灼伤减半（19→27，带 guts 条目；腕力 defTypes 现为 [格斗]，格斗招享 STAB）', () => {
    // 用 makePet 建宠：playerDefTypes(66) 现为 ['格斗']（TYPES18 补全），格斗招享 STAB，基础伤害 13→19。
    const mv = { name: '空手劈', type: '格斗', power: 40, damage_class: 'physical' };
    const a = pet(66, '腕力', [{ name: '空手劈', type: '格斗', power: 40, damage_class: 'physical' }]);
    const d = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 19);
    a.status = { kind: 'burn' };
    const g1 = M.calcDamage(mv, a, d, R, OFF);
    assert.equal(g1.dmg, 27);
    assert.deepEqual(g1.ability, [{ name: '毅力', kind: 'guts', side: 'atk', pet: '腕力', moveType: '格斗' }]);
    a.status = { kind: 'poison' };
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 27);
    a.status = null;
    assert.equal(M.calcDamage(mv, a, d, R, OFF).dmg, 19);
  });
  test('tryInflictStatus：已有状态/昏厥返回 null；属性免疫推 immune 事件；特性守卫推 ability 事件', () => {
    assert.equal(M.tryInflictStatus(null, 'poison', R, 'B'), null);
    const fainted = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    fainted.hp = 0;
    assert.equal(M.tryInflictStatus(fainted, 'poison', R, 'B'), null);
    const busy = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    busy.status = { kind: 'burn' };
    assert.equal(M.tryInflictStatus(busy, 'poison', R, 'B'), null);
    // 属性免疫：毒系免中毒、火系免灼伤、电系免麻痹
    assert.deepEqual(M.tryInflictStatus(pet(29, '尼多兰', [{ name: '撞击', type: '普通', power: 35 }]), 'poison', R, 'B'),
      { blocked: true, event: { type: 'status', side: 'B', pet: '尼多兰', kind: 'immune', text: '尼多兰 不会中毒！' } });
    assert.deepEqual(M.tryInflictStatus(pet(126, '鸭嘴火兽', [{ name: '撞击', type: '普通', power: 35 }]), 'burn', R, 'B').blocked, true);
    assert.deepEqual(M.tryInflictStatus(pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]), 'paralysis', R, 'B').blocked, true);
    // 特性守卫：免疫挡中毒、柔软挡麻痹、干劲/不眠挡睡眠
    assert.deepEqual(M.tryInflictStatus(pet(143, '卡比兽', [{ name: '撞击', type: '普通', power: 35 }]), 'poison', R, 'B'),
      { blocked: true, event: { type: 'ability', side: 'B', pet: '卡比兽', ability: '免疫', text: '「免疫」发动！卡比兽 不会中毒！' } });
    assert.equal(M.tryInflictStatus(pet(53, '猫老大', [{ name: '撞击', type: '普通', power: 35 }]), 'paralysis', R, 'B').blocked, true);
    assert.equal(M.tryInflictStatus(pet(56, '猴怪', [{ name: '撞击', type: '普通', power: 35 }]), 'sleep', R, 'B').blocked, true);
    assert.equal(M.tryInflictStatus(pet(96, '催眠貘', [{ name: '撞击', type: '普通', power: 35 }]), 'sleep', R, 'B').blocked, true);
  });
  test('睡眠时长 1–3 回合随机（rng 0.1→1、0.5→2、0.9→3）；早起减半（0.9→2、0.1→1）', () => {
    const a = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    M.tryInflictStatus(a, 'sleep', () => 0.1, 'B');
    assert.equal(a.status.sleepTurns, 1);
    const b = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    M.tryInflictStatus(b, 'sleep', () => 0.5, 'B');
    assert.equal(b.status.sleepTurns, 2);
    const c = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    M.tryInflictStatus(c, 'sleep', () => 0.9, 'B');
    assert.equal(c.status.sleepTurns, 3);
    const k1 = pet(115, '袋兽', [{ name: '撞击', type: '普通', power: 35 }]);
    M.tryInflictStatus(k1, 'sleep', () => 0.9, 'B');
    assert.equal(k1.status.sleepTurns, 2);
    const k2 = pet(115, '袋兽', [{ name: '撞击', type: '普通', power: 35 }]);
    M.tryInflictStatus(k2, 'sleep', () => 0.1, 'B');
    assert.equal(k2.status.sleepTurns, 1);
  });
  test('statusBlocksAction：睡眠直接跳过（不耗 rng）；麻痹 25%（rng 0.1 阻断、0.5 放行）', () => {
    const s = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    s.status = { kind: 'sleep', sleepTurns: 2 };
    assert.equal(M.statusBlocksAction(s, () => { throw new Error('睡眠不应掷 rng'); }), 'sleep');
    s.status = { kind: 'paralysis' };
    assert.equal(M.statusBlocksAction(s, () => 0.1), 'paralysis');
    assert.equal(M.statusBlocksAction(s, () => 0.5), null);
    s.status = null;
    assert.equal(M.statusBlocksAction(s, R), null);
    assert.equal(M.statusBlocksAction(null, R), null);
  });
  test('settleStatusTick：中毒/灼伤扣 max(1, floor(maxHp/8))；蜕皮回合末 33% 治愈（扣血之后、昏厥不治愈）；睡眠计数减 1、到 0 醒来', () => {
    const p = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    p.status = { kind: 'poison' };
    const evs = [];
    const t1 = M.settleStatusTick(p, R, evs, 'B');
    assert.deepEqual(t1, { dmg: 5, cured: false, woke: false });
    assert.equal(p.hp, p.maxHp - 5);
    assert.equal(evs[0].text, '波波 受到了毒的伤害！（-5）');
    // 蜕皮：rng 0.1 治愈、0.5 不治愈
    const k = pet(11, '铁甲蛹', [{ name: '撞击', type: '普通', power: 35 }]);
    k.status = { kind: 'poison' };
    const evs2 = [];
    const t2 = M.settleStatusTick(k, () => 0.1, evs2, 'B');
    assert.equal(t2.cured, true);
    assert.equal(k.status, null);
    assert.ok(evs2.some((e) => e.ability === '蜕皮'));
    k.status = { kind: 'poison' };
    const t3 = M.settleStatusTick(k, () => 0.5, [], 'B');
    assert.equal(t3.cured, false);
    assert.deepEqual(k.status, { kind: 'poison' });
    // 扣血致昏厥时不治愈
    const dying = pet(11, '铁甲蛹', [{ name: '撞击', type: '普通', power: 35 }]);
    dying.hp = 1;
    dying.status = { kind: 'poison' };
    const t4 = M.settleStatusTick(dying, () => 0.1, [], 'B');
    assert.equal(dying.hp, 0);
    assert.equal(t4.cured, false);
    // 睡眠计数
    const s = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    s.status = { kind: 'sleep', sleepTurns: 2 };
    const evs3 = [];
    assert.deepEqual(M.settleStatusTick(s, R, evs3, 'B'), { dmg: 0, cured: false, woke: false });
    assert.equal(s.status.sleepTurns, 1);
    assert.equal(evs3.length, 0);
    const evs4 = [];
    assert.deepEqual(M.settleStatusTick(s, R, evs4, 'B'), { dmg: 0, cured: false, woke: true });
    assert.equal(s.status, null);
    assert.equal(evs4[0].text, '波波 醒来了！');
  });
});

describe('接触触发（2b）', () => {
  const contact = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
  const mkAtk = () => pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
  test('静电：rng 0.1 触发麻痹（特性＋状态两事件）、0.5 不触发', () => {
    const a = mkAtk();
    const d = pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]);
    const evs = [];
    M.applyContactTrigger(a, d, contact, () => 0.1, evs, 'A', 'B');
    assert.deepEqual(a.status, { kind: 'paralysis' });
    assert.deepEqual(evs.map((e) => e.text), ['「静电」发动！皮卡丘 让 波波 麻痹了！', '波波 麻痹了！']);
    const a2 = mkAtk();
    const evs2 = [];
    M.applyContactTrigger(a2, d, contact, () => 0.5, evs2, 'A', 'B');
    assert.equal(a2.status, null);
    assert.equal(evs2.length, 0);
  });
  test('毒刺→中毒、火焰之躯→灼伤；非接触（地震）/特殊招不触发；防守方昏厥不触发', () => {
    const a = mkAtk();
    M.applyContactTrigger(a, pet(29, '尼多兰', [{ name: '撞击', type: '普通', power: 35 }]), contact, () => 0.1, [], 'A', 'B');
    assert.deepEqual(a.status, { kind: 'poison' });
    const b = mkAtk();
    M.applyContactTrigger(b, pet(126, '鸭嘴火兽', [{ name: '撞击', type: '普通', power: 35 }]), contact, () => 0.1, [], 'A', 'B');
    assert.deepEqual(b.status, { kind: 'burn' });
    const c = mkAtk();
    M.applyContactTrigger(c, pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]), { name: '地震', type: '地面', power: 100, damage_class: 'physical' }, () => 0.1, [], 'A', 'B');
    assert.equal(c.status, null);
    const d = mkAtk();
    M.applyContactTrigger(d, pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]), { name: '十万伏特', type: '电', power: 40, damage_class: 'special' }, () => 0.1, [], 'A', 'B');
    assert.equal(d.status, null);
    const e = mkAtk();
    const fainted = pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]);
    fainted.hp = 0;
    M.applyContactTrigger(e, fainted, contact, () => 0.1, [], 'A', 'B');
    assert.equal(e.status, null);
    // 已带状态不重复触发（无事发生、不耗额外 rng）
    const f = mkAtk();
    f.status = { kind: 'burn' };
    const evs = [];
    M.applyContactTrigger(f, pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }]), contact, () => 0.1, evs, 'A', 'B');
    assert.deepEqual(f.status, { kind: 'burn' });
    assert.equal(evs.length, 0);
  });
  test('孢子：30% 触发后三态随机（pick 0.1→麻痹、0.5→中毒、0.9→睡眠）', () => {
    for (const [pick, kind] of [[0.1, 'paralysis'], [0.5, 'poison'], [0.9, 'sleep']]) {
      const a = mkAtk();
      const seq = [0.1, pick, 0.5];
      let i = 0;
      const evs = [];
      M.applyContactTrigger(a, pet(46, '派拉斯', [{ name: '撞击', type: '普通', power: 35 }]), contact, () => seq[i++], evs, 'A', 'B');
      assert.equal(a.status.kind, kind);
      assert.ok(evs.some((e) => e.ability === '孢子'));
    }
    const a = mkAtk();
    M.applyContactTrigger(a, pet(46, '派拉斯', [{ name: '撞击', type: '普通', power: 35 }]), contact, () => 0.5, [], 'A', 'B');
    assert.equal(a.status, null);
  });
  test('同步：受状态方把状态传回对方一次；对方免疫时推免疫事件、不连锁', () => {
    // 凯西（同步）打尼多兰（毒刺）：凯西中毒 → 同步传给尼多兰（毒系免疫，推免疫事件）
    const abra = pet(63, '凯西', [{ name: '撞击', type: '普通', power: 35 }]);
    const nidoran = pet(29, '尼多兰', [{ name: '撞击', type: '普通', power: 35 }]);
    const evs = [];
    M.applyContactTrigger(abra, nidoran, { name: '撞击', type: '普通', power: 35, damage_class: 'physical' }, () => 0.1, evs, 'A', 'B');
    assert.deepEqual(abra.status, { kind: 'poison' });
    assert.equal(nidoran.status, null);
    assert.deepEqual(evs.map((e) => e.text), ['「毒刺」发动！尼多兰 让 凯西 中毒了！', '凯西 中毒了！', '尼多兰 不会中毒！']);
    // 同步成功回传：凯西（同步）打海刺龙（毒刺、水系可中毒）：凯西中毒 → 同步传回海刺龙，海刺龙中毒
    const abra2 = pet(63, '凯西', [{ name: '撞击', type: '普通', power: 35 }]);
    const seadra = pet(117, '海刺龙', [{ name: '撞击', type: '普通', power: 35 }]);
    const evs2 = [];
    M.applyContactTrigger(abra2, seadra, { name: '撞击', type: '普通', power: 35, damage_class: 'physical' }, () => 0.1, evs2, 'A', 'B');
    assert.deepEqual(abra2.status, { kind: 'poison' });
    assert.deepEqual(seadra.status, { kind: 'poison' });
    assert.ok(evs2.some((e) => e.ability === '同步' && /把中毒传给了/.test(e.text)), JSON.stringify(evs2));
    assert.equal(evs2.filter((e) => e.ability === '同步').length, 1, '同步只传一次，不连锁');
  });
  test('自然回复：下场时清除状态并推事件；昏厥时清除状态、无事件', () => {
    const chansey = pet(113, '吉利蛋', [{ name: '撞击', type: '普通', power: 35 }]);
    chansey.status = { kind: 'poison' };
    chansey.stages.atk = 2;
    const evs = [];
    M.onPetLeavesField(null, 'A', chansey, evs);
    assert.equal(chansey.status, null);
    assert.deepEqual(chansey.stages, { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    assert.ok(evs.some((e) => e.ability === '自然回复' && /中毒治愈了/.test(e.text)), JSON.stringify(evs));
    const fainted = pet(113, '吉利蛋', [{ name: '撞击', type: '普通', power: 35 }]);
    fainted.status = { kind: 'burn' };
    fainted.stages.def = 1;
    M.clearPetBattleState(fainted);
    assert.equal(fainted.status, null);
    assert.deepEqual(fainted.stages, { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  });
});

describe('道馆集成（2a/2b）', () => {
  function gymState(mainDesc, bossDesc, benchDesc = null) {
    const pets = [M.makePet(mainDesc)];
    if (benchDesc) pets.push(M.makePet(benchDesc));
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets },
        B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
      },
    });
    st.gym.friendship = 0;
    st.gym.endureUsed = false;
    return st;
  }
  const bobo = { key: 'boss', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] };
  test('麻痹阻断：玩家宠麻痹＋rng 0.1 → 无法行动，馆主血量不动、无玩家攻击事件', () => {
    const st = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    st.sides.A.pets[0].status = { kind: 'paralysis' };
    const bossHp = st.sides.B.pets[0].hp;
    const r = M.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.ok(r.events.some((e) => e.type === 'status' && e.kind === 'paralysis' && /动不了/.test(e.text)), JSON.stringify(r.events));
    assert.equal(r.events.filter((e) => e.type === 'attack' && e.side === 'A').length, 0);
    assert.equal(st.sides.B.pets[0].hp, bossHp);
  });
  test('睡眠阻断：玩家宠睡眠 → 无法行动，馆主血量不动、无玩家攻击事件', () => {
    const st = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    st.sides.A.pets[0].status = { kind: 'sleep', sleepTurns: 2 };
    const bossHp = st.sides.B.pets[0].hp;
    const r = M.resolveGymRound(st, { moveName: '撞击' }, R);
    assert.equal(r.error, undefined);
    assert.ok(r.events.some((e) => e.type === 'status' && e.kind === 'sleep' && /睡着了/.test(e.text)), JSON.stringify(r.events));
    assert.equal(r.events.filter((e) => e.type === 'attack' && e.side === 'A').length, 0);
    assert.equal(st.sides.B.pets[0].hp, bossHp);
  });
  test('静电接触：玩家撞击打皮卡丘馆主，rng 0.1 → 玩家麻痹、静电事件在攻击事件之后', () => {
    const st = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      { key: 'boss', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] },
    );
    const r = M.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    const ev = r.events.find((e) => e.type === 'ability' && e.ability === '静电');
    assert.ok(ev, JSON.stringify(r.events));
    const atkEv = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(r.events.indexOf(ev) > r.events.indexOf(atkEv));
  });
  test('回合末中毒扣血：玩家宠中毒，回合末扣 floor(maxHp/8)=5，状态事件在攻击事件之后', () => {
    const st = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    const me = st.sides.A.pets[0];
    me.status = { kind: 'poison' };
    const hpBefore = me.hp;
    const r = M.resolveGymRound(st, { moveName: '撞击' }, R);
    assert.equal(r.error, undefined);
    const bossAtk = r.events.find((e) => e.type === 'attack' && e.side === 'B');
    const tickEv = r.events.find((e) => e.type === 'status' && e.kind === 'poison');
    assert.ok(tickEv, JSON.stringify(r.events));
    assert.equal(me.hp, hpBefore - bossAtk.dmg - 5);
    assert.ok(r.events.indexOf(tickEv) > r.events.indexOf(bossAtk));
  });
  test('速度顺序（D6）：麻痹的皮卡丘（37→18.5）慢于波波（25），馆主先攻；无麻痹时皮卡丘先攻', () => {
    const st = gymState(
      { key: 'main', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] },
      bobo,
    );
    st.sides.A.pets[0].status = { kind: 'paralysis' };
    const r = M.resolveGymRound(st, { moveName: '电光一闪' }, R);
    assert.equal(r.error, undefined);
    const firstAtk = r.events.find((e) => e.type === 'attack');
    assert.equal(firstAtk.side, 'B', JSON.stringify(r.events));
    const st2 = gymState(
      { key: 'main', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] },
      bobo,
    );
    const r2 = M.resolveGymRound(st2, { moveName: '电光一闪' }, R);
    const firstAtk2 = r2.events.find((e) => e.type === 'attack');
    assert.equal(firstAtk2.side, 'A', JSON.stringify(r2.events));
  });
  test('避雷针：玩家十万伏特打独角犀牛馆主，免疫＋特攻升档', () => {
    const st = gymState(
      { key: 'main', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '十万伏特', type: '电', power: 40 }] },
      { key: 'boss', name: '独角犀牛', type: '地面', no: 111, defTypes: M.playerDefTypes(111), level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    const boss = st.sides.B.pets[0];
    const bossHp = boss.hp;
    const r = M.resolveGymRound(st, { moveName: '十万伏特' }, R);
    assert.equal(r.error, undefined);
    const ev = r.events.find((e) => e.type === 'ability' && e.ability === '避雷针');
    assert.ok(ev, JSON.stringify(r.events));
    assert.match(ev.text, /特攻提升/);
    assert.equal(boss.hp, bossHp);
    assert.equal(boss.stages.spa, 1);
  });
  test('换宠：吉利蛋（自然回复）中毒下场 → 状态清除＋事件、阶段清零', () => {
    const st = gymState(
      { key: 'main', name: '吉利蛋', type: '普通', no: 113, defTypes: ['普通'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
      { key: 'bench', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    const chansey = st.sides.A.pets[0];
    chansey.status = { kind: 'poison' };
    chansey.stages.atk = 2;
    const r = M.resolveGymRound(st, { swapToIdx: 1 }, R);
    assert.equal(r.error, undefined);
    assert.equal(chansey.status, null);
    assert.deepEqual(chansey.stages, { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '自然回复'), JSON.stringify(r.events));
    assert.equal(st.sides.A.activeIdx, 1);
  });
});

describe('PvP 集成（2b）', () => {
  function pvpState() {
    const a = M.makePet({ key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35, damage_class: 'physical' }] });
    const b = M.makePet({ key: 'main', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40, damage_class: 'physical' }] });
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [a] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b] },
      },
    });
    st.turn = 'A'; st.acted = { A: 1, B: 1 }; // 模拟已过首回合：双方均可出招
    return { st, a, b };
  }
  test('即时结算：睡眠宠出招被阻断，无攻击事件、回合推进', () => {
    const { st, a } = pvpState();
    a.status = { kind: 'sleep', sleepTurns: 2 };
    const r = M.applyBattleAction(st, 'A', '撞击', R, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    assert.equal(r.error, undefined);
    assert.ok(r.events.some((e) => e.type === 'status' && e.kind === 'sleep' && /睡着了/.test(e.text)), JSON.stringify(r.events));
    assert.equal(r.events.filter((e) => e.type === 'attack').length, 0);
    assert.equal(st.turn, 'B');
  });
  test('即时结算：撞击打静电宠，rng 0.1 → 攻击方麻痹', () => {
    const { st, a } = pvpState();
    const r = M.applyBattleAction(st, 'A', '撞击', () => 0.1, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    assert.equal(r.error, undefined);
    assert.deepEqual(a.status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
  });
  test('挂起预演：麻痹宠 stagePvpAttack（rng 0.1）返回 blocked，applyStagedBlocked 推状态事件', () => {
    const { st, a } = pvpState();
    a.status = { kind: 'paralysis' };
    const staged = M.stagePvpAttack(st, 'A', '撞击', () => 0.1);
    assert.equal(staged.blocked, 'paralysis');
    const r = M.applyStagedBlocked(st, { ...staged, attacker: 'A' });
    assert.ok(r.events.some((e) => e.type === 'status' && e.kind === 'paralysis' && /动不了/.test(e.text)), JSON.stringify(r.events));
    assert.equal(st.turn, 'B');
    // rng 0.5 时不阻断，正常预演
    const { st: st2 } = pvpState();
    st2.sides.A.pets[0].status = { kind: 'paralysis' };
    const staged2 = M.stagePvpAttack(st2, 'A', '撞击', () => 0.5);
    assert.equal(staged2.blocked, undefined);
    assert.ok(Number.isFinite(staged2.dmg));
  });
  test('防守结算收到 ability 时吸取回复生效（一期 bug 修复的契约：路由重建须带 ability）', () => {
    const a = M.makePet({ key: 'main', name: '杰尼龟', type: '水', no: 7, defTypes: ['水'], level: 18, moves: [{ name: '水枪', type: '水', power: 40 }] });
    const b = M.makePet({ key: 'main', name: '蚊香蝌蚪', type: '水', no: 60, defTypes: ['水'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    b.hp = b.maxHp - 5;
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [a] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b] },
      },
    });
    st.turn = 'A'; st.acted = { A: 1, B: 1 };
    const staged = {
      attacker: 'A', moveName: '水枪', moveType: '水', petName: '杰尼龟', targetName: '蚊香蝌蚪',
      dmg: 0, mult: 0, critical: false, mods: [], drain: false,
      ability: [{ name: '储水', kind: 'immune', side: 'def', pet: '蚊香蝌蚪', moveType: '水', heal: 25 }],
    };
    const r = M.resolveStagedAttack(st, staged, { skipped: true }, R);
    assert.equal(r.error, undefined);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '储水'), JSON.stringify(r.events));
    assert.equal(b.hp, b.maxHp);
    // 对照：staged 不带 ability 时不回复（重建丢字段的旧 bug 表现）
    const b2 = M.makePet({ key: 'main', name: '蚊香蝌蚪', type: '水', no: 60, defTypes: ['水'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    b2.hp = b2.maxHp - 5;
    const st2 = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet({ key: 'main', name: '杰尼龟', type: '水', no: 7, defTypes: ['水'], level: 18, moves: [{ name: '水枪', type: '水', power: 40 }] })] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b2] },
      },
    });
    st2.turn = 'A'; st2.acted = { A: 1, B: 1 };
    const staged2 = { ...staged, ability: [] };
    const r2 = M.resolveStagedAttack(st2, staged2, { skipped: true }, R);
    assert.equal(r2.events.filter((e) => e.type === 'ability').length, 0);
    assert.equal(b2.hp, b2.maxHp - 5);
  });
});

describe('合作战集成（2a/2b）', () => {
  function coopState(bossNo, bossType, bossMoves, petA, petB) {
    const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petA)] };
    const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petB)] };
    return M.createCoopBattleState({ node_id: 'test-n1', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 }, sideA, sideB, 18);
  }
  const bobo = { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] };
  test('玩家麻痹阻断：A 席麻痹＋rng 0.1 → A 不出招，B 照常出招', () => {
    const st = coopState(
      74, '岩石', [['撞击', '普通', 35]],
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    st.sides.A.pets[0].status = { kind: 'paralysis' };
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.ok(r.events.some((e) => e.type === 'status' && e.side === 'A' && e.kind === 'paralysis'), JSON.stringify(r.events));
    assert.equal(r.events.filter((e) => e.type === 'attack' && e.side === 'A').length, 0);
    assert.equal(r.events.filter((e) => e.type === 'attack' && e.side === 'B').length, 1);
    assert.equal(st.round_no, 2);
  });
  test('接触触发：A 撞击打电击兽馆主（静电），rng 0.1 → A 麻痹', () => {
    const st = coopState(
      125, '电', [['电击', '电', 40]],
      // A 用卡比兽（高血量，扛得住馆主电击，麻痹留得住；免疫特性只挡中毒，不挡麻痹）
      { key: 'main', name: '卡比兽', type: '普通', no: 143, defTypes: ['普通'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '电击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
  test('回合末中毒扣血：A 席中毒，回合末扣 floor(maxHp/8)=5', () => {
    const st = coopState(
      74, '岩石', [['撞击', '普通', 35]],
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    const me = st.sides.A.pets[0];
    me.status = { kind: 'poison' };
    const hpBefore = me.hp;
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    const bossAtk = r.events.find((e) => e.type === 'attack' && e.side === 'BOSS');
    const tickEv = r.events.find((e) => e.type === 'status' && e.kind === 'poison');
    assert.ok(tickEv, JSON.stringify(r.events));
    assert.equal(me.hp, hpBefore - bossAtk.dmg - 5);
    assert.equal(st.round_no, 2);
  });
  test('换宠：吉利蛋（自然回复）中毒下场 → 状态清除＋事件', () => {
    const st = coopState(
      74, '岩石', [['撞击', '普通', 35]],
      { key: 'main', name: '吉利蛋', type: '普通', no: 113, defTypes: ['普通'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    // 备战波波
    st.sides.A.pets.push(M.makePet({ key: 'bench', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] }));
    const chansey = st.sides.A.pets[0];
    chansey.status = { kind: 'poison' };
    const r = M.resolveCoopRound(st, { A: { type: 'switch', toIdx: 1 }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    assert.equal(chansey.status, null);
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '自然回复'), JSON.stringify(r.events));
    assert.equal(st.sides.A.activeIdx, 1);
  });
});

describe('服务端与离线一致（2a/2b）', () => {
  test('stageMult/changeStage/isContactMove/tryInflictStatus/statusBlocksAction/settleStatusTick/effectiveSpeed 逐数一致', () => {
    for (const s of [-6, -1, 0, 1, 6]) assert.equal(L.stageMult(s), M.stageMult(s));
    const p1 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    const p2 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    assert.deepEqual(L.changeStage(p1, 'atk', 2), M.changeStage(p2, 'atk', 2));
    assert.deepEqual(p1.stages, p2.stages);
    assert.equal(L.isContactMove({ name: '地震', damage_class: 'physical' }), M.isContactMove({ name: '地震', damage_class: 'physical' }));
    assert.equal(L.isContactMove({ name: '撞击', damage_class: 'physical' }), M.isContactMove({ name: '撞击', damage_class: 'physical' }));
    assert.equal(L.NON_CONTACT_MOVES.size, M.NON_CONTACT_MOVES.size);
    const s1 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    const s2 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    assert.deepEqual(L.tryInflictStatus(s1, 'sleep', () => 0.9, 'B'), M.tryInflictStatus(s2, 'sleep', () => 0.9, 'B'));
    assert.deepEqual(s1.status, s2.status);
    const b1 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    const b2 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    b1.status = { kind: 'paralysis' };
    b2.status = { kind: 'paralysis' };
    assert.equal(L.statusBlocksAction(b1, () => 0.1), M.statusBlocksAction(b2, () => 0.1));
    const t1 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    const t2 = pet(16, '波波', [{ name: '撞击', type: '普通', power: 35 }]);
    t1.status = { kind: 'poison' };
    t2.status = { kind: 'poison' };
    assert.deepEqual(L.settleStatusTick(t1, R, [], 'B'), M.settleStatusTick(t2, R, [], 'B'));
    assert.equal(t1.hp, t2.hp);
    assert.equal(L.effectiveSpeed(pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }])), M.effectiveSpeed(pet(25, '皮卡丘', [{ name: '电光一闪', type: '电', power: 40 }])));
  });
  test('calcDamage 在阶段/灼伤/毅力/避雷针场景下逐数一致', () => {
    const cases = [];
    const mv = { name: '电光一闪', type: '电', power: 40, damage_class: 'physical' };
    const mvSp = { name: '十万伏特', type: '电', power: 40, damage_class: 'special' };
    const mvF = { name: '空手劈', type: '格斗', power: 40, damage_class: 'physical' };
    const a1 = atk(25, 100, 100, '电', ['电'], pikaStats);
    const d1 = def(16, ['普通', '飞行'], 100, popoStats);
    cases.push([mv, a1, d1]);
    const a2 = atk(25, 100, 100, '电', ['电'], pikaStats);
    a2.stages = { atk: 1, def: 0, spa: 0, spd: 0, spe: 0 };
    cases.push([mv, a2, def(16, ['普通', '飞行'], 100, popoStats)]);
    const a3 = atk(25, 100, 100, '电', ['电'], pikaStats);
    a3.status = { kind: 'burn' };
    cases.push([mv, a3, def(16, ['普通', '飞行'], 100, popoStats)]);
    const a4 = atk(25, 100, 100, '电', ['电'], pikaStats);
    a4.status = { kind: 'burn' };
    cases.push([mvSp, a4, def(16, ['普通', '飞行'], 100, popoStats)]);
    const a5 = atk(66, 100, 100, '普通', ['格斗'], { hp: 100, attack: 30, defense: 20, sp_attack: 20, sp_defense: 20, speed: 20 });
    a5.status = { kind: 'burn' };
    cases.push([mvF, a5, def(16, ['普通', '飞行'], 100, popoStats)]);
    for (const [move, a, d] of cases) {
      const s = M.calcDamage(move, a, d, R, OFF);
      const l = L.calcDamage(move, a, d, R, OFF);
      assert.deepEqual(l, s, `${move.name} 攻方${a.no}→守方${d.no}`);
    }
    // 避雷针免疫条目（含 stage）逐数一致
    const rhino = pet(111, '独角犀牛', [{ name: '撞击', type: '普通', power: 35 }]);
    const s = M.calcDamage(mvSp, atk(25, 100, 100, '电', ['电'], pikaStats), rhino, R, OFF);
    const l = L.calcDamage(mvSp, atk(25, 100, 100, '电', ['电'], pikaStats), pet(111, '独角犀牛', [{ name: '撞击', type: '普通', power: 35 }]), R, OFF);
    assert.deepEqual(l, s);
  });
  test('道馆一回合在威吓＋静电场景下逐数一致（事件流相同）', () => {
    const mk = (M_) => {
      const st = M_.createBattleState({
        mode: 'gym', firstSide: 'A',
        sides: {
          A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [M_.makePet({ key: 'main', name: '卡蒂狗', type: '火', no: 58, defTypes: ['火'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] })] },
          B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M_.makePet({ key: 'boss', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] })] },
        },
      });
      st.gym.friendship = 0;
      st.gym.endureUsed = false;
      return st;
    };
    const s1 = mk(M);
    const l1 = mk(L);
    const r1 = M.resolveGymRound(s1, { moveName: '撞击' }, () => 0.1);
    const r2 = L.resolveGymRound(l1, { moveName: '撞击' }, () => 0.1);
    assert.deepEqual(r2.events, r1.events);
    assert.equal(l1.sides.A.pets[0].hp, s1.sides.A.pets[0].hp);
    assert.equal(l1.sides.B.pets[0].hp, s1.sides.B.pets[0].hp);
    assert.deepEqual(l1.sides.A.pets[0].status, s1.sides.A.pets[0].status);
    assert.deepEqual(l1.sides.B.pets[0].stages, s1.sides.B.pets[0].stages);
  });
});
