/* gym 模块（模块化后端 方案A 第 1 步）：从 src/index.js 机械搬出，逻辑零改动。
 * register(route) 用 src/index.js 的 route() 助手注册本模块的全部路由（path/method/auth 与搬出前完全一致）。 */
import { SPECIES } from '../data/species.js';
import { MOVES_OFFICIAL } from '../data/moves-official.js';
import { GYM_STAGES } from '../data/gym-stages.js';
import { GATES_OPEN, ITEM_CATALOG, LINES, LINE_TYPE, PIN_LOCK_MAX, PIN_LOCK_SECS, SKILL_CHARGE_MULT, SKILL_SHELL_MULT, SKILL_SMOKE_MISS, SKILL_WEAK_MULT, abilityOf, addDays, attachEvoForm, attachExMain, attachInstanceAbilities, awardGymClear, battleMaxHp, bossDefTypes, buildPlayerSide, bumpChildVersion, carriedCollection, chineseGatePass, clearedStages, coopDayGateMet, coopMapNodes, coopNode, coopRewardLabel, countersForType, currentHoliday, debugBenchOptions, effBossLevel, effPlayerLevel, englishGatePass, ensureCoopEvent, fnv1aHash, forbidIfOtherChild, formInfo, getChild, getChildMainFriendship, getChildren, getInventoryQty, getMasterEnabled, getSetting, gymFailStreakRecord, hasEvoTable, hasSyncTables, holidayPhase, isWeekendDate, json, latestRematchRequest, levelFromXp, loadChineseGate, loadEnglishGate, loadMathGate, makePet, mathGatePass, moveEffectOf, normalizeQuizRow, notFound404, nowEpoch, officialMove, ownsSpecies, parseJsonSafe, petImg, pvpCountedThisWeek, randToken, readJsonBody, refreshGathering, rematchView, rollRng, runIdempotentCommand, safeJsonArr, scopeChildId, settleBallOverflow, settleGymCore, shDateStr, shParts, sha256hex, skillLevelOf, statsFor, syncTouch, takeItem, touchRow, typeMultOfficialMulti, weekApprovedCount, weekStartMon, withChild } from '../lib/shared.js';


/* ---------------- 战斗系统数据（迁移 0005：道馆闯关 + 兄弟对战，共用引擎） ----------------
 * 铁律：战斗（引擎/闯关/PvP）绝不发经验——本节与战斗接口都不得调用 grantXp 或改 total_xp。
 * 属性集固定 9 种；经典克制表只做弱点（×2），供 PvP 答题对战；PvE 官方口径见 OFFICIAL_MULT（含抗性 ×0.5、免疫 ×0）。 */
const TYPE_CHART = {
  '电': ['水'],
  '水': ['火', '岩石', '地面'],
  '火': ['草'],
  '草': ['水', '岩石'],
  '地面': ['电', '火', '岩石'],
  '岩石': ['火', '飞行'],
  '飞行': ['草'],
  '龙': ['龙'],
  '普通': [],
};

// 单独读取官方命中率，保持 officialMove 的返回形状不变。
function officialAccuracy(name) {
  const accuracy = MOVES_OFFICIAL[name]?.accuracy;
  return Number.isFinite(accuracy) ? accuracy : null;
}
/* 道馆用药（§9.3）：回血药每场 ≤2 次、复活 ≤1 次、强化 ≤1 次（强化道具首期未入池，计数位先留）。
 * 使用消耗一次出招机会；昏厥宠复活当回合不能出招；满血禁止浪费性使用；PvP 不可用。 */
const GYM_ITEM_EFFECTS = {
  'medicine:potion': { kind: 'heal', pct: 25 },
  'medicine:berry-juice': { kind: 'heal', pct: 25 },
  'medicine:super-potion': { kind: 'heal', pct: 50 },
  'medicine:water': { kind: 'heal', pct: 50 },
  'medicine:revive': { kind: 'revive', pct: 50 },
};
const GYM_ITEM_CAPS = { heal: 2, revive: 1, boost: 1 };

/* 道馆闯关梯子：4 关逐个解锁；首通发该关 species 封印蛋 + 点亮徽章；
 * 八关全通另发梦幻(151)封印蛋作终奖。馆主 HP 按各关 hpMult 加成（玩家可带全队，最多 5 只；2026-11-17 8 关扩围）。
 * 馆主招式按招式名定属性（[名称, 属性, 威力]），不再一律用馆主物种属性——
 * 否则如大岩蛇的「大地重压」本应是地面系（克电 ×2）却按岩石计，克制永不触发。
 * 难度参数（bossLevel/hpMult/招式威力）由蒙特卡洛模拟定参（scripts/battle-balance-sim.mjs，
 * 每组 5000 场、玩家用最高威力招式），结论见 DEPLOY.md 第 11 节「2026-10-20 验收调参」。 */
const BOSS_HP_MULT = 1.4; // 兜底默认，各关以 GYM_STAGES.hpMult 为准
/* 道馆平衡（任务 3 追加，2026-11-17）：馆主有效等级跟随孩子有效等级，让属性克制真的咬得住。
 * 配置的馆主等级是下限（门槛等级附近的定参仿真口径不动）；孩子超等级时馆主上浮到
 * 孩子有效等级的 85%，避免高等级孩子靠等级碾压、用错属性也能赢（克制形同虚设）。
 * 系数 0.85 经 S1 仿真（Lv.20 打 S1，N=1000）选定：不跟随则有克制/无克制皆 100%
 *（克制无差别）；跟随 1.0 则无克制 3.1% 成硬墙；跟随 0.85 时无克制 45.3% /
 * 有克制 100%——选错属性明显更难、选对属性有奖励，且无克制仍可赢（不是硬墙）。
 * 与离线引擎（engine-local.js）两边同值，改一处须两边同改。 */
const BOSS_FOLLOW = 0.85;
const effBossBattleLevel = (cfg, childEffLevel) =>
  Math.max(effBossLevel(cfg), Math.floor((Number(childEffLevel) || 1) * BOSS_FOLLOW));

/* ---------------- 道馆每日随机天气（2026-11-17 用户定） ----------------
 * 每个道馆每天独立随机天气（晴/雨/沙暴/无，均等概率）。种子 = 关卡 stage +
 * 上海日期（shDateStr，尊重测试站时间模拟偏移），FNV-1a 哈希取模进池。
 * 同一天同一关在服务端、本地引擎、所有设备上完全一致；半夜（上海日期变更）换天气。
 * 天气对所有孩子相同（种子不含 childId）。开局不再读 cfg.weather（该字段已从
 * GYM_STAGES 删掉，见 gym-stages.js 头注）。
 * 按关卡收窄池（2026-11-17 硬墙修复，仿真 N=1000/格＋N=2000 复核）：
 * S4 草系剔雨天——雨天火系减半，火是打草的主反制，小宝最佳队 0%。
 * S7 火系剔晴天——晴天水系减半，水是打火的主反制，小宝最佳队 0%（2026-11-17 8 关扩围：火系从 S5 移到 S7）。
 * 本函数与本地引擎 engine-local.js 里的同款须逐字一致（见
 * tests/gym-daily-weather.test.mjs 的服务端/离线一致断言），改一处须两边同改。 */
const GYM_WEATHER_POOL = ['sun', 'rain', 'sand', 'hail', null];
/* 收窄池：S4 草剔雨（火减半会堵死打草）、S7 火剔晴（水减半会堵死打火）、S8 地面剔沙暴（岩石特防 1.5×＋沙暴扣血）；其余关完整池。
 * exclusion 跟馆主属性走，不跟关号走：2026-11-17 8 关扩围把火系从 S5 移到 S7，收窄池同步从 S5 改到 S7；
 * 新 S5 毒、S6 超能力用完整池（天气不减半毒/超能力的主反制，仿真确认）。
 * 2026-11-17 设计定稿 8.md 热修：S8 新增剔沙暴（消除钻角犀兽岩石特防 1.5× 与沙暴扣血，解小宝沙暴临界格）。 */
const GYM_WEATHER_POOLS = { 4: ['sun', 'sand', null], 7: ['rain', 'sand', null], 8: ['sun', 'rain', null] };
function gymDailyWeather(stage, dateStr) {
  const pool = GYM_WEATHER_POOLS[Number(stage)] || GYM_WEATHER_POOL;
  const h = fnv1aHash(`${Number(stage)}:${dateStr}`);
  return pool[h % pool.length];
}

/* PvP 专用 HP 倍率（2026-10-24 平衡调整，sim-pvp-balance 定参）：
 * battleMaxHp 被道馆（Boss hpMult 定参）与合作（节点 hpMult 定参）共用，全局公式不动；
 * PvP 双方 maxHp = round(battleMaxHp(压平等级) × PVP_HP_MULT)，只在 PvP 压平/join 路径生效，
 * 使同级对局从约 4–5 招分胜负拉长到约 6–7 招（Lv.5 口径），让防守答题收益累积显形。 */
const PVP_HP_MULT = 1.4;
function pvpMaxHp(level) {
  return Math.round(battleMaxHp(level) * PVP_HP_MULT);
}

function typeMult(atkType, defType) {
  return (TYPE_CHART[atkType] || []).includes(defType) ? 2 : 1;
}

/* 暴击（借鉴包 v1 §1）：每次出招 1/16 概率，伤害 ×1.5，道馆与 PvP 共用本函数 */
const CRIT_RATE = 1 / 16;
const CRIT_MULT = 1.5;

/* PvP 专用暴击（2026-10-24 平衡调整，scripts/sim-pvp-balance.mjs 定参）：
 * 兄弟对战里旧暴击单次增伤 ≈ 一次成功防守的减伤（106%），运气盖过答题；
 * PvP 降为 1/24 概率 ×1.3（单次增伤 ≈ 防守减伤的 60%），保留「会心一击」惊喜。
 * 仅 stagePvpAttack 与 PvP 即时结算兜底经 opts 传入；道馆/合作不传 opts、口径不变。 */
const PVP_CRIT_RATE = 1 / 24;
const PVP_CRIT_MULT = 1.3;

