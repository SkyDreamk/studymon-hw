/* school-test 模块（模块化后端 方案A 第 1 步）：从 src/index.js 机械搬出，逻辑零改动。
 * register(route) 用 src/index.js 的 route() 助手注册本模块的全部路由（path/method/auth 与搬出前完全一致）。 */
import { GATES_OPEN, QUIZ_SUBJECTS, bumpChildVersion, getChild, getFamilyChild, grantOakWheelChance, grantWheelChance, json, notFound404, parsePhotosArg, photoDelete, photoExt, photoPut, readJsonBody, recordTombstone, scopeChildId, shDateStr, syncTouch, touchRow, weekStartMon } from '../lib/shared.js';

/* 高级转盘：每孩每周 ≤3 次、同一科目每周 ≤1 次；试卷照片留存 15 天 */
const WHEEL_WEEK_LIMIT = 3;
const SCHOOL_PHOTO_KEEP_DAYS = 15;

/* -------- 学校成绩与道具奖励（v11 §2.3/§2.4） -------- */

/* -------- 学校成绩与道具奖励（v11 §2.3/§2.4） -------- */

/* 学校成绩提交输入校验（家长直登与孩子上报共用；百分制折算）。
 * 返回 {err} 或 {subject, unit, score, fullScore, examDate, photo}（photo 可能为 null）。 */
