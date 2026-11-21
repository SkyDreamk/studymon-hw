/* wheel 模块（模块化后端 方案A 第 1 步）：从 src/index.js 机械搬出，逻辑零改动。
 * register(route) 用 src/index.js 的 route() 助手注册本模块的全部路由（path/method/auth 与搬出前完全一致）。 */
import { CARE_WHEEL_POOL, GATES_OPEN, GATES_OPEN_FULL, ITEM_CATALOG, OAK_WHEEL_POOL, RARE_WHEEL_EEVEE, RARE_WHEEL_FINALS, RARE_WHEEL_LEGENDARIES, WHEEL_EGG_POOL, WHEEL_POOL, addBalls, addDays, addItem, buildWheelSectors, bumpChildVersion, careWheelEntries, evoWheelEntries, grantWheelChance, grantXp, hasPendingEgg, json, nowEpoch, oakPrizeDisplay, oakWheelEntries, ownedSpeciesSet, ownsSpeciesEver, petImg, pushEvoNotices, rareWheelSectors, rollRng, settleBallOverflow, speciesName, syncTouch, touchRow, weekStartMon, weightedPick, wheelChancesLeft, wheelChancesLeftFor, withChild } from '../lib/shared.js';

const EGG_HATCH_DAYS = 7;
/* 高级转盘掷骰（纯函数）：返回 {kind:'stone'|'ball'|'egg'|'medicine', key|species} 或 null（全池为空禁转）。
 * ownedSpecies：已永久获得的物种集合（蛋去重：图鉴已有或背包已有同种未孵化蛋即排除，伊布可重复）。 */
function rollWheelPrize(rng = Math.random, ownedSpecies = new Set(), ownedEggSpecies = new Set()) {
  const availEggs = WHEEL_EGG_POOL.filter((no) => no === 133 || (!ownedSpecies.has(no) && !ownedEggSpecies.has(no)));
  const entries = WHEEL_POOL.map(([k, w]) => [k, k === 'egg' && !availEggs.length ? 0 : w]);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return null;
  const hit = weightedPick(entries, rng);
  if (hit) {
    const [k] = hit;
    if (k === 'egg') {
      const no = availEggs[Math.floor(rollRng(rng) * availEggs.length) % availEggs.length];
      return { kind: 'egg', key: `egg:${no}`, species: no };
    }
    if (k === 'ball:hyper') return { kind: 'ball', key: 'ball:hyper' };
    if (k.startsWith('medicine:')) return { kind: 'medicine', key: k };
    return { kind: 'stone', key: k };
  }
  return null;
}
/* 奖品所在扇区下标（纯函数）：找不到返 -1，调用方须处理 -1 为错误，不许静默转错扇区。
 * sectors 可传数组或 buildWheelSectors 的返回值。 */
function wheelWinnerIndex(sectors, winnerKey) {
  const arr = Array.isArray(sectors) ? sectors : (sectors && Array.isArray(sectors.sectors) ? sectors.sectors : []);
  return arr.findIndex((s) => s.key === winnerKey);
}
/* 稀有转盘掷骰（纯函数）：返回 {group: 'legendary'|'eevee'|'final', species} 或 null（全池为空禁转）。
 * ownedSpecies/ownedEggSpecies：已拥有（图鉴＋未孵化蛋）的物种集合，去重后组内均匀；
 * 组内可用为空时该组权重归零、其余组归一化；三组全空返回 null。 */
function rollRareWheelPrize(rng = Math.random, ownedSpecies = new Set(), ownedEggSpecies = new Set()) {
  const owned = new Set([...(ownedSpecies || []), ...(ownedEggSpecies || [])]);
  const groups = [
    { group: 'legendary', pool: RARE_WHEEL_LEGENDARIES.filter((n) => !owned.has(n)), weight: 8 },
    { group: 'eevee', pool: RARE_WHEEL_EEVEE.filter((n) => !owned.has(n)), weight: 12 },
    { group: 'final', pool: RARE_WHEEL_FINALS.filter((n) => !owned.has(n)), weight: 80 },
  ].filter((g) => g.pool.length > 0);
  const total = groups.reduce((a, g) => a + g.weight, 0);
  if (total <= 0) return null;
  const g = weightedPick(groups, rng, (x) => x.weight);
  if (g) {
    const species = g.pool[Math.floor(rollRng(rng) * g.pool.length) % g.pool.length];
    return { group: g.group, species };
  }
  return null;
}
/* 稀有奖品对应的扇区 key：传说按物种、伊布组/终极组按组。 */
function rareSectorKeyFor(prize) {
  if (!prize) return null;
  if (prize.group === 'legendary') return `legendary:${prize.species}`;
  return prize.group;
}
const OAK_DRAW_XP = 10;

