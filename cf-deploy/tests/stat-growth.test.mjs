import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const M = await import(new URL('../src/index.js', import.meta.url));
const seq = (...vs) => { let i = 0; return () => vs[Math.min(i++, vs.length - 1)]; };
const half = () => 0.5;

// HP: floor(2×35×12/100)+12+10=30；其余: floor(2×[45,160,30,45,70]×12/100)+5=[15,43,12,15,21]。
const onix12 = { hp: 30, attack: 15, defense: 43, sp_attack: 12, sp_defense: 15, speed: 21 };
// HP: floor(2×44×8/100)+8+10=25；其余: floor(2×[48,65,50,64,43]×8/100)+5=[12,15,13,15,11]。
const squirtle8 = { hp: 25, attack: 12, defense: 15, sp_attack: 13, sp_defense: 15, speed: 11 };
// HP: floor(2×20×5/100)+5+10=17；其余: floor(2×[40,15,35,35,60]×5/100)+5=[9,6,8,8,11]；攻击项 2×40×5/100=4.0。
const pichu5 = { hp: 17, attack: 9, defense: 6, sp_attack: 8, sp_defense: 8, speed: 11 };
// HP: floor(2×39×5/100)+5+10=18；其余: floor(2×[52,43,60,50,65]×5/100)+5=[10,9,11,10,11]。
const charmander5 = { hp: 18, attack: 10, defense: 9, sp_attack: 11, sp_defense: 10, speed: 11 };
// HP: floor(2×35×6/100)+6+10=20；其余: floor(2×[45,160,30,45,70]×6/100)+5=[10,24,8,10,13]。
const onix6 = { hp: 20, attack: 10, defense: 24, sp_attack: 8, sp_defense: 10, speed: 13 };

describe('statsFor 官方六围公式', () => {
  test('大岩蛇 Lv.12：零个体、零努力、中性六围', () => {
    assert.deepEqual(M.statsFor(95, 12), onix12);
  });
  test('杰尼龟 Lv.8：逐项 floor 后加固定值', () => {
    assert.deepEqual(M.statsFor(7, 8), squirtle8);
  });
  test('皮丘 Lv.5：攻击 2×40×5/100=4.0 的整数边界', () => {
    assert.deepEqual(M.statsFor(172, 5), pichu5);
  });
  test('小火龙 Lv.5：零个体、零努力、中性六围', () => {
    assert.deepEqual(M.statsFor(4, 5), charmander5);
  });
  test('大岩蛇 Lv.6：低等级六围', () => {
    assert.deepEqual(M.statsFor(95, 6), onix6);
  });
  test('未知物种不编造六围', () => {
    assert.equal(M.statsFor(999, 5), null); // #999 不在已知物种表。
  });
});

describe('moveCategory 物特分类', () => {
  const cases = [
    [{ type: '水' }, 'special'], // 水属性默认特殊。
    [{ type: '地面' }, 'physical'], // 地面属性默认物理。
    [{ type: '毒' }, 'physical'], // 毒属性默认物理。
    [{ type: '妖精' }, 'special'], // 妖精属性默认特殊。
    [{ type: '电', damage_class: '物理' }, 'physical'], // 显式物理优先于电属性默认分类。
    [{ type: '草', damage_class: '变化' }, 'status'], // 显式变化优先于草属性默认分类。
    [{ type: '普通', damage_class: '变化' }, 'status'], // 普通属性也服从显式变化分类。
  ];
  for (const [move, expected] of cases) {
    test(`${move.type}/${move.damage_class ?? '默认'} → ${expected}`, () => {
      assert.equal(M.moveCategory(move), expected);
    });
  }
});

