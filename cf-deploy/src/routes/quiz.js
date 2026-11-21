/* quiz 模块（模块化后端 方案A 第 1 步）：从 src/index.js 机械搬出，逻辑零改动。
 * register(route) 用 src/index.js 的 route() 助手注册本模块的全部路由（path/method/auth 与搬出前完全一致）。 */
import { DIAG_FAIL_CLOSED, DIAG_NO_QUESTION_TOPIC, DIAG_TOPIC_BY_ID, EEVEE_BRANCHES, GATES_OPEN_FULL, LINE_TYPE, SKILL_MAX_LEVEL, allMovesFor, apiQuizAnswer, approvedSubjectsToday, collectionMovesFor, diagRecompute, getChild, getEffSetting, getExMainLine, gradeNumFromLabel, json, levelFromXp, lineMovesFor, loadHotSettings, loadMathGate, mathGatePass, moveEffectOf, normalizeQuizRow, ownsSpecies, quizDailyTotal, quizHistoryForChild, quizPoolForChild, readJsonBody, safeJsonArr, safeJsonObj, scopeChildId, shDateStr, skillPower, syncTouch } from '../lib/shared.js';


function questionLabel(q) {
  return q.kind === 'riddle' ? '脑筋急转弯' : `${q.subject || '综合'}题`;
}
const DIAG_REVIEW_COUNT = 2;

/* 复习题选题（纯函数）：根因知识点内、active 数学学习题，题目的 grade 与根因年级一致；
 * 优先从未答过，其次按最近一次作答日期最久远；排除当日已答、当日题单、当日已出复习题；
 * 出题前以 mathGatePass 复核（门外不出）。pool 为 normalize 后的全部题；
 * history 为 Map(qid → {lastDate, lastCorrect})。返回最多 DIAG_REVIEW_COUNT 道（不足不凑）。 */
function diagPickReview(pool, { rootTopicId, excludeIds = new Set(), answeredIds = new Set(), issuedIds = new Set(), mathGate = null, history = null } = {}) {
  const root = DIAG_TOPIC_BY_ID.get(rootTopicId);
  if (!root) return [];
  const hist = history instanceof Map ? history : new Map();
  const cands = (pool || []).filter((q) => q.active !== 0 && q.active !== false
    && q.kind === 'study' && q.subject === '数学' && q.topicId === rootTopicId
    && (q.grade === root.grade || q.grade == null)
    && !excludeIds.has(Number(q.id)) && !answeredIds.has(Number(q.id)) && !issuedIds.has(Number(q.id))
    && mathGatePass(q, mathGate));
  const lastDateOf = (q) => { const h = hist.get(Number(q.id)); return h && h.lastDate ? h.lastDate : null; };
  const sorted = [...cands].sort((a, b) => {
    const ha = hist.has(Number(a.id)), hb = hist.has(Number(b.id));
    if (ha !== hb) return ha ? 1 : -1;
    const d = String(lastDateOf(a) || '').localeCompare(String(lastDateOf(b) || ''));
    return d || (a.id - b.id);
  });
  return sorted.slice(0, DIAG_REVIEW_COUNT);
}

async function apiQuizToday(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  // Fable 优化 #3：本请求所需的设置一次取齐（三门进度、quiz_repeat_days、quiz_xp）
  const S = await loadHotSettings(db, child.family_id, [
    `math_progress_${child.id}`, `chinese_progress_${child.id}`, `english_progress_${child.id}`,
    'quiz_repeat_days', 'quiz_xp',
  ]);
  const pool = await quizPoolForChild(db, child, today, S);
  const quizXp = Number(((S.has('quiz_xp')) ? S.get('quiz_xp') : await getEffSetting(db, child.family_id, 'quiz_xp')) || 10);
  const gradeNum = gradeNumFromLabel(child.grade_label);
  const list = pool.questions.map((q) => ({
    id: q.id, kind: q.kind, subject: q.subject, label: questionLabel(q),
    question: q.question, options: q.options, hasPhoto: !!q.photoKey,
    answered: pool.attempts.has(q.id),
    correct: pool.attempts.has(q.id) ? !!pool.attempts.get(q.id).correct : null,
  }));
  return json({
    ok: true, childId: child.id, childName: child.name, childGrade: child.grade_label,
    readAloudHint: gradeNum === 1,
    date: today, subjects: pool.subjects, quota: pool.quota,
    answeredCount: list.filter((x) => x.answered).length,
    remaining: Math.max(0, pool.questions.length - list.filter((x) => x.answered).length),
    quizXp,
    quiz: {
      fragments: child.quiz_fragments || 0,
      correctTotal: child.quiz_correct_total || 0,
      nextFragmentIn: 5 - ((child.quiz_correct_total || 0) % 5),
    },
    questions: list,
  });
}