/* 跟读抽奖掷骰（纯函数）：按 OAK_WHEEL_POOL 加权，返回奖品描述
 * {prize: 'xp'|'ball'|'item', prizeKey, xpAwarded, ballsAwarded}；
 * prizeKey 为 'xp'/'ball' 或道具 key（'care:*'/'medicine:*'/'stone:*'）。 */
function oakRollDraw(rng = Math.random) {
  const hit = weightedPick(OAK_WHEEL_POOL, rng);
  if (hit) {
    const [key] = hit;
    if (key === 'xp') return { prize: 'xp', prizeKey: 'xp', xpAwarded: OAK_DRAW_XP, ballsAwarded: 0 };
    if (key === 'ball') return { prize: 'ball', prizeKey: 'ball', xpAwarded: 0, ballsAwarded: 1 };
    return { prize: 'item', prizeKey: key, xpAwarded: 0, ballsAwarded: 0 };
  }
  return { prize: 'xp', prizeKey: 'xp', xpAwarded: OAK_DRAW_XP, ballsAwarded: 0 };
}
/* 某次普通转盘抽奖的转盘配置：扇区固定 18 个（权重和 100），winnerIndex 指向本次奖品的扇区。 */
function wheelFor(entriesFn, prizeKey) {
  const built = buildWheelSectors(entriesFn());
  return { ...built, winnerIndex: wheelWinnerIndex(built.sectors, prizeKey) };
}
function oakWheelFor(prizeKey) {
  return wheelFor(oakWheelEntries, prizeKey);
}

/* 养成转盘掷骰（纯函数）：按 CARE_WHEEL_POOL 加权，返回照顾道具 key（'care:*'）。 */
function rollCareWheelPrize(rng = Math.random) {
  const hit = weightedPick(CARE_WHEEL_POOL, rng);
  return hit ? hit[0] : CARE_WHEEL_POOL[0][0];
}
/* 某次养成转盘抽奖的转盘配置：扇区固定 10 个（权重和 42），winnerIndex 指向本次奖品的扇区。 */
function careWheelFor(prizeKey) {
  return wheelFor(careWheelEntries, prizeKey);
}
/* 背包里未孵化的蛋的物种号集合（高级转盘／单元测试奖池去重用） */
async function pendingEggSpeciesSet(db, childId) {
  const s = new Set();
  const [{ results: a }, { results: b }] = await Promise.all([
    db.prepare("SELECT species_no FROM reward_eggs WHERE child_id=? AND status='pending'").bind(childId).all(),
    db.prepare('SELECT species FROM sealed_eggs WHERE child_id=? AND hatched=0').bind(childId).all(),
  ]);
  for (const r of a) s.add(Number(r.species_no));
  for (const r of b) s.add(Number(r.species) || 151);
  return s;
}
/* 发奖励蛋（7 天孵化）：去重不通过返回 {granted:false}，不落库 */
async function grantEgg(db, childId, speciesNo, source, refId, today) {
  if (!GATES_OPEN && speciesNo !== 133 && (await ownsSpeciesEver(db, childId, speciesNo) || await hasPendingEgg(db, childId, speciesNo))) {
    return { granted: false, reason: 'ALREADY_OWNED' };
  }
  const unlock = addDays(today, EGG_HATCH_DAYS);
  const now = Math.floor(Date.now() / 1000);
  /* 并发兜底（2026-11-17，性能优化#6）：先查后插不是原子的，两路并发转盘可能同时通过
   * 去重检查、同时插同一物种的蛋。0036 的部分唯一索引
   * (child_id, species_no) WHERE status='pending' AND species_no != 133 在库层拦住；
   * INSERT OR IGNORE 撞索引时 changes=0，按未授予返回，不抛错。133（伊布）不在索引里，
   * 与应用层豁免 133 去重一致（多颗伊布蛋进化 8 形态）。 */
  const ins = await db.prepare("INSERT OR IGNORE INTO reward_eggs(child_id, species_no, source, ref_id, status, unlock_date, created_epoch, date_shanghai) VALUES(?,?,?,?,'pending',?,?,?)")
    .bind(childId, speciesNo, source, refId == null ? null : refId, unlock, now, today).run();
  if (!ins.meta || ins.meta.changes === 0) {
    return { granted: false, reason: 'ALREADY_OWNED' };
  }
  const eggId = ins.meta ? Number(ins.meta.last_row_id) : null;
  return { granted: true, eggId, species: speciesNo, unlockDate: unlock };
}
async function pickOldestChance(db, table, childId) {
  try {
    return await db.prepare(
      `SELECT * FROM ${table} WHERE child_id=? AND used_epoch IS NULL ORDER BY created_epoch ASC, id ASC LIMIT 1`
    ).bind(childId).first();
  } catch { return null; }
}
/* CAS 占位（三盘同口径）：UPDATE … SET used_epoch=? WHERE id=? AND used_epoch IS NULL，抢到（changes>0）返回 true；
 * 调用方在返回 false 时一律回 STATE_CHANGED 409。 */