function parseSchoolTestInput(body) {
  const subject = String(body.subject || '');
  if (!QUIZ_SUBJECTS.includes(subject)) return { err: '科目只能选 语文/数学/英语/阅读' };
  const unit = String(body.unit || '').trim().slice(0, 40);
  if (!unit) return { err: '单元不能为空' };
  const score = Number(body.score);
  const fullScore = body.fullScore !== undefined && body.fullScore !== null && body.fullScore !== '' ? Number(body.fullScore) : 100;
  if (!Number.isFinite(score) || score < 0 || !Number.isFinite(fullScore) || fullScore <= 0 || score > fullScore) {
    return { err: '分数不对' };
  }
  const examDate = String(body.examDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return { err: '考试日期不对' };
  // 照片（可选，最多 1 张；≥95 想拿高级转盘机会必须传）
  let photo = null;
  if (body.photos !== undefined) {
    const parsed = parsePhotosArg(body.photos);
    if (parsed.err) return { err: parsed.err };
    if (parsed.list && parsed.list.length > 1) return { err: '试卷照片最多 1 张' };
    if (parsed.list && parsed.list.length === 1 && parsed.list[0].bytes) photo = parsed.list[0];
  }
  return { subject, unit, score, fullScore, examDate, photo };
}

/* 写一条学校成绩记录（照片上 R2，key 含记录 id；15 天后到期懒删）。
 * status：家长直登 'active'，孩子上报 'pending'（待家长审核）。 */
async function insertSchoolTestRecord(db, env, child, input, status) {
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  const pct = Math.round((input.score / input.fullScore) * 1000) / 10;
  const ins = await db.prepare(
    `INSERT INTO school_test_records(child_id, subject, unit, score, full_score, pct, exam_date, photo_key, photo_expires_epoch, reward_granted, status, created_epoch, date_shanghai)
     VALUES(?,?,?,?,?,?,?,NULL,NULL,0,?,?,?)`
  ).bind(child.id, input.subject, input.unit, input.score, input.fullScore, pct, input.examDate, status, now, today).run();
  const recordId = ins.meta ? Number(ins.meta.last_row_id) : null;
  if (!recordId) return { err: '保存失败' };
  // 照片上 R2（key 含记录 id；15 天后到期懒删）
  let photoKey = null;
  if (input.photo) {
    try {
      photoKey = `school/${child.id}/${recordId}.${photoExt(input.photo.contentType)}`;
      await photoPut(env, photoKey, input.photo.bytes, input.photo.contentType);
      await db.prepare('UPDATE school_test_records SET photo_key=?, photo_expires_epoch=? WHERE id=?')
        .bind(photoKey, now + SCHOOL_PHOTO_KEEP_DAYS * 86400, recordId).run();
    } catch (e) {
      console.error('school test photo upload failed', e);
      photoKey = null;
    }
  }
  await syncTouch(db, child.id, 'school_test_records', 'id=?', [recordId]);
  return { recordId, photoKey, pct };
}

/* ≥95＋试卷照片：记 1 次高级转盘机会（与家长直登同一口径）。
 * 每孩每周最多 3 次、同一科目每周最多 1 次；科目名额原子占位、总量条件记账。 */
async function maybeGrantWheelChance(db, childId, recordId, subject, pct, photoKey, today, now) {
  let wheelChance = false, wheelReason = null;
  if (GATES_OPEN && pct >= 95) {
    const ins = await db.prepare(
      'INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai) VALUES(?,?,?,?,?)'
    ).bind(childId, recordId, weekStartMon(today), now, today).run();
    if (ins.meta && ins.meta.changes) {
      const v = await bumpChildVersion(db, childId);
      await touchRow(db, 'wheel_chances', 'id=?', [Number(ins.meta.last_row_id)], v);
      wheelChance = true;
    }
    return { wheelChance, wheelReason };
  }
  if (pct >= 95 && photoKey) {
    const ws = weekStartMon(today);
    // 科目名额原子占位（count<1 才 +1；已占则 0 行）
    const claim = await db.prepare(
      `INSERT INTO wheel_week_quotas(child_id, week_start, subject, count) VALUES(?,?,?,1)
       ON CONFLICT(child_id, week_start, subject) DO UPDATE SET count=count+1 WHERE count<1`
    ).bind(childId, ws, subject).run();
    if (!claim.meta || !claim.meta.changes) {
      wheelReason = '这门科目本周已经有过一次高级转盘机会啦';
    } else {
      // 总量条件记账（每周最多 3 次；满了把科目名额还回去）
      const chIns = await db.prepare(
        `INSERT INTO wheel_chances(child_id, school_test_id, week_start, created_epoch, date_shanghai)
         SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM wheel_chances WHERE child_id=? AND week_start=?) < ?`
      ).bind(childId, recordId, ws, now, today, childId, ws, WHEEL_WEEK_LIMIT).run();
      if (!chIns.meta || !chIns.meta.changes) {
        await db.prepare('UPDATE wheel_week_quotas SET count=count-1 WHERE child_id=? AND week_start=? AND subject=? AND count>0')
          .bind(childId, ws, subject).run();
        wheelReason = '本周的高级转盘机会已经用完啦（每周最多 3 次）';
      } else {
        wheelChance = true;
        if (chIns.meta) {
          const v = await bumpChildVersion(db, childId);
          await touchRow(db, 'wheel_chances', 'id=?', [Number(chIns.meta.last_row_id)], v);
        }
      }
    }
  } else if (pct >= 95 && !photoKey) {
    wheelReason = '上传试卷照片后可获得 1 次高级转盘机会';
  }
  return { wheelChance, wheelReason };
}
/* -------- 稀有转盘（2026-11-07 新建）：机会发放 --------
 * 机会表 rare_wheel_chances（迁移 0026）：不进 sync 注册表——转盘须联网，离线端不用。
 * 发放一律 INSERT OR IGNORE（UNIQUE(child_id, source, ref_id) 防重），返回是否新发。 */
async function grantRareWheelChance(db, childId, source, refId, today, now) {
  return grantWheelChance(db, 'rare_wheel_chances', 'rare', childId, source, refId, today, now);
}
/* 稀有转盘唯一途径（2026-11-14 用户令：只有期末考试成绩上传一个渠道；出题发机会已删）：期末考试成绩优秀。条件：unit 含“期末”且 pct >= 95（95 分沿用高级转盘“优秀”口径；
 * 不要求照片——任务表未提照片要求；无周上限）。满足则 INSERT OR IGNORE 记 1 次。 */
async function maybeGrantRareWheelChance(db, childId, recordId, unit, pct, today, now) {
  if (!String(unit || '').includes('期末') || !(Number(pct) >= 95)) return false;
  return grantRareWheelChance(db, childId, 'final-exam', recordId, today, now);
}

/* 家长保存一条学校考试成绩（百分制折算；≥85 审核/保存后自动发 1 次普通转盘机会、≥95＋试卷照片记 1 次高级转盘机会）。 */
async function apiParentSchoolTestSave(db, env, req) {
  const body = await readJsonBody(req);
  const child = await getChild(db, Number(body.childId));
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const input = parseSchoolTestInput(body);
  if (input.err) return json({ ok: false, error: input.err }, 400);
  const ins = await insertSchoolTestRecord(db, env, child, input, 'active');
  if (ins.err) return json({ ok: false, error: ins.err }, 500);
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  const { wheelChance, wheelReason } = await maybeGrantWheelChance(db, child.id, ins.recordId, input.subject, ins.pct, ins.photoKey, today, now);
  // 稀有转盘途径二（2026-11-07）：家长直登的期末 95+ 成绩发 1 次稀有机会（不要求照片、无周上限）
  await maybeGrantRareWheelChance(db, child.id, ins.recordId, input.unit, ins.pct, today, now);
  // 家长录入的已激活成绩同样自动发放普通奖励。
  const ordinary = ins.pct >= 85
    ? await grantSchoolTestOrdinary(db, { id: ins.recordId, child_id: child.id, status: 'active', pct: ins.pct, reward_granted: 0 }, today)
    : null;
  return json({ ok: true, record: { id: ins.recordId, childId: child.id, subject: input.subject, unit: input.unit, score: input.score, fullScore: input.fullScore, pct: ins.pct, examDate: input.examDate, photoKey: ins.photoKey, rewardGranted: ordinary?.ok === true }, wheelChance, wheelReason, ordinary: ordinary ? (ordinary.ok ? { granted: ordinary.granted } : { error: ordinary.error }) : null });
}

/* 孩子上报一条学校考试成绩（2026-10-27：入口从家长端横幅移到孩子端）。
 * 只写 status='pending' 的记录，不发高级转盘机会、不发奖励——等家长在审核 tab 通过后，
 * 再按同一口径记高级转盘机会（≥95＋照片），85 分以上自动发普通奖励。 */
async function apiChildSchoolTestSubmit(db, env, req, session) {
  const body = await readJsonBody(req);
  const sc = scopeChildId(session, body.child_id ?? body.childId);
  if (sc.err) return sc.err;
  const child = await getChild(db, sc.id);
  if (!child) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const input = parseSchoolTestInput(body);
  if (input.err) return json({ ok: false, error: input.err }, 400);
  const ins = await insertSchoolTestRecord(db, env, child, input, 'pending');
  if (ins.err) return json({ ok: false, error: ins.err }, 500);
  return json({ ok: true, record: { id: ins.recordId, childId: child.id, subject: input.subject, unit: input.unit, score: input.score, fullScore: input.fullScore, pct: ins.pct, examDate: input.examDate, photoKey: ins.photoKey, status: 'pending' } });
}

/* 孩子查自己上报的学校成绩（状态：pending 待审核／active 已通过／rejected 已驳回／void 已作废）。 */
async function apiChildSchoolTests(db, req, session) {
  const url = new URL(req.url);
  const sc = scopeChildId(session, url.searchParams.get('childId'));
  if (sc.err) return sc.err;
  const { results } = await db.prepare(
    'SELECT * FROM school_test_records WHERE child_id=? ORDER BY id DESC LIMIT 20'
  ).bind(sc.id).all();
  const out = [];
  // 每条成绩对应的转盘机会互不依赖：一次并行取（只读），再按原顺序拼装
  const chances = await Promise.all(results.map((r) => db.prepare('SELECT id, used_epoch FROM wheel_chances WHERE school_test_id=?').bind(r.id).first()));
  for (const [ri, r] of results.entries()) {
    const ch = chances[ri];
    out.push({
      id: r.id, subject: r.subject, unit: r.unit, score: r.score, fullScore: r.full_score, pct: r.pct,
      examDate: r.exam_date, hasPhoto: !!r.photo_key, status: r.status,
      rewardGranted: !!r.reward_granted, rewardItemKey: r.reward_item_key || null,
      wheelChance: !ch ? 'none' : (ch.used_epoch ? 'spun' : 'pending'),
    });
  }
  return json({ ok: true, records: out });
}

/* 家长审核孩子上报的学校成绩（审核 tab；与打卡审核同一入口感）。
 * 通过：status pending→active（CAS，防重复审核），再按同一口径记高级转盘机会；
 * 85 分以上审核通过后自动发 1 次普通转盘机会，不再走手动发放。
 * 驳回：status pending→rejected；pending 记录从未记过高级转盘机会，无需清理。 */
async function apiParentSchoolTestReview(db, req, session) {
  const body = await readJsonBody(req);
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(Number(body.recordId)).first();
  if (!rec || !(await getFamilyChild(db, session && session.familyId, rec.child_id))) return notFound404();
  if (rec.status !== 'pending') return json({ ok: false, error: '这条成绩已经审核过了' }, 400);
  const decision = body.decision;
  if (decision === 'reject') {
    const upd = await db.prepare("UPDATE school_test_records SET status='rejected' WHERE id=? AND status='pending'").bind(rec.id).run();
    if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: '这条成绩已经审核过了' }, 400);
    await syncTouch(db, rec.child_id, 'school_test_records', 'id=?', [rec.id]);
    return json({ ok: true, rejected: true });
  }
  if (decision !== 'approve') return json({ ok: false, error: '参数不对' }, 400);
  const upd = await db.prepare("UPDATE school_test_records SET status='active' WHERE id=? AND status='pending'").bind(rec.id).run();
  if (!upd.meta || !upd.meta.changes) return json({ ok: false, error: '这条成绩已经审核过了' }, 400);
  await syncTouch(db, rec.child_id, 'school_test_records', 'id=?', [rec.id]);
  const today = shDateStr();
  const now = Math.floor(Date.now() / 1000);
  const photoOk = rec.photo_key && (!rec.photo_expires_epoch || rec.photo_expires_epoch >= now) ? rec.photo_key : null;
  const { wheelChance, wheelReason } = await maybeGrantWheelChance(db, rec.child_id, rec.id, rec.subject, rec.pct, photoOk, today, now);
  // 稀有转盘途径二（2026-11-07）：审核通过的期末 95+ 成绩发 1 次稀有机会（不要求照片、无周上限）
  await maybeGrantRareWheelChance(db, rec.child_id, rec.id, rec.unit, rec.pct, today, now);
  // 85 分以上审核通过后自动发放普通奖励；不影响已激活状态和高级转盘机会。
  const ordinary = rec.pct >= 85
    ? await grantSchoolTestOrdinary(db, { ...rec, status: 'active' }, today)
    : null;
  return json({ ok: true, approved: true, wheelChance, wheelReason, ordinary: ordinary ? (ordinary.ok ? { granted: ordinary.granted } : { error: ordinary.error }) : null, record: { id: rec.id, childId: rec.child_id, subject: rec.subject, unit: rec.unit, score: rec.score, fullScore: rec.full_score, pct: rec.pct, examDate: rec.exam_date, rewardGranted: ordinary?.ok === true } });
}

