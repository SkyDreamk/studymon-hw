/**
 * Shared battle scene - Phase 1 Gym (PixiJS v8, standalone ES module).
 * Public API: mount / unmount / adaptMoveResponse (+ handle: update, unmount, fallback,
 * getDiagnostics, play, skip). See README.md. Extra named export: sanitizeEvents (pure).
 * Pixi imports are tree-shaken: Application, Assets, Container, Graphics, Sprite.
 */
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { adaptMoveResponse, sanitizeEvents, hpClamp } from './adapt-move-response.js';

export { adaptMoveResponse, sanitizeEvents };

const STYLE_ID = 'battle-scene-styles';
const LOW_FPS_KEY = 'sm_battle_low_fps';
const MUTE_KEY = 'sm_battle_fx_muted';
const SHAKE = Object.freeze({ amplitude: 5, hz: 10, durationMs: 280 });
const MAX_PARTICLES = 24;
const THROW_MS = 500;
const LAYOUT = { B: { fx: 0.71, fy: 0.44, hf: 0.42 }, A: { fx: 0.34, fy: 0.72, hf: 0.4 }, wFrac: 0.46 };
const OTHER = { A: 'B', B: 'A' };
const WEATHER = { sun: '晴天', rain: '下雨', sand: '沙暴' };
const COPY = {
  select: '请选一只先发出场',
  thrown: (n) => `扔出${n}！`,
  skip: '跳过演出',
  miss: '落空',
  faint: '倒下了',
  switchIn: '上场了',
  win: (n) => `对战结束！${n || ''}赢啦！`,
  lose: '再练一次就会更熟，你可以的',
  none: '没有可以出战的伙伴了',
  img404: '这张图片暂时没显示出来，先用剪影吧',
  stale: '刚才那一步没对上，已经帮你同步好了',
  heal: '回复',
  sup: '效果拔群',
  nve: '效果不佳',
  imm: '没有效果',
  crit: '会心一击',
};

/* ---------- module-level counters (this module's own resources) ---------- */
let current = null;
let listenerCount = 0;
let contextCount = 0;
let appsCreated = 0;
let warnedMode = false;
const urlRefs = new Map(); // url -> refcount of live instances that loaded it
const boundsCache = new Map(); // url -> { box: {x0,y0,x1,y1} fractions, fallback }

const CSS = `
.bs-root{position:relative;width:100%;height:100%;overflow:hidden;box-sizing:border-box;border:1px solid #F0E2CC;border-radius:16px;background:linear-gradient(#FFF7E8 0,#FFF7E8 30%,#E8D4B8 30%,#E8D4B8 100%);color:#3D2C1E;pointer-events:none;user-select:none;-webkit-user-select:none;font-size:14px;font-weight:400}
.bs-root canvas{display:block;position:absolute;left:0;top:0;pointer-events:none}
.bs-shadow{position:absolute;border-radius:50%;background:#3D2C1E;opacity:.18}
.bs-pet{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}
.bs-pet img,.bs-pet .bs-sil{position:absolute;max-width:none;display:block}
.bs-sil{background:#7A6552;border-radius:50%}
.bs-hud{position:absolute;box-sizing:border-box;width:150px;padding:4px 8px 5px;background:#fff;border:1px solid #F0E2CC;border-radius:10px;box-shadow:0 2px 8px rgba(120,80,30,.12);line-height:16px}
.bs-hud-b{left:8px;top:8px}
.bs-hud-a{right:8px;bottom:44px}
.bs-hud-row{display:flex;justify-content:space-between;gap:6px;font-size:14px;font-weight:600;white-space:nowrap}
.bs-hud-nums{font-weight:400;color:#3D2C1E}
.bs-bar{height:6px;margin-top:3px;border-radius:3px;background:#F0E2CC;overflow:hidden}
.bs-fill{width:100%;height:100%;background:#FF9F43;transform-origin:left center;transition:transform 250ms linear}
.bs-weather{position:absolute;right:8px;top:8px;padding:2px 8px;border-radius:10px;background:#fff;border:1px solid #F0E2CC;font-size:14px;font-weight:500;color:#7A6552;line-height:16px}
.bs-pop{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,0);white-space:nowrap;font-weight:600;color:#3D2C1E;text-align:center}
.bs-pop b{font-size:22px;font-weight:600;line-height:24px}
.bs-pop i{font-style:normal;font-size:14px;font-weight:500;color:#7A6552;line-height:16px}
.bs-banner{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);box-sizing:border-box;width:max-content;max-width:calc(100% - 16px);padding:6px 14px;border-radius:12px;background:#fff;border:1px solid #F0E2CC;box-shadow:0 2px 8px rgba(120,80,30,.12);font-size:18px;font-weight:600;line-height:24px;text-align:center}
.bs-tray{position:absolute;left:8px;right:8px;bottom:4px;display:flex;flex-direction:column;align-items:center;gap:2px}
.bs-prompt{font-size:16px;font-weight:600;line-height:22px;color:#3D2C1E}
.bs-balls{display:flex;gap:8px;justify-content:center}
.bs-ball{pointer-events:auto;touch-action:none;font-size:14px;-webkit-tap-highlight-color:transparent;box-sizing:border-box;width:36px;height:36px;padding:0;margin:0;border:2px solid #FF9F43;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(120,80,30,.12);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden}
.bs-ball img{width:28px;height:28px;object-fit:contain;pointer-events:none}
.bs-select .bs-ball{width:44px;height:44px}
.bs-select .bs-ball img{width:36px;height:36px}
.bs-ghost{position:fixed;left:0;top:0;z-index:2147483000;width:44px;height:44px;margin:-22px 0 0 -22px;border:2px solid #FF9F43;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(120,80,30,.12);display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none;touch-action:none}
.bs-ghost img{width:36px;height:36px;object-fit:contain}
.bs-ball:focus-visible{outline:2px solid #FF9F43;outline-offset:2px}
.bs-ball[aria-disabled="true"],.bs-ball:disabled{opacity:.4;cursor:default}
.bs-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bs-dbg-box{position:absolute;border:1px dashed #3D2C1E;box-sizing:border-box}
.bs-dbg-dot{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#FF9F43}
`;

/* ---------- small utilities ---------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (p) => 1 - (1 - p) * (1 - p);
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function listen(target, type, fn, options, bag) {
  if (!target || !target.addEventListener) return;
  target.addEventListener(type, fn, options);
  listenerCount++;
  bag.push(() => {
    target.removeEventListener(type, fn, options);
    listenerCount--;
  });
}

function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : 0;
}

function scanBounds(src, w, h) {
  const k = Math.min(1, 128 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, cw, ch);
  const d = ctx.getImageData(0, 0, cw, ch).data;
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (d[(y * cw + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('empty');
  return { x0: x0 / cw, y0: y0 / ch, x1: (x1 + 1) / cw, y1: (y1 + 1) / ch };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('img'));
    im.src = url;
  });
}

function injectStyle() {
  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }
}

function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

/* ====================================================================== */

export async function mount(container, opts = {}) {
  if (current) current.unmount();
  const inst = createInstance(container, opts);
  current = inst;
  await inst.boot();
  return inst.handle;
}

export function unmount() {
  if (current) current.unmount();
}

