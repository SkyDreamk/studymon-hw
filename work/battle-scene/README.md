# battle-scene — shared PixiJS v8 battle scene, Phase 1 (Gym)

Standalone ES module + local demo + scripted acceptance. It does not touch production code and never sends a request
to any hosted environment. `pixi.js` is the only runtime dependency (installed 8.23.0, `^8.6.6`, same family as care-room).

## Install / run / test

```
npm install
npx playwright install chromium   # once, if the browser is missing
npm run demo        # builds dist/, serves http://127.0.0.1:4173/demo/index.html (offline after load)
npm run measure     # builds both artifacts and prints raw / gzip / brotli
npm run lint:tokens # design-token whitelist grep
npm test            # measure + lint-tokens + node unit tests + Playwright (headless Chromium, SwiftShader WebGL)
```

Demo: `?debug=bounds` draws the opaque box + foot/shadow dot; `?frame=390x664` (or 390x844 / 1280x800) wraps the demo in an
iframe of that size (the dev panel has the preset buttons). The dev panel also has: trigger fallback, simulate low fps
(`__test.forceFrameMs`), remount x10 diagnostics, force miss / faint / switch / victory, mute, a callback log, live
FPS/mode and the diagnostics dump. Move buttons live in the demo dock only; there is no `onMove` in the module.

`demo/assets/` = the 7 official sprites copied read-only from the local app (`p26 p34 p95 p126 p151 p208 back-26`).
`demo/fixtures/move-response.gym.json` was reconstructed read-only from `app.10a23721.js` + `engine-local.10a23721.js`
(no live move POST was ever sent). To refresh the sprites, copy the same files from
`~/workspace/studymon-hw/cf-deploy/public/static/img/` into `demo/assets/`.

## Bundle sizes (`npm run measure`, esbuild 0.24.2, ESM, minified, tree-shaken)

| artifact | raw | gzip | brotli |
|---|---:|---:|---:|
| `dist/battle-scene.min.js` (Pixi bundled) | 637,496 | 190,438 (185.97 KB) | 157,539 (153.85 KB) |
| `dist/battle-scene.ext.min.js` (`pixi.js` external) | 32,404 | 12,947 (12.64 KB) | 11,661 (11.39 KB) |

Note: the bundled file is over the ~168 KB gzip soft reference (care-room accepted at 167.94 KB gzip; 584,950 raw;
141,714 brotli). This is a note, not a failure (not switched engines, no libraries added). The extra ~18 KB comes mostly from
`Assets` (loader/cache/parsers) that care-room does not pull in. The size lever is the **external** build: load Pixi once as
a shared chunk and import both care-room and battle-scene against it (see integration notes).

## Public API

```js
import { mount, unmount, adaptMoveResponse } from './battle-scene.js';   // sanitizeEvents is an extra pure export
const handle = await mount(stageEl, { mode: 'gym', phase: 'select-lead', view, party, onChooseLead, onSwitch, ... });
// handle: { update, unmount, fallback, getDiagnostics, play, skip }   (+ __test only when opts.testHooks)
```

Options are as in the task (`view`, `party`, `phase`, `height`, `muted`, `testHooks`, `isBusy`, `onBusy`, `onChooseLead`,
`onSwitch`, `onFallback`, `onReady`, `onError`). Extras: `opts.debug` (opaque-box overlay). `update(x)` accepts either
`{ view?, party?, phase?, muted?, debug? }` or a bare view (anything with `.sides`), so `update(j.battle)` works.
`update({ phase: 'select-lead' })` after a failed lead POST resets the lead state (re-opens the tray).
`mode` other than `'gym'` mounts the gym scene and `console.warn`s once.

`getDiagnostics()` returns `mode, fps, dpr, webgl, reducedMotion, lastFallbackReason, textures, contexts, listeners, phase,
lastSequenceMs, boundsFallbackCount, activeTweens` plus `resizeCount, maxFPS, paused, appsCreated` (test aids). `textures` /
`contexts` / `listeners` are module-level counters of what this module created or registered.

## Fallback model

Every fallback (`reduced-motion`, `no-webgl`, `low-fps`, `context-lost`, `manual`, `error`, `care-room-mounted`) mounts the
CSS stage (two `<img>` pets, the same DOM HUD, weather badge) inside the container; all handle methods keep working.
`play()` there snaps or does a 250 ms HP tween, no lunge/particles/shake. After a fallback the module stays on CSS until the
next `mount` (no auto re-init). `low-fps` is remembered in `sessionStorage` (`sm_battle_low_fps=1`) so remounts in the tab
start in CSS. `reduced-motion` never constructs an `Application`.

FPS policy: first 1 s ignored; median frame >= 31 ms for 2 s -> `ticker.maxFPS = 30` and particles off; then median > 41.7 ms
(< 24 fps) for another 2 s -> `low-fps` fallback. (The 31 ms threshold follows the acceptance line "31+ ms -> 30 fps mode".)
Ticker pauses on `document.hidden` / off-screen and the monitor restarts its 1 s warm-up on resume. With
`testHooks: true` the monitor consumes only injected frames (`__test.forceFrameMs`) so CI is deterministic; real frames
still drive the displayed `fps`.

## Concurrency (play / skip / update / unmount)

`play(events)` always resolves with `{ skipped, unmounted?, dropped? }`. One sequence at a time; a second `play` is queued
(max 1); a third replaces the queued one, which resolves `{ skipped: true }` without starting. `skip()` finishes all tweens,
applies end poses + final HP and resolves the current play at once. `update()` during a sequence is buffered (last write wins)
and applied when it settles (before a queued play starts). `unmount()` resolves in-flight/queued plays with
`{ skipped: true, unmounted: true }`, calls `onBusy(false)` once if busy, then suppresses every callback. A pending
`Application.init` / `Assets.load` is aborted when `unmount` or a newer `mount` happens (newer wins). `onChooseLead` /
`onSwitch` fire on the click, once; clicks are ignored while busy (`opts.isBusy()` or an own lock).

