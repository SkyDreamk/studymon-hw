// 分叉口径：经典表供 PvP 答题对战；官方表供 PvE，包含抗性与免疫。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));
const official = JSON.parse(
  readFileSync(new URL('../data/type-chart.json', import.meta.url), 'utf8'),
);

const TYPES = ['电', '水', '火', '草', '地面', '岩石', '飞行', '龙', '普通'];
const EXPECTED_ROWS = {
  电:   [0.5, 2,   1,   0.5, 0,   1,   2,   0.5, 1],
  水:   [1,   0.5, 2,   0.5, 2,   2,   1,   0.5, 1],
  火:   [1,   0.5, 0.5, 2,   1,   0.5, 1,   0.5, 1],
  草:   [1,   2,   0.5, 0.5, 2,   2,   0.5, 0.5, 1],
  地面: [2,   1,   2,   0.5, 1,   2,   0,   1,   1],
  岩石: [1,   1,   2,   1,   0.5, 1,   2,   1,   1],
  飞行: [0.5, 1,   1,   2,   1,   0.5, 1,   1,   1],
  龙:   [1,   1,   1,   1,   1,   1,   1,   2,   1],
  普通: [1,   1,   1,   1,   1,   0.5, 1,   1,   1],
};
const FAIRY_ROW = { 火: 0.5, 格斗: 2, 毒: 0.5, 龙: 2, 恶: 2, 钢: 0.5 };
const fixedRng = () => 0.5;
const damageOpts = { range: [1, 1] };

describe('官方 PvE 属性表', () => {
  test('OFFICIAL_MULT 的 9×9 子矩阵逐格符合已决口径', () => {
    for (const atk of TYPES) {
      assert.ok(Object.hasOwn(M.OFFICIAL_MULT, atk), `缺少攻击行：${atk}`);
      for (const [index, def] of TYPES.entries()) {
        const expected = EXPECTED_ROWS[atk][index];
        assert.equal(M.OFFICIAL_MULT[atk][def] ?? 1, expected, `${atk}→${def}`);
        assert.equal(M.typeMultOfficial(atk, def), expected, `${atk}→${def} 查表`);
      }
    }
  });

  test('妖精攻击行已补全（2026-11-17 OFFICIAL_MULT 18 属性）：火 0.5、格斗/龙/恶 2、毒/钢 0.5；妖精作防御属性时龙 0、恶/虫/钢 0.5', () => {
    assert.deepEqual(M.OFFICIAL_MULT.妖精, FAIRY_ROW);
    for (const def of TYPES) {
      const expected = FAIRY_ROW[def] ?? 1;
      assert.equal(M.OFFICIAL_MULT.妖精[def] ?? 1, expected, `妖精→${def}`);
      assert.equal(M.typeMultOfficial('妖精', def), expected, `妖精→${def} 查表`);
    }
    assert.equal(M.typeMultOfficial('龙', '妖精'), 0);
    assert.equal(M.typeMultOfficial('恶', '妖精'), 0.5);
    assert.equal(M.typeMultOfficial('虫', '妖精'), 0.5);
    assert.equal(M.typeMultOfficial('钢', '妖精'), 2);
  });

  test('硬编码表与 data/type-chart.json 官方矩阵逐格一致', () => {
    for (const atk of [...TYPES, '妖精']) {
      for (const def of TYPES) {
        assert.equal(
          M.OFFICIAL_MULT[atk][def] ?? 1,
          official.matrix[atk][def],
          `官方矩阵：${atk}→${def}`,
        );
      }
    }
  });

  test('typeMultOfficial 包含新增弱点、抗性、免疫与未知属性缺省', () => {
    const cases = [
      ['电', '飞行', 2],
      ['草', '地面', 2],
      ['电', '地面', 0],
      ['地面', '飞行', 0],
      ['火', '水', 0.5],
      ['普通', '岩石', 0.5],
      ['妖精', '龙', 2],
      ['妖精', '火', 0.5],
      ['妖精', '水', 1],
      ['龙', '龙', 2],
      ['普通', '电', 1],
      ['冰', '水', 0.5],
      ['电', '妖精', 1],
    ];
    for (const [atk, def, expected] of cases) {
      assert.equal(M.typeMultOfficial(atk, def), expected, `${atk}→${def}`);
    }
  });

  test('经典表保留与官方表不同的三个对子', () => {
    assert.equal(M.typeMult('普通', '岩石'), 1);
    assert.equal(M.typeMult('电', '飞行'), 1);
    assert.equal(M.typeMult('草', '地面'), 1);
  });
});

