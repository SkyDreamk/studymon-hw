import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningRoutes } from "../worker/index.ts";
import type { ChildInfo } from "../worker/types.ts";
import { makeD1, makeR2 } from "./shims.ts";

const KIDS: Record<string, ChildInfo[]> = {
  f1: [{ id: "c1", name: "Mia", grade: 2, lang: "zh" }, { id: "c2", name: "Leo", grade: 4, lang: "en" }],
  f2: [{ id: "c9", name: "Other", grade: 2 }],
};

// 20:00 in Shanghai on Thu 19 Nov 2026 (before the 21:30 cut-off)
const T0 = Date.parse("2026-11-19T12:00:00Z");

function setup(extra: Record<string, unknown> = {}) {
  const db = makeD1(["0001_learning_features.sql", "0002_care_and_storage.sql"].map(f => new URL("../migrations/" + f, import.meta.url).pathname));
  const r2 = makeR2();
  let clock = T0;
  const waits: Promise<unknown>[] = [];
  const approved: unknown[] = [];
  const app = createLearningRoutes({
    // Stand-in for the site's own auth. Real code reads its session cookie here.
    getSession: async req => {
      const s = req.headers.get("X-Test-Session");
      if (!s) return null;
      const [familyId, role] = s.split(":");
      return { familyId, parentUnlocked: role === "parent" };
    },
    children: {
      list: async f => KIDS[f] ?? [],
      get: async (f, id) => (KIDS[f] ?? []).find(k => k.id === id) ?? null,
    },
    hooks: {
      speechFeedback: async a => ({ stars: 3, text: `heard ${a.mime} for ${a.kind}` }),
      onApproved: async a => { approved.push(a); },
    },
    limits: { audioMaxBytes: 1000 },
    now: () => new Date(clock),
    ...extra,
  });
  const env = { DB: db, MEDIA: r2 };
  const exec = { waitUntil: (p: Promise<unknown>) => { waits.push(p); } };
  async function call(method: string, path: string, opts: { who?: string; body?: unknown; raw?: Uint8Array; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { "X-Requested-With": "checkin", ...(opts.headers || {}) };
    if (opts.who) headers["X-Test-Session"] = opts.who;
    let body: BodyInit | undefined;
    if (opts.raw) body = opts.raw as unknown as BodyInit;
    else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers["Content-Type"] = "application/json"; }
    const res = await app.handle(new Request("https://checkin.example" + path, { method, headers, body }), env, exec);
    return res;
  }
  async function j(method: string, path: string, opts: Parameters<typeof call>[2] = {}) {
    const res = (await call(method, path, opts))!;
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, res };
  }
  return { db, r2, call, j, waits, approved, setClock: (t: number) => { clock = t; } };
}

const WEBM = (n = 40) => { const b = new Uint8Array(n); b.set([0x1a, 0x45, 0xdf, 0xa3]); for (let i = 4; i < n; i++) b[i] = i; return b; };
const JPEG = (n = 40) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff]); return b; };
const uid = (s: string) => (s + "_".repeat(20)).slice(0, 20);

async function uploadAudio(t: ReturnType<typeof setup>, id: string, who = "f1", secs = "30") {
  return t.j("PUT", "/api/lf/uploads/audio", { who, raw: WEBM(), headers: { "Content-Type": "audio/webm;codecs=opus", "X-Upload-Id": uid(id), "X-Audio-Secs": secs } });
}

test("mounting: other paths pass through, auth and write guards apply", async () => {
  const t = setup();
  assert.equal(await t.call("GET", "/api/other"), null);
  assert.equal((await t.j("GET", "/api/lf/children")).status, 401);
  assert.equal((await t.j("GET", "/api/lf/nope", { who: "f1" })).status, 404);
  assert.equal((await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: {}, headers: { "X-Requested-With": "" } })).status, 403);
  assert.equal((await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: {}, headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await t.j("GET", "/api/lf/parent/queue", { who: "f1" })).status, 403);
  assert.equal((await t.j("GET", "/api/lf/children/c9/today", { who: "f1" })).status, 404); // another family's child
  const kids = await t.j("GET", "/api/lf/children", { who: "f1" });
  assert.deepEqual(kids.body.children.map((k: { name: string }) => k.name), ["Mia", "Leo"]);
});