// 优先采用招式官方分类；缺失分类时按三代属性分表，妖精也归特殊。
function moveCategory(move) {
  const category = move.damage_class;
  if (category === '物理' || category === 'physical') return 'physical';
  if (category === '特殊' || category === 'special') return 'special';
  if (category === '变化' || category === 'status') return 'status';
  return ['普通', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢'].includes(move.type)
    ? 'physical' : 'special';
}

/* ---------------- 战斗特性第一期（2026-11-07，用户 D1–D10 按推荐拍板） ----------------
 * D1 默认首特性（abilities[0]；165 种首特性恒为非隐藏）；D2 范围野外 132＋主宠线 12。
 * 本期 9 个特性、5 个改动点：低血量同系强化（茂盛/猛火/激流/虫之预感）、厚脂肪、
 * 飘浮、硬壳盔甲、储水/蓄电。天气/阶段/状态系统不在本期。
 * 乘算顺序（方案 §5.1）：威力修正 → 基础伤害 → STAB → 属性克制 → 防守方特性修正 → 随机 → 暴击；
 * 免疫类（飘浮/储水/蓄电）在克制计算之前短路（mult=0 路径，不消耗随机数）。
 * 叠加口径备查（D10）：友好度闪避与沙隐/雪隐闪避取高不叠加（沙隐/雪隐未实装，届时在命中行取 max）；
 * 硬撑留 1 血与结实/多重鳞片只触发一个，先结实后硬撑（两者未实装，届时硬撑在其后判定）。 */
const LOW_HP_ABILITY_TYPE = { '茂盛': '草', '猛火': '火', '激流': '水', '虫之预感': '虫' };
// 实例特性原始读法（Batch 9 拆出）：pet.ability 优先（实例掷出的实际特性），无实例字段时回落首特性。
// 不含化学变化气体压制；isGasActive 必须用它，不得用 petAbility（否则无限递归）。pet 可为 null。
function rawAbility(pet) {
  if (pet && typeof pet.ability === 'string' && pet.ability) return pet.ability;
  return abilityOf(pet && pet.no);
}
// 化学变化气体是否在场（Batch 9）：任一方上场宠（hp > 0）的原始特性是化学变化气体，即压制全场（含持有者自己，K8）。
// 每次现算：持有者下场／昏厥后自动恢复。
function isGasActive(st) {
  if (!st || !st.sides) return false;
  for (const side of Object.keys(st.sides)) {
    const p = activePetOf(st, side);
    if (p && p.hp > 0 && rawAbility(p) === '化学变化气体') return true;
  }
  return false;
}
// 实例特性读数（战斗结算统一入口，Batch 9 起带可选 st）：st 提供且场上有化学变化气体时返回 null；
// st 不提供时走旧逻辑（向后兼容，单测直调纯函数不传 st 不受影响）。
function petAbility(pet, st) {
  if (st && isGasActive(st)) return null;
  return rawAbility(pet);
}
// 声音类伤害招（隔音免疫；总方案 N1：学招表与 MOVES_OFFICIAL 里会走 calcDamage 的 7 个）。
const SOUND_MOVES = new Set(['巨声', '吵闹', '虫鸣', '回声', '魅惑之声', '打鼾', '轮唱']);
// 拳类招式（Batch 4 铁拳；总方案 N3：官方表与学招表里会走 calcDamage 的 7 个）。
const PUNCH_MOVES = new Set(['雷电拳', '火焰拳', '音速拳', '百万吨重拳', '暗影拳', '冰冻拳', '子弹拳']);
// 特性免疫判定：飘浮免地面、储水免水（吸水回复）、蓄电免电（吸电回复）；其余返 null。
function abilityImmunity(ability, moveType) {
  if (ability === '飘浮' && moveType === '地面') return { heal: false };
  if (ability === '储水' && moveType === '水') return { heal: true };
  if (ability === '蓄电' && moveType === '电') return { heal: true };
  if (ability === '干燥皮肤' && moveType === '水') return { heal: true };
  // 2a：避雷针/电气引擎免疫电系并升档（特攻/速度 +1）。calcDamage 命中时返回 stage，
  // 调用方用 applyAbilityStages 应用；abilityOf 优先级不变（避雷针/电气引擎是首特性时才生效）。
  if (ability === '避雷针' && moveType === '电') return { heal: false, stage: { key: 'spa', delta: 1 } };
  if (ability === '电气引擎' && moveType === '电') return { heal: false, stage: { key: 'spe', delta: 1 } };
  // 扩到 141：引火免疫火系并挂标记（自身火招 ×1.5 直到离场；标记由调用方 applyAbilityFlashFire 挂）。
  if (ability === '引火' && moveType === '火') return { heal: false, flashFire: true };
  return null;
}
// 特性触发文案（战斗日志逐行渲染；调用方在攻击事件之前推入）。healed 为实际回复量（上限后）。
function abilityEventText(e, healed) {
  if (e.kind === 'immune') {
    if (e.name === '飘浮') return `「飘浮」发动！${e.pet} 飘在空中，地面属性招式没有效果！`;
    if (e.name === '储水') return `「储水」发动！${e.pet} 吸收了水属性招式${healed > 0 ? `，回复了 ${healed} 点体力` : '，但体力已满'}！`;
    if (e.name === '蓄电') return `「蓄电」发动！${e.pet} 吸收了电属性招式${healed > 0 ? `，回复了 ${healed} 点体力` : '，但体力已满'}！`;
    if (e.name === '干燥皮肤') return `「干燥皮肤」发动！${e.pet} 吸收了水属性招式${healed > 0 ? `，回复了 ${healed} 点体力` : '，但体力已满'}！`;
    // 2a：避雷针/电气引擎免疫电系并升档（stage 已由调用方 applyAbilityStages 应用）。
    if (e.name === '避雷针') return `「避雷针」发动！${e.pet} 吸收了电属性招式，特攻提升了！`;
    if (e.name === '电气引擎') return `「电气引擎」发动！${e.pet} 吸收了电属性招式，速度提升了！`;
    // 扩到 141：引火免疫火系并挂标记（标记已由调用方 applyAbilityFlashFire 挂）。
    if (e.name === '引火') return `「引火」发动！${e.pet} 吸收了火属性招式，火属性招式威力提升了！`;
    if (e.name === '隔音') return `「隔音」发动！${e.pet} 听不见声音，声音类招式没有效果！`;
  }
  if (e.kind === 'lowhp') return `「${e.name}」发动！${e.pet} 的${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'flashfire') return `「引火」发动！${e.pet} 的火属性招式威力提升了！`;
  // 沙暴特防（第二步）：name 为 '沙暴' 时返回特防文案，不落入通用“威力减弱”分支。
  if (e.kind === 'weather' && e.name === '沙暴') {
    return `沙暴！${e.pet} 借助沙暴提升了特防！`;
  }
  // 天气（第三期简化版）：按招式属性分提升/减弱两支。
  if (e.kind === 'weather') {
    const boosted = (e.name === '大晴天' && e.moveType === '火') || (e.name === '下雨' && e.moveType === '水');
    return `${e.name}！${e.pet} 的${e.moveType}属性招式威力${boosted ? '提升' : '减弱'}了！`;
  }
  if (e.kind === 'thickfat') return `「${e.name}」发动！${e.pet} 受到的${e.moveType}属性伤害减半！`;
  if (e.kind === 'scrappy') return `「胆量」发动！${e.pet} 的招式击中了幽灵属性的对手！`;
  if (e.kind === 'marvelscale') return `「神奇鳞片」发动！${e.pet} 因为异常状态，防御提升了！`;
  if (e.kind === 'solarpower') return `「太阳之力」发动！${e.pet} 在大晴天里特攻提升了！`;
  if (e.kind === 'sandforce') return `「沙之力」发动！${e.pet} 在沙暴里${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'guts') return `「毅力」发动！${e.pet} 带伤作战，物理攻击提升了！`;
  if (e.kind === 'burn') return `${e.pet} 处于灼伤状态，物理攻击减半！`;
  // Batch 4：伤害管线 11 种。
  if (e.kind === 'technician') return `「技术高手」发动！${e.pet} 的${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'ironfist') return `「铁拳」发动！${e.pet} 的${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'pixilate') return `「妖精皮肤」发动！${e.pet} 的一般属性招式变成了妖精属性，威力提升了！`;
  if (e.kind === 'hustle') return `「活力」发动！${e.pet} 的${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'analytic') return `「分析」发动！${e.pet} 后出手，${e.moveType}属性招式威力提升了！`;
  if (e.kind === 'sniper') return `「狙击手」发动！${e.pet} 的会心一击伤害大幅提升了！`;
  if (e.kind === 'tintedlens') return `「有色眼镜」发动！${e.pet} 的招式看穿了对手的抗性，伤害提升了！`;
  if (e.kind === 'adaptability') return `「适应力」发动！${e.pet} 的本系招式威力大幅提升了！`;
  if (e.kind === 'unaware') return `「纯朴」发动！${e.pet} 无视了对手的能力变化！`;
  if (e.kind === 'multiscale') return `「多重鳞片」发动！${e.pet} 体力全满，受到的伤害减半了！`;
  if (e.kind === 'filter') return `「过滤」发动！${e.pet} 受到的效果绝佳伤害减弱了！`;
  if (e.kind === 'dryskin') return `「干燥皮肤」发动！${e.pet} 受到的火属性伤害提升了！`;
  return `「${e.name}」发动！`;
}
function abilityEvents(abilityEntries, atkSide, defSide, healed = 0) {
  return (abilityEntries || []).map((e) => ({
    type: 'ability', side: e.side === 'atk' ? atkSide : defSide, pet: e.pet, ability: e.name,
    text: abilityEventText(e, healed),
  }));
}
// 回复（上限 maxHp）：吸取与特性吸取共用；drainHeal 改走这里，行为不变。
function healPet(pet, amount) {
  if (!pet) return 0;
  const cur = (typeof pet.hp === 'number' && Number.isFinite(pet.hp)) ? pet.hp : 0;
  const cap = (typeof pet.maxHp === 'number' && Number.isFinite(pet.maxHp)) ? pet.maxHp : cur;
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  const next = Math.min(cap, cur + amt);
  const healed = Math.max(0, next - cur);
  pet.hp = cur + healed;
  return healed;
}
// 对一次攻击结算应用特性吸取回复（防守方）：储水/蓄电免疫时回复最大体力 1/4。返回实际回复量。
function applyAbilityHeal(defPet, abilityEntries) {
  let healed = 0;
  for (const e of (abilityEntries || [])) {
    if (e && e.kind === 'immune' && e.heal > 0) healed += healPet(defPet, e.heal);
  }
  return healed;
}
// 友好度硬撑（D10，本次并进第一期）：主宠致命伤按档概率留 1 HP，每场限 1 次。
// 档位：≥153（3 心）10%、≥204（4 心）15%、255（5 心）20%。只进道馆、只作用于主宠。
function endureRate(friendship) {
  const f = Number(friendship) || 0;
  if (f >= 255) return 0.20;
  if (f >= 204) return 0.15;
  if (f >= 153) return 0.10;
  return 0;
}
function tryEndure(st, side, pet, rng) {
  if (!st || !st.gym || side !== 'A') return false;
  if (!pet || pet.key !== 'main') return false; // 只保主宠；备战宠（key dex:{no}）一律不吃加成
  if (st.gym.endureUsed) return false;
  const rate = endureRate(st.gym.friendship);
  if (rate <= 0) return false;
  if (rollRng(rng) >= rate) return false;
  pet.hp = 1;
  st.gym.endureUsed = true;
  return true;
}

// 结实（Batch 10）：满血时致命伤留 1。damage-time cap：在扣血前判定。
// 只在直接招式伤害处调用；状态/天气/引爆/反作用伤害不触发（官方口径，D-2）。
// 化学变化气体压制：经 petAbility(pet, st) 读数（st 必须传，Batch 9 口径，D-4）。
// 触发时 pet.hp 置 1 并推 sturdy 事件，返回 true；未触发返回 false（调用方照常扣血）。
// D10：结实先于友好度硬撑（tryEndure）——触发后 HP 为 1 不进昏厥判定，tryEndure 永不被咨询。
function trySturdy(st, pet, dmg, events, side) {
  if (!st || !pet || typeof pet.hp !== 'number' || !Number.isFinite(pet.hp) || pet.hp <= 0) return false;
  if (!Number.isFinite(dmg) || dmg <= 0 || dmg < pet.hp) return false;
  if (pet.hp !== pet.maxHp) return false;
  if (petAbility(pet, st) !== '结实') return false;
  pet.hp = 1;
  if (Array.isArray(events)) events.push({ type: 'sturdy', side, pet: pet.name, text: `${pet.name} 靠结实撑住了！只剩 1 点体力！` });
  return true;
}

// ---------------- 战斗特性第二期：阶段系统（2a）与状态系统（2b） ----------------
// 2a：能力阶段（atk/def/spa/spd/spe，-6..+6），威吓出场降对方攻击；避雷针/电气引擎免疫
//     电系并升档；恒净之躯/怪力钳挡降档。
// 2b：状态（中毒/麻痹/灼伤/睡眠），接触类特性（静电/毒刺/孢子/火焰之躯）30% 触发，
//     回合末结算（中毒/灼伤扣血、蜕皮治愈、睡眠计数）。睡眠 1–3 回合随机，早起减半。
//     状态下场保留、昏厥时清除；阶段下场清零、昏厥时清零。自然回复下场时清除状态。
const STAGE_KEYS = ['atk', 'def', 'spa', 'spd', 'spe'];
// 字段：pet.infatuated（布尔）。true＝着迷；false／undefined＝未着迷（老对局缺字段即 undefined，按未着迷处理）。
const STATUS_LABEL = { poison: '中毒', paralysis: '麻痹', burn: '灼伤', sleep: '睡眠', infatuation: '着迷' };
// 接触判定（D4）：物理招默认接触，白名单只收含义明确的远程/波动/声音/粉末/气体/炮/
// 吐息/超能力/投掷/地震类招式。名含翅/翼/啄/喙的按接触（翼击类）；含义模糊的一律默认接触。
// 官方物理招（53 条）均为接触（地震/尖石攻击等 7 条在白名单内）；主宠/馆主招式名均为接触。
const NON_CONTACT_MOVES = new Set([
  // 官方招式（7 条）：地震与岩石系远程
  '地震', '尖石攻击', '岩崩', '岩石封锁', '落石', '重踏', '飞叶快刀',
  // 原创招式（56 条）：粉末/气体/炮/吐息/超能力/投掷/波动/声音/地震类
  '蝶粉飞舞', '鳞粉风暴', '毒粉旋风', '毒雾旋涡', '毒烟弥漫', '毒雾喷发', '污泥泼洒',
  '泥巴投掷', '金币飞镖', '招财金币', '落石小雨', '落石重雨', '岩石巨炮', '岩石重炮',
  '古海重炮', '王者地震', '地震小浪', '怒涛龙卷', '暴怒龙息', '远古咆哮', '草原疾风',
  '超音波', '超音巨波', '催眠歌谣', '月光小曲', '月光大曲', '摇篮小曲', '梦境低语',
  '口水飞溅', '毒液喷溅', '幽影飘忽', '黑雾缠绕', '暗影爆裂', '梦幻泡泡', '心灵星光',
  '晨光念力', '预知未来', '月光守护', '暗影球', '数据重组', '虚拟冲击', '百变模仿',
  '汤匙弯曲', '念力瞬移', '汤匙重击', '念力冲击', '双匙念力', '超能风暴', '复眼凝视',
  '迷唇飞吻', '眼镜蛇威吓', '臭泥巨浪', '剧毒泥沼', '瓦斯爆破', '双弹齐爆', '岩石利刃',
]);
function isContactMove(move) {
  if (!move || typeof move !== 'object') return false;
  const name = move.name || '';
  if (NON_CONTACT_MOVES.has(name)) return false;
  // damage_class 缺失时按 moveCategory 回落（与 moveCategory 同口径）：原创招式在生产里
  // damage_class 为 undefined（只官方招带），不回落则 292 原创招永远不触发接触。
  const cat = move.damage_class || moveCategory(move);
  return cat === 'physical';
}
// 阶段倍率：>=0 时 (2+s)/2，<0 时 2/(2-s)。s 取整钳制在 -6..+6。
function stageMult(s) {
  const v = Math.max(-6, Math.min(6, Math.round(s || 0)));
  return v >= 0 ? (2 + v) / 2 : 2 / (2 - v);
}
// 防御性补全：旧存量对局/旧存档的宠可能没有 stages/status 字段。
function stagesOf(pet) {
  if (!pet) return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (!pet.stages || typeof pet.stages !== 'object') pet.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const k of STAGE_KEYS) if (typeof pet.stages[k] !== 'number') pet.stages[k] = 0;
  return pet.stages;
}
function resetStages(pet) {
  if (!pet) return;
  pet.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}
// 昏厥时清除状态与阶段（不推事件）；下场换宠时只清阶段（onPetLeavesField 处理状态）。
function clearPetBattleState(pet) {
  if (!pet) return;
  revertTransform(pet); // 变身随昏厥结束（复活后恢复原形）
  pet.status = null;
  pet.infatuated = false;
  pet.flinch = false;
  pet.flashFire = false; // 引火标记随昏厥清除。
  pet.disabledMove = null; // 定身（Batch 9）：昏厥清除。
  if (pet._traced) { pet.ability = '复制'; pet._traced = false; } // 复制（Batch 9 D-10）：昏厥还原。
  resetStages(pet);
}
// 改档：返回 {applied, blocked, guard, from, to}。守卫挡下时不改档。
function changeStage(pet, key, delta, st) {
  const stg = stagesOf(pet);
  const from = stg[key];
  let blocked = false, guard = null;
  if (delta < 0) {
    const ab = petAbility(pet, st);
    if (ab === '恒净之躯') { blocked = true; guard = '恒净之躯'; }
    else if (ab === '怪力钳' && key === 'atk') { blocked = true; guard = '怪力钳'; }
    else if (ab === '健壮胸肌' && key === 'def') { blocked = true; guard = '健壮胸肌'; }
  }
  if (blocked) return { applied: false, blocked: true, guard, from, to: from };
  const to = Math.max(-6, Math.min(6, from + delta));
  stg[key] = to;
  return { applied: to !== from, blocked: false, guard: null, from, to };
}
function weatherPowerMod(kind, moveType) {
  if (kind === 'sun') return moveType === '火' ? 1.5 : moveType === '水' ? 0.5 : 1;
  if (kind === 'rain') return moveType === '水' ? 1.5 : moveType === '火' ? 0.5 : 1;
  return 1;
}
// 速度（D6）：只用于道馆出招顺序；PvP 不看速度（先后手按行动顺序）。
// 天气速度加成（叶绿素晴天×2、悠游自如雨天×2）只影响道馆，由调用方传天气。
function effectiveSpeed(pet, weatherKind, st) {
  if (!pet || !pet.stats) return 0;
  let v = pet.stats.speed * stageMult(stagesOf(pet).spe);
  if (pet.status && pet.status.kind === 'paralysis') v *= 0.5;
  const ab = petAbility(pet, st);
  if (ab === '飞毛腿' && pet.status) v *= 1.5;
  else if (weatherKind === 'sun' && ab === '叶绿素') v *= 2;
  else if (weatherKind === 'rain' && ab === '悠游自如') v *= 2;
  else if (weatherKind === 'sand' && ab === '拨沙') v *= 2;
  return v;
}
// 对手的各席（道馆/PvP：另一方；合作：BOSS 的对手是 A、B；A/B 的对手是 BOSS）。
function foeSidesOf(st, side) {
  if (side === 'BOSS') return ['A', 'B'];
  if (st && st.sides && st.sides.BOSS) return ['BOSS'];
  return [side === 'A' ? 'B' : 'A'];
}
// 出场钩子：side 的上场宠按其特性触发。威吓降对方攻击；下载按对手较低防御升对应攻击；
// 变身者变身成对手的样子。对方无宠/已昏厥/被守卫挡下时按规则推事件（挡下推守卫事件；对方无宠时不推）。
// 在 createBattleState、换宠顶上、PvP 加入时调用。
// Switch trap (Batch 7, B-3): foe active pet with Magnet Pull / Arena Trap blocks switching.
// Returns null = can switch; {blocked:true, ability} = trapped.
// Arena Trap traps any foe (D-1); Magnet Pull traps Steel foes only (D-4).
function canSwitchOut(st, side) {
  const foeSide = foeSidesOf(st, side)[0];
  const foePet = foeSide ? activePetOf(st, foeSide) : null;
  if (!foePet || !(foePet.hp > 0)) return null;
  const ab = petAbility(foePet, st);
  if (ab === '沙穴') return { blocked: true, ability: '沙穴' };
  if (ab === '磁力') {
    const myPet = activePetOf(st, side);
    const types = (myPet && Array.isArray(myPet.defTypes) && myPet.defTypes.length) ? myPet.defTypes : (myPet ? [myPet.type] : []);
    if (types.includes('钢')) return { blocked: true, ability: '磁力' };
  }
  return null;
}
function triggerSwitchIn(st, side, events) {
  const pet = activePetOf(st, side);
  if (!pet || !(pet.hp > 0)) return;
  const ab = petAbility(pet, st);
  if (ab === '威吓') {
    for (const foeSide of foeSidesOf(st, side)) {
      const foePet = activePetOf(st, foeSide);
      if (!foePet || !(foePet.hp > 0)) continue;
      const r = changeStage(foePet, 'atk', -1, st);
      if (r.blocked) {
        events.push({ type: 'ability', side: foeSide, pet: foePet.name, ability: r.guard, text: `「${r.guard}」发动！${foePet.name} 的${r.guard === '健壮胸肌' ? '防御' : '攻击'}不会降低！` });
      } else if (r.applied) {
        events.push({ type: 'ability', side, pet: pet.name, ability: '威吓', text: `「威吓」发动！${pet.name} 出场，${foePet.name} 的攻击降低了！` });
        // 不服输／好胜（Batch 2）：降档成功后触发（只对对手造成的降档；本引擎唯一降档源即威吓）。
        const foeAb = petAbility(foePet, st);
        if (foeAb === '不服输') {
          const r2 = changeStage(foePet, 'atk', 2, st);
          if (r2.applied) events.push({ type: 'ability', side: foeSide, pet: foePet.name, ability: '不服输', text: `「不服输」发动！${foePet.name} 的攻击提升了！` });
        } else if (foeAb === '好胜') {
          const r2 = changeStage(foePet, 'spa', 2, st);
          if (r2.applied) events.push({ type: 'ability', side: foeSide, pet: foePet.name, ability: '好胜', text: `「好胜」发动！${foePet.name} 的特攻提升了！` });
        }
      }
    }
  } else if (ab === '下载') {
    // 下载（Batch 2）：出场时按对手较低防御提升对应攻击 1 级。比较用对手 raw stats（不含阶段修正）。
    // 对手防御 < 特防 → 攻击 +1；否则（防御 >= 特防）→ 特攻 +1。无对手／对手昏厥／无 stats 时不触发。
    const foeSide = foeSidesOf(st, side)[0];
    const foePet = foeSide ? activePetOf(st, foeSide) : null;
    if (foePet && foePet.hp > 0 && foePet.stats && Number.isFinite(foePet.stats.defense) && Number.isFinite(foePet.stats.sp_defense)) {
      const key = foePet.stats.defense < foePet.stats.sp_defense ? 'atk' : 'spa';
      const r = changeStage(pet, key, 1, st);
      if (r.applied) events.push({ type: 'ability', side, pet: pet.name, ability: '下载', text: `「下载」发动！${pet.name} 的${key === 'atk' ? '攻击' : '特攻'}提升了！` });
    }
  } else if (ab === '变身者') {
    // 变身者（Batch 2）：出场时变身成对手的样子。调现有 applyTransform（R3：永远复制目标首特性，不改口径）。
    const foeSide = foeSidesOf(st, side)[0];
    const foePet = foeSide ? activePetOf(st, foeSide) : null;
    if (foePet && foePet.hp > 0) {
      const copied = applyTransform(pet, foePet);
      if (copied) events.push({ type: 'ability', side, pet: pet.name, ability: '变身者', text: `「变身者」发动！${pet.name} 变成了 ${copied.name} 的样子！` });
    }
  } else if (ab === '日照') {
    // 日照（Batch 8）：出场时把天气设为大晴天，覆盖关卡天气（K4）。
    st.weather = { kind: 'sun' };
    events.push({ type: 'ability', side, pet: pet.name, ability: '日照', text: `「日照」发动！${pet.name} 出场，大晴天出现了！` });
  } else if (ab === '复制') {
    // 复制（Batch 9）：出场时复制对手当前生效特性（petAbility，口径与变身 R3 不同，见任务单 §0.3）。
    // 对手不存在／昏厥／特性为 null（被化学变化气体压制或无特性）时不触发；复制到同名特性也照常写字段、推事件（D-1，不去重）。
    const foeSide = foeSidesOf(st, side)[0];
    const foePet = foeSide ? activePetOf(st, foeSide) : null;
    if (foePet && foePet.hp > 0) {
      const foeAb = petAbility(foePet, st);
      if (foeAb) {
        pet.ability = foeAb;
        pet._traced = true; // 复制（Batch 9 D-10）：下场还原用标记。
        events.push({ type: 'ability', side, pet: pet.name, ability: '复制', text: `「复制」发动！${pet.name} 复制了 ${foePet.name} 的「${foeAb}」！` });
      }
    }
  }
}
// 下场钩子（主动换宠时调用）：清阶段；自然回复下场时清除状态并推事件。昏厥不走这里。
function onPetLeavesField(st, side, pet, events) {
  if (!pet) return;
  revertTransform(pet); // 变身只在场上有效，下场还原
  resetStages(pet);
  pet.flashFire = false; // 引火（扩到 141）：标记只在场上有效，离场清除。
  pet.disabledMove = null; // 定身（Batch 9）：下场清除。
  if (pet._traced) { pet.ability = '复制'; pet._traced = false; } // 复制（Batch 9 D-10）：下场还原。
  if (pet.infatuated) {
    pet.infatuated = false;
    events.push({ type: 'status', side, pet: pet.name, kind: 'infatuation-end', text: `${pet.name} 的着迷解除了！` });
  }
  if (pet.flinch) {
    pet.flinch = false;
    events.push({ type: 'status', side, pet: pet.name, kind: 'flinch-end', text: `${pet.name} 的畏缩解除了！` });
  }
  if (pet.status && petAbility(pet, st) === '自然回复') {
    const kind = pet.status.kind;
    pet.status = null;
    events.push({ type: 'ability', side, pet: pet.name, ability: '自然回复', text: `「自然回复」发动！${pet.name} 下场后恢复了健康，${STATUS_LABEL[kind]}治愈了！` });
  }
  if (pet.hp > 0 && petAbility(pet, st) === '再生力') {
    const healed = healPet(pet, Math.floor(pet.maxHp / 3));
    if (healed > 0) events.push({ type: 'ability', side, pet: pet.name, ability: '再生力', text: `「再生力」发动！${pet.name} 下场后回复了 ${healed} 点体力！` });
  }
}
// 状态免疫：返回 null=可挂；'type'=属性免疫（毒/钢免中毒、电免麻痹、火免灼伤）；
// 'ability'=特性守卫（免疫挡中毒、柔软挡麻痹、干劲/不眠挡睡眠、叶子防守晴天挡四种）。
// weatherKind：叶子防守只在大晴天（'sun'）挡；无天气/雨天不挡（天气简化版只有晴/雨两态）。
function statusImmunityReason(pet, kind, weatherKind, st) {
  if (!pet) return null;
  const types = pet.defTypes && pet.defTypes.length ? pet.defTypes : [pet.type];
  if (kind === 'poison' && (types.includes('毒') || types.includes('钢'))) return 'type';
  if (kind === 'paralysis' && types.includes('电')) return 'type';
  if (kind === 'burn' && types.includes('火')) return 'type';
  const ab = petAbility(pet, st);
  if (kind === 'poison' && ab === '免疫') return 'ability';
  if (kind === 'paralysis' && ab === '柔软') return 'ability';
  if (kind === 'sleep' && (ab === '干劲' || ab === '不眠')) return 'ability';
  if (kind === 'burn' && ab === '水幕') return 'ability';
  // 扩到 165：叶子防守——大晴天时不陷入任何异常状态（中毒/麻痹/灼伤/睡眠四种全挡）。
  if (ab === '叶子防守' && weatherKind === 'sun') return 'ability';
  return null;
}
// 低层挂状态：返回 null=无事发生（已有状态/昏厥）；{blocked, event} 被免疫挡下；
// {inflicted, event} 挂上。睡眠 1–3 回合随机，早起减半（ceil，最少 1）。不同步。
// weatherKind 透传 statusImmunityReason（叶子防守只在晴天挡；不传则按无天气处理）。
function tryInflictStatus(targetPet, kind, rng, targetSide, weatherKind, st) {
  if (!targetPet || !(targetPet.hp > 0) || targetPet.status) return null;
  const blocked = statusImmunityReason(targetPet, kind, weatherKind, st);
  if (blocked) {
    if (blocked === 'ability') {
      const guard = petAbility(targetPet, st);
      return { blocked: true, event: { type: 'ability', side: targetSide, pet: targetPet.name, ability: guard, text: `「${guard}」发动！${targetPet.name} 不会${STATUS_LABEL[kind]}！` } };
    }
    return { blocked: true, event: { type: 'status', side: targetSide, pet: targetPet.name, kind: 'immune', text: `${targetPet.name} 不会${STATUS_LABEL[kind]}！` } };
  }
  let sleepTurns = 0;
  if (kind === 'sleep') {
    sleepTurns = 1 + Math.floor(rollRng(rng) * 3);
    if (petAbility(targetPet, st) === '早起') sleepTurns = Math.max(1, Math.ceil(sleepTurns / 2));
  }
  targetPet.status = sleepTurns ? { kind, sleepTurns } : { kind };
  return { inflicted: true, event: { type: 'status', side: targetSide, pet: targetPet.name, kind, text: `${targetPet.name} ${STATUS_LABEL[kind]}了！` } };
}
// 挂状态＋特性文案＋同步回传（只传一次，不连锁）。causeAbility 为触发特性名（静电/毒刺/孢子/火焰之躯）。
// weatherKind 透传 tryInflictStatus（叶子防守只在晴天挡；同步回传的第二次挂状态同样受挡）。
// 挂着迷：返回 null=无事发生（已着迷／昏厥／迟钝挡下时返回 {blocked} 另见下）；
// {blocked, event} 被迟钝挡下；{inflicted, event} 挂上。着迷与 pet.status 共存，不读不写 pet.status。
// 注意：tryInflictStatus / applyStatusInflict 永不传 'infatuation'（红线）；迟钝守卫只在这里，不进 statusImmunityReason。
function tryInflictInfatuation(targetPet, rng, targetSide, st) {
  if (!targetPet || !(targetPet.hp > 0) || targetPet.infatuated) return null;
  if (petAbility(targetPet, st) === '迟钝') {
    return { blocked: true, event: { type: 'ability', side: targetSide, pet: targetPet.name, ability: '迟钝', text: `「迟钝」发动！${targetPet.name} 不会着迷！` } };
  }
  targetPet.infatuated = true;
  return { inflicted: true, event: { type: 'status', side: targetSide, pet: targetPet.name, kind: 'infatuation', text: `${targetPet.name} 着迷了！` } };
}
function tryInflictFlinch(targetPet, rng, targetSide, st) {
  if (!targetPet || !(targetPet.hp > 0) || targetPet.flinch) return null;
  if (petAbility(targetPet, st) === '精神力') {
    return { blocked: true, event: { type: 'ability', side: targetSide, pet: targetPet.name, ability: '精神力', text: `「精神力」发动！${targetPet.name} 不会畏缩！` } };
  }
  targetPet.flinch = true;
  const out = { inflicted: true, event: { type: 'status', side: targetSide, pet: targetPet.name, kind: 'flinch', text: `${targetPet.name} 畏缩了！` }, steadfast: null };
  if (petAbility(targetPet, st) === '不屈之心') {
    const r = changeStage(targetPet, 'spe', 1, st);
    if (r.applied) out.steadfast = { type: 'ability', side: targetSide, pet: targetPet.name, ability: '不屈之心', text: `「不屈之心」发动！${targetPet.name} 的速度提升了！` };
  }
  return out;
}
function applyStatusInflict(targetPet, sourcePet, kind, causeAbility, rng, events, targetSide, sourceSide, weatherKind, st) {
  const r = tryInflictStatus(targetPet, kind, rng, targetSide, weatherKind, st);
  if (!r) return false;
  if (r.blocked) { events.push(r.event); return false; }
  events.push({ type: 'ability', side: sourceSide, pet: sourcePet.name, ability: causeAbility, text: `「${causeAbility}」发动！${sourcePet.name} 让 ${targetPet.name} ${STATUS_LABEL[kind]}了！` });
  events.push(r.event);
  // 同步：受状态方有同步时，把状态传给对方（只传一次，不连锁）。
  if (petAbility(targetPet, st) === '同步' && sourcePet && sourcePet !== targetPet) {
    const r2 = tryInflictStatus(sourcePet, kind, rng, sourceSide, weatherKind, st);
    if (r2) {
      if (r2.inflicted) {
        events.push({ type: 'ability', side: targetSide, pet: targetPet.name, ability: '同步', text: `「同步」发动！${targetPet.name} 把${STATUS_LABEL[kind]}传给了 ${sourcePet.name}！` });
        events.push(r2.event);
      } else if (r2.blocked) events.push(r2.event);
    }
  }
  return true;
}
// 接触触发：伤害结算后、昏厥判定后调用。仅防守方存活（hp>0）且招式为接触时掷 30%。
// 静电→麻痹、毒刺→中毒、火焰之躯→灼伤；孢子 30% 触发后三态随机（各 1/3）。
// 按宠引用传参（不从 st 取上场宠）：昏厥顶上后上场宠已变，触发对象应是被打中的那只。
// weatherKind 透传 applyStatusInflict（叶子防守只在晴天挡；调用方从 st.weather 取）。
function applyContactTrigger(atkPet, defPet, move, rng, events, atkSide, defSide, weatherKind, st) {
  if (!atkPet || !defPet || !(defPet.hp > 0) || !(atkPet.hp > 0)) return;
  if (!isContactMove(move)) return;
  if (petAbility(atkPet, st) === '破格') return;
  const ab = petAbility(defPet, st);
  let kind = null;
  if (ab === '静电') kind = 'paralysis';
  else if (ab === '毒刺') kind = 'poison';
  else if (ab === '火焰之躯') kind = 'burn';
  else if (ab === '孢子') {
    if (rollRng(rng) >= 0.3) return;
    const pick = rollRng(rng);
    kind = pick < 1 / 3 ? 'paralysis' : pick < 2 / 3 ? 'poison' : 'sleep';
    applyStatusInflict(atkPet, defPet, kind, ab, rng, events, atkSide, defSide, weatherKind, st);
    return;
  } else if (ab === '迷人之躯') {
    if (rollRng(rng) >= 0.3) return;
    const r = tryInflictInfatuation(atkPet, rng, atkSide, st);
    if (!r) return;
    if (r.blocked) {
      events.push(r.event);
      return;
    }
    events.push({ type: 'ability', side: defSide, pet: defPet.name, ability: '迷人之躯', text: `「迷人之躯」发动！${defPet.name} 让 ${atkPet.name} 着迷了！` });
    events.push(r.event);
    return;
  } else return;
  if (rollRng(rng) >= 0.3) return;
  applyStatusInflict(atkPet, defPet, kind, ab, rng, events, atkSide, defSide, weatherKind, st);
}
// 毒手（Batch 3）：攻击方接触触发——用接触招式造成伤害后，30% 使对方中毒。
// 与 applyContactTrigger（防守方）镜像：守卫双方存活＋接触；掷骰独立（防守方先掷、攻击方后掷）。
function applyAttackerContactTrigger(atkPet, defPet, move, rng, events, atkSide, defSide, weatherKind, st) {
  if (!atkPet || !defPet || !(defPet.hp > 0) || !(atkPet.hp > 0)) return;
  if (!isContactMove(move)) return;
  if (petAbility(atkPet, st) !== '毒手') return;
  if (rollRng(rng) >= 0.3) return;
  applyStatusInflict(defPet, atkPet, 'poison', '毒手', rng, events, defSide, atkSide, weatherKind, st);
}
// 结算后触发（Batch 2）：防守方被伤害招命中后，按其特性触发阶段变化。零 rng。
// 条件：dmg > 0、未落空（missed !== true）、防守方存活（hp > 0）。
// hit = { moveType, category, critical, dmg, missed }：
//   moveType——本次命中的招式属性（与 calcDamage 同口径：官方分支取 officialMove(move.name)?.type ?? move.type；
//     经典分支取 move.type；PvP 防守结算取 staged.moveType）；
//   category——'physical' | 'special' | 'status'（moveCategory 的结果；PvP 防守结算取 staged.category，
//     手工构造的 staged 对象无 category 时回落官方 damage_class 再按属性回落）；
//   critical——本次是否会心一击；dmg——实际造成伤害（落账后值）；missed——是否落空。
// 事件直接推（仿 triggerSwitchIn 的威吓写法），文案以此为准（§3.6）。
function applyStenchFlinch(atkPet, defPet, move, rng, events, atkSide, defSide, st) {
  if (!atkPet || !defPet || !(defPet.hp > 0) || !(atkPet.hp > 0)) return;
  if (petAbility(atkPet, st) !== '恶臭') return;
  if (rollRng(rng) >= 0.1) return;
  const r = tryInflictFlinch(defPet, rng, defSide, st);
  if (!r) return;
  if (r.blocked) {
    events.push(r.event);
    return;
  }
  events.push({ type: 'ability', side: atkSide, pet: atkPet.name, ability: '恶臭', text: `「恶臭」发动！${atkPet.name} 让 ${defPet.name} 畏缩了！` });
  events.push(r.event);
  if (r.steadfast) events.push(r.steadfast);
}
function applyHitAbilityTriggers(atkPet, defPet, hit, events, atkSide, defSide, st) {
  if (!atkPet || !defPet || !(defPet.hp > 0)) return;
  if (!hit || !(hit.dmg > 0) || hit.missed === true) return;
  if (petAbility(atkPet, st) === '破格') return;
  const ab = petAbility(defPet, st);
  if (ab === '正义之心' && hit.moveType === '恶') {
    const r = changeStage(defPet, 'atk', 1, st);
    if (r.applied) events.push({ type: 'ability', side: defSide, pet: defPet.name, ability: '正义之心', text: `「正义之心」发动！${defPet.name} 的攻击提升了！` });
  } else if (ab === '碎裂铠甲' && hit.category === 'physical') {
    const r1 = changeStage(defPet, 'spe', 1, st);
    const r2 = changeStage(defPet, 'def', -1, st);
    if (r1.applied || r2.applied) events.push({ type: 'ability', side: defSide, pet: defPet.name, ability: '碎裂铠甲', text: `「碎裂铠甲」发动！${defPet.name} 的速度提升了，防御降低了！` });
  } else if (ab === '胆怯' && (hit.moveType === '恶' || hit.moveType === '幽灵' || hit.moveType === '虫')) {
    const r = changeStage(defPet, 'spe', 1, st);
    if (r.applied) events.push({ type: 'ability', side: defSide, pet: defPet.name, ability: '胆怯', text: `「胆怯」发动！${defPet.name} 的速度提升了！` });
  } else if (ab === '愤怒穴位' && hit.critical === true) {
    const r = changeStage(defPet, 'atk', 6 - stagesOf(defPet).atk, st);
    if (r.applied) events.push({ type: 'ability', side: defSide, pet: defPet.name, ability: '愤怒穴位', text: `「愤怒穴位」发动！${defPet.name} 的攻击提升到最大了！` });
  }
}

// 诅咒之躯（Batch 9）：防守方被伤害招命中后，30% 使攻击方该招式陷入定身状态（atkPet.disabledMove）。
// 调用点与 applyHitAbilityTriggers 相同（hit.dmg > 0 且未落空时才调）；破格绕过（攻击方带破格时不触发）。
// rng 顺序：先判破格／特性／已定身（零 rng），最后才掷 30%。
function applyCursedBody(defPet, atkPet, moveName, rng, events, defSide, atkSide, st) {
  if (!defPet || !atkPet || !(defPet.hp > 0) || !(atkPet.hp > 0)) return;
  if (petAbility(atkPet, st) === '破格') return;
  if (petAbility(defPet, st) !== '诅咒之躯') return;
  if (!moveName) return;
  if (atkPet.disabledMove === moveName) return;
  if (rollRng(rng) >= 0.3) return;
  atkPet.disabledMove = moveName;
  events.push({ type: 'ability', side: defSide, pet: defPet.name, ability: '诅咒之躯', text: `「诅咒之躯」发动！${atkPet.name} 的「${moveName}」陷入了定身状态！` });
}

// 自信过度（Batch 2）：攻击方打倒对手时攻击 +1。零 rng。
// 只在“直接命中致昏”时调用（settleAfterDamage 第一部分、道馆两条结算路径的昏厥分支）；
// 状态回合末扣血致昏不调用（§4 D12）；合作战不调用（§4 D11）。
function applyMoxie(attacker, events, side, st) {
  if (!attacker || !(attacker.hp > 0)) return;
  if (petAbility(attacker, st) !== '自信过度') return;
  const r = changeStage(attacker, 'atk', 1, st);
  if (r.applied) events.push({ type: 'ability', side, pet: attacker.name, ability: '自信过度', text: `「自信过度」发动！${attacker.name} 打倒了对手，攻击提升了！` });
}
// 引爆（Batch 3）：带引爆的宠被接触招式打倒时，攻击方损失 1/4 最大体力（至少 1 点）。
// 只在“直接命中致昏”时调用；状态回合末扣血致昏不调用。零 rng。
function applyAftermath(attacker, defender, killingMove, events, defSide, st) {
  if (!attacker || !defender || !(attacker.hp > 0)) return 0;
  if (petAbility(attacker, st) === '破格') return 0;
  if (petAbility(defender, st) !== '引爆') return 0;
  if (!killingMove || !isContactMove(killingMove)) return 0;
  const dmg = Math.max(1, Math.floor(attacker.maxHp / 4));
  attacker.hp = Math.max(0, attacker.hp - dmg);
  events.push({ type: 'ability', side: defSide, pet: defender.name, ability: '引爆', text: `「引爆」发动！${defender.name} 倒下时引爆了，${attacker.name} 损失了 ${dmg} 点体力！` });
  return dmg;
}
// 行动阻断：睡眠直接跳过（不消耗回合计数外的 rng）；麻痹 25% 无法行动。
// 返回 null=可行动；'sleep'/'paralysis'=被阻断。
// 行动阻断：睡眠直接跳过（不消耗回合计数外的 rng）；麻痹 25% 无法行动；着迷 50% 无法行动。
// 返回 null=可行动；'sleep'/'paralysis'/'infatuation'=被阻断。
// 检定顺序固定为睡眠→麻痹→着迷；睡眠不耗 rng，麻痹与着迷各耗 1 次（仅当走到该分支时）。
function statusBlocksAction(pet, rng) {
  if (!pet) return null;
  if (pet.status && pet.status.kind === 'sleep') return 'sleep';
  if (pet.status && pet.status.kind === 'paralysis' && rollRng(rng) < 0.25) return 'paralysis';
  if (pet.infatuated && rollRng(rng) < 0.5) return 'infatuation';
  if (pet.flinch) { pet.flinch = false; return 'flinch'; }
  return null;
}
// 阻断文案集中处：新增阻断态只改这里。9 处调用点（:3537、:3787、:10818、:10830、:10903、:15111、:15175、:15203、:15233）
// 一律改调本函数，不得留三元（否则 'infatuation' 会落入麻痹分支）。
function statusBlockedText(blocked, petName) {
  if (blocked === 'sleep') return `${petName} 睡着了，不能行动！`;
  if (blocked === 'paralysis') return `${petName} 麻痹了，动不了！`;
  if (blocked === 'flinch') return `${petName} 畏缩了，无法行动！`;
  return `${petName} 着迷了，无法行动！`;
}
// 回合末结算（单宠）：中毒/灼伤扣 max(1, floor(maxHp/8))；蜕皮回合末 33% 治愈
// （扣血之后判、昏厥不治愈）；睡眠计数减 1、到 0 醒来。返回 {dmg, cured, woke}。
function settleStatusTick(pet, rng, events, side, st) {
  if (!pet || !(pet.hp > 0) || !pet.status) return { dmg: 0, cured: false, woke: false };
  const kind = pet.status.kind;
  let dmg = 0, cured = false, woke = false;
  if (kind === 'poison' || kind === 'burn') {
    if (petAbility(pet, st) === '魔法防守') {
      // 魔法防守（Batch 3）：跳过间接扣血，保留异常状态；事件由 tickActiveStatuses 统一推一条。
    } else {
      dmg = Math.max(1, Math.floor(pet.maxHp / 8));
      pet.hp = Math.max(0, pet.hp - dmg);
      events.push({ type: 'status', side, pet: pet.name, kind, text: kind === 'poison' ? `${pet.name} 受到了毒的伤害！（-${dmg}）` : `${pet.name} 受到了灼伤的伤害！（-${dmg}）` });
    }
  }
  if (pet.hp <= 0) return { dmg, cured: false, woke: false };
  if (petAbility(pet, st) === '蜕皮' && pet.status && rollRng(rng) < 1 / 3) {
    const k2 = pet.status.kind;
    pet.status = null;
    cured = true;
    events.push({ type: 'ability', side, pet: pet.name, ability: '蜕皮', text: `「蜕皮」发动！${pet.name} 的${STATUS_LABEL[k2]}治愈了！` });
  }
  if (pet.status && pet.status.kind === 'sleep') {
    pet.status.sleepTurns -= 1;
    if (pet.status.sleepTurns <= 0) {
      pet.status = null;
      woke = true;
      events.push({ type: 'status', side, pet: pet.name, kind: 'wake', text: `${pet.name} 醒来了！` });
    }
  }
  return { dmg, cured, woke };
}
// 沙暴免疫（Batch 3）：岩石／地面／钢属性，或特性防尘／拨沙／沙之力。
function isSandImmune(pet, st) {
  if (!pet) return false;
  const types = pet.defTypes || [pet.type];
  if (types.some((t) => t === '岩石' || t === '地面' || t === '钢')) return true;
  const ab = petAbility(pet, st);
  return ab === '防尘' || ab === '拨沙' || ab === '沙之力';
}
// 回合末结算（全场）：按 sides 顺序结算各方上场宠的状态。返回昏厥的 [{side, pet}]（不推 faint 事件，调用方处理）。
// 冰雹免疫（Batch 8）：冰属性或雪隐特性不受冰雹伤害（仿 isSandImmune）。
function isHailImmune(pet, st) {
  if (!pet) return false;
  const types = pet.defTypes || [pet.type];
  if (types.some((t) => t === '冰')) return true;
  return petAbility(pet, st) === '雪隐';
}
function tickActiveStatuses(st, rng, events) {
  const fainted = [];
  if (!st || !st.sides) return fainted;
  const weatherOff = Object.keys(st.sides).some((s) => {
    const p = activePetOf(st, s);
    return p && petAbility(p, st) === '无关天气';
  });
  const weatherKind = weatherOff ? null : (st.weather && st.weather.kind);
  for (const side of Object.keys(st.sides)) {
    const pet = activePetOf(st, side);
    if (!pet) continue;
    const before = pet.hp;
    const hadStatus = pet.status ? pet.status.kind : null;
    const mg = petAbility(pet, st) === '魔法防守';
    settleStatusTick(pet, rng, events, side, st);
    if (weatherKind === 'sand' && pet.hp > 0 && !mg && !isSandImmune(pet, st)) {
      const dmg = Math.max(1, Math.floor(pet.maxHp / 16));
      pet.hp = Math.max(0, pet.hp - dmg);
      events.push({ type: 'weather', kind: 'sand', side, pet: pet.name, text: `沙暴！${pet.name} 受到了沙暴的伤害！（-${dmg}）` });
    }
    if (weatherKind === 'hail' && pet.hp > 0 && !mg && !isHailImmune(pet, st)) {
      const dmg = Math.max(1, Math.floor(pet.maxHp / 16));
      pet.hp = Math.max(0, pet.hp - dmg);
      events.push({ type: 'weather', kind: 'hail', side, pet: pet.name, text: `冰雹！${pet.name} 受到了冰雹的伤害！（-${dmg}）` });
    }
    if (weatherKind === 'hail' && pet.hp > 0 && petAbility(pet, st) === '冰冻之躯') {
      const healed = healPet(pet, Math.floor(pet.maxHp / 16));
      if (healed > 0) events.push({ type: 'ability', side, pet: pet.name, ability: '冰冻之躯', text: `「冰冻之躯」发动！${pet.name} 回复了 ${healed} 点体力！` });
    }
    if (weatherKind === 'rain' && pet.hp > 0) {
      if (petAbility(pet, st) === '雨盘') {
        const healed = healPet(pet, Math.floor(pet.maxHp / 16));
        if (healed > 0) events.push({ type: 'ability', side, pet: pet.name, ability: '雨盘', text: `「雨盘」发动！${pet.name} 回复了 ${healed} 点体力！` });
      } else if (petAbility(pet, st) === '干燥皮肤') {
        const healed = healPet(pet, Math.floor(pet.maxHp / 8));
        if (healed > 0) events.push({ type: 'ability', side, pet: pet.name, ability: '干燥皮肤', text: `「干燥皮肤」发动！${pet.name} 回复了 ${healed} 点体力！` });
      } else if (petAbility(pet, st) === '湿润之躯' && pet.status) {
        const k = pet.status.kind;
        pet.status = null;
        events.push({ type: 'ability', side, pet: pet.name, ability: '湿润之躯', text: `「湿润之躯」发动！${pet.name} 的${STATUS_LABEL[k]}治愈了！` });
      }
    }
    if (weatherKind === 'sun' && pet.hp > 0 && petAbility(pet, st) === '太阳之力') {
      const dmg = Math.max(1, Math.floor(pet.maxHp / 8));
      pet.hp = Math.max(0, pet.hp - dmg);
      events.push({ type: 'ability', side, pet: pet.name, ability: '太阳之力', text: `「太阳之力」发动！${pet.name} 在大晴天里损失了 ${dmg} 点体力！` });
    }
    if (weatherKind === 'sun' && pet.hp > 0 && petAbility(pet, st) === '干燥皮肤') {
      const dmg = Math.max(1, Math.floor(pet.maxHp / 8));
      pet.hp = Math.max(0, pet.hp - dmg);
      events.push({ type: 'ability', side, pet: pet.name, ability: '干燥皮肤', text: `「干燥皮肤」发动！${pet.name} 在大晴天里损失了 ${dmg} 点体力！` });
    }
    if (mg && before > 0 && pet.hp > 0) {
      const blockedStatus = hadStatus === 'poison' || hadStatus === 'burn';
      const blockedSand = weatherKind === 'sand' && !isSandImmune(pet, st);
      const blockedHail = weatherKind === 'hail' && !isHailImmune(pet, st);
      if (blockedStatus || blockedSand || blockedHail) events.push({ type: 'ability', side, pet: pet.name, ability: '魔法防守', text: `「魔法防守」发动！${pet.name} 不受招式以外的伤害！` });
    }
    if (before > 0 && pet.hp <= 0) fainted.push({ side, pet });
  }
  return fainted;
}
// 避雷针/电气引擎升档：calcDamage 的免疫条目带 stage 时，调用方统一应用（仿 applyAbilityHeal）。
function applyAbilityStages(defPet, abilityEntries) {
  for (const e of abilityEntries || []) {
    if (e && e.stage && e.stage.key) {
      const r = changeStage(defPet, e.stage.key, e.stage.delta);
      if (r.applied) e.stageApplied = true;
    }
  }
}
// 引火（扩到 141）：calcDamage 的免疫条目带 flashFire 时，调用方统一给防守方挂标记（仿 applyAbilityStages）。
function applyAbilityFlashFire(defPet, abilityEntries) {
  for (const e of abilityEntries || []) {
    if (e && e.flashFire) defPet.flashFire = true;
  }
}

function calcDamage(move, atkPet, defPet, rng = Math.random, opts = null) {
  const power = Number(move && move.power);
  if (!Number.isFinite(power) || power <= 0) return { error: 'INVALID_MOVE_POWER' };
  // 官方分支优先采用表内属性，经典分支仍采用招式自身属性。
  const official = opts && opts.chart === 'official';
  let effectiveType = official ? (officialMove(move.name)?.type ?? move.type) : move.type;
  const cat = moveCategory(move);
  // 特性免疫（飘浮/储水/蓄电）：在克制计算之前短路（mult=0 路径，不消耗随机数）。
  // 变化招式（无伤害、无 effect）不吃免疫——比如寄生种子仍按旧逻辑走。
  const atkAbility = petAbility(atkPet, opts && opts.st);
  const defAbility = atkAbility === '破格' ? null : petAbility(defPet, opts && opts.st);
  // 妖精皮肤（Batch 12）：一般属性招式→妖精属性。放在免疫／克制之前，STAB／克制／免疫都按转换后属性算。
  // 威力×1.2 在 effPower 链里做；变化招式在提前返回处到不了那里，自动不吃威力加成。
  let pixilated = false;
  if (atkAbility === '妖精皮肤' && effectiveType === '普通') {
    effectiveType = '妖精';
    pixilated = true;
  }
  const weatherOff = atkAbility === '无关天气' || defAbility === '无关天气';
  const effWeather = weatherOff ? null : ((opts && opts.weather) || null);
  const immunity = (cat !== 'status' || moveEffectOf(move.name))
    ? abilityImmunity(defAbility, effectiveType) : null;
  if (immunity) {
    const heal = immunity.heal ? Math.floor(defPet.maxHp / 4) : 0;
    // 2a：避雷针/电气引擎的升档信息随条目返回（仅升档时带 stage 字段），调用方用 applyAbilityStages 应用。
    const entry = { name: defAbility, kind: 'immune', side: 'def', pet: defPet.name, moveType: effectiveType, heal };
    if (immunity.stage) entry.stage = immunity.stage;
    // 扩到 141：引火的标记随条目返回，调用方用 applyAbilityFlashFire 挂到防守方身上。
    if (immunity.flashFire) entry.flashFire = true;
    return {
      dmg: 0, mult: 0, critical: false,
      ability: [entry],
    };
  }
  // 隔音（Batch 1）：防守方带隔音时声音类招式无效；不消耗随机数，与其他免疫同路径（条目 kind:'immune'，无回复无升档）。
  if (defAbility === '隔音' && SOUND_MOVES.has(move.name)) {
    return { dmg: 0, mult: 0, critical: false, ability: [{ name: defAbility, kind: 'immune', side: 'def', pet: defPet.name, moveType: effectiveType, heal: 0 }] };
  }
  const defs = defPet.defTypes || [defPet.type];
  let mult = official ? typeMultOfficialMulti(effectiveType, defs) : typeMult(move.type, defs[0]);
  // 胆量（Batch 1）：攻击方带胆量且招式为普通／格斗时，防守方的幽灵属性免疫失效——幽灵按 ×1 计，其余属性照常相乘。
  // 只在官方表分支有意义（经典 typeMult 无免疫，永不为 0）。不消耗随机数。
  let scrappyEntry = null;
  if (mult === 0 && official && atkAbility === '胆量' && (effectiveType === '普通' || effectiveType === '格斗') && defs.includes('幽灵')) {
    const rest = defs.filter((t) => t !== '幽灵');
    mult = rest.length ? typeMultOfficialMulti(effectiveType, rest) : 1;
    scrappyEntry = { name: atkAbility, kind: 'scrappy', side: 'atk', pet: atkPet.name, moveType: effectiveType };
  }
  if (mult === 0) return { dmg: 0, mult: 0, critical: false, ability: [] };
  if (cat === 'status' && !moveEffectOf(move.name)) return { dmg: 0, mult, critical: false, ability: [] };
  const ability = scrappyEntry ? [scrappyEntry] : [];
  // 仅官方伤害招检定命中；免疫与变化招早返回不消耗随机数。
  const accuracy = official && cat !== 'status' ? officialAccuracy(move.name) : null;
  if (Number.isFinite(accuracy)) {
    // 友好度闪避（≥204 时 +5%）只动官方分支这一行；经典分支不做命中检定、不吃闪避加成。
    let dodge = (opts && opts.dodgePct) || 0;
    // 沙隐/雪隐（Batch 8）：天气闪避×1.25 → 命中阈值减 accuracy×0.2；与友好度闪避取高不叠加（D10）。
    if (effWeather === 'sand' && defAbility === '沙隐') dodge = Math.max(dodge, accuracy * 0.2);
    if (effWeather === 'hail' && defAbility === '雪隐') dodge = Math.max(dodge, accuracy * 0.2);
    // 复眼：命中率×1.3（先乘特性、再减闪避加成）。无防守：攻防任一方带则必中。
    // 命中检定的随机数无论如何照掷一次（R8：不用短路改变 rng 消耗），只是无防守时忽略结果。
    // 活力（Batch 4）：物理招命中率×0.8，与复眼相乘。
    let accMod = 1;
    if (atkAbility === '复眼') accMod *= 1.3;
    if (atkAbility === '活力' && cat === 'physical') accMod *= 0.8;
    const sureHit = atkAbility === '无防守' || defAbility === '无防守';
    const hitRoll = rollRng(rng) * 100;
    if (!sureHit && !(hitRoll < accuracy * accMod - dodge)) {
      return { dmg: 0, mult, critical: false, missed: true, ability };
    }
  }
  // 2026-11-17 8 关扩围：暴击无视能力等级（bug-4 已知偏差，官方规则）——暴击判定前移到 A/D 计算
  // 之前（RNG 顺序变为命中→暴击→伤害随机，原为命中→伤害随机→暴击）。暴击时攻击方只计正向等级
  // （负向忽略）、防守方只计负向等级（正向忽略），非暴击仍按全部等级算。
  // 暴击参数：默认全局口径（道馆/合作）；PvP 经 opts.critRate/critMult 覆盖。
  // 硬壳盔甲（防守方）：仍掷一次随机数、强制不暴击（随机数消耗不变）。
  const critRate = (opts && Number.isFinite(opts.critRate)) ? opts.critRate : CRIT_RATE;
  let critMult = (opts && Number.isFinite(opts.critMult)) ? opts.critMult : CRIT_MULT;
  // 狙击手（Batch 4）：会心一击 3 倍，所有模式（含 PvP 的 1.3 覆盖）。
  if (atkAbility === '狙击手') critMult = 3;
  // 战斗盔甲与硬壳盔甲同口径（Batch 1）：同样仍掷一次随机数、强制不暴击。
  const critical = (defAbility === '硬壳盔甲' || defAbility === '战斗盔甲') ? (rollRng(rng), false) : rollRng(rng) < critRate;
  if (critical && atkAbility === '狙击手') {
    ability.push({ name: atkAbility, kind: 'sniper', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 低血量同系强化（茂盛/猛火/激流/虫之预感）：HP≤1/3 且特性类型＝招式类型时威力×1.5。
  const lowHpType = LOW_HP_ABILITY_TYPE[atkAbility];
  let effPower = power;
  if (lowHpType && lowHpType === effectiveType && atkPet.hp * 3 <= atkPet.maxHp) {
    effPower = power * 1.5;
    ability.push({ name: atkAbility, kind: 'lowhp', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 引火（扩到 141）：已吸收过火招的宠，自身火属性招式威力×1.5，直到离场。
  if (atkAbility === '引火' && atkPet.flashFire && effectiveType === '火') {
    effPower = effPower * 1.5;
    ability.push({ name: atkAbility, kind: 'flashfire', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  if (effWeather === 'sand' && atkAbility === '沙之力' && (effectiveType === '岩石' || effectiveType === '地面' || effectiveType === '钢')) {
    effPower = effPower * 1.3;
    ability.push({ name: atkAbility, kind: 'sandforce', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // Batch 4 威力钩子（顺序：技术高手 → 铁拳 → 活力 → 分析）。
  if (atkAbility === '技术高手' && power <= 60) {
    effPower = effPower * 1.5;
    ability.push({ name: atkAbility, kind: 'technician', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  if (atkAbility === '铁拳' && PUNCH_MOVES.has(move.name)) {
    effPower = effPower * 1.2;
    ability.push({ name: atkAbility, kind: 'ironfist', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 妖精皮肤（Batch 12）：一般属性招式威力×1.2（与铁拳同口径；只在转换生效时触发）。
  // 变化招式到不了这里（提前返回），cat !== 'status' 是双保险。
  if (pixilated && cat !== 'status') {
    effPower = effPower * 1.2;
    ability.push({ name: atkAbility, kind: 'pixilate', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  if (cat === 'physical' && atkAbility === '活力') {
    effPower = effPower * 1.5;
    ability.push({ name: atkAbility, kind: 'hustle', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  if (atkAbility === '分析' && opts && opts.movedLast) {
    effPower = effPower * 1.3;
    ability.push({ name: atkAbility, kind: 'analytic', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 灼伤（App.md 管线：伤害链乘区，克制之后单独取整；毅力异常时无视灼伤减半）。
  // 此前误折进攻击 A，改走 burnMult（经典分支也并进同一乘区，取整口径不动）。
  const hasGutsBoost = cat === 'physical' && atkAbility === '毅力' && atkPet.status;
  const burnMult = (cat === 'physical' && !hasGutsBoost && atkPet.status && atkPet.status.kind === 'burn') ? 0.5 : 1;
  if (burnMult !== 1) ability.push({ name: '灼伤', kind: 'burn', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  let base;
  if (atkPet.stats && defPet.stats) {
    // 2a：能力阶段进 A/D 比值（攻击方 atk/spa、防守方 def/spd）。
    // 暴击时无视等级：攻击方负向等级忽略（只计 max(0, 阶段)）、防守方正向等级忽略（只计 min(0, 阶段)）。
    const atkStageKey = cat === 'physical' ? 'atk' : 'spa';
    const defStageKey = cat === 'physical' ? 'def' : 'spd';
    const atkStage = stagesOf(atkPet)[atkStageKey];
    const defStage = stagesOf(defPet)[defStageKey];
    // 纯朴（Batch 4）：攻击方带则防守方阶段按 0 计；防守方带则攻击方阶段按 0 计。
    const atkStageEff = defAbility === '纯朴' ? 0 : atkStage;
    const defStageEff = atkAbility === '纯朴' ? 0 : defStage;
    let A = (cat === 'physical' ? atkPet.stats.attack : atkPet.stats.sp_attack) * stageMult(critical ? Math.max(0, atkStageEff) : atkStageEff);
    let D = (cat === 'physical' ? defPet.stats.defense : defPet.stats.sp_defense) * stageMult(critical ? Math.min(0, defStageEff) : defStageEff);
    if (atkAbility === '纯朴' && defStage !== 0) {
      ability.push({ name: atkAbility, kind: 'unaware', side: 'atk', pet: atkPet.name, moveType: effectiveType });
    }
    if (defAbility === '纯朴' && atkStage !== 0) {
      ability.push({ name: defAbility, kind: 'unaware', side: 'def', pet: defPet.name, moveType: effectiveType });
    }
    // 沙暴天气（第二步）：特殊攻击时，若防守方含岩石属性，特防 D × 1.5
    const weatherKind = effWeather;
    const defTypes = defPet.defTypes || [defPet.type];
    if (weatherKind === 'sand' && cat === 'special' && defTypes.includes('岩石')) {
      D *= 1.5;
      ability.push({ name: '沙暴', kind: 'weather', side: 'def', pet: defPet.name, moveType: effectiveType });
    }
    // 神奇鳞片（Batch 1）：防守方带异常状态（中毒／麻痹／灼伤／睡眠任一）时，物理招防御×1.5（官方为防御，不加特防）。
    if (defAbility === '神奇鳞片' && defPet.status && cat === 'physical') {
      D *= 1.5;
      ability.push({ name: defAbility, kind: 'marvelscale', side: 'def', pet: defPet.name, moveType: effectiveType });
    }
    // 2b：毅力异常时物理攻击 ×1.5（官方攻击修正，折进 A）；灼伤改走伤害链 burnMult，不再折进 A。
    if (hasGutsBoost) {
      A *= 1.5;
      ability.push({ name: atkAbility, kind: 'guts', side: 'atk', pet: atkPet.name, moveType: effectiveType });
    }
    if (cat === 'special' && atkAbility === '太阳之力' && weatherKind === 'sun') {
      A *= 1.5;
      ability.push({ name: atkAbility, kind: 'solarpower', side: 'atk', pet: atkPet.name, moveType: effectiveType });
    }
    // App.md 管线：能力阶段/沙暴/毅力修正后，A/D 各自向下取整，再进基础伤害。
    A = Math.floor(A);
    D = Math.floor(D);
    base = Math.floor(Math.floor(Math.floor(2 * atkPet.level / 5 + 2) * effPower * A / D) / 50) + 2;
    // 天气（App.md 管线：基础伤害之后、暴击之前，单独取整；此前误放在威力里，差 1 点伤害）。
    const weatherMod = weatherPowerMod(effWeather, effectiveType);
    if (weatherMod !== 1) {
      base = Math.floor(base * weatherMod);
      ability.push({ name: (opts.weather === 'sun' ? '大晴天' : '下雨'), kind: 'weather', side: 'atk', pet: atkPet.name, moveType: effectiveType });
    }
  } else {
    // 缺少属性时保留旧线性基础伤害，官方 STAB 在后续统一应用。
    base = effPower * (0.5 + 0.05 * Math.max(1, Number(atkPet.level) || 1));
  }
  // 厚脂肪（防守方）：火/冰伤害×0.5，乘在克制之后、单次取整（只影响伤害，不改 mult）。
  let abilityDefMod = 1;
  if (defAbility === '厚脂肪' && (effectiveType === '火' || effectiveType === '冰')) {
    abilityDefMod = 0.5;
    ability.push({ name: defAbility, kind: 'thickfat', side: 'def', pet: defPet.name, moveType: effectiveType });
  }
  // Batch 4 防守修正（厚脂肪之后：多重鳞片 → 过滤 → 干燥皮肤火）。
  if (defAbility === '多重鳞片' && defPet.hp >= defPet.maxHp) {
    abilityDefMod *= 0.5;
    ability.push({ name: defAbility, kind: 'multiscale', side: 'def', pet: defPet.name, moveType: effectiveType });
  }
  if (defAbility === '过滤' && mult > 1) {
    abilityDefMod *= 0.75;
    ability.push({ name: defAbility, kind: 'filter', side: 'def', pet: defPet.name, moveType: effectiveType });
  }
  if (defAbility === '干燥皮肤' && effectiveType === '火') {
    abilityDefMod *= 1.25;
    ability.push({ name: defAbility, kind: 'dryskin', side: 'def', pet: defPet.name, moveType: effectiveType });
  }
  // App.md 管线：基础伤害之后每步单独向下取整——随机档（85–100）→ STAB → 克制 → 厚脂肪 → 灼伤。
  // （此前是单次 Math.round 合并乘，与文档的分步取整不符，差 1–2 点伤害。）
  // 暴击已在命中后、A/D 之前判定（RNG 顺序：命中→暴击→伤害随机），乘区在伤害链末尾单独取整。
  let rolled;
  if (official) {
    const isStab = (atkPet.defTypes || [atkPet.type]).includes(effectiveType);
    const stab = isStab ? (atkAbility === '适应力' ? 2 : 1.5) : 1;
    if (isStab && atkAbility === '适应力') {
      ability.push({ name: atkAbility, kind: 'adaptability', side: 'atk', pet: atkPet.name, moveType: effectiveType });
    }
    const randomFactor = (85 + Math.floor(rollRng(rng) * 16)) / 100;
    let dmg = Math.floor(base * randomFactor);
    dmg = Math.floor(dmg * stab);
    dmg = Math.floor(dmg * mult);
    dmg = Math.floor(dmg * burnMult);
    dmg = Math.floor(dmg * abilityDefMod);
    rolled = Math.max(1, dmg);
  } else {
    // 经典分支保留 opts.range、默认区间及原有取整口径（仅把灼伤乘区并进来，取整口径不动）。
    const range = (opts && Array.isArray(opts.range) && opts.range.length === 2) ? opts.range : [0.9, 1.1];
    rolled = Math.max(1, Math.round(base * mult * (range[0] + rollRng(rng) * (range[1] - range[0])) * abilityDefMod * burnMult));
  }
  // 有色眼镜（Batch 4）：效果不好（mult<1）的招式伤害×2，两分支共用，暴击之前。
  if (atkAbility === '有色眼镜' && mult < 1) {
    rolled = Math.max(1, Math.floor(rolled * 2));
    ability.push({ name: atkAbility, kind: 'tintedlens', side: 'atk', pet: atkPet.name, moveType: effectiveType });
  }
  // 暴击倍率应用在伤害链末尾（critical 已在命中后、A/D 之前掷出）。
  const dmg = critical ? Math.max(1, Math.floor(rolled * critMult)) : rolled;
  return { dmg, mult, critical, ability };
}

function createBattleState({ mode, firstSide, sides, weather }) {
  if (firstSide !== 'A' && firstSide !== 'B') throw new TypeError(`INVALID_FIRST_SIDE: ${firstSide}`);
  const st = {
    v: 1, mode, firstSide, turn: firstSide, turnNo: 1,
    acted: { A: 0, B: 0 }, winner: null, sides, log: [],
    // 天气（第三期简化版）：关卡设定、整场持续不计回合；PvP/合作/野外传 null。旧存量对局无此字段，resolveGymRound 里默认 null。
    weather: { kind: weather || null },
    // 道馆改版专用：记录玩家上一回合的行动类别（馆主 AI 惩罚龟壳要读）；PvP 不带此字段
    ...(mode === 'gym' ? { gym: { lastPlayerKind: null } } : {}),
  };
  // 2a：开局触发威吓（双方上场宠各触发一次；对方无宠时不推事件）。
  const openEvents = [];
  // 天气开局文案（有天气时先于威吓写进日志）。
  const weatherOff = (activePetOf(st, 'A') && petAbility(activePetOf(st, 'A'), st) === '无关天气') || (activePetOf(st, 'B') && petAbility(activePetOf(st, 'B'), st) === '无关天气');
  if (!weatherOff && st.weather.kind === 'sun') openEvents.push({ type: 'weather', kind: 'sun', text: '大晴天！阳光照耀着对战场，火属性招式威力提升、水属性招式威力减弱！' });
  else if (!weatherOff && st.weather.kind === 'rain') openEvents.push({ type: 'weather', kind: 'rain', text: '下起雨了！水属性招式威力提升、火属性招式威力减弱！' });
  else if (!weatherOff && st.weather.kind === 'sand') openEvents.push({ type: 'weather', kind: 'sand', text: '沙暴天气扬起了满天风沙！岩石属性宝可梦的特防提升，非岩/地/钢属性宝可梦会受到沙暴伤害！' });
  else if (!weatherOff && st.weather.kind === 'hail') openEvents.push({ type: 'weather', kind: 'hail', text: '下起了冰雹！非冰属性宝可梦会受到冰雹伤害！' });
  triggerSwitchIn(st, 'A', openEvents);
  triggerSwitchIn(st, 'B', openEvents);
  pushLog(st, openEvents);
  return st;
}

function activePetOf(st, side) {
  const s = st && st.sides ? st.sides[side] : null;
  if (!s || !Array.isArray(s.pets) || s.pets.length === 0) return undefined;
  return s.pets[s.activeIdx || 0];
}

function canSideAttack(st, side) {
  // 2026-11-16 用户定：取消热身，先攻方第一回合可直接出招（与道馆一致）；不再有“跳过本回合”
  return true;
}

function pushLog(st, events) {
  st.log.push(...events);
  if (st.log.length > 40) st.log = st.log.slice(-40);
}

/* 一次行动收尾：记行动数、无赢家时换回合、写战况日志 */
function finishAction(st, side, events) {
  const foeSide = side === 'A' ? 'B' : 'A';
  st.acted[side] = (st.acted[side] || 0) + 1;
  if (!st.winner) { st.turn = foeSide; st.turnNo += 1; }
  pushLog(st, events);
  return { events };
}

/* 伤害扣减之后：昏厥换宠/分出胜负，再收尾（即时结算与防守结算共用） */
function settleAfterDamage(st, side, events, rng = Math.random, killingMove = null) {
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides ? st.sides[foeSide] : null;
  const target = activePetOf(st, foeSide);
  if (foe && target && target.hp <= 0) {
    events.push({ type: 'faint', side: foeSide, pet: target.name, text: `${target.name} 倒下了！` });
    applyMoxie(activePetOf(st, side), events, side, st);
    const attacker = activePetOf(st, side);
    const boomDmg = applyAftermath(attacker, target, killingMove, events, foeSide, st);
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(target);
    const nextIdx = foe.pets.findIndex((pet2) => pet2.hp > 0);
    if (nextIdx >= 0) {
      foe.activeIdx = nextIdx;
      events.push({ type: 'swap', side: foeSide, pet: foe.pets[nextIdx].name, text: `${foe.pets[nextIdx].name} 上场啦！` });
      // 2a：顶上的宠若带威吓，降对方攻击。
      triggerSwitchIn(st, foeSide, events);
    } else {
      st.winner = side;
      events.push({ type: 'win', side, text: `${st.sides[side].childName} 赢啦！🎉` });
    }
    if (boomDmg > 0 && attacker && attacker.hp <= 0) {
      events.push({ type: 'faint', side, pet: attacker.name, text: `${attacker.name} 倒下了！` });
      clearPetBattleState(attacker);
      if (!st.winner) {
        const me = st.sides[side];
        const n2 = me.pets.findIndex((p) => p.hp > 0);
        if (n2 >= 0) {
          me.activeIdx = n2;
          events.push({ type: 'swap', side, pet: me.pets[n2].name, text: `${me.pets[n2].name} 上场啦！` });
          triggerSwitchIn(st, side, events);
        } else {
          st.winner = foeSide;
          events.push({ type: 'win', side: foeSide, text: `${st.sides[foeSide].childName} 赢啦！🎉` });
        }
      } else if (!st.sides[side].pets.some((p) => p.hp > 0)) {
        st.winner = foeSide;
        events.push({ type: 'win', side: foeSide, text: `${st.sides[foeSide].childName} 赢啦！🎉` });
      }
    }
  }
  // 2b：PvP 回合末结算（双方上场宠的状态扣血/治愈/睡眠计数）。PvP 每行动一次结算一次与道馆
  // 每回合一次不同——为与道馆对齐，每回合只在后手方行动后结算一次（side !== firstSide）。
  // 非伤害行动（变化招/落空/被状态阻断）不触发，状态结算最多顺延一回合。扣血致昏厥时
  // 换宠或分胜负（不吃硬撑）。
  if (!st.winner && side !== st.firstSide) {
    const fainted = tickActiveStatuses(st, rng, events);
    for (const { side: fSide, pet: fPet } of fainted) {
      events.push({ type: 'faint', side: fSide, pet: fPet.name, text: `${fPet.name} 倒下了！` });
      clearPetBattleState(fPet);
      const sd = st.sides[fSide];
      const nextIdx = sd.pets.findIndex((p) => p.hp > 0);
      if (nextIdx >= 0) {
        sd.activeIdx = nextIdx;
        events.push({ type: 'swap', side: fSide, pet: sd.pets[nextIdx].name, text: `${sd.pets[nextIdx].name} 上场啦！` });
        triggerSwitchIn(st, fSide, events);
      } else {
        st.winner = fSide === 'A' ? 'B' : 'A';
        events.push({ type: 'win', side: st.winner, text: `${st.sides[st.winner].childName} 赢啦！🎉` });
      }
    }
  }
  return finishAction(st, side, events);
}

/* 执行一方的动作。moveName 为 null = 明确跳过（仅先攻首回合允许）。
 * 返回 {events} 或 {error}；state 原地推进。opts 透传 calcDamage（PvP 兜底结算传 PvP 暴击）。 */
function applyBattleAction(st, side, moveName, rng = Math.random, opts = null) {
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (st.turn !== side) return { error: 'NOT_YOUR_TURN' };
  const me = st.sides ? st.sides[side] : null;
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides ? st.sides[foeSide] : null;
  if (!me || !foe) return { error: 'NO_ACTIVE_PET' }; // 状态损坏（缺一方队伍）时明确报错，不抛异常
  const events = [];
  if (!moveName) return { error: 'MUST_CHOOSE_MOVE' };
  const pet = activePetOf(st, side);
  if (!pet || !(pet.hp > 0)) return { error: 'NO_ACTIVE_PET' }; // hp 非有限数（NaN）同样按无可用宠处理
  const move = Array.isArray(pet.moves) ? pet.moves.find((m) => m.name === moveName) : null;
  if (!move) return { error: 'MOVE_NOT_LEARNED' };
  if (pet.disabledMove === moveName) return { error: 'MOVE_DISABLED' };
  const target = activePetOf(st, foeSide);
  if (!target) return { error: 'NO_ACTIVE_PET' };
  // 2b：行动阻断——睡眠直接跳过、麻痹 25% 无法行动（本回合已消耗）。
  const blocked = statusBlocksAction(pet, rng);
  if (blocked) {
    events.push({ type: 'status', side, pet: pet.name, kind: blocked, text: statusBlockedText(blocked, pet.name) });
    return finishAction(st, side, events);
  }
  // 变化类招式：不造成伤害，挂一次性效果后结束本回合
  const eff = moveEffectOf(move.name);
  if (eff && eff !== 'drain') {
    if (eff === 'transform') { // 变身：复制对面当前上场宠（0 伤害，不挂标记）
      const fromName = pet.name;
      const copied = applyTransform(pet, target);
      events.push({ type: 'effect', side, kind: 'transform', move: move.name, text: copied ? `${fromName} 用了「变身」！变成了 ${copied.name} 的样子！` : `${fromName} 用了「变身」！但是什么都没有发生……` });
      return finishAction(st, side, events);
    }
    // 魔法镜（Batch 12）：防守方带魔法镜时，weak/smoke 反弹回攻击方。
    const bounced = tryMagicBounce(st, side, foeSide, eff, move.skillLevel || 1, move.name);
    if (bounced) {
      events.push(bounced);
      return finishAction(st, side, events);
    }
    applyEffectFlag(st, side, eff, move.skillLevel || 1);
    events.push({ type: 'effect', side, kind: eff, move: move.name, text: effectEventText(eff, pet.name, move.name) });
    return finishAction(st, side, events);
  }
  // 干扰落空：攻击方带着 smoke 标记时按该标记的技能等级查表打空（标记无论结果都消耗）
  if (fxOf(st, side).smoke) {
    const smokeLv = (typeof fxLvOf(st, side).smoke === 'number' ? skillLevelOf({ x: fxLvOf(st, side).smoke }, 'x') : 1);
    delete fxOf(st, side).smoke; delete fxLvOf(st, side).smoke;
    if (rollRng(rng) < SKILL_SMOKE_MISS[smokeLv - 1]) {
      events.push({ type: 'miss', side, move: move.name, text: `${pet.name} 用了「${move.name}」，却打中了烟幕和分身——落空啦！` });
      return finishAction(st, side, events);
    }
  }
  // 分析（Batch 4）：movedLast＝对手本回合已行动（后攻方为 true）；其余 opts（PvP 暴击口径）原样保留。
  const dmgOpts = { ...(opts || {}), movedLast: side !== st.firstSide, st };
  const dmgRes = calcDamage(move, pet, target, rng, dmgOpts);
  if (dmgRes.error) return { error: dmgRes.error }; // state 尚未改动，直接返回
  const modded = consumeAttackMods(st, side, dmgRes.dmg);
  const dmg = modded.dmg;
  const mult = dmgRes.mult;
  // 已污染的 target.hp（非有限数）按 0 处理：本击结算后走正常昏厥/换宠/胜负流程，让卡死对局能结束
  if (typeof target.hp !== 'number' || !Number.isFinite(target.hp)) target.hp = 0;
  if (!trySturdy(st, target, dmg, events, foeSide)) target.hp = Math.max(0, target.hp - dmg);
  const mods = Array.isArray(modded.mods) ? modded.mods.slice() : [];
  if (eff === 'drain' && dmg > 0) {
    const healed = drainHeal(pet, dmg);
    if (healed > 0) mods.push(`吸取回复 ${healed}`);
  }
  // 特性吸取回复（储水/蓄电免疫时）在昏厥判定之前结算；特性触发事件在攻击事件之前。
  const abilityHeal = applyAbilityHeal(target, dmgRes.ability);
  // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
  applyAbilityStages(target, dmgRes.ability);
  // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
  applyAbilityFlashFire(target, dmgRes.ability);
  events.push(...abilityEvents(dmgRes.ability || [], side, foeSide, abilityHeal));
  events.push({
    type: 'attack', side, pet: pet.name, move: move.name, moveType: move.type,
    dmg, mult, superEffective: mult > 1, resisted: mult > 0 && mult < 1, immune: mult === 0, critical: dmgRes.critical === true, target: target.name, targetHp: target.hp,
    text: mult === 0 ? `${pet.name} 用了「${move.name}」！没有效果！` : `${pet.name} 用了「${move.name}」！${dmgRes.critical ? '会心一击！' : ''}${mult > 1 ? '效果拔群！（×2）' : mult > 0 && mult < 1 ? '效果不好…（×0.5）' : ''}对 ${target.name} 造成 ${dmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`,
    mods,
  });
  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
  if (dmg > 0) applyContactTrigger(pet, target, move, rng, events, side, foeSide, (st.weather && st.weather.kind) || null, st);
  const _off = !!(opts && opts.chart === 'official');
  applyHitAbilityTriggers(pet, target, {
    moveType: _off ? ((officialMove(move.name) || {}).type || move.type) : move.type,
    category: moveCategory(move), critical: dmgRes.critical === true, dmg, missed: dmgRes.missed === true,
  }, events, side, foeSide, st);
  if (dmg > 0) applyCursedBody(target, pet, move.name, rng, events, foeSide, side, st);
  if (dmg > 0) applyAttackerContactTrigger(pet, target, move, rng, events, side, foeSide, (st.weather && st.weather.kind) || null, st);
  if (dmg > 0) applyStenchFlinch(pet, target, move, rng, events, side, foeSide, st);
  return settleAfterDamage(st, side, events, rng, move);
}

// 吸取：攻击方出战宠回复「实际造成伤害的一半（向下取整）」，不超过 maxHp；返回实际回复量
function drainHeal(pet, dmg) {
  // 吸取回复＝造成伤害的一半（上限 maxHp）；与特性吸取共用 healPet。
  return healPet(pet, Math.floor((Number(dmg) || 0) / 2));
}
/* 变身（Transform，2026-11-17 用户批准）：使用者复制目标的种类/属性/能力值（除 HP 外）/招式/第一特性；
 * 使用者自己的 HP、最大 HP、等级、身份（key）不变。原形态备份在 pet.transformBackup，
 * 下场（onPetLeavesField）或昏厥（clearPetBattleState）时还原。PP 不追踪，直接用复制的招式。
 * 能力值按目标基础种族值、使用者自己的等级重算（攻击/防御/特攻/特防/速度；HP 不复制，保留原 stats.hp）。
 * 显示上名字/立绘随 no 变（battleView 直接返 no/name/img，img 置空后走 petImg(no)）。 */
function applyTransform(user, target) {
  if (!user || !target || user === target) return null;
  if (!user.transformBackup) {
    user.transformBackup = {
      no: user.no, name: user.name, type: user.type,
      defTypes: user.defTypes ? [...user.defTypes] : [user.type],
      stats: user.stats ? { ...user.stats } : null,
      moves: (user.moves || []).map((m) => ({ ...m })),
      ability: user.ability, img: user.img,
    };
  }
  const stats = statsFor(target.no, user.level);
  user.no = target.no;
  user.name = target.name;
  user.type = target.type;
  user.defTypes = target.defTypes ? [...target.defTypes] : [target.type];
  if (stats && user.stats) {
    user.stats = { ...user.stats, attack: stats.attack, defense: stats.defense, sp_attack: stats.sp_attack, sp_defense: stats.sp_defense, speed: stats.speed };
  } else if (stats) {
    user.stats = stats;
  }
  user.moves = (target.moves || []).map((m) => ({ ...m }));
  user.ability = abilityOf(target.no); // 用户 2026-11-18 定：变身永远复制首特性，不复制实例特性
  user.img = target.img || null;
  return { no: target.no, name: target.name };
}
function revertTransform(pet) {
  if (!pet || !pet.transformBackup) return false;
  const b = pet.transformBackup;
  pet.no = b.no; pet.name = b.name; pet.type = b.type;
  pet.defTypes = [...b.defTypes];
  if (b.stats) pet.stats = { ...b.stats };
  pet.moves = b.moves.map((m) => ({ ...m }));
  pet.ability = b.ability; pet.img = b.img;
  delete pet.transformBackup;
  return true;
}

function fxOf(st, side) {
  if (!st.fx) st.fx = { A: {}, B: {} };
  if (!st.fx[side]) st.fx[side] = {};
  return st.fx[side];
}
function effectEventText(kind, petName, moveName) {
  if (kind === 'transform') return `${petName} 用了「${moveName}」！变成了对手的样子！`;
  if (kind === 'weak') return `${petName} 用了「${moveName}」！对方心软啦，下一次攻击伤害降低。`;
  if (kind === 'charge') return `${petName} 用了「${moveName}」！全身蓄满了力，下一次攻击更强。`;
  if (kind === 'smoke') return `${petName} 用了「${moveName}」！烟幕与分身笼罩，对方下一次攻击可能落空。`;
  return `${petName} 用了「${moveName}」！缩起来防御，下一次受到的伤害减半。`;
}
/* 把效果标记挂到对应一方（weak/smoke 挂给对手，charge/shell 挂给自己） */
function fxLvOf(st, side) {
  if (!st.fxLv) st.fxLv = { A: {}, B: {} };
  if (!st.fxLv[side]) st.fxLv[side] = {};
  return st.fxLv[side];
}
// 魔法镜（Batch 12）：防守方带魔法镜时，对手用的 foe-targeting 标记类效果（weak/smoke）
// 反弹回攻击方。只在三个效果应用点调用（PvP 即时／PvP 预演／道馆）。
// 返回反弹事件（调用方推事件并跳过正常挂标记），不反弹时返回 null。
// 破格（攻击方）与化学变化气体（petAbility 返回 null）自动压制，无需额外处理。
function tryMagicBounce(st, atkSide, defSide, eff, skillLevel, moveName) {
  if (eff !== 'weak' && eff !== 'smoke') return null;
  const atkPet = activePetOf(st, atkSide);
  const defPet = activePetOf(st, defSide);
  if (!atkPet || !defPet) return null;
  if (petAbility(atkPet, st) === '破格') return null;
  if (petAbility(defPet, st) !== '魔法镜') return null;
  // applyEffectFlag 对 weak/smoke 本来就是挂给 side 的对手，传 defSide 即挂给攻击方。
  applyEffectFlag(st, defSide, eff, skillLevel);
  return {
    type: 'effect', side: atkSide, kind: 'magicbounce', move: moveName,
    text: `${defPet.name} 的魔法镜把「${moveName}」反弹回去了！`,
  };
}
/* 标记本身保持布尔值（旧断言 fx.A.shell === true 不变），技能等级另存 fxLv，不进 battleView 的 fx 字段 */
function applyEffectFlag(st, side, kind, skillLevel = 1) {
  const lv = skillLevelOf({ x: skillLevel }, 'x');
  const foeSide = side === 'A' ? 'B' : 'A';
  const target = (kind === 'weak' || kind === 'smoke') ? foeSide : side;
  fxOf(st, target)[kind] = true;
  fxLvOf(st, target)[kind] = lv;
}
/* 攻击命中结算前消费攻击方/防守方的一次性标记，返回修正后伤害与说明 */
function consumeAttackMods(st, side, dmg) {
  if (dmg <= 0) return { dmg: 0, mods: [] };
  const foeSide = side === 'A' ? 'B' : 'A';
  const myFx = fxOf(st, side);
  const foeFx = fxOf(st, foeSide);
  const mods = [];
  let out = dmg;
  const lvOf = (sd, kind) => { const v = fxLvOf(st, sd)[kind]; return (typeof v === 'number' ? skillLevelOf({ x: v }, 'x') : 1); };
  if (myFx.charge) { const lv = lvOf(side, 'charge'); delete myFx.charge; delete fxLvOf(st, side).charge; out = Math.max(1, Math.round(out * SKILL_CHARGE_MULT[lv - 1])); mods.push('蓄力爆发'); }
  if (myFx.weak) { const lv = lvOf(side, 'weak'); delete myFx.weak; delete fxLvOf(st, side).weak; out = Math.max(1, Math.round(out * SKILL_WEAK_MULT[lv - 1])); mods.push('被弱化'); }
  if (foeFx.shell) { const lv = lvOf(foeSide, 'shell'); delete foeFx.shell; delete fxLvOf(st, foeSide).shell; out = Math.max(1, Math.round(out * SKILL_SHELL_MULT[lv - 1])); mods.push('对方防御中'); }
  return { dmg: out, mods };
}

/* 防守四档（借鉴包 v1 §2 新增「守护」；2026-10-24 平衡调整：守护 ×0.9→×0.75，
 * 旧值只比答错少吃 10%、体感无差别；现四档减伤梯度 = 闪避 100%/格挡 50%/防御 33%/守护 25%，
 * 答对时期望保留比例 0.53→0.50）：权重 闪避20/格挡30/防御30/守护20 */
const DEFENSE_KINDS = [
  { kind: 'dodge', label: '闪避', ratio: 0, weight: 20 },
  { kind: 'block', label: '格挡', ratio: 0.5, weight: 30 },
  { kind: 'guard', label: '防御', ratio: 2 / 3, weight: 30 },
  { kind: 'ward', label: '守护', ratio: 0.75, weight: 20 },
];

/* 按权重抽一档防御（rng 可注入，确定性测试用） */
function pickDefenseKind(rng = Math.random) {
  const total = DEFENSE_KINDS.reduce((a, d) => a + d.weight, 0);
  let roll = rollRng(rng) * total;
  for (const d of DEFENSE_KINDS) {
    roll -= d.weight;
    if (roll < 0) return d;
  }
  return DEFENSE_KINDS[DEFENSE_KINDS.length - 1];
}

/* 只算不打：校验回合/招式并预演伤害（不改 state） */
function stagePvpAttack(st, side, moveName, rng = Math.random) {
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (st.turn !== side) return { error: 'NOT_YOUR_TURN' };
  const me = st.sides ? st.sides[side] : null;
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides ? st.sides[foeSide] : null;
  if (!me || !foe) return { error: 'NO_ACTIVE_PET' };
  if (!moveName) return { error: 'MUST_CHOOSE_MOVE' };
  const pet = activePetOf(st, side);
  if (!pet || !(pet.hp > 0)) return { error: 'NO_ACTIVE_PET' };
  const move = Array.isArray(pet.moves) ? pet.moves.find((m) => m.name === moveName) : null;
  if (!move) return { error: 'MOVE_NOT_LEARNED' };
  if (pet.disabledMove === moveName) return { error: 'MOVE_DISABLED' };
  const target = activePetOf(st, foeSide);
  if (!target) return { error: 'NO_ACTIVE_PET' };
  // 2b：行动阻断——睡眠直接跳过、麻痹 25% 无法行动（预演时检定，调用方走即时结算分支）。
  const blocked = statusBlocksAction(pet, rng);
  if (blocked) return { blocked, moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name };
  // 变化类招式：不预演伤害，交由调用方即时挂效果
  const eff = moveEffectOf(move.name);
  if (eff && eff !== 'drain') return { effectKind: eff, skillLevel: move.skillLevel || 1, moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name };
  // 干扰落空在预演时判定（标记消耗）；命中才继续算伤害修正
  let smokeMiss = false;
  if (fxOf(st, side).smoke) {
    const smokeLv = (typeof fxLvOf(st, side).smoke === 'number' ? skillLevelOf({ x: fxLvOf(st, side).smoke }, 'x') : 1);
    delete fxOf(st, side).smoke; delete fxLvOf(st, side).smoke;
    if (rollRng(rng) < SKILL_SMOKE_MISS[smokeLv - 1]) smokeMiss = true;
  }
  if (smokeMiss) return { smokeMiss: true, moveName: move.name, moveType: move.type, petName: pet.name, targetName: target.name };
  const dmgRes = calcDamage(move, pet, target, rng, { critRate: PVP_CRIT_RATE, critMult: PVP_CRIT_MULT, movedLast: side !== st.firstSide, st });
  if (dmgRes.error) return { error: dmgRes.error };
  const modded = consumeAttackMods(st, side, dmgRes.dmg);
  return { moveName: move.name, moveType: move.type, category: moveCategory(move), petName: pet.name, targetName: target.name, dmg: modded.dmg, mult: dmgRes.mult, resisted: dmgRes.mult > 0 && dmgRes.mult < 1, immune: dmgRes.mult === 0, critical: dmgRes.critical === true, mods: modded.mods, drain: eff === 'drain', ability: dmgRes.ability || [] };
}

/* 挂起前的即时分支：变化招式挂效果 / 烟幕落空（都不进防守答题） */
function applyStagedEffect(st, staged) {
  if (staged.effectKind === 'transform') { // 变身：复制对面当前上场宠（0 伤害，不挂标记）
    const pet = activePetOf(st, staged.attacker);
    const foeSide = staged.attacker === 'A' ? 'B' : 'A';
    const target = activePetOf(st, foeSide);
    const fromName = pet ? pet.name : staged.petName;
    const copied = pet ? applyTransform(pet, target) : null;
    const events = [{ type: 'effect', side: staged.attacker, kind: 'transform', move: staged.moveName, text: copied ? `${fromName} 用了「变身」！变成了 ${copied.name} 的样子！` : `${fromName} 用了「变身」！但是什么都没有发生……` }];
    return finishAction(st, staged.attacker, events);
  }
  // 魔法镜（Batch 12）：防守方带魔法镜时，weak/smoke 反弹回攻击方。
  const foeSide = staged.attacker === 'A' ? 'B' : 'A';
  const bounced = tryMagicBounce(st, staged.attacker, foeSide, staged.effectKind, staged.skillLevel || 1, staged.moveName);
  if (bounced) {
    return finishAction(st, staged.attacker, [bounced]);
  }
  applyEffectFlag(st, staged.attacker, staged.effectKind, staged.skillLevel || 1);
  const events = [{ type: 'effect', side: staged.attacker, kind: staged.effectKind, move: staged.moveName, text: effectEventText(staged.effectKind, staged.petName, staged.moveName) }];
  return finishAction(st, staged.attacker, events);
}
function applyStagedMiss(st, staged) {
  const events = [{ type: 'miss', side: staged.attacker, move: staged.moveName, text: `${staged.petName} 用了「${staged.moveName}」，却打中了烟幕和分身——落空啦！` }];
  return finishAction(st, staged.attacker, events);
}

/* 挂起前的即时分支：睡眠/麻痹导致无法行动（不进防守答题） */
function applyStagedBlocked(st, staged) {
  const events = [{ type: 'status', side: staged.attacker, pet: staged.petName, kind: staged.blocked, text: statusBlockedText(staged.blocked, staged.petName) }];
  return finishAction(st, staged.attacker, events);
}
// 从 staged 对象（只有招式名/属性）重建接触判定用的最小招式对象。
function stagedMoveForContact(staged) {
  const name = staged.moveName;
  const cat = moveCategory({ name, type: staged.moveType });
  return { name, damage_class: cat };
}

/* 防守结算：按防守结果修正预演伤害，真正扣血并走昏厥/胜负收尾。
 * defense: {kind:'dodge'|'block'|'guard'} 答对触发；{skipped:true} 放弃；{correct:false} 答错。 */
function resolveStagedAttack(st, staged, defense, rng = Math.random) {
  const side = staged.attacker;
  const foeSide = side === 'A' ? 'B' : 'A';
  const foe = st.sides[foeSide];
  const target = activePetOf(st, foeSide);
  const events = [];
  let finalDmg = staged.dmg;
  if (defense && defense.kind) {
    const dk = DEFENSE_KINDS.find((d) => d.kind === defense.kind);
    if (dk) finalDmg = Math.floor(staged.dmg * dk.ratio);
  }
  if (defense) {
    if (defense.kind === 'dodge') events.push({ type: 'defense', side: foeSide, kind: 'dodge', text: `${foe.childName} 答对了问题——${target.name} 一个闪身躲开了！（闪避，本次 0 伤害）` });
    else if (defense.kind === 'block') events.push({ type: 'defense', side: foeSide, kind: 'block', text: `${foe.childName} 答对了问题——${target.name} 格挡成功，伤害减半！（${staged.dmg} → ${finalDmg}）` });
    else if (defense.kind === 'guard') events.push({ type: 'defense', side: foeSide, kind: 'guard', text: `${foe.childName} 答对了问题——${target.name} 摆好防御姿势，伤害减少三分之一！（${staged.dmg} → ${finalDmg}）` });
    else if (defense.kind === 'ward') events.push({ type: 'defense', side: foeSide, kind: 'ward', text: `${foe.childName} 答对了问题——守护之光笼罩 ${target.name}，伤害减少四分之一！（${staged.dmg} → ${finalDmg}）` });
    else if (defense.timedOut) events.push({ type: 'defense', side: foeSide, kind: 'timeout', text: `${foe.childName} 120 秒没有答题，防守超时啦！这一招按放弃防守结算。` });
    else if (defense.skipped) events.push({ type: 'defense', side: foeSide, kind: 'skipped', text: `${foe.childName} 放弃了防守，硬扛下这一招！` });
    else events.push({ type: 'defense', side: foeSide, kind: 'failed', text: `${foe.childName} 答错啦，没能防住这一招！` });
  }
  if (typeof target.hp !== 'number' || !Number.isFinite(target.hp)) target.hp = 0;
  if (!trySturdy(st, target, finalDmg, events, foeSide)) target.hp = Math.max(0, target.hp - finalDmg);
  const mods = [...(staged.mods || [])];
  if (staged.drain === true) {
    const healed = drainHeal(activePetOf(st, side), finalDmg);
    if (healed > 0) mods.push(`吸取回复 ${healed}`);
  }
  // 特性吸取回复（储水/蓄电免疫时）在昏厥判定之前结算；特性触发事件在攻击事件之前。
  const abilityHeal = applyAbilityHeal(target, staged.ability);
  // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
  applyAbilityStages(target, staged.ability);
  // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
  applyAbilityFlashFire(target, staged.ability);
  events.push(...abilityEvents(staged.ability || [], side, foeSide, abilityHeal));
  // 文案（审查 S2）：最终伤害为 0（闪避/被完全防住）时不拼「会心一击！…造成 0 点伤害」的矛盾句
  const attackText = finalDmg > 0
    ? `${staged.petName} 用了「${staged.moveName}」！${staged.critical ? '会心一击！' : ''}${staged.mult > 1 ? '效果拔群！（×2）' : ''}对 ${target.name} 造成 ${finalDmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`
    : `${staged.petName} 用了「${staged.moveName}」，被 ${target.name} 完全挡下啦，没有造成伤害！`;
  events.push({
    type: 'attack', side, pet: staged.petName, move: staged.moveName, moveType: staged.moveType,
    dmg: finalDmg, mult: staged.mult, superEffective: staged.mult > 1, critical: staged.critical === true, target: target.name, targetHp: target.hp,
    text: attackText,
    mods,
  });
  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
  if (finalDmg > 0) applyContactTrigger(activePetOf(st, side), target, stagedMoveForContact(staged), rng, events, side, foeSide, (st.weather && st.weather.kind) || null, st);
  applyHitAbilityTriggers(activePetOf(st, side), target, {
    moveType: staged.moveType,
    category: staged.category || moveCategory({ name: staged.moveName, type: staged.moveType, damage_class: (officialMove(staged.moveName) || {}).damage_class }),
    critical: staged.critical === true, dmg: finalDmg, missed: false,
  }, events, side, foeSide, st);
  if (finalDmg > 0) applyCursedBody(target, activePetOf(st, side), staged.moveName, rng, events, foeSide, side, st);
  if (finalDmg > 0) applyAttackerContactTrigger(activePetOf(st, side), target, stagedMoveForContact(staged), rng, events, side, foeSide, (st.weather && st.weather.kind) || null, st);
  if (finalDmg > 0) applyStenchFlinch(activePetOf(st, side), target, stagedMoveForContact(staged), rng, events, side, foeSide, st);
  return settleAfterDamage(st, side, events, rng, stagedMoveForContact(staged));
}

/* PvP 等级压平：双方按较低一方等级作战（招式不变，仅等级/HP 按压平等级重算；
 * HP 走 PvP 专用 pvpMaxHp（含 PVP_HP_MULT），不影响道馆/合作的 battleMaxHp 口径） */
// 有 stats 按实际 HP 乘 PvP 倍率，无 stats 回落旧口径。
function pvpPetHp(pet, flatLevel) {
  return pet.stats ? Math.round(pet.stats.hp * PVP_HP_MULT) : pvpMaxHp(flatLevel);
}

/* 任务 73：备战展示宠的体力（满血）——与 pvpPetHp 同口径（实际六围 × PvP 倍率，
 * 无六围回落 pvpMaxHp）；只作棋盘展示，不进战斗结算。 */
function pvpBenchHp(no, level) {
  const st = (no != null) ? statsFor(no, level) : null;
  if (st) return Math.round(st.hp * PVP_HP_MULT);
  return pvpMaxHp(level);
}

function flattenSideLevel(side, flatLevel) {
  side.battleLevel = flatLevel;
  for (const p of side.pets) {
    p.level = flatLevel;
    p.stats = (p.no != null) ? statsFor(p.no, flatLevel) : null;
    p.maxHp = pvpPetHp(p, flatLevel);
    p.hp = p.maxHp;
  }
  return side;
}

/* 任务 73：兄弟对战棋盘备战展示——随身队里未入选出战的收藏宠（主宠＋携带上限 4 只，
 * 出战 2 只、备战最多 3 只）。只存物种身份快照（key/name/type/no/img），不含等级/体力，
 * 等级与体力由 battleView 按当前 battleLevel 现算，故加入展平后也不会过期。
 * 仅作棋盘展示，不进战斗结算、不挂换宠规则；battleNos 用 no 排除。
 * （2026-11-14 全量 151 批：主宠物种 25/4 已进 COLLECTION_MOVES；主宠与某只携带收藏宠
 * 同种时，battleNos 会同时排除那只收藏宠——已知角落情况，逻辑不动。） */
async function pvpBenchDisplayIds(db, childId, battleNos) {
  const inBattle = new Set((battleNos || []).map((n) => Number(n)).filter((n) => Number.isFinite(n)));
  const carried = await carriedCollection(db, childId);
  return carried.filter((c) => !inBattle.has(Number(c.no)))
    .map((c) => ({ key: `dex:${c.no}`, name: c.name, type: c.type, no: c.no, img: c.img }));
}

async function apiGymStatus(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const today = shDateStr();
  const ws = weekStartMon(today);
  const [cnt, gw, child, cleared, finalEggSetting, gymCollection, streakRows, activeRow, benchOptions] = await Promise.all([
    weekApprovedCount(db, childId, ws),
    db.prepare('SELECT * FROM gym_weeks WHERE child_id=? AND week_start=?')
      .bind(childId, ws).first(),
    getChild(db, childId),
    clearedStages(db, childId),
    getSetting(db, `gym_final_egg_${childId}`),
    carriedCollection(db, childId),
    // 道馆二期 Tier 1：连败计数（服务端记；streak ≥ 1 即 Tier 1；旧库无表时返回空）
    gymFailStreaksFor(db, childId),
    // 任务 128：进行中的闯关（刷新/重登后从道馆页接回）；开局会作废旧局，故至多一场
    db.prepare("SELECT id, stage FROM battles WHERE mode='gym' AND child_a=? AND status='active' ORDER BY id DESC LIMIT 1").bind(childId).first(),
    GATES_OPEN ? debugBenchOptions(db, childId) : null,
  ]);
  const streakByStage = new Map((streakRows || []).map((r) => [Number(r.stage), Number(r.streak) || 0]));
  const weekend = isWeekendDate(today);
  const myLevel = child ? levelFromXp(child.total_xp) : 1;
  const stages = GYM_STAGES.map((g) => {
    const sp = SPECIES[g.bossNo];
    const unlockedStage = g.stage === 1 || cleared.has(g.stage - 1);
    return {
      stage: g.stage, gymName: g.gymName, badge: g.badge,
      // type 取王牌的防守主属性（即关卡主题单属性），不用 SPECIES 单属性——SPECIES 把毒/超能力等
      // 种存成“普通”（TYPE_CHART 只有 9 键），S5 毒、S6 超能力会错成普通；bossDefTypes 是官方双属性。
      type: bossDefTypes(g.bossNo)[0],
      bossNo: g.bossNo, bossName: sp.name, bossImg: petImg(g.bossNo), bossLevel: g.bossLevel,
      bossTypes: bossDefTypes(g.bossNo),
      // 2026-11-17 8 关扩围：馆主队伍（按出场顺序，王牌最后），道馆列表展示用
      bossTeam: (g.bossTeam || [{ no: g.bossNo }]).map((m) => ({ no: m.no, name: SPECIES[m.no]?.name || `#${m.no}`, img: petImg(m.no) })),
      needLevel: g.needLevel, eggSpecies: g.eggSpecies, eggName: SPECIES[g.eggSpecies].name,
      preBattleHint: g.preBattleHint || '', // 2026-11-17 设计定稿 8.md 热修：馆主狠话明牌弱点
      // 每日随机天气（2026-11-17）：组队前可见，同一天同一关对所有孩子相同
      weather: gymDailyWeather(g.stage, today),
      cleared: cleared.has(g.stage), unlocked: unlockedStage,
      state: cleared.has(g.stage) ? 'cleared' : unlockedStage ? 'open' : 'locked',
      // 道馆二期 Tier 1：连败数与 tier（streak ≥ 1 激活 Tier 1：关卡横幅＋对战角标）
      failStreak: streakByStage.get(g.stage) || 0,
      tier: (streakByStage.get(g.stage) || 0) >= 1 ? 1 : 0,
    };
  });
  const activeBattle = activeRow ? { battleId: activeRow.id, stage: activeRow.stage } : null;
  const current = stages.find((s) => s.state === 'open') || stages[stages.length - 1];
  const finalEggAwarded = finalEggSetting === '1';
  return json({
    ok: true, today, isWeekend: weekend, weekStart: ws, weekApproved: cnt, need: 4,
    boss: { no: current.bossNo, name: current.bossName, img: current.bossImg },
    wonThisWeek: !!(gw && gw.won), eggAwardedThisWeek: !!(gw && gw.egg_awarded),
    canChallenge: GATES_OPEN || (weekend && cnt >= 4),
    gatesOpen: GATES_OPEN,
    reason: GATES_OPEN ? '' : !weekend ? '道馆只在周六、周日开放哦' : cnt < 4 ? `本周已打卡 ${cnt} 次，满 4 次才能挑战` : '',
    // —— 闯关梯子（迁移 0005）——
    myLevel, stages,
    badges: stages.map((s) => ({ stage: s.stage, badge: s.badge, type: s.type, lit: s.cleared })),
    clearedCount: cleared.size, finalEggAwarded, activeBattle,
    collection: gymCollection,
    ...(GATES_OPEN ? { benchOptions } : {}),
    balls: child ? (child.balls ?? 3) : 3,
    ballsSuper: child ? (child.balls_super ?? 0) : 0,
    // 主宠克制提示（借鉴包 v1 §6）：主宠属性克哪几关馆主
    mainType: child ? LINE_TYPE[child.line] : null,
    mainCounters: child ? countersForType(LINE_TYPE[child.line]) : [],
  });
}

