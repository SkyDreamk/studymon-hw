/* care 模块（模块化后端 方案A 第 1 步）：从 src/index.js 机械搬出，逻辑零改动。
 * register(route) 用 src/index.js 的 route() 助手注册本模块的全部路由（path/method/auth 与搬出前完全一致）。 */
import { CARE_SCENES, FRIENDSHIP_MAX, GATES_OPEN_FULL, addItem, careSceneForDate, ensureMainPetInstanceForCare, getChild, getChildMainFriendship, gradeNumFromLabel, grantXp, isCareEnabled, json, normalizeQuizRow, petImg, pushNotice, readJsonBody, scopeChildId, shDateStr, takeItem } from '../lib/shared.js';



// 照顾玩法：独立总开关、每日一次；只有喂最爱食物发经验，战斗绝不发经验。
const CARE_XP_FAVORITE = 5;
const CARE_FOODS = [
  { key: 'apple', name: '红苹果', emoji: '🍎', flavor: '清甜' },
  { key: 'berry', name: '树果', emoji: '🍓', flavor: '酸甜' },
  { key: 'cookie', name: '曲奇饼干', emoji: '🍪', flavor: '酥脆' },
  { key: 'meat', name: '香烤肉干', emoji: '🍖', flavor: '咸香' },
  { key: 'milk', name: '鲜牛奶', emoji: '🥛', flavor: '奶香' },
  { key: 'honey', name: '野花蜂蜜', emoji: '🍯', flavor: '花香甜' },
];
const CARE_BATHS = [
  { key: 'bubble', name: '泡泡浴', emoji: '🫧' },
  { key: 'shower', name: '温水淋浴', emoji: '🚿' },
  { key: 'petal', name: '花瓣浴', emoji: '🌸' },
  { key: 'herb', name: '草药浴', emoji: '🍃' },
];
// 每天随机最爱（2026-11-20 用户定）：每天按（孩子，日期）确定性抽取一种最爱食物＋一种最爱洗澡方式，
// 同一天内稳定不变、跨天重抽；最爱 +5 经验，非最爱只 +10 友好度。FNV-1a 哈希取模，
// 不落库、不迁移，状态接口与出招接口用同一函数算同一天的值，不会两边不一致。
function careDailyFavorite(childId, dateStr) {
  const seed = (salt) => {
    const str = String(childId) + '|' + String(dateStr) + '|' + salt;
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  return {
    food: CARE_FOODS[seed('food') % CARE_FOODS.length].key,
    bath: CARE_BATHS[seed('bath') % CARE_BATHS.length].key,
  };
}
function careFoodByKey(key) {
  return CARE_FOODS.find(f => f.key === key) || null;
}
function careBathByKey(key) {
  return CARE_BATHS.find(b => b.key === key) || null;
}

async function apiCareStatus(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = { childId: new URL(req.url).searchParams.get('childId') };
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const today = shDateStr();
  // 三个读取互不依赖（今日记录 / 背包照顾道具 / 近 7 天记录）：并行发出，各自保留原来的“表未建”静默兜底
  const start = new Date(today + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 6);
  const since = start.toISOString().slice(0, 10);
  const [todayRows, inv, rows] = await Promise.all([
    (async () => {
      try {
        return await db.prepare(
          'SELECT kind FROM care_logs WHERE child_id=? AND date_shanghai=?'
        ).bind(child.id, today).all();
      } catch (e) { return { results: [] }; /* care_logs 未建：当未喂/未洗 */ }
    })(),
    // 背包里照顾道具数量（2026-11-08）：前端把没有的选项置灰
    (async () => {
      try {
        return await db.prepare(
          "SELECT item_key, qty FROM item_inventory WHERE child_id=? AND item_key LIKE 'care:%'"
        ).bind(child.id).all();
      } catch (e) { return { results: [] }; /* item_inventory 未建：当没有 */ }
    })(),
    (async () => {
      try {
        return await db.prepare(
          'SELECT * FROM care_logs WHERE child_id=? AND date_shanghai>=? AND date_shanghai<=? ORDER BY date_shanghai DESC, id DESC'
        ).bind(child.id, since, today).all();
      } catch (e) { return { results: [] }; /* care_logs 未建：当无记录 */ }
    })(),
  ]);
  const qtyByKey = new Map((inv.results || []).map(r => [r.item_key, Number(r.qty) || 0]));
  // 每天随机最爱（2026-11-20）：当天最爱直接标 ❤️，不用先喂出来才“发现”；
  // 非最爱不标。喂/洗接口用同一函数判最爱，前后端口径一致。
  const dailyFav = careDailyFavorite(child.id, today);
  const foods = [];
  for (const food of CARE_FOODS) {
    foods.push({ ...food, isFavoriteKnown: food.key === dailyFav.food, qty: qtyByKey.get('care:' + food.key) || 0 });
  }
  const recent = (rows.results || []).map(row => ({
    date: row.date_shanghai, kind: row.kind, itemKey: row.item_key,
    itemName: (row.kind === 'feed' ? careFoodByKey(row.item_key) : careBathByKey(row.item_key))?.name || row.item_key,
    sceneKey: row.scene_key,
    sceneName: CARE_SCENES.find(s => s.key === row.scene_key)?.name || row.scene_key,
    sceneText: CARE_SCENES.find(s => s.key === row.scene_key)?.text || '',
    favorite: !!row.favorite, xpAwarded: row.xp_awarded,
  }));
  return json({
    ok: true, enabled: true, today, scene: careSceneForDate(today),
    fedToday: (todayRows.results || []).some(r => r.kind === 'feed'),
    bathedToday: (todayRows.results || []).some(r => r.kind === 'bath'),
    gatesOpen: GATES_OPEN_FULL, /* 任务 124：前端据此决定喂食/洗澡按钮是否置灰 */
    foods, baths: CARE_BATHS.map(b => ({ ...b, isFavoriteKnown: b.key === dailyFav.bath, qty: qtyByKey.get('care:' + b.key) || 0 })), recent,
    dailyFavorite: dailyFav,
  });
}
async function doCareAction(db, req, session, { kind, lookup, invalidMsg, alreadyDoneMsg, isFavorite }) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const item = lookup(body);
  if (!item) return json({ ok: false, error: invalidMsg }, 400);
  const today = shDateStr(), scene = careSceneForDate(today), itemKey = 'care:' + item.key, tag = 'care-' + kind;
  const alreadyDone = () => json({ ok: false, code: 'ALREADY_DONE', error: alreadyDoneMsg }, 400);
  /* 任务 124：门槛放行时跳过“今天已做”检查，并删掉今天已有的同类照顾记录（care_logs 对
   * (child_id, date_shanghai, kind) 有唯一约束，不删就插不进第二条）；放行时也不扣道具。 */
  if (!GATES_OPEN_FULL && await db.prepare(
    `SELECT 1 FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='${kind}'`
  ).bind(child.id, today).first()) return alreadyDone();
  if (GATES_OPEN_FULL) {
    await db.prepare(
      `DELETE FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='${kind}'`
    ).bind(child.id, today).run();
  }
  const favorite = isFavorite ? isFavorite(body, child) : false;
  const xpAwarded = favorite ? CARE_XP_FAVORITE : 0;
  // 照顾必扣道具（2026-11-08）：先扣道具再写 care_logs；没有道具直接失败，不写记录、不给经验、不加友好度。
  // 任务 124：放行时不扣道具（短路，takeItem 不执行）。
  const took = GATES_OPEN_FULL || await takeItem(db, child.id, itemKey, 1, tag, 'care_log', null, today);
  if (!took) return json({ ok: false, code: 'NO_ITEM', error: `没有「${item.name}」，先去养成转盘抽一个吧` }, 400);
  let result;
  try {
    result = await db.prepare(
      `INSERT INTO care_logs(child_id,date_shanghai,kind,item_key,favorite,xp_awarded,scene_key,created_epoch) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM care_logs WHERE child_id=? AND date_shanghai=? AND kind='${kind}')`
    ).bind(child.id, today, kind, item.key, favorite ? 1 : 0, xpAwarded, scene.key, Math.floor(Date.now() / 1000), child.id, today).run();
  } catch (error) {
    if (!/UNIQUE constraint failed/i.test(String(error))) throw error;
    // 并发冲突：道具退回（放行时没扣过，不退）
    if (!GATES_OPEN_FULL) {
      try { await addItem(db, child.id, itemKey, 1, tag + '-refund', 'care_log', null, today); } catch { /* 退款失败不阻塞 */ }
    }
    return alreadyDone();
  }
  if (result.meta?.changes === 0) {
    if (!GATES_OPEN_FULL) {
      try { await addItem(db, child.id, itemKey, 1, tag + '-refund', 'care_log', null, today); } catch { /* 退款失败不阻塞 */ }
    }
    return alreadyDone();
  }
  let xpInfo = null;
  if (xpAwarded > 0) {
    xpInfo = await grantXp(db, child, CARE_XP_FAVORITE, today);
    // 静态契约（tests/care.test.mjs）：进化通知须保留字面 pushNotice 调用，勿改走 helper
    if (xpInfo.evolved) await pushNotice(db, child.id, 'evolution', xpInfo.evolved);
    if (xpInfo.pendingFairyEvolve) await pushNotice(db, child.id, 'evo-ready', { to: '仙子伊布', branch: 'sylveon', img: petImg(700) });
  }
  // 友好度改到照顾系统（2026-11-08）：每次成功照顾 +10，上限 255。
  const fr = await awardCareActionFriendship(db, child, today);
  const base = { ok: true, xpAwarded, scene, friendshipAwarded: fr.awarded, friendship: fr.friendship, hearts: fr.hearts };
  if (!isFavorite) return json(base);
  const level = xpInfo ? {
    oldLevel: xpInfo.oldLevel, newLevel: xpInfo.newLevel,
    levelsGained: xpInfo.levelsGained, newMoves: xpInfo.newMoves, evolved: xpInfo.evolved,
  } : null;
  return json({ ok: true, favorite, ...base, level });
}
async function apiCareFeed(db, req, session) {
  return doCareAction(db, req, session, {
    kind: 'feed',
    lookup: (body) => careFoodByKey(body.food),
    invalidMsg: '没有这种食物',
    alreadyDoneMsg: '今天已经喂过啦，明天再来吧',
    isFavorite: (body, child) => body.food === careDailyFavorite(child.id, shDateStr()).food,
  });
}
async function apiCareBath(db, req, session) {
  return doCareAction(db, req, session, {
    kind: 'bath',
    lookup: (body) => careBathByKey(body.bath),
    invalidMsg: '没有这种洗澡方式',
    alreadyDoneMsg: '今天已经洗过啦',
    // 每天随机最爱（2026-11-20）：洗澡也有最爱，最爱 +5 经验，与喂食同口径。
    isFavorite: (body, child) => body.bath === careDailyFavorite(child.id, shDateStr()).bath,
  });
}

