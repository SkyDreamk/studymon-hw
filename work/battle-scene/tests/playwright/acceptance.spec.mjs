import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = '/demo/index.html';

/* ---------- helpers ---------- */
async function open(page, { vp, query = '' } = {}) {
  if (vp) await page.setViewportSize(vp);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL + query);
  await page.waitForSelector('body[data-ready]');
  await page.evaluate(() => window.__demo.handle.__test.whenIdle());
  page._errors = errors;
}
const diag = (page) => page.evaluate(() => window.__demo.handle.getDiagnostics());
const calls = (page, name) => page.evaluate((n) => window.__demo.calls.filter((c) => c.name === n), name);
async function settle(page) {
  await page.waitForFunction(() => {
    const c = window.__demo.calls.filter((x) => x.name === 'onBusy');
    return !window.__demo.state.hostBusy && (!c.length || c[c.length - 1].arg === false);
  });
  await page.evaluate(() => window.__demo.handle.__test.whenIdle());
}
async function pickLead(page, no = 26) {
  await page.click(`.bs-ball[data-no="${no}"]`);
  await page.waitForFunction(() => window.__demo.state.view && !window.__demo.state.hostBusy);
  await settle(page);
}
const barScale = (page, side) =>
  page.evaluate((s) => {
    const t = getComputedStyle(document.querySelector(`.bs-hud[data-side="${s}"] .bs-fill`)).transform;
    if (!t || t === 'none') return 1;
    return Number(t.match(/matrix\(([^,]+),/)[1]);
  }, side);
const hudNums = (page, side) => page.evaluate((s) => document.querySelector(`.bs-hud[data-side="${s}"] .bs-hud-nums`).textContent, side);
const play = (page, events) => page.evaluate((e) => window.__demo.handle.play(e), events);
const atk = (side, startHp, targetHp, maxHp, extra = {}) => ({ type: 'attack', side, move: '测试招', startHp, targetHp, maxHp, ...extra });

/* ================= lifecycle ================= */
test.describe('lifecycle', () => {
  test('package.json deps, preference array, API surface, no onMove', async ({ page }) => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(Object.keys(pkg.dependencies)).toEqual(['pixi.js']);
    expect(pkg.dependencies['pixi.js']).toMatch(/^\^8\./);
    const src = readFileSync(join(root, 'src/battle-scene.js'), 'utf8');
    expect(src).toContain("preference: ['webgl']");
    expect(src).not.toMatch(/onMove/);
    expect(src).not.toMatch(/WebGPU|webgpu/);
    await open(page);
    const surface = await page.evaluate(() => ({
      mod: Object.keys(window.__bs).sort(),
      handle: Object.keys(window.__demo.handle).filter((k) => !k.startsWith('__')).sort(),
    }));
    expect(surface.mod).toEqual(expect.arrayContaining(['mount', 'unmount', 'adaptMoveResponse']));
    expect(surface.handle).toEqual(['fallback', 'getDiagnostics', 'play', 'skip', 'unmount', 'update']);
    expect(surface.handle).not.toContain('onMove');
  });

  test('reduced-motion at load: no Application, CSS stage, methods resolve', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      window.__glCtx = 0;
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...a) {
        if (/webgl/.test(t)) window.__glCtx++;
        return orig.call(this, t, ...a);
      };
    });
    await open(page);
    const d = await diag(page);
    expect(d.mode).toBe('fallback');
    expect(d.appsCreated).toBe(0);
    expect(d.lastFallbackReason).toBe('reduced-motion');
    expect(await page.evaluate(() => window.__glCtx)).toBe(0);
    expect(await page.locator('.bs-root[data-mode="fallback"]').count()).toBe(1);
    expect(await page.locator('.bs-root canvas').count()).toBe(0);
    await pickLead(page, 26);
    expect(await page.locator('.bs-pet img').count()).toBe(2);
    const r = await page.evaluate(async () => {
      const h = window.__demo.handle;
      const a = await h.play([{ type: 'miss', side: 'A' }]);
      h.update({ view: window.__demo.state.view });
      const s = await h.skip();
      return { a, s: s === undefined };
    });
    expect(r.a.skipped).toBe(false);
    expect(r.s).toBe(true);
  });

  test('mid-session reduced-motion flip calls onFallback(reduced-motion)', async ({ page }) => {
    await open(page);
    expect((await diag(page)).mode).toBe('pixi');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onFallback'));
    const fb = await calls(page, 'onFallback');
    expect(fb).toHaveLength(1);
    expect(fb[0].arg).toEqual({ reason: 'reduced-motion' });
    expect((await diag(page)).mode).toBe('fallback');
  });

  const fallbackCases = [
    ['no-webgl', async (page) => {
      await page.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (t, ...a) {
          return /webgl/.test(t) ? null : orig.call(this, t, ...a);
        };
      });
    }, null],
    ['manual', null, (page) => page.evaluate(() => window.__demo.handle.fallback('manual'))],
    ['context-lost', null, (page) => page.evaluate(() => window.__demo.handle.__test.loseContext())],
    ['low-fps', null, (page) => page.evaluate(() => {
      const t = window.__demo.handle.__test;
      t.forceFrameMs(Array(130).fill(32));
      t.forceFrameMs(Array(130).fill(42));
    })],
    ['care-room-mounted', async (page) => {
      await page.addInitScript(() => {
        window.__smActivePixi = 'care-room';
        document.addEventListener('DOMContentLoaded', () => {
          const d = document.createElement('div');
          d.id = 'careRoom';
          d.appendChild(document.createElement('canvas'));
          document.body.appendChild(d);
        });
      });
    }, null],
  ];
  for (const [reason, pre, trigger] of fallbackCases) {
    test(`fallback ${reason}: CSS stage visible, dock + handle methods work`, async ({ page }) => {
      if (pre) await pre(page);
      await open(page);
      if (trigger) {
        await trigger(page);
        await page.waitForFunction(() => window.__demo.handle.getDiagnostics().mode === 'fallback');
      }
      const d = await diag(page);
      expect(d.mode).toBe('fallback');
      expect(d.lastFallbackReason).toBe(reason);
      const fb = await calls(page, 'onFallback');
      expect(fb.filter((c) => c.arg.reason === reason)).toHaveLength(1);
      await expect(page.locator('.bs-root[data-mode="fallback"]')).toBeVisible();
      expect(await page.locator('.bs-root canvas').count()).toBe(0);
      await pickLead(page, 26);
      await expect(page.locator('.bs-pet img')).toHaveCount(2);
      await page.click('.btn.move[data-idx="0"]');
      await settle(page);
      expect(await hudNums(page, 'B')).toBe('50 / 90'); // scripted 铁尾 = 40
      await page.evaluate(() => window.__demo.handle.skip());
      expect((await diag(page)).contexts).toBe(0);
    });
  }

  test('stale care-room flag (no canvas) is overwritten and Pixi proceeds; low-fps persists in the tab session', async ({ page }) => {
    await page.addInitScript(() => {
      window.__smActivePixi = 'care-room';
    });
    await open(page);
    expect((await diag(page)).mode).toBe('pixi');
    expect(await page.evaluate(() => window.__smActivePixi)).toBe('battle-scene');
    await page.evaluate(() => {
      const t = window.__demo.handle.__test;
      t.forceFrameMs(Array(130).fill(32));
      t.forceFrameMs(Array(130).fill(42));
    });
    expect(await page.evaluate(() => sessionStorage.getItem('sm_battle_low_fps'))).toBe('1');
    await page.evaluate(() => window.__demo.restart());
    const d = await diag(page);
    expect(d.mode).toBe('fallback');
    expect(d.lastFallbackReason).toBe('low-fps');
    // fps recovery does not re-init Pixi
    await page.evaluate(() => window.__demo.handle.__test.forceFrameMs(Array(200).fill(16)));
    expect((await diag(page)).mode).toBe('fallback');
  });

  test('fps policy: first 1 s ignored, 31ms median 2 s -> 30fps, 42ms median 2 s -> low-fps; pause/resume', async ({ page }) => {
    await open(page);
    const t = (fn, arg) => page.evaluate(fn, arg);
    // first second is ignored even if slow
    await t(() => window.__demo.handle.__test.forceFrameMs(Array(20).fill(50)));
    let d = await diag(page);
    expect([d.mode, d.maxFPS]).toEqual(['pixi', 60]);
    // 31+ ms median for 2 s -> 30 fps cap
    await t(() => window.__demo.handle.__test.forceFrameMs(Array(70).fill(32)));
    d = await diag(page);
    expect([d.mode, d.maxFPS]).toEqual(['pixi', 30]);
    // pause, resume, injected 16 ms frames never fall back
    await t(() => window.__demo.handle.__test.emitVisibility(true));
    expect((await diag(page)).paused).toBe(true);
    await t(() => window.__demo.handle.__test.forceFrameMs(Array(200).fill(100))); // ignored while paused
    expect((await diag(page)).mode).toBe('pixi');
    await t(() => window.__demo.handle.__test.emitVisibility(false));
    expect((await diag(page)).paused).toBe(false);
    await t(() => window.__demo.handle.__test.forceFrameMs(Array(60).fill(16)));
    expect((await diag(page)).mode).toBe('pixi');
    // slow frames right after resume are inside the new 1 s warm-up: still no fallback
    await t(() => window.__demo.handle.__test.forceFrameMs(Array(20).fill(50)));
    expect((await diag(page)).mode).toBe('pixi');
    // 42+ ms median for 2 s -> low-fps
    await t(() => window.__demo.handle.__test.forceFrameMs(Array(70).fill(42)));
    d = await diag(page);
    expect([d.mode, d.lastFallbackReason]).toEqual(['fallback', 'low-fps']);
  });

  test('10 remounts leave textures / contexts / listeners flat', async ({ page }) => {
    await open(page);
    const snaps = await page.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 10; i++) {
        await window.__demo.restart();
        await window.__demo.handle.__test.whenIdle();
        out.push(window.__demo.handle.getDiagnostics());
      }
      return out;
    });
    for (const k of ['textures', 'contexts', 'listeners']) expect(snaps[9][k] - snaps[0][k]).toBe(0);
    expect(snaps[9].contexts).toBe(1);
  });

  test('unmount mid-play and mid-mount: promises resolve, no late callbacks, no extra GL context', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const r = await page.evaluate(async () => {
      const h = window.__demo.handle;
      const before = window.__demo.calls.length;
      const p1 = h.play([{ type: 'attack', side: 'A', move: 'x', startHp: 90, targetHp: 50, maxHp: 90 }]);
      const p2 = h.play([{ type: 'miss', side: 'A' }]); // queued
      await new Promise((r) => setTimeout(r, 100));
      h.unmount();
      const res = [await p1, await p2];
      await new Promise((r) => setTimeout(r, 900));
      const late = window.__demo.calls.slice(before).filter((c) => c.name !== 'onBusy');
      return { res, late, d: h.getDiagnostics() };
    });
    expect(r.res[0]).toMatchObject({ skipped: true, unmounted: true });
    expect(r.res[1]).toMatchObject({ skipped: true, unmounted: true });
    expect(r.late).toEqual([]);
    expect(r.d.contexts).toBe(0);
    expect(r.d.textures).toBe(0);
    expect(r.d.listeners).toBe(0);
    // mid-mount (Application.init pending) and mid Assets.load (slow image)
    await page.route('**/p95.*.webp', async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      route.continue();
    });
    const r2 = await page.evaluate(async () => {
      const seen = [];
      const div = document.createElement('div');
      document.body.appendChild(div);
      const mk = (name, no, img) => ({ no, name, img, hp: 10, maxHp: 10 });
      const view = { sides: { A: { activeIdx: 0, pets: [mk('雷丘', 26, 'assets/p26.10a23721.webp')] }, B: { activeIdx: 0, pets: [mk('大岩蛇', 95, 'assets/p95.10a23721.webp')] } } };
      const opts = { view, phase: 'battle', onReady: () => seen.push('ready'), onError: () => seen.push('error'), onFallback: () => seen.push('fb') };
      const pA = window.__bs.mount(div, opts);
      window.__bs.unmount(); // before Application.init settles
      const hA = await pA;
      const pB = window.__bs.mount(div, opts);
      await new Promise((r) => setTimeout(r, 300)); // init done, p95 still loading
      window.__bs.unmount();
      const hB = await pB;
      await new Promise((r) => setTimeout(r, 1200));
      const d = hB.getDiagnostics();
      div.remove();
      return { seen, d, same: hA !== hB };
    });
    expect(r2.seen).toEqual([]);
    expect(r2.d.contexts).toBe(0);
    expect(r2.d.textures).toBe(0);
    expect(r2.d.listeners).toBe(0);
  });

  test('unmount is safe when the container was already removed; mode warn fires once', async ({ page }) => {
    const warns = [];
    page.on('console', (m) => m.type() === 'warning' && warns.push(m.text()));
    await open(page);
    const ok = await page.evaluate(async () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      const view = window.__demo.state.mock.stubView();
      const h = await window.__bs.mount(div, { mode: 'wild', phase: 'select-lead', view, party: window.__demo.state.mock.party });
      div.remove();
      h.unmount();
      h.unmount();
      const h2 = await window.__bs.mount(document.body.appendChild(document.createElement('div')), { mode: 'pvp', view });
      h2.unmount();
      return true;
    });
    expect(ok).toBe(true);
    expect(warns.filter((w) => /reserved/.test(w))).toHaveLength(1);
  });

  test('npm run measure prints raw/gzip/brotli for both artifacts', async () => {
    const out = execFileSync('node', ['scripts/measure-bundle.mjs'], { cwd: root, encoding: 'utf8' });
    expect(out).toMatch(/bundled[\s\S]*raw=\d+ bytes\s+gzip=\d+ bytes[\s\S]*brotli=\d+ bytes/);
    expect(out).toMatch(/external[\s\S]*raw=\d+ bytes\s+gzip=\d+ bytes[\s\S]*brotli=\d+ bytes/);
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    expect(readme).toMatch(/gzip/i);
  });

  test('network after load: only localhost / file / blob / data', async ({ page }) => {
    const urls = [];
    page.on('request', (r) => urls.push(r.url()));
    await open(page);
    await pickLead(page, 26);
    await page.click('.btn.move[data-idx="0"]');
    await settle(page);
    expect(urls.length).toBeGreaterThan(5);
    for (const u of urls) {
      expect(u).toMatch(/^(http:\/\/(127\.0\.0\.1|localhost)[:/]|data:|blob:|file:)/);
    }
    expect(urls.join('\n')).not.toMatch(/checkinstudy|cdn|githubusercontent/);
  });
});