function createInstance(container, opts) {
  let destroyed = false;
  let mode = 'booting'; // 'pixi' | 'fallback' | 'booting'
  let lastFallbackReason;
  let phase = opts.phase || 'battle';
  let view = opts.view || { sides: {} };
  let party = Array.isArray(opts.party) ? opts.party : null;
  let muted = !!opts.muted;
  let pendingUpdate = null;
  let busy = false;
  let leadAccepted = false;
  let localLead = null;
  let running = null;
  let queued = null;
  let skipping = false;
  let lastSequenceMs;
  let boundsFallbackCount = 0;
  let resizeCount = 0;
  let particlesEnabled = true;
  let particleCount = 0;
  let maxFps = 60;
  let fpsReal = 0;
  let activeApp = false;
  let syncToken = 0;
  let syncPromise = Promise.resolve();
  let pendingFallback = null;
  let erroredOnce = new Set();
  let shakeApplied = 0;
  let lungeCount = 0;

  const cleanups = [];
  const trayCleanups = [];
  const ownedUrls = new Set();
  const vis = { A: null, B: null }; // visual entity per side
  const disp = { A: null, B: null }; // displayed pet data per side

  let app = null;
  let world = null;
  let petLayer = null;
  let fxLayer = null;
  let canvas = null;

  /* ----- DOM ----- */
  const prevHeightStyle = container.style.height;
  container.replaceChildren();
  const hostHeight = parseFloat(getComputedStyle(container).height) || 0; // measured while empty
  injectStyle();
  const root = el('div', 'bs-root');
  root.setAttribute('data-battle-stage', '');
  root.style.pointerEvents = 'none';
  container.appendChild(root);
  const shadows = { A: el('div', 'bs-shadow', root), B: el('div', 'bs-shadow', root) };
  shadows.A.style.display = shadows.B.style.display = 'none';
  const cssLayer = el('div', 'bs-css-layer', root);
  const weatherEl = el('div', 'bs-weather', root);
  weatherEl.style.display = 'none';
  const huds = {};
  for (const side of ['B', 'A']) {
    const box = el('div', `bs-hud bs-hud-${side.toLowerCase()}`, root);
    box.dataset.side = side;
    const row = el('div', 'bs-hud-row', box);
    const name = el('span', 'bs-hud-name', row);
    const nums = el('span', 'bs-hud-nums', row);
    const bar = el('div', 'bs-bar', box);
    const fill = el('div', 'bs-fill', bar);
    fill.style.transform = 'scaleX(0)';
    box.style.display = 'none';
    huds[side] = { box, name, nums, fill };
  }
  const popLayer = el('div', 'bs-pops', root);
  const tray = el('div', 'bs-tray', root);
  const live = el('div', 'bs-live', root);
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('role', 'status');
  let banner = null;
  const dbg = { on: !!opts.debug, els: [] };

  /* ----- stage height rule ----- */
  let ownHeight = false;
  function chooseHeight() {
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    return vh >= 800 ? 240 : 168;
  }
  if (Number(opts.height) > 0) {
    container.style.height = `${Number(opts.height)}px`;
  } else {
    if (hostHeight > 0 || (container.style.height && parseFloat(container.style.height) > 0)) {
      // host-owned (inline or stylesheet height): that wins
    } else {
      ownHeight = true;
      container.style.height = `${chooseHeight()}px`;
    }
  }

  function size() {
    return { w: Math.max(1, root.clientWidth), h: Math.max(1, root.clientHeight) };
  }

  /* ----- callbacks (all suppressed after destroy) ----- */
  const cb = (name, arg) => {
    if (destroyed) return;
    try {
      const f = opts[name];
      if (typeof f === 'function') f(arg);
    } catch (err) {
      console.error('battle-scene callback error', name, err);
    }
  };
  function reportError(key, message, error) {
    if (erroredOnce.has(key) && key !== 'always') return;
    erroredOnce.add(key);
    cb('onError', { message, error });
  }
  function setBusy(b) {
    if (busy === b) return;
    busy = b;
    cb('onBusy', b);
  }

  /* ----- tween engine ----- */
  const tweens = [];
  let timer = null;
  function stepTweens() {
    const t = now();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const p = clamp01((t - tw.start) / tw.dur);
      tw.fn(p);
      if (p >= 1) {
        tweens.splice(i, 1);
        tw.resolve();
      }
    }
    if (!tweens.length && timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  function tween(dur, fn) {
    return new Promise((resolve) => {
      if (destroyed) return resolve();
      if (skipping || dur <= 0) {
        fn(1);
        return resolve();
      }
      tweens.push({ start: now(), dur, fn, resolve });
      if (mode !== 'pixi' && !timer) timer = setInterval(stepTweens, 16);
    });
  }
  function finishAll() {
    const list = tweens.splice(0);
    for (const tw of list) {
      if (!destroyed) tw.fn(1);
      tw.resolve();
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  const delay = (ms) => tween(ms, () => {});

  /* ----- announce (debounced aria-live) ----- */
  let announceLines = [];
  let announceTimer = null;
  function announce(line) {
    if (!line || destroyed) return;
    if (announceLines[announceLines.length - 1] === line) return; // identical neighbours merge; different lines never get dropped
    announceLines.push(line);
    if (running) return; // a whole sequence is one burst: it is announced as soon as it settles
    flushAnnounceSoon();
  }
  function flushAnnounceNow() {
    if (!announceLines.length || destroyed) return;
    clearTimeout(announceTimer);
    announceTimer = null;
    live.textContent = announceLines.slice(-3).join('，');
    announceLines = [];
  }
  function flushAnnounceSoon() {
    if (!announceLines.length) return;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      announceTimer = null;
      if (destroyed) return;
      live.textContent = announceLines.slice(-3).join('，');
      announceLines = [];
    }, 350);
  }

  /* ----- HUD ----- */
  function setHudVisible(side, on) {
    huds[side].box.style.display = on ? '' : 'none';
  }
  function hudSet(side, hp, max, { instant } = {}) {
    const h = huds[side];
    const m = Number(max) > 0 ? Number(max) : 0;
    const v = hpClamp(hp, m);
    const f = h.fill;
    if (instant) {
      f.style.transition = 'none';
      f.style.transform = `scaleX(${m > 0 ? v / m : 0})`;
      void f.offsetWidth;
      f.style.transition = '';
    } else {
      f.style.transform = `scaleX(${m > 0 ? v / m : 0})`;
    }
    return { v, m };
  }
  function hudText(side, hp, max) {
    huds[side].nums.textContent = `${Math.round(hp)} / ${max}`;
  }
  function setHp(side, hp, max, { instant } = {}) {
    const d = disp[side];
    const { v, m } = hudSet(side, hp, max, { instant: instant || skipping });
    const from = d ? d.hp : v;
    if (d) {
      d.hp = v;
      d.maxHp = m;
      d.unknown = false;
    }
    if (instant || skipping || from === v || mode === 'booting') {
      hudText(side, v, m);
      return Promise.resolve();
    }
    return tween(250, (p) => hudText(side, from + (v - from) * p, m));
  }
  function applyHudMeta(side) {
    const d = disp[side];
    const h = huds[side];
    if (!d) {
      setHudVisible(side, false);
      return;
    }
    setHudVisible(side, true);
    h.name.textContent = d.name || '';
    if (d.unknown) {
      h.nums.textContent = '';
      hudSet(side, 1, 1, { instant: true });
    } else {
      hudSet(side, d.hp, d.maxHp, { instant: true });
      hudText(side, d.hp, d.maxHp);
    }
  }

  /* ----- visual loading ----- */
  function ref(url) {
    if (ownedUrls.has(url)) return;
    ownedUrls.add(url);
    urlRefs.set(url, (urlRefs.get(url) || 0) + 1);
  }
  function unref(url) {
    if (!ownedUrls.delete(url)) return;
    const n = (urlRefs.get(url) || 1) - 1;
    if (n <= 0) {
      urlRefs.delete(url);
      Promise.resolve()
        .then(() => Assets.unload(url))
        .catch(() => {});
    } else {
      urlRefs.set(url, n);
    }
  }
  function silhouette() {
    return { kind: 'sil', url: '', w: 100, h: 100, box: { x0: 10, y0: 10, x1: 90, y1: 90 }, tex: null };
  }
  async function loadVisual(url, wantTex) {
    if (!url) return silhouette();
    try {
      let tex = null;
      let w;
      let h;
      let src;
      if (wantTex) {
        ref(url);
        tex = await Assets.load(url);
        if (destroyed) {
          unref(url);
          return silhouette();
        }
        w = tex.width;
        h = tex.height;
        src = tex.source && tex.source.resource;
      } else {
        src = await loadImage(url);
        w = src.naturalWidth;
        h = src.naturalHeight;
      }
      let cached = boundsCache.get(url);
      if (!cached) {
        let fb = false;
        let box;
        try {
          box = scanBounds(src, w, h);
        } catch {
          try {
            const im = await loadImage(url);
            box = scanBounds(im, w, h);
          } catch {
            fb = true;
            box = { x0: 0, y0: 0, x1: 1, y1: 1 };
          }
        }
        cached = { box, fallback: fb };
        boundsCache.set(url, cached);
      }
      if (cached.fallback) boundsFallbackCount++;
      const b = cached.box;
      return { kind: 'tex', url, w, h, tex, box: { x0: b.x0 * w, y0: b.y0 * h, x1: b.x1 * w, y1: b.y1 * h } };
    } catch {
      if (wantTex) unref(url);
      reportError(`img:${url}`, COPY.img404, 'image-404');
      return silhouette();
    }
  }

  /* ----- entities ----- */
  function layoutFor(side, v) {
    const { w, h } = size();
    const L = LAYOUT[side];
    const bw = Math.max(1, v.box.x1 - v.box.x0);
    const bh = Math.max(1, v.box.y1 - v.box.y0);
    const s = Math.min((L.hf * h) / bh, (LAYOUT.wFrac * w) / bw);
    return { x: L.fx * w, y: L.fy * h, s, ow: bw * s, oh: bh * s };
  }
  function makeEntity(side, v) {
    const cx = (v.box.x0 + v.box.x1) / 2;
    const by = v.box.y1;
    const ent = { side, v, base: layoutFor(side, v), off: { dx: 0, dy: 0, sq: 1, alpha: 1, flash: 0 }, node: null, content: null };
    if (mode === 'pixi') {
      const node = new Container();
      let content;
      if (v.kind === 'tex' && v.tex) {
        content = new Sprite(v.tex);
      } else {
        content = new Graphics();
        content.ellipse((v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.x1 - v.box.x0) / 2, (v.box.y1 - v.box.y0) / 2).fill(0x7a6552);
      }
      content.position.set(-cx, -by);
      node.addChild(content);
      petLayer.addChild(node);
      ent.node = node;
      ent.content = content;
    } else {
      const node = el('div', 'bs-pet', cssLayer);
      node.dataset.side = side;
      let inner;
      if (v.kind === 'tex') {
        inner = document.createElement('img');
        inner.src = v.url;
        inner.alt = '';
        inner.draggable = false;
        inner.setAttribute('aria-hidden', 'true');
        node.appendChild(inner);
      } else {
        inner = el('div', 'bs-sil', node);
      }
      inner.style.left = `${v.box.x0 - cx}px`;
      inner.style.top = `${v.box.y0 - by}px`;
      inner.style.width = `${v.box.x1 - v.box.x0}px`;
      inner.style.height = `${v.box.y1 - v.box.y0}px`;
      if (v.kind === 'tex') {
        // image drawn at natural size, so offset by the full-image origin instead of the box origin
        inner.style.left = `${-cx}px`;
        inner.style.top = `${-by}px`;
        inner.style.width = `${v.w}px`;
        inner.style.height = `${v.h}px`;
      }
      ent.node = node;
      ent.content = inner;
    }
    placeShadow(side, ent);
    applyPose(ent);
    return ent;
  }
  function applyPose(ent) {
    if (!ent || !ent.node) return;
    const { base, off } = ent;
    const x = base.x + off.dx;
    const y = base.y + off.dy;
    const s = base.s * off.sq;
    if (mode === 'pixi') {
      ent.node.position.set(x, y);
      ent.node.scale.set(s);
      ent.node.alpha = off.alpha;
      if (ent.content && 'tint' in ent.content) ent.content.tint = off.flash > 0 ? 0xff9f43 : 0xffffff;
    } else {
      ent.node.style.transform = `translate(${x}px,${y}px) scale(${s})`;
      ent.node.style.opacity = String(off.alpha);
    }
    moveShadow(ent);
  }
  // the lunge slides the pet over the ground plane, so its shadow travels with it and stays under the foot
  function moveShadow(ent) {
    const sh = ent.shadow;
    if (!sh || !ent.shW) return;
    sh.style.left = `${ent.base.x + ent.off.dx - ent.shW / 2}px`;
    sh.style.top = `${ent.base.y + ent.off.dy - 5}px`;
  }
  function placeShadow(side, ent) {
    const sh = shadows[side];
    if (!ent) {
      sh.style.display = 'none';
      return;
    }
    const w = Math.min(Math.max(ent.base.ow * 0.85, 36), size().w * 0.4);
    const hh = 10;
    sh.style.display = '';
    sh.style.width = `${w}px`;
    sh.style.height = `${hh}px`;
    ent.shadow = sh;
    ent.shW = w;
    moveShadow(ent);
    sh.style.opacity = String(0.18 * ent.off.alpha + 0.0);
  }
  function destroyEntity(ent) {
    if (!ent || !ent.node) return;
    try {
      if (mode === 'pixi') ent.node.destroy({ children: true });
      else ent.node.remove();
    } catch {
      /* already gone */
    }
    ent.node = null;
  }
  function clearPad(side) {
    destroyEntity(vis[side]);
    vis[side] = null;
    disp[side] = null;
    placeShadow(side, null);
    applyHudMeta(side);
    drawDebug();
  }
  function relayoutEntities() {
    for (const side of ['A', 'B']) {
      const ent = vis[side];
      if (!ent) continue;
      ent.base = layoutFor(side, ent.v);
      placeShadow(side, ent);
      applyPose(ent);
    }
    drawDebug();
  }
  function drawDebug() {
    for (const n of dbg.els) n.remove();
    dbg.els = [];
    if (!dbg.on) return;
    for (const side of ['A', 'B']) {
      const ent = vis[side];
      if (!ent) continue;
      const b = ent.base;
      const box = el('div', 'bs-dbg-box', root);
      box.style.left = `${b.x - b.ow / 2}px`;
      box.style.top = `${b.y - b.oh}px`;
      box.style.width = `${b.ow}px`;
      box.style.height = `${b.oh}px`;
      const dot = el('div', 'bs-dbg-dot', root);
      dot.style.left = `${b.x}px`;
      dot.style.top = `${b.y}px`;
      dbg.els.push(box, dot);
    }
  }

  async function placePad(side, data, { alpha = 1 } = {}) {
    // data: { no, name, url, hp, maxHp, unknown }
    const token = (placePad.tok = (placePad.tok || 0) + 1);
    const v = await loadVisual(data.url, mode === 'pixi');
    if (destroyed || token !== placePad.tok) return null;
    destroyEntity(vis[side]);
    disp[side] = { no: data.no, name: data.name, url: data.url, hp: hpClamp(data.hp, data.maxHp), maxHp: Number(data.maxHp) > 0 ? Number(data.maxHp) : 0, unknown: !!data.unknown, fainted: false };
    const ent = makeEntity(side, v);
    ent.off.alpha = alpha;
    applyPose(ent);
    placeShadow(side, ent);
    vis[side] = ent;
    applyHudMeta(side);
    drawDebug();
    return ent;
  }

  function petData(side, p) {
    if (!p) return null;
    const url = side === 'A' ? p.backImg || p.img : p.img;
    return { no: p.no, name: p.name, url, hp: p.hp, maxHp: p.maxHp };
  }

  /* ----- fx helpers ----- */
  const fxOn = () => mode === 'pixi' && !skipping && !destroyed;
  function popupPos(side) {
    const ent = vis[side];
    if (ent) return { x: ent.base.x, y: ent.base.y - ent.base.oh * 0.45 };
    const { w, h } = size();
    return { x: LAYOUT[side].fx * w, y: LAYOUT[side].fy * h - 30 };
  }
  function popup(side, main, flag, dur = 400) {
    if (destroyed) return Promise.resolve();
    const { x, y } = popupPos(side);
    const p = el('div', 'bs-pop', popLayer);
    p.dataset.side = side;
    if (main) el('b', '', p, main);
    if (flag) el('i', '', p, flag);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    const done = () => p.remove();
    if (skipping) {
      // skipped: leave the text briefly so the log is still readable, then drop it
      setTimeout(done, 300);
      return Promise.resolve();
    }
    return tween(dur, (q) => {
      p.style.top = `${y - 10 * easeOut(q)}px`;
      p.style.opacity = q < 0.6 ? '1' : String(1 - (q - 0.6) / 0.4);
      if (q >= 1) done();
    });
  }
  function burst(x, y, n, dur) {
    if (!fxOn() || !particlesEnabled) return Promise.resolve();
    const count = Math.min(n, MAX_PARTICLES - particleCount);
    const jobs = [];
    for (let i = 0; i < count; i++) {
      const g = new Graphics().circle(0, 0, 3).fill(i % 2 ? 0xff9f43 : 0xf0e2cc);
      fxLayer.addChild(g);
      particleCount++;
      const ang = (i / count) * Math.PI * 2;
      const r = 18 + (i % 3) * 8;
      jobs.push(
        tween(dur, (p) => {
          if (g.destroyed) return;
          g.position.set(x + Math.cos(ang) * r * easeOut(p), y + Math.sin(ang) * r * easeOut(p));
          g.alpha = 1 - p;
          g.scale.set(1 - p * 0.5);
          if (p >= 1) {
            g.destroy();
            particleCount--;
          }
        })
      );
    }
    return Promise.all(jobs);
  }
  function shakeWorld() {
    if (!fxOn() || !world) return Promise.resolve();
    shakeApplied = 0;
    return tween(SHAKE.durationMs, (p) => {
      if (!world || world.destroyed) return;
      const t = p * SHAKE.durationMs;
      const dx = Math.sin((t / 1000) * SHAKE.hz * Math.PI * 2) * SHAKE.amplitude * (1 - p);
      shakeApplied = Math.max(shakeApplied, Math.abs(dx));
      world.position.set(p >= 1 ? 0 : dx, 0);
    });
  }
  function flash(ent) {
    if (!ent || !fxOn()) return Promise.resolve();
    return tween(220, (p) => {
      ent.off.flash = p < 1 && Math.floor(p * 4) % 2 === 0 ? 1 : 0;
      applyPose(ent);
    });
  }

  /* ----- event handlers ----- */
  async function doAttack(e) {
    const actor = e.side;
    const tSide = OTHER[actor];
    const tgt = disp[tSide];
    const act = vis[actor];
    const tEnt = vis[tSide];
    const actorName = disp[actor] && disp[actor].name;
    announce(`${actorName || ''}${e.move ? `使用了${e.move}` : '出招了'}`);
    if (tgt && (tgt.hp !== e.startHp || tgt.maxHp !== e.maxHp)) await setHp(tSide, e.startHp, e.maxHp, { instant: true });
    if (e.targetHp > e.startHp) {
      await Promise.all([setHp(tSide, e.targetHp, e.maxHp), popup(tSide, '', COPY.heal)]);
      return;
    }
    const shown = e.damage != null && Number.isFinite(Number(e.damage)) ? Number(e.damage) : Math.abs(e.startHp - e.targetHp);
    const flag = e.immune ? COPY.imm : e.superEffective ? COPY.sup : e.notVeryEffective ? COPY.nve : e.critical ? COPY.crit : '';
    const jobs = [];
    if (fxOn() && act && tEnt) {
      lungeCount++;
      const dir = Math.sign(tEnt.base.x - act.base.x) || 1;
      const dist = Math.min(70, Math.abs(tEnt.base.x - act.base.x) * 0.4);
      const dy = Math.sign(tEnt.base.y - act.base.y) * Math.min(24, Math.abs(tEnt.base.y - act.base.y) * 0.3);
      jobs.push(
        tween(450, (p) => {
          const k = p < 0.36 ? easeOut(p / 0.36) : 1 - easeInOut((p - 0.36) / 0.64);
          act.off.dx = dir * dist * k;
          act.off.dy = dy * k;
          applyPose(act);
        })
      );
      await delay(160);
    }
    if (destroyed) return;
    const hit = [setHp(tSide, e.targetHp, e.maxHp)];
    if (e.immune) hit.push(popup(tSide, '', COPY.imm));
    else if (shown > 0 || flag) hit.push(popup(tSide, shown > 0 ? `-${shown}` : '', flag));
    if (mode === 'pixi') {
      hit.push(flash(tEnt), shakeWorld());
      if (tEnt) burst(tEnt.base.x, tEnt.base.y - tEnt.base.oh * 0.5, 6, 300);
    }
    // fallback: HP tween awaited, popup text left to expire on its own
    await Promise.all(mode === 'pixi' ? [...hit, ...jobs] : [hit[0]]);
  }

  async function doMiss(e) {
    announce(COPY.miss);
    await popup(OTHER[e.side], COPY.miss, '', 300);
  }

  async function doFaint(e) {
    const side = e.side;
    const d = disp[side];
    const ent = vis[side];
    announce(`${(d && d.name) || e.name || ''}${COPY.faint}`);
    if (!d || d.fainted) return;
    d.fainted = true;
    const jobs = [setHp(side, 0, d.maxHp), popup(side, '', COPY.faint, 400)];
    if (ent) {
      const y0 = ent.off.dy;
      jobs.push(
        tween(mode === 'pixi' ? 400 : 200, (p) => {
          ent.off.dy = y0 + (mode === 'pixi' ? 16 * p : 0);
          ent.off.alpha = 1 - p;
          applyPose(ent);
          if (shadows[side]) shadows[side].style.opacity = String(0.18 * (1 - p));
        })
      );
    }
    await Promise.all(jobs);
    if (destroyed) return;
    destroyEntity(vis[side]);
    vis[side] = null;
    placeShadow(side, null);
    drawDebug();
  }

  function lookupPet(side, e) {
    const pets = (view && view.sides && view.sides[side] && view.sides[side].pets) || [];
    const p = pets.find((x) => (e.toNo != null && x.no === e.toNo) || (e.toName && x.name === e.toName) || (e.no != null && x.no === e.no));
    return p || null;
  }

  async function doSwitch(side, data, { announceLine = true } = {}) {
    const same = disp[side] && disp[side].no === data.no && vis[side] && !disp[side].fainted;
    if (same) {
      if (data.hp != null && !data.unknown) await setHp(side, data.hp, data.maxHp);
      return;
    }
    if (announceLine) announce(`${COPY.switchIn}${data.name || ''}`);
    const old = vis[side];
    const { w, h } = size();
    const jobs = [];
    if (old && fxOn()) {
      const a0 = old.off.alpha;
      jobs.push(
        tween(200, (p) => {
          old.off.alpha = a0 * (1 - p);
          old.off.sq = 1 - 0.5 * p;
          applyPose(old);
        })
      );
    }
    // send-out: pop the pet in; started near the end of the throw so the segments overlap
    const sendOut = async () => {
      if (destroyed) return;
      destroyEntity(old);
      if (vis[side] === old) vis[side] = null;
      const ent = await placePad(side, data, { alpha: 0 });
      if (!ent || destroyed) return;
      if (side === 'A') announce(COPY.thrown(data.name || ''));
      const fancy = mode === 'pixi' && !skipping;
      ent.off.sq = fancy ? 0.2 : 1;
      if (fancy) burst(ent.base.x, ent.base.y - ent.base.oh * 0.5, 8, 280);
      await tween(fancy ? 280 : 200, (p) => {
        ent.off.alpha = p;
        if (fancy) ent.off.sq = 0.2 + 0.8 * easeOut(p) + Math.sin(Math.PI * p) * 0.12;
        applyPose(ent);
      });
    };
    let sent = null;
    if (fxOn()) {
      const endX = LAYOUT[side].fx * w;
      const endY = LAYOUT[side].fy * h - 18;
      const startPt = data.from || (side === 'A' ? { x: w * 0.12, y: h - 20 } : { x: w + 10, y: -10 });
      const ball = new Graphics().circle(0, 0, 9).fill(0xff9f43).stroke({ width: 2, color: 0x3d2c1e }).circle(0, 0, 3).fill(0xffffff);
      fxLayer.addChild(ball);
      const arc = h * 0.35;
      await tween(THROW_MS, (p) => {
        if (ball.destroyed) return;
        ball.position.set(startPt.x + (endX - startPt.x) * p, startPt.y + (endY - startPt.y) * p - Math.sin(Math.PI * p) * arc);
        ball.rotation = p * Math.PI * 4;
        if (p >= 0.9 && !sent) sent = sendOut();
        if (p >= 1) ball.destroy();
      });
    }
    if (!sent) sent = sendOut();
    await Promise.all([...jobs, sent]);
  }

  async function doSendOut(e) {
    const p = lookupPet(e.side, e);
    const data = {
      no: e.no,
      name: e.name || (p && p.name),
      url: (e.side === 'A' ? e.backImg || e.img || (p && (p.backImg || p.img)) : e.img || (p && p.img)) || '',
      hp: p ? p.hp : undefined,
      maxHp: p ? p.maxHp : undefined,
    };
    await doSwitch(e.side, data);
  }
  async function doSwapEvent(e) {
    const p = lookupPet(e.side, e);
    const img = e.img || (p && p.img);
    const back = e.backImg || (p && p.backImg);
    const data = {
      no: e.toNo != null ? e.toNo : p && p.no,
      name: e.toName || (p && p.name),
      url: e.side === 'A' ? back || img || '' : img || '',
      hp: p ? p.hp : undefined,
      maxHp: p ? p.maxHp : undefined,
      unknown: !p,
    };
    await doSwitch(e.side, data);
  }

  async function doVictory(e) {
    const win = e.winnerSide || 'A';
    const sides = (view && view.sides) || {};
    const childName = e.childName || (sides[win] && sides[win].childName) || '';
    const text = win === 'A' ? COPY.win(childName) : COPY.lose;
    announce(text);
    root.style.pointerEvents = 'none';
    if (canvas) canvas.style.pointerEvents = 'none';
    if (banner) banner.remove();
    banner = el('div', 'bs-banner', root, text);
    tray.style.display = 'none'; // the banner takes the tray's strip, clear of both HUDs
    const jobs = [delay(mode === 'pixi' ? 520 : 200)];
    if (win === 'A' && fxOn()) {
      const { w, h } = size();
      jobs.push(burst(w * 0.5, h * 0.45, 20, 500));
    }
    await Promise.all(jobs);
  }

  async function handleEvent(e) {
    switch (e.type) {
      case 'attack':
        return doAttack(e);
      case 'miss':
        return doMiss(e);
      case 'faint':
        return doFaint(e);
      case 'switch':
        return doSwapEvent(e);
      case 'sendOut':
        return doSendOut(e);
      case 'victory':
        return doVictory(e);
      default:
        return undefined;
    }
  }

  /* ----- job runner (play + internal throws) ----- */
  async function runJob(job) {
    running = job;
    skipping = false;
    setBusy(true);
    const t0 = now();
    let dropped = 0;
    try {
      await job.run((n) => {
        dropped = n;
      });
    } catch (err) {
      console.error('battle-scene sequence error', err);
      reportError('always', COPY.stale, 'sequence');
    }
    lastSequenceMs = Math.round(now() - t0);
    const wasSkipped = skipping;
    skipping = false;
    running = null;
    if (destroyed) {
      job.resolve({ skipped: true, unmounted: true, dropped });
      return;
    }
    applyPending();
    flushAnnounceNow();
    setBusy(false);
    job.resolve({ skipped: wasSkipped, dropped });
    if (job.done) job.done();
    if (queued && !destroyed) {
      const next = queued;
      queued = null;
      runJob(next);
    }
  }

  function enqueue(job) {
    if (destroyed) {
      job.resolve({ skipped: true, unmounted: true });
      return;
    }
    if (running) {
      if (queued) queued.resolve({ skipped: true });
      queued = job;
      return;
    }
    runJob(job);
  }

  function play(events) {
    return new Promise((resolve) => {
      const { events: list, dropped } = sanitizeEvents(events);
      const hidden = ((document.hidden || pauseReasons.size > 0) && mode === 'pixi');
      enqueue({
        resolve,
        run: async (setDropped) => {
          setDropped(dropped);
          if (hidden) skipping = true;
          for (const e of list) {
            if (destroyed) return;
            await handleEvent(e);
          }
        },
      });
    });
  }

  function skip() {
    if (!running || destroyed) return Promise.resolve();
    skipping = true;
    const p = new Promise((res) => {
      running.done = res;
    });
    finishAll();
    return p;
  }

  /* ----- view sync ----- */
  function viewSide(side) {
    const s = (view && view.sides && view.sides[side]) || {};
    const pets = Array.isArray(s.pets) ? s.pets : [];
    let idx = Number.isInteger(s.activeIdx) ? s.activeIdx : 0;
    if (pets.length === 0) idx = 0;
    else if (idx < 0 || idx >= pets.length) {
      reportError(`idx:${side}`, COPY.stale, 'activeIdx');
      idx = Math.min(Math.max(idx, 0), pets.length - 1);
    }
    return { s, pets, idx };
  }

  async function syncPad(side, token) {
    const { pets, idx } = viewSide(side);
    const p = pets[idx];
    if (!p) {
      if (side === 'A' && localLead) return;
      if (vis[side] || disp[side]) clearPad(side);
      return;
    }
    const maxHp = Number(p.maxHp) > 0 ? Number(p.maxHp) : 0;
    const hp = hpClamp(p.hp, maxHp);
    const d = disp[side];
    if (d && d.no === p.no && d.name === p.name && (vis[side] || d.fainted || hp <= 0)) {
      d.unknown = false;
      applyHudMeta(side);
      if (hp <= 0 && vis[side]) {
        destroyEntity(vis[side]);
        vis[side] = null;
        placeShadow(side, null);
        d.fainted = true;
      }
      await setHp(side, hp, maxHp);
      return;
    }
    if (hp <= 0) {
      clearPad(side);
      disp[side] = { no: p.no, name: p.name, url: '', hp: 0, maxHp, fainted: true };
      applyHudMeta(side);
      return;
    }
    await placePad(side, petData(side, { ...p, hp, maxHp }));
    if (token !== syncToken) return;
  }

  function renderWeather() {
    const k = view && view.weather && (view.weather.kind || view.weather);
    const label = typeof k === 'string' ? WEATHER[k] : '';
    weatherEl.textContent = label || '';
    weatherEl.style.display = label ? '' : 'none';
  }

  function sync() {
    const token = ++syncToken;
    renderWeather();
    renderTray();
    root.classList.toggle('bs-select', phase === 'select-lead');
    huds.A.box.style.bottom = '44px';
    if (phase !== 'ended' && banner) {
      banner.remove();
      banner = null;
    }
    tray.style.display = banner ? 'none' : '';
    syncPromise = (async () => {
      await Promise.all([syncPad('B', token), syncPad('A', token)]);
    })().catch(() => {});
    return syncPromise;
  }

  function applyPending() {
    if (!pendingUpdate || destroyed) return;
    const u = pendingUpdate;
    pendingUpdate = null;
    if (u.party !== undefined) party = Array.isArray(u.party) ? u.party : null;
    if (u.phase !== undefined) {
      if (u.phase === 'select-lead' && (phase !== 'select-lead' || (leadAccepted && !running))) {
        leadAccepted = false;
        localLead = null;
        clearPad('A');
      }
      phase = u.phase;
    }
    if (u.view !== undefined) view = u.view || { sides: {} };
    if (u.muted !== undefined) muted = !!u.muted;
    if (u.debug !== undefined) {
      dbg.on = !!u.debug;
      drawDebug();
    }
    sync();
  }

  function update(partial) {
    if (destroyed || !partial || typeof partial !== 'object') return;
    const p = partial.sides ? { view: partial } : partial;
    pendingUpdate = { ...(pendingUpdate || {}), ...p };
    if (!running) applyPending();
  }

  /* ----- tray ----- */
  function trayEntries() {
    const sideA = viewSide('A');
    if (phase === 'select-lead') {
      const list = (party || []).slice(0, 5);
      if ((party || []).length > 5) reportError('party>5', COPY.stale, 'party-too-many');
      return list.map((e) => ({ ...e, lead: true }));
    }
    if (phase !== 'battle') return [];
    if (party) {
      return party
        .map((e) => ({ ...e, petIdx: e.petIdx }))
        .filter((e) => !(Number.isInteger(e.petIdx) && e.petIdx === sideA.idx));
    }
    return sideA.pets
      .map((p, i) => ({ no: p.no, name: p.name, img: p.img, backImg: p.backImg, fainted: !(p.hp > 0), petIdx: i }))
      .filter((e) => e.petIdx !== sideA.idx);
  }
  function renderTray() {
    for (const f of trayCleanups.splice(0)) f();
    tray.replaceChildren();
    const entries = trayEntries();
    if (phase === 'select-lead') {
      if (leadAccepted) return;
      el('div', 'bs-prompt', tray, entries.length ? COPY.select : COPY.none);
    } else if (!entries.length) {
      if (phase === 'battle' && viewSide('A').pets.length === 0 && (!party || party.length === 0)) {
        announce(COPY.none);
      }
      return;
    }
    const row = el('div', 'bs-balls', tray);
    for (const entry of entries) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bs-ball';
      b.draggable = false;
      b.setAttribute('aria-label', phase === 'select-lead' ? `选择${entry.name}先发出场` : `换上${entry.name}${entry.fainted ? '（已倒下）' : ''}`);
      b.dataset.no = String(entry.no);
      if (entry.fainted) b.disabled = true;
      const im = document.createElement('img');
      im.src = entry.img || '';
      im.alt = '';
      im.draggable = false;
      b.appendChild(im);
      row.appendChild(b);
      listen(b, 'click', (ev) => {
        if (dragClickGuard) {
          // Consume the guard: this click is the one the drag itself
          // produced. Clearing here (not only on the 80ms timer) keeps
          // a quick tap after a cancelled drag from being eaten.
          ev.preventDefault();
          dragClickGuard = false;
          clearTimeout(dragClickTimer);
          return;
        }
        onBallClick(entry, b);
      }, undefined, trayCleanups);
      attachDrag(b, entry);
    }
  }

  const isBlocked = () => destroyed || running || busy || (typeof opts.isBusy === 'function' && opts.isBusy());

  /* drag-to-throw: pointer capture + ghost that follows the finger; a release above the tray, inside the stage, throws */
  const DRAG_PX = 10;
  let dragClickGuard = false;
  let dragClickTimer = null;
  const ghosts = new Set();
  function removeGhost(g) {
    if (!g) return;
    ghosts.delete(g);
    g.remove();
  }
  cleanups.push(() => {
    clearTimeout(dragClickTimer);
    for (const g of [...ghosts]) removeGhost(g);
  });
  function attachDrag(btn, entry) {
    let st = null; // { id, x0, y0, ghost }
    const end = (ev, commit) => {
      if (!st) return;
      const s0 = st;
      st = null;
      try {
        btn.releasePointerCapture(s0.id);
      } catch {
        /* already released */
      }
      for (const t of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) btn.removeEventListener(t, handlers[t]);
      listenerCount -= 4;
      if (!s0.ghost) return; // never crossed the tap threshold: the click handler does the work
      removeGhost(s0.ghost);
      dragClickGuard = true;
      clearTimeout(dragClickTimer);
      dragClickTimer = setTimeout(() => (dragClickGuard = false), 80);
      if (!commit || destroyed || isBlocked() || entry.fainted) return;
      const rr = root.getBoundingClientRect();
      const trayTop = tray.getBoundingClientRect().top;
      const hit = ev.clientX >= rr.left && ev.clientX <= rr.right && ev.clientY >= rr.top && ev.clientY < trayTop;
      if (hit) onBallClick(entry, btn, { x: ev.clientX - rr.left, y: ev.clientY - rr.top });
    };
    const handlers = {
      pointermove(ev) {
        if (!st || ev.pointerId !== st.id) return;
        if (!st.ghost) {
          if (Math.hypot(ev.clientX - st.x0, ev.clientY - st.y0) < DRAG_PX) return;
          const g = el('div', 'bs-ghost', document.body);
          const im = document.createElement('img');
          im.src = entry.img || '';
          im.alt = '';
          im.draggable = false;
          g.appendChild(im);
          g.setAttribute('aria-hidden', 'true');
          ghosts.add(g);
          st.ghost = g;
        }
        ev.preventDefault();
        st.ghost.style.transform = `translate3d(${ev.clientX}px,${ev.clientY}px,0) scale(1.1)`;
      },
      pointerup: (ev) => ev.pointerId === (st && st.id) && end(ev, true),
      pointercancel: (ev) => ev.pointerId === (st && st.id) && end(ev, false),
      lostpointercapture: (ev) => ev.pointerId === (st && st.id) && end(ev, false),
    };
    const down = (ev) => {
      if (st || (ev.button != null && ev.button > 0) || ev.isPrimary === false) return;
      if (entry.fainted || isBlocked()) return;
      st = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, ghost: null };
      try {
        btn.setPointerCapture(ev.pointerId);
      } catch {
        /* synthetic pointer without capture */
      }
      for (const t of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(t, handlers[t]);
      listenerCount += 4;
    };
    listen(btn, 'pointerdown', down, undefined, trayCleanups);
    trayCleanups.push(() => {
      if (st) {
        const s0 = st;
        st = null;
        for (const t of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) btn.removeEventListener(t, handlers[t]);
        listenerCount -= 4;
        removeGhost(s0.ghost);
      }
    });
  }

  function onBallClick(entry, btn, dropAt) {
    if (destroyed || entry.fainted) return;
    if (isBlocked()) return;
    const r = btn.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const from = dropAt || { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2 };
    if (phase === 'select-lead') {
      if (leadAccepted) return;
      leadAccepted = true;
      cb('onChooseLead', entry.no);
      localLead = entry;
      for (const f of trayCleanups.splice(0)) f();
      tray.replaceChildren();
      const mh = Number(entry.maxHp) > 0 ? Number(entry.maxHp) : 0;
      const hp0 = mh > 0 ? hpClamp(entry.hp != null ? entry.hp : mh, mh) : 0;
      const data = { no: entry.no, name: entry.name, url: entry.backImg || entry.img, unknown: mh <= 0, hp: hp0, maxHp: mh, from };
      // show the name and hp / maxHp from the moment the ball leaves the tray, not when the pet pops in
      disp.A = { no: entry.no, name: entry.name, url: data.url, hp: hp0, maxHp: mh, unknown: mh <= 0, fainted: false };
      applyHudMeta('A');
      enqueue({ resolve: () => {}, run: () => doSwitch('A', data) });
      return;
    }
    const { pets } = viewSide('A');
    const idx = entry.petIdx;
    if (!Number.isInteger(idx) || idx < 0 || idx >= pets.length) {
      reportError('always', COPY.stale, 'petIdx');
      return;
    }
    cb('onSwitch', { swapToIdx: idx, leadNo: entry.no });
    const p = pets[idx];
    const data = { no: entry.no, name: entry.name, url: entry.backImg || entry.img || '', hp: p && p.hp, maxHp: p && p.maxHp, from };
    enqueue({ resolve: () => {}, run: () => doSwitch('A', data) });
  }

  /* ----- fps policy / pause ----- */
  const pauseReasons = new Set();
  const mon = { t: 0, win: [], winT: 0, stage: 0 };
  function monReset() {
    mon.t = 0;
    mon.win = [];
    mon.winT = 0;
  }
  function feedFrame(ms) {
    if (mode !== 'pixi' || destroyed || pauseReasons.size) return;
    mon.t += ms;
    if (mon.t < 1000) return;
    mon.win.push(ms);
    mon.winT += ms;
    if (mon.winT < 2000) return;
    const med = median(mon.win);
    mon.win = [];
    mon.winT = 0;
    if (mon.stage === 0 && med >= 31) {
      mon.stage = 1;
      maxFps = 30;
      particlesEnabled = false;
      if (app) app.ticker.maxFPS = 30;
    } else if (mon.stage === 1 && med > 1000 / 24) {
      enterFallback('low-fps');
    }
  }
  function setPaused(reason, on) {
    if (destroyed) return;
    const was = pauseReasons.size > 0;
    if (on) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
    const isP = pauseReasons.size > 0;
    if (was === isP) return;
    if (mode === 'pixi' && app) {
      if (isP) app.ticker.stop();
      else {
        app.ticker.start();
        monReset();
      }
    }
  }
  function onTick() {
    const ms = app.ticker.deltaMS;
    if (ms > 0) fpsReal = fpsReal ? fpsReal * 0.9 + (1000 / ms) * 0.1 : 1000 / ms;
    if (!opts.testHooks) feedFrame(ms);
    stepTweens();
  }

  /* ----- fallback ----- */
  function teardownPixi() {
    if (!app) return;
    const a = app;
    app = null;
    try {
      a.ticker.remove(onTick);
      a.ticker.stop();
    } catch {
      /* ignore */
    }
    let gl = null;
    try {
      gl = a.renderer && a.renderer.gl;
    } catch {
      /* ignore */
    }
    try {
      if (canvas) canvas.remove();
      a.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    } catch {
      /* ignore */
    }
    try {
      const ext = gl && !gl.isContextLost() && gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch {
      /* ignore */
    }
    if (activeApp) {
      activeApp = false;
      contextCount--;
    }
    canvas = null;
    world = petLayer = fxLayer = null;
    for (const u of [...ownedUrls]) unref(u);
  }

  function enterFallback(reason) {
    if (destroyed || mode === 'fallback') return;
    if (mode === 'booting') {
      pendingFallback = pendingFallback || reason;
      return;
    }
    lastFallbackReason = reason;
    if (reason === 'low-fps') {
      try {
        window.sessionStorage.setItem(LOW_FPS_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    skipping = true;
    finishAll();
    const snapshot = { A: disp.A, B: disp.B };
    for (const side of ['A', 'B']) {
      destroyEntity(vis[side]);
      vis[side] = null;
    }
    teardownPixi();
    mode = 'fallback';
    pauseReasons.clear();
    root.dataset.mode = 'fallback';
    rebuildCss(snapshot);
    cb('onFallback', { reason });
  }
  async function rebuildCss(snapshot) {
    for (const side of ['A', 'B']) {
      const d = snapshot[side];
      disp[side] = d;
      if (d && !d.fainted && d.url !== undefined) {
        const v = await loadVisual(d.url, false);
        if (destroyed || mode !== 'fallback') return;
        if (vis[side]) continue;
        const ent = makeEntity(side, v);
        vis[side] = ent;
      }
    }
    drawDebug();
  }

  /* ----- resize ----- */
  let resizeTimer = null;
  let lastW = 0;
  let lastH = 0;
  function relayout() {
    if (destroyed) return;
    if (ownHeight) {
      const hh = chooseHeight();
      if (container.style.height !== `${hh}px`) container.style.height = `${hh}px`;
    }
    const { w, h } = size();
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    if (mode === 'pixi' && app) {
      app.renderer.resize(w, h);
      resizeCount++;
    }
    relayoutEntities();
    syncRoot();
  }
  function syncRoot() {
    /* popups use absolute px; nothing else to recompute */
  }
  function scheduleRelayout() {
    if (resizeTimer || destroyed) return;
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      relayout();
    }, 100);
  }

  /* ----- diagnostics / handle ----- */
  function getDiagnostics() {
    let reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      /* ignore */
    }
    let webgl = false;
    try {
      webgl = !!(app && app.renderer && app.renderer.gl && !app.renderer.gl.isContextLost());
    } catch {
      /* ignore */
    }
    return {
      mode: mode === 'booting' ? 'fallback' : mode,
      fps: mode === 'pixi' ? Math.round(fpsReal) : 0,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      webgl,
      reducedMotion: reduced,
      lastFallbackReason,
      textures: urlRefs.size,
      contexts: contextCount,
      listeners: listenerCount,
      phase,
      lastSequenceMs,
      boundsFallbackCount,
      activeTweens: tweens.length,
      resizeCount,
      maxFPS: maxFps,
      paused: pauseReasons.size > 0,
      appsCreated,
    };
  }

  function fallback(reason = 'manual') {
    enterFallback(reason);
  }

  function doUnmount() {
    if (destroyed) return;
    clearTimeout(announceTimer);
    clearTimeout(resizeTimer);
    if (busy) {
      busy = false;
      try {
        if (typeof opts.onBusy === 'function') opts.onBusy(false);
      } catch {
        /* ignore */
      }
    }
    destroyed = true;
    const q = queued;
    queued = null;
    if (q) q.resolve({ skipped: true, unmounted: true });
    const list = tweens.splice(0);
    for (const tw of list) tw.resolve();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    for (const f of trayCleanups.splice(0)) f();
    for (const f of cleanups.splice(0)) f();
    teardownPixi();
    for (const u of [...ownedUrls]) unref(u);
    root.remove();
    container.style.height = prevHeightStyle;
    const tag = document.getElementById(STYLE_ID);
    if (tag && current === inst) tag.remove();
    if (current === inst) current = null;
    if (window.__smActivePixi === 'battle-scene' && !current) window.__smActivePixi = null;
    if (running) {
      const j = running;
      running = null;
      j.resolve({ skipped: true, unmounted: true });
    }
  }

  const handle = {
    update,
    unmount: doUnmount,
    fallback,
    getDiagnostics,
    play,
    skip,
  };
  const inst = { boot, unmount: doUnmount, handle };

  if (opts.testHooks) {
    handle.__test = {
      forceFrameMs(v) {
        const arr = Array.isArray(v) ? v : Array.from({ length: Math.ceil(3000 / Math.max(1, Number(v))) }, () => Number(v));
        for (const ms of arr) feedFrame(Number(ms));
      },
      emitVisibility(hidden) {
        setPaused('hidden', !!hidden);
      },
      get shake() {
        return { ...SHAKE, container: world ? 'world' : null, lastMaxOffset: shakeApplied };
      },
      getDiagnostics,
      timings: Object.freeze({ throwMs: THROW_MS, sendOutMs: 280, retreatMs: 200, lungeMs: 450, hpMs: 250 }),
      get lungeCount() {
        return lungeCount;
      },
      getGeom() {
        const out = {};
        const rr = root.getBoundingClientRect();
        for (const side of ['A', 'B']) {
          const ent = vis[side];
          if (!ent) continue;
          const sr = shadows[side].getBoundingClientRect();
          out[side] = {
            footY: ent.base.y + ent.off.dy,
            footX: ent.base.x,
            shadowCenterY: sr.top - rr.top - 1 + sr.height / 2,
            box: { x: ent.base.x - ent.base.ow / 2, y: ent.base.y - ent.base.oh, w: ent.base.ow, h: ent.base.oh },
            scale: ent.base.s,
            no: disp[side] && disp[side].no,
            url: ent.v.url,
            natH: ent.v.h,
            boxBottomFrac: ent.v.box.y1 / ent.v.h,
          };
        }
        return out;
      },
      loseContext() {
        try {
          const gl = app.renderer.gl;
          gl.getExtension('WEBGL_lose_context').loseContext();
        } catch {
          /* ignore */
        }
      },
      setDebug(on) {
        update({ debug: !!on });
      },
      whenIdle: () => syncPromise,
      isMuted: () => muted || localStorage.getItem(MUTE_KEY) === '1',
    };
  }

  /* ----- boot ----- */
  async function boot() {
    if (opts.mode && opts.mode !== 'gym' && !warnedMode) {
      warnedMode = true;
      console.warn(`battle-scene: mode "${opts.mode}" is reserved; mounting the gym scene.`);
    }
    // validate the party shape
    if (phase === 'select-lead' && party && party.length === 0) announce(COPY.none);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let reason = null;
    let mql = null;
    try {
      mql = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      /* ignore */
    }
    if (mql) {
      listen(
        mql,
        'change',
        (ev) => {
          if (ev.matches) enterFallback('reduced-motion');
        },
        undefined,
        cleanups
      );
    }
    if (mql && mql.matches) reason = 'reduced-motion';
    else {
      let lowFps = false;
      try {
        lowFps = window.sessionStorage.getItem(LOW_FPS_KEY) === '1';
      } catch {
        /* ignore */
      }
      if (lowFps) reason = 'low-fps';
    }
    const flag = window.__smActivePixi;
    if (!reason && flag === 'care-room' && document.querySelector('#careRoom canvas, [data-care-room] canvas')) {
      reason = 'care-room-mounted';
    }

    // observers and global listeners
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => scheduleRelayout());
      ro.observe(container);
      listenerCount++;
      cleanups.push(() => {
        ro.disconnect();
        listenerCount--;
      });
    }
    if (window.visualViewport) {
      listen(window.visualViewport, 'resize', scheduleRelayout, undefined, cleanups);
      listen(window.visualViewport, 'scroll', scheduleRelayout, undefined, cleanups);
    }
    listen(window, 'orientationchange', scheduleRelayout, undefined, cleanups);
    listen(document, 'visibilitychange', () => setPaused('hidden', document.hidden), undefined, cleanups);
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        const last = entries[entries.length - 1];
        if (last) setPaused('offscreen', !last.isIntersecting);
      });
      io.observe(root);
      listenerCount++;
      cleanups.push(() => {
        io.disconnect();
        listenerCount--;
      });
    }

    let initReason = null;
    if (!reason) {
      appsCreated++;
      const a = new Application();
      try {
        await a.init({
          preference: ['webgl'],
          resolution: dpr,
          autoDensity: true,
          width: size().w,
          height: size().h,
          backgroundAlpha: 0,
          antialias: true,
        });
      } catch (err) {
        let glOk = true;
        try {
          const probe = document.createElement('canvas');
          glOk = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
        } catch {
          glOk = false;
        }
        initReason = !glOk || /webgl|context/i.test(String(err && err.message)) ? 'no-webgl' : 'error';
        try {
          a.destroy(true);
        } catch {
          /* ignore */
        }
      }
      if (!initReason) {
        const gl = a.renderer && a.renderer.gl;
        if (destroyed) {
          const ext = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
          try {
            a.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
          } catch {
            /* ignore */
          }
          try {
            if (ext) ext.loseContext();
          } catch {
            /* ignore */
          }
          return;
        }
        if (!gl || !a.canvas) {
          initReason = 'no-webgl';
          try {
            a.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
          } catch {
            /* ignore */
          }
        } else {
          app = a;
          activeApp = true;
          contextCount++;
          canvas = a.canvas;
          canvas.setAttribute('aria-hidden', 'true');
          canvas.style.display = 'block';
          canvas.style.pointerEvents = 'none';
          root.insertBefore(canvas, cssLayer);
          world = new Container();
          world.label = 'shakeWorld';
          petLayer = new Container();
          fxLayer = new Container();
          world.addChild(petLayer, fxLayer);
          a.stage.addChild(world);
          listen(canvas, 'webglcontextlost', (e) => {
            e.preventDefault();
            enterFallback('context-lost');
          }, undefined, cleanups);
          a.ticker.add(onTick);
        }
      }
    }
    if (destroyed) {
      if (app) teardownPixi();
      return;
    }

    mode = app ? 'pixi' : 'fallback';
    root.dataset.mode = mode;
    const fb = reason || initReason || pendingFallback;
    if (pendingFallback && app) {
      // fallback was requested while booting
      mode = 'pixi';
      lastFallbackReason = undefined;
      enterFallback(pendingFallback);
    } else if (fb) {
      lastFallbackReason = fb;
    }
    lastW = size().w;
    lastH = size().h;
    window.__smActivePixi = 'battle-scene';

    await sync();
    if (destroyed) return;
    // warm the bench / party textures so later sequences do not wait on the network
    const warm = [];
    const urlsOf = (side, pets) => pets.map((p) => (side === 'A' ? p.backImg || p.img : p.img)).filter(Boolean);
    for (const side of ['A', 'B']) {
      for (const u of urlsOf(side, viewSide(side).pets)) warm.push(u);
    }
    for (const e of party || []) warm.push(e.backImg || e.img);
    await Promise.all([...new Set(warm)].filter(Boolean).map((u) => loadVisual(u, mode === 'pixi')));
    if (destroyed) return;

    if (fb && !pendingFallback) cb('onFallback', { reason: fb });
    cb('onReady', { fps: mode === 'pixi' ? 60 : 0, mode, dpr, boundsFallbackCount });
  }

  return inst;
}
