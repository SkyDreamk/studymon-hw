/* 战斗特性第一期（2026-11-07）：node --test tests/abilities-phase1.test.mjs
 * 9 个特性、5 个改动点：低血量同系强化（茂盛/猛火/激流/虫之预感）、厚脂肪、飘浮、硬壳盔甲、储水/蓄电。
 * 口径：D1 默认首特性（abilities[0]）；D2 范围野外 132＋主宠线 12；乘算顺序见方案 §5.1。
 * 确定性：固定 rng () => 0.5（命中 50<100、随机因子 0.93、不暴击），critRate: 0 显式关暴击；
 * 精确伤害数均由 /tmp/probe-abilities2.mjs 实测（公式：线性 base=威力×1.4@Lv.18，官方分支 round(base×STAB×mult×0.93)）。
 * SPECIES 表缺主宠线（1–9、25、26）与传说种，纯函数宠用字面名建（特性只读编号）。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const M = await import(new URL('../src/index.js', import.meta.url));
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
// 纯函数宠（无 stats，走线性 base；defTypes 直给，不走 makePet 校验）。
const atk = (no, hp, maxHp, type, defTypes) => ({ key: 'a', name: `攻方${no}`, type, no, level: 18, maxHp, hp, defTypes, moves: [{ name: '撞击', type: '普通', power: 35 }] });
const def = (no, defTypes, hp = 100) => ({ key: 'b', name: `守方${no}`, type: '普通', no, level: 18, maxHp: 100, hp, defTypes, moves: [{ name: '撞击', type: '普通', power: 35 }] });
const dmg = (move, a, d, rng = R, opts = OFF) => M.calcDamage(move, a, d, rng, opts);
const kinds = (res) => (res.ability || []).map((e) => e.kind);
const names = (res) => (res.ability || []).map((e) => e.name);

describe('abilityOf 与范围守卫', () => {
  test('9 个一期特性共 27 种（野外 15＋主宠线 9＋CM-only 131/134/135）', () => {
    const P1 = ['茂盛', '猛火', '激流', '虫之预感', '厚脂肪', '飘浮', '硬壳盔甲', '储水', '蓄电'];
    const got = {};
    for (const [no, d] of Object.entries(M.DEX_DETAILS)) {
      const a = d.abilities && d.abilities[0] ? d.abilities[0].name : null;
      if (P1.includes(a)) got[no] = a;
    }
    assert.deepEqual(got, {
      1: '茂盛', 2: '茂盛', 3: '茂盛', 4: '猛火', 5: '猛火', 6: '猛火', 7: '激流', 8: '激流', 9: '激流',
      15: '虫之预感', 60: '储水', 61: '储水', 62: '储水', 86: '厚脂肪', 87: '厚脂肪',
      90: '硬壳盔甲', 91: '硬壳盔甲', 92: '飘浮', 93: '飘浮', 109: '飘浮', 110: '飘浮',
      123: '虫之预感', 131: '储水', 134: '储水', 135: '蓄电', 212: '虫之预感', 900: '虫之预感',
    });
  });
  test('abilityOf：首特性、空值、makePet 带 ability 字段', () => {
    assert.equal(M.abilityOf(1), '茂盛');
    assert.equal(M.abilityOf(25), '静电');
    assert.equal(M.abilityOf(143), '免疫');
    assert.equal(M.abilityOf(45), '叶绿素');
    assert.equal(M.abilityOf(null), null);
    assert.equal(M.abilityOf(9999), null);
    const p = M.makePet({ key: 'main', name: '妙蛙种子', type: '草', no: 1, defTypes: ['草', '毒'], level: 18, moves: [{ name: '藤鞭', type: '草', power: 40 }] });
    assert.equal(p.ability, '茂盛');
    const q = M.makePet({ key: 'main', name: '皮卡丘', type: '电', no: 25, defTypes: ['电'], level: 18, moves: [{ name: '电光一闪', type: '电', power: 40 }] });
    assert.equal(q.ability, '静电');
  });
  test('服务端与离线 abilityOf 对全部 165 种一致', () => {
    for (const no of Object.keys(M.DEX_DETAILS)) {
      assert.equal(L.abilityOf(Number(no)), M.abilityOf(Number(no)), `种 ${no}`);
    }
    assert.equal(L.abilityOf(null), null);
  });
  test('服务端与离线 calcDamage 在 9 个特性场景下逐数一致', () => {
    const cases = [
      [{ name: '藤鞭', type: '草', power: 40 }, atk(1, 30, 100, '草', ['草', '毒']), def(16, ['普通', '飞行'])],
      [{ name: '火花', type: '火', power: 40 }, atk(4, 30, 100, '火', ['火']), def(16, ['普通', '飞行'])],
      [{ name: '水枪', type: '水', power: 40 }, atk(7, 30, 100, '水', ['水']), def(16, ['普通', '飞行'])],
      [{ name: '虫咬', type: '虫', power: 40 }, atk(15, 30, 100, '虫', ['虫', '毒']), def(16, ['普通', '飞行'])],
      [{ name: '火花', type: '火', power: 40 }, atk(4, 100, 100, '火', ['火']), def(86, ['水', '超能力'])],
      [{ name: '地震', type: '地面', power: 100 }, atk(74, 100, 100, '岩石', ['岩石', '地面']), def(109, ['毒'])],
      [{ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(90, ['水'])],
      [{ name: '水枪', type: '水', power: 40 }, atk(7, 100, 100, '水', ['水']), def(60, ['水'])],
      [{ name: '十万伏特', type: '电', power: 40 }, atk(25, 100, 100, '电', ['电']), def(135, ['火'])],
    ];
    for (const [move, a, d] of cases) {
      const s = M.calcDamage(move, a, d, R, OFF);
      const l = L.calcDamage(move, a, d, R, OFF);
      assert.deepEqual(l, s, `${move.name} 攻方${a.no}→守方${d.no}`);
    }
  });
});

describe('低血量同系强化（茂盛/猛火/激流/虫之预感）', () => {
  test('茂盛：HP≤1/3 且草招时威力×1.5（39→59），带 lowhp 条目', () => {
    const full = dmg({ name: '藤鞭', type: '草', power: 40 }, atk(1, 100, 100, '草', ['草', '毒']), def(16, ['普通', '飞行']));
    assert.equal(full.dmg, 39);
    assert.deepEqual(full.ability, []);
    const low = dmg({ name: '藤鞭', type: '草', power: 40 }, atk(1, 30, 100, '草', ['草', '毒']), def(16, ['普通', '飞行']));
    assert.equal(low.dmg, 59);
    assert.deepEqual(low.ability, [{ name: '茂盛', kind: 'lowhp', side: 'atk', pet: '攻方1', moveType: '草' }]);
  });
  test('茂盛边界：HP 恰为 1/3 触发，HP 34/100 不触发；非同系招不触发', () => {
    const edge = dmg({ name: '藤鞭', type: '草', power: 40 }, atk(1, 33, 99, '草', ['草', '毒']), def(16, ['普通', '飞行']));
    assert.deepEqual(kinds(edge), ['lowhp']);
    const above = dmg({ name: '藤鞭', type: '草', power: 40 }, atk(1, 34, 100, '草', ['草', '毒']), def(16, ['普通', '飞行']));
    assert.deepEqual(above.ability, []);
    assert.equal(above.dmg, 39);
    const wrongType = dmg({ name: '火花', type: '火', power: 40 }, atk(1, 30, 100, '草', ['草', '毒']), def(16, ['普通', '飞行']));
    assert.deepEqual(wrongType.ability, []);
    assert.equal(wrongType.dmg, 52);
  });
  test('猛火/激流/虫之预感：低血量同系招各 117，带对应条目', () => {
    const fire = dmg({ name: '火花', type: '火', power: 40 }, atk(4, 30, 100, '火', ['火']), def(16, ['普通', '飞行']));
    assert.equal(fire.dmg, 117);
    assert.deepEqual(names(fire), ['猛火']);
    const water = dmg({ name: '水枪', type: '水', power: 40 }, atk(7, 30, 100, '水', ['水']), def(16, ['普通', '飞行']));
    assert.equal(water.dmg, 117);
    assert.deepEqual(names(water), ['激流']);
    const bug = dmg({ name: '虫咬', type: '虫', power: 40 }, atk(15, 30, 100, '虫', ['虫', '毒']), def(16, ['普通', '飞行']));
    assert.equal(bug.dmg, 117);
    assert.deepEqual(names(bug), ['虫之预感']);
  });
});

describe('厚脂肪', () => {
  test('火/冰伤害减半（火 39→20、冰 52→26），带 thickfat 条目；草招不触发', () => {
    const fire = dmg({ name: '火花', type: '火', power: 40 }, atk(4, 100, 100, '火', ['火']), def(86, ['水', '超能力']));
    assert.equal(fire.dmg, 20);
    assert.deepEqual(fire.ability, [{ name: '厚脂肪', kind: 'thickfat', side: 'def', pet: '守方86', moveType: '火' }]);
    assert.equal(fire.mult, 0.5); // mult 本身不变，只影响伤害
    const fireCtrl = dmg({ name: '火花', type: '火', power: 40 }, atk(4, 100, 100, '火', ['火']), def(79, ['水', '超能力']));
    assert.equal(fireCtrl.dmg, 39);
    assert.deepEqual(fireCtrl.ability, []);
    const ice = dmg({ name: '冰冻光束', type: '冰', power: 40 }, atk(86, 100, 100, '水', ['水']), def(86, ['水', '超能力']));
    assert.equal(ice.dmg, 26);
    assert.deepEqual(names(ice), ['厚脂肪']);
    const iceCtrl = dmg({ name: '冰冻光束', type: '冰', power: 40 }, atk(86, 100, 100, '水', ['水']), def(79, ['水', '超能力']));
    assert.equal(iceCtrl.dmg, 52);
    const grass = dmg({ name: '藤鞭', type: '草', power: 40 }, atk(1, 100, 100, '草', ['草', '毒']), def(86, ['水', '超能力']));
    assert.equal(grass.dmg, 156);
    assert.deepEqual(grass.ability, []);
  });
});

describe('飘浮', () => {
  test('地面招免疫（dmg 0、mult 0、heal 0），不消耗随机数；非地面招正常', () => {
    let n = 0;
    const counting = () => { n++; return 0.5; };
    const r = dmg({ name: '地震', type: '地面', power: 100 }, atk(74, 100, 100, '岩石', ['岩石', '地面']), def(109, ['毒']), counting);
    assert.equal(r.dmg, 0);
    assert.equal(r.mult, 0);
    assert.deepEqual(r.ability, [{ name: '飘浮', kind: 'immune', side: 'def', pet: '守方109', moveType: '地面', heal: 0 }]);
    assert.equal(n, 0);
    const normal = dmg({ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(109, ['毒']));
    assert.ok(normal.dmg > 0);
    assert.deepEqual(normal.ability, []);
  });
});

describe('硬壳盔甲', () => {
  test('rng=0 也强制不暴击；对照种暴击；攻击方带硬壳盔甲不压暴击；仍掷一次随机数', () => {
    const shell = dmg({ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(90, ['水']), () => 0, { chart: 'official' });
    assert.equal(shell.critical, false);
    assert.equal(shell.dmg, 42);
    const ctrl = dmg({ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(79, ['水', '超能力']), () => 0, { chart: 'official' });
    assert.equal(ctrl.critical, true);
    assert.equal(ctrl.dmg, 63);
    const atkSide = dmg({ name: '撞击', type: '普通', power: 35 }, atk(90, 100, 100, '水', ['水']), def(79, ['水', '超能力']), () => 0, { chart: 'official' });
    assert.equal(atkSide.critical, true);
    assert.equal(atkSide.dmg, 63);
    // 随机数消耗不变：命中 1＋随机 1＋暴击 1＝3 次（与对照种相同）。
    let n1 = 0; let n2 = 0;
    dmg({ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(90, ['水']), () => { n1++; return 0.5; }, { chart: 'official' });
    dmg({ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(79, ['水', '超能力']), () => { n2++; return 0.5; }, { chart: 'official' });
    assert.equal(n1, 3);
    assert.equal(n2, 3);
  });
});

describe('储水/蓄电', () => {
  test('对应属性招免疫＋回复最大体力 1/4（heal 25），不消耗随机数', () => {
    let n = 0;
    const counting = () => { n++; return 0.5; };
    const water = dmg({ name: '水枪', type: '水', power: 40 }, atk(7, 100, 100, '水', ['水']), def(60, ['水']), counting);
    assert.equal(water.dmg, 0);
    assert.equal(water.mult, 0);
    assert.deepEqual(water.ability, [{ name: '储水', kind: 'immune', side: 'def', pet: '守方60', moveType: '水', heal: 25 }]);
    assert.equal(n, 0);
    const elec = dmg({ name: '十万伏特', type: '电', power: 40 }, atk(25, 100, 100, '电', ['电']), def(135, ['火']));
    assert.equal(elec.dmg, 0);
    assert.deepEqual(elec.ability, [{ name: '蓄电', kind: 'immune', side: 'def', pet: '守方135', moveType: '电', heal: 25 }]);
    const wrong = dmg({ name: '撞击', type: '普通', power: 35 }, atk(1, 100, 100, '草', ['草', '毒']), def(60, ['水']));
    assert.equal(wrong.dmg, 46);
    assert.deepEqual(wrong.ability, []);
  });
  test('applyAbilityHeal：按上限回复（80/100 回 20），满血回 0', () => {
    const d = def(60, ['水'], 80);
    assert.equal(M.applyAbilityHeal(d, [{ kind: 'immune', heal: 25 }]), 20);
    assert.equal(d.hp, 100);
    const full = def(60, ['水'], 100);
    assert.equal(M.applyAbilityHeal(full, [{ kind: 'immune', heal: 25 }]), 0);
    assert.equal(full.hp, 100);
    assert.equal(M.applyAbilityHeal(def(60, ['水']), []), 0);
  });
});

describe('休眠守卫：第一期外特性不生效', () => {
  test('静电/免疫/叶绿素在第一期无任何效果条目', () => {
    // 25 静电低血量用电招：无 lowhp 条目（静电不是低血量组）。
    const s = dmg({ name: '十万伏特', type: '电', power: 40 }, atk(25, 30, 100, '电', ['电']), def(16, ['普通', '飞行']));
    assert.deepEqual(s.ability, []);
    // 143 免疫被毒招打：无 immune 条目。
    const snorlax = dmg({ name: '藤鞭', type: '草', power: 40 }, atk(1, 100, 100, '草', ['草', '毒']), def(143, ['普通']));
    assert.deepEqual(snorlax.ability, []);
    // 45 叶绿素被火招打：无 thickfat 条目（叶绿素是速度特性，第二期以后）。
    const vile = dmg({ name: '火花', type: '火', power: 40 }, atk(4, 100, 100, '火', ['火']), def(45, ['草', '毒']));
    assert.deepEqual(vile.ability, []);
  });
});

function gymState(mainDesc, bossDesc, friendship = 0) {
  const st = M.createBattleState({
    mode: 'gym', firstSide: 'A',
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [M.makePet(mainDesc)] },
      B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
    },
  });
  st.gym.friendship = friendship;
  st.gym.endureUsed = false;
  return st;
}

describe('道馆集成', () => {
  test('飘浮：小拳石地震打瓦斯弹，特性事件在攻击事件之前，馆主血量不动', () => {
    const st = gymState(
      { key: 'main', name: '小拳石', type: '岩石', no: 74, defTypes: ['岩石', '地面'], level: 18, moves: [{ name: '地震', type: '地面', power: 100 }] },
      { key: 'boss', name: '瓦斯弹', type: '普通', no: 109, defTypes: ['毒'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    const bossHp = st.sides.B.pets[0].hp;
    const r = M.resolveGymRound(st, { moveName: '地震' }, R);
    assert.equal(r.error, undefined);
    const abilityEv = r.events.find((e) => e.type === 'ability');
    assert.ok(abilityEv, JSON.stringify(r.events));
    assert.equal(abilityEv.ability, '飘浮');
    assert.match(abilityEv.text, /飘浮/);
    const atkEv = r.events.find((e) => e.type === 'attack' && e.pet === '小拳石');
    assert.equal(atkEv.mult, 0);
    assert.equal(st.sides.B.pets[0].hp, bossHp);
    assert.ok(r.events.indexOf(abilityEv) < r.events.indexOf(atkEv));
  });
  test('茂盛：低血量主宠出草招，特性事件出现且伤害提升', () => {
    const st = gymState(
      { key: 'main', name: '妙蛙种子', type: '草', no: 1, defTypes: ['草', '毒'], level: 18, moves: [{ name: '藤鞭', type: '草', power: 40 }] },
      { key: 'boss', name: '小拉达', type: '普通', no: 19, defTypes: ['普通'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
    );
    st.sides.A.pets[0].hp = Math.floor(st.sides.A.pets[0].maxHp / 3);
    const r = M.resolveGymRound(st, { moveName: '藤鞭' }, R);
    const abilityEv = r.events.find((e) => e.type === 'ability');
    assert.ok(abilityEv, JSON.stringify(r.events));
    assert.equal(abilityEv.ability, '茂盛');
    const atkEv = r.events.find((e) => e.type === 'attack' && e.pet === '妙蛙种子');
    assert.ok(atkEv.dmg > 0);
  });
});

describe('合作战集成', () => {
  function coopState(bossNo, bossType, bossMoves, petA, petB) {
    const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petA)] };
    const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petB)] };
    return M.createCoopBattleState({ node_id: 'test-n1', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 }, sideA, sideB, 18);
  }
  const bobo = { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] };
  test('馆主地震打 A 席飘浮瓦斯弹：特性事件在馆主攻击之前，A 席血量不动', () => {
    const st = coopState(
      74, '岩石', [['地震', '地面', 100]],
      { key: 'main', name: '瓦斯弹', type: '普通', no: 109, defTypes: ['毒'], level: 18, moves: [{ name: '撞击', type: '普通', power: 35 }] },
      bobo,
    );
    const aHp = st.sides.A.pets[0].hp;
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '地震', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    const abilityEv = r.events.find((e) => e.type === 'ability');
    assert.ok(abilityEv, JSON.stringify(r.events));
    assert.equal(abilityEv.ability, '飘浮');
    assert.match(abilityEv.text, /飘浮/);
    const bossEv = r.events.find((e) => e.type === 'attack' && e.side === 'BOSS');
    assert.equal(bossEv.mult, 0);
    assert.equal(bossEv.dmg, 0);
    assert.equal(st.sides.A.pets[0].hp, aHp);
    assert.ok(r.events.indexOf(abilityEv) < r.events.indexOf(bossEv));
    assert.equal(st.round_no, 2);
  });
  test('玩家水枪打馆主储水蚊香蝌蚪：特性事件＋回复 5 点体力，攻击 mult 0', () => {
    const st = coopState(
      60, '水', [['撞击', '普通', 35]],
      { key: 'main', name: '杰尼龟', type: '水', no: 7, defTypes: ['水'], level: 18, moves: [{ name: '水枪', type: '水', power: 40 }] },
      bobo,
    );
    const boss = st.sides.BOSS.pets[0];
    const maxHp = boss.maxHp;
    boss.hp = maxHp - 5;
    const expected = Math.min(5, Math.floor(maxHp / 4));
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '水枪' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    const abilityEv = r.events.find((e) => e.type === 'ability');
    assert.ok(abilityEv, JSON.stringify(r.events));
    assert.equal(abilityEv.ability, '储水');
    assert.match(abilityEv.text, new RegExp(`回复了 ${expected} 点体力`));
    assert.equal(boss.hp, maxHp);
    const atkEv = r.events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.equal(atkEv.mult, 0);
    assert.equal(atkEv.dmg, 0);
    assert.equal(st.round_no, 2);
  });
});

describe('PvP 集成', () => {
  function pvpState() {
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
    st.turn = 'A'; st.acted = { A: 1, B: 1 }; // 模拟已过首回合：双方均可出招
    return { st, a, b };
  }
  test('即时结算：水枪打储水，特性事件＋回复 5 点体力，攻击 mult 0', () => {
    const { st, b } = pvpState();
    const maxHp = b.maxHp;
    const expected = Math.min(5, Math.floor(maxHp / 4));
    const r = M.applyBattleAction(st, 'A', '水枪', R, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    assert.equal(r.error, undefined);
    const abilityEv = r.events.find((e) => e.type === 'ability');
    assert.ok(abilityEv, JSON.stringify(r.events));
    assert.equal(abilityEv.ability, '储水');
    assert.match(abilityEv.text, new RegExp(`回复了 ${expected} 点体力`));
    assert.equal(b.hp, maxHp);
    const atkEv = r.events.find((e) => e.type === 'attack');
    assert.equal(atkEv.mult, 0);
    assert.equal(atkEv.dmg, 0);
  });
  test('预演结算：staged 带 ability，防守结算后特性事件＋回复', () => {
    const { st, b } = pvpState();
    const maxHp = b.maxHp;
    const expected = Math.min(5, Math.floor(maxHp / 4));
    const staged = M.stagePvpAttack(st, 'A', '水枪', R);
    assert.equal(staged.error, undefined);
    assert.ok(Array.isArray(staged.ability));
    assert.equal(staged.ability[0].name, '储水');
    const r = M.resolveStagedAttack(st, { ...staged, attacker: 'A' }, { kind: 'block' });
    assert.equal(r.error, undefined);
    const abilityEv = r.events.find((e) => e.type === 'ability');
    assert.ok(abilityEv, JSON.stringify(r.events));
    assert.match(abilityEv.text, new RegExp(`回复了 ${expected} 点体力`));
    assert.equal(b.hp, maxHp);
  });
});