/* ================= lead / mapping / sprites / layout ================= */
test.describe('lead, switch, sprites, layout', () => {
  test('lead select: <=5 balls, first tap fires once before the throw ends, second does not', async ({ page }) => {
    await open(page);
    expect(await page.locator('.bs-ball').count()).toBe(5);
    expect(await page.locator('canvas[aria-hidden="true"]').count()).toBe(1);
    const labels = await page.locator('.bs-ball').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')));
    for (const l of labels) expect(l).toMatch(/[一-龥]/);
    const tm = await page.evaluate(() => window.__demo.handle.__test.timings);
    expect(tm.throwMs).toBeGreaterThanOrEqual(500);
    expect(tm.throwMs).toBeLessThanOrEqual(600);
    const r = await page.evaluate(async () => {
      const balls = [...document.querySelectorAll('.bs-ball')];
      balls[0].click();
      balls[1].click();
      balls[0].click();
      const t0 = performance.now();
      await new Promise((res) => setTimeout(res, 60));
      const early = window.__demo.calls.filter((c) => c.name === 'onChooseLead');
      return { early, t0 };
    });
    expect(r.early).toHaveLength(1);
    expect(r.early[0].arg).toBe(26);
    await settle(page);
    const cl = await calls(page, 'onChooseLead');
    expect(cl).toHaveLength(1);
    const busy = await calls(page, 'onBusy');
    const tTrue = busy.find((c) => c.arg === true).t;
    const tFalse = busy.find((c) => c.arg === false).t;
    expect(cl[0].t).toBeLessThanOrEqual(tTrue + 5); // fired on the click, not after the throw
    expect(tFalse - cl[0].t).toBeGreaterThan(500); // throw is >= 500 ms
  });

  test('keyboard Enter on a ball works and the focus ring is visible', async ({ page }) => {
    await open(page);
    await page.locator('.bs-ball').first().focus();
    const outline = await page.locator('.bs-ball').first().evaluate((b) => getComputedStyle(b).outlineStyle + ' ' + getComputedStyle(b).outlineWidth);
    expect(outline).not.toMatch(/^none/);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onChooseLead'));
    expect((await calls(page, 'onChooseLead'))[0].arg).toBe(26);
  });

  for (const [lead, target, idx] of [[26, 34, 1], [151, 208, 3], [34, 26, 1]]) {
    test(`battle tray: lead ${lead} -> switch to ${target} sends swapToIdx ${idx} (= sides.A.pets index)`, async ({ page }) => {
      await open(page);
      await pickLead(page, lead);
      const pets = await page.evaluate(() => window.__demo.state.view.sides.A.pets.map((p) => p.no));
      expect(pets.indexOf(target)).toBe(idx);
      await page.click(`.bs-ball[data-no="${target}"]`);
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onSwitch'));
      const sw = await calls(page, 'onSwitch');
      expect(sw).toHaveLength(1);
      expect(sw[0].arg).toEqual({ swapToIdx: idx, leadNo: target });
      await settle(page);
      expect((await page.evaluate(() => window.__demo.handle.__test.getGeom().A.no))).toBe(target);
    });
  }

  test('sprites: 雷丘 back-26, 大岩蛇 p95, 尼多王 front on the player side, foot alignment', async ({ page }) => {
    await open(page, { query: '?debug=bounds' });
    await pickLead(page, 26);
    let g = await page.evaluate(() => window.__demo.handle.__test.getGeom());
    expect(g.A.url).toMatch(/back-26\./);
    expect(g.B.url).toMatch(/p95\./);
    expect(Math.abs(g.A.footY - g.A.shadowCenterY)).toBeLessThanOrEqual(2);
    expect(Math.abs(g.B.footY - g.B.shadowCenterY)).toBeLessThanOrEqual(2);
    expect(await page.locator('.bs-dbg-box').count()).toBe(2);
    // independent full-resolution scan vs the module's down-sampled box (error in CSS px)
    for (const side of ['A', 'B']) {
      const err = await page.evaluate(async ({ url, frac, s, natH }) => {
        const im = new Image();
        im.src = url;
        await im.decode();
        const c = document.createElement('canvas');
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const x = c.getContext('2d');
        x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let bottom = 0;
        for (let y = c.height - 1; y >= 0 && !bottom; y--) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 8) { bottom = y + 1; break; }
        return Math.abs(bottom / c.height - frac) * natH * s;
      }, { url: g[side].url, frac: g[side].boxBottomFrac, s: g[side].scale, natH: g[side].natH });
      expect(err).toBeLessThanOrEqual(2);
    }
    await page.evaluate(() => window.__demo.restart());
    await pickLead(page, 34);
    g = await page.evaluate(() => window.__demo.handle.__test.getGeom());
    expect(g.A.url).toMatch(/p34\./);
    expect(Math.abs(g.A.footY - g.A.shadowCenterY)).toBeLessThanOrEqual(2);
    expect(g.A.box.h).toBeLessThanOrEqual(0.5 * (await page.evaluate(() => document.querySelector('.bs-root').clientHeight)) + 0.5);
  });

  test('sprites keep >= 8 px from HUD boxes and inside the stage (tall 大岩蛇 included)', async ({ page }) => {
    for (const vp of [{ width: 390, height: 844 }, { width: 390, height: 664 }]) {
      await open(page, { vp });
      await pickLead(page, 26);
      const res = await page.evaluate(() => {
        const rr = document.querySelector('.bs-root').getBoundingClientRect();
        const rel = (e) => {
          const r = e.getBoundingClientRect();
          return { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height };
        };
        const g = window.__demo.handle.__test.getGeom();
        const hud = { A: rel(document.querySelector('.bs-hud[data-side="A"]')), B: rel(document.querySelector('.bs-hud[data-side="B"]')) };
        const gap = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
        return { gaps: [gap(g.A.box, hud.A), gap(g.A.box, hud.B), gap(g.B.box, hud.A), gap(g.B.box, hud.B)], boxes: [g.A.box, g.B.box], w: rr.width, h: rr.height };
      });
      for (const gp of res.gaps) expect(gp).toBeGreaterThanOrEqual(8 - 0.5);
      for (const b of res.boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(res.w);
        expect(b.w).toBeLessThanOrEqual(0.46 * res.w + 0.5);
        expect(b.h).toBeLessThanOrEqual(0.5 * res.h + 0.5);
      }
      await page.evaluate(() => window.__demo.restart());
    }
  });

  for (const [w, h, stageH] of [[390, 844, 240], [390, 664, 168]]) {
    test(`layout ${w}x${h}: stage ${stageH}, first move row above the 90px tab bar, no horizontal overflow`, async ({ page }) => {
      await open(page, { vp: { width: w, height: h } });
      const m = await page.evaluate(() => ({
        stageH: document.querySelector('.bs-root').clientHeight + 2,
        containerH: document.getElementById('battleStage').getBoundingClientRect().height,
        moveBottom: document.querySelector('.btn.move').getBoundingClientRect().bottom,
        trayBottom: document.querySelector('.bs-ball').getBoundingClientRect().bottom,
        ih: window.innerHeight,
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(m.containerH).toBe(stageH);
      expect(m.moveBottom).toBeLessThanOrEqual(m.ih - 90);
      expect(m.trayBottom).toBeLessThanOrEqual(m.ih - 90);
      expect(m.sw).toBeLessThanOrEqual(m.cw);
    });
  }

  test('1280 desktop: column and canvas stay ~520, not 1280', async ({ page }) => {
    await open(page, { vp: { width: 1280, height: 900 } });
    const m = await page.evaluate(() => ({
      canvasW: document.querySelector('.bs-root canvas').getBoundingClientRect().width,
      stageW: document.getElementById('battleStage').getBoundingClientRect().width,
      stageH: document.getElementById('battleStage').getBoundingClientRect().height,
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(m.canvasW).toBeLessThanOrEqual(520 + 28);
    expect(m.canvasW).toBeGreaterThan(300);
    expect(m.stageW).toBeLessThanOrEqual(520);
    expect(m.stageH).toBe(240);
    expect(m.sw).toBeLessThanOrEqual(m.cw);
  });

  test('opts.height wins over the default rule', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.__demo.restart({ height: 200 }));
    expect(await page.evaluate(() => document.getElementById('battleStage').getBoundingClientRect().height)).toBe(200);
  });

  test('visualViewport shrink recomputes scale without a resize loop', async ({ page }) => {
    await open(page, { vp: { width: 390, height: 844 } });
    await pickLead(page, 26);
    const before = await page.evaluate(() => ({ g: window.__demo.handle.__test.getGeom(), d: window.__demo.handle.getDiagnostics() }));
    await page.setViewportSize({ width: 390, height: 664 });
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ g: window.__demo.handle.__test.getGeom(), d: window.__demo.handle.getDiagnostics(), h: document.getElementById('battleStage').getBoundingClientRect().height }));
    expect(after.h).toBe(168);
    expect(after.g.A.scale).toBeLessThan(before.g.A.scale);
    expect(after.d.resizeCount - before.d.resizeCount).toBeGreaterThanOrEqual(1);
    expect(after.d.resizeCount - before.d.resizeCount).toBeLessThanOrEqual(3);
    await page.waitForTimeout(600);
    const later = await diag(page);
    expect(later.resizeCount).toBe(after.d.resizeCount); // settled, no loop
  });
});