/* ====== C：伙伴问答与友好度（/api/care/qa/*） ====== */
const CARE_QA_DAILY_LIMIT = 3;
// 友好度改到照顾系统（2026-11-08）：喂食/洗澡每次 +10，问答不再加友好度；照顾必扣道具。
const CARE_ACTION_FRIENDSHIP_GAIN = 10;
const CARE_QA_XP_GAIN = 5;

function friendshipHeartsOf(friendship) {
  const f = Math.max(0, Math.min(FRIENDSHIP_MAX, Number(friendship) || 0));
  return Math.floor(f / 51);
}

/* 照顾动作加友好度（2026-11-08）：每次成功喂食/洗澡 +10，上限 255；与问答原更新语句同款，绝不调 syncTouch / touchRow。 */
async function awardCareActionFriendship(db, child, today) {
  const prev = await getChildMainFriendship(db, child, today);
  const next = Math.min(FRIENDSHIP_MAX, prev + CARE_ACTION_FRIENDSHIP_GAIN);
  const awarded = next - prev;
  if (awarded > 0) {
    await db.prepare(
      `UPDATE pet_instances SET friendship = ?, updated_epoch = ? WHERE child_id = ? AND line_key = ?`
    ).bind(next, Math.floor(Date.now() / 1000), child.id, child.line).run();
  }
  return { awarded, friendship: next, hearts: friendshipHeartsOf(next) };
}

