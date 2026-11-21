// Minimal shapes of the Cloudflare bindings this package uses. They match @cloudflare/workers-types,
// so in your project you can delete these and import D1Database / R2Bucket / ExecutionContext from there.

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { last_row_id?: number; changes?: number; [k: string]: unknown };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface R2Range { offset?: number; length?: number; suffix?: number }
export interface R2ObjectBody {
  size: number;
  httpMetadata?: { contentType?: string };
  body: ReadableStream;
}
export interface R2Object { size: number; httpMetadata?: { contentType?: string } }
export interface R2Bucket {
  put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<R2Object | null>;
  get(key: string, options?: { range?: R2Range }): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  delete(key: string | string[]): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(p: Promise<unknown>): void;
}

/** Who is asking. Built by your existing auth; this package never sees PINs or cookies itself. */
export interface LfSession {
  familyId: string;
  /** true only while the parent gate (parent code) is unlocked for this session */
  parentUnlocked: boolean;
}

/** A child as your existing children table knows them. Only id and name are required. */
export interface ChildInfo {
  id: string;
  name: string;
  grade?: number;
  lang?: "zh" | "en";
  companion?: string;
  companion_type?: string;
  level_base?: number;
  /** If your table already keeps XP, return it here and it is shown instead of lf_child_stats.xp. */
  xp?: number;
}

export interface ChildDirectory {
  list(familyId: string, env: unknown): Promise<ChildInfo[]>;
  get(familyId: string, childId: string, env: unknown): Promise<ChildInfo | null>;
}

export interface SpeechFeedback { stars: number; text: string; words_to_practise?: string[] }

/** Care items a child owns. Default: the lf_care_inventory table. Pass your own if your wheel already keeps items. */
export interface CareInventory {
  list(familyId: string, childId: string, env: unknown): Promise<{ item_id: string; qty: number }[]>;
  /** Take one of the item. Must be atomic (for D1: UPDATE ... SET qty = qty - 1 WHERE ... AND qty >= 1). True if one was taken. */
  consume(familyId: string, childId: string, itemId: string, env: unknown): Promise<boolean>;
  /** Give one back, used only if the care action fails after the item was taken. */
  refund(familyId: string, childId: string, itemId: string, env: unknown): Promise<void>;
}

/** A pet the site already knows about, imported into the party/storage on first look. */
export interface ExistingPet { id: string; species: string; type?: string; nickname?: string; friendship?: number }

export interface LfHooks {
  /** Optional AI feedback on a recording. Runs in ctx.waitUntil, so it never slows the child's screen. */
  speechFeedback?(a: { bucket: R2Bucket; key: string; mime: string; prompt: string; lang: "zh" | "en"; kind: string; env: unknown }): Promise<SpeechFeedback | null>;
  /** Called after a parent approves, e.g. to add XP to your own children table or send a notification. */
  onApproved?(a: { familyId: string; child: ChildInfo; checkinId: number; xp: number; reward: string | null; env: unknown }): Promise<void>;
  /**
   * Your existing wheel code: add one chance on the given wheel ("care" by default), applying your own
   * daily-practice rules. Return true only if the chance was really added. idempotencyKey is unique per care action,
   * so a retried call must not add a second chance.
   */
  grantWheelChance?(a: { familyId: string; child: ChildInfo; wheel: string; reason: "care"; idempotencyKey: string; env: unknown }): Promise<boolean>;
}
