// Per-family rules for the learning features, with defaults matching the current site
// (XP ×1.2 before 21:30, 5 subjects, 8 gyms) plus the new review and speaking options.

export interface Subject { id: string; zh: string; en: string; color: string }
export interface Gym { zh: string; en: string; type: string }

/** A care item the child can use on a companion. "gain" overrides friendship_per_feed / friendship_per_bath. */
export interface CareItem { id: string; zh: string; en: string; kind: "food" | "bath"; gain?: number }

/** Friendship bonus in solo gym battles once friendship reaches "min". Percentages, 0-100. */
export interface BattleTier { min: number; attack_pct: number; crit_pct: number; endure_pct: number }

export interface FamilySettings {
  timezone: string;
  parent_lang: "zh" | "en";
  early_bonus: boolean;
  early_cutoff: string; // "21:30"
  early_multiplier: number;
  xp_per_checkin: number;
  xp_per_level: number;
  shield_days: boolean;
  weekly_goal: number;
  days_per_gym: number;
  retell_required: boolean;
  review_deck: boolean;
  review_intervals: number[];
  daily_deck_limit: number;
  friendship_per_card: number;
  parent_voice_notes: boolean;
  max_retell_secs: number;
  rewards: string[];
  feedback_chips: string[];
  // ---- care play (v2.1)
  care_enabled: boolean;
  friendship_max: number;
  friendship_start: number;
  friendship_per_feed: number;
  friendship_per_bath: number;
  /** only party pets can be fed and bathed; warehouse pets wait */
  care_party_only: boolean;
  care_items: CareItem[];
  /** the key your wheel code uses for the Care wheel */
  care_wheel: string;
  /** most Care-wheel chances care can earn per child per day (0 = none) */
  care_wheel_chances_per_day: number;
  /** care actions needed for one chance */
  care_actions_per_chance: number;
  battle_friendship_tiers: BattleTier[];
  // ---- party and warehouse (v2.1)
  /** active party size, main pet included (main + 4 = 5) */
  party_max: number;
}

export const DEFAULT_SETTINGS: FamilySettings = {
  timezone: "Asia/Shanghai",
  parent_lang: "zh",
  early_bonus: true,
  early_cutoff: "21:30",
  early_multiplier: 1.2,
  xp_per_checkin: 40,
  xp_per_level: 1000,
  shield_days: true,
  weekly_goal: 4,
  days_per_gym: 4,
  retell_required: false,
  review_deck: true,
  review_intervals: [1, 3, 7, 14, 30],
  daily_deck_limit: 8,
  friendship_per_card: 1,
  parent_voice_notes: true,
  max_retell_secs: 60,
  rewards: ["普通精灵球×1", "经验+20", "伤药×1", "树果汁×1"],
  feedback_chips: ["Clear voice / 声音清楚", "Full sentences / 说完整句子", "Used a new word / 用了新词", "Say it slower / 说慢一点"],
  care_enabled: true,
  friendship_max: 255,
  friendship_start: 0,
  friendship_per_feed: 10,
  friendship_per_bath: 10,
  care_party_only: true,
  care_items: [
    { id: "oran_berry", zh: "橙橙果", en: "Oran Berry", kind: "food" },
    { id: "poke_puff", zh: "宝可梦松饼", en: "Poké Puff", kind: "food" },
    { id: "bubble_soap", zh: "泡泡香皂", en: "Bubble Soap", kind: "bath" },
    { id: "soft_towel", zh: "柔软毛巾", en: "Soft Towel", kind: "bath" },
  ],
  care_wheel: "care",
  care_wheel_chances_per_day: 1,
  care_actions_per_chance: 2,
  // Starting values to tune with the family; not taken from any game.
  battle_friendship_tiers: [
    { min: 100, attack_pct: 0, crit_pct: 5, endure_pct: 0 },
    { min: 180, attack_pct: 5, crit_pct: 5, endure_pct: 5 },
    { min: 255, attack_pct: 10, crit_pct: 10, endure_pct: 10 },
  ],
  party_max: 5,
};

export const SUBJECTS: Subject[] = [
  { id: "zh", zh: "语文", en: "Chinese", color: "#e2604a" },
  { id: "ma", zh: "数学", en: "Math", color: "#2a75bb" },
  { id: "en", zh: "英语", en: "English", color: "#8a62d8" },
  { id: "rd", zh: "阅读", en: "Reading", color: "#2f9e5b" },
  { id: "ot", zh: "其他", en: "Other", color: "#e58a00" },
];

export const GYMS: Gym[] = [
  { zh: "岩石", en: "Rock", type: "rock" }, { zh: "水", en: "Water", type: "water" },
  { zh: "电", en: "Electric", type: "electric" }, { zh: "草", en: "Grass", type: "grass" },
  { zh: "毒", en: "Poison", type: "poison" }, { zh: "超能力", en: "Psychic", type: "psychic" },
  { zh: "火", en: "Fire", type: "fire" }, { zh: "地面", en: "Ground", type: "ground" },
];

export const RETELL_PROMPTS: Record<string, { en: string; zh: string }> = {
  zh: { en: "Tell your companion what the text means, in one or two sentences.", zh: "用一两句话，把课文的意思讲给你的伙伴听。" },
  ma: { en: "Explain one question out loud, as if teaching a friend.", zh: "挑一道题，像教朋友一样讲出来。" },
  en: { en: "Say one new English sentence you can make today.", zh: "用今天学的内容，说一个新的英语句子。" },
  rd: { en: "Retell the story: who, where, and what happened.", zh: "复述故事：谁、在哪里、发生了什么。" },
  ot: { en: "Say what you practised and what was hard.", zh: "说说你练了什么，哪里有点难。" },
};

