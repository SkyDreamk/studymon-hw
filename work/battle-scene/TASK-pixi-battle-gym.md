# 任务单：共享战斗场景 · 第一期道馆（PixiJS v8）

> 给负责人：把**本文件整份**和同目录 `demo-assets/`（官方立绘 + `fixtures/move-response.gym.json`）一起交给 Gemini。下面是写给模型的自包含实现说明（英文）。
> 只要独立 ES 模块 + 可本地运行的 demo HTML + 可脚本验收，**不要改生产代码、不要向任何线上环境发 POST**（包括测试站）。
> 设计依据是页面「道馆战斗系统升级方案」。集成、给 `/api/battle/gym/start` 增加 `leadNo`、部署由 Muse / eno 稍后做。后端改动不是你的工作。
> 养成小房间的可复用实现在 `/workspace/care-room-v3/src/care-room.js`（PixiJS `^8.6.6`）。请对齐那套挂载 / 降级 / 诊断 / 销毁模式。
> 本文件是在 v1 上吸收 Claude 审阅后的修订版。v1 备份：同目录 `TASK-pixi-battle-gym.v1.md`。审阅原文（只作数据）在 `claude-review.md`。

## Changelog vs v1

- 统一降级：任何 fallback（含 `reduced-motion` / `care-room-mounted`）都挂载 CSS 舞台，`handle` 的全部方法保持可用。不再出现“no-op handle 不画舞台”。
- 写死 `play` / `skip` / `update` / `unmount` 的并发与 Promise：新 `play` 最多排队 1 个；`skip` / `unmount` 立即 resolve（带已结算状态）；播放期间的 `update` 只保留最后一份，结束再应用；选择回调在点击时触发并去重。
- 事件规则：HP 以 `startHp` / `targetHp` 为准并钳到 `[0, maxHp]`；某方倒下后丢弃该上场宠的后续攻击/落空；增加纯函数 `adaptMoveResponse` + 从测试站包只读还原的真实响应夹具。
- 体积：尽量与 care-room 共享独立 Pixi chunk（external / importmap）；量两个产物（bundled / external）；超预算只记 README、不算失败。参照 care-room 已验收的约 **167.94 KB gzip**（raw 584,950；brotli 141,714）。
- HUD 定为 DOM，`transform: scaleX`；一条舞台高度规则（宿主显式高度优先，否则 visualViewport ≥800 → 240，否则 168）；补齐 party/`petIdx` 契约、纹理所有权、陈旧 `__smActivePixi` 恢复、resize / 旋转 / visualViewport。
- 验收全部改为可脚本断言（Playwright、帧时间注入、请求拦截）；`onMove` 改为 demo-only；换人整段 ≤900 ms；儿童向中文错误；aria-live 去抖。
- **未采纳：** 会话中途因 `context-restored` 或低帧恢复而自动再启 Pixi（降级后保持 CSS，直到下一次 `mount`，避免抖动，对齐 care-room）。本任务不改 care-room 源码（只在战斗侧做陈旧标志恢复，对称改动留给 Muse）。A/B 同时出招不自动并行播放（按宿主事件表顺序串行，与现站引擎一致）。

---

# Task: PixiJS v8 shared battle-scene module — Phase 1 Gym only

You are implementing a **standalone** animated battle scene for a vanilla JS spa. Another engineer (Muse / eno) will later mount your module into the Gym battle view. Do **not** modify the production or test app, do **not** add backend endpoints, and do **not** POST to any hosted environment (including the test site). Ship a module plus a local demo plus scripted acceptance that run on fixtures and official sprites already copied next to this file.

Phase 1 implements **Gym** only. Design the public API and scene graph so **wild capture** and **PvP** can reuse the same module later (`opts.mode` reserved). Do **not** implement capture chance, quiz-to-attack, ball-shake catch, or PvP defense in this delivery. If `opts.mode` is not `'gym'`, still mount the gym scene graph, ignore capture/PvP-only fields, add no extra UI, and `console.warn` once.

## 1. App context (read-only reference)

The live app is a **vanilla JS SPA** (no React/Vue). The shell is `#app`. The test bundle observed on 2026-11-15 is `/static/app.10a23721.js` and `/static/style.10a23721.css`. Backend is Cloudflare Workers. A PixiJS v8 **care-room** already exists (`/workspace/care-room-v3`, `pixi.js ^8.6.6`). Use the **same Pixi family** (`pixi.js ^8.6.6` or current 8.x that tree-shakes the same way). The two modules must **never be mounted with live Pixi at the same time**.

### What already shipped (do not re-propose)

- Click-to-move is live (`battleMoveClick`; long-press ≥ 450 ms for detail; busy UI 「出招中…」). The **demo dock** keeps click-to-move. The module itself does not own move buttons (see `onMove` below).
- `engine-local` is already lazy-loaded. **You do not calculate damage, type effectiveness, or rewards.**
- Gym is **simultaneous move selection**, not Q&A.
- The host CSS “hammer smash” (~0.85 s, 1.5 s timeout) is replaced by your Pixi path; CSS is fallback only. New Pixi segments must be **≤ ~600 ms** (a switch sequence may total **≤ 900 ms**, see §7).