test("uploads: type, size and first-byte checks, idempotent retry, family-scoped R2 key", async () => {
  const t = setup();
  const bad = await t.j("PUT", "/api/lf/uploads/audio", { who: "f1", raw: JPEG(), headers: { "Content-Type": "audio/webm", "X-Upload-Id": uid("a") } });
  assert.equal(bad.status, 415);
  assert.equal((await t.j("PUT", "/api/lf/uploads/audio", { who: "f1", raw: WEBM(), headers: { "Content-Type": "text/html", "X-Upload-Id": uid("a") } })).status, 415);
  assert.equal((await t.j("PUT", "/api/lf/uploads/audio", { who: "f1", raw: WEBM(2000), headers: { "Content-Type": "audio/webm", "X-Upload-Id": uid("a") } })).status, 413);
  assert.equal((await t.j("PUT", "/api/lf/uploads/audio", { who: "f1", raw: WEBM(), headers: { "Content-Type": "audio/webm", "X-Upload-Id": "short" } })).status, 400);
  const ok = await uploadAudio(t, "a");
  assert.equal(ok.status, 201);
  assert.equal(ok.body.url, `/api/lf/media/${uid("a")}`);
  assert.deepEqual([...t.r2.store.keys()], [`families/f1/audio/2026-11/${uid("a")}.webm`]);
  const again = await uploadAudio(t, "a");
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.equal(t.r2.store.size, 1);
  assert.equal((await uploadAudio(t, "a", "f2")).status, 409);
  const photo = await t.j("PUT", "/api/lf/uploads/photo", { who: "f1", raw: JPEG(), headers: { "Content-Type": "image/jpeg", "X-Upload-Id": uid("p") } });
  assert.equal(photo.status, 201);
});

test("media: family only, with byte ranges for iPhone Safari", async () => {
  const t = setup();
  await uploadAudio(t, "m");
  const path = `/api/lf/media/${uid("m")}`;
  assert.equal((await t.j("GET", path, { who: "f2" })).status, 404);
  const full = (await t.call("GET", path, { who: "f1" }))!;
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("Content-Type"), "audio/webm");
  assert.equal(full.headers.get("Accept-Ranges"), "bytes");
  assert.match(full.headers.get("Cache-Control")!, /private/);
  assert.equal((await full.arrayBuffer()).byteLength, 40);
  const part = (await t.call("GET", path, { who: "f1", headers: { Range: "bytes=0-1" } }))!;
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("Content-Range"), "bytes 0-1/40");
  assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [0x1a, 0x45]);
  const tail = (await t.call("GET", path, { who: "f1", headers: { Range: "bytes=-3" } }))!;
  assert.equal(tail.headers.get("Content-Range"), "bytes 37-39/40");
  assert.equal((await t.call("GET", path, { who: "f1", headers: { Range: "bytes=99-" } }))!.status, 416);
  const head = (await t.call("HEAD", path, { who: "f1" }))!;
  assert.equal(head.headers.get("Content-Length"), "40");
});

test("check-in with spoken retell, parent approval, XP with early bonus, reward, journey", async () => {
  const t = setup();
  const before = await t.j("GET", "/api/lf/children/c1/today", { who: "f1" });
  assert.equal(before.body.day, "2026-11-19");
  assert.equal(before.body.early_now, true);
  assert.deepEqual(before.body.quests.map((q: { status: string }) => q.status), ["todo", "todo", "todo", "todo", "todo"]);
  await uploadAudio(t, "r1");
  const ck = await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "ma", feel: "hard", learned: "分数加法", audio: uid("r1") } });
  assert.equal(ck.status, 201);
  assert.deepEqual({ early: ck.body.early, pending_xp: ck.body.pending_xp, ai_pending: ck.body.ai_pending }, { early: true, pending_xp: 48, ai_pending: true });
  await Promise.all(t.waits);
  assert.equal((await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "ma" } })).status, 409);
  assert.equal((await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "ma", audio: uid("nope") } })).status, 400);
  // the recording belongs to family 1 and cannot be attached by family 2
  assert.equal((await t.j("POST", "/api/lf/children/c9/checkins", { who: "f2", body: { subject: "zh", audio: uid("r1") } })).status, 400);

  const q = await t.j("GET", "/api/lf/parent/queue", { who: "f1:parent" });
  assert.equal(q.body.items.length, 1);
  const item = q.body.items[0];
  assert.equal(item.child_name, "Mia");
  assert.equal(item.audio_url, `/api/lf/media/${uid("r1")}`);
  assert.equal(item.audio_secs, 30);
  assert.deepEqual(item.ai_feedback, { stars: 3, text: "heard audio/webm for checkin" });
  assert.equal(q.body.rewards.length, 4);

  assert.equal((await t.j("POST", `/api/lf/parent/checkins/${item.id}`, { who: "f1:parent", body: { action: "approve", reward: "大师球×99" } })).status, 400);
  await uploadAudio(t, "pv");
  const ok = await t.j("POST", `/api/lf/parent/checkins/${item.id}`, { who: "f1:parent", body: { action: "approve", reward: "伤药×1", feedback: ["Clear voice / 声音清楚"], note: "讲得好", parent_audio: uid("pv") } });
  assert.deepEqual(ok.body, { status: "ok", xp: 48, reward: "伤药×1" });
  assert.equal((await t.j("POST", `/api/lf/parent/checkins/${item.id}`, { who: "f1:parent", body: { action: "approve" } })).status, 409);
  await Promise.all(t.waits);
  assert.equal(t.approved.length, 1);

  const after = await t.j("GET", "/api/lf/children/c1/today", { who: "f1" });
  assert.equal(after.body.child.xp, 48);
  assert.equal(after.body.streak, 1);
  assert.equal(after.body.quests.find((x: { subject: string }) => x.subject === "ma").status, "ok");
  assert.equal(after.body.messages[0].note, "讲得好");
  assert.equal(after.body.messages[0].parent_audio, `/api/lf/media/${uid("pv")}`);
  const jr = await t.j("GET", "/api/lf/children/c1/journey", { who: "f1" });
  assert.deepEqual(jr.body.backpack, [{ item: "伤药×1", n: 1 }]);
  assert.equal(jr.body.journey.daysToNext, 3);
});

