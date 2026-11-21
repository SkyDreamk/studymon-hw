# API

## Common rules

All routes are under the prefix `/api/lf`, which you can change with `prefix`.

- **Sign-in:** every route needs a signed-in family (your `getSession`). Otherwise the answer is `401 {"error":"please sign in"}`.
- **Parent gate:** routes under `/parent/` also need `parentUnlocked: true`. Otherwise the answer is `403 {"error":"parent area is locked"}`.
- **Writes:** every request other than GET or HEAD needs `X-Requested-With: checkin`. A request whose `Origin` is another site gets `403`.
- **Errors:** every error has the form `{"error": "plain message"}` with a fitting status (400, 404, 405, 409, 413, 415).
- **Dates and times:** days are `YYYY-MM-DD` in the family's time zone. Times are ISO 8601 UTC.
- **Ids:** child ids are whatever your children table uses, as strings.

## Child screens

### GET /config
The subjects, gyms, retell prompts and child-visible settings, plus whether the parent gate is open.
```json
{ "subjects": [{"id":"ma","zh":"数学","en":"Math","color":"#2a75bb"}],
  "gyms": [{"zh":"岩石","en":"Rock","type":"rock"}],
  "retell_prompts": {"ma": {"en":"Explain one question out loud...","zh":"挑一道题，像教朋友一样讲出来。"}},
  "today": "2026-11-19",
  "settings": {"timezone":"Asia/Shanghai","early_bonus":true,"early_cutoff":"21:30","early_multiplier":1.2,"shield_days":true,
               "weekly_goal":4,"retell_required":false,"review_deck":true,"review_intervals":[1,3,7,14,30],
               "parent_voice_notes":true,"max_retell_secs":60,"parent_lang":"zh"},
  "limits": {"photoMaxBytes":3145728,"audioMaxBytes":4194304,"maxAudioSecs":300},
  "parent": false }
```

### GET /children
```json
{ "children": [{ "id":"12","name":"Mia","grade":2,"lang":"zh","companion":"皮卡丘","companion_type":"electric",
                 "level":3,"xp":2340,"xp_into_level":340,"xp_per_level":1000,"friendship":12 }] }
```

### GET /children/{childId}/today
```json
{ "child": { "...": "as above" }, "day": "2026-11-19",
  "quests": [{ "id":"ma","subject":"ma","zh":"数学","en":"Math","color":"#2a75bb",
               "status":"todo|wait|ok|back","checkin_id":null,"note":"","parent_audio":null }],
  "week": [1,2,1,0,0,0,0],
  "streak": 3, "deck_due": 2,
  "journey": { "cleared":2,"total":8,"approvedDays":9,"daysPerGym":4,"daysToNext":3,
               "gyms":[{"zh":"岩石","en":"Rock","type":"rock","cleared":true,"current":false}] },
  "early_now": true,
  "messages": [{ "id":41,"subject":"zh","note":"讲得好","parent_audio":"/api/lf/media/…","reward":"伤药×1","xp":48,"reviewed_at":"…" }] }
```
- **`week`:** Monday to Sunday. `1` means checked in, `2` means a shield day was used, `0` means none.
- **`note` and `parent_audio`:** filled only for a quest that was sent back.
- **`messages`:** the latest approved check-ins that carry a note, voice note or reward.

### POST /children/{childId}/checkins
```json
{ "subject":"ma", "feel":"easy|okay|hard|null", "learned":"分数加法",
  "photo":"<upload id or null>", "audio":"<upload id or null>", "legacy_checkin_id": "optional" }
```
Answer: `201 { "id": 57, "early": true, "pending_xp": 48, "ai_pending": false }`.

- **`409`:** this subject is already waiting or approved today. A sent-back subject can be sent again.
- **`400`:** the settings require a retell and `audio` is missing.
- **Review cards:** sending a check-in makes a retell card due after the first interval. A `hard` check-in also makes an "explain it step by step" card.

### GET /children/{childId}/deck
```json
{ "cards": [{ "id":9,"kind":"retell|explain|say","prompt_en":"…","prompt_zh":"…","source":"Math · 2026-11-18",
              "subject":"ma","step":0,"due":"2026-11-19","next":{"again":1,"good":3,"easy":7} }] }
```
At most `daily_deck_limit` cards, oldest due first. `next` gives the days until each button would bring the card back.