### Routing (do not rewrite)

- Enter Gym: `goGym` → start: `POST /api/battle/gym/start` → `enterBattleView` → `renderBattleView`.
- Leave: any other `go*` rewrites `#app`. `unmount()` must be safe if the container is about to be replaced **or already removed**.
- Reduced motion: `matchMedia('(prefers-reduced-motion: reduce)')`.
- Do **not** import host globals. The host passes a narrow callback object. The demo mocks them.

`#app` CSS: `max-width: 520px; margin: 0 auto; padding: 12px 14px calc(90px + env(safe-area-inset-bottom))`. Plan for a **90 px** tab bar. Never cover or restyle `.tabbar` or `.topbar`.

### Current gym start / switch (Muse will change start; you assume the new param)

Today `POST /api/battle/gym/start` sends `{ childId, stage, benchNo? }`. The lead is always the main companion. Mid-battle switch is `POST /api/battle/move` `{ battleId, swapToIdx }` and spends the turn.

**Phase 1 product:** at start, show carried balls (max 5), tap one, throw, that pet leads. Mid-battle switch is also a throw. No pre-selected bench on the gym page.

**Assume** the host will start with `{ childId, stage, leadNo }` (`leadNo` = species number). Implementing that POST is **Muse’s job**. Your module renders the tray and throw, calls `onChooseLead` / `onSwitch`, and does **not** POST.

### Sprite URL pattern (keep, never replace)

- Front: `/static/img/p{no}.{contenthash}.webp`. Do **not** hardcode the hash. Host passes `pet.img`.
- Back only for `BACK_SPRITES = [5, 6, 25, 26, 131, 143]`: `/static/img/back-{no}.{contenthash}.webp`. Host passes `pet.backImg` or `null`. If missing, use the front image on the player side.
- Official files for the demo are in `demo-assets/` next to this task. Do not download PokeAPI / Showdown / other sheets. The demo must run **offline**.

### Existing endpoints (host only)

| Method | Path | Who |
|---|---|---|
| POST `/api/gym/status` | Host, read-only |
| POST `/api/battle/gym/start` | Muse (add `leadNo`); demo mocks |
| POST `/api/battle/move` | Muse; demo mocks |
| POST `/api/battle/state` | Host refresh |
| POST `/api/battle/abandon` | Host |

Rewards stay in the host modal. You may play a ≤600 ms victory burst; you do not compute or fetch rewards.

## 2. Deliverable

```
battle-scene/
  package.json          # pixi.js ^8.6.6, esbuild. No other runtime deps.
  src/battle-scene.js   # module Muse will import (ESM)
  src/adapt-move-response.js  # may live in battle-scene.js; must be a named export
  demo/index.html
  demo/mock-api.js
  demo/fixtures/        # copy move-response.gym.json from ../demo-assets/fixtures/
  demo/assets/          # copy official webps from ../demo-assets/
  scripts/measure-bundle.mjs
  scripts/dev-server.mjs
  scripts/lint-tokens.mjs
  tests/playwright/     # scripted acceptance (see §10)
  README.md
```

Copy `/workspace/battle-plan/demo-assets/*` into the package. Those files were fetched or reconstructed read-only from the test site / bundle on 2026-11-15.

### Public API (must match)

```js
/**
 * @param {HTMLElement} container  the stage element only (not the dock)
 * @param {object} opts
 * @param {'gym'|'wild'|'pvp'} [opts.mode='gym']
 * @param {BattleView} opts.view
 * @param {PartyEntry[]} [opts.party]  required when phase is 'select-lead'; see §6
 * @param {'select-lead'|'battle'|'ended'} [opts.phase]
 * @param {number} [opts.height]  explicit stage CSS px; overrides the default height rule
 * @param {boolean} [opts.muted]
 * @param {boolean} [opts.testHooks]  if true, attach handle.__test (demo/Playwright)
 * @param {() => boolean} [opts.isBusy]
 * @param {(busy: boolean) => void} [opts.onBusy]
 * @param {(leadNo: number) => void} [opts.onChooseLead]
 * @param {(info: { swapToIdx: number, leadNo: number }) => void} [opts.onSwitch]
 * @param {(info: { reason: FallbackReason }) => void} [opts.onFallback]
 * @param {(info: { fps: number, mode: 'pixi'|'fallback', dpr: number }) => void} [opts.onReady]
 * @param {(err: { message: string, error?: string }) => void} [opts.onError]
 * @returns {Promise<Handle>}
 *
 * Handle: { update, unmount, fallback, getDiagnostics, play, skip }
 * There is NO onMove on the module. Move buttons belong to the host / demo.
 */
export async function mount(container, opts);
export function unmount(); // latest instance; same as handle.unmount(); idempotent
export function adaptMoveResponse(prevView, nextView, response?); // pure; see §7
```

`FallbackReason` = `'reduced-motion' | 'no-webgl' | 'low-fps' | 'manual' | 'context-lost' | 'error' | 'care-room-mounted'`.

