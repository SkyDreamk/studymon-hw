// Care play: feeding and bathing companions raises friendship (0..friendship_max, +10 each by default),
// care earns Care-wheel chances within a daily limit, and friendship gives a bonus in solo gym battles only.
import type { BattleTier, CareItem, FamilySettings } from "./settings.ts";

export type CareKind = "food" | "bath";

export function findCareItem(s: Pick<FamilySettings, "care_items">, id: string): CareItem | null {
  return s.care_items.find(x => x.id === id) ?? null;
}

/** Friendship one use of this item gives. An item's own "gain" wins over the per-kind setting. */
export function careGain(item: CareItem, s: Pick<FamilySettings, "friendship_per_feed" | "friendship_per_bath">): number {
  if (typeof item.gain === "number") return item.gain;
  return item.kind === "food" ? s.friendship_per_feed : s.friendship_per_bath;
}

export function clampFriendship(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

/** New friendship after a care action, and how much it actually went up (less near the top). */
export function applyCare(current: number, gain: number, max: number): { friendship: number; gained: number; full: boolean } {
  const before = clampFriendship(current, max);
  const after = clampFriendship(before + gain, max);
  return { friendship: after, gained: after - before, full: after >= max };
}

/** For the meter on screen: 0-100 percent and 0-5 hearts. */
export function friendshipMeter(friendship: number, max: number): { value: number; max: number; pct: number; hearts: number } {
  const v = clampFriendship(friendship, max);
  const pct = max > 0 ? Math.round((v / max) * 100) : 0;
  return { value: v, max, pct, hearts: Math.min(5, Math.floor((pct + 1) / 20)) };
}

/**
 * Should this care action earn a Care-wheel chance? Every care_actions_per_chance actions earn one, up to
 * care_wheel_chances_per_day a day. Your own daily-practice rules still have the last word (grantWheelChance hook).
 * actionsToday counts this action too.
 */
export function careChanceDue(actionsToday: number, chancesToday: number,
  s: Pick<FamilySettings, "care_wheel_chances_per_day" | "care_actions_per_chance">): boolean {
  if (s.care_wheel_chances_per_day <= 0) return false;
  if (chancesToday >= s.care_wheel_chances_per_day) return false;
  const per = Math.max(1, s.care_actions_per_chance);
  return actionsToday > 0 && actionsToday % per === 0;
}

// ------------------------------------------------------------------ battles

/** The only battle mode friendship affects. PvP, co-op and anything unknown always get no bonus. */
export const FRIENDSHIP_BATTLE_MODE = "solo_gym";

export interface FriendshipEffect { applies: boolean; mode: string; tier_min: number | null; attack_pct: number; crit_pct: number; endure_pct: number }

const NONE = (mode: string): FriendshipEffect => ({ applies: false, mode, tier_min: null, attack_pct: 0, crit_pct: 0, endure_pct: 0 });

/** Bonus from the highest tier reached, in solo gym battles only. Allow-list, so a new mode never gets it by mistake. */
export function friendshipBattleEffect(friendship: number, mode: string, tiers: BattleTier[]): FriendshipEffect {
  if (mode !== FRIENDSHIP_BATTLE_MODE) return NONE(String(mode));
  let best: BattleTier | null = null;
  for (const t of tiers) if (friendship >= t.min && (!best || t.min > best.min)) best = t;
  if (!best) return NONE(mode);
  return { applies: true, mode, tier_min: best.min, attack_pct: best.attack_pct, crit_pct: best.crit_pct, endure_pct: best.endure_pct };
}
