/* 备战宠等级招式表（招式系统升级，2026-11-05）：node --test tests/learnset.test.mjs
 * 锁住：官方表 115 招（39＋76 扩充，逐条核对）；164 种 × 10 招 Lv.2–11；
 * （2026-11-14 全量 151 批：146 → 164，主宠线 1–9/25/26、45/95/125 与传说 144/145/146/150 首次进名册）
 * 招式名只用官方名；变化招只用 11 个效果招；本系 ≥6、其他属性攻击招 ≤2；
 * 技能等级按招式名共享 move_levels；威力 skillPower(学会等级, 技能等级)。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));

const EFFECT_MOVES = new Set(['撒娇', '叫声', '摇尾巴', '蹭蹭脸颊', '生长', '烟幕', '影子分身', '影子球', '缩入壳中', '寄生种子', '求雨']);

describe('官方招式表扩充', () => {
  test('MOVES_OFFICIAL 共 115 招（39＋76）', () => {
    assert.equal(Object.keys(M.MOVES_OFFICIAL).length, 115);
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
  test('每种属性本系可选 ≥6 招', () => {
    const byType = {};
    for (const [n, v] of Object.entries(M.MOVES_OFFICIAL)) (byType[v.type] = byType[v.type] || []).push(n);
    for (const no of Object.keys(M.COLLECTION_LEARNSET)) {
      const t = M.SPECIES[no].type;
      assert.ok((byType[t] || []).length >= 6, `物种 ${no} 属性 ${t} 本系可选不足 6 招`);
    }
  });
});

describe('COLLECTION_LEARNSET（164 种 × 10 招）', () => {
  test('164 种齐，无缺失无多余', () => {
    const nos = Object.keys(M.COLLECTION_LEARNSET).map(Number).sort((a, b) => a - b);
    assert.equal(nos.length, 164);
    for (const no of nos) assert.ok(M.COLLECTION_MOVES[no], `物种 ${no} 不在备战名册内`);
  });
  test('每种 10 招、等级严格 2–11、同种不重名、招式名全在官方表内', () => {
    for (const [no, moves] of Object.entries(M.COLLECTION_LEARNSET)) {
      assert.equal(moves.length, 10, `物种 ${no} 招数不为 10`);
      assert.deepEqual(moves.map((m) => m[0]), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], `物种 ${no} 等级不是 2–11`);
      const names = moves.map((m) => m[1]);
      assert.equal(new Set(names).size, 10, `物种 ${no} 有重名招式`);
      for (const n of names) assert.ok(M.MOVES_OFFICIAL[n], `物种 ${no} 招式 ${n} 不在官方表内`);
      for (const [lv, n, d] of moves) {
        assert.equal(typeof d, 'string');
        assert.ok(d.length >= 4, `物种 ${no} 招式 ${n} 描述过短`);
      }
    }
  });
  test('变化招只用 11 个效果招；本系 ≥6、其他属性攻击招 ≤2', () => {
    for (const [no, moves] of Object.entries(M.COLLECTION_LEARNSET)) {
      const t = M.SPECIES[no].type;
      let same = 0, coverage = 0;
      for (const [, n] of moves) {
        const mv = M.MOVES_OFFICIAL[n];
        if (mv.damage_class === '变化') assert.ok(EFFECT_MOVES.has(n), `物种 ${no} 变化招 ${n} 不在 11 效果招内`);
        if (mv.type === t) same++;
        else if (mv.type !== '普通' && mv.damage_class !== '变化') coverage++;
      }
      assert.ok(same >= 6, `物种 ${no} 本系招 ${same} < 6`);
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
    const fang = eff.find((m) => m.name === '火焰牙');
    assert.equal(fang.skillLevel, 1);
    assert.equal(fang.power, 25 + 6 * 4);
  });
  test('属性走官方表（火伊布的影子球是幽灵，不是火）', () => {
    const eff = M.collectionMovesFor({ move_levels: '{}' }, 136, 7);
    const ball = eff.find((m) => m.name === '影子球');
    assert.ok(ball, '火伊布 Lv.7 应已学会影子球');
    assert.equal(ball.type, '幽灵');
    assert.equal(ball.damage_class, '特殊');
  });
  test('变化招带 effectKind（叫声＝weak）', () => {
    const eff = M.collectionMovesFor({ move_levels: '{}' }, 37, 7);
    const cry = eff.find((m) => m.name === '叫声');
    assert.equal(cry.effectKind, 'weak');
    assert.ok(Number.isFinite(cry.effectMult));
  });
});