async function claimWheelChance(db, table, id, now) {
  const claim = await db.prepare(`UPDATE ${table} SET used_epoch=? WHERE id=? AND used_epoch IS NULL`).bind(now, id).run();
  return !!(claim.meta && claim.meta.changes);
}
/* 稀有 / 养成转盘共用 spin 骨架（先占位 CAS 再掷骰发奖）。
 * 差异全部由 cfg 注入：prepare（占位后取可抢池）、roll、award、wheel；
 * onEmptyPool:'refund' 仅稀有盘传——空池时把占位的 used_epoch 置回 NULL（养成盘无此分支，也不得补；补不补是产品决策）。
 * 高级盘（apiEvoWheelSpin）流程不同（先掷骰后占位、两表取机会），不走本骨架，只共用 withChild / claimWheelChance。 */
async function spinWheel(db, req, session, cfg) {
  return withChild(db, req, session, async (child, body, today) => {
    const now = Math.floor(Date.now() / 1000);
    let ch = await pickOldestChance(db, cfg.table, child.id);
    /* 任务 124：放行且没有机会时自动补一次（来源 debug-gates，ref 唯一），走正常占位/发奖流程，
     * 转完即消耗，可反复转；不放行时仍按原规则报没有机会。 */
    if (!ch && GATES_OPEN_FULL) {
      await grantWheelChance(db, cfg.table, 'debug-gates', child.id, 'debug-gates', `debug-${now}-${Math.floor(Math.random() * 1e9)}`, today, now);
      ch = await pickOldestChance(db, cfg.table, child.id);
    }
    if (!ch) return json({ ok: false, error: cfg.noChanceMsg }, 400);
    if (!(await claimWheelChance(db, cfg.table, ch.id, now))) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    const ctx = cfg.prepare ? await cfg.prepare(db, child) : null;
    const prize = cfg.roll(ctx);
    if (cfg.emptyMsg && !prize) {
      if (cfg.onEmptyPool === 'refund') await db.prepare(`UPDATE ${cfg.table} SET used_epoch=NULL WHERE id=?`).bind(ch.id).run();
      return json({ ok: false, error: cfg.emptyMsg }, 400);
    }
    const awarded = await cfg.award(db, child, ch, prize, today);
    if (awarded.err) return awarded.err;
    const left = await wheelChancesLeftFor(db, cfg.table, child.id);
    return json({ ok: true, prize: awarded.prize, chancesLeft: left, wheel: cfg.wheel(ctx, prize) });
  });
}

/* 孩子转高级转盘（v11 §2.4）：耗 1 次机会、归一化掷骰、全池为空禁转不扣机会；
 * 先占位（CAS）再发奖，奖品走 grantEgg/addBalls/addItem 各自的审计口径。 */