/* 仓库表第 5/10 项：对战备战宠（道馆/兄弟对战 benchNo）必须在随身携带中。
 * 走 carriedCollection，不走 ownsSpecies——后者只认名册内＋pokedex 行存在、不看 carried。
 * 合作战不在此列（仍用 ownsSpecies）。 */
async function ownsCarriedSpecies(db, childId, no) {
  return (await carriedCollection(db, childId)).some((c) => Number(c.no) === Number(no));
}
/* benchNo 校验：通过返回 null，否则返回现成的 400 响应。
 * 已拥有但在仓库 → 提示先带回随身；未拥有 → 沿用旧文案。 */
async function benchNoGuard(db, childId, benchNo) {
  if (!benchNo) return null;
  const owned = await ownsSpecies(db, childId, benchNo);
  if (!owned) return json({ ok: false, error: '这只收藏宠还没有收集到哦' }, 400);
  // 测试站调试口径（GATES_OPEN，2026-11-06 起）：任意收藏种可当备战（含未携带），既有测试与调试路径依赖它，不动。
  if (GATES_OPEN) return null;
  if (await ownsCarriedSpecies(db, childId, benchNo)) return null;
  return json({ ok: false, error: '这只伙伴在仓库里，先把它带回随身队伍再选为备战' }, 400);
}