/* 家长查学校成绩列表（附高级转盘机会状态；照片 15 天到期懒删，只留文字档案） */
async function apiParentSchoolTests(db, env, req, session) {
  const url = new URL(req.url);
  const childId = Number(url.searchParams.get('childId')) || null;
  const fam = session && session.familyId;
  const { results } = await db.prepare(
    childId
      ? 'SELECT * FROM school_test_records WHERE child_id=? ORDER BY exam_date DESC, id DESC LIMIT 100'
      : (fam
        ? 'SELECT * FROM school_test_records WHERE child_id IN (SELECT id FROM children WHERE family_id=?) ORDER BY exam_date DESC, id DESC LIMIT 100'
        : 'SELECT * FROM school_test_records ORDER BY exam_date DESC, id DESC LIMIT 100')
  ).bind(...(childId ? [childId] : (fam ? [fam] : []))).all();
  const now = Math.floor(Date.now() / 1000);
  const out = [];
  // 转盘机会读取与同循环里的照片过期清理（写）互不相干（读 wheel_chances，写 school_test_records）：读先并行取齐，写仍逐条串行
  const chances = await Promise.all(results.map((r) => db.prepare('SELECT id, used_epoch FROM wheel_chances WHERE school_test_id=?').bind(r.id).first()));
  for (const [ri, r] of results.entries()) {
    let photoKey = r.photo_key;
    let photoExpired = false;
    if (photoKey && r.photo_expires_epoch && r.photo_expires_epoch < now) {
      await photoDelete(env, photoKey);
      await db.prepare('UPDATE school_test_records SET photo_key=NULL, photo_expires_epoch=NULL WHERE id=?').bind(r.id).run();
      photoKey = null; photoExpired = true;
    }
    const ch = chances[ri];
    out.push({
      id: r.id, childId: r.child_id, subject: r.subject, unit: r.unit,
      score: r.score, fullScore: r.full_score, pct: r.pct, examDate: r.exam_date,
      photoKey, photoExpired, photoExpiresEpoch: r.photo_expires_epoch,
      rewardGranted: !!r.reward_granted, rewardItemKey: r.reward_item_key || null,
      status: r.status, wheelChance: !ch ? 'none' : (ch.used_epoch ? 'spun' : 'pending'),
      createdAt: r.created_epoch,
    });
  }
  return json({ ok: true, childId, records: out });
}

