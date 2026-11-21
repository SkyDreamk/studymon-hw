// Turning a check-in into review cards: every check-in gets a retell card that comes back on the first
// interval, quoting what the child said; a "tricky" check-in also gets an "explain it step by step" card.
import { addDays, type Day } from "./dates.ts";
import { RETELL_PROMPTS, SUBJECTS, type Subject } from "./settings.ts";

export type Feel = "easy" | "okay" | "hard";
export type CardKind = "say" | "retell" | "explain";

export interface CardDraft {
  kind: CardKind;
  prompt_en: string;
  prompt_zh: string;
  source: string;
  subject: string;
  due: Day;
}

export function isFeel(x: unknown): x is Feel {
  return x === "easy" || x === "okay" || x === "hard";
}
export function isKind(x: unknown): x is CardKind {
  return x === "say" || x === "retell" || x === "explain";
}

export function cardsFromCheckin(input: {
  subject: string; feel: Feel | null; learned: string; day: Day; firstInterval: number;
  subjects?: Subject[]; prompts?: Record<string, { en: string; zh: string }>;
}): CardDraft[] {
  const subj = (input.subjects || SUBJECTS).find(s => s.id === input.subject);
  if (!subj) throw new Error("unknown subject");
  const prompts = (input.prompts || RETELL_PROMPTS)[input.subject] || { en: "Tell it again.", zh: "再说一遍。" };
  const due = addDays(input.day, input.firstInterval);
  const learned = (input.learned || "").trim().slice(0, 120);
  const source = `${subj.en} · ${input.day}`;
  const out: CardDraft[] = [{
    kind: "retell",
    prompt_en: prompts.en + (learned ? ` Last time you said: “${learned}”.` : ""),
    prompt_zh: prompts.zh + (learned ? ` 上次你说的是：“${learned}”。` : ""),
    source, subject: subj.id, due,
  }];
  if (input.feel === "hard") {
    out.push({
      kind: "explain",
      prompt_en: `This felt tricky: explain “${learned || subj.en}” out loud, step by step.`,
      prompt_zh: `这个有点难：一步一步讲讲“${learned || subj.zh}”。`,
      source: source + " · tricky", subject: subj.id, due,
    });
  }
  return out;
}
