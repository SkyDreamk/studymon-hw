import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS, validateSettingsPatch, findCareItem, careGain, applyCare, friendshipMeter, careChanceDue,
  friendshipBattleEffect, FRIENDSHIP_BATTLE_MODE, partyCap, placeForNewPet, canWithdraw, canDeposit, speciesSummary, checkRoster,
} from "../logic/index.ts";

const S = DEFAULT_SETTINGS;

test("care: feeding and bathing give +10 by default, an item can override it", () => {
  const berry = findCareItem(S, "oran_berry")!;
  const soap = findCareItem(S, "bubble_soap")!;
  assert.equal(careGain(berry, S), 10);
  assert.equal(careGain(soap, S), 10);
  assert.equal(careGain({ ...berry, gain: 25 }, S), 25);
  assert.equal(careGain(berry, { ...S, friendship_per_feed: 3 }), 3);
  assert.equal(findCareItem(S, "rare_candy"), null);
});

test("care: friendship stays within 0..max and reports what was really gained", () => {
  assert.deepEqual(applyCare(0, 10, 255), { friendship: 10, gained: 10, full: false });
  assert.deepEqual(applyCare(250, 10, 255), { friendship: 255, gained: 5, full: true });
  assert.deepEqual(applyCare(255, 10, 255), { friendship: 255, gained: 0, full: true });
  assert.deepEqual(applyCare(300, 0, 255), { friendship: 255, gained: 0, full: true }); // lowered max
  assert.deepEqual(applyCare(40, 10, 100), { friendship: 50, gained: 10, full: false });
});

test("care: meter percent and hearts", () => {
  assert.deepEqual(friendshipMeter(0, 255), { value: 0, max: 255, pct: 0, hearts: 0 });
  assert.deepEqual(friendshipMeter(128, 255), { value: 128, max: 255, pct: 50, hearts: 2 });
  assert.deepEqual(friendshipMeter(255, 255), { value: 255, max: 255, pct: 100, hearts: 5 });
});

test("care: wheel chances follow the per-chance count and the daily limit", () => {
  const s = { care_wheel_chances_per_day: 2, care_actions_per_chance: 2 };
  assert.equal(careChanceDue(1, 0, s), false);
  assert.equal(careChanceDue(2, 0, s), true);
  assert.equal(careChanceDue(3, 1, s), false);
  assert.equal(careChanceDue(4, 1, s), true);
  assert.equal(careChanceDue(6, 2, s), false); // daily limit reached
  assert.equal(careChanceDue(1, 0, { care_wheel_chances_per_day: 0, care_actions_per_chance: 1 }), false);
  assert.equal(careChanceDue(1, 0, { care_wheel_chances_per_day: 1, care_actions_per_chance: 1 }), true);
});

test("battle: friendship helps in solo gym battles only", () => {
  const tiers = S.battle_friendship_tiers;
  assert.equal(FRIENDSHIP_BATTLE_MODE, "solo_gym");
  assert.deepEqual(friendshipBattleEffect(200, "solo_gym", tiers), { applies: true, mode: "solo_gym", tier_min: 180, attack_pct: 5, crit_pct: 5, endure_pct: 5 });
  assert.equal(friendshipBattleEffect(255, "solo_gym", tiers).attack_pct, 10);
  assert.equal(friendshipBattleEffect(50, "solo_gym", tiers).applies, false);
  for (const mode of ["pvp", "coop", "co-op", "SOLO_GYM", "solo_gym ", "", "raid"]) {
    const e = friendshipBattleEffect(255, mode, tiers);
    assert.equal(e.applies, false, mode);
    assert.equal(e.attack_pct + e.crit_pct + e.endure_pct, 0, mode);
  }
  // unsorted tiers still pick the highest reached
  assert.equal(friendshipBattleEffect(200, "solo_gym", [tiers[2], tiers[0], tiers[1]]).tier_min, 180);
});

test("party: cap of main + 4, new pets overflow to storage", () => {
  assert.equal(partyCap(S), 5);
  assert.equal(partyCap({ party_max: 0 }), 1);
  assert.equal(placeForNewPet(4, 5), "party");
  assert.equal(placeForNewPet(5, 5), "warehouse");
  assert.equal(canWithdraw(5, 5), false);
  assert.equal(canWithdraw(3, 5), true);
  assert.equal(canDeposit({ id: 1, species: "皮卡丘", place: "party", is_main: 1 }), false);
  assert.equal(canDeposit({ id: 2, species: "伊布", place: "party", is_main: 0 }), true);
  assert.equal(canDeposit({ id: 3, species: "伊布", place: "warehouse", is_main: 0 }), false);
});

test("party: species list and roster checks", () => {
  const pets = [
    { id: 1, species: "皮卡丘", place: "party" as const, is_main: true },
    { id: 2, species: "伊布", place: "party" as const, is_main: false },
    { id: 3, species: "伊布", place: "warehouse" as const, is_main: false },
  ];
  assert.deepEqual(speciesSummary(pets), [{ species: "伊布", owned: 2, in_party: 1 }, { species: "皮卡丘", owned: 1, in_party: 1 }]);
  assert.deepEqual(checkRoster(pets, 5), []);
  assert.equal(checkRoster(pets, 1).length, 1);
  assert.equal(checkRoster([{ ...pets[0], is_main: false }], 5).length, 1);
  assert.equal(checkRoster([{ ...pets[0], place: "warehouse" }], 5).length, 1);
});

test("settings: care and party numbers are validated", () => {
  assert.deepEqual(validateSettingsPatch({ friendship_per_feed: 15, party_max: 6 }), { friendship_per_feed: 15, party_max: 6 });
  assert.throws(() => validateSettingsPatch({ party_max: 0 }));
  assert.throws(() => validateSettingsPatch({ party_max: 4.5 }));
  assert.throws(() => validateSettingsPatch({ friendship_max: 0 }));
  assert.throws(() => validateSettingsPatch({ friendship_max: 100, friendship_start: 150 }));
  assert.throws(() => validateSettingsPatch({ care_actions_per_chance: 0 }));
  assert.throws(() => validateSettingsPatch({ care_wheel: "care wheel!" }));
  assert.ok(validateSettingsPatch({ care_items: [{ id: "apple", zh: "苹果", en: "Apple", kind: "food", gain: 12 }] }));
  assert.throws(() => validateSettingsPatch({ care_items: [{ id: "apple", zh: "苹果", en: "Apple", kind: "toy" }] }));
  assert.throws(() => validateSettingsPatch({ care_items: [{ id: "a", zh: "x", en: "x", kind: "food" }, { id: "a", zh: "y", en: "y", kind: "bath" }] }));
  assert.throws(() => validateSettingsPatch({ care_items: [{ id: "a", zh: "x", en: "x", kind: "food", script: "1" }] }));
  assert.ok(validateSettingsPatch({ battle_friendship_tiers: [{ min: 50, attack_pct: 2, crit_pct: 0, endure_pct: 0 }] }));
  assert.throws(() => validateSettingsPatch({ battle_friendship_tiers: [{ min: 50, attack_pct: 200, crit_pct: 0, endure_pct: 0 }] }));
  assert.throws(() => validateSettingsPatch({ battle_friendship_tiers: [{ min: 90, attack_pct: 1, crit_pct: 0, endure_pct: 0 }, { min: 50, attack_pct: 1, crit_pct: 0, endure_pct: 0 }] }));
});
