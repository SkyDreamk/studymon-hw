/* 2026-11-17 方案 A：SPECIES.type 由 9 种集扩到官方 18 种主属性。
 * 覆盖：64 种改回 DEX_DETAILS 主属性（43 种错标＋21 种取了副属性）、14 种核实无误不动、
 * makePet 校验扩到 TYPES18、matchupsForType 对此前为空的 9 种返回真实克制、#212 重建、前端 TYPE_EN 18 种齐。
 * 期望值来源：data/type-chart.json 官方 18×18 矩阵（matchups 部分）与 DEX_DETAILS 主属性（SPECIES 部分）。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));

// 64 种：种号 → 官方主属性（DEX_DETAILS types[0]）。43 种错标（虫 9/毒 10/妖精 2/格斗 7/超能力 9/幽灵 3/冰 2/恶 1
// ＋超能力系 #150/#151/#196）＋21 种取了副属性（飞行/地面/草/水/岩石系取了第二属性）。
const FIXED_64 = {
  10: '虫', 11: '虫', 12: '虫', 13: '虫', 14: '虫', 15: '虫', 46: '虫', 47: '虫', 48: '虫', 49: '虫', 123: '虫', 127: '虫', 212: '虫', 900: '虫',
  23: '毒', 24: '毒', 29: '毒', 30: '毒', 31: '毒', 32: '毒', 33: '毒', 34: '毒', 41: '毒', 42: '毒', 88: '毒', 89: '毒', 109: '毒', 110: '毒',
  35: '妖精', 36: '妖精',
  56: '格斗', 57: '格斗', 66: '格斗', 67: '格斗', 68: '格斗', 106: '格斗', 107: '格斗',
  63: '超能力', 64: '超能力', 65: '超能力', 96: '超能力', 97: '超能力', 122: '超能力', 150: '超能力', 151: '超能力', 196: '超能力',
  92: '幽灵', 93: '幽灵', 94: '幽灵',
  124: '冰', 144: '冰', 471: '冰',
  197: '恶',
  16: '普通', 17: '普通', 18: '普通', 21: '普通', 22: '普通', 83: '普通', 84: '普通', 85: '普通',
  208: '钢', 130: '水', 142: '岩石',
};

// 14 种核实无误、未动的普通系（审计曾误列为错标：地区形态或把“一般”当成与“普通”不同）。
const UNTOUCHED_14 = { 19: '普通', 20: '普通', 39: '普通', 40: '普通', 52: '普通', 53: '普通', 108: '普通', 113: '普通', 115: '普通', 128: '普通', 132: '普通', 133: '普通', 137: '普通', 143: '普通' };

describe('SPECIES.type 扩到 18 种（方案 A）', () => {
  test('64 种改回官方主属性（与 DEX_DETAILS 首元素一致）', () => {
    assert.equal(Object.keys(FIXED_64).length, 64);
    for (const [no, want] of Object.entries(FIXED_64)) {
      assert.equal(M.SPECIES[no].type, want, `#${no} ${M.SPECIES[no].name}`);
      assert.equal(M.DEX_DETAILS[no].types[0], want, `#${no} DEX 主属性`);
    }
  });

  test('14 种核实无误未动（仍为普通）', () => {
    for (const [no, want] of Object.entries(UNTOUCHED_14)) {
      assert.equal(M.SPECIES[no].type, want, `#${no} ${M.SPECIES[no].name}`);
    }
  });

  test('164 种 SPECIES.type 全在 TYPES18 内、且全等于 DEX_DETAILS 主属性', () => {
    for (const [no, sp] of Object.entries(M.SPECIES)) {
      assert.ok(M.TYPES18.includes(sp.type), `#${no} type ${sp.type} 不在 18 种内`);
      assert.equal(sp.type, M.DEX_DETAILS[no].types[0], `#${no} 与 DEX 主属性不一致`);
    }
    assert.equal(Object.keys(M.SPECIES).length, 164);
  });

  test('makePet 接受全部 18 种单属性（此前 9 种外会抛 PET_DATA_INVALID）', () => {
    for (const t of M.TYPES18) {
      assert.doesNotThrow(
        () => M.makePet({ key: 't', name: '测', type: t, level: 5, moves: [{ name: '撞击', type: '普通', power: 35 }] }),
        `type ${t} 应合法`,
      );
    }
    assert.throws(
      () => M.makePet({ key: 't', name: '测', type: '暗影', level: 5, moves: [{ name: '撞击', type: '普通', power: 35 }] }),
      /PET_DATA_INVALID/,
    );
  });

  test('此前返回空的 9 种现返回真实克制（冰/超能力/幽灵/恶/钢/虫/毒/格斗/妖精）', () => {
    assert.deepEqual(M.matchupsForType('冰'), { strong: ['草', '地面', '飞行', '龙'], weak: ['火', '格斗', '岩石', '钢'], resist: ['冰'], immune: [] });
    assert.deepEqual(M.matchupsForType('超能力'), { strong: ['格斗', '毒'], weak: ['虫', '幽灵', '恶'], resist: ['格斗', '超能力'], immune: [] });
    assert.deepEqual(M.matchupsForType('幽灵'), { strong: ['超能力', '幽灵'], weak: ['幽灵', '恶'], resist: ['毒', '虫'], immune: ['普通', '格斗'] });
    assert.deepEqual(M.matchupsForType('恶'), { strong: ['超能力', '幽灵'], weak: ['格斗', '虫', '妖精'], resist: ['幽灵', '恶'], immune: ['超能力'] });
    assert.deepEqual(M.matchupsForType('钢').immune, ['毒']);
    assert.ok(M.matchupsForType('虫').strong.includes('超能力'));
    assert.ok(M.matchupsForType('毒').strong.includes('妖精'));
    assert.ok(M.matchupsForType('格斗').strong.includes('钢'));
    assert.ok(M.matchupsForType('妖精').strong.includes('龙'));
    assert.deepEqual(M.matchupsForType('普通'), { strong: [], weak: ['格斗'], resist: [], immune: ['幽灵'] });
  });

  test('#212 巨钳螳螂重建：本系 8 招（虫 5＋钢 3）、覆盖 0', () => {
    const ls = M.COLLECTION_LEARNSET[212];
    assert.equal(ls.length, 10);
    assert.deepEqual(ls.map((m) => m[0]), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const types = M.DEX_DETAILS[212].types;
    let same = 0, coverage = 0;
    for (const [, n] of ls) {
      const mv = M.MOVES_OFFICIAL[n];
      if (types.includes(mv.type)) same++;
      else if (mv.type !== '普通' && mv.damage_class !== '变化') coverage++;
    }
    assert.equal(same, 8);
    assert.equal(coverage, 0);
  });

  test('countersForPet 按官方双属性取并集（单属性种与旧口径一致）', () => {
    assert.deepEqual(M.countersForPet(16), [4]); // 波波普通/飞行：飞行克 S4 草/毒；单属性计（普通）为空
    assert.deepEqual(M.countersForPet(50), [1, 3, 5, 7, 8]); // 地鼠纯地面，与 countersForType 一致
    assert.deepEqual(M.countersForPet(111), [1, 3, 5, 7, 8]); // 独角犀牛地面/岩石：并集与地面单计相同
    assert.deepEqual(M.countersForPet(130), [1, 4, 7, 8]); // 暴鲤龙水/飞行：水 [1,7,8] ∪ 飞行 [4]
    assert.deepEqual(M.countersForPet(123), [2, 4, 6]); // 飞天螳螂虫/飞行：虫 [2,6] ∪ 飞行 [4]
    assert.deepEqual(M.countersForPet(212), [1, 2, 6, 8]); // 巨钳螳螂虫/钢：虫 [2,6] ∪ 钢 [1,8]
    assert.deepEqual(M.countersForPet(208), [1, 3, 5, 7, 8]); // 大钢蛇钢/地面：钢 [1,8] ∪ 地面 [1,3,5,7,8]
    assert.deepEqual(M.countersForPet(999), []);
  });

  test('前端 TYPE_EN 含全部 18 种属性映射（属性 chip 有图可取）', () => {
    const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
    for (const [zh, en] of [
      ['普通', 'normal'], ['火', 'fire'], ['水', 'water'], ['电', 'electric'], ['草', 'grass'],
      ['冰', 'ice'], ['格斗', 'fighting'], ['毒', 'poison'], ['地面', 'ground'], ['飞行', 'flying'],
      ['超能力', 'psychic'], ['虫', 'bug'], ['岩石', 'rock'], ['幽灵', 'ghost'], ['龙', 'dragon'],
      ['恶', 'dark'], ['钢', 'steel'], ['妖精', 'fairy'],
    ]) {
      assert.ok(appSrc.includes(`'${zh}': '${en}'`), zh);
    }
  });
});