/* 家长按学校成绩发放奖励（v11 §2.3）：≥85、每条记录最多一次、固定数量 1；
 * 大师球禁发（仅兑换获得）、梦幻蛋禁发；蛋走去重、球走球列、其余走背包。 */
/* 普通奖励先 CAS 占位再落账；落账失败不撤销占位，交由调用方返回 500（与高级转盘先占位后发奖同口径）。 */
/* 85 分以上普通奖励（2026-11-21 用户定）：不再随机发球／经验／回血药，改为 1 次普通转盘机会
 *（Oak 盘，奖池里有经验等）。reward_granted 仍作防重 CAS，reward_item_key 记 'wheel:oak' 供日志页显示；
 *先记 Oak 轮次（ref_id 按记录唯一，INSERT OR IGNORE 防重），再 CAS 占位，失败可重试补发。 */
async function grantSchoolTestOrdinary(db, rec, today) {
  if (rec.status !== 'active') return { ok: false, error: rec.status === 'pending' ? '这条成绩还在等审核，通过后才能发放奖励哦' : rec.status === 'rejected' ? '这条成绩已被驳回，不能发放奖励哦' : '这条成绩已经作废啦' };
  if ((rec.pct ?? 0) < 85) return { ok: false, error: '要 85 分以上才能发放奖励哦' };
  if (rec.reward_granted) return { ok: false, error: 'ALREADY_REWARDED' };
  const now = Math.floor(Date.now() / 1000);
  const childId = rec.child_id;
  await grantOakWheelChance(db, childId, 'oak', 'school-test-' + rec.id, today, now);
  const claim = await db.prepare("UPDATE school_test_records SET reward_granted=1, reward_item_key=?, reward_granted_epoch=? WHERE id=? AND reward_granted=0")
    .bind('wheel:oak', now, rec.id).run();
  if (!claim.meta || !claim.meta.changes) return { ok: false, error: 'ALREADY_REWARDED' };
  await syncTouch(db, childId, 'school_test_records', 'id=?', [rec.id]);
  return { ok: true, granted: { kind: 'wheel', key: 'wheel:oak', name: '普通转盘机会 1 次' } };
}

