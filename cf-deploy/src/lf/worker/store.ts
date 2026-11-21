// D1 queries shared by the routes. Every query is scoped by family_id or by a child id that was already
// checked against the family through the ChildDirectory.
import { mergeSettings, type FamilySettings } from "../logic/index.ts";
import type { ChildInfo, D1Database } from "./types.ts";

export async function loadSettings(db: D1Database, familyId: string): Promise<FamilySettings> {
  const r = await db.prepare("SELECT settings_json FROM lf_family_settings WHERE family_id=?").bind(familyId).first<{ settings_json: string }>();
  let stored: Partial<FamilySettings> = {};
  if (r) { try { stored = JSON.parse(r.settings_json); } catch { stored = {}; } }
  return mergeSettings(stored);
}

export async function saveSettingsPatch(db: D1Database, familyId: string, patch: Partial<FamilySettings>, now: Date): Promise<void> {
  const r = await db.prepare("SELECT settings_json FROM lf_family_settings WHERE family_id=?").bind(familyId).first<{ settings_json: string }>();
  let stored: Record<string, unknown> = {};
  if (r) { try { stored = JSON.parse(r.settings_json); } catch { stored = {}; } }
  const next = JSON.stringify({ ...stored, ...patch });
  await db.prepare(
    "INSERT INTO lf_family_settings(family_id, settings_json, updated_at) VALUES(?,?,?)" +
    " ON CONFLICT(family_id) DO UPDATE SET settings_json=excluded.settings_json, updated_at=excluded.updated_at",
  ).bind(familyId, next, now.toISOString()).run();
}

export interface MainPet { id: number; species: string; nickname: string; type: string; friendship: number }
export interface Stats { xp: number; friendship: number; main?: MainPet | null }
export async function loadStats(db: D1Database, childId: string): Promise<Stats> {
  const r = await db.prepare("SELECT xp, friendship FROM lf_child_stats WHERE child_id=?").bind(childId).first<Stats>();
  // v2.1: the main pet from storage, if the child has one, is shown as the companion
  const main = await db.prepare("SELECT id, species, nickname, type, friendship FROM lf_pets WHERE child_id=? AND is_main=1").bind(childId).first<MainPet>();
  return { ...(r || { xp: 0, friendship: 0 }), main };
}

export function addStatsStmt(db: D1Database, familyId: string, childId: string, xp: number, friendship: number, now: Date) {
  return db.prepare(
    "INSERT INTO lf_child_stats(child_id, family_id, xp, friendship, updated_at) VALUES(?,?,?,?,?)" +
    " ON CONFLICT(child_id) DO UPDATE SET xp = xp + excluded.xp, friendship = friendship + excluded.friendship, updated_at = excluded.updated_at",
  ).bind(childId, familyId, xp, friendship, now.toISOString());
}

export function childPublic(c: ChildInfo, st: Stats, s: FamilySettings) {
  const xp = typeof c.xp === "number" ? c.xp : st.xp;
  const per = Math.max(1, s.xp_per_level);
  return {
    id: c.id, name: c.name, grade: c.grade ?? 1, lang: c.lang ?? "zh",
    companion: st.main ? (st.main.nickname || st.main.species) : (c.companion ?? ""),
    companion_type: st.main?.type || c.companion_type || "electric",
    main_pet: st.main ? { id: st.main.id, species: st.main.species, friendship: Math.min(st.main.friendship, s.friendship_max), friendship_max: s.friendship_max } : null,
    level: (c.level_base ?? 1) + Math.floor(xp / per), xp, xp_into_level: xp % per, xp_per_level: per,
    friendship: st.friendship,
  };
}

export async function planFromTable(db: D1Database, familyId: string, grade: number): Promise<string[] | null> {
  const r = await db.prepare("SELECT subject FROM lf_plan WHERE family_id=? AND grade=? ORDER BY sort, subject").bind(familyId, grade).all<{ subject: string }>();
  return r.results.length ? r.results.map(x => x.subject) : null;
}

export async function checkinDays(db: D1Database, childId: string, since: string, statuses: string[]): Promise<string[]> {
  const marks = statuses.map(() => "?").join(",");
  const r = await db.prepare(`SELECT DISTINCT day FROM lf_checkins WHERE child_id=? AND day>=? AND status IN (${marks})`)
    .bind(childId, since, ...statuses).all<{ day: string }>();
  return r.results.map(x => x.day);
}

export interface CheckinDbRow {
  id: number; family_id: string; child_id: string; day: string; subject: string; status: "wait" | "ok" | "back";
  feel: string | null; learned: string; photo_id: string | null; audio_id: string | null; audio_secs: number;
  early: number; xp: number | null; reward: string | null; feedback_json: string | null; note: string;
  parent_audio_id: string | null; ai_feedback_json: string | null; legacy_checkin_id: string | null;
  submitted_at: string; reviewed_at: string | null;
}

export interface CardDbRow {
  id: number; family_id: string; child_id: string; kind: string; prompt_en: string; prompt_zh: string; source: string;
  subject: string | null; checkin_id: number | null; step: number; due: string; active: number; created_at: string;
}

export function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}