/* ---------------- 道馆改版：同时选招结算（DESIGN-道馆改版-v1） ----------------
 * 仅 gym 分支经 resolveGymRound 进入；PvP 的 stagePvpAttack / resolveStagedAttack /
 * 防守答题 / 超时链完全不经此路。一回合 = 双方同时选招：
 * 换宠先行 → 变化招挂标记（本回合即生效）→ 双方出招且均有速度数据时按速度顺序结算，
 * 先攻方一击打倒对方且对方无存活宠时，对方不出手；每次伤害后先 drain，再判昏厥/顶上。
 * 非双方出招或无速度数据时回落同时互算，昏厥方已选的招照常打出，
 * drain 回血在统一判昏厥/顶上之前；同回合双亡判馆主胜（挑战未通关，不发徽章）。
 * 仅单人道馆改速度顺序；旧 bossTakeTurn 交替回合已退役。 */
// 道馆伤害区间由 calcDamage 官方分支统一控制，不再保留独立区间常量。
const GYM_MAX_ROUNDS = 100; // 僵局保护：正常对局 ≤ ~15 回合，超限判挑战失败防卡死

/* 馆主 AI：系统动作「蓄势」= 给自己挂 charge（不占招式表）；其余按威力加权选招。
 * 权重与定参模拟（sim-gym-rework）一致：有蓄力必打出（最高威力 60%、其余均分）；
 * 玩家上场宠残血（≤30%）以斩杀为主（蓄势 10%、最高威力 75%）；
 * 玩家上回合刚用 shell → 蓄势 45% 惩罚龟壳；常规蓄势 25%、最高威力 50%、其余均分。 */
function gymBossChoose(st, rng = Math.random) {
  const pet = activePetOf(st, 'B');
  if (!pet || !Array.isArray(pet.moves) || pet.moves.length === 0) return { type: 'none' };
  const usable = pet.disabledMove ? pet.moves.filter((m) => m.name !== pet.disabledMove) : pet.moves;
  if (usable.length === 0) return { type: 'none' }; // 定身（Batch 9 D-11）：全被定身则不出招。
  const sorted = [...usable].sort((a, b) => b.power - a.power);
  const pickAttack = (topW) => {
    const rest = (1 - topW) / Math.max(1, sorted.length - 1);
    let r = rollRng(rng);
    for (let i = 0; i < sorted.length; i++) {
      const w = i === 0 ? topW : rest;
      if (r < w) return { type: 'move', move: sorted[i] };
      r -= w;
    }
    return { type: 'move', move: sorted[0] };
  };
  if (fxOf(st, 'B').charge) return pickAttack(0.6); // 蓄力必打出
  const foePet = activePetOf(st, 'A');
  const foeFrac = foePet && foePet.maxHp ? foePet.hp / foePet.maxHp : 1;
  let pCharge = 0.25;
  if (foeFrac <= 0.3) pCharge = 0.1; // 斩杀线：以攻击为主
  else if (st.gym && st.gym.lastPlayerKind === 'shell') pCharge = 0.45; // 惩罚龟壳
  if (rollRng(rng) < pCharge) return { type: 'charge' };
  return pickAttack(foeFrac <= 0.3 ? 0.75 : 0.5);
}

/* 变化招挂标记（本回合伤害阶段即按标记结算）；返回本方本回合的行动类别，
 * 供回合末记录玩家行为（馆主 AI 读 lastPlayerKind 判断是否惩罚龟壳）。 */
function applyGymRoundMarks(st, side, act, events, rng = Math.random) {
  const pet = activePetOf(st, side);
  // 2b：睡眠/麻痹导致无法行动时不蓄势、不挂标记，推状态事件（每行动只检定一次：伤害招在 gymStrike 里检定）。
  if (act.type === 'charge') { // 馆主系统动作「蓄势」
    const blocked = statusBlocksAction(pet, rng);
    if (blocked) {
      events.push({ type: 'status', side, pet: pet.name, kind: blocked, text: statusBlockedText(blocked, pet.name) });
      return 'blocked';
    }
    fxOf(st, side).charge = true;
    events.push({ type: 'effect', side, kind: 'charge', text: `${pet.name} 开始蓄势！下一击的威力会大增，小心啦！` });
    return 'charge';
  }
  if (act.type !== 'move') return act.type; // 'swap' / 'none'
  const eff = moveEffectOf(act.move.name);
  if (!eff || eff === 'drain') return 'attack';
  const blocked = statusBlocksAction(pet, rng);
  if (blocked) {
    events.push({ type: 'status', side, pet: pet.name, kind: blocked, text: statusBlockedText(blocked, pet.name) });
    return 'blocked';
  }
  if (eff === 'transform') { // 变身：复制对面当前上场宠（0 伤害，不挂标记）
    const foeSide = side === 'A' ? 'B' : 'A';
    const target = activePetOf(st, foeSide);
    const fromName = pet.name;
    const copied = applyTransform(pet, target);
    events.push({ type: 'effect', side, kind: 'transform', move: act.move.name, text: copied ? `${fromName} 用了「变身」！变成了 ${copied.name} 的样子！` : `${fromName} 用了「变身」！但是什么都没有发生……` });
    return 'transform';
  }
  // 魔法镜（Batch 12）：防守方带魔法镜时，weak/smoke 反弹回攻击方。
  // 返回原效果种类 eff（馆主 AI 读 lastPlayerKind，只认招式种类，不认反弹）。
  const foeSide = side === 'A' ? 'B' : 'A';
  const bounced = tryMagicBounce(st, side, foeSide, eff, act.move.skillLevel || 1, act.move.name);
  if (bounced) {
    events.push(bounced);
    return eff;
  }
  applyEffectFlag(st, side, eff, act.move.skillLevel || 1);
  events.push({ type: 'effect', side, kind: eff, move: act.move.name, text: effectEventText(eff, pet.name, act.move.name) });
  return eff;
}

/* 单方伤害（纯计算不落账）：烟幕落空判定 → 区间伤害 → charge/weak/shell 依次消费，
 * 每步取整保底 1（与 consumeAttackMods 同口径）。变化招（非 drain）无伤害且不消费
 * 任何标记；落空只消费 smoke，不消费攻方 charge/weak 与守方 shell。 */
function gymStrike(st, atkSide, defSide, act, rng, movedLast = false) {
  if (act.type !== 'move') return { dmg: 0, drain: false, kind: 'none' };
  const eff = moveEffectOf(act.move.name);
  if (eff && eff !== 'drain') return { dmg: 0, drain: false, kind: 'effect' };
  const atk = activePetOf(st, atkSide);
  const def = activePetOf(st, defSide);
  // 2b：睡眠/麻痹导致无法行动（不消费 smoke，不消费攻击标记；速度分支下后攻方在此时检定，
  // 先攻的接触触发已可影响后攻——与官方顺序一致）。
  const blocked = statusBlocksAction(atk, rng);
  if (blocked) return { dmg: 0, drain: false, kind: 'blocked', blocked };
  if (fxOf(st, atkSide).smoke) {
    const smokeLv = (typeof fxLvOf(st, atkSide).smoke === 'number' ? skillLevelOf({ x: fxLvOf(st, atkSide).smoke }, 'x') : 1);
    delete fxOf(st, atkSide).smoke; delete fxLvOf(st, atkSide).smoke;
    if (rollRng(rng) < SKILL_SMOKE_MISS[smokeLv - 1]) return { dmg: 0, drain: false, kind: 'miss' };
  }
  // 道馆攻击仅选择官方规则，不再传入伤害区间。
  // 友好度加成（D10，本次并进第一期）：只进道馆、只作用于玩家主宠（key==='main'）。
  // 暴击：友好度 255 时主宠出招暴击率 1/16→1/8（经 opts.critRate，不改 CRIT_RATE 全局常量）。
  // 闪避：友好度 ≥204 时主宠被打 +5%（经 opts.dodgePct，只动官方分支命中检定行；经典分支不加命中检定）。
  const friendship = (st.gym && Number.isFinite(st.gym.friendship)) ? st.gym.friendship : 0;
  const dmgOpts = { chart: 'official', weather: (st.weather && st.weather.kind) || null, st };
  if (movedLast) dmgOpts.movedLast = true;
  if (atkSide === 'A' && atk.key === 'main' && friendship >= 255) dmgOpts.critRate = 1 / 8;
  if (defSide === 'A' && def.key === 'main' && friendship >= 204) dmgOpts.dodgePct = 5;
  const dmgRes = calcDamage(act.move, atk, def, rng, dmgOpts);
  if (dmgRes.error) return { dmg: 0, drain: false, kind: 'error', error: dmgRes.error };
  // 命中检定落空直接返回，不消费攻击标记。
  if (dmgRes.missed === true) return { dmg: 0, drain: false, kind: 'acc-miss' };
  const modded = consumeAttackMods(st, atkSide, dmgRes.dmg);
  return {
    dmg: modded.dmg, drain: eff === 'drain', kind: 'hit',
    critical: dmgRes.critical === true, mult: dmgRes.mult, mods: modded.mods || [],
    ability: dmgRes.ability || [],
  };
}

/* 出招事件组装（落账后调用，targetHp 为最终值；吸取回复并入 mods 文案，与旧引擎同形）。
 * 返回事件数组：特性触发事件（有则）在前，攻击/miss 事件在后。 */
function gymStrikeEvent(st, atkSide, act, hit, heal) {
  const defSide = atkSide === 'A' ? 'B' : 'A';
  // 特性事件（hit.abilityHeal 为调用方应用特性吸取后的实际回复量，供文案用）。
  const abilityEvs = abilityEvents(hit.ability || [], atkSide, defSide, hit.abilityHeal || 0);
  if (hit.kind === 'miss') {
    const atk = activePetOf(st, atkSide);
    return [...abilityEvs, { type: 'miss', side: atkSide, move: act.move.name, text: `${atk.name} 用了「${act.move.name}」，却打中了烟幕和分身——落空啦！` }];
  }
  // 命中检定落空沿用 miss 事件，文案与烟幕落空区分。
  if (hit.kind === 'acc-miss') {
    const atk = activePetOf(st, atkSide);
    return [...abilityEvs, { type: 'miss', side: atkSide, move: act.move.name, text: `${atk.name} 用了「${act.move.name}」，却没打中！` }];
  }
  // 2b：睡眠/麻痹导致无法行动。
  if (hit.kind === 'blocked') {
    const atk = activePetOf(st, atkSide);
    return [{ type: 'status', side: atkSide, pet: atk.name, kind: hit.blocked, text: statusBlockedText(hit.blocked, atk.name) }];
  }
  if (hit.kind !== 'hit') return abilityEvs;
  const atk = activePetOf(st, atkSide);
  const def = activePetOf(st, defSide);
  const mods = [...(hit.mods || [])];
  if (heal > 0) mods.push(`吸取回复 ${heal}`);
  return [...abilityEvs, {
    type: 'attack', side: atkSide, pet: atk.name, move: act.move.name, moveType: act.move.type,
    dmg: hit.dmg, mult: hit.mult, superEffective: hit.mult > 1, resisted: hit.mult > 0 && hit.mult < 1, immune: hit.mult === 0, critical: hit.critical === true,
    target: def.name, targetHp: def.hp,
    text: hit.mult === 0 ? `${atk.name} 用了「${act.move.name}」！没有效果！` : `${atk.name} 用了「${act.move.name}」！${hit.critical ? '会心一击！' : ''}${hit.mult > 1 ? '效果拔群！（×2）' : hit.mult > 0 && hit.mult < 1 ? '效果不好…（×0.5）' : ''}对 ${def.name} 造成 ${hit.dmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`,
    mods,
  }];
}

/* 道馆一回合结算。action: { moveName } 或 { swapToIdx }（换宠优先）。
 * 成功返回 { events }；参数/状态错误返回 { error } 且调用方不应保存。 */
function resolveGymRound(st, action, rng = Math.random) {
  if (!st || st.mode !== 'gym') return { error: 'NOT_GYM' };
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (!st.gym) st.gym = { lastPlayerKind: null }; // 改版前存量对局补字段
  // 天气（第三期简化版）：旧存量对局无 weather 字段，默认无天气。
  if (!st.weather) st.weather = { kind: null };
  // 友好度战斗加成（D10，本次并进第一期）：旧存量对局无此字段，默认无加成。
  if (!Number.isFinite(st.gym.friendship)) st.gym.friendship = 0;
  if (st.gym.endureUsed == null) st.gym.endureUsed = false;
  const A = st.sides && st.sides.A;
  const B = st.sides && st.sides.B;
  if (!A || !B) return { error: 'NO_ACTIVE_PET' };
  const aPetStart = activePetOf(st, 'A');
  if (!aPetStart || !(aPetStart.hp > 0)) return { error: 'NO_ACTIVE_PET' };
  if (!activePetOf(st, 'B')) return { error: 'NO_ACTIVE_PET' };

  // 玩家行动校验（用药优先于换宠/出招；换宠只能换给存活的非上场宠）
  let playerAct = null;
  if (action && action.itemKey) {
    // 道馆用药（v11 §9.3）：用药是本回合行动，先生效、玩家本回合不出招，馆主照常攻击
    const itemKey = String(action.itemKey);
    const eff = GYM_ITEM_EFFECTS[itemKey];
    if (!eff) return { error: 'ITEM_NOT_USABLE' };
    st.gym.itemUses = st.gym.itemUses || { heal: 0, revive: 0, boost: 0 };
    if ((st.gym.itemUses[eff.kind] || 0) >= (GYM_ITEM_CAPS[eff.kind] || 0)) return { error: 'ITEM_CAP_REACHED' };
    let targetIdx = null;
    if (eff.kind === 'revive') {
      targetIdx = Number(action.targetIdx);
      if (!Number.isInteger(targetIdx) || targetIdx < 0 || targetIdx >= A.pets.length || A.pets[targetIdx].hp > 0 || targetIdx === A.activeIdx) {
        return { error: 'ITEM_TARGET_INVALID' };
      }
    }
    if (eff.kind === 'heal' && aPetStart.hp >= aPetStart.maxHp) return { error: 'ITEM_NO_NEED' }; // 满血禁止浪费性使用
    playerAct = { type: 'item', itemKey, targetIdx, effect: eff };
  } else if (action && action.swapToIdx !== null && action.swapToIdx !== undefined) {
    const idx = Number(action.swapToIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= A.pets.length || idx === A.activeIdx || !(A.pets[idx].hp > 0)) {
      return { error: 'SWAP_INVALID' };
    }
    const trap = canSwitchOut(st, 'A');
    if (trap) return { error: 'SWAP_TRAPPED', ability: trap.ability };
    playerAct = { type: 'swap', toIdx: idx };
  } else {
    const moveName = action && action.moveName ? String(action.moveName) : null;
    if (!moveName) return { error: 'MUST_CHOOSE_MOVE' };
    const move = Array.isArray(aPetStart.moves) ? aPetStart.moves.find((m) => m.name === moveName) : null;
    if (!move) return { error: 'MOVE_NOT_LEARNED' };
    if (aPetStart.disabledMove === moveName) return { error: 'MOVE_DISABLED' };
    playerAct = { type: 'move', move };
  }
  // 馆主在回合开始状态上同时决策（与玩家同一起点；只读不改状态）
  const bossAct = gymBossChoose(st, rng);

  const preEvents = []; // 换宠 + 挂标记
  const postEvents = []; // 昏厥 + 顶上
  // 0. 主动换宠先行：新宠承受本回合全部攻击，换宠方本回合不出招
  if (playerAct.type === 'swap') {
    // 2a/2b：下场清阶段；自然回复下场时清除状态并推事件。新宠顶上后触发威吓。
    onPetLeavesField(st, 'A', aPetStart, preEvents);
    A.activeIdx = playerAct.toIdx;
    const np = activePetOf(st, 'A');
    preEvents.push({ type: 'swap', side: 'A', pet: np.name, text: `换 ${np.name} 上场！` });
    triggerSwitchIn(st, 'A', preEvents);
  }
  // 0.5 用药先生效（v11 §9.3）：回血上场宠／复活昏厥备战宠；复活宠在备战位，本回合不行动
  let itemUsed = null;
  if (playerAct.type === 'item') {
    const eff = playerAct.effect;
    st.gym.itemUses = st.gym.itemUses || { heal: 0, revive: 0, boost: 0 };
    st.gym.itemRounds = st.gym.itemRounds || {};
    if (eff.kind === 'heal') {
      const pet = activePetOf(st, 'A');
      const amount = Math.min(Math.floor(pet.maxHp * eff.pct / 100), pet.maxHp - pet.hp);
      pet.hp += amount;
      st.gym.itemUses.heal += 1;
      st.gym.itemRounds[st.turnNo] = { itemKey: playerAct.itemKey, targetIdx: null, amount };
      preEvents.push({ type: 'item', side: 'A', itemKey: playerAct.itemKey, amount, targetHp: pet.hp, text: `用了「${ITEM_CATALOG[playerAct.itemKey].name}」，${pet.name} 恢复了 ${amount} 点体力！` });
      itemUsed = { itemKey: playerAct.itemKey, targetIdx: null, amount };
    } else if (eff.kind === 'revive') {
      const pet = A.pets[playerAct.targetIdx];
      const amount = Math.floor(pet.maxHp * eff.pct / 100);
      pet.hp = amount;
      st.gym.itemUses.revive += 1;
      st.gym.itemRounds[st.turnNo] = { itemKey: playerAct.itemKey, targetIdx: playerAct.targetIdx, amount };
      preEvents.push({ type: 'item', side: 'A', itemKey: playerAct.itemKey, targetIdx: playerAct.targetIdx, amount, targetHp: pet.hp, text: `用了「${ITEM_CATALOG[playerAct.itemKey].name}」，${pet.name} 恢复了 ${amount} 点体力，重新站起来了！` });
      itemUsed = { itemKey: playerAct.itemKey, targetIdx: playerAct.targetIdx, amount };
    }
  }
  // 1. 变化招挂标记（本回合即生效：本回合打出的防御能挡本回合的攻击）
  const aKind = applyGymRoundMarks(st, 'A', playerAct, preEvents, rng);
  applyGymRoundMarks(st, 'B', bossAct, preEvents, rng);
  // 2-3. 单人道馆按速度顺序出招；顶上逻辑共用，事件写入对应结算队列。
  const events = [...preEvents];
  const promote = (sideKey, targetEvents) => {
    const sd = st.sides[sideKey];
    const nextIdx = sd.pets.findIndex((p) => p.hp > 0);
    if (nextIdx < 0) return false;
    sd.activeIdx = nextIdx;
    targetEvents.push({ type: 'swap', side: sideKey, pet: sd.pets[nextIdx].name, text: `${sd.pets[nextIdx].name} 上场啦！` });
    // 2a：顶上的宠若带威吓，降对方攻击。
    triggerSwitchIn(st, sideKey, targetEvents);
    return true;
  };
  // 2b：回合末结算（状态扣血/治愈/睡眠计数）。扣血致昏厥时推 faint 事件并顶上（顶不上有后备则记 out）。
  // 局部辅助：用本回合的 promote（含威吓触发）；返回 {aOut, bOut}。
  const settleEot = (targetEvents) => {
    const fainted = tickActiveStatuses(st, rng, targetEvents);
    let aOutEot = false, bOutEot = false;
    for (const { side: fSide, pet: fPet } of fainted) {
      targetEvents.push({ type: 'faint', side: fSide, pet: fPet.name, text: `${fPet.name} 倒下了！` });
      clearPetBattleState(fPet);
      if (!promote(fSide, targetEvents)) {
        if (fSide === 'A') aOutEot = true; else bOutEot = true;
      }
    }
    return { aOut: aOutEot, bOut: bOutEot };
  };
  // 2a/2b（D6）：速度按 effectiveSpeed（阶段修正，麻痹 ×0.5）；无属性时沿用旧口径（不同时结算）。
  // 天气（第三期简化版）：叶绿素晴天/悠游自如雨天速度×2，只影响道馆出招顺序。
  const aPetSpd = activePetOf(st, 'A');
  const bPetSpd = activePetOf(st, 'B');
  const weatherOff = (aPetSpd && petAbility(aPetSpd, st) === '无关天气') || (bPetSpd && petAbility(bPetSpd, st) === '无关天气');
  const effWeather = weatherOff ? null : st.weather.kind;
  const aSpeed = aPetSpd.stats ? effectiveSpeed(aPetSpd, effWeather, st) : undefined;
  const bSpeed = bPetSpd.stats ? effectiveSpeed(bPetSpd, effWeather, st) : undefined;
  let aOut = false;
  let bOut = false;
  // 仅双方出招且速度均有限时启用顺序结算；平速才消耗一次随机数。
  if (playerAct.type === 'move' && bossAct.type === 'move' &&
      Number.isFinite(aSpeed) && Number.isFinite(bSpeed)) {
    const first = aSpeed > bSpeed ? 'A' : bSpeed > aSpeed ? 'B' : rollRng(rng) < 0.5 ? 'A' : 'B';
    const second = first === 'A' ? 'B' : 'A';
    // 两次攻击共用伤害、吸取、事件与即时昏厥处理，后攻现取顶上后的宠。
    const strikeOnce = (atkSide, defSide, act) => {
      let fainted = false; // 死亡回合用：本招打倒对方且有后备顶上时为 true（2026-11-20 用户定）
      const hit = gymStrike(st, atkSide, defSide, act, rng, atkSide === second);
      if (hit.error) return { error: hit.error };
      const atkPet = activePetOf(st, atkSide);
      const defPet = activePetOf(st, defSide);
      if (typeof defPet.hp !== 'number' || !Number.isFinite(defPet.hp)) defPet.hp = 0;
      if (!trySturdy(st, defPet, hit.dmg, events, defSide)) defPet.hp = Math.max(0, defPet.hp - hit.dmg);
      const heal = hit.drain && hit.dmg > 0 ? drainHeal(atkPet, hit.dmg) : 0;
      // 特性吸取回复（储水/蓄电免疫时）紧随 drain 回血、昏厥判定之前结算。
      hit.abilityHeal = applyAbilityHeal(defPet, hit.ability);
      // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
      applyAbilityStages(defPet, hit.ability);
      // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
      applyAbilityFlashFire(defPet, hit.ability);
      events.push(...gymStrikeEvent(st, atkSide, act, hit, heal));
      if (defPet.hp <= 0) {
        // 友好度硬撑：主宠致命伤按档概率留 1 HP，每场限 1 次（drain 回血之后判）。
        if (defSide === 'A' && tryEndure(st, defSide, defPet, rng)) {
          events.push({ type: 'endure', side: defSide, pet: defPet.name, text: `${defPet.name} 和你的羁绊让它撑住了！只剩 1 点体力！` });
        } else {
          events.push({ type: 'faint', side: defSide, pet: defPet.name, text: `${defPet.name} 倒下了！` });
          applyMoxie(atkPet, events, atkSide, st);
          const boomDmg = applyAftermath(atkPet, defPet, act.move, events, defSide, st);
          // 2b：昏厥时清除状态与阶段（不推事件）。
          clearPetBattleState(defPet);
          if (!promote(defSide, events)) {
            if (boomDmg > 0 && atkPet.hp <= 0) {
              events.push({ type: 'faint', side: atkSide, pet: atkPet.name, text: `${atkPet.name} 倒下了！` });
              clearPetBattleState(atkPet);
              if (!st.sides[atkSide].pets.some((p) => p.hp > 0)) return { out: 'A' };
            }
            return { out: defSide };
          }
          fainted = true; // 防守方倒下且有后备顶上
          if (boomDmg > 0 && atkPet.hp <= 0) {
            events.push({ type: 'faint', side: atkSide, pet: atkPet.name, text: `${atkPet.name} 倒下了！` });
            clearPetBattleState(atkPet);
            if (!promote(atkSide, events)) return { out: atkSide };
            fainted = true; // 攻击方被反伤打倒且有后备顶上
          }
        }
      }
      // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
      // 放在昏厥判定之后：昏厥的宠不触发；顶上的新宠不是被打中的那只，不触发。
      if (hit.dmg > 0 && hit.kind === 'hit') applyContactTrigger(atkPet, defPet, act.move, rng, events, atkSide, defSide, (st.weather && st.weather.kind) || null, st);
      if (hit.dmg > 0 && hit.kind === 'hit') applyHitAbilityTriggers(atkPet, defPet, {
        moveType: (officialMove(act.move.name) || {}).type || act.move.type,
        category: moveCategory(act.move), critical: hit.critical === true, dmg: hit.dmg, missed: false,
      }, events, atkSide, defSide, st);
      if (hit.dmg > 0 && hit.kind === 'hit') applyCursedBody(defPet, atkPet, act.move.name, rng, events, defSide, atkSide, st);
      if (hit.dmg > 0 && hit.kind === 'hit') applyAttackerContactTrigger(atkPet, defPet, act.move, rng, events, atkSide, defSide, (st.weather && st.weather.kind) || null, st);
      if (hit.dmg > 0 && hit.kind === 'hit') applyStenchFlinch(atkPet, defPet, act.move, rng, events, atkSide, defSide, st);
      return { out: null, fainted };
    };
    const firstAct = first === 'A' ? playerAct : bossAct;
    const secondAct = second === 'A' ? playerAct : bossAct;
    const firstResult = strikeOnce(first, second, firstAct);
    if (firstResult.error) return { error: firstResult.error };
    if (firstResult.out) {
      st.winner = firstResult.out === first ? second : first;
    } else if (firstResult.fainted) {
      // 死亡回合（2026-11-20 用户定）：先攻打倒对方后回合到此结束，顶上的新宠本回合不再行动；
      // 出招清零，双方下回合重新选招。只跑回合末状态结算，不跑第二招。
      const eot = settleEot(events);
      aOut = aOut || eot.aOut;
      bOut = bOut || eot.bOut;
    } else {
      const secondResult = strikeOnce(second, first, secondAct);
      if (secondResult.error) return { error: secondResult.error };
      if (secondResult.out) st.winner = secondResult.out === second ? first : second;
      else {
        // 2b：双方出招完成且无人出局时，回合末结算状态（扣血/治愈/睡眠计数）。
        const eot = settleEot(events);
        aOut = aOut || eot.aOut;
        bOut = bOut || eot.bOut;
      }
    }
  } else {
  // 2-3. 伤害互算：双方伤害只依赖回合开始快照（属性/等级/标记），先算完再同时落账
  const aHit = gymStrike(st, 'A', 'B', playerAct, rng);
  const bHit = gymStrike(st, 'B', 'A', bossAct, rng);
  if (aHit.error) return { error: aHit.error };
  if (bHit.error) return { error: bHit.error };
  const aPet = activePetOf(st, 'A');
  const bPet = activePetOf(st, 'B');
  if (typeof aPet.hp !== 'number' || !Number.isFinite(aPet.hp)) aPet.hp = 0;
  if (typeof bPet.hp !== 'number' || !Number.isFinite(bPet.hp)) bPet.hp = 0;
  if (!trySturdy(st, bPet, aHit.dmg, events, 'B')) bPet.hp = Math.max(0, bPet.hp - aHit.dmg);
  if (!trySturdy(st, aPet, bHit.dmg, events, 'A')) aPet.hp = Math.max(0, aPet.hp - bHit.dmg);
  // 4. drain 回血在昏厥判定之前结算（回血后 HP>0 则不昏厥，能把自己救回来）
  const aHeal = aHit.drain && aHit.dmg > 0 ? drainHeal(aPet, aHit.dmg) : 0;
  const bHeal = bHit.drain && bHit.dmg > 0 ? drainHeal(bPet, bHit.dmg) : 0;
  // 特性吸取回复（储水/蓄电免疫时）紧随 drain 回血、昏厥判定之前结算。
  aHit.abilityHeal = applyAbilityHeal(bPet, aHit.ability);
  bHit.abilityHeal = applyAbilityHeal(aPet, bHit.ability);
  // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
  applyAbilityStages(bPet, aHit.ability);
  applyAbilityStages(aPet, bHit.ability);
  // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
  applyAbilityFlashFire(bPet, aHit.ability);
  applyAbilityFlashFire(aPet, bHit.ability);
  events.push(...gymStrikeEvent(st, 'A', playerAct, aHit, aHeal));
  events.push(...gymStrikeEvent(st, 'B', bossAct, bHit, bHeal));
  // 5. 昏厥与顶上（回合末统一处理；顶上的新宠本回合不再行动）
  // 友好度硬撑：主宠致命伤按档概率留 1 HP，每场限 1 次（drain 回血之后判）。
  let aDown = aPet.hp <= 0;
  let bDown = bPet.hp <= 0;
  if (aDown && tryEndure(st, 'A', aPet, rng)) {
    aDown = false;
    postEvents.push({ type: 'endure', side: 'A', pet: aPet.name, text: `${aPet.name} 和你的羁绊让它撑住了！只剩 1 点体力！` });
  }
  let bFaintHandled = false;
  if (bDown) {
    postEvents.push({ type: 'faint', side: 'B', pet: bPet.name, text: `${bPet.name} 倒下了！` });
    applyMoxie(aPet, postEvents, 'A', st);
    const boomDmg = applyAftermath(aPet, bPet, playerAct.move, postEvents, 'B', st);
    if (boomDmg > 0 && aPet.hp <= 0) aDown = true;
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(bPet);
    bFaintHandled = true;
    if (!promote('B', postEvents)) bOut = true;
  }
  if (aDown) {
    postEvents.push({ type: 'faint', side: 'A', pet: aPet.name, text: `${aPet.name} 倒下了！` });
    applyMoxie(bPet, postEvents, 'B', st);
    const boomDmg = applyAftermath(bPet, aPet, bossAct.move, postEvents, 'A', st);
    if (boomDmg > 0 && bPet.hp <= 0) bDown = true;
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(aPet);
    if (!promote('A', postEvents)) aOut = true;
  }
  if (bDown && !bFaintHandled) {
    postEvents.push({ type: 'faint', side: 'B', pet: bPet.name, text: `${bPet.name} 倒下了！` });
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(bPet);
    if (!promote('B', postEvents)) bOut = true;
  }
  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、防守方存活且招式为接触时掷 30%）。
  // 按宠引用传参：昏厥的宠 hp 已为 0、函数内部守卫不触发；顶上的新宠不是被打中的那只，不触发。
  // 事件进 postEvents（在昏厥/顶上事件之后）。
  if (aHit.dmg > 0 && aHit.kind === 'hit') applyContactTrigger(aPet, bPet, playerAct.move, rng, postEvents, 'A', 'B', (st.weather && st.weather.kind) || null, st);
  if (aHit.dmg > 0 && aHit.kind === 'hit') applyHitAbilityTriggers(aPet, bPet, {
    moveType: (officialMove(playerAct.move.name) || {}).type || playerAct.move.type,
    category: moveCategory(playerAct.move), critical: aHit.critical === true, dmg: aHit.dmg, missed: false,
  }, postEvents, 'A', 'B', st);
  if (aHit.dmg > 0 && aHit.kind === 'hit') applyCursedBody(bPet, aPet, playerAct.move.name, rng, postEvents, 'B', 'A', st);
  if (bHit.dmg > 0 && bHit.kind === 'hit') applyContactTrigger(bPet, aPet, bossAct.move, rng, postEvents, 'B', 'A', (st.weather && st.weather.kind) || null, st);
  if (bHit.dmg > 0 && bHit.kind === 'hit') applyHitAbilityTriggers(bPet, aPet, {
    moveType: (officialMove(bossAct.move.name) || {}).type || bossAct.move.type,
    category: moveCategory(bossAct.move), critical: bHit.critical === true, dmg: bHit.dmg, missed: false,
  }, postEvents, 'B', 'A', st);
  if (bHit.dmg > 0 && bHit.kind === 'hit') applyCursedBody(aPet, bPet, bossAct.move.name, rng, postEvents, 'A', 'B', st);
  if (aHit.dmg > 0 && aHit.kind === 'hit') applyAttackerContactTrigger(aPet, bPet, playerAct.move, rng, postEvents, 'A', 'B', (st.weather && st.weather.kind) || null, st);
  if (aHit.dmg > 0 && aHit.kind === 'hit') applyStenchFlinch(aPet, bPet, playerAct.move, rng, postEvents, 'A', 'B', st);
  if (bHit.dmg > 0 && bHit.kind === 'hit') applyAttackerContactTrigger(bPet, aPet, bossAct.move, rng, postEvents, 'B', 'A', (st.weather && st.weather.kind) || null, st);
  if (bHit.dmg > 0 && bHit.kind === 'hit') applyStenchFlinch(bPet, aPet, bossAct.move, rng, postEvents, 'B', 'A', st);
  // 2b：双方均未出局时，回合末结算状态（扣血/治愈/睡眠计数）。
  if (!aOut && !bOut) {
    const eot = settleEot(postEvents);
    aOut = aOut || eot.aOut;
    bOut = bOut || eot.bOut;
  }
  events.push(...postEvents);
  }
  // 顺序结算下双亡不可达，仅作防御；同时回落模式仍用它。
  if (aOut && bOut) st.winner = 'B'; // 同回合双亡：挑战未通关，判馆主胜（不发徽章）
  else if (bOut) st.winner = 'A';
  else if (aOut) st.winner = 'B';
  st.turnNo = (st.turnNo || 1) + 1;
  st.acted.A = (st.acted.A || 0) + 1;
  st.acted.B = (st.acted.B || 0) + 1;
  st.turn = 'A'; // 每回合双方各行动一次，玩家侧恒可行动（turn='A'）；回合内出招顺序由速度定
  st.gym.lastPlayerKind = aKind;
  if (!st.winner && st.turnNo > GYM_MAX_ROUNDS) {
    st.winner = 'B';
    events.push({ type: 'note', text: '战斗持续太久啦，这次挑战失败，下次再来！' });
  }
  pushLog(st, events);
  return { events, itemUsed };
}

function battleView(row, st) {
  const sideView = (s) => (s ? {
    childId: s.childId, childName: s.childName, battleLevel: s.battleLevel,
    line: s.line || null,
    activeIdx: s.activeIdx || 0,
    pets: s.pets.map((p, i) => ({
      key: p.key, name: p.name, type: p.type, no: p.no, img: p.img, level: p.appLevel ?? p.level,
      hp: p.hp, maxHp: p.maxHp, active: i === (s.activeIdx || 0), fainted: p.hp <= 0, moves: p.moves,
      // 道馆二期 Tier 1：官方双属性（克制角标按它算倍率；单属性 type 不够，双属性才准）
      defTypes: p.defTypes || null,
      disabledMove: p.disabledMove || null, // 定身（Batch 9）：前端置灰用
    })),
    // 任务 73：备战展示——随身队里未入选出战的收藏宠；等级/体力按当前 battleLevel 现算（满血），
    // 加入展平后也不过期。仅作棋盘展示，不进战斗结算（道馆 side 无 benchDisplay，恒为空数组）。
    bench: (s.benchDisplay || []).map((b) => {
      const maxHp = pvpBenchHp(b.no, s.battleLevel);
      return { key: b.key, name: b.name, type: b.type, no: b.no, img: b.img, level: s.battleLevel, hp: maxHp, maxHp, fainted: false };
    }),
  } : null);
  // 道馆改版：回合内按速度先后结算，但每回合双方各行动一次，进行中一律视为等玩家行动（turn='A'）；
  // 改版前存量道馆对局（turn 可能停在 'B'）由此归一，不会卡在「馆主行动中」。PvP 不受影响。
  const viewTurn = row.status === 'active' ? (row.mode === 'gym' ? 'A' : st.turn) : null;
  return {
    battleId: row.id, mode: row.mode, stage: row.stage, status: row.status,
    weekStart: row.week_start,
    turn: viewTurn, turnNo: st.turnNo,
    firstSide: st.firstSide,
    // 房号模式：建局方输的 4 位房号；发起方在道馆页看到它、告诉对方输一样的进房
    roomCode: st.roomCode || null,
    // 天气（第三期简化版）：前端角标用；旧存量对局无此字段默认 null。
    weather: (st.weather && st.weather.kind) || null,
    // 道馆回合内按速度先后结算，玩家每回合恒可行动（canSideAttack 的先攻规则只对 PvP/旧引擎成立）
    canAttack: row.status === 'active' && !st.winner ? (row.mode === 'gym' ? true : canSideAttack(st, viewTurn || st.turn)) : false,
    winnerSide: st.winner || null, winnerChildId: row.winner_child_id,
    phase: st.pending ? 'defense' : 'move',
    fx: st.fx || { A: {}, B: {} },
    pending: st.pending ? {
      attackerSide: st.pending.attacker, defenderSide: st.pending.attacker === 'A' ? 'B' : 'A',
      moveName: st.pending.moveName, petName: st.pending.petName, targetName: st.pending.targetName,
      question: st.pending.question || null,
      /* 防守超时计时（前端倒计时用）：sinceEpoch 为题生成时刻，
       * 存量 pending 未被相关请求触及前为 null、deadlineEpoch 亦为 null，前端不显示倒计时 */
      sinceEpoch: st.pending.sinceEpoch || null,
      deadlineEpoch: st.pending.sinceEpoch ? st.pending.sinceEpoch + PVP_DEFENSE_TIMEOUT_SECS : null,
      timeoutSecs: PVP_DEFENSE_TIMEOUT_SECS,
    } : null,
    sides: { A: sideView(st.sides.A), B: sideView(st.sides.B) },
    log: st.log || [],
  };
}