describe('calcDamage 的 chart 分叉', () => {
  const fire = { type: '火', power: 60 };
  const electric = { type: '电', power: 60 };
  const normal = { type: '普通', power: 60 };
  const officialOpts = { ...damageOpts, chart: 'official' };

  test('官方火打水伤害减半且享 STAB：base 60，分步取整 floor(60×0.93)=55 → floor(55×1.5)=82 → floor(82×0.5)=41', () => {
    const classic = M.calcDamage(fire, { level: 10, type: '火', stats: null }, { level: 10, type: '水', stats: null }, fixedRng, damageOpts);
    const resisted = M.calcDamage(fire, { level: 10, type: '火', stats: null }, { level: 10, type: '水', stats: null }, fixedRng, officialOpts);
    assert.equal(classic.mult, 1);
    assert.equal(classic.critical, false);
    assert.equal(resisted.mult, 0.5);
    assert.equal(resisted.critical, false);
    assert.equal(resisted.dmg, 41); // base 60（无 stats 回落）；旧单次 round(60×1.5×0.5×0.93)=round(41.85)=42，App.md 分步取整为 41。officialOpts 的 range [1,1] 在官方分支已不再生效。
  });

  test('官方电打地面免疫，伤害为零且不掷暴击', () => {
    let rolls = 0;
    const hit = M.calcDamage(electric, { level: 10, type: '电', stats: null }, { level: 10, type: '地面', stats: null }, () => {
      rolls += 1;
      return 0.5;
    }, officialOpts);
    assert.deepEqual(hit, { dmg: 0, mult: 0, critical: false, ability: [] });
    assert.equal(rolls, 0);
  });

  test('官方电打水为 ×2 且固定 rng 不触发暴击', () => {
    const hit = M.calcDamage(electric, { level: 10, type: '电', stats: null }, { level: 10, type: '水', stats: null }, fixedRng, officialOpts);
    assert.equal(hit.mult, 2);
    assert.equal(hit.critical, false);
  });

  test('缺省 chart 保持经典口径，显式 classic 与缺省等价', () => {
    for (const [move, def] of [[fire, '水'], [normal, '岩石']]) {
      const implicit = M.calcDamage(move, { level: 10, type: move.type, stats: null }, { level: 10, type: def, stats: null }, fixedRng, damageOpts);
      const explicit = M.calcDamage(move, { level: 10, type: move.type, stats: null }, { level: 10, type: def, stats: null }, fixedRng, {
        ...damageOpts,
        chart: 'classic',
      });
      assert.equal(implicit.mult, 1);
      assert.equal(implicit.critical, false);
      assert.deepEqual(explicit, implicit);
    }
  });
});

describe('官方属性展示与道馆克制', () => {
  // 2026-11-17 方案 A：18 种全量，期望值由 data/type-chart.json 官方 18×18 矩阵独立算出，按 TYPES18 顺序排列。
  const expectedMatchups = {
    普通: {
      strong: [], weak: ['格斗'],
      resist: [], immune: ['幽灵'],
    },
    火: {
      strong: ['草', '冰', '虫', '钢'], weak: ['水', '地面', '岩石'],
      resist: ['火', '草', '冰', '虫', '钢', '妖精'], immune: [],
    },
    水: {
      strong: ['火', '地面', '岩石'], weak: ['电', '草'],
      resist: ['火', '水', '冰', '钢'], immune: [],
    },
    电: {
      strong: ['水', '飞行'], weak: ['地面'],
      resist: ['电', '飞行', '钢'], immune: [],
    },
    草: {
      strong: ['水', '地面', '岩石'], weak: ['火', '冰', '毒', '飞行', '虫'],
      resist: ['水', '电', '草', '地面'], immune: [],
    },
    冰: {
      strong: ['草', '地面', '飞行', '龙'], weak: ['火', '格斗', '岩石', '钢'],
      resist: ['冰'], immune: [],
    },
    格斗: {
      strong: ['普通', '冰', '岩石', '恶', '钢'], weak: ['飞行', '超能力', '妖精'],
      resist: ['虫', '岩石', '恶'], immune: [],
    },
    毒: {
      strong: ['草', '妖精'], weak: ['地面', '超能力'],
      resist: ['草', '格斗', '毒', '虫', '妖精'], immune: [],
    },
    地面: {
      strong: ['火', '电', '毒', '岩石', '钢'], weak: ['水', '草', '冰'],
      resist: ['毒', '岩石'], immune: ['电'],
    },
    飞行: {
      strong: ['草', '格斗', '虫'], weak: ['电', '冰', '岩石'],
      resist: ['草', '格斗', '虫'], immune: ['地面'],
    },
    超能力: {
      strong: ['格斗', '毒'], weak: ['虫', '幽灵', '恶'],
      resist: ['格斗', '超能力'], immune: [],
    },
    虫: {
      strong: ['草', '超能力', '恶'], weak: ['火', '飞行', '岩石'],
      resist: ['草', '格斗', '地面'], immune: [],
    },
    岩石: {
      strong: ['火', '冰', '飞行', '虫'], weak: ['水', '草', '格斗', '地面', '钢'],
      resist: ['普通', '火', '毒', '飞行'], immune: [],
    },
    幽灵: {
      strong: ['超能力', '幽灵'], weak: ['幽灵', '恶'],
      resist: ['毒', '虫'], immune: ['普通', '格斗'],
    },
    龙: {
      strong: ['龙'], weak: ['冰', '龙', '妖精'],
      resist: ['火', '水', '电', '草'], immune: [],
    },
    恶: {
      strong: ['超能力', '幽灵'], weak: ['格斗', '虫', '妖精'],
      resist: ['幽灵', '恶'], immune: ['超能力'],
    },
    钢: {
      strong: ['冰', '岩石', '妖精'], weak: ['火', '格斗', '地面'],
      resist: ['普通', '草', '冰', '飞行', '超能力', '虫', '岩石', '龙', '钢', '妖精'], immune: ['毒'],
    },
    妖精: {
      strong: ['格斗', '龙', '恶'], weak: ['毒', '钢'],
      resist: ['格斗', '虫', '恶'], immune: ['龙'],
    },
  };

  test('十八种属性的四字段列表及顺序完整匹配', () => {
    for (const type of M.TYPES18) {
      assert.deepEqual(M.matchupsForType(type), expectedMatchups[type], type);
    }
  });

  test('未知与空属性返回四个空数组', () => {
    const empty = { strong: [], weak: [], resist: [], immune: [] };
    assert.deepEqual(M.matchupsForType('不存在'), empty);
    assert.deepEqual(M.matchupsForType(null), empty);
  });

  test('countersForType 逐属性、逐关卡与官方双属性总倍率 ≥2 对齐', () => {
    for (const type of M.TYPES18) {
      const counters = M.countersForType(type);
      for (const g of M.GYM_STAGES) {
        assert.equal(
          counters.includes(g.stage),
          M.typeMultOfficialMulti(type, M.bossDefTypes(g.bossNo)) >= 2,
          `${type} 对第 ${g.stage} 关`,
        );
      }
    }
  });

  test('现有八关的硬编码克制结果保持不变（2026-11-17 8 关扩围）', () => {
    assert.deepEqual(M.countersForType('电'), [2]);
    assert.deepEqual(M.countersForType('火'), [4]);
    assert.deepEqual(M.countersForType('地面'), [1, 3, 5, 7, 8]);
    assert.deepEqual(M.countersForType('水'), [1, 7, 8]);
    assert.deepEqual(M.countersForType('飞行'), [4]);
  });
});