`getDiagnostics()` returns `{ mode, fps, dpr, webgl, reducedMotion, lastFallbackReason?, textures, contexts, listeners, phase?, lastSequenceMs?, boundsFallbackCount?, activeTweens? }`. `listeners` is a count of listeners **this module registered** (wrap add/remove). `lastSequenceMs` is the wall-clock of the last `play()` (including skip).

After `unmount`, a `destroyed` flag suppresses every later callback, tween, and rAF. `onBusy(false)` is called once if the instance was busy, then no further callbacks.

## 3. Single fallback model

**Every** fallback mounts the **CSS stage** inside the container (two `<img>` pets, shared DOM HP HUD, weather badge). The returned handle’s `update`, `play`, `skip`, `fallback`, `getDiagnostics`, and `unmount` **all keep working**. There is no “no-op handle that paints nothing.”

This includes `reduced-motion` (never create a Pixi `Application`), `no-webgl`, `low-fps`, `context-lost`, `manual`, `error`, and **`care-room-mounted`**.

- `play()` in fallback: snap or 250 ms `scaleX` HP tween, no lunge, no particles, no shake. Throw: the new pet appears (optional ≤200 ms fade). Miss/faint/victory are short text. Promises still resolve as in §4.
- Dock, skip, lead select, and the turn log still work (the dock is outside the container; the demo implements it).
- After fallback in a session (`low-fps`, `context-lost`, `reduced-motion`, …), **stay on CSS until the next `mount`**. Do not auto-reinit Pixi on `webglcontextrestored` or if fps recovers. Remember `low-fps` for the rest of the **tab session** (`sessionStorage` key `sm_battle_low_fps=1`, `try/catch`) so remounts in the same tab start in CSS and do not flicker. Other reasons are not persisted across unmount unless already reduced-motion.

`fallback(reason)` may be called by the host or internally. It is idempotent. It tears down Pixi if any, calls `onFallback` once per transition to fallback, and leaves the CSS stage.

## 4. Concurrency: play / skip / update / unmount

`play(events)` returns a Promise that **always resolves** (never rejects because of skip/unmount) with:

```ts
{ skipped: boolean, unmounted?: boolean, dropped?: number }
```

`dropped` is the number of illegal events discarded (see §7).

Rules (write these as tests):

1. **One sequence at a time.** A new `play()` while one is running is **queued, max 1**. The current sequence is not skipped automatically. If a third `play()` arrives, it **replaces** the queued one; the replaced Promise resolves immediately with `{ skipped: true }` and must not start.
2. **`skip()`** immediately jumps the **current** sequence to end poses and final HP, then resolves that `play` Promise with `{ skipped: true }` and the settled state. A skip when nothing is playing is a no-op and returns a resolved Promise. After skip settles, start the queued `play` if any. `onBusy(false)` fires when the skipped sequence has settled (before a queued play starts, then `onBusy(true)` again if a queue exists).
3. **`update(partial)` during `play`** does not change mid-animation HP or sprites. Buffer the latest snapshot (last write wins). When the current sequence settles (finish or skip), apply the buffered view **before** starting a queued play. `update` itself returns immediately. The final visible state is always the latest `update`, not the event list. `play` is choreography only.
4. **`unmount()` during `play` or `mount`:** the in-flight `play` Promise resolves with `{ skipped: true, unmounted: true }`. No `onChooseLead` / `onSwitch` / `onError` / `onReady` after `destroyed`, except the single `onBusy(false)` noted above. If `unmount` or a second `mount` happens while `Application.init` / `Assets.load` is still pending, **abort** the in-flight init: do not call `onReady` with a live Pixi app, do not assign `activeInstance` to a torn-down app, do not leak a GL context. The newer `mount` wins.
5. **`onChooseLead` / `onSwitch` fire on the click**, once, and do **not** wait for the throw animation. Re-entry while `isBusy()` or while this instance has already accepted a lead/switch for the current gesture is ignored (no second callback). The first click wins.
6. **`onBusy` / `isBusy`:** call `onBusy(true)` when a `play()` sequence starts and when a lead/switch click is accepted. Call `onBusy(false)` when that sequence settles (including skip) and on unmount if it was busy. While `opts.isBusy()` is true **or** the module’s own lock is true, ignore further ball clicks. The host uses this for 「出招中…」. `skip()` must end in `onBusy(false)` for the skipped sequence.

## 5. Care-room mutex and stale flags

- On a successful mount (Pixi **or** CSS), set `window.__smActivePixi = 'battle-scene'`. Clear to `null` on `unmount` (not on fallback — fallback is still this module).
- If the flag is `'battle-scene'` but this module has **no** `activeInstance`, treat it as **stale** and overwrite.
- If the flag is `'care-room'`:
  - If a live care-room canvas is actually present (e.g. `#careRoom canvas`, or a visible element owned by care-room), do **not** create a Pixi `Application`. Mount the **CSS stage**, `onFallback({ reason: 'care-room-mounted' })`, `onReady({ mode: 'fallback', ... })`. Handle methods still work.
  - If the flag is `'care-room'` but **no** live care-room instance/canvas can be found, treat it as stale, overwrite, and proceed (Pixi if allowed).