async function loadBattle(db, battleId) {
  const row = await db.prepare('SELECT * FROM battles WHERE id=?').bind(battleId).first();
  if (!row) return null;
  let st = null;
  try { st = JSON.parse(row.state || '{}'); } catch { st = null; }
  return { row, st };
}

/* 保存战斗状态。expectedState（loadBattle 时读到的原始 state 字符串）可选：
 * 提供时 UPDATE 带 AND state=? 做轻量 CAS——状态已被别的请求推进过则 0 行、
 * 返回 false，调用方应放弃本次写入（路由层回 409 STATE_CHANGED）；
 * 不提供时行为与旧版一致（无条件更新、返回 true）。 */
async function saveBattle(db, row, st, expectedState) {
  const args = [JSON.stringify(st), row.status, row.winner_child_id, row.counted, row.finished_epoch, row.id];
  const touchBattleRow = async () => {
    const vA = await bumpChildVersion(db, row.child_a);
    await touchRow(db, 'battles', 'id=?', [row.id], vA);
    if (row.child_b) { const vB = await bumpChildVersion(db, row.child_b); await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB)); }
  };
  if (expectedState === undefined) {
    await db.prepare('UPDATE battles SET state=?, status=?, winner_child_id=?, counted=?, finished_epoch=? WHERE id=?')
      .bind(...args).run();
    await touchBattleRow();
    return true;
  }
  const r = await db.prepare('UPDATE battles SET state=?, status=?, winner_child_id=?, counted=?, finished_epoch=? WHERE id=? AND state=?')
    .bind(...args, expectedState).run();
  if (r.meta && r.meta.changes) await touchBattleRow();
  return !!(r.meta && r.meta.changes);
}

/* 道馆用药视图（v11 §9.3）：可用药（背包余量）＋本场已用次数＋上限；只用于 gym 对局 */
async function gymItemsView(db, childId, st) {
  const uses = (st.gym && st.gym.itemUses) || { heal: 0, revive: 0, boost: 0 };
  const items = [];
  for (const [key, eff] of Object.entries(GYM_ITEM_EFFECTS)) {
    const qty = await getInventoryQty(db, childId, key);
    items.push({ key, name: ITEM_CATALOG[key].name, emoji: ITEM_CATALOG[key].emoji, kind: eff.kind, rate: eff.pct, qty, used: uses[eff.kind] || 0, cap: GYM_ITEM_CAPS[eff.kind] || 0 });
  }
  return { items, uses, caps: GYM_ITEM_CAPS };
}

/* 对战规则阶段 2（L5）：从战斗日志汇总防守表现——答对题数（dodge/block/guard/ward）与闪避次数。
 * 纯函数；defense 事件的 side 即防守方；超时／放弃／答错不计入“守住”。 */
function defenseSummaryFromLog(log) {
  const out = { A: { answered: 0, dodges: 0 }, B: { answered: 0, dodges: 0 } };
  for (const e of (log || [])) {
    if (!e || e.type !== 'defense' || (e.side !== 'A' && e.side !== 'B')) continue;
    if (e.kind === 'dodge' || e.kind === 'block' || e.kind === 'guard' || e.kind === 'ward') {
      out[e.side].answered += 1;
      if (e.kind === 'dodge') out[e.side].dodges += 1;
    }
  }
  return out;
}

/* 道馆二期 Tier 1：读某孩子的连败行；表不存在（迁移 0041 未应用的旧库）时返回空，
 * 不让核心接口（道馆状态页）因一张提示用的表而 500。 */
async function gymFailStreaksFor(db, childId) {
  if (!(await hasEvoTable(db, 'gym_fail_streaks'))) return [];
  const r = await db.prepare('SELECT stage, streak FROM gym_fail_streaks WHERE child_id=?').bind(childId).all();
  return (r && r.results) || [];
}

/* 战斗收尾：置 finished、记胜者；PvP 计次并给胜者 +1 精灵球（不发经验）。
 * expectedState 传入时先做 CAS 保存、成功后才发奖：保存失败说明状态已被
 * 别的请求推进，返回 {conflict:true} 让路由层回 409，绝不发奖——避免出现
 * 「奖励已发但状态没存上」后重试导致的重复发奖。保存成功后本场 status 已是
 * finished，后续重复出招请求会被 apiBattleMove 的状态检查挡住。 */
async function finalizeBattle(db, row, st, today, expectedState) {
  row.status = 'finished';
  row.finished_epoch = Math.floor(Date.now() / 1000);
  const winnerSide = st.winner;
  const winnerChildId = winnerSide ? st.sides[winnerSide].childId : null;
  row.winner_child_id = winnerChildId;
  const winnerPetsLeft = winnerSide ? st.sides[winnerSide].pets.filter((p) => p.hp > 0).length : 0;
  st.result = { winnerSide, winnerChildId, winnerPetsLeft, totalActions: (st.acted.A || 0) + (st.acted.B || 0) };
  // 对战规则阶段 2（L5）：PvP 结算时把防守表现写进 result（败者防守只进单场战报，不上冠军墙）；
  // 道馆／合作无防守事件，不写该字段，旧局无此字段时前端按“无防守数据”省略。
  if (row.mode === 'pvp') st.result.defense = defenseSummaryFromLog(st.log);
  pushLog(st, []);
  if (row.mode === 'pvp' && !st.rematch) row.counted = 1; // 计次随 CAS 保存一起落库，发奖在其后；再来一局不计次（保守口径，待用户定案）
  const saved = await saveBattle(db, row, st, expectedState);
  if (!saved) return { conflict: true };
  let rewards = null;
  if (row.mode === 'gym' && (winnerSide === 'A' || winnerSide === 'B') && row.child_a) {
    // 道馆二期 Tier 1：在线对战的连败计数在这里记（CAS 保存成功后才记，保存失败
    // 返回 conflict、调用方回 409，绝不重复记；弃赛不走这里、不计连败）。
    await gymFailStreakRecord(db, row.child_a, row.stage, winnerSide === 'A', row.finished_epoch);
  }
  if (row.mode === 'gym' && winnerSide === 'A' && winnerChildId) {
    rewards = await awardGymClear(db, winnerChildId, row.stage, today);
  }
  if (row.mode === 'pvp' && st.rematch) {
    // 再来一局结算（保守口径，待用户定案）：不发冠军球、不改周冠军；批准单在此消费，用完即止
    if (st.rematchRequestId) {
      await db.prepare("UPDATE pvp_rematch_requests SET status='consumed', granted_battle_id=? WHERE id=? AND status='approved'")
        .bind(row.id, st.rematchRequestId).run();
    }
    rewards = { rematch: true };
  } else if (row.mode === 'pvp' && winnerChildId) {
    await db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(winnerChildId).run();
    await syncTouch(db, winnerChildId, 'children', 'id=?', [winnerChildId]);
    await settleBallOverflow(db, winnerChildId, today); // v11：球满 99 自动向上兑换
    rewards = { ballsAwarded: 1, champion: true };
  }
  return rewards;
}

async function apiBattleGymStart(db, req, session) {
  return withChild(db, req, session, async (child, body) => {
    const cfg = GYM_STAGES.find((g) => g.stage === Number(body.stage));
    if (!cfg) return json({ ok: false, error: '没有这一关' }, 400);
    const today = shDateStr();
    const ws = weekStartMon(today);
    if (!GATES_OPEN) {
      if (!isWeekendDate(today)) return json({ ok: false, error: '道馆只在周六、周日开放哦' }, 400);
      const cnt = await weekApprovedCount(db, child.id, ws);
      if (cnt < 4) return json({ ok: false, error: `本周已打卡 ${cnt} 天，满 4 天才能挑战道馆` }, 400);
    }
    const level = levelFromXp(child.total_xp);
    if (!GATES_OPEN && level < cfg.needLevel) return json({ ok: false, error: `这一关要 Lv.${cfg.needLevel} 才能挑战，你现在 Lv.${level}，先升级吧` }, 400);
    const cleared = await clearedStages(db, child.id);
    if (!GATES_OPEN && cfg.stage > 1 && !cleared.has(cfg.stage - 1)) {
      return json({ ok: false, error: '先通关前一关，这一关还没解锁哦' }, 400);
    }
    const benchNo = body.benchNo ? Number(body.benchNo) : null;
    const benchErr = await benchNoGuard(db, child.id, benchNo);
    if (benchErr) return benchErr;
    await attachEvoForm(db, child, today); // v11：主宠须按实际形态（用石后的终极／伊布分支）出战；任务 126 提前——leadNo 校验须准确主宠号（不能只按等级推）
    await attachInstanceAbilities(db, child);
    await attachExMain(db, child, benchNo); // 任务 110：备战前主宠挂线信息
    // 任务 126：先发宠物 leadNo（可选）——须是随身宠物（主宠或携带列表），否则明确报错；
    // 校验须在作废旧对局之前，失败请求不产生副作用。
    const carriedEntries = await carriedCollection(db, child.id);
    const form0 = formInfo(child);
    const mainNo0 = form0.branchNo || (form0.img ? LINES[child.line].forms[form0.formIdx - 1].no : null);
    const leadNo = body.leadNo ? Number(body.leadNo) : null;
    if (leadNo) {
      const carriedNos = new Set([mainNo0, ...carriedEntries.map((c) => c.no)]);
      if (!carriedNos.has(leadNo)) {
        return json({ ok: false, code: 'LEAD_NOT_CARRIED', error: '先发宠物必须是随身携带的伙伴哦' }, 400);
      }
    }
    // 同一孩子同时只留一场进行中的闯关：旧的未完成闯关自动作废
    const doomed = (await db.prepare("SELECT id FROM battles WHERE mode='gym' AND child_a=? AND status='active'").bind(child.id).all()).results || [];
    let version;
    await db.prepare("UPDATE battles SET status='abandoned', finished_epoch=? WHERE mode='gym' AND child_a=? AND status='active'")
      .bind(Math.floor(Date.now() / 1000), child.id).run();
    if (doomed.length) {
      version = await bumpChildVersion(db, child.id);
      for (const d of doomed) await touchRow(db, 'battles', 'id=?', [d.id], version);
    }
    const sp = SPECIES[cfg.bossNo];
    let sideA, sideB, st;
    try {
      // 等比换算：战斗内等级一律用有效等级（玩家 floor(App×2.25)、馆主 floor(bossLevel×本关系数)）。
      // 任务 126：开局带全部随身宠物（主宠＋携带，最多 5 只），leadNo 指定先发。
      // 原版可带多只精灵，精灵数量不是平衡因素（2026-11-17 问题 3 纠正：不限制队伍人数）；
      // 平衡改从招式/克制/等级下手，见 gym-stages.js 的 bossTeam 与 BOSS_FOLLOW。
      sideA = buildPlayerSide(child, effPlayerLevel(level), benchNo, { carried: carriedEntries, leadNo });
      // 馆主等级跟随（任务 3 追加）：孩子超等级时馆主上浮到孩子有效等级的 85%，
      // 让属性克制咬得住；门槛等级附近仍用配置等级（定参仿真口径不动）。
      const bossBattleLevel = effBossBattleLevel(cfg, effPlayerLevel(level));
      // 2026-11-17 8 关扩围：馆主改为多只轮换（bossTeam 按原版队伍，王牌最后出场），
      // 全队同有效等级 bossBattleLevel；倒下后 settleAfterDamage/resolveGymRound 自动换下一只上场。
      // bossNo 仍为王牌种族号（展示/图鉴用）。bossTeam 缺失时回落到单只 bossMoves（兼容旧数据）。
      const bossTeam = cfg.bossTeam || [{ no: cfg.bossNo, moves: cfg.bossMoves }];
      sideB = {
        childId: null, childName: `${cfg.gymName}馆主 · ${sp.name}`, battleLevel: bossBattleLevel, activeIdx: 0,
        pets: bossTeam.map((m) => {
          const msp = SPECIES[m.no];
          return makePet({
            key: `boss:${m.no}`, name: msp.name, type: msp.type,
            defTypes: bossDefTypes(m.no),
            no: m.no, img: petImg(m.no),
            level: bossBattleLevel, hpMult: cfg.hpMult ?? BOSS_HP_MULT,
            moves: m.moves.map(([n, t, p]) => { const off = officialMove(n); return { name: n, type: t, damage_class: off ? off.damage_class : undefined, power: p }; }),
          });
        }),
      };
      // 战斗视图显示的等级仍为 App 等级（避免孩子困惑）：pet.level 是有效等级（引擎用），appLevel 仅供展示。
      sideA.pets.forEach((p) => { p.appLevel = level; });
      sideB.pets.forEach((p) => { p.appLevel = cfg.bossLevel; });
      const firstSide = 'A'; // 道馆改版：同时选招，无先攻、无首回合跳过（firstSide 仅保留字段兼容）
      // 天气（每日随机，2026-11-17）：按关卡＋上海日期掷定，与道馆列表显示的今日天气一致，整场持续。
      st = createBattleState({ mode: 'gym', firstSide, sides: { A: sideA, B: sideB }, weather: gymDailyWeather(cfg.stage, today) });
      // 友好度战斗加成（D10）：开局读出挂到 st.gym（纯值，随 state 落库）。
      st.gym.friendship = await getChildMainFriendship(db, child, today);
      st.gym.endureUsed = false;
    } catch (e) {
      return json({ ok: false, error: 'PET_DATA_INVALID' }, 400); // 宠物/招式数据坏了：开战前拦住，不裸 500
    }
    const r = await db.prepare(
      'INSERT INTO battles(mode, week_start, stage, child_a, state, status, created_epoch) VALUES(?,?,?,?,?,?,?)'
    ).bind('gym', ws, cfg.stage, child.id, JSON.stringify(st), 'active', Math.floor(Date.now() / 1000)).run();
    if (r.meta && r.meta.changes > 0) {
      if (version === undefined) version = await bumpChildVersion(db, child.id);
      await touchRow(db, 'battles', 'id=?', [Number(r.meta.last_row_id)], version);
    }
    const row = await db.prepare('SELECT * FROM battles WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ ok: true, battle: battleView(row, st) });
  });
}

/* 孩子密码校验（PvP 加入用）：与孩子登录同一套失败计数/锁定口径，防猜密码代打 */
async function verifyChildPwd(db, child, password) {
  if (!child.pwd_hash) return { ok: false, status: 403, error: '对方还没设置小密码，请爸爸妈妈先在设置里给他设置哦' };
  const now = Math.floor(Date.now() / 1000);
  if ((child.pwd_locked_until || 0) > now) {
    return { ok: false, status: 429, error: '对方密码被锁住啦，5 分钟后再试' };
  }
  const h = await sha256hex(String(password || ''));
  if (h !== child.pwd_hash) {
    // 原子自增再回读：旧快照回写在并发连点时计数不涨，失败锁定形同虚设
    await db.prepare('UPDATE children SET pwd_fail_count = pwd_fail_count + 1 WHERE id=?').bind(child.id).run();
    const fresh = await db.prepare('SELECT pwd_fail_count FROM children WHERE id=?').bind(child.id).first();
    const fails = fresh ? (fresh.pwd_fail_count || 0) : (child.pwd_fail_count || 0) + 1;
    if (fails >= PIN_LOCK_MAX) {
      await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=? WHERE id=?')
        .bind(now + PIN_LOCK_SECS, child.id).run();
      return { ok: false, status: 429, error: '密码错太多次，被锁住啦，5 分钟后再试' };
    }
    return { ok: false, status: 401, error: `密码不对，还能试 ${PIN_LOCK_MAX - fails} 次` };
  }
  await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=0 WHERE id=?').bind(child.id).run();
  return { ok: true };
}

async function pvpWeekGate(db, childId, today, ws) {
  if (GATES_OPEN) return { ok: true, weekApproved: await weekApprovedCount(db, childId, ws) };
  if (!isWeekendDate(today)) return { ok: false, error: '兄弟对战只在周末开放哦' };
  const cnt = await weekApprovedCount(db, childId, ws);
  if (cnt < 4) return { ok: false, error: `本周打卡还没满 4 天（现在 ${cnt} 天），达标后才能对战`, weekApproved: cnt };
  return { ok: true, weekApproved: cnt };
}

/* 防守题：从防守方答过的问题里抽一道（本周优先，其次近 30 天），没有记录则不触发防守答题 */
/* 防守题抽脑筋急转弯的概率（2026-11-09 用户定：谜语只出现在兄弟对战中） */
const DEFENSE_RIDDLE_RATE = 1 / 3;

async function pickDefenseQuestion(db, defenderChildId, today, ws, rng = Math.random) {
  const since30 = addDays(today, -29);
  /* 防守题加门（2026-10-24 超纲事件后补齐）：按防守方进度过滤其作答历史，
   * 历史里已有的超纲题不再复现；非数学题不受门约束，与每日问答口径一致 */
  const defender = await getChild(db, defenderChildId);
  const [mathGate, chineseGate, englishGate] = defender
    ? await Promise.all([loadMathGate(db, defender), loadChineseGate(db, defender), loadEnglishGate(db, defender)])
    : [null, null, null];
  const { results } = await db.prepare(
    `SELECT q.id, q.question, q.options_json, q.subject, q.kind, q.chapter, MAX(a.date_shanghai) AS last_date
     FROM quiz_attempts a JOIN quiz_questions q ON q.id = a.question_id
     WHERE a.child_id=? AND q.active=1 AND q.kind != 'oak' AND a.date_shanghai>=?
     GROUP BY q.id`
  ).bind(defenderChildId, since30).all();
  const pool = (results || []).filter((r) => mathGatePass(
    { kind: r.kind, subject: r.subject, chapter: r.chapter ?? null }, mathGate) && chineseGatePass(
    { kind: r.kind, subject: r.subject, chapter: r.chapter ?? null }, chineseGate) && englishGatePass(
    { kind: r.kind, subject: r.subject, chapter: r.chapter ?? null }, englishGate));
  /* 脑筋急转弯混合（2026-11-09 用户定：谜语只出现在兄弟对战中）：
   * 约 1/3 直接从题库抽一道 active 谜语（不依赖答过记录）；历史池为空时全用谜语兜底，
   * 仍要能触发防守答题；无谜语时返回 null，走即时结算兜底。谜语直接放行进度门。 */
  const pickRiddle = async () => {
    const { results } = await db.prepare(
      `SELECT id, question, options_json, subject, kind, chapter FROM quiz_questions WHERE kind='riddle' AND active=1`
    ).all();
    const rows = results || [];
    if (!rows.length) return null;
    const r = rows[Math.floor(rng() * rows.length) % rows.length];
    const options = safeJsonArr(r.options_json);
    if (!Array.isArray(options) || options.length < 2) return null;
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return { id: r.id, question: r.question, options: shuffled, subject: '' };
  };
  if (!pool.length) return pickRiddle();
  if (rng() < DEFENSE_RIDDLE_RATE) {
    const rq = await pickRiddle();
    if (rq) return rq;
  }
  /* 本周偏好（与旧 SQL 的 ORDER BY (MAX(date) >= ws) DESC, RANDOM() 同义）：先本周内随机，再全部随机 */
  const weekPool = pool.filter((r) => r.last_date >= ws);
  const cands = weekPool.length ? weekPool : pool;
  const r = cands[Math.floor(Math.random() * cands.length) % cands.length];
  const options = safeJsonArr(r.options_json);
  if (!Array.isArray(options) || options.length < 2) return null;
  // 选项打乱顺序（服务端按文本判对错，不受顺序影响）
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { id: r.id, question: r.question, options: shuffled, subject: r.subject || '' };
}

async function otherChild(db, childId, opponentId) {
  const me = await getChild(db, childId);
  const all = await getChildren(db, me && me.family_id); // 只列同一家庭的孩子（family_id 来自孩子档案，不是前端传的）
  const want = Number(opponentId) || 0;
  if (want) return all.find((c) => c.id === want && c.id !== childId) || null; // 只能从「同一家」(children 表)里选，没有跨家搜索
  return all.find((c) => c.id !== childId) || null;
}
const notSameFamily = () => json({ ok: false, error: 'FORBIDDEN', message: '只能邀请同一家的小伙伴' }, 403);
/* 状态接口选对手：前端点名了就用点名的；没点名时，优先显示「邀请了我」的那一局的发起人，否则取第一个兄弟姐妹 */
async function resolvePvpOpponent(db, me, opponentId, ws) {
  if (Number(opponentId)) return otherChild(db, me.id, opponentId);
  const { results } = await db.prepare("SELECT child_a, state FROM battles WHERE mode='pvp' AND week_start=? AND status='waiting' AND child_a<>?").bind(ws, me.id).all();
  for (const r of results) {
    let st = {};
    try { st = JSON.parse(r.state || '{}'); } catch { /* 坏数据忽略 */ }
    if (st.invitedChildId === me.id) return otherChild(db, me.id, r.child_a);
  }
  return otherChild(db, me.id);
}

/* 第三期：兄弟对战先发校验与排阵。
 * 先发只能是出战的主宠（主宠号）或所选备战宠；队伍＝主宠＋至多 1 只备战宠（PvP 不带整支随身队，口径不变）。
 * 仓库表第 5/10 项：调用方都在 benchNoGuard 通过之后才调本函数，benchNo 必在携带中，故 leadNo 自动随之收紧。 */
function pvpLeadAllowed(child, benchNo, leadNo) {
  const f = formInfo(child);
  const mainNo = f.branchNo || (f.img ? LINES[child.line].forms[f.formIdx - 1].no : null);
  return leadNo === mainNo || (!!benchNo && leadNo === benchNo);
}
/* 排阵：先把主宠排回首位、按较小队伍人数裁剪（一方没带备战宠 → 双方都只出主宠，口径不变），
 * 再把先发宠移到队首（先发被裁掉则仍是主宠先发）。 */
function pvpOrderTeam(side, teamSize, leadNo) {
  const pets = side.pets.slice().sort((a, b) => (b.key === 'main') - (a.key === 'main'));
  const kept = pets.slice(0, teamSize);
  const li = leadNo ? kept.findIndex((p) => p.no === leadNo) : -1;
  if (li > 0) { const [lead] = kept.splice(li, 1); kept.unshift(lead); }
  side.pets = kept;
  side.activeIdx = 0;
}

async function apiBattlePvpCreate(db, req, session) {
  return withChild(db, req, session, async (me, body) => {
    const other = await otherChild(db, me.id, body.opponentId);
    if (!other) return Number(body.opponentId) ? notSameFamily() : json({ ok: false, error: '找不到对战伙伴' }, 400);
    const today = shDateStr();
    const ws = weekStartMon(today);
    // 已有待加入/进行中的对战 → 直接返回（恢复）
    const existing = await db.prepare(
      "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status IN ('waiting','active') AND (child_a=? OR child_b=?) ORDER BY id DESC LIMIT 1"
    ).bind(ws, me.id, me.id).first();
    if (existing) {
      const st = JSON.parse(existing.state || '{}');
      return json({ ok: true, resumed: true, battle: battleView(existing, st) });
    }
    // 对方已经建好本周待加入的局 → 不要再建第二局，否则两人互加对方的局会打成两场正式对战、重复计次发球
    const oppWaiting = await db.prepare(
      "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status='waiting' AND child_a=? ORDER BY id DESC LIMIT 1"
    ).bind(ws, other.id).first();
    if (oppWaiting) {
      const st = JSON.parse(oppWaiting.state || '{}');
      return json({ ok: true, resumed: true, opponentWaiting: true, battle: battleView(oppWaiting, st) });
    }
    const [g1, g2] = await Promise.all([pvpWeekGate(db, me.id, today, ws), pvpWeekGate(db, other.id, today, ws)]);
    if (!g1.ok) return json({ ok: false, error: g1.error }, 400);
    if (!g2.ok) return json({ ok: false, error: `${other.name} ${g2.error}` }, 400);
    // 计次闸门：本周正式对战已打完时，只有家长批准待用的「再来一局」能再开一场（标记 st.rematch，结算不计次）
    let rematchGrant = null;
    if (!GATES_OPEN && (await pvpCountedThisWeek(db, me.id, ws) || await pvpCountedThisWeek(db, other.id, ws))) {
      const latest = await latestRematchRequest(db, ws, me.family_id);
      if (latest && latest.status === 'approved') rematchGrant = latest;
      else return json({ ok: false, error: '本周的正式对战已经打过啦，下周末再战！' }, 400);
    } else if (GATES_OPEN) {
      // 测试站门槛放行时也要挂上已批准的“再来一局”，否则再来一局会被当成普通正式局计次发球、批准单永不消费
      const latest = await latestRematchRequest(db, ws, me.family_id);
      if (latest && latest.status === 'approved') rematchGrant = latest;
    }
    const benchNo = body.benchNo ? Number(body.benchNo) : null;
    const benchErr = await benchNoGuard(db, me.id, benchNo);
    if (benchErr) return benchErr;
    await attachEvoForm(db, me, today); // v11：主宠须按实际形态出战
    await attachInstanceAbilities(db, me);
    await attachExMain(db, me, benchNo); // 任务 110：备战前主宠挂线信息
    // 第三期：先发 leadNo（可选；客户端扔球选先发时带）——只能是主宠或备战宠，校验失败不建局（无副作用）
    const leadNo = body.leadNo ? Number(body.leadNo) : null;
    if (leadNo && !pvpLeadAllowed(me, benchNo, leadNo)) {
      return json({ ok: false, code: 'LEAD_NOT_CARRIED', error: '先发宠物必须是出战的主宠或备战宠哦' }, 400);
    }
    // 房号模式：建局方输的 4 位房号存在局里，加入方输对房号才能进；不带房号则不设（老流程/直接建局兜底）
    const roomCode = typeof body.roomCode === 'string' ? body.roomCode.trim() : '';
    if (roomCode && !/^\d{4}$/.test(roomCode)) {
      return json({ ok: false, error: '房号是 4 位数字哦' }, 400);
    }
    let sideA, st;
    try {
      sideA = buildPlayerSide(me, levelFromXp(me.total_xp), benchNo, leadNo ? { leadNo } : {});
      if (leadNo) sideA.leadNo = leadNo; // 加入时按较小队伍裁剪后据此重排先发
      // 任务 73：备战展示快照——随身队里未入选出战的收藏宠（仅展示数据）；失败不阻塞建局。
      try { sideA.benchDisplay = await pvpBenchDisplayIds(db, me.id, benchNo ? [benchNo] : []); } catch { sideA.benchDisplay = []; }
      st = createBattleState({ mode: 'pvp', firstSide: 'A', sides: { A: sideA, B: null } });
      if (rematchGrant) { st.rematch = true; st.rematchRequestId = rematchGrant.id; }
      if (roomCode) st.roomCode = roomCode;
      st.invitedChildId = other.id; // 邀请的对手（同一家列表里点名）：只有被邀请的人能加入这一局
    } catch (e) {
      return json({ ok: false, error: 'PET_DATA_INVALID' }, 400);
    }
    const r = await db.prepare(
      'INSERT INTO battles(mode, week_start, stage, child_a, state, status, created_epoch) VALUES(?,?,?,?,?,?,?)'
    ).bind('pvp', ws, null, me.id, JSON.stringify(st), 'waiting', Math.floor(Date.now() / 1000)).run();
    if (r.meta && r.meta.changes > 0) {
      await syncTouch(db, me.id, 'battles', 'id=?', [Number(r.meta.last_row_id)]);
    }
    const row = await db.prepare('SELECT * FROM battles WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ ok: true, battle: battleView(row, st) });
  });
}

async function apiBattlePvpJoin(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got || got.row.mode !== 'pvp') return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.status !== 'waiting') return json({ ok: false, error: '这场对战已经开始或结束啦' }, 400);
  // 往周遗留的 waiting 局不能加入：计次会落在旧 week_start 上，本周还能再打一场
  if (row.week_start !== weekStartMon(shDateStr())) {
    await db.prepare("UPDATE battles SET status='abandoned' WHERE id=? AND status='waiting'").bind(row.id).run();
    await syncTouch(db, row.child_a, 'battles', 'id=?', [row.id]);
    return json({ ok: false, error: '这场对战是上周留下的，已经作废啦，重新建一场吧' }, 400);
  }
  // 加入方一律取会话里的孩子（孩子会话不能冒充别人加入；家长会话才按 body.childId 指定）
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const joinerId = sc.id;
  const joiner = joinerId ? await getChild(db, joinerId) : null;
  if (!joiner) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  { // 跨家庭的对战局一律当不存在（只能加入同一家庭孩子建的局）
    const host = joiner.family_id ? await getChild(db, row.child_a) : null;
    if (host && host.family_id !== joiner.family_id) return notFound404();
  }
  if (st.invitedChildId && joiner.id !== st.invitedChildId) return notSameFamily();
  if (joiner.id === row.child_a) return json({ ok: false, error: '不能和自己对战哦' }, 400);
  // 房号模式：建局时设了房号的局，加入时输房号；没设房号的老局仍按加入方自己的小密码校验
  if (st.roomCode) {
    if (String(body.password || '') !== String(st.roomCode)) {
      return json({ ok: false, error: '房号不对，问问对方输的什么房号吧' }, 403);
    }
  } else {
    const v = await verifyChildPwd(db, joiner, body.password);
    if (!v.ok) return json({ ok: false, error: v.error }, v.status);
  }
  const today = shDateStr();
  const ws = weekStartMon(today);
  const [g1, g2] = await Promise.all([pvpWeekGate(db, row.child_a, today, ws), pvpWeekGate(db, joiner.id, today, ws)]);
  if (!g1.ok) return json({ ok: false, error: g1.error }, 400);
  if (!g2.ok) return json({ ok: false, error: g2.error }, 400);
  // 再来一局（st.rematch）由建局时的家长批准解锁，加入时不再被计次闸门挡；普通局维持原口径
  if (!GATES_OPEN && !st.rematch && (await pvpCountedThisWeek(db, row.child_a, ws) || await pvpCountedThisWeek(db, joiner.id, ws))) {
    return json({ ok: false, error: '本周的正式对战已经打过啦，下周末再战！' }, 400);
  }
  const benchNo = body.benchNo ? Number(body.benchNo) : null;
  const benchErr = await benchNoGuard(db, joiner.id, benchNo);
  if (benchErr) return benchErr;
  // 出战数取双方较少一方：一方没收藏宠 → 双方都只出主宠
  const flatLevel = Math.min(st.sides.A.battleLevel, levelFromXp(joiner.total_xp));
  await attachEvoForm(db, joiner, today); // v11：主宠须按实际形态出战
  await attachInstanceAbilities(db, joiner);
  await attachExMain(db, joiner, benchNo); // 任务 110：备战前主宠挂线信息
  // 第三期：加入方先发 leadNo（可选）；校验在任何写入之前
  const joinLeadNo = body.leadNo ? Number(body.leadNo) : null;
  if (joinLeadNo && !pvpLeadAllowed(joiner, benchNo, joinLeadNo)) {
    return json({ ok: false, code: 'LEAD_NOT_CARRIED', error: '先发宠物必须是出战的主宠或备战宠哦' }, 400);
  }
  let sideB;
  try {
    flattenSideLevel(st.sides.A, flatLevel);
    sideB = buildPlayerSide(joiner, flatLevel, benchNo);
    // B 方 HP 同走 PvP 专用口径（buildPlayerSide 为道馆/合作共用、不带倍率，这里补齐）
    for (const p of sideB.pets) { p.maxHp = pvpPetHp(p, flatLevel); p.hp = p.maxHp; }
  } catch (e) {
    return json({ ok: false, error: 'PET_DATA_INVALID' }, 400);
  }
  const teamSize = Math.min(st.sides.A.pets.length, sideB.pets.length);
  pvpOrderTeam(st.sides.A, teamSize, st.sides.A.leadNo || null); // A 方先发在建局时已定
  pvpOrderTeam(sideB, teamSize, joinLeadNo);
  if (joinLeadNo) sideB.leadNo = joinLeadNo;
  st.sides.B = sideB;
  // 任务 73：备战展示按加入后实际出战阵容重算——出战数取较少一方，被裁掉的出战宠回备战展示；
  // 等级/体力由 battleView 按 battleLevel 现算。失败不阻塞加入（A 沿用建局快照、B 置空）。
  try {
    st.sides.A.benchDisplay = await pvpBenchDisplayIds(db, row.child_a, st.sides.A.pets.map((p) => p.no));
    sideB.benchDisplay = await pvpBenchDisplayIds(db, joiner.id, sideB.pets.map((p) => p.no));
  } catch { st.sides.A.benchDisplay = st.sides.A.benchDisplay || []; sideB.benchDisplay = []; }
  st.firstSide = Math.random() < 0.5 ? 'A' : 'B';
  st.turn = st.firstSide;
  // 2a：B 方加入、对战正式开始时补触发双方威吓（建局时 B 为空，createBattleState 里的触发是空操作）。
  {
    const joinEvents = [];
    triggerSwitchIn(st, 'A', joinEvents);
    triggerSwitchIn(st, 'B', joinEvents);
    pushLog(st, joinEvents);
  }
  const token = randToken();
  row.child_b = joiner.id;
  row.status = 'active';
  row.join_token_hash = await sha256hex(token);
  // 先 CAS 保存状态成功，再落 child_b / join_token_hash 两列：
  // CAS 失败（状态已被别的请求改动）时不留半成品加入记录
  const savedJoin = await saveBattle(db, row, st, got.row.state);
  if (!savedJoin) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await db.prepare('UPDATE battles SET child_b=?, status=?, join_token_hash=? WHERE id=?')
    .bind(row.child_b, row.status, row.join_token_hash, row.id).run();
  return json({ ok: true, joinToken: token, battle: battleView(row, st) });
}

/* ---------------- PvP 防守答题超时（用户定案 2026-10-22） ----------------
 * 120 秒；起算前提是「双方都已进入对战」且防守题已生成，缺一不计时：
 * 在场信号取自现有状态机——apiBattlePvpJoin 是唯一把对局置 active 的路径，
 * 加入方输 PIN 验证通过后才落 child_b 与 sides.B，且 pending 只能由
 * apiBattleMove 在 active 局里生成。故 row.status='active' + child_b 非空 +
 * sides.B 非空即「双方已进入」，不另造在场/心跳机制。
 * 超时 = 防守方放弃本次防御：按未触发防御的原始伤害结算，对战继续，
 * 不整场判负、不作废。存量 pending（借鉴包上线前生成、无 sinceEpoch）
 * 在相关请求首次触及时补记起算点并落盘，从那时起算 120 秒——既不误杀，
 * 也保证卡死老局在下一次有人打开后至多 120 秒必被推进。 */
const PVP_DEFENSE_TIMEOUT_SECS = 120;

function bothSidesEntered(row, st) {
  return row.status === 'active' && !!row.child_b && !!(st && st.sides && st.sides.A && st.sides.B);
}

/* 纯函数层推进（原地改 st，不落盘）：
 * 返回 null=无 pending/未到齐/未超时；{settled:false, backfilled:true}=刚为存量
 * pending 补记起算点；{settled:true, events}=已按放弃防御结算（含胜负判定）。 */
function stepDefenseTimeout(row, st, nowEpoch) {
  if (!row || row.mode !== 'pvp' || !st || !st.pending) return null;
  if (!bothSidesEntered(row, st)) return null; // 对方还没进入：保持等待，永不超时
  if (!st.pending.sinceEpoch) {
    st.pending.sinceEpoch = nowEpoch;
    return { settled: false, backfilled: true };
  }
  if (nowEpoch - st.pending.sinceEpoch < PVP_DEFENSE_TIMEOUT_SECS) return null;
  const p = st.pending;
  const staged = {
    attacker: p.attacker, moveName: p.moveName, moveType: p.moveType,
    petName: p.petName, targetName: p.targetName, dmg: p.dmg, mult: p.mult,
    critical: p.critical === true, mods: p.mods || [], drain: p.drain === true,
    // 一期 bug 修复：重建时漏了 ability，PvP 两段式防守路径会丢掉一期特性吸取回复（储水/蓄电）与二期升档（避雷针/电气引擎）。
    ability: p.ability || [],
  };
  const r = resolveStagedAttack(st, staged, { kind: null, skipped: true, correct: false, timedOut: true });
  delete st.pending;
  return { settled: true, events: r.events };
}

/* 接口层推进：state / move / defend 三个「相关请求」入口在鉴权后共用。
 * 结算或补记后 CAS 落盘（打赢了走 finalizeBattle 的发奖路径）；
 * 成功时同步 got.row.state 期望值，调用方可接着用新状态继续 CAS。
 * 返回 null=无事发生；{conflict:true}=状态已被别的请求推进，调用方回 409 或重读。 */
async function advanceDefenseTimeout(db, got, today) {
  const { row, st } = got;
  if (row.mode !== 'pvp' || row.status !== 'active' || !st || !st.pending) return null;
  const r = stepDefenseTimeout(row, st, Math.floor(Date.now() / 1000));
  if (!r) return null;
  if (r.settled && st.winner) {
    const fin = await finalizeBattle(db, row, st, today, got.row.state);
    if (fin && fin.conflict) return { conflict: true };
    got.row.state = JSON.stringify(st);
    return { settled: true, events: r.events, rewards: fin };
  }
  const saved = await saveBattle(db, row, st, got.row.state);
  if (!saved) return { conflict: true };
  got.row.state = JSON.stringify(st);
  return r.settled ? { settled: true, events: r.events } : { settled: false, backfilled: true };
}

/* ---------------- 第三期：兄弟对战主动换宠 + 出招/防守幂等 ----------------
 * 换宠占一整回合（与道馆「换宠＝本回合不出招」同口径）；双方权利相同，轮到谁谁才能换。
 * 换上的须未倒下、不是当前上场宠；先攻方的热身回合也可以用来换宠。
 * 收尾复用 settleAfterDamage（无伤害：不触发昏厥判定，只做后手方回合末状态结算与换回合）。 */
function applyPvpSwap(st, side, toIdx, rng = Math.random) {
  if (st.winner) return { error: 'BATTLE_OVER' };
  if (st.turn !== side) return { error: 'NOT_YOUR_TURN' };
  const me = st.sides ? st.sides[side] : null;
  if (!me || !Array.isArray(me.pets) || !me.pets.length) return { error: 'NO_ACTIVE_PET' };
  const idx = Number(toIdx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= me.pets.length || idx === (me.activeIdx || 0) || !(me.pets[idx].hp > 0)) {
    return { error: 'SWAP_INVALID' };
  }
  const trap = canSwitchOut(st, side);
  if (trap) return { error: 'SWAP_TRAPPED', ability: trap.ability };
  const events = [];
  onPetLeavesField(st, side, activePetOf(st, side), events);
  me.activeIdx = idx;
  const np = me.pets[idx];
  events.push({ type: 'swap', side, pet: np.name, text: `换 ${np.name} 上场！` });
  triggerSwitchIn(st, side, events);
  return settleAfterDamage(st, side, events, rng);
}

