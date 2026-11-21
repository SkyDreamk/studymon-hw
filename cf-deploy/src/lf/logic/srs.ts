// Spaced repetition for the spoken review deck: a simple interval ladder (1, 3, 7, 14, 30 days by default).
// "again" starts over, "good" climbs one rung, "easy" skips a rung. Past the top, cards keep the last interval.
import { addDays, type Day } from "./dates.ts";

export type ReviewResult = "again" | "good" | "easy";
export const RESULTS: ReviewResult[] = ["again", "good", "easy"];

export function schedule(step: number, result: ReviewResult, intervals: number[]): { step: number; days: number } {
  if (!intervals.length) throw new Error("intervals must not be empty");
  let next: number;
  if (result === "again") next = 0;
  else if (result === "good") next = step + 1;
  else if (result === "easy") next = step + 2;
  else throw new Error("result must be again, good or easy");
  return { step: next, days: intervals[Math.min(next, intervals.length - 1)] };
}

export function nextDue(today: Day, step: number, result: ReviewResult, intervals: number[]): { step: number; days: number; due: Day } {
  const s = schedule(step, result, intervals);
  return { ...s, due: addDays(today, s.days) };
}

/** What each button would do, for showing "tomorrow / in 3 days / in 7 days" under the buttons. */
export function preview(step: number, intervals: number[]): Record<ReviewResult, number> {
  return {
    again: schedule(step, "again", intervals).days,
    good: schedule(step, "good", intervals).days,
    easy: schedule(step, "easy", intervals).days,
  };
}

export function isResult(x: unknown): x is ReviewResult {
  return x === "again" || x === "good" || x === "easy";
}
