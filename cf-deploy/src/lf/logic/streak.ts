// Streaks with shield days: with shields on, one single-day gap per ISO week (Mon–Sun) keeps the streak alive.
// A shield day keeps the streak but does not add to it.
import { addDays, mondayOf, type Day } from "./dates.ts";

export function streak(days: Set<Day>, today: Day, shield: boolean): number {
  let cur = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  const used = new Set<Day>(); // Monday of each week whose shield was spent
  for (let i = 0; i < 3660; i++) {
    if (days.has(cur)) {
      count++;
    } else {
      const wk = mondayOf(cur);
      if (shield && !used.has(wk) && days.has(addDays(cur, -1))) used.add(wk);
      else break;
    }
    cur = addDays(cur, -1);
  }
  return count;
}

/** Mon..Sun of today's week: 1 = checked in, 2 = shield day used, 0 = not (yet). */
export function weekStrip(days: Set<Day>, today: Day, shield: boolean): number[] {
  const mon = mondayOf(today);
  const out: number[] = [];
  let used = false;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    if (days.has(d)) out.push(1);
    else if (shield && !used && d < today) { out.push(2); used = true; }
    else out.push(0);
  }
  return out;
}

/** Days checked in this week, counting a used shield day, for the "4 days a week" goal. */
export function weekProgress(days: Set<Day>, today: Day, shield: boolean): number {
  return weekStrip(days, today, shield).filter(v => v > 0).length;
}