/* 幂等：move / defend 可带 requestId。已处理过的 requestId 再来（网络重试）不再执行，
 * 回放当时的结果事件＋当前视图，HP 不会二次扣减。记录随 state 一起落库（CAS 同一笔写入），
 * 只留最近 8 条。无 requestId 时仍由「回合/挂起状态＋CAS」挡住重复提交（会报错而不是回放）。 */
const PVP_IDEM_KEEP = 8;
function idemKey(v) { return v === undefined || v === null || v === '' ? null : String(v).slice(0, 64); }
function idemFind(st, rid) {
  return rid && st && Array.isArray(st.idem) ? (st.idem.find((x) => x.id === rid) || null) : null;
}
function idemRecord(st, rid, rec) {
  if (!rid) return;
  st.idem = (Array.isArray(st.idem) ? st.idem : []).filter((x) => x.id !== rid);
  st.idem.push({ id: rid, ...rec });
  if (st.idem.length > PVP_IDEM_KEEP) st.idem = st.idem.slice(-PVP_IDEM_KEEP);
}
/* PvP 某一方的行动鉴权：A 只认 A 的孩子会话；B 认加入方本人会话，无孩子会话时才认加入凭证 */
async function pvpActorAllowed(session, row, side, joinToken) {
  if (side === 'A') return !!(session && session.kind === 'child' && session.child_id === row.child_a);
  if (session && session.kind === 'child') return session.child_id === row.child_b;
  const tok = joinToken ? await sha256hex(String(joinToken)) : null;
  return !!tok && tok === row.join_token_hash;
}
async function pvpReplay(row, st, rec, session, body) {
  if (!(await pvpActorAllowed(session, row, rec.side, body.joinToken))) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  const out = { ok: true, replay: true, events: rec.events || [], battle: battleView(row, st) };
  if (rec.staged) out.staged = true;
  if (rec.defense) out.defense = rec.defense;
  if (rec.defenseTimeout) out.defenseTimeout = true;
  return json(out);
}

/* 出招（统一入口）：gym 走同时选招（resolveGymRound，玩家一招与馆主 AI 一招同回合结算，
 * body 可带 swapToIdx 表示主动换宠）；PvP 严格按回合鉴权——A 方回合只认 A 的孩子会话，
 * B 方回合只认加入方本人会话，或无孩子会话时的加入凭证 joinToken；
 * 对手孩子（A 方）会话＋凭证一律拒绝（2026-10-24 凭证越权修复）。 */
async function apiBattleMove(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode === 'coop') return json({ ok: false, error: '合作对战请在合作营地里操作哦' }, 400);
  // 第三期幂等：同一 requestId 的重试放在状态检查之前（该步可能已把对局推到下一回合甚至结束）
  const rid = row.mode === 'pvp' ? idemKey(body.requestId) : null;
  if (rid) { const rec = idemFind(st, rid); if (rec) return pvpReplay(row, st, rec, session, body); }
  if (row.status === 'waiting') return json({ ok: false, error: '对战还没开始，等对方加入哦' }, 400);
  if (row.status !== 'active') return json({ ok: false, error: '这场对战已经结束啦' }, 400);
  const today = shDateStr();
  const events = [];
  let idemKind = null; // PvP：本次行动类别（move/swap），非空则落幂等记录
  let idemSide = null;
  let itemUsed = null; // v11：本回合用药（道馆），状态存上后再扣库存
  if (row.mode === 'gym') {
    const fb = forbidIfOtherChild(session, row.child_a);
    if (fb) return fb;
    if (body.itemKey) {
      // 道馆用药（v11 §9.3）：先验库存与种类，再进回合结算
      const itemKey = String(body.itemKey);
      const eff = GYM_ITEM_EFFECTS[itemKey];
      if (!eff) return json({ ok: false, error: '这种道具不能在道馆里用哦' }, 400);
      if ((await getInventoryQty(db, row.child_a, itemKey)) < 1) {
        return json({ ok: false, error: `没有${ITEM_CATALOG[itemKey].name}啦` }, 400);
      }
      const r = resolveGymRound(st, { itemKey, targetIdx: body.targetIdx });
      if (r.error) {
        const msg = r.error === 'ITEM_CAP_REACHED' ? '这场战斗里这种药已经用满次数啦'
          : r.error === 'ITEM_NO_NEED' ? '体力已经满啦，不用浪费药哦'
          : r.error === 'ITEM_TARGET_INVALID' ? '这只伙伴现在不需要复活哦'
          : '现在不能用道具';
        return json({ ok: false, error: msg }, 400);
      }
      events.push(...r.events);
      itemUsed = r.itemUsed || { itemKey, targetIdx: body.targetIdx ?? null };
    } else {
      // 道馆改版：同时选招——玩家提交招式（或 swapToIdx 换宠），馆主同回合由 AI 选招一起结算
      const r = resolveGymRound(st, {
        moveName: body.moveName ? String(body.moveName) : null,
        swapToIdx: body.swapToIdx,
      });
      if (r.error) {
        const msg = r.error === 'MOVE_NOT_LEARNED' ? '这个招式还没学会哦'
          : r.error === 'MOVE_DISABLED' ? '这个招式被定身了，换一个吧'
          : r.error === 'SWAP_INVALID' ? '现在不能换这只宠哦'
          : r.error === 'SWAP_TRAPPED' ? '被对方的特性困住了，换不了宠！'
          : r.error === 'MUST_CHOOSE_MOVE' ? '先选一个招式吧'
          : '现在不能出招';
        return json({ ok: false, error: msg }, 400);
      }
      events.push(...r.events);
    }
  } else {
    if (body.itemKey) return json({ ok: false, error: 'PvP 对战里不能用道具哦' }, 400); // v11 §9.3：PvP 服务端拒绝
    const side = st.turn;
    if (side === 'A') {
      if (!session || session.kind !== 'child' || session.child_id !== row.child_a) {
        return json({ ok: false, error: 'FORBIDDEN' }, 403);
      }
    } else {
      // B 方出招：加入方本人会话放行；无孩子会话时凭加入凭证放行（未登录同屏设备）；
      // 对手孩子（A 方）会话＋凭证一律 403（2026-10-24 凭证越权修复：已登录大宝账号的设备不得替小宝行动，旧同屏玩法随之失效）
      const isJoinerSession = session && session.kind === 'child' && session.child_id === row.child_b;
      if (!isJoinerSession) {
        if (session && session.kind === 'child') return json({ ok: false, error: 'FORBIDDEN' }, 403);
        const tok = body.joinToken ? await sha256hex(String(body.joinToken)) : null;
        if (!tok || tok !== row.join_token_hash) return json({ ok: false, error: 'FORBIDDEN' }, 403);
      }
    }
    if (st.pending) {
      // 防守挂起中：超时已到 → 先按放弃防御结算推进（卡死老局靠任一方的下一次请求解锁），
      // 本请求不再执行新出招，回合已随结算推进，前端刷新后由下一方行动；未超时才回等待文案
      const adv = await advanceDefenseTimeout(db, got, today);
      if (adv && adv.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
      if (adv && adv.settled) {
        return json({ ok: true, events: adv.events, rewards: adv.rewards || null, defenseTimeout: true, battle: battleView(row, st) });
      }
      return json({ ok: false, error: '对方正在答题防守，等他答完再继续哦' }, 400);
    }
    const moveName = body.moveName ? String(body.moveName) : null;
    const swapReq = body.swapToIdx !== undefined && body.swapToIdx !== null;
    idemKind = swapReq ? 'swap' : 'move';
    idemSide = side;
    // 防守答题：防守方有答过的问题时，出招先挂起，等防守方答题再结算；
    // 先攻首回合跳过、没选招式、或防守方毫无答题记录 → 沿用即时结算
    const defenderChildId = side === 'A' ? row.child_b : row.child_a;
    const question = (!swapReq && canSideAttack(st, side) && moveName)
      ? await pickDefenseQuestion(db, defenderChildId, today, weekStartMon(today))
      : null;
    if (swapReq) {
      // 第三期：兄弟对战可以战中扔球换宠，占一整回合（解除「兄弟对战里不能换宠」的锁）
      const r = applyPvpSwap(st, side, body.swapToIdx);
      if (r.error) return json({ ok: false, error: r.error === 'SWAP_INVALID' ? '现在不能换这只宠哦' : r.error === 'SWAP_TRAPPED' ? '被对方的特性困住了，换不了宠！' : '现在不能换宠' }, 400);
      events.push(...r.events);
    } else if (!question) {
      // 即时结算兜底（防守方无答题记录等）：仍是 PvP 出招，暴击走 PvP 口径
      const r = applyBattleAction(st, side, moveName, Math.random, { critRate: PVP_CRIT_RATE, critMult: PVP_CRIT_MULT });
      if (r.error) return json({ ok: false, error: r.error === 'MOVE_NOT_LEARNED' ? '这个招式还没学会哦' : r.error === 'MOVE_DISABLED' ? '这个招式被定身了，换一个吧' : '现在不能这样出招' }, 400);
      events.push(...r.events);
    } else {
      const staged = stagePvpAttack(st, side, moveName);
      if (staged.error) return json({ ok: false, error: staged.error === 'MOVE_NOT_LEARNED' ? '这个招式还没学会哦' : staged.error === 'MOVE_DISABLED' ? '这个招式被定身了，换一个吧' : '现在不能这样出招' }, 400);
      if (staged.blocked || staged.effectKind || staged.smokeMiss) {
        // 睡眠/麻痹无法行动、变化招式/烟幕落空没有伤害可防，即时结算并落到下方统一收尾
        const r = staged.blocked
          ? applyStagedBlocked(st, { ...staged, attacker: side })
          : staged.effectKind
            ? applyStagedEffect(st, { ...staged, attacker: side })
            : applyStagedMiss(st, { ...staged, attacker: side });
        events.push(...r.events);
      } else {
      st.pending = {
        attacker: side, moveName: staged.moveName, moveType: staged.moveType,
        petName: staged.petName, targetName: staged.targetName,
        dmg: staged.dmg, mult: staged.mult, critical: staged.critical === true, mods: staged.mods || [],
        drain: staged.drain === true, ability: staged.ability || [],
        sinceEpoch: Math.floor(Date.now() / 1000), // 防守题生成时刻：120 秒超时从此刻起算（双方已在本局内）
        question: { id: question.id, question: question.question, options: question.options, subject: question.subject },
      };
      pushLog(st, [{ type: 'attack_pending', side, text: `${staged.petName} 准备用「${staged.moveName}」攻击 ${staged.targetName}！防守方答对一道题就能防御！` }]);
      if (rid) idemRecord(st, rid, { side, kind: idemKind, turnNo: st.turnNo, events: [], staged: true });
      const savedStage = await saveBattle(db, row, st, got.row.state);
      if (!savedStage) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
      return json({ ok: true, events: [], staged: true, battle: battleView(row, st) });
      }
    }
  }
  let rewards = null;
  if (rid && idemKind) idemRecord(st, rid, { side: idemSide, kind: idemKind, turnNo: st.turnNo, events });
  if (st.winner) {
    rewards = await finalizeBattle(db, row, st, today, got.row.state);
    if (rewards && rewards.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  } else {
    const savedMove = await saveBattle(db, row, st, got.row.state);
    if (!savedMove) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  if (itemUsed) {
    // 状态已存上才扣库存（saveBattle/finalizeBattle 成功后才到这里）；扣不动只记日志，不回滚已存的回合
    const took = await takeItem(db, row.child_a, itemUsed.itemKey, 1, 'gym-use', 'battle', String(row.id), today);
    if (!took) {
      console.error('gym use-item deduct failed', { battleId: row.id, itemKey: itemUsed.itemKey });
    } else {
      await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
        .bind(row.child_a, itemUsed.itemKey, 'gym', 'battle', String(row.id), Math.floor(Date.now() / 1000), today).run();
    }
  }
  const view = battleView(row, st);
  if (row.mode === 'gym') view.gymItems = await gymItemsView(db, row.child_a, st);
  return json({ ok: true, events, rewards, itemUsed, battle: view });
}

/* PvP 防守答题提交：判题→随机防御→结算挂起的攻击 */
async function apiBattleDefend(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode !== 'pvp') return json({ ok: false, error: '道馆战没有防守答题' }, 400);
  // 第三期幂等：同一 requestId 的重试直接回放（该步可能已结算、甚至已分出胜负）
  const rid = idemKey(body.requestId);
  if (rid) { const rec = idemFind(st, rid); if (rec) return pvpReplay(row, st, rec, session, body); }
  if (row.status !== 'active') return json({ ok: false, error: '这场对战已经结束啦' }, 400);
  const pending = st.pending;
  if (!pending) return json({ ok: false, error: '现在不用防守哦' }, 400);
  const defenderSide = pending.attacker === 'A' ? 'B' : 'A';
  const defenderChildId = defenderSide === 'A' ? row.child_a : row.child_b;
  // 防守鉴权：防守方本人会话；防守方为 B 且无孩子会话时凭加入凭证放行（未登录同屏设备）；
  // 对手孩子会话＋凭证一律拒绝（2026-10-24 凭证越权修复）
  let allowed = session && session.kind === 'child' && session.child_id === defenderChildId;
  if (!allowed && defenderSide === 'B' && !(session && session.kind === 'child') && body.joinToken) {
    allowed = (await sha256hex(String(body.joinToken))) === row.join_token_hash;
  }
  if (!allowed) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  const today = shDateStr();
  // 超时已到的防守提交不再判题：先按放弃防御结算（120 秒口径，用户定案）
  const adv = await advanceDefenseTimeout(db, got, today);
  if (adv && adv.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  if (adv && adv.settled) {
    return json({
      ok: true, events: adv.events, rewards: adv.rewards || null,
      defense: { correct: false, kind: null, label: null, skipped: true, timedOut: true, explain: '' },
      defenseTimeout: true,
      battle: battleView(row, st),
    });
  }
  // 判题：按选项文本比对（出招时已打乱顺序，位置不作数）
  let correct = false;
  let explain = '';
  const answerText = body.answerText === null || body.answerText === undefined ? null : String(body.answerText);
  const qrow = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(pending.question.id).first();
  if (qrow && answerText !== null) {
    const q = normalizeQuizRow(qrow);
    explain = q.explain || '';
    correct = answerText === q.options[q.answer_idx];
  }
  let defense = { kind: null, skipped: answerText === null, correct: false };
  if (correct) {
    const dk = pickDefenseKind();
    defense = { kind: dk.kind, label: dk.label, correct: true };
  }
  const staged = {
    attacker: pending.attacker, moveName: pending.moveName, moveType: pending.moveType,
    petName: pending.petName, targetName: pending.targetName, dmg: pending.dmg, mult: pending.mult, critical: pending.critical === true, mods: pending.mods || [],
    drain: pending.drain === true,
    // 一期 bug 修复：重建时漏了 ability，PvP 两段式防守路径会丢掉一期特性吸取回复（储水/蓄电）与二期升档（避雷针/电气引擎）。
    ability: pending.ability || [],
  };
  const r = resolveStagedAttack(st, staged, defense);
  delete st.pending;
  const defenseOut = { correct, kind: defense.kind || null, label: defense.label || null, skipped: !!defense.skipped, explain };
  if (rid) idemRecord(st, rid, { side: defenderSide, kind: 'defend', turnNo: st.turnNo, events: r.events, defense: defenseOut });
  let rewards = null;
  if (st.winner) {
    rewards = await finalizeBattle(db, row, st, today, got.row.state);
    if (rewards && rewards.conflict) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  } else {
    const saved = await saveBattle(db, row, st, got.row.state);
    if (!saved) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  return json({
    ok: true, events: r.events, rewards,
    defense: defenseOut,
    battle: battleView(row, st),
  });
}

async function apiBattleState(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode === 'coop') return json({ ok: false, error: '合作对战请在合作营地里操作哦' }, 400);
  let allowed = session && session.kind === 'parent';
  if (!allowed && session && session.kind === 'child') {
    allowed = session.child_id === row.child_a || session.child_id === row.child_b;
  }
  if (!allowed && body.joinToken) {
    allowed = (await sha256hex(String(body.joinToken))) === row.join_token_hash;
  }
  if (!allowed) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  // 读接口同样是「相关请求」：顺带推进已超时的防守（卡死老局靠任一方打开/轮询页面解锁）
  const adv = await advanceDefenseTimeout(db, got, shDateStr());
  if (adv && adv.conflict) {
    const fresh = await loadBattle(db, row.id); // 别人刚推进过：按最新状态展示，不打断轮询
    if (fresh) {
      const fb = battleView(fresh.row, fresh.st);
      if (fresh.row.mode === 'gym') fb.gymItems = await gymItemsView(db, fresh.row.child_a, fresh.st);
      return json({ ok: true, battle: fb });
    }
  }
  const view = battleView(row, st);
  if (row.mode === 'gym') view.gymItems = await gymItemsView(db, row.child_a, st);
  const out = { ok: true, battle: view };
  if (adv && adv.settled) {
    out.defenseTimeout = true;
    out.events = adv.events;
    if (adv.rewards) out.rewards = adv.rewards;
  }
  return json(out);
}

async function apiBattleAbandon(db, req, session) {
  const body = await readJsonBody(req);
  const got = await loadBattle(db, Number(body.battleId));
  if (!got) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { row, st } = got;
  if (row.mode === 'coop') return json({ ok: false, error: '合作对战请在合作营地里操作哦' }, 400);
  if (row.status !== 'waiting' && row.status !== 'active') {
    return json({ ok: false, error: '这场对战已经结束啦' }, 400);
  }
  let allowed = session && session.kind === 'parent';
  if (!allowed && session && session.kind === 'child') {
    allowed = session.child_id === row.child_a || session.child_id === row.child_b;
  }
  if (!allowed && body.joinToken) {
    allowed = (await sha256hex(String(body.joinToken))) === row.join_token_hash;
  }
  if (!allowed) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  row.status = 'abandoned';
  row.finished_epoch = Math.floor(Date.now() / 1000);
  st.abandoned = true; // 改动 state 本身：并发中的出招请求 CAS 必然失败，不会把已弃赛的局写回 active
  const savedAbandon = await saveBattle(db, row, st, got.row.state); // counted 保持 0：弃赛不计次、不发奖
  if (!savedAbandon) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  return json({ ok: true, battle: battleView(row, st) });
}

async function apiBattlePvpRematchRequest(db, req, session) {
  return withChild(db, req, session, async (me, body) => {
    const other = await otherChild(db, me.id, body.opponentId);
    const today = shDateStr();
    const ws = weekStartMon(today);
    const active = await db.prepare(
      "SELECT id FROM battles WHERE mode='pvp' AND week_start=? AND status IN ('waiting','active') AND (child_a=? OR child_b=?) LIMIT 1"
    ).bind(ws, me.id, me.id).first();
    if (active) return json({ ok: false, error: '还有一场对战在进行中，先打完它再申请吧' }, 400);
    const counted = (await pvpCountedThisWeek(db, me.id, ws)) || (other && await pvpCountedThisWeek(db, other.id, ws));
    if (!counted) return json({ ok: false, error: '本周的正式对战还没打完呢，打完才能申请再来一局' }, 400);
    const latest = await latestRematchRequest(db, ws, me.family_id);
    if (latest && latest.status === 'pending') return json({ ok: false, error: '已经申请过啦，正在等家长审核' }, 400);
    if (latest && latest.status === 'approved') return json({ ok: false, error: '家长已经批准啦，快去再打一场吧！' }, 400);
    if (latest && latest.status === 'rejected') return json({ ok: false, error: '家长这次没有批准再来一局，本周就到这里啦' }, 400);
    if (latest && latest.status === 'consumed') return json({ ok: false, error: '本周的再来一局已经用过啦' }, 400);
    const r = await db.prepare(
      'INSERT INTO pvp_rematch_requests(week_start, requester_child_id, status, created_epoch) VALUES(?,?,?,?)'
    ).bind(ws, me.id, 'pending', Math.floor(Date.now() / 1000)).run();
    const row = await db.prepare('SELECT * FROM pvp_rematch_requests WHERE id=?').bind(r.meta.last_row_id).first();
    return json({ ok: true, rematch: rematchView(row, (id) => (id === me.id ? me.name : (other && id === other.id ? other.name : null))) });
  });
}

async function apiBattlePvpStatus(db, req, session) {
  return withChild(db, req, session, async (me, body) => {
    const today = shDateStr();
    const ws = weekStartMon(today);
    const other = await resolvePvpOpponent(db, me, body.opponentId, ws);
    if (Number(body.opponentId) && !other) return notSameFamily();
    const info = async (c) => {
      if (!c) return null;
      const [weekApproved, counted] = await Promise.all([
        weekApprovedCount(db, c.id, ws),
        pvpCountedThisWeek(db, c.id, ws),
      ]);
      return {
      id: c.id, name: c.name, grade: c.grade_label || '', level: levelFromXp(c.total_xp), balls: c.balls ?? 3, ballsSuper: c.balls_super ?? 0,
      weekApproved,
      counted,
      hasPassword: !!c.pwd_hash,
      // 对战规则阶段 0 透传（只读，不新增判定）：主宠展示信息。formInfo 为纯函数（按等级推导、
      // 封顶 2 阶，绝不提前显示终极形态）；属性取 LINE_TYPE，与道馆 mainType 同口径
      // （伊布分支形态的类型以 LINE_TYPE.普通计，见 DEPLOY §43）。
      mainPet: (() => { const f = formInfo(c); return { name: f.formName, img: f.img, type: LINE_TYPE[c.line] || '', egg: f.egg }; })(),
    };
    };
    const [meInfo, otherInfo, mine, { results: champRows }, myColl, otherColl, latestRematch] = await Promise.all([
      info(me),
      info(other),
      db.prepare(
        "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status IN ('waiting','active') AND (child_a=? OR child_b=?) ORDER BY id DESC LIMIT 1"
      ).bind(ws, me.id, me.id).first(),
      (me.family_id
        ? db.prepare("SELECT * FROM battles WHERE mode='pvp' AND counted=1 AND status='finished' AND child_a IN (SELECT id FROM children WHERE family_id=?) ORDER BY week_start DESC, id DESC LIMIT 24").bind(me.family_id).all()
        : db.prepare("SELECT * FROM battles WHERE mode='pvp' AND counted=1 AND status='finished' ORDER BY week_start DESC, id DESC LIMIT 24").all()),
      carriedCollection(db, me.id),
      other ? carriedCollection(db, other.id) : Promise.resolve([]),
      latestRematchRequest(db, ws, me.family_id),
    ]);
    let myMatch = null;
    if (mine) {
      const st = JSON.parse(mine.state || '{}');
      myMatch = battleView(mine, st);
      myMatch.mySide = mine.child_a === me.id ? 'A' : 'B';
    }
    // 对战规则修复（2026-10-27 浏览器验收发现）：建房只写 child_a、child_b 为空，
    // 等加入的局按 (child_a=? OR child_b=?) 查不到加入方，加入表单在浏览器里永远出不来
    // （单测直接拿 battleId 调加入接口，绕过了这一步，所以一直没发现）。
    // 加入方须看到对方本周的 waiting 局（mySide='B'），否则两人各建一局、永远打不起来；
    // create 接口的 oppWaiting 拦截本就是这个口径（不建第二局），状态接口须与之对齐。
    // 只补 waiting 局：active 局加入时已回填 child_b，本查询已能匹配。
    if (!myMatch && other) {
      const opp = await db.prepare(
        "SELECT * FROM battles WHERE mode='pvp' AND week_start=? AND status='waiting' AND child_a=? ORDER BY id DESC LIMIT 1"
      ).bind(ws, other.id).first();
      if (opp) {
        const st = JSON.parse(opp.state || '{}');
        myMatch = battleView(opp, st);
        myMatch.mySide = 'B';
      }
    }
    const seenWeek = new Set();
    const champions = [];
    const recent = [];
    for (const r of champRows) {
      const st = JSON.parse(r.state || '{}');
      const aName = st.sides && st.sides.A ? st.sides.A.childName : '';
      const bName = st.sides && st.sides.B ? st.sides.B.childName : '';
      const winnerName = r.winner_child_id === (st.sides && st.sides.A && st.sides.A.childId) ? aName : bName;
      if (!seenWeek.has(r.week_start)) {
        seenWeek.add(r.week_start);
        champions.push({ weekStart: r.week_start, childId: r.winner_child_id, childName: winnerName });
      }
      if (recent.length < 10) {
        recent.push({
          weekStart: r.week_start, aName, bName, winnerName,
          winnerPetsLeft: st.result ? st.result.winnerPetsLeft : null,
          totalActions: st.result ? st.result.totalActions : null,
          // 对战规则阶段 2（L5）：单场战报带败者防守表现；旧局无此字段时为 null，前端省略
          defense: st.result && st.result.defense ? st.result.defense : null,
        });
      }
    }
    // 对战规则阶段 1（R18）：备战宠「克制！」角标与实战同源——服务端用 typeMult(备战属性, 对方主宠属性)===2
    // 算出（countersForType 只表达“克哪几关馆主”，表达不了“克对方主宠”，故不用它；主宠属性取 LINE_TYPE，
    // 与 mainPet.type 同口径，伊布分支边角见 DEPLOY §43）。
    const myMainType = LINE_TYPE[me.line] || '';
    const otherMainType = other ? (LINE_TYPE[other.line] || '') : '';
    for (const it of myColl) it.pvpCounter = !!otherMainType && typeMult(it.type, otherMainType) === 2;
    for (const it of otherColl) it.pvpCounter = typeMult(it.type, myMainType) === 2;
    const nameOf = (cid) => (cid === me.id ? me.name : (other && cid === other.id ? other.name : null));
    const rematch = rematchView(latestRematch, nameOf);
    // 可申请 = 本周正式对战已计次打完、无进行中对局、本周还没申请过（驳回/已用同样不再放行，见申请接口）
    rematch.canRequest = !!((meInfo.counted || (otherInfo && otherInfo.counted)) && !myMatch && !latestRematch);
    return json({
      ok: true, today, isWeekend: isWeekendDate(today), weekStart: ws, gatesOpen: GATES_OPEN,
      me: meInfo, other: otherInfo,
      myMatch, champions, recent, rematch,
      myCollection: myColl,
      otherCollection: otherColl,
      ...(GATES_OPEN ? { benchOptions: await debugBenchOptions(db, me.id) } : {}),
    });
  });
}

// 奖励幂等引用键
function coopRewardRef(mapVersion, node, rewardType) {
  switch (rewardType) {
    case 'node_badge': return `coop:${mapVersion}:${node.node_id}:badge`;
    case 'node_sticker': return `coop:${mapVersion}:${node.node_id}:sticker`;
    case 'expedition_badge': return `coop:${mapVersion}:expedition`;
    case 'story_card': return `coop:${mapVersion}:${node.node_id}:story`;
    default: return null;
  }
}

// 奖励落到孩子资产的字段；story_card 只记发放明细，不写资产数组
function coopRewardAsset(node, rewardType) {
  const value = coopRewardLabel(node, rewardType);
  switch (rewardType) {
    case 'node_badge':
    case 'expedition_badge':
      return { field: 'titles', value };
    case 'node_sticker':
      return { field: 'stickers', value };
    case 'story_card':
      return { field: null, value };
    default:
      return { field: null, value: null };
  }
}

function coopAddShellLayer(pet, mult, by) {
  if (!pet) return false;
  if (!Array.isArray(pet.shellLayers)) pet.shellLayers = [];
  // 防御层上限 2 层
  if (pet.shellLayers.length >= 2) return false;
  pet.shellLayers.push({ mult, by });
  return true;
}

// 内部：找出下一次受击将被消费的层下标（优先 0.5，其次 0.7）
function coopShellLayerIndex(pet) {
  if (!pet || !Array.isArray(pet.shellLayers) || pet.shellLayers.length === 0) return -1;
  const layers = pet.shellLayers;
  let idx = layers.findIndex((l) => l && l.mult === 0.5);
  if (idx < 0) idx = layers.findIndex((l) => l && l.mult === 0.7);
  // 兜底：存在非常规倍率的层时按顺序消费首层
  if (idx < 0) idx = 0;
  return idx;
}

function coopPeekShellLayer(pet) {
  const idx = coopShellLayerIndex(pet);
  if (idx < 0) return null;
  return pet.shellLayers[idx] || null;
}

function coopConsumeShellLayer(pet) {
  const idx = coopShellLayerIndex(pet);
  if (idx < 0) return 1;
  const removed = pet.shellLayers.splice(idx, 1)[0];
  return removed && typeof removed.mult === 'number' ? removed.mult : 1;
}

// 内部：取招式列表中威力最大的招式（同威力取靠前者）
function coopStrongestMove(moves) {
  if (!Array.isArray(moves) || moves.length === 0) return null;
  let best = moves[0];
  for (let i = 1; i < moves.length; i++) {
    if ((moves[i].power || 0) > (best.power || 0)) best = moves[i];
  }
  return best;
}

function buildCoopBossSide(node, baseLevel) {
  const bossLevel = baseLevel + (node.levelOffset || 0);
  const species = SPECIES[node.bossNo] || { name: '未知', type: node.bossType };
  const moves = (node.bossMoves || []).map((m) => { const off = officialMove(m[0]); return { name: m[0], type: m[1], damage_class: off ? off.damage_class : undefined, power: m[2] }; });
  const pet = makePet({
    key: 'boss',
    name: species.name,
    type: node.bossType || species.type,
    no: node.bossNo,
    img: petImg(node.bossNo),
    level: bossLevel,
    moves,
    hpMult: node.hpMult,
  });
  // 馆主最大威力决定支援治疗量
  const maxPower = moves.reduce((mx, m) => Math.max(mx, m.power || 0), 0);
  const supportHealAmt = Math.max(1, Math.floor(maxPower * (0.5 + 0.05 * bossLevel) / 3));
  return {
    childId: null,
    childName: `馆主 · ${species.name}`,
    battleLevel: bossLevel,
    activeIdx: 0,
    pets: [pet],
    aggro: { seat: null, streak: 0 },
    sweep: { lastRound: null, count: 0 },
    supportHealAmt,
  };
}

function createCoopBattleState(node, sideA, sideB, baseLevel) {
  const bossSide = buildCoopBossSide(node, baseLevel);
  const st = createBattleState({ mode: 'coop', firstSide: 'A', sides: { A: sideA, B: sideB, BOSS: bossSide } });
  st.round_no = 1;
  st.nodeId = node.node_id;
  st.nodeKind = node.kind;
  sideA.role = 'fighter';
  sideA.support = { enteredRound: null, nextRound: null };
  sideB.role = 'fighter';
  sideB.support = { enteredRound: null, nextRound: null };
  // 初始化三方 fx
  fxOf(st, 'A');
  fxOf(st, 'B');
  fxOf(st, 'BOSS');
  fxOf(st, 'BOSS').telegraph = null;
  st.coop = { phase: 'choosing', ended: null };
  // 2a：馆主若带威吓，开局降双方攻击（createBattleState 只触发 A、B 两席）。
  {
    const openEvents = [];
    triggerSwitchIn(st, 'BOSS', openEvents);
    pushLog(st, openEvents);
  }
  return st;
}

function coopExpectedHit(move, bossPet, defPet, st) {
  // 桩 rng 恒 0.5：命中检定恒过、区间因子恒 0.93，且不触发暴击
  const r = calcDamage(move, bossPet, defPet, () => 0.5, { chart: 'official', st });
  if (!r || r.error || typeof r.dmg !== 'number') return 0;
  return r.dmg;
}

function coopScoreTargets(st, move) {
  const out = { A: null, B: null };
  const bossFx = fxOf(st, 'BOSS');
  const bossSide = st.sides.BOSS;
  const bossLevel = bossSide.battleLevel;
  for (const S of ['A', 'B']) {
    const pet = activePetOf(st, S);
    if (!pet || pet.hp <= 0) continue;
    let score = 1.0;
    // 克制
    if (typeMult(move.type, pet.type) === 2) score *= 2.0;
    // 斩杀：只读估算期望伤害
    let exp = coopExpectedHit(move, activePetOf(st, 'BOSS'), pet, st);
    if (bossFx.charge) exp = Math.max(1, Math.round(exp * 1.5));
    if (typeof bossFx.weakNum === 'number') exp = Math.max(1, Math.round(exp * bossFx.weakNum));
    const layer = coopPeekShellLayer(pet);
    if (layer) exp = Math.max(1, Math.round(exp * layer.mult));
    if (pet.hp <= exp) score *= 2.5;
    // 威胁：玩家处于蓄力状态
    if (fxOf(st, S).charge) score *= 1.5;
    // 有盾
    if (Array.isArray(pet.shellLayers) && pet.shellLayers.length >= 1) score *= 0.6;
    // 仇恨上限：连续锁定同一席位
    const aggro = bossSide.aggro;
    if (aggro && aggro.seat === S && aggro.streak >= 2) score *= 0.5;
    out[S] = score;
  }
  return out;
}

function coopPickTarget(st, move, rng) {
  const sc = coopScoreTargets(st, move);
  const sA = sc.A;
  const sB = sc.B;
  if (sA === null && sB === null) return null;
  if (sA === null) return 'B';
  if (sB === null) return 'A';
  // 双席可选：恰好消耗 2 次 rng
  const r1 = rollRng(rng);
  const r2 = rollRng(rng);
  if (r1 < 0.85) {
    const total = sA + sB;
    const pA = total > 0 ? sA / total : 0.5;
    return r2 < pA ? 'A' : 'B';
  }
  return r2 < 0.5 ? 'A' : 'B';
}

function coopBossChoose(st, node, rng) {
  const none = { kind: 'none', moveName: null, targetSeat: null, fromLock: false, nextLock: null };
  const bossFx = fxOf(st, 'BOSS');
  const bossPet = activePetOf(st, 'BOSS');
  if (!bossPet || !Array.isArray(bossPet.moves) || bossPet.moves.length === 0) return none;
  const bossSide = st.sides.BOSS;
  const strongest = coopStrongestMove(bossPet.moves);

  // 1) 执行上回合蓄势锁定的动作（不消耗 rng）
  const tg = bossFx.telegraph;
  if (tg && tg.forRound === st.round_no) {
    const kind = tg.kind;
    return {
      kind,
      moveName: kind === 'sweep' ? node.sweepMove : strongest.name,
      targetSeat: tg.seat,
      fromLock: true,
      nextLock: null,
    };
  }

  // 2) 蓄势判定
  if (!bossFx.charge) {
    let pCharge = 0.25;
    for (const S of ['A', 'B']) {
      const p = activePetOf(st, S);
      if (p && p.hp <= p.maxHp * 0.3) {
        pCharge = 0.10;
        break;
      }
    }
    if (rollRng(rng) < pCharge) {
      const sw = bossSide.sweep || { lastRound: null, count: 0 };
      const sweepOk = !!node.sweep && st.round_no >= 2 && sw.count < 3 &&
        (sw.lastRound === null || (st.round_no + 1) - sw.lastRound >= 3);
      // 无论横扫可用与否都消耗一次，保证抽数确定
      const rKind = rollRng(rng);
      let nextLock = null;
      if (sweepOk && rKind < 0.5) {
        nextLock = { kind: 'sweep', seat: null };
      } else {
        let seat = coopPickTarget(st, strongest, rng);
        if (seat === null) {
          // 改锁任一可用席
          for (const S of ['A', 'B']) {
            const p = activePetOf(st, S);
            if (p && p.hp > 0) {
              seat = S;
              break;
            }
          }
        }
        if (seat !== null) nextLock = { kind: 'single', seat };
      }
      if (nextLock) {
        return { kind: 'charge', moveName: null, targetSeat: null, fromLock: false, nextLock };
      }
      // 无可锁定目标：本次不蓄势，落入攻击流程
    }
  }

  // 3) 攻击回合：按权重选招
  const sorted = bossPet.moves.slice().sort((a, b) => (b.power || 0) - (a.power || 0));
  const n = sorted.length;
  const wTop = n === 1 ? 1 : (bossFx.charge ? 0.6 : 0.5);
  const wRest = n > 1 ? (1 - wTop) / (n - 1) : 0;
  const r = rollRng(rng);
  let move = sorted[n - 1];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += i === 0 ? wTop : wRest;
    if (r < acc) {
      move = sorted[i];
      break;
    }
  }
  const targetSeat = coopPickTarget(st, move, rng);
  if (targetSeat === null) return none;
  return { kind: 'single', moveName: move.name, targetSeat, fromLock: false, nextLock: null };
}

// 避雷针吸引（#101 第一项，Batch 1）：返回应改投的持有者席位，不改投返回 null。零 rng。
// 只处理馆主单体、非锁定、电属性招式；目标的另一席在场宠存活且带避雷针（实例特性优先，经 petAbility），且目标宠自己不是持有者。
function coopLightningRodSeat(st, bossAction, move, targetSeat) {
  if (!bossAction || bossAction.kind !== 'single' || bossAction.fromLock === true) return null;
  const mt = (move && officialMove(move.name)?.type) ?? (move && move.type);
  if (mt !== '电') return null;
  const other = targetSeat === 'A' ? 'B' : 'A';
  const holder = activePetOf(st, other);
  const tgt = activePetOf(st, targetSeat);
  if (!holder || !(holder.hp > 0) || petAbility(holder, st) !== '避雷针') return null;
  if (tgt && petAbility(tgt, st) === '避雷针') return null;
  return other;
}
function resolveCoopRound(st, acts, bossAction, rng = Math.random) {
  if (!st || st.mode !== 'coop') return { error: 'NOT_COOP' };
  if (st.coop && st.coop.ended) return { error: 'BATTLE_OVER' };

  const SEATS = ['A', 'B'];
  const FX_KINDS = ['weak', 'charge', 'smoke', 'shell'];
  const BOSS_KINDS = ['single', 'sweep', 'charge', 'none'];
  const otherSeat = (s) => (s === 'A' ? 'B' : 'A');
  acts = acts || {};

  // 按招式名在宠物招式表中查找（兼容对象或字符串）
  function findMove(pet, name) {
    if (!pet || !Array.isArray(pet.moves) || !name) return null;
    return pet.moves.find((m) => (typeof m === 'string' ? m : m && m.name) === name) || null;
  }
  // 取某席存活的上场宠，无则 null
  function aliveActive(seat) {
    const p = activePetOf(st, seat);
    return p && p.hp > 0 ? p : null;
  }
  // 攻击文案（仿现行 attack 文案）
  function attackText(atkName, moveName, critical, mult, defName, dmg, mods) {
    if (mult === 0) return `${atkName} 用了「${moveName}」！没有效果！`;
    return `${atkName} 用了「${moveName}」！${critical ? '会心一击！' : ''}${mult > 1 ? '效果拔群！（×2）' : mult > 0 && mult < 1 ? '效果不好…（×0.5）' : ''}对 ${defName} 造成 ${dmg} 点伤害。${mods.length ? `（${mods.join('、')}）` : ''}`;
  }

  const boss = st.sides.BOSS;
  const bossPet = activePetOf(st, 'BOSS');
  const bfx = fxOf(st, 'BOSS');

  // ---------- 校验：馆主行动 ----------
  if (!bossAction || !BOSS_KINDS.includes(bossAction.kind)) return { error: 'BAD_BOSS_ACTION' };
  if (bossAction.kind === 'single' || bossAction.kind === 'sweep') {
    if (!bossPet || !findMove(bossPet, bossAction.moveName)) return { error: 'BAD_BOSS_ACTION' };
    if (bossAction.kind === 'single' && !SEATS.includes(bossAction.targetSeat)) return { error: 'BAD_BOSS_ACTION' };
  }
  if (bossAction.kind === 'charge' && (!bossAction.nextLock || !bossAction.nextLock.kind)) {
    return { error: 'BAD_BOSS_ACTION' };
  }

  // ---------- 校验：玩家两席 ----------
  for (const seat of SEATS) {
    const side = st.sides[seat];
    const act = acts[seat] || null;
    if (!act) continue;
    if (side.role === 'support') {
      if (act.type !== 'support') return { error: 'SUPPORT_CANNOT_ACT' };
      if (!['a', 'b', 'c'].includes(act.kind)) return { error: 'BAD_SUPPORT_KIND' };
      const next = (side.support && side.support.nextRound) ?? 0;
      if (st.round_no < next) return { error: 'SUPPORT_NOT_READY' };
      continue;
    }
    if (act.type === 'move') {
      const pet = activePetOf(st, seat);
      if (!pet || pet.hp <= 0 || !findMove(pet, act.moveName)) return { error: 'MOVE_NOT_LEARNED' };
      if (pet.disabledMove === act.moveName) return { error: 'MOVE_DISABLED' };
      const eff = moveEffectOf(act.moveName);
      if (act.shellTarget !== undefined && act.shellTarget !== null) {
        if (eff !== 'shell') return { error: 'SHELL_TARGET_INVALID' };
        if (act.shellTarget !== 'self' && act.shellTarget !== 'ally') return { error: 'SHELL_TARGET_INVALID' };
        if (act.shellTarget === 'ally' && !aliveActive(otherSeat(seat))) return { error: 'SHELL_TARGET_INVALID' };
      }
    } else if (act.type === 'switch') {
      const t = act.toIdx;
      if (!Number.isInteger(t) || t < 0 || t >= side.pets.length || t === side.activeIdx || !(side.pets[t].hp > 0)) {
        return { error: 'SWAP_INVALID' };
      }
      const trap = canSwitchOut(st, seat);
      if (trap) return { error: 'SWAP_TRAPPED', ability: trap.ability };
    } else {
      return { error: 'BAD_ACT' };
    }
  }

  const events = [];

  // ---------- 1. 换宠（先 A 后 B） ----------
  for (const seat of SEATS) {
    const act = acts[seat];
    if (!act || act.type !== 'switch' || st.sides[seat].role !== 'fighter') continue;
    const side = st.sides[seat];
    // 2a/2b：下场清阶段；自然回复下场时清除状态并推事件。新宠顶上后触发威吓。
    onPetLeavesField(st, seat, activePetOf(st, seat), events);
    side.activeIdx = act.toIdx;
    const p = side.pets[act.toIdx];
    events.push({ type: 'swap', side: seat, pet: p.name, text: `换 ${p.name} 上场！` });
    triggerSwitchIn(st, seat, events);
  }

  // ---------- 2. 标记与应援 ----------
  // 2b：行动阻断检定（每席每回合只掷一次；睡眠直接跳过、麻痹 25% 无法行动）。
  // 同一回合内新获得的状态不影响本回合行动（下回合起生效）。应援是训练师场边动作，不受状态影响。
  const blockedBySeat = {};
  for (const seat of SEATS) {
    const act = acts[seat];
    const side = st.sides[seat];
    if (!act || act.type !== 'move' || side.role !== 'fighter') continue;
    blockedBySeat[seat] = statusBlocksAction(activePetOf(st, seat), rng);
  }
  // 2b：馆主行动阻断检定（每回合只掷一次；蓄势与出招共用）。
  const bossBlocked = (bossAction.kind === 'single' || bossAction.kind === 'sweep' || bossAction.kind === 'charge')
    ? statusBlocksAction(bossPet, rng) : null;
  for (const seat of SEATS) {
    const act = acts[seat];
    const side = st.sides[seat];
    if (!act) continue;
    if (act.type === 'move' && side.role === 'fighter') {
      const kind = moveEffectOf(act.moveName);
      if (!FX_KINDS.includes(kind)) continue;
      // 2b：睡眠/麻痹时不挂标记。
      if (blockedBySeat[seat]) {
        const bk = blockedBySeat[seat];
        const myPet0 = activePetOf(st, seat);
        events.push({ type: 'status', side: seat, pet: myPet0.name, kind: bk, text: statusBlockedText(bk, myPet0.name) });
        continue;
      }
      const myPet = activePetOf(st, seat);
      if (kind === 'weak') {
        bfx.weakNum = Math.min(typeof bfx.weakNum === 'number' ? bfx.weakNum : 1, 0.6);
      } else if (kind === 'charge') {
        fxOf(st, seat).charge = true;
      } else if (kind === 'smoke') {
        bfx.smoke = true;
      } else if (kind === 'shell') {
        const toSeat = act.shellTarget === 'ally' ? otherSeat(seat) : seat;
        const tPet = activePetOf(st, toSeat);
        const ok = tPet ? coopAddShellLayer(tPet, 0.5, seat) : false;
        if (ok) {
          events.push({
            type: 'guard_shell', fromSeat: seat, toSeat, mult: 0.5,
            text: toSeat === seat
              ? `${myPet.name} 为自己撑起了防御层（下次受到伤害×0.5）！`
              : `${myPet.name} 为队友的 ${tPet.name} 撑起了防御层（下次受到伤害×0.5）！`,
          });
        } else {
          events.push({ type: 'shell_full', side: seat, text: `${tPet ? tPet.name : '目标'} 的防御层已经满了，无法再叠加。` });
        }
      }
      events.push({ type: 'effect', side: seat, kind, move: act.moveName, text: effectEventText(kind, myPet.name, act.moveName) });
    } else if (act.type === 'support' && side.role === 'support') {
      if (!side.support) side.support = {};
      side.support.lastUsedRound = st.round_no;
      side.support.nextRound = st.round_no + 2;
      const ally = aliveActive(otherSeat(seat));
      const who = side.childName || '队友';
      if (act.kind === 'a') {
        const ok = ally ? coopAddShellLayer(ally, 0.7, seat) : false;
        events.push({
          type: 'support_act', side: seat, kind: 'a', value: ok ? 0.7 : 0,
          text: ok ? `${who} 在场边为 ${ally.name} 加油，撑起了防御层（下次受到伤害×0.7）！` : `${who} 想为队友撑起防御层，但没能成功。`,
        });
      } else if (act.kind === 'b') {
        let healed = 0;
        if (ally) {
          const amt = boss.supportHealAmt || 0;
          const before = ally.hp;
          ally.hp = Math.min(ally.maxHp, ally.hp + amt);
          healed = ally.hp - before;
        }
        events.push({
          type: 'support_act', side: seat, kind: 'b', value: healed,
          text: healed > 0 ? `${who} 为 ${ally.name} 送上补给，回复了 ${healed} 点体力！` : `${who} 想为队友补给，但没有效果。`,
        });
      } else if (act.kind === 'c') {
        bfx.weakNum = Math.min(typeof bfx.weakNum === 'number' ? bfx.weakNum : 1, 0.6);
        events.push({
          type: 'support_act', side: seat, kind: 'c', value: 0.6,
          text: `${who} 在场边大声干扰，馆主的下一次攻击被削弱了！`,
        });
      }
    }
  }

  // 馆主蓄势
  if (bossAction.kind === 'charge') {
    // 2b：睡眠/麻痹时不能蓄势（不设 telegraph）。
    if (bossBlocked) {
      events.push({ type: 'status', side: 'BOSS', pet: bossPet.name, kind: bossBlocked, text: statusBlockedText(bossBlocked, bossPet.name) });
    } else {
    const lock = bossAction.nextLock;
    bfx.charge = true;
    bfx.telegraph = { kind: lock.kind, seat: lock.seat ?? null, forRound: st.round_no + 1 };
    const bossName = bossPet ? bossPet.name : '馆主';
    const tName = lock.seat ? (st.sides[lock.seat] && st.sides[lock.seat].childName) || `${lock.seat} 席` : null;
    events.push({
      type: 'boss_telegraph', actionKind: lock.kind, targetSeat: lock.seat ?? null,
      text: lock.kind === 'sweep'
        ? `${bossName} 开始蓄势……下回合将发动强力横扫，大家小心！`
        : `${bossName} 开始蓄势……${tName ? `目光锁定了 ${tName}，` : ''}下回合将发动强力一击！`,
    });
    }
  }

  // ---------- 3. 伤害计算（只算不落账） ----------
  const hits = [];
  for (const seat of SEATS) {
    const act = acts[seat];
    const side = st.sides[seat];
    if (!act || act.type !== 'move' || side.role !== 'fighter') continue;
    const eff = moveEffectOf(act.moveName);
    if (FX_KINDS.includes(eff)) continue;
    // 2b：睡眠/麻痹导致无法行动（本回合不出招）。
    if (blockedBySeat[seat]) {
      const bk = blockedBySeat[seat];
      const atkPet0 = activePetOf(st, seat);
      events.push({ type: 'status', side: seat, pet: atkPet0.name, kind: bk, text: statusBlockedText(bk, atkPet0.name) });
      continue;
    }
    const atkPet = activePetOf(st, seat);
    const move = findMove(atkPet, act.moveName);
    // 合作玩家攻击使用官方统一区间。
    const res = calcDamage(move, atkPet, bossPet, rng, { chart: 'official', movedLast: false, st });
    if (res.error) return { error: res.error };
    let dmg = res.dmg;
    const mods = [];
    const afx = fxOf(st, seat);
    if (dmg > 0) {
      if (afx.charge) { delete afx.charge; dmg = Math.max(1, Math.round(dmg * 1.5)); mods.push('蓄力爆发'); }
      if (afx.weak) { delete afx.weak; dmg = Math.max(1, Math.round(dmg * 0.6)); mods.push('被弱化'); }
    }
    hits.push({
      atkSide: seat, defSide: 'BOSS', pet: atkPet, move, moveName: act.moveName, dmg, mult: res.mult,
      // 保留玩家命中检定落空标记，仅供事件渲染使用。
      missed: res.missed === true,
      critical: res.critical, drain: eff === 'drain', mods, targetPet: bossPet, shellMult: undefined,
      ability: res.ability || [],
    });
  }

  let bossMissed = false;
  let aggroHitSeat = null;
  let sweepExecuted = false;
  if (bossAction.kind === 'single' || bossAction.kind === 'sweep') {
    // 2b：睡眠/麻痹导致馆主无法行动（不消费烟幕）。
    if (bossBlocked) {
      events.push({ type: 'status', side: 'BOSS', pet: bossPet.name, kind: bossBlocked, text: statusBlockedText(bossBlocked, bossPet.name) });
    } else if (bfx.smoke) {
      delete bfx.smoke;
      if (rollRng(rng) < 0.5) bossMissed = true;
    }
    if (!bossBlocked && !bossMissed) {
      const move = findMove(bossPet, bossAction.moveName);
      let targets = [];
      let redirectFrom = null;
      if (bossAction.kind === 'single') {
        let ts = bossAction.targetSeat;
        if (!aliveActive(ts)) ts = otherSeat(ts);
        if (aliveActive(ts)) {
          // 避雷针吸引（#101 第一项）：决定在 calcDamage 之前、零 rng；看的是换宠之后的在场宠。
          const rodSeat = coopLightningRodSeat(st, bossAction, move, ts);
          if (rodSeat) { redirectFrom = ts; ts = rodSeat; }
          targets = [ts];
        }
      } else {
        targets = SEATS.filter((s) => aliveActive(s));
        sweepExecuted = true;
      }
      const hasCharge = !!bfx.charge;
      const weakNum = typeof bfx.weakNum === 'number' ? bfx.weakNum : null;
      for (const ts of targets) {
        const tPet = activePetOf(st, ts);
        // 合作馆主攻击使用官方统一区间。
        const res = calcDamage(move, bossPet, tPet, rng, { chart: 'official', movedLast: true, st });
        if (res.error) return { error: res.error };
        let dmg = res.dmg;
        const mods = [];
        if (dmg > 0) {
          if (hasCharge) { dmg = Math.max(1, Math.round(dmg * 1.5)); mods.push('蓄力爆发'); }
          if (weakNum !== null) { dmg = Math.max(1, Math.round(dmg * weakNum)); mods.push('被弱化'); }
          if (bossAction.kind === 'sweep') { dmg = Math.max(1, Math.round(dmg * 0.6)); mods.push('横扫'); }
        }
        const hit = {
          atkSide: 'BOSS', defSide: ts, pet: bossPet, move, moveName: bossAction.moveName, dmg, mult: res.mult,
          // 保留馆主命中检定落空标记，仅供事件渲染使用。
          missed: res.missed === true,
          critical: res.critical, drain: false, mods, targetPet: tPet, shellMult: undefined,
          ability: res.ability || [],
          redirectFrom,
        };
        const layer = coopPeekShellLayer(tPet);
        if (layer && hit.dmg > 0) {
          hit.dmg = Math.max(1, Math.round(hit.dmg * layer.mult));
          hit.shellMult = layer.mult;
          mods.push('防御层');
        }
        hits.push(hit);
      }
      // 修正标记统一消费一次
      if (hasCharge) delete bfx.charge;
      if (weakNum !== null) delete bfx.weakNum;
      if (bossAction.kind === 'single' && targets.length) aggroHitSeat = targets[0];
    }
  }

  // ---------- 4. 落账 ----------
  const playerHits = hits.filter((h) => h.atkSide !== 'BOSS');
  const bossHits = hits.filter((h) => h.atkSide === 'BOSS');
  const totalToBoss = playerHits.reduce((s, h) => s + h.dmg, 0);
  if (!trySturdy(st, bossPet, totalToBoss, events, 'BOSS')) bossPet.hp = Math.max(0, bossPet.hp - totalToBoss);
  for (const h of bossHits) {
    if (!trySturdy(st, h.targetPet, h.dmg, events, h.defSide)) h.targetPet.hp = Math.max(0, h.targetPet.hp - h.dmg);
    h.targetHpAfter = h.targetPet.hp;
  }

  // ---------- 5. 吸取回复（昏厥判定前） ----------
  for (const h of playerHits) {
    if (h.drain && h.dmg > 0) {
      const healed = drainHeal(h.pet, h.dmg);
      if (healed > 0) h.mods.push(`吸取回复 ${healed}`);
    }
    // 特性吸取回复（储水/蓄电免疫时）：防守方（馆主）回复最大体力 1/4。
    h.abilityHeal = applyAbilityHeal(bossPet, h.ability);
    // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
    applyAbilityStages(bossPet, h.ability);
    // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
    applyAbilityFlashFire(bossPet, h.ability);
  }
  for (const h of bossHits) {
    // 特性吸取回复（储水/蓄电免疫时）：被打的玩家宠回复最大体力 1/4。
    h.abilityHeal = applyAbilityHeal(h.targetPet, h.ability);
    // 2a：避雷针/电气引擎升档（免疫条目带 stage 时应用）。
    applyAbilityStages(h.targetPet, h.ability);
    // 扩到 141：引火挂标记（免疫条目带 flashFire 时）。
    applyAbilityFlashFire(h.targetPet, h.ability);
  }

  // 事件组装：玩家 A、玩家 B、馆主（miss 或命中）
  for (const h of playerHits) {
    // 玩家命中检定落空渲染为 miss，目标血量仍取落账后的值。
    if (h.missed) {
      events.push({
        type: 'miss', side: h.atkSide, attackerSeat: h.atkSide, pet: h.pet.name, move: h.moveName,
        moveType: h.move && h.move.type, dmg: 0, mult: h.mult,
        target: bossPet.name, targetHp: bossPet.hp, mods: [],
        text: `${h.pet.name} 用了「${h.moveName}」，却没打中！`,
      });
      continue;
    }
    events.push(...abilityEvents(h.ability || [], h.atkSide, h.defSide, h.abilityHeal || 0));
    events.push({
      type: 'attack', side: h.atkSide, attackerSeat: h.atkSide, pet: h.pet.name, move: h.moveName,
      moveType: h.move && h.move.type, dmg: h.dmg, mult: h.mult, superEffective: h.mult > 1, resisted: h.mult > 0 && h.mult < 1, immune: h.mult === 0,
      critical: h.critical, target: bossPet.name, targetHp: bossPet.hp, mods: h.mods,
      text: attackText(h.pet.name, h.moveName, h.critical, h.mult, bossPet.name, h.dmg, h.mods),
    });
  }
  if (bossMissed) {
    events.push({ type: 'miss', side: 'BOSS', move: bossAction.moveName, text: `${bossPet.name} 的「${bossAction.moveName}」被烟幕挡住，落空了！` });
  }
  for (const h of bossHits) {
    if (h.shellMult !== undefined) {
      const mult = coopConsumeShellLayer(h.targetPet);
      events.push({ type: 'shell_consume', side: h.defSide, mult, text: `${h.targetPet.name} 的防御层挡下了部分伤害（×${mult}）！` });
    }
    // 馆主命中检定落空渲染为 miss，保留横扫座位与原有防御层事件逻辑。
    if (h.missed) {
      const ev = {
        type: 'miss', side: 'BOSS',
        attackerSeat: 'BOSS', pet: bossPet.name, move: h.moveName, moveType: h.move && h.move.type,
        dmg: 0, mult: h.mult,
        target: h.targetPet.name, targetHp: h.targetHpAfter, mods: [],
        text: `${bossPet.name} 用了「${h.moveName}」，却没打中！`,
      };
      if (bossAction.kind === 'sweep') ev.seat = h.defSide;
      events.push(ev);
      continue;
    }
    if (h.redirectFrom) {
      events.push({
        type: 'ability', side: h.defSide, pet: h.targetPet.name, ability: '避雷针',
        text: `「避雷针」发动！${h.targetPet.name} 把 ${bossPet.name} 的电属性招式引到了自己身上！`,
      });
    }
    events.push(...abilityEvents(h.ability || [], 'BOSS', h.defSide, h.abilityHeal || 0));
    const ev = {
      type: bossAction.kind === 'sweep' ? 'boss_sweep' : 'attack', side: 'BOSS',
      attackerSeat: 'BOSS', pet: bossPet.name, move: h.moveName, moveType: h.move && h.move.type,
      dmg: h.dmg, mult: h.mult, superEffective: h.mult > 1, resisted: h.mult > 0 && h.mult < 1, immune: h.mult === 0, critical: h.critical,
      target: h.targetPet.name, targetHp: h.targetHpAfter, mods: h.mods,
      text: attackText(bossPet.name, h.moveName, h.critical, h.mult, h.targetPet.name, h.dmg, h.mods),
    };
    if (bossAction.kind === 'sweep') ev.seat = h.defSide;
    events.push(ev);
  }

  // 仇恨与横扫记账
  if (aggroHitSeat) {
    if (boss.aggro && boss.aggro.seat === aggroHitSeat) boss.aggro.streak = (boss.aggro.streak || 0) + 1;
    else boss.aggro = { seat: aggroHitSeat, streak: 1 };
  }
  if (sweepExecuted) {
    if (!boss.sweep) boss.sweep = { lastRound: null, count: 0 };
    boss.sweep.count = (boss.sweep.count || 0) + 1;
    boss.sweep.lastRound = st.round_no;
  }
  if (bossAction.fromLock) bfx.telegraph = null;

  // 2b：接触触发（伤害结算后、昏厥判定后；仅造成伤害、未落空、防守方存活且招式为接触时掷 30%）。
  // 放在 §6 之前调用、函数内部按 hp>0 守卫：昏厥的宠不触发；§6 随后统一处理昏厥。
  for (const h of playerHits) {
    if (h.dmg > 0 && !h.missed) applyContactTrigger(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, (st.weather && st.weather.kind) || null, st);
    if (h.dmg > 0 && !h.missed) applyHitAbilityTriggers(h.pet, h.targetPet, {
      moveType: (officialMove(h.move.name) || {}).type || h.move.type,
      category: moveCategory(h.move), critical: h.critical === true, dmg: h.dmg, missed: h.missed === true,
    }, events, h.atkSide, h.defSide, st);
    if (h.dmg > 0 && !h.missed) applyCursedBody(h.targetPet, h.pet, h.move.name, rng, events, h.defSide, h.atkSide, st);
    if (h.dmg > 0 && !h.missed) applyAttackerContactTrigger(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, (st.weather && st.weather.kind) || null, st);
    if (h.dmg > 0 && !h.missed) applyStenchFlinch(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, st);
  }
  for (const h of bossHits) {
    if (h.dmg > 0 && !h.missed) applyContactTrigger(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, (st.weather && st.weather.kind) || null, st);
    if (h.dmg > 0 && !h.missed) applyHitAbilityTriggers(h.pet, h.targetPet, {
      moveType: (officialMove(h.move.name) || {}).type || h.move.type,
      category: moveCategory(h.move), critical: h.critical === true, dmg: h.dmg, missed: h.missed === true,
    }, events, h.atkSide, h.defSide, st);
    if (h.dmg > 0 && !h.missed) applyCursedBody(h.targetPet, h.pet, h.move.name, rng, events, h.defSide, h.atkSide, st);
    if (h.dmg > 0 && !h.missed) applyAttackerContactTrigger(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, (st.weather && st.weather.kind) || null, st);
    if (h.dmg > 0 && !h.missed) applyStenchFlinch(h.pet, h.targetPet, h.move, rng, events, h.atkSide, h.defSide, st);
  }
  // 2b：回合末结算（双方上场宠＋馆主的状态扣血/治愈/睡眠计数）。放在 §6 之前，让 §6 的昏厥处理统一覆盖回合末昏厥。
  tickActiveStatuses(st, rng, events);

  // ---------- 6. 昏厥与顶上 ----------
  for (const seat of SEATS) {
    const side = st.sides[seat];
    if (side.role !== 'fighter') continue;
    const pet = activePetOf(st, seat);
    if (!pet || pet.hp > 0) continue;
    pet.shellLayers = [];
    const kh = bossHits.find((h) => h.targetPet === pet);
    if (kh && kh.targetHpAfter <= 0) applyAftermath(bossPet, pet, kh.move, events, seat, st);
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(pet);
    events.push({ type: 'faint', side: seat, pet: pet.name, text: `${pet.name} 倒下了！` });
    const idx = side.pets.findIndex((p) => p.hp > 0);
    if (idx >= 0) {
      side.activeIdx = idx;
      events.push({ type: 'swap', side: seat, pet: side.pets[idx].name, text: `${side.pets[idx].name} 上场啦！` });
      // 2a：顶上的宠若带威吓，降对方攻击。
      triggerSwitchIn(st, seat, events);
    } else {
      side.role = 'support';
      if (!side.support) side.support = {};
      side.support.enteredRound = st.round_no + 1;
      side.support.nextRound = st.round_no + 1;
      events.push({ type: 'support_enter', side: seat, text: `${side.childName || '训练师'} 的宠物都倒下了，转为场边应援！` });
    }
  }
  let bossDown = false;
  if (bossPet.hp <= 0) {
    bossDown = true;
    // 2b：昏厥时清除状态与阶段（不推事件）。
    clearPetBattleState(bossPet);
    events.push({ type: 'faint', side: 'BOSS', pet: bossPet.name, text: `${bossPet.name} 倒下了！` });
  }

  // ---------- 7. 终局判定 ----------
  if (st.sides.A.role === 'support' && st.sides.B.role === 'support') {
    st.coop.ended = 'lose';
    events.push({ type: 'lose', text: '两位训练师的宠物都倒下了……馆主获胜，下次再来挑战吧！' });
  } else if (bossDown) {
    st.coop.ended = 'win';
    events.push({ type: 'win', text: `合力击败了馆主的 ${bossPet.name}！挑战成功！` });
  }

  // ---------- 8. 回合推进 ----------
  if (!st.coop.ended) {
    st.round_no += 1;
    if (st.round_no > GYM_MAX_ROUNDS) {
      st.coop.ended = 'lose';
      events.push({ type: 'note', text: '战斗持续太久啦，这次挑战失败，下次再来！' });
    }
  }
  st.turnNo = st.round_no;
  pushLog(st, events);
  return { events };
}

const COOP_ONLINE_TTL_SECS = 15;
const COOP_REMIND_SECS = 90;
const COOP_AUTO_SECS = 180;
const COOP_WAITING_VOID_SECS = 600;
const COOP_BATTLE_LIMIT_SECS = 1500; // 25 分钟

// 席位 ↔ 阵营映射：L↔A，R↔B
function sideOfSeat(seat) {
  return seat === 'L' ? 'A' : 'B';
}

function seatOfSide(side) {
  return side === 'A' ? 'L' : 'R';
}

function otherSeat(seat) {
  return seat === 'L' ? 'R' : 'L';
}

function parseSeatMeta(row) {
  return parseJsonSafe(row.seat_meta, null);
}

// 仅写 seat_meta，不升 version
async function saveSeatMeta(db, battleId, meta) {
  await db.prepare('UPDATE battles SET seat_meta=? WHERE id=?').bind(JSON.stringify(meta), battleId).run();
}

// 提醒 / 代选阈值（测试模式可加速）
async function coopThresholds(db, env) {
  if (env && env.TEST_MODE) {
    const v = await getSetting(db, 'debug_coop_fast_clock');
    if (v === '1') return { remindSecs: 9, autoSecs: 18 };
  }
  return { remindSecs: COOP_REMIND_SECS, autoSecs: COOP_AUTO_SECS };
}

// 代选用：第一个攻击类招式（无特效或吸血）
function firstAttackMoveName(pet) {
  if (!pet || !Array.isArray(pet.moves) || !pet.moves.length) return null;
  for (const m of pet.moves) {
    if (!m || !m.name) continue;
    const fx = moveEffectOf(m.name);
    if (fx === null || fx === undefined || fx === 'drain') return m.name;
  }
  return pet.moves[0].name || null;
}

function seatOfChildId(meta, childId) {
  if (!meta) return null;
  for (const s of ['L', 'R']) {
    if (meta[s] && String(meta[s].child_id) === String(childId)) return s;
  }
  return null;
}

// 当前合作周 week_key（无假期或不在合作周 → null）
async function coopWeekKeyNow(db, today) {
  try {
    const h = await currentHoliday(db);
    if (!h) return null;
    const ph = holidayPhase(h, today);
    return (ph && ph.week && ph.week.week_key) || null;
  } catch (e) {
    return null;
  }
}

// 非 win 终局 / 作废落账（幂等）
async function settleCoopEnd(db, row, reason) {
  const now = nowEpoch();
  const counts = reason === 'void' ? 0 : 1;
  const status = reason === 'lose' ? 'finished' : 'abandoned';
  const stmts = [
    db.prepare('UPDATE coop_runs SET end_reason=?, counts_toward_cap=?, ended_at=? WHERE run_id=? AND end_reason IS NULL')
      .bind(reason, counts, now, row.run_id),
    db.prepare("UPDATE battles SET status=?, finished_epoch=? WHERE id=? AND status IN ('active','suspended','waiting')")
      .bind(status, now, row.id)
  ];
  if (reason === 'lose') {
    stmts.push(db.prepare("UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=? AND camp_snapshot IS NOT NULL AND json_extract(camp_snapshot, '$.battle_id')=?")
      .bind(row.coop_event_id, row.node_id, row.id));
  }
  await db.batch(stmts);
  {
    const vA = await bumpChildVersion(db, row.child_a);
    await touchRow(db, 'battles', 'id=?', [row.id], vA);
    if (row.child_b) {
      const vB = await bumpChildVersion(db, row.child_b);
      await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB));
    }
  }
  return { ok: true };
}

