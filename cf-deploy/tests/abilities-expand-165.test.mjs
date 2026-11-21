/* 战斗特性扩到 165（2026-11-07）：node --test tests/abilities-expand-165.test.mjs
 * 阶梯第五步（收尾）＋6 种非关都 172/196/197/470/471/700。
 * 唯一新接线：470 叶子防守——大晴天时不陷入任何异常状态（中毒/麻痹/灼伤/睡眠四种全挡）；
 * 做法：tryInflictStatus 中央关口加挡（statusImmunityReason 返 'ability'），weatherKind 沿
 * applyStatusInflict / applyContactTrigger 透传，6 处调用点从 st.weather 取天气（无天气传 null）。
 * 172（静电）、196/197（同步）为二期已实现，本文件只验证四路触发。
 * 471（雪隐）dormant：简化版天气只有晴/雨，无冰雹，无触发条件；700（迷人之躯）dormant：
 * 着迷不在 D3 状态范围（只做中毒/麻痹/灼伤/睡眠），无着迷状态可挂。两者均不进 ABILITY_NO_EFFECT
 * （行为类特性不得进零实效表——与 159 的零实效断言对照：它们是未实现，不是零实效）。
 * 覆盖核算（从数据现算）：池子 165（132＋9＋14＋4＋6，无重叠）；池内已覆盖 115；
 * 全宇宙 165 种中 115——与池内相同，因为池子已等于全宇宙。注意 159 批宇宙 114 已含
 * 172/196/197（池外但宇宙内），本批宇宙只新增 470（＋1）＝115；任务单的“114＋4＝118”
 * 是重复计算（172/196/197 在 114 里已算过），以本文件实测为准。
 * 获取途径：6 种均不在野外池（WILD）；COLLECTION_MOVES 里 196/197/470/471/700 的条目为
 * 164 种备战名册的既有数据（非本批新增），172 无条目，本批未改动该表。
 * 口径：D1 首特性、D6 速度不进 PvP；叶子防守挡下文案走 tryInflictStatus 内联分支
 * （状态阻挡不经过 abilityEventText，与引火的 calcDamage 免疫条目不同，故 abilityEventText 无新增分支）。
 * 确定性：固定 rng；精确伤害数与事件文本均由 /tmp/probe-165.mjs、/tmp/probe-165b.mjs 实测（服务端与离线端逐数一致）。
 * 不做的事：不动正式站、不改战斗系数、不改 S4 断言带（已知失败项见全量回归）。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const M = await import(new URL('../src/index.js', import.meta.url));
import { pathToFileURL } from 'node:url';
import { assetPath } from './asset-path.mjs';
const L = await import(pathToFileURL(assetPath('engine-local.js')).href);

const R = () => 0.5;
const tackle = { name: '撞击', type: '普通', power: 35, damage_class: 'physical' };
const mk = (mod, no, name, type, defTypes, move = tackle) =>
  mod.makePet({ key: `p${no}`, name, type, no, defTypes, level: 18, moves: [move] });
const desc = (no, name, type, defTypes, move = tackle) =>
  ({ key: 'main', name, type, no, defTypes, level: 18, moves: [move] });
function gymState(mod, weather, aDesc, bDesc) {
  const st = mod.createBattleState({
    mode: 'gym', firstSide: 'A', weather,
    sides: {
      A: { childId: 1, childName: '玩家', battleLevel: 18, activeIdx: 0, pets: [mod.makePet(aDesc)] },
      B: { childId: null, childName: '馆主', battleLevel: 18, activeIdx: 0, pets: [mod.makePet(bDesc)] },
    },
  });
  st.gym.friendship = 0; st.gym.endureUsed = false;
  return st;
}
function pvpState(mod, aDesc, bDesc) {
  const st = mod.createBattleState({
    mode: 'pvp', firstSide: 'A',
    sides: {
      A: { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [mod.makePet(aDesc)] },
      B: { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [mod.makePet(bDesc)] },
    },
  });
  st.turn = 'A'; st.acted = { A: 1, B: 1 }; // 模拟已过首回合：双方均可出招
  return st;
}
function coopState(bossNo, bossType, bossMoves, petA, petB) {
  const sideA = { childId: 1, childName: '大宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petA)] };
  const sideB = { childId: 2, childName: '小宝', battleLevel: 18, activeIdx: 0, pets: [M.makePet(petB)] };
  return M.createCoopBattleState({ node_id: 'test-n1', kind: 'normal', bossNo, bossType, bossMoves, levelOffset: 0 }, sideA, sideB, 18);
}
const bobo = desc(16, '波波', '普通', ['普通', '飞行']);
const firstList = (mod, name) => Object.entries(mod.DEX_DETAILS)
  .filter(([, d]) => d.abilities && d.abilities[0] && d.abilities[0].name === name)
  .map(([no]) => Number(no)).sort((a, b) => a - b);

// 已实装特性集合（159 的 32 个＋叶子防守＝33 个）。
const IMPLEMENTED = new Set([
  '茂盛', '猛火', '激流', '虫之预感', '厚脂肪', '飘浮', '硬壳盔甲', '储水', '蓄电',
  '威吓', '避雷针', '电气引擎', '怪力钳', '恒净之躯',
  '静电', '毒刺', '同步', '蜕皮', '柔软', '毅力', '孢子', '干劲', '不眠', '免疫', '火焰之躯', '自然回复', '早起',
  '引火', '叶绿素', '坚硬脑袋', '悠游自如', '压迫感', '叶子防守',
]);
const B141 = [121, 131, 133, 134, 135, 136, 143, 147, 151];
const B155 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 45, 95, 125];
const B159 = [144, 145, 146, 150];
const B165 = [172, 196, 197, 470, 471, 700];
const POOL_165 = [...new Set([...M.WILD.map((w) => w.no), ...B141, ...B155, ...B159, ...B165])];
const POOL_159 = [...new Set([...M.WILD.map((w) => w.no), ...B141, ...B155, ...B159])];
const POOL_155 = [...new Set([...M.WILD.map((w) => w.no), ...B141, ...B155])];
const POOL_141 = [...new Set([...M.WILD.map((w) => w.no), ...B141])];

describe('范围守卫（扩到 165）', () => {
  test('6 种首特性逐种核对（172 静电、196/197 同步、470 叶子防守、471 雪隐、700 迷人之躯），两端一致', () => {
    const want = { 172: '静电', 196: '同步', 197: '同步', 470: '叶子防守', 471: '雪隐', 700: '迷人之躯' };
    for (const [no, name] of Object.entries(want)) {
      assert.equal(M.abilityOf(Number(no)), name);
      assert.equal(L.abilityOf(Number(no)), name);
    }
  });
  test('同特性种清单：叶子防守仅 470（114 为第二特性不计）、雪隐仅 471、迷人之躯 35/36/39/40/700、静电 7 种、同步 6 种', () => {
    assert.deepEqual(firstList(M, '叶子防守'), [470]);
    assert.deepEqual(firstList(M, '雪隐'), [471]);
    assert.deepEqual(firstList(M, '迷人之躯'), [35, 36, 39, 40, 700]);
    assert.deepEqual(firstList(M, '静电'), [25, 26, 125, 172, 179, 180, 181]);
    assert.deepEqual(firstList(M, '同步'), [63, 64, 65, 151, 196, 197]);
    // 114 臭臭泥的叶子防守是第二特性（首特性叶绿素），不在口径内
    assert.equal(M.DEX_DETAILS[114].abilities[0].name, '叶绿素');
    assert.equal(M.DEX_DETAILS[114].abilities[1].name, '叶子防守');
  });
  test('覆盖核算：池子 165（无重叠）；池内已覆盖 115；全宇宙 165 种中 115；已实装 33 个特性', () => {
    assert.equal(POOL_165.length, 165);
    const wild = new Set(M.WILD.map((w) => w.no));
    assert.deepEqual(B165.filter((no) => wild.has(no)), []);
    assert.deepEqual(B165.filter((no) => B141.includes(no) || B155.includes(no) || B159.includes(no)), []);
    assert.equal(POOL_165.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 115);
    assert.deepEqual(B165.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).sort((a, b) => a - b), [172, 196, 197, 470]);
    assert.deepEqual(B165.filter((no) => !IMPLEMENTED.has(M.abilityOf(no))), [471, 700]);
    // 宇宙＝池子（池子已等于全宇宙 165 种）；159 批宇宙 114 已含 172/196/197，本批宇宙只＋470。
    const allNos = Object.keys(M.DEX_DETAILS).map(Number);
    assert.equal(allNos.length, 165);
    assert.equal(allNos.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 115);
    assert.deepEqual([...new Set(allNos)].sort((a, b) => a - b), [...POOL_165].sort((a, b) => a - b));
    // 纠正后口径回算：159 时池内 111、155 时池内 107、141 时池内 93（叶子防守只 470 一种，不在旧池内，回算不变）。
    assert.equal(POOL_159.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 111);
    assert.equal(POOL_155.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 107);
    assert.equal(POOL_141.filter((no) => IMPLEMENTED.has(M.abilityOf(no))).length, 93);
    assert.equal(IMPLEMENTED.size, 33);
  });
  test('获取途径：6 种均不在野外池；172 不在 COLLECTION_MOVES（其余 5 种条目为 164 种备战名册既有数据，本批未改动）', () => {
    const wild = new Set(M.WILD.map((w) => w.no));
    assert.deepEqual(B165.filter((no) => wild.has(no)), []);
    assert.equal(172 in M.COLLECTION_MOVES, false);
    for (const no of [196, 197, 470, 471, 700]) assert.ok(no in M.COLLECTION_MOVES, `${no} 应有既有备战招式条目`);
  });
});

describe('叶子防守（470，唯一新接线）', () => {
  const kinds = ['poison', 'paralysis', 'burn', 'sleep'];
  const label = { poison: '中毒', paralysis: '麻痹', burn: '灼伤', sleep: '睡眠' };
  test('tryInflictStatus：晴天四种状态全挡（blocked，叶子防守文案），服务端与离线端一致', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      for (const kind of kinds) {
        const p = mk(mod, 470, '叶伊布', '草', ['草']);
        const r = mod.tryInflictStatus(p, kind, R, 'A', 'sun');
        assert.equal(r && r.blocked, true, `${tag} ${kind}`);
        assert.equal(r.event.type, 'ability');
        assert.equal(r.event.ability, '叶子防守');
        assert.equal(r.event.text, `「叶子防守」发动！叶伊布 不会${label[kind]}！`);
        assert.equal(p.status, null);
      }
    }
  });
  test('tryInflictStatus：雨天四种正常挂上（inflicted），服务端与离线端一致', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      for (const kind of kinds) {
        const p = mk(mod, 470, '叶伊布', '草', ['草']);
        const r = mod.tryInflictStatus(p, kind, R, 'A', 'rain');
        assert.equal(r && r.inflicted, true, `${tag} ${kind}`);
        assert.equal(p.status.kind, kind, `${tag} ${kind}`);
      }
      // 睡眠回合数：R=0.5 → 1+floor(0.5×3)=2
      const p = mk(mod, 470, '叶伊布', '草', ['草']);
      mod.tryInflictStatus(p, 'sleep', R, 'A', 'rain');
      assert.deepEqual(p.status, { kind: 'sleep', sleepTurns: 2 });
    }
  });
  test('tryInflictStatus：无天气四种正常挂上（不传 weatherKind 与传 null 相同）', () => {
    for (const w of [undefined, null]) {
      for (const kind of kinds) {
        const p = mk(M, 470, '叶伊布', '草', ['草']);
        const r = M.tryInflictStatus(p, kind, R, 'A', w);
        assert.equal(r && r.inflicted, true, `w=${w} ${kind}`);
        assert.equal(p.status.kind, kind);
      }
    }
  });
  test('接触触发：470 撞击打 125（静电），rng 0.1——晴天被叶子防守挡、雨天/无天气麻痹', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const atkSun = mk(mod, 470, '叶伊布', '草', ['草']);
      const defSun = mk(mod, 125, '电击兽', '电', ['电']);
      const evsSun = [];
      mod.applyContactTrigger(atkSun, defSun, tackle, () => 0.1, evsSun, 'A', 'B', 'sun');
      assert.equal(atkSun.status, null);
      assert.deepEqual(evsSun.map((e) => e.text), ['「叶子防守」发动！叶伊布 不会麻痹！']);
      for (const w of ['rain', undefined]) {
        const atk = mk(mod, 470, '叶伊布', '草', ['草']);
        const def = mk(mod, 125, '电击兽', '电', ['电']);
        const evs = [];
        mod.applyContactTrigger(atk, def, tackle, () => 0.1, evs, 'A', 'B', w);
        assert.deepEqual(atk.status, { kind: 'paralysis' }, `${tag} w=${w}`);
        assert.deepEqual(evs.map((e) => e.text), ['「静电」发动！电击兽 让 叶伊布 麻痹了！', '叶伊布 麻痹了！']);
      }
    }
  });
  test('道馆集成：玩家 470 撞击打馆主 125——晴天挡、没有天气时麻痹（序列 rng，前两次 0.5、其后 0.1）', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      for (const [weather, wantStatus, wantText] of [
        ['sun', null, '「叶子防守」发动！叶伊布 不会麻痹！'],
        [null, { kind: 'paralysis' }, '「静电」发动！电击兽 让 叶伊布 麻痹了！'],
      ]) {
        const st = gymState(mod, weather, desc(470, '叶伊布', '草', ['草']), desc(125, '电击兽', '电', ['电']));
        let n = 0;
        const rng = () => (n++ < 2 ? 0.5 : 0.1);
        const r = mod.resolveGymRound(st, { moveName: '撞击' }, rng);
        assert.equal(r.error, undefined, `${tag} w=${weather}`);
        assert.deepEqual(st.sides.A.pets[0].status, wantStatus, `${tag} w=${weather}`);
        assert.ok(r.events.some((e) => e.type === 'ability' && e.text === wantText), `${tag} w=${weather} ${JSON.stringify(r.events)}`);
      }
    }
  });
  test('PvP 集成：470 撞击打 125，rng 0.1——PvP 无天气，叶子防守不挡，470 麻痹', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const st = pvpState(mod, desc(470, '叶伊布', '草', ['草']), desc(125, '电击兽', '电', ['电']));
      const r = mod.applyBattleAction(st, 'A', '撞击', () => 0.1, { critRate: mod.PVP_CRIT_RATE, critMult: mod.PVP_CRIT_MULT });
      assert.equal(r.error, undefined, tag);
      assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' }, tag);
      assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
      assert.equal(r.events.filter((e) => e.type === 'ability' && e.ability === '叶子防守').length, 0);
    }
  });
  test('合作集成：A 席 470 撞击打馆主 125，rng 0.1——合作无天气，470 麻痹', () => {
    const st = coopState(125, '电', [['电击', '电', 40]],
      desc(470, '叶伊布', '草', ['草']), bobo);
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '电击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
    assert.equal(r.events.filter((e) => e.type === 'ability' && e.ability === '叶子防守').length, 0);
  });
  test('同步回传也被叶子防守挡：晴天时 196 中毒、470 不中毒（回传被挡）；雨天时双方中毒', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      for (const [weather, wantSource, wantSync] of [['sun', null, 0], ['rain', { kind: 'poison' }, 1]]) {
        const target = mk(mod, 196, '太阳伊布', '普通', ['超能力']);
        const source = mk(mod, 470, '叶伊布', '草', ['草']);
        const evs = [];
        mod.applyStatusInflict(target, source, 'poison', '毒刺', R, evs, 'B', 'A', weather);
        assert.deepEqual(target.status, { kind: 'poison' }, `${tag} w=${weather}`);
        assert.deepEqual(source.status, wantSource, `${tag} w=${weather}`);
        assert.equal(evs.filter((e) => e.ability === '同步').length, wantSync, `${tag} w=${weather} ${JSON.stringify(evs)}`);
        if (weather === 'sun') assert.ok(evs.some((e) => e.ability === '叶子防守' && /不会中毒/.test(e.text)), JSON.stringify(evs));
      }
    }
  });
});

describe('172 静电（只验证已实现）', () => {
  test('单元：波波撞击打 172，rng 0.1 → 麻痹＋静电事件；rng 0.5 → 不触发', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const a = mk(mod, 16, '波波', '普通', ['普通', '飞行']);
      const d = mk(mod, 172, '皮丘', '电', ['电']);
      const evs = [];
      mod.applyContactTrigger(a, d, tackle, () => 0.1, evs, 'A', 'B');
      assert.deepEqual(a.status, { kind: 'paralysis' }, tag);
      assert.deepEqual(evs.map((e) => e.text), ['「静电」发动！皮丘 让 波波 麻痹了！', '波波 麻痹了！']);
      const a2 = mk(mod, 16, '波波', '普通', ['普通', '飞行']);
      const d2 = mk(mod, 172, '皮丘', '电', ['电']);
      mod.applyContactTrigger(a2, d2, tackle, () => 0.5, [], 'A', 'B');
      assert.equal(a2.status, null, tag);
    }
  });
  test('道馆集成：玩家波波撞击打馆主 172，rng 0.1 → 玩家麻痹', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const st = gymState(mod, null, bobo, desc(172, '皮丘', '电', ['电']));
      const r = mod.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
      assert.equal(r.error, undefined, tag);
      assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' }, tag);
      assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
    }
  });
  test('PvP 集成：A 波波撞击打 B 172，rng 0.1 → A 麻痹', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const st = pvpState(mod, bobo, desc(172, '皮丘', '电', ['电']));
      const r = mod.applyBattleAction(st, 'A', '撞击', () => 0.1, { critRate: mod.PVP_CRIT_RATE, critMult: mod.PVP_CRIT_MULT });
      assert.equal(r.error, undefined, tag);
      assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' }, tag);
    }
  });
  test('合作集成：单 A 席波波撞击打馆主 172，rng 0.1 → A 麻痹（B 席不出招，馆主活过本回合）', () => {
    const st = coopState(172, '电', [['撞击', '普通', 35]], bobo, bobo);
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.equal(st.round_no, 2);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'paralysis' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '静电'), JSON.stringify(r.events));
  });
});

describe('196/197 同步（只验证已实现）', () => {
  const syncUnit = (mod, no, name) => {
    const a = mk(mod, no, name, '普通', no === 196 ? ['超能力'] : undefined);
    const d = mk(mod, 117, '海刺龙', '水', ['水']);
    const evs = [];
    mod.applyContactTrigger(a, d, tackle, () => 0.1, evs, 'A', 'B');
    return { a, d, evs };
  };
  test('单元 196：撞击打海刺龙（毒刺），rng 0.1 → 双方中毒，同步只传一次', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const { a, d, evs } = syncUnit(mod, 196, '太阳伊布');
      assert.deepEqual(a.status, { kind: 'poison' }, tag);
      assert.deepEqual(d.status, { kind: 'poison' }, tag);
      assert.deepEqual(evs.map((e) => e.text), [
        '「毒刺」发动！海刺龙 让 太阳伊布 中毒了！', '太阳伊布 中毒了！',
        '「同步」发动！太阳伊布 把中毒传给了 海刺龙！', '海刺龙 中毒了！',
      ]);
      assert.equal(evs.filter((e) => e.ability === '同步').length, 1);
    }
  });
  test('单元 197：撞击打海刺龙（毒刺），rng 0.1 → 双方中毒，同步只传一次', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const { a, d, evs } = syncUnit(mod, 197, '月亮伊布');
      assert.deepEqual(a.status, { kind: 'poison' }, tag);
      assert.deepEqual(d.status, { kind: 'poison' }, tag);
      assert.ok(evs.some((e) => e.ability === '同步' && /把中毒传给了/.test(e.text)), JSON.stringify(evs));
      assert.equal(evs.filter((e) => e.ability === '同步').length, 1);
    }
  });
  test('道馆集成 196：玩家 196 撞击打馆主 117，rng 0.1 → 双方中毒', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const st = gymState(mod, null, desc(196, '太阳伊布', '普通', ['超能力']), desc(117, '海刺龙', '水', ['水']));
      const r = mod.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
      assert.equal(r.error, undefined, tag);
      assert.deepEqual(st.sides.A.pets[0].status, { kind: 'poison' }, tag);
      assert.deepEqual(st.sides.B.pets[0].status, { kind: 'poison' }, tag);
      assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '同步'), JSON.stringify(r.events));
    }
  });
  test('道馆集成 197：玩家 197 撞击打馆主 117，rng 0.1 → 双方中毒', () => {
    const st = gymState(M, null, desc(197, '月亮伊布', '普通', undefined), desc(117, '海刺龙', '水', ['水']));
    const r = M.resolveGymRound(st, { moveName: '撞击' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'poison' });
    assert.deepEqual(st.sides.B.pets[0].status, { kind: 'poison' });
    assert.ok(r.events.some((e) => e.type === 'ability' && e.ability === '同步'), JSON.stringify(r.events));
  });
  test('PvP 集成 196：A 196 撞击打 B 117，rng 0.1 → 双方中毒', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const st = pvpState(mod, desc(196, '太阳伊布', '普通', ['超能力']), desc(117, '海刺龙', '水', ['水']));
      const r = mod.applyBattleAction(st, 'A', '撞击', () => 0.1, { critRate: mod.PVP_CRIT_RATE, critMult: mod.PVP_CRIT_MULT });
      assert.equal(r.error, undefined, tag);
      assert.deepEqual(st.sides.A.pets[0].status, { kind: 'poison' }, tag);
      assert.deepEqual(st.sides.B.pets[0].status, { kind: 'poison' }, tag);
      assert.equal(r.events.filter((e) => e.ability === '同步').length, 1);
    }
  });
  test('合作集成 196：A 196＋B 波波撞击打馆主 117，rng 0.1 → A/B/馆主全中毒，同步 1 次', () => {
    const st = coopState(117, '水', [['撞击', '普通', 35]],
      desc(196, '太阳伊布', '普通', ['超能力']), bobo);
    const r = M.resolveCoopRound(st, { A: { type: 'move', moveName: '撞击' }, B: { type: 'move', moveName: '撞击' } }, { kind: 'single', moveName: '撞击', targetSeat: 'A' }, () => 0.1);
    assert.equal(r.error, undefined);
    assert.equal(st.round_no, 2);
    assert.deepEqual(st.sides.A.pets[0].status, { kind: 'poison' });
    assert.deepEqual(st.sides.B.pets[0].status, { kind: 'poison' });
    assert.deepEqual(M.activePetOf(st, 'BOSS').status, { kind: 'poison' });
    assert.equal(r.events.filter((e) => e.ability === '同步').length, 1);
  });
});

// Batch 5（2026-11-18）：700 迷人之躯已实现（见 tests/abilities-151-batch5.test.mjs T1–T13），
// 本 describe 的 700 dormant 测试已删除；仅 471 雪隐仍 dormant（冰雹系统属 Batch 6）。
describe('471 雪隐（dormant）', () => {
  test('471 雪隐：晴/雨速度均不变（无冰雹）；接触触发无 ability 事件、无状态', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      const p = mk(mod, 471, '冰伊布', '普通', undefined);
      assert.equal(mod.effectiveSpeed(p, 'sun'), mod.effectiveSpeed(p), tag);
      assert.equal(mod.effectiveSpeed(p, 'rain'), mod.effectiveSpeed(p), tag);
      const a = mk(mod, 16, '波波', '普通', ['普通', '飞行']);
      const d = mk(mod, 471, '冰伊布', '普通', undefined);
      const evs = [];
      mod.applyContactTrigger(a, d, tackle, () => 0.1, evs, 'A', 'B');
      assert.equal(a.status, null, tag);
      assert.equal(evs.filter((e) => e.type === 'ability').length, 0, tag);
    }
  });
  test('471 是未实现、不是零实效：ABILITY_NO_EFFECT 为 28 种（Batch 11），雪隐仍不在内', () => {
    for (const [tag, mod] of [['M', M], ['L', L]]) {
      assert.deepEqual([...mod.ABILITY_NO_EFFECT], ['坚硬脑袋', '压迫感', '逃跑', '捡拾', '发光', '湿气', '锐利目光', '鳞粉', '我行我素', '蹒跚', '斗争心', '污泥浆', '黏着', '连续攻击', '预知梦', '危险预知', '察觉', '天恩', '穿透', '奇迹皮肤', '友情防守', '治愈之心', '舍身', '强行', '轻装', '贪吃鬼', '收获', '紧张感'], tag);
      assert.equal(mod.ABILITY_NO_EFFECT.has('雪隐'), false);
    }
  });
});
