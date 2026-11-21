# Care room and Professor Oak's storage (v2.1)

Two game systems that the site didn't have yet. The wheel / gacha is **not** rebuilt here: these modules hand care-wheel chances to your existing wheel code, and your wheel's prize code hands eggs and care items to these modules.

## Care room

- **What the child does:** picks a party pet, then taps a food item to feed it or a bath item to bathe it. Each tap uses one item from the child's care items.
- **Friendship:** `friendship_per_feed` (10) or `friendship_per_bath` (10) per action, from `friendship_start` (0) up to `friendship_max` (255). An item can carry its own `gain`, which overrides the per-kind number.
- **Meter:** each pet has `meter: { value, max, pct, hearts }`, where `hearts` is 0 to 5 for the five-heart display.
- **Party only:** with `care_party_only` (on by default), only party pets can be cared for. A full pet can't use up an item.
- **Turned off:** with `care_enabled` off, care actions answer `403`, and the screen says a parent can turn it on.
- **Review deck:** each deck review already adds `friendship_per_card` to the child. In v2.1 it also adds it to the main pet, capped at `friendship_max`.

### Care-wheel chances

- **When a chance is due:** every `care_actions_per_chance` (2) care actions in a day, up to `care_wheel_chances_per_day` (1) chances a day, on the wheel named by `care_wheel` ("care").
- **How it reaches your wheel:**
  1. The chance is reserved in `lf_care_log` with a guarded update, so two quick taps can't pass the daily limit.
  2. Your `hooks.grantWheelChance({ familyId, child, wheel, reason: "care", idempotencyKey, env })` adds it to your chances table under your daily-practice rules.
  3. It returns `true` only if it really added the chance.
- **When your wheel says no:** a `false` answer or an error releases the reservation, so the child can still earn that day's chance later. A failing wheel never breaks the care action itself.
- **Retries:** `idempotencyKey` is `lf-care-{logId}`, one per care action. Store it with the chance, so a retried call doesn't add a second one.
- **The spin itself** stays entirely in your wheel code. Chances are claimed server-side, as now.

### Where care items live

- **Default:** the `lf_care_inventory` table. Your wheel's prize code fills it with `learning.grantCareItem(env, { familyId, childId, itemId, qty, sourceId })`. The same `sourceId` twice adds the items once.
- **If your wheel already keeps items:** pass `careInventory: { list, consume, refund }` to `createLearningRoutes`, and the care room uses your table instead.
  - `consume` must be atomic, for example `UPDATE ... SET qty = qty - 1 WHERE ... AND qty >= 1`, and return whether one was taken.
  - `refund` is called only if the friendship write fails after the item was taken.
- **Item list:** `care_items` in the family settings, each `{ id, zh, en, kind: "food"|"bath", gain? }`.
  - The defaults are 橙橙果 Oran Berry and 宝可梦松饼 Poké Puff (food), and 泡泡香皂 Bubble Soap and 柔软毛巾 Soft Towel (bath).
  - Use the same ids your wheel uses for its care prizes.
  - Item art comes from `LF_CONFIG.sprites[itemId]` if you set it.

## Storage (Professor Oak's)

- **Party:** the main pet plus 4, so `party_max` = 5. Exactly one party pet is the main pet, and it's shown as the child's companion on every screen.
- **New pets:** `learning.grantPet(env, { familyId, childId, species, type, nickname, source, sourceId })` puts a new pet in the party if there's room, otherwise in storage. The first pet becomes the main pet. The same `source` + `sourceId` twice adds it once, so an egg hatched twice by a retry gives one pet.
- **What the child can do:**
  - **To storage:** any party pet except the main one.
  - **To party:** a stored pet, only while the party has room.
  - **Swap:** one party pet for one stored pet, in one write. The stored pet takes the same seat.
  - **Make main:** any party pet.
- **Species list:** storage lists every species the child owns, with how many and how many are in the party.
- **Pets you already have:** pass `existingPets(familyId, childId, env)` and the first time a child opens the care room or storage, those pets are copied in once with `source: "legacy"`. After that, new pets come only through `grantPet`.

### How the cap holds under quick taps

Every party change checks the cap inside the same SQL statement that makes the change, so a second tab, a double tap or a retried request can't push the party past `party_max`.

| Change | How it's guarded |
|---|---|
| New pet | `INSERT ... SELECT` that counts the party in the same statement |
| To party | `UPDATE ... WHERE (SELECT COUNT(*) ... place='party') < party_max` |
| Swap | one `UPDATE` of both rows, which must change exactly 2 rows; the party count never moves |
| To storage | `UPDATE ... WHERE is_main=0`; the main pet can't leave |
| Make main | one D1 batch: clear the old main only if the new one is still in the party, then set it. A unique index allows one main per child |

**Lowering `party_max`:** nobody is moved out automatically. The party keeps its pets, and "to party" is refused until the party is under the new cap.

## Friendship in battles

- **Solo gym only:** friendship gives a bonus in **solo gym battles only**. PvP, co-op and every other mode get nothing.
- **For your battle code:** call
  ```ts
  const fx = await learning.friendshipEffect(env, { familyId, petId, mode: "solo_gym" });
  // { applies, mode, tier_min, attack_pct, crit_pct, endure_pct }
  ```
  - `applies` is true only when `mode` is exactly `"solo_gym"`. `"pvp"`, `"coop"`, `"co-op"`, `"SOLO_GYM"`, `""` and anything else give `applies: false` and zero bonuses.
  - A pet from another family also gives no bonus.
- **Your code decides what the numbers mean** in its damage formula, for example attack × (1 + attack_pct/100).
- **Tiers:** set by `battle_friendship_tiers`. Each tier is `{ min, attack_pct, crit_pct, endure_pct }`, and the highest tier the pet has reached applies. The defaults:

  | Friendship | Attack | Critical | Endure |
  |---|---|---|---|
  | 100+ | +0% | +5% | 0% |
  | 180+ | +5% | +5% | 5% |
  | 255 | +10% | +10% | 10% |

- **Read-only display:** `GET /children/{id}/pets/{petId}/battle-effect?mode=solo_gym` shows the same numbers on screens. It changes nothing, and your battle code should call `friendshipEffect` on the server rather than trust a number sent by the browser.

## Settings

Every number is a family setting, changed through `PUT /parent/settings` or the parent Settings screen ("Care and storage").

| Key | Default | Checked |
|---|---|---|
| `care_enabled` | `true` | on or off |
| `friendship_start` | `0` | 0 to `friendship_max` |
| `friendship_max` | `255` | 1 to 65535 |
| `friendship_per_feed` | `10` | whole number, 0 or more |
| `friendship_per_bath` | `10` | whole number, 0 or more |
| `care_party_only` | `true` | on or off |
| `care_items` | 4 items | up to 30, ids `a-z 0-9 _ -` |
| `care_wheel` | `"care"` | a short key |
| `care_wheel_chances_per_day` | `1` | 0 turns chances off |
| `care_actions_per_chance` | `2` | 1 or more |
| `battle_friendship_tiers` | 3 tiers | up to 10, rising `min`, 0 to 100% |
| `party_max` | `5` | 1 to 30 |