## Events

`sendOut | attack | miss | faint | switch(swap) | victory(win)`; schema and aliases exactly as in the task (§7.1). Play-time
gates: HP clamped to `[0, maxHp]` (missing `maxHp` -> shows `0 / 0`), `startHp` snaps a stale bar, heal tweens up with no
number, events of a KO pet are dropped (counted in `dropped`) until a swap/sendOut on that side, unknown types dropped.
A swap whose target pet is already on the pad (e.g. after a tray throw) is applied silently.

### adaptMoveResponse(prevView, nextView, response?)

Pure; `nextView` defaults to `response.battle`. Walks the new log lines with a running HP copy (`startHp` / `maxHp` come from
`prevView`; the live log has no such fields). Log-align rule: `newLog` = lines of `next.log` after the last prev line. Fast
path `next.slice(prev.length)` when `next[prev.length-1]` equals the last prev line; otherwise (engine trimmed to 40) find the
position in `next` where the longest tail of `prev.log` ends and take the lines after it; if no prev line is found anywhere
the align is lost and all of `next.log` is mapped. `item / effect / status / note / weather` lines are log-only (no event).
Tested against `demo/fixtures/move-response.gym.json` and extra cases in `tests/unit/adapt.test.mjs`.

## Layout / sprites

Stage height rule: `opts.height` or a host height set before `mount` wins; otherwise `visualViewport.height >= 800 ? 240 : 168`
(re-evaluated on `visualViewport` resize/scroll, 100 ms throttled `ResizeObserver`; `renderer.resize` only when the size
actually changes). HUD is DOM (`transform: scaleX`, 250 ms transition). Anchoring uses opaque pixels (alpha > 8) from a <=128 px
down-sampled scan, cached per URL; failures use the full box and bump `boundsFallbackCount`. Player pad (A) lower-left uses
`backImg` else the front image; opponent (B) upper-right front. Scale: opaque height <= 0.40 (A) / 0.42 (B) of the stage and
opaque width <= 0.46; >= 8 px from HUD boxes (asserted in tests). Court, pad shadows and HUD are DOM/CSS in both modes; Pixi
draws pets, the ball and particles and shakes only its inner `world` container (5 px, 10 Hz, 280 ms).
The switch tray is rendered by the module inside the stage (bottom row; 44 px balls in select-lead, 36 px in battle).

## Muse integration notes

- Load with dynamic `import()` only on the battle / lead-select view. Preserve `#battleStage` across `#app` `innerHTML`
  rewrites, or unmount + remount; call `unmount()` when leaving (safe if the container is already detached).
- Prefer the shared Pixi chunk: build/serve `battle-scene.ext.min.js` and map `pixi.js` through an import map to the same
  chunk care-room uses (same `^8.6.6` family); use the bundled file only if import maps are not ready:

  ```html
  <script type="importmap">{ "imports": { "pixi.js": "/static/pixi.{hash}.js" } }</script>
  <script type="module">const { mount, adaptMoveResponse } = await import('/static/battle-scene.{hash}.js');</script>
  ```
- Pass `img` / `backImg` already resolved (hashed URLs). Wire `onChooseLead(leadNo)` -> `POST /api/battle/gym/start` with
  `leadNo`; `onSwitch({ swapToIdx, leadNo })` -> `POST /api/battle/move { swapToIdx }`. After a move:
  `const p = play(adaptMoveResponse(prev, j.battle, j)); update(j.battle); await p;`. In `phase: 'battle'` pass
  `party` with `petIdx` = index in `view.sides.A.pets`.
- Host error copy: 「对局刚刚更新了，已帮你刷新」 / 「不确定这步是否生效，正在核对…」. Show the full per-turn log (stop `slice(-5)`).
- Unmount care-room before a Pixi battle mount, and this module before care-room. The module sets
  `window.__smActivePixi = 'battle-scene'` and recovers from a stale `'battle-scene'`/`'care-room'` flag (no live
  `#careRoom canvas`). **Ask Muse to add the same stale-flag recovery to care-room later** (not done here; care-room untouched).
- Do not touch `.tabbar`; pin the dock above the 90 px tab bar.
- Wild / PvP: `opts.mode` is reserved; no extra UI now. No SFX are implemented (sound default-off requirement is met
  trivially; `opts.muted` / `sm_battle_fx_muted` are stored for later).

## Tests

`tests/unit/adapt.test.mjs` (node:test): fixture equality, log alignment, event gates. `tests/playwright/acceptance.spec.mjs`
scripts every item of the checklist (reduced-motion, five forced fallbacks, fps policy, 10 remounts, mid-play / mid-mount
unmount, network allow-list, lead/switch mapping, sprites + foot alignment, 390x844 / 390x664 / 1280 geometry, viewport
shrink, attack/switch/victory timing, shake constants, HP clamp, skip, queueing, same-snapshot update, turn-log count,
aria-live debounce, 404 silhouette, party edge cases, token lint, Chinese copy).

## v1.1 notes

- Drag-to-throw: press a tray ball, drag onto the stage (above the tray) and release to throw; a release outside the stage returns the ball with no callback. A tap (< 10 px movement) still throws at once. Reduced-motion / CSS fallback keeps the same pointer handling, taps work the same.
- Size: bundled gzip is 186.79 KB (soft reference ~168 KB; recorded only, not a failure).