- Do not call into care-room internals. Do **not** edit care-room source in this delivery. README: ask Muse to apply the same stale-flag recovery on the care-room side later.
- `mount` unmounts a previous **battle-scene** instance (singleton), same as care-room’s `activeInstance`.

## 6. Party / pets index contract and select-lead view

`swapToIdx` is the index into **`view.sides.A.pets`**, the in-battle party. It is **not** an index into the pre-battle carried list unless those arrays happen to match.

```ts
type PartyEntry = {
  no: number;             // species number = leadNo
  name: string;
  img: string;
  backImg?: string | null;
  fainted?: boolean;
  petIdx?: number;        // required in phase 'battle': index in view.sides.A.pets
};
```

- **`phase === 'select-lead'`:** a battle may not exist yet. **Required:** `opts.party` (1–5 entries) and a **view stub**: `mode: 'gym'`, `stage`, `sides.B` (the gym leader, so the opponent pad can be drawn), `sides.A` may be `{ childName, line, activeIdx: 0, pets: [] }`. Tray buttons call `onChooseLead(entry.no)`. Do not send `swapToIdx`.
- **`phase === 'battle'`:** `view.sides.A.pets` is authoritative for who is in the fight and for `swapToIdx`. If `opts.party` is also passed, each switchable entry **must** include `petIdx` equal to that pet’s index in `sides.A.pets`. `onSwitch({ swapToIdx: petIdx, leadNo: entry.no })`. If `party` is omitted, build the tray from `view.sides.A.pets` (skip the already-active pet; disable fainted). If `petIdx` is missing or out of range, ignore the click and `onError` with the kid-friendly copy below — do not guess an index.
- **`party.length > 5`:** render the first 5, ignore the rest, `onError` once. **`party.length === 0`** (and no pets): empty tray, announce 「没有可以出战的伙伴了」.
- Boss / auto `swap` events on side B come from `play(events)`, not from the tray. Use `event.side` and the running view to pick who leaves and who enters (`fromNo` = current active pet of that side if the event omits it).

## 7. Events, adaptMoveResponse, and animation budget

### 7.1 `play(events)` module schema

```ts
type BattleEvent =
  | { type: 'sendOut'; side: 'A' | 'B'; no: number; name?: string; img?: string; backImg?: string | null }
  | { type: 'attack'; side: 'A' | 'B'; move?: string; moveName?: string; moveType?: string;
      damage?: number; dmg?: number;
      superEffective?: boolean; notVeryEffective?: boolean; resisted?: boolean;
      immune?: boolean; critical?: boolean;
      startHp: number; targetHp: number; maxHp: number }
  | { type: 'miss'; side: 'A' | 'B'; move?: string }
  | { type: 'faint'; side: 'A' | 'B'; name?: string; pet?: string }
  | { type: 'switch' | 'swap'; side: 'A' | 'B'; fromNo?: number; toNo?: number;
      toName?: string; pet?: string; img?: string; backImg?: string | null }
  | { type: 'victory' | 'win'; winnerSide?: 'A' | 'B'; side?: 'A' | 'B'; childName?: string };
```

`side` is the **actor** (who attacks, misses, is sent out; for `faint`, the side that fainted). For `attack`, `startHp` / `targetHp` / `maxHp` refer to the **target**. Accept live aliases: `move` = `moveName`, `dmg` = `damage`, `resisted` = `notVeryEffective`, `swap` = `switch`, `win` = `victory`, `pet` as a name.

Events play **in list order, serially**. The host decides order (the live gym engine already serializes both sides). Do not auto-parallel A and B.

### 7.2 Illegal / conflicting values (play-time gates)

- Clamp every HP (`startHp`, `targetHp`, displayed, `update` snapshots) to **`[0, maxHp]`**. If `maxHp` is missing or ≤ 0, use `1` for bar math and show `0 / 0` (never divide by zero). `activeIdx` out of range → clamp to a valid index (0 if empty) and `onError` once. Empty `pets` → empty pad, do not throw.
- **Source of truth for an attack tween:** `startHp` / `targetHp` / `maxHp` on the event. If `damage` / `dmg` disagrees with `startHp - targetHp`, **ignore damage** for the bar (still use it for the floating number if present, else show `|startHp - targetHp|`). If `startHp` disagrees with the currently displayed HP, **snap to `startHp`** then tween to `targetHp` (no “heal flash” from a stale bar).
- `targetHp > startHp` (item / heal): tween the bar **up**; no floating damage number (a short 「回复」 in the log is enough).
- After a side’s **active** pet is KO (`faint` event, or an attack that ends at 0 HP): **drop** later `attack` / `miss` events from that same fainted pet in this `play()` list. A following `swap` / `sendOut` / `victory` on that side is **kept** (replacement or end). Count drops in the resolved `{ dropped }`.
- Unknown event types: skip them, increment `dropped`, do not fallback.

### 7.3 `adaptMoveResponse(prevView, nextView, response?)` (pure, required)

This is the official host adapter. No Pixi, no DOM, unit-testable without `mount`.

The live app does:

```js
const postView = j.battle;
await animateBattleRound(prevView, postView, (postView.log || []).slice(prevLogLen));
```