// 作废并清除指向本 battle 的扎营快照
async function coopVoidAndClearCamp(db, row) {
  await settleCoopEnd(db, row, 'void');
  await db.prepare("UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=? AND camp_snapshot IS NOT NULL AND json_extract(camp_snapshot, '$.battle_id')=?")
    .bind(row.coop_event_id, row.node_id, row.id).run();
}

// 通关结算（幂等、原子）
async function settleCoopWin(db, row, st) {
  let event = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.coop_event_id).first();
  const node = event ? coopNode(event.map_version, row.node_id) : null;
  const run = await db.prepare('SELECT * FROM coop_runs WHERE run_id=?').bind(row.run_id).first();
  if (!event || !node || !run) return { settled: false, error: 'DATA_MISSING' };

  const types = (node.rewards || []).map(r => (typeof r === 'string' ? r : r && r.type)).filter(Boolean);
  const kids = [row.child_a, row.child_b].filter(k => k !== null && k !== undefined);
  // 下一节点：优先 node.next，否则按地图顺序
  let nextNode = null;
  if (node.next) nextNode = coopNode(event.map_version, node.next);
  if (!nextNode) {
    const nodes = coopMapNodes(event.map_version) || [];
    const idx = nodes.findIndex(n => n && (n.id === row.node_id || n.node_id === row.node_id));
    if (idx >= 0 && idx + 1 < nodes.length) nextNode = nodes[idx + 1];
  }
  const nextId = nextNode ? (nextNode.id || nextNode.node_id) : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    event = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.coop_event_id).first();
    const np = await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=? AND node_id=?')
      .bind(row.coop_event_id, row.node_id).first();
    if (!np || !event) return { settled: false, error: 'DATA_MISSING' };
    const existing = await db.prepare('SELECT settlement_id, status FROM coop_settlements WHERE run_id=? AND node_id=?')
      .bind(row.run_id, row.node_id).first();
    if (existing && np.state === 'cleared') return { settled: true, alreadySettled: true };

    const now = nowEpoch();
    const stmts = [];
    let firstClear, settlementId;
    if (existing) {
      // 补写分支：settlement 已在，但节点未推进
      settlementId = existing.settlement_id;
      firstClear = existing.status === 'settled_granted';
    } else {
      firstClear = np.state !== 'cleared';
      settlementId = crypto.randomUUID();
      stmts.push(db.prepare('INSERT INTO coop_settlements(settlement_id, run_id, node_id, event_id, status, settled_at) VALUES(?,?,?,?,?,?)')
        .bind(settlementId, row.run_id, row.node_id, row.coop_event_id, firstClear ? 'settled_granted' : 'settled_repeat', now));
    }
    stmts.push(db.prepare("UPDATE coop_runs SET end_reason='win', counts_toward_cap=1, ended_at=? WHERE run_id=? AND end_reason IS NULL")
      .bind(now, row.run_id));
    stmts.push(db.prepare("UPDATE coop_node_progress SET state='cleared', camp_snapshot=NULL, first_cleared_at=COALESCE(first_cleared_at, ?), version=version+1 WHERE event_id=? AND node_id=? AND version=?")
      .bind(now, row.coop_event_id, row.node_id, np.version));
    if (nextId) {
      stmts.push(db.prepare("UPDATE coop_node_progress SET state='open', version=version+1 WHERE event_id=? AND node_id=? AND state='locked'")
        .bind(row.coop_event_id, nextId));
    }
    if (node.kind === 'final' && firstClear) {
      stmts.push(db.prepare("UPDATE coop_events SET status='completed', version=version+1, updated_at=? WHERE event_id=? AND version=?")
        .bind(now, row.coop_event_id, event.version));
    }
    const rewards = [];
    if (firstClear) {
      for (const type of types) {
        const ref = coopRewardRef(event.map_version, node, type);
        for (const kid of kids) {
          stmts.push(db.prepare(`INSERT ${existing ? 'OR IGNORE ' : ''}INTO coop_grants(grant_id, settlement_id, run_id, node_id, user_id, reward_type, reward_ref, qty, granted_at) VALUES(?,?,?,?,?,?,?,1,?)`)
            .bind(crypto.randomUUID(), settlementId, row.run_id, row.node_id, kid, type, ref, now));
          rewards.push({ childId: kid, type, ref, label: coopRewardLabel(node, type) });
        }
      }
      // 资产落账（字段名来自固定白名单）
      for (const kid of kids) {
        for (const type of types) {
          const asset = coopRewardAsset(node, type);
          const field = asset && asset.field;
          if (field !== 'titles' && field !== 'stickers') continue;
          const ref = coopRewardRef(event.map_version, node, type);
          const val = asset.value !== undefined ? asset.value : ref;
          stmts.push(db.prepare(`UPDATE children SET ${field} = CASE WHEN EXISTS(SELECT 1 FROM json_each(COALESCE(${field}, '[]')) WHERE value=?) THEN ${field} ELSE json_insert(COALESCE(${field}, '[]'), '$[#]', ?) END WHERE id=?`)
            .bind(val, val, kid));
        }
      }
    }

    try {
      await db.batch(stmts);
      {
        const vA = await bumpChildVersion(db, row.child_a);
        await touchRow(db, 'battles', 'id=?', [row.id], vA);
        if (row.child_b) {
          const vB = await bumpChildVersion(db, row.child_b);
          await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB));
        }
        for (const kid of kids) await syncTouch(db, kid, 'children', 'id=?', [kid]);
      }
    } catch (e) {
      continue; // 冲突：下一轮重新判定（已结算 / 补写）
    }
    const np2 = await db.prepare('SELECT state FROM coop_node_progress WHERE event_id=? AND node_id=?')
      .bind(row.coop_event_id, row.node_id).first();
    if (!np2 || np2.state !== 'cleared') continue;
    return { settled: true, firstClear, rewards };
  }
  return { settled: false, error: 'SETTLE_RETRY_EXHAUSTED' };
}

function coopCampSnapshot(row, st, meta, weekKey) {
  return {
    week_key: weekKey,
    run_id: row.run_id,
    battle_id: row.id,
    round_no: st.round_no,
    battle_version: row.version,
    lineup: { L: meta.L && meta.L.lineup, R: meta.R && meta.R.lineup },
    camped_at: nowEpoch(),
    reason: 'time_cap'
  };
}

// 重读并返回视图
async function coopReloadView(db, battleId, callerSeat, extra) {
  const g = await loadBattle(db, battleId);
  if (!g) return { error: 'NOT_FOUND', status: 404 };
  const m = parseSeatMeta(g.row) || {};
  return Object.assign({ view: await coopBattleView(db, g.row, g.st, m, callerSeat), events: [] }, extra || {});
}

// 该席本回合是否需要提交（fighter 且仍有存活宠）
function coopSeatShouldSubmit(st, seat) {
  const side = st.sides && st.sides[sideOfSeat(seat)];
  if (!side || side.role === 'support') return false;
  return (side.pets || []).some(p => p && p.hp > 0);
}

