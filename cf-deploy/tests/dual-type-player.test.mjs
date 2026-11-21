/* 玩家宠双属性防御（2026-11-06）：buildPlayerSide 主宠/备战宠带上官方双属性 defTypes。
 * 口径（2026-11-17 问题 3 OFFICIAL_MULT 补全后放开）：playerDefTypes(no) = bossDefTypes(no) 全量官方双属性
 * （按 TYPES18 过滤，仅防脏数据），不再只留 9 种＋超能力/毒；之前虫/幽灵/钢/格斗/妖精等副属性被滤掉，
 * 防御克制根本没生效（如飞天螳螂虫/飞行被当成纯飞行，火打它只算 ×1，实际应为 ×2）。
 * 返回 null 仅当宝可梦无官方属性记录（或入参非法）；绝不返回 []（makePet 会抛错），由 makePet 默认 [type]；type 字段不动。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
const M = await import(new URL('../src/index.js', import.meta.url));

describe('playerDefTypes：全量官方双属性（TYPES18）', () => {
  test('全留：121 [水,超能力]、43 [草,毒]、1 [草,毒]', () => {
    assert.deepEqual(M.playerDefTypes(121), ['水', '超能力']);
    assert.deepEqual(M.playerDefTypes(43), ['草', '毒']);
    assert.deepEqual(M.playerDefTypes(1), ['草', '毒']);
  });
  test('此前被截掉的属性现在全留：122 [超能力,妖精]、123 [虫,飞行]、81 [电,钢]', () => {
    assert.deepEqual(M.playerDefTypes(122), ['超能力', '妖精']);
    assert.deepEqual(M.playerDefTypes(123), ['虫', '飞行']);
    assert.deepEqual(M.playerDefTypes(81), ['电', '钢']);
  });
  test('单属性不变：172 [电]、25 [电]', () => {
    assert.deepEqual(M.playerDefTypes(172), ['电']);
    assert.deepEqual(M.playerDefTypes(25), ['电']);
  });
  test('此前过滤后为空的现在全留：35 [妖精]、10 [虫]、56 [格斗]、700 [妖精]；非法入参仍 null', () => {
    assert.deepEqual(M.playerDefTypes(35), ['妖精']);
    assert.deepEqual(M.playerDefTypes(10), ['虫']);
    assert.deepEqual(M.playerDefTypes(56), ['格斗']);
    assert.deepEqual(M.playerDefTypes(700), ['妖精']);
    assert.equal(M.playerDefTypes(null), null);
  });
  test('全量不变式：165 种 DEX_DETAILS 与全部 SPECIES，返回值恒为 null 或非空 TYPES18 数组', () => {
    const WL = new Set(M.TYPES18);
    for (const no of [...Object.keys(M.DEX_DETAILS), ...Object.keys(M.SPECIES)]) {
      const r = M.playerDefTypes(Number(no));
      assert.ok(r === null || (Array.isArray(r) && r.length > 0), `物种 ${no} 返回了 [] 或非法值`);
      if (r) for (const t of r) assert.ok(WL.has(t), `物种 ${no} 含 TYPES18 外属性 ${t}`);
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
  test('35 皮皮现在带 [妖精]；defTypes 传 null 默认 [type]', () => {
    const pet = M.makePet({ key: 'dex:35', name: '皮皮', type: '普通', no: 35, defTypes: M.playerDefTypes(35), level: 10, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    assert.deepEqual(pet.defTypes, ['妖精']);
    const def = M.makePet({ key: 'dex:35', name: '皮皮', type: '普通', no: 35, defTypes: null, level: 10, moves: [{ name: '撞击', type: '普通', power: 35 }] });
    assert.deepEqual(def.defTypes, ['普通']);
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
    assert.equal(rDual.dmg, 139); // 无 stats 回落 base=100：floor(100×0.93)=93 → floor(93×1.5 STAB)=139 → ×1 = 139（旧单次 round 得 140）
    assert.equal(rSingle.mult, 0.5);
    assert.equal(rSingle.dmg, 69); // floor(139×0.5)=69（旧 round 得 70）
  });
});