### POST /cards/{cardId}/review
Request: `{ "result":"again|good|easy", "audio":"<upload id or null>" }`

Answer: `{ "due":"2026-11-22", "in_days":3, "step":1, "ai_pending":false }`

Each review adds `friendship_per_card` to the child's friendship with their companion.

### GET /children/{childId}/journey
```json
{ "child": { "...": "..." }, "journey": { "...": "as in today" }, "backpack": [{"item":"伤药×1","n":2}] }
```

### PUT /uploads/{photo|audio} and GET or HEAD /media/{uploadId}
See `R2.md`.

## Parent area (gate unlocked)

### GET /parent/queue
```json
{ "items": [{ "id":57,"child_id":"12","child_name":"Mia","day":"2026-11-19","subject":"ma","status":"wait",
              "feel":"hard","learned":"分数加法","early":true,"audio_secs":41.5,"submitted_at":"…",
              "photo_url":"/api/lf/media/…","audio_url":"/api/lf/media/…",
              "ai_feedback":{"stars":3,"text":"…"},"pending_xp":48 }],
  "rewards": ["普通精灵球×1","经验+20","伤药×1","树果汁×1"],
  "feedback_chips": ["Clear voice / 声音清楚","Full sentences / 说完整句子","Used a new word / 用了新词","Say it slower / 说慢一点"] }
```

### POST /parent/checkins/{checkinId}
```json
{ "action":"approve|back", "reward":"伤药×1 or null", "feedback":["Clear voice / 声音清楚"],
  "note":"讲得好", "parent_audio":"<upload id or null>" }
```
**Approve** answers `{ "status":"ok", "xp":48, "reward":"伤药×1" }`:

- It adds the XP, with the early-bird multiplier when the check-in came before the cut-off.
- It puts the reward in the backpack.
- It calls `onApproved`.

**Back** answers `{ "status":"back" }` and pauses that check-in's review cards.

**Errors:**

- `409` if the check-in isn't waiting.
- `400` for a reward that isn't in the settings list, or a voice note when voice notes are off.

### POST /parent/approve-all
Answer: `{ "approved": 3 }`. It approves every waiting check-in, with no reward or note.

### GET /parent/report?days=7
`days` can be 1 to 90.
```json
{ "reports": [{ "child_id":"12","name":"Mia","from":"2026-11-13","to":"2026-11-19","days_checked_in":5,
                "subjects":{"ma":{"done":4,"tricky":1}},"spoken_minutes":6.5,"retells":5,"reviews":11,
                "recall_rate":0.82,"tricky_topics":["分数加法"],"sent_back":1 }] }
```
`recall_rate` is the share of reviews rated good or easy. It is `null` when there were no reviews.

### GET /parent/settings and PUT /parent/settings
**GET** answers `{ "settings": { …all keys… }, "plans": { "2": ["zh","ma","en","rd","ot"] }, "subjects": [ … ] }`.

**PUT** takes only the keys to change. Each key is checked:

- the type must match;
- the cut-off must look like `HH:MM`;
- intervals must be whole days from 1 to 365;
- the time zone must be a real IANA name.

Unknown keys get `400`. It answers with the merged settings.

### PUT /parent/plan/{grade}
Request: `{ "subjects": ["zh","ma","en","rd"] }`

Answer: the saved list. It sets which subjects appear on Today for that grade.

### POST /parent/cards
Send one card or `{ "cards": [ … up to 500 … ] }`:
```json
{ "child_id":"12", "prompt_zh":"背一遍《静夜思》", "prompt_en":"", "kind":"say|retell|explain",
  "subject":"zh", "source":"Week 12 poem", "due":"2026-11-20" }
```
Answer: `201 { "added": 2 }`.

- A card needs at least one prompt.
- `due` defaults to today.
- Every child id must belong to the family.

## Care room and storage (v2.1)

See `CARE-AND-STORAGE.md` for the rules. A pet in every answer looks like this:
```json
{ "id": 14, "species": "Pikachu", "nickname": "", "type": "electric", "place": "party|warehouse", "is_main": true,
  "party_order": 1, "friendship": 120, "meter": { "value": 120, "max": 255, "pct": 47, "hearts": 2 } }
```

