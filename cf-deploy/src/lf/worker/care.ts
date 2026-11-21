// v2.1: care play and Professor Oak's storage.
// The party cap and the main-pet rule are enforced inside single SQL statements (or one D1 batch), so two quick
// taps, two tabs or a retried request can never put more than party_max pets in the party.
import {
  careChanceDue, careGain, findCareItem, friendshipBattleEffect, friendshipMeter, partyCap, speciesSummary,
  type FamilySettings, type FriendshipEffect,
} from "../logic/index.ts";
import { ApiError, json, num, readJson, str } from "./http.ts";
import { loadSettings } from "./store.ts";
import type { Ctx, Route } from "./routes.ts";
import type { CareInventory, ChildInfo, D1Database, ExistingPet } from "./types.ts";

export interface PetRow {
  id: number; family_id: string; child_id: string; species: string; nickname: string; type: string; friendship: number;
  place: "party" | "warehouse"; is_main: number; party_order: number; source: string; source_id: string; created_at: string; updated_at: string;
}

const SOURCE = /^[A-Za-z0-9_.:-]{1,64}$/;

export function petOut(p: PetRow, s: FamilySettings) {
  return {
    id: p.id, species: p.species, nickname: p.nickname, type: p.type, place: p.place, is_main: !!p.is_main,
    party_order: p.party_order, friendship: Math.min(p.friendship, s.friendship_max), meter: friendshipMeter(p.friendship, s.friendship_max),
  };
}

// ------------------------------------------------------------------ server-side functions your other code calls

/**
 * Give a child a pet, e.g. from a wheel prize or an egg hatching. It joins the party if there is room
 * (becoming the main pet if there is none), otherwise it goes to storage. Same source + sourceId twice adds it once.
 */
export async function grantPet(db: D1Database, settings: FamilySettings, a: {
  familyId: string; childId: string; species: string; type?: string; nickname?: string; friendship?: number;
  source: string; sourceId: string; now: Date;
}): Promise<{ pet: PetRow; created: boolean }> {
  if (!SOURCE.test(a.source) || !SOURCE.test(a.sourceId)) throw new ApiError(400, "source and source id must be short keys");
  const species = str(a.species, 40).trim();
  if (!species) throw new ApiError(400, "species is required");
  const t = a.now.toISOString();
  const friendship = Math.max(0, Math.min(settings.friendship_max, Math.round(a.friendship ?? settings.friendship_start)));
  const res = await db.prepare(
    `INSERT INTO lf_pets(family_id, child_id, species, nickname, type, friendship, place, is_main, party_order, source, source_id, created_at, updated_at)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6,
       CASE WHEN (SELECT COUNT(*) FROM lf_pets WHERE child_id=?2 AND place='party') < ?7 THEN 'party' ELSE 'warehouse' END,
       CASE WHEN (SELECT COUNT(*) FROM lf_pets WHERE child_id=?2 AND place='party') < ?7
             AND NOT EXISTS (SELECT 1 FROM lf_pets WHERE child_id=?2 AND is_main=1) THEN 1 ELSE 0 END,
       (SELECT COALESCE(MAX(party_order), 0) + 1 FROM lf_pets WHERE child_id=?2),
       ?8, ?9, ?10, ?10
     WHERE true
     ON CONFLICT(family_id, source, source_id) DO NOTHING`,
  ).bind(a.familyId, a.childId, species, str(a.nickname, 40), str(a.type, 20), friendship, partyCap(settings), a.source, a.sourceId, t).run();
  const pet = await db.prepare("SELECT * FROM lf_pets WHERE family_id=? AND source=? AND source_id=?").bind(a.familyId, a.source, a.sourceId).first<PetRow>();
  if (!pet || pet.child_id !== a.childId) throw new ApiError(409, "that source id already gave a pet to another child");
  return { pet, created: !!res.meta.changes };
}

/**
 * Give care items into lf_care_inventory (only when you use the built-in inventory), e.g. from a wheel prize.
 * Same sourceId twice adds them once: the grant row and the item count are written in one D1 batch.
 */