/* 家长按学校成绩补发普通奖励（自动发 1 次普通转盘机会，不再手动选道具）：已激活且 reward_granted=0 的记录可补发一次；
 * 正式站推送时大宝 100 分记录（高级转盘已抽、reward_granted=0）即走此入口补发。 */
async function apiParentSchoolTestGrant(db, req, session) {
  const body = await readJsonBody(req);
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(Number(body.recordId)).first();
  if (!rec || !(await getFamilyChild(db, session && session.familyId, rec.child_id))) return notFound404();
  if (rec.status !== 'active') return json({ ok: false, error: rec.status === 'pending' ? '这条成绩还在等审核，通过后才能发放奖励哦' : rec.status === 'rejected' ? '这条成绩已被驳回，不能发放奖励哦' : '这条成绩已经作废啦' }, 400);
  if ((rec.pct ?? 0) < 85) return json({ ok: false, error: '要 85 分以上才能发放奖励哦' }, 400);
  if (rec.reward_granted) return json({ ok: false, error: 'ALREADY_REWARDED' }, 409);
  const today = shDateStr();
  const ordinary = await grantSchoolTestOrdinary(db, rec, today);
  if (!ordinary.ok) return json({ ok: false, error: ordinary.error }, ordinary.error === 'ALREADY_REWARDED' ? 409 : 400);
  return json({ ok: true, granted: ordinary.granted, recordId: rec.id });
}