Real **log** fields (from `engine-local.10a23721.js` `pushLog` and `app.10a23721.js` `playStageAttack`):

- `attack`: `type, side, pet, move, moveType, dmg, mult, superEffective, resisted, immune, critical, target, targetHp, text, mods`
- `miss`: `type, side, move, text`
- `faint`: `type, side, pet, text`
- `swap`: `type, side, pet, text`  (not `switch`)
- `win`: `type, side, text`
- also exists in the engine but is log-only in phase 1: `item`, `effect`, `status`, `note`, …

Live events **do not include `startHp` or `maxHp`**. The adapter must take `startHp` / `maxHp` from `prevView` (or a running HP copy as it walks the new log). Use `j.battle` as `nextView` when `response` is passed.

Log-align rule: `newLog = (nextView.log || []).slice((prevView.log || []).length)`. If `nextView.log.length < prevView.log.length` (the engine trims to the last 40), treat the align as lost and map **all** of `nextView.log` only if you also verify the last prev line is not present; otherwise map the suffix after the last matching `text`. Document the chosen rule and test it with the fixture.

Ship a unit test that reads `/workspace/battle-plan/demo-assets/fixtures/move-response.gym.json` (copied into `demo/fixtures/`) and asserts `adaptMoveResponse(prevView, nextView, response)` equals `expectedEvents` (allow alias normalization). That fixture was **reconstructed read-only** from the test bundles; no live move POST was sent.

Host contract: `const events = adaptMoveResponse(prev, next, j); await play(events); update(next);` (`update` may be issued immediately and will buffer if `play` is running).

### 7.4 Timing table (Pixi path)

| Animation | Duration | What | Skip / fallback |
|---|---|---|---|
| Ball throw | 500–600 ms | Arc + spin, then send-out | Pet appears, no arc |
| Send-out / enter | 300–400 ms | Short hop / scale-in | Instant |
| Retreat / switch out | 200–400 ms | Shrink / fade | Instant hide |
| **Switch sequence** (retreat + throw + send-out) | **total ≤ 900 ms** (segments may overlap; each segment still ≤ 600 ms) | Record as one `lastSequenceMs` | Instant swap of sprites |
| Attack lunge | 400–500 ms | Shared lunge for all moves | End pose + HP |
| Hit flash + camera shake | 200–300 ms, overlaps lunge | Flash; shake **only** a Pixi inner container (not the DOM / canvas CSS). Amplitude **≤ 6 px**, frequency **≤ 12 Hz**, duration **≤ 300 ms**. These are code constants Playwright can read from `__test.shake`. | One flash or HP only |
| HP tween | 250 ms | DOM `scaleX` (see §8) | Snap `scaleX` |
| Damage number | 400–500 ms | Flag text only if the event says so (效果拔群 / 效果不佳 / 没有效果 / 会心一击) | Short fade or skip |
| Miss | 200–400 ms | 「落空」; no HP change | Skip |
| Faint | 300–500 ms | Sink/fade, 「倒下了」, HP 0 | Instant faint pose |
| Victory burst | **≤ 600 ms** | Small burst; `canvas` (and the stage root) `pointer-events: none` so a host modal is not blocked. `play` Promise resolves in ≤ 600 ms. | Modal copy only |

A single `attack` event’s wall-clock (`lastSequenceMs`) must be **≤ 650 ms** (overlap + 50 ms tolerance). Do not add segment times serially. Do not use the legacy 1.5 s timeout as your duration.

## 8. Stage height, resize, HUD, sprites

### One stage-height rule

1. If `opts.height` is a positive number, or the host has already given the container an explicit CSS height > 0 **before** `mount`, **that wins**.
2. Otherwise: `vh = (window.visualViewport && visualViewport.height) || window.innerHeight`. If `vh >= 800` → **240 px**, else **168 px**. This single rule covers 844, 664, 568-class short screens, landscape, and keyboard / URL-bar shrink. The 844 / 664 layout table is the design target, not a second formula.
3. Apply the chosen height as `container.style.height` when you own the default, and keep it fixed so the renderer does not loop.

**Resize:** do **not** rely on `resizeTo: container` alone (flex / `innerHTML` rebuilds can loop). Drive size with a **throttled** (~100 ms) `ResizeObserver` on the container **and** `visualViewport` `resize` / `scroll`, then `app.renderer.resize(w, h)` (CSS pixels × dpr cap) and **recompute** sprite scale and foot anchors. Orientation change uses the same path. Safe-area: the stage stays above the tab bar; do not draw into `env(safe-area-inset-bottom)`.

Layout zones (demo + later host CSS; Pixi only fills the stage):

| Zone | 390×844 target | 390×664 target | Rule |
|---|---|---|---|
| Top bar | existing | same | do not restyle |
| Weather | strip above stage | badge **inside** the stage | shrink layout, not type |
| Stage | **~240 px** | **~168 px** | this is what gets shorter; type 14–22 |
| Dock | pinned above the 90 px tab bar: balls, moves (horizontal scroll inside the dock), turn log | same | first move row + tray tappable without page scroll |
| Tab bar | 90 px reserved | same | do not cover |