async function apiQuizUpgradeMove(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const moveName = body.moveName ? String(body.moveName) : '';
  if (!moveName) return json({ ok: false, error: '请先选一个招式' }, 400);
  const level = levelFromXp(child.total_xp);
  const moves = allMovesFor(child, level, LINE_TYPE[child.line]);
  let mv = moves.find((m) => m.name === moveName && !m.fairy);
  let benchNo = null;
  let benchExLine = null, benchExBranch = null; // 任务 110：备战前主宠的线/分支（重算 after 用）
  if (!mv) {
    // 备战宠独有招：只认随请求传入的 benchNo 对应物种已学会的招式（须拥有该种；
    // 测试模式 ownsSpecies 全放行，与备战选择口径一致）。不传 benchNo 时独有招仍拒绝，
    // 避免同名招在多个备战种的学会等级不同、响应里的 level/power 失去所指。
    const bn = body.benchNo != null ? Number(body.benchNo) : NaN;
    if (Number.isInteger(bn) && await ownsSpecies(db, childId, bn)) {
      // 任务 110：前主宠的招查自己线的表，不查收藏表（ownsSpecies 已含前主宠例外）
      const benchEx = await getExMainLine(db, childId, bn);
      const benchMoves = benchEx
        ? lineMovesFor(child, benchEx.lineKey, level, benchEx.branch ? EEVEE_BRANCHES[benchEx.branch].type : LINE_TYPE[benchEx.lineKey])
        : collectionMovesFor(child, bn, level);
      const bm = benchMoves.find((m) => m.name === moveName);
      if (bm) { mv = bm; benchNo = bn; benchExLine = benchEx ? benchEx.lineKey : null; benchExBranch = benchEx ? benchEx.branch : null; }
    }
  }
  if (!mv) return json({ ok: false, error: '这个招式还没学会，不能升级' }, 400);
  const curLevel = mv.skillLevel || 1;
  if (curLevel >= SKILL_MAX_LEVEL) return json({ ok: false, error: '这个招式已经满级啦' }, 400);
  const frags = child.quiz_fragments || 0;
  if (frags < 3) return json({ ok: false, error: `技能碎片还不够，再攒 ${3 - frags} 枚吧` }, 400);
  const newLevel = curLevel + 1;
  const levels = safeJsonObj(child.move_levels);
  levels[moveName] = newLevel;
  // 条件扣减：并发/连点时只有一个请求能扣成功，其余回 409；只扣 quiz_fragments，不改 quiz_correct_total
  const upd = await db.prepare('UPDATE children SET quiz_fragments = quiz_fragments - 3, move_levels=? WHERE id=? AND quiz_fragments>=3')
    .bind(JSON.stringify(levels), childId).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: 'STATE_CHANGED' }, 409);
  await syncTouch(db, childId, 'children', 'id=?', [childId]);
  const after = benchNo != null
    ? (benchExLine
      ? lineMovesFor({ ...child, move_levels: JSON.stringify(levels) }, benchExLine, level, benchExBranch ? EEVEE_BRANCHES[benchExBranch].type : LINE_TYPE[benchExLine])
      : collectionMovesFor({ ...child, move_levels: JSON.stringify(levels) }, benchNo, level))
    : allMovesFor({ ...child, move_levels: JSON.stringify(levels) }, level, LINE_TYPE[child.line]);
  const nm = after.find((m) => m.name === moveName);
  return json({ ok: true, move: { name: moveName, level: mv.level, skillLevel: newLevel, power: nm ? nm.power : skillPower(mv.level, newLevel), effectKind: nm ? (nm.effectKind || null) : (moveEffectOf(moveName) || null), effectMult: nm ? (nm.effectMult ?? null) : null, effectMiss: nm ? (nm.effectMiss ?? null) : null }, quizFragments: frags - 3 });
}