/* 家长作废一条学校成绩：未转机会随记录作废同步取消（2026-10-26 用户定）；已发奖／已转过的不让作废 */
async function apiParentSchoolTestVoid(db, env, req, session) {
  const body = await readJsonBody(req);
  const rec = await db.prepare('SELECT * FROM school_test_records WHERE id=?').bind(Number(body.recordId)).first();
  if (!rec || !(await getFamilyChild(db, session && session.familyId, rec.child_id))) return notFound404();
  if (rec.status !== 'active') return json({ ok: false, error: '这条成绩已经作废啦' }, 400);
  if (rec.reward_granted) return json({ ok: false, error: '已经发放过奖励的成绩不能作废哦' }, 400);
  const ch = await db.prepare('SELECT id, week_start, used_epoch FROM wheel_chances WHERE school_test_id=?').bind(rec.id).first();
  if (ch && ch.used_epoch) return json({ ok: false, error: '高级转盘机会已经用过啦，不能作废哦' }, 400);
  await db.prepare("UPDATE school_test_records SET status='void' WHERE id=? AND status='active'").bind(rec.id).run();
  await syncTouch(db, rec.child_id, 'school_test_records', 'id=?', [rec.id]);
  if (rec.photo_key) await photoDelete(env, rec.photo_key);
  if (ch) {
    await db.prepare('DELETE FROM wheel_chances WHERE id=? AND used_epoch IS NULL').bind(ch.id).run();
    {
      const v = await bumpChildVersion(db, rec.child_id);
      await recordTombstone(db, rec.child_id, 'wheel_chances', ch.id, v);
    }
    await db.prepare('UPDATE wheel_week_quotas SET count=count-1 WHERE child_id=? AND week_start=? AND subject=? AND count>0')
      .bind(rec.child_id, ch.week_start, rec.subject).run();
  }
  return json({ ok: true, voided: true });
}

export function register(route) {
  route('/api/parent/school-test/save', { method: 'POST', auth: 'pin' }, ({ db, env, req }) => apiParentSchoolTestSave(db, env, req));
  route('/api/parent/school-tests', { method: '*', auth: 'pin' }, ({ db, env, req, session }) => apiParentSchoolTests(db, env, req, session));
  route('/api/parent/school-test/grant', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiParentSchoolTestGrant(db, req, session));
  route('/api/parent/school-test/void', { method: 'POST', auth: 'pin' }, ({ db, env, req, session }) => apiParentSchoolTestVoid(db, env, req, session));
  route('/api/parent/school-test/review', { method: 'POST', auth: 'pin' }, ({ db, req, session }) => apiParentSchoolTestReview(db, req, session));
  route('/api/child/school-test/submit', { method: 'POST' }, ({ db, env, req, session }) => apiChildSchoolTestSubmit(db, env, req, session));
  route('/api/child/school-tests', { method: '*' }, ({ db, req, session }) => apiChildSchoolTests(db, req, session));
}
export { WHEEL_WEEK_LIMIT, SCHOOL_PHOTO_KEEP_DAYS };
