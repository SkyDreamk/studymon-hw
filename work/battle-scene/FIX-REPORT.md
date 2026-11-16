# FIX-REPORT — battle-scene v1.1

Environment: Playwright Chromium, real viewports **390×844** and **390×664**, DPR 2, iPhone UA, `hasTouch`, no `?frame=`. Source: `src/battle-scene.js`, `demo/index.html`; rebuilt `dist/`. New assertions: `tests/playwright/v11.spec.mjs` (26 tests, 13 per viewport). Raw numbers come from `test-results/v11-measured.jsonl`, written by that run.

## `npm test` result

`npm test` = measure → lint:tokens → unit → playwright. Final run: exit 0.

- measure: bundled gzip **186.79 KB** (over the ~168 KB soft reference — recorded only, not a failure); external 13.42 KB gzip. (186.78 / 13.41 before eno's guard fix below; the fix added 23 raw bytes.)
- lint:tokens: OK (4 files).
- unit: 3 pass (adapt tests; the `# pass` lines are in the log).
- playwright: **70 passed** (44 v1.0 tests + 26 new), 0 failed, 4.0 min.

An earlier full run had one failure: the new "switch sequence ≤ 900" test measured 909 ms at 390×664. I removed a 60 ms wait in `doSwitch` (the old pet's retreat now runs while the ball is in the air) and re-ran. That test now reads 784 / 793 ms.

## What changed per item

| Item | Change |
|---|---|
| A1 | Demo `.moves` is now a non-scrolling flex row; each button is `flex:1 1 0; min-width:0`, padding 6px 4px, gap 6px. Font stays 16 px; `#FF9F43` / `#3D2C1E` and the single shadow are unchanged. |
| A2 | `.bs-banner` moved from stage centre to a strip at the bottom of the stage (`bottom:4px`, `width:max-content`, `max-width:calc(100% - 16px)`). The tray is hidden while the banner shows. The banner sits below `.bs-hud-a` instead of covering it. |
| A3 | I could not reproduce a resting misalignment: at rest `|footY − shadowCenterY|` was already ≈ 0 for 大岩蛇. The reported 19.8 px matches a sample taken mid-lunge (B lunge dy = 0.3 × (171.4 − 104.7) ≈ 20). The shadow now travels with the pet's `off.dx/dy` (`moveShadow`), so the gap is ≤ 2 at every instant. Weather badge vs sprite boxes is asserted to be 0 overlap; it already was. |
| A4 | I could not reproduce the failure. Before and after my edits, the buffered `update` was applied after `play` resolved. I added the assertion and left the logic as it was. |
| A5 | `onBallClick` (lead path) now sets `disp.A` with name and `hp / maxHp` from the party entry and calls `applyHudMeta('A')` immediately, so the HUD is filled from the click. |
| A6 | `announce` merges identical neighbours only and never drops a different line. A sequence's lines are now flushed the moment it settles (`flushAnnounceNow`) instead of 350 ms later. Before this, a faint played after a settled miss showed up 350 ms late. I did not capture the exact pre-fix failure at the sheet's scenario, so this is the change I made for it. |
| A7 | `.bs-ball{font-size:14px}`. |
| B | Pointer-events drag on tray balls: `pointerdown` + `setPointerCapture`; `pointermove` creates a fixed `.bs-ghost` after 10 px; `pointerup` hit-tests the stage above the tray top. `touch-action:none` on balls; `preventDefault` on drag moves. The click that follows a drag is suppressed. Callbacks go through the existing `onBallClick`, once, at the drop. Busy / `isBusy` ignores the press. Ghost and listeners are cleaned on tray rebuild and unmount; the 10-remount listener-count test still passes. The tap path is the old click handler. |

## Measured numbers

All values come from the passing run; items with two columns are 844 | 664.

**A1 — busy "出招中…" buttons (4 buttons)**
- `right` per button: 100, 192, 284, 376 | 100, 192, 284, 376. Viewport 390, so max `right − viewport` = **−14** | **−14** (limit ≤ 0).
- `#moves` scrollWidth 362 / clientWidth 362 | 362 / 362. Button scrollWidth − clientWidth: 0, 0, 0, 0 | 0, 0, 0, 0.
- Font size 16 px on all four. First-row bottom to tab-bar top: 120 px | 120 px (≥ 60 required).

**A2 — banner vs HUD (after `victory`)**
- Intersection area with `.bs-hud-a` / `.bs-hud-b` / `.bs-weather`: **0 / 0 / 0** | **0 / 0 / 0**.
- Gap from banner top to `.bs-hud-a` bottom: 2 px | 2 px.
- HUD text after the banner: A "雷丘\n60 / 60", B "大岩蛇\n90 / 90" on both viewports. Banner text "对战结束！测试大宝赢啦！". The lose line was also checked: 0 overlap with `.bs-hud-a`.

**A3 — `|footY − shadowCenterY|`**
- At rest, lead 雷丘 (back sprite): A 0.001, B (大岩蛇) 0.001 | A 0.004, B 0.009.
- At rest, lead 尼多王 (front sprite): A 0.001, B 0.001 | A 0.004, B 0.009.
- Worst over two lunges, sampled every frame: A 0.014, B 0.014 | A 0.014, B 0.015 (limit 2).
- Weather badge vs sprite boxes: overlap 0 in all cases. Minimum sprite-box gap to HUD: 19.2 px | **8.1 px** (limit 8).

**A4 — buffered `update` during `play(attack 90→50)`, with `update` to A 12/60 and B 1/90**
- Before the play: A "60 / 60", B "90 / 90".
- Mid-play samples (16 | 12): A stayed "60 / 60". B moved 90 → 88 → 86 → 74 → 70 → 58 → 57 → 50 (844); 90 → 89 → 86 → 73 → 70 → 56 → 54 → 50 (664). Neither 12 nor 1 appeared.
- At `play` resolve: A "60 / 60", B "50 / 90". After resolve: "12 / 60" and "1 / 90" within 289 ms | 295 ms. Final bar `scaleX` 0.2 and 0.0111 (= 12/60, 1/90). Lunge count 1: the repeated same-snapshot `update` did not replay it.

**A5 — own HUD during the throw (`.bs-hud-a` innerText after the `onChooseLead` click)**
- t = 0, ~100, 250, 400 ms: "雷丘\n60 / 60" at every sample, on both viewports. `onChooseLead` had fired once at t = 0. The throw lasts ≥ 500 ms.

**A6 — `[aria-live]`**
- After `play(miss)`: "落空". After a 600 ms pause and `play(faint)`: **"大岩蛇倒下了"** (both viewports).
- Back-to-back `play(miss)` then `play(faint)`: "大岩蛇倒下了".

**A7 — `.bs-ball` computed font-size**
- Select balls (44 px wide, 5 of them): 14 px each. Battle balls (36 px wide, 4 of them): 14 px each. Both viewports.

**B — drag-ball-to-throw**
- Success: `onChooseLead(26)` ×1, then `onSwitch({swapToIdx:1, leadNo:34})` ×1. One ghost during the drag; no callback until release. `touch-action` = `none`. Page scroll [0, 0] before and during the drag (both viewports). Lead sequence `lastSequenceMs` 784 | 799. Isolated switch sequence 784 | 793 (limit 900). The 尼多王 switch ended with it on the player side.
- Cancel (release above the stage on the top bar, on the tray itself, and `pointercancel`): callbacks 0, 5 balls still in the tray, 0 ghosts left, `hostBusy` false, 0 active tweens, scroll [0, 0]. A tap afterwards threw normally (`onChooseLead` = [26]).
- Tap (mouse with 3 px of jitter, and a touch `tap()`): `onChooseLead` fires once. `onBusy(true)` follows within a few ms of the call (call time − busy-true time: −11 ms | −4 ms). `lastSequenceMs` for the mouse tap: **866 | 777**. 866 is under 900 but has less margin than the drag cases.
- Busy: with the host busy, no ghost appears and `onSwitch` stays at 0.
- Reduced-motion / CSS fallback: taps still pick the lead and switch, with the same callbacks (`[26]`, `{swapToIdx:1, leadNo:34}`).

## Reviewer follow-up (eno, 2026-11-15 19:00 PST)

Independent re-run of the full `npm test` by the reviewer: **69 passed, 1 failed** — the B drag-cancel test at 390×664 ("a tap still works"). Re-running that test 3× per viewport failed **2 of 6** (both at 664, same line: the tap after the cancel never fired `onChooseLead`). Root cause: the drag's click-suppression guard (`dragClickGuard`) was cleared only by an 80 ms timer, so a tap landing within 80 ms of a cancelled drag was eaten. The guard is meant to swallow only the click the drag itself produces.

Fix (eno, 2 lines in `src/battle-scene.js`, click handler at ~1154): when the handler swallows a click because the guard is set, it now also clears the guard and its timer. The 80 ms timer stays as a backstop for drags that produce no click. After the fix: the cancel test passed **10/10** (5 repeats × 2 viewports), and a fresh full `npm test` run passed **70/70** (3.1 min). The numbers above are from the final green run; the B-cancel line now holds on both viewports.

## Not done / caveats

- A4 and A3 (resting) did not fail in my reproduction, so those are test coverage plus one robustness change (the shadow following the lunge), not a confirmed fix of the reviewer's exact observation. A6 is similar: I fixed the 350 ms lag, but did not reproduce the reviewer's "stays on 落空" state.
- Timings come from software WebGL (SwiftShader) in headless Chromium. The 866 ms tap sequence suggests the 900 ms limit can be tight on a slow runner.
- Production, the deploy directory and the public-repo audit directory were not touched. No live POST. `care-room-v3/care-room.js` was read only.