Scripted geometry (both viewports, and a 1280-wide desktop check): first move row `getBoundingClientRect().bottom ≤ window.innerHeight - 90`; `document.documentElement.scrollWidth <= clientWidth`; column / canvas not 1280 px wide (stay ~520).

On 664, the two HP HUDs, weather badge, and a damage number must not overlap: pin opponent HUD top-left, player HUD bottom-right, weather top-right, numbers over the target sprite. If space is tighter than 168, the host should pass a smaller `opts.height`; you still keep type at 14–22 and re-scale sprites.

### HP HUD (DOM, both paths)

Use a **DOM** HUD for Pixi and fallback (same nodes). Tween with **`transform: scaleX(hp / maxHp)`**, `transform-origin: left center`, 250 ms CSS transition. Do **not** animate `width` (no layout thrash). The old site’s width transition is not reused. Numbers (14–16 px, `#3D2C1E`) update with the tween. The canvas does not include the bars.

### Sprites

- Opponent (B): upper-right, **front**. Player (A): lower-left, **back** when `backImg` is set, else front.
- Anchor on **opaque** pixels (`alpha > 8`), cache by URL. If the canvas is tainted or the scan fails, fall back to the full image box and increment `boundsFallbackCount` (also expose on `onReady` / diagnostics). Down-sample the scan to a **max 128 px** edge before `getImageData`, then scale the box back — do not scan a 4× texture on the main thread.
- Scale so **opaque height ≤ 0.42–0.50** of the stage height **and opaque width ≤ 0.46** of the stage width (whichever binds). Fine/tall art (大岩蛇) must not overflow the court or the opposite HUD. Keep ≥ 8 px from HUD boxes. Feet sit on the shadow ellipse.
- Demo debug overlay (`?debug=bounds` or a checkbox) draws the opaque box and shadow center. Acceptance: `|footY - shadowCenterY| ≤ 2` CSS px. 尼多王 (no back) uses the **same** anchor/scale rules; the fixture screenshot must show the same foot alignment.

### Texture ownership

- Track textures **this instance created**. On unmount, destroy those, and `Assets.unload(url)` only for URLs this instance loaded and only if your refcount is 0.
- Do **not** pass `texture: true, textureSource: true` in a way that destroys `Assets` cache entries another instance (or a future care-room share of the same URL) still needs. Prefer `children: true` and explicit unload of owned URLs.
- Graphics-generated textures (court, placeholders) are always owned and must be destroyed.

## 9. Other constraints (non-negotiable)

1. **PixiJS v8 only**, tree-shaken (`Application, Assets, Sprite, Container, Graphics, Texture, Ticker` — add more only if used and documented). No `pixi.js/dist/pixi.min.js` whole, no `pixi.js/advanced` unless you document a one-line reason. No Howler / GSAP / Lottie / Rive / jQuery. `preference: ['webgl']` **array**. No Canvas2D, no WebGPU; if WebGL cannot be created, CSS fallback `no-webgl`.
2. **Lazy-load friendly** ESM. Host: `import('/static/battle-scene.{hash}.js')` only on the battle / lead-select view. Demo may static-import; README shows a dynamic import example.
3. **No CDN, no live test-site requests** from the demo or tests after load.
4. **No new character art.** Backdrop is `Graphics` / token colors (`#E8D4B8` court is fine).
5. **dpr cap 2**, `display: block`, `autoDensity: true`. Height is the rule in §8, not a second ResizeObserver fight.
6. **Pointer events** on balls: `touch-action` set **before** `pointerdown` (permanent on those controls, not the whole page). `draggable="false"`.
7. **Destroy** as care-room: stop ticker, remove listeners, close AudioContext. After destroy, `WEBGL_lose_context.loseContext()` if the context remains. Listen for `webglcontextlost` → `fallback('context-lost')`. 10 remounts: post-mount `textures` / `contexts` / `listeners` on the 10th minus the 1st equals **0**.
8. **Reduced motion:** never init Pixi; CSS stage; mid-session flip → `fallback('reduced-motion')`. Not a mute switch.
9. **FPS policy (same numbers as care-room):** target 60. Ignore the first **1 s**. Use a **median**. Median < 30 fps for 2 s → `ticker.maxFPS = 30` and drop particles. Steady 30 fps is allowed. Only then, median < **24 fps** for another 2 s → `low-fps` CSS fallback. Pause the ticker when `document.hidden` or the stage is off-screen (`IntersectionObserver`). Cap particles (≤ 24). Demo/test must expose **`handle.__test.forceFrameMs(ms | number[])`** (and `emitVisibility(hidden)`) so CI can inject frame times; do not require a real slow device.
10. **Tokens** for DOM: background `#FFF7E8`, buttons `#FF9F43`, text `#3D2C1E`, secondary `#7A6552`, hairline `#F0E2CC`, cards `#fff`, sizes **14 / 16 / 18 / 20 / 22**, weights **400 / 500 / 600**, one shadow `0 2px 8px rgba(120,80,30,.12)`. `scripts/lint-tokens.mjs` greps demo + module CSS / inline styles against this whitelist (allow the court `#E8D4B8` and a small type-flash set you document).
11. **Accessibility:** canvas `aria-hidden="true"`. Balls are real `<button>`s with Chinese `aria-label`. Visible focus ring. **`aria-live="polite"` is debounced (~350 ms)** and coalesced: a burst of events announces one short summary (last important line, or 「雷丘使用了铁尾，大岩蛇倒下了」), not one utterance per event. Keyboard Enter/Space on balls.
12. **Sound:** optional, **default off**. If present, mute on `opts.muted` or `localStorage.sm_battle_fx_muted === '1'`. Do **not** reuse `sm_move_muted` or `sm_care_muted`. Fail silently if AudioContext is blocked.
13. **Chinese copy** (no raw English codes in the kid UI):

    | Situation | Copy |
    |---|---|
    | Lead select | 请选一只先发出场 |
    | After a throw | 扔出{name}！ |
    | Skip | 跳过演出 |
    | Busy (host) | 出招中… |
    | Miss | 落空 |
    | Faint | 倒下了 |
    | Switch / send-out | 换上场 / 上场了 |
    | Victory (demo) | 对战结束！{childName}赢啦！ |
    | Defeat | 再练一次就会更熟，你可以的 |
    | No healthy pets | 没有可以出战的伙伴了 |
    | Image missing / 404 | 这张图片暂时没显示出来，先用剪影吧 |
    | Illegal / stale event | 刚才那一步没对上，已经帮你同步好了 |
    | Care-room still open (host may also alert) | 先离开小房间，再来对战哦 |
    | Host `STATE_CHANGED` (Muse notes) | 对局刚刚更新了，已帮你刷新 |
    | Host timeout (Muse notes) | 不确定这步是否生效，正在核对… |

    A single image 404: show a Graphics / CSS silhouette for **that** pet, `onError` with the image copy, **do not** fallback the whole scene.

