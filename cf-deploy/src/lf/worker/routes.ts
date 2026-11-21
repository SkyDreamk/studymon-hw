// Route handlers for the learning features. Shapes are listed in docs/API.md.
import {
  addDays, cardsFromCheckin, GYMS, isDay, isEarly, isFeel, isKind, isResult, isValidReward, journey, localDay,
  nextDue, preview, RETELL_PROMPTS, streak, SUBJECTS, validateSettingsPatch, weeklyReport, weekStrip, xpForApproval,
  type FamilySettings, type Gym, type Subject,
} from "../logic/index.ts";
import { ApiError, json, num, readJson, str } from "./http.ts";
import { handleMedia, handleUpload, ownUpload, type MediaLimits, type UploadKind } from "./media.ts";
import {
  addStatsStmt, checkinDays, childPublic, loadSettings, loadStats, parseJson, planFromTable, saveSettingsPatch,
  type CardDbRow, type CheckinDbRow,
} from "./store.ts";
import type { CareInventory, ChildDirectory, ChildInfo, D1Database, ExecutionContext, ExistingPet, LfHooks, LfSession, R2Bucket } from "./types.ts";

export interface Ctx {
  req: Request; url: URL; env: unknown; exec: ExecutionContext;
  db: D1Database; bucket: R2Bucket; session: LfSession; settings: FamilySettings;
  children: ChildDirectory; hooks: LfHooks; limits: MediaLimits;
  subjects: Subject[]; gyms: Gym[]; prompts: Record<string, { en: string; zh: string }>;
  now: Date; today: string; mediaUrl: (id: string | null) => string | null;
  planForGrade?: (familyId: string, grade: number, env: unknown) => Promise<string[] | null>;
  legacyCheckinDays?: (familyId: string, childId: string, sinceDay: string, env: unknown) => Promise<string[]>;
  /** v2.1 care play and storage */
  careInventory: CareInventory;
  builtInInventory: boolean;
  existingPets?: (familyId: string, childId: string, env: unknown) => Promise<ExistingPet[]>;
}

type Handler = (c: Ctx, ...groups: string[]) => Promise<Response>;
export interface Route { method: string[]; pattern: RegExp; parent: boolean; fn: Handler }

const HISTORY_DAYS = 400; // how far back streaks and gyms look

async function childOr404(c: Ctx, childId: string): Promise<ChildInfo> {
  const child = await c.children.get(c.session.familyId, childId, c.env);
  if (!child) throw new ApiError(404, "no such child");
  return child;
}

async function planSubjects(c: Ctx, grade: number): Promise<string[]> {
  const fromHook = c.planForGrade ? await c.planForGrade(c.session.familyId, grade, c.env) : null;
  const list = fromHook || (await planFromTable(c.db, c.session.familyId, grade)) || c.subjects.map(s => s.id);
  const known = new Set(c.subjects.map(s => s.id));
  return list.filter(s => known.has(s));
}

async function daysFor(c: Ctx, childId: string, statuses: string[]): Promise<Set<string>> {
  const since = addDays(c.today, -HISTORY_DAYS);
  const days = new Set(await checkinDays(c.db, childId, since, statuses));
  if (c.legacyCheckinDays) for (const d of await c.legacyCheckinDays(c.session.familyId, childId, since, c.env)) days.add(d);
  return days;
}

async function journeyFor(c: Ctx, childId: string) {
  const approved = await daysFor(c, childId, ["ok"]);
  const j = journey(approved.size, c.gyms.length, c.settings.days_per_gym);
  return { ...j, gyms: c.gyms.map((g, i) => ({ ...g, cleared: i < j.cleared, current: i === j.cleared })) };
}

function runHookLater(c: Ctx, p: () => Promise<void>) {
  c.exec.waitUntil(p().catch(e => console.error("learning-features hook failed", e)));
}

// ------------------------------------------------------------------ child screens