// 推进函数（幂等）
async function advanceCoopBattle(db, env, battleId, callerSeat) {
  const got = await loadBattle(db, battleId);
  if (!got || got.row.mode !== 'coop') return { error: 'NOT_FOUND', status: 404 };
  const row = got.row;
  const st = got.st;
  const meta = parseSeatMeta(row) || {};
  const now = nowEpoch();
  const today = shDateStr();

  if ((callerSeat === 'L' || callerSeat === 'R') && meta[callerSeat]) {
    meta[callerSeat].last_seen_epoch = now;
    meta[callerSeat].online = true;
  }
  const fresh = S => meta[S] && now - (meta[S].last_seen_epoch || 0) <= COOP_ONLINE_TTL_SECS;

  // c. 等待中
  if (row.status === 'waiting') {
    if (now - (row.created_epoch || now) > COOP_WAITING_VOID_SECS) await settleCoopEnd(db, row, 'void');
    await saveSeatMeta(db, row.id, meta);
    return coopReloadView(db, battleId, callerSeat);
  }

  // d. 已终局：惰性补结算
  if (row.status === 'finished' || row.status === 'abandoned') {
    if (st.coop && st.coop.ended === 'win') {
      const s = await db.prepare('SELECT 1 AS x FROM coop_settlements WHERE run_id=?').bind(row.run_id).first();
      if (!s) await settleCoopWin(db, row, st);
    }
    await saveSeatMeta(db, row.id, meta);
    return coopReloadView(db, battleId, callerSeat);
  }

  // e. 挂起
  if (row.status === 'suspended') {
    const kind = meta.suspend_kind;
    if (kind === 'timeout' || kind === 'drop') {
      const run = await db.prepare('SELECT event_day FROM coop_runs WHERE run_id=?').bind(row.run_id).first();
      if (run && run.event_day && today > run.event_day) {
        await coopVoidAndClearCamp(db, row);
        await saveSeatMeta(db, row.id, meta);
        return coopReloadView(db, battleId, callerSeat);
      }
    } else if (kind === 'camp') {
      const np = await db.prepare('SELECT camp_snapshot FROM coop_node_progress WHERE event_id=? AND node_id=?')
        .bind(row.coop_event_id, row.node_id).first();
      const camp = parseJsonSafe(np && np.camp_snapshot, null);
      const campWeek = camp && camp.battle_id === row.id ? camp.week_key : null;
      const weekKeyNow = await coopWeekKeyNow(db, today);
      if (!weekKeyNow || !campWeek || weekKeyNow !== campWeek) {
        await coopVoidAndClearCamp(db, row);
        await saveSeatMeta(db, row.id, meta);
        return coopReloadView(db, battleId, callerSeat);
      }
    }
    if (!(fresh('L') && fresh('R'))) {
      await saveSeatMeta(db, row.id, meta);
      return coopReloadView(db, battleId, callerSeat);
    }
    // 两席在线 → 恢复
    const oldSince = row.since_epoch;
    const ures = await db.prepare("UPDATE battles SET status='active', since_epoch=NULL WHERE id=? AND status='suspended'")
      .bind(row.id).run();
    if (!ures.meta || ures.meta.changes === 0) {
      await saveSeatMeta(db, row.id, meta);
      return coopReloadView(db, battleId, callerSeat);
    }
    row.status = 'active';
    row.since_epoch = null;
    meta.suspend_kind = null;
    meta.timer = meta.timer || {};
    meta.timer.last_tick_epoch = now;
    meta.timer.both_online_ms = 0;
    meta.timer.reminded_90 = false;
    if (meta.L) meta.L.auto_pick_streak = 0;
    if (meta.R) meta.R.auto_pick_streak = 0;
    if (meta.timer.deadline_epoch && oldSince) meta.timer.deadline_epoch += (now - oldSince);
  }

  if (row.status !== 'active') {
    await saveSeatMeta(db, row.id, meta);
    return coopReloadView(db, battleId, callerSeat);
  }

  // f. 进行中主流程
  const th = await coopThresholds(db, env);
  const bothOnline = !!(fresh('L') && fresh('R'));
  meta.timer = meta.timer || { round_no: st.round_no, both_online_ms: 0, last_tick_epoch: now, reminded_90: false, deadline_epoch: null };
  const tick = meta.timer;
  if (bothOnline && tick.last_tick_epoch) tick.both_online_ms = (tick.both_online_ms || 0) + Math.max(0, now - tick.last_tick_epoch) * 1000;
  tick.last_tick_epoch = now;

  const subRes = await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=?').bind(row.id, st.round_no).all();
  const subs = {};
  for (const s of (subRes.results || [])) subs[s.seat] = s;
  const fighters = ['L', 'R'].filter(S => meta[S] && coopSeatShouldSubmit(st, S));
  const missing = fighters.filter(S => !subs[S]);

  if (bothOnline && tick.both_online_ms >= th.remindSecs * 1000 && missing.length) tick.reminded_90 = true;

  if (bothOnline && tick.both_online_ms >= th.autoSecs * 1000) {
    for (const S of missing) {
      const moveName = firstAttackMoveName(activePetOf(st, sideOfSeat(S)));
      if (!moveName) continue;
      const ins = await db.prepare("INSERT OR IGNORE INTO coop_submissions(battle_id, round_no, seat, user_id, action_type, move_id, is_auto_pick, submitted_at) VALUES(?, ?, ?, ?, 'move', ?, 1, ?)")
        .bind(row.id, st.round_no, S, meta[S].child_id, moveName, now).run();
      if (ins.meta && ins.meta.changes > 0) {
        meta[S].auto_pick_streak = (meta[S].auto_pick_streak || 0) + 1;
        subs[S] = { seat: S, action_type: 'move', move_id: moveName, is_auto_pick: 1 };
      } else {
        const ex = await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=? AND seat=?')
          .bind(row.id, st.round_no, S).first();
        if (ex) subs[S] = ex;
      }
    }
  }

  if (!fighters.every(S => subs[S])) {
    await saveSeatMeta(db, row.id, meta);
    return { view: await coopBattleView(db, row, st, meta, callerSeat), events: [] };
  }

  // g. 结算
  const event = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(row.coop_event_id).first();
  const node = event ? coopNode(event.map_version, row.node_id) : null;
  if (!event || !node) return { error: 'DATA_MISSING', status: 500 };

  let rowRd = await db.prepare('SELECT * FROM coop_rounds WHERE battle_id=? AND round_no=?').bind(row.id, st.round_no).first();
  if (!rowRd) {
    const b0 = coopBossChoose(st, node, Math.random);
    await db.prepare('INSERT OR IGNORE INTO coop_rounds(battle_id, round_no, boss_action, opened_at) VALUES(?,?,?,?)')
      .bind(row.id, st.round_no, JSON.stringify(b0), now).run();
    rowRd = await db.prepare('SELECT * FROM coop_rounds WHERE battle_id=? AND round_no=?').bind(row.id, st.round_no).first();
  }
  const ba = parseJsonSafe(rowRd && rowRd.boss_action, null);

  const acts = {};
  for (const S of ['L', 'R']) {
    const sub = subs[S];
    let a = null;
    if (sub) {
      if (sub.action_type === 'move') {
        const t = sub.target_seat;
        a = { type: 'move', moveName: sub.move_id, shellTarget: (t === 'L' || t === 'R') ? (t === S ? 'self' : 'ally') : undefined };
      } else if (sub.action_type === 'switch') {
        a = { type: 'switch', toIdx: sub.switch_to };
      } else if (sub.action_type === 'support') {
        a = { type: 'support', kind: sub.support_kind };
      }
    }
    acts[sideOfSeat(S)] = a;
  }

  const stBefore = JSON.parse(JSON.stringify(st));
  const oldRound = st.round_no;
  const r = resolveCoopRound(st, acts, ba, Math.random);
  if (r && r.error) {
    await saveSeatMeta(db, row.id, meta);
    return { error: r.error, status: 400, view: await coopBattleView(db, row, stBefore, meta, callerSeat) };
  }
  for (const S of ['L', 'R']) {
    if (subs[S] && !Number(subs[S].is_auto_pick) && meta[S]) meta[S].auto_pick_streak = 0;
  }

  const ended = (st.coop && st.coop.ended) || null;
  const newStatus = ended ? 'finished' : 'active';
  const nextBa = ended ? null : coopBossChoose(st, node, Math.random);
  const oldVersion = row.version;
  const newVersion = oldVersion + 1;

  const stmts = [
    db.prepare('UPDATE battles SET state=?, round_no=?, version=?, status=?, finished_epoch=? WHERE id=? AND round_no=? AND version=?')
      .bind(JSON.stringify(st), st.round_no, newVersion, newStatus, ended ? now : row.finished_epoch, row.id, oldRound, oldVersion),
    db.prepare('UPDATE coop_rounds SET resolved_at=?, result_json=? WHERE battle_id=? AND round_no=? AND resolved_at IS NULL AND EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)')
      .bind(now, JSON.stringify({ events: r.events }), row.id, oldRound, row.id, newVersion)
  ];
  if (!ended) {
    stmts.push(db.prepare('INSERT OR IGNORE INTO coop_rounds(battle_id, round_no, boss_action, opened_at) SELECT ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)')
      .bind(row.id, st.round_no, JSON.stringify(nextBa), now, row.id, newVersion));
  } else {
    stmts.push(db.prepare('UPDATE coop_runs SET end_reason=?, counts_toward_cap=1, ended_at=? WHERE run_id=? AND end_reason IS NULL AND EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)')
      .bind(ended, now, row.run_id, row.id, newVersion));
    if (ended === 'lose') {
      stmts.push(db.prepare("UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=? AND camp_snapshot IS NOT NULL AND json_extract(camp_snapshot, '$.battle_id')=? AND EXISTS(SELECT 1 FROM battles WHERE id=? AND version=?)")
        .bind(row.coop_event_id, row.node_id, row.id, row.id, newVersion));
    }
  }
  const results = await db.batch(stmts);
  if (!results[0] || !results[0].meta || results[0].meta.changes === 0) {
    // CAS 失败：他人已推进，返回最新视图
    return coopReloadView(db, battleId, callerSeat);
  }
  row.version = newVersion;
  row.status = newStatus;
  row.round_no = st.round_no;

  let suspended = false;
  // 连续代选 ≥2 → 判离开挂起
  if (!ended && ['L', 'R'].some(S => meta[S] && (meta[S].auto_pick_streak || 0) >= 2)) {
    await db.prepare("UPDATE battles SET status='suspended', since_epoch=? WHERE id=? AND version=?").bind(now, row.id, newVersion).run();
    meta.suspend_kind = 'timeout';
    row.status = 'suspended';
    row.since_epoch = now;
    suspended = true;
  }
  // 25 分钟扎营
  if (!ended && !suspended && tick.deadline_epoch && now >= tick.deadline_epoch) {
    const weekKey = (await coopWeekKeyNow(db, today)) || weekStartMon(today);
    const camp = coopCampSnapshot(row, st, meta, weekKey);
    await db.prepare('UPDATE coop_node_progress SET camp_snapshot=?, version=version+1 WHERE event_id=? AND node_id=?')
      .bind(JSON.stringify(camp), row.coop_event_id, row.node_id).run();
    await db.prepare("UPDATE battles SET status='suspended', since_epoch=? WHERE id=? AND version=?").bind(now, row.id, newVersion).run();
    meta.suspend_kind = 'camp';
    row.status = 'suspended';
    row.since_epoch = now;
    suspended = true;
  }
  if (!ended && !suspended) {
    tick.round_no = st.round_no;
    tick.both_online_ms = 0;
    tick.reminded_90 = false;
    tick.last_tick_epoch = now;
  }
  if (ended === 'win') await settleCoopWin(db, row, st);

  await saveSeatMeta(db, row.id, meta);
  const g2 = await loadBattle(db, battleId);
  if (!g2) return { error: 'NOT_FOUND', status: 404 };
  const meta2 = parseSeatMeta(g2.row) || {};
  return {
    view: await coopBattleView(db, g2.row, g2.st, meta2, callerSeat),
    events: r.events || [],
    settled: ended ? ended : undefined
  };
}

/* ===================== 合作模式：视图 / 鉴权 / 校验 / API ===================== */

// 统一错误响应
function coopErr(code, status, extra) {
  return json(Object.assign({ ok: false, error: code }, extra || {}), status);
}

// 读取合作对战：兼容 loadBattle 返回 {row, st} 或直接返回行
async function coopLoad(db, id) {
  if (id == null || id === '') return null;
  const got = await loadBattle(db, Number(id));
  if (!got) return null;
  const row = got.row || got;
  if (!row || row.mode !== 'coop') return null;
  const st = got.st !== undefined ? got.st : parseJsonSafe(row.state, null);
  return { row, st };
}

// 合作活动参与者（兼容多种列形态）
function coopParticipants(event) {
  if (!event) return [];
  let ids = [event.participant_a, event.participant_b];
  return ids.filter(x => x != null).map(Number);
}

function coopMateSeat(seat) {
  return seat === 'L' ? 'R' : 'L';
}

async function coopReadEvent(db, id) {
  const r = await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(id).first();
  if (r && r.id == null) r.id = r.event_id;
  return r;
}

async function coopDayGateOk(db, childId, dateStr) {
  const g = await coopDayGateMet(db, childId, dateStr);
  return g === true || !!(g && g.met);
}

// 1. 白名单视图
async function coopBattleView(db, row, st, meta, viewerSeat) {
  meta = meta || {};
  const live = st && row.status !== 'waiting' && st.round_no != null;
  const [subsRes, run] = await Promise.all([
    live
      ? db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=?')
        .bind(row.id, st.round_no).all()
      : null,
    row.run_id
      ? db.prepare('SELECT * FROM coop_runs WHERE run_id=?').bind(row.run_id).first()
      : null,
  ]);
  const subs = subsRes ? (subsRes.results || []) : [];

  function sideView(s) {
    if (!s) return null;
    return {
      childId: s.childId, childName: s.childName, battleLevel: s.battleLevel, activeIdx: s.activeIdx,
      pets: (s.pets || []).map(p => ({
        key: p.key, name: p.name, type: p.type, no: p.no, img: p.img, level: p.level,
        hp: p.hp, maxHp: p.maxHp, active: p.active, fainted: p.fainted, moves: p.moves,
        shellCount: (p.shellLayers || []).length,
        // 道馆二期 Tier 1：官方双属性（克制角标按它算倍率；单属性 type 不够，双属性才准）
        defTypes: p.defTypes || null,
      })),
    };
  }

  // 预告：仅当本回合有效时公开
  let telegraph = null;
  let bossView = null;
  if (st && st.sides && st.sides.BOSS) {
    const fx = fxOf(st, 'BOSS') || {};
    const tel = fx.telegraph;
    if (tel && tel.forRound === st.round_no) {
      telegraph = { kind: tel.kind, seat: tel.seat ? seatOfSide(tel.seat) : null };
    }
    bossView = sideView(st.sides.BOSS);
    bossView.fx = { charge: !!fx.charge, weak: fx.weakNum != null, telegraph };
  }

  function seatView(S) {
    const m = meta[S] || {};
    const sub = subs.find(x => x.seat === S);
    const sd = st?.sides?.[sideOfSeat(S)];
    return {
      childId: m.child_id ?? null,
      childName: sd?.childName ?? null,
      online: m.last_seen_epoch ? (nowEpoch() - m.last_seen_epoch <= 15) : false,
      role: sd?.role ?? 'fighter',
      autoPickStreak: m.auto_pick_streak || 0,
      submitted: !!sub,
      submittedAction: sub ? {
        type: sub.action_type, moveName: sub.move_id, isAutoPick: !!sub.is_auto_pick,
        shellTargetSeat: sub.target_seat, supportKind: sub.support_kind,
      } : null,
      supportNextRound: sd?.support?.nextRound ?? null,
    };
  }

  let rewards = null;
  if (row.status === 'finished' && st?.coop?.ended === 'win') {
    const gr = (await db.prepare('SELECT * FROM coop_grants WHERE run_id=?').bind(row.run_id).all()).results || [];
    rewards = gr.map(g => ({ childId: g.user_id, type: g.reward_type, ref: g.reward_ref }));
  }

  return {
    battleId: row.id, mode: 'coop', status: row.status, nodeId: row.node_id, eventId: row.coop_event_id,
    roundNo: st?.round_no ?? row.round_no ?? 0,
    mySeat: viewerSeat ?? null,
    ended: st?.coop?.ended ?? null,
    endReason: run?.end_reason ?? null,
    suspended: row.status === 'suspended',
    suspendKind: meta?.suspend_kind ?? null,
    seats: { L: seatView('L'), R: seatView('R') },
    sides: { A: sideView(st?.sides?.A), B: sideView(st?.sides?.B), BOSS: bossView },
    telegraph,
    timer: {
      reminded90: !!meta?.timer?.reminded_90,
      bothOnlineMs: meta?.timer?.both_online_ms || 0,
      deadlineEpoch: meta?.timer?.deadline_epoch ?? null,
    },
    log: st?.log ?? [],
    rewards,
  };
}

// 2. 席位鉴权：孩子会话优先，其次席位 token
async function coopActorSeat(db, req, session, row, body) {
  const meta = parseSeatMeta(row);
  if (session?.kind === 'child') {
    const seat = seatOfChildId(meta, session.child_id);
    if (seat) return { seat, meta };
  }
  if (body?.token) {
    const hash = await sha256hex(String(body.token));
    const tk = meta.tokens || {};
    for (const s of ['L', 'R']) {
      if (tk[s] && tk[s] === hash) return { seat: s, meta };
    }
  }
  return { err: coopErr('not_your_seat', 403) };
}

// 3. 公共前置：总开关 → 假期
async function coopOpenGate(db, env, session) {
  if (!(await getMasterEnabled(db))) return { errResp: coopErr('coop_disabled', 403) };
  const holiday = await currentHoliday(db);
  if (!holiday) return { errResp: coopErr('out_of_holiday', 400) };
  const phase = holidayPhase(holiday);
  const event = await ensureCoopEvent(db, holiday, session && session.familyId);
  if (event && event.id == null) event.id = event.event_id;
  return { holiday, phase, event };
}

// 4. 开局校验链
async function coopStartChecks(db, holiday, phase, event, childIds, nodeId, opts) {
  const excludeRunId = opts?.excludeRunId || null;
  const fail = (code, status) => ({ err: { code, status: status || 400 } });
  if (!phase || !phase.week) return fail('out_of_holiday');

  const ev = (await coopReadEvent(db, event.id)) || event;
  const gs = (await db.prepare('SELECT * FROM coop_gatherings WHERE event_id=? AND user_id IN (?,?)')
    .bind(ev.id, childIds[0], childIds[1]).all()).results || [];
  const hasMakeup = gs.some(g => g.result === 'makeup');
  const notGathered = () => fail(hasMakeup ? 'makeup_pending' : 'not_gathered');
  if (ev.status !== 'active') return notGathered();
  const passed = childIds.every(cid => {
    const g = gs.find(x => Number(x.user_id) === Number(cid));
    return g && (g.result === 'pass' || g.result === 'makeup_pass');
  });
  if (!passed) return notGathered();

  const today = shDateStr();
  for (const cid of childIds) {
    if (!(await coopDayGateOk(db, cid, today))) return fail('daily_gate_unmet');
  }

  const p = shParts();
  const mins = Number(p.hour ?? p.h) * 60 + Number(p.minute ?? p.m ?? p.min);
  if (!(mins >= 540 && mins <= 1230)) return fail('outside_time_window');

  const mx = (await db.prepare(
    "SELECT created_epoch FROM battles WHERE (child_a IN (?,?) OR child_b IN (?,?)) AND mode IN ('gym','pvp') AND status != 'abandoned'"
  ).bind(childIds[0], childIds[1], childIds[0], childIds[1]).all()).results || [];
  if (mx.some(b => b.created_epoch && shDateStr(new Date(b.created_epoch * 1000)) === today)) {
    return fail('mutex_gym_pvp');
  }

  const runs = ((await db.prepare(
    'SELECT run_id, event_day, week_key FROM coop_runs WHERE event_id=? AND (counts_toward_cap=1 OR end_reason IS NULL)'
  ).bind(ev.id).all()).results || []).filter(r => !excludeRunId || r.run_id !== excludeRunId);
  if (runs.filter(r => r.event_day === today).length >= 1) return fail('daily_cap_reached');
  if (runs.filter(r => r.week_key === phase.week.week_key).length >= 4) return fail('weekly_cap_reached');

  const np = await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=? AND node_id=?')
    .bind(ev.id, nodeId).first();
  if (!np || np.state === 'locked') return fail('node_locked');
  return { ok: true, week: phase.week };
}

// 读取某活动未终局 run 对应的对战并按 resumed 返回
async function coopResumedResp(db, eventId, childId) {
  const run = await db.prepare('SELECT * FROM coop_runs WHERE event_id=? AND end_reason IS NULL').bind(eventId).first();
  if (!run) return null;
  const got = await coopLoad(db, run.battle_id);
  if (!got) return null;
  const meta = parseSeatMeta(got.row);
  const view = await coopBattleView(db, got.row, got.st, meta, seatOfChildId(meta, childId));
  return json({ ok: true, resumed: true, battle: view });
}

// 5. 建局
async function apiCoopCreate(db, env, req, session) {
  const body = await readJsonBody(req);
  if (session?.kind !== 'child') return coopErr('not_your_seat', 403);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;

  const gate = await coopOpenGate(db, env, session);
  if (gate.errResp) return gate.errResp;
  const { holiday, phase } = gate;
  let event = gate.event;

  const me = await getChild(db, sc.id);
  const parts = coopParticipants(event);
  if (!me || !parts.includes(Number(me.id))) return coopErr('not_participant', 403);
  const other = await getChild(db, parts.find(x => x !== Number(me.id)));
  if (!other) return coopErr('not_participant', 403);

  await refreshGathering(db, event, holiday, me.id);
  await refreshGathering(db, event, holiday, other.id);
  event = (await coopReadEvent(db, event.id)) || event;

  const resumed = await coopResumedResp(db, event.id, me.id);
  if (resumed) return resumed;

  const nodeId = body.nodeId;
  const checks = await coopStartChecks(db, holiday, phase, event, [me.id, other.id], nodeId, {});
  if (checks.err) return coopErr(checks.err.code, checks.err.status);

  // 营地快照：须明确丢弃，否则走 resume
  const np = await db.prepare('SELECT * FROM coop_node_progress WHERE event_id=? AND node_id=?')
    .bind(event.id, nodeId).first();
  if (np && np.camp_snapshot) {
    if (body.camp === 'discard') {
      await db.prepare('UPDATE coop_node_progress SET camp_snapshot=NULL, version=version+1 WHERE event_id=? AND node_id=?')
        .bind(event.id, nodeId).run();
    } else {
      const snap = parseJsonSafe(np.camp_snapshot, {}) || {};
      return coopErr('camp_locked_config', 409, { campBattleId: snap.battle_id ?? null });
    }
  }

  const benchNo = body.benchNo != null && body.benchNo !== '' ? Number(body.benchNo) : null;
  if (benchNo && !(await ownsSpecies(db, me.id, benchNo))) {
    return json({ ok: false, error: 'bench_not_owned', message: '这只收藏宠还没有收集到哦' }, 400);
  }

  const now = nowEpoch();
  const today = shDateStr();
  const runId = crypto.randomUUID();
  const tokenMe = randToken();
  const seatBase = { auto_pick_streak: 0, all_fainted: false, cheer_from_round: null, cheer_next_round: null };
  const meta = {
    L: Object.assign({ child_id: me.id, joined_epoch: now, last_seen_epoch: now, online: true }, seatBase, { lineup: { benchNo: benchNo || null } }),
    R: Object.assign({ child_id: other.id, joined_epoch: null, last_seen_epoch: 0, online: false }, seatBase, { lineup: { benchNo: null } }),
    timer: { round_no: 0, both_online_ms: 0, last_tick_epoch: now, reminded_90: false, deadline_epoch: null },
    tokens: { L: await sha256hex(tokenMe) },
    suspend_kind: null,
  };

  const ins = await db.prepare(
    "INSERT INTO battles (mode, week_start, stage, child_a, child_b, state, status, counted, coop_event_id, node_id, run_id, seat_meta, version, round_no, created_epoch) VALUES ('coop', ?, NULL, ?, ?, '{}', 'waiting', 0, ?, ?, ?, ?, 0, 0, ?)"
  ).bind(weekStartMon(today), me.id, other.id, event.id, nodeId, runId, JSON.stringify(meta), now).run();
  const battleId = ins.meta.last_row_id;

  try {
    await db.prepare('INSERT INTO coop_runs (run_id, event_id, node_id, battle_id, event_day, week_key, started_at) VALUES (?,?,?,?,?,?,?)')
      .bind(runId, event.id, nodeId, battleId, today, phase.week.week_key, now).run();
  } catch (e) {
    // 并发建局：删除孤儿行，回到已有对局
    await db.prepare("DELETE FROM battles WHERE id=? AND status='waiting'").bind(battleId).run();
    const r = await coopResumedResp(db, event.id, me.id);
    if (r) return r;
    return coopErr('daily_cap_reached', 409);
  }

  {
    const vA = await bumpChildVersion(db, me.id);
    await touchRow(db, 'battles', 'id=?', [battleId], vA);
    const vB = await bumpChildVersion(db, other.id);
    await touchRow(db, 'battles', 'id=?', [battleId], Math.max(vA, vB));
  }
  const got = await coopLoad(db, battleId);
  const view = await coopBattleView(db, got.row, got.st, parseSeatMeta(got.row), 'L');
  return json({ ok: true, battleId, token: tokenMe, battle: view });
}

// 6. 入局
async function apiCoopJoin(db, env, req, session) {
  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const row = got.row;
  const sc = scopeChildId(session, body.childId);
  const selfId = sc.err ? null : Number(sc.id);

  if (row.status !== 'waiting') {
    if (row.status === 'active' && selfId === Number(row.child_b)) return coopErr('already_joined', 409);
    return coopErr('battle_ended', 400);
  }
  const now = nowEpoch();
  const today = shDateStr(); // v11：attachEvoForm 需当日日期
  if (now - row.created_epoch > 600) {
    await settleCoopEnd(db, row, 'void');
    return coopErr('battle_ended', 400);
  }
  if (sc.err) return sc.err;
  if (selfId !== Number(row.child_b)) return coopErr('not_participant', 403);
  const joiner = await getChild(db, row.child_b);
  if (!joiner) return coopErr('not_participant', 403);

  const v = await verifyChildPwd(db, joiner, body.password);
  if (!v.ok) return json({ ok: false, error: v.error }, v.status);

  const gate = await coopOpenGate(db, env, session);
  if (gate.errResp) return gate.errResp;
  const { holiday, phase } = gate;
  let event = gate.event;
  const creator = await getChild(db, row.child_a);
  await refreshGathering(db, event, holiday, joiner.id);
  await refreshGathering(db, event, holiday, creator.id);
  event = (await coopReadEvent(db, event.id)) || event;

  const checks = await coopStartChecks(db, holiday, phase, event, [creator.id, joiner.id], row.node_id, { excludeRunId: row.run_id });
  if (checks.err) return coopErr(checks.err.code, checks.err.status);

  const benchNo = body.benchNo != null && body.benchNo !== '' ? Number(body.benchNo) : null;
  if (benchNo && !(await ownsSpecies(db, joiner.id, benchNo))) {
    return json({ ok: false, error: 'bench_not_owned', message: '这只收藏宠还没有收集到哦' }, 400);
  }

  // 组装对战状态
  const meta = parseSeatMeta(row);
  await attachEvoForm(db, creator, today); // v11：主宠须按实际形态出战
  await attachInstanceAbilities(db, creator);
  await attachEvoForm(db, joiner, today);
  await attachInstanceAbilities(db, joiner);
  await attachExMain(db, creator, meta.L?.lineup?.benchNo || null); // 任务 110：备战前主宠挂线信息
  await attachExMain(db, joiner, benchNo); // 任务 110：备战前主宠挂线信息
  const sideA = buildPlayerSide(creator, levelFromXp(creator.total_xp), meta.L?.lineup?.benchNo || null);
  const sideB = buildPlayerSide(joiner, levelFromXp(joiner.total_xp), benchNo || null);
  meta.R = meta.R || {};
  meta.R.lineup = { benchNo: benchNo || null };
  const node = coopNode(event.map_version, row.node_id);
  const baseLevel = holiday.enemy_base_level || Math.max(levelFromXp(creator.total_xp), levelFromXp(joiner.total_xp));
  const st = createCoopBattleState(node, sideA, sideB, baseLevel);

  const tokenR = randToken();
  meta.R.joined_epoch = now;
  meta.R.last_seen_epoch = now;
  meta.tokens = meta.tokens || {};
  meta.tokens.R = await sha256hex(tokenR);
  meta.timer = meta.timer || {};
  meta.timer.round_no = 1;
  meta.timer.last_tick_epoch = now;
  meta.timer.deadline_epoch = now + COOP_BATTLE_LIMIT_SECS;

  const ba1 = coopBossChoose(st, node, Math.random);

  // 先以乐观锁激活对局，成功后再写 run 与首回合
  const up = await db.prepare(
    "UPDATE battles SET state=?, status='active', round_no=1, version=version+1, seat_meta=? WHERE id=? AND status='waiting' AND version=?"
  ).bind(JSON.stringify(st), JSON.stringify(meta), row.id, row.version).run();
  if (!up.meta || up.meta.changes !== 1) {
    const again = await coopLoad(db, row.id);
    if (again && again.row.status === 'active') return coopErr('already_joined', 409);
    return coopErr('battle_ended', 400);
  }
  {
    const vA = await bumpChildVersion(db, row.child_a);
    await touchRow(db, 'battles', 'id=?', [row.id], vA);
    if (row.child_b) {
      const vB = await bumpChildVersion(db, row.child_b);
      await touchRow(db, 'battles', 'id=?', [row.id], Math.max(vA, vB));
    }
  }
  await db.batch([
    db.prepare('UPDATE coop_runs SET started_at=?, event_day=?, week_key=? WHERE run_id=?')
      .bind(now, shDateStr(), phase.week.week_key, row.run_id),
    db.prepare('INSERT INTO coop_rounds (battle_id, round_no, boss_action, opened_at) VALUES (?,1,?,?)')
      .bind(row.id, typeof ba1 === 'string' ? ba1 : JSON.stringify(ba1), now),
  ]);

  const got2 = await coopLoad(db, row.id);
  const view = await coopBattleView(db, got2.row, got2.st, parseSeatMeta(got2.row), 'R');
  return json({ ok: true, joinToken: tokenR, battle: view });
}

// 推进结果统一转响应
function coopAdvResp(adv, extra) {
  if (adv.error) {
    return json(Object.assign({ ok: false, error: adv.error }, adv.view ? { view: adv.view } : {}), adv.status || 400);
  }
  const out = Object.assign({ ok: true, battle: adv.view, events: adv.events || [] }, extra || {});
  if (adv.settled) out.settled = adv.settled;
  return json(out);
}

// 7. 拉取状态（顺带惰性推进）
async function apiCoopState(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  let body = {};
  if (req.method === 'GET') {
    const u = new URL(req.url);
    body = { battleId: u.searchParams.get('battleId'), token: u.searchParams.get('token') };
  } else {
    body = await readJsonBody(req);
  }
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const actor = await coopActorSeat(db, req, session, got.row, body);
  if (actor.err) return actor.err;
  const adv = await advanceCoopBattle(db, env, got.row.id, actor.seat);
  return coopAdvResp(adv);
}

// 8. 提交动作
async function apiCoopSubmit(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const actor = await coopActorSeat(db, req, session, got.row, body);
  if (actor.err) return actor.err;
  const seat = actor.seat;

  await advanceCoopBattle(db, env, got.row.id, seat);
  const got2 = await coopLoad(db, got.row.id);
  const row2 = got2.row;
  const st = got2.st;
  const meta2 = parseSeatMeta(row2);
  const view = async () => await coopBattleView(db, row2, st, meta2, seat);

  if (row2.status !== 'active') {
    if (row2.status === 'suspended') return coopErr('battle_suspended', 409, { view: await view() });
    if (row2.status === 'waiting') return coopErr('not_started', 400);
    return coopErr('battle_ended', 400, { view: await view() });
  }
  const rn = Number(body.roundNo);
  if (!st || rn !== row2.round_no || rn !== st.round_no) return coopErr('round_stale', 409, { view: await view() });

  const sideKey = sideOfSeat(seat);
  const side = st.sides?.[sideKey];
  const mate = coopMateSeat(seat);
  const action = body.action || {};
  const rec = { action_type: null, move_id: null, target_seat: null, switch_to: null, support_kind: null };

  if (side?.role === 'support') {
    const okKind = ['a', 'b', 'c'].includes(action.kind);
    if (action.type !== 'support' || !okKind || st.round_no < (side.support?.nextRound ?? 0)) {
      return coopErr('support_not_ready', 400);
    }
    rec.action_type = 'support';
    rec.support_kind = action.kind;
    rec.target_seat = action.kind === 'c' ? 'BOSS' : mate;
  } else if (action.type === 'move') {
    const pet = activePetOf(st, sideKey);
    const alive = pet && !pet.fainted && pet.hp > 0;
    const learned = alive && (pet.moves || []).some(m => (typeof m === 'string' ? m : m?.name) === action.moveName);
    if (!learned) return coopErr('MOVE_NOT_LEARNED', 400);
    if (pet.disabledMove === action.moveName) return coopErr('MOVE_DISABLED', 400);
    if (moveEffectOf(action.moveName) === 'shell') {
      const t = action.shellTarget || 'self';
      if (t !== 'self' && t !== 'ally') return coopErr('SHELL_TARGET_INVALID', 400);
      rec.target_seat = t === 'self' ? seat : mate;
    } else if (action.shellTarget) {
      return coopErr('SHELL_TARGET_INVALID', 400);
    }
    rec.action_type = 'move';
    rec.move_id = action.moveName;
  } else if (action.type === 'switch') {
    const idx = Number(action.toIdx);
    const p = Number.isInteger(idx) ? (side?.pets || [])[idx] : null;
    if (!p || p.fainted || p.hp <= 0 || idx === side.activeIdx) return coopErr('SWAP_INVALID', 400);
    rec.action_type = 'switch';
    rec.switch_to = idx;
  } else {
    return coopErr('support_not_ready', 400);
  }

  const subs = (await db.prepare('SELECT * FROM coop_submissions WHERE battle_id=? AND round_no=?')
    .bind(row2.id, st.round_no).all()).results || [];
  const existing = subs.find(s => s.seat === seat);
  const mateSide = st.sides?.[sideOfSeat(mate)];
  const oppSub = mateSide?.role === 'support' ? null : subs.find(s => s.seat === mate);
  const now = nowEpoch();
  const uid = meta2[seat]?.child_id ?? null;

  if (!existing) {
    await db.prepare(
      'INSERT INTO coop_submissions (battle_id, round_no, seat, user_id, action_type, move_id, target_seat, switch_to, support_kind, is_auto_pick, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,0,?)'
    ).bind(row2.id, st.round_no, seat, uid, rec.action_type, rec.move_id, rec.target_seat, rec.switch_to, rec.support_kind, now).run();
  } else {
    const same = existing.action_type === rec.action_type && (existing.move_id ?? null) === rec.move_id &&
      (existing.target_seat ?? null) === rec.target_seat &&
      (existing.switch_to == null ? null : Number(existing.switch_to)) === rec.switch_to &&
      (existing.support_kind ?? null) === rec.support_kind && !existing.is_auto_pick;
    if (!same) {
      if (oppSub) return coopErr('move_locked', 409, { view: await view() });
      await db.prepare(
        'UPDATE coop_submissions SET user_id=?, action_type=?, move_id=?, target_seat=?, switch_to=?, support_kind=?, is_auto_pick=0, submitted_at=? WHERE battle_id=? AND round_no=? AND seat=?'
      ).bind(uid, rec.action_type, rec.move_id, rec.target_seat, rec.switch_to, rec.support_kind, now, row2.id, st.round_no, seat).run();
    }
  }

  // 真实提交：清空代选连击
  if (meta2[seat]) {
    meta2[seat].auto_pick_streak = 0;
    await saveSeatMeta(db, row2.id, meta2);
  }

  const adv = await advanceCoopBattle(db, env, row2.id, seat);
  return coopAdvResp(adv);
}

// 9. 断线恢复：密码换新 token
async function apiCoopResume(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const row = got.row;
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const cid = Number(sc.id);
  if (cid !== Number(row.child_a) && cid !== Number(row.child_b)) return coopErr('not_participant', 403);
  const child = await getChild(db, cid);
  if (!child) return coopErr('not_participant', 403);
  const v = await verifyChildPwd(db, child, body.password);
  if (!v.ok) return json({ ok: false, error: v.error }, v.status);
  if (row.status !== 'suspended' && row.status !== 'active') return coopErr('battle_ended', 400);

  const meta = parseSeatMeta(row);
  const seat = seatOfChildId(meta, cid);
  if (!seat) return coopErr('not_your_seat', 403);
  const tokenNew = randToken();
  meta.tokens = meta.tokens || {};
  meta.tokens[seat] = await sha256hex(tokenNew);
  await saveSeatMeta(db, row.id, meta);

  const adv = await advanceCoopBattle(db, env, row.id, seat);
  return coopAdvResp(adv, { token: tokenNew });
}

// 10. 退出
async function apiCoopQuit(db, env, req, session) {
  if (!(await getMasterEnabled(db))) return coopErr('coop_disabled', 403);

  const body = await readJsonBody(req);
  const got = await coopLoad(db, body.battleId);
  if (!got) return coopErr('not_found', 404);
  const row = got.row;
  const actor = await coopActorSeat(db, req, session, row, body);
  if (actor.err) return actor.err;

  if (row.status === 'waiting') {
    await settleCoopEnd(db, row, 'void');
  } else if (row.status === 'active' || row.status === 'suspended') {
    await settleCoopEnd(db, row, 'quit');
  }
  const got2 = await coopLoad(db, row.id);
  const r2 = got2 ? got2.row : row;
  const st2 = got2 ? got2.st : got.st;
  const view = await coopBattleView(db, r2, st2, parseSeatMeta(r2), actor.seat);
  return json({ ok: true, battle: view });
}

/* POST /api/gym/settle {cmd_id, child_id, stage, won, date, team}：在线结算直接路由，
* 与 /api/commands 的 gym_settle 分发共用 settleGymCore 与同一套 cmd_log 幂等键。
*（二选一说明：两者都提供，直接路由供在线结算复用，commands 分发供 outbox 离线补交复用，
* 核心与幂等同一份代码，不会双写。） */
async function apiGymSettle(db, req, session) {
const body = await readJsonBody(req);
const cmdId = String(body.cmd_id || '');
if (!cmdId) return json({ ok: false, error: 'CMD_ID_REQUIRED'}, 400);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
return runIdempotentCommand(db, cmdId, childId, 'gym_settle', () => settleGymCore(db, childId, body));
}

export function register(route) {
  route('/api/gym/settle', { method: 'POST' }, ({ db, req, session }) => apiGymSettle(db, req, session));
  route('/api/gym/status', { method: '*' }, ({ db, req, session }) => apiGymStatus(db, req, session));
  route('/api/battle/gym/start', { method: 'POST' }, ({ db, req, session }) => apiBattleGymStart(db, req, session));
  route('/api/battle/move', { method: 'POST' }, ({ db, req, session }) => apiBattleMove(db, req, session));
  route('/api/battle/defend', { method: 'POST' }, ({ db, req, session }) => apiBattleDefend(db, req, session));
  route('/api/battle/state', { method: 'POST' }, ({ db, req, session }) => apiBattleState(db, req, session));
  route('/api/battle/abandon', { method: 'POST' }, ({ db, req, session }) => apiBattleAbandon(db, req, session));
  route('/api/battle/pvp/create', { method: 'POST' }, ({ db, req, session }) => apiBattlePvpCreate(db, req, session));
  route('/api/battle/pvp/join', { method: 'POST' }, ({ db, req, session }) => apiBattlePvpJoin(db, req, session));
  route('/api/battle/pvp/status', { method: '*' }, ({ db, req, session }) => apiBattlePvpStatus(db, req, session));
  route('/api/battle/pvp/rematch/request', { method: 'POST' }, ({ db, req, session }) => apiBattlePvpRematchRequest(db, req, session));
  route('/api/battle/coop/create', { method: 'POST' }, ({ db, env, req, session }) => apiCoopCreate(db, env, req, session));
  route('/api/battle/coop/join', { method: 'POST' }, ({ db, env, req, session }) => apiCoopJoin(db, env, req, session));
  route('/api/battle/coop/state', { method: '*' }, ({ db, env, req, session }) => apiCoopState(db, env, req, session));
  route('/api/battle/coop/submit', { method: 'POST' }, ({ db, env, req, session }) => apiCoopSubmit(db, env, req, session));
  route('/api/battle/coop/resume', { method: 'POST' }, ({ db, env, req, session }) => apiCoopResume(db, env, req, session));
  route('/api/battle/coop/quit', { method: 'POST' }, ({ db, env, req, session }) => apiCoopQuit(db, env, req, session));
}
export { TYPE_CHART, pickDefenseQuestion, typeMult, moveCategory, calcDamage, createBattleState, petAbility, SOUND_MOVES, PUNCH_MOVES, coopLightningRodSeat, endureRate, tryEndure, trySturdy, tryMagicBounce, healPet, applyAbilityHeal, stageMult, stagesOf, changeStage, resetStages, clearPetBattleState, effectiveSpeed, triggerSwitchIn, onPetLeavesField, foeSidesOf, canSwitchOut, isContactMove, NON_CONTACT_MOVES, STATUS_LABEL, STAGE_KEYS, statusImmunityReason, tryInflictStatus, tryInflictInfatuation, tryInflictFlinch, applyStatusInflict, applyContactTrigger, applyAttackerContactTrigger, applyStenchFlinch, applyAftermath, isSandImmune, applyHitAbilityTriggers, applyCursedBody, applyMoxie, statusBlocksAction, statusBlockedText, settleStatusTick, tickActiveStatuses, applyAbilityStages, applyAbilityFlashFire, stagedMoveForContact, applyStagedBlocked, abilityEventText, applyBattleAction, canSideAttack, activePetOf, flattenSideLevel, officialAccuracy, resolveGymRound, gymBossChoose, stagePvpAttack, resolveStagedAttack, DEFENSE_KINDS, pickDefenseKind, defenseSummaryFromLog, PVP_CRIT_RATE, PVP_CRIT_MULT, PVP_HP_MULT, pvpMaxHp, PVP_DEFENSE_TIMEOUT_SECS, bothSidesEntered, stepDefenseTimeout, applyPvpSwap, pvpOrderTeam, CRIT_RATE, CRIT_MULT, applyTransform, revertTransform, fxOf, applyStagedEffect, applyStagedMiss, applyEffectFlag, consumeAttackMods, loadBattle, saveBattle, coopRewardRef, coopRewardAsset, createCoopBattleState, buildCoopBossSide, coopBossChoose, resolveCoopRound, coopAddShellLayer, coopPeekShellLayer, coopConsumeShellLayer, advanceCoopBattle, settleCoopWin, settleCoopEnd, coopThresholds, BOSS_FOLLOW, effBossBattleLevel, GYM_WEATHER_POOL, GYM_WEATHER_POOLS, gymDailyWeather, GYM_ITEM_EFFECTS, GYM_ITEM_CAPS };