test("send back: cards are paused, the child can redo it and hears the voice note", async () => {
  const t = setup();
  await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "zh", learned: "静夜思" } });
  const id = (await t.j("GET", "/api/lf/parent/queue", { who: "f1:parent" })).body.items[0].id;
  await uploadAudio(t, "pv2");
  const back = await t.j("POST", `/api/lf/parent/checkins/${id}`, { who: "f1:parent", body: { action: "back", note: "再读一遍", parent_audio: uid("pv2") } });
  assert.equal(back.body.status, "back");
  const today = await t.j("GET", "/api/lf/children/c1/today", { who: "f1" });
  const zh = today.body.quests.find((x: { subject: string }) => x.subject === "zh");
  assert.deepEqual({ status: zh.status, note: zh.note, parent_audio: zh.parent_audio }, { status: "back", note: "再读一遍", parent_audio: `/api/lf/media/${uid("pv2")}` });
  assert.equal(t.db.raw.prepare("SELECT COUNT(*) n FROM lf_cards WHERE active=1").get()!.n, 0);
  assert.equal((await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "zh", learned: "静夜思" } })).status, 201);
});

test("review deck: cards come back tomorrow and move up the ladder", async () => {
  const t = setup();
  await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "rd", feel: "okay", learned: "小猫钓鱼" } });
  assert.equal((await t.j("GET", "/api/lf/children/c1/deck", { who: "f1" })).body.cards.length, 0);
  t.setClock(T0 + 86400000);
  const deck = await t.j("GET", "/api/lf/children/c1/deck", { who: "f1" });
  assert.equal(deck.body.cards.length, 1);
  const card = deck.body.cards[0];
  assert.deepEqual(card.next, { again: 1, good: 3, easy: 7 });
  assert.match(card.prompt_zh, /小猫钓鱼/);
  assert.equal((await t.j("POST", `/api/lf/cards/${card.id}/review`, { who: "f2", body: { result: "good" } })).status, 404);
  assert.equal((await t.j("POST", `/api/lf/cards/${card.id}/review`, { who: "f1", body: { result: "maybe" } })).status, 400);
  await uploadAudio(t, "rv", "f1", "12");
  const rv = await t.j("POST", `/api/lf/cards/${card.id}/review`, { who: "f1", body: { result: "good", audio: uid("rv") } });
  assert.deepEqual({ due: rv.body.due, in_days: rv.body.in_days, step: rv.body.step }, { due: "2026-11-23", in_days: 3, step: 1 });
  await Promise.all(t.waits);
  assert.equal(t.db.raw.prepare("SELECT ai_feedback_json f FROM lf_reviews").get()!.f, JSON.stringify({ stars: 3, text: "heard audio/webm for retell" }));
  assert.equal((await t.j("GET", "/api/lf/children/c1/deck", { who: "f1" })).body.cards.length, 0);
  assert.equal((await t.j("GET", "/api/lf/children", { who: "f1" })).body.children[0].friendship, 1);
});

