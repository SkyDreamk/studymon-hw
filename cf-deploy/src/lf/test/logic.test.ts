import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localDay, localParts, addDays, mondayOf, weekdayMon0, isDay,
  schedule, nextDue, preview,
  streak, weekStrip, weekProgress,
  isEarly, xpForApproval, level, journey, isValidReward,
  cardsFromCheckin, weeklyReport, DEFAULT_SETTINGS, mergeSettings, validateSettingsPatch,
} from "../logic/index.ts";

test("dates: today is computed in the family's time zone, not UTC", () => {
  // 2026-11-18 17:00 UTC is already 01:00 on the 19th in Shanghai, still the 18th in New York
  const t = new Date("2026-11-18T17:00:00Z");
  assert.equal(localDay(t, "Asia/Shanghai"), "2026-11-19");
  assert.equal(localDay(t, "America/New_York"), "2026-11-18");
  assert.deepEqual(localParts(t, "Asia/Shanghai"), { day: "2026-11-19", hour: 1, minute: 0 });
  assert.equal(localParts(new Date("2026-11-18T16:00:00Z"), "Asia/Shanghai").hour, 0); // midnight is 0, not 24
});

test("dates: arithmetic across month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-03-01", -1), "2028-02-29");
  assert.equal(weekdayMon0("2026-11-16"), 0); // Monday
  assert.equal(mondayOf("2026-11-22"), "2026-11-16"); // Sunday -> its Monday
  assert.ok(isDay("2026-11-19"));
  assert.ok(!isDay("2026-13-01x"));
});

test("srs: again resets, good climbs, easy skips, top rung holds", () => {
  const iv = [1, 3, 7, 14, 30];
  assert.deepEqual(schedule(0, "good", iv), { step: 1, days: 3 });
  assert.deepEqual(schedule(0, "easy", iv), { step: 2, days: 7 });
  assert.deepEqual(schedule(3, "again", iv), { step: 0, days: 1 });
  assert.deepEqual(schedule(4, "good", iv), { step: 5, days: 30 });
  assert.deepEqual(nextDue("2026-11-19", 1, "good", iv), { step: 2, days: 7, due: "2026-11-26" });
  assert.deepEqual(preview(0, iv), { again: 1, good: 3, easy: 7 });
  assert.throws(() => schedule(0, "maybe" as never, iv));
  assert.throws(() => schedule(0, "good", []));
});

test("streak: shield forgives one single-day gap per week and does not count", () => {
  const today = "2026-11-19"; // Thursday
  const days = new Set(["2026-11-19", "2026-11-18", "2026-11-16", "2026-11-15"]); // gap on Tue 17th
  assert.equal(streak(days, today, true), 4);
  assert.equal(streak(days, today, false), 2);
  // a second gap in the same week breaks it
  const two = new Set(["2026-11-19", "2026-11-17", "2026-11-15"]);
  assert.equal(streak(two, today, true), 2);
  // not checked in yet today: count from yesterday
  assert.equal(streak(new Set(["2026-11-18", "2026-11-17"]), today, true), 2);
  assert.equal(streak(new Set(), today, true), 0);
});

test("week strip and weekly goal progress", () => {
  const today = "2026-11-19";
  const days = new Set(["2026-11-16", "2026-11-18"]);
  assert.deepEqual(weekStrip(days, today, true), [1, 2, 1, 0, 0, 0, 0]);
  assert.deepEqual(weekStrip(days, today, false), [1, 0, 1, 0, 0, 0, 0]);
  assert.equal(weekProgress(days, today, true), 3);
});

test("rewards: early bonus uses local time before the cut-off", () => {
  const s = DEFAULT_SETTINGS;
  assert.equal(isEarly(s, new Date("2026-11-19T13:29:00Z"), "Asia/Shanghai"), true); // 21:29 local
  assert.equal(isEarly(s, new Date("2026-11-19T13:30:00Z"), "Asia/Shanghai"), false); // 21:30 local
  assert.equal(isEarly({ ...s, early_bonus: false }, new Date("2026-11-19T01:00:00Z"), "Asia/Shanghai"), false);
  assert.equal(xpForApproval(s, true), 48);
  assert.equal(xpForApproval(s, false), 40);
  assert.deepEqual(level(1, 2340, 1000), { level: 3, intoLevel: 340, perLevel: 1000 });
  assert.deepEqual(journey(9, 8, 4), { cleared: 2, total: 8, approvedDays: 9, daysPerGym: 4, daysToNext: 3 });
  assert.equal(journey(40, 8, 4).daysToNext, 0);
  assert.ok(isValidReward(s, "伤药×1"));
  assert.ok(isValidReward(s, null));
  assert.ok(!isValidReward(s, "大师球×99"));
});

