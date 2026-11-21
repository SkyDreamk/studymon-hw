/* 作业打卡怪兽激励 — Cloudflare Worker + D1（家庭自用版）
 * 所有日期判断按 Asia/Shanghai 在服务端计算。
 * 登录模型（入口改造后）：入口页角色选择 —— 孩子用各自 4 位密码登录
 *   （会话 kind='child' 绑定 child_id，服务端只下发本人数据）；
 *   家长用 PIN 登录或由孩子会话输 PIN 升级（会话 kind='parent'，全量管理）。
 *   原全家共用家庭密码已退役（/api/login 下线，settings.family_password 已删）。
 * 经验来源：打卡审核通过（按科独立计，subject_xp/科）、每日问答答对（quiz_xp，可调）、照顾喂食最爱食物（+5/日，需总开关 `care_enabled` 开启）。
 *   审核入口见 apiReview；问答入口见 apiQuizAnswer（内部经 grantXp 走同一套
 *   升级/进化/招式计算）。除上述三条外不得添加任何其他加经验入口；战斗绝不发经验。
 * 打卡（迁移 0004 后）：固定五科，每科一天一行、独立提交/审核；
 *   连击与道馆计数按「天」（当天至少 1 科通过即算）。照片存 R2（PHOTOS 绑定，
 *   未开通时 env.PHOTOS 为空，照片接口返回明确错误），库里只存 checkin_photos 索引。
 */

import { SPECIES } from './data/species.js';
import { MOVES_OFFICIAL } from './data/moves-official.js';
import { COLLECTION_LEARNSET } from './data/collection-learnset.js';
import { GYM_STAGES } from './data/gym-stages.js';
import { DAILY_ENGLISH_POOL, DAILY_ENGLISH_EPISODES } from './data/daily-english.js';
import { OAK_EPISODE_ROWS } from './data/oak-episode-lists.js';
import { DAILY_CHINESE_POOL } from './data/daily-chinese.js';
import { MATH_BANK_TOPICS, MATH_BANK_QUESTIONS } from './data/math-bank.js';

/* 模块化后端：路由模块 + 共享辅助（src/routes/*、src/lib/shared.js） */
import { register as register_wheel } from './routes/wheel.js';
import { register as register_care } from './routes/care.js';
import { register as register_gym } from './routes/gym.js';
import { register as register_quiz } from './routes/quiz.js';
import { register as register_school_test } from './routes/school-test.js';
import { BALL_COLUMN, BALL_DROP_DAILY_LIMIT, BALL_EXCHANGE, BALL_MAX, BOSS_SCALE, CARE_SCENES, CARE_WHEEL_POOL, CHINESE_CHAPTERS, COLLECTION_MOVES, COOP_MAPS, DAILY_DROP_DAILY_LIMIT, DAILY_DROP_RATE, DAILY_DROP_STONES, DAILY_DROP_TABLE, DEX_DETAILS, DIAG_EDGES_BY_TOPIC, DIAG_EXPIRE_DAYS, DIAG_FAIL_CLOSED, DIAG_MAX_DEPTH, DIAG_NO_QUESTION_TOPIC, DIAG_WEAK_MIN_RATIO, DIAG_WEAK_MIN_WRONG, DIAG_WINDOW_DAYS, EEVEE_BRANCHES, EGG_DESIGNS, EGG_MYSTERY, EGG_TYPE_FALLBACK, ENGLISH_UNITS, EVO_LINES, EVO_TABLE_OK, FAMILY_SETTING_KEYS, FRIENDSHIP_MAX, GATES_OPEN, GATES_OPEN_FULL, GATE_SUBJECTS, ITEM_CATALOG, LINES, LINE_TYPE, MATH_CHAPTERS, MATH_PREREQ_G1G3, MAX_CARRIED_COLLECTION, MOVE_EFFECTS, OAK_WHEEL_POOL, OFFICIAL_MULT, PIN_LOCK_MAX, PIN_LOCK_SECS, PLAYER_SCALE, QUIZ_CORRECT_WINDOW_DAYS, QUIZ_SLOTS_ALL, QUIZ_SUBJECTS, QUIZ_WRONG_GAP_DAYS, RARE_WHEEL_EEVEE, RARE_WHEEL_FINALS, RARE_WHEEL_LEGENDARIES, SKILL_CHARGE_MULT, SKILL_MAX_LEVEL, SKILL_SHELL_MULT, SKILL_SMOKE_MISS, SKILL_WEAK_MULT, TYPES18, WHEEL_COLORS, WHEEL_EGG_POOL, WHEEL_POOL, WILD, WILD_TIERS, abilityOf, addBalls, addDays, addItem, allMovesFor, apiQuizAnswer, applyDebugTime, attachEvoForm, attachExMain, attachInstanceAbilities, battleMaxHp, bossDefTypes, buildPlayerSide, buildWheelSectors, bumpChildVersion, careSceneForDate, careWheelEntries, carriedCollection, chapterOrder, chapterOrderFor, chineseGatePass, collectionMovesFor, computeGatherCounts, coopDayGateMet, coopMapNodes, coopNode, coopRewardLabel, countersForPet, countersForType, currentHoliday, debugBenchOptions, defaultChapterFor, dexKeyForSpecies, diagFindRoot, diagTopicStates, diagWeakestTopic, diffDays, effBossLevel, effPlayerLevel, effectiveMoves, eggDesignFor, englishGatePass, englishOrder, ensureCoopEvent, ensurePetInstance, evoWheelEntries, expandQuizSubjects, fairyMovesOf, fnv1aHash, forbidIfOtherChild, formIdxForLevel, formInfo, fragmentAwardOnCorrect, fragmentsForCorrectTotal, gateFor, getChild, getChildMainFriendship, getChildren, getEffSetting, getExMainLine, getFamilyChild, getFamilyOverrides, getInventoryQty, getMasterEnabled, getPetInstance, getSetting, getSettings, gradeNumFromLabel, grantOakWheelChance, grantWheelChance, grantXp, hasCarriedColumn, hasEvoTable, hasPendingEgg, hasSyncTables, holidayPhase, instAbilityFor, isCareEnabled, isTestMode, isWeekendDate, json, latestRematchRequest, learnedCollectionMoves, learnedMoves, levelFromXp, lineMovesFor, listHolidays, loadChineseGate, loadEnglishGate, loadHotSettings, loadMathGate, makePet, mathGatePass, moveEffectOf, newMovesBetween, normalizeQuizRow, notFound404, nowDate, nowEpoch, oakPrizeDisplay, oakWheelEntries, officialMove, ownedCollection, ownedSpeciesSet, ownsSpeciesEver, parseJsonSafe, parsePhotosArg, petImg, photoDelete, photoExt, photoPut, pickWildSpecies, playerDefTypes, pushEvoNotices, pushNotice, pvpCountedThisWeek, quizDailyTotal, quizHistoryForChild, quizPoolForChild, randToken, rareWheelFinals, rareWheelSectors, readJsonBody, recordTombstone, refreshGathering, rematchView, rollBallDrop, rollDailyItemDrop, rollInstanceAbility, rollRng, rollWildEncounter, runIdempotentCommand, safeJsonArr, safeJsonObj, scopeChildId, selectDailyQuestions, setSetting, settleBallOverflow, settleGymCore, shDateStr, shParts, sha256hex, showEnglishZh, skillEffectFor, skillLevelOf, skillPower, speciesName, speciesOfDexKey, statsFor, syncTouch, takeItem, touchRow, typeMultOfficial, typeMultOfficialMulti, unlockForms, weekStartMon, weightedPick, wheelChancesLeft, wheelChancesLeftFor, withChild, xpForLevel } from './lib/shared.js';
import { BOSS_FOLLOW, CRIT_MULT, CRIT_RATE, DEFENSE_KINDS, GYM_ITEM_CAPS, GYM_ITEM_EFFECTS, GYM_WEATHER_POOL, GYM_WEATHER_POOLS, NON_CONTACT_MOVES, PUNCH_MOVES, PVP_CRIT_MULT, PVP_CRIT_RATE, PVP_DEFENSE_TIMEOUT_SECS, PVP_HP_MULT, SOUND_MOVES, STAGE_KEYS, STATUS_LABEL, TYPE_CHART, abilityEventText, activePetOf, advanceCoopBattle, applyAbilityFlashFire, applyAbilityHeal, applyAbilityStages, applyAftermath, applyAttackerContactTrigger, applyBattleAction, applyContactTrigger, applyCursedBody, applyEffectFlag, applyHitAbilityTriggers, applyMoxie, applyPvpSwap, applyStagedBlocked, applyStagedEffect, applyStagedMiss, applyStatusInflict, applyStenchFlinch, applyTransform, bothSidesEntered, buildCoopBossSide, calcDamage, canSideAttack, canSwitchOut, changeStage, clearPetBattleState, consumeAttackMods, coopAddShellLayer, coopBossChoose, coopConsumeShellLayer, coopLightningRodSeat, coopPeekShellLayer, coopRewardAsset, coopRewardRef, coopThresholds, createBattleState, createCoopBattleState, defenseSummaryFromLog, effBossBattleLevel, effectiveSpeed, endureRate, flattenSideLevel, foeSidesOf, fxOf, gymBossChoose, gymDailyWeather, healPet, isContactMove, isSandImmune, loadBattle, moveCategory, officialAccuracy, onPetLeavesField, petAbility, pickDefenseKind, pickDefenseQuestion, pvpMaxHp, pvpOrderTeam, resetStages, resolveCoopRound, resolveGymRound, resolveStagedAttack, revertTransform, saveBattle, settleCoopEnd, settleCoopWin, settleStatusTick, stageMult, stagePvpAttack, stagedMoveForContact, stagesOf, statusBlockedText, statusBlocksAction, statusImmunityReason, stepDefenseTimeout, tickActiveStatuses, triggerSwitchIn, tryEndure, tryInflictFlinch, tryInflictInfatuation, tryInflictStatus, tryMagicBounce, trySturdy, typeMult } from './routes/gym.js';
import { CARE_BATHS, CARE_FOODS, CARE_XP_FAVORITE, careBathByKey, careDailyFavorite, careFoodByKey, friendshipHeartsOf } from './routes/care.js';
import { DIAG_REVIEW_COUNT, diagPickReview, questionLabel } from './routes/quiz.js';
import { EGG_HATCH_DAYS, OAK_DRAW_XP, careWheelFor, grantEgg, oakRollDraw, oakWheelFor, rollCareWheelPrize, rollRareWheelPrize, rollWheelPrize, wheelWinnerIndex } from './routes/wheel.js';
import { SCHOOL_PHOTO_KEEP_DAYS, WHEEL_WEEK_LIMIT } from './routes/school-test.js';

// 正式站 host（2026-11-10 用户定：服务端按 host 下发 noindex）——其余 host（测试子域、workers.dev 等）一律视为测试/预演，不被搜索引擎收录
const PROD_HOSTS = new Set(['example.com', 'www.example.com', 'exempt.example.com', 'www.exempt.example.com']);
const isProdHost = (hostname) => PROD_HOSTS.has(hostname);

function wildTierOf(no) {
  const w = WILD.find((x) => x.no === Number(no));
  return w ? w.tier : null;
}

/* 球壳按精灵稀有度配球（2026-11-19 §16）：野外常见→红、少见→蓝、稀有→黄；传说/幻之→紫；其余默认红。 */
const BALL_BY_TIER = { common: 'red', uncommon: 'blue', rare: 'yellow' };
function ballKindFor(no) {
  const n = Number(no);
  if (n === RARE.no || RARE_WHEEL_LEGENDARIES.includes(n)) return 'purple';
  return BALL_BY_TIER[wildTierOf(n)] || 'red';
}
function ballKindMap() {
  const m = {};
  for (const w of WILD) m[w.no] = ballKindFor(w.no);
  for (const n of [...RARE_WHEEL_LEGENDARIES, RARE.no]) m[n] = 'purple';
  return m;
}
/* 扭蛋机球按奖品等级配（2026-11-19 §17）：转盘扇区 key → 球色。传说扇区→紫；道具/球按 ITEM_CATALOG.rarity（common→红、rare→黄）；
 * 蛋扇区（key 'egg'，物种未定）按稀有档→黄；其余（xp、ball、伊布/终极组）→红。具体精灵奖品另按物种走 ballKindFor。 */
function sectorBallKind(key) {
  const k = String(key || '');
  if (k.startsWith('legendary:')) return 'purple';
  if (k === 'egg') return 'yellow';
  const cat = ITEM_CATALOG[k];
  return cat && cat.rarity === 'rare' ? 'yellow' : 'red';
}
function ballItemKinds() {
  const m = { egg: 'yellow' };
  for (const k of Object.keys(ITEM_CATALOG)) m[k] = sectorBallKind(k);
  for (const n of RARE_WHEEL_LEGENDARIES) m[`legendary:${n}`] = 'purple';
  return m;
}
/* 四盘全池扇区的球色计数（预览态机内球配色用；抽过一轮后前端改用该轮实际 sectors 自算）。 */
function ballWheelMix() {
  const count = (sectors) => {
    const c = {};
    for (const s of sectors) { const k = sectorBallKind(s.key); c[k] = (c[k] || 0) + 1; }
    return c;
  };
  return {
    advanced: count(buildWheelSectors(evoWheelEntries().entries).sectors),
    rare: count(rareWheelSectors().sectors),
    nurture: count(buildWheelSectors(careWheelEntries()).sectors),
    ordinary: count(buildWheelSectors(oakWheelEntries()).sectors),
  };
}

/* 抓捕一只该物种需要答对的题数（按稀有度档位 1/2/3） */
function catchQuestionsFor(no) {
  const t = wildTierOf(no);
  return t ? WILD_TIERS[t].questions : 1;
}

const STREAK_TITLES = ['早起小勇士', '作业小达人', '坚持之星', '专注小能手', '闪电打卡王'];
const STREAK_STICKERS = ['⭐', '🌈', '🔥', '🎖️', '🍀'];

const GYM_BOSS = { no: 95, name: '大岩蛇' };
const RARE = { no: 151, name: '梦幻' };
const TYPES = Object.keys(TYPE_CHART);

/* 只有这两条线有专属头像文件（avatar-*.webp）；其余线用当前形态立绘兜底（同类问题三线一起修） */
const AVATAR_LINES = new Set(['charmander', 'pikachu']);

// 单独读取官方威力，供珍稀卡牌馆卡面显示（任务 116）；战斗结算不吃它，返回形状与 officialAccuracy 同款。
function officialPower(name) {
  const power = MOVES_OFFICIAL[name]?.power;
  return Number.isFinite(power) ? power : null;
}
/* 蛋 key ↔ 物种号 */
const EGG_ITEM_BY_SPECIES = { 1: 'egg:bulbasaur', 4: 'egg:charmander', 7: 'egg:squirtle', 25: 'egg:pikachu', 133: 'egg:eevee', 37: 'egg:vulpix', 58: 'egg:growlithe' };
const EGG_SPECIES_BY_ITEM = Object.fromEntries(Object.entries(EGG_ITEM_BY_SPECIES).map(([no, k]) => [k, Number(no)]));
/* 主宠终极进化用石（按主宠属性；伊布走 EEVEE_BRANCHES） */
const MAIN_EVO_STONE = { pikachu: 'stone:thunder', charmander: 'stone:fire', squirtle: 'stone:water', bulbasaur: 'stone:leaf' };
/* 妖精技能石教学池（官方可习得 5 招；App 威力按 25＋6×学会等级，副效待战斗引擎接线㉑） */
const FAIRY_TEACH_POOL = [
  { name: '魅惑之声', power: 40, acc: '必中', effect: '必定命中', type: '妖精' },
  { name: '吸取之吻', power: 50, acc: 100, effect: '回复造成伤害一半的体力', type: '妖精' },
  { name: '魔法闪耀', power: 80, acc: 100, effect: '', type: '妖精' },
  { name: '嬉闹', power: 90, acc: 90, effect: '降低对手攻击', type: '妖精' },
  { name: '月亮之力', power: 95, acc: 100, effect: '降低对手特攻', type: '妖精' },
];
/* 图鉴卡片进化链（App 实际规则；官方对照见 DESIGN-进化道具-方案-v11.md 与数据表，官方有、App 没有的分支不展示）。
 * 收藏线走 EVO_LINES；主宠线走 LINES＋FORM_LEVELS（5/10 阶、16＋石终极）＋MAIN_EVO_STONE；
 * 伊布走 EEVEE_BRANCHES。返回 { chain: [{no, name, cond}], branches: [...] | null }，
 * cond 为进化到该节点的 App 条件文本（首节点 null）。 */
function evoCondText(cond) {
  if (!cond) return null;
  if (cond.kind === 'level') return `${cond.level}级以上`;
  if (cond.kind === 'stone') return `使用${(ITEM_CATALOG[cond.stone] || {}).name || '进化石'}`;
  if (cond.kind === 'trade-item') return `使用${(ITEM_CATALOG[cond.item] || {}).name || '道具'}连接交换`;
  if (cond.kind === 'trade') return `连接交换（${cond.minLevel || 10}级以上）`;
  return null;
}
function dexEvoChain(no) {
  no = Number(no);
  const node = (n, cond) => ({ no: n, name: speciesName(n), cond: cond || null });
  const eeveeCond = (bkey, stone) => (bkey === 'sylveon' ? `${FORM_LEVELS[3]}级＋妖精技能石（学会妖精招式）` : `${FORM_LEVELS[3]}级＋${(ITEM_CATALOG[stone] || {}).name || '进化石'}`);
  for (const [base, evo] of Object.entries(EVO_LINES)) {
    if (evo.stages && evo.stages.includes(no)) {
      return { chain: evo.stages.map((n, i) => node(n, i === 0 ? null : evoCondText(evo.conds[i - 1]))), branches: null };
    }
    if (evo.branches) {
      if (Number(base) === no) {
        return { chain: [node(no, null)], branches: evo.branches.map((b) => node(b.to, evoCondText(b.cond))) };
      }
      const hit = evo.branches.find((b) => b.to === no);
      if (hit) return { chain: [node(Number(base), null), node(no, evoCondText(hit.cond))], branches: null };
    }
  }
  for (const [key, line] of Object.entries(LINES)) {
    const idx = line.forms.findIndex((f) => f.no === no);
    if (idx === -1) continue;
    if (key === 'eevee') {
      return { chain: [node(no, null)], branches: Object.entries(EEVEE_BRANCHES).map(([bkey, b]) => node(b.no, eeveeCond(bkey, b.stone))) };
    }
    const stoneName = (ITEM_CATALOG[MAIN_EVO_STONE[key]] || {}).name || '进化石';
    const chain = line.forms.map((f, i) => node(f.no, i === 0 ? null : i === 1 ? `${FORM_LEVELS[2]}级以上` : `${FORM_LEVELS[3]}级＋${stoneName}`));
    return { chain, branches: null };
  }
  for (const [bkey, b] of Object.entries(EEVEE_BRANCHES)) {
    if (b.no === no) {
      return { chain: [node(133, null), node(no, eeveeCond(bkey, b.stone))], branches: null };
    }
  }
  return { chain: [node(no, null)], branches: null };
}
/* 换主宠门槛（§5.3）：目标线蛋（须已孵化）＋任一对应石（不消耗）；切回曾作过主宠的线无需蛋石。
 * 日之石另配火/电蛋、月之石另配水蛋；冰蛋暂无（主宠蛋池无冰系线）。 */
const SWITCH_REQ = {
  bulbasaur: { egg: 1, stones: ['stone:leaf'] },
  charmander: { egg: 4, stones: ['stone:fire', 'stone:sun'] },
  squirtle: { egg: 7, stones: ['stone:water', 'stone:moon'] },
  pikachu: { egg: 25, stones: ['stone:thunder', 'stone:sun'] },
  eevee: { egg: 133, stones: ['stone:water', 'stone:thunder', 'stone:fire', 'stone:leaf', 'stone:ice', 'stone:sun', 'stone:moon', 'stone:fairy-skill'] },
};
/* 学校成绩普通奖励：经验 20；回血药权重合计 85，归一化（顺序：伤药、好伤药、树果汁、美味之水）。 */
const SCHOOL_ORDINARY_XP = 20;
const SCHOOL_HEAL_MEDICINES = [
  ['medicine:potion', 35], ['medicine:super-potion', 20],
  ['medicine:berry-juice', 15], ['medicine:water', 15],
];
/* 单元测试抽奖（§2.5）：85–89 中奖 40%、90–94 中奖 50%、95–100 中奖 60%；
 * 中奖内权重：进化石（普通）32%（5 石均分）、进化石（稀有）3%（日/月/妖精各 1%）、
 * 高阶球 20%（超级 12.5%、高级 7.5%）、蛋 45%（主宠 18%、普通稀有 27%）。
 * 去重后同细分档归一化，整档为空时其权重转未中奖；伊布始终符合，主宠蛋档永不为空。 */
const UNIT_TEST_WIN_CHANCE = [[85, 0.40], [90, 0.50], [95, 0.60]];
const UNIT_TEST_PRIZE = {
  stoneCommon: 0.32, stoneRare: 0.03, ball: 0.20, egg: 0.45,
  ballSuperShare: 0.625, eggMainShare: 0.40,
};
const UNIT_TEST_STONES_COMMON = ['stone:thunder', 'stone:fire', 'stone:water', 'stone:leaf', 'stone:ice'];
const UNIT_TEST_STONES_RARE = ['stone:sun', 'stone:moon', 'stone:fairy-skill'];
const UNIT_TEST_EGG_MAIN = [1, 4, 7, 25, 133];
const UNIT_TEST_EGG_RARE = [37, 58];
/* 单元测试：首期 20 道等权题，每题 5 分；同孩子/科目/单元重开冷却 24 小时；每孩每周 ≤3 次 */
const UNIT_TEST_QUESTION_COUNT = 20;
const UNIT_TEST_COOLDOWN_SECS = 24 * 3600;
const UNIT_TEST_WEEK_LIMIT = 3;
/* 学校成绩普通奖励掷骰（纯函数）：三类等权各 1/3：普通球 / 经验+20 / 回血药（按 SCHOOL_HEAL_MEDICINES 权重）。 */
function rollSchoolOrdinary(rng = Math.random) {
  const category = rollRng(rng);
  if (category < 1 / 3) return { kind: 'ball', key: 'ball:normal', name: '普通球', emoji: '🔴' };
  if (category < 2 / 3) return { kind: 'xp', key: 'xp:20', xp: SCHOOL_ORDINARY_XP, name: '经验+20', emoji: '⭐' };
  const hit = weightedPick(SCHOOL_HEAL_MEDICINES, rng);
  const [key] = hit || SCHOOL_HEAL_MEDICINES[SCHOOL_HEAL_MEDICINES.length - 1];
  return { kind: 'medicine', key, name: ITEM_CATALOG[key].name, emoji: ITEM_CATALOG[key].emoji };
}
export function rareCardHallPool() {
  return [
    { no: 151, group: 'mew' },
    ...[...RARE_WHEEL_LEGENDARIES].sort((a, b) => a - b).map((no) => ({ no, group: 'legendary' })),
    ...[...RARE_WHEEL_EEVEE].sort((a, b) => a - b).map((no) => ({ no, group: 'eevee' })),
    ...[...RARE_WHEEL_FINALS].sort((a, b) => a - b).map((no) => ({ no, group: 'final' })),
  ];
}

/* 卡面招式（任务 104 v2）：每卡最多 2 条 {name, power, type}，供珍稀卡牌馆卡面展示。
 * 口径：COLLECTION_MOVES（2 条原创招式带威力）→ COLLECTION_LEARNSET（取等级最高的 2 条，
 * 威力 25 + 6*学会等级，与图鉴详情同款公式）→ 主宠线 LINES（取等级最高的 2 条，同公式）→ 无则 []。
 * 威力口径（任务 116）：名册招式优先取官方威力 officialPower（原版数值），原创招式名无官方
 * 威力时保留名册值（fallback）；其余两路仍用公式威力。战斗结算不吃这组威力。
 * 招式属性：officialMove 有则取其 type，否则取主属性。三张表都没有的种返回 []，与图鉴详情招式为空
 * 一致，不编招式。（2026-11-14 全量 151 批：传说 144/145/146/150、45 霸王花、125 电击兽
 * 已进收藏名册，COLLECTION_MOVES＋COLLECTION_LEARNSET 均有招式，不再返回 []。） */
export function cardFaceMoves(no) {
  const id = Number(no);
  const mainType = ((DEX_DETAILS[id] || {}).types || [])[0] || '';
  const withType = (name, power) => {
    const type = officialMove(name)?.type || mainType;
    return type ? { name, power, type } : { name, power };
  };
  const cm = COLLECTION_MOVES[id];
  if (Array.isArray(cm) && cm.length) {
    return cm.slice(0, 2).map(([name, appPower]) => withType(name, officialPower(name) ?? appPower));
  }
  const cl = COLLECTION_LEARNSET[id];
  if (Array.isArray(cl) && cl.length) {
    return [...cl]
      .sort((a, b) => a[0] - b[0])
      .slice(-2)
      .map(([lv, name]) => withType(name, 25 + 6 * lv));
  }
  for (const line of Object.values(LINES || {})) {
    const forms = line?.forms;
    if (!Array.isArray(forms)) continue;
    const hit = forms.some((f) => (typeof f === 'object' ? f?.no : f) === id);
    if (hit && Array.isArray(line.moves) && line.moves.length) {
      return [...line.moves]
        .sort((a, b) => a[0] - b[0])
        .slice(-2)
        .map(([lv, name]) => withType(name, 25 + 6 * lv));
    }
  }
  return [];
}
/* 单元测试中奖率（纯函数）：分数段 → 中奖概率；低于 85 为 0 */
function unitTestWinChance(score) {
  if (score >= 95) return 0.60;
  if (score >= 90) return 0.50;
  if (score >= 85) return 0.40;
  return 0;
}
/* 单元测试奖品掷骰（纯函数）：返回 {kind:'stone'|'ball'|'egg'|'none', key|species}。
 * 权重按设计稿 §2.5；去重后同细分档归一化，整档为空时其权重转未中奖（'none'）；
 * 伊布始终符合，主宠蛋档永不为空。ownedEggs：主宠/稀有蛋的已获得集合（伊布除外，永符合）。 */
function rollUnitTestPrize(rng = Math.random, ownedMainEggs = new Set(), ownedRareEggs = new Set(), ownedStones = new Set()) {
  const availCommon = UNIT_TEST_STONES_COMMON.filter((s) => !ownedStones.has(s));
  const availRare = UNIT_TEST_STONES_RARE.filter((s) => !ownedStones.has(s));
  const availMain = UNIT_TEST_EGG_MAIN.filter((no) => no === 133 || !ownedMainEggs.has(no));
  const availRareEggs = UNIT_TEST_EGG_RARE.filter((no) => !ownedRareEggs.has(no));
  const wStoneCommon = availCommon.length ? UNIT_TEST_PRIZE.stoneCommon : 0;
  const wStoneRare = availRare.length ? UNIT_TEST_PRIZE.stoneRare : 0;
  const wBall = UNIT_TEST_PRIZE.ball;
  const wEggMain = availMain.length ? UNIT_TEST_PRIZE.egg * UNIT_TEST_PRIZE.eggMainShare : 0;
  const wEggRare = availRareEggs.length ? UNIT_TEST_PRIZE.egg * (1 - UNIT_TEST_PRIZE.eggMainShare) : 0;
  const total = wStoneCommon + wStoneRare + wBall + wEggMain + wEggRare;
  if (total <= 0) return { kind: 'none' };
  let r = rollRng(rng) * total;
  const pick = (arr) => arr[Math.floor(rollRng(rng) * arr.length) % arr.length];
  if ((r -= wStoneCommon) < 0) return { kind: 'stone', key: pick(availCommon) };
  if ((r -= wStoneRare) < 0) return { kind: 'stone', key: pick(availRare) };
  if ((r -= wBall) < 0) {
    return rollRng(rng) < UNIT_TEST_PRIZE.ballSuperShare
      ? { kind: 'ball', key: 'ball:super' } : { kind: 'ball', key: 'ball:hyper' };
  }
  if ((r -= wEggMain) < 0) { const no = pick(availMain); return { kind: 'egg', key: `egg:${no}`, species: no }; }
  if ((r -= wEggRare) < 0) { const no = pick(availRareEggs); return { kind: 'egg', key: `egg:${no}`, species: no }; }
  return { kind: 'none' };
}

// 关都图鉴展示口径：皮丘 172、咩利羊 179 仍在原分册展示，但不计入进度。
const POKEDEX_TOTAL = 151;
function ownedDexNos(entryKeys, currentLine) {
  const owned = new Set();
  for (const key of entryKeys) {
    let no;
    const form = /^form:([^:]+):([1-3])$/.exec(key);
    if (form) {
      if (form[1] !== currentLine) continue;
      no = LINES[currentLine]?.forms?.[Number(form[2]) - 1]?.no;
    } else {
      const species = /^(?:wild|egg|rare|gym):(\d+)$/.exec(key);
      if (!species) continue;
      no = Number(species[1]);
    }
    if (Number.isInteger(no) && no >= 1 && no <= POKEDEX_TOTAL) owned.add(no);
  }
  return [...owned].sort((a, b) => a - b);
}

function dex151Progress(entryKeys, currentLine) {
  const owned = ownedDexNos(entryKeys, currentLine).length;
  return { owned, total: POKEDEX_TOTAL, pct: Math.round(owned / POKEDEX_TOTAL * 100) };
}

const FORM_LEVELS = [1, 5, 10, 16]; // 形态解锁等级：蛋 / 一阶 / 二阶 / 最终（v11：最终由 15 改为 16）
const PIN_SESSION_SECS = 7200; // PIN 验证有效期 2 小时

const COPYRIGHT = '宝可梦立绘来源于 PokeAPI 公开镜像，仅供本家庭内部使用，不得分发、不得公开发布。';

function shTimeHM(date = nowDate()) {
  const p = shParts(date);
  const h = p.hour === '24' ? '00' : p.hour;
  return `${h}:${p.minute}`;
}

const DEBUG_LEVEL_MIN = 1, DEBUG_LEVEL_MAX = 30;
const DEBUG_BALLS_MAX = 99;
const DEBUG_FRAGMENTS_MAX = 999;
const DEBUG_GRANT_QTY_MAX = 999; // 单次发放数量上限（1–999；发放后封顶到各道具上限）

function earlyBefore(cutoffHM, nowHM) {
  return nowHM < cutoffHM; // 字符串比较，HH:MM 零填充可直接比
}
const CHECKIN_SUBJECTS = QUIZ_SLOTS_ALL; // 打卡固定五科（与问答槽位同一集合）

/* Oak 标准组长 6 句（2026-11-13 用户定：每日交流固定 6 句；5 句的对话集由 oakGroupForChild
 * 按日哈希从同年级其他对话集里随机补足到 6 句，见该函数内“补句”一段；完成判定仍以当日
 * 实际集长为准，见 apiOakListen——补句取完仍不足 6 时不硬凑，本常量仅作目标值与测试锚点）。 */
const OAK_GROUP_SIZE = 6;
/* 大木博士跟读奖励（2026-10-26 用户定，两档；2026-10-28 用户改门槛为 4 句 5 星；
 * 2026-11-09 用户纠正：门槛仍是 4 句 5 星（够格），但转盘须全部句子都读完才发放——
 * 第 4 句 5 星时只记够格不发奖，读完最后一句（全部句子都有成绩）才抽）：
 * 没到 4 句 5 星：只有听完全部句子的 quizXp；全部句子里至少 4 句 5 星（每句 pron ≥85，按当日最好成绩）
 * 且全部句子都已读完时，在 10 XP 之外再抽一次，每天一次。
 * 奖池（2026-11-07 转盘升级扩池，权重和为 100 即百分比）：经验仍是单项最大概率 20%、
 * 球第二 10%；养成道具合计 42%（6 食物各 5＋4 洗澡各 3）；伤药＋常见进化石 28% 是实用消耗品。 */
const OAK_FIVE_STAR_PRON = 85;
const OAK_FOUR_STAR_PRON = 75; // 2026-11-17：Oak 抽奖门要求 6 句全 ≥75（4 星线）且 ≥4 句 ≥85（5 星线）
const OAK_DRAW_MIN_FIVE_STAR = 4;

function pickOakEpisode(pool, childId, dateStr) {
  if (!pool.length) return null;
  /* 2026-11-13：改用 FNV-1a（dailyEnglishHash32，与每日英语同款）。旧 oakHash（djb2）在池子
   * 变大后有残留缺口——27 集对话池里 6 集（losteverything×2、makingfriends×2、
   * strikinggold×2）对孩子 1 全年都轮不到；FNV 在 365 天内覆盖全部 16/27 集（已验算）。 */
  return pool[dailyEnglishHash32(childId + ':' + dateStr) % pool.length];
}

/* Oak 示范音 URL：0014 旧行是本地 bundle 文件名（拼 /static/audio/oak/ 前缀）；
 * 0032 起新对话集的 oak_audio 存跟读站绝对地址（https://english.example.com/audio/…），原样直通。 */
function oakAudioUrl(oakAudio) {
  if (!oakAudio) return null;
  return oakAudio.startsWith('http://') || oakAudio.startsWith('https://')
    ? oakAudio : '/static/audio/oak/' + oakAudio;
}

async function oakGroupForChild(db, child, today, S) {
  const gradeNum = gradeNumFromLabel(child.grade_label) || 1;
  /* 降级守卫：oak_* 三列由迁移 0014 引入；旧迁移链（如 access/subjects 测试库）没有这些列，
   * 此时 kind='oak' 行必然为 0，直接返回空组，不碰 oak_* 列，避免总览/孩子详情 500。
   * 线上按“先迁移后部署”顺序，0014 应用后本分支恒不触发。
   * 性能（Fable 优化 #1）：LIMIT 1 探针替代 COUNT(*)——覆盖索引 idx_quiz_kind_grade
   * 上 COUNT 要走全部 399 条 oak 索引项，LIMIT 1 在首条即停；q 不变（仍 1 次），读行
   * 399→1。探针仍不碰任何 oak_* 列，旧链安全性不变。 */
  const seedRow = await db.prepare(
    "SELECT 1 FROM quiz_questions WHERE kind='oak' LIMIT 1"
  ).first();
  if (!seedRow) {
    return {
      episodeId: null, topic: null, sentences: [],
      listenedCount: 0, completed: false, xpAwardedToday: 0,
      fourStarCount: 0, fiveStarCount: 0, assessedCount: 0,
    };
  }
  // 三年级：english_mode 与 english_progress_<id> 一次取回（原 2 次串行往返 → 1 次）；
  // 热路径入口已用 loadHotSettings 取齐时直接用 S（S 须含这两个键，否则走原单查）
  let englishMode = false;
  let gate = null;
  if (gradeNum === 3) {
    const st = (S && S.has('english_mode') && S.has(`english_progress_${child.id}`))
      ? S : await getSettings(db, ['english_mode', `english_progress_${child.id}`]);
    englishMode = st.get('english_mode') === '1';
    gate = await loadEnglishGate(db, child, st.get(`english_progress_${child.id}`));
  }
  const progressOrd = gate ? gate.ord : null;
  /* 集清单（Fable 优化 #15）：默认走静态快照 src/data/oak-episode-lists.js（由
   * scripts/gen-oak-episodes.mjs 从 0014+0032 种子生成；内容变了重跑生成器）。DISTINCT
   * 原来每孩每趟沿索引走该年级全部 Oak 行（g1 159、g3 240）；静态清单与库里 DISTINCT
   * 逐项一致（tests/oak-episode-lists.test.mjs 漂移守卫）。gradeNum 不在 1/3 时落到 1，
   * 与 gradeNumFromLabel || 1 一致。
   * 回退：静态清单与库不一致时（单测夹具自插 ep-test 等合成内容；或种子变了没重跑生成器），
   * 按老路用库里 DISTINCT 重算一遍，只多 1-2 次查询；种子内容时恒不触发。回退时补句 total
   * 也改回库里 COUNT（与 #15 前同一口径）。 */
  /* 内容分工（2026-11-13，用户定：Oak 只取口语对话集 card/video，课本集归每日英语）：
   * 集类型以 src/data/daily-english.js 的 DAILY_ENGLISH_EPISODES 为准；库里旧课本集仍保留、
   * 只在取数时过滤（不删行，历史尝试记录不受影响）。集类型未知的行（库里有、快照里暂无，
   * 如自插测试集或后加内容）放行，不静默丢弃。 */
  const kindPasses = (ep) => {
    const k = (DAILY_ENGLISH_EPISODES[ep] || {}).k;
    return k === undefined || k === 'card' || k === 'video';
  };
  const staticRows = OAK_EPISODE_ROWS[gradeNum] || OAK_EPISODE_ROWS[1];
  let pool = staticRows.map((r) => r.ep).filter(kindPasses);
  let useLiveTotal = false;
  // Fable 优化 #1：下游只用 question_id 与 xp_awarded（分组过滤＋已听集合＋当日 XP 求和），
  // 其余列不取。quizPoolForChild 的同形查询不在此改（题单流程另有用途）。
  const { results: attempts } = await db.prepare(
    'SELECT question_id, xp_awarded FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
  ).bind(child.id, today).all();
  const livePoolFromDb = async () => {
    const { results: liveEps } = await db.prepare(
      "SELECT DISTINCT oak_episode FROM quiz_questions WHERE kind='oak' AND grade=? ORDER BY oak_episode"
    ).bind(gradeNum).all();
    return (liveEps || []).map((r) => r.oak_episode).filter(kindPasses);
  };
  // Fable 优化 #1：只取下游实际用到的 6 列（normalizeQuizRow 映射后，供句子组装的
  // q.id / q.question / q.explain / q.oakAudio / q.oakTopic，及补句过滤用的 q.oakEpisode；
  // 其余列如下游不用——kind/grade/subject/options_json/answer_idx/chapter/topic_id/active/is_custom）。
  const fetchEpisode = async (epId) => {
    const { results: rows } = await db.prepare(
      "SELECT id, question, explain, oak_episode, oak_topic, oak_audio FROM quiz_questions WHERE kind='oak' AND grade=? AND oak_episode=? ORDER BY id"
    ).bind(gradeNum, epId).all();
    return (rows || []).map(normalizeQuizRow);
  };
  if (!pool.length) {
    pool = await livePoolFromDb();
    if (pool.length) useLiveTotal = true;
  }
  if (!pool.length) {
    return {
      episodeId: null, topic: null, sentences: [],
      listenedCount: 0, completed: false, xpAwardedToday: 0,
    };
  }
  let episodeId = pickOakEpisode(pool, child.id, today);
  let questions = await fetchEpisode(episodeId);
  if (!questions.length) {
    const livePool = await livePoolFromDb();
    if (livePool.length) {
      const liveEpisodeId = pickOakEpisode(livePool, child.id, today);
      const liveQuestions = await fetchEpisode(liveEpisodeId);
      if (liveQuestions.length) {
        pool = livePool;
        episodeId = liveEpisodeId;
        questions = liveQuestions;
        useLiveTotal = true;
      }
    }
  }
  /* 补句（2026-11-13，用户定：每日交流固定 6 句）：新卡集每集只有 5 句（g1 的 15 个新卡集），
   * 集长不足 6 时从同年级其他对话集里按日哈希随机补足到 6 句。补句取自其他集、不与本集句子
   * 文本重复；哈希种子含 child＋日期，同一天内同一孩子恒为同一补句；听完/评分记录按
   * question_id 挂，与补句来自哪集无关。 */
  if (questions.length < OAK_GROUP_SIZE) {
    /* 性能（2026-11-17）：不再全量拉同年级其他集（g1 约 159 行、含 78 行课本集）只为挑 1 句。
     * 集类型过滤下沉到 SQL：候选集 = 上面已算好的对话集池 pool 去掉本集（与原 JS 过滤同一口径），
     * 课本集根本不进查询；先 COUNT 候选行数，按日哈希取起点行 offset，再只取 12 行小窗口
     * （且只取补句用到的 5 列）。按序取窗口内未与本集文本重复的句子；窗口到末尾不够
     * （末尾短窗口或文本重复）才回绕到 OFFSET 0 续取，最多绕满一圈，保证候选里只要有合格句
     * 就能补足。哈希起点在候选行上均匀，同一天同一孩子恒为同一补句；常态 2 次轻量往返
     * （COUNT＋1 窗口）。 */
    const OAK_EXTRA_WINDOW = 12;
    const need = OAK_GROUP_SIZE - questions.length;
    const inGroup = new Set(questions.map((q) => q.question));
    const otherEps = pool.filter((ep) => ep !== episodeId);
    const epPlaceholders = otherEps.map(() => '?').join(',');
    const cands = [];
    if (otherEps.length) {
      let total;
      if (useLiveTotal) {
        // 回退路径：库内容与静态清单不一致，total 回库里 COUNT（与 #15 前同一口径）。
        const totalRow = await db.prepare(
          `SELECT COUNT(*) n FROM quiz_questions WHERE kind='oak' AND grade=? AND oak_episode IN (${epPlaceholders})`
        ).bind(gradeNum, ...otherEps).first();
        total = Number(totalRow && totalRow.n) || 0;
      } else {
        /* Fable 优化 #15：候选总行数改静态求和——otherEps 各集 n 之和，与上面 COUNT(*) 逐项
         * 一致（漂移守卫钉死）；窗口查询本身仍走库。 */
        const nByEp = new Map(staticRows.map((r) => [r.ep, r.n]));
        total = otherEps.reduce((s, ep) => s + (nByEp.get(ep) || 0), 0);
      }
      const seenIds = new Set();
      let scanned = 0;
      let offset = total ? dailyEnglishHash32(child.id + ':' + today + ':oak-extra') % total : 0;
      while (cands.length < need && scanned < total) {
        const { results: extraRows } = await db.prepare(
          `SELECT id, question, explain, oak_episode, oak_audio FROM quiz_questions WHERE kind='oak' AND grade=? AND oak_episode IN (${epPlaceholders}) ORDER BY oak_episode, id LIMIT ? OFFSET ?`
        ).bind(gradeNum, ...otherEps, OAK_EXTRA_WINDOW, offset).all();
        const got = (extraRows || []).length;
        if (!got) break;
        for (const q of (extraRows || []).map(normalizeQuizRow)) {
          if (seenIds.has(q.id)) continue;
          seenIds.add(q.id);
          const k = (DAILY_ENGLISH_EPISODES[q.oakEpisode] || {}).k;
          if ((k === undefined || k === 'card' || k === 'video') && !inGroup.has(q.question)) cands.push(q);
        }
        scanned += got;
        offset += got;
        if (offset >= total) offset = 0; // 末尾短窗口后回绕到开头
      }
    }
    for (const pick of cands) {
      if (questions.length >= OAK_GROUP_SIZE) break;
      if (inGroup.has(pick.question)) continue;
      questions.push(pick);
      inGroup.add(pick.question);
    }
  }
  const ids = new Set(questions.map((q) => q.id));
  const groupAttempts = (attempts || []).filter((a) => ids.has(a.question_id));
  const listenedIds = new Set(groupAttempts.map((a) => a.question_id));
  const sentences = questions.map((q) => ({
    id: q.id, en: q.question, zh: q.explain, audio: oakAudioUrl(q.oakAudio),
    showZh: showEnglishZh(gradeNum, englishMode, progressOrd, oakEnglishOrder(episodeId)),
    listened: listenedIds.has(q.id),
  }));
  const listenedCount = sentences.filter((s) => s.listened).length;
  /* MP-15 §2（4×5★+2×4★，与转盘门同线）：跟读达标数——当日每句最好成绩 ≥4★
   * （OAK_FOUR_STAR_PRON）与 ≥5★（OAK_FIVE_STAR_PRON）的句子数；与 oakDrawStatus
   * 同口径（best_pron 取 MAX，复读高分后计入）。同一查询，不另加查询。 */
  let fourStarCount = 0, fiveStarCount = 0, assessedCount = 0;
  if (sentences.length > 0) {
    try {
      const { results } = await db.prepare(
        'SELECT question_id, best_pron FROM oak_assessments WHERE child_id=? AND date_shanghai=?'
      ).bind(child.id, today).all();
      const best = new Map((results || []).map((r) => [r.question_id, Number(r.best_pron)]));
      for (const s of sentences) {
        if (!best.has(s.id)) continue;
        assessedCount += 1;
        if ((best.get(s.id) ?? -1) >= OAK_FOUR_STAR_PRON) fourStarCount += 1;
        if ((best.get(s.id) ?? -1) >= OAK_FIVE_STAR_PRON) fiveStarCount += 1;
      }
    } catch (e) { /* oak_assessments 未建：当未跟读 */ }
  }
  return {
    episodeId, topic: questions.length ? questions[0].oakTopic : null,
    sentences, listenedCount,
    /* MP-15 §2：完成 = 6 句听完且 6 句跟读均 ≥4★ 且 ≥4 句 ≥5★（与转盘门同条件）；
     * 只听不跟读、或全 4★ 无 5★，都不完成。 */
    completed: sentences.length > 0 && listenedCount >= sentences.length
      && fourStarCount >= sentences.length
      && fiveStarCount >= Math.min(OAK_DRAW_MIN_FIVE_STAR, sentences.length),
    xpAwardedToday: groupAttempts.reduce((sum, a) => sum + (Number(a.xp_awarded) || 0), 0),
    fourStarCount, fiveStarCount, assessedCount,
  };
}

async function oakSummaryForChild(db, child, today, S) {
  const group = await oakGroupForChild(db, child, today, S);
  return { listenedCount: group.listenedCount, completed: group.completed, total: group.sentences.length };
}

/* 点评 pron → 星级（与前端 oakAssess 同口径：≥85 为 5 星、≥70 为 4 星、≥55 为 3 星、≥40 为 2 星、否则 1 星） */
function oakStarsFromPron(pron) {
  if (typeof pron !== 'number' || !Number.isFinite(pron)) return 1;
  return pron >= 85 ? 5 : pron >= 75 ? 4 : pron >= 60 ? 3 : pron >= 40 ? 2 : 1;
}

/* 每日英语 pron → 星级（用户 2026-11-09 定：80 分＝4 星，全 5 句达标才打卡；与 Oak 的 ≥70 为 4 星区分开，4 星起点与打卡线 80 对齐，70–79 显示 3 星） */
function dailyEnglishStarsFromPron(pron) {
  if (typeof pron !== 'number' || !Number.isFinite(pron)) return 1;
  return pron >= 85 ? 5 : pron >= 75 ? 4 : pron >= 60 ? 3 : pron >= 40 ? 2 : 1;
}

/* 当日 5 星进度与抽奖态（读路径；表未建如旧迁移链时当 0／无机会，不抛错）。
 * assessedCount：当日已读完（有成绩）的句数；转盘须全部句子都读完才发（2026-11-09 用户纠正）。
 * drawGranted：当日是否已发普通转盘机会（oak_wheel_chances；2026-11-17 起不再当场掷骰、
 * 不再记 oak_draws 行，够格只发机会、去转盘中心里转）。 */
async function oakDrawStatus(db, child, today, group) {
  const total = group.sentences.length;
  if (!total) return { fiveStarCount: 0, fourStarCount: 0, fiveStarTotal: 0, assessedCount: 0, drawGranted: false };
  let fiveStarCount = 0;
  let fourStarCount = 0;
  let assessedCount = 0;
  // 两张表各自独立：并行发出，各自保留原来的“表未建”静默兜底
  const assessP = Promise.resolve().then(() => db.prepare(
    'SELECT question_id, best_pron FROM oak_assessments WHERE child_id=? AND date_shanghai=?'
  ).bind(child.id, today).all()).then((v) => ({ v }), (e) => ({ e }));
  const chanceP = Promise.resolve().then(() => db.prepare(
    'SELECT id FROM oak_wheel_chances WHERE child_id=? AND date_shanghai=? AND source=?'
  ).bind(child.id, today, 'oak').first()).then((v) => ({ v }), (e) => ({ e }));
  const [assessR, chanceR] = await Promise.all([assessP, chanceP]);
  try {
    if (assessR.e) throw assessR.e;
    const { results } = assessR.v;
    const best = new Map((results || []).map((r) => [r.question_id, Number(r.best_pron)]));
    fiveStarCount = group.sentences.filter((s) => (best.get(s.id) ?? -1) >= OAK_FIVE_STAR_PRON).length;
    fourStarCount = group.sentences.filter((s) => (best.get(s.id) ?? -1) >= OAK_FOUR_STAR_PRON).length;
    assessedCount = group.sentences.filter((s) => best.has(s.id)).length;
  } catch (e) { /* oak_assessments 未建：当 0 */ }
  let drawGranted = false;
  try {
    if (chanceR.e) throw chanceR.e;
    const row = chanceR.v;
    drawGranted = !!row;
  } catch (e) { /* oak_wheel_chances 未建：当无 */ }
  return { fiveStarCount, fourStarCount, fiveStarTotal: total, assessedCount, drawGranted };
}

/* 记一次点评成绩（每句取当日最好 pron）并在全部句子都读完且至少 4 句 5 星时发一次普通转盘机会。
 * 够格（4 句 5 星）只记数不发奖；须全部句子都有成绩（assessedCount === fiveStarTotal）才发放
 *（2026-11-09 用户纠正：第 4 句 5 星就抽是早了，要全部读完才发）。
 * 2026-11-17 用户定：够格不再当场掷骰、不再记 oak_draws 行，改为发 1 次普通转盘机会
 *（oak_wheel_chances，source 'oak'、ref_id=当日日期），孩子去大木博士之家 → 转盘中心里转；
 * 掷骰与发奖改走 /api/oak-wheel/spin，奖品发放口径与旧 oakRollDraw 当场发奖一致。
 * 机会服务端发、每天一次：先 INSERT OR IGNORE 占位抢名额，抢到才发放；抢不到说明当日已发过，
 * 复读已落库的状态，不重复发。
 * 返回 { stars, fiveStarCount, fourStarCount, fiveStarTotal, assessedCount, drawGranted, justGranted }。 */
async function oakRecordAssessAndMaybeDraw(db, child, today, group, questionId, pron) {
  const stars = oakStarsFromPron(pron);
  if (typeof pron === 'number' && Number.isFinite(pron)) {
    try {
      await db.prepare(
        `INSERT INTO oak_assessments(child_id, question_id, date_shanghai, best_pron, attempts, updated_epoch)
         VALUES(?,?,?,?,1,?)
         ON CONFLICT(child_id, question_id, date_shanghai) DO UPDATE SET
           best_pron = MAX(best_pron, excluded.best_pron),
           attempts = attempts + 1,
           updated_epoch = excluded.updated_epoch`
      ).bind(child.id, questionId, today, pron, Math.floor(Date.now() / 1000)).run();
      await touchRow(db, 'oak_assessments', 'child_id=? AND question_id=? AND date_shanghai=?', [child.id, questionId, today], await bumpChildVersion(db, child.id));
    } catch (e) { console.error('oak record assess failed', e); }
  }
  const status = await oakDrawStatus(db, child, today, group);
  // 2026-11-17 用户定：抽奖门 = 6 句全 ≥75（4 星）且 ≥4 句 ≥85（5 星），且全部读完、当日未发机会。
  if (status.fiveStarCount < Math.min(OAK_DRAW_MIN_FIVE_STAR, status.fiveStarTotal) || status.fourStarCount < status.fiveStarTotal || status.fiveStarTotal === 0 || status.drawGranted || status.assessedCount < status.fiveStarTotal) {
    return { stars, ...status, justGranted: false };
  }
  const nowEpoch = Math.floor(Date.now() / 1000);
  const granted = await grantOakWheelChance(db, child.id, 'oak', today, today, nowEpoch);
  if (!granted) {
    // 并发下另一请求已发（或表未建）：复读已落库的状态，不重复发
    const again = await oakDrawStatus(db, child, today, group);
    return { stars, ...again, justGranted: false };
  }
  return { stars, ...status, drawGranted: true, justGranted: true };
}
function chineseOrder(chapter) { return chapterOrderFor(GATE_SUBJECTS.chinese, chapter); }

function oakEnglishOrder(episodeId) {
  const chapters = {
    'ep-pep3-u1': ENGLISH_UNITS[3][0],
    'ep-pep3-u2': ENGLISH_UNITS[3][1],
    'ep-pep3-u3': ENGLISH_UNITS[3][2],
    'ep-pep3-u4': ENGLISH_UNITS[3][3],
    'ep-pep3-u5': ENGLISH_UNITS[3][4],
    'ep-pep3-u6': ENGLISH_UNITS[3][5],
    'ep-pep3a-u3': ENGLISH_UNITS[3][2],
    'ep-pep3b-u1': ENGLISH_UNITS[3][7],
    'ep-pep3b-u2': ENGLISH_UNITS[3][8],
    'ep-pep3b-u3': ENGLISH_UNITS[3][9],
    'ep-pep3b-u4': ENGLISH_UNITS[3][10],
    'ep-pep3b-u5': ENGLISH_UNITS[3][11],
    'ep-pep3b-u6': ENGLISH_UNITS[3][12],
  };
  return Object.prototype.hasOwnProperty.call(chapters, episodeId)
    ? englishOrder(chapters[episodeId]) : null;
}

/* 由年级与进度章节生成进度门；年级无章节表或章节不在表中返回 null（不设门） */
function mathGateFor(gradeNum, chapterText) { return gateFor(GATE_SUBJECTS.math, gradeNum, chapterText); }
function chineseGateFor(gradeNum, chapterText) { return gateFor(GATE_SUBJECTS.chinese, gradeNum, chapterText); }
function englishGateFor(gradeNum, chapterText) { return gateFor(GATE_SUBJECTS.english, gradeNum, chapterText); }

/* 未设进度时的默认：该年级「上册 第2单元」（秋季学期中段保守值） */
function defaultMathChapter(gradeNum) { return defaultChapterFor(GATE_SUBJECTS.math, gradeNum); }
function defaultChineseChapter(gradeNum) { return defaultChapterFor(GATE_SUBJECTS.chinese, gradeNum); }
function defaultEnglishChapter(gradeNum) { return defaultChapterFor(GATE_SUBJECTS.english, gradeNum); }

/* 激活检查（入库标签规矩）：数学学习题（study）无 chapter 标签或标签无法解析时不得激活；
 * 家长自定义题（custom）由家长自选内容，不在此限；非数学题无章节体系，不在此限。
 * 返回 null 表示可激活，否则返回错误文案。 */
function questionActivationError(q) {
  if (!q || q.kind !== 'study' || q.subject !== '数学') return null;
  if (q.chapter == null || q.chapter === '') return '数学题必须带章节标签才能激活';
  if (chapterOrder(q.chapter) === null) return '数学题章节标签无法解析，不能激活';
  return null;
}
for (const e of MATH_PREREQ_G1G3.edges) {
  if (!DIAG_EDGES_BY_TOPIC.has(e.topicId)) DIAG_EDGES_BY_TOPIC.set(e.topicId, []);
  DIAG_EDGES_BY_TOPIC.get(e.topicId).push(e);
}

/* 实战克制关系（图鉴卡片／道馆精灵球共用；经典 TYPE_CHART 只做弱点（×2），供 PvP 答题对战；PvE 官方口径见 OFFICIAL_MULT（含抗性 ×0.5、免疫 ×0））。
 * 入参为官方单属性（18 种集；2026-11-17 方案 A：SPECIES.type 由 9 种集扩到 18 种，此前映射已废止）。
 * 返回 { strong, weak, resist, immune }；列表均按 TYPES18 顺序排列。
 * 注意：卡片上的属性徽章是官方双属性（DEX_DETAILS），克制列表是 App 实战口径，两者口径不同、各自标注。馆主条目用 matchupsForTypes（官方双属性），见 details()。 */
function matchupsForType(t) {
  if (!t || !TYPES18.includes(t)) return { strong: [], weak: [], resist: [], immune: [] };
  return {
    strong: TYPES18.filter((v) => typeMultOfficial(t, v) === 2),
    weak: TYPES18.filter((v) => typeMultOfficial(v, t) === 2),
    resist: TYPES18.filter((v) => typeMultOfficial(v, t) === 0.5),
    immune: TYPES18.filter((v) => typeMultOfficial(v, t) === 0),
  };
}

function matchupsForTypes(defTypes) {
  const defs = Array.isArray(defTypes) ? defTypes.filter(Boolean) : [];
  if (!defs.length) return { strong: [], weak: [], resist: [], immune: [] };
  const strongSet = new Set();
  for (const t of defs) for (const v of TYPES18) if (typeMultOfficial(t, v) === 2) strongSet.add(v);
  return {
    strong: TYPES18.filter((v) => strongSet.has(v)),
    weak: TYPES18.filter((a) => typeMultOfficialMulti(a, defs) >= 2),
    resist: TYPES18.filter((a) => { const m = typeMultOfficialMulti(a, defs); return m > 0 && m < 1; }),
    immune: TYPES18.filter((a) => typeMultOfficialMulti(a, defs) === 0),
  };
}

// 主宠线按现有等级阶段取物种号：蛋期无物种，超出形态表时封顶。
function lineFormNo(line, level) {
  const idx = formIdxForLevel(level);
  if (idx === 0) return null;
  const forms = LINES[line] && LINES[line].forms;
  if (!forms || forms.length === 0) return null;
  return forms[Math.min(idx - 1, forms.length - 1)].no;
}
// 进化后实例特性（R4 通用谓词，纯函数）：
// - inst.ability 非空且不在新形态 DEX_DETAILS[newNo].abilities 名单里 → 按原获得方式 inst.source 重掷；
// - 旧特性仍属新形态（主线 4 线、名单不变的收藏进化）或 inst.ability 为 NULL → 原值不动（零 rng 调用，NULL 不追溯）；
// - 新形态无任何特性数据（rollInstanceAbility 返回 null）时也保留原值，绝不把已有特性写成 NULL。
function abilityAfterEvolution(inst, newNo, rng = Math.random) {
  if (!inst || typeof inst.ability !== 'string' || !inst.ability) return inst ? (inst.ability ?? null) : null;
  const d = DEX_DETAILS[newNo];
  const names = d && Array.isArray(d.abilities) ? d.abilities.map((a) => a && a.name) : [];
  if (names.includes(inst.ability)) return inst.ability;
  return rollInstanceAbility(newNo, inst.source, rng) ?? inst.ability;
}
// 扩到 155：零实效特性（已核查、无战斗实效），按特性名注册。本游戏无反作用伤害招式，
// 坚硬脑袋不产生任何战斗效果；首特性为该特性的种（74/75/76/95/104/105/142/208）均视为已覆盖。
// 扩到 159：压迫感同为零实效——官方效果是对手招式 PP＋1，本站无 PP 系统，不产生任何战斗效果；
// 首特性为该特性的种（144/145/146/150）均视为已覆盖。
// 新增零实效特性时往这里加名字；行为类特性不得进此表。
// 零实效特性登记（Batch 11，D 类 26 种＋既有 2 种＝28 种）：本游戏无落地点，
// 只登记、不做处理函数；图鉴卡片展示不动（仍显示特性名＋效果文案）；
// 将来底层系统建成时再移出登记（K6）。每种附一行原因注释。
const ABILITY_NO_EFFECT = new Set([
  '坚硬脑袋', // 已登记（Batch 0/159 先例；现无反作用招式）
  '压迫感', // 已登记（Batch 159；本站无 PP 系统）
  '逃跑', // 本站无野外战斗
  '捡拾', // 本站无携带道具
  '发光', // 本站无野外遭遇
  '湿气', // 现无自爆类招式；将来加了自爆招式再移出登记
  '锐利目光', // 现无任何降命中手段
  '鳞粉', // 现无招式追加效果
  '我行我素', // 本站无混乱状态；将来加混乱时改为一行守卫
  '蹒跚', // 同上（本站无混乱状态）
  '斗争心', // 本站无性别系统
  '污泥浆', // 唯一吸取招式寄生种子已是死招（不在学招表）
  '黏着', // 本站无道具夺取
  '连续攻击', // 现无连击类招式
  '预知梦', // 纯展示信息（可选：出场日志文案，不在本批做）
  '危险预知', // 纯展示信息（同上）
  '察觉', // 本站无携带道具
  '天恩', // 现无招式追加效果
  '穿透', // 本站无光墙/反射壁/替身系统
  '奇迹皮肤', // 本站无变化招式命中体系
  '友情防守', // 本站无双打
  '治愈之心', // 本站无双打
  '舍身', // 现无反作用招式
  '强行', // 现无招式追加效果（追加效果数据建成后移出登记）
  '轻装', // 本站无携带道具
  '贪吃鬼', // 本站无携带道具/树果
  '收获', // 同上
  '紧张感', // 同上
]);
const STAGE_LABEL = { atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度' };
const STATUS_KINDS = ['poison', 'paralysis', 'burn', 'sleep'];
// 天气（第三期简化版，D7/D8）：晴/雨两态，关卡设定、整场持续。沙暴/冰雹、天气招式、特性触发均不做。
const WEATHER_LABEL = { sun: '大晴天', rain: '下雨', sand: '沙暴', hail: '冰雹' };

function parseCookies(req) {
  const o = {};
  const h = req.headers.get('Cookie') || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try { o[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
      catch { /* 畸形 Cookie 值解码失败就跳过该项，不能让一个坏 Cookie 打挂全部请求 */ }
    }
  }
  return o;
}

/* ---- 本地缓存完整版 · 同步版本（迁移 0020）----
 * 每孩子一个单调递增 sync_version 计数器（sync_versions 表）；每次写操作推进对应孩子的
 * 计数值，并把推进后的值写入受影响行的 ver 字段；增量查询用 ver > since。
 * updated_epoch 只作展示与冲突参考，不作同步游标。
 * 旧迁移链（未加载 0020）没有 sync_versions 表：bump 时捕获“no such table”并返回 0，
 * 调用方见版本为 0 即跳过置 ver——旧链测试不受影响，新链行为完整。 */

/* 22 张业务表的同步归属（供 GET /api/sync 用；child 列为 NULL 表示全局表）。
 * 特殊表：battles 用 child_a/child_b；pokedex 主键 (child_id, entry_key)；
 * oak_assessments 主键 (child_id, question_id, date_shanghai)；
 * oak_draws 主键 (child_id, date_shanghai)；quiz_daily 主键 (child_id, date_shanghai)；
 * checkin_photos 无 child_id 列，归属经 checkin_id → checkins.child_id；
 * unit_test_draws 无 child_id 列，归属经 unit_test_id → unit_tests.child_id。 */
const SYNC_TABLES = [
  { name: 'children', child: 'id' },
  { name: 'checkins', child: 'child_id' },
  { name: 'quiz_attempts', child: 'child_id' },
  { name: 'quiz_questions', child: null },
  { name: 'encounters', child: 'child_id' },
  { name: 'wheel_chances', child: 'child_id' },
  { name: 'quiz_daily', child: 'child_id' },
  { name: 'ball_drops', child: 'child_id' },
  { name: 'ball_grants', child: 'child_id' },
  { name: 'settings', child: null },
  { name: 'battles', child: null },
  { name: 'gym_battles', child: 'child_id' },
  { name: 'pokedex', child: 'child_id' },
  { name: 'sealed_eggs', child: 'child_id' },
  { name: 'child_notices', child: 'child_id' },
  { name: 'checkin_photos', child: null },
  { name: 'quiz_diagnoses', child: 'child_id' },
  { name: 'oak_assessments', child: 'child_id' },
  { name: 'oak_draws', child: 'child_id' },
  { name: 'school_test_records', child: 'child_id' },
  { name: 'unit_tests', child: 'child_id' },
  { name: 'unit_test_draws', child: null },
];

/* ①B：公共变更（quiz_questions / settings）推进每个孩子的版本。返回 {childId: 新版本}。 */
async function bumpAllChildrenVersions(db, familyId) {
  const out = {};
  const st = familyId ? db.prepare('SELECT id FROM children WHERE family_id=?').bind(familyId) : db.prepare('SELECT id FROM children');
  const { results } = await st.all();
  for (const c of (results || [])) out[c.id] = await bumpChildVersion(db, c.id);
  return out;
}

/* 会话读取。一次联表带出账号、家庭、角色（迁移 0034 之后）；老库（没有 0034 / 0033 的夹具库）逐级退回旧查询，
 * 此时 session.familyId 为 null，所有「按家庭过滤」的地方自动不过滤（行为与改造前一致）。 */
async function getSession(db, req) {
  const c = parseCookies(req);
  const token = c.famsess;
  if (!token) return null;
  let s = null;
  let famMode = false;
  try {
    s = await db.prepare(
      'SELECT s.*, a.id AS account_id, a.role AS acct_role, a.roles AS acct_roles, a.family_id AS acct_family_id, f.status AS family_status '
      + 'FROM sessions s LEFT JOIN account_sessions x ON x.token=s.token LEFT JOIN accounts a ON a.id=x.account_id '
      + 'LEFT JOIN families f ON f.id=a.family_id WHERE s.token=?'
    ).bind(token).first();
    famMode = true;
  } catch {
    try {
      s = await db.prepare('SELECT s.*, a.id AS account_id, a.role AS acct_role FROM sessions s LEFT JOIN account_sessions x ON x.token=s.token LEFT JOIN accounts a ON a.id=x.account_id WHERE s.token=?').bind(token).first();
    } catch {
      s = await db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
    }
  }
  if (!s) return null;
  if (Math.floor(Date.now() / 1000) - s.created_at > SESSION_TTL_SECS) return null; // 30 天有效（与 cookie 一致）
  // 迁移 0003 之前的旧会话 kind 为 NULL，一律作废，强制按新入口重新登录
  if (s.kind !== 'child' && s.kind !== 'parent') return null;
  if (famMode && s.account_id && s.family_status === 'disabled') return null; // 家庭被 sysadmin 停用：已登录的会话也立即失效
  s.accountId = s.account_id || null;
  s.familyId = famMode ? (s.acct_family_id || 1) : null; // 无账号的旧 PIN 会话属于 family #1
  s.roles = sessionRoles(s);
  return s;
}

/* 账号的全部角色：roles 列（逗号分隔）优先，没有就只有 role 列那一个；旧 PIN 会话按 kind 推 */
function parseRoles(rolesCol, roleCol) {
  const set = new Set(String(rolesCol || '').split(',').map((x) => x.trim()).filter(Boolean));
  if (roleCol) set.add(roleCol);
  return [...set].filter((r) => r === 'child' || r === 'parent' || r === 'sysadmin');
}
function sessionRoles(s) {
  if (s.account_id) return parseRoles(s.acct_roles, s.acct_role);
  return [s.kind === 'parent' ? 'parent' : 'child'];
}
const hasRole = (session, role) => !!(session && Array.isArray(session.roles) && session.roles.includes(role));
/* 角色权限表 role_permissions：账号有哪些角色看 accounts.roles，角色能做什么看这张表。
 * 每次请求现查（4 行小表，不跨请求缓存），改表立即生效；查不到/表缺失一律当没有权限（失败即关闭）。 */
async function sessionPermissions(db, session) {
  const roles = session && Array.isArray(session.roles) ? session.roles : [];
  if (!roles.length) return [];
  try {
    const { results } = await db.prepare(`SELECT DISTINCT permission FROM role_permissions WHERE role IN (${roles.map(() => '?').join(',')}) ORDER BY permission`).bind(...roles).all();
    return (results || []).map((r) => r.permission);
  } catch { return []; }
}
async function hasPermission(db, session, key) {
  return (await sessionPermissions(db, session)).includes(key);
}

/* ---- 家长凭证（用户系统 v2）：与 famsess 分开的短期凭证，15 分钟无操作失效，退出家长区即删 ----
 * 只对「有账号的会话」生效（旧 PIN 会话沿用 2 小时 PIN 新鲜度）。凭证有效时，本次请求的会话视图被「抬升」为家长会话
 * （kind='parent'、child_id=null），这样所有 /api/parent/* 处理函数沿用原来的 requirePin/withPin 检查；家长看的永远是自己家庭
 * （familyId 来自账号，不接受前端传）。凭证过期（cookie 还在但服务端已无效）→ session.parentExpired，requirePin 回 401 PARENT_EXPIRED。 */
const PARENT_CRED_IDLE_SECS = 900;
const PARENT_CRED_TOUCH_SECS = 30; // last_active 最多每 30 秒写一次，省 D1 写量
async function applyParentCred(db, req, session) {
  if (!session || !session.accountId || !session.familyId) return session; // 老库（无 0034）沿用旧 PIN 会话升级
  const tok = parseCookies(req).parentcred;
  if (!tok) {
    if (session.kind === 'parent') session.pin_verified_at = null; // 账号型家长会话：没有家长凭证就是没验过 PIN
    return session;
  }
  let cred = null;
  try { cred = await db.prepare('SELECT * FROM parent_creds WHERE token=? AND session_token=?').bind(tok, session.token).first(); } catch { cred = null; }
  const now = Math.floor(Date.now() / 1000);
  if (!cred || now - cred.last_active > PARENT_CRED_IDLE_SECS) {
    if (cred) await db.prepare('DELETE FROM parent_creds WHERE token=?').bind(tok).run();
    session.parentExpired = true;
    if (session.kind === 'parent') session.pin_verified_at = null;
    return session;
  }
  if (now - cred.last_active >= PARENT_CRED_TOUCH_SECS) {
    await db.prepare('UPDATE parent_creds SET last_active=? WHERE token=?').bind(now, tok).run();
  }
  /* 家长模式的角色抬升（信任决定）：家庭 PIN 在角色上等同于「该家庭家长账号」的凭证。
   * 孩子会话进家长模式后 roles 仍是 ['child']，而 sysadmin 挂在家长账号上，所以按家庭家长账号抬升本次请求的 roles：
   * 家里恰好 1 个家长账号 → 取它的 roles；0 个或多个（有歧义）→ 只给 ['parent']（失败即关闭，不给 sysadmin）。
   * 不用 parentcred 自己的 account_id（那是创建它的孩子）。家里有多个家长账号时，管理员操作须直接用 sysadmin 账号登录。 */
  let roles = ['parent'];
  try {
    const { results } = await db.prepare('SELECT role, roles FROM accounts WHERE family_id=?').bind(session.familyId).all();
    const parents = (results || []).map((r) => parseRoles(r.roles, r.role)).filter((rs) => rs.includes('parent'));
    if (parents.length === 1) roles = parents[0];
  } catch { roles = ['parent']; }
  return {
    ...session, roles, baseKind: session.kind, baseChildId: session.child_id, kind: 'parent', child_id: null,
    pin_verified_at: now, parentCred: cred, adminFresh: !!(cred.admin_at && now - cred.admin_at <= PARENT_CRED_IDLE_SECS),
  };
}
function parentCredCookie(token, clear) {
  return `parentcred=${clear ? '' : token}; Path=/; HttpOnly; Secure; SameSite=Lax${clear ? '; Max-Age=0' : ''}`;
}

function requireFamily(session) {
  if (!session) return json({ ok: false, error: 'NEED_LOGIN' }, 401);
  return null;
}

/* PIN 新鲜度纯函数：parent 会话且 pin_verified_at 在 PIN_SESSION_SECS 内（requirePin 与 overview 下发共用同一口径） */
function pinFresh(session, nowSecs) {
  return !!(
    session &&
    session.kind === 'parent' &&
    session.pin_verified_at &&
    nowSecs - session.pin_verified_at <= PIN_SESSION_SECS
  );
}

/* 家长权限：必须是 parent 会话且 PIN 验证未过期（孩子会话输 PIN 后会升级为 parent） */
function requirePin(session) {
  if (!session) return json({ ok: false, error: 'NEED_LOGIN' }, 401);
  if (session.parentExpired) return json({ ok: false, error: 'PARENT_EXPIRED', message: '家长模式已过期，请重新输入家长 PIN' }, 401);
  if (!pinFresh(session, Math.floor(Date.now() / 1000))) {
    return json({ ok: false, error: 'NEED_PIN' }, 403);
  }
  return null;
}

/* 家长 PIN 守卫（B1）：requirePin 不过则原样返回其响应，否则执行 fn。 */
async function withPin(session, fn) {
  const g = requirePin(session);
  if (g) return g;
  return fn();
}

function sessionCookie(token) {
  return `famsess=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

async function createSession(db, kind, childId) {
  const token = randToken();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO sessions(token, created_at, pin_verified_at, kind, child_id) VALUES(?,?,?,?,?)')
    .bind(token, now, kind === 'parent' ? now : null, kind, childId || null).run();
  return token;
}

/* ---------------- 登录页（内联，免静态资源） ----------------
 * 只有用户名、密码、登录按钮；不列任何孩子的名字/头像/宠物/进度，也不读库。
 * 另有两个折叠面板：邀请码注册（没有有效邀请码注册不了）、初始密码登录后的强制改密码。
 * 登录失败统一显示「用户名或密码不对」（服务端 message 原样展示，不区分用户名不存在/密码错）。 */

function rolePage(db, hostname) {
  const avatarsJson = JSON.stringify(AVATAR_CHOICES.map((a) => ({ key: a.key, name: a.name, url: petImg(a.no) }))).replace(/</g, '\\u003c');
  return new Response(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="作业打卡怪兽激励小天地（家庭自用）">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<title>打卡大冒险 · 登录</title>
<link rel="apple-touch-icon" sizes="180x180" href="/static/icon-180.63ed668b.png">
<link rel="icon" type="image/png" sizes="192x192" href="/static/icon-192.63ed668b.png"><meta name="apple-mobile-web-app-title" content="打卡大冒险"><meta name="theme-color" content="#FF9F43">
<link rel="manifest" href="/static/manifest.json">
<script>if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}</script>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:#D6ECFF;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#0E2747;overflow:hidden}
@keyframes ws-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes ws-float{0%,100%{translate:0 0}50%{translate:0 -7px}}
@keyframes ws-bounce{0%,100%{transform:translateY(0) scale(1.06,.94)}12%{transform:translateY(0) scale(.94,1.08)}45%{transform:translateY(-34px) scale(1,1)}78%{transform:translateY(0) scale(1.06,.94)}}
@keyframes ws-shadow{0%,100%{transform:scale(1);opacity:.28}45%{transform:scale(.6);opacity:.12}}
@keyframes ws-hint{0%,100%{opacity:.55}50%{opacity:1}}
#ws{--L:min(210px,27dvh);--cy:calc(50% - 150px);--V:1;--k:1;position:relative;width:100%;max-width:430px;height:100dvh;margin:0 auto;overflow:hidden}
.ws-collage{position:absolute;inset:0;transform-origin:50% 40%;transition:transform .8s cubic-bezier(.2,.8,.2,1),opacity .7s ease;pointer-events:none}
.ws-st{position:absolute;transition:left .95s cubic-bezier(.2,.8,.2,1) calc(var(--d)*1ms),top .95s cubic-bezier(.2,.8,.2,1) calc(var(--d)*1ms),scale .95s cubic-bezier(.2,.8,.2,1) calc(var(--d)*1ms),transform .95s cubic-bezier(.2,.8,.2,1) calc(var(--d)*1ms)}.ws-st img{display:block;height:auto;filter:drop-shadow(0 8px 12px rgba(14,39,71,.16))}
#ws-ball{position:absolute;left:50%;top:50%;width:132px;height:132px;margin:-76px 0 0 -66px;padding:0;border:0;background:none;cursor:pointer;z-index:4;-webkit-tap-highlight-color:transparent;transition:opacity .5s ease .1s}
#ws-ball .bw{position:absolute;inset:0;animation:ws-bounce 1.15s cubic-bezier(.3,.1,.3,1) infinite;transform-origin:50% 100%}
#ws-ball .bs{position:absolute;left:18px;right:18px;bottom:-16px;height:14px;border-radius:50%;background:#0E2747;opacity:.28;animation:ws-shadow 1.15s cubic-bezier(.3,.1,.3,1) infinite}
.ws-half{position:absolute;left:0;width:100%;height:50%;transition:transform .45s ease,opacity .45s ease}
.ws-top{top:0;background:var(--ball-img) center top/100% 200% no-repeat}
.ws-bot{bottom:0;background:var(--ball-img) center bottom/100% 200% no-repeat}
html.opening #ws-ball .bw,html.opening #ws-ball .bs{animation:none}
html.opening #ws-ball .bs{opacity:0;transition:opacity .2s}
html.opening .ws-top{transform:translateY(-58px) rotate(-26deg);opacity:0}
html.opening .ws-bot{transform:translateY(58px) rotate(26deg);opacity:0}
.ws-tap{position:absolute;left:0;right:0;top:calc(50% + 86px);text-align:center;font-size:15px;color:#2F4A6B;animation:ws-hint 1.8s ease-in-out infinite;pointer-events:none;transition:opacity .3s ease}
.ws-logo{position:absolute;left:0;right:0;top:calc(var(--cy) - var(--L)/2);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(-14px) scale(.9);transition:opacity .5s ease .35s,transform .7s cubic-bezier(.2,.8,.2,1) .35s}
.ws-logo img{display:block;width:var(--L);height:auto;-webkit-mask-image:linear-gradient(to right,transparent,#000 7%,#000 93%,transparent),linear-gradient(to bottom,transparent,#000 7%,#000 93%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(to right,transparent,#000 7%,#000 93%,transparent),linear-gradient(to bottom,transparent,#000 7%,#000 93%,transparent);mask-composite:intersect}
.card{position:absolute;left:0;right:0;bottom:0;max-height:calc(100dvh - min(210px,27dvh) - 48px);overflow-y:auto;background:#fff;border-radius:32px 32px 0 0;padding:28px 24px 36px;text-align:center;box-shadow:0 -8px 30px rgba(14,39,71,.10);transform:translateY(110%);visibility:hidden;transition:transform .7s cubic-bezier(.2,.8,.2,1) .3s,visibility 0s linear 1s;z-index:3}
.card>form{opacity:0;transform:translateY(28px);transition:opacity .45s ease .55s,transform .6s cubic-bezier(.2,.8,.2,1) .55s}
html.opening .ws-tap,html.in .ws-tap,html.in #ws-ball{opacity:0;pointer-events:none}
html.in .ws-collage{opacity:.3}
html.in .ws-st{left:calc(50% + var(--ix)*var(--L)*var(--V))!important;top:calc(var(--cy) + var(--iy)*var(--L)*var(--V))!important;transform:translate(-50%,-50%) rotate(var(--r))!important;scale:calc(var(--is)*var(--k))}
html.in .ws-logo{opacity:1;transform:none}
html.in .card{transform:none;visibility:visible;transition:transform .7s cubic-bezier(.2,.8,.2,1) .3s,visibility 0s}
html.in .card>form{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.ws-st>div,#ws-ball .bw,#ws-ball .bs,.ws-tap{animation:none!important}.ws-collage,.ws-st,.ws-logo,.card,.card>form,.ws-half,#ws-ball{transition:none!important}}
p{color:#2F4A6B;font-size:15px;margin:0 0 12px}
label{display:block;text-align:left;font-size:14px;color:#4A6283;margin:10px 0 4px}
label.chk{display:flex;gap:8px;align-items:center}label.chk input{width:auto;margin:0}
input,select{width:100%;font-size:18px;padding:12px 14px;border-radius:14px;border:2px solid #CFE3F8;background:#F4F9FF;color:#0E2747;font-family:inherit;outline:none}
input:focus,select:focus{border-color:#1F6FEB}
.go{width:100%;margin-top:16px;font-size:19px;font-weight:700;height:56px;border:0;border-radius:28px;background:#1F6FEB;color:#fff;cursor:pointer;font-family:inherit}
.go:disabled{opacity:.6}
.err{color:#B3261E;min-height:22px;font-size:15px;margin:10px 0 0}
.linkbtn{background:none;border:0;color:#1F6FEB;font-size:15px;margin-top:8px;padding:10px 16px;cursor:pointer;font-family:inherit;text-decoration:underline}
.av{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0}
.av button{border:2px solid #CFE3F8;background:#F4F9FF;border-radius:12px;padding:4px;cursor:pointer}
.av button.on{border-color:#1F6FEB;background:#E6F2FF}
.av img{width:100%;aspect-ratio:1;object-fit:contain;display:block}
.hide{display:none}
</style><noscript><style>.card{transform:none!important;visibility:visible!important}.card>form{opacity:1!important;transform:none!important}#ws-ball,.ws-tap{display:none}</style></noscript></head><body>
<div id="ws"><div class="ws-collage" id="ws-collage" aria-hidden="true"><div class="ws-st" style="left:16px;top:64px;transform:rotate(-8deg);--r:-14deg;--ix:-0.78;--iy:-1.18;--is:1.3;--d:0"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 60ms backwards,ws-float 3.4s ease-in-out 0.4s infinite"><img src="${petImg(25)}" alt="" width="118" draggable="false"></div></div><div class="ws-st" style="left:258px;top:52px;transform:rotate(10deg);--r:10deg;--ix:0.55;--iy:-0.95;--is:0.8;--d:45"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 130ms backwards,ws-float 3.7s ease-in-out 0.75s infinite"><img src="${petImg(4)}" alt="" width="104" draggable="false"></div></div><div class="ws-st" style="left:150px;top:150px;transform:rotate(5deg);--r:5deg;--ix:-0.1;--iy:-1.0;--is:0.9;--d:90"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 200ms backwards,ws-float 4.0s ease-in-out 1.1s infinite"><img src="/static/img/eggs/grass.webp" alt="" width="72" draggable="false"></div></div><div class="ws-st" style="left:8px;top:262px;transform:rotate(-10deg);--r:-10deg;--ix:-0.85;--iy:-0.2;--is:1.1;--d:135"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 270ms backwards,ws-float 4.3s ease-in-out 1.45s infinite"><img src="${petImg(7)}" alt="" width="110" draggable="false"></div></div><div class="ws-st" style="left:282px;top:226px;transform:rotate(-12deg);--r:-12deg;--ix:0.78;--iy:-0.35;--is:1.2;--d:180"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 340ms backwards,ws-float 4.6s ease-in-out 0.4s infinite"><img src="/static/img/eggs/fire.webp" alt="" width="70" draggable="false"></div></div><div class="ws-st" style="left:18px;top:396px;transform:rotate(8deg);--r:8deg;--ix:0.68;--iy:0.38;--is:0.7;--d:225"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 410ms backwards,ws-float 3.4s ease-in-out 0.75s infinite"><img src="/static/img/eggs/electric.webp" alt="" width="66" draggable="false"></div></div><div class="ws-st" style="left:306px;top:372px;transform:rotate(-9deg);--r:-9deg;--ix:-0.62;--iy:0.48;--is:0.9;--d:270"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 480ms backwards,ws-float 3.7s ease-in-out 1.1s infinite"><img src="/static/img/eggs/fairy.webp" alt="" width="64" draggable="false"></div></div><div class="ws-st" style="left:22px;top:520px;transform:rotate(-6deg);--r:-6deg;--ix:-1.0;--iy:1.05;--is:1.4;--d:315"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 550ms backwards,ws-float 4.0s ease-in-out 1.45s infinite"><img src="${petImg(1)}" alt="" width="106" draggable="false"></div></div><div class="ws-st" style="left:160px;top:548px;transform:rotate(12deg);--r:12deg;--ix:0.05;--iy:0.95;--is:1.0;--d:360"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 620ms backwards,ws-float 4.3s ease-in-out 0.4s infinite"><img src="/static/img/eggs/normal.webp" alt="" width="70" draggable="false"></div></div><div class="ws-st" style="left:276px;top:470px;transform:rotate(-6deg);--r:-6deg;--ix:0.62;--iy:0.95;--is:1.2;--d:405"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 690ms backwards,ws-float 4.6s ease-in-out 0.75s infinite"><img src="${petImg(133)}" alt="" width="104" draggable="false"></div></div><div class="ws-st" style="left:112px;top:690px;transform:rotate(-14deg);--r:-14deg;--ix:0.25;--iy:-0.62;--is:0.6;--d:450"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 760ms backwards,ws-float 3.4s ease-in-out 1.1s infinite"><img src="/static/img/eggs/water.webp" alt="" width="66" draggable="false"></div></div><div class="ws-st" style="left:266px;top:664px;transform:rotate(14deg);--r:14deg;--ix:-0.4;--iy:-0.62;--is:0.75;--d:495"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 830ms backwards,ws-float 3.7s ease-in-out 1.45s infinite"><img src="/static/img/eggs/ice.webp" alt="" width="66" draggable="false"></div></div><div class="ws-st" style="left:14px;top:706px;transform:rotate(6deg);--r:6deg;--ix:1.02;--iy:0.08;--is:1.1;--d:540"><div style="animation:ws-pop 520ms cubic-bezier(.2,.9,.3,1.2) 900ms backwards,ws-float 4.0s ease-in-out 0.4s infinite"><img src="/static/img/eggs/dragon.webp" alt="" width="62" draggable="false"></div></div></div>
<button id="ws-ball" type="button" aria-label="点一下精灵球，进入登录" style="--ball-img:url(/static/img/feat/gacha-ball-red.webp)"><span class="bs"></span><span class="bw"><span class="ws-half ws-top"></span><span class="ws-half ws-bot"></span></span></button>
<div class="ws-tap" aria-hidden="true">点一下精灵球</div>
<div class="ws-logo"><img src="/static/img/logo-checkin-adventure.webp" alt="作业打卡大冒险" width="210" height="210"></div>
<div class="card">
<form id="f-login" autocomplete="on">
<label for="u">用户名 Username</label><input id="u" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="16">
<label for="p">PIN（6 位数字）</label><input id="p" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" maxlength="6">
<div class="err" id="e-login" role="alert"></div>
<button class="go" id="b-login" type="submit">登录</button>
<button class="linkbtn" id="to-reg" type="button">有邀请码？去注册</button>
</form>
<form id="f-reg" class="hide" autocomplete="off">
<p>请输入家长给你的邀请码</p>
<label for="rc">邀请码</label><input id="rc" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="12">
<label for="ru">用户名（3～16 位，字母、数字、下划线）</label><input id="ru" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="16">
<label for="rp">PIN（6 位数字）</label><input id="rp" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" maxlength="6">
<label for="rn">显示名</label><input id="rn" maxlength="12">
<label class="chk"><input id="rprov" type="checkbox"> 这是开通邀请码（新建一个家庭，我是家长）</label>
<div id="r-prov" class="hide"><label for="rfam">家庭名（1～20 个字）</label><input id="rfam" maxlength="20">
<label for="rpin2">家长二次 PIN（4 位数字，进家长区用）</label><input id="rpin2" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" maxlength="4"></div>
<label for="rg">年级</label><select id="rg"><option>一年级</option><option>二年级</option><option>三年级</option><option>四年级</option><option>五年级</option><option>六年级</option></select>
<label>选一个头像</label><div class="av" id="r-av"></div>
<div class="err" id="e-reg" role="alert"></div>
<button class="go" id="b-reg" type="submit">注册并进入</button>
<button class="linkbtn" id="to-login" type="button">← 返回登录</button>
</form>
<form id="f-pw" class="hide" autocomplete="off">
<p>第一次登录，先给自己设一个新的 PIN 吧</p>
<label for="np">新 PIN（6 位数字）</label><input id="np" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" maxlength="6">
<label for="np2">再输一遍新 PIN</label><input id="np2" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" maxlength="6">
<div class="err" id="e-pw" role="alert"></div>
<button class="go" id="b-pw" type="submit">保存并进入</button>
</form>
</div></div>
<script>
const AVATARS=${avatarsJson};
const $=(id)=>document.getElementById(id);
const NET_ERR='网络不太稳，再试一次吧';
let regAvatar='pikachu',lastPin='';
async function post(url,body){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({ok:false}));
  return j;
}
function show(which){for(const id of ['f-login','f-reg','f-pw'])$(id).classList.toggle('hide',id!==which);}
AVATARS.forEach((a)=>{const b=document.createElement('button');b.type='button';b.title=a.name;b.dataset.key=a.key;
  b.innerHTML='<img alt="" src="'+a.url+'">';b.onclick=()=>{regAvatar=a.key;[...$('r-av').children].forEach((x)=>x.classList.toggle('on',x.dataset.key===a.key));};
  $('r-av').appendChild(b);});
$('r-av').firstChild.classList.add('on');
$('to-reg').onclick=()=>show('f-reg');$('to-login').onclick=()=>show('f-login');
try{const lu=localStorage.getItem('studymon_last_username');if(lu)$('u').value=lu;}catch(x){}
$('f-login').onsubmit=async(ev)=>{
  ev.preventDefault();const e=$('e-login');e.textContent='';
  const username=$('u').value.trim(),pin=$('p').value;
  if(!/^[0-9]{6}$/.test(pin)){e.textContent='PIN 是 6 位数字';return;}
  $('b-login').disabled=true;
  try{
    const j=await post('/api/auth/login',{username,pin});
    if(j.ok){
      try{localStorage.setItem('studymon_last_username',username);}catch(x){}
      if(j.mustChangePw){lastPin=pin;show('f-pw');return;}
      location.href='/';return;
    }
    e.textContent=j.message||NET_ERR;
  }catch(x){e.textContent=NET_ERR;}
  finally{$('b-login').disabled=false;}
};
$('f-pw').onsubmit=async(ev)=>{
  ev.preventDefault();const e=$('e-pw');e.textContent='';
  const a=$('np').value,b=$('np2').value;
  if(!/^[0-9]{6}$/.test(a)){e.textContent='新 PIN 是 6 位数字';return;}
  if(a!==b){e.textContent='两次输的不一样';return;}
  $('b-pw').disabled=true;
  try{
    const j=await post('/api/auth/change-password',{oldPin:lastPin,newPin:a});
    if(j.ok){location.href='/';return;}
    e.textContent=j.message||NET_ERR;
  }catch(x){e.textContent=NET_ERR;}
  finally{$('b-pw').disabled=false;}
};
$('rprov').onchange=()=>{$('r-prov').classList.toggle('hide',!$('rprov').checked);$('rg').style.display=$('rprov').checked?'none':'';document.querySelector('label[for=rg]').style.display=$('rprov').checked?'none':'';};
$('f-reg').onsubmit=async(ev)=>{
  ev.preventDefault();const e=$('e-reg');e.textContent='';
  if(!/^[0-9]{6}$/.test($('rp').value)){e.textContent='PIN 是 6 位数字';return;}
  $('b-reg').disabled=true;
  try{
    const j=await post('/api/auth/register',{code:$('rc').value.trim(),username:$('ru').value.trim(),pin:$('rp').value,displayName:$('rn').value.trim(),grade:$('rg').value,avatarKey:regAvatar,...($('rprov').checked?{familyName:$('rfam').value.trim(),secondaryPin:$('rpin2').value}:{})});
    if(j.ok){location.href='/';return;}
    e.textContent=j.message||NET_ERR;
  }catch(x){e.textContent=NET_ERR;}
  finally{$('b-reg').disabled=false;}
};
</script>
<script>
/* 开场（2026-11-19 §19）：页面静止，中央精灵球跳动；点一下球 → 球两半分开 → 登录页（参考图 logo＋底表）上滑出现。
 * 每次进 /login 都出现；prefers-reduced-motion 下球不跳，点按仍可进入。 */
(function(){
  var root=document.documentElement,ball=document.getElementById('ws-ball'),busy=0;
  var ws=document.getElementById('ws'),card=document.querySelector('.card');
  /* logo 在底表上方区域垂直居中；精灵围绕半径随可用高度压缩（--V），避免出屏 */
  function lay(){
    var H=ws.clientHeight,top=env0(),ch=card.offsetHeight,region=H-ch;
    var L=Math.min(210,.27*window.innerHeight,.5*region),cy=top+(region-top)/2;
    cy=Math.max(cy,top+L/2+8);
    var room=cy-top-8,V=Math.max(.45,Math.min(1,room/(1.05*L)));
    ws.style.setProperty('--L',L+'px');ws.style.setProperty('--k',L/210);ws.style.setProperty('--cy',cy+'px');ws.style.setProperty('--V',V);
  }
  function env0(){return 8}
  lay();addEventListener('resize',lay);
  try{new ResizeObserver(lay).observe(card)}catch(e){}
  var rm=false;try{rm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  ball.addEventListener('click',function(){
    if(busy)return;busy=1;
    if(rm){root.classList.add('in');return;}
    root.classList.add('opening');
    setTimeout(function(){root.classList.add('in')},520);
  });
})();
</script></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...(isProdHost(hostname) ? {} : { 'X-Robots-Tag': 'noindex' }) },
  });
}

function childSummary(child) {
  const line = LINES[child.line];
  const level = levelFromXp(child.total_xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    id: child.id, name: child.name, grade: child.grade_label, line: child.line, lineLabel: line.label,
    avatar: AVATAR_LINES.has(child.line)
      ? `/static/img/avatar-${child.line}.63ed668b.webp`      : (formInfo(child).img || petImg(LINES[child.line].forms[0].no)),    totalXp: child.total_xp, level, balls: child.balls ?? 3, ballsSuper: child.balls_super ?? 0,
    ballsHyper: child.balls_hyper ?? 0, ballsMaster: child.balls_master ?? 0,
    xpIntoLevel: child.total_xp - base, xpForLevelSpan: next - base, xpToNext: next - child.total_xp,
    streak: child.streak, form: formInfo(child),
    moves: allMovesFor(child, level, (child._evo && child._evo.branchType) || LINE_TYPE[child.line]),
    move_levels: child.move_levels || '{}', // 本地战斗按招式名算备战宠技能等级（旧快照无此字段时按 1 级）
    quiz: {
      fragments: child.quiz_fragments || 0,
      correctTotal: child.quiz_correct_total || 0,
      nextFragmentIn: 5 - ((child.quiz_correct_total || 0) % 5),
    },
    titles: safeJsonArr(child.titles),
    stickers: safeJsonArr(child.stickers),
    badgeCount: safeJsonArr(child.titles).length,
    pokedexCount: 0, // 由装配层按图鉴表实际计数填充
  };
}

/* 封印蛋到期自动孵化（任意状态读取触发）；按 egg.species 入图鉴
 * （迁移 0005 泛化：旧蛋 species 默认 151、行为与旧版一致；新蛋 143/131/133/147 用 egg:{no}）。
 * v11：奖励蛋（reward_eggs）同批孵化；两种蛋都走 recordHatch 记账。 */
async function hatchDueEggs(db, childId, today) {
  const { results } = await db.prepare(
    'SELECT * FROM sealed_eggs WHERE child_id=? AND hatched=0 AND unlock_date<=?'
  ).bind(childId, today).all();
  const hatched = [];
  let lastNotice = null;
  for (const egg of results) {
    await db.prepare('UPDATE sealed_eggs SET hatched=1, hatched_at=? WHERE id=?').bind(today, egg.id).run();
    await syncTouch(db, childId, 'sealed_eggs', 'id=?', [egg.id]);
    const no = Number(egg.species) || 151;
    const sp = SPECIES[no] || RARE;
    const dexRes = await recordHatch(db, childId, no, today);
    if (dexRes && dexRes.notice) lastNotice = dexRes.notice;
    hatched.push({ eggId: egg.id, pokemon: { no, name: sp.name } });
  }
  // 奖励蛋（v11 0019）：Fable 优化 #4——reward_eggs 由迁移 0019 创建（2026-10-26 进化道具
  // 系统），测试站与正式站早已应用，热路径不再为它做 sqlite_master 存在探针，直接查。
  // 旧链无表时此处会 500（与 pet_instances 守卫一并移除，见下）；其余守卫（道馆连败、
  // 同步表、删孩子、重置）仍保留。
  {
    const { results: rew } = await db.prepare(
      "SELECT * FROM reward_eggs WHERE child_id=? AND status='pending' AND unlock_date<=?"
    ).bind(childId, today).all();
    for (const egg of rew) {
      await db.prepare("UPDATE reward_eggs SET status='hatched', hatched_at=? WHERE id=?").bind(today, egg.id).run();
      const no = Number(egg.species_no);
      const dexRes2 = await recordHatch(db, childId, no, today);
      if (dexRes2 && dexRes2.notice) lastNotice = dexRes2.notice;
      hatched.push({ eggId: egg.id, pokemon: { no, name: (SPECIES[no] || {}).name || `图鉴 #${no}` }, reward: true });
    }
  }
  return { hatched, notice: lastNotice };
}

/* 孵化记账：图鉴行＋永久获得标记＋宠物实例（主线按线、伊布按 eevee、其余按 species:{no}） */
async function recordHatch(db, childId, no, today) {
  const now = Math.floor(Date.now() / 1000);
  const dexRes = await insertPokedexWithCarryRule(db, childId, no, today);
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(childId, no, 'hatch', now).run();
  const MAIN_FIRST_FORM = { 1: 'bulbasaur', 4: 'charmander', 7: 'squirtle', 25: 'pikachu' };
  const lineKey = MAIN_FIRST_FORM[no] || (no === 133 ? 'eevee' : `species:${no}`);
  await ensurePetInstance(db, childId, lineKey, today, 'egg');
  return dexRes;
}
function resetEvoTableCache() { EVO_TABLE_OK.clear(); }
export { resetEvoTableCache };

/* 调试改等级后同步图鉴形态：先删当前线已写入的形态行，再按新等级重写。
 * 只动当前线的 form: 行，其他线/野外/蛋/稀有行不动；降级时高于新形态的行随之消失，
 * 与“等级即形态”的展示口径一致（unlockForms 本身只增不减，故调试改级不能只调它）。 */
async function syncChildForms(db, child, today) {
  const { results: doomed } = await db.prepare("SELECT entry_key FROM pokedex WHERE child_id=? AND entry_key LIKE ?")
    .bind(child.id, `form:${child.line}:%`).all();
  if (doomed.length) {
    const v = await bumpChildVersion(db, child.id);
    for (const d of doomed) await recordTombstone(db, child.id, 'pokedex', d.entry_key, v);
  }
  await db.prepare("DELETE FROM pokedex WHERE child_id=? AND entry_key LIKE ?")
    .bind(child.id, `form:${child.line}:%`).run();
  // 调试降级：伊布掉到 16 级以下时分支进化失效，实例上的分支一并清掉（图鉴分支行已随 LIKE 删掉；旧链无表跳过）
  if (child.line === 'eevee' && levelFromXp(child.total_xp) < 16 && (await hasEvoTable(db, 'pet_instances'))) {
    await db.prepare("UPDATE pet_instances SET branch=NULL, species_no=133, evolved_via=NULL, updated_epoch=? WHERE child_id=? AND line_key='eevee'")
      .bind(Math.floor(Date.now() / 1000), child.id).run();
  }
  await unlockForms(db, child, today);
}
async function getInventory(db, childId) {
  const { results } = await db.prepare('SELECT item_key, qty FROM item_inventory WHERE child_id=? AND qty>0 ORDER BY item_key').bind(childId).all();
  return results.map((r) => ({ key: r.item_key, qty: r.qty, ...(ITEM_CATALOG[r.item_key] || { name: r.item_key, emoji: '🎁', kind: 'unknown', rarity: 'common', attr: null, desc: '' }) }));
}

/* EVO_LINES 的真实形状是 { stages, conds } / { branches }，不是 { base, next }。
 * evoStepsFor 把它归一成 [{ from, to, cond }]；cond 种类：level / stone / trade / trade-item。 */
function evoStepsFor(baseNo, evo) {
  if (!evo) return [];
  if (Array.isArray(evo.branches)) return evo.branches.map((b) => ({ from: baseNo, to: b.to, cond: b.cond || {} }));
  const stages = evo.stages || [];
  const conds = evo.conds || [];
  const steps = [];
  for (let i = 0; i < stages.length - 1; i++) steps.push({ from: stages[i], to: stages[i + 1], cond: conds[i] || { kind: 'level', level: 0 } });
  return steps;
}
/* 找某物种号所在线的下一步：先按 line_key 的 baseNo，找不到再按物种号在各线里搜（中段形态直获）。 */
/* 重复进化奖励（2026-11-06）：step_key 形如 species:50->51，按步骤记；
 * evo_wheel_grants 行存在 = 该步骤已领过奖（UNIQUE 兜底防并发重复领）。 */
function evoRewardStepKey(fromNo, toNo) { return `species:${fromNo}->${toNo}`; }
async function evoRewardClaimedSteps(db, childId) {
  const { results } = await db.prepare('SELECT step_key FROM evo_wheel_grants WHERE child_id=?').bind(childId).all();
  return new Set((results || []).map((r) => r.step_key));
}
/* 找某物种号所在线的全部下一步（分支线返回多条，如飞天螳螂 123→212/900）。 */
function evoStepsForSpecies(inst) {
  const baseNo = Number(inst.line_key.slice(8));
  let evo = EVO_LINES[baseNo];
  let steps = evoStepsFor(baseNo, evo);
  if (!steps.some((s) => s.from === inst.species_no)) {
    for (const [k, e] of Object.entries(EVO_LINES)) {
      const cand = evoStepsFor(Number(k), e);
      if (cand.some((s) => s.from === inst.species_no)) { evo = e; steps = cand; break; }
    }
  }
  return { evo, steps: steps.filter((s) => s.from === inst.species_no) };
}
/* 校验一条进化条件：返回缺失文案、门槛等级、需耗道具 key、是否交换类、是否就绪。 */
function evoCondCheck(cond, level, has) {
  const missing = [];
  let needLevel = 0;
  let itemKey = null;
  let trade = false;
  if (cond.kind === 'level') {
    needLevel = cond.level || 0;
    if (level < needLevel) missing.push(`等级 ${needLevel}`);
  } else if (cond.kind === 'stone') {
    itemKey = cond.stone;
    if (!has(itemKey)) missing.push(ITEM_CATALOG[itemKey].name);
  } else if (cond.kind === 'trade') {
    needLevel = cond.minLevel || 10;
    trade = true;
    if (level < needLevel) missing.push(`等级 ${needLevel}`);
  } else if (cond.kind === 'trade-item') {
    itemKey = cond.item;
    trade = true;
    if (!has(itemKey)) missing.push(ITEM_CATALOG[itemKey].name);
  }
  return { missing, needLevel, itemKey, trade, ready: missing.length === 0 };
}

/* 进化选项：child/inst/invQty/level；evoCtx 可选 { owned:Set(已拥有物种号), claimedSteps:Set(已领奖 step_key) }。
 * 未传 evoCtx 时按未拥有、未领奖处理（纯函数单测与旧调用保持原行为）。
 * 收藏线分三支：已拥有且已领奖 → 不返回选项（按钮永久消失）；已拥有未领奖 →
 * 返回 collection-evo-reward（条件未满足时同样带 missing，满足后才可领）；未拥有 → 正常进化。 */
function evoOptionsFor(child, inst, invQty, level, evoCtx = {}) {
  const opts = [];
  if (!inst) return opts;
  const has = (k) => (invQty[k] || 0) > 0;
  const missingFor = (needLevel, stoneKey) => {
    if (GATES_OPEN) return [];
    const m = [];
    if (level < needLevel) m.push(`等级 ${needLevel}`);
    if (stoneKey && !has(stoneKey)) m.push(ITEM_CATALOG[stoneKey].name);
    return m;
  };
  if (inst.line_key === 'eevee') {
    if (inst.branch) return opts; // 已进化分支的实例不再列分支（多只伊布各自独立实例）
    for (const [key, b] of Object.entries(EEVEE_BRANCHES)) {
      if (key === 'sylveon') {
        const taught = fairyMovesOf(child).length > 0;
        opts.push({ kind: 'eevee-branch', branch: 'sylveon', name: b.name, no: b.no, type: b.type, stone: 'stone:fairy-skill', needsLevel: 16, hasStone: taught, ready: GATES_OPEN || (level >= 16 && taught), missing: GATES_OPEN ? [] : level < 16 ? ['等级 16'] : (taught ? [] : ['妖精技能石教学']), note: '学会妖精招式后可直接进化，不再消耗石头' });
      } else {
        opts.push({ kind: 'eevee-branch', branch: key, name: b.name, no: b.no, type: b.type, stone: b.stone, needsLevel: 16, hasStone: has(b.stone), ready: GATES_OPEN || (level >= 16 && has(b.stone)), missing: missingFor(16, b.stone) });
      }
    }
    return opts;
  }
  if (inst.line_key.startsWith('species:')) {
    const { evo, steps } = evoStepsForSpecies(inst);
    if (!steps.length) return opts;
    const stages = (evo && evo.stages) || [];
    for (const step of steps) {
      const ck = evoCondCheck(step.cond, level, has);
      const stepKey = evoRewardStepKey(inst.species_no, step.to);
      const ownedTarget = evoCtx.owned ? evoCtx.owned.has(step.to) : false;
      const claimedReward = evoCtx.claimedSteps ? evoCtx.claimedSteps.has(stepKey) : false;
      if (ownedTarget && claimedReward) continue; // 这条分支已领过奖：按钮消失
      if (ownedTarget) {
        opts.push({
          kind: 'collection-evo-reward', baseNo: Number(inst.line_key.slice(8)), fromNo: inst.species_no, target: step.to,
          name: speciesName(step.to), no: step.to,
          level: ck.needLevel, item: ck.itemKey, trade: ck.trade,
          ready: GATES_OPEN || ck.ready, missing: GATES_OPEN ? [] : ck.missing,
          note: `已经有${speciesName(step.to)}啦，这次进化变成高级转盘奖励`,
          formIdx: stages.length ? stages.indexOf(step.to) : 1,
        });
        continue;
      }
      opts.push({
        kind: 'collection-evo', baseNo: Number(inst.line_key.slice(8)), fromNo: inst.species_no, target: step.to,
        name: speciesName(step.to), no: step.to,
        level: ck.needLevel, item: ck.itemKey, trade: ck.trade,
        ready: GATES_OPEN || ck.ready, missing: GATES_OPEN ? [] : ck.missing,
        note: ck.trade ? (ck.itemKey ? '连接交换进化：消耗对应道具' : '交换进化：App 内以等级 10 为门槛') : undefined,
        formIdx: stages.length ? stages.indexOf(step.to) : 1,
      });
    }
    return opts;
  }
  // 主宠线：终极须 16 级＋对应石；一/二阶随等级自动进阶，不列
  const stone = MAIN_EVO_STONE[inst.line_key];
  if (stone && inst.form_idx < 3) {
    opts.push({ kind: 'main-final', line: inst.line_key, name: LINES[inst.line_key].forms[2].name, no: LINES[inst.line_key].forms[2].no, stone, needsLevel: 16, hasStone: has(stone), ready: GATES_OPEN || (level >= 16 && has(stone)), missing: missingFor(16, stone) });
  }
  return opts;
}

/* 主宠终极进化：16 级＋对应石。成功时扣石、实例 form_idx=3、写图鉴与获得标记、推进化通知。 */
async function applyMainFinalEvo(db, child, inst, today) {
  const level = levelFromXp(child.total_xp);
  const stone = MAIN_EVO_STONE[child.line];
  if (!stone) return { ok: false, error: 'NO_FINAL_FORM' };
  if (!GATES_OPEN && level < 16) return { ok: false, error: 'LEVEL_TOO_LOW', need: 16 };
  if (inst.form_idx >= 3) return { ok: false, error: 'ALREADY_EVOLVED' };
  const took = GATES_OPEN || await takeItem(db, child.id, stone, 1, 'evolve', 'stone', child.line, today);
  if (!took) return { ok: false, error: 'NO_STONE', stone };
  const finalForm = LINES[child.line].forms[2];
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE pet_instances SET form_idx=3, species_no=?, evolved_via=?, updated_epoch=? WHERE id=?')
    .bind(finalForm.no, stone, now, inst.id).run();
  const dexIns = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, `form:${child.line}:3`, today).run();
  if (dexIns.meta && dexIns.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, `form:${child.line}:3`]);
  }
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(child.id, finalForm.no, 'evolve', now).run();
  if (!GATES_OPEN) {
    await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(child.id, stone, 'evolve', 'line', child.line, now, today).run();
  }
  await pushNotice(db, child.id, 'evolution', { from: LINES[child.line].forms[1].name, to: finalForm.name, formIdx: 3, img: petImg(finalForm.no), stone });
  return { ok: true, line: child.line, name: finalForm.name, no: finalForm.no, img: petImg(finalForm.no), stone };
}

/* 伊布分支进化：16 级＋对应石；仙子分支不耗石（须已学会池内妖精招式）。 */
async function applyEeveeBranchEvo(db, child, inst, branchKey, today, rng = Math.random) {
  const b = EEVEE_BRANCHES[branchKey];
  if (!b) return { ok: false, error: 'BAD_BRANCH' };
  if (inst.branch) return { ok: false, error: 'ALREADY_EVOLVED', branch: inst.branch };
  const level = levelFromXp(child.total_xp);
  if (!GATES_OPEN && level < 16) return { ok: false, error: 'LEVEL_TOO_LOW', need: 16 };
  if (branchKey === 'sylveon') {
    if (!GATES_OPEN && fairyMovesOf(child).length === 0) return { ok: false, error: 'NO_FAIRY_MOVE' };
  } else if (!GATES_OPEN) {
    const took = await takeItem(db, child.id, b.stone, 1, 'evolve', 'stone', `eevee:${branchKey}`, today);
    if (!took) return { ok: false, error: 'NO_STONE', stone: b.stone };
  }
  const now = Math.floor(Date.now() / 1000);
  const nextAbility = abilityAfterEvolution(inst, b.no, rng); // Batch 0.1 / R4：特性不属新形态则按 source 重掷，同条 UPDATE 原子写回
  await db.prepare('UPDATE pet_instances SET branch=?, species_no=?, form_idx=1, evolved_via=?, ability=?, updated_epoch=? WHERE id=?')
    .bind(branchKey, b.no, branchKey === 'sylveon' ? null : b.stone, nextAbility, now, inst.id).run();
  const dexIns1 = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, `form:eevee:branch:${branchKey}`, today).run();
  if (dexIns1.meta && dexIns1.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, `form:eevee:branch:${branchKey}`]);
  }
  const dexIns2 = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, dexKeyForSpecies(b.no), today).run();
  if (dexIns2.meta && dexIns2.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, dexKeyForSpecies(b.no)]);
  }
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(child.id, b.no, 'evolve', now).run();
  if (!GATES_OPEN && branchKey !== 'sylveon') {
    await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(child.id, b.stone, 'evolve', 'eevee-branch', branchKey, now, today).run();
  }
  await pushNotice(db, child.id, 'evolution', { from: '伊布', to: b.name, formIdx: 1, img: petImg(b.no), stone: branchKey === 'sylveon' ? null : b.stone, branch: branchKey });
  return { ok: true, branch: branchKey, name: b.name, no: b.no, img: petImg(b.no), type: b.type, stone: branchKey === 'sylveon' ? null : b.stone };
}

/* 收藏线进化：按 EVO_LINES 链的下一步。需道具时扣道具；纯等级／纯交换门槛不扣。
 * targetNo（目标物种号）指定分支时按该分支执行（不存在的分支 → BAD_BRANCH）；
 * 未传时保持旧行为（第一条分支）。重复奖励按所选分支的目标形态判定。 */
async function applyCollectionEvo(db, child, inst, today, targetNo = null, rng = Math.random) {
  const { evo, steps } = evoStepsForSpecies(inst);
  let step = null;
  if (targetNo != null && targetNo !== '') {
    step = steps.find((s) => s.to === Number(targetNo)) || null;
    if (!step) return { ok: false, error: 'BAD_BRANCH' };
  } else {
    step = steps[0] || null;
  }
  if (!step) return { ok: false, error: inst.species_no && evo ? 'ALREADY_EVOLVED' : 'NO_EVO_LINE' };
  const level = levelFromXp(child.total_xp);
  // 道具是否在背包：先从条件里取出道具 key，再查库存做同步校验
  const itemKey = step.cond.kind === 'stone' ? step.cond.stone : step.cond.kind === 'trade-item' ? step.cond.item : null;
  const invQty = {};
  if (itemKey) {
    const row = await db.prepare('SELECT qty FROM item_inventory WHERE child_id=? AND item_key=?').bind(child.id, itemKey).first();
    invQty[itemKey] = row ? Number(row.qty) : 0;
  }
  const ck2 = evoCondCheck(step.cond, level, (k) => (invQty[k] || 0) > 0);
  if (!GATES_OPEN && !ck2.ready) {
    if (ck2.needLevel && level < ck2.needLevel) return { ok: false, error: 'LEVEL_TOO_LOW', need: ck2.needLevel };
    return { ok: false, error: 'NO_STONE', stone: ck2.itemKey };
  }
  // 重复进化奖励（2026-11-06）：目标已拥有 → 不进化、不耗石，转领 1 次高级转盘（每步骤一生一次）；
  // INSERT OR IGNORE ＋ UNIQUE 兜底防并发重复领，抢不到即已领过。
  if (await ownsSpeciesEver(db, child.id, step.to)) {
    const stepKey = evoRewardStepKey(inst.species_no, step.to);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const ins = await db.prepare(
      'INSERT OR IGNORE INTO evo_wheel_grants(child_id, step_key, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)'
    ).bind(child.id, stepKey, weekStartMon(today), nowEpoch, today).run();
    if (!ins.meta || !ins.meta.changes) return { ok: false, error: 'EVO_REWARD_CLAIMED' };
    const chances = await wheelChancesLeft(db, child.id);
    return { ok: true, reward: 'wheel', stepKey, fromNo: inst.species_no, name: speciesName(step.to), no: step.to, img: petImg(step.to), wheelChances: chances };
  }
  if (!GATES_OPEN && ck2.itemKey) {
    const took = await takeItem(db, child.id, ck2.itemKey, 1, 'evolve', 'stone', `species:${inst.species_no}`, today);
    if (!took) return { ok: false, error: 'NO_STONE', stone: ck2.itemKey };
  }
  const stages = (evo && evo.stages) || [];
  const formIdx = stages.length ? stages.indexOf(step.to) : 1;
  const now = Math.floor(Date.now() / 1000);
  const nextAbility = abilityAfterEvolution(inst, step.to, rng); // Batch 0.1 / R4：同条 UPDATE 原子写回
  await db.prepare('UPDATE pet_instances SET species_no=?, form_idx=?, ability=?, updated_epoch=? WHERE id=?')
    .bind(step.to, formIdx, nextAbility, now, inst.id).run();
  const dexIns = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
    .bind(child.id, dexKeyForSpecies(step.to), today).run();
  if (dexIns.meta && dexIns.meta.changes) {
    await syncTouch(db, child.id, 'pokedex', 'child_id=? AND entry_key=?', [child.id, dexKeyForSpecies(step.to)]);
  }
  await db.prepare('INSERT OR IGNORE INTO species_acquisitions(child_id, species_no, source, first_epoch) VALUES(?,?,?,?)')
    .bind(child.id, step.to, 'evolve', now).run();
  if (!GATES_OPEN && ck2.itemKey) {
    await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
      .bind(child.id, ck2.itemKey, 'evolve', 'species', String(step.to), now, today).run();
  }
  await pushNotice(db, child.id, 'evolution', { from: speciesName(inst.species_no), to: speciesName(step.to), formIdx, img: petImg(step.to), stone: ck2.itemKey || null });
  return { ok: true, fromNo: inst.species_no, name: speciesName(step.to), no: step.to, img: petImg(step.to), stone: ck2.itemKey || null };
}

/* 妖精技能石教学：从该只伊布尚未学会的池内招式中均匀随机抽取；池满时石头不可用、不消耗。 */
async function applyFairyTeach(db, child, inst, today, rng = Math.random) {
  const learned = fairyMovesOf(child).map((m) => m.name);
  const pool = FAIRY_TEACH_POOL.filter((m) => !learned.includes(m.name));
  if (!pool.length) return { ok: false, error: 'FAIRY_POOL_FULL' };
  const took = await takeItem(db, child.id, 'stone:fairy-skill', 1, 'teach', 'stone', 'eevee', today);
  if (!took) return { ok: false, error: 'NO_STONE', stone: 'stone:fairy-skill' };
  const pick = pool[Math.floor(rollRng(rng) * pool.length) % pool.length];
  const level = levelFromXp(child.total_xp);
  const updated = [...fairyMovesOf(child), { name: pick.name, level, type: '妖精', desc: pick.desc, power: pick.power, accuracy: pick.accuracy, effect: pick.effect }];
  await db.prepare('UPDATE children SET fairy_moves=? WHERE id=?').bind(JSON.stringify(updated), child.id).run();
  await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO item_uses(child_id, item_key, use_kind, ref_type, ref_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?,?)')
    .bind(child.id, 'stone:fairy-skill', 'teach', 'move', pick.name, now, today).run();
  // 已满 16 级且刚学会：提示可进化仙子伊布（不自动进化）
  const pendingFairyEvolve = level >= 16 && !inst.branch;
  if (pendingFairyEvolve) {
    await pushNotice(db, child.id, 'evo-ready', { to: '仙子伊布', branch: 'sylveon', img: petImg(700) });
  }
  return { ok: true, move: pick, pendingFairyEvolve };
}

async function quizSummaryForChild(db, child, today, S) {
  const pool = await quizPoolForChild(db, child, today, S);
  const answered = pool.questions.filter((q) => pool.attempts.has(q.id)).length;
  return { quota: pool.quota, answeredCount: answered, remaining: Math.max(0, pool.questions.length - answered) };
}


async function apiOakToday(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  // Fable 优化 #3：本请求所需的设置一次取齐（english_mode、english_progress、quiz_xp、oak_assess）
  const S = await loadHotSettings(db, child.family_id, [
    'english_mode', `english_progress_${child.id}`, 'quiz_xp', 'oak_assess',
  ]);
  const group = await oakGroupForChild(db, child, today, S);
  const quizXp = Number(((S.has('quiz_xp')) ? S.get('quiz_xp') : await getEffSetting(db, child.family_id, 'quiz_xp')) || 10);
  const drawStatus = await oakDrawStatus(db, child, today, group);
  return json({
    ok: true, childId: child.id, childGrade: child.grade_label, date: today,
    episodeId: group.episodeId, topic: group.topic, quizXp,
    listenedCount: group.listenedCount, completed: group.completed,
    xpAwardedToday: group.xpAwardedToday, sentences: group.sentences,
    fiveStarCount: drawStatus.fiveStarCount, fiveStarTotal: drawStatus.fiveStarTotal, drawGranted: drawStatus.drawGranted,
    /* MP-15 §3（4×5★+2×4★）：5★ 目标句数（与完成线同值），小程序 5★ 计数与 nudge 用它，不硬编码 4。 */
    fiveStarTarget: Math.min(OAK_DRAW_MIN_FIVE_STAR, drawStatus.fiveStarTotal),
    /* MP-15 §3：跟读计数（assessedCount = 已跟读句数；fourStarCount = 达 4★ 句数），小程序据此显示进度与 nudge。 */
    fourStarCount: drawStatus.fourStarCount, assessedCount: drawStatus.assessedCount,
    assessEnabled: ((S.has('oak_assess')) ? S.get('oak_assess') : await getSetting(db, 'oak_assess')) !== '0',
  });
}

/* -------- 每日英语打卡（2026-11-07，用户定：两孩每日 5 句、只跟读打卡先跑） --------
 * 内容池：src/data/daily-english.js（跟读站素材只读 API v1 快照 2026-11-13，小宝 g1＋starter 236 句、
 * 大宝 g3 1100 句；刷新跑 work/extract-daily-english-pool.py ＋ scripts/gen-daily-english.mjs --write）。
 * 内容分工（2026-11-13，用户定：每日英语走课本内容，口语对话归 Oak）：每天 5 句只取课本
 * （textbook）；口语（card/video，游戏口语与视频生存英语，带说话人）只进 Oak，不再进每日英语。
 * 选题在服务端做：种子取 child_id＋当天日期（FNV-1a 哈希 → mulberry32），同一天同一孩子恒为
 * 同一 5 句，5 句互不重复；跨日去重 v1 不做（池子大、重复概率低，以后再加）。
 * v1 不加经验、不答题；打卡只记 daily_english_logs（迁移 0027），接口幂等（INSERT OR IGNORE）。
 * v2（2026-11-09）：每句跟读评分（POST /api/daily-english/assess，走共用讯飞主/Azure 备管线，成绩记
 * daily_english_assessments，迁移 0029）；打卡须当日 5 句 best 全 ≥80 分（4 星线，用户定，跟读站 85 分线区分）。
 * 离线：选题与打卡均须联网（不进 sync 注册表、不进离线端）；前端把当日 5 句缓存在
 * localStorage（sm.dailyEnglish.<childId>），离线时文字照常、音频置灰。
 */
/* -------- 每日练习模块描述（MP-15 §6.1：服务端下发形式，小程序通用渲染） --------
 * 改一个 kind 值＋部署，小程序对应科目的形式就跟着变，不用重新上传审核。
 * kind 只有两种：'quiz'（选择题，5 道答对 4 道打卡）、'recite'（跟读评分）。
 * intro 是通用页顶部说明文案；unit/count 拼卡片副标题（如“5 道题”“5 句”）。 */
const DAILY_MODULE_KINDS = { english: 'recite', chinese: 'quiz', math: 'quiz' };
const DAILY_MODULES = [
  { key: 'english', title: '每日英语跟读', icon: '/images/icon-english.png', kind: DAILY_MODULE_KINDS.english, unit: '句', count: 5, intro: '每天 5 句英语跟读，每句达到 75 分就能打卡。' },
  { key: 'chinese', title: '每日语文', icon: '/images/icon-chinese.png', kind: DAILY_MODULE_KINDS.chinese, unit: '道题', count: 5, intro: '每天 5 道语文题，答对 4 道就能打卡。' },
  { key: 'math', title: '每日数学', icon: '/images/icon-math.png', kind: DAILY_MODULE_KINDS.math, unit: '道题', count: 5, intro: '每道题想好再提交，提交后不能改；答对 4 道才能打卡。' },
];
async function apiDailyModules() {
  return json({ ok: true, modules: DAILY_MODULES });
}

const DAILY_ENGLISH_COUNT = 5;
const DAILY_ENGLISH_SPOKEN_COUNT = 0; // 2026-11-13 用户定：每日英语只取课本，口语归 Oak（旧 3+2 已废）
/* 每日英语打卡线（2026-11-10，用户定，任务 82）：75 分＝4 星，全 5 句 best ≥75 才打卡；打卡线与 4 星线对齐。 */
const DAILY_ENGLISH_PASS_PRON = 75;
function dailyEnglishHash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dailyEnglishPoolFor(gradeNum) {
  if (gradeNum === 1) return DAILY_ENGLISH_POOL.xiaobao;
  if (gradeNum === 3) return DAILY_ENGLISH_POOL.dabao;
  return null;
}
function pickDailyEnglish(pool, count, rng) {
  const n = Math.min(count, pool.length);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rollRng(rng) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => pool[i]);
}
function isDailyEnglishSpoken(s) {
  return s.k === 'card' || s.k === 'video';
}
function pickDailyEnglishMixed(pool, count, spokenCount, rng) {
  const spoken = pool.filter(isDailyEnglishSpoken);
  const textbook = pool.filter((s) => !isDailyEnglishSpoken(s));
  const nSpoken = Math.min(spokenCount, spoken.length, count);
  const nText = Math.min(count - nSpoken, textbook.length);
  const picked = [
    ...pickDailyEnglish(spoken, nSpoken, rng),
    ...pickDailyEnglish(textbook, nText, rng),
  ];
  // 任一子池不足时用另一子池补满（兜底；现池口语均 ≥2，不触发）
  if (picked.length < count) {
    const rest = pool.filter((s) => !picked.includes(s));
    picked.push(...pickDailyEnglish(rest, count - picked.length, rng));
  }
  // 最后再洗一次，口语句不固定排在前/后
  return pickDailyEnglish(picked, picked.length, rng);
}
function dailyEnglishTodayFor(child, dateStr) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const pool = dailyEnglishPoolFor(gradeNum);
  if (!pool) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:${dateStr}`));
  const picked = pickDailyEnglishMixed(pool, DAILY_ENGLISH_COUNT, DAILY_ENGLISH_SPOKEN_COUNT, rng);
  return {
    date: dateStr,
    sentences: picked.map((s) => {
      const ep = DAILY_ENGLISH_EPISODES[s.e] || {};
      return { sid: s.s, episodeId: s.e, titleEn: ep.t || '', titleZh: ep.z || '', type: ep.k || s.k || '', speaker: s.sp || null, en: s.en, zh: s.zh, audioNormal: s.an, audioSlow: s.as };
    }),
  };
}
async function apiDailyEnglish(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const picked = dailyEnglishTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  let done = null;
  const [doneR, careWheelChances, scores] = await Promise.all([
    (async () => { try { return await db.prepare('SELECT completed_epoch FROM daily_english_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(); } catch (e) { return null; } })(), /* 表未建（如旧迁移链）：当未完成，不抛错 */
    careWheelChancesLeft(db, child.id),
    dailyEnglishAssessScores(db, child.id, today),
  ]);
  done = doneR;
  return json({ ok: true, childId: child.id, date: today, sentences: picked.sentences, completed: !!done, completedEpoch: done ? done.completed_epoch : null, careWheelChances, scores });
}
async function apiDailyEnglishCheckin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const picked = dailyEnglishTodayFor(child, today);
    if (picked.error) return json({ ok: false, error: picked.error }, 400);
    // 打卡门禁（2026-11-09）：当日 5 句 best 全 ≥80（4 星）才记完成；未全过返回还差哪几句，不记日志、不发转盘机会。
    const scores = await dailyEnglishAssessScores(db, child.id, today);
    const missing = picked.sentences.map((s, i) => {
      const sc2 = scores[dailyEnglishSidKey(s)];
      const best = sc2 ? sc2.best : null;
      return { index: i + 1, sid: dailyEnglishSidKey(s), best, passed: (best ?? -1) >= DAILY_ENGLISH_PASS_PRON };
    }).filter((m) => !m.passed);
    if (missing.length) return json({ ok: false, error: 'NOT_PASSED', missing });
    const now = Math.floor(Date.now() / 1000);
    const sids = JSON.stringify(picked.sentences.map((s) => `${s.episodeId}:${s.sid}`));
    await db.prepare('INSERT OR IGNORE INTO daily_english_logs(child_id, date_shanghai, sids, completed_epoch) VALUES(?,?,?,?)').bind(child.id, today, sids, now).run();
    // 完成当日 5 句 → 发 1 次养成转盘机会（每孩每天 1 次，INSERT OR IGNORE 幂等；
    // source 'daily-english'、ref_id=当日日期；表未建时内部吞错，不阻塞打卡主流程）。
    const careWheelGranted = await grantCareWheelChance(db, child.id, 'daily-english', today, today, now);
    const careWheelChances = await careWheelChancesLeft(db, child.id);
    return json({ ok: true, childId: child.id, date: today, completed: true, careWheelGranted, careWheelChances });
  });
}

/* 每日英语句子的 sid 键：与 daily_english_logs.sids 同一格式 episodeId:sid */
function dailyEnglishSidKey(s) { return `${s.episodeId}:${s.sid}`; }

/* 当日每句最好分（读路径；表未建如旧迁移链时当无成绩，不抛错） */
async function dailyEnglishAssessScores(db, childId, today) {
  try {
    const { results } = await db.prepare(
      'SELECT sid, best_pron, attempts FROM daily_english_assessments WHERE child_id=? AND date_shanghai=?'
    ).bind(childId, today).all();
    const map = {};
    for (const r of results || []) map[r.sid] = { best: Number(r.best_pron), attempts: Number(r.attempts) || 0, passed: Number(r.best_pron) >= DAILY_ENGLISH_PASS_PRON };
    return map;
  } catch (e) { return {}; }
}

/* 记一次每日英语点评成绩（每句取当日最好 pron）；返回最新 { best, attempts }。 */
async function dailyEnglishRecordAssess(db, child, today, sidKey, pron) {
  try {
    await db.prepare(
      `INSERT INTO daily_english_assessments(child_id, sid, date_shanghai, best_pron, attempts, updated_epoch)
       VALUES(?,?,?,?,1,?)
       ON CONFLICT(child_id, sid, date_shanghai) DO UPDATE SET
         best_pron = MAX(best_pron, excluded.best_pron),
         attempts = attempts + 1,
         updated_epoch = excluded.updated_epoch`
    ).bind(child.id, sidKey, today, pron, Math.floor(Date.now() / 1000)).run();
  } catch (e) { console.error('daily english record assess failed', e); }
  try {
    const row = await db.prepare(
      'SELECT best_pron, attempts FROM daily_english_assessments WHERE child_id=? AND sid=? AND date_shanghai=?'
    ).bind(child.id, sidKey, today).first();
    if (row) return { best: Number(row.best_pron), attempts: Number(row.attempts) || 0 };
  } catch (e) {}
  return { best: pron, attempts: 1 };
}

/* 每日英语跟读评分（2026-11-09）：按当日 5 句的句文本评分，走共用评测管线（讯飞主、Azure 备）。
 * 与 /api/oak/assess 同一入参形状（audio/wav＋x-ref-text），同一错误口径；只评当日 5 句，不评 Oak 的题。 */
async function apiDailyEnglishAssess(db, req, session, env) {
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405, { Allow: 'POST' });
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 未配 key 用 200 + ok:false（与 /api/oak/assess 同一口径，前端友好提示走得到）。
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return json({ ok: false, error: 'not_configured' });
  const ctype = (req.headers.get('Content-Type') || '').toLowerCase().trim();
  if (!ctype.startsWith('audio/wav')) return json({ ok: false, error: 'bad_type' }, 415);
  let refText;
  try {
    refText = decodeURIComponent(req.headers.get('x-ref-text') ?? '');
  } catch (_) {
    return json({ ok: false, error: 'bad_ref' }, 400);
  }
  if (refText.length < 1 || refText.length > 200) return json({ ok: false, error: 'bad_ref' }, 400);
  const today = shDateStr();
  const picked = dailyEnglishTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  const sentence = picked.sentences.find((s) => s.en === refText);
  if (!sentence) return json({ ok: false, error: 'bad_ref' }, 400);
  let audio;
  try {
    audio = await req.arrayBuffer();
  } catch (_) {
    return json({ ok: false, error: 'bad_size' }, 413);
  }
  if (audio.byteLength < 1000 || audio.byteLength > 3145728) return json({ ok: false, error: 'bad_size' }, 413);
  const pcm = iflytekWavToPcm(audio);
  if (!pcm || pcm.length < 100) return json({ ok: false, error: 'bad_size' }, 413);
  const assessed = await assessPronWithFailover(audio, pcm, refText, env);
  if (!assessed.ok) {
    if (assessed.error === 'timeout') return json({ ok: false, error: 'timeout' }, 504);
    if (assessed.error === 'iflytek') return json({ ok: false, error: 'iflytek', status: assessed.status ?? null }, 502);
    if (assessed.error === 'azure') return json({ ok: false, error: 'azure', status: assessed.status ?? null }, 502);
    if (assessed.error === 'bad_json') return json({ ok: false, error: 'bad_json' }, 502);
    if (assessed.error === 'not_recognized') return json({ ok: false, error: 'not_recognized' });
    if (assessed.error === 'not_configured') return json({ ok: false, error: 'not_configured' });
    return json({ ok: false, error: 'network' }, 502);
  }
  const res = assessed.res, provider = assessed.provider;
  const pron = res.pron;
  const rec = await dailyEnglishRecordAssess(db, child, today, dailyEnglishSidKey(sentence), pron);
  return json({ ok: true, pron, acc: res.acc,
    flu: res.flu, comp: res.comp, pros: res.pros, words: res.words, provider,
    stars: dailyEnglishStarsFromPron(pron), best: rec.best, attempts: rec.attempts,
    passed: rec.best >= DAILY_ENGLISH_PASS_PRON });
}

/* -------- 每日语文朗读（2026-11-09，任务表 77②，用户定：每天读一段课文/古诗、跟读评分） --------
 * 内容池：src/data/daily-chinese.js（部编版已学范围，逐首核对课本原文；小宝 g1 6 篇、大宝 g3 10 首）。
 * 每天 1 篇，同孩同日恒定（种子取 child_id＋当天日期，与每日英语同口径）。
 * 录音评分复用共用管线 assessPronWithFailover，传 { lang: 'zh' }（讯飞 cn_vip、Azure zh-CN）；
 * 过线 80 分＝4 星（DAILY_CHINESE_PASS_PRON，与每日英语一致；另用自己的星级函数
 * dailyChineseStarsFromPron，不复用每日英语的）。达标后记日志并发 1 次养成转盘机会
 * （source 'daily-chinese'、ref_id 当日日期、INSERT OR IGNORE 幂等）。
 * 示范音：v1 无示范音（站里无现成中文示范音源，不另搭服务）；只出文本＋录音评分。
 * 打卡与选题均须联网（不进 sync 注册表、不进离线端）；前端把当日篇目缓存在
 * localStorage（sm.dailyChinese.<childId>）。
 */
const DAILY_CHINESE_PASS_PRON = 75;
function dailyChineseStarsFromPron(pron) {
  if (typeof pron !== 'number' || !Number.isFinite(pron)) return 1;
  return pron >= 85 ? 5 : pron >= 75 ? 4 : pron >= 60 ? 3 : pron >= 40 ? 2 : 1;
}
function dailyChinesePoolFor(gradeNum) {
  if (gradeNum === 1) return DAILY_CHINESE_POOL.xiaobao;
  if (gradeNum === 3) return DAILY_CHINESE_POOL.dabao;
  return null;
}
function dailyChineseTodayFor(child, dateStr) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const pool = dailyChinesePoolFor(gradeNum);
  if (!pool) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:chinese:${dateStr}`));
  const item = pool[Math.floor(rollRng(rng) * pool.length)];
  return { date: dateStr, item: { id: item.id, title: item.title, author: item.author, kind: item.kind, unit: item.unit, text: item.text } };
}
const DAILY_CHINESE_QUIZ_COUNT = 5;
const DAILY_CHINESE_QUIZ_PASS_COUNT = 4;
/* 2026-11-17 网页端改 5 道选择题（题取自打卡题库 语文/study，种子同每日数学口径）；
 * 小程序仍走上面的朗读评分，打卡闸门两条路都认。 */
async function dailyChineseQuizTodayFor(db, child, dateStr) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  if (gradeNum !== 1 && gradeNum !== 3) return { error: 'NO_POOL' };
  let rows = [];
  try {
    const r = await db.prepare(
      "SELECT id, question, options_json, answer_idx FROM quiz_questions WHERE subject='语文' AND kind='study' AND grade=? AND active=1 ORDER BY id"
    ).bind(gradeNum).all();
    rows = (r && r.results) || [];
  } catch (e) { rows = []; }
  if (!rows.length) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:chinese-quiz:${dateStr}`));
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rollRng(rng) * (i + 1));
    const t = rows[i]; rows[i] = rows[j]; rows[j] = t;
  }
  return { date: dateStr, questions: rows.slice(0, DAILY_CHINESE_QUIZ_COUNT).map((r, i) => ({
    index: i, id: r.id, question: r.question, options: JSON.parse(r.options_json), answerIdx: r.answer_idx })) };
}
async function dailyChineseAnswers(db, childId, today) {
  try {
    const { results } = await db.prepare(
      'SELECT qindex, answer, correct FROM daily_chinese_answers WHERE child_id=? AND date_shanghai=?'
    ).bind(childId, today).all();
    const map = {};
    for (const r of results || []) map[Number(r.qindex)] = { answer: Number(r.answer), correct: Number(r.correct) === 1 };
    return map;
  } catch (e) { return {}; }
}
async function apiDailyChinese(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const picked = dailyChineseTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  const quiz = await dailyChineseQuizTodayFor(db, child, today);
  if (quiz.error) return json({ ok: false, error: quiz.error }, 400);
  let done = null;
  const [doneR, careWheelChances, score, answers] = await Promise.all([
    (async () => { try { return await db.prepare('SELECT completed_epoch FROM daily_chinese_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(); } catch (e) { return null; } })(), /* 表未建：当未完成，不抛错 */
    careWheelChancesLeft(db, child.id),
    dailyChineseAssessScore(db, child.id, today, picked.item.id),
    dailyChineseAnswers(db, child.id, today),
  ]);
  done = doneR;
  // 刷新后答错反馈仍能显示正确答案：只给已答错的题附 correctAnswer
  for (const [k, v] of Object.entries(answers)) {
    const q = quiz.questions[Number(k)];
    if (v && !v.correct && q) v.correctAnswer = q.answerIdx;
  }
  const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
  const questions = quiz.questions.map((q) => ({ index: q.index, id: q.id, question: q.question, options: q.options }));
  return json({ ok: true, childId: child.id, date: today, item: picked.item, questions, answers, correctCount, passed: correctCount >= DAILY_CHINESE_QUIZ_PASS_COUNT, passCount: DAILY_CHINESE_QUIZ_PASS_COUNT, completed: !!done, completedEpoch: done ? done.completed_epoch : null, careWheelChances, score });
}
async function apiDailyChineseAnswer(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const quiz = await dailyChineseQuizTodayFor(db, child, today);
    if (quiz.error) return json({ ok: false, error: quiz.error }, 400);
    const idx = body.index == null || body.index === '' ? NaN : Number(body.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= quiz.questions.length) return json({ ok: false, error: 'bad_index' }, 400);
    const q = quiz.questions[idx];
    const ans = body.answer == null || body.answer === '' ? NaN : Number(body.answer);
    if (!Number.isInteger(ans) || ans < 0 || ans >= q.options.length) return json({ ok: false, error: 'bad_answer' }, 400);
    let done = null;
    const [doneR, answers] = await Promise.all([
      (async () => { try { return await db.prepare('SELECT completed_epoch FROM daily_chinese_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(); } catch (e) { return null; } })(),
      dailyChineseAnswers(db, child.id, today),
    ]);
    done = doneR;
    if (done) return json({ ok: false, error: 'completed' }, 400);
    if (Object.hasOwn(answers, idx)) {
      const cur = answers[idx];
      const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
      return json({ ok: true, index: idx, answer: cur.answer, correct: cur.correct, correctCount, passed: correctCount >= DAILY_CHINESE_QUIZ_PASS_COUNT, already: true });
    }
    const correct = ans === q.answerIdx;
    const now = Math.floor(Date.now() / 1000);
    try {
      await db.prepare(
        'INSERT INTO daily_chinese_answers(child_id, date_shanghai, qindex, answer, correct, answered_epoch) VALUES(?,?,?,?,?,?)'
      ).bind(child.id, today, idx, ans, correct ? 1 : 0, now).run();
    } catch (e) { console.error('daily chinese record answer failed', e); }
    const answers2 = await dailyChineseAnswers(db, child.id, today);
    const correctCount = Object.values(answers2).filter((x) => x && x.correct).length;
    return json({ ok: true, index: idx, answer: ans, correct, correctAnswer: correct ? undefined : q.answerIdx, correctCount, passed: correctCount >= DAILY_CHINESE_QUIZ_PASS_COUNT });
  });
}
async function apiDailyChineseCheckin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const picked = dailyChineseTodayFor(child, today);
    if (picked.error) return json({ ok: false, error: picked.error }, 400);
    const [answers, score] = await Promise.all([
      dailyChineseAnswers(db, child.id, today),
      dailyChineseAssessScore(db, child.id, today, picked.item.id),
    ]);
    const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
    // 网页端走选择题（答对 ≥4），小程序走朗读评分（best >= 75），两条路都放行
    const passed = correctCount >= DAILY_CHINESE_QUIZ_PASS_COUNT || (score && typeof score.best === 'number' && score.best >= DAILY_CHINESE_PASS_PRON);
    if (!passed) return json({ ok: false, error: 'NOT_PASSED', correctCount, needed: DAILY_CHINESE_QUIZ_PASS_COUNT, best: score ? score.best : null });
    const now = Math.floor(Date.now() / 1000);
    await db.prepare('INSERT OR IGNORE INTO daily_chinese_logs(child_id, date_shanghai, item_id, completed_epoch) VALUES(?,?,?,?)').bind(child.id, today, picked.item.id, now).run();
    const careWheelGranted = await grantCareWheelChance(db, child.id, 'daily-chinese', today, today, now);
    const careWheelChances = await careWheelChancesLeft(db, child.id);
    return json({ ok: true, childId: child.id, date: today, completed: true, careWheelGranted, careWheelChances });
  });
}
async function dailyChineseAssessScore(db, childId, today, itemId) {
  try {
    const row = await db.prepare(
      'SELECT best_pron, attempts FROM daily_chinese_assessments WHERE child_id=? AND item_id=? AND date_shanghai=?'
    ).bind(childId, itemId, today).first();
    if (!row) return null;
    const best = Number(row.best_pron);
    return { best, attempts: Number(row.attempts) || 0, passed: best >= DAILY_CHINESE_PASS_PRON };
  } catch (e) { return null; }
}
async function dailyChineseRecordAssess(db, child, today, itemId, pron) {
  try {
    await db.prepare(
      `INSERT INTO daily_chinese_assessments(child_id, item_id, date_shanghai, best_pron, attempts, updated_epoch)
       VALUES(?,?,?,?,1,?)
       ON CONFLICT(child_id, item_id, date_shanghai) DO UPDATE SET
         best_pron = MAX(best_pron, excluded.best_pron),
         attempts = attempts + 1,
         updated_epoch = excluded.updated_epoch`
    ).bind(child.id, itemId, today, pron, Math.floor(Date.now() / 1000)).run();
  } catch (e) { console.error('daily chinese record assess failed', e); }
  try {
    const row = await db.prepare(
      'SELECT best_pron, attempts FROM daily_chinese_assessments WHERE child_id=? AND item_id=? AND date_shanghai=?'
    ).bind(child.id, itemId, today).first();
    if (row) return { best: Number(row.best_pron), attempts: Number(row.attempts) || 0 };
  } catch (e) {}
  return { best: pron, attempts: 1 };
}
async function apiDailyChineseAssess(db, req, session, env) {
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405, { Allow: 'POST' });
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return json({ ok: false, error: 'not_configured' });
  const ctype = (req.headers.get('Content-Type') || '').toLowerCase().trim();
  if (!ctype.startsWith('audio/wav')) return json({ ok: false, error: 'bad_type' }, 415);
  let refText;
  try {
    refText = decodeURIComponent(req.headers.get('x-ref-text') ?? '');
  } catch (_) {
    return json({ ok: false, error: 'bad_ref' }, 400);
  }
  if (refText.length < 1 || refText.length > 200) return json({ ok: false, error: 'bad_ref' }, 400);
  const today = shDateStr();
  const picked = dailyChineseTodayFor(child, today);
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  if (picked.item.text !== refText) return json({ ok: false, error: 'bad_ref' }, 400);
  let audio;
  try {
    audio = await req.arrayBuffer();
  } catch (_) {
    return json({ ok: false, error: 'bad_size' }, 413);
  }
  if (audio.byteLength < 1000 || audio.byteLength > 3145728) return json({ ok: false, error: 'bad_size' }, 413);
  const pcm = iflytekWavToPcm(audio);
  if (!pcm || pcm.length < 100) return json({ ok: false, error: 'bad_size' }, 413);
  // 中文评测：传 { lang: 'zh' }（讯飞 cn_vip、Azure zh-CN）；只对供应商错误切换。
  const assessed = await assessPronWithFailover(audio, pcm, refText, env, { lang: 'zh' });
  if (!assessed.ok) {
    if (assessed.error === 'timeout') return json({ ok: false, error: 'timeout' }, 504);
    if (assessed.error === 'iflytek') return json({ ok: false, error: 'iflytek', status: assessed.status ?? null }, 502);
    if (assessed.error === 'azure') return json({ ok: false, error: 'azure', status: assessed.status ?? null }, 502);
    if (assessed.error === 'bad_json') return json({ ok: false, error: 'bad_json' }, 502);
    if (assessed.error === 'not_recognized') return json({ ok: false, error: 'not_recognized' });
    if (assessed.error === 'not_configured') return json({ ok: false, error: 'not_configured' });
    return json({ ok: false, error: 'network' }, 502);
  }
  const res = assessed.res, provider = assessed.provider;
  const pron = res.pron;
  const rec = await dailyChineseRecordAssess(db, child, today, picked.item.id, pron);
  return json({ ok: true, pron, acc: res.acc,
    flu: res.flu, comp: res.comp, pros: res.pros, words: res.words, provider,
    stars: dailyChineseStarsFromPron(pron), best: rec.best, attempts: rec.attempts,
    passed: rec.best >= DAILY_CHINESE_PASS_PRON });
}

/* -------- 每日数学口算（2026-11-09，任务表 77②，用户定：每天 5 道口算，5 道答对 4 道算完成） --------
 * 出题器：纯函数，种子取 child_id＋当天日期（mulberry32），同孩同日恒定；答案由种子重算，
 * 不下发给前端（前端只拿到题面），答题时服务端重算核对。
 * 范围（数学北师大版，当前进度上册第 2 单元；贴合年级当前水平，不出超纲题）：
 * - 一年级：20 以内加减法为主，少量 100 以内两位数加减一位数。
 * - 三年级：乘法口诀表内乘法、表内除法、多位数加减法。
 * 每题一次作答（提交后锁定，不可改）；答对数 ≥4 算完成；未完成当天不再重出新题（明日换新题）。
 * 完成（≥4 道）后记日志并发 1 次养成转盘机会（source 'daily-math'、ref_id 当日日期、INSERT OR IGNORE 幂等）。
 */
const DAILY_MATH_COUNT = 5;
const DAILY_MATH_PASS_COUNT = 4;
function genMathProblem(gradeNum, rng) {
  const ri = (n) => Math.floor(rollRng(rng) * n);
  if (gradeNum === 3) {
    const kind = rollRng(rng);
    if (kind < 0.4) {
      // 表内乘法 2–9 × 2–9
      const a = 2 + ri(8), b = 2 + ri(8);
      return { op: '×', q: `${a} × ${b} = ?`, a: a * b };
    }
    if (kind < 0.6) {
      // 表内除法：被除数＝除数×商，保证整除
      const d = 2 + ri(8), q = 2 + ri(8);
      return { op: '÷', q: `${d * q} ÷ ${d} = ?`, a: q };
    }
    if (kind < 0.8) {
      // 两位数加两位数
      const a = 10 + ri(90), b = 10 + ri(90);
      return { op: '+', q: `${a} + ${b} = ?`, a: a + b };
    }
    // 三位数减两位数
    const a = 100 + ri(900), b = 10 + ri(90);
    return { op: '−', q: `${a} − ${b} = ?`, a: a - b };
  }
  // 一年级：加减法
  if (rollRng(rng) < 0.7) {
    if (rollRng(rng) < 0.5) {
      // 20 以内加法
      const a = 1 + ri(19);
      const b = 1 + ri(20 - a);
      return { op: '+', q: `${a} + ${b} = ?`, a: a + b };
    }
    // 20 以内减法
    const a = 2 + ri(19);
    const b = 1 + ri(a - 1);
    return { op: '−', q: `${a} − ${b} = ?`, a: a - b };
  }
  if (rollRng(rng) < 0.5) {
    // 100 以内两位数加一位数
    const a = 10 + ri(80);
    const b = 1 + ri(9);
    return { op: '+', q: `${a} + ${b} = ?`, a: a + b };
  }
  // 100 以内两位数减一位数
  const a = 11 + ri(89);
  const b = 1 + ri(9);
  return { op: '−', q: `${a} − ${b} = ?`, a: a - b };
}
// 括号填数（2026-11-09，任务表 78）：() 里填一个数，答案是数字，走数字输入框。
// 题面为算式本身（中英文无差别），答案 a 为括号里的数；不加比大小（要填符号、不走数字框）。
function genMathBracket(gradeNum, rng) {
  const ri = (n) => Math.floor(rollRng(rng) * n);
  if (gradeNum === 3) {
    const kind = rollRng(rng);
    if (kind < 0.2) {
      // () × b = c（表内乘法）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '×', q: `() × ${b} = ${a * b}`, a };
    }
    if (kind < 0.4) {
      // a × () = c（表内乘法）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '×', q: `${a} × () = ${a * b}`, a: b };
    }
    if (kind < 0.6) {
      // c ÷ () = a（表内除法，保证整除）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '÷', q: `${a * b} ÷ () = ${a}`, a: b };
    }
    if (kind < 0.8) {
      // () ÷ b = a（表内除法）
      const a = 2 + ri(8), b = 2 + ri(8);
      return { kind: 'bracket', op: '÷', q: `() ÷ ${b} = ${a}`, a: a * b };
    }
    if (kind < 0.9) {
      // () + b = c（两位数加两位数，和 ≤ 99）
      const a = 10 + ri(80);
      const b = 10 + ri(90 - a);
      return { kind: 'bracket', op: '+', q: `() + ${b} = ${a + b}`, a };
    }
    // a − () = c（三位数减两位数，a ≥ 100 > c，恒为正）
    const a = 100 + ri(900), c = 10 + ri(90);
    return { kind: 'bracket', op: '−', q: `${a} − () = ${c}`, a: a - c };
  }
  // 一年级：20 以内加减
  const kind = rollRng(rng);
  if (kind < 0.2) {
    // () + b = c（和 ≤ 20）
    const c = 2 + ri(19);
    const b = 1 + ri(c - 1);
    return { kind: 'bracket', op: '+', q: `() + ${b} = ${c}`, a: c - b };
  }
  if (kind < 0.4) {
    // a + () = c（和 ≤ 20）
    const a = 1 + ri(19);
    const c = a + 1 + ri(20 - a);
    return { kind: 'bracket', op: '+', q: `${a} + () = ${c}`, a: c - a };
  }
  if (kind < 0.6) {
    // a − () = c（a ≤ 20，c 可为 0）
    const a = 2 + ri(19);
    const c = ri(a);
    return { kind: 'bracket', op: '−', q: `${a} − () = ${c}`, a: a - c };
  }
  if (kind < 0.8) {
    // () − b = c（差＋减数 ≤ 20）
    const b = 1 + ri(10);
    const c = ri(21 - b);
    return { kind: 'bracket', op: '−', q: `() − ${b} = ${c}`, a: c + b };
  }
  // c = a + ()（数的分与合，c ≤ 10）
  const c = 2 + ri(9);
  const a = 1 + ri(c - 1);
  return { kind: 'bracket', op: '+', q: `${c} = ${a} + ()`, a: c - a };
}
// 应用题模板池（2026-11-09，任务表 78）：只参考小红书每日一练的题型结构（计算/括号/应用），
// 模板措辞均为原创（换场景、换数字），不照抄笔记原题；看图列算式不加（要配图，程序化出不了）。
// 每条：gen(ri) -> { zh, en, a, nums }，nums 为代入数字（按题意顺序）；solve(nums) 供测试重算答案。
// 年级口径：一年级只用 20 以内加减；三年级用表内乘除与两位数加减，不超纲。
const DAILY_MATH_WORD_G1 = [
  { id: 'g1-candy', op: '−',
    gen: (ri) => {
      const total = 6 + ri(10);
      const eaten = 1 + ri(total - 1);
      return { zh: `小红有 ${total} 颗糖，吃了 ${eaten} 颗，还剩几颗？`, en: `Xiaohong has ${total} candies. She eats ${eaten}. How many are left?`, a: total - eaten, nums: [total, eaten] };
    },
    solve: (n) => n[0] - n[1] },
  { id: 'g1-pencil', op: '+',
    gen: (ri) => {
      const first = 2 + ri(9);
      const more = 2 + ri(19 - first);
      return { zh: `盒子里有 ${first} 支铅笔，又放进 ${more} 支，一共有几支？`, en: `There are ${first} pencils in the box. ${more} more are put in. How many are there now?`, a: first + more, nums: [first, more] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g1-fish', op: '+',
    gen: (ri) => {
      const left = 2 + ri(9);
      const eaten = 1 + ri(19 - left);
      return { zh: `小猫钓了一些鱼，吃了 ${eaten} 条，还剩 ${left} 条，原来钓了几条？`, en: `A cat caught some fish. It ate ${eaten} and ${left} are left. How many did it catch?`, a: left + eaten, nums: [left, eaten] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g1-car', op: '+',
    gen: (ri) => {
      const front = 2 + ri(9);
      const back = 2 + ri(19 - front);
      return { zh: `停车场前面停了 ${front} 辆车，后面停了 ${back} 辆，一共有几辆？`, en: `There are ${front} cars in the front row and ${back} cars in the back row. How many cars are there in all?`, a: front + back, nums: [front, back] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g1-apple', op: '−',
    gen: (ri) => {
      const total = 5 + ri(11);
      const red = 1 + ri(total - 1);
      return { zh: `一共有 ${total} 个苹果，红苹果有 ${red} 个，绿苹果有几个？`, en: `There are ${total} apples. ${red} are red. How many are green?`, a: total - red, nums: [total, red] };
    },
    solve: (n) => n[0] - n[1] },
];
const DAILY_MATH_WORD_G3 = [
  { id: 'g3-pen', op: '×',
    gen: (ri) => {
      const per = 2 + ri(8), boxes = 2 + ri(8);
      return { zh: `每盒有 ${per} 支笔，买了 ${boxes} 盒，一共有几支？`, en: `Each box has ${per} pens. There are ${boxes} boxes. How many pens are there in all?`, a: per * boxes, nums: [per, boxes] };
    },
    solve: (n) => n[0] * n[1] },
  { id: 'g3-apple', op: '÷',
    gen: (ri) => {
      const kids = 2 + ri(8), each = 2 + ri(8);
      return { zh: `${kids * each} 个苹果平均分给 ${kids} 个小朋友，每人分几个？`, en: `${kids * each} apples are shared equally among ${kids} children. How many does each child get?`, a: each, nums: [kids * each, kids] };
    },
    solve: (n) => n[0] / n[1] },
  { id: 'g3-car', op: '×',
    gen: (ri) => {
      const per = 2 + ri(8), cars = 2 + ri(8);
      return { zh: `一辆车坐 ${per} 人，${cars} 辆车一共坐几人？`, en: `One car seats ${per} people. How many people can ${cars} cars seat?`, a: per * cars, nums: [per, cars] };
    },
    solve: (n) => n[0] * n[1] },
  { id: 'g3-book', op: '+',
    gen: (ri) => {
      const morning = 10 + ri(51), afternoon = 10 + ri(51);
      return { zh: `上午卖了 ${morning} 本书，下午卖了 ${afternoon} 本，全天一共卖了几本？`, en: `${morning} books were sold in the morning and ${afternoon} in the afternoon. How many were sold in all?`, a: morning + afternoon, nums: [morning, afternoon] };
    },
    solve: (n) => n[0] + n[1] },
  { id: 'g3-shelf', op: '−',
    gen: (ri) => {
      const total = 100 + ri(201), borrowed = 10 + ri(90);
      return { zh: `书架上有 ${total} 本书，借走了 ${borrowed} 本，还剩几本？`, en: `There are ${total} books on the shelf. ${borrowed} are borrowed. How many are left?`, a: total - borrowed, nums: [total, borrowed] };
    },
    solve: (n) => n[0] - n[1] },
];
// 应用题：从年级模板池随机抽一条，数字由种子填入；q 为中文题干，qEn 为英文题干。
function genMathWord(gradeNum, rng) {
  const ri = (n) => Math.floor(rollRng(rng) * n);
  const pool = gradeNum === 3 ? DAILY_MATH_WORD_G3 : DAILY_MATH_WORD_G1;
  const tpl = pool[Math.floor(rollRng(rng) * pool.length)];
  const r = tpl.gen(ri);
  return { kind: 'word', op: tpl.op, q: r.zh, qEn: r.en, a: r.a, tpl: tpl.id, nums: r.nums };
}
/* 题库题池（阶段一：numeric）：题 → 主题年级与映射章节顺序值；模块加载时算一次，顺序＝数据文件顺序（确定性）。 */
let _mathBankPool = null;
function mathBankPool() {
  if (_mathBankPool) return _mathBankPool;
  const topicById = new Map(MATH_BANK_TOPICS.map((t) => [t.id, t]));
  _mathBankPool = [];
  for (const q of MATH_BANK_QUESTIONS) {
    const t = topicById.get(q.topicId);
    const ord = t ? chapterOrder(t.bsChapter) : null;
    if (ord != null) _mathBankPool.push({ q, grade: t.grade, ord });
  }
  return _mathBankPool;
}
/* 孩子当前数学进度的顺序值（同 loadMathGate：进度未设/不在年级章节表内 → 默认上册第 2 单元）；读不到返回 undefined。 */
async function dailyMathProgressOrd(db, child) {
  try {
    const gate = await loadMathGate(db, child);
    return gate ? gate.ord : undefined;
  } catch (e) { return undefined; }
}
/* progressOrd＝孩子数学进度的章节顺序值，题库题只取映射章节顺序值 ≤ 它的主题（绝不超前）。
 * 缺省（undefined/null）按该年级默认进度（上册第 2 单元）算，宁可窄不超前。
 * 题库题选择＝(child, date, progress) 的纯函数：独立种子 `${child.id}:math-bank:${dateStr}` 从池（数据文件顺序）里取 1 题；
 * 池空则退回 3 口算＋1 括号＋1 应用题（与题库上线前完全一致，不出空题）。 */
function dailyMathTodayFor(child, dateStr, progressOrd) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  if (gradeNum !== 1 && gradeNum !== 3) return { error: 'NO_POOL' };
  const rng = mulberry32(dailyEnglishHash32(`${child.id}:math:${dateStr}`));
  const maxOrd = progressOrd == null ? chapterOrder(defaultMathChapter(gradeNum)) : progressOrd;
  const pool = mathBankPool().filter((e) => e.grade === gradeNum && e.ord <= maxOrd);
  let bank = null;
  if (pool.length) {
    const brng = mulberry32(dailyEnglishHash32(`${child.id}:math-bank:${dateStr}`));
    bank = pool[Math.floor(rollRng(brng) * pool.length)].q;
  }
  // 构成固定：2 道口算＋1 道括号填数＋1 道应用题＋1 道题库题；池空时题库位退回 1 道口算（3＋1＋1）。位置由种子打乱（同孩同日恒定）
  const kinds = bank ? ['calc', 'calc', 'bracket', 'word', 'bank'] : ['calc', 'calc', 'calc', 'bracket', 'word'];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rollRng(rng) * (i + 1));
    const t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t;
  }
  const problems = kinds.map((kind, i) => {
    if (kind === 'bank') return { index: i, kind: 'bank', op: '', q: bank.prompt, a: Number(bank.answer), bankId: bank.id };
    if (kind === 'bracket') return { index: i, ...genMathBracket(gradeNum, rng) };
    if (kind === 'word') return { index: i, ...genMathWord(gradeNum, rng) };
    return { index: i, ...genMathProblem(gradeNum, rng), kind: 'calc' };
  });
  return { date: dateStr, problems };
}
async function dailyMathAnswers(db, childId, today) {
  try {
    const { results } = await db.prepare(
      'SELECT qindex, answer, correct FROM daily_math_answers WHERE child_id=? AND date_shanghai=?'
    ).bind(childId, today).all();
    const map = {};
    for (const r of results || []) map[Number(r.qindex)] = { answer: Number(r.answer), correct: Number(r.correct) === 1 };
    return map;
  } catch (e) { return {}; }
}
async function apiDailyMath(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const picked = dailyMathTodayFor(child, today, await dailyMathProgressOrd(db, child));
  if (picked.error) return json({ ok: false, error: picked.error }, 400);
  let done = null;
  const [doneR, careWheelChances, answers] = await Promise.all([
    (async () => { try { return await db.prepare('SELECT completed_epoch FROM daily_math_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(); } catch (e) { return null; } })(), /* 表未建：当未完成 */
    careWheelChancesLeft(db, child.id),
    dailyMathAnswers(db, child.id, today),
  ]);
  done = doneR;
  // 刷新后答错反馈仍能显示正确答案：只给已答错的题附 correctAnswer（题面本身仍不带答案）
  for (const [k, v] of Object.entries(answers)) {
    const prob = picked.problems[Number(k)];
    if (v && !v.correct && prob) v.correctAnswer = prob.a;
  }
  const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
  // 题面下发不带答案（答案由种子重算核对）；应用题附英文题干 qEn，模板 id 与代入数字不下发
  const problems = picked.problems.map((p) => {
    const out = { index: p.index, q: p.q, op: p.op, kind: p.kind };
    if (p.qEn) out.qEn = p.qEn;
    return out;
  });
  return json({ ok: true, childId: child.id, date: today, problems, answers, correctCount, passed: correctCount >= DAILY_MATH_PASS_COUNT, passCount: DAILY_MATH_PASS_COUNT, completed: !!done, completedEpoch: done ? done.completed_epoch : null, careWheelChances });
}
async function apiDailyMathAnswer(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const picked = dailyMathTodayFor(child, today, await dailyMathProgressOrd(db, child));
    if (picked.error) return json({ ok: false, error: picked.error }, 400);
    const idx = Number(body.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= picked.problems.length) return json({ ok: false, error: 'bad_index' }, 400);
    const ans = Number(body.answer);
    if (!Number.isFinite(ans)) return json({ ok: false, error: 'bad_answer' }, 400);
    // 已完成打卡：锁定，不再接受作答
    let done = null;
    const [doneR, answers] = await Promise.all([
      (async () => { try { return await db.prepare('SELECT completed_epoch FROM daily_math_logs WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(); } catch (e) { return null; } })(),
      dailyMathAnswers(db, child.id, today),
    ]);
    done = doneR;
    if (done) return json({ ok: false, error: 'completed' }, 400);
    if (Object.hasOwn(answers, idx)) {
      const cur = answers[idx];
      const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
      return json({ ok: true, index: idx, answer: cur.answer, correct: cur.correct, correctCount, passed: correctCount >= DAILY_MATH_PASS_COUNT, already: true });
    }
    const prob = picked.problems[idx];
    const correct = ans === prob.a;
    const now = Math.floor(Date.now() / 1000);
    try {
      await db.prepare(
        'INSERT INTO daily_math_answers(child_id, date_shanghai, qindex, answer, correct, answered_epoch) VALUES(?,?,?,?,?,?)'
      ).bind(child.id, today, idx, ans, correct ? 1 : 0, now).run();
    } catch (e) { console.error('daily math record answer failed', e); }
    const answers2 = await dailyMathAnswers(db, child.id, today);
    const correctCount = Object.values(answers2).filter((x) => x && x.correct).length;
    return json({ ok: true, index: idx, answer: ans, correct, correctAnswer: correct ? undefined : prob.a, correctCount, passed: correctCount >= DAILY_MATH_PASS_COUNT });
  });
}
async function apiDailyMathCheckin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const answers = await dailyMathAnswers(db, child.id, today);
    const correctCount = Object.values(answers).filter((x) => x && x.correct).length;
    if (correctCount < DAILY_MATH_PASS_COUNT) return json({ ok: false, error: 'NOT_PASSED', correctCount, needed: DAILY_MATH_PASS_COUNT });
    const now = Math.floor(Date.now() / 1000);
    await db.prepare('INSERT OR IGNORE INTO daily_math_logs(child_id, date_shanghai, completed_epoch) VALUES(?,?,?)').bind(child.id, today, now).run();
    const careWheelGranted = await grantCareWheelChance(db, child.id, 'daily-math', today, today, now);
    const careWheelChances = await careWheelChancesLeft(db, child.id);
    return json({ ok: true, childId: child.id, date: today, completed: true, careWheelGranted, careWheelChances });
  });
}


/* -------- Oak 讯飞评测（流式版，2026-11-03 Azure 取消后替代 Azure 发音评估） --------
 * 浏览器本来就传 16k 单声道 PCM16 WAV（前端 oakEncodeWav16），与讯飞要求一致，
 * Worker 只需剥掉 WAV 头、经 WebSocket 中转到 ise-api.xfyun.cn。
 * 评分映射（先按现行口径，孩子实测后再看要不要重调）：
 *   pron = 讯飞 read_sentence.total_score；acc/flu/comp/pros 依次对应
 *   accuracy/fluency/integrity/standard（讯飞无独立韵律分，标准度作近似）；
 *   星级沿用 oakStarsFromPron（85 分线不动）；词级 dp_message 按文档映射回
 *   前端认识的 err（Omission/Insertion 等）。
 * 音频帧字段名按文档数据表取 data（响应侧 data.data 同名佐证），首个实测若报
 * 参数错误再改 audio。 */

/* WAV → 裸 PCM：扫描 chunk 找 data 段（前端写标准 44 字节头，但容忍附加 chunk）。 */
function iflytekWavToPcm(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 44) return null;
  const tag = (o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let off = 12;
  while (off + 8 <= b.length) {
    const size = (b[off + 4] | (b[off + 5] << 8) | (b[off + 6] << 16) | (b[off + 7] << 24)) >>> 0;
    if (tag(off) === 'data') return b.slice(off + 8, Math.min(b.length, off + 8 + size));
    off += 8 + size + (size % 2);
  }
  return null;
}

function iflytekB64encode(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

function iflytekB64decodeUtf8(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (_) { return ''; }
}

/* HMAC-SHA256 签名：signature_origin = "host: <host>\ndate: <RFC1123>\nGET <path> HTTP/1.1"。
 * 默认评测地址（ise-api.xfyun.cn/v2/open-ise）；合成传 tts-api.xfyun.cn/v2/tts。 */
async function iflytekSignature(apiSecret, dateStr, host = 'ise-api.xfyun.cn', path = '/v2/open-ise') {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const origin = `host: ${host}\ndate: ${dateStr}\nGET ${path} HTTP/1.1`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(origin));
  return iflytekB64encode(new Uint8Array(sig));
}

async function iflytekAuthUrl(appId, apiKey, apiSecret, host = 'ise-api.xfyun.cn', path = '/v2/open-ise') {
  const dateStr = new Date().toUTCString();
  const signature = await iflytekSignature(apiSecret, dateStr, host, path);
  const authorization = btoa(`api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`);
  return `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(dateStr)}&host=${host}`;
}

function iflytekDpToErr(dp) {
  switch (Number(dp)) {
    case 16: return 'Omission';
    case 32: return 'Insertion';
    case 64: return 'Repetition';
    case 128: return 'Mispronunciation';
    default: return 'None';
  }
}

/* 解析讯飞最终结果 XML（read_sentence 节点＋ word 节点），无有效总分返回 null。 */
function iflytekParseResultXml(xml) {
  if (!xml || typeof xml !== 'string') return null;
  // 真实引擎结构（2026-11-04 实测）：<xml_result><read_sentence><rec_paper><read_chapter …>，
  // 分数在内层 read_chapter 上（0–5 分制），不在外层 read_sentence 上；旧手写测试 XML
  // 的分数在 read_sentence 上，兼容两者。乱说拒识（is_rejected=true）时分数不可信，返回 null。
  const node = xml.match(/<read_chapter\b([^>]*)>/) || xml.match(/<read_sentence\b([^>]*)>/);
  if (!node) return null;
  if (/is_rejected="true"/.test(xml)) return null;
  const attrs = {};
  for (const [, k, v] of node[1].matchAll(/([a-z_]+)="([^"]*)"/g)) attrs[k] = v;
  const raw = parseFloat(attrs.total_score);
  if (!Number.isFinite(raw)) return null;
  const scale = raw <= 5 ? 20 : 1;
  const r1 = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * scale * 10) / 10 : null; };
  const words = [];
  for (const wm of xml.matchAll(/<word\b([^>]*)\/?>/g)) {
    const wa = {};
    for (const [, k, v] of wm[1].matchAll(/([a-z_]+)="([^"]*)"/g)) wa[k] = v;
    if (!wa.content) continue;
    words.push({ w: wa.content, score: r1(wa.total_score), err: iflytekDpToErr(wa.dp_message) });
  }
  return { pron: r1(attrs.total_score), acc: r1(attrs.accuracy_score), flu: r1(attrs.fluency_score),
    comp: r1(attrs.integrity_score), pros: r1(attrs.standard_score), words };
}

async function iflytekAssess(pcm, refText, env, opts) {
  const appId = env.IFLYTEK_APPID, apiKey = env.IFLYTEK_API_KEY, apiSecret = env.IFLYTEK_API_SECRET;
  if (!appId || !apiKey || !apiSecret) return { ok: false, error: 'not_configured' };
  let url;
  try { url = await iflytekAuthUrl(appId, apiKey, apiSecret); }
  catch (_) { return { ok: false, error: 'network' }; }
  // 语言：默认英文（en_vip）；中文每日语文传 { lang: 'zh' } → cn_vip。
  const ent = opts && opts.lang === 'zh' ? 'cn_vip' : 'en_vip';
  return new Promise((resolve) => {
    let ws = null, done = false, timer = null;
    const finish = (r) => {
      if (done) return;
      done = true;
      if (timer !== null) clearTimeout(timer);
      try { ws && ws.close(1000); } catch (_) {}
      resolve(r);
    };
    timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), 25000);
    try { ws = new WebSocket(url); }
    catch (_) { return finish({ ok: false, error: 'network' }); }
    ws.addEventListener('open', () => {
      try {
        ws.send(JSON.stringify({ common: { app_id: appId },
          business: { sub: 'ise', ent, category: 'read_sentence', cmd: 'ssb',
            text: '\uFEFF' + refText, tte: 'utf-8', ttp_skip: true, aue: 'raw',
            auf: 'audio/L16;rate=16000', rst: 'entirety', rstcd: 'utf8' },
          data: { status: 0 } }));
        const CH = 1280;
        for (let off = 0; off < pcm.length; off += CH) {
          const chunk = pcm.slice(off, off + CH);
          const isLast = off + CH >= pcm.length;
          ws.send(JSON.stringify({ business: { cmd: 'auw', aus: isLast ? 4 : (off === 0 ? 1 : 2) },
            data: { status: isLast ? 2 : 1, data: iflytekB64encode(chunk) } }));
        }
      } catch (_) { finish({ ok: false, error: 'network' }); }
    });
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch (_) { return; }
      if (!msg || typeof msg !== 'object') return;
      if (msg.code !== 0) return finish({ ok: false, error: 'iflytek', status: msg.code ?? null });
      if (msg.data && msg.data.status === 2) {
        const parsed = iflytekParseResultXml(iflytekB64decodeUtf8(msg.data.data || ''));
        if (!parsed) return finish({ ok: false, error: 'not_recognized' });
        return finish({ ok: true, ...parsed });
      }
    });
    ws.addEventListener('error', () => finish({ ok: false, error: 'network' }));
    ws.addEventListener('close', () => finish({ ok: false, error: 'network' }));
  });
}

/* Azure 语音评测（REST，备线）：与讯飞同一返回形状，便于主备切换。
 * 区域 env.AZURE_SPEECH_REGION，默认 southeastasia（新资源 Taobuilds-speech1 所在区）；
 * 密钥 env.AZURE_SPEECH_KEY（Worker 机密，用户在控制台粘贴；与已失效的 SPEECH_KEY
 * 区分命名，避免旧密钥残留混淆）。音频直接传浏览器原 WAV（Azure 接受整段 WAV，
 * 与讯飞需剥头 PCM 不同）。 */
async function azureAssess(audio, refText, env, opts) {
  const key = env.AZURE_SPEECH_KEY;
  if (!key) return { ok: false, error: 'not_configured' };
  const region = env.AZURE_SPEECH_REGION || 'southeastasia';
  // 语言：默认 en-US；中文每日语文传 { lang: 'zh' } → zh-CN。
  const lang = opts && opts.lang === 'zh' ? 'zh-CN' : 'en-US';
  const config = {
    ReferenceText: refText, GradingSystem: 'HundredMark', Granularity: 'Word',
    Dimension: 'Comprehensive', EnableMiscue: true, EnableProsodyAssessment: true,
  };
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(config))));
  const controller = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? null : new AbortController();
  const signal = controller ? controller.signal : AbortSignal.timeout(25000);
  const timer = controller ? setTimeout(() => controller.abort(), 25000) : null;
  let azRes, data;
  try {
    azRes = await fetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=detailed`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': encoded, Accept: 'application/json',
      },
      body: audio, signal,
    });
    if (signal.aborted) return { ok: false, error: 'timeout' };
    if (azRes.status !== 200) return { ok: false, error: 'azure', status: azRes.status };
    try { data = await azRes.json(); } catch (_) { return { ok: false, error: 'bad_json' }; }
  } catch (e) {
    if (signal.aborted || e.name === 'AbortError' || e.name === 'TimeoutError') return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network' };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'bad_json' };
  if (data.RecognitionStatus !== 'Success') return { ok: false, error: 'not_recognized', status: data.RecognitionStatus ?? null };
  const best = Array.isArray(data.NBest) ? data.NBest[0] : null;
  if (!best) return { ok: false, error: 'not_recognized', status: 'NoResult' };
  const r1 = (v) => typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
  const paN = best.PronunciationAssessment || {};
  const score = (k) => r1(paN[k] ?? best[k]);
  const words = (Array.isArray(best.Words) ? best.Words : []).map((w) => {
    const wpa = (w && w.PronunciationAssessment) || {};
    return { w: String(w?.Word ?? ''), score: r1(wpa.AccuracyScore ?? w?.AccuracyScore), err: (wpa.ErrorType ?? w?.ErrorType) || 'None' };
  });
  return { ok: true, pron: score('PronScore'), acc: score('AccuracyScore'),
    flu: score('FluencyScore'), comp: score('CompletenessScore'), pros: score('ProsodyScore'), words };
}

/* 发音评测主备（讯飞主、Azure 备；Oak 与每日英语共用）：只对供应商错误切换，not_recognized 是评测结论、不切换。
 * 返回 { ok:true, res, provider } 或 { ok:false, error, status }。
 * error: 'not_configured' | 'timeout' | 'iflytek' | 'azure' | 'bad_json' | 'network' | 'not_recognized' */
async function assessPronWithFailover(audio, pcm, refText, env, opts) {
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return { ok: false, error: 'not_configured' };
  // 中文（2026-11-17）：讯飞 cn_vip 对中文识别不稳（同一音频可 84 分也可 not_recognized，
  // 11-16 两孩分别 4 次、3 次才拿到分，11-17 全失败），中文改 Azure 为主、讯飞为备；
  // 英文保持讯飞主、Azure 备。
  const chineseFirst = opts && opts.lang === 'zh';
  const attempts = [];
  if (chineseFirst) {
    if (hasAzure) attempts.push(['azure', () => azureAssess(audio, refText, env, opts)]);
    if (hasIflytek) attempts.push(['iflytek', () => iflytekAssess(pcm, refText, env, opts)]);
  } else {
    if (hasIflytek) attempts.push(['iflytek', () => iflytekAssess(pcm, refText, env, opts)]);
    if (hasAzure) attempts.push(['azure', () => azureAssess(audio, refText, env, opts)]);
  }
  let res = null, provider = null, firstErr = null;
  // 中文（2026-11-09）：讯飞 cn_vip 对中文识别不稳（同一音频可 84 分也可 not_recognized），
  // not_recognized 也继续试 Azure 备线；英文保持原策略（not_recognized 不切换）。
  const chineseRetry = opts && opts.lang === 'zh';
  for (let i = 0; i < attempts.length; i++) {
    const [name, run] = attempts[i];
    const r = await run();
    if (r.ok) { res = r; provider = name; break; }
    if (r.error === 'not_recognized') {
      if (chineseRetry && i < attempts.length - 1) { if (!firstErr) firstErr = r; continue; }
      res = r; break;
    }
    if (!firstErr) firstErr = r;
  }
  if (!res) {
    const e = firstErr || { error: 'network' };
    return { ok: false, error: e.error, status: e.status ?? null };
  }
  if (!res.ok) return { ok: false, error: 'not_recognized' };
  if (provider && firstErr) console.warn('pron failover', chineseFirst ? 'azure->iflytek' : 'iflytek->azure', firstErr?.error ?? null);
  return { ok: true, res, provider };
}

async function apiOakAssess(db, req, session, env) {
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405, { Allow: 'POST' });
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 未配 key 用 200 + ok:false（不用 503）：前端在 !response.ok 时直接抛通用报错、读不到 body，
  // 友好提示“AI 点评还没开通”永远走不到；与 not_recognized 的 200 惯例一致。
  // 主备：讯飞主、Azure 备；任一未配都跳过该线，两线全无才 not_configured。
  const hasIflytek = !!(env.IFLYTEK_APPID && env.IFLYTEK_API_KEY && env.IFLYTEK_API_SECRET);
  const hasAzure = !!env.AZURE_SPEECH_KEY;
  if (!hasIflytek && !hasAzure) return json({ ok: false, error: 'not_configured' });
  const ctype = (req.headers.get('Content-Type') || '').toLowerCase().trim();
  if (!ctype.startsWith('audio/wav')) return json({ ok: false, error: 'bad_type' }, 415);
  let refText;
  try {
    refText = decodeURIComponent(req.headers.get('x-ref-text') ?? '');
  } catch (_) {
    return json({ ok: false, error: 'bad_ref' }, 400);
  }
  if (refText.length < 1 || refText.length > 200) return json({ ok: false, error: 'bad_ref' }, 400);
  const group = await oakGroupForChild(db, child, shDateStr());
  if (!group.sentences.some((s) => s.en === refText)) return json({ ok: false, error: 'bad_ref' }, 400);
  let audio;
  try {
    audio = await req.arrayBuffer();
  } catch (_) {
    return json({ ok: false, error: 'bad_size' }, 413);
  }
  if (audio.byteLength < 1000 || audio.byteLength > 3145728) return json({ ok: false, error: 'bad_size' }, 413);
  const pcm = iflytekWavToPcm(audio);
  if (!pcm || pcm.length < 100) return json({ ok: false, error: 'bad_size' }, 413);
  // 主备切换走共用 helper（讯飞主、Azure 备；只对供应商错误切换，not_recognized 是评测结论、不切换、不重复计分）。
  const assessed = await assessPronWithFailover(audio, pcm, refText, env);
  if (!assessed.ok) {
    if (assessed.error === 'not_configured') return json({ ok: false, error: 'not_configured' });
    if (assessed.error === 'timeout') return json({ ok: false, error: 'timeout' }, 504);
    if (assessed.error === 'iflytek') return json({ ok: false, error: 'iflytek', status: assessed.status ?? null }, 502);
    if (assessed.error === 'azure') return json({ ok: false, error: 'azure', status: assessed.status ?? null }, 502);
    if (assessed.error === 'bad_json') return json({ ok: false, error: 'bad_json' }, 502);
    if (assessed.error === 'not_recognized') return json({ ok: false, error: 'not_recognized' });
    return json({ ok: false, error: 'network' }, 502);
  }
  const res = assessed.res, provider = assessed.provider;
  const pron = res.pron;
  // 记成绩＋够格发普通转盘机会（发机会失败不影响点评本身返回）
  const q = group.sentences.find((s) => s.en === refText);
  let rec = { stars: oakStarsFromPron(pron), fiveStarCount: 0, fourStarCount: 0, fiveStarTotal: group.sentences.length, assessedCount: 0, drawGranted: false, justGranted: false };
  try {
    rec = await oakRecordAssessAndMaybeDraw(db, child, shDateStr(), group, q.id, pron);
  } catch (e) { console.error('oak draw failed', e); }
  /* MP-15 §2（4×5★+2×4★）：跟读可能落下最后一块拼图（听完 6 句且 6 句均 ≥4★、
   * 其中 ≥4 句 ≥5★）。满足时把最后一句的 quiz_attempts 行 xp_awarded 翻成 quizXp
   * 并发经验；UPDATE 守卫（WHERE xp_awarded=0）保证只发一次——重复跟读、重复调用都不会再发。 */
  let completed = false, xpAwarded = 0;
  try {
    const total = group.sentences.length;
    completed = total > 0 && group.listenedCount >= total
      && (rec.fourStarCount || 0) >= total
      && (rec.fiveStarCount || 0) >= Math.min(OAK_DRAW_MIN_FIVE_STAR, total);
    if (completed) {
      const quizXp = Number(await getEffSetting(db, child.family_id, 'quiz_xp')) || 10;
      const lastId = group.sentences[total - 1].id;
      try {
        const up = await db.prepare(
          'UPDATE quiz_attempts SET xp_awarded=? WHERE child_id=? AND question_id=? AND date_shanghai=? AND xp_awarded=0'
        ).bind(quizXp, child.id, lastId, shDateStr()).run();
        if ((up?.meta?.changes ?? 0) > 0) {
          xpAwarded = quizXp;
          const xpInfo = await grantXp(db, child, quizXp, shDateStr());
          await pushEvoNotices(db, child.id, xpInfo);
        }
      } catch (e) { console.error('oak assess xp update failed', e); }
    }
  } catch (e) { console.error('oak assess completion failed', e); }
  return json({ ok: true, pron, acc: res.acc,
    flu: res.flu, comp: res.comp, pros: res.pros, words: res.words, provider,
    stars: rec.stars, fiveStarCount: rec.fiveStarCount, fourStarCount: rec.fourStarCount, fiveStarTotal: rec.fiveStarTotal,
    assessedCount: rec.assessedCount,
    completed, xpAwarded, listenedCount: group.listenedCount,
    drawGranted: !!rec.drawGranted, justGranted: !!rec.justGranted });
}

async function apiOakListen(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const questionId = Number(body.question_id ?? body.questionId);
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  // Fable 优化 #3：本请求所需的设置一次取齐（english_mode、english_progress、quiz_xp）
  const S = await loadHotSettings(db, child.family_id, [
    'english_mode', `english_progress_${child.id}`, 'quiz_xp',
  ]);
  const group = await oakGroupForChild(db, child, today, S);
  const q = group.sentences.find((s) => s.id === questionId);
  if (!q) return json({ ok: false, error: '这句不在今天的大木博士英语里' }, 400);
  const idx = group.sentences.indexOf(q);
  if (!GATES_OPEN_FULL && idx !== group.listenedCount) {
    return json({ ok: false, error: '要按顺序听哦，先听第 ' + (group.listenedCount + 1) + ' 句' }, 400);
  }
  const quizXp = Number(((S.has('quiz_xp')) ? S.get('quiz_xp') : await getEffSetting(db, child.family_id, 'quiz_xp')) || 10);
  /* 完成判定以当日实际集长为准（2026-11-13：补句前 5 句集的最后一句 idx=4 即完成；
   * 旧写法用 OAK_GROUP_SIZE-1，5 句集永远走不到完成、也不发 10 XP；现行补句逻辑已把
   * 集长补到 6，此处仍按实际长度算，作候选取完时的兜底）。 */
  const lastIdx = group.sentences.length - 1;
  /* 任务 124：放行时先删当日旧作答（唯一约束 ux_quiz_attempt）。 */
  if (GATES_OPEN_FULL) {
    await db.prepare('DELETE FROM quiz_attempts WHERE child_id=? AND question_id=? AND date_shanghai=?').bind(childId, questionId, today).run();
  }
  /* MP-15 §2（4×5★+2×4★）：最后一句先记 xp_awarded=0；只有当新规则（听完 6 句且
   * 6 句跟读均 ≥4★、其中 ≥4 句 ≥5★）满足时才把最后一句的行翻成 quizXp并发经验
   * （UPDATE 守卫保证只发一次）。 */
  const ins = await db.prepare(
    'INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch) VALUES(?,?,?,?,?,?,?)'
  ).bind(
    childId, questionId, today, 1, 0, 0, Math.floor(Date.now()/1000)
  ).run();
  if (!ins.meta || !ins.meta.changes) return json({ ok: false, error: '这句今天已经听过啦' }, 400);
  // 本次听完后的最新状态（跟读数不受 listen 影响，但 GATES_OPEN_FULL 下乱序听时 listenedCount 须重算）
  const group2 = await oakGroupForChild(db, child, today, S);
  const completed = group2.completed;
  let xpInfo = null;
  let xpAwarded = 0;
  if (completed) {
    const lastId = group.sentences[lastIdx].id;
    try {
      const up = await db.prepare(
        'UPDATE quiz_attempts SET xp_awarded=? WHERE child_id=? AND question_id=? AND date_shanghai=? AND xp_awarded=0'
      ).bind(quizXp, childId, lastId, today).run();
      if ((up?.meta?.changes ?? 0) > 0) {
        xpAwarded = quizXp;
        xpInfo = await grantXp(db, child, quizXp, today);
        await pushEvoNotices(db, child.id, xpInfo);
      }
    } catch (e) { console.error('oak listen xp update failed', e); }
  }
  return json({
    ok: true, listened: true, sentenceIdx: idx + 1, completed,
    xpAwarded, listenedCount: group2.listenedCount,
    level: xpInfo ? {
      oldLevel: xpInfo.oldLevel, newLevel: xpInfo.newLevel,
      levelsGained: xpInfo.levelsGained, newMoves: xpInfo.newMoves,
      evolved: xpInfo.evolved,
    } : null,
  });
}

/* -------- 家长 · 题目管理 -------- */

function quizRowForParent(r) {
  return {
    id: r.id, kind: r.kind, grade: r.grade,
    gradeLabel: r.grade === 1 ? '一年级' : r.grade === 3 ? '三年级' : '通用',
    subject: r.subject, question: r.question, options: safeJsonArr(r.options_json),
    answer_idx: r.answer_idx, explain: r.explain || '', active: r.active !== 0,
    isCustom: !!r.is_custom, hasPhoto: !!r.photo_key,
  };
}

async function apiParentQuestions(db) {
  const { results } = await db.prepare('SELECT * FROM quiz_questions ORDER BY id').all();
  const n = (f) => results.filter(f).length;
  return json({
    ok: true,
    stats: {
      riddle: n((r) => r.kind === 'riddle' && r.active !== 0),
      grade1: n((r) => r.kind === 'study' && r.grade === 1 && r.active !== 0),
      grade3: n((r) => r.kind === 'study' && r.grade === 3 && r.active !== 0),
      custom: n((r) => r.kind === 'custom' && r.active !== 0),
      total: n((r) => r.active !== 0),
    },
    questions: results.filter((r) => r.is_custom).map(quizRowForParent),
  });
}

/* 109-A: 拍照识题（Workers AI）—— parseOcrDraft 为纯函数，可单测；
 * apiParentQuestionOcr 先落 R2 再调 AI，失败保留照片；apiQuizPhoto 仅当日题单可读。 */
function parseOcrDraft(text) {
  const fail = { ok: false, error: '识别结果不是一道完整的选择题' };
  let obj = null;
  if (text && typeof text === 'object' && !Array.isArray(text)) {
    // 模型有时直接返回结构化对象（非 JSON 文本），直接校验
    obj = text;
  } else {
    if (typeof text !== 'string' || !text.trim()) return fail;
    let raw = text.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    }
    // 模型常在 JSON 后追加句号/多余文字：只取第一个 { 到最后一个 } 之间的内容
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return fail;
    raw = raw.slice(start, end + 1);
    try {
      obj = JSON.parse(raw);
    } catch {
      return fail;
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fail;
  if (typeof obj.question !== 'string') return fail;
  const question = obj.question.trim().slice(0, 300);
  if (!question) return fail;
  if (!Array.isArray(obj.options) || obj.options.length !== 4) return fail;
  const options = [];
  for (const item of obj.options) {
    if (typeof item !== 'string') return fail;
    const opt = item.trim().slice(0, 100);
    if (!opt) return fail;
    options.push(opt);
  }
  const idx = obj.answer_idx;
  const validIdx = idx === null || (typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx <= 3);
  if (!validIdx) return fail;
  if (obj.explain !== undefined && obj.explain !== null && typeof obj.explain !== 'string') return fail;
  const explain = typeof obj.explain === 'string' ? obj.explain.trim().slice(0, 300) : '';
  return { ok: true, draft: { question, options, answer_idx: idx, explain } };
}

const OCR_QUESTION_PROMPT = 'You are transcribing a printed Chinese school exercise photo into one multiple-choice question. Read ONLY what is printed in the image. Output ONLY a JSON object, no other text: {"question": "...", "options": ["...", "...", "...", "..."], "answer_idx": 0, "explain": "..."}. Rules: question is the full question text as printed (max 300 characters); options is exactly 4 options as printed, in order; answer_idx is 0-3 for the printed correct answer, or null if the photo shows no answer; explain is the printed explanation, or empty string if none. Do not invent a question, options or answer that is not in the image. If the image contains no complete multiple-choice question, output {"question": "", "options": [], "answer_idx": null, "explain": ""}.';

function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < u8.length; i += step) {
    bin += String.fromCharCode(...u8.subarray(i, i + step));
  }
  return btoa(bin);
}

async function apiParentQuestionOcr(db, env, req) {
  const body = await readJsonBody(req);
  let key = '';
  let dataUrl = '';

  if (body.photoKey !== undefined && body.photoKey !== null) {
    const rawKey = typeof body.photoKey === 'string' ? body.photoKey.trim() : '';
    if (!rawKey.startsWith('questions/') || rawKey.includes('..') || rawKey.length > 200) {
      return json({ ok: false, error: '照片找不到了，请重新拍照' }, 404);
    }
    if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通' }, 503);
    const obj = await env.PHOTOS.get(rawKey);
    if (!obj) return json({ ok: false, error: '照片找不到了，请重新拍照' }, 404);
    const ext = rawKey.split('.').pop()?.toLowerCase();
    const ct = obj.httpMetadata?.contentType
      || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const buf = await obj.arrayBuffer();
    key = rawKey;
    dataUrl = `data:${ct};base64,${bytesToBase64(buf)}`;
  } else if (body.photo) {
    const parsed = parsePhotosArg([body.photo]);
    if (parsed.err) return json({ ok: false, error: parsed.err }, 400);
    const item = (parsed.list || [])[0];
    if (!item || !item.bytes) return json({ ok: false, error: '请先上传题目照片' }, 400);
    if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通' }, 503);
    key = `questions/${crypto.randomUUID()}.${photoExt(item.contentType)}`;
    await photoPut(env, key, item.bytes, item.contentType);
    const b64 = item.base64 || bytesToBase64(item.bytes);
    dataUrl = `data:${item.contentType};base64,${b64}`;
  } else {
    return json({ ok: false, error: '请先上传题目照片' }, 400);
  }

  if (!env.AI) return json({ ok: false, error: 'AI 功能还没开通', photoKey: key }, 503);

  let out;
  try {
    out = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [{ role: 'user', content: [
        { type: 'text', text: OCR_QUESTION_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ] }],
      max_tokens: 1024,
    });
  } catch {
    return json({ ok: false, error: '识别失败，稍后再试', photoKey: key });
  }

  const draftRes = parseOcrDraft(out?.response || '');
  if (!draftRes.ok) {
    return json({ ok: false, error: '识别失败，稍后再试', photoKey: key });
  }
  const { question, options, answer_idx, explain } = draftRes.draft;
  return json({ ok: true, photoKey: key, question, options, answer_idx, explain });
}

async function apiQuizPhoto(db, env, req, id, session) {
  const row = await db.prepare('SELECT id, photo_key FROM quiz_questions WHERE id = ?').bind(id).first();
  if (!row || !row.photo_key) return new Response('Not Found', { status: 404 });
  const url = new URL(req.url);
  const sc = scopeChildId(session, url.searchParams.get('child_id'));
  if (sc.err) return sc.err;
  const today = shDateStr();
  const daily = await db.prepare(
    'SELECT question_ids FROM quiz_daily WHERE child_id = ? AND date_shanghai = ?'
  ).bind(sc.id, today).first();
  let todayIds = [];
  try {
    todayIds = daily?.question_ids ? JSON.parse(daily.question_ids) : [];
  } catch {
    todayIds = [];
  }
  if (!Array.isArray(todayIds) || !todayIds.map(Number).includes(Number(id))) {
    return new Response('Not Found', { status: 404 });
  }
  if (!env.PHOTOS) return new Response('Not Found', { status: 404 });
  const obj = await env.PHOTOS.get(row.photo_key);
  if (!obj) return new Response('Not Found', { status: 404 });
  const ext = row.photo_key.split('.').pop()?.toLowerCase();
  const ct = obj.httpMetadata?.contentType
    || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
  return new Response(obj.body, {
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

async function apiParentQuestionAdd(db, req) {
  const body = await readJsonBody(req);
  const question = String(body.question || '').trim().slice(0, 300);
  const options = Array.isArray(body.options) ? body.options.map((o) => String(o || '').trim().slice(0, 100)) : [];
  const answerIdx = Number(body.answer_idx ?? body.answerIndex);
  const explain = String(body.explain || '').trim().slice(0, 300);
  const subject = String(body.subject || '');
  const grade = (body.grade === null || body.grade === undefined || body.grade === '') ? null : Number(body.grade);
  if (!question) return json({ ok: false, error: '题目不能为空' }, 400);
  if (options.length !== 4 || options.some((o) => !o)) return json({ ok: false, error: '需要 4 个非空选项' }, 400);
  if (![0, 1, 2, 3].includes(answerIdx)) return json({ ok: false, error: '正确答案不对' }, 400);
  if (!QUIZ_SUBJECTS.includes(subject)) return json({ ok: false, error: '科目只能选 语文/数学/英语/阅读' }, 400);
  if (grade !== null && ![1, 3].includes(grade)) return json({ ok: false, error: '年级只能是 通用/一年级/三年级' }, 400);
   const rawPhotoKey = typeof body.photo_key === 'string' ? body.photo_key.trim() : '';
   const photoKey = (rawPhotoKey.startsWith('questions/') && !rawPhotoKey.includes('..') && rawPhotoKey.length <= 200)
     ? rawPhotoKey
     : null;
  const ins = await db.prepare(
    `INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,photo_key)
     VALUES('custom',?,?,?,?,?,?,1,1,?,?)`
  ).bind(grade, subject, question, JSON.stringify(options), answerIdx, explain, Math.floor(Date.now() / 1000), photoKey).run();
  if (ins.meta) {
    // quiz_questions 是全局题库：行 ver 写 0（touchRow 在 version 为 0 时跳过不写），只推全员版本
    await bumpAllChildrenVersions(db);
  }
  return json({ ok: true });
}

async function apiParentQuestionToggle(db, qid) {
  const r = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
  if (!r) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const next = r.active !== 0 ? 0 : 1;
  /* 入库标签规矩：重新激活时，数学学习题无章节标签或标签无法解析一律拒绝（fail-closed） */
  if (next === 1) {
    const err = questionActivationError(normalizeQuizRow(r));
    if (err) return json({ ok: false, error: err }, 400);
  }
  await db.prepare('UPDATE quiz_questions SET active=? WHERE id=?').bind(next, qid).run();
  await bumpAllChildrenVersions(db);
  return json({ ok: true, active: !!next });
}

async function apiParentQuestionDelete(db, env, qid) {
  const r = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
  if (!r) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (!r.is_custom) return json({ ok: false, error: '内置题不能删除，只能禁用' }, 400);
  await db.prepare('DELETE FROM quiz_questions WHERE id=?').bind(qid).run();
  if (r?.photo_key) await photoDelete(env, r.photo_key);
  await bumpAllChildrenVersions(db);
  return json({ ok: true });
}

/* 待展示通知（未 shown 的，按写入顺序） */
async function pendingNotices(db, childId) {  const { results } = await db.prepare(
    'SELECT * FROM child_notices WHERE child_id=? AND shown=0 ORDER BY id'
  ).bind(childId).all();
  return results.map((r) => {
    let payload = {};
    try { payload = JSON.parse(r.payload || '{}'); } catch { /* 损坏 payload 按空处理 */ }
    return { id: r.id, kind: r.kind, payload };
  });
}

/* 通知展示确认：child 会话只能确认自己的通知 */
async function apiNoticesAck(db, req, session) {
  const body = await readJsonBody(req);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!ids.length) return json({ ok: true, acked: 0 });
  const ph = ids.map(() => '?').join(',');
  if (session.kind === 'child') {
    await db.prepare(`UPDATE child_notices SET shown=1 WHERE child_id=? AND id IN (${ph})`)
      .bind(session.child_id, ...ids).run();
  } else {
    await db.prepare(`UPDATE child_notices SET shown=1 WHERE id IN (${ph})`).bind(...ids).run();
  }
  {
    const rows = (await db.prepare(`SELECT id, child_id FROM child_notices WHERE id IN (${ph})`).bind(...ids).all()).results || [];
    const verByChild = new Map();
    for (const r of rows) {
      if (!verByChild.has(r.child_id)) verByChild.set(r.child_id, await bumpChildVersion(db, r.child_id));
      await touchRow(db, 'child_notices', 'id=?', [r.id], verByChild.get(r.child_id));
    }
  }
  return json({ ok: true });
}

async function pendingEncounter(db, childId, today) {
  return db.prepare(
    "SELECT * FROM encounters WHERE child_id=? AND date=? AND status='pending' ORDER BY id DESC LIMIT 1"
  ).bind(childId, today).first();
}

/* 把某个打卡行的照片集合整体设为 list（保留 keepId 对应的旧行，删其余旧行，写入新照片）。
 * 调用前需保证 env.PHOTOS 可用（接口层先校验带照片时桶存在）。 */
async function setCheckinPhotos(db, env, checkinId, childId, date, list) {
  const { results: old } = await db.prepare('SELECT * FROM checkin_photos WHERE checkin_id=?').bind(checkinId).all();
  const keepIds = new Set(list.filter((p) => p.keepId).map((p) => p.keepId));
  // 先校验全部 keepId 归属再删旧图：校验不过时一张都不能删，避免失败请求吞掉已有照片
  for (const id of keepIds) {
    if (!old.some((o) => o.id === id)) throw new Error('PHOTO_NOT_OWNED');
  }
  const doomed = old.filter((o) => !keepIds.has(o.id));
  if (doomed.length) {
    const v = await bumpChildVersion(db, childId);
    for (const o of doomed) {
      await recordTombstone(db, childId, 'checkin_photos', o.id, v);
      await photoDelete(env, o.object_key);
      await db.prepare('DELETE FROM checkin_photos WHERE id=?').bind(o.id).run();
    }
  }
  const now = Math.floor(Date.now() / 1000);
  for (const p of list) {
    if (p.keepId) {
      if (!old.some((o) => o.id === p.keepId)) throw new Error('PHOTO_NOT_OWNED');
      continue;
    }
    const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = `checkins/${childId}/${date}/${checkinId}-${now}-${rand}.${photoExt(p.contentType)}`;
    await photoPut(env, key, p.bytes, p.contentType);
    const ins = await db.prepare('INSERT INTO checkin_photos(checkin_id, object_key, content_type, size, created_epoch) VALUES(?,?,?,?,?)')
      .bind(checkinId, key, p.contentType, p.bytes.length, now).run();
    if (ins.meta) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'checkin_photos', 'id=?', [Number(ins.meta.last_row_id)], v);
    }
  }
}

async function photosOfCheckin(db, checkinId) {
  const { results } = await db.prepare(
    'SELECT id, content_type, size FROM checkin_photos WHERE checkin_id=? ORDER BY id'
  ).bind(checkinId).all();
  return results.map((r) => ({ id: r.id, contentType: r.content_type, size: r.size }));
}

/* 批量取照片索引（家长队列/今日状态用）：Map(checkinId → [{id,...}])
 * D1 单条语句最多 100 个绑定参数（2026-11-06 同类审计：apiPendingReviews 的待审核
 * 列表无 LIMIT，两孩每天约 10 条、约 10 天不审就超 100 参数致家长审核页 500；
 * 与同日仓库 take 报 500 同一类问题；本地 node:sqlite 上限 999 故回归测不出来）。
 * 故按 id 分批查（每批 ≤50，留足余量），逐批合并。语义与原来一致：去重后每个
 * checkin_id 只出现在一批里，每只打卡的照片仍按 id 升序；调用方只用 map.get()，
 * map 的键插入顺序不影响结果。修 helper 一处，三个调用方（今日/历史/待审核）全受益。 */
async function photosByCheckin(db, checkinIds) {
  const map = new Map();
  if (!checkinIds.length) return map;
  const ids = [...new Set(checkinIds)];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const ph = batch.map(() => '?').join(',');
    const { results } = await db.prepare(
      `SELECT id, checkin_id, content_type, size FROM checkin_photos WHERE checkin_id IN (${ph}) ORDER BY id`
    ).bind(...batch).all();
    for (const r of results) {
      if (!map.has(r.checkin_id)) map.set(r.checkin_id, []);
      map.get(r.checkin_id).push({ id: r.id, contentType: r.content_type, size: r.size });
    }
  }
  return map;
}

/* 今日五科状态（孩子「今日」汇总与打卡页的数据源）：每科至多一行（唯一索引保证） */
async function todaySubjectsFor(db, childId, today) {
  const { results } = await db.prepare(
    'SELECT * FROM checkins WHERE child_id=? AND date=? AND subject IS NOT NULL'
  ).bind(childId, today).all();
  const bySubject = new Map(results.map((r) => [r.subject, r]));
  const pmap = await photosByCheckin(db, results.map((r) => r.id));
  return CHECKIN_SUBJECTS.map((subject) => {
    const r = bySubject.get(subject);
    if (!r) return { subject, checkin: null };
    return {
      subject,
      checkin: {
        id: r.id, status: r.status, note: r.note || '', isEarly: !!r.is_early,
        xpAwarded: r.xp_awarded, reason: r.reason || '', submittedAt: r.submitted_at,
        photos: pmap.get(r.id) || [],
      },
    };
  });
}

/* 图鉴已解锁种数（问候头卡四格之一） */
async function pokedexCountFor(db, childId) {
  const r = await db.prepare('SELECT COUNT(*) n FROM pokedex WHERE child_id=?').bind(childId).first();
  return r ? r.n : 0;
}

/* ---------------- API 处理 ---------------- */

/* ---------------- 登录接口（入口页用，公开） ---------------- */

/* PIN 校验（含失败计数与锁定），家长入口登录与应用内升级共用。
 * 返回 {ok:true} 或 {ok:false, error, status, retryAfter?, attemptsLeft?} */
async function checkPin(db, pin, familyId) {
  const now = Math.floor(Date.now() / 1000);
  if (familyId) { // 有自己 4 位二次 PIN 的家庭（开通邀请码建的新家庭）：按家庭计数、错 5 次锁 5 分钟；family #1 沿用全站 settings.pin
    let fam = null;
    try { fam = await db.prepare('SELECT pin2_hash FROM families WHERE id=?').bind(familyId).first(); } catch { fam = null; }
    if (fam && fam.pin2_hash) {
      const key = 'pin2|' + familyId;
      const left = await lockRemaining(db, key, now);
      if (left > 0) return { ok: false, error: 'PIN_LOCKED', retryAfter: left, status: 429 };
      if (safeEq(await sha256hex(String(pin || '')), fam.pin2_hash)) { await clearLoginFails(db, key); return { ok: true }; }
      const f = await recordLoginFail(db, key, now, PIN_LOCK_MAX, PIN_LOCK_SECS);
      if (f.locked) return { ok: false, error: 'PIN_LOCKED', retryAfter: PIN_LOCK_SECS, status: 429 };
      return { ok: false, error: 'PIN_WRONG', attemptsLeft: PIN_LOCK_MAX - f.fails, status: 401 };
    }
  }
  const lockedUntil = Number((await getSetting(db, 'pin_locked_until')) || 0);
  if (lockedUntil > now) {
    return { ok: false, error: 'PIN_LOCKED', retryAfter: lockedUntil - now, status: 429 };
  }
  const stored = await getSetting(db, 'pin');
  const h = await sha256hex(String(pin || ''));
  if (stored && h === stored) {
    await setSetting(db, 'pin_fail_count', '0');
    return { ok: true };
  }
  const fails = Number((await getSetting(db, 'pin_fail_count')) || 0) + 1;
  await setSetting(db, 'pin_fail_count', String(fails));
  if (fails >= PIN_LOCK_MAX) {
    await setSetting(db, 'pin_locked_until', String(now + PIN_LOCK_SECS));
    await setSetting(db, 'pin_fail_count', '0');
    return { ok: false, error: 'PIN_LOCKED', retryAfter: PIN_LOCK_SECS, status: 429 };
  }
  return { ok: false, error: 'PIN_WRONG', attemptsLeft: PIN_LOCK_MAX - fails, status: 401 };
}

async function apiParentLogin(db, req) {
  const body = await readJsonBody(req);
  const r = await checkPin(db, body.pin);
  if (!r.ok) return json({ ok: false, error: r.error, retryAfter: r.retryAfter, attemptsLeft: r.attemptsLeft }, r.status);
  const token = await createSession(db, 'parent', null);
  return json({ ok: true, role: 'parent' }, 200, { 'Set-Cookie': sessionCookie(token) });
}

/* 孩子登录：密码未设置 → PWD_NOT_SET（前端提示找家长设置）；
 * 按孩子分别计数，错 5 次锁 5 分钟（防兄弟互猜）。 */
async function apiChildLogin(db, req) {
  const body = await readJsonBody(req);
  const childId = Number(body.childId ?? body.child_id);
  const child = childId ? await getChild(db, childId) : null;
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (!child.pwd_hash) return json({ ok: false, error: 'PWD_NOT_SET' }, 403);
  const now = Math.floor(Date.now() / 1000);
  if ((child.pwd_locked_until || 0) > now) {
    return json({ ok: false, error: 'CHILD_LOCKED', retryAfter: child.pwd_locked_until - now }, 429);
  }
  const h = await sha256hex(String(body.password || ''));
  if (h !== child.pwd_hash) {
    // 原子自增再回读：旧快照回写在并发连点时计数不涨，失败锁定形同虚设
    await db.prepare('UPDATE children SET pwd_fail_count = pwd_fail_count + 1 WHERE id=?').bind(child.id).run();
    const fresh = await db.prepare('SELECT pwd_fail_count FROM children WHERE id=?').bind(child.id).first();
    const fails = fresh ? (fresh.pwd_fail_count || 0) : (child.pwd_fail_count || 0) + 1;
    if (fails >= PIN_LOCK_MAX) {
      await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=? WHERE id=?')
        .bind(now + PIN_LOCK_SECS, child.id).run();
      return json({ ok: false, error: 'CHILD_LOCKED', retryAfter: PIN_LOCK_SECS }, 429);
    }
    return json({ ok: false, error: 'PWD_WRONG', attemptsLeft: PIN_LOCK_MAX - fails }, 401);
  }
  await db.prepare('UPDATE children SET pwd_fail_count=0, pwd_locked_until=0 WHERE id=?').bind(child.id).run();
  const token = await createSession(db, 'child', child.id);
  return json({ ok: true, role: 'child', childId: child.id }, 200, { 'Set-Cookie': sessionCookie(token) });
}

async function apiLogout(db, req, session) {
  if (session) {
    await db.prepare('DELETE FROM sessions WHERE token=?').bind(session.token).run();
    try { await db.prepare('DELETE FROM parent_creds WHERE session_token=?').bind(session.token).run(); } catch { /* 无 0034 */ }
  }
  return json({ ok: true }, 200, {
    'Set-Cookie': 'famsess=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  });
}

/* ---------------- 账号系统（用户名＋6 位 PIN；用户系统 v2 第一步） ----------------
 * 表见迁移 0033：accounts / login_attempts / invite_codes / account_sessions。不改 children 表。
 * 登录凭证是 6 位数字 PIN（2026-11-16 起不再有密码），只用 WebCrypto PBKDF2-SHA256（沿用 pw_hash/salt 两列）（Workers 里不用 bcrypt），加盐、不存明文。
 * 登录失败统一提示 LOGIN_FAIL_MSG（不区分用户名不存在还是密码错）；按「用户名＋IP」连错 5 次锁 10 分钟（家长账号同样）。
 * 会话仍用 famsess（30 天）；孩子账号会话 kind='child' 绑 child_id，家长账号会话 kind='parent' 但 PIN 未验证（进家长管理要 PIN 二次确认）。
 * 初始 PIN（pw_changed_at 为空）登录后会话 kind='setpw'：只能调改 PIN 接口，改完才升级为正式会话。 */
const PBKDF2_ITER = 100000; // Workers WebCrypto 的 PBKDF2 迭代数上限
const ACCT_LOCK_MAX = 5;
const ACCT_LOCK_SECS = 600;
const SESSION_TTL_SECS = 2592000; // 30 天，与 cookie Max-Age 一致
const INVITE_TTL_SECS = 7 * 86400;
const LOGIN_FAIL_MSG = '用户名或 PIN 不对';
const DEFAULT_PIN = '000000'; // 家长重置账号 PIN 后的临时默认值（pw_changed_at 置空，首次登录强制自己改）
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const AVATAR_CHOICES = [
  { key: 'pikachu', no: 25, name: '皮卡丘' }, { key: 'charmander', no: 4, name: '小火龙' },
  { key: 'bulbasaur', no: 1, name: '妙蛙种子' }, { key: 'squirtle', no: 7, name: '杰尼龟' },
  { key: 'eevee', no: 133, name: '伊布' }, { key: 'jigglypuff', no: 39, name: '胖丁' },
  { key: 'psyduck', no: 54, name: '可达鸭' }, { key: 'snorlax', no: 143, name: '卡比兽' },
];
const AVATAR_KEYS = new Set(AVATAR_CHOICES.map((a) => a.key));

/* 旧 PIN 登录过渡开关（env LEGACY_PIN_LOGIN，默认 true；上线第 7 天 Miles 确认后改 false） */
function legacyPinEnabled(env) {
  return !(env && String(env.LEGACY_PIN_LOGIN).toLowerCase() === 'false');
}

function avatarUrlOf(acct) {
  if (acct && acct.avatar_url) return acct.avatar_url;
  const a = AVATAR_CHOICES.find((x) => x.key === (acct && acct.avatar_key)) || AVATAR_CHOICES[0];
  return petImg(a.no);
}
function lineAvatarKey(line) {
  return AVATAR_KEYS.has(line) ? line : 'pikachu';
}

const b64enc = (u8) => btoa(String.fromCharCode(...u8));
const b64dec = (s) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
async function pbkdf2b64(password, saltB64) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64dec(saltB64), iterations: PBKDF2_ITER }, key, 256);
  return b64enc(new Uint8Array(bits));
}
async function hashNewPin(password) {
  const salt = b64enc(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await pbkdf2b64(password, salt) };
}
function safeEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* salt='' 是迁移种下的「旧 PIN 的 SHA-256」暂存（初始密码＝当时的 PIN），首次登录成功立刻换成 PBKDF2 */
async function checkAcctPin(acct, password) {
  if (acct.salt === '') return safeEq(await sha256hex(String(password)), acct.pw_hash);
  return safeEq(await pbkdf2b64(password, acct.salt), acct.pw_hash);
}
function validPin(pin) {
  return typeof pin === 'string' && /^[0-9]{6}$/.test(pin);
}
function clientIp(req) {
  return req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
}
function acctPublic(a) {
  return {
    id: a.id, username: a.username, role: a.role, childId: a.child_id || null,
    displayName: a.display_name, avatarKey: a.avatar_key, avatar: avatarUrlOf(a),
    mustChangePw: a.pw_changed_at == null,
    roles: parseRoles(a.roles, a.role), familyId: a.family_id || null,
  };
}

async function findAccountByUsername(db, username) {
  return db.prepare('SELECT * FROM accounts WHERE lower(username)=?').bind(String(username || '').toLowerCase()).first();
}
async function accountOfSession(db, token) {
  return db.prepare('SELECT a.* FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token=?').bind(token).first();
}
/* 不挑 kind 的会话读取（改密码接口要接受 setpw 会话） */
async function getAnySession(db, req) {
  const token = parseCookies(req).famsess;
  if (!token) return null;
  const s = await db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
  if (!s || Math.floor(Date.now() / 1000) - s.created_at > SESSION_TTL_SECS) return null;
  return s;
}

/* 失败计数（原子自增再回读，并发连点也锁得住）。返回剩余锁定秒数（>0 即锁住） */
async function lockRemaining(db, key, now) {
  const r = await db.prepare('SELECT locked_until FROM login_attempts WHERE key=?').bind(key).first();
  if (r && r.locked_until > now) return r.locked_until - now;
  if (r && r.locked_until > 0) await db.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run(); // 锁已过期，清零重计
  return 0;
}
async function recordLoginFail(db, key, now, max = ACCT_LOCK_MAX, lockSecs = ACCT_LOCK_SECS) {
  await db.prepare(
    'INSERT INTO login_attempts(key, fails, locked_until, updated_at) VALUES(?,1,0,?) ON CONFLICT(key) DO UPDATE SET fails=fails+1, updated_at=excluded.updated_at'
  ).bind(key, now).run();
  const r = await db.prepare('SELECT fails FROM login_attempts WHERE key=?').bind(key).first();
  if (r && r.fails >= max) {
    await db.prepare('UPDATE login_attempts SET fails=0, locked_until=? WHERE key=?').bind(now + lockSecs, key).run();
    return { locked: true, fails: max };
  }
  return { locked: false, fails: r ? r.fails : 1 };
}
async function clearLoginFails(db, key) {
  await db.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
}

async function createAccountSession(db, acct, kind) {
  const token = randToken();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO sessions(token, created_at, pin_verified_at, kind, child_id) VALUES(?,?,?,?,?)')
    .bind(token, now, null, kind, kind === 'child' ? acct.child_id : null).run();
  await db.prepare('INSERT INTO account_sessions(token, account_id) VALUES(?,?)').bind(token, acct.id).run();
  return token;
}
function sessionKindFor(acct) {
  return acct.pw_changed_at == null ? 'setpw' : (acct.role === 'parent' ? 'parent' : 'child');
}

const badLogin = () => json({ ok: false, error: 'BAD_LOGIN', message: LOGIN_FAIL_MSG }, 401);

async function apiAuthLogin(db, req) {
  const body = await readJsonBody(req);
  const username = String(body.username || '').trim().slice(0, 64);
  const pin = body.pin;
  if (!validPin(pin)) return json({ ok: false, error: 'BAD_PIN', message: 'PIN 是 6 位数字' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const key = username.toLowerCase() + '|' + clientIp(req);
  const left = await lockRemaining(db, key, now);
  if (left > 0) return json({ ok: false, error: 'LOCKED', retryAfter: left, message: `试太多次啦，请 ${Math.ceil(left / 60)} 分钟后再试` }, 429);
  const acct = USERNAME_RE.test(username) ? await findAccountByUsername(db, username) : null;
  let ok = false;
  if (acct) ok = await checkAcctPin(acct, pin);
  else await pbkdf2b64(pin, 'AAAAAAAAAAAAAAAAAAAAAA=='); // 用户名不存在也做一次同样的哈希，耗时不泄露
  if (!ok || (acct.role === 'child' && !acct.child_id)) {
    await recordLoginFail(db, key, now);
    return badLogin();
  }
  await clearLoginFails(db, key);
  if (acct.family_id) { // 家庭被 sysadmin 停用：PIN 对也不放行（给明确提示，不泄露其他信息）
    const fam = await db.prepare('SELECT status FROM families WHERE id=?').bind(acct.family_id).first();
    if (fam && fam.status === 'disabled') return json({ ok: false, error: 'FAMILY_DISABLED', message: '这个家庭账号已被停用，请联系管理员' }, 403);
  }
  if (acct.salt === '') { // 迁移种下的旧 PIN 哈希 → 立即升级成 PBKDF2（PIN 本身不变，仍要强制改）
    const h = await hashNewPin(pin);
    await db.prepare('UPDATE accounts SET pw_hash=?, salt=? WHERE id=?').bind(h.hash, h.salt, acct.id).run();
  }
  const kind = sessionKindFor(acct);
  const token = await createAccountSession(db, acct, kind);
  return json({
    ok: true, role: acct.role, childId: acct.child_id || null, username: acct.username,
    displayName: acct.display_name, mustChangePw: kind === 'setpw',
  }, 200, { 'Set-Cookie': sessionCookie(token) });
}

/* 改 PIN：需要当前会话（含 setpw 会话）。成功后同账号的其他会话全部失效，当前会话（若是 setpw）升级为正式会话。 */
async function apiAuthChangePin(db, req) {
  const s = await getAnySession(db, req);
  if (!s) return json({ ok: false, error: 'NEED_LOGIN' }, 401);
  const acct = await accountOfSession(db, s.token);
  if (!acct) return json({ ok: false, error: 'NO_ACCOUNT', message: '这个登录方式没有账号，请用用户名登录后再改 PIN' }, 400);
  const body = await readJsonBody(req);
  const oldPw = body.oldPin;
  const newPw = body.newPin;
  if (!validPin(oldPw)) return json({ ok: false, error: 'BAD_PIN', message: 'PIN 是 6 位数字' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const key = acct.username.toLowerCase() + '|' + clientIp(req);
  const left = await lockRemaining(db, key, now);
  if (left > 0) return json({ ok: false, error: 'LOCKED', retryAfter: left, message: `试太多次啦，请 ${Math.ceil(left / 60)} 分钟后再试` }, 429);
  if (!(await checkAcctPin(acct, oldPw))) {
    await recordLoginFail(db, key, now);
    return json({ ok: false, error: 'OLD_PIN_WRONG', message: '现在的 PIN 不对' }, 401);
  }
  if (!validPin(newPw)) return json({ ok: false, error: 'BAD_PIN', message: '新 PIN 是 6 位数字' }, 400);
  if (newPw === oldPw) return json({ ok: false, error: 'SAME_PIN', message: '新 PIN 不能和现在的一样' }, 400);
  const h = await hashNewPin(newPw);
  await db.prepare('UPDATE accounts SET pw_hash=?, salt=?, pw_changed_at=? WHERE id=?').bind(h.hash, h.salt, now, acct.id).run();
  await clearLoginFails(db, key);
  await db.prepare('DELETE FROM sessions WHERE token IN (SELECT token FROM account_sessions WHERE account_id=? AND token<>?)').bind(acct.id, s.token).run();
  await db.prepare('DELETE FROM account_sessions WHERE account_id=? AND token<>?').bind(acct.id, s.token).run();
  if (s.kind === 'setpw') {
    const kind = acct.role === 'parent' ? 'parent' : 'child';
    await db.prepare('UPDATE sessions SET kind=?, child_id=? WHERE token=?').bind(kind, kind === 'child' ? acct.child_id : null, s.token).run();
  }
  return json({ ok: true, role: acct.role, childId: acct.child_id || null });
}

/* 新档案的起始伙伴线 + 封印蛋（直接建账号与新邀请码注册共用）。
 * 线由服务端随机：四选一各 25%，不含伊布；一个随机字节 % 4 恰好均匀。蛋 7 天后孵化，不建 pet_instances。 */
const STARTER_LINES = ['pikachu', 'charmander', 'squirtle', 'bulbasaur'];
function pickStarterLine() {
  return STARTER_LINES[crypto.getRandomValues(new Uint8Array(1))[0] % 4];
}
async function giveStarterEgg(db, childId, line) {
  const today = shDateStr();
  const unlock = addDays(today, 7);
  const species = LINES[line].forms[0].no;
  const eggIns = await db.prepare('INSERT INTO sealed_eggs(child_id, awarded_date, unlock_date, species) VALUES(?,?,?,?)')
    .bind(childId, today, unlock, species).run();
  if (eggIns.meta) {
    const v = await bumpChildVersion(db, childId);
    await touchRow(db, 'sealed_eggs', 'id=?', [Number(eggIns.meta.last_row_id)], v);
  }
  return { species, name: SPECIES[species] ? SPECIES[species].name : String(species), awardedDate: today, unlockDate: unlock, days: 7 };
}

/* 年级自动升级：每年 9 月 1 日（上海）进入新学年。仅用于升级的年级顺序（gradeNumFromLabel 只认 1、3 年级，不动它）。 */
const GRADE_ORDER = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
function currentSchoolYear() {
  const p = shParts();
  return Number(p.month) >= 9 ? Number(p.year) : Number(p.year) - 1;
}
async function setGradeAnchor(db, childId) {
  await setSetting(db, 'grade_year_' + childId, String(currentSchoolYear()));
}
/* 在 overview 每孩子循环里调用：无锚点只补锚点不升级；锚点落后则按学年差升级（封顶六年级），不重置学习进度。
 * 就地更新 child.grade_label，使本次返回的数据已是新年级。 */
async function promoteGradeIfDue(db, child, S) {
  const cur = currentSchoolYear();
  const raw = (S && S.has('grade_year_' + child.id)) ? S.get('grade_year_' + child.id) : await getSetting(db, 'grade_year_' + child.id);
  const anchor = raw === null ? NaN : Number(raw);
  if (!Number.isInteger(anchor)) { await setGradeAnchor(db, child.id); return; }
  if (anchor >= cur) return;
  const idx = GRADE_ORDER.indexOf(child.grade_label);
  if (idx >= 0) {
    const next = GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, idx + (cur - anchor))];
    if (next !== child.grade_label) {
      await db.prepare('UPDATE children SET grade_label=? WHERE id=?').bind(next, child.id).run();
      child.grade_label = next;
    }
  }
  await setGradeAnchor(db, child.id);
}

/* 开通邀请码注册（sysadmin 发的）：同时创建一个新家庭 + 这个家庭的家长账号（本家 4 位二次 PIN 在这里设置）。
 * 邀请码已在调用前被校验过有效；这里原子占用，失败整体回滚（码放回去）。 */
async function registerProvisioned(db, body, inv, { code, now, username, displayName, avatarKey }) {
  const familyName = String(body.familyName || '').trim();
  if (!familyName || [...familyName].length > 20) return json({ ok: false, error: 'BAD_FAMILY_NAME', message: '家庭名要 1～20 个字' }, 400);
  if (!/^\d{4}$/.test(String(body.secondaryPin || ''))) return json({ ok: false, error: 'BAD_PIN2', message: '家长二次 PIN 是 4 位数字' }, 400);
  if (await findAccountByUsername(db, username)) return json({ ok: false, error: 'USERNAME_TAKEN', message: '这个用户名已经有人用了' }, 409);
  const claim = await db.prepare('UPDATE invite_codes SET used_at=? WHERE code=? AND used_at IS NULL AND expires_at>?').bind(now, code, now).run();
  if (!claim.meta || claim.meta.changes !== 1) return json({ ok: false, error: 'INVITE_USED', message: '这个邀请码已经用过了' }, 400);
  let famId = null;
  try {
    const f = await db.prepare("INSERT INTO families(name, status, settings_json, pin2_hash, created_at) VALUES(?,'active','{}',?,?)")
      .bind(familyName, await sha256hex(String(body.secondaryPin)), now).run();
    famId = Number(f.meta.last_row_id);
    const h = await hashNewPin(body.pin);
    const a = await db.prepare('INSERT INTO accounts(username, pw_hash, salt, role, roles, child_id, display_name, avatar_key, created_at, pw_changed_at, family_id) VALUES(?,?,?,?,?,NULL,?,?,?,?,?)')
      .bind(username, h.hash, h.salt, 'parent', 'parent', displayName, avatarKey, now, now, famId).run();
    await db.prepare('UPDATE invite_codes SET used_by_account=?, family_id=? WHERE code=?').bind(Number(a.meta.last_row_id), famId, code).run();
    const acct = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(Number(a.meta.last_row_id)).first();
    const token = await createAccountSession(db, acct, 'parent');
    return json({ ok: true, role: 'parent', childId: null, username: acct.username, displayName, familyId: famId }, 200, { 'Set-Cookie': sessionCookie(token) });
  } catch (e) {
    if (famId) await db.prepare('DELETE FROM families WHERE id=?').bind(famId).run();
    await db.prepare('UPDATE invite_codes SET used_at=NULL WHERE code=?').bind(code).run();
    const dup = /UNIQUE/i.test(String(e && e.message));
    return json({ ok: false, error: dup ? 'USERNAME_TAKEN' : 'SERVER_ERROR', message: dup ? '这个用户名已经有人用了' : '注册没成功，再试一次吧' }, dup ? 409 : 500);
  }
}

/* 邀请码注册（公开页，没有有效邀请码一律不能注册）。邀请码猜测按 IP 限速（5 次错锁 10 分钟）。 */
async function apiAuthRegister(db, req) {
  const body = await readJsonBody(req);
  const now = Math.floor(Date.now() / 1000);
  const key = 'invite|' + clientIp(req);
  const left = await lockRemaining(db, key, now);
  if (left > 0) return json({ ok: false, error: 'LOCKED', retryAfter: left, message: `试太多次啦，请 ${Math.ceil(left / 60)} 分钟后再试` }, 429);
  const code = String(body.code || '').trim().toUpperCase();
  const inv = code ? await db.prepare('SELECT * FROM invite_codes WHERE code=?').bind(code).first() : null;
  if (!inv) { await recordLoginFail(db, key, now); return json({ ok: false, error: 'INVITE_INVALID', message: '邀请码不对' }, 400); }
  if (inv.used_at) return json({ ok: false, error: 'INVITE_USED', message: '这个邀请码已经用过了' }, 400);
  if (inv.expires_at <= now) return json({ ok: false, error: 'INVITE_EXPIRED', message: '这个邀请码已经过期了，请让家长重新生成' }, 400);
  const username = String(body.username || '').trim();
  const displayName = String(body.displayName || '').trim();
  if (!USERNAME_RE.test(username)) return json({ ok: false, error: 'BAD_USERNAME', message: '用户名要 3～16 位，只能用字母、数字和下划线' }, 400);
  if (!validPin(body.pin)) return json({ ok: false, error: 'BAD_PIN', message: 'PIN 是 6 位数字' }, 400);
  if (!displayName || [...displayName].length > 12) return json({ ok: false, error: 'BAD_DISPLAY_NAME', message: '显示名要 1～12 个字' }, 400);
  const avatarKey = AVATAR_KEYS.has(body.avatarKey) ? body.avatarKey : 'pikachu';
  if (inv.kind === 'provision') return registerProvisioned(db, body, inv, { code, now, username, displayName, avatarKey });
  const famId = inv.family_id || null; // 家庭邀请码：新孩子加进发码的那个家庭
  if (famId) {
    const f = await db.prepare('SELECT status FROM families WHERE id=?').bind(famId).first();
    if (!f || f.status === 'disabled') return json({ ok: false, error: 'INVITE_INVALID', message: '邀请码不对' }, 400);
  }
  // 旧码（存了线）按旧行为：用存的线和年级、不发蛋；新码（线为空）随机线 + 起始蛋，年级取注册表单
  const oldCode = !!(inv.line && String(inv.line).trim());
  const formGrade = String(body.grade === undefined ? '一年级' : body.grade).trim();
  if (!oldCode && !GRADE_ORDER.includes(formGrade)) return json({ ok: false, error: 'BAD_GRADE', message: '请选择年级（一年级到六年级）' }, 400);
  if (await findAccountByUsername(db, username)) return json({ ok: false, error: 'USERNAME_TAKEN', message: '这个用户名已经有人用了' }, 409);
  // 先原子「占用」邀请码（只有一个并发请求能占到），再建档；建档失败就把码放回去
  const claim = await db.prepare('UPDATE invite_codes SET used_at=? WHERE code=? AND used_at IS NULL AND expires_at>?').bind(now, code, now).run();
  if (!claim.meta || claim.meta.changes !== 1) return json({ ok: false, error: 'INVITE_USED', message: '这个邀请码已经用过了' }, 400);
  let childId = null;
  let newLine = null;
  let newEgg = null;
  try {
    const line = oldCode ? (LINES[inv.line] ? inv.line : 'pikachu') : pickStarterLine();
    const grade = oldCode ? (inv.grade_label || '一年级') : formGrade;
    const c = famId
      ? await db.prepare('INSERT INTO children(name, grade_label, line, family_id) VALUES(?,?,?,?)').bind(displayName, grade, line, famId).run()
      : await db.prepare('INSERT INTO children(name, grade_label, line) VALUES(?,?,?)').bind(displayName, grade, line).run();
    childId = Number(c.meta.last_row_id);
    await setGradeAnchor(db, childId);
    if (!oldCode) { newEgg = await giveStarterEgg(db, childId, line); newLine = line; }
    const h = await hashNewPin(body.pin);
    const a = famId
      ? await db.prepare('INSERT INTO accounts(username, pw_hash, salt, role, child_id, display_name, avatar_key, created_at, pw_changed_at, family_id) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(username, h.hash, h.salt, 'child', childId, displayName, avatarKey, now, now, famId).run()
      : await db.prepare('INSERT INTO accounts(username, pw_hash, salt, role, child_id, display_name, avatar_key, created_at, pw_changed_at) VALUES(?,?,?,?,?,?,?,?,?)')
        .bind(username, h.hash, h.salt, 'child', childId, displayName, avatarKey, now, now).run();
    await db.prepare('UPDATE invite_codes SET used_by_account=? WHERE code=?').bind(Number(a.meta.last_row_id), code).run();
    const acct = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(Number(a.meta.last_row_id)).first();
    const token = await createAccountSession(db, acct, 'child');
    return json({ ok: true, role: 'child', childId, username: acct.username, displayName, line: newLine, egg: newEgg }, 200, { 'Set-Cookie': sessionCookie(token) });
  } catch (e) {
    if (childId) {
      await db.prepare('DELETE FROM sealed_eggs WHERE child_id=?').bind(childId).run();
      await db.prepare('DELETE FROM settings WHERE key=?').bind('grade_year_' + childId).run();
      await db.prepare('DELETE FROM children WHERE id=?').bind(childId).run();
    }
    await db.prepare('UPDATE invite_codes SET used_at=NULL WHERE code=?').bind(code).run();
    const dup = /UNIQUE/i.test(String(e && e.message));
    return json({ ok: false, error: dup ? 'USERNAME_TAKEN' : 'SERVER_ERROR', message: dup ? '这个用户名已经有人用了' : '注册没成功，再试一次吧' }, dup ? 409 : 500);
  }
}

/* 我的信息（「我的」页数据源）。旧 PIN 会话没有账号时也给出基本信息，页面据此隐藏改密码。 */
async function apiMe(db, session) {
  const acct = await accountOfSession(db, session.token);
  const avatars = AVATAR_CHOICES.map((a) => ({ key: a.key, name: a.name, url: petImg(a.no) }));
  if (acct) {
    let familyName = null;
    if (acct.family_id) { try { const f = await db.prepare('SELECT name FROM families WHERE id=?').bind(acct.family_id).first(); familyName = f ? f.name : null; } catch { familyName = null; } }
    const roles = parseRoles(acct.roles, acct.role);
    return json({ ok: true, hasAccount: true, ...acctPublic(acct), avatars, kind: session.baseKind || session.kind, isSysadmin: roles.includes('sysadmin'),
      familyName, homeChildId: (session.baseKind ? session.baseChildId : session.child_id) || acct.child_id || null });
  }
  let name = session.kind === 'parent' ? '家长' : '';
  let key = 'snorlax';
  if (session.kind === 'child') {
    const c = await getChild(db, session.child_id);
    name = c ? c.name : '';
    key = c ? lineAvatarKey(c.line) : 'pikachu';
  }
  return json({ ok: true, hasAccount: false, role: session.kind, childId: session.child_id || null, displayName: name, avatarKey: key,
    avatar: petImg((AVATAR_CHOICES.find((a) => a.key === key) || AVATAR_CHOICES[0]).no), avatars, kind: session.kind });
}

async function apiMeUpdate(db, req, session) {
  const acct = await accountOfSession(db, session.token);
  if (!acct) return json({ ok: false, error: 'NO_ACCOUNT' }, 400);
  const body = await readJsonBody(req);
  let displayName = acct.display_name;
  let avatarKey = acct.avatar_key;
  if (body.displayName !== undefined) {
    displayName = String(body.displayName || '').trim();
    if (!displayName || [...displayName].length > 12) return json({ ok: false, error: 'BAD_DISPLAY_NAME', message: '显示名要 1～12 个字' }, 400);
  }
  if (body.avatarKey !== undefined) {
    if (!AVATAR_KEYS.has(body.avatarKey)) return json({ ok: false, error: 'BAD_AVATAR' }, 400);
    avatarKey = body.avatarKey;
  }
  await db.prepare('UPDATE accounts SET display_name=?, avatar_key=? WHERE id=?').bind(displayName, avatarKey, acct.id).run();
  if (acct.child_id && displayName !== acct.display_name) { // 显示名同步到孩子档案，对战页/家长页等沿用 children.name 的地方一起变
    await db.prepare('UPDATE children SET name=? WHERE id=?').bind(displayName, acct.child_id).run();
    await syncTouch(db, acct.child_id, 'children', 'id=?', [acct.child_id]);
  }
  const fresh = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(acct.id).first();
  return json({ ok: true, ...acctPublic(fresh) });
}

/* 「我的」页学习进度（孩子自选，2026-11-16 用户令）：孩子本人读/写自己的三科进度。
 * 前端 goMe / meSaveProgress 早就调 /api/me/progress，但后端一直没这路由（404），
 * 致学习进度在“我的”页从不显示。现补上：GET 读（与家长设置页同口径），POST 写（单科一字符串，空=回默认）。 */
async function apiMeProgress(db, req, session) {
  const acct = await accountOfSession(db, session && session.token);
  if (!acct) return json({ ok: false, error: 'NO_ACCOUNT' }, 400);
  const roles = parseRoles(acct.roles, acct.role);
  const isChild = (acct.role === 'child' || roles.includes('child')) && !roles.includes('parent') && acct.role !== 'parent';
  const childId = acct.child_id ? Number(acct.child_id) : null;
  if (!isChild || !childId) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const g = gradeNumFromLabel(child.grade_label);
  const build = (savedRaw, chapters, defFn) => {
    if (!Array.isArray(chapters) || !chapters.length) return null;
    const saved = savedRaw == null ? '' : String(savedRaw).trim();
    const valid = !!saved && chapters.includes(saved);
    return { chapters, current: valid ? saved : defFn(g), isDefault: !valid };
  };
  if (!req || req.method === 'GET') {
    const S = await getSettings(db, [`math_progress_${childId}`, `chinese_progress_${childId}`, `english_progress_${childId}`]);
    return json({
      ok: true,
      grade: child.grade_label,
      mathProgress: build(S.get(`math_progress_${childId}`), g != null ? MATH_CHAPTERS[g] : null, defaultMathChapter),
      chineseProgress: build(S.get(`chinese_progress_${childId}`), g != null ? CHINESE_CHAPTERS[g] : null, defaultChineseChapter),
      englishProgress: build(S.get(`english_progress_${childId}`), g != null ? ENGLISH_UNITS[g] : null, defaultEnglishChapter),
    });
  }
  const body = await readJsonBody(req);
  const cfgs = [
    ['mathProgress', `math_progress_${childId}`, MATH_CHAPTERS, '章节不在该年级列表内'],
    ['chineseProgress', `chinese_progress_${childId}`, CHINESE_CHAPTERS, '语文章节不在该年级列表内'],
    ['englishProgress', `english_progress_${childId}`, ENGLISH_UNITS, '英语单元不在该年级列表内'],
  ];
  const ops = [];
  for (const [field, key, table, badMsg] of cfgs) {
    if (body[field] === undefined) continue;
    const chapter = body[field] == null ? '' : String(body[field]).trim();
    if (!chapter) { ops.push({ key, chapter: null }); continue; }
    const chapters = g != null ? table[g] : null;
    if (!Array.isArray(chapters) || !chapters.length) return json({ ok: false, error: '该年级暂无章节列表' }, 400);
    if (!chapters.includes(chapter)) return json({ ok: false, error: badMsg }, 400);
    ops.push({ key, chapter });
  }
  for (const op of ops) {
    if (op.chapter === null) await db.prepare('DELETE FROM settings WHERE key=?').bind(op.key).run();
    else await setSetting(db, op.key, op.chapter);
  }
  if (ops.length) await bumpChildVersion(db, childId);
  return json({ ok: true });
}

/* 「同一家」账号列表：第一步单家庭＝children 表全部孩子（含自己，isSelf 标出）；
 * 没有账号的孩子按宠物线头像兜底。兄弟对战邀请对手、各页头像都读这个列表。 */
async function apiFamilyMembers(db, session) {
  const kids = await getChildren(db, session.familyId);
  const { results } = await db.prepare("SELECT * FROM accounts WHERE role='child'").all();
  const byChild = new Map(results.map((a) => [a.child_id, a]));
  const selfId = session.kind === 'child' ? session.child_id : null;
  return json({
    ok: true,
    members: kids.map((c) => {
      const a = byChild.get(c.id);
      const key = a ? a.avatar_key : lineAvatarKey(c.line);
      return {
        childId: c.id, displayName: a ? a.display_name : c.name, avatarKey: key,
        avatar: a ? avatarUrlOf(a) : petImg((AVATAR_CHOICES.find((x) => x.key === key) || AVATAR_CHOICES[0]).no),
        isSelf: c.id === selfId,
      };
    }),
  });
}

/* ---- 家长管理：账号与邀请码（PIN 会话） ---- */
async function apiParentAccounts(db, session) {
  const fam = session && session.familyId;
  const [{ results }, kids, { results: invs }] = await Promise.all([
    fam
      ? db.prepare('SELECT * FROM accounts WHERE family_id=? ORDER BY role DESC, id').bind(fam).all()
      : db.prepare('SELECT * FROM accounts ORDER BY role DESC, id').all(),
    getChildren(db, fam),
    fam
      ? db.prepare("SELECT * FROM invite_codes WHERE kind='family' AND family_id=? ORDER BY created_at DESC LIMIT 20").bind(fam).all()
      : db.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC LIMIT 20').all(),
  ]);
  const bound = new Set(results.map((a) => a.child_id).filter(Boolean));
  const now = Math.floor(Date.now() / 1000);
  return json({
    ok: true,
    accounts: results.map((a) => ({ ...acctPublic(a), createdAt: a.created_at })),
    unboundChildren: kids.filter((c) => !bound.has(c.id)).map((c) => ({ id: c.id, name: c.name, grade: c.grade_label })),
    invites: invs.map((i) => ({ code: i.code, createdAt: i.created_at, expiresAt: i.expires_at, status: i.used_at ? 'used' : (i.expires_at <= now ? 'expired' : 'active'), line: i.line, grade: i.grade_label })),
    avatars: AVATAR_CHOICES.map((a) => ({ key: a.key, name: a.name, url: petImg(a.no) })),
    lines: Object.keys(LINES).map((k) => ({ key: k, label: LINES[k].label })),
  });
}

async function apiParentAccountCreate(db, req, session) {
  const fam = (session && session.familyId) || null;
  const body = await readJsonBody(req);
  const username = String(body.username || '').trim();
  const displayName = String(body.displayName || '').trim();
  if (!USERNAME_RE.test(username)) return json({ ok: false, error: 'BAD_USERNAME', message: '用户名要 3～16 位，只能用字母、数字和下划线' }, 400);
  if (!validPin(body.pin)) return json({ ok: false, error: 'BAD_PIN', message: '初始 PIN 是 6 位数字' }, 400);
  if (!displayName || [...displayName].length > 12) return json({ ok: false, error: 'BAD_DISPLAY_NAME', message: '显示名要 1～12 个字' }, 400);
  const avatarKey = AVATAR_KEYS.has(body.avatarKey) ? body.avatarKey : 'pikachu';
  if (await findAccountByUsername(db, username)) return json({ ok: false, error: 'USERNAME_TAKEN', message: '这个用户名已经有人用了' }, 409);
  const now = Math.floor(Date.now() / 1000);
  let childId = Number(body.childId) || 0;
  let createdChild = false;
  let newLine = null;
  let newEgg = null;
  if (childId) { // 绑定还没有账号的现有孩子
    const c = await getFamilyChild(db, fam, childId); // 别家的孩子一律当不存在
    if (!c) return json({ ok: false, error: 'NOT_FOUND' }, 404);
    if (await db.prepare('SELECT 1 AS x FROM accounts WHERE child_id=?').bind(childId).first()) return json({ ok: false, error: 'CHILD_HAS_ACCOUNT', message: '这个孩子已经有账号了' }, 409);
  } else { // 新建孩子档案 + 账号
    // 新档案的伙伴线由服务端随机（忽略客户端传的 line），并发一颗 7 天封印蛋
    const line = pickStarterLine();
    const grade = String(body.grade || '一年级').trim().slice(0, 10) || '一年级';
    const c = fam
      ? await db.prepare('INSERT INTO children(name, grade_label, line, family_id) VALUES(?,?,?,?)').bind(displayName, grade, line, fam).run()
      : await db.prepare('INSERT INTO children(name, grade_label, line) VALUES(?,?,?)').bind(displayName, grade, line).run();
    childId = Number(c.meta.last_row_id);
    createdChild = true;
    await setGradeAnchor(db, childId);
    newEgg = await giveStarterEgg(db, childId, line);
    newLine = line;
  }
  try {
    const h = await hashNewPin(body.pin);
    const a = fam
      ? await db.prepare('INSERT INTO accounts(username, pw_hash, salt, role, child_id, display_name, avatar_key, created_at, pw_changed_at, family_id) VALUES(?,?,?,?,?,?,?,?,NULL,?)')
        .bind(username, h.hash, h.salt, 'child', childId, displayName, avatarKey, now, fam).run()
      : await db.prepare('INSERT INTO accounts(username, pw_hash, salt, role, child_id, display_name, avatar_key, created_at, pw_changed_at) VALUES(?,?,?,?,?,?,?,?,NULL)')
        .bind(username, h.hash, h.salt, 'child', childId, displayName, avatarKey, now).run();
    return json({ ok: true, account: { id: Number(a.meta.last_row_id), username, childId, displayName, avatarKey }, line: newLine, egg: newEgg });
  } catch (e) {
    if (createdChild) {
      await db.prepare('DELETE FROM sealed_eggs WHERE child_id=?').bind(childId).run();
      await db.prepare('DELETE FROM settings WHERE key=?').bind('grade_year_' + childId).run();
      await db.prepare('DELETE FROM children WHERE id=?').bind(childId).run();
    }
    const dup = /UNIQUE/i.test(String(e && e.message));
    return json({ ok: false, error: dup ? 'USERNAME_TAKEN' : 'SERVER_ERROR', message: dup ? '这个用户名已经有人用了' : '创建没成功' }, dup ? 409 : 500);
  }
}

async function apiParentAccountResetPin(db, req, session) {
  const body = await readJsonBody(req);
  const acct = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(Number(body.accountId) || 0).first();
  if (!acct || (session && session.familyId && acct.family_id !== session.familyId)) return notFound404(); // 别家的账号也回 404
  const h = await hashNewPin(DEFAULT_PIN); // 重置＝临时默认 PIN，不接受家长自定义值
  await db.prepare('UPDATE accounts SET pw_hash=?, salt=?, pw_changed_at=NULL WHERE id=?').bind(h.hash, h.salt, acct.id).run(); // 重置后首次登录要自己改 PIN
  await db.prepare('DELETE FROM sessions WHERE token IN (SELECT token FROM account_sessions WHERE account_id=?)').bind(acct.id).run();
  await db.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(acct.id).run();
  await db.prepare('DELETE FROM login_attempts WHERE key LIKE ?').bind(acct.username.toLowerCase() + '|%').run();
  return json({ ok: true });
}

/* 删除孩子（任务 129）：家长自助硬删。删账号 + 孩子档案 + 全部数据 + R2 照片，不可恢复。
 * 前置：前端先过 askResetPin（输管理 PIN 验证），再过 askConfirm（警示 + 确认/返回）。
 * 阻塞：进行中对战 / 待审核打卡 / 待审核成绩时拒绝（不自动弃赛、不自动驳回，免牵连对手）。
 * 只删 role='child' 的账号；家长账号不在本次范围；别家孩子一律 404。 */
async function apiParentAccountDelete(db, env, req, session) {
  const body = await readJsonBody(req);
  const childId = Number(body.childId) || 0;
  if (!Number.isInteger(childId) || childId <= 0) return json({ ok: false, error: 'childId 不对' }, 400);
  const fam = (session && session.familyId) || null;
  const child = await getFamilyChild(db, fam, childId); // 别家的孩子一律当不存在
  if (!child) return notFound404();
  const acct = await db.prepare('SELECT * FROM accounts WHERE child_id=?').bind(childId).first();
  if (acct && acct.role !== 'child') return json({ ok: false, error: 'NOT_CHILD', message: '只能删除孩子账号' }, 400);
  // 阻塞条件：进行中对战 / 待审核打卡 / 待审核成绩
  const battle = await db.prepare("SELECT id FROM battles WHERE status IN ('waiting','active') AND (child_a=? OR child_b=?) LIMIT 1").bind(childId, childId).first();
  if (battle) return json({ ok: false, error: 'HAS_ACTIVE_BATTLE', message: '这个孩子还有进行中的对战，先打完或放弃再删' }, 400);
  const pendCk = await db.prepare("SELECT id FROM checkins WHERE child_id=? AND status='pending' LIMIT 1").bind(childId).first();
  if (pendCk) return json({ ok: false, error: 'HAS_PENDING_CHECKIN', message: '这个孩子还有待审核的打卡，先审核完再删' }, 400);
  const pendRec = await db.prepare("SELECT id FROM school_test_records WHERE child_id=? AND status='pending' LIMIT 1").bind(childId).first();
  if (pendRec) return json({ ok: false, error: 'HAS_PENDING_RECORD', message: '这个孩子还有待审核的成绩，先审核完再删' }, 400);
  // 1. 清会话（有账号时，照抄 reset-pin 的三句）
  if (acct) {
    await db.prepare('DELETE FROM sessions WHERE token IN (SELECT token FROM account_sessions WHERE account_id=?)').bind(acct.id).run();
    await db.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(acct.id).run();
    await db.prepare('DELETE FROM login_attempts WHERE key LIKE ?').bind(acct.username.toLowerCase() + '|%').run();
  }
  // 2. 清 R2 照片（作业照 + 成绩照；异常不阻塞删除主流程）
  try {
    const { results: cps } = await db.prepare('SELECT object_key FROM checkin_photos WHERE checkin_id IN (SELECT id FROM checkins WHERE child_id=?)').bind(childId).all();
    for (const r of (cps || [])) await photoDelete(env, r.object_key);
    const { results: sps } = await db.prepare("SELECT photo_key FROM school_test_records WHERE child_id=? AND photo_key IS NOT NULL AND photo_key<>''").bind(childId).all();
    for (const r of (sps || [])) await photoDelete(env, r.photo_key);
  } catch { /* 照片清理异常不阻塞删除主流程 */ }
  // 3. 按表删数据（childId 已是校验过的整数，可安全拼进 SQL；先外后内，最后删 battles/children/accounts）
  const id = childId;
  const stmts = [
    `DELETE FROM checkin_photos WHERE checkin_id IN (SELECT id FROM checkins WHERE child_id=${id})`,
    `DELETE FROM checkins WHERE child_id=${id}`,
    `DELETE FROM encounters WHERE child_id=${id}`,
    `DELETE FROM gym_battles WHERE child_id=${id}`,
    `DELETE FROM gym_weeks WHERE child_id=${id}`,
    `DELETE FROM sealed_eggs WHERE child_id=${id}`,
    `DELETE FROM pokedex WHERE child_id=${id}`,
    `DELETE FROM gym_progress WHERE child_id=${id}`,
    // 道馆二期 Tier 1：连败计数跟通关记录一起清；旧库无表时跳过（不阻塞删除主流程）
    ...(await hasEvoTable(db, 'gym_fail_streaks') ? [`DELETE FROM gym_fail_streaks WHERE child_id=${id}`] : []),
    `DELETE FROM pvp_rematch_requests WHERE requester_child_id=${id}`,
    `DELETE FROM ball_grants WHERE child_id=${id}`,
    `DELETE FROM ball_drops WHERE child_id=${id}`,
    `DELETE FROM item_inventory WHERE child_id=${id}`,
    `DELETE FROM item_ledger WHERE child_id=${id}`,
    `DELETE FROM item_grants WHERE child_id=${id}`,
    `DELETE FROM item_uses WHERE child_id=${id}`,
    `DELETE FROM pet_instances WHERE child_id=${id}`,
    `DELETE FROM species_acquisitions WHERE child_id=${id}`,
    `DELETE FROM school_test_records WHERE child_id=${id}`,
    `DELETE FROM wheel_chances WHERE child_id=${id}`,
    `DELETE FROM wheel_week_quotas WHERE child_id=${id}`,
    `DELETE FROM unit_test_questions WHERE unit_test_id IN (SELECT id FROM unit_tests WHERE child_id=${id})`,
    `DELETE FROM unit_test_answers WHERE unit_test_id IN (SELECT id FROM unit_tests WHERE child_id=${id})`,
    `DELETE FROM unit_test_draws WHERE unit_test_id IN (SELECT id FROM unit_tests WHERE child_id=${id})`,
    `DELETE FROM unit_tests WHERE child_id=${id}`,
    `DELETE FROM draw_week_quotas WHERE child_id=${id}`,
    `DELETE FROM reward_eggs WHERE child_id=${id}`,
    `DELETE FROM daily_item_drops WHERE child_id=${id}`,
    `DELETE FROM quiz_attempts WHERE child_id=${id}`,
    `DELETE FROM quiz_daily WHERE child_id=${id}`,
    `DELETE FROM quiz_diagnoses WHERE child_id=${id}`,
    `DELETE FROM child_notices WHERE child_id=${id}`,
    `DELETE FROM care_logs WHERE child_id=${id}`,
    `DELETE FROM care_qa_logs WHERE child_id=${id}`,
    `DELETE FROM care_wheel_chances WHERE child_id=${id}`,
    `DELETE FROM evo_wheel_grants WHERE child_id=${id}`,
    `DELETE FROM rare_wheel_chances WHERE child_id=${id}`,
    `DELETE FROM oak_assessments WHERE child_id=${id}`,
    `DELETE FROM oak_draws WHERE child_id=${id}`,
    `DELETE FROM daily_chinese_logs WHERE child_id=${id}`,
    `DELETE FROM daily_chinese_assessments WHERE child_id=${id}`,
    `DELETE FROM daily_chinese_answers WHERE child_id=${id}`,
    `DELETE FROM daily_english_logs WHERE child_id=${id}`,
    `DELETE FROM daily_english_assessments WHERE child_id=${id}`,
    `DELETE FROM daily_math_logs WHERE child_id=${id}`,
    `DELETE FROM daily_math_answers WHERE child_id=${id}`,
    `DELETE FROM coop_submissions WHERE user_id=${id}`,
    `DELETE FROM coop_gatherings WHERE user_id=${id}`,
    `DELETE FROM coop_grants WHERE user_id=${id}`,
    `DELETE FROM sync_versions WHERE child_id=${id}`,
    `DELETE FROM sync_tombstones WHERE child_id=${id}`,
    `DELETE FROM settings WHERE key='math_progress_${id}' OR key='chinese_progress_${id}' OR key='english_progress_${id}' OR key='grade_year_${id}' OR key='gym_final_egg_${id}'`,
    `DELETE FROM battles WHERE child_a=${id} OR child_b=${id}`,
    `DELETE FROM accounts WHERE child_id=${id}`,
    `DELETE FROM children WHERE id=${id}`,
  ];
  // 只对已存在的表删：测试库是迁移子集、缺几张新表时也不报错；正式库全表都在，不会漏删
  const existing = new Set(((await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results || []).map((r) => r.name));
  const runnable = stmts.filter((x) => { const m = /^DELETE FROM ([A-Za-z0-9_]+)/.exec(x); return !m || existing.has(m[1]); });
  await db.batch(runnable.map((x) => db.prepare(x)));
  await bumpChildVersion(db, childId); // 同步端据此感知孩子已删（写 tombstone 前推版本）
  try {
    const v = await db.prepare('SELECT version FROM sync_versions WHERE child_id=?').bind(childId).first();
    await db.prepare('INSERT OR REPLACE INTO sync_tombstones(child_id, table_name, row_id, version) VALUES(?,?,?,?)').bind(childId, 'children', childId, v ? v.version : 1).run();
  } catch { /* 同步表缺失不阻塞删除 */ }
  return json({ ok: true });
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function apiParentInviteCreate(db, env, req, session) {
  const body = await readJsonBody(req);
  const fam = (session && session.familyId) || null;
  const now = Math.floor(Date.now() / 1000);
  // 测试站才允许指定有效期（造「已过期」的码验收用）；正式环境恒为 7 天
  const ttl = isTestMode(env) && Number.isInteger(body.ttlSecs) ? body.ttlSecs : INVITE_TTL_SECS;
  // 新邀请码只是注册通行证：忽略客户端传的线和年级，空串表示「未选」（注册时随机线 + 表单年级）
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = [...bytes].map((x) => INVITE_ALPHABET[x % INVITE_ALPHABET.length]).join('');
  if (fam) await db.prepare("INSERT INTO invite_codes(code, created_at, expires_at, line, grade_label, kind, family_id) VALUES(?,?,?,?,?,'family',?)").bind(code, now, now + ttl, '', '', fam).run();
  else await db.prepare('INSERT INTO invite_codes(code, created_at, expires_at, line, grade_label) VALUES(?,?,?,?,?)').bind(code, now, now + ttl, '', '').run();
  return json({ ok: true, code, expiresAt: now + ttl });
}

async function apiOverview(db, session) {
  const today = shDateStr();
  const all = await getChildren(db, session && session.familyId);
  // child 会话只下发本人；parent 会话下发本家庭全部孩子
  const list = session && session.kind === 'child' ? all.filter((c) => c.id === session.child_id) : all;
  // 孩子们 / 英语模式开关 / 待审数互不依赖，一起并行（原为孩子之后再串行取 2 次）
  // Fable 优化 #3：本请求所需的设置一次取齐（每孩 grade_year + 三门进度、
  //   quiz_repeat_days、顶层 english_mode），下游 helper 不再各自单查。
  // 家庭取孩子行（会话 familyId 在旧 PIN 会话恒为 1、与孩子行一致；旧 schema
  //   夹具里会话无 familyId 时孩子行仍带 family_id，覆盖语义与改前逐孩取一致）。
  const hotKeys = ['english_mode', 'quiz_repeat_days'];
  for (const c of list) hotKeys.push(`grade_year_${c.id}`, `math_progress_${c.id}`, `chinese_progress_${c.id}`, `english_progress_${c.id}`);
  const S = await loadHotSettings(db, (list[0] && list[0].family_id) || (session && session.familyId), hotKeys);
  const [kids, englishModeRaw, pc] = await Promise.all([
    Promise.all(list.map(async (c) => {
      await promoteGradeIfDue(db, c, S); // 每年 9 月自动升一级；就地更新 c.grade_label
      // 先写后读：hatchDueEggs / unlockForms 会写库（孵蛋、图鉴、实例），childSummary 要读 unlockForms 挂上的 child._evo，顺序不变
      const { hatched } = await hatchDueEggs(db, c.id, today);
      await unlockForms(db, c, today);
      const s = childSummary(c);
      s.hatchedEggs = hatched;
      // 写完之后的只读查询并行（各查各的表；quizSummaryForChild 内部可能幂等写 quiz_daily，不与其余读互相依赖）
      const [notices, todaySubjects, pokedexCount, quizToday, oakToday, enc, eggRow] = await Promise.all([
        pendingNotices(db, c.id),
        todaySubjectsFor(db, c.id, today),
        pokedexCountFor(db, c.id),
        quizSummaryForChild(db, c, today, S),
        oakSummaryForChild(db, c, today, S),
        pendingEncounter(db, c.id, today),
        db.prepare('SELECT COUNT(*) n FROM sealed_eggs WHERE child_id=? AND hatched=0').bind(c.id).first(),
      ]);
      s.notices = notices;
      s.todaySubjects = todaySubjects;
      s.todaySubmittedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status !== 'rejected').length;
      s.todayApprovedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status === 'approved').length;
      s.pokedexCount = pokedexCount;
      s.quizToday = quizToday;
      s.oakToday = oakToday;
      s.pendingEncounter = enc ? { id: enc.id, no: enc.pokemon_no, name: enc.name } : null;
      s.sealedEggCount = eggRow ? eggRow.n : 0;
      return s;
    })),
    S.get('english_mode'),
    // 待审数：家长会话 = 本家庭合计；孩子会话在多家庭模式下也给本家庭合计（「家长入口（N 待审）」按钮用，不含任何内容）
    session && (session.kind === 'parent' || session.familyId)
      ? (session.familyId
        ? pendingByChild(db, session.familyId).then((m) => ({ n: [...m.values()].reduce((a, b) => a + b, 0) }))
        : db.prepare("SELECT COUNT(*) n FROM checkins WHERE status='pending'").first())
      : { n: 0 },
  ]);
  return json({
    ok: true, today, isWeekend: isWeekendDate(today), weekStart: weekStartMon(today),
    pendingReviewCount: pc ? pc.n : 0,
    englishMode: englishModeRaw === '1',
    session: session ? {
      // 家长凭证有效时 session.kind 被抬升为 parent；对前端仍报底层会话（孩子页面不变），另给 parentMode
      kind: session.baseKind || session.kind, childId: (session.baseKind ? session.baseChildId : session.child_id) || null,
      pinOk: pinFresh(session, Math.floor(Date.now() / 1000)), parentMode: !!session.parentCred, familyId: session.familyId || null,
    } : null,
    children: kids,
  });
}

// 读阶段内 quizPoolForChild 可能写入 quiz_daily（题单落库缓存）；并行后即使同批另一查询失败，该写入仍可能已发生。该写入是幂等的题单缓存，下次成功调用结果一致。
async function apiChildDetail(db, id, session) {
  const sc = scopeChildId(session, id);
  if (sc.err) return sc.err;
  const today = shDateStr();
  const c = await getChild(db, sc.id);
  if (!c) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // Fable 优化 #3：本请求所需的设置一次取齐（english_mode、三门进度、
  //   care_enabled、quiz_repeat_days），下游 helper 不再各自单查。
  const S = await loadHotSettings(db, c.family_id, [
    'english_mode', `english_progress_${c.id}`,
    `math_progress_${c.id}`, `chinese_progress_${c.id}`,
    'care_enabled', 'quiz_repeat_days',
  ]);
  const { hatched } = await hatchDueEggs(db, c.id, today);
  await unlockForms(db, c, today);
  const s = childSummary(c);
  s.hatchedEggs = hatched;
  const ws = weekStartMon(today);
  const [notices, todaySubjects, pokedexCount, quizToday, oakToday, enc, sealedEggs, wc, care, friendship] = await Promise.all([
    pendingNotices(db, c.id),
    todaySubjectsFor(db, c.id, today),
    pokedexCountFor(db, c.id),
    quizSummaryForChild(db, c, today, S),
    oakSummaryForChild(db, c, today, S),
    pendingEncounter(db, c.id, today),
    db.prepare(
      'SELECT * FROM sealed_eggs WHERE child_id=? AND hatched=0 ORDER BY unlock_date'
    ).bind(c.id).all(),
    db.prepare(
      "SELECT COUNT(DISTINCT date) n FROM checkins WHERE child_id=? AND status='approved' AND date>=? AND date<?"
    ).bind(c.id, ws, addDays(ws, 7)).first(),
    (async () => {
      if (await isCareEnabled(db, S)) {
        const careToday = shDateStr();
        let fedToday = false;
        let bathedToday = false;
        try {
          const careRows = await db.prepare(
            'SELECT kind FROM care_logs WHERE child_id=? AND date_shanghai=?'
          ).bind(s.id, careToday).all();
          fedToday = (careRows.results || []).some(r => r.kind === 'feed');
          bathedToday = (careRows.results || []).some(r => r.kind === 'bath');
        } catch (e) { /* care_logs 未建：当未喂/未洗（2026-11-07 正式站事故：缺表曾炸 /api/child） */ }
        return { fedToday, bathedToday, sceneKey: careSceneForDate(careToday).key };
      }
      return null;
    })(),
    getChildMainFriendship(db, c, today),
  ]);
  s.friendship = friendship;
  s.notices = notices;
  s.todaySubjects = todaySubjects;
  s.todaySubmittedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status !== 'rejected').length;
  s.todayApprovedCount = s.todaySubjects.filter((t) => t.checkin && t.checkin.status === 'approved').length;
  s.pokedexCount = pokedexCount;
  s.quizToday = quizToday;
  s.oakToday = oakToday;
  // hits 列是内部口径（是否命中过 0/1，新旧混列无版本标识），视图层不透传原值，
  // 只给派生字段 caught（审查 S16）；pending 遭遇恒未抓中，caught 恒 false。
  s.pendingEncounter = enc
    ? { id: enc.id, no: enc.pokemon_no, name: enc.name, ballsUsed: enc.balls_used, caught: enc.status === 'caught', hasQuiz: !!parseQuizState(enc) }
    : null;
  const { results: eggs } = sealedEggs;
  s.sealedEggs = eggs.map((e) => {
    const no = Number(e.species) || 151;
    return {
      id: e.id, awardedDate: e.awarded_date, unlockDate: e.unlock_date,
      daysLeft: Math.max(0, diffDays(today, e.unlock_date)),
      species: no, speciesName: (SPECIES[no] || RARE).name,
    };
  });
  // 本周打卡天数（按天计：当天至少 1 科通过算 1 天；道馆资格预览）
  s.weekApproved = wc ? wc.n : 0;
  s.care = care;
  return json({ ok: true, today, isWeekend: isWeekendDate(today), child: s });
}

/* 按科提交（迁移 0004）：一科一行。
 * 新格式 body：{childId, subject, note?, photos?}；photos 见 parsePhotosArg（{id} 保留 / {data} 新增）。
 * 兼容旧格式：{childId, subjects:[...]} 逐科提交（「全部完成」展开五科），返回第一科的 checkinId。
 * 状态机：无行 → 新建 pending；已有 rejected 行 → 重交（同行回 pending、刷新提交时间/快手、清理由）；
 * 已有 pending/approved 行 → 拒绝（approved 锁定，pending 请走编辑接口）。 */
async function apiSubmitCheckin(db, env, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const c = await getChild(db, childId);
  if (!c) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  let subjectList = [];
  if (body.subject !== undefined && body.subject !== null && body.subject !== '') {
    subjectList = [String(body.subject)];
  } else if (Array.isArray(body.subjects)) {
    let ss = body.subjects.map(String).filter(Boolean);
    if (ss.includes('全部完成')) ss = [...CHECKIN_SUBJECTS];
    subjectList = [...new Set(ss)];
  }
  if (!subjectList.length) return json({ ok: false, error: '请选择完成的作业科目' }, 400);
  for (const s of subjectList) {
    if (!CHECKIN_SUBJECTS.includes(s)) return json({ ok: false, error: `没有「${s}」这一科` }, 400);
  }
  const note = String(body.note || '').trim().slice(0, 200);
  const parsed = parsePhotosArg(body.photos);
  if (parsed.err) return json({ ok: false, error: parsed.err }, 400);
  const wantPhotos = parsed.list !== undefined && (parsed.list.length > 0 || Array.isArray(body.photos));
  if (wantPhotos && parsed.list.some((p) => p.bytes) && !env.PHOTOS) {
    return json({ ok: false, error: '照片功能还没开通，先不带照片提交吧' }, 503);
  }

  const today = shDateStr();
  const nowHM = shTimeHM();
  // 截止时间与各科已有记录互不依赖：一次并行取齐（只读；写在其后）
  const [cutoffRaw, existingRows] = await Promise.all([
    getEffSetting(db, c.family_id, 'cutoff_time'),
    Promise.all(subjectList.map((subject) => db.prepare('SELECT * FROM checkins WHERE child_id=? AND date=? AND subject=?')
      .bind(childId, today, subject).first())),
  ]);
  const cutoff = cutoffRaw || '21:30';
  const isEarly = earlyBefore(cutoff, nowHM) ? 1 : 0;
  const nowEpoch = Math.floor(Date.now() / 1000);

  // 先整体校验，避免多科提交做一半失败
  const existing = new Map();
  for (const [subjectIdx, subject] of subjectList.entries()) {
    const row = existingRows[subjectIdx];
    if (row && row.status !== 'rejected') {
      /* 任务 124：放行时允许重复提交——走到下面会把旧记录 UPDATE 回 pending（与驳回后重交同路），
       * 不违反唯一约束 ux_checkins_child_date_subject。 */
      if (!GATES_OPEN_FULL) return json({ ok: false, error: `「${subject}」今天已经提交过啦` }, 400);
    }
    existing.set(subject, row || null);
  }

  const results = [];
  for (const subject of subjectList) {
    const row = existing.get(subject);
    let checkinId;
    if (row) { // 驳回后重交：回到 pending（新一轮），快手按本次提交时间重算
      await db.prepare(
        `UPDATE checkins SET status='pending', note=?, submitted_at=?, submitted_epoch=?, is_early=?,
         xp_awarded=NULL, reason=NULL, reviewed_at=NULL WHERE id=?`
      ).bind(note, nowHM, nowEpoch, isEarly, row.id).run();
      checkinId = row.id;
    } else {
      const r = await db.prepare(
        'INSERT INTO checkins(child_id,date,subjects,subject,note,submitted_at,submitted_epoch,is_early) VALUES(?,?,?,?,?,?,?,?)'
      ).bind(childId, today, JSON.stringify([subject]), subject, note, nowHM, nowEpoch, isEarly).run();
      checkinId = r.meta.last_row_id;
    }
    await syncTouch(db, childId, 'checkins', 'id=?', [checkinId]);
    if (parsed.list !== undefined) {
      try {
        await setCheckinPhotos(db, env, checkinId, childId, today, parsed.list);
      } catch (e) {
        if (String(e && e.message) === 'PHOTO_NOT_OWNED') return json({ ok: false, error: '照片不属于这条打卡' }, 400);
        throw e;
      }
    }
    results.push({ subject, checkinId });
  }
  return json({ ok: true, checkinId: results[0].checkinId, results, isEarly: !!isEarly, cutoff });
}

/* 编辑待审核的提交（备注/照片）：通过后锁定不可改；驳回的请走提交接口「重新提交」。 */
async function apiEditCheckin(db, env, req, session) {
  const body = await readJsonBody(req);
  const checkinId = Number(body.checkinId ?? body.id);
  const row = checkinId ? await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first() : null;
  if (!row) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, row.child_id);
  if (fb) return fb;
  if (row.status === 'approved') return json({ ok: false, error: '这一科已经通过审核啦，不能再改咯' }, 400);
  if (row.status !== 'pending') return json({ ok: false, error: '这一科被驳回了，改好后请重新提交' }, 400);
  if (body.note !== undefined) {
    const note = String(body.note || '').trim().slice(0, 200);
    await db.prepare('UPDATE checkins SET note=? WHERE id=?').bind(note, row.id).run();
    await syncTouch(db, row.child_id, 'checkins', 'id=?', [row.id]);
  }
  const parsed = parsePhotosArg(body.photos);
  if (parsed.err) return json({ ok: false, error: parsed.err }, 400);
  if (parsed.list !== undefined) {
    if (parsed.list.some((p) => p.bytes) && !env.PHOTOS) {
      return json({ ok: false, error: '照片功能还没开通' }, 503);
    }
    try {
      await setCheckinPhotos(db, env, row.id, row.child_id, row.date, parsed.list);
    } catch (e) {
      if (String(e && e.message) === 'PHOTO_NOT_OWNED') return json({ ok: false, error: '照片不属于这条打卡' }, 400);
      throw e;
    }
  }
  return json({ ok: true, checkinId: row.id, photos: await photosOfCheckin(db, row.id) });
}

/* 照片读取（鉴权）：孩子只能读自己打卡的照片，家长可读全部。不公开直链。 */
async function apiGetPhoto(db, env, photoId, session) {
  const row = await db.prepare(
    `SELECT p.*, ck.child_id FROM checkin_photos p JOIN checkins ck ON ck.id=p.checkin_id WHERE p.id=?`
  ).bind(photoId).first();
  if (!row || !(await getFamilyChild(db, session && session.familyId, row.child_id))) return notFound404();
  const fb = forbidIfOtherChild(session, row.child_id);
  if (fb) return fb;
  if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通' }, 503);
  const obj = await env.PHOTOS.get(row.object_key);
  if (!obj) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': row.content_type || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

/* -------- 家长 PIN -------- */

/* 家长列表接口的范围：本家庭（familyId 来自会话）+ 可选 ?childId=（必须属于本家庭，否则 404）。
 * 返回要拼进 SQL 的片段（别名 ck. 与 ch.）和参数。 */
async function familyScopeFromUrl(db, session, url) {
  let sql = '';
  const args = [];
  if (session && session.familyId) { sql += ' AND ch.family_id=?'; args.push(session.familyId); }
  const q = url && url.searchParams ? url.searchParams.get('childId') : null;
  if (q) {
    const c = await getFamilyChild(db, session && session.familyId, q);
    if (!c) return { err: notFound404() };
    sql += ' AND ck.child_id=?'; args.push(c.id);
  }
  return { sql, args };
}

/* 应用内 PIN 验证（家长模式入口）：
 * - 有账号的会话：签发独立的家长凭证（parentcred cookie，15 分钟无操作失效），famsess 会话本身不变（孩子页面原样保留）。
 * - 旧 PIN 会话（无账号，LEGACY_PIN_LOGIN 过渡期）：沿用旧行为，会话升级为家长会话（2 小时 PIN 新鲜度）。 */
async function apiVerifyPin(db, req, session) {
  const body = await readJsonBody(req);
  const r = await checkPin(db, body.pin, session.familyId);
  if (!r.ok) return json({ ok: false, error: r.error, retryAfter: r.retryAfter, attemptsLeft: r.attemptsLeft }, r.status);
  const now = Math.floor(Date.now() / 1000);
  if (session.accountId && session.familyId) {
    const home = session.baseChildId !== undefined ? session.baseChildId : session.child_id;
    await db.prepare('DELETE FROM parent_creds WHERE session_token=?').bind(session.token).run();
    const token = randToken();
    await db.prepare('INSERT INTO parent_creds(token, session_token, account_id, family_id, created_at, last_active) VALUES(?,?,?,?,?,?)')
      .bind(token, session.token, session.accountId, session.familyId, now, now).run();
    return json({ ok: true, homeChildId: home || null, familyId: session.familyId }, 200, { 'Set-Cookie': parentCredCookie(token) });
  }
  await db.prepare("UPDATE sessions SET kind='parent', child_id=NULL, pin_verified_at=? WHERE token=?")
    .bind(now, session.token).run();
  return json({ ok: true });
}

/* 退出家长区：删凭证，回到原来那个孩子的页面（不用重新登录） */
async function apiParentExit(db, session) {
  await db.prepare('DELETE FROM parent_creds WHERE session_token=?').bind(session.token).run();
  const home = session.baseChildId !== undefined ? session.baseChildId : session.child_id;
  return json({ ok: true, homeChildId: home || null }, 200, { 'Set-Cookie': parentCredCookie('', true) });
}

/* ---- 临时授权（家长在「我家设置」开 24 小时；sysadmin 才能在期内查看本家孩子数据，每次查看记日志，到期自动失效） ---- */
const TEMP_AUTH_SECS = 24 * 3600;
async function getTempAuth(db, familyId) {
  if (!familyId) return { active: false, expiresAt: null };
  let g = null;
  try { g = await db.prepare('SELECT * FROM family_grants WHERE family_id=?').bind(familyId).first(); } catch { g = null; }
  const now = Math.floor(Date.now() / 1000);
  if (g && g.expires_at > now) return { active: true, expiresAt: g.expires_at };
  return { active: false, expiresAt: null };
}
async function apiFamilyTempAuth(db, req, session) {
  const fam = session && session.familyId;
  if (!fam) return notFound404();
  const body = await readJsonBody(req);
  const now = Math.floor(Date.now() / 1000);
  if (body.enable) {
    await db.prepare('INSERT INTO family_grants(family_id, granted_at, expires_at, granted_by) VALUES(?,?,?,?) ON CONFLICT(family_id) DO UPDATE SET granted_at=excluded.granted_at, expires_at=excluded.expires_at, granted_by=excluded.granted_by')
      .bind(fam, now, now + TEMP_AUTH_SECS, session.accountId || null).run();
  } else {
    await db.prepare('DELETE FROM family_grants WHERE family_id=?').bind(fam).run();
  }
  const t = await getTempAuth(db, fam);
  return json({ ok: true, active: t.active, expiresAt: t.expiresAt });
}

/* ---- 系统管理（sysadmin 专属）：入口再输一次二次 PIN（15 分钟内有效，记在家长凭证上） ----
 * 只给：全站默认设置、家庭列表（家庭名/账号数/状态/最近活跃）、开通邀请码。看不到别家孩子的作业、答题、宠物、统计。 */
async function adminGuard(db, session) {
  if (!(await hasPermission(db, session, 'admin.access'))) return json({ ok: false, error: 'NOT_SYSADMIN' }, 403);
  if (!session.adminFresh) return json({ ok: false, error: 'NEED_ADMIN_PIN' }, 403);
  return null;
}
async function apiAdminEnter(db, req, session) {
  if (!(await hasPermission(db, session, 'admin.access'))) return json({ ok: false, error: 'NOT_SYSADMIN' }, 403);
  if (!session.parentCred) return json({ ok: false, error: 'NEED_PIN' }, 403);
  const body = await readJsonBody(req);
  const r = await checkPin(db, body.pin, session.familyId);
  if (!r.ok) return json({ ok: false, error: r.error, retryAfter: r.retryAfter, attemptsLeft: r.attemptsLeft }, r.status);
  await db.prepare('UPDATE parent_creds SET admin_at=? WHERE token=?').bind(Math.floor(Date.now() / 1000), session.parentCred.token).run();
  return json({ ok: true });
}
async function siteDefaultsView(db) {
  const S = await getSettings(db, ['base_xp', 'subject_xp', 'cutoff_time', 'quiz_xp', 'quiz_repeat_days']);
  return {
    baseXp: Number(S.get('base_xp') || 40), subjectXp: Number(S.get('subject_xp') || 15), cutoffTime: S.get('cutoff_time') || '21:30',
    quizXp: Number(S.get('quiz_xp') || 10), quizRepeatDays: Number(S.get('quiz_repeat_days') || QUIZ_CORRECT_WINDOW_DAYS),
  };
}
async function apiAdminOverview(db, session) {
  const g = await adminGuard(db, session);
  if (g) return g;
  const [{ results: fams }, { results: cnt }, { results: act }, { results: invs }, defaultsView] = await Promise.all([
    db.prepare('SELECT id, name, status FROM families ORDER BY id').all(),
    db.prepare('SELECT family_id, COUNT(*) n FROM accounts GROUP BY family_id').all(),
    db.prepare('SELECT c.family_id, MAX(ck.submitted_epoch) la FROM checkins ck JOIN children c ON c.id=ck.child_id GROUP BY c.family_id').all(),
    db.prepare("SELECT * FROM invite_codes WHERE kind='provision' ORDER BY created_at DESC LIMIT 20").all(),
    siteDefaultsView(db),
  ]);
  const byFam = new Map((cnt || []).map((r) => [r.family_id, r]));
  const lastAct = new Map((act || []).map((r) => [r.family_id, r.la]));
  const now = Math.floor(Date.now() / 1000);
  return json({
    ok: true,
    defaults: defaultsView,
    families: fams.map((f) => {
      const ep = Number(lastAct.get(f.id)) || 0;
      return { id: f.id, name: f.name, status: f.status, accountCount: (byFam.get(f.id) || {}).n || 0, lastActive: ep || null };
    }),
    invites: invs.map((i) => ({ code: i.code, status: i.used_at ? 'used' : (i.expires_at <= now ? 'expired' : 'active'), expiresAt: i.expires_at, createdAt: i.created_at })),
  });
}
async function apiAdminDefaults(db, req, session) {
  const g = await adminGuard(db, session);
  if (g) return g;
  const chk = parseCheckinSettings(await readJsonBody(req));
  if (chk.err) return chk.err;
  for (const [key, val] of chk.ops) {
    if (val === null) await db.prepare('DELETE FROM settings WHERE key=?').bind(key).run();
    else await setSetting(db, key, val);
  }
  return json({ ok: true, defaults: await siteDefaultsView(db) });
}
async function apiAdminFamilyStatus(db, req, session) {
  const g = await adminGuard(db, session);
  if (g) return g;
  const body = await readJsonBody(req);
  const id = Number(body.familyId);
  if (body.status !== 'active' && body.status !== 'disabled') return json({ ok: false, error: 'BAD_STATUS' }, 400);
  if (id === session.familyId && body.status === 'disabled') return json({ ok: false, error: 'CANNOT_DISABLE_OWN', message: '不能停用自己所在的家庭' }, 400);
  const f = await db.prepare('SELECT id FROM families WHERE id=?').bind(id).first();
  if (!f) return notFound404();
  await db.prepare('UPDATE families SET status=? WHERE id=?').bind(body.status, id).run();
  return json({ ok: true });
}
async function apiAdminInviteCreate(db, session) {
  const g = await adminGuard(db, session);
  if (g) return g;
  const now = Math.floor(Date.now() / 1000);
  const code = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => INVITE_ALPHABET[x % INVITE_ALPHABET.length]).join('');
  await db.prepare("INSERT INTO invite_codes(code, created_at, expires_at, line, grade_label, kind, family_id) VALUES(?,?,?,?,?,'provision',NULL)").bind(code, now, now + 7 * 86400, '', '').run();
  return json({ ok: true, code, expiresAt: now + 7 * 86400 });
}
/* 临时授权期内才能看别家孩子的基本资料（只给名字/年级，不含作业照片、答题、宠物、统计）；每次查看记日志 */
async function apiAdminFamilyView(db, url, session) {
  const g = await adminGuard(db, session);
  if (g) return g;
  const fid = Number(url.searchParams.get('familyId'));
  const f = fid ? await db.prepare('SELECT id, name FROM families WHERE id=?').bind(fid).first() : null;
  if (!f) return notFound404();
  const t = await getTempAuth(db, fid);
  if (!t.active && fid !== session.familyId) return json({ ok: false, error: 'NO_GRANT', message: '这个家庭没有开临时授权' }, 403);
  const kids = await getChildren(db, fid);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO admin_access_log(admin_account_id, family_id, child_id, what, at) VALUES(?,?,?,?,?)')
    .bind(session.accountId || 0, fid, null, 'view family children', now).run();
  return json({ ok: true, family: { id: f.id, name: f.name }, tempAuth: t, children: kids.map((c) => ({ id: c.id, name: c.name, grade: c.grade_label || '', line: c.line, totalXp: c.total_xp })) });
}
async function apiAdminLog(db, url, session) {
  const g = await adminGuard(db, session);
  if (g) return g;
  const fid = Number(url.searchParams.get('familyId'));
  const { results } = await db.prepare('SELECT l.*, a.display_name FROM admin_access_log l LEFT JOIN accounts a ON a.id=l.admin_account_id WHERE l.family_id=? ORDER BY l.at DESC LIMIT 100').bind(fid).all();
  return json({ ok: true, log: results.map((r) => ({ at: r.at, adminName: r.display_name || '', childId: r.child_id, what: r.what })) });
}

/* 待审数（打卡 + 孩子上报的学校成绩），按孩子分；familyId 为空 = 不过滤 */
async function pendingByChild(db, familyId) {
  const m = new Map();
  const add = (rows) => { for (const r of rows) m.set(r.child_id, (m.get(r.child_id) || 0) + r.n); };
  const fam = familyId ? ' AND c.family_id=?' : '';
  const args = familyId ? [familyId] : [];
  const [ckRes, stRes] = await Promise.all([
    db.prepare(`SELECT ck.child_id, COUNT(*) n FROM checkins ck JOIN children c ON c.id=ck.child_id WHERE ck.status='pending'${fam} GROUP BY ck.child_id`).bind(...args).all(),
    db.prepare(`SELECT st.child_id, COUNT(*) n FROM school_test_records st JOIN children c ON c.id=st.child_id WHERE st.status='pending'${fam} GROUP BY st.child_id`).bind(...args).all()
      .catch(() => null), // 老库没有 school_test_records
  ]);
  add(ckRes.results || []);
  if (stRes) add(stRes.results || []);
  return m;
}

/* 家长区孩子切换条的数据源：只列本家庭，每次进家长区都从这里重新拉 */
async function apiParentFamilyChildren(db, session) {
  const [kids, pend, accts] = await Promise.all([
    getChildren(db, session.familyId),
    pendingByChild(db, session.familyId),
    db.prepare("SELECT * FROM accounts WHERE child_id IS NOT NULL").all().then((r) => r.results || [], () => []),
  ]);
  const byChild = new Map(accts.map((a) => [a.child_id, a]));
  let list = kids.map((c) => {
    const a = byChild.get(c.id);
    const key = a ? a.avatar_key : lineAvatarKey(c.line);
    return {
      id: c.id, name: c.name, grade: c.grade_label || '',
      avatar: a ? avatarUrlOf(a) : petImg((AVATAR_CHOICES.find((x) => x.key === key) || AVATAR_CHOICES[0]).no),
      pending: pend.get(c.id) || 0,
    };
  });
  if (list.length >= 4) list = list.map((c, i) => ({ c, i })).sort((x, y) => (y.c.pending > 0) - (x.c.pending > 0) || x.i - y.i).map((x) => x.c);
  const home = session.baseChildId !== undefined ? session.baseChildId : session.child_id;
  return json({ ok: true, homeChildId: home || null, pendingTotal: list.reduce((n, c) => n + c.pending, 0), children: list });
}

async function apiPendingReviews(db, session, url) {
  const sc = await familyScopeFromUrl(db, session, url);
  if (sc.err) return sc.err;
  // 孩子上报待审核的学校成绩（2026-10-27：入口移到孩子端，审批仍在家长审核 tab）
  // 打卡与成绩两个查询互不依赖，并行发；照片依赖打卡 id，保持在后
  const [{ results }, { results: stResults }] = await Promise.all([
    db.prepare(
      `SELECT ck.*, ch.name AS child_name FROM checkins ck JOIN children ch ON ch.id=ck.child_id
     WHERE ck.status='pending'${sc.sql} ORDER BY ck.submitted_epoch ASC`
    ).bind(...sc.args).all(),
    db.prepare(
      `SELECT st.*, ch.name AS child_name FROM school_test_records st JOIN children ch ON ch.id=st.child_id
     WHERE st.status='pending'${sc.sql.replace(/ck\./g, 'st.')} ORDER BY st.created_epoch ASC`
    ).bind(...sc.args).all(),
  ]);
  const pmap = await photosByCheckin(db, results.map((r) => r.id));
  return json({
    ok: true,
    reviews: results.map((r) => ({
      id: r.id, childId: r.child_id, childName: r.child_name, date: r.date,
      subject: r.subject || (safeJsonArr(r.subjects)[0] || ''), note: r.note || '',
      subjects: safeJsonArr(r.subjects), submittedAt: r.submitted_at, isEarly: !!r.is_early,
      photos: pmap.get(r.id) || [],
    })),
    schoolTests: stResults.map((r) => ({
      id: r.id, childId: r.child_id, childName: r.child_name,
      subject: r.subject, unit: r.unit, score: r.score, fullScore: r.full_score, pct: r.pct,
      examDate: r.exam_date, hasPhoto: !!r.photo_key, createdAt: r.created_epoch,
    })),
  });
}

/* -------- 审核（经验唯一入口） -------- */

async function apiReview(db, req, session) {
  const body = await readJsonBody(req);
  const checkinId = Number(body.checkinId);
  const decision = body.decision;
  const ck = await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first();
  if (!ck || !(await getFamilyChild(db, session && session.familyId, ck.child_id))) return notFound404();
  if (ck.status !== 'pending') return json({ ok: false, error: '已经审核过了' }, 400);
  const today = shDateStr();
  const reviewedAt = shTimeHM();

  if (decision === 'reject') {
    const reason = String(body.reason || '作业还没完成').slice(0, 100);
    const updRej = await db.prepare("UPDATE checkins SET status='rejected', reason=?, reviewed_at=? WHERE id=? AND status='pending'")
      .bind(reason, reviewedAt, checkinId).run();
    if (!updRej.meta || !updRej.meta.changes) return json({ ok: false, error: '已经审核过了' }, 400);
    await syncTouch(db, ck.child_id, 'checkins', 'id=?', [checkinId]);
    return json({ ok: true, rejected: true, reason });
  }
  if (decision !== 'approve' && decision !== 'adjust') {
    return json({ ok: false, error: 'BAD_DECISION' }, 400);
  }

  const child = await getChild(db, ck.child_id);
  const subjectXp = Number((await getEffSetting(db, child.family_id, 'subject_xp')) || 15);
  let xp;
  if (decision === 'adjust') {
    xp = Number(body.adjustedXp);
    if (!Number.isInteger(xp) || xp < 0 || xp > 2000) {
      return json({ ok: false, error: '调整经验需为 0–2000 的整数' }, 400);
    }
  } else {
    // 每科独立计：该科通过得 subject_xp，快手按该科自己的提交时间 ×1.2（取整口径与旧版一致）
    xp = Math.round(subjectXp * (ck.is_early ? 1.2 : 1));
  }

  const oldLevel = levelFromXp(child.total_xp);

  /* 连击按「天」：只有当天第一条通过的科目才推进连击/里程碑；
   * 当天后续科目只加本科经验，连击保持不变。 */
  const prior = await db.prepare(
    "SELECT COUNT(*) n FROM checkins WHERE child_id=? AND date=? AND status='approved' AND id<>?"
  ).bind(child.id, ck.date, ck.id).first();
  const isFirstOfDay = !(prior && prior.n > 0);

  let streak = child.streak || 0;
  // 补审旧日期：只补本科经验，不推进连击、不发里程碑，更不能把 last_checkin_date 往回写
  const backfill = !!(child.last_checkin_date && ck.date < child.last_checkin_date);
  if (isFirstOfDay && !backfill) {
    if (child.last_checkin_date === addDays(ck.date, -1)) streak = streak + 1;
    else if (child.last_checkin_date === ck.date) streak = streak; // 保险（首条逻辑下不应出现）
    else streak = 1;
  }
  const newLastDate = backfill ? child.last_checkin_date : ck.date;

  let bonusXp = 0;
  let streakBox = null;
  const titles = safeJsonArr(child.titles);
  const stickers = safeJsonArr(child.stickers);
  if (!backfill && isFirstOfDay && streak > 0 && streak % 30 === 0) {
    bonusXp = 500;
    const t = '月度坚持大师';
    if (!titles.includes(t)) titles.push(t);
    if (!stickers.includes('🏆')) stickers.push('🏆');
    streakBox = { type: 'monthly30', streak, xp: bonusXp, title: t, sticker: '🏆' };
  } else if (!backfill && isFirstOfDay && streak > 0 && streak % 7 === 0) {
    bonusXp = 120;
    const t = STREAK_TITLES[Math.floor(Math.random() * STREAK_TITLES.length)];
    const s = STREAK_STICKERS[Math.floor(Math.random() * STREAK_STICKERS.length)];
    if (!titles.includes(t)) titles.push(t);
    if (!stickers.includes(s)) stickers.push(s);
    streakBox = { type: 'weekly7', streak, xp: bonusXp, title: t, sticker: s };
  }

  let newTotalXp = child.total_xp + xp + bonusXp;
  let newLevel = levelFromXp(newTotalXp);
  let levelsGained = [];
  for (let L = oldLevel + 1; L <= newLevel; L++) levelsGained.push(L);
  let freshMoves = newMovesBetween(child.line, oldLevel, newLevel, safeJsonArr(child.unlocked_moves))
    .map((m) => ({ level: m[0], name: m[1], desc: m[2] }));
  const oldForm = formIdxForLevel(oldLevel);
  let newFormIdx = formIdxForLevel(newLevel);

  // 状态 CAS：只有仍为 pending 的记录能被审核，并发/重复提交时后到者直接被拒，杜绝重复发经验
  const updCk = await db.prepare("UPDATE checkins SET status='approved', xp_awarded=?, reviewed_at=? WHERE id=? AND status='pending'")
    .bind(xp, reviewedAt, checkinId).run();
  if (!updCk.meta || !updCk.meta.changes) return json({ ok: false, error: '已经审核过了' }, 400);
  await syncTouch(db, child.id, 'checkins', 'id=?', [checkinId]);
  /* 连击条件更新（Fable 优化 #5）：streak 里程碑必须只发一次。两个同日审批并发时，
   * 双方读到的 prior COUNT(*) 都是 0、都算出同一份 streak+1 与里程碑；无条件 UPDATE
   * 会让第二份里程碑经验（120/500 XP）与称号/贴纸也落库。以 last_checkin_date 作
   * 条件——先到者把它写成当天，后到者的 WHERE 不命中（changes=0），退回只补本科经验。
   * 用 IS ? 而不用 = ?：首日打卡时 last_checkin_date 为 NULL，= NULL 恒不成立。
   * 补审旧日期时 newLastDate 仍为旧 last_checkin_date，条件更新正常命中。 */
  const updChild = await db.prepare(
    'UPDATE children SET total_xp = total_xp + ?, streak=?, last_checkin_date=?, titles=?, stickers=? WHERE id=? AND last_checkin_date IS ?'
  ).bind(xp + bonusXp, streak, newLastDate, JSON.stringify(titles), JSON.stringify(stickers), child.id, child.last_checkin_date).run();
  if (!updChild.meta || !updChild.meta.changes) {
    // 输掉竞态：打卡照常通过，只补本科经验（不含里程碑 bonus）；不推进连击、不发里程碑/称号/贴纸、不弹 streak_box
    await db.prepare('UPDATE children SET total_xp = total_xp + ? WHERE id=?').bind(xp, child.id).run();
    await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
    bonusXp = 0;
    streakBox = null;
    newTotalXp = child.total_xp + xp;
    newLevel = levelFromXp(newTotalXp);
    levelsGained = [];
    for (let L = oldLevel + 1; L <= newLevel; L++) levelsGained.push(L);
    freshMoves = newMovesBetween(child.line, oldLevel, newLevel, safeJsonArr(child.unlocked_moves))
      .map((m) => ({ level: m[0], name: m[1], desc: m[2] }));
    newFormIdx = formIdxForLevel(newLevel);
  } else {
    await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  }
  await unlockForms(db, { ...child, total_xp: newTotalXp }, today);

  // 连击里程碑：给孩子挂一条待展示通知，孩子端首页下次打开弹庆祝（展示后确认清除）
  if (streakBox) await pushNotice(db, child.id, 'streak_box', streakBox);

  const line = LINES[child.line];
  const evolved = newFormIdx > oldForm ? {
    from: oldForm === 0 ? '神秘的蛋' : line.forms[oldForm - 1].name,
    to: newFormIdx === 0 ? '神秘的蛋' : line.forms[newFormIdx - 1].name,
    formIdx: newFormIdx,
    img: newFormIdx === 0 ? null : petImg(line.forms[newFormIdx - 1].no),
  } : null;
  if (evolved) await pushNotice(db, child.id, 'evolution', evolved); // 进化过场：孩子下次打开首页播

  // 野外遭遇：当天第一条通过的科目触发判定——周末必触发；其余 25%
  // 日期口径（2026-11-15 用户纠正）：按审批当天（today），不用打卡提交日（ck.date）。
  // 补审旧打卡时 ck.date 是过去的日期，遭遇一出生就过期、孩子永远打不开（测试站蚊香君 id 86）。
  let encounter = null;
  const existing = await db.prepare('SELECT id FROM encounters WHERE child_id=? AND date=? LIMIT 1')
    .bind(child.id, today).first();
  if (isFirstOfDay && !existing) {
    const guaranteed = isWeekendDate(today);
    if (guaranteed || Math.random() < 0.25) {
      const caught = new Set(
        (await db.prepare("SELECT entry_key FROM pokedex WHERE child_id=? AND entry_key LIKE 'wild:%'")
          .bind(child.id).all()).results.map((r) => Number(r.entry_key.split(':')[1]))
      );
      const pool = WILD.filter((w) => !caught.has(w.no));
      const mon = (pool.length ? pool : WILD)[Math.floor(Math.random() * (pool.length ? pool.length : WILD.length))];
      // 条件 INSERT 兜底（审查 M5）：与答题触发同日并发时只落一行，changes=0 说明已被另一路抢先
      const r = await db.prepare(
        `INSERT INTO encounters(child_id,date,pokemon_no,name)
         SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM encounters WHERE child_id=? AND date=?)`
      ).bind(child.id, today, mon.no, mon.name, child.id, today).run();
      if (r.meta && r.meta.changes) {
        encounter = { id: r.meta.last_row_id, no: mon.no, name: mon.name };
        await syncTouch(db, child.id, 'encounters', 'id=?', [Number(r.meta.last_row_id)]);
      }
    }
  }

  return json({
    ok: true, approved: true,
    subject: ck.subject || null,
    xpAwarded: xp, isEarly: !!ck.is_early, subjectXp,
    bonusXp, streakBox, streak, isFirstOfDay,
    oldLevel, newLevel, levelsGained, newMoves: freshMoves,
    evolved,
    encounter,
  });
}

/* -------- 野外捕捉（借鉴包 v1 §5：答题抓捕，替换旧投球命中制） --------
 * 节奏不变：每次遭遇最多投 3 次球。投球 = 选球种（普通/超级，扣库存 1 个）→
 * 按物种稀有度出题（普通球 1/2/3 道；超级球多 1 道）→ 按球种判定命中（见 judgeCatch）。
 * 任意一次命中即抓捕成功；3 次未命中逃跑。encounters.hits 口径改为「是否命中过 0/1」，
 * balls_used 继续记投球次数；未答完的一组题存 encounters.quiz_state（题号、球种与已选答案草稿 sel）。 */

/* 一次投球的命中判定（纯函数；规格修订 2026-10-22，用户定案 A 方案）：
 * 普通球——该档题数全对才命中；超级球——出题数 = 该档题数 + 1，答对数达到
 * 该档原题数（need）即命中（常见 2 对 1、少见 3 对 2、稀有 4 对 3）。
 * 高级球——出题数 = 该档题数 + 2，答对数达到该档原题数即命中（§1.5）；
 * 大师球——0 题直接捕获（不走本题组，见 apiThrowBall；传说宝可梦除外）。
 * 本口径吸收并取代原「超级球容错 1 题」与 eno「至少答对 1 题」裁定：
 * 新口径下超级球每档都有真实价值，且命中必然答对 ≥1 题。
 * need 缺省取 total（旧三参调用按「全对」保守判定）。 */
function judgeCatch(ball, correctCount, total, need = total) {
  if (ball === 'master') return true;
  if (ball === 'super' || ball === 'hyper') return correctCount >= need;
  return correctCount >= total;
}

/* 球种附加题数（§1.5）：普通 0、超级 +1、高级 +2、大师不走题组（直接捕获） */
const BALL_EXTRA_QUESTIONS = { normal: 0, super: 1, hyper: 2, master: 0 };
const BALL_LABEL = { normal: '精灵球', super: '超级球', hyper: '高级球', master: '大师球' };

/* 抓捕选题的硬排除集（审查 M2）：今日已作答的题（含本场遭遇前几次投球的题——
 * 抓捕作答会落 quiz_attempts，见 apiEncounterAnswer）＋今日题单里的题
 * （防抓捕里见过答案再回每日问答刷奖励的泄露链）。 */
async function catchExcludeIds(db, child) {
  const today = shDateStr();
  const ids = new Set();
  const [{ results }, daily] = await Promise.all([
    db.prepare('SELECT question_id FROM quiz_attempts WHERE child_id=? AND date_shanghai=?')
      .bind(child.id, today).all(),
    db.prepare('SELECT question_ids FROM quiz_daily WHERE child_id=? AND date_shanghai=?')
      .bind(child.id, today).first(),
  ]);
  for (const r of results) ids.add(Number(r.question_id));
  if (daily) for (const id of safeJsonArr(daily.question_ids)) ids.add(Number(id));
  return ids;
}

/* 抓捕选题：孩子本年级题库，沿用每日选题同一套去重分层
 * （没答过 → 答错已过 3 天 → 答对已过窗口 → 放宽按最久未出现），rng 可注入；
 * excludeIds 命中者硬排除（同场不重复出题，见 catchExcludeIds） */
async function pickCatchQuestions(db, child, n, rng = Math.random, excludeIds = null) {
  // 题库、设置、作答历史互不依赖：并行取（三门进度门要用设置，在其后）
  const [{ results: all }, S, history] = await Promise.all([
    db.prepare('SELECT * FROM quiz_questions').all(),
    loadHotSettings(db, child.family_id, [
      `math_progress_${child.id}`, `chinese_progress_${child.id}`, `english_progress_${child.id}`,
      'quiz_repeat_days',
    ]),
    quizHistoryForChild(db, child.id),
  ]);
  // 2026-11-13 起抓捕也不再出脑筋急转弯（与每日问答 2026-11-09 口径一致；
  // 谜语只留在兄弟对战防守题）。此前漏改，1 年级抓精灵全是谜语。
  const rows = all.map(normalizeQuizRow).filter((q) => q.active && q.kind !== 'oak' && q.kind !== 'riddle' && !(excludeIds && excludeIds.has(Number(q.id))));
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const gradeOk = (q) => q.kind === 'riddle' || q.grade === gradeNum || q.grade == null;
  /* 进度门（2026-10-24 超纲事件后补齐；B 学习进度三门并行加载，任一对应门不通过即剔除）
   * Fable 优化 #3：三门进度 + quiz_repeat_days 一次取齐（原 3 次单查 + 1 次 getEffSetting
   * = families + settings 共 5 查 → 1 次批量 + 1 次 families）。 */
  const [mathGate, chineseGate, englishGate] = await Promise.all([
    loadMathGate(db, child, S.get(`math_progress_${child.id}`)),
    loadChineseGate(db, child, S.get(`chinese_progress_${child.id}`)),
    loadEnglishGate(db, child, S.get(`english_progress_${child.id}`)),
  ]);
  const today = shDateStr();
  const windowDays = Number((S.get('quiz_repeat_days')) || QUIZ_CORRECT_WINDOW_DAYS);
  const tierOf = (q) => {
    const h = history.get(Number(q.id));
    if (!h || !h.lastDate) return 0;
    const gap = diffDays(h.lastDate, today);
    if (h.lastCorrect) return gap >= windowDays ? 2 : 3;
    return gap > QUIZ_WRONG_GAP_DAYS ? 1 : 3;
  };
  const lastDateOf = (q) => { const h = history.get(Number(q.id)); return h && h.lastDate ? h.lastDate : null; };
  const rest = rows.filter(gradeOk).filter((q) => mathGatePass(q, mathGate) && chineseGatePass(q, chineseGate) && englishGatePass(q, englishGate));
  const picked = [];
  while (picked.length < n && rest.length) {
    const minTier = Math.min(...rest.map(tierOf));
    let cand;
    if (minTier <= 2) {
      const cands = rest.filter((q) => tierOf(q) === minTier);
      cand = cands[Math.floor(rng() * cands.length) % cands.length];
    } else {
      cand = [...rest].sort((a, b) =>
        String(lastDateOf(a) || '').localeCompare(String(lastDateOf(b) || '')) || (a.id - b.id))[0];
    }
    picked.push(cand);
    rest.splice(rest.indexOf(cand), 1);
  }
  return picked.map((q) => ({ id: q.id, question: q.question, options: q.options }));
}

/* encounters.quiz_state 解析（坏 JSON 按无待答题处理）。
 * 结构 {ball, questionIds, sel}：sel 是答题草稿 {questionId: answerIdx}（2026-10-24
 * 追加规格：已选答案落服务端，退出/关页重进恢复），只保留本题组题号、整数选项下标，
 * 旧状态没有 sel 时按空草稿返回。 */
function parseQuizState(enc) {
  if (!enc || !enc.quiz_state) return null;
  try {
    const qs = JSON.parse(enc.quiz_state);
    if (qs && ['normal', 'super', 'hyper', 'master'].includes(qs.ball) && Array.isArray(qs.questionIds) && qs.questionIds.length) {
      const sel = {};
      if (qs.sel && typeof qs.sel === 'object') {
        for (const qid of qs.questionIds) {
          const v = qs.sel[qid];
          if (Number.isInteger(v) && v >= 0 && v <= 7) sel[qid] = v;
        }
      }
      return { ball: qs.ball, questionIds: qs.questionIds, sel };
    }
  } catch { /* 损坏状态按无处理 */ }
  return null;
}

async function catchQuestionsView(db, questionIds) {
  const out = [];
  for (const qid of questionIds) {
    const row = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
    if (row) {
      const q = normalizeQuizRow(row);
      out.push({ id: q.id, question: q.question, options: q.options });
    }
  }
  return out;
}

function encounterView(enc, child, quizQuestions) {
  const tier = wildTierOf(enc.pokemon_no);
  const parsed = quizQuestions ? parseQuizState(enc) : null;
  return {
    id: enc.id, no: enc.pokemon_no, name: enc.name,
    tier, tierLabel: tier ? WILD_TIERS[tier].label : '', questionsNeeded: catchQuestionsFor(enc.pokemon_no),
    ballsUsed: enc.balls_used, caught: enc.status === 'caught', // 派生字段，不透传 hits 原值（审查 S16）
    balls: child ? (child.balls ?? 0) : 0, ballsSuper: child ? (child.balls_super ?? 0) : 0,
    ballsHyper: child ? (child.balls_hyper ?? 0) : 0, ballsMaster: child ? (child.balls_master ?? 0) : 0,
    // quiz.sel：已存草稿，前端据此恢复已选答案（没有草稿时为空对象）
    quiz: parsed ? { ball: parsed.ball, questions: quizQuestions, sel: parsed.sel || {} } : null,
  };
}

async function apiPendingEncounter(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const today = shDateStr();
  const enc = await pendingEncounter(db, childId, today);
  if (!enc) return json({ ok: true, encounter: null });
  const child = await getChild(db, childId);
  const wst = parseWildState(enc);
  if (wst || body.wild === true) {
    // 第二期野外战斗：预备战/战斗/续战都从遭遇自己的状态接回（不走道馆 /api/battle/state）
    return json({ ok: true, encounter: { ...encounterView(enc, child, null), ...(await wildPendingExtra(db, enc, child, wst)) } });
  }
  const qs = parseQuizState(enc);
  if (!qs && (enc.balls_used || 0) >= 3) {
    // 僵尸遭遇兜底（审查 M6）：球已投满却没有待答题组（数据异常）——正常流程下
    // 第 3 次投球未中在答题结算时已置 fled，此状态只可能来自数据损坏；按逃跑收尾，避免永久挂起。
    await db.prepare("UPDATE encounters SET status='fled' WHERE id=? AND status='pending' AND quiz_state IS NULL")
      .bind(enc.id).run();
    await syncTouch(db, childId, 'encounters', 'id=?', [enc.id]);
    return json({ ok: true, encounter: null });
  }
  const questions = qs ? await catchQuestionsView(db, qs.questionIds) : null;
  return json({ ok: true, encounter: encounterView(enc, child, questions) });
}

/* 投球：选球种扣库存 → 出题（题号存 quiz_state）；已有未答完的题组时直接续答、不重复扣球 */
async function apiThrowBall(db, req, session) {
  const body = await readJsonBody(req);
  if (typeof body.requestId === 'string') return wildThrow(db, session, body);
  const encId = Number(body.encounterId);
  const enc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
  if (!enc) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return fb;
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  // 遭遇只保留到当日结束（审查 S10）：昨天的遭遇不得隔日投球/续答
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const child = await getChild(db, enc.child_id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const pendingQs = parseQuizState(enc);
  if (pendingQs) {
    let questions = await catchQuestionsView(db, pendingQs.questionIds);
    if (!questions.length) {
      // 题组题目已被家长删除：按原球种重新出题（不重复扣球），否则这组题永远答不了（审查 M6 残余项）
      // 题数按原球种口径：超级球的题组仍多 1 题、高级球多 2 题，不得中途换口径（A 方案）
      const fresh = await pickCatchQuestions(db, child, catchQuestionsFor(enc.pokemon_no) + (BALL_EXTRA_QUESTIONS[pendingQs.ball] || 0), Math.random, await catchExcludeIds(db, child));
      if (fresh.length) {
        const st2 = { ball: pendingQs.ball, questionIds: fresh.map((q) => q.id), sel: {} };
        await db.prepare('UPDATE encounters SET quiz_state=? WHERE id=? AND quiz_state IS NOT NULL')
          .bind(JSON.stringify(st2), encId).run();
        await syncTouch(db, enc.child_id, 'encounters', 'id=?', [encId]);
        questions = fresh;
      }
    }
    return json({
      ok: true, resumed: true, encounterId: enc.id, ball: pendingQs.ball,
      ballsUsed: enc.balls_used, remaining: 3 - enc.balls_used, questions,
      sel: pendingQs.sel || {},
      balls: child.balls ?? 0, ballsSuper: child.balls_super ?? 0,
      ballsHyper: child.balls_hyper ?? 0, ballsMaster: child.balls_master ?? 0,
    });
  }
  // 「继续答题」显式续答意图（前端继续按钮传 resume:true）：待答题组在上方已按原球种
  // 续答返回（不查库存、不扣球）；走到这里说明根本没有未答完的题组——如实告知，
  // 绝不落入下面的新投球扣球路径（2026-10-24 修复：此前无题组时继续按钮也走本接口，
  // 已扔出的球都答完、库存又为 0 时被库存校验挡下报「没有精灵球」，与按钮文案矛盾；
  // 正式库实测遭遇 id=3 balls_used=2、quiz_state=NULL、普通球 0 即此状态）。
  if (body.resume === true) {
    return json({ ok: false, error: '已扔出的球都答完啦，再扔新球要用一颗精灵球哦' }, 400);
  }
  if (enc.balls_used >= 3) return json({ ok: false, error: '球已经用完啦' }, 400);
  const ball = ['normal', 'super', 'hyper', 'master'].includes(body.ball) ? body.ball : 'normal';
  const col = BALL_COLUMN[ball];
  if (ball === 'master') {
    // 大师球（§1.5）：0 题、合法遭遇直接捕获（传说宝可梦除外）；不写 quiz_state、不出题
    if (enc.pokemon_no === 151) return json({ ok: false, error: '大师球不能用来抓传说宝可梦哦' }, 400);
    const updM = await db.prepare('UPDATE children SET balls_master = balls_master - 1 WHERE id=? AND balls_master > 0').bind(child.id).run();
    if (!updM.meta || !updM.meta.changes) {
      return json({ ok: false, error: '没有大师球啦，大师球只能通过兑换获得哦' }, 400);
    }
    const ballsUsedM = enc.balls_used + 1;
    const occM = await db.prepare("UPDATE encounters SET balls_used=?, hits=1, status='caught', quiz_state=NULL WHERE id=? AND status='pending' AND quiz_state IS NULL AND balls_used=?")
      .bind(ballsUsedM, encId, enc.balls_used).run();
    if (!occM.meta || !occM.meta.changes) {
      await db.prepare('UPDATE children SET balls_master = balls_master + 1 WHERE id=?').bind(child.id).run();
      return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    }
    const dexRes = await insertPokedexWithCarryRule(db, enc.child_id, enc.pokemon_no, shDateStr());
    await ensurePetInstance(db, enc.child_id, `species:${enc.pokemon_no}`, shDateStr(), 'catch');
    {
      const v = await bumpChildVersion(db, enc.child_id);
      await touchRow(db, 'encounters', 'id=?', [encId], v);
      await touchRow(db, 'children', 'id=?', [enc.child_id], v);
      // 大师球捕获的 pokedex 行（主键为 child_id+entry_key，无 id 列）
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [enc.child_id, dexKeyForSpecies(enc.pokemon_no)], v);
    }
    const freshM = await getChild(db, enc.child_id);
    return json({
      ok: true, hit: true, master: true, encounterId: enc.id, ball, ballsUsed: ballsUsedM, remaining: 3 - ballsUsedM,
      status: 'caught', name: enc.name, no: enc.pokemon_no,
      notice: dexRes.notice || null,
      balls: freshM ? (freshM.balls ?? 0) : 0, ballsSuper: freshM ? (freshM.balls_super ?? 0) : 0,
      ballsHyper: freshM ? (freshM.balls_hyper ?? 0) : 0, ballsMaster: freshM ? (freshM.balls_master ?? 0) : 0,
    });
  }
  // 出题数（A 方案）：普通球 = 档位题数；超级球 = 档位题数 + 1；高级球 = 档位题数 + 2
  const need = catchQuestionsFor(enc.pokemon_no) + (BALL_EXTRA_QUESTIONS[ball] || 0);
  const questions = await pickCatchQuestions(db, child, need, Math.random, await catchExcludeIds(db, child));
  if (!questions.length) return json({ ok: false, error: '题库里暂时没有合适的题，等家长补充题目哦' }, 400);
  // 题数不足（审查 S12）：实际题数少于该档应答题数时不扣球——照常判定会让高档位变容易，
  // 且孩子平白耗掉一颗球；明确提示等题库补足后再来。
  if (questions.length < need) return json({ ok: false, error: '题库里的题不够啦，这次先不扔球，等家长补充题目再来抓哦' }, 400);
  // 条件扣球：库存为 0 时扣不动
  const upd = await db.prepare(`UPDATE children SET ${col} = ${col} - 1 WHERE id=? AND ${col} > 0`).bind(child.id).run();
  if (!upd.meta || !upd.meta.changes) {
    const noBallMsg = {
      normal: '没有精灵球啦，答题有机会掉落哦',
      super: '没有超级球啦，答题有机会掉落哦',
      hyper: '没有高级球啦，日常答题偶尔会掉落哦',
      master: '没有大师球啦，大师球只能通过兑换获得哦',
    }[ball] || '没有精灵球啦，答题有机会掉落哦';
    return json({ ok: false, error: noBallMsg }, 400);
  }
  const ballsUsed = enc.balls_used + 1;
  const quizState = { ball, questionIds: questions.map((q) => q.id), sel: {} };
  // 条件占位（审查 M1）：只有题组仍为空、投球数未被并发改动时才落库；
  // 占位失败说明并发的另一请求已抢先出题——退回刚扣的球并转续答，杜绝多扣少记/球白扣。
  const occ = await db.prepare('UPDATE encounters SET balls_used=?, quiz_state=? WHERE id=? AND quiz_state IS NULL AND balls_used=?')
    .bind(ballsUsed, JSON.stringify(quizState), encId, enc.balls_used).run();
  if (!occ.meta || !occ.meta.changes) {
    await db.prepare(`UPDATE children SET ${col} = ${col} + 1 WHERE id=?`).bind(child.id).run();
    const freshEnc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
    const qs2 = freshEnc ? parseQuizState(freshEnc) : null;
    if (qs2) {
      const questions2 = await catchQuestionsView(db, qs2.questionIds);
      const freshChild = await getChild(db, enc.child_id);
      return json({
        ok: true, resumed: true, encounterId: enc.id, ball: qs2.ball,
        ballsUsed: freshEnc.balls_used, remaining: 3 - freshEnc.balls_used, questions: questions2,
        sel: qs2.sel || {},
        balls: freshChild ? (freshChild.balls ?? 0) : 0, ballsSuper: freshChild ? (freshChild.balls_super ?? 0) : 0,
        ballsHyper: freshChild ? (freshChild.balls_hyper ?? 0) : 0, ballsMaster: freshChild ? (freshChild.balls_master ?? 0) : 0,
      });
    }
    return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  {
    const v = await bumpChildVersion(db, enc.child_id);
    await touchRow(db, 'encounters', 'id=?', [encId], v);
    await touchRow(db, 'children', 'id=?', [enc.child_id], v);
  }
  const fresh = await getChild(db, enc.child_id);
  return json({
    ok: true, encounterId: enc.id, ball, ballsUsed, remaining: 3 - ballsUsed,
    need: questions.length, questions,
    balls: fresh ? (fresh.balls ?? 0) : 0, ballsSuper: fresh ? (fresh.balls_super ?? 0) : 0,
    ballsHyper: fresh ? (fresh.balls_hyper ?? 0) : 0, ballsMaster: fresh ? (fresh.balls_master ?? 0) : 0,
  });
}

/* 抓捕答题草稿保存（2026-10-24 追加规格）：孩子每点选一次、点「先退出」时各存一次，
 * 把已选答案 {questionId: answerIdx} 写进 quiz_state.sel——退出不走提交、直接关页面，
 * 重进都能恢复已答进度接着答。只写草稿：不结算、不落 quiz_attempts、不动球数；
 * 草稿只认当前题组的题号与该题合法选项下标，外来题号/越界下标一律丢弃；
 * CAS 写入（quiz_state 原值比对）防与提交结算竞态，状态已变回 409 让前端静默放弃。 */
async function apiEncounterDraft(db, req, session) {
  const body = await readJsonBody(req);
  const encId = Number(body.encounterId);
  const enc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
  if (!enc) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return fb;
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const qs = parseQuizState(enc);
  if (!qs) return json({ ok: false, error: '先扔一个球再答题哦' }, 400);
  const incoming = body.sel && typeof body.sel === 'object' ? body.sel : {};
  const sel = {};
  // 题目选项数逐题独立读：对要用到的题并行取（只读），再按原顺序处理
  const draftRows = await Promise.all(qs.questionIds.map((qid) => {
    const v = incoming[qid];
    if (!Number.isInteger(v) || v < 0) return null;
    return db.prepare('SELECT options_json FROM quiz_questions WHERE id=?').bind(qid).first();
  }));
  for (const [qi, qid] of qs.questionIds.entries()) {
    const v = incoming[qid];
    if (!Number.isInteger(v) || v < 0) continue;
    const row = draftRows[qi];
    let n = 4; // 题目已被删除时用默认选项数兜底（该题结算时本来就会被跳过）
    if (row) { try { const o = JSON.parse(row.options_json); if (Array.isArray(o) && o.length) n = o.length; } catch { /* 保持默认 */ } }
    if (v < n) sel[qid] = v;
  }
  const next = JSON.stringify({ ball: qs.ball, questionIds: qs.questionIds, sel });
  const upd = await db.prepare('UPDATE encounters SET quiz_state=? WHERE id=? AND quiz_state=?')
    .bind(next, encId, enc.quiz_state).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await syncTouch(db, enc.child_id, 'encounters', 'id=?', [encId]);
  return json({ ok: true, sel });
}

/* 抓捕答题提交：判题 → 命中判定 → 结算（命中进图鉴；第 3 次未中逃跑） */
async function apiEncounterAnswer(db, req, session) {
  const body = await readJsonBody(req);
  if (typeof body.requestId === 'string') return wildAnswer(db, session, body);
  const encId = Number(body.encounterId);
  const enc = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first();
  if (!enc) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return fb;
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  // 遭遇只保留到当日结束（审查 S10）：昨天的题组不得隔日续答
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const qs = parseQuizState(enc);
  if (!qs) return json({ ok: false, error: '先扔一个球再答题哦' }, 400);
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const rawById = new Map(answers.map((a) => [Number(a && a.questionId), a ? a.answerIdx : undefined]));
  let correctCount = 0;
  let blankCount = 0;
  const details = [];
  // 各题行互不依赖：并行取（只读），判分仍按原顺序
  const answerRows = await Promise.all(qs.questionIds.map((qid) => db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first()));
  for (const [qi, qid] of qs.questionIds.entries()) {
    const row = answerRows[qi];
    if (!row) continue; // 题目已被删除：不算错、不计入 total（审查 S11）
    const q = normalizeQuizRow(row);
    if (!q.active) continue; // 已下架同理
    // 留空口径（2026-10-24 改版）：没提交这道题、或 answerIdx 为 null/非数字，一律算「没答」，
    // 且没答永远判错——旧实现 Number(null)=0 在正确答案恰为第 1 项时会把留空误判成答对，一并堵死。
    const rawAns = rawById.get(qid);
    const blank = rawAns === undefined || rawAns === null || !Number.isFinite(Number(rawAns));
    if (blank) blankCount++;
    const ok = !blank && Number(rawAns) === q.answer_idx;
    if (ok) correctCount++;
    details.push({ questionId: qid, correct: ok, correctIdx: q.answer_idx, explain: q.explain || '' });
  }
  const total = details.length; // 有效题数（已删/下架题不占分母）
  if (total === 0) {
    // 整组题都没了（审查 S11）：不是孩子的错——退回本次投球的球并清掉题组，让孩子重新投球。
    // 条件清状态防并发重复退球：状态已变则回 409，不退第二颗。
    const clr = await db.prepare('UPDATE encounters SET quiz_state=NULL WHERE id=? AND quiz_state IS NOT NULL').bind(encId).run();
    if (!clr.meta || !clr.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    const col = BALL_COLUMN[qs.ball] || 'balls';
    await db.prepare(`UPDATE children SET ${col} = ${col} + 1 WHERE id=?`).bind(enc.child_id).run();
    {
      const v = await bumpChildVersion(db, enc.child_id);
      await touchRow(db, 'encounters', 'id=?', [encId], v);
      await touchRow(db, 'children', 'id=?', [enc.child_id], v);
    }
    return json({ ok: false, refunded: true, error: '题目被家长收起来啦，这颗球退回给你，重新扔一次吧' }, 400);
  }
  // 留空拦截（2026-10-24 改版）：有题没答且未经孩子显式确认（confirmBlanks=true，
  // 前端点「就这样交」才带），不结算、不落账、题组原样保留——绝不静默把留空结掉。
  // 确认后走到下面的结算：留空判错，命中判定与落账口径与全答时完全一致。
  if (blankCount > 0 && body.confirmBlanks !== true) {
    return json({ ok: false, error: `还有 ${blankCount} 道题没答哦`, blanks: blankCount }, 400);
  }
  const hit = judgeCatch(qs.ball, correctCount, total, catchQuestionsFor(enc.pokemon_no));
  let status = 'pending';
  if (hit) status = 'caught';
  else if (enc.balls_used >= 3) status = 'fled';
  // 条件落库：quiz_state 还在才结算（防重复提交/并发双答）
  const upd = await db.prepare('UPDATE encounters SET hits=?, status=?, quiz_state=NULL WHERE id=? AND quiz_state IS NOT NULL')
    .bind(hit ? 1 : (enc.hits || 0), status, encId).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await syncTouch(db, enc.child_id, 'encounters', 'id=?', [encId]);
  // 抓捕作答落历史（审查 M2）：与每日问答同一张 quiz_attempts，但不发经验/碎片；
  // 纳入同一套去重口径——同题当日在每日问答里视为已答，杜绝在抓捕里看过答案再回去刷奖励；
  // 本场后续投球的选题也会据此排除已出过的题（catchExcludeIds）。
  const nowEpoch = Math.floor(Date.now() / 1000);
  for (const d of details) {
    const attIns = await db.prepare(
      `INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
       VALUES(?,?,?,?,0,0,?)`
    ).bind(enc.child_id, d.questionId, shDateStr(), d.correct ? 1 : 0, nowEpoch).run();
    if (attIns.meta && attIns.meta.changes) {
      await syncTouch(db, enc.child_id, 'quiz_attempts', 'id=?', [Number(attIns.meta.last_row_id)]);
    }
  }
  let dexRes = null;
  if (status === 'caught') {
    dexRes = await insertPokedexWithCarryRule(db, enc.child_id, enc.pokemon_no, shDateStr());
    await ensurePetInstance(db, enc.child_id, `species:${enc.pokemon_no}`, shDateStr(), 'catch');
  }
  const child = await getChild(db, enc.child_id);
  return json({
    ok: true, hit, correctCount, total, wrongCount: total - correctCount, ball: qs.ball,
    status, ballsUsed: enc.balls_used, remaining: 3 - enc.balls_used, name: enc.name, details,
    notice: dexRes ? dexRes.notice || null : null,
    balls: child ? (child.balls ?? 0) : 0, ballsSuper: child ? (child.balls_super ?? 0) : 0,
    ballsHyper: child ? (child.balls_hyper ?? 0) : 0, ballsMaster: child ? (child.balls_master ?? 0) : 0,
  });
}

/* -------- 第二期：野外抓捕战斗（共享战斗场景 mode:'wild'，2026-11-15） --------
 * 扩展现有 /api/encounter/*（不另起引擎）：答题出招 + 按野生剩余 HP 在服务端掷捕捉。
 * 状态存 encounters.quiz_state（JSON，kind:'wild'；旧遭遇的 {ball,questionIds,sel} 题组不受影响），
 * 刷新/再登录由 /api/encounter/pending 原样接回（阶段、双方 HP、已失败次数、当前题、先发）。
 * 一回合二选一：答 1 题（答对＝上场宠第一招打野生；答错＝挨打）或扔 1 颗捕捉球（野生不追打）。
 * 幂等：start 以遭遇本身为键；answer/throw/switch 必带 requestId，结果存进 state.rs，
 * 同一 requestId 重放原样返回已存结果（不再扣球、不再掷骰、不再伤血）。
 * 只改捕捉成功率算法，不碰打卡/审核/每日配额/对错统计（作答不落 quiz_attempts）。 */
const WILD_HP_BY_TIER = { common: 60, uncommon: 80, rare: 100 };
const WILD_HIT_FRAC = 0.22; // 答对：打掉野生满血的 22%
const WILD_HURT_FRAC = 0.25; // 答错：野生打掉上场宠满血的 25%
const WILD_MAX_THROWS = 3;
const WILD_RS_KEEP = 4;
const WILD_BALL_BONUS = { normal: 0, super: 15, hyper: 30, master: 0 };
const WILD_REQ_ID = /^[A-Za-z0-9_-]{8,64}$/;
/* 随机源可注入（测试夹具 globalThis.__wildRng），默认 Math.random；捕捉骰只在服务端掷 */
const wildRand = () => (typeof globalThis.__wildRng === 'function' ? globalThis.__wildRng() : Math.random());

/* 捕捉率（百分点，纯函数）：看野生剩余 HP 百分比（取整下舍）：≥70→25；40–69→50；16–39→75；≤15→必中；
 * 同次遭遇失败 2 次后第 3 次必中；超级球 +15、高级球 +30（封顶 100，必中档叠加仍 100）；大师球恒 100。 */
function wildCatchRate(wild, ball, failed) {
  if (ball === 'master') return { rate: 100, forced: 'master', base: 100 };
  const pct = wild.maxHp > 0 ? Math.floor((wild.hp / wild.maxHp) * 100) : 100;
  let base = pct >= 70 ? 25 : pct >= 40 ? 50 : pct >= 16 ? 75 : 100;
  let forced = base === 100 ? 'low-hp' : null;
  if (failed >= 2) { base = 100; forced = 'third'; }
  return { rate: Math.min(100, base + (WILD_BALL_BONUS[ball] || 0)), forced, base };
}

function parseWildState(enc) {
  if (!enc || !enc.quiz_state) return null;
  try {
    const st = JSON.parse(enc.quiz_state);
    if (st && st.kind === 'wild' && typeof st.phase === 'string') return st;
  } catch { /* 非野外战斗状态 */ }
  return null;
}

function wildBallFields(c) {
  return {
    balls: c ? (c.balls ?? 0) : 0, ballsSuper: c ? (c.balls_super ?? 0) : 0,
    ballsHyper: c ? (c.balls_hyper ?? 0) : 0, ballsMaster: c ? (c.balls_master ?? 0) : 0,
  };
}

/* 随身队伍（与道馆开战同口径：主宠＋携带，最多 5 只；leadNo 移到队首）。返回精简宠物快照。 */
async function wildBuildParty(db, child, leadNo) {
  const today = shDateStr();
  const level = levelFromXp(child.total_xp);
  await attachEvoForm(db, child, today);
  await attachInstanceAbilities(db, child);
  await attachExMain(db, child, null);
  const carried = await carriedCollection(db, child.id);
  const form0 = formInfo(child);
  const mainNo0 = form0.branchNo || (form0.img ? LINES[child.line].forms[form0.formIdx - 1].no : null);
  const carriedNos = new Set([mainNo0, ...carried.map((c) => c.no)].filter((n) => n != null));
  if (leadNo && !carriedNos.has(leadNo)) return { err: 'LEAD_NOT_CARRIED' };
  const side = buildPlayerSide(child, effPlayerLevel(level), null, { carried, leadNo: leadNo || null });
  const pets = side.pets.filter((p) => p.no != null).slice(0, 5).map((p, i) => ({
    key: p.key, name: p.name, type: p.type, no: p.no, img: p.img || petImg(p.no), level,
    hp: p.maxHp, maxHp: p.maxHp, moves: [{ name: p.moves[0].name, type: p.moves[0].type }],
  }));
  return { pets, line: side.line, level };
}

function wildSidesView(enc, st, child) {
  const A = st.party || [];
  const w = st.wild;
  return {
    A: {
      childId: child ? child.id : enc.child_id, childName: child ? child.name : '', battleLevel: st.level, line: child ? child.line || null : null,
      activeIdx: st.activeIdx || 0,
      pets: A.map((p, i) => ({ key: p.key, name: p.name, type: p.type, no: p.no, img: p.img, level: p.level, hp: p.hp, maxHp: p.maxHp, active: i === (st.activeIdx || 0), fainted: p.hp <= 0, moves: p.moves })),
      bench: [],
    },
    B: {
      childId: null, childName: `野生的${w.name}`, battleLevel: st.level, line: null, activeIdx: 0,
      pets: [{ key: 'wild', name: w.name, type: w.type || '普通', no: w.no, img: w.img, level: st.level, hp: w.hp, maxHp: w.maxHp, active: true, fainted: false, moves: [{ name: '撞击', type: '普通' }] }],
      bench: [],
    },
  };
}

/* 对战视图：与道馆 battleView 同形（sides / log / status / turnNo），模块与 adaptMoveResponse 直接可用 */
function wildBattleView(enc, st, child) {
  const status = st.result === 'caught' ? 'caught' : st.result === 'wiped' ? 'wiped' : 'active';
  return {
    battleId: null, encounterId: enc.id, mode: 'wild', stage: null, status,
    turn: status === 'active' ? 'A' : null, turnNo: st.turnNo || 1,
    weather: null, canAttack: status === 'active' && !st.needSwitch,
    needSwitch: !!st.needSwitch, winnerSide: st.result === 'caught' ? 'A' : null,
    failedThrows: st.failed || 0,
    catchRates: ['normal', 'super', 'hyper', 'master'].reduce((o, b) => { o[b] = wildCatchRate(st.wild, b, st.failed || 0).rate; return o; }, {}),
    phase: 'move', fx: { A: {}, B: {} }, pending: null,
    sides: wildSidesView(enc, st, child),
    log: st.log || [],
  };
}

async function wildQuestionView(db, qid) {
  if (!qid) return null;
  const row = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(qid).first();
  if (!row) return null;
  const q = normalizeQuizRow(row);
  if (!q.active) return null;
  return { id: q.id, question: q.question, options: q.options, subject: q.subject || '' };
}

async function wildPickQuestionId(db, child, used) {
  const ex = await catchExcludeIds(db, child);
  for (const id of used || []) ex.add(Number(id));
  let [q] = await pickCatchQuestions(db, child, 1, Math.random, ex);
  if (!q) [q] = await pickCatchQuestions(db, child, 1, Math.random, new Set((used || []).map(Number)));
  return q ? q.id : null;
}

function wildSavedResult(st, rid) {
  return rid && st && st.rs && st.rs[rid] ? st.rs[rid] : null;
}
function wildRemember(st, rid, res) {
  st.rs = st.rs || {};
  st.rsOrder = st.rsOrder || [];
  st.rs[rid] = res;
  st.rsOrder.push(rid);
  while (st.rsOrder.length > WILD_RS_KEEP) delete st.rs[st.rsOrder.shift()];
}
function wildPushLog(st, lines) {
  st.log = (st.log || []).concat(lines);
  if (st.log.length > 40) st.log = st.log.slice(-40);
}

/* 状态落库（CAS：quiz_state 原值比对，防并发/重放双写）。返回是否写成功。 */
async function wildCasSave(db, enc, st, extra = {}) {
  const r = await db.prepare(
    "UPDATE encounters SET quiz_state=?, balls_used=?, hits=?, status=? WHERE id=? AND status='pending' AND quiz_state IS ?"
  ).bind(JSON.stringify(st), extra.ballsUsed ?? enc.balls_used, extra.hits ?? enc.hits ?? 0, extra.status || 'pending', enc.id, enc.quiz_state ?? null).run();
  return !!(r.meta && r.meta.changes);
}
async function wildTouchAfter(db, enc, withChildRow) {
  const v = await bumpChildVersion(db, enc.child_id);
  await touchRow(db, 'encounters', 'id=?', [enc.id], v);
  if (withChildRow) await touchRow(db, 'children', 'id=?', [enc.child_id], v);
}

/* 公共开场：载入遭遇、鉴权、状态与日期校验；requireActive=false 时允许已结束的遭遇（用于重放） */
async function wildLoad(db, session, body, { requireActive = true } = {}) {
  const encId = Number(body.encounterId);
  const enc = encId ? await db.prepare('SELECT * FROM encounters WHERE id=?').bind(encId).first() : null;
  if (!enc) return { err: json({ ok: false, error: 'NOT_FOUND' }, 404) };
  const fb = forbidIfOtherChild(session, enc.child_id);
  if (fb) return { err: fb };
  const st = parseWildState(enc);
  const rid = typeof body.requestId === 'string' ? body.requestId : null;
  const saved = wildSavedResult(st, rid);
  if (saved) return { replay: json({ ...saved, replay: true }) };
  if (requireActive) {
    if (enc.status !== 'pending') return { err: json({ ok: false, error: '这场遭遇已经结束啦' }, 400) };
    if (enc.date !== shDateStr()) return { err: json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400) };
  }
  const child = await getChild(db, enc.child_id);
  if (!child) return { err: json({ ok: false, error: 'NOT_FOUND' }, 404) };
  return { enc, st, child, rid };
}
function wildNeedRid(rid) {
  return WILD_REQ_ID.test(rid || '') ? null : json({ ok: false, error: 'REQUEST_ID_REQUIRED' }, 400);
}

/* pending 里的野外部分：预备战给随身队伍（无 HP），战斗中给视图/当前题/失败次数 */
async function wildPendingExtra(db, enc, child, st) {
  if (st) {
    const question = st.phase === 'battle' && st.result == null ? await wildQuestionView(db, st.question) : null;
    return {
      wild: true, phase: st.phase, view: wildBattleView(enc, st, child), question,
      failedThrows: st.failed || 0, throwsLeft: Math.max(0, WILD_MAX_THROWS - (enc.balls_used || 0)),
      nextRate: wildCatchRate(st.wild, 'normal', st.failed || 0).rate,
    };
  }
  const b = await wildBuildParty(db, child, null);
  const w = { no: enc.pokemon_no, name: enc.name, img: petImg(enc.pokemon_no) };
  return {
    wild: true, phase: 'prebattle', view: null, question: null, failedThrows: 0,
    throwsLeft: Math.max(0, WILD_MAX_THROWS - (enc.balls_used || 0)),
    prebattle: { wild: w, party: b.err ? [] : b.pets.map((p, i) => ({ no: p.no, name: p.name, img: p.img, petIdx: i })) },
  };
}

/* 开战：{ encounterId, leadNo, requestId? }；遭遇已开战则原样返回（幂等，不重复开战） */
async function apiEncounterStart(db, req, session) {
  const body = await readJsonBody(req);
  const L = await wildLoad(db, session, body, { requireActive: false });
  if (L.replay) return L.replay;
  if (L.err) return L.err;
  const { enc, st, child } = L;
  if (st) {
    const question = st.phase === 'battle' && st.result == null ? await wildQuestionView(db, st.question) : null;
    return json({ ok: true, already: true, encounterId: enc.id, view: wildBattleView(enc, st, child), question, failedThrows: st.failed || 0, ...wildBallFields(child) });
  }
  if (enc.status !== 'pending') return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  if (enc.date !== shDateStr()) return json({ ok: false, error: '这场遭遇是之前留下的，已经结束啦' }, 400);
  const leadNo = body.leadNo ? Number(body.leadNo) : null;
  let built;
  try { built = await wildBuildParty(db, child, leadNo); } catch (e) { return json({ ok: false, error: 'PET_DATA_INVALID' }, 400); }
  if (built.err) return json({ ok: false, code: built.err, error: '先发宠物必须是随身携带的伙伴哦' }, 400);
  if (!built.pets.length) return json({ ok: false, error: '没有可以出战的伙伴' }, 400);
  const qid = await wildPickQuestionId(db, child, []);
  if (!qid) return json({ ok: false, error: '题库里暂时没有合适的题，等家长补充题目哦' }, 400);
  const tier = wildTierOf(enc.pokemon_no) || 'common';
  const maxHp = WILD_HP_BY_TIER[tier] || 60;
  const nstate = {
    kind: 'wild', v: 1, phase: 'battle', result: null, turnNo: 1, level: built.level,
    activeIdx: 0, needSwitch: false, party: built.pets,
    wild: { no: enc.pokemon_no, name: enc.name, img: petImg(enc.pokemon_no), type: '普通', hp: maxHp, maxHp },
    failed: 0, question: qid, used: [qid], rs: {}, rsOrder: [],
    log: [{ type: 'note', text: `野生的${enc.name}出现了！` }, { type: 'swap', side: 'A', pet: built.pets[0].name, text: `${built.pets[0].name} 出场了！` }],
  };
  if (!(await wildCasSave(db, enc, nstate))) {
    const fresh = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(enc.id).first();
    const fs = fresh && parseWildState(fresh);
    if (fs) return json({ ok: true, already: true, encounterId: enc.id, view: wildBattleView(fresh, fs, child), question: await wildQuestionView(db, fs.question), failedThrows: fs.failed || 0, ...wildBallFields(child) });
    return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  await wildTouchAfter(db, enc, false);
  return json({ ok: true, started: true, encounterId: enc.id, leadNo: built.pets[0].no, view: wildBattleView(enc, nstate, child), question: await wildQuestionView(db, qid), failedThrows: 0, ...wildBallFields(child) });
}

/* 答 1 题（requestId 幂等）：答对＝上场宠第一招打野生（野生最低留 1 HP，不被打倒）；答错＝野生反击 */
async function wildAnswer(db, session, body) {
  const L = await wildLoad(db, session, body);
  if (L.replay) return L.replay;
  if (L.err) return L.err;
  const { enc, st, child, rid } = L;
  const bad = wildNeedRid(rid);
  if (bad) return bad;
  if (!st || st.phase !== 'battle' || st.result) return json({ ok: false, error: '先选一只伙伴出战哦' }, 400);
  if (st.needSwitch) return json({ ok: false, error: '先换一只伙伴上场哦' }, 400);
  if (Number(body.questionId) !== Number(st.question)) return json({ ok: false, error: 'STATE_CHANGED', code: 'QUESTION_CHANGED' }, 409);
  const ai = body.answerIdx;
  if (typeof ai !== 'number' || !Number.isInteger(ai) || ai < 0) return json({ ok: false, error: '请选一个答案' }, 400);
  const row = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(st.question).first();
  const q = row ? normalizeQuizRow(row) : null;
  const correct = !!q && ai === q.answer_idx;
  const ns = JSON.parse(JSON.stringify(st));
  const me = ns.party[ns.activeIdx];
  const lines = [];
  let dmgToWild = 0;
  let dmgToMe = 0;
  const w = ns.wild;
  if (correct) {
    dmgToWild = Math.max(0, Math.min(Math.ceil(w.maxHp * WILD_HIT_FRAC), w.hp - 1));
    const before = w.hp;
    w.hp -= dmgToWild;
    const mv = me.moves[0];
    lines.push({ type: 'attack', side: 'A', pet: me.name, move: mv.name, moveType: mv.type, dmg: dmgToWild, target: w.name, startHp: before, targetHp: w.hp, text: `${me.name} 使出了「${mv.name}」！${dmgToWild > 0 ? `${w.name} 受到 ${dmgToWild} 点伤害` : `${w.name} 已经很虚弱了`}` });
  } else {
    dmgToMe = Math.min(me.hp, Math.max(1, Math.ceil(me.maxHp * WILD_HURT_FRAC)));
    const before = me.hp;
    me.hp -= dmgToMe;
    lines.push({ type: 'attack', side: 'B', pet: w.name, move: '撞击', moveType: '普通', dmg: dmgToMe, target: me.name, startHp: before, targetHp: me.hp, text: `答错了！${w.name} 反击，${me.name} 受到 ${dmgToMe} 点伤害` });
    if (me.hp <= 0) {
      lines.push({ type: 'faint', side: 'A', pet: me.name, text: `${me.name} 倒下了！` });
      if (ns.party.every((p) => p.hp <= 0)) { ns.result = 'wiped'; lines.push({ type: 'note', text: '明天再来试试' }); } else ns.needSwitch = true;
    }
  }
  ns.turnNo = (ns.turnNo || 1) + 1;
  if (!ns.result) {
    ns.used = ns.used || [];
    const nq = await wildPickQuestionId(db, child, ns.used);
    ns.question = nq;
    if (nq) ns.used.push(nq);
  } else ns.question = null;
  wildPushLog(ns, lines);
  const detail = { questionId: q ? q.id : st.question, correct, correctIdx: q ? q.answer_idx : null, explain: q ? q.explain || '' : '' };
  const view = wildBattleView(enc, ns, child);
  const qv = await wildQuestionView(db, ns.question);
  const res = {
    ok: true, requestId: rid, encounterId: enc.id, kind: 'answer', correct, detail,
    damageToWild: dmgToWild, damageToPlayer: dmgToMe, wipe: ns.result === 'wiped', needSwitch: !!ns.needSwitch,
    status: ns.result === 'wiped' ? 'fled' : 'pending', name: enc.name,
    view, question: qv, failedThrows: ns.failed || 0, ...wildBallFields(child),
  };
  wildRemember(ns, rid, res);
  const ok = await wildCasSave(db, enc, ns, { status: ns.result === 'wiped' ? 'fled' : 'pending' });
  if (!ok) {
    const fresh = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(enc.id).first();
    const saved = fresh ? wildSavedResult(parseWildState(fresh), rid) : null;
    if (saved) return json({ ...saved, replay: true });
    return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  await wildTouchAfter(db, enc, false);
  return json(res);
}

/* 倒下换人：{ encounterId, swapToIdx, requestId }；只在上场宠倒下后可换，且换上的须未倒下 */
async function apiEncounterSwitch(db, req, session) {
  const body = await readJsonBody(req);
  const L = await wildLoad(db, session, body);
  if (L.replay) return L.replay;
  if (L.err) return L.err;
  const { enc, st, child, rid } = L;
  const bad = wildNeedRid(rid);
  if (bad) return bad;
  if (!st || st.phase !== 'battle' || st.result || !st.needSwitch) return json({ ok: false, error: '现在不用换伙伴哦' }, 400);
  const idx = Number(body.swapToIdx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= st.party.length || idx === st.activeIdx || st.party[idx].hp <= 0) {
    return json({ ok: false, error: '现在不能换这只宠哦' }, 400);
  }
  const ns = JSON.parse(JSON.stringify(st));
  ns.activeIdx = idx;
  ns.needSwitch = false;
  wildPushLog(ns, [{ type: 'swap', side: 'A', pet: ns.party[idx].name, text: `${ns.party[idx].name} 上场了！` }]);
  const res = {
    ok: true, requestId: rid, encounterId: enc.id, kind: 'switch', status: 'pending', name: enc.name,
    view: wildBattleView(enc, ns, child), question: await wildQuestionView(db, ns.question), failedThrows: ns.failed || 0, ...wildBallFields(child),
  };
  wildRemember(ns, rid, res);
  if (!(await wildCasSave(db, enc, ns))) {
    const fresh = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(enc.id).first();
    const saved = fresh ? wildSavedResult(parseWildState(fresh), rid) : null;
    if (saved) return json({ ...saved, replay: true });
    return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  await wildTouchAfter(db, enc, false);
  return json(res);
}

/* 扔球（requestId 幂等）：球在投出时扣（失败不退）；骰只在服务端掷；回包含 wobbles(1–3)/caught/结算后 HP/库存 */
async function wildThrow(db, session, body) {
  const L = await wildLoad(db, session, body);
  if (L.replay) return L.replay;
  if (L.err) return L.err;
  const { enc, st, child, rid } = L;
  const bad = wildNeedRid(rid);
  if (bad) return bad;
  const ball = ['normal', 'super', 'hyper', 'master'].includes(body.ball) ? body.ball : 'normal';
  if (st && (st.result || st.phase === 'done')) return json({ ok: false, error: '这场遭遇已经结束啦' }, 400);
  if (st && st.needSwitch && ball !== 'master') return json({ ok: false, error: '先换一只伙伴上场哦' }, 400);
  if (!st && ball !== 'master') return json({ ok: false, error: '先选一只伙伴出战，再扔球哦' }, 400);
  if (ball === 'master' && enc.pokemon_no === 151) return json({ ok: false, error: '大师球不能用来抓传说宝可梦哦' }, 400);
  if ((enc.balls_used || 0) >= WILD_MAX_THROWS) return json({ ok: false, error: '球已经用完啦' }, 400);
  const col = BALL_COLUMN[ball];
  const upd = await db.prepare(`UPDATE children SET ${col} = ${col} - 1 WHERE id=? AND ${col} > 0`).bind(child.id).run();
  if (!upd.meta || !upd.meta.changes) {
    const noBallMsg = {
      normal: '没有精灵球啦，答题有机会掉落哦', super: '没有超级球啦，答题有机会掉落哦',
      hyper: '没有高级球啦，日常答题偶尔会掉落哦', master: '没有大师球啦，大师球只能通过兑换获得哦',
    }[ball];
    return json({ ok: false, error: noBallMsg }, 400);
  }
  const ns = st ? JSON.parse(JSON.stringify(st)) : {
    kind: 'wild', v: 1, phase: 'prebattle', result: null, turnNo: 1, level: levelFromXp(child.total_xp), activeIdx: 0, needSwitch: false,
    party: [], wild: { no: enc.pokemon_no, name: enc.name, img: petImg(enc.pokemon_no), type: '普通', hp: WILD_HP_BY_TIER[wildTierOf(enc.pokemon_no) || 'common'] || 60, maxHp: WILD_HP_BY_TIER[wildTierOf(enc.pokemon_no) || 'common'] || 60 },
    failed: 0, question: null, used: [], rs: {}, rsOrder: [], log: [],
  };
  const calc = wildCatchRate(ns.wild, ball, ns.failed || 0);
  const roll = Math.round(wildRand() * 10000) / 100; // 0–100，两位小数
  const caught = roll < calc.rate;
  const wobbles = caught ? 3 : 1 + Math.min(2, Math.floor(wildRand() * 3));
  const ballsUsed = (enc.balls_used || 0) + 1;
  ns.turnNo = (ns.turnNo || 1) + 1;
  if (caught) { ns.result = 'caught'; ns.phase = st ? ns.phase : 'done'; ns.question = null; } else ns.failed = (ns.failed || 0) + 1;
  wildPushLog(ns, [{ type: 'capture', side: 'A', ball, wobbles, caught, text: caught ? `${BALL_LABEL[ball]}晃了 ${wobbles} 下……抓到了 ${enc.name}！` : `${BALL_LABEL[ball]}晃了 ${wobbles} 下……${enc.name} 挣脱了！` }]);
  const view = wildBattleView(enc, ns, child);
  const fresh0 = await getChild(db, enc.child_id);
  const res = {
    ok: true, requestId: rid, encounterId: enc.id, kind: 'throw', ball, hit: caught, caught, wobbles,
    catchRate: calc.rate, roll, forced: calc.forced, failedThrows: ns.failed || 0,
    ballsUsed, remaining: WILD_MAX_THROWS - ballsUsed, status: caught ? 'caught' : 'pending', name: enc.name, no: enc.pokemon_no,
    master: ball === 'master', notice: null,
    wild: { hp: ns.wild.hp, maxHp: ns.wild.maxHp },
    view, question: caught ? null : await wildQuestionView(db, ns.question), ...wildBallFields(fresh0),
  };
  wildRemember(ns, rid, res);
  const ok = await wildCasSave(db, enc, ns, { ballsUsed, hits: caught ? 1 : (enc.hits || 0), status: caught ? 'caught' : 'pending' });
  if (!ok) {
    await db.prepare(`UPDATE children SET ${col} = ${col} + 1 WHERE id=?`).bind(child.id).run();
    const fresh = await db.prepare('SELECT * FROM encounters WHERE id=?').bind(enc.id).first();
    const saved = fresh ? wildSavedResult(parseWildState(fresh), rid) : null;
    if (saved) return json({ ...saved, replay: true });
    return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  }
  if (caught) {
    const dexRes = await insertPokedexWithCarryRule(db, enc.child_id, enc.pokemon_no, shDateStr());
    await ensurePetInstance(db, enc.child_id, `species:${enc.pokemon_no}`, shDateStr(), 'catch', wildRand);
    res.notice = dexRes.notice || null;
    const v = await bumpChildVersion(db, enc.child_id);
    await touchRow(db, 'encounters', 'id=?', [enc.id], v);
    await touchRow(db, 'children', 'id=?', [enc.child_id], v);
    await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [enc.child_id, dexKeyForSpecies(enc.pokemon_no)], v);
    ns.rs[rid] = { ...ns.rs[rid], notice: res.notice };
    await db.prepare('UPDATE encounters SET quiz_state=? WHERE id=?').bind(JSON.stringify(ns), enc.id).run();
  } else {
    await wildTouchAfter(db, enc, true);
  }
  return json(res);
}

/* 离开：遭遇原样保留到下次接着打（球不退、只有全灭才结束）；服务端不改状态，只确认遭遇还在 */
async function apiEncounterLeave(db, req, session) {
  const body = await readJsonBody(req);
  const L = await wildLoad(db, session, body, { requireActive: false });
  if (L.replay) return L.replay;
  if (L.err) return L.err;
  return json({ ok: true, kept: L.enc.status === 'pending' && L.enc.date === shDateStr(), encounterId: L.enc.id });
}

/* -------- 周末道馆 -------- */

const SHIELD_TEXTS = [
  '大岩蛇甩了甩尾巴，不过你的伙伴有护盾，一点都不疼！',
  '砰！攻击打在护盾上，火花四溅，伙伴稳稳站住！',
  '大岩蛇的攻击被护盾弹开了，伙伴趁机充满了力量！',
];

// F4：按孩子自己的主宠线判定当前主宠种号（优先 pet_instances 行，无实例行退回 LINES[child.line].forms[0].no，皮卡丘线首形态是 172 皮丘）
async function mainPetSpeciesNo(db, childId) {
  const child = await getChild(db, childId);
  if (!child || !child.line || !LINES[child.line]) return null;
  const row = await db.prepare(
    "SELECT species_no FROM pet_instances WHERE child_id=? AND line_key=? ORDER BY (source='main') DESC LIMIT 1"
  ).bind(childId, child.line).first();
  if (row && Number(row.species_no)) return Number(row.species_no);
  return LINES[child.line].forms[0].no;
}

async function isMainPetForChild(db, childId, no) {
  const n = Number(no);
  if (!n) return true;
  return (await mainPetSpeciesNo(db, childId)) === n;
}

async function insertPokedexWithCarryRule(db, childId, no, today) {
  const n = Number(no);
  const key = dexKeyForSpecies(n);
  const isCollection = Boolean(COLLECTION_MOVES[n]);
  const hasCol = await hasCarriedColumn(db);

  if (!hasCol) {
    const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
      .bind(childId, key, today).run();
    if (ins.meta && ins.meta.changes) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);
    }
    return { inserted: Boolean(ins.meta && ins.meta.changes), carried: isCollection ? 1 : 0, notice: null };
  }

  let carriedVal = 0;
  let notice = null;

  if (isCollection) {
    const currentCarried = await carriedCollection(db, childId);
    if (currentCarried.some((c) => c.no === n)) {
      return { inserted: false, carried: 1, notice: null };
    }
    if (currentCarried.length < MAX_CARRIED_COLLECTION) {
      carriedVal = 1;
    } else {
      carriedVal = 0;
      notice = {
        code: 'SENT_TO_WAREHOUSE',
        zh: '随身携带已满（4/4），新伙伴已送到大木博士的仓库！',
        en: "Party is full (4/4). Your new partner has been sent to Prof. Oak's storage!",
      };
    }
  }

  const ins = await db.prepare(
    'INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,?)'
  ).bind(childId, key, today, carriedVal).run();

  const inserted = Boolean(ins.meta && ins.meta.changes);
  if (inserted) {
    const v = await bumpChildVersion(db, childId);
    await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);
  } else {
    notice = null;
  }

  return { inserted, carried: carriedVal, notice };
}

// 任务 114：测试站仓库全量（2026-11-14 用户令：测试站仓库列全部 151、传说技能表按官方做；
// 正式站只按实际拥有显示）。测试模式（GATES_OPEN）下，仓库除真实拥有外，
// 还列出名册其余全部物种（不含主宠）；正式站行为一字未动。
async function warehouseLists(db, childId, mainNo) {
  const all = await ownedCollection(db, childId);
  const carried = all.filter((c) => c.carried);
  const stored = all.filter((c) => !c.carried);
  if (GATES_OPEN) {
    const have = new Set(all.map((c) => Number(c.no)));
    for (const key of Object.keys(COLLECTION_MOVES)) {
      const no = Number(key);
      if (no === mainNo || have.has(no)) continue;
      const sp = SPECIES[no];
      if (!sp) continue;
      stored.push({
        no,
        entry_key: dexKeyForSpecies(no),
        name: sp.name,
        type: sp.type,
        img: petImg(no),
        counters: countersForPet(no),
        carried: 0,
      });
    }
    stored.sort((a, b) => a.no - b.no);
  }
  return { carried, stored };
}

// F3：使用 getChild + isCareEnabled(db)，并返回 mainPet
async function apiWarehouseStatus(db, req, session) {
  const url = new URL(req.url);
  const scoped = scopeChildId(session, url.searchParams.get('child_id') ?? url.searchParams.get('childId'));
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const careEnabled = await isCareEnabled(db);
  await attachEvoForm(db, child, shDateStr());

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  // 仓库表第 3 项：首次打开仓库且仓库里有宠 → 推一次“精灵没丢”通知，settings 标记位去重（同 gym_final_egg_ 模式）
  if (stored.length > 0 && (await getSetting(db, `warehouse_moved_notice_${childId}`)) !== '1') {
    await pushNotice(db, childId, 'warehouse_moved', { stored: stored.length });
    await setSetting(db, `warehouse_moved_notice_${childId}`, '1');
  }
  return json({
    ok: true,
    child_id: childId,
    care_enabled: careEnabled ? 1 : 0,
    max_carried: MAX_CARRIED_COLLECTION,
    mainPet: (() => {
      const f = formInfo(child);
      const e = child._evo;
      let no = null;
      if (e) {
        if (e.branchNo) no = e.branchNo;
        else if (e.formIdx > 0) {
          const forms = LINES[child.line] && LINES[child.line].forms;
          no = forms ? forms[Math.min(e.formIdx - 1, forms.length - 1)].no : null;
        }
      }
      return { name: f.formName, img: f.img, type: LINE_TYPE[child.line] || '', egg: f.egg, no };
    })(),
    carried,
    stored,
  });
}

/* 仓库表第 2 项：孩子有进行中对局（道馆/兄弟对战/合作战 waiting|active）即禁一切存/换。
 * 查询逐字复用删孩子阻塞检查（apiParentAccountDelete）；合作战 suspended 不在口径内（边角，同删孩子检查）。 */
async function hasActiveBattle(db, childId) {
  const r = await db.prepare("SELECT id FROM battles WHERE status IN ('waiting','active') AND (child_a=? OR child_b=?) LIMIT 1").bind(childId, childId).first();
  return !!r;
}
const IN_BATTLE_RESP = () => json({ ok: false, error: 'IN_BATTLE', message: '对战进行中，不能移动精灵，先打完或放弃这场对战' }, 400);

// F4：store 判序：!no -> INVALID_SPECIES；主宠 -> MAIN_PET_CANNOT_STORE；非收藏种 -> INVALID_SPECIES
async function apiWarehouseStore(db, req, session) {
  const body = await readJsonBody(req);
  const scoped = scopeChildId(session, body.child_id ?? body.childId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (await hasActiveBattle(db, childId)) return IN_BATTLE_RESP();

  const no = Number(body.no ?? body.species_no);
  if (!no) return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  if (await isMainPetForChild(db, childId, no)) {
    return json({ ok: false, error: 'MAIN_PET_CANNOT_STORE' }, 400);
  }
  // 任务 110：前主宠也可存回仓库（否则切线时携带已满、被送进仓库的旧主宠永远取不出来）
  if (!COLLECTION_MOVES[no] && !(await getExMainLine(db, childId, no))) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }

  const key = dexKeyForSpecies(no);
  const res = await db.prepare(
    'UPDATE pokedex SET carried = 0 WHERE child_id = ? AND entry_key = ? AND carried = 1'
  ).bind(childId, key).run();

  if (!res.meta || !res.meta.changes) {
    return json({ ok: false, error: 'NOT_CARRIED' }, 400);
  }

  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    carried,
    stored,
  });
}

// F4：take 判序：!no -> INVALID_SPECIES；主宠 -> INVALID_SPECIES；非收藏种 -> INVALID_SPECIES
async function apiWarehouseTake(db, req, session) {
  const body = await readJsonBody(req);
  if (body.replace_no || body.out_no) {
    return apiWarehouseSwapCore(
      db,
      session,
      body.child_id ?? body.childId,
      Number(body.no ?? body.in_no),
      Number(body.replace_no ?? body.out_no)
    );
  }

  const scoped = scopeChildId(session, body.child_id ?? body.childId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (await hasActiveBattle(db, childId)) return IN_BATTLE_RESP();

  const no = Number(body.no ?? body.species_no);
  if (!no) return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  if (await isMainPetForChild(db, childId, no)) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }
  // 任务 110：前主宠也可取回携带（与 store 对称）
  if (!COLLECTION_MOVES[no] && !(await getExMainLine(db, childId, no))) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }

  const key = dexKeyForSpecies(no);
  // D1 单条语句最多 100 个绑定参数（2026-11-06 生产站 take 报 500 的根因：此处旧代码
  // 拼 146 个收藏种 key 的 IN 列表，UPDATE 共绑 149 参数、兜底 count 共绑 147 参数，
  // D1 直接抛 'too many SQL variables'；本地 node:sqlite 上限 999 故回归测不出来）。
  // 改用前缀谓词：收藏种的 entry_key 只可能是 wild:/egg:/rare: 三种前缀（dexKeyForSpecies），
  // form:（主宠形态行）与 gym:（道馆行）永远不是收藏种，故与 146-key IN 列表等价；
  // 且 take/swap 入口都有 COLLECTION_MOVES[no] 门禁（任务 110 起含前主宠例外），非收藏种永远无法被新置为 carried=1，
  // 前缀谓词对今后可达的数据也是精确的；即使将来出现例外，超算方向也是安全的
  // （只会提前判满、绝不会超 4 只）。绑定数：UPDATE 149→3，兜底 count 147→1。
  const res = await db.prepare(
    `UPDATE pokedex
     SET carried = 1
     WHERE child_id = ?
       AND entry_key = ?
       AND carried = 0
       AND (
         SELECT COUNT(*) FROM pokedex
         WHERE child_id = ? AND carried = 1
           AND entry_key NOT LIKE 'form:%' AND entry_key NOT LIKE 'gym:%'
       ) < ${MAX_CARRIED_COLLECTION}`
  ).bind(childId, key, childId).run();

  if (!res.meta || !res.meta.changes) {
    const cntRow = await db.prepare(
      `SELECT COUNT(*) AS cnt FROM pokedex
       WHERE child_id = ? AND carried = 1
         AND entry_key NOT LIKE 'form:%' AND entry_key NOT LIKE 'gym:%'`
    ).bind(childId).first();

    if ((cntRow?.cnt ?? 0) >= MAX_CARRIED_COLLECTION) {
      return json({ ok: false, error: 'PARTY_FULL_SWAP_REQUIRED' }, 400);
    }
    // 任务 114：测试站全量——仓库里还没有该种的行（合成条目），直接发一只（补行 carried=1）。
    // 正式站 GATES_OPEN 为 false，走不到这里；名册门（COLLECTION_MOVES）与主宠门
    // 在函数入口已验过，此处只补"有种无行"一种情况。
    if (GATES_OPEN && COLLECTION_MOVES[no]) {
      const ins = await db.prepare(
        'INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,1)'
      ).bind(childId, key, shDateStr()).run();
      if (ins.meta && ins.meta.changes) {
        const v = await bumpChildVersion(db, childId);
        await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);
        const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
        return json({ ok: true, carried, stored });
      }
    }
    return json({ ok: false, error: 'NOT_IN_WAREHOUSE' }, 400);
  }

  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, key], v);

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    carried,
    stored,
  });
}

async function apiWarehouseSwap(db, req, session) {
  const body = await readJsonBody(req);
  const takeNo = Number(body.take_no ?? body.in_no ?? body.no);
  const storeNo = Number(body.store_no ?? body.out_no ?? body.replace_no);
  return apiWarehouseSwapCore(db, session, body.child_id ?? body.childId, takeNo, storeNo);
}

// F4：swap-core 判序：!takeNo/!storeNo/相等 -> INVALID_SWAP_PAIR；主宠（任一）-> MAIN_PET_CANNOT_STORE；非收藏种（任一）-> INVALID_SPECIES
async function apiWarehouseSwapCore(db, session, rawChildId, takeNo, storeNo) {
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (await hasActiveBattle(db, childId)) return IN_BATTLE_RESP();

  if (!takeNo || !storeNo || takeNo === storeNo) {
    return json({ ok: false, error: 'INVALID_SWAP_PAIR' }, 400);
  }
  if ((await isMainPetForChild(db, childId, takeNo)) || (await isMainPetForChild(db, childId, storeNo))) {
    return json({ ok: false, error: 'MAIN_PET_CANNOT_STORE' }, 400);
  }
  // 任务 110：前主宠也可参与互换（与 store/take 对称）
  if (!(COLLECTION_MOVES[takeNo] || (await getExMainLine(db, childId, takeNo)))
    || !(COLLECTION_MOVES[storeNo] || (await getExMainLine(db, childId, storeNo)))) {
    return json({ ok: false, error: 'INVALID_SPECIES' }, 400);
  }

  const takeKey = dexKeyForSpecies(takeNo);
  const storeKey = dexKeyForSpecies(storeNo);

  const { results } = await db.prepare(
    'SELECT entry_key, carried FROM pokedex WHERE child_id = ? AND entry_key IN (?, ?)'
  ).bind(childId, takeKey, storeKey).all();

  const stateMap = new Map((results || []).map((r) => [r.entry_key, Number(r.carried)]));
  // 任务 114：测试站全量——取回的种在仓库里还没有行（合成条目），先补一行 carried=0 再互换。
  // 名册门与主宠门在函数入口已验过，此处只补"有种无行"一种情况；其他不匹配仍报 SWAP_STATE_MISMATCH。
  if (stateMap.get(takeKey) === undefined && stateMap.get(storeKey) === 1
    && GATES_OPEN && COLLECTION_MOVES[takeNo]) {
    const ins = await db.prepare(
      'INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,0)'
    ).bind(childId, takeKey, shDateStr()).run();
    if (ins.meta && ins.meta.changes) {
      const v0 = await bumpChildVersion(db, childId);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, takeKey], v0);
    }
    stateMap.set(takeKey, 0);
  }
  if (stateMap.get(takeKey) !== 0 || stateMap.get(storeKey) !== 1) {
    return json({ ok: false, error: 'SWAP_STATE_MISMATCH' }, 400);
  }

  await db.batch([
    db.prepare('UPDATE pokedex SET carried = 0 WHERE child_id = ? AND entry_key = ? AND carried = 1').bind(childId, storeKey),
    db.prepare('UPDATE pokedex SET carried = 1 WHERE child_id = ? AND entry_key = ? AND carried = 0').bind(childId, takeKey),
  ]);

  const v = await bumpChildVersion(db, childId);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, storeKey], v);
  await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [childId, takeKey], v);

  const { carried, stored } = await warehouseLists(db, childId, await mainPetSpeciesNo(db, childId));
  return json({
    ok: true,
    carried,
    stored,
  });
}

async function apiParentPvpRematchList(db, session) {
  const ws = weekStartMon(shDateStr());
  const [kids, r] = await Promise.all([
    getChildren(db, session && session.familyId),
    latestRematchRequest(db, ws, session && session.familyId),
  ]);
  const nameOf = (id) => { const k = kids.find((c) => c.id === id); return k ? k.name : null; };
  return json({ ok: true, weekStart: ws, rematch: rematchView(r, nameOf), requestId: r ? r.id : null });
}

async function apiParentPvpRematchDecide(db, req, session) {
  const body = await readJsonBody(req);
  const id = Number(body.id);
  const row = id ? await db.prepare('SELECT * FROM pvp_rematch_requests WHERE id=?').bind(id).first() : null;
  if (!row || !(await getFamilyChild(db, session && session.familyId, row.requester_child_id))) return notFound404();
  if (row.status !== 'pending') return json({ ok: false, error: '这条申请已经处理过啦' }, 409);
  const ws = weekStartMon(shDateStr());
  if (row.week_start !== ws) return json({ ok: false, error: '这条申请是上周的，已经自动失效啦' }, 400);
  if (body.approve) {
    // 批准前再查一遍不变式：同一周不能同时存在两张待用批准
    const otherApproved = await db.prepare(
      "SELECT id FROM pvp_rematch_requests WHERE week_start=? AND status='approved' AND id<>? LIMIT 1"
    ).bind(ws, id).first();
    if (otherApproved) return json({ ok: false, error: '本周已经有一场批准待用的再来一局啦' }, 409);
  }
  await db.prepare('UPDATE pvp_rematch_requests SET status=?, decided_epoch=? WHERE id=? AND status=?')
    .bind(body.approve ? 'approved' : 'rejected', Math.floor(Date.now() / 1000), id, 'pending').run();
  const [fresh, kids] = await Promise.all([
    db.prepare('SELECT * FROM pvp_rematch_requests WHERE id=?').bind(id).first(),
    getChildren(db),
  ]);
  const nameOf = (cid) => { const k = kids.find((c) => c.id === cid); return k ? k.name : null; };
  return json({ ok: true, rematch: rematchView(fresh, nameOf) });
}

/* -------- 打卡历史奖励（迁移 0011/0012，用户 2026-10-24 定案；2026-10-24 通用发球卡取消后发球只走此口） --------
 * 家长在历史页对已通过记录点奖励：一次固定 1 颗普通精灵球，不批量、不发超级球。
 * 发球只动 children.balls，不发经验、不发碎片、不碰掉落与遭遇口径；
 * 每次发放必写 ball_grants 审计行（孩子/球种/数量/时间/关联打卡），家长面板可查。 */
async function apiParentGrantBall(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 数量与球种由服务端固定，不接受客户端传入（防批量改数）
  // 发球只走历史奖励：无 checkinId 的通用发放已取消，一律拒绝
  const checkinId = body.checkinId != null && body.checkinId !== '' ? Number(body.checkinId) : null;
  if (checkinId == null) return json({ ok: false, error: 'CHECKIN_REQUIRED' }, 400);
  if (!Number.isInteger(checkinId)) return json({ ok: false, error: 'BAD_CHECKIN' }, 400);
  const ck = await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first();
  if (!ck) return json({ ok: false, error: 'CHECKIN_NOT_FOUND' }, 404);
  if (ck.child_id !== child.id) return json({ ok: false, error: 'CHECKIN_CHILD_MISMATCH' }, 400);
  if (ck.status !== 'approved') return json({ ok: false, error: 'CHECKIN_NOT_APPROVED' }, 400);
  const dup = await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first();
  if (dup) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
  const nowEpoch = Math.floor(Date.now() / 1000);
  // 发球与审计同批执行：任一失败都不落账，杜绝无痕改数或有球无记录
  const stmts = [
    db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(child.id),
    db.prepare(
      'INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(?,?,?,?,?,?)'
    ).bind(child.id, 'normal', 1, checkinId, nowEpoch, shDateStr()),
  ];
  let grantId = null;
  try {
    const res = await db.batch(stmts);
    const ins = Array.isArray(res) ? res[1] : null;
    grantId = ins && ins.meta ? Number(ins.meta.last_row_id) : null;
  } catch (e) {
    // 并发重复奖励：唯一索引兜底，复查后回 409（球数未变，因同批回滚）
    if (checkinId != null) {
      const dup = await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first();
      if (dup) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
    }
    throw e;
  }
  if (grantId == null) {
    // 批量返回不带 meta 的运行环境：按（孩子＋题组/时间）回查审计行 id（仅作回显）
    const row = checkinId != null
      ? await db.prepare('SELECT id FROM ball_grants WHERE checkin_id=?').bind(checkinId).first()
      : await db.prepare('SELECT id FROM ball_grants WHERE child_id=? AND created_epoch=? ORDER BY id DESC LIMIT 1').bind(child.id, nowEpoch).first();
    grantId = row ? row.id : null;
  }
  {
    const v = await bumpChildVersion(db, child.id);
    await touchRow(db, 'children', 'id=?', [child.id], v);
    if (grantId) await touchRow(db, 'ball_grants', 'id=?', [grantId], v);
  }
  const fresh = await getChild(db, child.id);
  return json({
    ok: true,
    grant: { id: grantId, childId: child.id, childName: child.name, kind: 'normal', qty: 1, checkinId, date: shDateStr() },
    balls: fresh ? (fresh.balls ?? 0) : 0, ballsSuper: fresh ? (fresh.balls_super ?? 0) : 0,
    ballsHyper: fresh ? (fresh.balls_hyper ?? 0) : 0, ballsMaster: fresh ? (fresh.balls_master ?? 0) : 0,
  });
}

/* -------- 打卡历史奖励下拉菜单（2026-11-03 用户定：每条已通过记录限奖 1 次；2026-11-21 改为三种转盘机会） --------
 * 新口 POST /api/parent/history/grant {childId, checkinId, kind}，kind 白名单只认三种转盘（统一走转盘口径）：
 *   wheel:advanced（高级转盘）/ wheel:oak（普通转盘）/ wheel:care（养成转盘）。
 * 不含稀有转盘：稀有转盘只有期末考试成绩一个获取路径（用户 2026-11-21 定）。
 * 旧 ball / xp / medicine:* 不再接受（BAD_REWARD_KIND）；已用球奖过的旧记录（ball_grants.checkin_id）仍算已奖。
 * 限奖 1 次口径（不分奖品）：ball_grants.checkin_id 或 item_ledger(ref_type='history_reward', ref_id=checkinId)
 * 任一存在即 409 ALREADY_REWARDED。先以 INSERT...SELECT WHERE NOT EXISTS 原子占位（占位行即流水行，
 * item_key 记 wheel:*、delta=1），占位成功后发 1 次对应转盘机会，ref 一律 history-<checkinId>：
 *   oak      → oak_wheel_chances（source='oak'，CHECK 本就认）；
 *   care     → care_wheel_chances（source='history'，须迁移 0046 把 CHECK 扩进 'history'，否则 INSERT OR IGNORE 被静默丢弃）；
 *   advanced → wheel_chances：该表无 source/ref_id，只有 school_test_id（NOT NULL + UNIQUE）。
 *     哨兵：school_test_id = -checkinId（负数）。真实成绩 id 恒为正，永不冲突；抽奖只按 child_id + used_epoch 取最旧一条、
 *     不读 school_test_id；UNIQUE 仍保证每条打卡只领一次。家长手动发的高级机会不占 WHEEL_WEEK_LIMIT 周上限
 *     （周上限只约束考试自动发奖；week_start 照填本周，但不经周配额判断）。
 * 占位成功后发机会失败的窗口极小（同库同请求内），失败时返回 500、记录将显示已奖励，家长需告知助理核查；
 * 旧 /api/parent/balls/grant 原样保留。 */
const HISTORY_REWARD_KINDS = {
  'wheel:advanced': { name: '高级转盘' },
  'wheel:oak': { name: '普通转盘' },
  'wheel:care': { name: '养成转盘' },
};
async function apiParentHistoryGrant(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const kind = body.kind;
  if (typeof kind !== 'string' || !Object.hasOwn(HISTORY_REWARD_KINDS, kind)) return json({ ok: false, error: 'BAD_REWARD_KIND' }, 400);
  const checkinId = body.checkinId != null && body.checkinId !== '' ? Number(body.checkinId) : null;
  if (checkinId == null) return json({ ok: false, error: 'CHECKIN_REQUIRED' }, 400);
  if (!Number.isInteger(checkinId)) return json({ ok: false, error: 'BAD_CHECKIN' }, 400);
  const ck = await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first();
  if (!ck) return json({ ok: false, error: 'CHECKIN_NOT_FOUND' }, 404);
  if (ck.child_id !== child.id) return json({ ok: false, error: 'CHECKIN_CHILD_MISMATCH' }, 400);
  if (ck.status !== 'approved') return json({ ok: false, error: 'CHECKIN_NOT_APPROVED' }, 400);
  const today = shDateStr();
  const nowEpoch = Math.floor(Date.now() / 1000);
  const claim = await db.prepare(`INSERT INTO item_ledger(child_id, item_key, delta, reason, ref_type, ref_id, created_epoch, date_shanghai)
    SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM ball_grants WHERE checkin_id=?)
    AND NOT EXISTS (SELECT 1 FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?)`)
    .bind(child.id, kind, 1, 'history_reward', 'history_reward', checkinId, nowEpoch, today, checkinId, checkinId).run();
  if (!claim.meta || !claim.meta.changes) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
  const ref = 'history-' + checkinId;
  let granted = false;
  if (kind === 'wheel:oak') {
    granted = await grantOakWheelChance(db, child.id, 'oak', ref, today, nowEpoch);
  } else if (kind === 'wheel:care') {
    granted = await grantCareWheelChance(db, child.id, 'history', ref, today, nowEpoch);
  } else {
    const ins = await db.prepare('INSERT OR IGNORE INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)')
      .bind(child.id, -checkinId, weekStartMon(today), nowEpoch, today).run();
    if (ins.meta && ins.meta.changes) {
      const v = await bumpChildVersion(db, child.id);
      await touchRow(db, 'wheel_chances', 'id=?', [Number(ins.meta.last_row_id)], v);
      granted = true;
    }
  }
  if (!granted) return json({ ok: false, error: 'GRANT_FAILED' }, 500);
  return json({ ok: true, grant: { kind, name: HISTORY_REWARD_KINDS[kind].name, qty: 1, checkinId } });
}

// Task 104 批量真卡图：奖池 71 种全量映射（TCGdex 拉取，已是 WebP 600x825，原样落盘）；
// 其中 8 种取 30 周年 Celebration（2026-09-16）：151/144/145/146/150/196/197/38；
// 喷火龙（6）与耿鬼（94）的 30th Classic Collection 图 TCGdex 暂未收录（image 为空），
// 暂用最新版真卡图，后补 30th-c-001/018。图文件 public/static/img/tcg-*.webp 未进
// hash-assets 轮换（baseFiles 未含），直引。
const TCG_CARDS = { 3: '/static/img/tcg-3.webp', 6: '/static/img/tcg-6.webp', 9: '/static/img/tcg-9.webp', 12: '/static/img/tcg-12.webp', 15: '/static/img/tcg-15.webp', 18: '/static/img/tcg-18.webp', 20: '/static/img/tcg-20.webp', 22: '/static/img/tcg-22.webp', 24: '/static/img/tcg-24.webp', 26: '/static/img/tcg-26.webp', 28: '/static/img/tcg-28.webp', 31: '/static/img/tcg-31.webp', 34: '/static/img/tcg-34.webp', 36: '/static/img/tcg-36.webp', 38: '/static/img/tcg-38.webp', 40: '/static/img/tcg-40.webp', 42: '/static/img/tcg-42.webp', 45: '/static/img/tcg-45.webp', 47: '/static/img/tcg-47.webp', 49: '/static/img/tcg-49.webp', 51: '/static/img/tcg-51.webp', 53: '/static/img/tcg-53.webp', 55: '/static/img/tcg-55.webp', 57: '/static/img/tcg-57.webp', 59: '/static/img/tcg-59.webp', 62: '/static/img/tcg-62.webp', 65: '/static/img/tcg-65.webp', 68: '/static/img/tcg-68.webp', 71: '/static/img/tcg-71.webp', 73: '/static/img/tcg-73.webp', 76: '/static/img/tcg-76.webp', 78: '/static/img/tcg-78.webp', 80: '/static/img/tcg-80.webp', 82: '/static/img/tcg-82.webp', 85: '/static/img/tcg-85.webp', 87: '/static/img/tcg-87.webp', 89: '/static/img/tcg-89.webp', 91: '/static/img/tcg-91.webp', 94: '/static/img/tcg-94.webp', 97: '/static/img/tcg-97.webp', 99: '/static/img/tcg-99.webp', 101: '/static/img/tcg-101.webp', 103: '/static/img/tcg-103.webp', 105: '/static/img/tcg-105.webp', 110: '/static/img/tcg-110.webp', 117: '/static/img/tcg-117.webp', 119: '/static/img/tcg-119.webp', 121: '/static/img/tcg-121.webp', 130: '/static/img/tcg-130.webp', 134: '/static/img/tcg-134.webp', 135: '/static/img/tcg-135.webp', 136: '/static/img/tcg-136.webp', 139: '/static/img/tcg-139.webp', 141: '/static/img/tcg-141.webp', 144: '/static/img/tcg-144.webp', 145: '/static/img/tcg-145.webp', 146: '/static/img/tcg-146.webp', 149: '/static/img/tcg-149.webp', 150: '/static/img/tcg-150.webp', 151: '/static/img/tcg-151.webp', 181: '/static/img/tcg-181.webp', 196: '/static/img/tcg-196.webp', 197: '/static/img/tcg-197.webp', 208: '/static/img/tcg-208.webp', 212: '/static/img/tcg-212.webp', 464: '/static/img/tcg-464.webp', 466: '/static/img/tcg-466.webp', 470: '/static/img/tcg-470.webp', 471: '/static/img/tcg-471.webp', 700: '/static/img/tcg-700.webp', 900: '/static/img/tcg-900.webp' };

/* -------- 封印蛋 -------- */

async function apiSealedEggs(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const today = shDateStr();
  const { hatched, notice } = await hatchDueEggs(db, childId, today);
  // 封印蛋 / 奖励蛋（v11 reward_eggs，与封印蛋同一列表形态返回，前端按 reward 区分）/ 已拥有物种：三读互不依赖，并行
  const [{ results }, { results: rew }, owned] = await Promise.all([
    db.prepare(
      'SELECT * FROM sealed_eggs WHERE child_id=? ORDER BY id DESC'
    ).bind(childId).all(),
    db.prepare(
      'SELECT * FROM reward_eggs WHERE child_id=? ORDER BY id DESC'
    ).bind(childId).all(),
    ownedSpeciesSet(db, childId),
  ]);
  const rewardEggs = rew.map((e) => {
    const no = Number(e.species_no);
    return {
      id: e.id, awardedDate: e.date_shanghai, unlockDate: e.unlock_date,
      hatched: e.status === 'hatched', daysLeft: e.status === 'hatched' ? 0 : Math.max(0, diffDays(today, e.unlock_date)),
      species: no, speciesName: (SPECIES[no] || {}).name || `图鉴 #${no}`,
      reward: true, source: e.source, egg: eggDesignFor(no),
    };
  });
  const cards = rareCardHallPool()
    .filter(({ no }) => owned.has(no))
    .map(({ no, group }) => ({
      no,
      name: SPECIES[no]?.name || speciesName(no),
      group,
      types: (DEX_DETAILS[no] || {}).types || [],
      img: petImg(no),
      tcg: TCG_CARDS[no] || null,
      hp: (DEX_DETAILS[no] || {}).stats?.hp ?? null,
      moves: cardFaceMoves(no),
      weak: (((DEX_DETAILS[no] || {}).types || [])[0] && matchupsForType(((DEX_DETAILS[no] || {}).types || [])[0])?.weak?.[0]) || null,
    }));
  return json({
    ok: true,
    justHatched: hatched,
    notice: notice || null,
    eggs: results.map((e) => {
      const no = Number(e.species) || 151;
      return {
        id: e.id, awardedDate: e.awarded_date, unlockDate: e.unlock_date,
        hatched: !!e.hatched, daysLeft: e.hatched ? 0 : Math.max(0, diffDays(today, e.unlock_date)),
        species: no, speciesName: (SPECIES[no] || RARE).name, egg: eggDesignFor(no),
      };
    }),
    rewardEggs,
    cards,
  });
}

/* -------- 图鉴 -------- */

/* -------- 图鉴：静态骨架 + 动态数据拆分（Fable 优化 #2，2026-11-17） --------
 * 旧 /api/pokedex 一次返回 ~732KB（含全部卡片详情）；现拆成三路：
 * - GET /static/pokedex.<hash>.json：全量骨架（条目 key/no/name/img/kind/line/
 *   formIdx/egg + type/types），内容哈希 URL、immutable 缓存，worker 按 live 常量现算；
 * - POST /api/pokedex：仅动态数据（unlocked 列表、obtained、currentLine、
 *   eeveeBranch、mainFriendship、progress、level、xp、fragments、dex151Owned、
 *   collection、eggSpeciesKeys、benchDexKeys）；
 * - POST /api/pokedex/card：单张卡片详情（按需取）。
 * 骨架里的 type/types 只对已获得条目合并进渲染对象（防剧透口径不变，见前端
 * mergePokedexData）；以下 helpers 由三处共用：apiPokedex、apiPokedexCard、
 * pokedexStaticSkeleton。审计见 work/fable-opt11-audit.md。 */

const MAIN_LINE_EGG_NO = { pikachu: 25, charmander: 4, squirtle: 7, bulbasaur: 1, eevee: 133 };

async function loadPokedexCtx(db, childId, { unlock = true } = {}) {
  const c = await getChild(db, childId);
  if (!c) return null;
  const today = shDateStr();
  if (unlock) await unlockForms(db, c, today);
  const [{ results }, eeveeInst, acqRows, mainInst] = await Promise.all([
    db.prepare('SELECT entry_key, unlocked_at FROM pokedex WHERE child_id=?').bind(childId).all(),
    c.line === 'eevee' ? getPetInstance(db, childId, 'eevee') : Promise.resolve(null),
    db.prepare('SELECT species_no, source FROM species_acquisitions WHERE child_id=?').bind(childId).all(),
    getPetInstance(db, childId, c.line),
  ]);
  const unlocked = new Set((results || []).map((r) => r.entry_key));
  const obtained = new Map((results || []).map((r) => [r.entry_key, r.unlocked_at]));
  // 主宠友好度（任务 93）：图鉴卡片主宠线上显示；只读 pet_instances，不建行（无行则 0）
  const mainFriendship = mainInst && mainInst.friendship != null ? Math.max(0, Math.min(FRIENDSHIP_MAX, Number(mainInst.friendship))) : 0;
  const level = levelFromXp(c.total_xp);
  const intoLevel = c.total_xp - xpForLevel(level);
  const span = xpForLevel(level + 1) - xpForLevel(level);
  return {
    c, results: results || [], acqRows: acqRows.results || [],
    unlocked, obtained, mainFriendship, level,
    xp: { total: c.total_xp, intoLevel, span, toNext: span - intoLevel },
    eeveeBranch: eeveeInst ? eeveeInst.branch : null,
    entryKeys: [...unlocked],
  };
}

/* 图鉴骨架（不含卡片详情）：与旧 apiPokedex 的条目构造逐行同源，只是不挂 details()。 */
function buildPokedexSkeletons(c, ctx) {
  const { unlocked } = ctx;
  const lineEntries = [];
  for (const [key, line] of Object.entries(LINES)) {
    // 伊布无线性二/三阶：只到 idx 1（旧循环到 3 会取 forms[2] 崩掉）；8 个分支是正常图鉴条目（134/135/136 在关都图鉴、其余在收藏进化）
    const maxIdx = key === 'eevee' ? 1 : 3;
    for (let idx = 0; idx <= maxIdx; idx++) {
      const ekey = `form:${key}:${idx}`;
      const isEgg = idx === 0;
      lineEntries.push({
        key: ekey, line: key, lineLabel: line.label, formIdx: idx,
        name: isEgg ? '神秘的蛋' : line.forms[idx - 1].name,
        no: isEgg ? null : line.forms[idx - 1].no,
        img: isEgg ? null : petImg(line.forms[idx - 1].no),
        egg: isEgg ? eggDesignFor(line.forms[0].no) : null,
        unlocked: GATES_OPEN || unlocked.has(ekey),
        // 伊布已进化分支时，当前形态是分支条目而非伊布本身
        current: key === c.line && !(key === 'eevee' && ctx.eeveeBranch),
      });
    }
  }
  const wild = WILD.map((w) => ({
    key: `wild:${w.no}`, no: w.no, name: w.name, img: petImg(w.no),
    unlocked: GATES_OPEN || unlocked.has(`wild:${w.no}`),
  }));
  const others = [
    ...GYM_STAGES.map((g) => {
      const sp = SPECIES[g.bossNo];
      return { key: `gym:${g.bossNo}`, no: g.bossNo, name: sp.name, img: petImg(g.bossNo), unlocked: GATES_OPEN || unlocked.has(`gym:${g.bossNo}`), kind: '道馆主' };
    }),
    { key: `rare:${RARE.no}`, no: RARE.no, name: RARE.name, img: petImg(RARE.no), unlocked: GATES_OPEN || unlocked.has(`rare:${RARE.no}`), kind: '稀有' },
  ];
  // 封印蛋孵化（2026-10-27 用户定）：固定道馆蛋＋按各自的主线放其他的几只。
  // 主线蛋物种号取自主宠蛋池 WHEEL_EGG_POOL：皮卡丘线是 25，不是线一阶 172——25 才是高级转盘/单元测试实际发的蛋物种号，
  // 172 只出现在主宠线形态 form:pikachu:1，永不以 egg:172 落库，所以图鉴格子按 egg:25 点亮。
  const eggSpeciesNos = [];
  for (const no of [...GYM_STAGES.map((g) => g.eggSpecies), ...WHEEL_EGG_POOL.filter((no) => no !== MAIN_LINE_EGG_NO[c.line])]) {
    if (!eggSpeciesNos.includes(no)) eggSpeciesNos.push(no);
  }
  const eggSpecies = eggSpeciesNos.map((no) => {
    const key = dexKeyForSpecies(no);
    // 注意：1/4/7/25 不在 SPECIES 表里（主宠线物种只在 LINES 里），须用 speciesName（含 LINES＋分支兜底），不能用 SPECIES[no].name
    return { key, no, name: speciesName(no), img: petImg(no), unlocked: GATES_OPEN || unlocked.has(key), kind: '封印蛋' };
  });
  // 进化/奖励蛋获得的收藏宠（v11）：egg:{no} 图鉴行中除固定道馆蛋物种之外的种；
  // 含 >151 的进化种（464/466/470/471/700/900），它们不进 151 网格，只在这里展示
  const gymEggNos = new Set(GYM_STAGES.map((g) => g.eggSpecies));
  const acqSource = new Map((ctx.acqRows || []).map((r) => [Number(r.species_no), r.source]));
  const collection = [];
  for (const r of ctx.results) {
    const m = /^egg:(\d+)$/.exec(r.entry_key);
    if (!m) continue;
    const no = Number(m[1]);
    if (gymEggNos.has(no) || !COLLECTION_MOVES[no]) continue;
    if (collection.some((x) => x.no === no)) continue;
    const sp = SPECIES[no];
    collection.push({
      key: r.entry_key, no, name: sp?.name || `图鉴 #${no}`, img: petImg(no),
      unlocked: true, type: sp?.type || null, source: acqSource.get(no) || 'egg',
      obtainedAt: r.unlocked_at,
    });
  }
  collection.sort((a, b) => a.no - b.no);
  // 测试站备战卡片：benchOptions 里的种在测试站视为已收录（仅 GATES_OPEN）。
  // 只补那些在任何图鉴分册（lineEntries/wild/others/eggSpecies/collection/dex151）里
  // 都没有条目的种（>151 的进化种，第一批后只剩 196/197/470/471/700 五种伊布进化形）；
  // 已有条目的种（179 野外、700 蛋等）一律不动。benchDex 是独立字段，不进 collection，
  // 不影响图鉴页渲染与 progress 统计；正式站无此字段。
  let benchDex = null;
  if (GATES_OPEN) {
    benchDex = [];
    const haveNos = new Set([
      ...lineEntries, ...wild, ...others, ...eggSpecies, ...collection,
    ].map((e) => e.no).filter((n) => n != null));
    for (let n = 1; n <= POKEDEX_TOTAL; n++) haveNos.add(n);
    for (const no of Object.keys(COLLECTION_MOVES).map(Number).sort((a, b) => a - b)) {
      if (haveNos.has(no)) continue;
      const sp = SPECIES[no];
      benchDex.push({ key: dexKeyForSpecies(no), no, name: sp?.name || speciesName(no), img: petImg(no), unlocked: true, type: sp?.type || null, kind: '收藏进化', source: 'bench' });
    }
  }
  return { lineEntries, wild, others, eggSpecies, collection, benchDex };
}

/* 单张卡片详情：旧 apiPokedex 内联 details() 原样抽出，闭包变量改走 ctx 显式传参。 */
function pokedexDetailsFor(e, ctx) {
  const { c, level, eeveeBranch, unlocked, obtained, mainFriendship } = ctx;
  if (!e || e.no == null) return {};
  // 未获得条目不返回详情（图鉴格子显示 ???、不可点）；伊布分支不再例外。
  if (!GATES_OPEN && !e.unlocked) return {};
  const isLine = e.line === c.line;
  const gym = GYM_STAGES.find((g) => e.key === `gym:${g.bossNo}`);
  const lineType = e.line ? LINE_TYPE[e.line] : SPECIES[e.no]?.type;
  let moves = e.line
    ? learnedMoves(e.line, level).map(([lv, name, desc]) => {
      const off = officialMove(name);
      return { level: lv, name, desc, type: off ? off.type : LINE_TYPE[e.line], damage_class: off ? off.damage_class : undefined, power: 25 + 6 * lv };
    })
    : gym
      ? (gym.bossTeam
        ? (gym.bossTeam.find((m) => m.no === e.no) || gym.bossTeam[gym.bossTeam.length - 1]).moves // 2026-11-17 8 关扩围：多只队伍，按种族号取该成员招式（王牌=队尾）
        : gym.bossMoves).map(([name, type, power]) => {
        const off = officialMove(name);
        return { name, type, damage_class: off ? off.damage_class : undefined, power };
      })
      : (() => { // 卡片展示物种完整招式表（带学会等级）；已学会的带技能等级（与备战战斗同源 collectionMovesFor），可进升级入口；战斗仍按已学会招式算（buildPlayerSide）
        const learned = new Map(collectionMovesFor(c, e.no, level).map((m) => [m.name, m]));
        return (COLLECTION_LEARNSET[e.no] || []).map(([lv, name, desc]) => {
          const lm = learned.get(name);
          if (lm) return { ...lm, learned: true };
          const off = officialMove(name);
          return { level: lv, name, desc, type: off ? off.type : lineType, damage_class: off ? off.damage_class : undefined, power: 25 + 6 * lv, skillLevel: 1, learned: false };
        });
      })()
  // 妖精技能石教会的招式只挂在当前主宠线上（v11）
  if (isLine) {
    const fm = fairyMovesOf(c);
    if (fm.length) moves = [...moves, ...fm.map((m) => ({ level: m.level, name: m.name, desc: m.desc || '', fairy: true, type: '妖精', power: 25 + 6 * m.level }))];
  }
  const det = DEX_DETAILS[e.no] || null;
  // 伊布本体卡片不泄露未获得的分支路线：只列已进化出的分支（进化一个点亮一个，路线由孩子自己发现）。
  let evo = dexEvoChain(e.no);
  if (!GATES_OPEN && e.no === 133 && evo.branches) {
    const byNo = new Map(Object.entries(EEVEE_BRANCHES).map(([k, b]) => [b.no, k]));
    const kept = evo.branches.filter((b) => unlocked.has(`form:eevee:branch:${byNo.get(b.no)}`));
    evo = { ...evo, branches: kept.length ? kept : null };
  }
  let actualLevel = null;
  let actualStats = null;
  let scaledLevel = null;
  if (gym) {
    actualLevel = gym.bossLevel;
    scaledLevel = effBossLevel(gym);
    actualStats = statsFor(e.no, scaledLevel);
  } else if (isLine) {
    const formNo = lineFormNo(c.line, level);
    actualLevel = level;
    scaledLevel = effPlayerLevel(level);
    actualStats = formNo != null ? statsFor(formNo, scaledLevel) : null;
  } else {
    actualLevel = level;
    scaledLevel = effPlayerLevel(level);
    actualStats = statsFor(e.no, scaledLevel);
  }
  return {
    type: lineType,
    types: det ? det.types : [lineType].filter(Boolean),
    moves,
    abilities: det ? det.abilities : [],
    stats: det ? det.stats : null,
    ...(actualStats ? { actualStats, actualLevel, scaledLevel } : {}),
    evo,
    // 实战克制关系：馆主条目按官方双属性（bossDefTypes）算，与道馆 calcDamage 同源；其余条目按战斗单属性（lineType）算
    matchups: gym ? matchupsForTypes(bossDefTypes(e.no)) : (lineType ? matchupsForType(lineType) : null),
    ...(gym ? { matchupsDual: true } : {}),
    ...(isLine ? { level } : {}),
    ...(isLine ? { friendship: mainFriendship } : {}),
    obtainedAt: obtained.get(e.key),
  };
}

/* 静态骨架里的 type/types：与 details() 的取值完全一致，只是静态（不依赖孩子状态）。 */
function pokedexEntryTypes(no, lineKey) {
  const lineType = lineKey ? LINE_TYPE[lineKey] : (SPECIES[no] ? SPECIES[no].type : null);
  const det = DEX_DETAILS[no] || null;
  return { type: lineType || null, types: det ? det.types : [lineType].filter(Boolean) };
}

/* 全量静态骨架（跨孩子并集）＋内容哈希。worker 按 live 常量现算，零漂移；
 * hash 只是缓存键——分发层对任何合规 hash 都返回当前内容（部署间隙不 404）。 */
function pokedexStaticSkeleton() {
  const lineEntries = [];
  for (const [key, line] of Object.entries(LINES)) {
    const maxIdx = key === 'eevee' ? 1 : 3;
    for (let idx = 0; idx <= maxIdx; idx++) {
      const isEgg = idx === 0;
      const no = isEgg ? null : line.forms[idx - 1].no;
      const e = {
        key: `form:${key}:${idx}`, line: key, lineLabel: line.label, formIdx: idx,
        name: isEgg ? '神秘的蛋' : line.forms[idx - 1].name,
        no, img: isEgg ? null : petImg(no),
        egg: isEgg ? eggDesignFor(line.forms[0].no) : null,
      };
      if (no != null) Object.assign(e, pokedexEntryTypes(no, key));
      lineEntries.push(e);
    }
  }
  const wild = WILD.map((w) => ({ key: `wild:${w.no}`, no: w.no, name: w.name, img: petImg(w.no), ...pokedexEntryTypes(w.no, null) }));
  const others = [
    ...GYM_STAGES.map((g) => {
      const sp = SPECIES[g.bossNo];
      return { key: `gym:${g.bossNo}`, no: g.bossNo, name: sp.name, img: petImg(g.bossNo), kind: '道馆主', ...pokedexEntryTypes(g.bossNo, null) };
    }),
    { key: `rare:${RARE.no}`, no: RARE.no, name: RARE.name, img: petImg(RARE.no), kind: '稀有', ...pokedexEntryTypes(RARE.no, null) },
  ];
  const eggNos = [];
  for (const no of [...GYM_STAGES.map((g) => g.eggSpecies), ...WHEEL_EGG_POOL]) {
    if (!eggNos.includes(no)) eggNos.push(no);
  }
  const eggSpecies = eggNos.map((no) => ({ key: dexKeyForSpecies(no), no, name: speciesName(no), img: petImg(no), kind: '封印蛋', ...pokedexEntryTypes(no, null) }));
  const haveNos = new Set([
    ...lineEntries, ...wild, ...others, ...eggSpecies,
  ].map((e) => e.no).filter((n) => n != null));
  for (let n = 1; n <= POKEDEX_TOTAL; n++) haveNos.add(n);
  const benchDex = [];
  for (const no of Object.keys(COLLECTION_MOVES).map(Number).sort((a, b) => a - b)) {
    if (haveNos.has(no)) continue;
    const sp = SPECIES[no];
    benchDex.push({ key: dexKeyForSpecies(no), no, name: sp?.name || speciesName(no), img: petImg(no), type: sp?.type || null, kind: '收藏进化', source: 'bench', ...pokedexEntryTypes(no, null) });
  }
  const dex151 = Array.from({ length: POKEDEX_TOTAL }, (_, i) => {
    const no = i + 1;
    return { no, name: speciesName(no), img: petImg(no), ...pokedexEntryTypes(no, null) };
  });
  const data = { lineEntries, wild, others, eggSpecies, benchDex, dex151 };
  const hash = fnv1aHash(JSON.stringify(data)).toString(16).padStart(8, '0');
  return { hash, data };
}

/* 按 key 解析卡片条目：顺序与前端 openDexCard 的 entries.find 一致
 *（collection 在 eggSpecies 之前，egg:N 歧义时收藏胜出）。
 * dex151:N 按旧 dex151 构造的同款逻辑解析到源条目。 */
function pokedexResolveEntry(c, ctx, groups, key) {
  const m151 = /^dex151:(\d+)$/.exec(key);
  if (m151) {
    const no = Number(m151[1]);
    if (!Number.isInteger(no) || no < 1 || no > POKEDEX_TOTAL) return null;
    const ownedEntries = [...groups.lineEntries.filter((e) => e.current), ...groups.wild, ...groups.others, ...groups.eggSpecies, ...groups.collection];
    let entry = ownedEntries.find((e) => e.no === no && e.unlocked);
    if (!entry && GATES_OPEN) {
      entry = groups.lineEntries.find((e) => e.no === no) || { key: dexKeyForSpecies(no), no, unlocked: true };
    }
    // 未获得的 151 行是合法条目、只是锁定：返回锁定标记，让调用方得 LOCKED（403）而非 NOT_FOUND。
    if (!entry) return { entry: { key, no, unlocked: false }, sourceKey: key };
    return { entry, sourceKey: entry.key };
  }
  const all = [...groups.lineEntries, ...groups.wild, ...groups.others, ...groups.collection, ...groups.eggSpecies, ...(groups.benchDex || [])];
  const entry = all.find((e) => e.key === key);
  if (!entry) return null;
  return { entry, sourceKey: entry.key };
}

async function apiPokedex(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const ctx = await loadPokedexCtx(db, sc.id);
  if (!ctx) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const groups = buildPokedexSkeletons(ctx.c, ctx);
  const { hash } = pokedexStaticSkeleton();
  // 有效已获得集合：正式站 = 图鉴表行；测试站 = 全部骨架键（前端无从得知 GATES_OPEN，
  // 旧接口是把 unlocked:true 烘进每条目的，此处等价地展开列表）。
  const unlocked = GATES_OPEN
    ? [...new Set([...groups.lineEntries, ...groups.wild, ...groups.others, ...groups.eggSpecies, ...groups.collection, ...(groups.benchDex || [])].map((e) => e.key))]
    : [...ctx.unlocked];
  const dex151Owned = GATES_OPEN
    ? Array.from({ length: POKEDEX_TOTAL }, (_, i) => i + 1)
    : ownedDexNos(ctx.entryKeys, ctx.c.line);
  return json({
    ok: true, staticHash: hash, unlocked,
    obtained: Object.fromEntries(ctx.obtained),
    currentLine: ctx.c.line, eeveeBranch: ctx.eeveeBranch, mainFriendship: ctx.mainFriendship,
    progress: dex151Progress(ctx.entryKeys, ctx.c.line),
    level: ctx.level, xp: ctx.xp, fragments: ctx.c.quiz_fragments || 0,
    dex151Owned,
    collection: groups.collection,
    eggSpeciesKeys: groups.eggSpecies.map((e) => e.key),
    ...(GATES_OPEN ? { benchDexKeys: groups.benchDex.map((e) => e.key) } : {}),
  });
}

async function apiPokedexCard(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.childId);
  if (sc.err) return sc.err;
  const key = String((body && body.key) || '');
  if (!key) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const ctx = await loadPokedexCtx(db, sc.id, { unlock: false });
  if (!ctx) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const groups = buildPokedexSkeletons(ctx.c, ctx);
  const resolved = pokedexResolveEntry(ctx.c, ctx, groups, key);
  if (!resolved) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const { entry, sourceKey } = resolved;
  if (entry.no == null) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (!GATES_OPEN && !entry.unlocked) return json({ ok: false, error: 'LOCKED' }, 403);
  return json({ ok: true, key, sourceKey, no: entry.no, details: pokedexDetailsFor(entry, ctx) });
}

/* -------- 统计 / 历史（家长） -------- */

async function apiStats(db, session, url) {
  const today = shDateStr();
  const ws = weekStartMon(today);
  const monthPrefix = today.slice(0, 7);
  const out = [];
  const only = url && url.searchParams.get('childId');
  if (only && !(await getFamilyChild(db, session && session.familyId, only))) return notFound404();
  const kids = (await getChildren(db, session && session.familyId)).filter((k) => !only || k.id === Number(only));
  // 各孩子、每孩子的 3 个计数全部并行；Promise.all 保持 getChildren 的顺序
  out.push(...await Promise.all(kids.map(async (c) => {
    const q = async (where, ...args) => {
      const r = await db.prepare(`SELECT COUNT(DISTINCT date) n FROM checkins WHERE child_id=? AND ${where}`).bind(c.id, ...args).first();
      return r ? r.n : 0;
    };
    const [weekApproved, monthApproved, totalApproved] = await Promise.all([
      q("status='approved' AND date>=? AND date<?", ws, addDays(ws, 7)), // 按天计
      q("status='approved' AND date LIKE ?", monthPrefix + '%'),
      q("status='approved'"),
    ]);
    return {
      childId: c.id, name: c.name,
      weekApproved, monthApproved, totalApproved,
      totalXp: c.total_xp, level: levelFromXp(c.total_xp), streak: c.streak,
    };
  })));
  return json({ ok: true, stats: out, today, weekStart: ws });
}

async function apiHistory(db, session, url) {
  const sc = await familyScopeFromUrl(db, session, url);
  if (sc.err) return sc.err;
  const { results } = await db.prepare(
    `SELECT ck.*, ch.name AS child_name FROM checkins ck JOIN children ch ON ch.id=ck.child_id
     WHERE 1=1${sc.sql} ORDER BY ck.id DESC LIMIT 80`
  ).bind(...sc.args).all();
  // 历史奖励态：一次查询拉出已奖励的打卡 id 集合（旧通用发球记录 checkin_id 为空，不影响；
  // 2026-11-03 起下拉菜单的非球奖励以 item_ledger 统一标记行记账，两处取并集）
  // 照片、ball_grants、item_ledger 三者只依赖打卡 id 列表，并行发
  const rewarded = new Set();
  const rewardedName = new Map();
  const placeholders = results.map(() => '?').join(',');
  const [pmap, gsRes, lsRes] = await Promise.all([
    photosByCheckin(db, results.map((r) => r.id)),
    results.length ? db.prepare(
      `SELECT checkin_id FROM ball_grants WHERE checkin_id IN (${placeholders})`
    ).bind(...results.map((r) => r.id)).all() : null,
    results.length ? db.prepare(
      `SELECT ref_id, item_key FROM item_ledger WHERE ref_type='history_reward' AND ref_id IN (${placeholders})`
    ).bind(...results.map((r) => r.id)).all() : null,
  ]);
  if (results.length) {
    const gs = gsRes.results;
    const ls = lsRes.results;
    for (const g of gs) if (g.checkin_id != null) rewarded.add(g.checkin_id);
    for (const l of ls) {
      if (l.ref_id == null) continue;
      rewarded.add(l.ref_id);
      if (!rewardedName.has(l.ref_id)) {
        rewardedName.set(l.ref_id, Object.hasOwn(HISTORY_REWARD_KINDS, l.item_key) ? HISTORY_REWARD_KINDS[l.item_key].name : l.item_key === 'ball:normal' ? '普通球' : l.item_key === 'xp:20' ? '经验+20' : ((ITEM_CATALOG[l.item_key] || {}).name || l.item_key));
      }
    }
  }
  return json({
    ok: true,
    history: results.map((r) => ({
      id: r.id, childId: r.child_id, childName: r.child_name, date: r.date,
      subject: r.subject || (safeJsonArr(r.subjects)[0] || ''), note: r.note || '',
      subjects: safeJsonArr(r.subjects), submittedAt: r.submitted_at,
      status: r.status, isEarly: !!r.is_early, xp: r.xp_awarded, reason: r.reason,
      photos: pmap.get(r.id) || [],
      rewarded: rewarded.has(r.id),
      rewardedName: rewardedName.get(r.id) || null,
    })),
  });
}

/* -------- 设置（家长） -------- */

/* 5 项打卡设置的范围校验（我家设置 与 系统管理的全站默认共用）。返回 {ops:[[snakeKey, valueString]...]} 或 {err}。
 * 值为 null / '' = 清除（家庭覆盖时回到全站默认）。 */
function parseCheckinSettings(body) {
  const ops = [];
  const rules = [
    ['baseXp', 'base_xp', 10, 200, '基础经验需为 10–200'],
    ['subjectXp', 'subject_xp', 1, 100, '每科经验需为 1–100'],
    ['quizRepeatDays', 'quiz_repeat_days', 7, 90, '去重窗口需为 7–90 天'],
    ['quizXp', 'quiz_xp', 0, 100, '问答奖励经验需为 0–100'],
  ];
  for (const [f, key, lo, hi, msg] of rules) {
    if (body[f] === undefined) continue;
    if (body[f] === null || body[f] === '') { ops.push([key, null]); continue; }
    const v = Number(body[f]);
    if (!Number.isInteger(v) || v < lo || v > hi) return { err: json({ ok: false, error: msg }, 400) };
    ops.push([key, String(v)]);
  }
  if (body.cutoffTime !== undefined) {
    if (body.cutoffTime === null || body.cutoffTime === '') ops.push(['cutoff_time', null]);
    else {
      const v = String(body.cutoffTime);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return { err: json({ ok: false, error: '时间格式不对' }, 400) };
      ops.push(['cutoff_time', v]);
    }
  }
  return { ops };
}

async function apiGetSettings(db, env, session) {
  const testMode = isTestMode(env);
  const fam = session && session.familyId;
  const [kids, ov] = await Promise.all([getChildren(db, fam), getFamilyOverrides(db, fam)]);
  // 111: 设置读取原来是约 15 次顺序单键查询（每孩 3 个进度＋8 个全局＋2 个调试），
  // 串行 D1 往返占了 /api/parent/settings 大部分耗时。改成一次批量取（getSettings，1 次往返）。
  const keys = [];
  for (const c of kids) keys.push(`math_progress_${c.id}`, `chinese_progress_${c.id}`, `english_progress_${c.id}`);
  keys.push('care_enabled', 'oak_assess', 'english_mode', 'base_xp', 'subject_xp', 'cutoff_time', 'quiz_xp', 'quiz_repeat_days');
  if (testMode) keys.push('debug_day_offset', 'debug_hour');
  // 设置批量读与权限读互不依赖：并行（权限仅在返回里用）
  const [S, permissions] = await Promise.all([getSettings(db, keys), sessionPermissions(db, session)]);
  const eff = (k) => (ov[k] !== undefined && ov[k] !== null && ov[k] !== '' ? String(ov[k]) : S.get(k));
  const children = [];
  for (const c of kids) {
    const g = gradeNumFromLabel(c.grade_label);
    const chapters = g != null ? MATH_CHAPTERS[g] : null;
    let mathProgress = null;
    if (Array.isArray(chapters) && chapters.length) {
      const savedRaw = S.get(`math_progress_${c.id}`);
      const saved = savedRaw == null ? '' : String(savedRaw).trim();
      const valid = !!saved && chapters.includes(saved);
      mathProgress = {
        chapters,
        current: valid ? saved : defaultMathChapter(g),
        isDefault: !valid,
      };
    }
    let chineseProgress = null;
    const chineseChapters = g != null ? CHINESE_CHAPTERS[g] : null;
    if (Array.isArray(chineseChapters) && chineseChapters.length) {
      const savedRaw = S.get(`chinese_progress_${c.id}`);
      const saved = savedRaw == null ? '' : String(savedRaw).trim();
      const valid = !!saved && chineseChapters.includes(saved);
      chineseProgress = {
        chapters: chineseChapters,
        current: valid ? saved : defaultChineseChapter(g),
        isDefault: !valid,
      };
    }
    let englishProgress = null;
    const englishChapters = g != null ? ENGLISH_UNITS[g] : null;
    if (Array.isArray(englishChapters) && englishChapters.length) {
      const savedRaw = S.get(`english_progress_${c.id}`);
      const saved = savedRaw == null ? '' : String(savedRaw).trim();
      const valid = !!saved && englishChapters.includes(saved);
      englishProgress = {
        chapters: englishChapters,
        current: valid ? saved : defaultEnglishChapter(g),
        isDefault: !valid,
      };
    }
    children.push({
      id: c.id, name: c.name, grade: c.grade_label, line: c.line,
      hasPassword: !!c.pwd_hash,
      mathProgress,
      chineseProgress,
      englishProgress,
    });
  }
  return json({
    ok: true,
    settings: {
    careEnabled: S.get('care_enabled') === '1',
    oakAssess: S.get('oak_assess') !== '0',
    englishMode: S.get('english_mode') === '1',
      baseXp: Number(eff('base_xp') || 40),
      subjectXp: Number(eff('subject_xp') || 15),
      cutoffTime: eff('cutoff_time') || '21:30',
      quizXp: Number(eff('quiz_xp') || 10),
      quizRepeatDays: Number(eff('quiz_repeat_days') || QUIZ_CORRECT_WINDOW_DAYS),
      children,
      lines: Object.entries(LINES).map(([k, v]) => ({ key: k, label: v.label, short: v.label.replace(/线$/, ''), img: petImg(v.forms[0].no) })),
      copyright: COPYRIGHT,
      testMode,
      debug: testMode ? {
        dayOffset: parseInt(S.get('debug_day_offset') || '0', 10) || 0,
        hour: S.get('debug_hour') || '',
        virtualToday: shDateStr(),
        virtualTime: shTimeHM(),
        isWeekend: isWeekendDate(shDateStr()),
        gatesOpen: GATES_OPEN_FULL,
      } : null,
    },
    ...(await familySettingsExtras(db, session, ov, S)),
    permissions,
    isSysadmin: permissions.includes('admin.access'),
  });
}

/* 多家庭附加信息：有效值之外再给「本家是否覆盖了」「全站默认」「所在家庭」「是不是 sysadmin」「临时授权状态」 */
async function familySettingsExtras(db, session, ov, S) {
  const fam = session && session.familyId;
  if (!fam) return {};
  let f = null;
  try { f = await db.prepare('SELECT id, name FROM families WHERE id=?').bind(fam).first(); } catch { f = null; }
  const has = (k) => ov[k] !== undefined && ov[k] !== null && ov[k] !== '';
  const o = {};
  const d = {};
  for (const [k, f2] of Object.entries(FAMILY_SETTING_KEYS)) o[f2] = has(k);
  d.baseXp = Number(S.get('base_xp') || 40); d.subjectXp = Number(S.get('subject_xp') || 15);
  d.cutoffTime = S.get('cutoff_time') || '21:30'; d.quizXp = Number(S.get('quiz_xp') || 10);
  d.quizRepeatDays = Number(S.get('quiz_repeat_days') || QUIZ_CORRECT_WINDOW_DAYS);
  return {
    familyOverrides: o, siteDefaults: d, family: f ? { id: f.id, name: f.name } : null,
    tempAuth: await getTempAuth(db, fam),
  };
}

/* 学习进度校验（数学/语文/英语同款）：只校验不写入。章节为空 = 清除回默认，不查年级章节表；
 * 只有真给了章节才要求该年级有列表且章节在列表内。gradeOf 给出孩子本次保存后的年级标签
 *（同一次保存里可能同时改了年级）。返回 {ops} 或 {err: Response}。 */
async function validateProgressItems(db, items, cfg, gradeOf, familyId) {
  if (!Array.isArray(items)) return { err: json({ ok: false, error: cfg.arrMsg }, 400) };
  const ops = [];
  for (const item of items) {
    const cid = Number(item && item.id);
    const target = cid ? await getFamilyChild(db, familyId, cid) : null;
    if (!target) return { err: json({ ok: false, error: 'NOT_FOUND' }, 404) };
    const key = `${cfg.prefix}_${target.id}`;
    const chapter = item.chapter == null ? '' : String(item.chapter).trim();
    if (!chapter) { ops.push({ key, chapter: null }); continue; }
    const g = gradeNumFromLabel(gradeOf(target));
    const chapters = g != null ? cfg.table[g] : null;
    if (!Array.isArray(chapters) || !chapters.length) return { err: json({ ok: false, error: cfg.noListMsg }, 400) };
    if (!chapters.includes(chapter)) return { err: json({ ok: false, error: cfg.badMsg }, 400) };
    ops.push({ key, chapter });
  }
  return { ops };
}

async function apiUpdateSettings(db, req, session) {
  const body = await readJsonBody(req);
  const fam = session && session.familyId;
  // 全站级开关（宠物养成/语言等）需要 settings.global 权限（角色权限表）；带了全站字段却没权限 → 403，整次请求什么都不写
  const touchesGlobal = body.careEnabled !== undefined || body.oakAssess !== undefined || body.englishMode !== undefined;
  const allowGlobal = touchesGlobal && (await hasPermission(db, session, 'settings.global'));
  if (touchesGlobal && !allowGlobal) return json({ ok: false, error: 'NOT_ALLOWED', message: '只有管理员能改全站设置' }, 403);
  let visibleChange = false;
  let globalChange = false; // 全站开关（关怀/博士/英文）变了才推所有家庭的版本；其余只推本家
  // —— 第一段：整体校验，一项都不写；任何一项不合法就整次保存不生效（报错与事实一致） ——
  const childRows = [];
  if (Array.isArray(body.children)) {
    for (const k of body.children) {
      const name = String(k.name || '').trim().slice(0, 12);
      const grade = String(k.grade || '').trim().slice(0, 12);
      if (!name || !grade) return json({ ok: false, error: '名字和年级不能为空' }, 400);
      if (!(await getFamilyChild(db, fam, k.id))) return notFound404();
      childRows.push({ id: Number(k.id), name, grade });
    }
  }
  const newGrade = new Map(childRows.map((r) => [r.id, r.grade]));
  const gradeOf = (target) => newGrade.has(target.id) ? newGrade.get(target.id) : target.grade_label;
  const chk = parseCheckinSettings(body);
  if (chk.err) return chk.err;
  const settingOps = chk.ops;
  // 学习进度（每个孩子单独）：chapter 为空 = 清除回默认（不查章节表）；给了章节才校验年级列表
  const progressOps = [];
  const progressCfgs = [
    ['mathProgress', { prefix: 'math_progress', table: MATH_CHAPTERS, arrMsg: 'mathProgress 必须为数组', noListMsg: '该年级暂无数学章节列表', badMsg: '章节不在该年级列表内' }],
    ['chineseProgress', { prefix: 'chinese_progress', table: CHINESE_CHAPTERS, arrMsg: 'chineseProgress 必须为数组', noListMsg: '该年级暂无语文单元列表', badMsg: '语文章节不在该年级列表内' }],
    ['englishProgress', { prefix: 'english_progress', table: ENGLISH_UNITS, arrMsg: 'englishProgress 必须为数组', noListMsg: '该年级暂无英语单元列表', badMsg: '英语单元不在该年级列表内' }],
  ];
  for (const [field, cfg] of progressCfgs) {
    if (body[field] === undefined) continue;
    const r = await validateProgressItems(db, body[field], cfg, gradeOf, fam);
    if (r.err) return r.err;
    progressOps.push(...r.ops);
  }
  if (body.newPin !== undefined && !/^\d{4}$/.test(String(body.newPin))) return json({ ok: false, error: 'PIN 必须是 4 位数字' }, 400);
  // —— 第二段：写入 ——
  if (allowGlobal && body.careEnabled !== undefined) await setSetting(db, 'care_enabled', body.careEnabled ? '1' : '0');
  if (allowGlobal && body.careEnabled !== undefined) visibleChange = globalChange = true;
  if (allowGlobal && body.oakAssess !== undefined) await setSetting(db, 'oak_assess', body.oakAssess ? '1' : '0');
  if (allowGlobal && body.oakAssess !== undefined) visibleChange = globalChange = true;
  if (allowGlobal && body.englishMode !== undefined) await setSetting(db, 'english_mode', body.englishMode ? '1' : '0');
  if (allowGlobal && body.englishMode !== undefined) visibleChange = globalChange = true;
  // 孩子名/年级
  for (const r of childRows) {
    await db.prepare('UPDATE children SET name=?, grade_label=? WHERE id=?')
      .bind(r.name, r.grade, r.id).run();
    await setGradeAnchor(db, r.id); // 家长手动改年级：以当前学年为新起点
    // 家长改孩子名字：账号的显示名一起改（兄弟对战列表、各页头像旁的名字读账号）；老夹具库没有 accounts 表时忽略
    try { await db.prepare('UPDATE accounts SET display_name=? WHERE child_id=?').bind(r.name, r.id).run(); } catch { /* 无账号表 */ }
    visibleChange = true;
  }
  if (fam && settingOps.length) { // 有家庭：5 项设置存成本家覆盖（families.settings_json），不动全站默认
    const o = await getFamilyOverrides(db, fam);
    for (const [key, val] of settingOps) { if (val === null) delete o[key]; else o[key] = val; }
    await db.prepare('UPDATE families SET settings_json=? WHERE id=?').bind(JSON.stringify(o), fam).run();
    visibleChange = true;
  } else {
    for (const [key, val] of settingOps) {
      if (val === null) await db.prepare('DELETE FROM settings WHERE key=?').bind(key).run();
      else await setSetting(db, key, val);
      visibleChange = true;
    }
  }
  if (body.newPin !== undefined) {
    let famRow = null;
    if (fam) { try { famRow = await db.prepare('SELECT pin2_hash FROM families WHERE id=?').bind(fam).first(); } catch { famRow = null; } }
    if (famRow && famRow.pin2_hash) await db.prepare('UPDATE families SET pin2_hash=? WHERE id=?').bind(await sha256hex(String(body.newPin)), fam).run();
    else await setSetting(db, 'pin', await sha256hex(String(body.newPin)));
  }
  // 孩子入口密码：为每个孩子分别设置/重置（存哈希）；传空字符串 = 清除（回到未设置）
  // 密码变动后立即作废该孩子已有的全部会话：否则改密码前已登录的设备（会话 30 天有效）
  // 会一直免密码直进，家长改完密码却看不到任何变化（2026-10-21 iPhone 上报的 bug）。
  if (Array.isArray(body.childPasswords)) {
    for (const item of body.childPasswords) {
      const cid = Number(item && item.id);
      const target = cid ? await getFamilyChild(db, fam, cid) : null;
      if (!target) return json({ ok: false, error: 'NOT_FOUND' }, 404);
      if (item.password === '' || item.password === null) {
        await db.prepare('UPDATE children SET pwd_hash=NULL, pwd_fail_count=0, pwd_locked_until=0 WHERE id=?')
          .bind(cid).run();
      } else {
        const v = String(item.password);
        if (!/^\d{4}$/.test(v)) return json({ ok: false, error: '孩子密码必须是 4 位数字' }, 400);
        await db.prepare('UPDATE children SET pwd_hash=?, pwd_fail_count=0, pwd_locked_until=0 WHERE id=?')
          .bind(await sha256hex(v), cid).run();
      }
      await db.prepare("DELETE FROM sessions WHERE kind='child' AND child_id=?").bind(cid).run();
      visibleChange = true;
    }
  }
  for (const op of progressOps) {
    if (op.chapter === null) {
      await db.prepare('DELETE FROM settings WHERE key=?').bind(op.key).run();
    } else {
      await setSetting(db, op.key, op.chapter);
    }
    visibleChange = true;
  }
  if (visibleChange) await bumpAllChildrenVersions(db, globalChange ? null : fam);
  return json({ ok: true });
}

/* 换主宠门槛（v11 §5.3）：孩子同时持有某属性进化石、又获得该属性主宠类蛋时可选择更换；
 * 蛋＋石配对见 SWITCH_REQ；切回曾作主宠的线（has_been_main）无需蛋石；不消耗道具；
 * 换主宠继承等级/XP，新线按当前等级推导招式，不自动授予终极形态；蛋须已孵化（孵化后执行）。 */
async function checkSwitchLine(db, child, lineKey, today) {
  if (!LINES[lineKey]) return { ok: false, error: '没有这条线' };
  if (child.line === lineKey) return { ok: false, error: '已经是这条线啦' };
  const inst = await ensurePetInstance(db, child.id, lineKey, today, 'egg');
  if (inst.has_been_main) return { ok: true, inst, free: true };
  const req = SWITCH_REQ[lineKey];
  if (!req) return { ok: false, error: '这条线暂时不能切换' };
  if (GATES_OPEN) return { ok: true, inst, free: true };
  const eggNo = req.egg;
  const eggName = speciesName(eggNo);
  const hasEgg = await ownsSpeciesEver(db, child.id, eggNo);
  if (!hasEgg) {
    const pending = await hasPendingEgg(db, child.id, eggNo);
    return { ok: false, error: pending ? '蛋还在孵化，等孵出来再换哦' : `还没有${eggName}的蛋哦`, missing: 'egg', pending };
  }
  let stone = null;
  for (const s of req.stones) {
    if ((await getInventoryQty(db, child.id, s)) > 0) { stone = s; break; }
  }
  if (!stone) return { ok: false, error: '还没有对应的进化石哦', missing: 'stone' };
  return { ok: true, inst, free: false, stone };
}

async function doSwitchLine(db, child, lineKey, today) {
  const gate = await checkSwitchLine(db, child, lineKey, today);
  if (!gate.ok) return gate;
  const oldLine = child.line;
  // 任务 110：把旧主宠实例落盘（has_been_main=1）——实例是懒创建的；
  // 若此前从未跑过 attachEvoForm/unlockForms，旧线实例可能根本不存在，
  // 那之后 getExMainLine 永远查不到它。已存在时同样补上标记
  // （蛋来源创建的实例 has_been_main 初始为 0）。
  const oldInst = await ensurePetInstance(db, child.id, oldLine, today, 'main');
  if (oldInst && !oldInst.has_been_main) {
    await db.prepare('UPDATE pet_instances SET has_been_main=1, updated_epoch=? WHERE id=?')
      .bind(Math.floor(Date.now() / 1000), oldInst.id).run();
  }
  // 任务 110：旧主宠进携带——先按旧主宠当前形态算物种（attachEvoForm 同款口径，
  // 在副本上算，不动 child 本体；蛋形态没有物种可带，oldNo 为 null 时跳过）。
  const oldChild = { ...child };
  await attachEvoForm(db, oldChild, today);
  const oldEvo = oldChild._evo;
  const oldNo = oldEvo && oldEvo.branchNo ? oldEvo.branchNo
    : (oldEvo && oldEvo.formIdx > 0 ? LINES[oldLine].forms[Math.min(oldEvo.formIdx - 1, LINES[oldLine].forms.length - 1)].no : null);
  const hasCol = await hasCarriedColumn(db);
  await db.prepare('UPDATE children SET line=? WHERE id=?').bind(lineKey, child.id).run();
  await syncTouch(db, child.id, 'children', 'id=?', [child.id]);
  await db.prepare('UPDATE pet_instances SET has_been_main=1, updated_epoch=? WHERE id=?')
    .bind(Math.floor(Date.now() / 1000), gate.inst.id).run();
  if (oldNo) {
    const oldKey = dexKeyForSpecies(oldNo);
    let changed = false;
    if (hasCol) {
      const carriedNow = await carriedCollection(db, child.id);
      const carriedVal = carriedNow.length < MAX_CARRIED_COLLECTION ? 1 : 0;
      const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at, carried) VALUES(?,?,?,?)')
        .bind(child.id, oldKey, today, carriedVal).run();
      if (ins.meta && ins.meta.changes) changed = true;
      else {
        const upd = await db.prepare('UPDATE pokedex SET carried=? WHERE child_id=? AND entry_key=? AND carried!=?')
          .bind(carriedVal, child.id, oldKey, carriedVal).run();
        if (upd.meta && upd.meta.changes) changed = true;
      }
    } else {
      // 旧链：没有 carried 列，只记获得（携带按获得顺序算，insertPokedexWithCarryRule 同款）
      const ins = await db.prepare('INSERT OR IGNORE INTO pokedex(child_id, entry_key, unlocked_at) VALUES(?,?,?)')
        .bind(child.id, oldKey, today).run();
      if (ins.meta && ins.meta.changes) changed = true;
    }
    if (changed) {
      const v = await bumpChildVersion(db, child.id);
      await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [child.id, oldKey], v);
    }
  }
  // A 步：清新主宠的 carried（目标线全部形态种——切回时旧形态行不残留，杜绝重复显示）。
  if (hasCol) {
    const newKeys = [
      ...LINES[lineKey].forms.map((f) => dexKeyForSpecies(f.no)),
      ...(lineKey === 'eevee' ? Object.values(EEVEE_BRANCHES).map((b) => dexKeyForSpecies(b.no)) : []),
    ];
    let cleared = false;
    for (const k of newKeys) {
      const c = await db.prepare('UPDATE pokedex SET carried=0 WHERE child_id=? AND entry_key=? AND carried=1')
        .bind(child.id, k).run();
      if (c.meta && c.meta.changes) cleared = true;
    }
    if (cleared) {
      const v = await bumpChildVersion(db, child.id);
      for (const k of newKeys) await touchRow(db, 'pokedex', 'child_id=? AND entry_key=?', [child.id, k], v);
    }
  }
  await unlockForms(db, { ...child, line: lineKey }, today);
  return { ok: true, line: lineKey, lineLabel: LINES[lineKey].label, from: oldLine, free: gate.free };
}

/* 家长路由（保留）：requirePin 由路由层做 */
async function apiSwitchLine(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const r = await doSwitchLine(db, child, String(body.line || ''), shDateStr());
  if (!r.ok) return json({ ok: false, error: r.error }, 400);
  return json({ ok: true, line: r.line, lineLabel: r.lineLabel, from: r.from, free: r.free });
}

/* 孩子自选发起换主宠（v11 §5.3）：无需家长审批，门槛与家长路由同一套 */
async function apiChildSwitchLine(db, req, session) {
  return withChild(db, req, session, async (child, body) => {
    const r = await doSwitchLine(db, child, String(body.line || ''), shDateStr());
    if (!r.ok) return json({ ok: false, error: r.error }, 400);
    return json({ ok: true, line: r.line, lineLabel: r.lineLabel, from: r.from, free: r.free });
  });
}

/* 重置时连带清照片：先删 R2 对象（尽力而为），再删索引行 */
async function clearAllPhotos(db, env) {
  try {
    const { results } = await db.prepare('SELECT object_key FROM checkin_photos').all();
    for (const r of results) await photoDelete(env, r.object_key);
  } catch { /* 照片表/桶异常不阻塞重置主流程 */ }
}

async function apiResetAll(db, env, req, session) {
  // 多家庭模式下这是「清空全站所有数据」的危险操作，任何家庭的家长都不能调
  if (session && session.familyId) return json({ ok: false, error: 'RESET_DISABLED', message: '多家庭模式下不提供全站重置' }, 403);
  const body = await readJsonBody(req);
  if (body.confirm !== true) return json({ ok: false, error: '需要二次确认' }, 400);
  await clearAllPhotos(db, env);
  const stmts = [
    'DELETE FROM checkin_photos',
    'DELETE FROM checkins', 'DELETE FROM encounters', 'DELETE FROM gym_battles',
    'DELETE FROM gym_weeks', 'DELETE FROM sealed_eggs', 'DELETE FROM pokedex',
    'DELETE FROM battles', 'DELETE FROM gym_progress',
    // 道馆二期 Tier 1：全站重置清连败计数；旧库无表时跳过（不阻塞重置主流程）
    ...(await hasEvoTable(db, 'gym_fail_streaks') ? ['DELETE FROM gym_fail_streaks'] : []),
    'DELETE FROM pvp_rematch_requests', // 再来一局申请也须清：已批准的申请同周内会一直打开对战（canOpen），残留会污染下一轮验收
    "DELETE FROM settings WHERE key LIKE 'gym_final_egg_%'",
    'DELETE FROM quiz_attempts', 'DELETE FROM quiz_daily', 'DELETE FROM quiz_diagnoses', 'DELETE FROM child_notices',
    'DELETE FROM ball_grants',
    'DELETE FROM care_logs', 'DELETE FROM oak_assessments', 'DELETE FROM oak_draws',
    'DELETE FROM item_inventory', 'DELETE FROM item_ledger', 'DELETE FROM item_grants', 'DELETE FROM item_uses',
    'DELETE FROM pet_instances', 'DELETE FROM species_acquisitions',
    'DELETE FROM school_test_records', 'DELETE FROM wheel_chances', 'DELETE FROM wheel_week_quotas',
    'DELETE FROM unit_tests', 'DELETE FROM unit_test_questions', 'DELETE FROM unit_test_answers',
    'DELETE FROM unit_test_draws', 'DELETE FROM draw_week_quotas', 'DELETE FROM reward_eggs', 'DELETE FROM daily_item_drops',
    "UPDATE children SET total_xp=0, streak=0, last_checkin_date=NULL, titles='[]', stickers='[]', quiz_fragments=0, quiz_correct_total=0, unlocked_moves='[]', balls=3, balls_super=0, balls_hyper=0, balls_master=0, fairy_moves='[]'",
    "UPDATE children SET name='大宝', grade_label='三年级', line='pikachu' WHERE id=1",
    "UPDATE children SET name='小宝', grade_label='一年级', line='charmander' WHERE id=2",
    "INSERT INTO settings(key,value) VALUES('pin_fail_count','0'),('pin_locked_until','0') ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  ];
  await db.batch(stmts.map((s) => db.prepare(s)));
  await bumpAllChildrenVersions(db); // 批量删除：只推版本、不逐行记 tombstone（全量重同步可恢复）
  return json({ ok: true });
}

/* -------- 测试模式专用接口（路由层先判 TEST_MODE，非测试环境一律 404） -------- */

/* 调试快照：单个孩子只留“等级”和“道具”两项（2026-11-17 问题 2 简化）。
 * 等级改动时经验/招式/技能等级按等级自动匹配，不再返回；道具只给当前数量（发放时累加）。纯读，不写库。 */
async function debugSnapshotForChild(db, c) {
  const level = levelFromXp(c.total_xp);
  return {
    id: c.id, name: c.name, lineLabel: LINES[c.line].label,
    level,
    balls: c.balls ?? 3, ballsSuper: c.balls_super ?? 0,
    ballsHyper: c.balls_hyper ?? 0, ballsMaster: c.balls_master ?? 0,
    fragments: c.quiz_fragments ?? 0,
  };
}

/* 调试发放的道具清单：key → 库字段/中文名/单次发放后上限。碎片另维持
 * fragments == floor(quiz_correct_total/5)（发放 N 碎片即视同多答对 5N 题）。 */
const DEBUG_ITEMS = {
  balls: { column: 'balls', label: '精灵球', max: DEBUG_BALLS_MAX },
  ballsSuper: { column: 'balls_super', label: '超级球', max: DEBUG_BALLS_MAX },
  ballsHyper: { column: 'balls_hyper', label: '高级球', max: DEBUG_BALLS_MAX },
  ballsMaster: { column: 'balls_master', label: '大师球', max: DEBUG_BALLS_MAX },
  fragments: { column: 'quiz_fragments', label: '碎片', max: DEBUG_FRAGMENTS_MAX },
};

async function apiDebugState(db, session) {
  const out = [];
  for (const c of await getChildren(db, session && session.familyId)) out.push(await debugSnapshotForChild(db, c));
  return json({ ok: true, children: out });
}

async function apiDebugSet(db, req, session) {
  const body = await readJsonBody(req);
  const childId = Number(body.childId);
  if (!Number.isInteger(childId) || childId <= 0) return json({ ok: false, error: 'childId 不对' }, 400);
  const child = await getFamilyChild(db, session && session.familyId, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // —— 先整体校验再写入，避免部分写入（与 apiUpdateSettings 的 mathProgress 同款做法） ——
  // 只接受两项（2026-11-17 问题 2 简化）：level（改等级，经验/招式/技能按等级自动匹配）
  // 与 item+qty（发放道具，累加到当前数量）。旧字段（totalXp/balls/ballsSuper/ballsHyper/
  // ballsMaster/fragments/streak/unlockedMoves）不再接收，直接忽略（旧缓存页面照常能改等级）。
  const has = (k) => body[k] !== undefined && body[k] !== null;
  let newTotalXp = null, xpChanged = false;
  if (has('level')) {
    const level = Number(body.level);
    if (!Number.isInteger(level) || level < DEBUG_LEVEL_MIN || level > DEBUG_LEVEL_MAX)
      return json({ ok: false, error: `等级需为 ${DEBUG_LEVEL_MIN}–${DEBUG_LEVEL_MAX} 的整数` }, 400);
    newTotalXp = xpForLevel(level);
    xpChanged = newTotalXp !== child.total_xp;
  }
  let grant = null;
  if (has('item') || has('qty')) {
    const spec = DEBUG_ITEMS[body.item];
    if (!spec) return json({ ok: false, error: '没有这个道具' }, 400);
    const qty = Number(body.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > DEBUG_GRANT_QTY_MAX)
      return json({ ok: false, error: `发放数量需为 1–${DEBUG_GRANT_QTY_MAX} 的整数` }, 400);
    grant = { spec, qty };
  }
  if (newTotalXp === null && grant === null)
    return json({ ok: false, error: '没有要改的项' }, 400);
  // —— 写入 ——
  const sets = [], args = [];
  if (newTotalXp !== null) { sets.push('total_xp=?'); args.push(newTotalXp); }
  if (grant) {
    // 发放累加到当前数量，封顶到该道具上限；碎片另维持不变量（多发 N 碎片即视同多答对 5N 题）。
    const cur = Number(child[grant.spec.column] ?? 0) || 0;
    const next = Math.min(cur + grant.qty, grant.spec.max);
    sets.push(`${grant.spec.column}=?`); args.push(next);
    if (grant.spec.column === 'quiz_fragments') { sets.push('quiz_correct_total=?'); args.push(next * 5); }
  }
  if (sets.length) {
    await db.prepare(`UPDATE children SET ${sets.join(', ')} WHERE id=?`).bind(...args, childId).run();
  }
  await syncTouch(db, childId, 'children', 'id=?', [childId]);
  if (xpChanged) {
    const fresh = await getChild(db, childId);
    await syncChildForms(db, fresh, shDateStr());
  }
  const snap = await debugSnapshotForChild(db, await getChild(db, childId));
  return json({ ok: true, child: snap });
}

/* 设置/清除时间模拟偏移（settings: debug_day_offset 天、debug_hour ''=跟随真实） */
async function apiDebugTimeSet(db, req) {
  const body = await readJsonBody(req);
  if (body.clear === true) {
    await setSetting(db, 'debug_day_offset', '0');
    await setSetting(db, 'debug_hour', '');
    return json({ ok: true, cleared: true });
  }
  const off = Number(body.dayOffset);
  if (!Number.isInteger(off) || off < -3650 || off > 3650) {
    return json({ ok: false, error: '偏移天数需为 -3650..3650 的整数' }, 400);
  }
  let hour = body.hour;
  if (hour === undefined || hour === null || hour === '' || hour === 'real') {
    hour = '';
  } else {
    hour = Number(hour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return json({ ok: false, error: '模拟小时需为 0–23，或留空跟随真实时间' }, 400);
    }
    hour = String(hour);
  }
  await setSetting(db, 'debug_day_offset', String(off));
  await setSetting(db, 'debug_hour', hour);
  return json({ ok: true, dayOffset: off, hour });
}

/* 重置测试数据：清打卡/问答/进度回出厂（含孩子密码回到未设置），保留题目库与 settings（PIN/参数），并清零时间偏移 */
/* 开/关门槛放行（settings: debug_open_gates；仅测试模式路由可达） */
async function apiDebugGatesSet(db, req) {
  const body = await readJsonBody(req);
  const open = body.open === true;
  await setSetting(db, 'debug_open_gates', open ? '1' : '0');
  return json({ ok: true, gatesOpen: open });
}

async function apiDebugReset(db, env, req) {
  const body = await readJsonBody(req);
  if (body.confirm !== true) return json({ ok: false, error: '需要二次确认' }, 400);
  const childrenSchema = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='children'").first();
  const resetMoveLevels = childrenSchema?.sql?.includes('move_levels') ? ", move_levels='{}'" : '';
  await clearAllPhotos(db, env);
  const stmts = [
    'DELETE FROM checkin_photos',
    'DELETE FROM checkins', 'DELETE FROM encounters', 'DELETE FROM gym_battles',
    'DELETE FROM gym_weeks', 'DELETE FROM sealed_eggs', 'DELETE FROM pokedex',
    'DELETE FROM battles', 'DELETE FROM gym_progress',
    // 道馆二期 Tier 1：全站重置清连败计数；旧库无表时跳过（不阻塞重置主流程）
    ...(await hasEvoTable(db, 'gym_fail_streaks') ? ['DELETE FROM gym_fail_streaks'] : []),
    'DELETE FROM pvp_rematch_requests', // 再来一局申请也须清：已批准的申请同周内会一直打开对战（canOpen），残留会污染下一轮验收
    "DELETE FROM settings WHERE key LIKE 'gym_final_egg_%'",
    'DELETE FROM quiz_attempts', 'DELETE FROM quiz_daily', 'DELETE FROM quiz_diagnoses', 'DELETE FROM child_notices',
    'DELETE FROM ball_grants',
    'DELETE FROM care_logs', 'DELETE FROM oak_assessments', 'DELETE FROM oak_draws',
    'DELETE FROM item_inventory', 'DELETE FROM item_ledger', 'DELETE FROM item_grants', 'DELETE FROM item_uses',
    'DELETE FROM pet_instances', 'DELETE FROM species_acquisitions',
    'DELETE FROM school_test_records', 'DELETE FROM wheel_chances', 'DELETE FROM wheel_week_quotas',
    'DELETE FROM unit_tests', 'DELETE FROM unit_test_questions', 'DELETE FROM unit_test_answers',
    'DELETE FROM unit_test_draws', 'DELETE FROM draw_week_quotas', 'DELETE FROM reward_eggs', 'DELETE FROM daily_item_drops',
    "UPDATE children SET total_xp=0, streak=0, last_checkin_date=NULL, titles='[]', stickers='[]', quiz_fragments=0, quiz_correct_total=0, unlocked_moves='[]', balls=3, balls_super=0, balls_hyper=0, balls_master=0, fairy_moves='[]'" + resetMoveLevels,
    'UPDATE children SET pwd_hash=NULL, pwd_fail_count=0, pwd_locked_until=0',
    "UPDATE children SET name='测试大宝', grade_label='三年级', line='pikachu' WHERE id=1",
    "UPDATE children SET name='测试小宝', grade_label='一年级', line='charmander' WHERE id=2",
    "INSERT INTO settings(key,value) VALUES('pin_fail_count','0'),('pin_locked_until','0'),('debug_day_offset','0'),('debug_hour','') ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  ];
  await db.batch(stmts.map((s) => db.prepare(s)));
  await bumpAllChildrenVersions(db); // 批量删除：只推版本、不逐行记 tombstone（全量重同步可恢复）
  return json({ ok: true });
}

/* ================= v11 进化道具：新端点 =================
 * 背包 / 用石 / 进化（孩子）· 学校成绩与高级转盘（家长＋孩子）· App 单元测试（家长开＋孩子答） */

/* 孩子背包总览：球＋库存＋蛋＋实例＋可进化项＋高级转盘机会＋当日掉落数 */
async function apiEvoBackpack(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('childId'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  await hatchDueEggs(db, child.id, today);
  await attachEvoForm(db, child, today);
  const level = levelFromXp(child.total_xp);
  // 背包页的全部读取互不依赖（孵化/形态挂接已在上面完成）：一次并行取齐
  const [inv, { results: instRows }, ownedSet, claimedSteps, { results: sealed }, { results: rew },
    wheelChances, rareWheelChances, careWheelChances, oakWheelChances, dd] = await Promise.all([
    getInventory(db, child.id),
    db.prepare('SELECT * FROM pet_instances WHERE child_id=? ORDER BY id').bind(child.id).all(),
    ownedSpeciesSet(db, child.id),
    evoRewardClaimedSteps(db, child.id),
    db.prepare('SELECT * FROM sealed_eggs WHERE child_id=? AND hatched=0 ORDER BY unlock_date').bind(child.id).all(),
    db.prepare("SELECT * FROM reward_eggs WHERE child_id=? AND status='pending' ORDER BY unlock_date").bind(child.id).all(),
    wheelChancesLeft(db, child.id),
    rareWheelChancesLeft(db, child.id),
    careWheelChancesLeft(db, child.id),
    oakWheelChancesLeft(db, child.id),
    db.prepare('SELECT COUNT(*) n FROM daily_item_drops WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(),
  ]);
  const invQty = {};
  for (const it of inv) invQty[it.key] = it.qty;
  const instances = [];
  for (const inst of instRows) {
    const isMain = inst.line_key === child.line;
    const cur = isMain ? child._evo : null;
    const name = cur ? cur.formName : speciesName(inst.species_no);
    instances.push({
      lineKey: inst.line_key, speciesNo: inst.species_no, name,
      img: cur ? cur.img : petImg(inst.species_no),
      formIdx: inst.form_idx, branch: inst.branch || null,
      source: inst.source, hasBeenMain: !!inst.has_been_main, current: isMain,
      evoOptions: evoOptionsFor(child, inst, invQty, level, { owned: ownedSet, claimedSteps }),
    });
  }
  const eggs = [
    ...sealed.map((e) => {
      const no = Number(e.species) || 151;
      return { id: e.id, kind: 'sealed', species: no, speciesName: (SPECIES[no] || RARE).name, egg: eggDesignFor(no), unlockDate: e.unlock_date, daysLeft: Math.max(0, diffDays(today, e.unlock_date)) };
    }),
    ...rew.map((e) => {
      const no = Number(e.species_no);
      return { id: e.id, kind: 'reward', species: no, speciesName: (SPECIES[no] || {}).name || `图鉴 #${no}`, egg: eggDesignFor(no), unlockDate: e.unlock_date, daysLeft: Math.max(0, diffDays(today, e.unlock_date)), source: e.source };
    }),
  ];
  return json({
    ok: true, childId: child.id, line: child.line, level,
    balls: { normal: child.balls ?? 0, super: child.balls_super ?? 0, hyper: child.balls_hyper ?? 0, master: child.balls_master ?? 0 },
    inventory: inv.map((it) => (it.key && it.key.startsWith('egg:') && EGG_SPECIES_BY_ITEM[it.key]
      ? { ...it, egg: eggDesignFor(EGG_SPECIES_BY_ITEM[it.key]) } : it)),
    fairyMoves: fairyMovesOf(child), eggs, instances,
    wheelChances, rareWheelChances, careWheelChances, oakWheelChances,
    gatesOpen: GATES_OPEN_FULL, /* 任务 124：转盘页据此决定 0 次时能否扭 */
    dailyDropsToday: dd ? (dd.n || 0) : 0, dailyDropLimit: DAILY_DROP_DAILY_LIMIT,
  });
}

/* 进化失败文案（服务端错误码 → 孩子能看懂的话） */
function evoErrorMessage(r) {
  switch (r.error) {
    case 'NO_STONE': return `没有${(ITEM_CATALOG[r.stone] || {}).name || '对应的石头'}啦`;
    case 'LEVEL_TOO_LOW': return `要到 ${r.need} 级才能进化哦`;
    case 'ALREADY_EVOLVED': return '已经进化过啦';
    case 'EVO_REWARD_CLAIMED': return '这个进化奖励已经领过啦';
    case 'FAIRY_POOL_FULL': return '妖精招式都学会啦，这块石头用不上';
    case 'NO_FAIRY_MOVE': return '要先用妖精技能石学会妖精招式哦';
    case 'NO_FINAL_FORM': return '这条线没有终极形态哦';
    case 'NO_EVO_LINE': return '这只精灵没有进化路线哦';
    case 'BAD_BRANCH': return '没有这个进化分支';
    default: return r.error || '现在不能进化哦';
  }
}

/* 用石（孩子）：主宠终极 / 伊布分支 / 收藏线用石步骤 / 妖精技能石教学。
 * body: {childId, target: 'main'|'eevee'|'species:{no}', branch?, to?（目标物种号，收藏线分支用）, action?: 'teach'|'evolve'} */
async function apiEvoUseStone(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const target = String(body.target || '');
    let r;
    if (target === 'main') {
      if (child.line === 'eevee') return json({ ok: false, error: '伊布没有终极形态，8 个分支在伊布线里选哦' }, 400);
      const inst = await ensurePetInstance(db, child.id, child.line, today);
      r = await applyMainFinalEvo(db, child, inst, today);
    } else if (target === 'eevee') {
      if (child.line !== 'eevee') return json({ ok: false, error: '先切换到伊布线再进化哦' }, 400);
      const inst = await ensurePetInstance(db, child.id, 'eevee', today);
      if (body.action === 'teach') {
        r = await applyFairyTeach(db, child, inst, today);
      } else {
        const branch = String(body.branch || '');
        if (!EEVEE_BRANCHES[branch]) return json({ ok: false, error: '没有这个进化分支' }, 400);
        r = await applyEeveeBranchEvo(db, child, inst, branch, today);
      }
    } else if (target.startsWith('species:')) {
      const inst = await ensurePetInstance(db, child.id, target, today, 'egg');
      const [ownedSet, claimedSteps] = await Promise.all([ownedSpeciesSet(db, child.id), evoRewardClaimedSteps(db, child.id)]);
      const opts = evoOptionsFor(child, inst, {}, levelFromXp(child.total_xp), { owned: ownedSet, claimedSteps });
      if (!opts.length) return json({ ok: false, error: '现在不能进化哦' }, 400);
      const toNo = body.to != null && body.to !== '' ? Number(body.to) : null;
      const opt = toNo != null ? opts.find((o) => o.target === toNo) : opts[0];
      if (!opt) return json({ ok: false, error: '没有这个进化分支' }, 400);
      if (!opt.item) return json({ ok: false, error: '这次进化不用石头，去进化入口确认吧' }, 400);
      r = await applyCollectionEvo(db, child, inst, today, toNo);
    } else {
      return json({ ok: false, error: '参数不对' }, 400);
    }
    if (!r.ok) return json({ ok: false, error: evoErrorMessage(r) }, 400);
    return json({ ok: true, ...r, inventory: await getInventory(db, child.id) });
  });
}

/* 进化确认（孩子）：不用石头的进化——收藏线等级/交换门槛、仙子伊布确认。
 * body: {childId, target: 'species:{no}'|'eevee', branch?, to?（目标物种号，收藏线分支用）} */
async function apiEvoEvolve(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const target = String(body.target || '');
    let r;
    if (target === 'eevee') {
      if (child.line !== 'eevee') return json({ ok: false, error: '先切换到伊布线再进化哦' }, 400);
      if (String(body.branch || '') !== 'sylveon') return json({ ok: false, error: '不用石头的伊布进化只有仙子伊布哦' }, 400);
      const inst = await ensurePetInstance(db, child.id, 'eevee', today);
      r = await applyEeveeBranchEvo(db, child, inst, 'sylveon', today);
    } else if (target.startsWith('species:')) {
      const inst = await ensurePetInstance(db, child.id, target, today, 'egg');
      r = await applyCollectionEvo(db, child, inst, today, body.to != null && body.to !== '' ? Number(body.to) : null);
    } else {
      return json({ ok: false, error: '参数不对' }, 400);
    }
    if (!r.ok) return json({ ok: false, error: evoErrorMessage(r) }, 400);
    return json({ ok: true, ...r, inventory: await getInventory(db, child.id) });
  });
}
/* 稀有转盘可用次数（仿 wheelChancesLeft，只数本表未用行；表未建如旧迁移链时当 0，不抛错）。 */
async function rareWheelChancesLeft(db, childId) {
  return wheelChancesLeftFor(db, 'rare_wheel_chances', childId);
}
/* -------- 养成转盘（2026-11-08 新建，Daily English 奖励）：机会发放 --------
 * 机会表 care_wheel_chances（迁移 0028）：不进 sync 注册表——转盘须联网，离线端不用。
 * 发放一律 INSERT OR IGNORE（UNIQUE(child_id, source, ref_id) 防重），返回是否新发。
 * 不占高级转盘周上限：不走 wheel_chances、不触 WHEEL_WEEK_LIMIT（周上限仅限高级转盘）。 */
async function grantCareWheelChance(db, childId, source, refId, today, now) {
  return grantWheelChance(db, 'care_wheel_chances', 'care', childId, source, refId, today, now);
}
/* 养成转盘可用次数（仿 rareWheelChancesLeft，只数本表未用行；表未建如旧迁移链时当 0，不抛错）。 */
async function careWheelChancesLeft(db, childId) {
  return wheelChancesLeftFor(db, 'care_wheel_chances', childId);
}
/* 普通转盘可用次数（只数本表未用行；表未建如旧迁移链时当 0，不抛错）。 */
async function oakWheelChancesLeft(db, childId) {
  return wheelChancesLeftFor(db, 'oak_wheel_chances', childId);
}

/* 家长看孩子上报的试卷照片（审核时核对用；PIN 会话；照片 15 天到期后 404）。 */
async function apiParentSchoolPhoto(db, env, recordId, session) {
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(recordId).first();
  if (!rec || !rec.photo_key || !(await getFamilyChild(db, session && session.familyId, rec.child_id))) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const now = Math.floor(Date.now() / 1000);
  if (rec.photo_expires_epoch && rec.photo_expires_epoch < now) return json({ ok: false, error: '照片已过期' }, 404);
  if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通' }, 503);
  const obj = await env.PHOTOS.get(rec.photo_key);
  if (!obj) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const ct = rec.photo_key.endsWith('.png') ? 'image/png' : rec.photo_key.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return new Response(obj.body, { headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=3600' } });
}

/* -------- App 内单元测试（v11 路径 B） -------- */

/* 单元测试选题：数学／语文／英语仅取当前进度内所选单元的已激活题（无 chapter 不使用，新门 fail-closed）；其余科目按科目＋单元取。
 * 首期 20 道等权；题量不足 20 时按实际题数出（≥5 才开），分数按百分比折算。 */
async function pickUnitTestQuestions(db, child, subject, unit, count, rng = Math.random) {
  const [{ results: all }, mathGate, chineseGate, englishGate] = await Promise.all([
    db.prepare('SELECT * FROM quiz_questions').all(),
    subject === '数学' ? loadMathGate(db, child) : null,
    subject === '语文' ? loadChineseGate(db, child) : null,
    subject === '英语' ? loadEnglishGate(db, child) : null,
  ]);
  const rows = all.map(normalizeQuizRow).filter((q) => q.active);
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const cands = rows.filter((q) => {
    if (q.kind === 'oak') return false;
    if (q.kind === 'riddle') return false;
    if (q.subject !== subject) return false;
    if (!(q.grade === gradeNum || q.grade == null)) return false;
    if (subject === '数学') {
      if (!q.chapter || q.chapter !== unit) return false; // 无 chapter 不使用
      return mathGatePass(q, mathGate);
    }
    if (subject === '语文') {
      if (q.chapter === '通用复习') return false; // 通用复习题不进单元测试
      if (!q.chapter || q.chapter !== unit) return false; // 无 chapter 不使用（与数学同模式，新门 fail-closed）
      return chineseGatePass(q, chineseGate);
    }
    if (subject === '英语') {
      if (q.chapter === '通用复习') return false; // 通用复习题不进单元测试
      if (!q.chapter || q.chapter !== unit) return false; // 无 chapter 不使用（与数学同模式，新门 fail-closed）
      return englishGatePass(q, englishGate);
    }
    if (q.chapter && q.chapter !== unit) return false;
    return true;
  });
  const arr = [...cands];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/* 家长开启一次单元测试：20 道等权（题量不足时按实际题数，≥5 才开）；
 * 同孩子／科目／单元重开冷却 24 小时；每孩每上海自然周最多 3 次机会（开局时计数）。 */
async function apiParentUnitTestStart(db, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const subject = String(body.subject || '');
  if (!QUIZ_SUBJECTS.includes(subject)) return json({ ok: false, error: '科目只能选 语文/数学/英语/阅读' }, 400);
  const unit = String(body.unit || '').trim().slice(0, 40);
  if (!unit) return json({ ok: false, error: '单元不能为空' }, 400);
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  // 冷却：同孩子／科目／单元 24 小时内开过就不再开
  const last = await db.prepare('SELECT created_epoch FROM unit_tests WHERE child_id=? AND subject=? AND unit=? ORDER BY created_epoch DESC LIMIT 1')
    .bind(child.id, subject, unit).first();
  if (!GATES_OPEN && last && now - (last.created_epoch || 0) < UNIT_TEST_COOLDOWN_SECS) {
    return json({ ok: false, error: '这个单元 24 小时内已经开过一次啦，明天再来吧' }, 400);
  }
  const questions = await pickUnitTestQuestions(db, child, subject, unit, UNIT_TEST_QUESTION_COUNT);
  if (questions.length < 5) {
    return json({ ok: false, error: `这个单元的题目还不够（只有 ${questions.length} 道，至少要 5 道）` }, 400);
  }
  // 周限额原子计数（开局时计数，中奖与否均计数）：已有行且 count<3 才 +1，无行先插首行
  const ws = weekStartMon(today);
  if (!GATES_OPEN) {
  const inc = await db.prepare('UPDATE draw_week_quotas SET count=count+1 WHERE child_id=? AND week_start=? AND count<?')
    .bind(child.id, ws, UNIT_TEST_WEEK_LIMIT).run();
  if (!inc.meta || !inc.meta.changes) {
    const insQ = await db.prepare('INSERT OR IGNORE INTO draw_week_quotas(child_id, week_start, count) VALUES(?,?,1)')
      .bind(child.id, ws).run();
    if (!insQ.meta || !insQ.meta.changes) {
      const inc2 = await db.prepare('UPDATE draw_week_quotas SET count=count+1 WHERE child_id=? AND week_start=? AND count<?')
        .bind(child.id, ws, UNIT_TEST_WEEK_LIMIT).run();
      if (!inc2.meta || !inc2.meta.changes) {
        return json({ ok: false, error: '本周的单元测试机会已经用完啦（每周最多 3 次）' }, 400);
      }
    }
  }
  }
  const qSnap = questions.map((q) => ({ id: q.id, question: q.question, options: q.options, answer_idx: q.answer_idx, explain: q.explain || '' }));
  const ins = await db.prepare(
    "INSERT INTO unit_tests(child_id, subject, unit, question_ids, status, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?, 'open',?,?,?)"
  ).bind(child.id, subject, unit, JSON.stringify(qSnap.map((q) => q.id)), ws, now, today).run();
  const testId = ins.meta ? Number(ins.meta.last_row_id) : null;
  if (ins.meta && ins.meta.changes > 0) {
    await syncTouch(db, child.id, 'unit_tests', 'id=?', [testId]);
  }
  if (!testId) return json({ ok: false, error: '开启失败' }, 500);
  await db.batch(qSnap.map((q) =>
    db.prepare('INSERT INTO unit_test_questions(unit_test_id, question_id, question_json) VALUES(?,?,?)')
      .bind(testId, q.id, JSON.stringify(q))
  ));
  return json({
    ok: true,
    test: {
      id: testId, childId: child.id, subject, unit, questionCount: qSnap.length,
      questions: qSnap.map((q) => ({ id: q.id, question: q.question, options: q.options })),
    },
  });
}

/* 孩子取单元测试（最新一次未答的＋最近 5 次记录） */
async function apiChildUnitTest(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('childId'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  // 「进行中的测试＋它的题目」与「最近交卷＋它们的抽奖」是两条互不相干的读链：两链并行，链内仍先查后用
  const [openTest, { recent, draws }] = await Promise.all([
    (async () => {
      const open = await db.prepare("SELECT * FROM unit_tests WHERE child_id=? AND status='open' ORDER BY created_epoch DESC LIMIT 1")
        .bind(child.id).first();
      if (!open) return null;
      const { results: qs } = await db.prepare('SELECT question_json FROM unit_test_questions WHERE unit_test_id=? ORDER BY id')
        .bind(open.id).all();
      return {
        id: open.id, subject: open.subject, unit: open.unit, questionCount: qs.length,
        questions: qs.map((r) => {
          const q = JSON.parse(r.question_json);
          return { id: q.id, question: q.question, options: q.options };
        }),
      };
    })(),
    (async () => {
      const { results: recent } = await db.prepare("SELECT * FROM unit_tests WHERE child_id=? AND status='submitted' ORDER BY submitted_epoch DESC LIMIT 5")
        .bind(child.id).all();
      const draws = {};
      if (recent.length) {
        const { results: dr } = await db.prepare(`SELECT * FROM unit_test_draws WHERE unit_test_id IN (${recent.map(() => '?').join(',')})`)
          .bind(...recent.map((r) => r.id)).all();
        for (const d of dr) draws[d.unit_test_id] = d;
      }
      return { recent, draws };
    })(),
  ]);
  return json({
    ok: true,
    openTest,
    recent: recent.map((r) => ({
      id: r.id, subject: r.subject, unit: r.unit, score: r.score,
      correctCount: r.correct_count, total: r.total_count, submittedAt: r.submitted_epoch,
      draw: draws[r.id] ? { won: !!draws[r.id].won, prizeKey: draws[r.id].prize_key || null } : null,
    })),
  });
}

/* 孩子提交单元测试：计分（百分比）→ 85 分以上抽奖；测试题不产生每日经验或掉球，不触发 §9 日常事件 */
async function apiChildUnitTestSubmit(db, req, session) {
  return withChild(db, req, session, async (child, body) => {
    const testId = Number(body.testId);
    const test = await db.prepare('SELECT * FROM unit_tests WHERE id=?').bind(testId).first();
    if (!test) return json({ ok: false, error: 'NOT_FOUND' }, 404);
    if (test.child_id !== child.id) return json({ ok: false, error: 'FORBIDDEN' }, 403);
    if (test.status !== 'open') return json({ ok: false, error: '这场测试已经交过啦' }, 400);
    const { results: qs } = await db.prepare('SELECT question_id, question_json FROM unit_test_questions WHERE unit_test_id=? ORDER BY id')
      .bind(testId).all();
    if (!qs.length) return json({ ok: false, error: '这场测试没有题目' }, 400);
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const byId = new Map(answers.map((a) => [Number(a && a.questionId), a ? a.answerIdx : undefined]));
    let correctCount = 0;
    const answerRows = [];
    for (const row of qs) {
      const q = JSON.parse(row.question_json);
      const raw = byId.get(Number(q.id));
      const ok = raw !== undefined && raw !== null && Number(raw) === q.answer_idx;
      if (ok) correctCount++;
      answerRows.push({ questionId: Number(q.id), correct: ok });
    }
    const total = qs.length;
    const score = Math.round((correctCount / total) * 100);
    const today = shDateStr();
    const now = Math.floor(Date.now() / 1000);
    // 先把测试行条件改成已交（防重复提交；发奖只在 CAS 成功后做，否则会发双份）
    const upd = await db.prepare("UPDATE unit_tests SET status='submitted', score=?, correct_count=?, total_count=?, submitted_epoch=? WHERE id=? AND status='open'")
      .bind(score, correctCount, total, now, testId).run();
    if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    const version = await syncTouch(db, child.id, 'unit_tests', 'id=?', [testId]);
    await db.batch(answerRows.map((a) =>
      db.prepare('INSERT INTO unit_test_answers(unit_test_id, question_id, correct, created_epoch) VALUES(?,?,?,?)')
        .bind(testId, a.questionId, a.correct ? 1 : 0, now)
    ));
    // 抽奖：85 分以上才掷；中奖率 85–89 40%、90–94 50%、95–100 60%
    let draw = null;
    if (score >= 85) {
      const winChance = unitTestWinChance(score);
      const won = rollRng(Math.random) < winChance;
      let prize = null;
      if (won) {
        // 2026-11-21 用户定：单元测试抽奖不再直发蛋／球／道具，改为 1 次普通转盘机会（Oak 盘）。
        await grantOakWheelChance(db, child.id, 'oak', 'unit-test-' + testId, today, now);
        prize = { kind: 'wheel', key: 'wheel:oak', name: '1 次普通转盘机会' };
      }
      draw = { won: won && !!prize, prizeKey: prize ? (prize.key || prize.kind) : null, prize };
      const drawIns = await db.prepare('INSERT INTO unit_test_draws(unit_test_id, won, prize_key, created_epoch) VALUES(?,?,?,?)')
        .bind(testId, draw.won ? 1 : 0, draw.prizeKey, now).run();
      if (drawIns.meta && drawIns.meta.changes > 0) {
        await touchRow(db, 'unit_test_draws', 'id=?', [Number(drawIns.meta.last_row_id)], version);
      }
    }
    return json({
      ok: true, testId, score, correctCount, total,
      won: draw ? draw.won : false,
      prize: draw ? draw.prize : null,
    });
  });
}

/* ---------------- 路由 ---------------- */

const STATIC_PREFIXES = ['/static/', '/favicon.ico'];

/* ================= 假期合作道馆（批 1，2026-10-22） =================
   总开关：settings.coop_master_enabled（家长设置，默认关）；关时孩子端不可见、全部 coop 接口拒绝。
   规格：DESIGN-假期合作-批1实施设计-v1.md。合力破盾不实现，仅预留字段/钩子。 */

// ===== 合作道馆：地图配置（批 1） =====

// 合作道馆奖励类型白名单（禁止 xp / egg 等其他类型）
const COOP_REWARD_TYPES = ['node_badge', 'node_sticker', 'expedition_badge', 'story_card'];

const COOP_DEFAULT_MAP_VERSION = 'coop-m1.v1';

// 校验地图配置
function validateCoopMap(map) {
  const errors = [];
  if (!map || !Array.isArray(map.nodes)) {
    return { ok: false, errors: ['地图缺少 nodes 数组'] };
  }
  const nodes = map.nodes;
  const KIND_ORDER = ['normal', 'normal', 'normal', 'elite', 'final'];
  if (nodes.length !== 5) errors.push(`节点数应为 5，实际 ${nodes.length}`);

  // node_id 唯一
  const ids = new Set();
  for (const n of nodes) {
    if (!n || typeof n.node_id !== 'string' || !n.node_id) {
      errors.push('存在缺少 node_id 的节点');
      continue;
    }
    if (ids.has(n.node_id)) errors.push(`node_id 重复：${n.node_id}`);
    ids.add(n.node_id);
  }

  // kind 顺序与 next 单链
  nodes.forEach((n, i) => {
    if (!n) return;
    if (i < KIND_ORDER.length && n.kind !== KIND_ORDER[i]) {
      errors.push(`${n.node_id}: kind 应为 ${KIND_ORDER[i]}，实际 ${n.kind}`);
    }
    if (i < nodes.length - 1) {
      const nextId = nodes[i + 1] && nodes[i + 1].node_id;
      if (n.next !== nextId) errors.push(`${n.node_id}: next 应为 ${nextId}，实际 ${n.next}`);
    } else if (n.next !== null) {
      errors.push(`${n.node_id}: 末节点 next 必须为 null`);
    }
  });

  // 无环检查：从首节点沿 next 走
  if (nodes.length && nodes[0]) {
    const byId = new Map(nodes.filter(Boolean).map(n => [n.node_id, n]));
    const seen = new Set();
    let cur = nodes[0];
    while (cur) {
      if (seen.has(cur.node_id)) { errors.push(`next 链存在环：${cur.node_id}`); break; }
      seen.add(cur.node_id);
      cur = cur.next == null ? null : byId.get(cur.next) || null;
    }
  }

  // 逐节点字段校验
  for (const n of nodes) {
    if (!n) continue;
    const id = n.node_id;
    const strong = n.kind === 'elite' || n.kind === 'final';

    if (!Array.isArray(n.rewards)) {
      errors.push(`${id}: rewards 必须为数组`);
    } else {
      for (const r of n.rewards) {
        const t = r && r.type;
        if (!COOP_REWARD_TYPES.includes(t)) errors.push(`${id}: 非法奖励类型 ${t}`);
      }
    }

    const moves = Array.isArray(n.bossMoves) ? n.bossMoves : [];
    if (!moves.length) errors.push(`${id}: bossMoves 不能为空`);
    for (const m of moves) {
      if (!Array.isArray(m) || m.length !== 3 || typeof m[0] !== 'string' || !m[0]) {
        errors.push(`${id}: 招式格式应为 [名, 属性, 威力]`);
        continue;
      }
      if (!TYPES18.includes(m[1])) errors.push(`${id}: 招式 ${m[0]} 属性非法 ${m[1]}`);
      if (typeof m[2] !== 'number' || !(m[2] > 0)) errors.push(`${id}: 招式 ${m[0]} 威力须为正数`);
    }
    const moveNames = moves.filter(Array.isArray).map(m => m[0]);

    if (n.sweep === true) {
      if (!strong) errors.push(`${id}: 仅 elite/final 可开启 sweep`);
      if (!n.sweepMove) errors.push(`${id}: sweep 开启时 sweepMove 不能为空`);
      else if (!moveNames.includes(n.sweepMove)) errors.push(`${id}: sweepMove ${n.sweepMove} 不在 bossMoves 中`);
    }

    if (n.shield !== null && n.shield !== undefined) {
      if (!strong) errors.push(`${id}: 仅 elite/final 可设置 shield`);
      if (!Number.isInteger(n.shield) || n.shield <= 0) errors.push(`${id}: shield 须为正整数`);
    }

    const sp = SPECIES[n.bossNo];
    if (!sp) errors.push(`${id}: bossNo ${n.bossNo} 不存在`);
    else if (n.bossType !== sp.type) errors.push(`${id}: bossType ${n.bossType} 与图鉴属性 ${sp.type} 不一致`);

    if (typeof n.hpMult !== 'number' || !(n.hpMult > 0)) errors.push(`${id}: hpMult 须为大于 0 的数`);
    if (!Number.isInteger(n.levelOffset) || n.levelOffset < 0) errors.push(`${id}: levelOffset 须为 ≥0 的整数`);
    if (typeof n.timeBudgetSec !== 'number' || !(n.timeBudgetSec > 0)) errors.push(`${id}: timeBudgetSec 须为正数`);
  }

  return { ok: errors.length === 0, errors };
}

// 队友集结状态（只暴露状态级信息）
function gatherMateState(gatheringRow) {
  if (!gatheringRow) return { state: 'gathering', reading_gap_days: 12, homework_on_way: true };
  const snap = parseJsonSafe(gatheringRow.stats_snapshot, {});
  const r = gatheringRow.result;
  return {
    state: (r === 'pass' || r === 'makeup_pass') ? 'gathered' : 'gathering',
    reading_gap_days: Math.max(0, 12 - (Number(snap.bDays) || 0)),
    homework_on_way: !Number(gatheringRow.gate_a_pass)
  };
}

// 统计合作关卡出战次数（计入上限或尚未结束的都算）
async function coopCountRuns(db, eventId, field, value) {
  if (!eventId || value == null) return 0;
  const col = field === 'week_key' ? 'week_key' : 'event_day';
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM coop_runs WHERE event_id=? AND ${col}=? AND (counts_toward_cap=1 OR end_reason IS NULL)`
  ).bind(eventId, value).first();
  return (r && r.n) || 0;
}

// 读取某孩子在某假期的集结行
async function coopReadGathering(db, holidayId, childId) {
  if (!childId) return null;
  return await db.prepare('SELECT * FROM coop_gatherings WHERE holiday_id=? AND user_id=? LIMIT 1')
    .bind(holidayId, childId).first();
}

// 公共前置：总开关、当前假期、时间区间、参与者校验
async function coopPrecheck(db, childId) {
  const [master, holiday] = await Promise.all([getMasterEnabled(db), currentHoliday(db)]);
  const reasonOff = { available: false, reason: master ? 'no_holiday' : 'coop_disabled' };
  if (!master || !holiday) return { off: reasonOff };
  const phase = holidayPhase(holiday);
  const gw = holiday.gather_window || {};
  if (!gw.start || phase.today < gw.start || phase.today > holiday.end_date) return { off: reasonOff };
  const me = await getChild(db, childId);
  const event = await ensureCoopEvent(db, holiday, me && me.family_id);
  if (!event || (event.participant_a !== childId && event.participant_b !== childId)) {
    return { off: { available: false, reason: 'not_participant' } };
  }
  const mateId = event.participant_a === childId ? event.participant_b : event.participant_a;
  return { holiday, phase, event, mateId };
}

// 从 today 到 end（含）的周一至周五天数
function coopWorkdaysBetween(from, to) {
  let n = 0;
  if (!from || !to || from > to) return 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const w = new Date(d + 'T00:00:00Z').getUTCDay();
    if (w >= 1 && w <= 5) n++;
  }
  return n;
}

// 孩子端集结令视图（白名单字段）
async function buildGatherView(db, childId) {
  const pre = await coopPrecheck(db, childId);
  if (pre.off) return pre.off;
  const { holiday, phase, mateId } = pre;
  let event = pre.event;
  await refreshGathering(db, event, holiday, childId);
  if (mateId) await refreshGathering(db, event, holiday, mateId);
  event = (await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(event.event_id).first()) || event;
  const [myRow, mateRow] = await Promise.all([
    coopReadGathering(db, holiday.holiday_id, childId),
    coopReadGathering(db, holiday.holiday_id, mateId),
  ]);
  const snap = parseJsonSafe(myRow?.stats_snapshot, {}) || {};
  const mateDerived = gatherMateState(mateRow);
  const today = phase.today;
  const gw = holiday.gather_window || {};
  const passSet = ['pass', 'makeup_pass'];

  // 本人状态派生
  let meState = 'gathering';
  const result = myRow?.result;
  if (passSet.includes(result)) meState = 'gathered';
  else if (result === 'not_open') meState = 'resting';
  else if (result === 'makeup') meState = 'continue_in_holiday';
  else if (result === 'pending') {
    if (today > gw.end) {
      meState = 'continue_in_holiday';
    } else if (today >= gw.start && today <= gw.end) {
      const subjCount = Math.max((snap.subjectsLocked || []).length, 1);
      const remainA = coopWorkdaysBetween(today, gw.end) * subjCount;
      const remainDays = diffDays(today, gw.end) + 1;
      const aCount = snap.aCount || 0;
      const bDays = snap.bDays || 0;
      const threshold = snap.threshold || 0;
      if (remainA + aCount < threshold || remainDays + bDays < 12) meState = 'continue_in_holiday';
    }
  }

  // 队伍状态
  const passCount = [myRow?.result, mateRow?.result].filter((r) => passSet.includes(r)).length;
  const teamState = passCount === 2 ? 'all_gathered' : passCount === 1 ? 'one_arrived' : 'camp_waiting';

  // 补做信息
  let makeup = null;
  if (result === 'makeup' || result === 'makeup_pass') {
    const progress = parseJsonSafe(myRow?.makeup_progress, {}) || {};
    const gap = parseJsonSafe(myRow?.makeup_gap, {}) || {};
    makeup = { done: progress.count || 0, need: gap.D || 0 };
  }

  const weekKey = phase.week?.week_key ?? null;
  const [todayUsed, weekUsed, todayGate] = await Promise.all([
    coopCountRuns(db, event.event_id, 'event_day', today),
    weekKey ? coopCountRuns(db, event.event_id, 'week_key', weekKey) : 0,
    coopDayGateMet(db, childId, today),
  ]);

  return {
    available: true,
    phase: { inWindow: !!phase.inWindow, inHoliday: !!phase.inHoliday, inCoopWeek: !!phase.week },
    holiday: { holiday_id: holiday.holiday_id, start_date: holiday.start_date, end_date: holiday.end_date },
    me: {
      homework: {
        done: snap.aCount || 0,
        target: snap.threshold || 0,
        expectedTotal: snap.expectedTotal || 0,
        pass: !!myRow?.gate_a_pass,
        configured: !!snap.subjectsLocked?.length,
        unconfigured: !!snap.unconfigured
      },
      reading: { done: snap.bDays || 0, target: 12, pass: !!myRow?.gate_b_pass },
      state: meState,
      makeup
    },
    team: { state: teamState },
    mate: mateDerived,
    event: { status: event.status },
    caps: { todayUsed, weekUsed, weekKey },
    todayGate
  };
}

async function apiCoopGathering(db, env, req, session) {
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('childId'));
  if (sc.err) return sc.err;
  const view = await buildGatherView(db, sc.id);
  return json({ ok: true, ...view });
}

// 查宠物图鉴名（兼容数组或对象形态的 SPECIES）
function coopSpeciesName(no) {
  if (no == null || typeof SPECIES === 'undefined') return null;
  const sp = Array.isArray(SPECIES) ? SPECIES.find((s) => s && String(s.no) === String(no)) : SPECIES[no];
  return sp ? sp.name : null;
}

async function apiCoopMap(db, env, req, session) {
  const sc = scopeChildId(session, new URL(req.url).searchParams.get('childId'));
  if (sc.err) return sc.err;
  const childId = sc.id;
  const pre = await coopPrecheck(db, childId);
  if (pre.off) return json({ ok: true, ...pre.off });
  await refreshGathering(db, pre.event, pre.holiday, childId);
  const event = (await db.prepare('SELECT * FROM coop_events WHERE event_id=?').bind(pre.event.event_id).first()) || pre.event;
  const mapVersion = event.map_version || COOP_DEFAULT_MAP_VERSION;

  // 节点进度 / 本局记录 / 我的奖励 / 进行中的对局 / 我的收藏宠(+调试备战选项)：全部只读、互不依赖，一次并行取齐
  const [progRes, runRes, grantRes, b, myCollection, benchOptions] = await Promise.all([
    db.prepare('SELECT * FROM coop_node_progress WHERE event_id=?').bind(event.event_id).all(),
    db.prepare('SELECT * FROM coop_runs WHERE event_id=? ORDER BY started_at').bind(event.event_id).all(),
    db.prepare('SELECT * FROM coop_grants WHERE user_id=?').bind(childId).all(),
    db.prepare(
      "SELECT * FROM battles WHERE mode='coop' AND coop_event_id=? AND status IN ('waiting','active','suspended') ORDER BY id DESC LIMIT 1"
    ).bind(event.event_id).first(),
    ownedCollection(db, childId),
    GATES_OPEN ? debugBenchOptions(db, childId) : null,
  ]);
  const progRows = progRes.results || [];
  const progMap = {};
  for (const p of progRows) progMap[p.node_id] = p;

  const nodes = (coopMapNodes(mapVersion) || []).map((n) => {
    const bossNo = n.bossNo ?? n.boss_no ?? n.boss?.no ?? null;
    return {
      node_id: n.node_id,
      name: n.name,
      kind: n.kind,
      bossName: coopSpeciesName(bossNo),
      bossType: n.bossType ?? n.boss?.type ?? null,
      sweep: n.sweep ?? null,
      state: progMap[n.node_id]?.state || 'locked'
    };
  });

  const campRow = progRows.find((p) => p.camp_snapshot);
  const camp = campRow ? { exists: true, nodeId: campRow.node_id } : { exists: false };

  const runRows = runRes.results || [];
  const runs = runRows.map((r) => ({
    run_id: r.run_id, node_id: r.node_id, event_day: r.event_day,
    week_key: r.week_key, end_reason: r.end_reason, counts_toward_cap: r.counts_toward_cap
  }));

  const grantRows = grantRes.results || [];
  const myRewards = grantRows.map((g) => {
    const node = coopNode(mapVersion, g.node_id);
    const label = node ? (coopRewardLabel(node, g.reward_type) || g.reward_ref) : g.reward_ref;
    return { node_id: g.node_id, reward_type: g.reward_type, reward_ref: g.reward_ref, label };
  });

  const openBattle = b ? { battleId: b.id, status: b.status, mine: b.child_a === childId, nodeId: b.coop_node_id ?? null } : null;

  return json({
    ok: true,
    available: true,
    event: { event_id: event.event_id, status: event.status, holiday_id: event.holiday_id, map_version: mapVersion },
    nodes, camp, runs, myRewards, openBattle,
    myCollection,
    ...(GATES_OPEN ? { benchOptions } : {}),
  });
}

async function apiParentHolidayGet(db, env, session) {
  // 全部只读：孩子列表 / 总开关 / 当前假期 / 假期列表 / 法定假日同时取；每孩日常科目依赖孩子列表，随后并行
  const [children, masterEnabled, holidayNow, holidays, statutoryRaw] = await Promise.all([
    getChildren(db, session && session.familyId),
    getMasterEnabled(db),
    currentHoliday(db),
    listHolidays(db),
    getSetting(db, 'cn_statutory_holidays'),
  ]);
  const subjects = {};
  const subjectRaws = await Promise.all(children.map((c) => getSetting(db, `daily_subjects:${c.id}`)));
  for (const [ci, c] of children.entries()) {
    const v = parseJsonSafe(subjectRaws[ci], { subjects: [] }) || { subjects: [] };
    subjects[c.id] = Array.isArray(v.subjects) ? v.subjects : [];
  }
  return json({
    ok: true,
    masterEnabled,
    holiday: holidayNow,
    holidays,
    statutory: parseJsonSafe(statutoryRaw, {}),
    subjects,
    children: children.map((c) => ({ id: c.id, name: c.name }))
  });
}

// 校验 YYYY-MM-DD 合法日期
function coopIsDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

async function apiParentHolidayUpdate(db, env, req, session) {
  const body = await readJsonBody(req);
  const bad = (msg) => json({ ok: false, error: msg }, 400);

  if (body.masterEnabled !== undefined) {
    await setSetting(db, 'coop_master_enabled', body.masterEnabled ? '1' : '0');
  }

  if (body.statutory !== undefined) {
    const st = body.statutory;
    if (!st || typeof st !== 'object' || Array.isArray(st)) return bad('节假日数据格式不对');
    for (const k of Object.keys(st)) {
      const v = st[k];
      if (!v || typeof v !== 'object' || !Array.isArray(v.off) || !v.off.every(coopIsDate)) {
        return bad('节假日数据格式不对');
      }
    }
    await setSetting(db, 'cn_statutory_holidays', JSON.stringify(st));
  }

  if (body.subjects !== undefined) {
    const sj = body.subjects;
    const allowed = ['语文', '数学', '英语', '阅读'];
    if (!sj || typeof sj !== 'object' || Array.isArray(sj)) return bad('日常科目只能选语文/数学/英语/阅读且至少一科');
    const ids = Object.keys(sj);
    // 先全部校验，再写入
    for (const id of ids) {
      const arr = sj[id];
      if (!Array.isArray(arr) || !arr.length || !arr.every((s) => allowed.includes(s))) {
        return bad('日常科目只能选语文/数学/英语/阅读且至少一科');
      }
      const rows = (await db.prepare('SELECT stats_snapshot FROM coop_gatherings WHERE user_id=?').bind(id).all()).results || [];
      for (const r of rows) {
        const snap = parseJsonSafe(r.stats_snapshot, {}) || {};
        if (Array.isArray(snap.subjectsLocked) && snap.subjectsLocked.length) {
          return json({ ok: false, error: 'subjects_locked', message: '集结窗口已开启，该孩子的日常科目已锁定' }, 400);
        }
      }
    }
    for (const id of ids) {
      await setSetting(db, `daily_subjects:${id}`, JSON.stringify({ subjects: [...new Set(sj[id])] }));
    }
  }

  let written = null;
  if (body.holiday !== undefined) {
    const h = body.holiday || {};
    const hid = typeof h.holiday_id === 'string' ? h.holiday_id.trim() : '';
    if (!hid) return bad('假期编号不能为空');
    if (!coopIsDate(h.start_date) || !coopIsDate(h.end_date)) return bad('假期起止日期格式不对');
    if (h.start_date > h.end_date) return bad('假期开始日期不能晚于结束日期');
    const mapVersion = h.map_version || COOP_DEFAULT_MAP_VERSION;
    if (!COOP_MAPS || !COOP_MAPS[mapVersion]) return bad('地图版本不存在');
    if (!Array.isArray(h.coop_weeks) || !h.coop_weeks.length) return bad('至少需要设置一个合作周');
    const weeks = [];
    for (const w of h.coop_weeks) {
      if (!w || !coopIsDate(w.start) || !coopIsDate(w.end)) return bad('合作周日期格式不对');
      if (w.start > w.end) return bad('合作周开始不能晚于结束');
      if (w.start < h.start_date || w.end > h.end_date) return bad('合作周必须在假期范围内');
      weeks.push({ week_key: w.start, start: w.start, end: w.end });
    }
    weeks.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i].start <= weeks[i - 1].end) return bad('合作周之间不能重叠');
    }
    let ebl = h.enemy_base_level;
    if (ebl === undefined || ebl === '') ebl = null;
    if (ebl !== null && !(Number.isInteger(ebl) && ebl >= 1 && ebl <= 40)) return bad('敌方基础等级需为 1~40 的整数或留空');

    // 缺口已固定后的锁定检查
    const old = parseJsonSafe(await getSetting(db, `holiday:${hid}`), null);
    if (old) {
      const fixed = await db.prepare('SELECT 1 AS x FROM coop_gatherings WHERE holiday_id=? AND makeup_gap IS NOT NULL LIMIT 1').bind(hid).first();
      if (fixed) {
        const norm = (ws) => JSON.stringify((ws || []).map((w) => [w.start, w.end]).sort());
        if (old.start_date !== h.start_date || norm(old.coop_weeks) !== norm(weeks)) {
          return bad('缺口已固定，假期首日与合作周不可再改');
        }
      }
    }

    written = {
      holiday_id: hid,
      start_date: h.start_date,
      end_date: h.end_date,
      coop_weeks: weeks,
      map_version: mapVersion,
      enemy_base_level: ebl,
      segments: Array.isArray(h.segments) ? h.segments : [],
      gather_window: { start: addDays(h.start_date, -21), end: addDays(h.start_date, -1) },
      makeup_deadline: addDays(weeks[weeks.length - 1].start, -1)
    };
    await setSetting(db, `holiday:${hid}`, JSON.stringify(written));
    const idx = parseJsonSafe(await getSetting(db, 'holiday_index'), []);
    const list = Array.isArray(idx) ? idx : [];
    if (!list.includes(hid)) list.push(hid);
    await setSetting(db, 'holiday_index', JSON.stringify(list));
  }

  const [masterEnabledNow, currentHolidayNow] = await Promise.all([getMasterEnabled(db), body.holiday ? null : currentHoliday(db)]);
  return json({
    ok: true,
    masterEnabled: masterEnabledNow,
    holiday: body.holiday ? written : currentHolidayNow
  });
}

async function apiParentCoopOverview(db, env, session) {
  const holiday = await currentHoliday(db);
  if (!holiday) return json({ ok: true, available: false });
  const kids = await getChildren(db, session && session.familyId);
  if (kids.length < 2) return json({ ok: true, available: false });
  const a = kids[0].id, b = kids[1].id;
  // 只读：查已有的参与者对事件，不新建
  const event = await db.prepare(
    'SELECT * FROM coop_events WHERE holiday_id=? AND ((participant_a=? AND participant_b=?) OR (participant_a=? AND participant_b=?)) LIMIT 1'
  ).bind(holiday.holiday_id, a, b, b, a).first();
  if (!event) return json({ ok: true, available: false });

  // 集结 / 节点 / 记录 / 奖励 / 本周已用场次：只读、互不依赖，并行取齐
  const phase = holidayPhase(holiday);
  const weekKey = phase.week?.week_key ?? null;
  const [gRes, nodeRes, runRes, grantRes, weekUsed] = await Promise.all([
    db.prepare('SELECT * FROM coop_gatherings WHERE event_id=? AND holiday_id=?')
      .bind(event.event_id, holiday.holiday_id).all(),
    db.prepare('SELECT * FROM coop_node_progress WHERE event_id=?').bind(event.event_id).all(),
    db.prepare('SELECT * FROM coop_runs WHERE event_id=? ORDER BY started_at').bind(event.event_id).all(),
    db.prepare(
      'SELECT * FROM coop_grants WHERE run_id IN (SELECT run_id FROM coop_runs WHERE event_id=?)'
    ).bind(event.event_id).all(),
    weekKey ? coopCountRuns(db, event.event_id, 'week_key', weekKey) : 0,
  ]);
  const gRows = gRes.results || [];
  const gatherings = gRows.map((r) => ({
    ...r,
    stats_snapshot: parseJsonSafe(r.stats_snapshot, {}),
    makeup_gap: parseJsonSafe(r.makeup_gap, null),
    makeup_progress: parseJsonSafe(r.makeup_progress, null)
  }));
  const nodes = nodeRes.results || [];
  const runs = runRes.results || [];
  const grants = grantRes.results || [];

  return json({
    ok: true,
    available: true,
    event,
    gatherings,
    nodes,
    runs,
    grants,
    caps: { weekUsed, weekKey }
  });
}

/* 静态资源缓存：文件名带 .<8位hash>. 的为内容寻址资源，可长期 immutable；
   其余（sw.js / manifest.json / 音频 / 旧名）保持 max-age=0 防旧脚本长期驻留。
   旧名文件部署后磁盘上不存在（已重命名），请求旧名直接 404，不会拿到旧脚本。 */
const HASHED_ASSET_RE = /\.[0-9a-f]{8}\.(?:js|css|png|webp|svg|woff2)$/;
function cacheControlForStatic(path) {
  return HASHED_ASSET_RE.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
}
function pinStaticCache(r, path) {
  const headers = new Headers(r.headers);
  headers.set('Cache-Control', cacheControlForStatic(path));
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
}

/* ---- 本地缓存完整版 · 同步接口（迁移 0020）---- */

/* GET /api/sync?since=&child_id= ：增量拉取。since 缺失/非法时返回全量（不过滤 ver）。
* changed 只含 ver > since 的行（行含全部列 + ver + updated_epoch）；deleted 来自
* sync_tombstones（仅增量时返回，version > since）。返回 {ok:true, version, schema_version, changed, deleted}。
* 安全：children 行去掉 pwd_hash / pwd_fail_count / pwd_locked_until；settings 行去掉 key='pin'
*（settings.pin 是家长 PIN 的 SHA-256，绝不能同步给孩子端）。 */
async function apiSync(db, url, session) {
const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
const sinceParam = url.searchParams.get('since');
const since = sinceParam!== null && /^\d+$/.test(sinceParam)? Number(sinceParam): null;
// version 必须先于各表读取发出（读到之后的改动下次 ver>since 会补上）；schema 版本与它互不依赖，一起发
const [vRow, sRow] = await Promise.all([
db.prepare('SELECT version FROM sync_versions WHERE child_id=?').bind(childId).first(),
db.prepare("SELECT value FROM settings WHERE key='sync_schema_version'").bind().first(),
]);
const version = vRow? vRow.version: 0;
const schemaVersion = sRow? Number(sRow.value) || 1: 1;
const changed = {};
const deleted = {};
const verFilter = since === null? '': ' AND ver >?';
// 各表读取互不依赖：并行发出，changed 仍按 SYNC_TABLES 顺序写入
const tableRowsAll = await Promise.all(SYNC_TABLES.map(async (t) => {
let rows = [];
if (t.name === 'children') {
const sql = 'SELECT * FROM children WHERE id=?' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
rows = rows.map((r) => {
const c = {...r};
delete c.pwd_hash; delete c.pwd_fail_count; delete c.pwd_locked_until;
return c;
});
} else if (t.name === 'quiz_questions' || t.name === 'settings') {
const sql = 'SELECT * FROM ' + t.name + (since === null? '': ' WHERE ver >?');
const args = since === null? []: [since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
if (t.name === 'settings') rows = rows.filter((r) => r.key!== 'pin');
} else if (t.name === 'battles') {
const sql = 'SELECT * FROM battles WHERE (child_a=? OR child_b=?)' + verFilter;
const args = since === null? [childId, childId]: [childId, childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
} else if (t.name === 'checkin_photos') {
const sql = 'SELECT * FROM checkin_photos WHERE checkin_id IN (SELECT id FROM checkins WHERE child_id=?)' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
} else if (t.name === 'unit_test_draws') {
const sql = 'SELECT * FROM unit_test_draws WHERE unit_test_id IN (SELECT id FROM unit_tests WHERE child_id=?)' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
} else {
const sql = 'SELECT * FROM ' + t.name + ' WHERE child_id=?' + verFilter;
const args = since === null? [childId]: [childId, since];
rows = (await db.prepare(sql).bind(...args).all()).results || [];
}
return rows;
}));
SYNC_TABLES.forEach((t, ti) => { if (tableRowsAll[ti].length) changed[t.name] = tableRowsAll[ti]; });
if (since!== null) {
const { results} = await db.prepare(
'SELECT table_name, row_id FROM sync_tombstones WHERE child_id=? AND version >?'
).bind(childId, since).all();
for (const r of (results || [])) {
(deleted[r.table_name] = deleted[r.table_name] || []).push(r.row_id);
}
}
return json({ ok: true, version, schema_version: schemaVersion, changed, deleted});
}

/* POST /api/commands {cmd_id, child_id, type, payload}：outbox 命令提交。
* 鉴权复用 scopeChildId（孩子会话只能替自己提交，家长会话可替任一孩子）。
* types：checkin（payload 即原 /api/checkin body，含 childId）、quiz_answer
*（payload 即原 /api/quiz/answer body，含 childId 或 child_id）、gym_settle、
* pvp_settle、unit_test_submit（payload 即原 /api/child/unit-test/submit body）。
* 其余 type 返回 {ok:false, error:'UNKNOWN_TYPE'} 400。cmd_id 缺失返回 CMD_ID_REQUIRED 400。 */
async function apiCommands(db, env, req, session) {
const body = await readJsonBody(req);
const cmdId = String(body.cmd_id || '');
if (!cmdId) return json({ ok: false, error: 'CMD_ID_REQUIRED'}, 400);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
const type = String(body.type || '');
const payload = (body.payload && typeof body.payload === 'object')? body.payload: {};
const mkReq = (path) => new Request('https://test.local' + path, {
method: 'POST', headers: { 'Content-Type': 'application/json'},
body: JSON.stringify({...payload, childId}),
});
return runIdempotentCommand(db, cmdId, childId, type, async () => {
switch (type) {
case 'checkin': return apiSubmitCheckin(db, env, mkReq('/api/checkin'), session);
case 'quiz_answer': return apiQuizAnswer(db, mkReq('/api/quiz/answer'), session);
case 'gym_settle': return settleGymCore(db, childId, payload);
case 'pvp_settle': return settlePvpCore(db, childId, payload);
case 'unit_test_submit': return apiChildUnitTestSubmit(db, mkReq('/api/child/unit-test/submit'), session);
default: return json({ ok: false, error: 'UNKNOWN_TYPE'}, 400);
}
});
}

/* POST /api/photo/upload {child_id, checkin_id, name, data_b64}：离线照片补传。
* 校验与现有打卡照片路径一致：复用 parsePhotosArg 做解码与大小校验
*（PHOTO_MAX_BYTES、PHOTO_TYPES 口径不变）；按 name 后缀定 contentType
*（.png→image/png，.webp→image/webp，其余 image/jpeg）；对象 key 与
* setCheckinPhotos 同格式 checkins/{childId}/{date}/{checkinId}-{now}-{rand}.{ext}；
* PHOTOS.put 后写 checkin_photos 索引行并 syncTouch；返回 {ok:true, url, photoId}，
* url 为 /api/photos/{id}。桶未开通时 503。 */
async function apiPhotoUpload(db, env, req, session) {
const body = await readJsonBody(req);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
const checkinId = Number(body.checkin_id?? body.checkinId);
const ck = checkinId? await db.prepare('SELECT * FROM checkins WHERE id=?').bind(checkinId).first(): null;
if (!ck) return json({ ok: false, error: 'NOT_FOUND'}, 404);
if (ck.child_id!== childId) return json({ ok: false, error: 'FORBIDDEN'}, 403);
if (!env.PHOTOS) return json({ ok: false, error: '照片功能还没开通'}, 503);
const name = String(body.name || '');
const ext = /\.png$/i.test(name)? 'png': /\.webp$/i.test(name)? 'webp': 'jpg';
const contentType = ext === 'png'? 'image/png': ext === 'webp'? 'image/webp': 'image/jpeg';
const parsed = parsePhotosArg([{ data: body.data_b64, contentType}]);
if (parsed.err) return json({ ok: false, error: parsed.err}, 400);
const item = parsed.list[0];
const now = Math.floor(Date.now() / 1000);
const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
const key = `checkins/${childId}/${ck.date}/${checkinId}-${now}-${rand}.${ext}`;
await photoPut(env, key, item.bytes, item.contentType);
const r = await db.prepare(
'INSERT INTO checkin_photos(checkin_id, object_key, content_type, size, created_epoch) VALUES(?,?,?,?,?)'
).bind(checkinId, key, item.contentType, item.bytes.length, now).run();
const photoId = r.meta? Number(r.meta.last_row_id): null;
await syncTouch(db, childId, 'checkin_photos', 'id=?', [photoId]);
return json({ ok: true, url: `/api/photos/${photoId}`, photoId});
}

/* PvP 结算核心（供 /api/pvp/settle 直接路由与 /api/commands pvp_settle 共用）。
* payload：{winner_child_id, loser_child_id, week}，week 为周一日期串，缺省为当前周。
* ②B：服务端用现有 pvpCountedThisWeek 校验（两孩任一本周已有计次场即视为已计次）；
* 未计次且 week 等于当前周 → 记一条 battles(mode='pvp', counted=1, status='finished',
* winner_child_id=胜者) 并按现有 PvP 获胜路径发奖（胜者 children.balls +1 ＋
* settleBallOverflow，不发经验、不改 total_xp），冠军由 apiBattlePvpStatus 从 counted 行
* 派生，无需另写冠军表；返回 {ok:true, counted:true, practice:false, battleId}。
* 已计次或 week 不等于当前周（过周）→ 记一条 practice=1、counted=0 的 battles 行
*（保留战报、不发奖、不改冠军），返回 {ok:true, counted:false, practice:true, battleId}。
* state 字段存最小战报 JSON：{sides:{A:{childId,childName},B:{childId,childName}},
* winner:'A', result:{winnerSide:'A', winnerChildId, winnerPetsLeft:null, totalActions:null}}，
* 其中 A 固定为胜者方（便于荣誉墙按 winner_child_id 取名）。
* 两孩版本都推进；battles 行 ver 取两者较大值（任一孩子增量同步都能看到这行）。 */
async function settlePvpCore(db, childId, payload) {
const winnerId = Number(payload.winner_child_id?? payload.winnerChildId?? childId);
const loserId = Number(payload.loser_child_id?? payload.loserChildId);
const ws = String(payload.week || weekStartMon(shDateStr()));
const curWs = weekStartMon(shDateStr());
const [winner, loser] = await Promise.all([getChild(db, winnerId), loserId? getChild(db, loserId): null]);
if (!winner ||!loser) return json({ ok: false, error: 'NOT_FOUND'}, 404);
/* 提交者（会话孩子）必须是这场对战的双方之一，且胜负双方不能是同一人。
* 注：离线本地 PvP 在服务端没有任何先行 battles 行（两人同机对战、只入队 pvp_settle），
* 故不能要求“已有对战记录”，否则合法离线结算全部被拒；本函数自己落 battles 行。 */
if (winnerId === loserId) return json({ ok: false, error: 'INVALID_PAIR'}, 400);
if (Number(childId)!== winnerId && Number(childId)!== loserId) return json({ ok: false, error: 'FORBIDDEN'}, 403);
const counted =(await pvpCountedThisWeek(db, winnerId, ws)) || (await pvpCountedThisWeek(db, loserId, ws));
const overWeek = ws!== curWs;
const now = Math.floor(Date.now() / 1000);
const state = {
sides: {
A: { childId: winnerId, childName: winner.name || ''},
B: { childId: loserId, childName: loser.name || ''},
},
winner: 'A',
result: { winnerSide: 'A', winnerChildId: winnerId, winnerPetsLeft: null, totalActions: null},
};
if (!counted &&!overWeek) {
const r = await db.prepare(
"INSERT INTO battles(mode, week_start, stage, child_a, child_b, state, status, counted, winner_child_id, finished_epoch, created_epoch) VALUES('pvp',?, NULL,?,?,?, 'finished', 1,?,?,?)"
).bind(ws, winnerId, loserId, JSON.stringify(state), winnerId, now, now).run();
const battleId = r.meta? Number(r.meta.last_row_id): null;
await db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(winnerId).run();
await settleBallOverflow(db, winnerId, shDateStr());
const vW = await bumpChildVersion(db, winnerId);
const vL = await bumpChildVersion(db, loserId);
await touchRow(db, 'battles', 'id=?', [battleId], Math.max(vW, vL));
await syncTouch(db, winnerId, 'children', 'id=?', [winnerId]);
return json({ ok: true, counted: true, practice: false, battleId});
}
const r = await db.prepare(
"INSERT INTO battles(mode, week_start, stage, child_a, child_b, state, status, counted, winner_child_id, finished_epoch, created_epoch, practice) VALUES('pvp',?, NULL,?,?,?, 'finished', 0,?,?,?, 1)"
).bind(ws, winnerId, loserId, JSON.stringify(state), winnerId, now, now).run();
const battleId = r.meta? Number(r.meta.last_row_id): null;
const vW = await bumpChildVersion(db, winnerId);
const vL = await bumpChildVersion(db, loserId);
await touchRow(db, 'battles', 'id=?', [battleId], Math.max(vW, vL));
return json({ ok: true, counted: false, practice: true, battleId});
}

/* POST /api/pvp/settle {cmd_id, child_id, winner_child_id, loser_child_id, week}：
* 在线结算直接路由，与 /api/commands 的 pvp_settle 分发共用 settlePvpCore 与同一套
* cmd_log 幂等键（同 gym_settle 的二选一说明）。 */
async function apiPvpSettle(db, req, session) {
const body = await readJsonBody(req);
const cmdId = String(body.cmd_id || '');
if (!cmdId) return json({ ok: false, error: 'CMD_ID_REQUIRED'}, 400);
const sc = scopeChildId(session, body.child_id?? body.childId);
if (sc.err) return sc.err;
const childId = sc.id;
if (!(await hasSyncTables(db))) return json({ ok: false, error: 'SYNC_NOT_READY'}, 503);
return runIdempotentCommand(db, cmdId, childId, 'pvp_settle', () => settlePvpCore(db, childId, body));
}

/* -------- 路由表（B1）：原 switch(path) 的 104 个 case 机械展开，顺序不变 --------
 * method：'GET' | 'POST' | '*'（不限，原无方法检查的路由必须显式写 '*'，不得按“默认 POST”收紧）。
 * auth：'session'（仅过 requireFamily；孩子范围由 handler 内 scopeChildId/forbidIfOtherChild 自管）｜
 *       'pin'（家长 PIN 新鲜）｜'debug'（仅测试环境，非测试环境一律 404）。
 * 校验顺序与原 case 逐一一致：debug = 测试门 → PIN → method；其余 = method → PIN。 */
const ROUTES = new Map();
function route(path, opts, handler) {
  if (!opts || !opts.method) throw new Error('route ' + path + ': method 必须显式声明');
  if (ROUTES.has(path)) throw new Error('route ' + path + ': 重复注册');
  ROUTES.set(path, { opts: { method: opts.method, auth: opts.auth || 'session' }, handler });
}
function methodGate(req, method) {
  return method !== '*' && req.method !== method ? json({ ok: false, error: 'METHOD' }, 405) : null;
}
async function runRoute({ opts, handler }, c) {
  const { method, auth } = opts;
  if (auth === 'debug') {
    if (!isTestMode(c.env)) return json({ ok: false, error: 'NOT_FOUND' }, 404);
    return withPin(c.session, () => methodGate(c.req, method) || handler(c));
  }
  const m = methodGate(c.req, method);
  if (m) return m;
  const foreign = await foreignChildIdGuard(c.db, c.req, c.url, c.session);
  if (foreign) return foreign;
  return auth === 'pin' ? withPin(c.session, () => handler(c)) : handler(c);
}

/* 全局兜底（用户系统 v2）：孩子会话请求里（查询串或 JSON body）只要带了别人的 childId / child_id，
 * 不进处理函数直接 403。各接口自己的 scopeChildId 仍保留，这里保证「忘了校验」的接口也漏不出去。 */
async function foreignChildIdGuard(db, req, url, session) {
  if (!session) return null;
  const own = session.baseChildId !== undefined ? session.baseChildId : session.child_id;
  const q = url.searchParams;
  const ids = [q.get('childId'), q.get('child_id')];
  if (url.pathname === '/api/child') ids.push(q.get('id'));
  if (req.method !== 'GET' && req.method !== 'HEAD' && /json/i.test(req.headers.get('Content-Type') || '')) {
    let body = null;
    try { body = await req.clone().json(); } catch { body = null; }
    if (body && typeof body === 'object') ids.push(body.childId, body.child_id);
    if (body && typeof body === 'object' && session.familyId && body.opponentId !== undefined && body.opponentId !== null && body.opponentId !== '') {
      // 对战对手不在本家（含不存在）→ 404，不暴露别家账号是否存在；同家的对手校验仍在各接口里（403）
      const oid = Number(body.opponentId);
      if (oid && oid !== own && !(await getFamilyChild(db, session.familyId, oid))) return notFound404();
    }
  }
  const wanted = [...new Set(ids.filter((v) => v !== undefined && v !== null && v !== '').map(Number))];
  // 跨家庭：一律 404（不暴露别家孩子是否存在）。家长模式 / 孩子会话都查；等于自己的孩子不用查
  if (session.familyId) {
    for (const id of wanted) {
      if (id === own) continue;
      if (!(await getFamilyChild(db, session.familyId, id))) return notFound404();
    }
  }
  if (session.kind !== 'child') return null;
  if (wanted.some((v) => v !== session.child_id)) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  return null;
}

/* 路由模块注册（按路径精确分发，注册顺序不影响行为） */
register_wheel(route);
register_care(route);
register_gym(route);
register_quiz(route);
register_school_test(route);
route('/api/logout', { method: '*' }, ({ db, req, session }) => apiLogout(db, req, session));
route('/api/me', { method: 'GET' }, ({ db, session }) => apiMe(db, session));
route('/api/me/update', { method: 'POST' }, ({ db, req, session }) => apiMeUpdate(db, req, session));
route('/api/me/progress', { method: '*' }, ({ db, req, session }) => apiMeProgress(db, req, session));
route('/api/family/members', { method: 'GET' }, ({ db, session }) => apiFamilyMembers(db, session));
route('/api/parent/accounts', { method: 'GET', auth: 'pin' }, ({ db, session }) => apiParentAccounts(db, session));
route('/api/parent/accounts/create', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiParentAccountCreate(db, req, session));
route('/api/parent/accounts/reset-pin', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiParentAccountResetPin(db, req, session));
route('/api/parent/accounts/delete', { method: 'POST', auth: 'pin' }, ({ db, env, req, session }) => apiParentAccountDelete(db, env, req, session));
route('/api/parent/accounts/reset-password', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiParentAccountResetPin(db, req, session)); // 旧路径别名
route('/api/parent/invites/create', { method: 'POST', auth: 'pin' }, ({ db, env, req, session }) => apiParentInviteCreate(db, env, req, session));
route('/api/overview', { method: '*' }, ({ db, session }) => apiOverview(db, session));
route('/api/child', { method: '*' }, ({ db, url, session }) => apiChildDetail(db, Number(url.searchParams.get('id')), session));
route('/api/checkin', { method: '*' }, ({ db, env, req, session }) => apiSubmitCheckin(db, env, req, session));
route('/api/checkin/edit', { method: 'POST' }, ({ db, env, req, session }) => apiEditCheckin(db, env, req, session));
route('/api/notices/ack', { method: 'POST' }, ({ db, req, session }) => apiNoticesAck(db, req, session));
route('/api/warehouse/status', { method: 'GET' }, ({ db, req, session }) => apiWarehouseStatus(db, req, session));
route('/api/warehouse/store', { method: 'POST' }, ({ db, req, session }) => apiWarehouseStore(db, req, session));
route('/api/warehouse/take', { method: 'POST' }, ({ db, req, session }) => apiWarehouseTake(db, req, session));
route('/api/warehouse/swap', { method: 'POST' }, ({ db, req, session }) => apiWarehouseSwap(db, req, session));
route('/api/sync', { method: '*' }, ({ db, url, session }) => apiSync(db, url, session));
route('/api/commands', { method: 'POST' }, ({ db, env, req, session }) => apiCommands(db, env, req, session));
route('/api/photo/upload', { method: 'POST' }, ({ db, env, req, session }) => apiPhotoUpload(db, env, req, session));
route('/api/pvp/settle', { method: 'POST' }, ({ db, req, session }) => apiPvpSettle(db, req, session));
route('/api/oak/today', { method: '*' }, ({ db, url, session }) => apiOakToday(db, url, session));
route('/api/oak/listen', { method: 'POST' }, ({ db, req, session }) => apiOakListen(db, req, session));
route('/api/oak/assess', { method: '*' }, ({ db, env, req, session }) => apiOakAssess(db, req, session, env));
route('/api/daily-modules', { method: '*' }, () => apiDailyModules());
route('/api/daily-english', { method: '*' }, ({ db, url, session }) => apiDailyEnglish(db, url, session));
route('/api/daily-english/checkin', { method: 'POST' }, ({ db, req, session }) => apiDailyEnglishCheckin(db, req, session));
route('/api/daily-english/assess', { method: '*' }, ({ db, env, req, session }) => apiDailyEnglishAssess(db, req, session, env));
route('/api/daily-chinese', { method: '*' }, ({ db, url, session }) => apiDailyChinese(db, url, session));
route('/api/daily-chinese/checkin', { method: 'POST' }, ({ db, req, session }) => apiDailyChineseCheckin(db, req, session));
route('/api/daily-chinese/assess', { method: '*' }, ({ db, env, req, session }) => apiDailyChineseAssess(db, req, session, env));
route('/api/daily-chinese/answer', { method: 'POST' }, ({ db, req, session }) => apiDailyChineseAnswer(db, req, session));
route('/api/daily-math', { method: '*' }, ({ db, url, session }) => apiDailyMath(db, url, session));
route('/api/daily-math/answer', { method: 'POST' }, ({ db, req, session }) => apiDailyMathAnswer(db, req, session));
route('/api/daily-math/checkin', { method: 'POST' }, ({ db, req, session }) => apiDailyMathCheckin(db, req, session));
route('/api/encounter/pending', { method: '*' }, ({ db, req, session }) => apiPendingEncounter(db, req, session));
route('/api/encounter/throw', { method: '*' }, ({ db, req, session }) => apiThrowBall(db, req, session));
route('/api/encounter/answer', { method: 'POST' }, ({ db, req, session }) => apiEncounterAnswer(db, req, session));
route('/api/encounter/draft', { method: 'POST' }, ({ db, req, session }) => apiEncounterDraft(db, req, session));
route('/api/encounter/start', { method: 'POST' }, ({ db, req, session }) => apiEncounterStart(db, req, session));
route('/api/encounter/switch', { method: 'POST' }, ({ db, req, session }) => apiEncounterSwitch(db, req, session));
route('/api/encounter/leave', { method: 'POST' }, ({ db, req, session }) => apiEncounterLeave(db, req, session));
route('/api/coop/gathering', { method: '*' }, ({ db, env, req, session }) => apiCoopGathering(db, env, req, session));
route('/api/coop/map', { method: '*' }, ({ db, env, req, session }) => apiCoopMap(db, env, req, session));
route('/api/parent/coop/overview', { method: '*', auth: 'pin' }, ({ db, env, session }) => apiParentCoopOverview(db, env, session));
route('/api/parent/holiday/config', { method: '*', auth: 'pin' }, ({ db, env, session }) => apiParentHolidayGet(db, env, session));
route('/api/parent/holiday/config/update', { method: 'POST', auth: 'pin' }, ({ db, env, req, session }) => apiParentHolidayUpdate(db, env, req, session));
route('/api/eggs', { method: '*' }, ({ db, req, session }) => apiSealedEggs(db, req, session));
route('/api/pokedex', { method: '*' }, ({ db, req, session }) => apiPokedex(db, req, session));
route('/api/pokedex/card', { method: '*' }, ({ db, req, session }) => apiPokedexCard(db, req, session));
route('/api/parent/verify-pin', { method: '*' }, ({ db, req, session }) => apiVerifyPin(db, req, session));
route('/api/parent/exit', { method: 'POST' }, ({ db, session }) => apiParentExit(db, session));
route('/api/parent/family-children', { method: 'GET', auth: 'pin' }, ({ db, session }) => apiParentFamilyChildren(db, session));
route('/api/parent/family/temp-auth', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiFamilyTempAuth(db, req, session));
route('/api/admin/enter', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiAdminEnter(db, req, session));
route('/api/admin/overview', { method: 'GET', auth: 'pin' }, ({ db, session }) => apiAdminOverview(db, session));
route('/api/admin/defaults', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiAdminDefaults(db, req, session));
route('/api/admin/family/status', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiAdminFamilyStatus(db, req, session));
route('/api/admin/invites/create', { method: 'POST', auth: 'pin' }, ({ db, session }) => apiAdminInviteCreate(db, session));
route('/api/admin/family/view', { method: 'GET', auth: 'pin' }, ({ db, url, session }) => apiAdminFamilyView(db, url, session));
route('/api/admin/log', { method: 'GET', auth: 'pin' }, ({ db, url, session }) => apiAdminLog(db, url, session));
route('/api/parent/pending', { method: '*', auth: 'pin' }, ({ db, session, url }) => apiPendingReviews(db, session, url));
route('/api/parent/pvp-rematch', { method: '*', auth: 'pin' }, ({ db, session }) => apiParentPvpRematchList(db, session));
route('/api/parent/pvp-rematch/decide', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiParentPvpRematchDecide(db, req, session));
route('/api/parent/balls/grant', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentGrantBall(db, req));
route('/api/parent/history/grant', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentHistoryGrant(db, req));
route('/api/parent/review', { method: '*', auth: 'pin' }, ({ db, req, session }) => apiReview(db, req, session));
route('/api/parent/stats', { method: '*', auth: 'pin' }, ({ db, session, url }) => apiStats(db, session, url));
route('/api/parent/history', { method: '*', auth: 'pin' }, ({ db, session, url }) => apiHistory(db, session, url));
route('/api/parent/settings', { method: '*', auth: 'pin' }, ({ db, env, session }) => apiGetSettings(db, env, session));
route('/api/parent/questions', { method: '*', auth: 'pin' }, ({ db, req }) => (req.method === 'POST' ? apiParentQuestionAdd(db, req) : apiParentQuestions(db)));
route('/api/parent/questions/ocr', { method: 'POST', auth: 'pin' }, ({ db, env, req }) => apiParentQuestionOcr(db, env, req));
route('/api/parent/settings/update', { method: '*', auth: 'pin' }, ({ db, req, session }) => apiUpdateSettings(db, req, session));
route('/api/parent/switch-line', { method: '*', auth: 'pin' }, ({ db, req }) => apiSwitchLine(db, req));
/* 进化道具 v11（迁移 0019）：孩子端用 scopeChildId 鉴权，家长端用 requirePin */
route('/api/evo/backpack', { method: '*' }, ({ db, url, session }) => apiEvoBackpack(db, url, session));
route('/api/evo/use-stone', { method: 'POST' }, ({ db, req, session }) => apiEvoUseStone(db, req, session));
route('/api/evo/evolve', { method: 'POST' }, ({ db, req, session }) => apiEvoEvolve(db, req, session));
route('/api/child/switch-line', { method: 'POST' }, ({ db, req, session }) => apiChildSwitchLine(db, req, session));
route('/api/child/unit-test', { method: '*' }, ({ db, url, session }) => apiChildUnitTest(db, url, session));
route('/api/child/unit-test/submit', { method: 'POST' }, ({ db, req, session }) => apiChildUnitTestSubmit(db, req, session));
route('/api/parent/unit-test/start', { method: 'POST', auth: 'pin' }, ({ db, req }) => apiParentUnitTestStart(db, req));
route('/api/parent/reset', { method: '*', auth: 'pin' }, ({ db, env, req, session }) => apiResetAll(db, env, req, session));
route('/api/parent/debug-time', { method: 'POST', auth: 'debug' }, ({ db, req }) => apiDebugTimeSet(db, req));
route('/api/parent/debug-gates', { method: 'POST', auth: 'debug' }, ({ db, req }) => apiDebugGatesSet(db, req));
route('/api/parent/debug-reset', { method: 'POST', auth: 'debug' }, ({ db, env, req }) => apiDebugReset(db, env, req));
route('/api/parent/debug-state', { method: '*', auth: 'debug' }, ({ db, session }) => apiDebugState(db, session));
route('/api/parent/debug-set', { method: 'POST', auth: 'debug' }, ({ db, req, session }) => apiDebugSet(db, req, session));

/* Server-Timing（任务 89）：total 全程、session 会话查找、db（D1 等待墙钟，见 timedDb）、
 * handler 会话后分发（含 DB＋业务逻辑）。未走会话查找的路径（登录、静态资源）只有 total（登录有 db）。
 * X-D1-Stats：q 查询数、wall D1 等待总墙钟、exec D1 内部执行总和、read/written 行数、slow 最慢 2 条（墙钟/执行/读行:SQL）。
 * 注意：first() 不带 meta，exec/read 为下限；并行查询的墙钟会重叠相加，db 墙钟可能大于 total。 */
/* Server-Timing 的边缘信息（Task 89 item 6）：只含数据中心 colo 与运营商 AS 号 asn，绝不含客户端 IP。
 * req.cf 在本地开发 / 单测（mock Request）里为 undefined：全程守卫，取不到就不输出对应字段，header 与改前一致。
 * 用 desc 而不是 dur（这两个不是时长）；值经白名单校验，避免带入引号/分号等字符。 */
function edgeTimingParts(req) {
  const cf = req && req.cf;
  if (!cf) return [];
  const parts = [];
  if (typeof cf.colo === 'string' && /^[A-Za-z0-9]{2,8}$/.test(cf.colo)) parts.push(`colo;desc="${cf.colo}"`);
  if (Number.isInteger(cf.asn) && cf.asn > 0) parts.push(`asn;desc="${cf.asn}"`);
  return parts;
}
function withServerTiming(res, totalMs, sessionMs, handlerMs, dbStats, includeQueryLog, req) {
  const parts = [`total;dur=${totalMs.toFixed(1)}`];
  if (sessionMs != null) parts.push(`session;dur=${sessionMs.toFixed(1)}`);
  if (dbStats && dbStats.queries > 0) parts.push(`db;dur=${dbStats.dbWallMs.toFixed(1)}`);
  if (handlerMs != null) parts.push(`handler;dur=${handlerMs.toFixed(1)}`);
  parts.push(...edgeTimingParts(req));
  const h = new Headers(res.headers);
  h.set('Server-Timing', parts.join(', '));
  if (dbStats && dbStats.queries > 0) h.set('X-D1-Stats', d1StatsHeader(dbStats));
  if (includeQueryLog && dbStats && dbStats.log.length > 0) h.set('X-D1-Queries', d1QueriesHeader(dbStats));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function d1QueriesHeader(s) {
  // 全部查询按执行顺序：序号:墙钟ms:SQL（截 70 字）。仅测试模式输出，供 Claude 标 batch 用。
  return s.log.map((e, i) => `${i + 1}:${Math.round(e.wall)}:${e.sql.replace(/[^ -~]/g, '').replace(/;/g, ' ')}`).join('; ');
}

function d1StatsHeader(s) {
  const parts = [`q=${s.queries}`, `wall=${Math.round(s.dbWallMs)}`, `exec=${Math.round(s.dbExecMs)}`, `read=${s.rowsRead}`, `written=${s.rowsWritten}`];
  s.slow.forEach((e, i) => {
    parts.push(`slow${i + 1}=${Math.round(e.wall)}/${Math.round(e.exec)}/${e.read}:${e.sql.replace(/[^ -~]/g, '').replace(/;/g, ' ')}`);
  });
  return parts.join('; ');
}

/* D1 计时（任务 89 续）：包一层 db，累计每请求的查询数、D1 等待墙钟、D1 内部执行时间、
 * 读/写行数与最慢的 2 条 SQL。墙钟含往返，exec 为 D1 内部耗时，两者之差≈网络往返。
 * 只包 prepare/batch；SQL 文本为代码常量（值走 bind），不含用户数据。 */
function timedDb(realDb, stats) {
  function cleanSql(sql, n) { return String(sql).replace(/\s+/g, ' ').slice(0, n); }
  function pushSlow(sql, wall, exec, read) {
    stats.slow.push({ sql: cleanSql(sql, 80), wall, exec, read });
    stats.slow.sort((a, b) => b.wall - a.wall);
    if (stats.slow.length > 2) stats.slow.length = 2;
  }
  function record(sql, wallMs, meta) {
    stats.queries += 1;
    stats.dbWallMs += wallMs;
    stats.log.push({ sql: cleanSql(sql, 70), wall: wallMs });
    if (meta) {
      stats.dbExecMs += meta.duration || 0;
      stats.rowsRead += meta.rows_read || 0;
      stats.rowsWritten += meta.rows_written || 0;
    }
    pushSlow(sql, wallMs, (meta && meta.duration) || 0, (meta && meta.rows_read) || 0);
  }
  function wrapStmt(sql, real) {
    // 注意：D1 的 bind() 返回新语句（不可变语义），丢掉返回值就等于没绑定参数，
    // 执行时报 "Wrong number of parameter bindings"。必须跟踪 bind 的返回值。
    let bound = real;
    const stmt = {
      get _real() { return bound; },
      bind(...args) { bound = bound.bind(...args); return stmt; },
      async first() { const t0 = Date.now(); const r = await bound.first(); record(sql, Date.now() - t0, r && r.meta); return r; },
      async all() { const t0 = Date.now(); const r = await bound.all(); record(sql, Date.now() - t0, r && r.meta); return r; },
      async run() { const t0 = Date.now(); const r = await bound.run(); record(sql, Date.now() - t0, r && r.meta); return r; },
    };
    return stmt;
  }
  return {
    prepare(sql) { return wrapStmt(sql, realDb.prepare(sql)); },
    async batch(stmts) {
      const t0 = Date.now();
      const reals = (stmts || []).map((s) => (s && s._real) ? s._real : s);
      const res = await realDb.batch(reals);
      const wall = Date.now() - t0;
      stats.queries += (stmts || []).length;
      stats.dbWallMs += wall;
      if (Array.isArray(res)) {
        for (const r of res) {
          const meta = r && r.meta;
          if (meta) {
            stats.dbExecMs += meta.duration || 0;
            stats.rowsRead += meta.rows_read || 0;
            stats.rowsWritten += meta.rows_written || 0;
          }
        }
      }
      pushSlow('BATCH(' + (stmts || []).length + ' stmts)', wall, 0, 0);
      stats.log.push({ sql: 'BATCH(' + (stmts || []).length + ' stmts)', wall });
      return res;
    },
  };
}

// 维护页：全站停用时返回。内联样式，不依赖任何静态资源。
function maintenancePage() {
  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>打卡站维护中</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#333}main{text-align:center;padding:24px}.e{font-size:56px}h1{font-size:28px;margin:12px 0}p{font-size:17px;line-height:1.8;margin:8px 0;color:#666}</style></head>'
    + '<body><main><div class="e">🔧</div><h1>无法让网瘾少年使用</h1>'
    + '<p>打卡站维护中</p></main></body></html>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(req, env) {
    const t0 = Date.now();
    let sessionMs = null;
    let tHandler0 = 0;
    const dbStats = { queries: 0, dbWallMs: 0, dbExecMs: 0, rowsRead: 0, rowsWritten: 0, slow: [], log: [] };
    const includeQueryLog = isTestMode(env); // 测试模式才输出 X-D1-Queries 全部查询清单
    try {
      const res = await (async () => {
    const url = new URL(req.url);
    const path = url.pathname;
    // 维护模式（2026-11-12 用户令）：MAINTENANCE_MODE=1 时停用打卡站。
    // exempt.example.com 例外（用户 2026-11-12 令恢复并保持能打开）：该域名不拦。
    // 首页与所有页面返回维护页，API 返回 503；不查库、不读静态资源、不登录。
    const MAINTENANCE_EXEMPT = new Set(['exempt.example.com', 'www.exempt.example.com']);
    if (env.MAINTENANCE_MODE === '1' && !MAINTENANCE_EXEMPT.has(url.hostname)) {
      if (path.startsWith('/api/')) return json({ ok: false, error: 'MAINTENANCE' }, 503);
      return maintenancePage();
    }
    const db = timedDb(env.DB, dbStats);
    await applyDebugTime(db, env); // 正式环境恒为 no-op（DEBUG_NOW_MS=null）

    // 登录 API（公开）：孩子密码登录 / 家长 PIN 登录。原 /api/login（家庭密码）已下线
    // 账号登录（用户名＋6 位 PIN）/ 邀请码注册 / 改 PIN：公开入口（改 PIN 自己读会话，初始 PIN 的 setpw 会话也要能调；路径沿用 change-password）
    if (path === '/api/ball-kinds' && req.method === 'GET') return json({ ok: true, kinds: ballKindMap(), items: ballItemKinds(), wheels: ballWheelMix() });
    if (path === '/api/auth/login' && req.method === 'POST') return apiAuthLogin(db, req);
    if (path === '/api/auth/register' && req.method === 'POST') return apiAuthRegister(db, req);
    if (path === '/api/auth/change-password' && req.method === 'POST') return apiAuthChangePin(db, req);
    // 旧 PIN 登录（过渡期，LEGACY_PIN_LOGIN=false 后关闭；代码再留一个版本）
    if ((path === '/api/child/login' || path === '/api/parent/login') && req.method === 'POST' && !legacyPinEnabled(env)) {
      return json({ ok: false, error: 'LEGACY_LOGIN_OFF', message: '旧的 PIN 登录已关闭，请用用户名和 6 位 PIN 登录' }, 410);
    }
    if (path === '/api/child/login' && req.method === 'POST') return apiChildLogin(db, req);
    if (path === '/api/parent/login' && req.method === 'POST') return apiParentLogin(db, req);
    if (path === '/login') {
      const s0 = await getSession(db, req);
      if (s0) return Response.redirect(new URL('/', url), 302);
      return rolePage(db, url.hostname);
    }

    // 静态资源（无机密；图片/manifest/图标/前端脚本）
    // iOS 会直接请求站点根部的 apple-touch-icon；manifest 惯例路径也要能命中（文件都在 /static/ 下）
    const ASSET_ALIAS = { '/apple-touch-icon.png': '/static/icon-180.63ed668b.png', '/apple-touch-icon-precomposed.png': '/static/icon-180.63ed668b.png', '/manifest.json': '/static/manifest.json', '/sw.js': '/static/sw.js' };    if (path !== '/' && ASSET_ALIAS[path]) {      return pinStaticCache(await env.ASSETS.fetch(new Request(new URL(ASSET_ALIAS[path], url), req)), ASSET_ALIAS[path]);
    }
    // 图鉴静态骨架（Fable 优化 #2）：内容哈希 URL、immutable 缓存；hash 只是缓存键，
    // 任何合规 hash 都返回当前内容（部署间隙不 404），故不校验请求里的 hash 值。
    const pkm = path.match(/^\/static\/pokedex\.([0-9a-f]{8})\.json$/);
    if (pkm) {
      const skel = pokedexStaticSkeleton();
      return new Response(JSON.stringify(skel.data), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (path !== '/' && STATIC_PREFIXES.some((p) => path.startsWith(p))) {
      return pinStaticCache(await env.ASSETS.fetch(req), path);
    }

    // 首页与 API 都要先有会话（孩子或家长）
    const tSess = Date.now();
    const session = await applyParentCred(db, req, await getSession(db, req));
    sessionMs = Date.now() - tSess;
    tHandler0 = Date.now();
    if (path === '/' || path === '/index.html' || path === '/parent') { // /parent?child=&tab= 是家长区深链：刷新要原样回到该孩子和页签（不能 302 到 / 丢掉查询串）
      if (!session) return rolePage(db, url.hostname);
      const r = await env.ASSETS.fetch(new Request(new URL('/index.html', url), req));
      const h = new Headers(r.headers);
      h.set('Cache-Control', 'no-store');
      if (!isProdHost(url.hostname)) h.set('X-Robots-Tag', 'noindex');
      return new Response(r.body, { status: r.status, headers: h });
    }

    if (path.startsWith('/api/')) {
      const gate = requireFamily(session);
      if (gate) return gate;
        // 照片读取：GET /api/photos/:id（鉴权在处理函数内按归属判定）
        const pm = path.match(/^\/api\/photos\/(\d+)$/);
        if (pm && req.method === 'GET') return apiGetPhoto(db, env, Number(pm[1]), session);
        // 家长看试卷照片：GET /api/parent/school-photo/:recordId（PIN 会话）
        const spm = path.match(/^\/api\/parent\/school-photo\/(\d+)$/);
        if (spm && req.method === 'GET') return withPin(session, () => apiParentSchoolPhoto(db, env, Number(spm[1]), session));
        // 孩子看题图：GET /api/quiz/photo/:id（仅当日题单内的题）
        const mQuizPhoto = path.match(/^\/api\/quiz\/photo\/(\d+)$/);
        if (mQuizPhoto && req.method === 'GET') {
          return apiQuizPhoto(db, env, req, Number(mQuizPhoto[1]), session);
        }
        // 家长题目管理：带 id 的子路径（DELETE / toggle）
        const qm = path.match(/^\/api\/parent\/questions\/(\d+)(\/toggle)?$/);
        if (qm) {
          return withPin(session, () => {
            const qid = Number(qm[1]);
            if (req.method === 'DELETE' && !qm[2]) return apiParentQuestionDelete(db, env, qid);
            if (req.method === 'POST' && qm[2]) return apiParentQuestionToggle(db, qid);
            return json({ ok: false, error: 'NOT_FOUND' }, 404);
          });
        }
        const hit = ROUTES.get(path);
        if (!hit) return json({ ok: false, error: 'NOT_FOUND' }, 404);
        return runRoute(hit, { db, env, req, url, session });
    }

    // 其余路径：已登录回首页，未登录回入口页
    return session ? Response.redirect(new URL('/', url), 302) : rolePage(db, url.hostname);
      })();
      const totalMs = Date.now() - t0;
      const handlerMs = tHandler0 ? Date.now() - tHandler0 : null;
      return withServerTiming(res, totalMs, sessionMs, handlerMs, dbStats, includeQueryLog, req);
    } catch (e) {
      const res = json({ ok: false, error: 'SERVER_ERROR', message: String(e && e.message || e) }, 500);
      return withServerTiming(res, Date.now() - t0, null, null, dbStats, includeQueryLog, req);
    }
  },
};

/* 纯函数导出（本地单测用） */
export {
  CARE_FOODS, CARE_BATHS, CARE_SCENES, CARE_XP_FAVORITE, careSceneForDate, careDailyFavorite, careFoodByKey, careBathByKey, isCareEnabled,
  shDateStr, shTimeHM, addDays, diffDays, isWeekendDate, weekStartMon,
  nowDate, isTestMode, applyDebugTime,
  xpForLevel, levelFromXp, formIdxForLevel, learnedMoves, newMovesBetween, earlyBefore,
  LINES, WILD,
  QUIZ_SUBJECTS, QUIZ_SLOTS_ALL, CHECKIN_SUBJECTS, expandQuizSubjects, quizDailyTotal, gradeNumFromLabel,
  QUIZ_CORRECT_WINDOW_DAYS, QUIZ_WRONG_GAP_DAYS,
  fragmentsForCorrectTotal, fragmentAwardOnCorrect, questionLabel,
  OAK_GROUP_SIZE, pickOakEpisode, oakAudioUrl, oakGroupForChild, oakSummaryForChild,
  OAK_FIVE_STAR_PRON, OAK_FOUR_STAR_PRON, OAK_DRAW_MIN_FIVE_STAR, OAK_DRAW_XP, OAK_WHEEL_POOL, oakStarsFromPron, oakRollDraw, oakPrizeDisplay, oakWheelEntries, oakWheelFor,
  DAILY_MODULE_KINDS, DAILY_MODULES,
  effectiveMoves, allMovesFor, lineMovesFor, getExMainLine, selectDailyQuestions, parseOcrDraft, safeJsonArr, safeJsonObj,
  MOVES_OFFICIAL, COLLECTION_LEARNSET, learnedCollectionMoves, collectionMovesFor,
  MATH_CHAPTERS, chapterOrder, mathGateFor, defaultMathChapter, normalizeQuizRow,
  loadMathGate, mathGatePass, questionActivationError, pickCatchQuestions, pickDefenseQuestion, pickUnitTestQuestions,
  CHINESE_CHAPTERS, ENGLISH_UNITS, chineseOrder, englishOrder, chineseGateFor, englishGateFor,
  photosByCheckin,
  oakEnglishOrder, showEnglishZh,
  defaultChineseChapter, defaultEnglishChapter, loadChineseGate, loadEnglishGate, chineseGatePass, englishGatePass,
  TYPES, TYPE_CHART, TYPES18, typeMult, OFFICIAL_MULT, typeMultOfficial, countersForType, countersForPet, matchupsForType, bossDefTypes, playerDefTypes, typeMultOfficialMulti, matchupsForTypes, statsFor, officialMove, moveCategory, lineFormNo, calcDamage, battleMaxHp, makePet, createBattleState,
  abilityOf, petAbility, rollInstanceAbility, abilityAfterEvolution, ensurePetInstance, instAbilityFor, attachInstanceAbilities, ABILITY_NO_EFFECT, SOUND_MOVES, PUNCH_MOVES, coopLightningRodSeat, endureRate, tryEndure, trySturdy, tryMagicBounce, healPet, applyAbilityHeal, FRIENDSHIP_MAX,
  // 战斗特性第二期：阶段/状态系统。
  stageMult, stagesOf, changeStage, resetStages, clearPetBattleState, effectiveSpeed,
  triggerSwitchIn, onPetLeavesField, foeSidesOf, canSwitchOut, isContactMove, NON_CONTACT_MOVES,
  STATUS_KINDS, STATUS_LABEL, STAGE_KEYS, STAGE_LABEL,
  statusImmunityReason, tryInflictStatus, tryInflictInfatuation, tryInflictFlinch, applyStatusInflict, applyContactTrigger, applyAttackerContactTrigger, applyStenchFlinch, applyAftermath, isSandImmune, applyHitAbilityTriggers, applyCursedBody, applyMoxie,
  statusBlocksAction, statusBlockedText, settleStatusTick, tickActiveStatuses, applyAbilityStages, applyAbilityFlashFire, stagedMoveForContact, applyStagedBlocked, abilityEventText,
  applyBattleAction, canSideAttack, activePetOf, flattenSideLevel, rollRng,
  // 导出独立命中率查询，并移除已废弃的道馆区间常量。
  officialAccuracy,
  resolveGymRound, gymBossChoose,
  stagePvpAttack, resolveStagedAttack, DEFENSE_KINDS, pickDefenseKind, defenseSummaryFromLog,
  PVP_CRIT_RATE, PVP_CRIT_MULT, PVP_HP_MULT, pvpMaxHp,
  PVP_DEFENSE_TIMEOUT_SECS, bothSidesEntered, stepDefenseTimeout,
  // 第三期：兄弟对战主动换宠/排阵、野外伤害数值冻结口径（测试与文档引用）
  applyPvpSwap, pvpOrderTeam, WILD_HP_BY_TIER, WILD_HIT_FRAC, WILD_HURT_FRAC,
  CRIT_RATE, CRIT_MULT, BALL_DROP_DAILY_LIMIT, rollBallDrop, rollWildEncounter,
  WILD_TIERS, wildTierOf, catchQuestionsFor, pickWildSpecies, judgeCatch, wildCatchRate,
  MOVE_EFFECTS, moveEffectOf, applyTransform, revertTransform, fxOf, applyStagedEffect, applyStagedMiss, applyEffectFlag, consumeAttackMods,
  SKILL_MAX_LEVEL, SKILL_WEAK_MULT, SKILL_CHARGE_MULT, SKILL_SHELL_MULT, SKILL_SMOKE_MISS, skillLevelOf, skillPower, skillEffectFor,
  loadBattle, saveBattle,
  COOP_MAPS, coopNode, coopMapNodes, coopRewardRef, coopRewardLabel, coopRewardAsset, validateCoopMap,
  createCoopBattleState, buildCoopBossSide, coopBossChoose, resolveCoopRound,
  coopAddShellLayer, coopPeekShellLayer, coopConsumeShellLayer,
  getMasterEnabled, listHolidays, currentHoliday, holidayPhase, ensureCoopEvent, computeGatherCounts, refreshGathering, coopDayGateMet,
  advanceCoopBattle, settleCoopWin, settleCoopEnd, coopThresholds,
  SPECIES, COLLECTION_MOVES, GYM_STAGES, PLAYER_SCALE, BOSS_SCALE, BOSS_FOLLOW, effPlayerLevel, effBossLevel, effBossBattleLevel, dexKeyForSpecies, speciesOfDexKey, LINE_TYPE,
  GYM_WEATHER_POOL, GYM_WEATHER_POOLS, fnv1aHash, gymDailyWeather,
  POKEDEX_TOTAL, ownedDexNos, dex151Progress, pokedexStaticSkeleton, speciesName,
  pinFresh, PIN_SESSION_SECS,
  MATH_PREREQ_G1G3, DIAG_WINDOW_DAYS, DIAG_WEAK_MIN_WRONG, DIAG_WEAK_MIN_RATIO,
  DIAG_REVIEW_COUNT, DIAG_MAX_DEPTH, DIAG_EXPIRE_DAYS, DIAG_FAIL_CLOSED, DIAG_NO_QUESTION_TOPIC,
  diagTopicStates, diagWeakestTopic, diagFindRoot, diagPickReview,
  ITEM_CATALOG, EGG_ITEM_BY_SPECIES, EGG_SPECIES_BY_ITEM, EGG_HATCH_DAYS, MAIN_EVO_STONE, EEVEE_BRANCHES,
  EGG_DESIGNS, EGG_TYPE_FALLBACK, EGG_MYSTERY, eggDesignFor,
  FAIRY_TEACH_POOL, EVO_LINES, SWITCH_REQ, GYM_ITEM_EFFECTS, GYM_ITEM_CAPS,
  DEX_DETAILS, evoCondText, dexEvoChain,
  DAILY_DROP_RATE, DAILY_DROP_DAILY_LIMIT, DAILY_DROP_TABLE, DAILY_DROP_STONES, WHEEL_POOL, WHEEL_EGG_POOL,
  UNIT_TEST_WIN_CHANCE, UNIT_TEST_PRIZE, UNIT_TEST_STONES_COMMON, UNIT_TEST_STONES_RARE,
  UNIT_TEST_EGG_MAIN, UNIT_TEST_EGG_RARE, UNIT_TEST_QUESTION_COUNT, UNIT_TEST_COOLDOWN_SECS,
  UNIT_TEST_WEEK_LIMIT, WHEEL_WEEK_LIMIT, SCHOOL_PHOTO_KEEP_DAYS, BALL_EXCHANGE, BALL_MAX,
  rollDailyItemDrop, rollWheelPrize, rollSchoolOrdinary, SCHOOL_ORDINARY_XP, SCHOOL_HEAL_MEDICINES, unitTestWinChance, rollUnitTestPrize, evoOptionsFor, evoStepsForSpecies,
  WHEEL_COLORS, buildWheelSectors, wheelWinnerIndex,
  RARE_WHEEL_LEGENDARIES, RARE_WHEEL_EEVEE, RARE_WHEEL_FINALS, rareWheelFinals, rollRareWheelPrize, rareWheelSectors, TCG_CARDS,
  CARE_WHEEL_POOL, rollCareWheelPrize, careWheelEntries, careWheelFor, grantCareWheelChance, careWheelChancesLeft, grantOakWheelChance, oakWheelChancesLeft,
  settleBallOverflow, addBalls, addItem, takeItem, grantEgg,
  iflytekWavToPcm, iflytekB64encode, iflytekB64decodeUtf8, iflytekSignature, iflytekAuthUrl,
  iflytekDpToErr, iflytekParseResultXml, iflytekAssess, azureAssess,
  ownedCollection, carriedCollection, insertPokedexWithCarryRule, mainPetSpeciesNo, friendshipHeartsOf,
  DAILY_ENGLISH_COUNT, DAILY_ENGLISH_POOL, DAILY_ENGLISH_EPISODES, DAILY_ENGLISH_PASS_PRON, dailyEnglishStarsFromPron, dailyEnglishSidKey,
  DAILY_CHINESE_POOL, DAILY_CHINESE_PASS_PRON, dailyChineseStarsFromPron, dailyChineseTodayFor,
  DAILY_MATH_COUNT, DAILY_MATH_PASS_COUNT, genMathProblem, dailyMathTodayFor, genMathBracket, genMathWord, DAILY_MATH_WORD_G1, DAILY_MATH_WORD_G3,
  dailyEnglishHash32, mulberry32, dailyEnglishPoolFor, pickDailyEnglish, pickDailyEnglishMixed, isDailyEnglishSpoken, dailyEnglishTodayFor,
};

