// Party and Professor Oak's storage: the main pet plus up to party_max - 1 others travel with the child;
// everything else waits in storage. The Worker enforces the cap in single SQL statements; these helpers
// give the same answers for screens and tests.
import type { FamilySettings } from "./settings.ts";

export type Place = "party" | "warehouse";

export interface PetLike { id: number | string; species: string; place: Place; is_main: boolean | number }

export function partyCap(s: Pick<FamilySettings, "party_max">): number {
  return Math.max(1, Math.floor(s.party_max));
}

export function placeForNewPet(partyCount: number, cap: number): Place {
  return partyCount < cap ? "party" : "warehouse";
}

export function canWithdraw(partyCount: number, cap: number): boolean {
  return partyCount < cap;
}

/** A party pet can go to storage unless it is the main pet. */
export function canDeposit(pet: PetLike): boolean {
  return pet.place === "party" && !pet.is_main;
}

/** One line per species the child owns, with how many and how many travel in the party. */
export function speciesSummary(pets: PetLike[]): { species: string; owned: number; in_party: number }[] {
  const m = new Map<string, { species: string; owned: number; in_party: number }>();
  for (const p of pets) {
    const e = m.get(p.species) ?? { species: p.species, owned: 0, in_party: 0 };
    e.owned++;
    if (p.place === "party") e.in_party++;
    m.set(p.species, e);
  }
  return [...m.values()].sort((a, b) => a.species.localeCompare(b.species));
}

/** Checks a whole roster: party within the cap, exactly one main pet when the party has anyone, main in the party. */
export function checkRoster(pets: PetLike[], cap: number): string[] {
  const errs: string[] = [];
  const party = pets.filter(p => p.place === "party");
  const mains = pets.filter(p => !!p.is_main);
  if (party.length > cap) errs.push(`party has ${party.length}, cap is ${cap}`);
  if (party.length && mains.length !== 1) errs.push(`party needs exactly one main pet, has ${mains.length}`);
  if (mains.some(p => p.place !== "party")) errs.push("main pet must be in the party");
  return errs;
}