## 10. Bundle strategy, demo, and scripted acceptance

### Bundle

- `npm run measure` builds **two** esbuild ESM artifacts (tree-shaken, minified, **not** the demo page):
  1. `dist/battle-scene.min.js` — Pixi **bundled** (standalone demo default).
  2. `dist/battle-scene.ext.min.js` — `pixi.js` marked **external** (for an import map / shared Pixi chunk with care-room).
- Print raw, `zlib.gzipSync`, and brotli (if easy) for **both**. That is the “chunk” definition. Do not measure the demo.
- **Host plan (Muse):** load Pixi **once** as a shared chunk at the same `^8.6.6` family as care-room, then load both modules as externalized entry points. This is the size lever. The standalone demo may keep the bundled file so it runs without an import map. Document both in the README.
- **Budget policy: report, do not fail.** Care-room was accepted at **167.94 KB gzip** (raw 584,950; brotli 141,714) against a 150 KB soft budget — overage was a README note, not a hard gate. Use **~168 KB gzip** of the **Pixi-bundled** battle-scene file as the same soft reference. If it is over, still ship, record the three sizes, and add one README line. Do not switch engines. Do not add libraries to “make it closer.”

### Demo

`npm install && npm run demo` on localhost. No login. No live-site requests.

Default fixture: 测试大宝; party 雷丘 `#26` (back), 尼多王 `#34`, 大钢蛇 `#208`, 鸭嘴火兽 `#126`, 梦幻 `#151`; opponent 岩石道馆馆主 大岩蛇 `#95`. Start in `select-lead`. After a throw, scripted gym rounds from fixtures (hard-coded HP, **no damage formula**). Also load `demo/fixtures/move-response.gym.json` and run `adaptMoveResponse` against `expectedEvents` (visible pass/fail in a demo log is fine).

Controls: viewport presets **390×844**, **390×664**, 1280-wide; 跳过演出; trigger fallback; simulate low fps via `__test.forceFrameMs`; remount 10× diagnostics; force miss / faint / switch / victory; mute if SFX exist; debug bounds overlay. Live FPS, mode, diagnostics dump, callback log (`onChooseLead`, `onSwitch`). **Move buttons live in the demo dock only**; they call demo code that builds events / fixtures. They are not a module `onMove` hook.

### Playwright (`tests/playwright/`, `npm test`)

Every acceptance item below must have a **scripted** assertion (Playwright and/or a unit test / lint script). Hook into `handle.__test` when `opts.testHooks` is true (demo enables it): `forceFrameMs`, `emitVisibility`, `shake` constants, `getDiagnostics`. Intercept network: after first load, all requests are `localhost` (or `file:` / `blob:` / `data:`). No CDN, no `test.example.com`.

## 11. Acceptance checklist (all scriptable)

Lifecycle

