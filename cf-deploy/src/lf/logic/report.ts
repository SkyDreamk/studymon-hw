// Weekly speaking and review report, computed from plain rows so it works on D1 results or anything else.
import type { Day } from "./dates.ts";
import { SUBJECTS, type Subject } from "./settings.ts";

export interface CheckinRow { day: Day; subject: string; status: "wait" | "ok" | "back"; feel: string | null; learned: string; audio_key: string | null; audio_secs: number }
export interface ReviewRow { day: Day; result: "again" | "good" | "easy"; audio_secs: number }

export interface WeeklyReport {
  from: Day; to: Day;
  days_checked_in: number;
  subjects: Record<string, { done: number; tricky: number }>;
  spoken_minutes: number;
  retells: number;
  reviews: number;
  recall_rate: number | null;
  tricky_topics: string[];
  sent_back: number;
}

export function weeklyReport(from: Day, to: Day, checkins: CheckinRow[], reviews: ReviewRow[], subjects: Subject[] = SUBJECTS): WeeklyReport {
  const inRange = <T extends { day: Day }>(r: T) => r.day >= from && r.day <= to;
  const cks = checkins.filter(inRange);
  const rvs = reviews.filter(inRange);
  const counted = (c: CheckinRow) => c.status === "ok" || c.status === "wait";
  const bySubject: WeeklyReport["subjects"] = {};
  for (const s of subjects) {
    const sc = cks.filter(c => c.subject === s.id);
    bySubject[s.id] = { done: new Set(sc.filter(counted).map(c => c.day)).size, tricky: sc.filter(c => c.feel === "hard").length };
  }
  const spokenSecs = cks.reduce((a, c) => a + (c.audio_secs || 0), 0) + rvs.reduce((a, r) => a + (r.audio_secs || 0), 0);
  const recalled = rvs.filter(r => r.result !== "again").length;
  return {
    from, to,
    days_checked_in: new Set(cks.filter(counted).map(c => c.day)).size,
    subjects: bySubject,
    spoken_minutes: Math.round((spokenSecs / 60) * 10) / 10,
    retells: cks.filter(c => c.audio_key).length,
    reviews: rvs.length,
    recall_rate: rvs.length ? Math.round((recalled / rvs.length) * 100) / 100 : null,
    tricky_topics: cks.filter(c => c.feel === "hard" && c.learned).map(c => c.learned).slice(0, 5),
    sent_back: cks.filter(c => c.status === "back").length,
  };
}