/* ================= combat ================= */
test.describe('combat', () => {
  test('fixture: adaptMoveResponse equals expectedEvents (visible in the demo as well)', async ({ page }) => {
    await open(page);
    await page.waitForSelector('#fixtureResult[data-ok]', { state: 'attached' });
    expect(await page.getAttribute('#fixtureResult', 'data-ok')).toBe('true');
    const ok = await page.evaluate(async () => {
      const fx = await (await fetch('fixtures/move-response.gym.json')).json();
      return JSON.stringify(window.__bs.adaptMoveResponse(fx.prevView, fx.response.battle, fx.response)) === JSON.stringify(fx.expectedEvents);
    });
    expect(ok).toBe(true);
  });

  test('single attack <= 650 ms; shake constants and Pixi-container shake', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const res = await play(page, [atk('A', 90, 50, 90, { damage: 40, superEffective: true })]);
    expect(res.skipped).toBe(false);
    const d = await diag(page);
    expect(d.lastSequenceMs).toBeLessThanOrEqual(650);
    expect(d.lastSequenceMs).toBeGreaterThan(300);
    const sh = await page.evaluate(() => window.__demo.handle.__test.shake);
    expect(sh.amplitude).toBeLessThanOrEqual(6);
    expect(sh.hz).toBeLessThanOrEqual(12);
    expect(sh.durationMs).toBeLessThanOrEqual(300);
    expect(sh.container).toBe('world');
    expect(sh.lastMaxOffset).toBeGreaterThan(0);
    expect(sh.lastMaxOffset).toBeLessThanOrEqual(6);
    // never the DOM / canvas CSS
    expect(await page.evaluate(() => document.querySelector('.bs-root canvas').style.transform)).toBe('');
  });

  test('HP clamp: -4 -> 0, 120 -> full; trailing attack of a KO pet is dropped, no second lunge', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    await play(page, [atk('A', 30, -4, 40)]);
    await page.waitForTimeout(350);
    expect(await barScale(page, 'B')).toBeCloseTo(0, 3);
    expect(await hudNums(page, 'B')).toBe('0 / 40');
    await page.evaluate(() => window.__demo.restart());
    await pickLead(page, 26);
    await play(page, [atk('A', 30, 120, 40)]);
    await page.waitForTimeout(350);
    expect(await barScale(page, 'B')).toBeCloseTo(1, 3);
    await page.evaluate(() => window.__demo.restart());
    await pickLead(page, 26);
    const before = await page.evaluate(() => window.__demo.handle.__test.lungeCount);
    const r = await play(page, [atk('A', 90, 0, 90), { type: 'faint', side: 'B' }, atk('B', 60, 40, 60), { type: 'miss', side: 'B' }]);
    expect(r.dropped).toBeGreaterThanOrEqual(2);
    expect((await page.evaluate(() => window.__demo.handle.__test.lungeCount)) - before).toBe(1);
  });

  test('update during play buffers; the bar does not move until the sequence settles, then the latest wins', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const out = await page.evaluate(async () => {
      const h = window.__demo.handle;
      const v = JSON.parse(JSON.stringify(window.__demo.state.view));
      const scale = () => {
        const t = getComputedStyle(document.querySelector('.bs-hud[data-side="B"] .bs-fill')).transform;
        return t === 'none' ? 1 : Number(t.match(/matrix\(([^,]+),/)[1]);
      };
      const p = h.play([{ type: 'attack', side: 'A', move: 'x', startHp: 90, targetHp: 50, maxHp: 90 }]);
      v.sides.B.pets[0].hp = 10;
      h.update({ view: v });
      await new Promise((r) => setTimeout(r, 100));
      const mid = scale();
      await p;
      await h.__test.whenIdle();
      await new Promise((r) => setTimeout(r, 350));
      return { mid, end: scale(), txt: document.querySelector('.bs-hud[data-side="B"] .bs-hud-nums').textContent };
    });
    expect(out.mid).toBeCloseTo(1, 3);
    expect(out.end).toBeCloseTo(10 / 90, 2);
    expect(out.txt).toBe('10 / 90');
  });

  test('miss shows 落空 and keeps HP; faint shows 倒下了 and HP 0', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const p = play(page, [{ type: 'miss', side: 'A', move: 'x' }]);
    await page.waitForSelector('.bs-pop');
    expect(await page.locator('.bs-pop').first().textContent()).toContain('落空');
    await p;
    expect(await hudNums(page, 'B')).toBe('90 / 90');
    const p2 = play(page, [{ type: 'faint', side: 'B' }]);
    await page.waitForFunction(() => [...document.querySelectorAll('.bs-pop')].some((x) => x.textContent.includes('倒下了')));
    await p2;
    expect(await hudNums(page, 'B')).toBe('0 / 90');
    expect(await barScale(page, 'B')).toBeCloseTo(0, 3);
  });

  test('switch sequence <= 900 ms (each side)', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    await play(page, [{ type: 'switch', side: 'A', toNo: 34, toName: '尼多王' }]);
    expect((await diag(page)).lastSequenceMs).toBeLessThanOrEqual(900);
    expect((await page.evaluate(() => window.__demo.handle.__test.getGeom().A.no))).toBe(34);
    await play(page, [{ type: 'switch', side: 'B', toNo: 208, toName: '大钢蛇' }]);
    expect((await diag(page)).lastSequenceMs).toBeLessThanOrEqual(900);
    expect((await page.evaluate(() => window.__demo.handle.__test.getGeom().B.no))).toBe(208);
  });

  test('victory resolves <= 600 ms and the stage/canvas do not capture pointers', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const t0 = Date.now();
    await play(page, [{ type: 'victory', winnerSide: 'A', childName: '测试大宝' }]);
    expect(Date.now() - t0).toBeLessThanOrEqual(700); // 600 + evaluate round trip
    expect((await diag(page)).lastSequenceMs).toBeLessThanOrEqual(600);
    const pe = await page.evaluate(() => ({ c: getComputedStyle(document.querySelector('.bs-root canvas')).pointerEvents, r: getComputedStyle(document.querySelector('.bs-root')).pointerEvents }));
    expect(pe).toEqual({ c: 'none', r: 'none' });
    expect(await page.locator('.bs-banner').textContent()).toContain('测试大宝赢啦');
  });

  test('skip(): resolves { skipped:true } within 50 ms with final HP already applied', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const r = await page.evaluate(async () => {
      const h = window.__demo.handle;
      const p = h.play([
        { type: 'attack', side: 'A', move: 'a', startHp: 90, targetHp: 50, maxHp: 90 },
        { type: 'attack', side: 'B', move: 'b', startHp: 60, targetHp: 30, maxHp: 60 },
        { type: 'attack', side: 'A', move: 'a', startHp: 50, targetHp: 10, maxHp: 90 },
      ]);
      await new Promise((res) => setTimeout(res, 120));
      const t0 = performance.now();
      const s = h.skip();
      const res = await p;
      const dt = performance.now() - t0;
      await s;
      return { res, dt, b: document.querySelector('.bs-hud[data-side="B"] .bs-hud-nums').textContent, a: document.querySelector('.bs-hud[data-side="A"] .bs-hud-nums').textContent, tw: h.getDiagnostics().activeTweens };
    });
    expect(r.res.skipped).toBe(true);
    expect(r.dt).toBeLessThan(50);
    expect(r.b).toBe('10 / 90');
    expect(r.a).toBe('30 / 60');
    expect(r.tw).toBe(0);
    // skip with nothing playing is a resolved no-op
    expect(await page.evaluate(() => window.__demo.handle.skip().then(() => 'ok'))).toBe('ok');
  });

  test('play queue: max 1 queued, third replaces the second; busy callbacks pair up', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const r = await page.evaluate(async () => {
      const h = window.__demo.handle;
      const n0 = window.__demo.calls.length;
      const p1 = h.play([{ type: 'miss', side: 'A' }]);
      const p2 = h.play([{ type: 'miss', side: 'B' }]);
      const p3 = h.play([{ type: 'miss', side: 'A' }]);
      const r2 = await p2; // replaced -> resolves immediately
      const r1 = await p1;
      const r3 = await p3;
      return { r1, r2, r3, busy: window.__demo.calls.slice(n0).filter((c) => c.name === 'onBusy').map((c) => c.arg) };
    });
    expect(r.r2).toEqual({ skipped: true });
    expect(r.r1.skipped).toBe(false);
    expect(r.r3.skipped).toBe(false);
    expect(r.busy).toEqual([true, false, true, false]);
  });

  test('same-snapshot update does not restart a lunge or a play', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    await play(page, [atk('A', 90, 50, 90)]);
    const before = await page.evaluate(() => ({ d: window.__demo.handle.getDiagnostics(), l: window.__demo.handle.__test.lungeCount, n: window.__demo.calls.length }));
    await page.evaluate(() => {
      const v = window.__demo.state.view;
      window.__demo.handle.update({ view: v });
      window.__demo.handle.update({ view: JSON.parse(JSON.stringify(v)) });
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ d: window.__demo.handle.getDiagnostics(), l: window.__demo.handle.__test.lungeCount, n: window.__demo.calls.length }));
    expect(after.d.lastSequenceMs).toBe(before.d.lastSequenceMs);
    expect(after.l).toBe(before.l);
    expect(after.n).toBe(before.n);
  });

  test('current-turn log lists every event of the turn (count === events after drops)', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    // 3 x 铁尾 = faint + swap on turn 3
    for (let i = 0; i < 3; i++) {
      await page.click('.btn.move[data-idx="0"]');
      await page.waitForFunction(() => !window.__demo.state.hostBusy);
      const r = await page.evaluate(() => ({ shown: document.querySelectorAll('#turnLog .turn-event').length, kept: window.__bs.sanitizeEvents(window.__demo.state.lastEvents).events.length, raw: window.__demo.state.lastEvents.length, drop: window.__demo.state.lastDropped }));
      expect(r.shown).toBe(r.kept);
      expect(r.kept + r.drop).toBe(r.raw);
    }
    const last = await page.evaluate(() => window.__demo.state.lastEvents.map((e) => e.type));
    expect(last).toEqual(['attack', 'faint', 'switch']);
    expect(await page.locator('#turnLog .turn-event').count()).toBe(3);
  });

  test('aria-live is debounced: a burst of events announces once', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    const r = await page.evaluate(async () => {
      const live = document.querySelector('.bs-live');
      await new Promise((res) => setTimeout(res, 600)); // let the lead-throw announcement flush first
      let changes = 0;
      new MutationObserver(() => changes++).observe(live, { childList: true, characterData: true, subtree: true });
      await window.__demo.handle.play([
        { type: 'attack', side: 'A', move: '铁尾', startHp: 90, targetHp: 0, maxHp: 90 },
        { type: 'faint', side: 'B' },
        { type: 'switch', side: 'B', toNo: 208, toName: '大钢蛇' },
      ]);
      await new Promise((res) => setTimeout(res, 800));
      return { changes, text: live.textContent };
    });
    expect(r.changes).toBe(1);
    expect(r.text).toContain('雷丘使用了铁尾');
    expect(r.text).toContain('倒下了');
  });

  test('image 404: silhouette for that pet, onError copy, scene does not fall back', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(async () => {
      const errs = [];
      const div = document.body.appendChild(document.createElement('div'));
      const mk = (name, no, img) => ({ no, name, img, hp: 10, maxHp: 10 });
      const view = { sides: { A: { activeIdx: 0, pets: [mk('雷丘', 26, 'assets/p26.10a23721.webp')] }, B: { activeIdx: 0, pets: [mk('大岩蛇', 95, 'assets/does-not-exist.webp')] } } };
      const h = await window.__bs.mount(div, { view, phase: 'battle', onError: (e) => errs.push(e.message), onFallback: () => errs.push('FALLBACK') });
      await h.__test; // (no hooks requested)
      await new Promise((res) => setTimeout(res, 300));
      const d = h.getDiagnostics();
      h.unmount();
      div.remove();
      return { errs, mode: d.mode };
    });
    expect(r.mode).toBe('pixi');
    expect(r.errs).toEqual(['这张图片暂时没显示出来，先用剪影吧']);
  });

  test('party / index edge cases: >5 entries, empty tray, bad petIdx, bad activeIdx', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(async () => {
      const out = {};
      const mock = window.__demo.state.mock;
      const mkDiv = () => document.body.appendChild(document.createElement('div'));
      let errs = [];
      let d = mkDiv();
      const six = [...mock.party, { ...mock.party[0], no: 27, name: '多余' }];
      let h = await window.__bs.mount(d, { phase: 'select-lead', view: mock.stubView(), party: six, onError: (e) => errs.push(e.message) });
      out.balls6 = d.querySelectorAll('.bs-ball').length;
      out.err6 = errs.length;
      h.unmount();
      d.remove();
      d = mkDiv();
      h = await window.__bs.mount(d, { phase: 'select-lead', view: mock.stubView(), party: [] });
      out.empty = d.textContent.includes('没有可以出战的伙伴了');
      h.unmount();
      d.remove();
      // battle with a party whose petIdx is missing -> click ignored + onError, no onSwitch
      errs = [];
      const sw = [];
      d = mkDiv();
      const view = JSON.parse(JSON.stringify(window.__demo.state.mock.stubView()));
      view.sides.A.pets = mock.party.slice(0, 2).map((p) => ({ no: p.no, name: p.name, img: p.img, backImg: p.backImg, hp: 10, maxHp: 10 }));
      view.sides.A.activeIdx = 7; // out of range -> clamped + one onError
      h = await window.__bs.mount(d, { phase: 'battle', view, party: [{ ...mock.party[0] }, { ...mock.party[1] }], onError: (e) => errs.push(e.message), onSwitch: (i) => sw.push(i) });
      out.clampErr = errs.length;
      const b = d.querySelector('.bs-ball');
      b.click();
      out.sw = sw.length;
      out.errAfterClick = errs.length;
      h.unmount();
      d.remove();
      return out;
    });
    expect(r.balls6).toBe(5);
    expect(r.err6).toBe(1);
    expect(r.empty).toBe(true);
    expect(r.clampErr).toBe(1);
    expect(r.sw).toBe(0);
    expect(r.errAfterClick).toBe(2);
  });
});