async function diagBuildView(db, child, today) {
  const { states } = await diagRecompute(db, child, today);
  const gradeNum = gradeNumFromLabel(child.grade_label);
  // 北师大章节（题库 chapter）：家长端显示用；图里的 chapter 是人教版，仅展示备用，不参与门判定
  // 章节映射 / 待处理诊断 / 历史诊断 / 今日科目 / 今日题单 / 今日作答：六个只读查询互不依赖，并行取齐
  const [{ results: chRows }, { results: pendRows }, { results: histRows }, rawSubjects, dailyRow, { results: todayAtts }] = await Promise.all([
    db.prepare(
      "SELECT topic_id, chapter FROM quiz_questions WHERE kind='study' AND subject='数学' AND topic_id IS NOT NULL AND chapter IS NOT NULL GROUP BY topic_id"
    ).bind().all(),
    db.prepare(
      "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status='pending' ORDER BY created_date DESC, id DESC"
    ).bind(child.id).all(),
    db.prepare(
      "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status IN ('done','expired') ORDER BY created_date DESC, id DESC LIMIT 20"
    ).bind(child.id).all(),
    approvedSubjectsToday(db, child.id, today),
    db.prepare('SELECT question_ids FROM quiz_daily WHERE child_id=? AND date_shanghai=?').bind(child.id, today).first(),
    db.prepare(
      'SELECT question_id, correct FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
    ).bind(child.id, today).all(),
  ]);
  const chBsn = new Map((chRows || []).map((r) => [r.topic_id, r.chapter]));
  const topicView = (tid) => {
    const n = DIAG_TOPIC_BY_ID.get(tid);
    const s = states.get(tid);
    return {
      topicId: tid, name: n ? n.name : tid, chapter: chBsn.get(tid) || (n ? n.chapter : ''),
      wrong: s ? s.wrong : 0, total: s ? s.total : 0, lastWrongDate: s ? s.lastWrongDate : null,
    };
  };
  const weak = [...states.entries()].filter(([, s]) => s.state === 'weak')
    .map(([tid]) => topicView(tid))
    .sort((a, b) => b.wrong - a.wrong || String(b.lastWrongDate || '').localeCompare(String(a.lastWrongDate || '')));
  const unstable = [...states.entries()].filter(([, s]) => s.state === 'unstable')
    .map(([tid]) => topicView(tid))
    .sort((a, b) => String(b.lastWrongDate || '').localeCompare(String(a.lastWrongDate || '')));
  // 当日每日问答完成情况（只读 quiz_daily＋attempts，不触发补选）
  const quota = quizDailyTotal(rawSubjects);
  const dailyIds = dailyRow ? safeJsonArr(dailyRow.question_ids).map(Number) : [];
  const answeredToday = new Set((todayAtts || []).map((a) => Number(a.question_id)));
  const dailyDone = dailyIds.length > 0 && dailyIds.every((id) => answeredToday.has(id));
  // 活跃诊断行：最新的一行 pending；复习题单只在每日问答答完后出现
  const row = (pendRows || [])[0] || null;
  let pending = null;
  if (row) {
    const chain = safeJsonArr(row.chain_json);
    const rootId = row.root_topic_id;
    const rootNode = DIAG_TOPIC_BY_ID.get(rootId);
    let note = null;
    if (DIAG_FAIL_CLOSED.has(rootId)) note = 'fail-closed';
    else if (rootId === DIAG_NO_QUESTION_TOPIC) note = 'no-question';
    let reviewIds = safeJsonArr(row.review_question_ids).map(Number);
    let reviewQuestions = [];
    let reviewAnsweredToday = 0, reviewCorrectToday = 0;
    if (dailyDone && !note) {
      // 题单当日有效：行是今天建的且题单非空→沿用；否则（次日或首次）重新选并落库
      if (!(row.created_date === today && reviewIds.length > 0)) {
        const [{ results: allQ }, history, mathGate] = await Promise.all([
          db.prepare('SELECT * FROM quiz_questions').all(),
          quizHistoryForChild(db, child.id),
          loadMathGate(db, child),
        ]);
        const picked = diagPickReview((allQ || []).map(normalizeQuizRow), {
          rootTopicId: rootId,
          excludeIds: new Set(dailyIds),
          answeredIds: answeredToday,
          issuedIds: new Set(reviewIds),
          mathGate, history,
        });
        reviewIds = picked.map((q) => q.id);
        await db.prepare('UPDATE quiz_diagnoses SET review_question_ids=? WHERE id=?')
          .bind(JSON.stringify(reviewIds), row.id).run();
      }
      if (!reviewIds.length) {
        note = 'no-review-questions';
      } else {
        const ph = reviewIds.map(() => '?').join(',');
        const { results: qs } = await db.prepare(`SELECT * FROM quiz_questions WHERE id IN (${ph})`).bind(...reviewIds).all();
        const qmap = new Map((qs || []).map((r) => [Number(r.id), normalizeQuizRow(r)]));
        reviewQuestions = reviewIds.map((id) => qmap.get(id)).filter(Boolean)
          .filter((q) => !answeredToday.has(q.id))
          .map((q) => ({ id: q.id, question: q.question, options: q.options, label: questionLabel(q) }));
        reviewAnsweredToday = reviewIds.filter((id) => answeredToday.has(id)).length;
        reviewCorrectToday = (todayAtts || []).filter((a) => reviewIds.includes(Number(a.question_id)) && a.correct).length;
      }
    }
    pending = {
      id: row.id, status: row.status, createdDate: row.created_date,
      triggerTopicId: row.trigger_topic_id, trigger: topicView(row.trigger_topic_id),
      rootTopicId: rootId,
      root: { topicId: rootId, name: rootNode ? rootNode.name : rootId, chapter: rootNode ? rootNode.chapter : '' },
      chain, note, dailyDone,
      reviewTotal: reviewIds.length, reviewAnswered: reviewAnsweredToday, reviewCorrect: reviewCorrectToday,
      reviewCorrectAll: row.review_correct || 0,
      reviewQuestions,
    };
  }
  return {
    childId: child.id, date: today,
    hasDaily: quota > 0, dailyDone,
    weak, unstable, pending,
    history: (histRows || []).map((r) => {
      const tn = DIAG_TOPIC_BY_ID.get(r.trigger_topic_id);
      const rn = DIAG_TOPIC_BY_ID.get(r.root_topic_id);
      return {
        id: r.id, status: r.status, createdDate: r.created_date, resolvedDate: r.resolved_date,
        triggerTopicId: r.trigger_topic_id, triggerName: tn ? tn.name : r.trigger_topic_id,
        rootTopicId: r.root_topic_id, rootName: rn ? rn.name : r.root_topic_id,
        reviewCorrect: r.review_correct || 0,
      };
    }),
  };
}