describe('lineFormNo 形态号', () => {
  const cases = [
    ['pikachu', 4, null], // Lv.4 仍为蛋，无形态号。
    ['pikachu', 5, 172], // Lv.5 孵化为皮丘 #172。
    ['pikachu', 9, 172], // Lv.9 仍为皮丘 #172。
    ['pikachu', 10, 25], // Lv.10 进化为皮卡丘 #25。
    ['pikachu', 15, 25], // Lv.15 仍为皮卡丘 #25。
    ['pikachu', 16, 26], // Lv.16 进化为雷丘 #26。
    ['charmander', 8, 4], // Lv.8 为小火龙 #4。
    ['squirtle', 8, 7], // Lv.8 为杰尼龟 #7。
    ['bulbasaur', 8, 1], // Lv.8 为妙蛙种子 #1。
  ];
  for (const [line, level, expected] of cases) {
    test(`${line} Lv.${level} → ${expected}`, () => {
      assert.equal(M.lineFormNo(line, level), expected);
    });
  }
});

describe('officialMove 与钢行', () => {
  test('铁尾为钢属性物理招式', () => {
    assert.deepEqual(M.officialMove('铁尾'), { type: '钢', damage_class: '物理' }); // 官方表中的属性与分类。
  });
  test('大地之力为地面属性特殊招式', () => {
    assert.deepEqual(M.officialMove('大地之力'), { type: '地面', damage_class: '特殊' }); // 官方表中的属性与分类。
  });
  test('影子球已收录为官方招式（幽灵/特殊）', () => {
    assert.deepEqual(M.officialMove('影子球'), { type: '幽灵', damage_class: '特殊' }); // 2026-11-05 招式表扩充后收录。
  });
  test('未收录招式返回 null，不编造', () => {
    assert.equal(M.officialMove('岩石利刃'), null); // 非官方招式名，不编造。
  });
  test('钢克岩石', () => {
    assert.equal(M.typeMultOfficial('钢', '岩石'), 2); // 钢 → 岩石：×2。
  });
  test('火抵抗钢', () => {
    assert.equal(M.typeMultOfficial('钢', '火'), 0.5); // 钢 → 火：×0.5。
  });
  test('钢打地面为中性', () => {
    assert.equal(M.typeMultOfficial('钢', '地面'), 1); // 钢 → 地面：×1。
  });
});

describe('makePet 六围与血量', () => {
  test('杰尼龟 Lv.8 使用真实六围和 HP', () => {
    const pet = M.makePet({
      key: 'main', name: '杰尼龟', type: '水', no: 7, level: 8,
      moves: [{ name: '水枪', type: '水', power: 40 }],
    });
    assert.deepEqual(pet.stats, squirtle8); // 六围按上面的 Lv.8 公式计算。
    assert.equal(pet.maxHp, 25); // floor(2×44×8/100)+8+10=25。
  });
  test('无物种号的蛋不计算参战六围', () => {
    const pet = M.makePet({
      key: 'main', name: '神秘的蛋', type: '电', no: null, level: 3,
      moves: [{ name: '电击', type: '电', power: 50 }],
    });
    assert.equal(pet.stats, null); // no=null：蛋形态不编造六围。
  });
  test('馆主大岩蛇 HP 乘以 hpMult', () => {
    const pet = M.makePet({
      key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 12, hpMult: 3.0,
      moves: [{ name: '岩石猛击', type: '岩石', power: 28 }],
    });
    assert.equal(pet.maxHp, 90); // (floor(2×35×12/100)+12+10)×3.0=30×3=90。
  });
});

