/* 玩家宠双属性防御（2026-11-06）：buildPlayerSide 主宠/备战宠带上过滤后的官方双属性 defTypes。
 * 口径：playerDefTypes(no) = bossDefTypes(no) 按 makePet 白名单（TYPES 9 属性 ∪ {超能力，毒}）过滤；
 * 过滤后为空返回 null（绝不返回 []，makePet 会抛错），由 makePet 默认 [type]；type 字段不动。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
const M = await import(new URL('../src/index.js', import.meta.url));

describe('playerDefTypes：白名单过滤', () => {
  test('全留：121 [水,超能力]、43 [草,毒]、1 [草,毒]', () => {
    assert.deepEqual(M.playerDefTypes(121), ['水', '超能力']);
    assert.deepEqual(M.playerDefTypes(43), ['草', '毒']);
    assert.deepEqual(M.playerDefTypes(1), ['草', '毒']);
  });
  test('截掉白名单外属性：122 [超能力,妖精]→[超能力]、123 [虫,飞行]→[飞行]', () => {
    assert.deepEqual(M.playerDefTypes(122), ['超能力']);
    assert.deepEqual(M.playerDefTypes(123), ['飞行']);
  });
  test('单属性不变：172 [电]、25 [电]', () => {
    assert.deepEqual(M.playerDefTypes(172), ['电']);
    assert.deepEqual(M.playerDefTypes(25), ['电']);
  });
  test('过滤后为空返回 null：35 [妖精]、10 [虫]、56 [格斗]、700 [妖精]', () => {
    assert.equal(M.playerDefTypes(35), null);
    assert.equal(M.playerDefTypes(10), null);
    assert.equal(M.playerDefTypes(56), null);
    assert.equal(M.playerDefTypes(700), null);
    assert.equal(M.playerDefTypes(null), null);
  });
  test('全量不变式：165 种 DEX_DETAILS 与全部 SPECIES，返回值恒为 null 或非空白名单数组', () => {
    const WL = new Set([...M.TYPES, '超能力', '毒']);
    for (const no of [...Object.keys(M.DEX_DETAILS), ...Object.keys(M.SPECIES)]) {
      const r = M.playerDefTypes(Number(no));
      assert.ok(r === null || (Array.isArray(r) && r.length > 0), `物种 ${no} 返回了 [] 或非法值`);
      if (r) for (const t of r) assert.ok(WL.has(t), `物种 ${no} 含白名单外属性 ${t}`);
    }
  });
  test('bossDefTypes 契约不动：121 仍为 [水,超能力]', () => {
    assert.deepEqual(M.bossDefTypes(121), ['水', '超能力']);
  });
});

describe('makePet 接 defTypes', () => {
  test('备战宠 43：defTypes [草,毒]，type 仍为草', () => {
    const pet = M.makePet({ key: 'dex:43', name: '走路草', type: '草', no: 43, defTypes: M.playerDefTypes(43), level: 10, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    assert.deepEqual(pet.defTypes, ['草', '毒']);
    assert.equal(pet.type, '草');
  });
  test('过滤为空传 null 不抛错：35 默认 [普通]', () => {
    const pet = M.makePet({ key: 'dex:35', name: '皮皮', type: '普通', no: 35, defTypes: M.playerDefTypes(35), level: 10, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    assert.deepEqual(pet.defTypes, ['普通']);
  });
});

describe('calcDamage 走 defTypes（official 分支）', () => {
  test('地震打走路草：双属性 [草,毒] 总倍率 1.0（地面克毒 ×2、被草抗 ×0.5），单属性 [草] 只有 0.5', () => {
    const atk = { type: '地面', level: 10 };
    const move = { name: '地震', type: '地面', damage_class: '物理', power: 100 };
    const rng = () => 0.5;
    const dual = M.makePet({ key: 't', name: '走路草', type: '草', no: 43, defTypes: ['草', '毒'], level: 10, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    const single = M.makePet({ key: 't', name: '走路草', type: '草', no: 43, defTypes: ['草'], level: 10, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    const rDual = M.calcDamage(move, atk, dual, rng, { chart: 'official' });
    const rSingle = M.calcDamage(move, atk, single, rng, { chart: 'official' });
    assert.equal(rDual.mult, 1);
    assert.equal(rDual.dmg, 140);
    assert.equal(rSingle.mult, 0.5);
    assert.equal(rSingle.dmg, 70);
  });
});