async function apiEvoWheelSpin(db, req, session) {
  return withChild(db, req, session, async (child, body, today) => {
    const now = Math.floor(Date.now() / 1000);
    // 两表并取最旧一条未用机会（学校 wheel_chances ＋ 进化 evo_wheel_grants，按 created_epoch 先到先转）
    let ch = await db.prepare(
      `SELECT id, 'wheel' AS src, created_epoch FROM wheel_chances WHERE child_id=? AND used_epoch IS NULL
     UNION ALL
     SELECT id, 'evo' AS src, created_epoch FROM evo_wheel_grants WHERE child_id=? AND used_epoch IS NULL
     ORDER BY created_epoch ASC, id ASC LIMIT 1`
    ).bind(child.id, child.id).first();
    /* 任务 124：放行且没有机会时，往 evo_wheel_grants 补一次（step_key 唯一），走正常占位/发奖流程，
     * 转完即消耗，可反复转；不放行时仍按原规则报没有机会。 */
    if (!ch && GATES_OPEN_FULL) {
      const ws = weekStartMon(today);
      await db.prepare(
        `INSERT OR IGNORE INTO evo_wheel_grants(child_id, step_key, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)`
      ).bind(child.id, `debug-${now}-${Math.floor(Math.random() * 1e9)}`, ws, now, today).run();
      ch = await db.prepare(
        `SELECT id, 'wheel' AS src, created_epoch FROM wheel_chances WHERE child_id=? AND used_epoch IS NULL
     UNION ALL
     SELECT id, 'evo' AS src, created_epoch FROM evo_wheel_grants WHERE child_id=? AND used_epoch IS NULL
     ORDER BY created_epoch ASC, id ASC LIMIT 1`
      ).bind(child.id, child.id).first();
    }
    if (!ch) return json({ ok: false, error: '没有高级转盘机会哦，考 95 分以上并上传试卷照片可以获得一次' }, 400);
    const [owned, ownedEggs] = GATES_OPEN
      ? [new Set(), new Set()]
      : await Promise.all([ownedSpeciesSet(db, child.id), pendingEggSpeciesSet(db, child.id)]);
    const prize = rollWheelPrize(Math.random, owned, ownedEggs);
    if (!prize) return json({ ok: false, error: '奖池里的东西都有啦，这次转不了' }, 400);
    const claimTable = ch.src === 'evo' ? 'evo_wheel_grants' : 'wheel_chances';
    if (!(await claimWheelChance(db, claimTable, ch.id, now))) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
    if (ch.src === 'wheel') await syncTouch(db, child.id, 'wheel_chances', 'id=?', [ch.id]); // evo 表不进同步层，不 touch
    const chanceRefType = ch.src === 'evo' ? 'evo_wheel_grant' : 'wheel_chance';
    let awarded = null;
    if (prize.kind === 'egg') {
      const g = await grantEgg(db, child.id, prize.species, 'wheel', ch.id, today);
      if (!g.granted) {
        /* 发奖失败退回机会（2026-11-17，性能优化#7）：机会已占位（used_epoch 已置），
         * grantEgg 失败不能白扣一次；与稀有盘空池退回同款（UPDATE used_epoch=NULL），
         * 孩子可再转一次。 */
        await db.prepare(`UPDATE ${claimTable} SET used_epoch=NULL WHERE id=?`).bind(ch.id).run();
        console.error('wheel spin egg grant failed after claim', { chanceId: ch.id, species: prize.species });
        return json({ ok: false, error: '发奖失败，请找爸爸妈妈看看' }, 500);
      }
      awarded = { kind: 'egg', species: prize.species, name: speciesName(prize.species), img: petImg(prize.species), unlockDate: g.unlockDate };
    } else if (prize.kind === 'ball') {
      await addBalls(db, child.id, 'hyper', 1, today);
      awarded = { kind: 'ball', key: 'ball:hyper', name: '高级球', emoji: '🟡' };
    } else if (prize.kind === 'medicine') {
      await addItem(db, child.id, prize.key, 1, 'wheel', chanceRefType, ch.id, today);
      awarded = { kind: 'medicine', key: prize.key, name: ITEM_CATALOG[prize.key].name, emoji: ITEM_CATALOG[prize.key].emoji };
    } else if (prize.kind === 'stone') {
      await addItem(db, child.id, prize.key, 1, 'wheel', chanceRefType, ch.id, today);
      awarded = { kind: 'stone', key: prize.key, name: ITEM_CATALOG[prize.key].name, emoji: ITEM_CATALOG[prize.key].emoji };
    }
    const left = await wheelChancesLeft(db, child.id);
    // 转盘升级（2026-11-07）：扇区由本次实际可用奖池算出（蛋档去重后为空时蛋扇区不出现），
    // winnerIndex 对应本次奖品（蛋奖品对应 'egg' 扇区）；奖池权重与机会规则一字不动。
    const { entries } = evoWheelEntries(owned, ownedEggs);
    const wheelBuilt = buildWheelSectors(entries);
    const winnerKey = prize.kind === 'egg' ? 'egg' : prize.key;
    return json({ ok: true, prize: awarded, chancesLeft: left, wheel: { ...wheelBuilt, winnerIndex: wheelWinnerIndex(wheelBuilt.sectors, winnerKey) } });
  });
}

