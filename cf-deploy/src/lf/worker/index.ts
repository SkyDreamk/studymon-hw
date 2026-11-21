// Mount point. In your existing Worker:
//
//   const learning = createLearningRoutes({ getSession, children, hooks });
//   export default { async fetch(req, env, ctx) {
//     const res = await learning.handle(req, env, ctx);
//     if (res) return res;
//     ... your existing routes ...
//   } };
//
// handle() returns null for any path outside the prefix (default /api/lf), so nothing else changes.
import { GYMS, localDay, RETELL_PROMPTS, SUBJECTS, type Gym, type Subject } from "../logic/index.ts";
import { ApiError, errorResponse, json } from "./http.ts";
import { DEFAULT_LIMITS, type MediaLimits } from "./media.ts";
import { ROUTES, type Ctx } from "./routes.ts";
import { CARE_ROUTES, d1CareInventory, grantCareItem, grantPet, petBattleEffect } from "./care.ts";
import type { FriendshipEffect } from "../logic/index.ts";
import { loadSettings } from "./store.ts";
import type { CareInventory, ChildDirectory, D1Database, ExecutionContext, ExistingPet, LfHooks, LfSession, R2Bucket } from "./types.ts";

const ALL_ROUTES = [...ROUTES, ...CARE_ROUTES];

export interface LearningOptions {
  /** URL prefix for every route. Default "/api/lf". */
  prefix?: string;
  /** Your existing auth: who is signed in, and whether the parent gate is unlocked. Null means not signed in. */
  getSession(req: Request, env: any): Promise<LfSession | null>;
  /** Your existing children table. */
  children: ChildDirectory;
  /** D1 binding. Default env.DB. */
  db?(env: any): D1Database;
  /** R2 binding. Default env.MEDIA. */
  bucket?(env: any): R2Bucket;
  hooks?: LfHooks;
  limits?: Partial<MediaLimits>;
  /** Header every write must carry, as a cheap CSRF guard next to SameSite cookies. Default X-Requested-With: checkin. Set false to skip. */
  csrfHeader?: { name: string; value: string } | false;
  subjects?: Subject[];
  gyms?: Gym[];
  retellPrompts?: Record<string, { en: string; zh: string }>;
  /** Use your existing per-grade subject plan instead of lf_plan. Return null to fall back. */
  planForGrade?(familyId: string, grade: number, env: any): Promise<string[] | null>;
  /** Days already checked in on the old system, so streaks and gyms carry over at launch (YYYY-MM-DD, family time zone). */
  legacyCheckinDays?(familyId: string, childId: string, sinceDay: string, env: any): Promise<string[]>;
  /** v2.1: where care items live. Default: the lf_care_inventory table (filled by grantCareItem). */
  careInventory?: CareInventory;
  /** v2.1: pets the site already has, imported into party/storage once (idempotent) the first time a child opens them. */
  existingPets?(familyId: string, childId: string, env: any): Promise<ExistingPet[]>;
  /** For tests. */
  now?(): Date;
}

export function createLearningRoutes(opts: LearningOptions) {
  const prefix = (opts.prefix ?? "/api/lf").replace(/\/$/, "");
  const csrf = opts.csrfHeader === undefined ? { name: "X-Requested-With", value: "checkin" } : opts.csrfHeader;
  const limits: MediaLimits = { ...DEFAULT_LIMITS, ...(opts.limits || {}) };
  const subjects = opts.subjects ?? SUBJECTS;
  const gyms = opts.gyms ?? GYMS;
  const prompts = opts.retellPrompts ?? RETELL_PROMPTS;
  const mediaUrl = (id: string | null) => (id ? `${prefix}/media/${id}` : null);
  const dbOf = (env: any): D1Database => (opts.db ? opts.db(env) : env.DB);
  const careInventory = opts.careInventory ?? d1CareInventory(dbOf);
  const nowOf = () => (opts.now ? opts.now() : new Date());

  async function handle(req: Request, env: any, exec: ExecutionContext): Promise<Response | null> {
    const url = new URL(req.url);
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) return null;
    const sub = url.pathname.slice(prefix.length) || "/";
    try {
      let route: (typeof ALL_ROUTES)[number] | undefined;
      let groups: string[] = [];
      let pathKnown = false;
      for (const r of ALL_ROUTES) {
        const m = r.pattern.exec(sub);
        if (!m) continue;
        pathKnown = true;
        if (r.method.includes(req.method)) { route = r; groups = m.slice(1); break; }
      }
      if (!route) throw new ApiError(pathKnown ? 405 : 404, pathKnown ? "method not allowed" : "not found");
      const write = req.method !== "GET" && req.method !== "HEAD";
      if (write) {
        const origin = req.headers.get("Origin");
        if (origin && origin !== url.origin) throw new ApiError(403, "cross-site request refused");
        if (csrf && req.headers.get(csrf.name) !== csrf.value) throw new ApiError(403, `missing ${csrf.name} header`);
      }
      const session = await opts.getSession(req, env);
      if (!session) throw new ApiError(401, "please sign in");
      if (route.parent && !session.parentUnlocked) throw new ApiError(403, "parent area is locked");
      const db = dbOf(env);
      const bucket = opts.bucket ? opts.bucket(env) : env.MEDIA;
      const settings = await loadSettings(db, session.familyId);
      const now = opts.now ? opts.now() : new Date();
      const ctx: Ctx = {
        req, url, env, exec, db, bucket, session, settings, children: opts.children, hooks: opts.hooks ?? {}, limits,
        subjects, gyms, prompts, now, today: localDay(now, settings.timezone), mediaUrl,
        planForGrade: opts.planForGrade, legacyCheckinDays: opts.legacyCheckinDays,
        careInventory, builtInInventory: !opts.careInventory, existingPets: opts.existingPets,
      };
      return await route.fn(ctx, ...groups.map(decodeURIComponent));
    } catch (e) {
      return errorResponse(e);
    }
  }

  return {
    handle, prefix,
    /** Give a pet (wheel prize, egg hatch). Joins the party if there is room, else storage. Idempotent on source + sourceId. */
    async grantPet(env: any, a: { familyId: string; childId: string; species: string; type?: string; nickname?: string; friendship?: number; source: string; sourceId: string }) {
      const db = dbOf(env);
      const out = await grantPet(db, await loadSettings(db, a.familyId), { ...a, now: nowOf() });
      return { id: out.pet.id, place: out.pet.place, is_main: !!out.pet.is_main, created: out.created };
    },
    /** Give care items into the built-in inventory (wheel prize). Idempotent on sourceId. */
    async grantCareItem(env: any, a: { familyId: string; childId: string; itemId: string; qty: number; sourceId: string }) {
      const db = dbOf(env);
      return grantCareItem(db, await loadSettings(db, a.familyId), { ...a, now: nowOf() });
    },
    /** For your battle code. Bonus only when mode is exactly "solo_gym"; PvP, co-op and anything else get none. */
    async friendshipEffect(env: any, a: { familyId: string; petId: number; mode: string }): Promise<FriendshipEffect> {
      return petBattleEffect(dbOf(env), a.familyId, a.petId, a.mode);
    },
  };
}

export { json, ApiError };
export type { LfSession, ChildDirectory, LfHooks, CareInventory, ExistingPet } from "./types.ts";
