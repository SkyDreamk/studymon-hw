// Calendar helpers. Dates are plain "YYYY-MM-DD" strings in the family's time zone, so the same day
// means the same thing in a Worker (UTC), in China and in the US. No dependencies; runs in Workers and Node.

export type Day = string; // "YYYY-MM-DD"

const partsCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** Local wall-clock parts of an instant in a time zone, e.g. Asia/Shanghai. */
export function localParts(now: Date, tz: string): { day: Day; hour: number; minute: number } {
  const p: Record<string, string> = {};
  for (const x of fmt(tz).formatToParts(now)) p[x.type] = x.value;
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, minute: Number(p.minute) };
}

export function localDay(now: Date, tz: string): Day {
  return localParts(now, tz).day;
}

function toUTC(d: Day): number {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd);
}

export function addDays(d: Day, n: number): Day {
  return new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon0(d: Day): number {
  return (new Date(toUTC(d)).getUTCDay() + 6) % 7;
}

export function mondayOf(d: Day): Day {
  return addDays(d, -weekdayMon0(d));
}

/** Days between two dates, b minus a. */
export function diffDays(a: Day, b: Day): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function isDay(s: unknown): s is Day {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s));
}