### GET /children/{childId}/pets
```json
{ "cap": 5, "party_count": 5, "party": [ "...pets, main first..." ], "warehouse": [ "...pets by species..." ],
  "species": [{ "species": "Pikachu", "owned": 2, "in_party": 1 }] }
```
The first call for a child also copies in the pets from your `existingPets` adapter, once.

### POST /children/{childId}/pets/{petId}/withdraw
Moves a stored pet into the party. Answers the same shape as `GET /pets`.

- `409` when the party already has `party_max` pets.
- `409` when the pet is already in the party.

### POST /children/{childId}/pets/{petId}/deposit
Moves a party pet into storage. `409` for the main pet.

### POST /children/{childId}/pets/swap
Request: `{ "party_pet_id": 14, "warehouse_pet_id": 21 }`

Both move in one write and the stored pet takes the party pet's seat. `409` if either pet has just moved, or if the party pet is the main pet.

### POST /children/{childId}/pets/{petId}/main
Makes a party pet the main pet, shown as the companion everywhere. `409` for a stored pet.

### GET /children/{childId}/pets/{petId}/battle-effect?mode=solo_gym
```json
{ "pet_id": 14, "applies": true, "mode": "solo_gym", "tier_min": 100, "attack_pct": 0, "crit_pct": 5, "endure_pct": 0 }
```
For display only. Any mode other than exactly `solo_gym` gives `applies: false` and zeros. Battle code should call `learning.friendshipEffect` on the server.

### GET /children/{childId}/care
```json
{ "enabled": true, "friendship_max": 255,
  "pets": [ "...party pets (all pets when care_party_only is off)..." ],
  "items": [{ "id": "oran_berry", "zh": "橙橙果", "en": "Oran Berry", "kind": "food", "gain": 10, "qty": 3 }],
  "today": { "actions": 1, "wheel_chances": 0, "wheel_chances_max": 1, "actions_per_chance": 2, "wheel": "care" } }
```

### POST /children/{childId}/care
Request: `{ "pet_id": 14, "item_id": "oran_berry" }`

Answer:
```json
{ "pet": { "...pet...": "", "gained": 10, "full": false },
  "item": { "id": "oran_berry", "kind": "food", "left": 2 },
  "wheel_chance": { "wheel": "care", "due": true, "granted": true } }
```
- `due` means this action earned a chance under the care rules. `granted` means your `grantWheelChance` hook added it.
- `403` when care play is off.
- `409` for a stored pet (with `care_party_only`), a pet whose friendship is full, or an item the child has none of.
- `400` for an item that isn't in `care_items`.

### POST /parent/pets (gate unlocked)
Request: `{ "child_id": "12", "species": "Eevee", "type": "normal", "nickname": "", "source_id": "optional" }`

Gives a pet by hand, the same way `grantPet` does. Answers `201 { "pet": …, "created": true }`, or `200` when that `source_id` already gave the pet.

### POST /parent/care-items (gate unlocked)
Request: `{ "child_id": "12", "item_id": "soft_towel", "qty": 2, "source_id": "optional" }`

Adds to the built-in care inventory. `409` when you passed your own `careInventory`.

### Changes to existing answers
- **Children:** each child in `GET /children` and in `child` has `main_pet: { id, species, friendship, friendship_max }` or `null`. When there's a main pet, `companion` and `companion_type` come from it.
- **Deck reviews:** `POST /cards/{cardId}/review` also adds `friendship_per_card` to the main pet, up to `friendship_max`.

## Server functions (v2.1)

`createLearningRoutes()` now returns `{ handle, prefix, grantPet, grantCareItem, friendshipEffect }`.

```ts
await learning.grantPet(env, { familyId, childId, species, type, nickname, source: "egg", sourceId: hatchId });
// → { id, place: "party"|"warehouse", is_main, created }
await learning.grantCareItem(env, { familyId, childId, itemId: "oran_berry", qty: 2, sourceId: spinId });
// → { added, qty }
await learning.friendshipEffect(env, { familyId, petId, mode: "solo_gym" });
// → { applies, mode, tier_min, attack_pct, crit_pct, endure_pct }
```
`grantPet` and `grantCareItem` are idempotent on their source ids, so a retried prize gives once.