export async function grantCareItem(db: D1Database, settings: FamilySettings, a: {
  familyId: string; childId: string; itemId: string; qty: number; sourceId: string; now: Date;
}): Promise<{ added: boolean; qty: number }> {
  if (!findCareItem(settings, a.itemId)) throw new ApiError(400, "unknown care item");
  if (!SOURCE.test(a.sourceId)) throw new ApiError(400, "source id must be a short key");
  const qty = Math.round(a.qty);
  if (!(qty >= 1 && qty <= 999)) throw new ApiError(400, "qty must be 1 to 999");
  const t = a.now.toISOString();
  const nonce = crypto.randomUUID();
  const [g] = await db.batch([
    db.prepare("INSERT INTO lf_item_grants(family_id, source_id, child_id, item_id, qty, nonce, created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(family_id, source_id) DO NOTHING")
      .bind(a.familyId, a.sourceId, a.childId, a.itemId, qty, nonce, t),
    // adds only if the grant row above is the one this call wrote (its nonce), so a retry adds nothing
    db.prepare(`INSERT INTO lf_care_inventory(family_id, child_id, item_id, qty, updated_at)
                SELECT family_id, child_id, item_id, qty, ? FROM lf_item_grants WHERE family_id=? AND source_id=? AND nonce=?
                ON CONFLICT(child_id, item_id) DO UPDATE SET qty = qty + excluded.qty, updated_at = excluded.updated_at`)
      .bind(t, a.familyId, a.sourceId, nonce),
  ]);
  const row = await db.prepare("SELECT qty FROM lf_care_inventory WHERE child_id=? AND item_id=?").bind(a.childId, a.itemId).first<{ qty: number }>();
  return { added: !!g.meta.changes, qty: row?.qty ?? 0 };
}

/** For your battle code: the friendship bonus of one pet in one battle. Anything but mode "solo_gym" gets no bonus. */
export async function petBattleEffect(db: D1Database, familyId: string, petId: number, mode: string): Promise<FriendshipEffect> {
  const pet = await db.prepare("SELECT friendship FROM lf_pets WHERE id=? AND family_id=?").bind(petId, familyId).first<{ friendship: number }>();
  const s = await loadSettings(db, familyId);
  return friendshipBattleEffect(pet ? Math.min(pet.friendship, s.friendship_max) : 0, mode, s.battle_friendship_tiers);
}

/** The built-in inventory over lf_care_inventory. */
export function d1CareInventory(db: (env: any) => D1Database): CareInventory {
  return {
    async list(_f, childId, env) {
      return (await db(env).prepare("SELECT item_id, qty FROM lf_care_inventory WHERE child_id=? AND qty>0 ORDER BY item_id").bind(childId).all<{ item_id: string; qty: number }>()).results;
    },
    async consume(_f, childId, itemId, env) {
      const r = await db(env).prepare("UPDATE lf_care_inventory SET qty = qty - 1, updated_at=? WHERE child_id=? AND item_id=? AND qty >= 1")
        .bind(new Date().toISOString(), childId, itemId).run();
      return !!r.meta.changes;
    },
    async refund(_f, childId, itemId, env) {
      await db(env).prepare("UPDATE lf_care_inventory SET qty = qty + 1, updated_at=? WHERE child_id=? AND item_id=?")
        .bind(new Date().toISOString(), childId, itemId).run();
    },
  };
}

// ------------------------------------------------------------------ helpers for routes

async function childOr404(c: Ctx, childId: string): Promise<ChildInfo> {
  const child = await c.children.get(c.session.familyId, childId, c.env);
  if (!child) throw new ApiError(404, "no such child");
  return child;
}

async function importExisting(c: Ctx, child: ChildInfo): Promise<void> {
  if (!c.existingPets) return;
  const list: ExistingPet[] = await c.existingPets(c.session.familyId, child.id, c.env);
  for (const p of list.slice(0, 500)) {
    await grantPet(c.db, c.settings, {
      familyId: c.session.familyId, childId: child.id, species: p.species, type: p.type, nickname: p.nickname,
      friendship: p.friendship, source: "legacy", sourceId: String(p.id), now: c.now,
    });
  }
}

async function pets(c: Ctx, childId: string): Promise<PetRow[]> {
  return (await c.db.prepare("SELECT * FROM lf_pets WHERE child_id=? AND family_id=? ORDER BY place, is_main DESC, party_order, id")
    .bind(childId, c.session.familyId).all<PetRow>()).results;
}

async function petOr404(c: Ctx, childId: string, petId: string): Promise<PetRow> {
  const p = await c.db.prepare("SELECT * FROM lf_pets WHERE id=? AND child_id=? AND family_id=?").bind(Number(petId), childId, c.session.familyId).first<PetRow>();
  if (!p) throw new ApiError(404, "no such pet");
  return p;
}

