/* 战斗特性扩到 159（2026-11-07）：node --test tests/abilities-expand-159.test.mjs
 * 阶梯第四步＋4 种传说 144/145/146/150；本批核心是补数据（DEX_DETAILS 此前 0 条目）。
 * 数据来源：PokeAPI 现网直取（pokemon / pokemon-species / ability，2026-11-07；
 * 原始响应存 work/pokeapi-cache/pokemon-{144,145,146,150}.json、species-{144,145,146,150}.json，
 * 写入脚本 work/build-abilities-159-details.mjs 已逐值比对 4 种 × 11 项全部一致）。
 * 压迫感：plan §3 已定零实效（本站无 PP 系统），按 95 坚硬脑袋先例进 ABILITY_NO_EFFECT 守卫标记，
 * 不产生任何战斗效果；隐藏第二特性（144 雪隐 / 145 静电 / 146 火焰之躯 / 150 紧张感）只写入数据，
 * 不实现、不触发（D1 首特性口径；隐藏特性获取途径未开）。
 * 口径：D1 首特性、D6 速度不进 PvP。传说种不上场，本文件验证走探针级（calcDamage 对照＋道馆/PvP/合作各一回合探针）。
 * 确定性：固定 rng；精确伤害数均由 /tmp/probe-159.mjs 实测（与 121 场外特性对照种同 stats 逐数相等）。
 * 不做的事：不进野外池、不进备战宠（COLLECTION_MOVES）、不建稀有转盘、不碰 151 与 165 批的 6 种。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const M = await import(new URL('../src/index.js', import.meta.url));
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const OFF = { chart: 'official', critRate: 0 };
const tackle = { name: '撞击', type: '普通', power: 35 };
const ember = { name: '火花', type: '火', power: 40 };
const water = { name: '水枪', type: '水', power: 40 };
const quake = { name: '地震', type: '地面', power: 40 };
const bobo = { key: 'boss', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] };
// 144/145/146/150 的测试宠名字与单属性显式给（与主宠线 1–9/25/26 同例；SPECIES 表自 2026-11-14 全量 151 批起已有这 4 种，
// 但本测试沿用显式 NAMES 以保持测试宠稳定；2026-11-17 方案 A 前，144 的 type 用“飞行”、150 的 type 用“普通”，
// 因 makePet 的单属性白名单 TYPES（9 属性）不含“冰”与“超能力”；方案 A 后 makePet 校验已扩到 TYPES18（18 种），
// 此处显式类型仍沿用旧值（测试宠的 type 只作展示与回落，defTypes 仍走 playerDefTypes 的官方双属性）。
const NAMES = { 144: ['急冻鸟', '飞行'], 145: ['闪电鸟', '电'], 146: ['火焰鸟', '火'], 150: ['超梦', '普通'] };
const pet = (no, moves, hp = null) => {
  const [name, type] = NAMES[no];
  const p = M.makePet({ key: `p${no}`, name, type, no, defTypes: M.playerDefTypes(no), level: 18, moves });
  if (hp != null) p.hp = hp;
  return p;
};

// 已实装特性集合（155 的 30 个＋悠游自如＋压迫感＝32 个）。
// 悠游自如计入是 eno 对 155 的审校纠正（DEPLOY §147）：雨天速度×2 已随天气简化版实装，
// 155 测试的 IMPLEMENTED 集漏了它，池内覆盖 99 应为 107、全宇宙 102 应为 110；本批沿用纠正后口径。
const IMPLEMENTED = new Set([
  '茂盛', '猛火', '激流', '虫之预感', '厚脂肪', '飘浮', '硬壳盔甲', '储水', '蓄电',
  '威吓', '避雷针', '电气引擎', '怪力钳', '恒净之躯',
  '静电', '毒刺', '同步', '蜕皮', '柔软', '毅力', '孢子', '干劲', '不眠', '免疫', '火焰之躯', '自然回复', '早起',
  '引火', '叶绿素', '坚硬脑袋', '悠游自如', '压迫感',
]);
const B141 = [121, 131, 133, 134, 135, 136, 143, 147, 151];
const B155 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 45, 95, 125];
const B159 = [144, 145, 146, 150];
const POOL_159 = (() => {
  const wild = M.WILD.map((w) => w.no);
  return [...new Set([...wild, ...B141, ...B155, ...B159])];
})();
const POOL_155 = [...new Set([...M.WILD.map((w) => w.no), ...B141, ...B155])];
const POOL_141 = [...new Set([...M.WILD.map((w) => w.no), ...B141])];

describe('范围守卫（扩到 159）', () => {
  test('4 条数据逐项核对（属性、首特性压迫感、隐藏第二特性、六维、总和）', () => {
    const want = {
      144: { types: ['冰', '飞行'], hidden: '雪隐', hiddenEffect: '冰雹天气下闪避率提升到1.25倍，且不受冰雹伤害。', stats: { hp: 90, attack: 85, defense: 100, sp_attack: 95, sp_defense: 125, speed: 85, total: 580 } },
      145: { types: ['电', '飞行'], hidden: '静电', hiddenEffect: '受到接触类招式攻击时，有30%几率让对方麻痹。', stats: { hp: 90, attack: 90, defense: 85, sp_attack: 125, sp_defense: 90, speed: 100, total: 580 } },
      146: { types: ['火', '飞行'], hidden: '火焰之躯', hiddenEffect: '受到接触类招式攻击时，有30%几率让对手灼伤。', stats: { hp: 90, attack: 100, defense: 90, sp_attack: 125, sp_defense: 85, speed: 90, total: 580 } },
      150: { types: ['超能力'], hidden: '紧张感', hiddenEffect: '对手无法吃下携带的树果。', stats: { hp: 106, attack: 110, defense: 90, sp_attack: 154, sp_defense: 90, speed: 130, total: 680 } },
    };
    for (const [no, w] of Object.entries(want)) {
      const d = M.DEX_DETAILS[Number(no)];
      assert.ok(d, `${no} 应有 DEX_DETAILS 条目`);
      assert.deepEqual(d, {
        types: w.types,
        abilities: [
          { name: '压迫感', hidden: false, effect: '对手针对自己的招式，PP消耗增加1点。' },
          { name: w.hidden, hidden: true, effect: w.hiddenEffect },
        ],
        stats: w.stats,
      }, `${no} 条目逐项`);
      // 隐藏第二特性的效果文案与既有条目逐字一致（雪隐 471 / 静电 25 / 火焰之躯 126 / 紧张感 23）。
      const reuse = { 144: 471, 145: 25, 146: 126, 150: 23 };
      const ref = M.DEX_DETAILS[reuse[Number(no)]].abilities.find((a) => a.name === w.hidden);
      assert.equal(d.abilities[1].effect, ref.effect, `${no} 隐藏特性效果应与 ${reuse[Number(no)]} 号逐字一致`);
      // 总和校验：144/145/146 为 580，150 为 680。
      assert.equal(d.stats.total, Number(no) === 150 ? 680 : 580, `${no} 总和`);
      assert.equal(d.stats.hp + d.stats.attack + d.stats.defense + d.stats.sp_attack + d.stats.sp_defense + d.stats.speed, d.stats.total, `${no} 六维求和`);
    }
  });
  test('首特性恒非隐藏：4 种首特性均为压迫感，两端 abilityOf 一致', () => {
    for (const no of B159) {
      assert.equal(M.DEX_DETAILS[no].abilities[0].hidden, false, `${no} 首特性须非隐藏`);
      assert.equal(M.abilityOf(no), '压迫感', `${no} 服务端首特性`);
      assert.equal(L.abilityOf(no), '压迫感', `${no} 离线首特性`);
      assert.equal(pet(no, [tackle]).ability, '压迫感', `${no} makePet 带 ability 字段`);
    }
  });
  test('覆盖数核算：池子 159（无重叠）；池内已覆盖 111；全宇宙 165 种中 114 种；已实装 32 个特性', () => {
    assert.equal(POOL_159.length, 159);
    // B159 与野外池、B141、B155 均无重叠：155＋4＝159。
    const wild = new Set(M.WILD.map((w) => w.no));
    assert.deepEqual(B159.filter((no) => wild.has(no)), []);
    assert.deepEqual(B159.filter((no) => B141.includes(no) || B155.includes(no)), []);
    const covered159 = POOL_159.filter((no) => IMPLEMENTED.has(M.abilityOf(no)));
    assert.equal(covered159.length, 111);
    assert.deepEqual(B159.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).sort((a, b) => a - b), B159);
    assert.deepEqual(B159.filter((no) => !IMPLEMENTED.has(M.abilityOf(no))), []);
    // 纠正后口径回算：155 时池内 107（99＋悠游自如 8）、141 时池内 93（85＋悠游自如 8）。
    assert.equal(POOL_155.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 107);
    assert.equal(POOL_141.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 93);
    const allNos = Object.keys(M.DEX_DETAILS).map(Number);
    assert.equal(allNos.length, 165);
    assert.equal(allNos.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 114);
    assert.equal(IMPLEMENTED.size, 32);
  });
  test('压迫感首特性全清单 [144,145,146,150]；雪隐/静电/火焰之躯/紧张感首特性清单不变', () => {
    const firstList = (name) => Object.entries(M.DEX_DETAILS)
      .filter(([, d]) => d.abilities && d.abilities[0] && d.abilities[0].name === name)
      .map(([no]) => Number(no)).sort((a, b) => a - b);
    assert.deepEqual(firstList('压迫感'), [144, 145, 146, 150]);
    assert.deepEqual(firstList('雪隐'), [471]);
    assert.deepEqual(firstList('静电'), [25, 26, 125, 172, 179, 180, 181]);
    assert.deepEqual(firstList('火焰之躯'), [126]);
    assert.deepEqual(firstList('紧张感'), []);
  });
  test('零实效注册：ABILITY_NO_EFFECT 两端一致，28 种（Batch 11 加 26 种 D 类）', () => {
    assert.deepEqual([...M.ABILITY_NO_EFFECT], ['坚硬脑袋', '压迫感', '逃跑', '捡拾', '发光', '湿气', '锐利目光', '鳞粉', '我行我素', '蹒跚', '斗争心', '污泥浆', '黏着', '连续攻击', '预知梦', '危险预知', '察觉', '天恩', '穿透', '奇迹皮肤', '友情防守', '治愈之心', '舍身', '强行', '轻装', '贪吃鬼', '收获', '紧张感']);
    assert.deepEqual([...L.ABILITY_NO_EFFECT], ['坚硬脑袋', '压迫感', '逃跑', '捡拾', '发光', '湿气', '锐利目光', '鳞粉', '我行我素', '蹒跚', '斗争心', '污泥浆', '黏着', '连续攻击', '预知梦', '危险预知', '察觉', '天恩', '穿透', '奇迹皮肤', '友情防守', '治愈之心', '舍身', '强行', '轻装', '贪吃鬼', '收获', '紧张感']);
    // 12 种既有首特性为零实效特性的种均被该注册覆盖（坚硬脑袋 8 种＋压迫感 4 种，按特性名，不按种号；Batch 11 另加 23 种 D 类首特性，共 35 种）。
    for (const no of [74, 75, 76, 95, 104, 105, 142, 208, 144, 145, 146, 150]) {
      assert.ok(M.ABILITY_NO_EFFECT.has(M.abilityOf(no)), `${no} 在零实效注册内`);
    }
  });
  test('图鉴剪影规则（数据层）：传说种未拥有时只显示剪影', () => {
    const wild = new Set(M.WILD.map((w) => w.no));
    const lineNos = new Set(Object.values(M.LINES).flatMap((l) => l.forms.map((f) => f.no)));
    const gymBosses = new Set(M.GYM_STAGES.map((g) => g.bossNo));
    const gymEggs = new Set(M.GYM_STAGES.map((g) => g.eggSpecies));
    for (const no of B159) {
      assert.equal(wild.has(no), false, `${no} 不进野外池`);
      // 2026-11-14 全量 151 批（用户令：测试站仓库列全部 151、传说技能表按官方做）：
      // 传说 4 种已进备战名册（COLLECTION_MOVES＋COLLECTION_LEARNSET 均有招式），
      // 测试站仓库可列、可取；正式获得途径仍为稀有转盘（RARE_WHEEL_LEGENDARIES）。
      assert.equal(no in M.COLLECTION_MOVES, true, `${no} 已进备战名册`);
      assert.equal(no in (M.COLLECTION_LEARNSET || {}), true, `${no} 已有备战招式表`);
      assert.equal(gymBosses.has(no), false, `${no} 不是馆主`);
      assert.equal(M.WHEEL_EGG_POOL.includes(no), false, `${no} 不在转盘蛋池`);
      assert.equal(gymEggs.has(no), false, `${no} 不是馆主蛋`);
      assert.equal(lineNos.has(no), false, `${no} 不在主宠线`);
    }
    // 空图鉴不拥有其中任何一种；dex151 锁定项的剪影渲染由 tests/pokedex151.test.mjs 全量覆盖（151 项逐项断言 name 为 null）。
    assert.deepEqual(M.ownedDexNos([], 'pikachu'), []);
    assert.deepEqual(M.dex151Progress([], 'pikachu'), { owned: 0, total: 151, pct: 0 });
  });
});

describe('压迫感零实效（calcDamage 级）', () => {
  const stats = { hp: 50, attack: 40, defense: 40, sp_attack: 40, sp_defense: 40, speed: 40 };
  const mk = (no) => ({ key: 'x', name: `测${no}`, type: '岩石', no, level: 18, maxHp: 100, hp: 100, defTypes: ['岩石', '地面'], stats, moves: [tackle], stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, flashFire: false });
  const want = { '撞击': 3, '火花': 4, '水枪': 32, '地震': 24 }; // App.md 分步取整（同 155）
  for (const no of B159) {
    test(`calcDamage 对照：${no} 与 121（场外特性对照种）同 stats 时四招双向逐数相等`, () => {
      for (const move of [tackle, ember, water, quake]) {
        const rA = M.calcDamage(move, mk(no), mk(16), R, OFF);
        const rC = M.calcDamage(move, mk(121), mk(16), R, OFF);
        assert.deepEqual(rA, rC, `攻方 ${move.name}`);
        assert.equal(rA.dmg, want[move.name], `攻方 ${move.name} dmg`);
        assert.equal(rA.ability.length, 0);
        const rD = M.calcDamage(move, mk(16), mk(no), R, OFF);
        const rE = M.calcDamage(move, mk(16), mk(121), R, OFF);
        assert.deepEqual(rD, rE, `守方 ${move.name}`);
        assert.equal(rD.dmg, want[move.name], `守方 ${move.name} dmg`);
        assert.equal(rD.ability.length, 0);
      }
    });
  }
  test('离线对照：4 种四招双向与服务端逐数一致', () => {
    for (const no of B159) {
      for (const move of [tackle, ember, water, quake]) {
        assert.deepEqual(L.calcDamage(move, mk(no), mk(16), R, OFF), M.calcDamage(move, mk(no), mk(16), R, OFF), `${no} 攻方 ${move.name}`);
        assert.deepEqual(L.calcDamage(move, mk(16), mk(no), R, OFF), M.calcDamage(move, mk(16), mk(no), R, OFF), `${no} 守方 ${move.name}`);
      }
    }
  });
  test('速度：Lv18 速度 144=35、145=41、146=37、150=51，晴/雨天均无加成，两端一致', () => {
    const wantSpeed = { 144: 35, 145: 41, 146: 37, 150: 51 };
    for (const no of B159) {
      for (const mod of [M, L]) {
        const p = mod.makePet({ key: 'p', name: NAMES[no][0], type: NAMES[no][1], no, defTypes: mod.playerDefTypes(no), level: 18, moves: [tackle] });
        assert.equal(mod.effectiveSpeed(p), wantSpeed[no], `${no} 基础速度`);
        assert.equal(mod.effectiveSpeed(p, 'sun'), wantSpeed[no], `${no} 晴天速度`);
        assert.equal(mod.effectiveSpeed(p, 'rain'), wantSpeed[no], `${no} 雨天速度`);
      }
    }
  });
  test('tryInflictStatus：4 种中毒均不被特性挡下，正常上状态', () => {
    for (const no of B159) {
      const p = pet(no, [tackle]);
      const r = M.tryInflictStatus(p, 'poison', R, 'A');
      assert.equal(r.blocked, undefined, `${no} 不应被挡`);
      assert.deepEqual(p.status, { kind: 'poison' }, `${no} 应中毒`);
    }
  });
});

describe('四路探针（传说种不上场，压迫感无 ability 事件）', () => {
  function gymState(mainDesc, bossDesc, weather = null) {
    const st = M.createBattleState({
      mode: 'gym', firstSide: 'A', weather,
      sides: {
        A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [M.makePet(mainDesc)] },
        B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bossDesc)] },
      },
    });
    st.gym.friendship = 0;
    st.gym.endureUsed = false;
    return st;
  }
  test('道馆探针：玩家撞击打 144 急冻鸟馆主，一回合无 ability 事件', () => {
    const st = gymState(
      { key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] },
      { key: 'boss', name: '急冻鸟', type: '飞行', no: 144, defTypes: M.playerDefTypes(144), level: 18, moves: [tackle] },
    );
    const r = M.resolveGymRound(st, { moveName: '撞击' }, R);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
  });
  test('PvP 探针：A 波波撞击打 B 144 急冻鸟，一回合无 ability 事件', () => {
    const a = M.makePet({ key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] });
    const b = pet(144, [tackle]);
    const st = M.createBattleState({
      mode: 'pvp', firstSide: 'A',
      sides: {
        A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [a] },
        B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [b] },
      },
    });
    st.turn = 'A'; st.acted = { A: 1, B: 1 };
    const r = M.applyBattleAction(st, 'A', '撞击', R, { critRate: M.PVP_CRIT_RATE, critMult: M.PVP_CRIT_MULT });
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
  });
  test('合作探针：A/B 撞击打 144 急冻鸟馆主，一回合无 ability 事件', () => {
    const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet({ key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] })] };
    const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(bobo)] };
    const st = M.createCoopBattleState({ node_id: 'test-n1', kind: 'normal', bossNo: 144, bossType: '飞行', bossMoves: [['撞击', '普通', 35]], levelOffset: 0 }, sideA, sideB, 18);
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, R);
    assert.equal(r.error, undefined);
    assert.equal(r.events.filter((e) => e.type === 'ability').length, 0, JSON.stringify(r.events));
    assert.equal(st.round_no, 2);
  });
});

describe('服务端与离线一致（扩到 159）', () => {
  test('calcDamage 144 对照逐数一致（144 与 121 同 stats 四招双向）', () => {
    const stats = { hp: 50, attack: 40, defense: 40, sp_attack: 40, sp_defense: 40, speed: 40 };
    const mk = (no) => ({ key: 'x', name: `测${no}`, type: '岩石', no, level: 18, maxHp: 100, hp: 100, defTypes: ['岩石', '地面'], stats, moves: [tackle], stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: null, flashFire: false });
    for (const move of [tackle, ember, water, quake]) {
      assert.deepEqual(L.calcDamage(move, mk(144), mk(16), R, OFF), M.calcDamage(move, mk(144), mk(16), R, OFF), `攻方 ${move.name}`);
      assert.deepEqual(L.calcDamage(move, mk(16), mk(144), R, OFF), M.calcDamage(move, mk(16), mk(144), R, OFF), `守方 ${move.name}`);
    }
  });
  test('道馆探针事件流一致（144 馆主一回合）', () => {
    const mkGym = (mod) => {
      const st = mod.createBattleState({
        mode: 'gym', firstSide: 'A', weather: null,
        sides: {
          A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [mod.makePet({ key: 'main', name: '波波', type: '普通', no: 16, defTypes: ['普通', '飞行'], level: 18, moves: [tackle] })] },
          B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [mod.makePet({ key: 'boss', name: '急冻鸟', type: '飞行', no: 144, defTypes: mod.playerDefTypes(144), level: 18, moves: [tackle] })] },
        },
      });
      st.gym.friendship = 0;
      st.gym.endureUsed = false;
      return st;
    };
    const s1 = mkGym(M);
    const l1 = mkGym(L);
    const r1 = M.resolveGymRound(s1, { moveName: '撞击' }, R);
    const r2 = L.resolveGymRound(l1, { moveName: '撞击' }, R);
    assert.deepEqual(r2.events, r1.events);
    assert.equal(l1.sides.A.pets[0].hp, s1.sides.A.pets[0].hp);
    assert.equal(l1.sides.B.pets[0].hp, s1.sides.B.pets[0].hp);
  });
});