test("cards: a check-in makes a retell card, and a tricky one adds an explain card", () => {
  const easy = cardsFromCheckin({ subject: "ma", feel: "easy", learned: "两位数加法", day: "2026-11-19", firstInterval: 1 });
  assert.equal(easy.length, 1);
  assert.equal(easy[0].kind, "retell");
  assert.equal(easy[0].due, "2026-11-20");
  assert.match(easy[0].prompt_zh, /上次你说的是：“两位数加法”。/);
  assert.equal(easy[0].source, "Math · 2026-11-19");
  const hard = cardsFromCheckin({ subject: "en", feel: "hard", learned: "", day: "2026-11-19", firstInterval: 1 });
  assert.equal(hard.length, 2);
  assert.equal(hard[1].kind, "explain");
  assert.match(hard[1].prompt_en, /explain “English” out loud/);
  assert.equal(hard[1].source, "English · 2026-11-19 · tricky");
  assert.throws(() => cardsFromCheckin({ subject: "xx", feel: null, learned: "", day: "2026-11-19", firstInterval: 1 }));
});

test("report: speaking minutes, recall rate, tricky topics", () => {
  const r = weeklyReport("2026-11-13", "2026-11-19", [
    { day: "2026-11-19", subject: "ma", status: "ok", feel: "hard", learned: "分数", audio_key: "a1", audio_secs: 45 },
    { day: "2026-11-18", subject: "ma", status: "wait", feel: "easy", learned: "", audio_key: null, audio_secs: 0 },
    { day: "2026-11-18", subject: "zh", status: "back", feel: null, learned: "", audio_key: "a2", audio_secs: 30 },
    { day: "2026-11-01", subject: "zh", status: "ok", feel: null, learned: "old", audio_key: "a3", audio_secs: 600 },
  ], [
    { day: "2026-11-19", result: "good", audio_secs: 20 },
    { day: "2026-11-19", result: "again", audio_secs: 10 },
    { day: "2026-11-18", result: "easy", audio_secs: 15 },
  ]);
  assert.equal(r.days_checked_in, 2);
  assert.deepEqual(r.subjects.ma, { done: 2, tricky: 1 });
  assert.deepEqual(r.subjects.zh, { done: 0, tricky: 0 });
  assert.equal(r.spoken_minutes, 2); // (45+30+20+10+15)/60
  assert.equal(r.retells, 2);
  assert.equal(r.reviews, 3);
  assert.equal(r.recall_rate, 0.67);
  assert.deepEqual(r.tricky_topics, ["分数"]);
  assert.equal(r.sent_back, 1);
  assert.equal(weeklyReport("2026-11-13", "2026-11-19", [], []).recall_rate, null);
});

test("settings: merge and validation", () => {
  assert.equal(mergeSettings({ weekly_goal: 5 }).weekly_goal, 5);
  assert.equal(mergeSettings(null).early_cutoff, "21:30");
  assert.deepEqual(validateSettingsPatch({ early_cutoff: "20:45", review_intervals: [1, 2, 4] }), { early_cutoff: "20:45", review_intervals: [1, 2, 4] });
  assert.throws(() => validateSettingsPatch({ early_cutoff: "25:00" }));
  assert.throws(() => validateSettingsPatch({ review_intervals: [0] }));
  assert.throws(() => validateSettingsPatch({ weekly_goal: "4" }));
  assert.throws(() => validateSettingsPatch({ is_admin: true }));
  assert.throws(() => validateSettingsPatch({ timezone: "Mars/Base" }));
  assert.deepEqual(validateSettingsPatch({ timezone: "America/Los_Angeles" }), { timezone: "America/Los_Angeles" });
});
