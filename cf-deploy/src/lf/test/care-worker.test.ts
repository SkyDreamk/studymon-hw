// v2.1 routes: care room, Professor Oak's storage, the party cap, wheel chances and the battle hook.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearningRoutes, type LearningOptions } from "../worker/index.ts";
import type { ChildInfo } from "../worker/types.ts";
import { makeD1, makeR2 } from "./shims.ts";

const KIDS: Record<string, ChildInfo[]> = {
  f1: [{ id: "c1", name: "Mia", grade: 2, lang: "zh" }, { id: "c2", name: "Leo", grade: 4, lang: "en" }],
  f2: [{ id: "c9", name: "Other", grade: 2 }],
};
const T0 = Date.parse("2026-11-19T12:00:00Z"); // 20:00 Shanghai

function setup(extra: Partial<LearningOptions> = {}) {
  const db = makeD1(["0001_learning_features.sql", "0002_care_and_storage.sql"].map(f => new URL("../migrations/" + f, import.meta.url).pathname));
  let clock = T0;
  const chances: { key: string; wheel: string; child: string }[] = [];
  let wheelAnswer: boolean | "throw" = true;
  const app = createLearningRoutes({
    getSession: async req => {
      const s = req.headers.get("X-Test-Session");
      if (!s) return null;
      const [familyId, role] = s.split(":");
      return { familyId, parentUnlocked: role === "parent" };
    },
    children: { list: async f => KIDS[f] ?? [], get: async (f, id) => (KIDS[f] ?? []).find(k => k.id === id) ?? null },
    hooks: {
      // stand-in for the site's own wheel code and chances table: one chance per idempotency key
      grantWheelChance: async a => {
        if (wheelAnswer === "throw") throw new Error("wheel down");
        if (!wheelAnswer) return false;
        if (!chances.some(c => c.key === a.idempotencyKey)) chances.push({ key: a.idempotencyKey, wheel: a.wheel, child: a.child.id });
        return true;
      },
    },
    now: () => new Date(clock),
    ...extra,
  });
  const env = { DB: db, MEDIA: makeR2() };
  const exec = { waitUntil: () => {} };
  async function j(method: string, path: string, opts: { who?: string; body?: unknown } = {}) {
    const headers: Record<string, string> = { "X-Requested-With": "checkin", "X-Test-Session": opts.who ?? "f1:child" };
    let body: string | undefined;
    if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers["Content-Type"] = "application/json"; }
    const res = (await app.handle(new Request("https://checkin.example/api/lf" + path, { method, headers, body }), env, exec))!;
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }
  const give = (n: number, child = "c1", family = "f1") => Promise.all(Array.from({ length: n }, (_, i) =>
    app.grantPet(env, { familyId: family, childId: child, species: `Mon${i + 1}`, type: "grass", source: "egg", sourceId: `${child}-e${i + 1}` })));
  const items = (itemId: string, qty: number, sourceId: string, child = "c1") => app.grantCareItem(env, { familyId: "f1", childId: child, itemId, qty, sourceId });
  return { app, env, db, j, give, items, chances, setWheel: (v: boolean | "throw") => { wheelAnswer = v; }, setClock: (t: number) => { clock = t; } };
}

const partyCount = (db: ReturnType<typeof setup>["db"], child = "c1") =>
  (db.raw.prepare("SELECT COUNT(*) n FROM lf_pets WHERE child_id=? AND place='party'").get(child) as { n: number }).n;

test("new pets fill the party up to party_max (5), then go to storage; the first is the main pet", async () => {
  const t = setup();
  const out = [];
  for (let i = 1; i <= 7; i++) out.push(await t.app.grantPet(t.env, { familyId: "f1", childId: "c1", species: `Mon${i}`, source: "egg", sourceId: `e${i}` }));
  assert.deepEqual(out.map(o => o.place), ["party", "party", "party", "party", "party", "warehouse", "warehouse"]);
  assert.deepEqual(out.map(o => o.is_main), [true, false, false, false, false, false, false]);
  const again = await t.app.grantPet(t.env, { familyId: "f1", childId: "c1", species: "Mon1", source: "egg", sourceId: "e1" });
  assert.equal(again.created, false, "same egg twice adds the pet once");
  const r = await t.j("GET", "/children/c1/pets");
  assert.equal(r.status, 200);
  assert.equal(r.body.cap, 5);
  assert.equal(r.body.party.length, 5);
  assert.equal(r.body.warehouse.length, 2);
  assert.equal(r.body.party[0].is_main, true);
  assert.equal(r.body.species.length, 7, "storage lists every owned species");
});