export function mergeSettings(stored: Partial<FamilySettings> | null | undefined): FamilySettings {
  return { ...DEFAULT_SETTINGS, ...(stored || {}) };
}

/** Checks a settings patch from the parent screen. Returns the clean patch or throws Error with a message. */
export function validateSettingsPatch(patch: Record<string, unknown>): Partial<FamilySettings> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULT_SETTINGS)) throw new Error(`unknown setting ${k}`);
    const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[k];
    if (Array.isArray(def)) {
      if (!Array.isArray(v)) throw new Error(`${k} must be a list`);
      if (k === "care_items") {
        checkCareItems(v);
      } else if (k === "battle_friendship_tiers") {
        checkTiers(v);
      } else if (k === "review_intervals") {
        if (!v.length || !v.every(x => Number.isInteger(x) && x > 0 && x <= 365)) throw new Error("review_intervals must be whole days between 1 and 365");
      } else if (!v.every(x => typeof x === "string" && x.length > 0 && x.length <= 60) || v.length > 20) {
        throw new Error(`${k} must be up to 20 short texts`);
      }
    } else if (typeof def !== typeof v) {
      throw new Error(`${k} must be ${typeof def}`);
    }
    if (k === "early_cutoff" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v))) throw new Error("early_cutoff must look like 21:30");
    if (k === "parent_lang" && v !== "zh" && v !== "en") throw new Error("parent_lang must be zh or en");
    if (k === "timezone") {
      try { new Intl.DateTimeFormat("en", { timeZone: String(v) }); } catch { throw new Error("unknown time zone"); }
    }
    if (typeof v === "number" && (!Number.isFinite(v) || v < 0 || v > 100000)) throw new Error(`${k} is out of range`);
    if (WHOLE.has(k) && !Number.isInteger(v)) throw new Error(`${k} must be a whole number`);
    if (k === "friendship_max" && ((v as number) < 1 || (v as number) > 65535)) throw new Error("friendship_max must be 1 to 65535");
    if (k === "party_max" && ((v as number) < 1 || (v as number) > 30)) throw new Error("party_max must be 1 to 30");
    if (k === "care_actions_per_chance" && (v as number) < 1) throw new Error("care_actions_per_chance must be at least 1");
    if (k === "care_wheel" && !/^[A-Za-z0-9_-]{1,32}$/.test(String(v))) throw new Error("care_wheel must be a short key");
    out[k] = v;
  }
  const max = (out.friendship_max as number | undefined);
  const start = (out.friendship_start as number | undefined);
  if (max !== undefined && start !== undefined && start > max) throw new Error("friendship_start must not be above friendship_max");
  return out as Partial<FamilySettings>;
}

const WHOLE = new Set(["friendship_max", "friendship_start", "friendship_per_feed", "friendship_per_bath", "care_wheel_chances_per_day",
  "care_actions_per_chance", "party_max", "xp_per_checkin", "xp_per_level", "weekly_goal", "days_per_gym", "daily_deck_limit",
  "friendship_per_card", "max_retell_secs"]);

function plainText(x: unknown, max: number): boolean {
  return typeof x === "string" && x.trim().length > 0 && x.length <= max;
}

function checkCareItems(v: unknown[]): void {
  if (v.length > 30) throw new Error("care_items: at most 30 items");
  const ids = new Set<string>();
  for (const it of v) {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    if (typeof o.id !== "string" || !/^[a-z0-9_-]{1,32}$/.test(o.id)) throw new Error("care_items: id must be a short key like oran_berry");
    if (ids.has(o.id)) throw new Error(`care_items: ${o.id} is listed twice`);
    ids.add(o.id);
    if (!plainText(o.zh, 30) || !plainText(o.en, 30)) throw new Error(`care_items: ${o.id} needs zh and en names`);
    if (o.kind !== "food" && o.kind !== "bath") throw new Error(`care_items: ${o.id} kind must be food or bath`);
    if (o.gain !== undefined && !(Number.isInteger(o.gain) && (o.gain as number) >= 0 && (o.gain as number) <= 65535)) throw new Error(`care_items: ${o.id} gain must be a whole number`);
    for (const key of Object.keys(o)) if (!["id", "zh", "en", "kind", "gain"].includes(key)) throw new Error(`care_items: unknown field ${key}`);
  }
}

function checkTiers(v: unknown[]): void {
  if (v.length > 10) throw new Error("battle_friendship_tiers: at most 10 tiers");
  let last = -1;
  for (const it of v) {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    if (!Number.isInteger(o.min) || (o.min as number) < 0 || (o.min as number) > 65535) throw new Error("battle_friendship_tiers: min must be a whole number");
    if ((o.min as number) <= last) throw new Error("battle_friendship_tiers: list tiers from lowest min to highest");
    last = o.min as number;
    for (const key of ["attack_pct", "crit_pct", "endure_pct"]) {
      const n = o[key];
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100) throw new Error(`battle_friendship_tiers: ${key} must be 0 to 100`);
    }
    for (const key of Object.keys(o)) if (!["min", "attack_pct", "crit_pct", "endure_pct"].includes(key)) throw new Error(`battle_friendship_tiers: unknown field ${key}`);
  }
}