async function rosterOut(c: Ctx, childId: string) {
  const all = await pets(c, childId);
  const cap = partyCap(c.settings);
  const party = all.filter(p => p.place === "party").sort((a, b) => b.is_main - a.is_main || a.party_order - b.party_order);
  return {
    cap, party_count: party.length,
    party: party.map(p => petOut(p, c.settings)),
    warehouse: all.filter(p => p.place === "warehouse").sort((a, b) => a.species.localeCompare(b.species) || a.id - b.id).map(p => petOut(p, c.settings)),
    species: speciesSummary(all.map(p => ({ ...p, is_main: !!p.is_main }))),
  };
}

// ------------------------------------------------------------------ routes: storage

const listPets = async (c: Ctx, cid: string) => {
  const child = await childOr404(c, cid);
  await importExisting(c, child);
  return json(await rosterOut(c, child.id));
};

const withdraw = async (c: Ctx, cid: string, pid: string) => {
  const child = await childOr404(c, cid);
  const pet = await petOr404(c, child.id, pid);
  if (pet.place === "party") throw new ApiError(409, "already in the party");
  // one statement: the count and the move cannot be split by another request
  const r = await c.db.prepare(
    `UPDATE lf_pets SET place='party', updated_at=?1,
       party_order = (SELECT COALESCE(MAX(party_order), 0) + 1 FROM lf_pets WHERE child_id=?2)
     WHERE id=?3 AND child_id=?2 AND place='warehouse'
       AND (SELECT COUNT(*) FROM lf_pets WHERE child_id=?2 AND place='party') < ?4`,
  ).bind(c.now.toISOString(), child.id, pet.id, partyCap(c.settings)).run();
  if (!r.meta.changes) throw new ApiError(409, `the party is full (${partyCap(c.settings)}). Send one to storage first, or swap.`);
  // if the party was empty, the newcomer becomes the main pet
  await c.db.prepare("UPDATE lf_pets SET is_main=1 WHERE id=? AND NOT EXISTS (SELECT 1 FROM lf_pets WHERE child_id=? AND is_main=1)").bind(pet.id, child.id).run();
  return json(await rosterOut(c, child.id));
};

const deposit = async (c: Ctx, cid: string, pid: string) => {
  const child = await childOr404(c, cid);
  const pet = await petOr404(c, child.id, pid);
  if (pet.place === "warehouse") throw new ApiError(409, "already in storage");
  if (pet.is_main) throw new ApiError(409, "the main pet stays in the party. Choose another main pet first.");
  const r = await c.db.prepare("UPDATE lf_pets SET place='warehouse', updated_at=? WHERE id=? AND child_id=? AND place='party' AND is_main=0")
    .bind(c.now.toISOString(), pet.id, child.id).run();
  if (!r.meta.changes) throw new ApiError(409, "that pet just moved. Refresh and try again.");
  return json(await rosterOut(c, child.id));
};

const swap = async (c: Ctx, cid: string) => {
  const child = await childOr404(c, cid);
  const b = await readJson(c.req);
  const out = await petOr404(c, child.id, String(b.party_pet_id ?? ""));
  const inn = await petOr404(c, child.id, String(b.warehouse_pet_id ?? ""));
  if (out.place !== "party" || inn.place !== "warehouse") throw new ApiError(409, "pick one pet from the party and one from storage");
  if (out.is_main) throw new ApiError(409, "the main pet stays in the party. Choose another main pet first.");
  // both rows change in one statement, so the party count never moves and nothing is half-done
  const r = await c.db.prepare(
    `UPDATE lf_pets SET
       place = CASE id WHEN ?1 THEN 'warehouse' ELSE 'party' END,
       party_order = CASE id WHEN ?2 THEN (SELECT party_order FROM lf_pets WHERE id=?1) ELSE party_order END,
       updated_at = ?4
     WHERE child_id=?3 AND id IN (?1, ?2)
       AND (SELECT place FROM lf_pets WHERE id=?1 AND child_id=?3) = 'party'
       AND (SELECT is_main FROM lf_pets WHERE id=?1 AND child_id=?3) = 0
       AND (SELECT place FROM lf_pets WHERE id=?2 AND child_id=?3) = 'warehouse'`,
  ).bind(out.id, inn.id, child.id, c.now.toISOString()).run();
  if (r.meta.changes !== 2) throw new ApiError(409, "those pets just moved. Refresh and try again.");
  return json(await rosterOut(c, child.id));
};