// 建态写法照抄 tests/battle.test.mjs 的既有模式（字面量 pet/side + createBattleState）
const testPet = (name, type, hp, moves, level = 10) => ({ key: name, name, type, no: null, img: null, level, maxHp: hp, hp, moves });
const testSide = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });

describe('PvP 与道馆回合的实际分叉', () => {
  test('PvP 火打水预演与真实结算均使用经典表', () => {
    const petA = testPet('小火龙', '火', 200, [{ name: '火花', type: '火', power: 40 }]);
    const petB = testPet('杰尼龟', '水', 200, [{ name: '水枪', type: '水', power: 40 }]);
    const st = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: testSide(1, '大宝', [petA]), B: testSide(2, '小宝', [petB]) } });
    // 2026-11-16 取消热身：B 先攻直接出招（水枪），回合轮到 A；旧写法传 null 跳过已失效（MUST_CHOOSE_MOVE）
    M.applyBattleAction(st, 'B', '水枪', fixedRng);
    const staged = M.stagePvpAttack(st, 'A', '火花', fixedRng);
    assert.equal(staged.mult, 1);
    const result = M.applyBattleAction(st, 'A', '火花', fixedRng, {
      critRate: M.PVP_CRIT_RATE,
      critMult: M.PVP_CRIT_MULT,
    });
    const attack = result.events.find((e) => e.type === 'attack');
    assert.ok(attack, '应产生攻击事件');
    assert.equal(attack.mult, 1);
    assert.ok(!attack.resisted);
    assert.ok(!attack.immune);
  });

  test('道馆电打地面产生零伤害免疫事件与没有效果文案', () => {
    const petA = testPet('皮卡丘', '电', 300, [{ name: '电击', type: '电', power: 50 }]);
    const boss = testPet('地鼠', '地面', 300, [{ name: '大地之力', type: '地面', power: 70 }]);
    const st = M.createBattleState({ mode: 'gym', firstSide: 'A', sides: { A: testSide(1, '大宝', [petA]), B: testSide(null, '馆主', [boss]) } });
    const { events } = M.resolveGymRound(st, { moveName: '电击' }, fixedRng);
    const attack = events.find((e) => e.type === 'attack' && e.side === 'A');
    assert.ok(attack, '应产生玩家攻击事件');
    assert.equal(attack.dmg, 0);
    assert.equal(attack.mult, 0);
    assert.equal(attack.immune, true);
    assert.match(attack.text, /没有效果/);
  });
});