const config: Handler = async c => json({
  subjects: c.subjects, gyms: c.gyms, retell_prompts: c.prompts, today: c.today,
  settings: pick(c.settings, ["timezone", "early_bonus", "early_cutoff", "early_multiplier", "shield_days", "weekly_goal",
    "retell_required", "review_deck", "review_intervals", "parent_voice_notes", "max_retell_secs", "parent_lang"]),
  limits: c.limits, parent: c.session.parentUnlocked,
});

const listChildren: Handler = async c => {
  const kids = await c.children.list(c.session.familyId, c.env);
  const out = [];
  for (const k of kids) out.push(childPublic(k, await loadStats(c.db, k.id), c.settings));
  return json({ children: out });
};

const today: Handler = async (c, cid) => {
  const child = await childOr404(c, cid);
  const s = c.settings;
  const todays = (await c.db.prepare("SELECT * FROM lf_checkins WHERE child_id=? AND day=? ORDER BY id").bind(child.id, c.today).all<CheckinDbRow>()).results;
  const latest = new Map<string, CheckinDbRow>();
  for (const r of todays) latest.set(r.subject, r);
  const quests = (await planSubjects(c, child.grade ?? 1)).map(id => {
    const subj = c.subjects.find(x => x.id === id)!;
    const ck = latest.get(id);
    const back = ck?.status === "back";
    return { ...subj, subject: id, status: ck ? ck.status : "todo", checkin_id: ck?.id ?? null,
      note: back ? ck!.note : "", parent_audio: back ? c.mediaUrl(ck!.parent_audio_id) : null };
  });
  const days = await daysFor(c, child.id, ["wait", "ok"]);
  const due = s.review_deck
    ? ((await c.db.prepare("SELECT COUNT(*) n FROM lf_cards WHERE child_id=? AND active=1 AND due<=?").bind(child.id, c.today).first<{ n: number }>())?.n ?? 0)
    : 0;
  const notes = (await c.db.prepare(
    "SELECT id, subject, note, parent_audio_id, reward, xp, reviewed_at FROM lf_checkins WHERE child_id=? AND status='ok'" +
    " AND (note<>'' OR parent_audio_id IS NOT NULL OR reward IS NOT NULL) ORDER BY reviewed_at DESC LIMIT 3",
  ).bind(child.id).all<Record<string, unknown>>()).results.map(n => ({ ...n, parent_audio: c.mediaUrl(n.parent_audio_id as string | null), parent_audio_id: undefined }));
  return json({
    child: childPublic(child, await loadStats(c.db, child.id), s), day: c.today, quests,
    week: weekStrip(days, c.today, s.shield_days), streak: streak(days, c.today, s.shield_days),
    deck_due: Math.min(due, s.daily_deck_limit), journey: await journeyFor(c, child.id),
    early_now: isEarly(s, c.now, s.timezone), messages: notes,
  });
};