// 构建孩子的养成问答候选池：仅 kind='study'、active=1、grade 匹配孩子 gradeNumFromLabel(child.grade_label) 或 NULL 通用；
// 排除今日已在 care_qa_logs 答过的题；优先排 quiz_attempts 中曾答过的复习题。
async function pickCareQaQuestion(db, child, today) {
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const { results: rawQuestions } = await db.prepare(
    `SELECT * FROM quiz_questions
     WHERE kind = 'study'
       AND active = 1
       AND is_custom = 0
       AND (grade IS NULL OR grade = ?)
     ORDER BY id ASC`
  ).bind(gradeNum).all();

  if (!rawQuestions || !rawQuestions.length) return null;

  const { results: todayLogs } = await db.prepare(
    `SELECT question_id FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?`
  ).bind(child.id, today).all();
  const answeredTodaySet = new Set((todayLogs || []).map((r) => Number(r.question_id)));

  const candidates = rawQuestions.filter((r) => !answeredTodaySet.has(Number(r.id)));
  if (!candidates.length) return null;

  const { results: historyRows } = await db.prepare(
    `SELECT DISTINCT question_id FROM quiz_attempts WHERE child_id = ?`
  ).bind(child.id).all();
  const reviewedSet = new Set((historyRows || []).map((r) => Number(r.question_id)));

  const reviewPool = candidates.filter((r) => reviewedSet.has(Number(r.id)));
  const chosenRaw = reviewPool.length > 0 ? reviewPool[0] : candidates[0];
  return normalizeQuizRow(chosenRaw);
}