const setMain = async (c: Ctx, cid: string, pid: string) => {
  const child = await childOr404(c, cid);
  const pet = await petOr404(c, child.id, pid);
  if (pet.place !== "party") throw new ApiError(409, "bring this pet into the party first");
  const t = c.now.toISOString();
  // one batch (one transaction): clear the old main only if the new one is still in the party, then set it
  const [, set] = await c.db.batch([
    c.db.prepare("UPDATE lf_pets SET is_main=0, updated_at=? WHERE child_id=? AND is_main=1 AND id<>? AND EXISTS (SELECT 1 FROM lf_pets WHERE id=? AND child_id=? AND place='party')")
      .bind(t, child.id, pet.id, pet.id, child.id),
    c.db.prepare("UPDATE lf_pets SET is_main=1, updated_at=? WHERE id=? AND child_id=? AND place='party'").bind(t, pet.id, child.id),
  ]);
  if (!set.meta.changes) throw new ApiError(409, "that pet just moved. Refresh and try again.");
  return json(await rosterOut(c, child.id));
};

const battleEffect = async (c: Ctx, cid: string, pid: string) => {
  const child = await childOr404(c, cid);
  const pet = await petOr404(c, child.id, pid);
  const mode = str(c.url.searchParams.get("mode") ?? "", 20);
  return json({ pet_id: pet.id, ...friendshipBattleEffect(Math.min(pet.friendship, c.settings.friendship_max), mode, c.settings.battle_friendship_tiers) });
};

// ------------------------------------------------------------------ routes: care room

async function chancesToday(c: Ctx, childId: string): Promise<number> {
  return (await c.db.prepare("SELECT COALESCE(SUM(wheel_chance), 0) n FROM lf_care_log WHERE child_id=? AND day=?").bind(childId, c.today).first<{ n: number }>())?.n ?? 0;
}

const careRoom = async (c: Ctx, cid: string) => {
  const child = await childOr404(c, cid);
  await importExisting(c, child);
  const owned = new Map((await c.careInventory.list(c.session.familyId, child.id, c.env)).map(x => [x.item_id, x.qty]));
  const roster = await rosterOut(c, child.id);
  const actions = (await c.db.prepare("SELECT COUNT(*) n FROM lf_care_log WHERE child_id=? AND day=?").bind(child.id, c.today).first<{ n: number }>())?.n ?? 0;
  return json({
    enabled: c.settings.care_enabled,
    pets: c.settings.care_party_only ? roster.party : [...roster.party, ...roster.warehouse],
    items: c.settings.care_items.map(it => ({ ...it, gain: careGain(it, c.settings), qty: owned.get(it.id) ?? 0 })),
    today: { actions, wheel_chances: await chancesToday(c, child.id), wheel_chances_max: c.settings.care_wheel_chances_per_day,
      actions_per_chance: c.settings.care_actions_per_chance, wheel: c.settings.care_wheel },
    friendship_max: c.settings.friendship_max,
  });
};