/* 孩子转稀有转盘（2026-11-07 新建，仿 apiEvoWheelSpin）：耗 1 次稀有机会、奖品走 grantEgg 发蛋；
 * 先占位（CAS）再掷骰发奖；空池禁转不扣机会（占位已抢到时把 used_epoch 置回 NULL）。 */
async function apiRareWheelSpin(db, req, session) {
  return spinWheel(db, req, session, {
    table: 'rare_wheel_chances',
    noChanceMsg: '没有稀有转盘机会哦，出测验题或期末考试 95 分以上可以获得一次',
    emptyMsg: '奖池里的都拥有啦，这次转不了',
    onEmptyPool: 'refund', // 稀有盘独有：空池禁转不扣机会
    async prepare(db, child) {
      const [owned, ownedEggs] = await Promise.all([ownedSpeciesSet(db, child.id), pendingEggSpeciesSet(db, child.id)]);
      return { owned, ownedEggs };
    },
    roll: (ctx) => rollRareWheelPrize(Math.random, ctx.owned, ctx.ownedEggs),
    async award(db, child, ch, prize, today) {
      const g = await grantEgg(db, child.id, prize.species, 'rare-wheel', ch.id, today);
      if (!g.granted) {
        console.error('rare wheel spin egg grant failed after claim', { chanceId: ch.id, species: prize.species });
        return { err: json({ ok: false, error: '发奖失败，请找爸爸妈妈看看' }, 500) };
      }
      return { prize: { kind: 'egg', species: prize.species, name: speciesName(prize.species), img: petImg(prize.species), unlockDate: g.unlockDate } };
    },
    wheel(ctx, prize) {
      const { owned, ownedEggs } = ctx;
      const avail = {
        legendary: RARE_WHEEL_LEGENDARIES.filter((n) => !owned.has(n) && !ownedEggs.has(n)),
        eevee: RARE_WHEEL_EEVEE.filter((n) => !owned.has(n) && !ownedEggs.has(n)),
        final: RARE_WHEEL_FINALS.filter((n) => !owned.has(n) && !ownedEggs.has(n)),
      };
      const wheelBuilt = rareWheelSectors(avail);
      return { ...wheelBuilt, winnerIndex: wheelWinnerIndex(wheelBuilt.sectors, rareSectorKeyFor(prize)) };
    },
  });
}

/* 孩子转养成转盘（2026-11-08 新建，仿 apiRareWheelSpin）：耗 1 次养成机会、奖品走 addItem 发照顾道具；
 * 先占位（CAS）再掷骰发奖；只消耗 care_wheel_chances，不动 wheel_chances、不触 WHEEL_WEEK_LIMIT
 *（周上限仅限高级转盘）。奖池 10 样全是 care:*，抽中必为其一。 */
