// v1.1 fix sheet: A1-A7 and B (drag-ball-to-throw), asserted at the real 390x844 and 390x664 viewports (DPR 2, mobile UA, no ?frame=).
import { test, expect } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const MEASURED = join(dir, '..', '..', 'test-results', 'v11-measured.jsonl');
mkdirSync(dirname(MEASURED), { recursive: true });
writeFileSync(MEASURED, '');
const record = (vp, item, data) => appendFileSync(MEASURED, JSON.stringify({ vp: `${vp.width}x${vp.height}`, item, ...data }) + '\n');

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 390, height: 664 }];
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function open(page, vp) {
  await page.setViewportSize(vp);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/demo/index.html');
  await page.waitForSelector('body[data-ready]');
  await page.evaluate(() => window.__demo.handle.__test.whenIdle());
  page._errors = errors;
}
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
const calls = (page, name) => page.evaluate((n) => window.__demo.calls.filter((c) => c.name === n), name);
const diag = (page) => page.evaluate(() => window.__demo.handle.getDiagnostics());
const hudText = (page, side) => page.evaluate((s) => document.querySelector(`.bs-hud[data-side="${s}"]`).innerText, side);
const hudNums = (page, side) => page.evaluate((s) => document.querySelector(`.bs-hud[data-side="${s}"] .bs-hud-nums`).textContent, side);
const center = async (page, sel) => {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

for (const vp of VIEWPORTS) {
  test.describe(`v1.1 @ ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA });

    test('A1 busy moves: every button fully inside the viewport, text not clipped, font >= 14', async ({ page }) => {
      await open(page, vp);
      await pickLead(page, 26);
      await page.click('.btn.move[data-idx="0"]');
      await page.waitForFunction(() => window.__demo.state.hostBusy && document.querySelector('#moves .btn').textContent === '出招中…');
      const r = await page.evaluate(() => {
        const row = document.querySelector('#moves');
        return {
          iw: window.innerWidth,
          row: { sw: row.scrollWidth, cw: row.clientWidth },
          btns: [...row.querySelectorAll('.btn')].map((b) => ({ text: b.textContent, right: b.getBoundingClientRect().right, left: b.getBoundingClientRect().left, sw: b.scrollWidth, cw: b.clientWidth, fs: parseFloat(getComputedStyle(b).fontSize), bg: getComputedStyle(b).backgroundColor, fg: getComputedStyle(b).color })),
        };
      });
      record(vp, 'A1', { innerWidth: r.iw, rights: r.btns.map((b) => +b.right.toFixed(2)), maxRightMinusViewport: +(Math.max(...r.btns.map((b) => b.right)) - r.iw).toFixed(2), rowScrollWidth: r.row.sw, rowClientWidth: r.row.cw, btnScrollMinusClient: r.btns.map((b) => b.sw - b.cw), fontSizes: r.btns.map((b) => b.fs), text: r.btns[0].text });
      expect(r.btns).toHaveLength(4);
      for (const b of r.btns) {
        expect(b.text).toBe('出招中…');
        expect(b.right).toBeLessThanOrEqual(r.iw);
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.sw).toBeLessThanOrEqual(b.cw + 1);
        expect(b.fs).toBeGreaterThanOrEqual(14);
      }
      expect(r.row.sw).toBeLessThanOrEqual(r.row.cw + 1);
      await settle(page);
      // idle names fit too (铁尾 / 十万伏特 / 撞击 / 电光一闪)
      const idle = await page.evaluate(() => [...document.querySelectorAll('#moves .btn')].map((b) => ({ right: b.getBoundingClientRect().right, sw: b.scrollWidth, cw: b.clientWidth })));
      for (const b of idle) {
        expect(b.right).toBeLessThanOrEqual(vp.width);
        expect(b.sw).toBeLessThanOrEqual(b.cw + 1);
      }
      // 90px tab bar clearance is unchanged: first row bottom to tab bar top
      const gap = await page.evaluate(() => document.querySelector('.tabbar').getBoundingClientRect().top - document.querySelector('#moves .btn').getBoundingClientRect().bottom);
      record(vp, 'A1-tabbar', { firstRowBottomToTabbarTop: +gap.toFixed(2) });
      expect(gap).toBeGreaterThanOrEqual(60 - 0.5);
    });

    test('A2 victory banner does not intersect either HUD or the weather badge; HUD text complete', async ({ page }) => {
      await open(page, vp);
      await pickLead(page, 26);
      await page.evaluate(() => window.__demo.handle.play([{ type: 'victory', winnerSide: 'A', childName: '测试大宝' }]));
      const r = await page.evaluate(() => {
        const R = (s) => {
          const e = document.querySelector(s);
          const b = e.getBoundingClientRect();
          return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, sw: e.scrollWidth, cw: e.clientWidth };
        };
        return { banner: R('.bs-banner'), a: R('.bs-hud-a'), b: R('.bs-hud-b'), w: R('.bs-weather'), root: R('.bs-root'), at: document.querySelector('.bs-hud-a').innerText, bt: document.querySelector('.bs-hud-b').innerText, bannerText: document.querySelector('.bs-banner').textContent };
      });
      const areas = { hudA: inter(r.banner, r.a), hudB: inter(r.banner, r.b), weather: inter(r.banner, r.w) };
      record(vp, 'A2', { intersectionArea: areas, gapBannerTopToHudABottom: +(r.banner.top - r.a.bottom).toFixed(2), hudAText: r.at, hudBText: r.bt, banner: r.bannerText });
      expect(areas).toEqual({ hudA: 0, hudB: 0, weather: 0 });
      expect(r.at).toMatch(/\d+\s*\/\s*\d+/);
      expect(r.bt).toMatch(/\d+\s*\/\s*\d+/);
      expect(r.at).toContain('雷丘');
      expect(r.a.sw).toBeLessThanOrEqual(r.a.cw + 1);
      expect(r.banner.left).toBeGreaterThanOrEqual(r.root.left);
      expect(r.banner.right).toBeLessThanOrEqual(r.root.right);
      expect(r.banner.bottom).toBeLessThanOrEqual(r.root.bottom);
      expect(r.bannerText).toContain('测试大宝赢啦');
      // and after a lost battle line too (longer copy)
      await page.evaluate(() => window.__demo.handle.play([{ type: 'victory', winnerSide: 'B' }]));
      const lose = await page.evaluate(() => {
        const bn = document.querySelector('.bs-banner').getBoundingClientRect();
        const a = document.querySelector('.bs-hud-a').getBoundingClientRect();
        return { bn: { left: bn.left, right: bn.right, top: bn.top, bottom: bn.bottom }, a: { left: a.left, right: a.right, top: a.top, bottom: a.bottom } };
      });
      expect(inter(lose.bn, lose.a)).toBe(0);
    });

    test('A3 foot on the shadow (also mid-lunge), weather badge clear of sprite boxes, >= 8px from HUDs', async ({ page }) => {
      await open(page, vp);
      const out = {};
      for (const lead of [26, 34]) {
        await pickLead(page, lead);
        const g = await page.evaluate(() => {
          const rr = document.querySelector('.bs-root').getBoundingClientRect();
          const rel = (s) => {
            const r = document.querySelector(s).getBoundingClientRect();
            return { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height };
          };
          const geom = window.__demo.handle.__test.getGeom();
          return { geom, wx: rel('.bs-weather'), ha: rel('.bs-hud-a'), hb: rel('.bs-hud-b'), w: rr.width, h: rr.height };
        });
        const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        const gap = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
        const d = (s) => Math.abs(g.geom[s].footY - g.geom[s].shadowCenterY);
        out[lead] = { A: { no: g.geom.A.no, footMinusShadow: +d('A').toFixed(3) }, B: { no: g.geom.B.no, footMinusShadow: +d('B').toFixed(3) }, weatherBoxOverlap: [ov(g.wx, g.geom.A.box), ov(g.wx, g.geom.B.box)], hudGaps: [gap(g.geom.A.box, g.ha), gap(g.geom.A.box, g.hb), gap(g.geom.B.box, g.ha), gap(g.geom.B.box, g.hb)].map((x) => +x.toFixed(1)) };
        expect(g.geom.B.no).toBe(95);
        expect(d('A')).toBeLessThanOrEqual(2);
        expect(d('B')).toBeLessThanOrEqual(2);
        expect(ov(g.wx, g.geom.A.box)).toBe(0);
        expect(ov(g.wx, g.geom.B.box)).toBe(0);
        for (const x of [gap(g.geom.A.box, g.ha), gap(g.geom.A.box, g.hb), gap(g.geom.B.box, g.ha), gap(g.geom.B.box, g.hb)]) expect(x).toBeGreaterThanOrEqual(7.5);
        for (const s of ['A', 'B']) {
          const b = g.geom[s].box;
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(g.w);
          expect(b.y + b.h).toBeLessThanOrEqual(g.h);
        }
        await page.evaluate(() => window.__demo.restart());
        await page.evaluate(() => window.__demo.handle.__test.whenIdle());
      }
      // mid-lunge: both pets sampled while attacking, the shadow travels with the foot
      await pickLead(page, 26);
      const lunge = await page.evaluate(async () => {
        const h = window.__demo.handle;
        const worst = { A: 0, B: 0 };
        const p = h.play([
          { type: 'attack', side: 'A', move: 'a', startHp: 90, targetHp: 60, maxHp: 90 },
          { type: 'attack', side: 'B', move: 'b', startHp: 60, targetHp: 40, maxHp: 60 },
        ]);
        let done = false;
        p.then(() => (done = true));
        while (!done) {
          const g = h.__test.getGeom();
          for (const s of ['A', 'B']) if (g[s]) worst[s] = Math.max(worst[s], Math.abs(g[s].footY - g[s].shadowCenterY));
          await new Promise((r) => requestAnimationFrame(r));
        }
        return worst;
      });
      record(vp, 'A3', { atRest: out, worstFootMinusShadowDuringLunges: { A: +lunge.A.toFixed(3), B: +lunge.B.toFixed(3) } });
      expect(lunge.A).toBeLessThanOrEqual(2);
      expect(lunge.B).toBeLessThanOrEqual(2);
    });

    test('A4 update during play is buffered, applied after resolve (numbers and bar scale)', async ({ page }) => {
      await open(page, vp);
      await pickLead(page, 26);
      const r = await page.evaluate(async () => {
        const h = window.__demo.handle;
        const q = (s) => document.querySelector(`.bs-hud[data-side="${s}"] .bs-hud-nums`).textContent;
        const scale = (s) => {
          const t = getComputedStyle(document.querySelector(`.bs-hud[data-side="${s}"] .bs-fill`)).transform;
          return t && t !== 'none' ? Number(t.match(/matrix\(([^,]+),/)[1]) : 1;
        };
        const v = JSON.parse(JSON.stringify(window.__demo.state.view));
        v.sides.A.pets[v.sides.A.activeIdx].hp = 12;
        v.sides.B.pets[v.sides.B.activeIdx].hp = 1;
        const before = { A: q('A'), B: q('B') };
        let done = false;
        const p = h.play([{ type: 'attack', side: 'A', startHp: 90, targetHp: 50, maxHp: 90 }]);
        p.then(() => (done = true));
        h.update({ view: v });
        h.update({ view: JSON.parse(JSON.stringify(v)) }); // same snapshot again: must not replay
        const mid = [];
        while (!done) {
          mid.push({ A: q('A'), B: q('B') });
          await new Promise((res) => setTimeout(res, 20));
        }
        const atResolve = { A: q('A'), B: q('B') };
        const t0 = performance.now();
        let after = null;
        while (performance.now() - t0 < 350) {
          if (q('A') === '12 / 60' && q('B') === '1 / 90') {
            after = { A: q('A'), B: q('B'), ms: Math.round(performance.now() - t0) };
            break;
          }
          await new Promise((res) => setTimeout(res, 10));
        }
        await new Promise((res) => setTimeout(res, 350));
        return { before, mid, atResolve, after, final: { A: q('A'), B: q('B'), sA: scale('A'), sB: scale('B') }, lunges: h.__test.lungeCount };
      });
      record(vp, 'A4', { before: r.before, midSamples: r.mid.length, midDistinct: [...new Set(r.mid.map((m) => `${m.A} | ${m.B}`))], atResolve: r.atResolve, appliedAfterResolveMs: r.after && r.after.ms, final: r.final });
      for (const m of r.mid) {
        expect(m.A).toBe('60 / 60');
        expect(m.B).not.toMatch(/^1 \/ /);
      }
      expect(r.after).not.toBeNull();
      expect(r.final.A).toBe('12 / 60');
      expect(r.final.B).toBe('1 / 90');
      expect(r.final.sA).toBeCloseTo(12 / 60, 2);
      expect(r.final.sB).toBeCloseTo(1 / 90, 2);
      expect(r.lunges).toBe(1);
    });

    test('A5 own HUD already shows name and hp / maxHp while the ball is in the air', async ({ page }) => {
      await open(page, vp);
      expect(await hudText(page, 'A')).toBe('');
      const r = await page.evaluate(async () => {
        const out = [];
        document.querySelector('.bs-ball[data-no="26"]').click();
        const t0 = performance.now();
        const hud = () => document.querySelector('.bs-hud-a').innerText;
        out.push({ t: 0, text: hud(), leadCalls: window.__demo.calls.filter((c) => c.name === 'onChooseLead').length, running: window.__demo.handle.getDiagnostics().activeTweens });
        for (const ms of [100, 250, 400]) {
          await new Promise((res) => setTimeout(res, ms - (performance.now() - t0)));
          out.push({ t: Math.round(performance.now() - t0), text: hud(), tweens: window.__demo.handle.getDiagnostics().activeTweens });
        }
        return out;
      });
      record(vp, 'A5', { samples: r.map((s) => ({ t: s.t, text: s.text })) });
      expect(r[0].leadCalls).toBe(1);
      for (const s of r) expect(s.text).toMatch(/\d+\s*\/\s*\d+/);
      expect(r[0].text).toContain('雷丘');
      await settle(page);
      expect(await hudNums(page, 'A')).toBe('60 / 60');
    });

    test('A6 miss then faint: aria-live reads 倒下了 (also when the miss was already announced)', async ({ page }) => {
      await open(page, vp);
      await pickLead(page, 26);
      await page.waitForTimeout(500);
      const r = await page.evaluate(async () => {
        const h = window.__demo.handle;
        const live = document.querySelector('[aria-live]');
        await h.play([{ type: 'miss', side: 'A', move: '电光一闪' }]);
        const afterMiss = live.textContent;
        await new Promise((res) => setTimeout(res, 600)); // the miss line settles
        await h.play([{ type: 'faint', side: 'B' }]);
        const afterFaint = live.textContent;
        return { afterMiss, afterFaint };
      });
      record(vp, 'A6', { liveAfterMiss: r.afterMiss, liveAfterFaint: r.afterFaint });
      expect(r.afterMiss).toContain('落空');
      expect(r.afterFaint).toContain('倒下了');
      // back to back, one sequence, two plays without a gap
      await page.evaluate(() => window.__demo.restart());
      await pickLead(page, 26);
      await page.waitForTimeout(500);
      const r2 = await page.evaluate(async () => {
        const h = window.__demo.handle;
        const live = document.querySelector('[aria-live]');
        await h.play([{ type: 'miss', side: 'A', move: 'x' }]);
        await h.play([{ type: 'faint', side: 'B' }]);
        return live.textContent;
      });
      record(vp, 'A6-back-to-back', { live: r2 });
      expect(r2).toContain('倒下了');
    });

    test('A7 .bs-ball computed font-size >= 14 (44px select balls and 36px battle balls)', async ({ page }) => {
      await open(page, vp);
      const sel = await page.evaluate(() => [...document.querySelectorAll('.bs-ball')].map((b) => ({ fs: parseFloat(getComputedStyle(b).fontSize), w: b.getBoundingClientRect().width })));
      await pickLead(page, 26);
      const bat = await page.evaluate(() => [...document.querySelectorAll('.bs-ball')].map((b) => ({ fs: parseFloat(getComputedStyle(b).fontSize), w: b.getBoundingClientRect().width })));
      record(vp, 'A7', { select: sel, battle: bat });
      expect(sel.length).toBe(5);
      expect(bat.length).toBe(4);
      expect(sel[0].w).toBe(44);
      expect(bat[0].w).toBe(36);
      for (const b of [...sel, ...bat]) expect(b.fs).toBeGreaterThanOrEqual(14);
    });

    /* ---------------- B: drag to throw ---------------- */
    const dragTo = async (page, from, to, { steps = 12, release = true } = {}) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps });
      if (release) await page.mouse.up();
    };

    test('B drag success: lead (雷丘) then switch (尼多王) fire exactly once, sequence <= 900, page does not scroll', async ({ page }) => {
      await open(page, vp);
      const scrollBefore = await page.evaluate(() => [window.scrollX, window.scrollY]);
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.bs-ball')).touchAction)).toBe('none');
      const ball = await center(page, '.bs-ball[data-no="26"]');
      const stage = await page.locator('.bs-root').boundingBox();
      const target = { x: stage.x + stage.width / 2, y: stage.y + stage.height * 0.4 };
      await dragTo(page, ball, target, { release: false });
      const mid = await page.evaluate(() => ({ ghosts: document.querySelectorAll('.bs-ghost').length, leads: window.__demo.calls.filter((c) => c.name === 'onChooseLead').length, scroll: [window.scrollX, window.scrollY] }));
      expect(mid.ghosts).toBe(1);
      expect(mid.leads).toBe(0); // nothing fires until the release
      expect(mid.scroll).toEqual(scrollBefore);
      await page.mouse.up();
      await page.waitForFunction(() => window.__demo.state.view && !window.__demo.state.hostBusy);
      await settle(page);
      let leads = await calls(page, 'onChooseLead');
      expect(leads.map((c) => c.arg)).toEqual([26]);
      const leadMs = (await diag(page)).lastSequenceMs;
      expect(leadMs).toBeLessThanOrEqual(900);
      expect(await page.locator('.bs-ghost').count()).toBe(0);
      expect(await page.evaluate(() => window.__demo.handle.__test.getGeom().A.no)).toBe(26);
      // battle: drag 尼多王 onto the stage
      const ball2 = await center(page, '.bs-ball[data-no="34"]');
      await dragTo(page, ball2, target);
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onSwitch'));
      await settle(page);
      const sw = await calls(page, 'onSwitch');
      expect(sw.map((c) => c.arg)).toEqual([{ swapToIdx: 1, leadNo: 34 }]);
      expect(await page.evaluate(() => window.__demo.handle.__test.getGeom().A.no)).toBe(34);
      expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual(scrollBefore);
      // the switch sequence itself (throw + retreat + send-out) stays inside 900 ms: sample it from the module
      const swMs = await page.evaluate(() => window.__demo.handle.getDiagnostics().lastSequenceMs);
      record(vp, 'B-success', { onChooseLeadCalls: leads.length, onSwitchCalls: sw.length, lastSequenceMsLead: leadMs, lastSequenceMsAfterSwitchTurn: swMs, ghostsDuringDrag: mid.ghosts, scrollBefore, scrollDuring: mid.scroll, touchAction: 'none' });
      expect(await calls(page, 'onChooseLead')).toHaveLength(1);
      expect(page._errors).toEqual([]);
    });

    test('B drag success: switch sequence lastSequenceMs <= 900 (host sequence isolated)', async ({ page }) => {
      await open(page, vp);
      await pickLead(page, 26);
      // drive the same enqueue the drop triggers, without the host's own turn, by dropping while the host stays idle
      await page.evaluate(() => {
        window.__demo.state.mock.post = async () => ({ ok: false, error: 'BAD_SWAP' });
      });
      const ball = await center(page, '.bs-ball[data-no="34"]');
      const stage = await page.locator('.bs-root').boundingBox();
      await dragTo(page, ball, { x: stage.x + stage.width / 2, y: stage.y + stage.height * 0.4 });
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onSwitch'));
      await settle(page);
      const ms = (await diag(page)).lastSequenceMs;
      record(vp, 'B-switch-sequence', { lastSequenceMs: ms });
      expect(ms).toBeLessThanOrEqual(900);
      expect(ms).toBeGreaterThan(0);
    });

    test('B drag cancel: release outside the stage = zero callbacks, no busy lock, ball stays, then a tap still works', async ({ page }) => {
      await open(page, vp);
      const scrollBefore = await page.evaluate(() => [window.scrollX, window.scrollY]);
      const ball = await center(page, '.bs-ball[data-no="26"]');
      const stage = await page.locator('.bs-root').boundingBox();
      // above the stage (topbar), outside .bs-root
      await dragTo(page, ball, { x: stage.x + stage.width / 2, y: Math.max(5, stage.y - 25) });
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => ({ cbs: window.__demo.calls.filter((c) => ['onChooseLead', 'onSwitch', 'onBusy'].includes(c.name)).length, balls: document.querySelectorAll('.bs-ball').length, ghosts: document.querySelectorAll('.bs-ghost').length, busy: window.__demo.state.hostBusy, active: window.__demo.handle.getDiagnostics().activeTweens, scroll: [window.scrollX, window.scrollY] }));
      record(vp, 'B-cancel', { callbacksFired: r.cbs, ballsInTray: r.balls, ghostsLeft: r.ghosts, hostBusy: r.busy, scroll: r.scroll });
      expect(r.cbs).toBe(0);
      expect(r.balls).toBe(5);
      expect(r.ghosts).toBe(0);
      expect(r.busy).toBe(false);
      expect(r.active).toBe(0);
      expect(r.scroll).toEqual(scrollBefore);
      // released on the tray itself (below the throw line) is also a cancel
      const b2 = await center(page, '.bs-ball[data-no="26"]');
      await dragTo(page, b2, { x: b2.x + 40, y: b2.y });
      expect((await calls(page, 'onChooseLead')).length).toBe(0);
      // pointercancel (browser takes over the gesture): no callback either
      await page.dispatchEvent('.bs-ball[data-no="26"]', 'pointerdown', { pointerId: 7, isPrimary: true, button: 0, clientX: b2.x, clientY: b2.y, bubbles: true });
      await page.dispatchEvent('.bs-ball[data-no="26"]', 'pointercancel', { pointerId: 7, isPrimary: true, bubbles: true });
      expect((await calls(page, 'onChooseLead')).length).toBe(0);
      // and the next tap is a normal throw
      await page.click('.bs-ball[data-no="26"]');
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onChooseLead'));
      await settle(page);
      expect((await calls(page, 'onChooseLead')).map((c) => c.arg)).toEqual([26]);
    });

    test('B drag ignored while busy (isBusy / running)', async ({ page }) => {
      await open(page, vp);
      await pickLead(page, 26);
      await page.evaluate(() => (window.__demo.state.hostBusy = true));
      const ball = await center(page, '.bs-ball[data-no="34"]');
      const stage = await page.locator('.bs-root').boundingBox();
      await dragTo(page, ball, { x: stage.x + stage.width / 2, y: stage.y + stage.height * 0.4 });
      expect(await page.locator('.bs-ghost').count()).toBe(0);
      expect((await calls(page, 'onSwitch')).length).toBe(0);
      await page.evaluate(() => (window.__demo.state.hostBusy = false));
    });

    test('B tap: a plain tap (movement < threshold) still throws at once, once', async ({ page }) => {
      await open(page, vp);
      const ball = await center(page, '.bs-ball[data-no="26"]');
      await page.mouse.move(ball.x, ball.y);
      await page.mouse.down();
      await page.mouse.move(ball.x + 3, ball.y - 3);
      await page.mouse.up();
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onChooseLead'));
      await settle(page);
      const leads = await calls(page, 'onChooseLead');
      const busy = await calls(page, 'onBusy');
      record(vp, 'B-tap', { onChooseLeadCalls: leads.length, firstCallToBusyTrueMs: leads[0].t - busy.find((c) => c.arg === true).t, lastSequenceMs: (await diag(page)).lastSequenceMs });
      expect(leads.map((c) => c.arg)).toEqual([26]);
      expect((await diag(page)).lastSequenceMs).toBeLessThanOrEqual(900);
      // touch tap too
      await page.evaluate(() => window.__demo.restart());
      await page.evaluate(() => window.__demo.handle.__test.whenIdle());
      await page.locator('.bs-ball[data-no="34"]').tap();
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onChooseLead'));
      expect((await calls(page, 'onChooseLead')).map((c) => c.arg)).toEqual([26, 34]); // the demo's call log survives restart(): 26 from the mouse tap, 34 from this touch tap
    });

    test('B reduced-motion / CSS fallback: single tap still selects and switches with the same callbacks', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, vp);
      expect((await diag(page)).mode).toBe('fallback');
      await pickLead(page, 26);
      await page.click('.bs-ball[data-no="34"]');
      await page.waitForFunction(() => window.__demo.calls.some((c) => c.name === 'onSwitch'));
      expect((await calls(page, 'onChooseLead')).map((c) => c.arg)).toEqual([26]);
      expect((await calls(page, 'onSwitch')).map((c) => c.arg)).toEqual([{ swapToIdx: 1, leadNo: 34 }]);
    });
  });
}