const care = async (c: Ctx, cid: string) => {
  const s = c.settings;
  if (!s.care_enabled) throw new ApiError(403, "care play is turned off");
  const child = await childOr404(c, cid);
  const b = await readJson(c.req);
  const pet = await petOr404(c, child.id, String(b.pet_id ?? ""));
  const item = findCareItem(s, str(b.item_id, 32));
  if (!item) throw new ApiError(400, "unknown care item");
  if (s.care_party_only && pet.place !== "party") throw new ApiError(409, "only party pets can be cared for. Bring this one from storage first.");
  if (pet.friendship >= s.friendship_max) throw new ApiError(409, "friendship is already full");
  const gain = careGain(item, s);
  if (!(await c.careInventory.consume(c.session.familyId, child.id, item.id, c.env))) throw new ApiError(409, `no ${item.en} left`);
  let after: PetRow | null, logId: number;
  try {
    const [, log] = await c.db.batch([
      c.db.prepare("UPDATE lf_pets SET friendship = MIN(?, friendship + ?), updated_at=? WHERE id=? AND child_id=?").bind(s.friendship_max, gain, c.now.toISOString(), pet.id, child.id),
      c.db.prepare(`INSERT INTO lf_care_log(family_id, child_id, pet_id, item_id, kind, gained, friendship_after, day, created_at)
                    SELECT ?, ?, id, ?, ?, MAX(0, friendship - ?), friendship, ?, ? FROM lf_pets WHERE id=?`)
        .bind(c.session.familyId, child.id, item.id, item.kind, pet.friendship, c.today, c.now.toISOString(), pet.id),
    ]);
    logId = Number(log.meta.last_row_id);
    after = await c.db.prepare("SELECT * FROM lf_pets WHERE id=?").bind(pet.id).first<PetRow>();
    if (!after || !log.meta.changes) throw new Error("care write failed");
  } catch (e) {
    await c.careInventory.refund(c.session.familyId, child.id, item.id, c.env);
    throw e;
  }

  // Care-wheel chance: count today's actions, reserve the chance in the log with a guarded update
  // (so two quick taps cannot pass the daily limit), then ask your wheel code to add it.
  const actions = (await c.db.prepare("SELECT COUNT(*) n FROM lf_care_log WHERE child_id=? AND day=? AND id<=?").bind(child.id, c.today, logId).first<{ n: number }>())?.n ?? 0;
  const chance = { wheel: s.care_wheel, due: false, granted: false };
  if (careChanceDue(actions, await chancesToday(c, child.id), s)) {
    chance.due = true;
    const reserved = await c.db.prepare(
      "UPDATE lf_care_log SET wheel_chance=1 WHERE id=? AND (SELECT COALESCE(SUM(wheel_chance), 0) FROM lf_care_log WHERE child_id=? AND day=?) < ?",
    ).bind(logId, child.id, c.today, s.care_wheel_chances_per_day).run();
    if (reserved.meta.changes && c.hooks.grantWheelChance) {
      try {
        chance.granted = await c.hooks.grantWheelChance({ familyId: c.session.familyId, child, wheel: s.care_wheel, reason: "care", idempotencyKey: `lf-care-${logId}`, env: c.env });
      } catch (e) {
        console.error("grantWheelChance failed", e);
      }
    }
    if (reserved.meta.changes && !chance.granted) await c.db.prepare("UPDATE lf_care_log SET wheel_chance=0 WHERE id=?").bind(logId).run();
  }
  const left = (await c.careInventory.list(c.session.familyId, child.id, c.env)).find(x => x.item_id === item.id)?.qty ?? 0;
  return json({
    pet: { ...petOut(after!, s), gained: Math.max(0, after!.friendship - pet.friendship), full: after!.friendship >= s.friendship_max },
    item: { id: item.id, kind: item.kind, left },
    wheel_chance: chance,
  });
};

// ------------------------------------------------------------------ routes: parent gifts (built-in inventory, or testing)

const giftItems = async (c: Ctx) => {
  if (!c.builtInInventory) throw new ApiError(409, "care items live in your own inventory; add them there");
  const b = await readJson(c.req);
  const child = await childOr404(c, String(b.child_id ?? ""));
  const out = await grantCareItem(c.db, c.settings, {
    familyId: c.session.familyId, childId: child.id, itemId: str(b.item_id, 32), qty: num(b.qty, 0, 999, 1),
    sourceId: str(b.source_id, 64) || `parent-${crypto.randomUUID()}`, now: c.now,
  });
  return json(out, out.added ? 201 : 200);
};

const giftPet = async (c: Ctx) => {
  const b = await readJson(c.req);
  const child = await childOr404(c, String(b.child_id ?? ""));
  const out = await grantPet(c.db, c.settings, {
    familyId: c.session.familyId, childId: child.id, species: str(b.species, 40), type: str(b.type, 20), nickname: str(b.nickname, 40),
    source: "parent", sourceId: str(b.source_id, 64) || crypto.randomUUID(), now: c.now,
  });
  return json({ pet: petOut(out.pet, c.settings), created: out.created }, out.created ? 201 : 200);
};

const ID = "([A-Za-z0-9_.:-]{1,64})";
const r = (method: string, path: string, fn: (c: Ctx, ...g: string[]) => Promise<Response>, parent = false): Route =>
  ({ method: [method], pattern: new RegExp("^" + path + "$"), parent, fn });

export const CARE_ROUTES: Route[] = [
  r("GET", `/children/${ID}/pets`, listPets),
  r("POST", `/children/${ID}/pets/swap`, swap),
  r("POST", `/children/${ID}/pets/(\\d+)/withdraw`, withdraw),
  r("POST", `/children/${ID}/pets/(\\d+)/deposit`, deposit),
  r("POST", `/children/${ID}/pets/(\\d+)/main`, setMain),
  r("GET", `/children/${ID}/pets/(\\d+)/battle-effect`, battleEffect),
  r("GET", `/children/${ID}/care`, careRoom),
  r("POST", `/children/${ID}/care`, care),
  r("POST", "/parent/care-items", giftItems, true),
  r("POST", "/parent/pets", giftPet, true),
];