const submitCheckin: Handler = async (c, cid) => {
  const child = await childOr404(c, cid);
  const s = c.settings;
  const b = await readJson(c.req);
  const subject = str(b.subject, 20);
  if (!c.subjects.some(x => x.id === subject)) throw new ApiError(400, "unknown subject");
  const feel = b.feel == null || b.feel === "" ? null : b.feel;
  if (feel !== null && !isFeel(feel)) throw new ApiError(400, "feel must be easy, okay or hard");
  const learned = str(b.learned, 300).trim();
  const photo = await ownUpload(c.db, c.session.familyId, b.photo, "photo");
  const audio = await ownUpload(c.db, c.session.familyId, b.audio, "audio");
  if (s.retell_required && !audio) throw new ApiError(400, "a spoken retell is required");
  const prev = await c.db.prepare("SELECT status FROM lf_checkins WHERE child_id=? AND day=? AND subject=? ORDER BY id DESC LIMIT 1")
    .bind(child.id, c.today, subject).first<{ status: string }>();
  if (prev && prev.status !== "back") throw new ApiError(409, "already checked in for this subject today");
  const early = isEarly(s, c.now, s.timezone);
  const ins = await c.db.prepare(
    "INSERT INTO lf_checkins(family_id, child_id, day, subject, status, feel, learned, photo_id, audio_id, audio_secs, early, legacy_checkin_id, submitted_at)" +
    " VALUES(?,?,?,?, 'wait', ?,?,?,?,?,?,?,?)",
  ).bind(c.session.familyId, child.id, c.today, subject, feel, learned, photo?.id ?? null, audio?.id ?? null, audio?.secs ?? 0,
    early ? 1 : 0, b.legacy_checkin_id == null ? null : str(String(b.legacy_checkin_id), 64), c.now.toISOString()).run();
  const id = Number(ins.meta.last_row_id);
  if (s.review_deck) {
    const drafts = cardsFromCheckin({ subject, feel, learned, day: c.today, firstInterval: s.review_intervals[0], subjects: c.subjects, prompts: c.prompts });
    await c.db.batch(drafts.map(d => c.db.prepare(
      "INSERT INTO lf_cards(family_id, child_id, kind, prompt_en, prompt_zh, source, subject, checkin_id, due, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    ).bind(c.session.familyId, child.id, d.kind, d.prompt_en, d.prompt_zh, d.source, d.subject, id, d.due, c.now.toISOString())));
  }
  const hook = c.hooks.speechFeedback;
  if (audio && hook) {
    const lang = child.lang ?? "zh";
    const prompt = (c.prompts[subject] || { en: "", zh: "" })[lang];
    runHookLater(c, async () => {
      const fb = await hook({ bucket: c.bucket, key: audio.r2_key, mime: audio.mime, prompt, lang, kind: "checkin", env: c.env });
      if (fb) await c.db.prepare("UPDATE lf_checkins SET ai_feedback_json=? WHERE id=?").bind(JSON.stringify(fb), id).run();
    });
  }
  return json({ id, early, pending_xp: xpForApproval(s, early), ai_pending: !!(audio && hook) }, 201);
};

const deck: Handler = async (c, cid) => {
  const child = await childOr404(c, cid);
  if (!c.settings.review_deck) return json({ cards: [] });
  const rows = (await c.db.prepare("SELECT * FROM lf_cards WHERE child_id=? AND active=1 AND due<=? ORDER BY due, id LIMIT ?")
    .bind(child.id, c.today, c.settings.daily_deck_limit).all<CardDbRow>()).results;
  return json({ cards: rows.map(r => ({
    id: r.id, kind: r.kind, prompt_en: r.prompt_en, prompt_zh: r.prompt_zh, source: r.source, subject: r.subject,
    step: r.step, due: r.due, next: preview(r.step, c.settings.review_intervals),
  })) });
};

const reviewCard: Handler = async (c, cardId) => {
  const card = await c.db.prepare("SELECT * FROM lf_cards WHERE id=? AND family_id=?").bind(Number(cardId), c.session.familyId).first<CardDbRow>();
  if (!card || !card.active) throw new ApiError(404, "no such card");
  const b = await readJson(c.req);
  if (!isResult(b.result)) throw new ApiError(400, "result must be again, good or easy");
  const audio = await ownUpload(c.db, c.session.familyId, b.audio, "audio");
  const n = nextDue(c.today, card.step, b.result, c.settings.review_intervals);
  const [, ins] = await c.db.batch([
    c.db.prepare("UPDATE lf_cards SET step=?, due=? WHERE id=?").bind(n.step, n.due, card.id),
    c.db.prepare("INSERT INTO lf_reviews(family_id, card_id, child_id, day, result, audio_id, audio_secs, created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(c.session.familyId, card.id, card.child_id, c.today, b.result, audio?.id ?? null, audio?.secs ?? 0, c.now.toISOString()),
    addStatsStmt(c.db, c.session.familyId, card.child_id, 0, c.settings.friendship_per_card, c.now),
    // v2.1: the main pet gains the same friendship, never above friendship_max
    c.db.prepare("UPDATE lf_pets SET friendship = MIN(?, friendship + ?), updated_at=? WHERE child_id=? AND family_id=? AND is_main=1")
      .bind(c.settings.friendship_max, c.settings.friendship_per_card, c.now.toISOString(), card.child_id, c.session.familyId),
  ]);
  const hook = c.hooks.speechFeedback;
  if (audio && hook) {
    const child = await c.children.get(c.session.familyId, card.child_id, c.env);
    const lang = child?.lang ?? "zh";
    const reviewId = Number(ins.meta.last_row_id);
    runHookLater(c, async () => {
      const fb = await hook({ bucket: c.bucket, key: audio.r2_key, mime: audio.mime, prompt: lang === "zh" ? card.prompt_zh : card.prompt_en, lang, kind: card.kind, env: c.env });
      if (fb) await c.db.prepare("UPDATE lf_reviews SET ai_feedback_json=? WHERE id=?").bind(JSON.stringify(fb), reviewId).run();
    });
  }
  return json({ due: n.due, in_days: n.days, step: n.step, ai_pending: !!(audio && hook) });
};

const childJourney: Handler = async (c, cid) => {
  const child = await childOr404(c, cid);
  const backpack = (await c.db.prepare("SELECT item, COUNT(*) n FROM lf_rewards WHERE child_id=? GROUP BY item ORDER BY item").bind(child.id).all()).results;
  return json({ child: childPublic(child, await loadStats(c.db, child.id), c.settings), journey: await journeyFor(c, child.id), backpack });
};

const upload: Handler = async (c, kind) =>
  handleUpload(c.req, c.db, c.bucket, c.session.familyId, kind as UploadKind, c.limits, id => c.mediaUrl(id)!, c.now);

const media: Handler = async (c, id) => handleMedia(c.req, c.db, c.bucket, c.session.familyId, id);

// ------------------------------------------------------------------ parent area (parent gate must be unlocked)

function checkinOut(c: Ctx, r: CheckinDbRow & { child_name?: string }) {
  return {
    id: r.id, child_id: r.child_id, child_name: r.child_name, day: r.day, subject: r.subject, status: r.status,
    feel: r.feel, learned: r.learned, early: !!r.early, audio_secs: r.audio_secs, submitted_at: r.submitted_at,
    photo_url: c.mediaUrl(r.photo_id), audio_url: c.mediaUrl(r.audio_id),
    ai_feedback: parseJson(r.ai_feedback_json), pending_xp: xpForApproval(c.settings, !!r.early),
  };
}

const queue: Handler = async c => {
  const rows = (await c.db.prepare("SELECT * FROM lf_checkins WHERE family_id=? AND status='wait' ORDER BY submitted_at DESC LIMIT 200")
    .bind(c.session.familyId).all<CheckinDbRow>()).results;
  const names = new Map((await c.children.list(c.session.familyId, c.env)).map(k => [k.id, k.name]));
  return json({
    items: rows.map(r => checkinOut(c, { ...r, child_name: names.get(r.child_id) ?? "" })),
    rewards: c.settings.rewards, feedback_chips: c.settings.feedback_chips,
  });
};

async function approve(c: Ctx, ck: CheckinDbRow, reward: string | null, feedback: string[], note: string, parentAudio: string | null) {
  const xp = xpForApproval(c.settings, !!ck.early);
  const t = c.now.toISOString();
  const upd = await c.db.prepare(
    "UPDATE lf_checkins SET status='ok', reviewed_at=?, xp=?, reward=?, feedback_json=?, note=?, parent_audio_id=? WHERE id=? AND status='wait'",
  ).bind(t, xp, reward, JSON.stringify(feedback), note, parentAudio, ck.id).run();
  if (!upd.meta.changes) throw new ApiError(409, "this check-in is not waiting for review");
  const stmts = [addStatsStmt(c.db, c.session.familyId, ck.child_id, xp, 0, c.now)];
  if (reward) stmts.push(c.db.prepare("INSERT INTO lf_rewards(family_id, child_id, item, checkin_id, created_at) VALUES(?,?,?,?,?)").bind(c.session.familyId, ck.child_id, reward, ck.id, t));
  await c.db.batch(stmts);
  const hook = c.hooks.onApproved;
  if (hook) {
    const child = await c.children.get(c.session.familyId, ck.child_id, c.env);
    if (child) runHookLater(c, () => hook({ familyId: c.session.familyId, child, checkinId: ck.id, xp, reward, env: c.env }));
  }
  return xp;
}

const parentReview: Handler = async (c, ckId) => {
  const ck = await c.db.prepare("SELECT * FROM lf_checkins WHERE id=? AND family_id=?").bind(Number(ckId), c.session.familyId).first<CheckinDbRow>();
  if (!ck) throw new ApiError(404, "no such check-in");
  if (ck.status !== "wait") throw new ApiError(409, "this check-in is not waiting for review");
  const b = await readJson(c.req);
  const feedback = Array.isArray(b.feedback) ? b.feedback.slice(0, 8).map(x => str(x, 60)).filter(Boolean) : [];
  const note = str(b.note, 300);
  const pa = await ownUpload(c.db, c.session.familyId, b.parent_audio, "audio");
  if (pa && !c.settings.parent_voice_notes) throw new ApiError(400, "voice notes are turned off");
  if (b.action === "approve") {
    const reward = b.reward ? str(b.reward, 60) : null;
    if (!isValidReward(c.settings, reward)) throw new ApiError(400, "unknown reward");
    const xp = await approve(c, ck, reward, feedback, note, pa?.id ?? null);
    return json({ status: "ok", xp, reward });
  }
  if (b.action === "back") {
    const upd = await c.db.prepare("UPDATE lf_checkins SET status='back', reviewed_at=?, feedback_json=?, note=?, parent_audio_id=? WHERE id=? AND status='wait'")
      .bind(c.now.toISOString(), JSON.stringify(feedback), note, pa?.id ?? null, ck.id).run();
    if (!upd.meta.changes) throw new ApiError(409, "this check-in is not waiting for review");
    await c.db.prepare("UPDATE lf_cards SET active=0 WHERE checkin_id=?").bind(ck.id).run();
    return json({ status: "back" });
  }
  throw new ApiError(400, "action must be approve or back");
};

const approveAll: Handler = async c => {
  const rows = (await c.db.prepare("SELECT * FROM lf_checkins WHERE family_id=? AND status='wait'").bind(c.session.familyId).all<CheckinDbRow>()).results;
  let n = 0;
  for (const ck of rows) {
    try { await approve(c, ck, null, [], "", null); n++; } catch (e) { if (!(e instanceof ApiError && e.status === 409)) throw e; }
  }
  return json({ approved: n });
};

const report: Handler = async c => {
  const days = Math.round(num(c.url.searchParams.get("days") ?? 7, 1, 90, 7));
  const from = addDays(c.today, -(days - 1));
  const kids = await c.children.list(c.session.familyId, c.env);
  const reports = [];
  for (const k of kids) {
    const cks = (await c.db.prepare("SELECT day, subject, status, feel, learned, audio_id audio_key, audio_secs FROM lf_checkins WHERE child_id=? AND day BETWEEN ? AND ?")
      .bind(k.id, from, c.today).all()).results as never[];
    const rvs = (await c.db.prepare("SELECT day, result, audio_secs FROM lf_reviews WHERE child_id=? AND day BETWEEN ? AND ?")
      .bind(k.id, from, c.today).all()).results as never[];
    reports.push({ child_id: k.id, name: k.name, ...weeklyReport(from, c.today, cks, rvs, c.subjects) });
  }
  return json({ reports });
};

const getSettings: Handler = async c => {
  const kids = await c.children.list(c.session.familyId, c.env);
  const grades = [...new Set(kids.map(k => k.grade ?? 1))].sort((a, b) => a - b);
  const plans: Record<number, string[]> = {};
  for (const g of grades.length ? grades : [1]) plans[g] = await planSubjects(c, g);
  return json({ settings: c.settings, plans, subjects: c.subjects });
};

const putSettings: Handler = async c => {
  const b = await readJson(c.req);
  let patch;
  try { patch = validateSettingsPatch(b); } catch (e) { throw new ApiError(400, (e as Error).message); }
  const merged = { ...c.settings, ...patch };
  if (merged.friendship_start > merged.friendship_max) throw new ApiError(400, "friendship_start must not be above friendship_max");
  await saveSettingsPatch(c.db, c.session.familyId, patch, c.now);
  return json({ settings: { ...c.settings, ...patch } });
};

const putPlan: Handler = async (c, grade) => {
  const b = await readJson(c.req);
  const subs = Array.isArray(b.subjects) ? b.subjects.map(x => str(x, 20)) : null;
  if (!subs || !subs.every(s => c.subjects.some(x => x.id === s))) throw new ApiError(400, "subjects must be a list of subject ids");
  await c.db.batch([
    c.db.prepare("DELETE FROM lf_plan WHERE family_id=? AND grade=?").bind(c.session.familyId, Number(grade)),
    ...[...new Set(subs)].map((s, i) => c.db.prepare("INSERT INTO lf_plan(family_id, grade, subject, sort) VALUES(?,?,?,?)").bind(c.session.familyId, Number(grade), s, i)),
  ]);
  return json({ grade: Number(grade), subjects: [...new Set(subs)] });
};

const addCards: Handler = async c => {
  const b = await readJson(c.req, 1024 * 1024);
  const list = Array.isArray(b.cards) ? b.cards : [b];
  if (!list.length || list.length > 500) throw new ApiError(400, "send 1 to 500 cards");
  const kids = new Set((await c.children.list(c.session.familyId, c.env)).map(k => k.id));
  const stmts = list.map((raw, i) => {
    const x = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const childId = String(x.child_id ?? "");
    if (!kids.has(childId)) throw new ApiError(400, `card ${i + 1}: unknown child`);
    const en = str(x.prompt_en, 300).trim(), zh = str(x.prompt_zh, 300).trim();
    if (!en && !zh) throw new ApiError(400, `card ${i + 1}: needs a prompt`);
    const kind = x.kind ?? "say";
    if (!isKind(kind)) throw new ApiError(400, `card ${i + 1}: kind must be say, retell or explain`);
    const subject = x.subject ? str(x.subject, 20) : null;
    if (subject && !c.subjects.some(s => s.id === subject)) throw new ApiError(400, `card ${i + 1}: unknown subject`);
    const due = x.due == null ? c.today : x.due;
    if (!isDay(due)) throw new ApiError(400, `card ${i + 1}: due must be YYYY-MM-DD`);
    return c.db.prepare("INSERT INTO lf_cards(family_id, child_id, kind, prompt_en, prompt_zh, source, subject, due, created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(c.session.familyId, childId, kind, en || zh, zh || en, str(x.source, 80), subject, due, c.now.toISOString());
  });
  for (let i = 0; i < stmts.length; i += 100) await c.db.batch(stmts.slice(i, i + 100));
  return json({ added: stmts.length }, 201);
};

function pick<T extends object>(o: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) out[k] = o[k];
  return out;
}

const ID = "([A-Za-z0-9_.:-]{1,64})";
const r = (method: string | string[], path: string, fn: Handler, parent = false): Route =>
  ({ method: Array.isArray(method) ? method : [method], pattern: new RegExp("^" + path + "$"), parent, fn });

export const ROUTES: Route[] = [
  r("GET", "/config", config),
  r("GET", "/children", listChildren),
  r("GET", `/children/${ID}/today`, today),
  r("POST", `/children/${ID}/checkins`, submitCheckin),
  r("GET", `/children/${ID}/deck`, deck),
  r("POST", "/cards/(\\d+)/review", reviewCard),
  r("GET", `/children/${ID}/journey`, childJourney),
  r("PUT", "/uploads/(photo|audio)", upload),
  r(["GET", "HEAD"], "/media/([A-Za-z0-9_-]{16,64})", media),
  r("GET", "/parent/queue", queue, true),
  r("POST", "/parent/checkins/(\\d+)", parentReview, true),
  r("POST", "/parent/approve-all", approveAll, true),
  r("GET", "/parent/report", report, true),
  r("GET", "/parent/settings", getSettings, true),
  r("PUT", "/parent/settings", putSettings, true),
  r("PUT", "/parent/plan/(\\d{1,2})", putPlan, true),
  r("POST", "/parent/cards", addCards, true),
];

export { GYMS, RETELL_PROMPTS, SUBJECTS, localDay };