/* ================= tokens, copy, a11y ================= */
test.describe('tokens and copy', () => {
  test('token lint passes', async () => {
    const out = execFileSync('node', ['scripts/lint-tokens.mjs'], { cwd: root, encoding: 'utf8' });
    expect(out).toMatch(/lint-tokens: OK/);
  });

  test('kid-facing UI is Chinese: no raw English codes / STATE_CHANGED in demo or module', async ({ page }) => {
    for (const f of ['src/battle-scene.js', 'demo/index.html', 'demo/demo.js', 'demo/mock-api.js']) {
      expect(readFileSync(join(root, f), 'utf8')).not.toContain('STATE_CHANGED');
    }
    await open(page);
    await pickLead(page, 26);
    await page.click('.btn.move[data-idx="3"]'); // scripted miss
    await settle(page);
    const visible = await page.evaluate(() => document.querySelector('#page').innerText);
    expect(visible).not.toMatch(/NO_BATTLE|BAD_MOVE|STATE_CHANGED|undefined|NaN/);
    expect(visible).toContain('落空');
    expect(await page.locator('.tabbar, .topbar').count()).toBe(2); // not touched by the module
  });

  test('no page errors during a whole scripted battle', async ({ page }) => {
    await open(page);
    await pickLead(page, 26);
    for (let i = 0; i < 5; i++) {
      await page.click('.btn.move[data-idx="0"]');
      await page.waitForFunction(() => !window.__demo.state.hostBusy);
    }
    expect(page._errors).toEqual([]);
  });
});