- [ ] `pixi.js` is `^8.6.6` (or current 8.x); no other runtime deps; `preference: ['webgl']` array. Unit or grep.
- [ ] Public API surface: `mount`, `unmount`, `update`, `fallback`, `getDiagnostics`, `play`, `skip`, `adaptMoveResponse`. No `onMove` on the module.
- [ ] Reduced-motion at load: no `Application` constructed (spy / hook); CSS stage is present; `play` / `update` / `skip` still resolve. Mid-session media flip calls `onFallback('reduced-motion')`.
- [ ] Forced no-webgl / low-fps (`forceFrameMs`) / context-lost / manual / care-room-mounted: CSS stage visible, dock usable, handle methods work.
- [ ] FPS: injected frames ignore first 1 s; 31+ ms median for 2 s → 30 fps mode; then 42+ ms median for 2 s → `low-fps`. `emitVisibility(true)` pauses ticker; resume + injected 16 ms frames does **not** fallback in the first second.
- [ ] 10 remounts: after the 10th `mount`, `textures`, `contexts`, `listeners` minus the 1st post-mount snapshot equal **0**. Unmount mid-`play` and mid-`Assets.load`: Promise resolves, no late callbacks, no extra GL context.
- [ ] `npm run measure` prints raw/gzip/brotli for bundled and external files; README records them. Over ~168 KB gzip bundled is a note, not a failed test (assert the numbers were printed, not that gzip ≤ 168).
- [ ] Playwright network log after load: only localhost / file / blob / data.

Lead / mapping / sprites / layout

- [ ] Lead select: ≤5 balls; first tap fires `onChooseLead(leadNo)` **once** before the throw ends; a second tap does not fire again. Throw 500–600 ms (or instant in fallback).
- [ ] In battle, a tray click fires `onSwitch({ swapToIdx, leadNo })` with `swapToIdx` equal to `petIdx` / `sides.A.pets` index (fixture with 雷丘 at 0, 尼多王 at 1).
- [ ] 雷丘 uses `back-26`; 大岩蛇 front `p95`; 尼多王 front on the player side; debug overlay `|footY - shadowCenterY| ≤ 2`.
- [ ] 390×844 and 390×664: first move row `bottom ≤ innerHeight - 90`; `scrollWidth <= clientWidth`; stage height follows the one rule (240 / 168 unless `opts.height`). 1280-wide: canvas width ≤ 520 + padding, not 1280.
- [ ] `visualViewport` shrink (test can set a fake height or `opts.height`) recomputes scale without a resize loop (no more than a small bounded count of `renderer.resize` per gesture).

Combat

- [ ] `adaptMoveResponse` on `move-response.gym.json` matches `expectedEvents`.
- [ ] A single attack: `lastSequenceMs ≤ 650`. Shake constants: amplitude ≤ 6, Hz ≤ 12, duration ≤ 300, applied on a Pixi container (assert `__test.shake`).
- [ ] HP clamp: feed `targetHp: -4` / `120` with `maxHp: 40` → bar ends at 0 or 40 (`scaleX` 0 or 1). After a faint, a trailing `attack` from that pet is dropped (`dropped ≥ 1`), no second lunge.
- [ ] `update` during `play` does not move the bar until the sequence settles; then the buffered view wins.
- [ ] Miss: 「落空」, HP unchanged. Faint: 「倒下了」, HP 0.
- [ ] Switch sequence `lastSequenceMs ≤ 900`.
- [ ] Victory `play` resolves in ≤ 600 ms and the canvas/stage has `pointer-events: none`.
- [ ] `skip()`: `play` Promise resolves with `{ skipped: true }` on the same turn of the event loop / within 50 ms, with final HP already applied.
- [ ] Same-snapshot `update` does not restart a lunge (`lastSequenceMs` unchanged / no new play).
- [ ] Current-turn log lists every event of that turn (count === events after drops).
- [ ] Token lint passes. Chinese UI only in the kid-facing demo (no `STATE_CHANGED` string). Image 404 uses a silhouette and does not fallback the scene.

## 12. README contents

How to install, run the demo, run `npm test`, measure both artifacts, and copy `demo-assets`. Public API, fallback model, concurrency rules, event schema, `adaptMoveResponse`, and **Muse integration notes**:

- Dynamic `import()` only on the battle / lead-select view. Preserve `#battleStage` across `#app` `innerHTML` rewrites, or unmount + remount. Call `unmount` when leaving.
- Prefer a **shared Pixi chunk** (external entry) at the same version as care-room; fall back to the bundled file only if import maps are not ready.
- Pass `img` / `backImg` already resolved. Wire `onChooseLead(leadNo)` to `POST /api/battle/gym/start` with `leadNo`. Wire `onSwitch` to `POST /api/battle/move` `{ swapToIdx }`. After a move: `play(adaptMoveResponse(prev, j.battle, j))` then `update(j.battle)`.
- Host error copy: 「对局刚刚更新了，已帮你刷新」 / 「不确定这步是否生效，正在核对…」. Full per-turn log (stop `slice(-5)`).
- Unmount care-room before a Pixi battle mount; unmount this module before care-room. Apply the same stale-`__smActivePixi` recovery on the care-room side in a later change (not this delivery).
- Do not touch `.tabbar`. Pin the dock. Stage height rule in §8.
- Wild / PvP later: `opts.mode` reserved, no UI now.

---

End of task. Implement the module, demo, and scripted tests so they can be reviewed offline. If a requirement conflicts with Pixi v8 API names, follow Pixi v8 docs and keep the external `mount` / `unmount` / `update` / `fallback` / `getDiagnostics` / `play` / `skip` / `adaptMoveResponse` contract unchanged.