async function apiQuizDiagnosis(db, url, session) {
  const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  const view = await diagBuildView(db, child, today);
  return json({ ok: true, ...view });
}

async function apiQuizReview(db, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const childId = sc.id;
  const questionId = Number(body.question_id ?? body.questionId);
  const answerIdx = Number(body.answer_idx ?? body.answerIdx);
  if (!childId || !questionId || ![0, 1, 2, 3].includes(answerIdx)) {
    return json({ ok: false, error: '参数不对' }, 400);
  }
  const child = await getChild(db, childId);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const today = shDateStr();
  // 复习只在当日每日问答全部答完后开放
  const [dailyRow, { results: todayAtts }] = await Promise.all([
    db.prepare('SELECT question_ids FROM quiz_daily WHERE child_id=? AND date_shanghai=?').bind(childId, today).first(),
    db.prepare(
      'SELECT question_id, correct FROM quiz_attempts WHERE child_id=? AND date_shanghai=?'
    ).bind(childId, today).all(),
  ]);
  const dailyIds = dailyRow ? safeJsonArr(dailyRow.question_ids).map(Number) : [];
  const answeredToday = new Set((todayAtts || []).map((a) => Number(a.question_id)));
  const dailyDone = dailyIds.length > 0 && dailyIds.every((id) => answeredToday.has(id));
  if (!dailyDone) return json({ ok: false, error: '先把今天的问答答完再来练一练' }, 400);
  const row = await db.prepare(
    "SELECT * FROM quiz_diagnoses WHERE child_id=? AND status='pending' ORDER BY created_date DESC, id DESC LIMIT 1"
  ).bind(childId).first();
  if (!row) return json({ ok: false, error: '今天没有要练的题' }, 400);
  const reviewIds = safeJsonArr(row.review_question_ids).map(Number);
  if (!reviewIds.includes(questionId)) return json({ ok: false, error: '这道题不在今天的练一练里' }, 400);
  const qrow = await db.prepare('SELECT * FROM quiz_questions WHERE id=?').bind(questionId).first();
  if (!qrow) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const q = normalizeQuizRow(qrow);
  if (!q.active) return json({ ok: false, error: '这道题被家长下架啦' }, 400);
  const correct = answerIdx === q.answer_idx;
  // 复习作答只记历史：经验／碎片记 0，不计 quiz_correct_total，不触发掉球与遭遇（沿用抓捕作答先例）
  /* 任务 124：放行时先删当日旧作答（唯一约束 ux_quiz_attempt）。 */
  if (GATES_OPEN_FULL) {
    await db.prepare('DELETE FROM quiz_attempts WHERE child_id=? AND question_id=? AND date_shanghai=?').bind(childId, questionId, today).run();
  }
  const ins = await db.prepare(
    `INSERT OR IGNORE INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
     VALUES(?,?,?,?,0,0,?)`
  ).bind(childId, questionId, today, correct ? 1 : 0, Math.floor(Date.now() / 1000)).run();
  if (!ins.meta || !ins.meta.changes) return json({ ok: false, error: '这道题今天已经答过啦' }, 400);
  await syncTouch(db, childId, 'quiz_attempts', 'id=?', [Number(ins.meta.last_row_id)]);
  if (correct) {
    await db.prepare('UPDATE quiz_diagnoses SET review_correct=review_correct+1 WHERE id=?').bind(row.id).run();
  }
  if (correct) await syncTouch(db, childId, 'quiz_diagnoses', 'id=?', [row.id]);
  // 答后重算：根因不再薄弱时该行即 done（诊断不阻塞答题主链路，失败只记日志）
  try { await diagRecompute(db, child, today); } catch (e) { console.error('diagRecompute after review failed', e); }
  const [fresh, answeredCount] = await Promise.all([
    db.prepare('SELECT review_correct FROM quiz_diagnoses WHERE id=?').bind(row.id).first(),
    db.prepare(
      'SELECT COUNT(*) n FROM quiz_attempts WHERE child_id=? AND date_shanghai=? AND question_id IN (' + reviewIds.map(() => '?').join(',') + ')'
    ).bind(childId, today, ...reviewIds).first(),
  ]);
  // 2026-11-17：整批答完即置 done（resolved_date=today），即使根因仍薄弱也不跨天重复出同一批。
  if (reviewIds.length > 0 && answeredCount && answeredCount.n >= reviewIds.length) {
    await db.prepare("UPDATE quiz_diagnoses SET status='done', resolved_date=? WHERE id=?").bind(today, row.id).run();
    await syncTouch(db, childId, 'quiz_diagnoses', 'id=?', [row.id]);
  }
  return json({
    ok: true, correct, explain: q.explain, correctIdx: q.answer_idx,
    xpAwarded: 0, fragmentsAwarded: 0,
    reviewCorrect: fresh ? (fresh.review_correct || 0) : (row.review_correct || 0),
    reviewTotal: reviewIds.length,
    reviewAnswered: answeredCount ? answeredCount.n : 0,
  });
}