test("weekly report counts speaking minutes and recall", async () => {
  const t = setup();
  await uploadAudio(t, "w1", "f1", "90");
  await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "en", feel: "hard", learned: "past tense", audio: uid("w1") } });
  t.setClock(T0 + 86400000);
  const card = (await t.j("GET", "/api/lf/children/c1/deck", { who: "f1" })).body.cards[0];
  await uploadAudio(t, "w2", "f1", "30");
  await t.j("POST", `/api/lf/cards/${card.id}/review`, { who: "f1", body: { result: "again", audio: uid("w2") } });
  const rep = await t.j("GET", "/api/lf/parent/report?days=7", { who: "f1:parent" });
  const mia = rep.body.reports.find((r: { name: string }) => r.name === "Mia");
  assert.equal(mia.spoken_minutes, 2);
  assert.equal(mia.retells, 1);
  assert.equal(mia.reviews, 1);
  assert.equal(mia.recall_rate, 0);
  assert.deepEqual(mia.tricky_topics, ["past tense"]);
  assert.equal(mia.from, "2026-11-14");
});

test("parent settings, time zone and plan", async () => {
  const t = setup();
  assert.equal((await t.j("PUT", "/api/lf/parent/settings", { who: "f1:parent", body: { early_cutoff: "99:00" } })).status, 400);
  assert.equal((await t.j("PUT", "/api/lf/parent/settings", { who: "f1", body: { weekly_goal: 5 } })).status, 403);
  const put = await t.j("PUT", "/api/lf/parent/settings", { who: "f1:parent", body: { early_cutoff: "19:30", weekly_goal: 5 } });
  assert.equal(put.body.settings.weekly_goal, 5);
  assert.equal((await t.j("GET", "/api/lf/children/c1/today", { who: "f1" })).body.early_now, false);
  // family 2 is untouched
  assert.equal((await t.j("GET", "/api/lf/children/c9/today", { who: "f2" })).body.early_now, true);
  await t.j("PUT", "/api/lf/parent/settings", { who: "f1:parent", body: { timezone: "America/New_York" } });
  assert.equal((await t.j("GET", "/api/lf/children/c1/today", { who: "f1" })).body.day, "2026-11-19");
  t.setClock(Date.parse("2026-11-19T03:00:00Z")); // 11:00 Shanghai, still the 18th in New York
  assert.equal((await t.j("GET", "/api/lf/children/c1/today", { who: "f1" })).body.day, "2026-11-18");
  const plan = await t.j("PUT", "/api/lf/parent/plan/2", { who: "f1:parent", body: { subjects: ["zh", "ma"] } });
  assert.deepEqual(plan.body.subjects, ["zh", "ma"]);
  assert.deepEqual((await t.j("GET", "/api/lf/children/c1/today", { who: "f1" })).body.quests.map((q: { subject: string }) => q.subject), ["zh", "ma"]);
  assert.equal((await t.j("PUT", "/api/lf/parent/plan/2", { who: "f1:parent", body: { subjects: ["xx"] } })).status, 400);
  const s = await t.j("GET", "/api/lf/parent/settings", { who: "f1:parent" });
  assert.deepEqual(Object.keys(s.body.plans), ["2", "4"]);
});

test("parent cards: bulk add, checked against the family", async () => {
  const t = setup();
  assert.equal((await t.j("POST", "/api/lf/parent/cards", { who: "f1:parent", body: { cards: [{ child_id: "c9", prompt_zh: "x" }] } })).status, 400);
  assert.equal((await t.j("POST", "/api/lf/parent/cards", { who: "f1:parent", body: { cards: [{ child_id: "c1" }] } })).status, 400);
  const add = await t.j("POST", "/api/lf/parent/cards", { who: "f1:parent", body: { cards: [
    { child_id: "c1", prompt_zh: "背一遍《静夜思》", subject: "zh" },
    { child_id: "c1", prompt_en: "Say three animals and what they eat", kind: "say", due: "2026-11-25" },
  ] } });
  assert.equal(add.body.added, 2);
  assert.equal((await t.j("GET", "/api/lf/children/c1/deck", { who: "f1" })).body.cards.length, 1);
  assert.equal((await t.j("GET", "/api/lf/children/c1/today", { who: "f1" })).body.deck_due, 1);
});

test("approve all, and streaks that carry over old check-in days", async () => {
  const t = setup({ legacyCheckinDays: async (_f: string, child: string) => (child === "c1" ? ["2026-11-16", "2026-11-17"] : []) });
  await t.j("POST", "/api/lf/children/c1/checkins", { who: "f1", body: { subject: "zh" } });
  await t.j("POST", "/api/lf/children/c2/checkins", { who: "f1", body: { subject: "ma" } });
  const all = await t.j("POST", "/api/lf/parent/approve-all", { who: "f1:parent" });
  assert.equal(all.body.approved, 2);
  const today = await t.j("GET", "/api/lf/children/c1/today", { who: "f1" });
  assert.equal(today.body.streak, 3); // Mon, Tue from the old site, Wed shield, Thu today
  assert.deepEqual(today.body.week, [1, 1, 2, 1, 0, 0, 0]);
  assert.equal(today.body.journey.approvedDays, 3);
});