test("withdraw is refused when the party is full, even when many requests arrive at once", async () => {
  const t = setup();
  await t.give(9); // 5 in the party, 4 in storage
  const stored = (await t.j("GET", "/children/c1/pets")).body.warehouse;
  const results = await Promise.all(stored.map((p: { id: number }) => t.j("POST", `/children/c1/pets/${p.id}/withdraw`)));
  assert.ok(results.every(r => r.status === 409));
  assert.equal(partyCount(t.db), 5);

  const party = (await t.j("GET", "/children/c1/pets")).body.party;
  const dep = await t.j("POST", `/children/c1/pets/${party[1].id}/deposit`);
  assert.equal(dep.status, 200);
  assert.equal(dep.body.party_count, 4);
  // one free seat, four pets racing for it: exactly one gets in
  const race = await Promise.all(stored.map((p: { id: number }) => t.j("POST", `/children/c1/pets/${p.id}/withdraw`)));
  assert.equal(race.filter(r => r.status === 200).length, 1);
  assert.equal(partyCount(t.db), 5);
});

test("a lower party_max blocks withdrawals until the party is back under it", async () => {
  const t = setup();
  await t.give(6);
  assert.equal((await t.j("PUT", "/parent/settings", { who: "f1:parent", body: { party_max: 3 } })).status, 200);
  const r = await t.j("GET", "/children/c1/pets");
  assert.equal(r.body.cap, 3);
  assert.equal(r.body.party.length, 5, "nobody is moved out automatically");
  assert.equal((await t.j("POST", `/children/c1/pets/${r.body.warehouse[0].id}/withdraw`)).status, 409);
  const next = await t.app.grantPet(t.env, { familyId: "f1", childId: "c1", species: "Late", source: "egg", sourceId: "late" });
  assert.equal(next.place, "warehouse");
});

test("swap moves one pet each way in one write, keeps the count, and never moves the main pet", async () => {
  const t = setup();
  await t.give(7);
  let r = (await t.j("GET", "/children/c1/pets")).body;
  const main = r.party[0], out = r.party[2], inn = r.warehouse[0];
  const s = await t.j("POST", "/children/c1/pets/swap", { body: { party_pet_id: out.id, warehouse_pet_id: inn.id } });
  assert.equal(s.status, 200);
  assert.ok(s.body.party.some((p: { id: number }) => p.id === inn.id));
  assert.ok(s.body.warehouse.some((p: { id: number }) => p.id === out.id));
  assert.equal(s.body.party.find((p: { id: number }) => p.id === inn.id).party_order, out.party_order, "takes the same seat");
  assert.equal(partyCount(t.db), 5);
  assert.equal((await t.j("POST", "/children/c1/pets/swap", { body: { party_pet_id: main.id, warehouse_pet_id: out.id } })).status, 409);
  // the same swap sent twice at once: one goes through, the other finds the pets already moved
  r = (await t.j("GET", "/children/c1/pets")).body;
  const body = { party_pet_id: r.party[1].id, warehouse_pet_id: r.warehouse[0].id };
  const both = await Promise.all([t.j("POST", "/children/c1/pets/swap", { body }), t.j("POST", "/children/c1/pets/swap", { body })]);
  assert.deepEqual(both.map(x => x.status).sort(), [200, 409]);
  assert.equal(partyCount(t.db), 5);
  // deposit of the main pet is refused; after choosing another main it is allowed
  assert.equal((await t.j("POST", `/children/c1/pets/${main.id}/deposit`)).status, 409);
  const other = (await t.j("GET", "/children/c1/pets")).body.party[1];
  const m = await t.j("POST", `/children/c1/pets/${other.id}/main`);
  assert.equal(m.status, 200);
  assert.equal(m.body.party.filter((p: { is_main: boolean }) => p.is_main).length, 1);
  assert.equal(m.body.party[0].id, other.id);
  assert.equal((await t.j("POST", `/children/c1/pets/${main.id}/deposit`)).status, 200);
  // a stored pet cannot become main
  const stored = (await t.j("GET", "/children/c1/pets")).body.warehouse[0];
  assert.equal((await t.j("POST", `/children/c1/pets/${stored.id}/main`)).status, 409);
});

