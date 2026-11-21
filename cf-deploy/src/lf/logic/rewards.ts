// XP, early-bird bonus, levels and gym progress.
import { localParts } from "./dates.ts";
import type { FamilySettings } from "./settings.ts";

export function isEarly(s: Pick<FamilySettings, "early_bonus" | "early_cutoff">, now: Date, tz: string): boolean {
  if (!s.early_bonus) return false;
  const [h, m] = s.early_cutoff.split(":").map(Number);
  const p = localParts(now, tz);
  return p.hour < h || (p.hour === h && p.minute < m);
}

export function xpForApproval(s: Pick<FamilySettings, "xp_per_checkin" | "early_multiplier">, early: boolean): number {
  return early ? Math.round(s.xp_per_checkin * s.early_multiplier) : s.xp_per_checkin;
}

export function level(levelBase: number, xp: number, xpPerLevel: number): { level: number; intoLevel: number; perLevel: number } {
  const per = Math.max(1, xpPerLevel);
  return { level: levelBase + Math.floor(xp / per), intoLevel: xp % per, perLevel: per };
}

export interface JourneyState { cleared: number; total: number; approvedDays: number; daysPerGym: number; daysToNext: number }

export function journey(approvedDays: number, totalGyms: number, daysPerGym: number): JourneyState {
  const per = Math.max(1, daysPerGym);
  const cleared = Math.min(totalGyms, Math.floor(approvedDays / per));
  return { cleared, total: totalGyms, approvedDays, daysPerGym: per, daysToNext: cleared >= totalGyms ? 0 : per - (approvedDays % per) };
}

export function isValidReward(s: Pick<FamilySettings, "rewards">, reward: string | null | undefined): boolean {
  return reward == null || reward === "" || s.rewards.includes(reward);
}