async function apiCareQaStatus(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const url = new URL(req.url);
  const rawChildId = url.searchParams.get('childId') ?? url.searchParams.get('child_id');
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const today = shDateStr();
  const { results: logs } = await db.prepare(
    `SELECT question_id, correct, friendship_awarded, xp_awarded
     FROM care_qa_logs
     WHERE child_id = ? AND date_shanghai = ?
     ORDER BY id ASC`
  ).bind(childId, today).all();

  const answeredCount = (logs || []).length;
  const remaining = Math.max(0, CARE_QA_DAILY_LIMIT - answeredCount);
  const friendship = await getChildMainFriendship(db, child, today);
  const hearts = friendshipHeartsOf(friendship);

  return json({
    ok: true,
    childId,
    today,
    dailyLimit: CARE_QA_DAILY_LIMIT,
    answeredToday: answeredCount,
    remainingToday: remaining,
    friendship,
    hearts,
  });
}

async function apiCareQaQuestion(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const url = new URL(req.url);
  const rawChildId = url.searchParams.get('childId') ?? url.searchParams.get('child_id');
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const today = shDateStr();
  const cntRow = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?`
  ).bind(childId, today).first();
  const answeredCount = Number(cntRow?.cnt || 0);
  if (!GATES_OPEN_FULL && answeredCount >= CARE_QA_DAILY_LIMIT) {
    return json({ ok: false, error: 'DAILY_LIMIT_REACHED' }, 400);
  }

  const q = await pickCareQaQuestion(db, child, today);
  if (!q) {
    return json({ ok: false, error: 'NO_QUESTION_AVAILABLE' }, 404);
  }

  const friendship = await getChildMainFriendship(db, child, today);
  // 下发题目绝不携带 answer_idx
  return json({
    ok: true,
    childId,
    answeredToday: answeredCount,
    remainingToday: Math.max(0, CARE_QA_DAILY_LIMIT - answeredCount),
    friendship,
    hearts: friendshipHeartsOf(friendship),
    question: {
      id: q.id,
      kind: q.kind,
      grade: q.grade,
      subject: q.subject,
      question: q.question,
      options: q.options,
    },
  });
}

async function apiCareQaAnswer(db, req, session) {
  if (!(await isCareEnabled(db))) return json({ ok: false, error: 'CARE_DISABLED' }, 403);
  const body = await readJsonBody(req);
  const rawChildId = body.childId ?? body.child_id;
  const scoped = scopeChildId(session, rawChildId);
  if (scoped.err) return scoped.err;
  const childId = scoped.id;

  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);

  const questionId = Number(body.questionId ?? body.question_id);
  const answerIdx = Number(body.answerIdx ?? body.answer_idx);
  if (!Number.isInteger(questionId) || questionId <= 0 || !Number.isInteger(answerIdx) || answerIdx < 0) {
    return json({ ok: false, error: 'INVALID_PARAMS' }, 400);
  }

  const today = shDateStr();

  // 1. 校验该题是否属于该孩子的养成问答合法池（kind='study', active=1, is_custom=0, 年级匹配 gradeNumFromLabel(child.grade_label) 或 NULL）
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const rawQ = await db.prepare(
    `SELECT * FROM quiz_questions
     WHERE id = ?
       AND kind = 'study'
       AND active = 1
       AND is_custom = 0
       AND (grade IS NULL OR grade = ?)`
  ).bind(questionId, gradeNum).first();

  if (!rawQ) {
    return json({ ok: false, error: 'QUESTION_NOT_IN_CARE_POOL' }, 400);
  }
  const q = normalizeQuizRow(rawQ);

  // 2. 校验今日是否已答过此题
  // （2、3 两步只读、互不依赖：并行取，判定仍按 2→3 的顺序）
  const [dupRow, cntRow] = await Promise.all([
    db.prepare(
      `SELECT id FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ? AND question_id = ?`
    ).bind(childId, today, questionId).first(),
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?`
    ).bind(childId, today).first(),
  ]);
  if (dupRow) {
    return json({ ok: false, error: 'ALREADY_ANSWERED_TODAY' }, 400);
  }

  // 3. 校验今日是否已满 3 道
  const answeredBefore = Number(cntRow?.cnt || 0);
  if (!GATES_OPEN_FULL && answeredBefore >= CARE_QA_DAILY_LIMIT) {
    return json({ ok: false, error: 'DAILY_LIMIT_REACHED' }, 400);
  }

  const correct = answerIdx === Number(q.answer_idx);
  await ensureMainPetInstanceForCare(db, child, today);
  const prevFriendship = await getChildMainFriendship(db, child, today);
  // 问答不再加友好度（2026-11-08）：友好度改到照顾系统（喂食/洗澡每次 +10）。
  const newFriendship = prevFriendship;
  const friendshipAwarded = 0;
  const xpAwarded = correct ? CARE_QA_XP_GAIN : 0;
  const now = Math.floor(Date.now() / 1000);

  // 4. 原子插入 care_qa_logs（含每日 < 3 条件防并发超限）
  const ins = await db.prepare(
    `INSERT OR IGNORE INTO care_qa_logs(
       child_id, question_id, date_shanghai, correct, friendship_awarded, xp_awarded, created_epoch
     )
     SELECT ?, ?, ?, ?, ?, ?, ?
     WHERE (
       SELECT COUNT(*) FROM care_qa_logs WHERE child_id = ? AND date_shanghai = ?
     ) < ${CARE_QA_DAILY_LIMIT}`
  ).bind(
    childId, questionId, today, correct ? 1 : 0, friendshipAwarded, xpAwarded, now,
    childId, today
  ).run();

  if (!ins.meta || !ins.meta.changes) {
    return json({ ok: false, error: 'ALREADY_ANSWERED_OR_LIMIT_REACHED' }, 400);
  }

  // 5. 答对：只发 +5 经验（友好度已改到照顾系统，问答不再更新 pet_instances.friendship）
  let levelInfo = null;
  if (correct) {
    const xpRes = await grantXp(db, child, CARE_QA_XP_GAIN, today);
    levelInfo = {
      oldLevel: xpRes.oldLevel,
      newLevel: xpRes.newLevel,
      levelsGained: xpRes.levelsGained,
      newMoves: xpRes.newMoves,
      evolved: xpRes.evolved,
    };
  }

  const answeredToday = answeredBefore + 1;
  return json({
    ok: true,
    correct,
    answerIdx: q.answer_idx,
    explain: q.explain || '',
    friendshipAwarded,
    friendship: newFriendship,
    hearts: friendshipHeartsOf(newFriendship),
    xpAwarded,
    level: levelInfo,
    answeredToday,
    remainingToday: Math.max(0, CARE_QA_DAILY_LIMIT - answeredToday),
  });
}

export function register(route) {
  route('/api/care/status', { method: 'GET' }, ({ db, req, session }) => apiCareStatus(db, req, session));
  route('/api/care/feed', { method: 'POST' }, ({ db, req, session }) => apiCareFeed(db, req, session));
  route('/api/care/bath', { method: 'POST' }, ({ db, req, session }) => apiCareBath(db, req, session));
  route('/api/care/qa/status', { method: 'GET' }, ({ db, req, session }) => apiCareQaStatus(db, req, session));
  route('/api/care/qa/question', { method: 'GET' }, ({ db, req, session }) => apiCareQaQuestion(db, req, session));
  route('/api/care/qa/answer', { method: 'POST' }, ({ db, req, session }) => apiCareQaAnswer(db, req, session));
}
export { CARE_FOODS, CARE_BATHS, CARE_XP_FAVORITE, careDailyFavorite, careFoodByKey, careBathByKey, friendshipHeartsOf };