describe('calcDamage 官方公式与回落', () => {
  const opts = { chart: 'official' }; // 官方分支不再读 opts.range（区间恒为官方 85–100）
  const defender = () => M.makePet({
    key: 'boss', name: '大岩蛇', type: '岩石', no: 95, level: 12,
    defTypes: M.bossDefTypes(95),
    moves: [{ name: '岩石猛击', type: '岩石', power: 28 }],
  });
  const pichu = () => M.makePet({
    key: 'main', name: '皮丘', type: '电', no: 172, level: 8,
    moves: [{ name: '电击', type: '电', power: 50 }],
  });

  test('水枪：base=5，水打岩石/地面 ×4，STAB ×1.5，伤害28', () => {
    const attacker = M.makePet({
      key: 'main', name: '杰尼龟', type: '水', no: 7, level: 8,
      moves: [{ name: '水枪', type: '水', power: 40 }],
    });
    // floor(floor(floor(2×8/5+2)×40×13/15)/50)+2=5；倍率2×2=4；STAB ×1.5（水枪水系、攻击方水系）；half 对应命中过、区间因子 0.93、非暴击。
    assert.deepEqual(
      M.calcDamage({ name: '水枪', type: '水', power: 40 }, attacker, defender(), half, opts),
      { dmg: 28, mult: 4, critical: false, ability: [] }, // 5×1.5×4×0.93=27.9→28。
    );
  });
  test('铁尾：base=2，钢打岩石/地面 ×2，伤害4', () => {
    const move = { name: '铁尾', type: '钢', damage_class: '物理', power: 31 };
    // floor(floor(floor(2×8/5+2)×31×11/43)/50)+2=2；钢倍率2×1=2；half 非暴击。
    assert.deepEqual(M.calcDamage(move, pichu(), defender(), half, opts), { dmg: 4, mult: 2, critical: false, ability: [] }); // 2×2×1=4。
  });
  test('电光一闪：普通打岩石 ×0.5，不再免疫', () => {
    const move = { name: '电光一闪', type: '普通', damage_class: '物理', power: 31 };
    // 物理 base=2；普通打岩石/地面倍率0.5×1=0.5；half 非暴击。
    assert.deepEqual(M.calcDamage(move, pichu(), defender(), half, opts), { dmg: 1, mult: 0.5, critical: false, ability: [] }); // 2×0.5×1=1。
  });
  test('电击被地面免疫，不消耗任何随机数', () => {
    const move = { name: '电击', type: '电', power: 50 };
    let rolls = 0;
    const rng = () => { rolls += 1; return 0.5; };
    assert.deepEqual(M.calcDamage(move, pichu(), defender(), rng, opts), { dmg: 0, mult: 0, critical: false, ability: [] }); // 电打岩石/地面：1×0=0。
    assert.equal(rolls, 0); // 免疫在随机倍率和暴击掷骰之前返回。
  });
  test('无 stats 回落旧线性公式，并保留暴击分支', () => {
    const move = { name: '电击', type: '电', power: 50 };
    const attacker = { level: 10, type: '电', stats: null };
    const target = { level: 10, type: '火', stats: null };
    assert.deepEqual(M.calcDamage(move, attacker, target, half), { dmg: 50, mult: 1, critical: false, ability: [] }); // 50×1.0×1×1.0=50。
    assert.deepEqual(M.calcDamage(move, attacker, target, seq(0.5, 0)), { dmg: 75, mult: 1, critical: true, ability: [] }); // 随机倍率1，第二次掷骰0暴击：50×1.5=75。
  });
});

describe('flattenSideLevel 压平重算', () => {
  test('皮丘压平到 Lv.5 后重算六围并回满 PvP 血量', () => {
    const side = {
      childId: 1, childName: '大宝', battleLevel: 12, activeIdx: 0,
      pets: [M.makePet({
        key: 'main', name: '皮丘', type: '电', no: 172, level: 12,
        moves: [{ name: '电击', type: '电', power: 50 }],
      })],
    };
    const flattened = M.flattenSideLevel(side, 5) ?? side;
    assert.equal(flattened.pets[0].level, 5); // 目标等级12→5。
    assert.deepEqual(flattened.pets[0].stats, pichu5); // statsFor(172,5)，六项算式见上。
    assert.equal(flattened.pets[0].maxHp, 24); // round(17×1.4)=24。
    assert.equal(flattened.pets[0].hp, 24); // 压平后回满：hp=maxHp=24。
  });
  test('无 stats 的宠物压平后回落 pvpMaxHp', () => {
    const side = {
      childId: 1, childName: '大宝', battleLevel: 12, activeIdx: 0,
      pets: [{
        key: 'x', name: '皮丘', type: '电', no: null, level: 12,
        maxHp: 500, hp: 500,
        moves: [{ name: '电击', type: '电', power: 50 }],
      }],
    };
    const flattened = M.flattenSideLevel(side, 5) ?? side;
    assert.equal(flattened.pets[0].maxHp, M.pvpMaxHp(5)); // 无真实六围，回落 pvpMaxHp(5)=168，而非保留500。
  });
});