test("care: feeding and bathing add friendship from settings, use one item, and stop at the max", async () => {
  const t = setup();
  await t.give(1);
  await t.items("oran_berry", 3, "spin-1");
  await t.items("oran_berry", 3, "spin-1"); // the same prize twice adds it once
  await t.items("bubble_soap", 1, "spin-2");
  let room = (await t.j("GET", "/children/c1/care")).body;
  assert.equal(room.items.find((i: { id: string }) => i.id === "oran_berry").qty, 3);
  const pet = room.pets[0];
  const f = await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "oran_berry" } });
  assert.equal(f.status, 200);
  assert.equal(f.body.pet.friendship, 10);
  assert.equal(f.body.pet.gained, 10);
  assert.equal(f.body.item.left, 2);
  const b = await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "bubble_soap" } });
  assert.equal(b.body.pet.friendship, 20);
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "bubble_soap" } })).status, 409, "none left");

  await t.j("PUT", "/parent/settings", { who: "f1:parent", body: { friendship_per_feed: 7, friendship_max: 30 } });
  assert.equal((await t.j("PUT", "/parent/settings", { who: "f1:parent", body: { friendship_start: 40 } })).status, 400, "start above the saved max");
  const g = await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "oran_berry" } });
  assert.equal(g.body.pet.friendship, 27);
  const h = await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "oran_berry" } });
  assert.equal(h.body.pet.friendship, 30);
  assert.equal(h.body.pet.full, true);
  await t.items("oran_berry", 1, "spin-3");
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "oran_berry" } })).status, 409, "already full");
  room = (await t.j("GET", "/children/c1/care")).body;
  assert.equal(room.items.find((i: { id: string }) => i.id === "oran_berry").qty, 1, "a refused care action keeps the item");
});

test("care: party only by default, can be switched off, and unknown items are refused", async () => {
  const t = setup();
  await t.give(6);
  await t.items("poke_puff", 5, "s1");
  const stored = (await t.j("GET", "/children/c1/pets")).body.warehouse[0];
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: stored.id, item_id: "poke_puff" } })).status, 409);
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: stored.id, item_id: "rare_candy" } })).status, 400);
  await t.j("PUT", "/parent/settings", { who: "f1:parent", body: { care_party_only: false } });
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: stored.id, item_id: "poke_puff" } })).status, 200);
  await t.j("PUT", "/parent/settings", { who: "f1:parent", body: { care_enabled: false } });
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: stored.id, item_id: "poke_puff" } })).status, 403);
});

test("care-wheel chances: one per care_actions_per_chance actions, capped per day, idempotent, released if the wheel says no", async () => {
  const t = setup();
  await t.give(2);
  await t.items("oran_berry", 20, "s1");
  const pet = (await t.j("GET", "/children/c1/care")).body.pets[0];
  const feed = () => t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "oran_berry" } });
  const a = await feed();
  assert.deepEqual(a.body.wheel_chance, { wheel: "care", due: false, granted: false });
  const b = await feed();
  assert.deepEqual(b.body.wheel_chance, { wheel: "care", due: true, granted: true });
  assert.equal(t.chances.length, 1);
  assert.equal(t.chances[0].wheel, "care");
  for (let i = 0; i < 4; i++) await feed();
  assert.equal(t.chances.length, 1, "care_wheel_chances_per_day (1) caps the day");

  t.setClock(T0 + 86400000);
  t.setWheel(false); // the site's daily-practice rules say no today
  await feed();
  const c = await feed();
  assert.deepEqual(c.body.wheel_chance, { wheel: "care", due: true, granted: false });
  t.setWheel("throw");
  await feed();
  const d = await feed();
  assert.equal(d.body.status ?? d.status, 200, "a failing wheel never breaks the care action");
  assert.equal(d.body.wheel_chance.granted, false);
  t.setWheel(true);
  await feed();
  const e = await feed();
  assert.equal(e.body.wheel_chance.granted, true, "the day's chance was released each time the wheel did not add it");
  assert.equal(t.chances.length, 2);
  assert.ok(new Set(t.chances.map(x => x.key)).size === 2);

  await t.j("PUT", "/parent/settings", { who: "f1:parent", body: { care_wheel: "ordinary", care_actions_per_chance: 1, care_wheel_chances_per_day: 3 } });
  t.setClock(T0 + 2 * 86400000);
  await feed(); await feed(); await feed(); await feed();
  assert.deepEqual(t.chances.slice(2).map(x => x.wheel), ["ordinary", "ordinary", "ordinary"]);
});

test("battle effect: friendship tiers apply in solo gym battles only", async () => {
  const t = setup();
  const p = await t.app.grantPet(t.env, { familyId: "f1", childId: "c1", species: "Pikachu", source: "egg", sourceId: "p", friendship: 200 });
  const solo = await t.app.friendshipEffect(t.env, { familyId: "f1", petId: p.id, mode: "solo_gym" });
  assert.equal(solo.applies, true);
  assert.equal(solo.tier_min, 180);
  assert.equal(solo.attack_pct, 5);
  for (const mode of ["pvp", "coop", "co-op", "raid", "SOLO_GYM", "", "solo_gym "]) {
    const e = await t.app.friendshipEffect(t.env, { familyId: "f1", petId: p.id, mode });
    assert.equal(e.applies, false, mode);
    assert.equal(e.attack_pct + e.crit_pct + e.endure_pct, 0, mode);
  }
  assert.equal((await t.app.friendshipEffect(t.env, { familyId: "f2", petId: p.id, mode: "solo_gym" })).applies, false, "another family's pet gets nothing");
  const route = await t.j("GET", `/children/c1/pets/${p.id}/battle-effect?mode=pvp`);
  assert.equal(route.body.applies, false);
  assert.equal((await t.j("GET", `/children/c1/pets/${p.id}/battle-effect?mode=solo_gym`)).body.crit_pct, 5);
});