/* GET /api/quiz/all?child_id= ：全量题库拉取（755 道左右）。鉴权与 /api/quiz/today 同口径
*（scopeChildId + getChild），行经 normalizeQuizRow 归一化后返回。 */
async function apiQuizAll(db, url, session) {
const sc = scopeChildId(session, url.searchParams.get('child_id') || url.searchParams.get('id'));
if (sc.err) return sc.err;
const child = await getChild(db, sc.id);
if (!child) return json({ ok: false, error: 'NOT_FOUND'}, 404);
const { results} = await db.prepare('SELECT * FROM quiz_questions ORDER BY id').all();
return json({ ok: true, childId: child.id, count: (results || []).length, questions: (results || []).map(normalizeQuizRow)});
}

export function register(route) {
  route('/api/quiz/today', { method: '*' }, ({ db, url, session }) => apiQuizToday(db, url, session));
  route('/api/quiz/all', { method: '*' }, ({ db, url, session }) => apiQuizAll(db, url, session));
  route('/api/quiz/answer', { method: 'POST' }, ({ db, req, session }) => apiQuizAnswer(db, req, session));
  route('/api/quiz/diagnosis', { method: '*' }, ({ db, url, session }) => apiQuizDiagnosis(db, url, session));
  route('/api/quiz/review', { method: 'POST' }, ({ db, req, session }) => apiQuizReview(db, req, session));
  route('/api/quiz/upgrade-move', { method: 'POST' }, ({ db, req, session }) => apiQuizUpgradeMove(db, req, session));
}
export { questionLabel, DIAG_REVIEW_COUNT, diagPickReview };
