/* OFFICIAL_MULT 18 属性补全（2026-11-17 问题 3）：
 * 补全前只含 10 攻击属性（缺冰/格斗/毒/超能力/虫/幽灵/恶/钢整行），已有 10 行也缺项，
 * 缺的项都按 ×1 中性算，克制根本没生效。补全后 18×18，来源为数据集
 * ~/workspace/pokemon-dataset-zh 的 type_effectiveness（多数票定格，双属性交叉核对 13030/13212）。
 * 关都弱点核对依据：用户提供的全世代道馆速查表（upload-3.md）第一世代关都一节；
 * 我方 8 关对应关都第 1–8 关（2026-11-17 8 关扩围补齐毒第 5 关与超能力第 6 关）。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBackendSource } from './backend-src.mjs';
const M = await import(new URL('../src/index.js', import.meta.url));

describe('OFFICIAL_MULT：18 行完整', () => {
  test('18 个攻击属性都在，防御属性都在 TYPES18 内', () => {
    assert.equal(Object.keys(M.OFFICIAL_MULT).length, 18);
    assert.deepEqual([...Object.keys(M.OFFICIAL_MULT)].sort(), [...M.TYPES18].sort());
    assert.equal(M.TYPES18.length, 18);
    for (const [atk, row] of Object.entries(M.OFFICIAL_MULT)) {
      for (const def of Object.keys(row)) {
        assert.ok(M.TYPES18.includes(def), `攻击 ${atk} 含非法防御属性 ${def}`);
        assert.ok([0, 0.5, 2].includes(row[def]), `攻击 ${atk} 对 ${def} 倍率 ${row[def]} 非法`);
      }
    }
  });
  test('此前缺失的关键项已补', () => {
    const t = M.OFFICIAL_MULT;
    assert.equal(t['火']['冰'], 2); assert.equal(t['火']['虫'], 2); assert.equal(t['火']['钢'], 2);
    assert.equal(t['草']['毒'], 0.5); assert.equal(t['草']['虫'], 0.5); assert.equal(t['草']['钢'], 0.5);
    assert.equal(t['地面']['毒'], 2); assert.equal(t['地面']['钢'], 2); assert.equal(t['地面']['虫'], 0.5);
    assert.equal(t['岩石']['冰'], 2); assert.equal(t['岩石']['虫'], 2);
    assert.equal(t['岩石']['格斗'], 0.5); assert.equal(t['岩石']['钢'], 0.5);
    assert.equal(t['飞行']['格斗'], 2); assert.equal(t['飞行']['虫'], 2); assert.equal(t['飞行']['钢'], 0.5);
    assert.equal(t['龙']['钢'], 0.5); assert.equal(t['龙']['妖精'], 0);
    assert.equal(t['普通']['钢'], 0.5); assert.equal(t['普通']['幽灵'], 0);
    assert.equal(t['妖精']['格斗'], 2); assert.equal(t['妖精']['恶'], 2);
    assert.equal(t['妖精']['毒'], 0.5); assert.equal(t['妖精']['钢'], 0.5);
  });
  test('新增的 8 个攻击属性整行都在', () => {
    const t = M.OFFICIAL_MULT;
    assert.deepEqual(t['冰'], { '火': 0.5, '水': 0.5, '草': 2, '冰': 0.5, '地面': 2, '飞行': 2, '龙': 2, '钢': 0.5 });
    assert.equal(t['格斗']['普通'], 2); assert.equal(t['格斗']['幽灵'], 0); assert.equal(t['格斗']['钢'], 2);
    assert.equal(t['毒']['草'], 2); assert.equal(t['毒']['钢'], 0); assert.equal(t['毒']['妖精'], 2);
    assert.equal(t['超能力']['格斗'], 2); assert.equal(t['超能力']['恶'], 0); assert.equal(t['超能力']['钢'], 0.5);
    assert.equal(t['虫']['超能力'], 2); assert.equal(t['虫']['恶'], 2); assert.equal(t['虫']['妖精'], 0.5);
    assert.equal(t['幽灵']['普通'], 0); assert.equal(t['幽灵']['超能力'], 2); assert.equal(t['幽灵']['恶'], 0.5);
    assert.equal(t['恶']['超能力'], 2); assert.equal(t['恶']['幽灵'], 2); assert.equal(t['恶']['妖精'], 0.5);
    assert.equal(t['钢']['冰'], 2); assert.equal(t['钢']['岩石'], 2); assert.equal(t['钢']['妖精'], 2);
  });
});

describe('typeMultOfficial：新增攻击/防御属性返回正确值', () => {
  test('新增攻击属性', () => {
    assert.equal(M.typeMultOfficial('冰', '草'), 2);
    assert.equal(M.typeMultOfficial('格斗', '普通'), 2);
    assert.equal(M.typeMultOfficial('格斗', '幽灵'), 0);
    assert.equal(M.typeMultOfficial('毒', '草'), 2);
    assert.equal(M.typeMultOfficial('毒', '钢'), 0);
    assert.equal(M.typeMultOfficial('超能力', '格斗'), 2);
    assert.equal(M.typeMultOfficial('超能力', '恶'), 0);
    assert.equal(M.typeMultOfficial('虫', '超能力'), 2);
    assert.equal(M.typeMultOfficial('幽灵', '超能力'), 2);
    assert.equal(M.typeMultOfficial('幽灵', '普通'), 0);
    assert.equal(M.typeMultOfficial('恶', '超能力'), 2);
    assert.equal(M.typeMultOfficial('钢', '冰'), 2);
  });
  test('新增防御属性', () => {
    assert.equal(M.typeMultOfficial('火', '冰'), 2);
    assert.equal(M.typeMultOfficial('火', '钢'), 2);
    assert.equal(M.typeMultOfficial('普通', '幽灵'), 0);
    assert.equal(M.typeMultOfficial('龙', '妖精'), 0);
    assert.equal(M.typeMultOfficial('地面', '钢'), 2);
    assert.equal(M.typeMultOfficial('妖精', '恶'), 2);
  });
  test('未列组合仍为 1', () => {
    assert.equal(M.typeMultOfficial('火', '妖精'), 1);
    assert.equal(M.typeMultOfficial('冰', '毒'), 1);
    assert.equal(M.typeMultOfficial('超能力', '火'), 1);
  });
});

describe('关都弱点核对（upload-3.md 第一世代关都一节）', () => {
  test('S1 大岩蛇 [岩石,地面]：草/水 4 倍，格斗/地面 2 倍', () => {
    const defs = M.bossDefTypes(95);
    assert.deepEqual(defs, ['岩石', '地面']);
    assert.equal(M.typeMultOfficialMulti('草', defs), 4);
    assert.equal(M.typeMultOfficialMulti('水', defs), 4);
    assert.equal(M.typeMultOfficialMulti('格斗', defs), 2);
    assert.equal(M.typeMultOfficialMulti('地面', defs), 2);
    assert.equal(M.typeMultOfficialMulti('火', defs), 0.5);
  });
  test('S2 宝石海星 [水,超能力]：电/草 2 倍，虫/恶/幽灵 2 倍（超能力弱点）', () => {
    const defs = M.bossDefTypes(121);
    assert.deepEqual(defs, ['水', '超能力']);
    assert.equal(M.typeMultOfficialMulti('电', defs), 2);
    assert.equal(M.typeMultOfficialMulti('草', defs), 2);
    assert.equal(M.typeMultOfficialMulti('虫', defs), 2);
    assert.equal(M.typeMultOfficialMulti('恶', defs), 2);
    assert.equal(M.typeMultOfficialMulti('幽灵', defs), 2);
  });
  test('S3 电击兽 [电]：地面 2 倍；电打地面 0（免疫）', () => {
    const defs = M.bossDefTypes(125);
    assert.deepEqual(defs, ['电']);
    assert.equal(M.typeMultOfficialMulti('地面', defs), 2);
    assert.equal(M.typeMultOfficial('电', '地面'), 0);
  });
  test('S4 霸王花 [草,毒]：火/飞行/冰/超能力 2 倍', () => {
    const defs = M.bossDefTypes(45);
    assert.deepEqual(defs, ['草', '毒']);
    assert.equal(M.typeMultOfficialMulti('火', defs), 2);
    assert.equal(M.typeMultOfficialMulti('飞行', defs), 2);
    assert.equal(M.typeMultOfficialMulti('冰', defs), 2);
    assert.equal(M.typeMultOfficialMulti('超能力', defs), 2);
  });
  test('S7 风速狗 [火]：水/地面/岩石 2 倍（2026-11-17 8 关扩围：火从 S5 移到 S7）', () => {
    const defs = M.bossDefTypes(59);
    assert.deepEqual(defs, ['火']);
    assert.equal(M.typeMultOfficialMulti('水', defs), 2);
    assert.equal(M.typeMultOfficialMulti('地面', defs), 2);
    assert.equal(M.typeMultOfficialMulti('岩石', defs), 2);
  });
  test('S8 铁甲暴龙 [地面,岩石]：水/草 4 倍，冰 2 倍（2026-11-17 8 关扩围：地面从 S6 移到 S8）', () => {
    const defs = M.bossDefTypes(112);
    assert.deepEqual(defs, ['地面', '岩石']);
    assert.equal(M.typeMultOfficialMulti('水', defs), 4);
    assert.equal(M.typeMultOfficialMulti('草', defs), 4);
    assert.equal(M.typeMultOfficialMulti('冰', defs), 2);
  });
});

describe('服务端与离线引擎共享常量逐字一致', () => {  test('TYPES18 / OFFICIAL_MULT / typeMultOfficial / playerDefTypes 两边逐字一致', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const server = readBackendSource();
    const engines = fs.readdirSync(path.join(dir, '../public/static')).filter((f) => /^engine-local\.[0-9a-f]+\.js$/.test(f));
    assert.equal(engines.length, 1, `磁盘上 engine-local 应恰一个 hashed 文件，实际 ${engines.join(',')}`);
    const engine = fs.readFileSync(path.join(dir, '../public/static', engines[0]), 'utf8');
    const grab = (src, start, end) => {
      const i = src.indexOf(start);
      assert.ok(i >= 0, `未找到 ${start}`);
      const j = src.indexOf(end, i);
      assert.ok(j > i, `未找到 ${end}`);
      return src.slice(i, j);
    };
    assert.equal(grab(engine, "const TYPES18", '];'), grab(server, "const TYPES18", '];'));
    assert.equal(grab(engine, 'const OFFICIAL_MULT', '};'), grab(server, 'const OFFICIAL_MULT', '};'));
    assert.equal(grab(engine, 'function typeMultOfficial', '\n}\n'), grab(server, 'function typeMultOfficial', '\n}\n'));
    assert.equal(grab(engine, 'function playerDefTypes', '\n}\n'), grab(server, 'function playerDefTypes', '\n}\n'));
    const line = (src) => src.split('\n').find((l) => l.includes('defTypes must be'));
    assert.equal(line(engine), line(server));
  });
});

describe('App.md 伤害管线合规（2026-11-17）', () => {
  test('世代适配器：不套用 gen===1 规则——恶/钢/妖精不屏蔽，幽灵对超能力为 2（不是初代 Bug 的 0）', () => {
    assert.equal(M.typeMultOfficial('恶', '超能力'), 2);
    assert.equal(M.typeMultOfficial('钢', '冰'), 2);
    assert.equal(M.typeMultOfficial('妖精', '龙'), 2);
    assert.equal(M.typeMultOfficial('幽灵', '超能力'), 2);
    assert.equal(M.typeMultOfficial('幽灵', '普通'), 0);
  });
  test('物特分法用现代按招式分：火花为特殊（不按属性一刀切）', () => {
    // moveCategory 优先用招式 damage_class；火花官方为特殊。
    assert.equal(M.moveCategory({ name: '火花', type: '火' }), 'special');
    assert.equal(M.moveCategory({ name: '撞击', type: '普通' }), 'physical');
  });
  test('随机档为 16 档 85–100：rng=0 得 0.85，rng→1 得 1.00', () => {
    const move = { name: '撞击', type: '普通', power: 40 };
    const atk = { level: 10, type: '普通', stats: null };
    const def = { level: 10, type: '普通', stats: null };
    const lo = M.calcDamage(move, atk, def, () => 0, { chart: 'official', critRate: 0 });
    const hi = M.calcDamage(move, atk, def, () => 0.9999, { chart: 'official', critRate: 0 });
    // 无 stats 回落 base = 40×(0.5+0.05×10) = 40；STAB 1.5、mult 1。
    // lo: floor(40×0.85)=34 → floor(34×1.5)=51；hi: floor(40×1.00)=40 → floor(40×1.5)=60。
    assert.equal(lo.dmg, 51);
    assert.equal(hi.dmg, 60);
  });
  test('分步取整：base 60、STAB 1.5、mult 0.5、随机 0.93 得 41（不是单次 round 的 42）', () => {
    const move = { name: '火花', type: '火', power: 60 };
    const atk = { level: 10, type: '火', stats: null };
    const def = { level: 10, type: '水', stats: null };
    const r = M.calcDamage(move, atk, def, () => 0.5, { chart: 'official', critRate: 0 });
    assert.equal(r.mult, 0.5);
    assert.equal(r.dmg, 41);
  });
});