test("review deck friendship also goes to the main pet, and the main pet shows as the companion", async () => {
  const t = setup();
  await t.give(2);
  await t.j("POST", "/parent/cards", { who: "f1:parent", body: { child_id: "c1", prompt_en: "Say hello", kind: "say" } });
  const card = (await t.j("GET", "/children/c1/deck")).body.cards[0];
  assert.equal((await t.j("POST", `/cards/${card.id}/review`, { body: { result: "good" } })).status, 200);
  const pets = (await t.j("GET", "/children/c1/pets")).body.party;
  assert.equal(pets[0].friendship, 1);
  assert.equal(pets[1].friendship, 0);
  const kid = (await t.j("GET", "/children")).body.children.find((k: { id: string }) => k.id === "c1");
  assert.equal(kid.companion, "Mon1");
  assert.equal(kid.main_pet.friendship, 1);
});

test("existing pets are imported once; families and children stay apart; parent gifts need the gate", async () => {
  const t = setup({ existingPets: async (_f, childId) => (childId === "c1" ? [{ id: "77", species: "Bulbasaur", type: "grass", friendship: 40 }] : []) });
  await t.j("GET", "/children/c1/pets");
  const r = await t.j("GET", "/children/c1/pets");
  assert.equal(r.body.party.length, 1);
  assert.equal(r.body.party[0].species, "Bulbasaur");
  assert.equal(r.body.party[0].friendship, 40);
  const id = r.body.party[0].id;
  assert.equal((await t.j("POST", `/children/c2/pets/${id}/main`)).status, 404, "another child's pet");
  assert.equal((await t.j("GET", "/children/c9/pets")).status, 404, "another family's child");
  assert.equal((await t.j("POST", `/children/c1/pets/${id}/deposit`, { who: "f2:child" })).status, 404);
  assert.equal((await t.j("POST", "/children/c1/care", { who: "f2:child", body: { pet_id: id, item_id: "oran_berry" } })).status, 404);
  assert.equal((await t.j("POST", "/parent/pets", { body: { child_id: "c2", species: "Eevee" } })).status, 403);
  const g = await t.j("POST", "/parent/pets", { who: "f1:parent", body: { child_id: "c2", species: "Eevee", source_id: "gift-1" } });
  assert.equal(g.status, 201);
  assert.equal(g.body.pet.place, "party");
  assert.equal((await t.j("POST", "/parent/care-items", { who: "f1:parent", body: { child_id: "c2", item_id: "soft_towel", qty: 2, source_id: "g2" } })).status, 201);
  assert.equal((await t.j("POST", "/parent/care-items", { who: "f1:parent", body: { child_id: "c2", item_id: "soft_towel", qty: 2, source_id: "g2" } })).status, 200);
  assert.equal((await t.j("GET", "/children/c2/care")).body.items.find((i: { id: string }) => i.id === "soft_towel").qty, 2);
});

test("a custom care inventory (your wheel's items) is used instead of the built-in table", async () => {
  const stock = new Map([["c1:poke_puff", 1]]);
  const t = setup({
    careInventory: {
      list: async (_f, c) => [...stock].filter(([k, q]) => k.startsWith(c + ":") && q > 0).map(([k, qty]) => ({ item_id: k.split(":")[1], qty })),
      consume: async (_f, c, i) => { const q = stock.get(`${c}:${i}`) ?? 0; if (q < 1) return false; stock.set(`${c}:${i}`, q - 1); return true; },
      refund: async (_f, c, i) => { stock.set(`${c}:${i}`, (stock.get(`${c}:${i}`) ?? 0) + 1); },
    },
  });
  await t.give(1);
  const pet = (await t.j("GET", "/children/c1/care")).body.pets[0];
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "poke_puff" } })).body.pet.friendship, 10);
  assert.equal(stock.get("c1:poke_puff"), 0);
  assert.equal((await t.j("POST", "/children/c1/care", { body: { pet_id: pet.id, item_id: "poke_puff" } })).status, 409);
  assert.equal((await t.j("POST", "/parent/care-items", { who: "f1:parent", body: { child_id: "c1", item_id: "poke_puff", qty: 1 } })).status, 409,
    "gifts go to your own inventory, not the built-in table");
});