async function apiCareWheelSpin(db, req, session) {
  return spinWheel(db, req, session, {
    table: 'care_wheel_chances',
    noChanceMsg: '没有养成转盘机会哦，完成今日 5 句每日英语跟读可以获得一次',
    // 养成盘无空池分支（奖池 10 样全是 care:*，抽中必为其一），不传 emptyMsg / onEmptyPool
    roll: () => rollCareWheelPrize(Math.random),
    async award(db, child, ch, prizeKey, today) {
      await addItem(db, child.id, prizeKey, 1, 'care-wheel', 'care_wheel_chance', ch.id, today);
      const cat = ITEM_CATALOG[prizeKey] || {};
      return { prize: { kind: 'item', key: prizeKey, name: cat.name || prizeKey, emoji: cat.emoji || '🎁' } };
    },
    wheel: (ctx, prizeKey) => careWheelFor(prizeKey),
  });
}

/* 孩子转普通转盘（2026-11-17 新建，仿 apiCareWheelSpin）：耗 1 次 Oak 机会、奖品走 OAK_WHEEL_POOL；
 * 先占位（CAS）再掷骰发奖；只消耗 oak_wheel_chances，不动 wheel_chances、不触 WHEEL_WEEK_LIMIT
 *（周上限仅限高级转盘）。奖品发放口径与旧 oakRollDraw 当场发奖一致：xp 加经验、ball 发球、道具发道具。 */
async function apiOakWheelSpin(db, req, session) {
  return spinWheel(db, req, session, {
    table: 'oak_wheel_chances',
    noChanceMsg: '没有普通转盘机会哦，在大木博士英语交流里读出 4 句 5 星可以获得一次',
    // 普通盘无空池分支（奖池 18 样，抽中必为其一），不传 emptyMsg / onEmptyPool
    roll: () => oakRollDraw(Math.random),
    async award(db, child, ch, drawn, today) {
      const nowEpoch = Math.floor(Date.now() / 1000);
      if (drawn.prize === 'xp') {
        const xpInfo = await grantXp(db, child, drawn.xpAwarded, today);
        await pushEvoNotices(db, child.id, xpInfo);
      } else if (drawn.prize === 'ball') {
        // 普通精灵球走发球记账：children.balls +1 ＋ ball_grants 审计行（checkin_id 为空，属系统发放，历史页已兼容空值）
        await db.batch([
          db.prepare('UPDATE children SET balls = balls + 1 WHERE id=?').bind(child.id),
          db.prepare(
            `INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai)
             VALUES(?,?,?,?,?,?)`
          ).bind(child.id, 'normal', 1, null, nowEpoch, today),
        ]);
        {
          const v = await bumpChildVersion(db, child.id);
          await touchRow(db, 'children', 'id=?', [child.id], v);
          const g = await db.prepare('SELECT id FROM ball_grants WHERE child_id=? AND created_epoch=? ORDER BY id DESC LIMIT 1').bind(child.id, nowEpoch).first();
          if (g) await touchRow(db, 'ball_grants', 'id=?', [g.id], v);
        }
        await settleBallOverflow(db, child.id, today); // v11：球满 99 自动向上兑换
      } else {
        // 道具奖品（care 食物/洗澡、伤药、活力碎片、高级球）走背包：addItem＋item_ledger 审计行，reason 'oak-wheel'
        await addItem(db, child.id, drawn.prizeKey, 1, 'oak-wheel', 'oak_wheel_chance', ch.id, today);
      }
      const { prizeName, prizeEmoji } = oakPrizeDisplay(drawn.prize, drawn.prizeKey);
      return { prize: { kind: drawn.prize, key: drawn.prizeKey, name: prizeName, emoji: prizeEmoji } };
    },
    wheel: (ctx, drawn) => oakWheelFor(drawn.prizeKey),
  });
}

export function register(route) {
  route('/api/evo/wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiEvoWheelSpin(db, req, session));
  route('/api/rare-wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiRareWheelSpin(db, req, session));
  route('/api/care-wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiCareWheelSpin(db, req, session));
  route('/api/oak-wheel/spin', { method: 'POST' }, ({ db, req, session }) => apiOakWheelSpin(db, req, session));
}
export { OAK_DRAW_XP, oakRollDraw, oakWheelFor, EGG_HATCH_DAYS, rollWheelPrize, wheelWinnerIndex, rollRareWheelPrize, rollCareWheelPrize, careWheelFor, grantEgg };
