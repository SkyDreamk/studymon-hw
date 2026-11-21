/* 备战宠等级招式表（招式系统升级，2026-11-05）：node --test tests/learnset.test.mjs
 * 2026-11-17 升级＋学习器改表（用户定）：每招均可由升级学会（learnable_moves）或招式学习器
 * （machine_moves）学到，蛋招式不进主表；数据集 pokemon-dataset-zh（Gen 9 朱/紫）。
 * 官方表 115 → 235 招（＋107 扩充＋变身特例 1 招＋8 关馆主 10 招＋方案 A 补冰冻之风/暗影爪 2 招）；164 种仍齐；77 种因可学招式不足填不满 10 招
 * （SHORT_COUNTS 锁死每种招数）；51 种本系招不足 6（SHORT_STAB 锁死每种本系数，按官方双属性计）；
 * 2026-11-17 设计定稿 8.md 热修：#43 走路草补满 10 招（污泥炸弹＋月亮之力），SHORT_COUNTS 43 由 9→10（已移除）。
 * 其余 113 种本系 ≥6。其他属性攻击招 ≤2、变化招只用 12 效果招、同种不重名、等级槽 2–11 不变。
 * 百变怪 132 仅 1 招变身（特例进 12 效果招；无学习器招）。
 * 2026-11-17 补：18 种放宽换角色填补本系到 6（阿柏蛇系、尼多系、毛球、末入蛾、猴怪、凯西系、
 * 腕力、催眠貘系、快拳郎、双弹瓦斯、多边兽）；57 种游戏单属性错标已修（方案 A：SPECIES.type 扩到 18 种，
 * 本系按官方双属性计；#212 巨钳螳螂重建为本系 8 招、覆盖 0；冰/幽灵池各补 1 招到 6 招）。
 * 招式名只用官方名；技能等级按招式名共享 move_levels；威力 skillPower(学会等级, 技能等级)。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));

const EFFECT_MOVES = new Set(['撒娇', '叫声', '摇尾巴', '蹭蹭脸颊', '生长', '烟幕', '影子分身', '影子球', '缩入壳中', '寄生种子', '求雨', '变身']); // 2026-11-17 补：变身特例（仅 #132 百变怪）

// 2026-11-17：可学招式不足 10 招的物种（种号 → 招数）。其余 87 种为 10 招。
// 2026-11-17 设计定稿 8.md 热修：#43 走路草已补满 10 招，从本表移除。
// 132 百变怪为 1（变身特例进 12 效果招；无学习器招）。
const SHORT_COUNTS = { 10: 2, 11: 1, 12: 7, 13: 3, 14: 2, 15: 7, 19: 9, 20: 9, 23: 9, 24: 9, 27: 9, 32: 9, 33: 9, 34: 9, 35: 9, 39: 9, 40: 9, 41: 8, 42: 8, 46: 7, 47: 8, 48: 8, 49: 8, 56: 9, 57: 9, 60: 8, 61: 8, 62: 9, 63: 9, 64: 9, 65: 9, 66: 9, 67: 9, 68: 9, 69: 8, 70: 9, 71: 9, 72: 8, 73: 8, 74: 9, 75: 9, 76: 9, 79: 9, 83: 8, 88: 8, 92: 5, 93: 5, 94: 8, 95: 9, 96: 9, 97: 9, 106: 9, 107: 9, 108: 8, 109: 9, 110: 9, 113: 9, 116: 9, 118: 9, 120: 8, 121: 8, 122: 8, 124: 8, 127: 8, 128: 8, 129: 1, 130: 4, 132: 1, 137: 7, 138: 9, 140: 8, 141: 9, 142: 7, 150: 9, 208: 8, 466: 9, 471: 6 };

// 2026-11-17 方案 A：本系招不足 6 的物种（种号 → 本系招数，按官方双属性计）。其余 113 种本系 ≥6。
// 多为可学本系招本就不足 6（如鬼斯系、绿毛虫系、鲤鱼王系）或旧单属性错标下本系招被普通攻击顶掉
// （如凯西系、腕力系、催眠貘系：旧 type 为普通，普通攻击曾被计为本系；改回官方主属性后按双属性重算）。
// #212 巨钳螳螂已重建（本系 8 招），#138/#140 因水系招计入本系而出表。
const SHORT_STAB = { 10: 1, 11: 0, 12: 4, 13: 1, 14: 1, 15: 2, 23: 1, 24: 1, 29: 1, 30: 2, 32: 1, 33: 2, 35: 1, 36: 1, 41: 5, 42: 5, 46: 5, 48: 1, 49: 1, 56: 1, 57: 2, 63: 1, 64: 2, 65: 2, 66: 2, 67: 2, 68: 2, 88: 1, 89: 1, 92: 2, 93: 2, 94: 2, 96: 2, 97: 2, 106: 2, 107: 2, 109: 2, 110: 1, 122: 1, 124: 0, 127: 0, 129: 0, 130: 2, 132: 1, 141: 5, 142: 3, 150: 2, 151: 1, 196: 2, 197: 2, 471: 2 };

describe('官方招式表扩充', () => {
  test('MOVES_OFFICIAL 共 235 招（115＋107＋变身特例 1 招＋8 关馆主 10 招＋方案 A 补 2 招）', () => {
    assert.equal(Object.keys(M.MOVES_OFFICIAL).length, 235);
  });
  test('岩石利刃不是官方招式名，不在表内；力量宝石在表内', () => {
    assert.equal(M.MOVES_OFFICIAL['岩石利刃'], undefined);
    assert.deepEqual(M.MOVES_OFFICIAL['力量宝石'], { type: '岩石', damage_class: '特殊', accuracy: 100 });
  });
  test('泥巴射击命中 95、热风命中 90（官方值）', () => {
    assert.equal(M.officialAccuracy('泥巴射击'), 95);
    assert.equal(M.officialAccuracy('热风'), 90);
  });
  test('电光是官方招式（Spark，电/物理/100）', () => {
    assert.deepEqual(M.MOVES_OFFICIAL['电光'], { type: '电', damage_class: '物理', accuracy: 100 });
  });
  test('妖精教学池 6 招齐全', () => {
    for (const n of ['魔法闪耀', '月亮之力', '嬉闹', '妖精之风', '吸取之吻', '魅惑之声']) {
      assert.equal(M.MOVES_OFFICIAL[n].type, '妖精', n);
    }
  });
  test('2026-11-17 方案 A：冰/幽灵池各补 1 招到 6 招（冰冻之风、暗影爪，数据集 move_list.json）', () => {
    assert.deepEqual(M.MOVES_OFFICIAL['冰冻之风'], { type: '冰', damage_class: '特殊', accuracy: 95, power: 55 });
    assert.deepEqual(M.MOVES_OFFICIAL['暗影爪'], { type: '幽灵', damage_class: '物理', accuracy: 100, power: 70 });
    const byType = {};
    for (const v of Object.values(M.MOVES_OFFICIAL)) (byType[v.type] = byType[v.type] || []).push(v);
    assert.equal(byType['冰'].length, 6);
    assert.equal(byType['幽灵'].length, 6);
  });
  test('每种属性本系可选 ≥6 招', () => {
    const byType = {};
    for (const [n, v] of Object.entries(M.MOVES_OFFICIAL)) (byType[v.type] = byType[v.type] || []).push(n);
    for (const no of Object.keys(M.COLLECTION_LEARNSET)) {
      const t = M.SPECIES[no].type;
      assert.ok((byType[t] || []).length >= 6, `物种 ${no} 属性 ${t} 本系可选不足 6 招`);
    }
  });
  test('2026-11-17 扩充招式有官方属性/物特/命中（抽查）', () => {
    assert.deepEqual(M.MOVES_OFFICIAL['浊雾'], { type: '毒', damage_class: '特殊', accuracy: 70, power: 30 });
    assert.equal(M.MOVES_OFFICIAL['烈火深渊'].type, '火');
    assert.equal(M.MOVES_OFFICIAL['烈火深渊'].damage_class, '特殊');
    assert.equal(M.MOVES_OFFICIAL['太晶爆发'].type, '普通');
    assert.equal(M.officialAccuracy('硬撑'), 100);
  });
  test('2026-11-17 8 关馆主 10 招有官方属性/物特/命中/威力（数据集 move_list.json；“—”命中按必中记 100）', () => {
    assert.deepEqual(M.MOVES_OFFICIAL['污泥攻击'], { type: '毒', damage_class: '特殊', accuracy: 100, power: 65 });
    assert.deepEqual(M.MOVES_OFFICIAL['清除之烟'], { type: '毒', damage_class: '特殊', accuracy: 100, power: 50 });
    assert.deepEqual(M.MOVES_OFFICIAL['恶意追击'], { type: '恶', damage_class: '物理', accuracy: 100, power: 60 });
    assert.deepEqual(M.MOVES_OFFICIAL['精神冲击'], { type: '超能力', damage_class: '特殊', accuracy: 100, power: 80 });
    assert.deepEqual(M.MOVES_OFFICIAL['虫鸣'], { type: '虫', damage_class: '特殊', accuracy: 100, power: 90 });
    assert.deepEqual(M.MOVES_OFFICIAL['修长之角'], { type: '钢', damage_class: '物理', accuracy: 100, power: 70 });
    assert.deepEqual(M.MOVES_OFFICIAL['暗袭要害'], { type: '恶', damage_class: '物理', accuracy: 100, power: 70 });
    assert.deepEqual(M.MOVES_OFFICIAL['毒击'], { type: '毒', damage_class: '物理', accuracy: 100, power: 80 });
    assert.deepEqual(M.MOVES_OFFICIAL['咬碎'], { type: '恶', damage_class: '物理', accuracy: 100, power: 80 });
    assert.deepEqual(M.MOVES_OFFICIAL['电击波'], { type: '电', damage_class: '特殊', accuracy: 100, power: 60 });
  });
});

describe('COLLECTION_LEARNSET（164 种，Lv.2–11）', () => {
  test('164 种齐，无缺失无多余', () => {
    const nos = Object.keys(M.COLLECTION_LEARNSET).map(Number).sort((a, b) => a - b);
    assert.equal(nos.length, 164);
    for (const no of nos) assert.ok(M.COLLECTION_MOVES[no], `物种 ${no} 不在备战名册内`);
  });
  test('每种招数与 SHORT_COUNTS 一致（满 10 招或短表）、等级为 2–11 的严格递增子集、同种不重名、招式名全在官方表内', () => {
    for (const [no, moves] of Object.entries(M.COLLECTION_LEARNSET)) {
      const expect = SHORT_COUNTS[no] ?? 10;
      assert.equal(moves.length, expect, `物种 ${no} 招数不为 ${expect}`);
      const levels = moves.map((m) => m[0]);
      assert.deepEqual(levels, [...levels].sort((a, b) => a - b), `物种 ${no} 等级不递增`);
      assert.ok(levels.every((lv) => lv >= 2 && lv <= 11), `物种 ${no} 等级超出 2–11`);
      assert.equal(new Set(levels).size, levels.length, `物种 ${no} 等级重复`);
      if (expect === 10) assert.deepEqual(levels, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], `物种 ${no} 等级不是 2–11`);
      const names = moves.map((m) => m[1]);
      assert.equal(new Set(names).size, names.length, `物种 ${no} 有重名招式`);
      for (const n of names) assert.ok(M.MOVES_OFFICIAL[n], `物种 ${no} 招式 ${n} 不在官方表内`);
      for (const [lv, n, d] of moves) {
        assert.equal(typeof d, 'string');
        assert.ok(d.length >= 4, `物种 ${no} 招式 ${n} 描述过短`);
      }
    }
  });
  test('变化招只用 12 个效果招；本系 ≥6（SHORT_STAB 种按锁死数）、其他属性攻击招 ≤2', () => {
    for (const [no, moves] of Object.entries(M.COLLECTION_LEARNSET)) {
      // 2026-11-17 方案 A：本系按官方双属性计（与战斗 STAB 同口径，见 calcDamage/defTypes）；
      // 单属性计会把副属性本系招误算为覆盖（如波波的飞行招、尼多后的地面招），产生假违规。
      const types = (M.DEX_DETAILS[no] || {}).types || [M.SPECIES[no].type];
      let same = 0, coverage = 0;
      for (const [, n] of moves) {
        const mv = M.MOVES_OFFICIAL[n];
        if (mv.damage_class === '变化') assert.ok(EFFECT_MOVES.has(n), `物种 ${no} 变化招 ${n} 不在 12 效果招内`);
        if (types.includes(mv.type)) same++;
        else if (mv.type !== '普通' && mv.damage_class !== '变化') coverage++;
      }
      if (SHORT_STAB[no] !== undefined) assert.equal(same, SHORT_STAB[no], `物种 ${no} 本系招 ${same} ≠ 锁死数 ${SHORT_STAB[no]}`);
      else assert.ok(same >= 6, `物种 ${no} 本系招 ${same} < 6`);
      assert.ok(coverage <= 2, `物种 ${no} 其他属性攻击招 ${coverage} > 2`);
    }
  });
  test('COLLECTION_MOVES 保留作名册（每种仍 2 招，不用于战斗）', () => {
    assert.equal(Object.keys(M.COLLECTION_MOVES).length, 164); // 全量 151 批后名册 164 种（招式表亦 164 种）
    assert.deepEqual(M.COLLECTION_MOVES[37], [['火焰小尾', 44], ['火花飞舞', 54]]);
  });
});

describe('learnedCollectionMoves / collectionMovesFor', () => {
  test('Lv.1 无招（回落撞击由调用方处理）', () => {
    assert.deepEqual(M.learnedCollectionMoves(37, 1), []);
    assert.deepEqual(M.collectionMovesFor({ move_levels: '{}' }, 37, 1), []);
  });
  test('六尾 Lv.7 学会 6 招（Lv.2–7）', () => {
    const got = M.learnedCollectionMoves(37, 7);
    assert.equal(got.length, 6);
    assert.deepEqual(got.map((m) => m[0]), [2, 3, 4, 5, 6, 7]);
  });
  test('技能等级按招式名共享 move_levels，威力＝25＋6×学会等级＋6×(技能等级-1)', () => {
    const child = { move_levels: JSON.stringify({ '火花': 3 }) };
    const eff = M.collectionMovesFor(child, 37, 7);
    const spark = eff.find((m) => m.name === '火花');
    assert.equal(spark.skillLevel, 3);
    assert.equal(spark.power, 25 + 6 * 2 + 6 * (3 - 1));
    // 2026-11-17：六尾 Lv.4 招式由火焰牙改为烈火深渊（火焰牙 Gen 9 六尾学不会）
    const fang = eff.find((m) => m.name === '烈火深渊');
    assert.equal(fang.skillLevel, 1);
    assert.equal(fang.power, 25 + 6 * 4);
  });
  test('属性走官方表（火伊布的浊雾是毒，不是火）', () => {
    // 2026-11-17：火伊布 Lv.7 招式由影子球改为浊雾（影子球 Gen 9 火伊布学不会）
    const eff = M.collectionMovesFor({ move_levels: '{}' }, 136, 7);
    const ball = eff.find((m) => m.name === '浊雾');
    assert.ok(ball, '火伊布 Lv.7 应已学会浊雾');
    assert.equal(ball.type, '毒');
    assert.equal(ball.damage_class, '特殊');
  });
  test('变化招带 effectKind（叫声＝weak）', () => {
    // 2026-11-17：六尾的叫声改为撒娇（叫声 Gen 9 六尾学不会），改用妙蛙种子 Lv.3 的叫声
    const eff = M.collectionMovesFor({ move_levels: '{}' }, 1, 7);
    const cry = eff.find((m) => m.name === '叫声');
    assert.equal(cry.effectKind, 'weak');
    assert.ok(Number.isFinite(cry.effectMult));
  });
});
