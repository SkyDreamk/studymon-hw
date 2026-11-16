/**
 * 养成小房间（PixiJS v8 独立 ES 模块 - Round 3）
 * - 仅实现 rainbow-meadow（彩虹草原）程序化场景
 * - 按非透明像素包围盒锚定脚底并等比缩放，消除透明底边距悬空
 * - 严格按需树摇导入 PixiJS v8，无任何第三方运行时依赖
 */
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';

const STORAGE_MUTE_KEY = 'sm_care_muted';
const STYLE_TAG_ID = 'care-room-shared-styles';
const MAX_TOTAL_PARTICLES = 20;
const MAX_PET_HEARTS = 12;
const DRAG_THRESHOLD_PX = 8;

const DEFAULT_FOOD_EMOJIS = {
  apple: '🍎',
  berry: '🍓',
  cookie: '🍪',
  meat: '🍖',
  milk: '🥛',
  honey: '🍯',
};

// 按图片 URL 缓存非透明像素包围盒，避免重复挂载或相同 URL 更新时重复调用 getImageData
const opaqueBoundsCache = new Map();

let activeInstance = null;
let styleRefCount = 0;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 近似 cubic-bezier(0.22, 0.68, 0.36, 1) 的快速缓动函数
 */
function easeOutBackSoft(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3) * (1 - 0.35 * Math.sin(x * Math.PI));
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    const k = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

function readLocalMuted() {
  try {
    return window.localStorage?.getItem(STORAGE_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function isReducedMotion() {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

function detectWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return true;
  } catch {
    return false;
  }
}

function computeMood(state) {
  const friendship = clamp(Number(state.friendship) || 0, 0, 255);
  const fedToday = Boolean(state.fedToday);
  const bathedToday = Boolean(state.bathedToday);

  if (!fedToday) return 'hungry';
  if (fedToday && !bathedToday) return 'dirty';
  if (friendship === 255) return 'max';
  if (friendship >= 153) return 'happy';
  if (friendship < 51) return 'low';
  return 'content';
}

/**
 * 扫描已加载图片的非透明像素（alpha > 8）包围盒，并按 URL 缓存
 * 若遇到跨域污染画布或读取失败，安全回退为整图尺寸
 */
function getOpaqueBoundsForImage(img, cacheKey) {
  const w = Math.max(1, img.naturalWidth || img.width || 150);
  const h = Math.max(1, img.naturalHeight || img.height || 150);
  const fallbackBounds = {
    left: 0,
    top: 0,
    right: w,
    bottom: h,
    width: w,
    height: h,
    fullW: w,
    fullH: h,
  };

  if (cacheKey && opaqueBoundsCache.has(cacheKey)) {
    return opaqueBoundsCache.get(cacheKey);
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      if (cacheKey) opaqueBoundsCache.set(cacheKey, fallbackBounds);
      return fallbackBounds;
    }
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y += 1) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += 1) {
        const alpha = data[rowOffset + x * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const result =
      maxX >= minX && maxY >= minY
        ? {
            left: minX,
            top: minY,
            right: maxX + 1,
            bottom: maxY + 1,
            width: Math.max(1, maxX - minX + 1),
            height: Math.max(1, maxY - minY + 1),
            fullW: w,
            fullH: h,
          }
        : fallbackBounds;

    if (cacheKey) {
      opaqueBoundsCache.set(cacheKey, result);
    }
    return result;
  } catch {
    if (cacheKey) {
      opaqueBoundsCache.set(cacheKey, fallbackBounds);
    }
    return fallbackBounds;
  }
}

function getMuteSvgMarkup(muted) {
  if (muted) {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D2C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#3D2C1E" fill-opacity="0.15"/>
        <line x1="22" y1="9" x2="16" y2="15"/>
        <line x1="16" y1="9" x2="22" y2="15"/>
      </svg>
    `;
  }
  return `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D2C1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#3D2C1E" fill-opacity="0.15"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
    </svg>
  `;
}

function ensureSharedStyles() {
  styleRefCount += 1;
  if (document.getElementById(STYLE_TAG_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = `
    .care-room-root {
      position: relative;
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(120deg, #ffe1e8, #fff1cf, #dcf3df, #dcecff, #ecdfff);
      box-shadow: 0 2px 8px rgba(120, 80, 30, 0.12);
      user-select: none;
      -webkit-user-select: none;
    }
    .care-room-root canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .care-room-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    }
    .care-room-hud {
      position: absolute;
      top: 8px;
      left: 12px;
      right: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .care-room-hud-row1 {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding-right: 40px;
      min-height: 20px;
    }
    .care-room-title {
      font-size: 14px;
      font-weight: 600;
      color: #3D2C1E;
      line-height: 1.25;
      white-space: nowrap;
    }
    .care-room-date {
      font-size: 14px;
      font-weight: 400;
      color: #7A6552;
      line-height: 1.25;
      white-space: nowrap;
    }
    .care-room-caption {
      font-size: 14px;
      font-weight: 400;
      color: #3D2C1E;
      line-height: 1.25;
      padding-right: 40px;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .care-room-overlay .care-hearts-bar {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 14px;
      font-weight: 600;
      color: #7A6552;
      line-height: 1.2;
      white-space: nowrap;
      margin-top: 1px;
    }
    /* 矮屏（房间 <=220px）：顶部信息栏收紧，约省 12px，给宠物留高度 */
    .care-room-hud-compact {
      top: 6px;
      gap: 0;
    }
    .care-room-hud-compact .care-room-hud-row1 {
      min-height: 18px;
    }
    .care-room-hud-compact .care-room-caption {
      line-height: 1.15;
    }
    .care-room-overlay .care-room-hud-compact .care-hearts-bar {
      margin-top: 0;
      line-height: 1.1;
    }
    .care-room-overlay .care-heart {
      display: inline-block;
      font-size: 14px;
      line-height: 1;
    }
    .care-room-overlay .care-heart.on {
      color: #F25C54;
    }
    .care-room-overlay .care-heart.off {
      color: #d1d5db;
    }
    .care-room-hearts-label {
      margin-left: 4px;
      font-size: 14px;
      font-weight: 600;
      color: #7A6552;
    }
    .care-room-pet-btn {
      position: absolute;
      pointer-events: auto;
      background: transparent;
      border: 2px solid transparent;
      border-radius: 16px;
      padding: 0;
      margin: 0;
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .care-room-pet-btn:focus-visible {
      outline: none;
      border-color: #FF9F43;
      box-shadow: 0 2px 8px rgba(120, 80, 30, 0.12);
    }
    .care-room-fallback-name {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      padding: 2px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid #F0E2CC;
      font-size: 14px;
      font-weight: 600;
      color: #3D2C1E;
      pointer-events: none;
      white-space: nowrap;
    }
    .care-room-hint {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 8px;
      text-align: center;
      font-size: 14px;
      font-weight: 500;
      color: #3D2C1E;
      line-height: 1.25;
      pointer-events: none;
    }
    .care-room-mute-btn {
      position: absolute;
      right: 4px;
      top: 2px;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 0;
      border-radius: 16px;
      font: inherit;
      font-size: 14px;
      color: #3D2C1E;
      cursor: pointer;
      pointer-events: auto;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .care-room-mute-btn:focus-visible {
      outline: 2px solid #FF9F43;
      outline-offset: -4px;
    }
    .care-room-mute-glyph {
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid #F0E2CC;
      box-shadow: 0 2px 8px rgba(120, 80, 30, 0.12);
      line-height: 1;
    }
    .care-room-float-label {
      position: absolute;
      left: 50%;
      max-width: calc(100% - 24px);
      transform: translate(-50%, 0);
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.92);
      will-change: transform, opacity;
    }
    .care-room-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .care-room-drag-ghost {
      position: fixed;
      left: 0;
      top: 0;
      width: 48px;
      height: 48px;
      margin-left: -24px;
      margin-top: -24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #F0E2CC;
      box-shadow: 0 2px 8px rgba(120, 80, 30, 0.12);
      pointer-events: none;
      z-index: 999;
      font-size: 22px;
      will-change: transform, opacity;
    }
    .care-room-drag-ghost img {
      width: 34px;
      height: 34px;
      object-fit: contain;
      pointer-events: none;
    }
    .carefood[data-care-kind="feed"] {
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .carefood[data-care-kind="feed"] img {
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    @keyframes careRoomTrayPulse {
      0% { transform: scale(1); }
      45% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    .care-room-tray-pulse {
      animation: careRoomTrayPulse 0.55s ease-out 2;
    }
  `;
  document.head.appendChild(style);
}

function releaseSharedStyles() {
  styleRefCount = Math.max(0, styleRefCount - 1);
  if (styleRefCount === 0) {
    const el = document.getElementById(STYLE_TAG_ID);
    if (el) el.remove();
  }
}

/**
 * 轻量 Web Audio 音效合成器（无外部音频文件依赖）
 */
class CareSoundPlayer {
  constructor(isMutedFn) {
    this.isMutedFn = isMutedFn;
    this.ctx = null;
    this.closed = false;
  }

  unlock() {
    if (this.closed || this.isMutedFn()) return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // 忽略浏览器策略限制
    }
  }

  playTone(freqStart, freqEnd, durationSec, delaySec = 0, type = 'sine', peakGain = 0.06) {
    if (this.closed || this.isMutedFn()) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + delaySec;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + durationSec);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.01);
    } catch {
      // 静默失败
    }
  }

  playPetBoop() {
    this.playTone(520, 320, 0.105, 0, 'triangle', 0.06);
  }

  playFeedSuccess(favorite) {
    this.playTone(440, 560, 0.08, 0, 'sine', 0.06);
    this.playTone(560, 700, 0.08, 0.095, 'sine', 0.065);
    if (favorite) {
      this.playTone(784, 1046, 0.11, 0.19, 'triangle', 0.07);
    }
  }

  close() {
    this.closed = true;
    if (this.ctx) {
      const c = this.ctx;
      this.ctx = null;
      try {
        c.close().catch(() => {});
      } catch {
        // 忽略关闭异常
      }
    }
  }
}

/**
 * 绘制程序化爱心图形（Graphics，避免 Emoji 纹理开销）
 */
function drawHeartGraphic(g, size, color, alpha = 1) {
  const s = size;
  g.clear();
  g.moveTo(0, s * 0.32);
  g.bezierCurveTo(-s * 0.52, -s * 0.18, -s * 0.95, s * 0.35, 0, s * 0.95);
  g.bezierCurveTo(s * 0.95, s * 0.35, s * 0.52, -s * 0.18, 0, s * 0.32);
  g.fill({ color, alpha });
}

/**
 * 绘制饥饿状态下的矢量思考气泡与红苹果图案（纯 Graphics，零 emoji / 零位图）
 */
function buildHungryThoughtBubble() {
  const g = new Graphics();

  // 两颗渐大思考小圆点（朝向宠物头部）
  g.circle(-16, 15, 2.5);
  g.fill({ color: 0xffffff, alpha: 0.94 });
  g.stroke({ color: 0x7a6552, width: 1.2, alpha: 0.55 });

  g.circle(-10, 8, 3.8);
  g.fill({ color: 0xffffff, alpha: 0.95 });
  g.stroke({ color: 0x7a6552, width: 1.2, alpha: 0.55 });

  // 主云朵气泡
  g.roundRect(-6, -24, 34, 26, 13);
  g.fill({ color: 0xffffff, alpha: 0.96 });
  g.stroke({ color: 0x7a6552, width: 1.4, alpha: 0.65 });

  // 气泡内手绘苹果（果实 + 果柄 + 绿叶）
  g.circle(9, -9.5, 5.2);
  g.circle(13.2, -9.5, 5.2);
  g.fill({ color: 0xf25c54, alpha: 0.95 });

  // 果柄
  g.moveTo(11, -14.5);
  g.lineTo(12, -18.2);
  g.stroke({ color: 0x3d2c1e, width: 1.5 });

  // 小绿叶
  g.ellipse(14.5, -17.2, 3.2, 1.7);
  g.fill({ color: 0x3bb273, alpha: 0.95 });

  return g;
}

/**
 * 生成 120deg 彩虹草原渐变纹理（纯 Canvas 2D -> Pixi Texture）
 */
function createRainbowSkyTexture(width, height) {
  const w = Math.max(2, Math.round(width));
  const h = Math.max(2, Math.round(height));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const rad = (120 * Math.PI) / 180;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const len = Math.hypot(w, h) * 0.5;
    const dx = Math.sin(rad) * len;
    const dy = -Math.cos(rad) * len;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0.0, '#ffe1e8');
    grad.addColorStop(0.25, '#fff1cf');
    grad.addColorStop(0.5, '#dcf3df');
    grad.addColorStop(0.75, '#dcecff');
    grad.addColorStop(1.0, '#ecdfff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  return Texture.from(canvas);
}

/**
 * 卸载当前活跃实例（幂等）
 */
export function unmount() {
  if (activeInstance) {
    const inst = activeInstance;
    activeInstance = null;
    inst.unmount();
  }
}

/**
 * 挂载养成小房间
 * @param {HTMLElement} container
 * @param {object} opts
 */
export async function mount(container, opts = {}) {
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('care-room: container must be a valid HTMLElement');
  }

  if (activeInstance) {
    unmount();
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const reducedMotionAtBoot = isReducedMotion();
  const webglAvailable = detectWebGLSupport();

  let currentState = {
    childId: opts.state?.childId ?? 1,
    friendship: clamp(Number(opts.state?.friendship) || 0, 0, 255),
    fedToday: Boolean(opts.state?.fedToday),
    bathedToday: Boolean(opts.state?.bathedToday),
    sceneKey: 'rainbow-meadow', // 试点仅渲染彩虹草原
    sceneName: opts.state?.sceneName || '彩虹草原',
    sceneText:
      opts.state?.sceneText !== undefined
        ? String(opts.state.sceneText)
        : '彩虹草原上，今天也要加油。',
    today: opts.state?.today || '',
    foods: Array.isArray(opts.state?.foods) ? structuredCloneSafe(opts.state.foods) : [],
    showHearts: opts.showHearts !== false,
  };

  let petInfo = {
    img: opts.pet?.img || '',
    name: opts.pet?.name || opts.pet?.formName || '伙伴',
    formName: opts.pet?.formName || opts.pet?.name || '伙伴',
  };

  let explicitMuted = typeof opts.muted === 'boolean' ? opts.muted : null;
  let lastFallbackReason = null;
  let currentMode = 'pixi';
  let destroyed = false;

  const cleanups = new Set();
  const managedTextures = new Set();
  const activeTimers = new Set();
  const inFlightGhosts = new Set();
  let activeContexts = 0;

  function addCleanup(fn) {
    cleanups.add(fn);
    return () => {
      if (cleanups.has(fn)) {
        cleanups.delete(fn);
        fn();
      }
    };
  }

  function safeTimeout(fn, ms) {
    const id = window.setTimeout(() => {
      activeTimers.delete(id);
      if (!destroyed) fn();
    }, ms);
    activeTimers.add(id);
    return id;
  }

  function clearAllTimers() {
    for (const id of activeTimers) {
      window.clearTimeout(id);
    }
    activeTimers.clear();
  }

  function trackInFlightGhost(ghost) {
    if (ghost) inFlightGhosts.add(ghost);
  }

  function removeInFlightGhost(ghost) {
    if (!ghost) return;
    inFlightGhosts.delete(ghost);
    ghost.remove();
  }

  function isMuted() {
    if (explicitMuted !== null) return explicitMuted;
    return readLocalMuted();
  }

  function createNoopHandle(reason) {
    currentMode = 'fallback';
    lastFallbackReason = reason;
    const handle = {
      update() {},
      unmount() {
        destroyed = true;
        if (activeInstance === handle) activeInstance = null;
      },
      fallback() {},
      setFeedSource() {},
      getDiagnostics() {
        return {
          mode: 'fallback',
          fps: 0,
          dpr,
          webgl: webglAvailable,
          reducedMotion: isReducedMotion(),
          lastFallbackReason,
          textures: 0,
          contexts: 0,
          listeners: 0,
        };
      },
    };
    activeInstance = handle;
    return handle;
  }

  // 1. 减弱动态效果前置检查（绝不初始化 Pixi）
  if (reducedMotionAtBoot) {
    opts.onFallback?.({ reason: 'reduced-motion' });
    opts.onReady?.({ fps: 0, mode: 'fallback', dpr });
    return createNoopHandle('reduced-motion');
  }

  // 2. WebGL 可用性前置检查
  if (!webglAvailable) {
    opts.onFallback?.({ reason: 'no-webgl' });
    opts.onReady?.({ fps: 0, mode: 'fallback', dpr });
    return createNoopHandle('no-webgl');
  }

  // 确保容器具有合法固定高度
  const computedHeight = parseFloat(window.getComputedStyle(container).height);
  if (!computedHeight || computedHeight <= 0) {
    const defaultH = window.innerHeight >= 800 ? 280 : 200;
    container.style.height = `${defaultH}px`;
  }
  container.innerHTML = '';

  ensureSharedStyles();
  let sharedStyleReleased = false;
  const releaseStyleOnce = () => {
    if (!sharedStyleReleased) {
      sharedStyleReleased = true;
      releaseSharedStyles();
    }
  };

  // 构建房间 DOM 壳与无障碍覆盖层
  const roomRoot = document.createElement('div');
  roomRoot.className = 'care-room-root';
  roomRoot.style.height = '100%';
  container.appendChild(roomRoot);

  const overlay = document.createElement('div');
  overlay.className = 'care-room-overlay';

  // 分层 HUD（第 1 行：场景名+日期；第 2 行：sceneText；第 3 行：可选红心栏）
  const hudEl = document.createElement('div');
  hudEl.className = 'care-room-hud';

  const hudRow1 = document.createElement('div');
  hudRow1.className = 'care-room-hud-row1';
  const sceneNameSpan = document.createElement('span');
  sceneNameSpan.className = 'care-room-title';
  const sceneDateSpan = document.createElement('span');
  sceneDateSpan.className = 'care-room-date';
  hudRow1.append(sceneNameSpan, sceneDateSpan);
  hudEl.appendChild(hudRow1);

  const captionEl = document.createElement('div');
  captionEl.className = 'care-room-caption';
  hudEl.appendChild(captionEl);

  let ownHeartsBar = null;
  if (!opts.heartsEl) {
    ownHeartsBar = document.createElement('div');
    ownHeartsBar.className = 'care-hearts-bar';
    hudEl.appendChild(ownHeartsBar);
  }
  overlay.appendChild(hudEl);

  // 宠物交互按钮（覆盖在非透明躯干上方，支持键盘焦点与屏幕阅读器）
  const petBtn = document.createElement('button');
  petBtn.type = 'button';
  petBtn.className = 'care-room-pet-btn';
  petBtn.setAttribute('aria-label', `摸一摸${petInfo.name}`);
  overlay.appendChild(petBtn);

  // 当宠物图 404 时显示形态名称徽章
  const fallbackNameBadge = document.createElement('div');
  fallbackNameBadge.className = 'care-room-fallback-name';
  fallbackNameBadge.hidden = true;
  overlay.appendChild(fallbackNameBadge);

  // 底部状态感知提示文案
  const hintEl = document.createElement('div');
  hintEl.className = 'care-room-hint';
  overlay.appendChild(hintEl);

  // 静音按钮（热区 44x44，内部 SVG 图标 22x22）
  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'care-room-mute-btn';
  const muteGlyph = document.createElement('span');
  muteGlyph.className = 'care-room-mute-glyph';
  muteGlyph.setAttribute('aria-hidden', 'true');
  muteBtn.appendChild(muteGlyph);
  overlay.appendChild(muteBtn);

  // 屏幕阅读器实时播报区
  const liveRegion = document.createElement('div');
  liveRegion.className = 'care-room-sr-only';
  liveRegion.setAttribute('aria-live', 'polite');
  overlay.appendChild(liveRegion);

  roomRoot.appendChild(overlay);

  const sound = new CareSoundPlayer(isMuted);

  function syncMuteUI() {
    const muted = isMuted();
    muteGlyph.innerHTML = getMuteSvgMarkup(muted);
    muteBtn.setAttribute('aria-label', muted ? '开启房间音效' : '关闭房间音效');
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
  syncMuteUI();

  const onMuteClick = () => {
    const next = !isMuted();
    explicitMuted = next;
    try {
      window.localStorage?.setItem(STORAGE_MUTE_KEY, next ? '1' : '0');
    } catch {
      // 无痕模式静默忽略
    }
    syncMuteUI();
    if (!next) {
      sound.unlock();
      sound.playPetBoop();
    }
  };
  muteBtn.addEventListener('click', onMuteClick);
  addCleanup(() => muteBtn.removeEventListener('click', onMuteClick));

  // 初始化 PixiJS v8 Application（仅 WebGL）
  const app = new Application();
  let appInitialized = false;

  try {
    await app.init({
      preference: ['webgl'],
      resolution: dpr,
      autoDensity: true,
      resizeTo: roomRoot,
      backgroundAlpha: 0,
      antialias: true,
    });
    appInitialized = true;
  } catch {
    releaseStyleOnce();
    sound.close();
    container.innerHTML = '';
    opts.onFallback?.({ reason: 'error' });
    opts.onReady?.({ fps: 0, mode: 'fallback', dpr });
    return createNoopHandle('error');
  }

  const glContext = app.renderer?.gl;
  if (!glContext || !app.canvas) {
    try {
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true }
      );
    } catch {
      // ignore
    }
    releaseStyleOnce();
    sound.close();
    container.innerHTML = '';
    opts.onFallback?.({ reason: 'no-webgl' });
    opts.onReady?.({ fps: 0, mode: 'fallback', dpr });
    return createNoopHandle('no-webgl');
  }

  activeContexts = 1;
  app.canvas.setAttribute('aria-hidden', 'true');
  app.canvas.style.display = 'block';
  roomRoot.insertBefore(app.canvas, overlay);

  // 监听 WebGL 上下文丢失
  const onContextLost = (e) => {
    e.preventDefault();
    triggerFallback('context-lost');
  };
  app.canvas.addEventListener('webglcontextlost', onContextLost);
  addCleanup(() => app.canvas?.removeEventListener('webglcontextlost', onContextLost));

  // 监听系统减弱动态效果中途切换
  let mql = null;
  try {
    mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mql) {
      const onMotionChange = (e) => {
        if (e.matches) triggerFallback('reduced-motion');
      };
      mql.addEventListener('change', onMotionChange);
      addCleanup(() => mql.removeEventListener('change', onMotionChange));
    }
  } catch {
    // ignore
  }

  // 构建简洁场景层级（纯站点渐变 + 低对比度背景云 + 地面阴影 + 宠物 + 粒子）
  const bgLayer = new Container();
  const cloudsLayer = new Container();
  const groundLayer = new Container();
  const petLayer = new Container();
  const fxLayer = new Container();

  app.stage.addChild(bgLayer, cloudsLayer, groundLayer, petLayer, fxLayer);

  // 1) 彩虹草原 120deg 渐变背景
  let skyTexture = createRainbowSkyTexture(
    Math.max(320, roomRoot.clientWidth),
    Math.max(200, roomRoot.clientHeight)
  );
  managedTextures.add(skyTexture);
  const skySprite = new Sprite(skyTexture);
  bgLayer.addChild(skySprite);

  // 2) 极柔和背景漂浮云（最多 2 朵，低对比度，不抢主角视觉）
  const clouds = [];
  for (let i = 0; i < 2; i += 1) {
    const g = new Graphics();
    g.ellipse(0, 0, i === 0 ? 30 : 22, i === 0 ? 10 : 8);
    g.ellipse(i === 0 ? 15 : -12, -3, i === 0 ? 19 : 15, i === 0 ? 8 : 6.5);
    g.fill({ color: 0xffffff, alpha: 0.36 });
    cloudsLayer.addChild(g);
    clouds.push({
      gfx: g,
      normX: i === 0 ? 0.24 : 0.74,
      normY: i === 0 ? 0.26 : 0.34,
      periodSec: i === 0 ? 11.0 : 9.5,
    });
  }

  // 3) 宠物脚底低透明度椭圆阴影（位于非透明脚底正下方）
  const petShadowGfx = new Graphics();
  groundLayer.addChild(petShadowGfx);

  // 4) 宠物容器、拖拽悬停细光环、最爱闪光、饥饿思考气泡
  const hoverRingGfx = new Graphics();
  hoverRingGfx.visible = false;

  const favFlashGfx = new Graphics();
  favFlashGfx.visible = false;

  const petContainer = new Container();
  const hungryBubbleGfx = buildHungryThoughtBubble();
  hungryBubbleGfx.visible = false;

  let petDisplayObj = null;
  let petTexture = null;
  let petBounds = {
    left: 0,
    top: 0,
    right: 120,
    bottom: 132,
    width: 120,
    height: 132,
    fullW: 120,
    fullH: 132,
  };

  petLayer.addChild(hoverRingGfx, favFlashGfx, petContainer, hungryBubbleGfx);

  function buildProceduralPetSilhouette() {
    const g = new Graphics();
    g.roundRect(-42, -96, 84, 92, 38);
    g.fill({ color: 0xffd166 });
    g.stroke({ color: 0x3d2c1e, width: 2.5, alpha: 0.75 });
    g.ellipse(-22, -106, 10, 24);
    g.ellipse(22, -106, 10, 24);
    g.fill({ color: 0xffb703 });
    g.circle(-15, -62, 4.5);
    g.circle(15, -62, 4.5);
    g.fill({ color: 0x3d2c1e });
    g.circle(-24, -52, 6);
    g.circle(24, -52, 6);
    g.fill({ color: 0xf25c54, alpha: 0.55 });
    return g;
  }

  function applyPetVisual(tex, bounds, isFallbackArt) {
    if (destroyed) return;
    if (petDisplayObj) {
      petContainer.removeChild(petDisplayObj);
      petDisplayObj.destroy();
      petDisplayObj = null;
    }
    if (petTexture && petTexture !== tex) {
      managedTextures.delete(petTexture);
      petTexture.destroy(true);
      petTexture = null;
    }

    fallbackNameBadge.hidden = !isFallbackArt;
    if (isFallbackArt) {
      fallbackNameBadge.textContent = petInfo.formName || petInfo.name;
      petBounds = {
        left: 0,
        top: 0,
        right: 84,
        bottom: 130,
        width: 84,
        height: 130,
        fullW: 84,
        fullH: 130,
      };
      petDisplayObj = buildProceduralPetSilhouette();
    } else {
      petTexture = tex;
      managedTextures.add(tex);
      petBounds = bounds;
      const sp = new Sprite(tex);
      // 保持左上角原点，在 layoutScene 中按非透明包围盒底部中心精确偏移
      sp.anchor.set(0, 0);
      petDisplayObj = sp;
    }
    petContainer.addChild(petDisplayObj);
    layoutScene();
  }

  let petLoadSeq = 0;
  function loadPetImage(url) {
    petLoadSeq += 1;
    const seq = petLoadSeq;
    if (!url) {
      applyPetVisual(null, null, true);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (destroyed || seq !== petLoadSeq) return;
      if (!img.naturalWidth || !img.naturalHeight) {
        applyPetVisual(null, null, true);
        return;
      }
      const bounds = getOpaqueBoundsForImage(img, url);
      const tex = Texture.from(img);
      applyPetVisual(tex, bounds, false);
    };
    img.onerror = () => {
      if (destroyed || seq !== petLoadSeq) return;
      applyPetVisual(null, null, true);
    };
    img.src = url;
  }

  // 布局计算缓存（供命中检测、HUD 避让与按钮定位复用）
  let roomW = Math.max(200, roomRoot.clientWidth || 362);
  let roomH = Math.max(160, roomRoot.clientHeight || 280);
  let hudBottomPx = 46;
  let petBaseX = roomW * 0.5;
  let petBaseY = roomH * 0.84;
  let petBoxW = 120;
  let petBoxH = 140;
  let currentMood = computeMood(currentState);
  let hungryPulsePlayed = false;

  function measureHudBottom() {
    const h = hudEl.offsetHeight || 0;
    const top = hudEl.offsetTop || 8;
    return h > 0 ? top + h : 46;
  }

  function layoutScene() {
    if (destroyed) return;
    roomW = Math.max(200, roomRoot.clientWidth || 362);
    roomH = Math.max(160, roomRoot.clientHeight || 280);
    // 矮屏先收紧 HUD 再量高度，让宠物布局用收紧后的 HUD 底边
    const isCompactH = roomH <= 220;
    hudEl.classList.toggle('care-room-hud-compact', isCompactH);
    hudBottomPx = measureHudBottom();

    // 重建天空渐变纹理
    const nextSkyTex = createRainbowSkyTexture(roomW, roomH);
    if (skyTexture) {
      managedTextures.delete(skyTexture);
      skyTexture.destroy(true);
    }
    skyTexture = nextSkyTex;
    managedTextures.add(skyTexture);
    skySprite.texture = skyTexture;
    skySprite.width = roomW;
    skySprite.height = roomH;

    // 按非透明像素高度缩放：常规房间 0.50 × roomH，紧凑房间（<=220px）0.48 × roomH
    const targetOpaqueH = roomH * (isCompactH ? 0.48 : 0.5);
    const maxOpaqueW = roomW * 0.52;
    let scale = Math.min(targetOpaqueH / petBounds.height, maxOpaqueW / petBounds.width);

    const moodOffsetX = currentMood === 'low' ? -10 : 0;
    const moodOffsetY = currentMood === 'hungry' ? 3 : 0;
    petBaseX = roomW * 0.5 + moodOffsetX;
    // 脚底落在 84% 高度处，为底部提示语留出充足空间
    petBaseY = roomH * 0.84 + moodOffsetY;

    // 严格遵守规则：非透明顶部距离 HUD 底部至少保留 8 px 间距，不足则自动缩小 scale
    const minPetTopY = hudBottomPx + 8;
    const availableH = Math.max(36, petBaseY - minPetTopY);
    if (petBounds.height * scale > availableH) {
      scale = availableH / petBounds.height;
    }

    petBoxW = petBounds.width * scale;
    petBoxH = petBounds.height * scale;

    if (petDisplayObj) {
      petDisplayObj.scale.set(scale);
      if (petDisplayObj instanceof Sprite) {
        const opaqueCenterX = petBounds.left + petBounds.width * 0.5;
        const opaqueBottomY = petBounds.bottom;
        petDisplayObj.position.set(-opaqueCenterX * scale, -opaqueBottomY * scale);
      } else {
        petDisplayObj.position.set(0, 0);
      }
    }

    petContainer.x = petBaseX;
    petContainer.y = petBaseY;

    // 脚底柔和暖灰阴影（紧贴非透明脚底，低透明度）
    petShadowGfx.clear();
    petShadowGfx.ellipse(
      petBaseX,
      petBaseY + 1,
      Math.max(24, petBoxW * 0.34),
      Math.max(5.5, roomH * 0.024)
    );
    petShadowGfx.fill({ color: 0x3d2c1e, alpha: 0.14 });

    // 拖拽悬停柔和细光环（贴合非透明躯干外扩 12px / 10px，避免大色块遮挡房间）
    // 矮屏（isCompactH）收小外扩（6px / 5px），并把环顶钳制在 HUD 下 2px，不擦顶部信息栏
    hoverRingGfx.clear();
    const ringPadX = isCompactH ? 6 : 12;
    const ringPadY = isCompactH ? 5 : 10;
    const ringCenterY = petBaseY - petBoxH * 0.5;
    const ringRy = Math.max(
      8,
      Math.min(petBoxH * 0.5 + ringPadY, ringCenterY - (hudBottomPx + 2))
    );
    hoverRingGfx.ellipse(
      petBaseX,
      ringCenterY,
      petBoxW * 0.5 + ringPadX,
      ringRy
    );
    hoverRingGfx.stroke({ color: 0xff9f43, width: 2, alpha: 0.85 });
    hoverRingGfx.fill({ color: 0xfff1cf, alpha: 0.16 });

    // 饥饿状态思考气泡定位在宠物头侧右上方（钳制在 HUD 下方与画布内）
    const bubbleX = clamp(petBaseX + petBoxW * 0.44 + 10, 44, roomW - 38);
    const bubbleY = clamp(petBaseY - petBoxH * 0.84, hudBottomPx + 28, petBaseY - 24);
    hungryBubbleGfx.position.set(bubbleX, bubbleY);
    hungryBubbleGfx.visible = currentMood === 'hungry';

    // 定位无障碍宠物按钮（覆盖在非透明躯干上，严格避让顶部 HUD 与底部提示区）
    const pad = isCompactH ? 8 : 14;
    const topSafe = Math.round(hudBottomPx + 4);
    const bottomSafe = 28;
    const btnW = Math.round(petBoxW + pad * 2);
    const btnH = Math.round(Math.min(petBoxH + pad * 2, Math.max(36, roomH - topSafe - bottomSafe)));
    const btnLeft = Math.round(clamp(petBaseX - btnW * 0.5, 4, Math.max(4, roomW - btnW - 4)));
    const btnTop = Math.round(
      clamp(petBaseY - petBoxH - pad, topSafe, Math.max(topSafe, roomH - btnH - bottomSafe))
    );
    petBtn.style.left = `${btnLeft}px`;
    petBtn.style.top = `${btnTop}px`;
    petBtn.style.width = `${btnW}px`;
    petBtn.style.height = `${btnH}px`;

    if (!fallbackNameBadge.hidden) {
      fallbackNameBadge.style.top = `${Math.max(topSafe, btnTop - 2)}px`;
    }
  }

  app.renderer.on('resize', layoutScene);
  addCleanup(() => app.renderer?.off?.('resize', layoutScene));

  // 更新 DOM 状态（标题、sceneText、可选红心条、提示语、喂食盘脉冲）
  function syncDOMState(prevMood) {
    sceneNameSpan.textContent = currentState.sceneName || '彩虹草原';
    sceneDateSpan.textContent = currentState.today || '';
    petBtn.setAttribute('aria-label', `摸一摸${petInfo.name}`);

    const captionStr = (currentState.sceneText || '').trim();
    if (captionStr) {
      captionEl.hidden = false;
      captionEl.textContent = captionStr;
    } else {
      captionEl.hidden = true;
      captionEl.textContent = '';
    }

    if (ownHeartsBar) {
      if (currentState.showHearts) {
        ownHeartsBar.hidden = false;
        const filled = Math.floor(clamp(currentState.friendship, 0, 255) / 51);
        let html = '';
        for (let i = 0; i < 5; i += 1) {
          const on = i < filled;
          html += `<span class="care-heart ${on ? 'on' : 'off'}" aria-hidden="true">♥</span>`;
        }
        html += `<span class="care-room-hearts-label">友好度 ${currentState.friendship}/255</span>`;
        ownHeartsBar.innerHTML = html;
      } else {
        ownHeartsBar.hidden = true;
        ownHeartsBar.innerHTML = '';
      }
    }

    hintEl.textContent = currentState.fedToday
      ? '今天吃饱啦，摸一摸吧'
      : '摸一摸｜把食物拖过来';

    if (currentMood === 'hungry' && !hungryPulsePlayed && feedSourceEl) {
      hungryPulsePlayed = true;
      feedSourceEl.classList.remove('care-room-tray-pulse');
      void feedSourceEl.offsetWidth;
      feedSourceEl.classList.add('care-room-tray-pulse');
    } else if (prevMood !== currentMood && currentMood !== 'hungry' && feedSourceEl) {
      feedSourceEl.classList.remove('care-room-tray-pulse');
    }
  }

  // 粒子池管理（总上限 20，摸一摸爱心上限 12）
  const particles = [];

  function countParticlesByType(type) {
    let n = 0;
    for (let i = 0; i < particles.length; i += 1) {
      if (particles[i].type === type) n += 1;
    }
    return n;
  }

  function spawnParticle(cfg) {
    if (destroyed) return;
    if (particles.length >= MAX_TOTAL_PARTICLES) return;
    if (cfg.type === 'pet-heart' && countParticlesByType('pet-heart') >= MAX_PET_HEARTS) return;

    const g = new Graphics();
    if (cfg.shape === 'heart') {
      drawHeartGraphic(g, cfg.size, cfg.color, 1);
    } else {
      g.circle(0, 0, cfg.size);
      g.fill({ color: cfg.color, alpha: 1 });
    }
    g.x = cfg.x;
    g.y = cfg.y;
    fxLayer.addChild(g);

    particles.push({
      gfx: g,
      type: cfg.type,
      x: cfg.x,
      y: cfg.y,
      vx: cfg.vx || 0,
      vy: cfg.vy || -50,
      lifeMs: 0,
      maxLifeMs: cfg.maxLifeMs || 800,
      scaleStart: cfg.scaleStart ?? 0.85,
      scaleEnd: cfg.scaleEnd ?? 1.15,
    });
  }

  function spawnPetHearts(count = 6) {
    const chestX = petBaseX;
    const chestY = petBaseY - petBoxH * 0.55;
    const palette = [0xf25c54, 0xff758f, 0xff8fab];
    for (let i = 0; i < count; i += 1) {
      const spread = (i - (count - 1) / 2) * 14 + (Math.random() - 0.5) * 10;
      const travel = 46 + Math.random() * 30;
      spawnParticle({
        type: 'pet-heart',
        shape: 'heart',
        size: 8 + Math.random() * 3,
        color: palette[i % palette.length],
        x: chestX + (Math.random() - 0.5) * 24,
        y: chestY + (Math.random() - 0.5) * 12,
        vx: spread / 0.8,
        vy: -travel / 0.8,
        maxLifeMs: 800,
        scaleStart: 0.7,
        scaleEnd: 1.15,
      });
    }
  }

  function spawnFeedSparks(favorite) {
    const centerX = petBaseX;
    const centerY = petBaseY - petBoxH * 0.52;
    const colors = favorite
      ? [0xffd700, 0xffb703, 0xfff07c]
      : [0xff8fab, 0xffd166, 0xf25c54];

    for (let i = 0; i < 7; i += 1) {
      const angle = (i * Math.PI * 2) / 7 + (Math.random() - 0.5) * 0.35;
      const speed = 55 + Math.random() * 35;
      spawnParticle({
        type: 'spark',
        shape: i % 2 === 0 ? 'heart' : 'dot',
        size: i % 2 === 0 ? 7 : 4.5,
        color: colors[i % colors.length],
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 22,
        maxLifeMs: 800,
        scaleStart: 0.9,
        scaleEnd: 0.4,
      });
    }
  }

  /**
   * 浮动文字（严格生成在 HUD 底部下方，绝不与顶部 HUD 碰撞）
   */
  function showFloatingDomLabel(text, isGain) {
    if (destroyed) return;
    liveRegion.textContent = text;

    const label = document.createElement('div');
    label.className = 'care-room-float-label';
    label.textContent = text;
    label.style.color = isGain ? '#3BB273' : '#3D2C1E';

    const minSafeTop = measureHudBottom() + 10;
    const desiredTop = petBaseY - petBoxH - 6;
    const startTop = Math.max(minSafeTop, desiredTop);
    const maxTravel = Math.max(0, Math.min(28, startTop - (measureHudBottom() + 8)));

    label.style.top = `${startTop}px`;
    label.style.opacity = '1';
    overlay.appendChild(label);

    const startTime = performance.now();
    const duration = 900;

    function step(now) {
      if (destroyed || !label.isConnected) {
        label.remove();
        return;
      }
      const t = clamp((now - startTime) / duration, 0, 1);
      const eased = easeOutCubic(t);
      label.style.transform = `translate(-50%, ${-maxTravel * eased}px)`;
      label.style.opacity = `${t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3}`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        label.remove();
      }
    }
    requestAnimationFrame(step);
  }

  // 宠物一次性动作状态机（挤压 / 歪头 / 等待）
  let oneShotAnim = null;
  let lastPetTapMs = 0;
  let moduleLocked = false;
  let isHoveringDropZone = false;

  function isBusyNow() {
    return moduleLocked || Boolean(opts.isBusy?.());
  }

  function setModuleLocked(next) {
    if (moduleLocked === next) return;
    moduleLocked = next;
    opts.onBusy?.(next);
  }

  function startSquash(durationMs = 600) {
    oneShotAnim = { kind: 'squash', elapsedMs: 0, durationMs };
  }

  function startHeadTilt(durationMs = 320) {
    oneShotAnim = { kind: 'tilt', elapsedMs: 0, durationMs };
  }

  function triggerFavFlash() {
    favFlashGfx.visible = true;
    const startTime = performance.now();
    const duration = 450;
    const cx = petBaseX;
    const cy = petBaseY - petBoxH * 0.5;
    const baseR = Math.max(42, petBoxH * 0.45);

    function step(now) {
      if (destroyed) return;
      const t = clamp((now - startTime) / duration, 0, 1);
      const eased = easeOutCubic(t);
      const scale = t < 0.5 ? lerp(0.6, 1.05, eased * 2) : lerp(1.05, 1.2, (t - 0.5) * 2);
      const alpha = (1 - t) * 0.65;
      favFlashGfx.clear();
      favFlashGfx.circle(cx, cy, baseR * scale);
      favFlashGfx.fill({ color: 0xffd700, alpha });
      favFlashGfx.circle(cx, cy, baseR * scale * 0.65);
      favFlashGfx.fill({ color: 0xfff3b0, alpha: alpha * 0.9 });
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        favFlashGfx.visible = false;
        favFlashGfx.clear();
      }
    }
    requestAnimationFrame(step);
  }

  // 摸一摸交互
  function handlePetActivate() {
    if (destroyed || isBusyNow()) return;
    const now = performance.now();
    if (now - lastPetTapMs < 400) return;
    lastPetTapMs = now;

    sound.unlock();
    sound.playPetBoop();
    try {
      navigator.vibrate?.(12);
    } catch {
      // ignore
    }

    startSquash(600);
    spawnPetHearts(6);
  }

  let petDownPos = null;
  const onPetPointerDown = (e) => {
    petDownPos = { x: e.clientX, y: e.clientY };
  };
  const onPetPointerUp = (e) => {
    if (!petDownPos) return;
    const dist = Math.hypot(e.clientX - petDownPos.x, e.clientY - petDownPos.y);
    petDownPos = null;
    if (dist <= DRAG_THRESHOLD_PX) {
      handlePetActivate();
    }
  };
  const onPetKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePetActivate();
    }
  };

  petBtn.addEventListener('pointerdown', onPetPointerDown);
  petBtn.addEventListener('pointerup', onPetPointerUp);
  petBtn.addEventListener('keydown', onPetKeyDown);
  addCleanup(() => {
    petBtn.removeEventListener('pointerdown', onPetPointerDown);
    petBtn.removeEventListener('pointerup', onPetPointerUp);
    petBtn.removeEventListener('keydown', onPetKeyDown);
  });

  // 拖食物喂（事件委托绑定在 opts.feedSource，分离未提交手势与已提交飞行幽灵）
  let feedSourceEl = null;
  let feedSourceCleanup = null;
  let activeGesture = null;

  function cleanupActiveGesture(removeUncommittedGhost = true) {
    if (!activeGesture) return;
    const g = activeGesture;
    activeGesture = null;

    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onUp);
    window.removeEventListener('pointercancel', g.onCancel);

    try {
      if (g.btn?.hasPointerCapture?.(g.pointerId)) {
        g.btn.releasePointerCapture(g.pointerId);
      }
    } catch {
      // ignore
    }

    if (removeUncommittedGhost && g.ghost) {
      g.ghost.remove();
    }
    isHoveringDropZone = false;
    hoverRingGfx.visible = false;
  }

  function isPointInDropZone(clientX, clientY) {
    const rect = roomRoot.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const inLowerTwoThirds =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top + rect.height / 3 &&
      clientY <= rect.bottom;
    if (inLowerTwoThirds) return true;

    const pad = 32;
    const petLeft = rect.left + (petBaseX - petBoxW * 0.5 - pad);
    const petRight = rect.left + (petBaseX + petBoxW * 0.5 + pad);
    const petTop = rect.top + (petBaseY - petBoxH - pad);
    const petBottom = rect.top + (petBaseY + pad);
    return (
      clientX >= petLeft &&
      clientX <= petRight &&
      clientY >= petTop &&
      clientY <= petBottom
    );
  }

  function createDragGhost(btn, foodKey) {
    const ghost = document.createElement('div');
    ghost.className = 'care-room-drag-ghost';
    const foodMeta = currentState.foods.find((f) => f.key === foodKey);
    const fallbackEmoji = foodMeta?.emoji || DEFAULT_FOOD_EMOJIS[foodKey] || '🍎';
    const imgEl = btn.querySelector('img');

    if (imgEl && imgEl.getAttribute('src') && imgEl.complete && imgEl.naturalWidth > 0) {
      const cloneImg = document.createElement('img');
      cloneImg.src = imgEl.currentSrc || imgEl.src;
      cloneImg.alt = '';
      cloneImg.onerror = () => {
        ghost.textContent = fallbackEmoji;
      };
      ghost.appendChild(cloneImg);
    } else {
      ghost.textContent = fallbackEmoji;
    }

    document.body.appendChild(ghost);
    return ghost;
  }

  function suppressNextCompatibilityClick(sourceEl) {
    if (!sourceEl) return;
    let done = false;
    const swallow = (ev) => {
      if (done) return;
      done = true;
      ev.stopPropagation();
      ev.preventDefault();
      sourceEl.removeEventListener('click', swallow, true);
    };
    sourceEl.addEventListener('click', swallow, true);
    safeTimeout(() => {
      if (!done) {
        done = true;
        sourceEl.removeEventListener('click', swallow, true);
      }
    }, 320);
  }

  function animateGhostReturn(ghost, targetBtn, foodKey, onDone) {
    if (!ghost) {
      onDone?.();
      return;
    }
    trackInFlightGhost(ghost);

    const resolvedBtn =
      targetBtn && targetBtn.isConnected
        ? targetBtn
        : feedSourceEl?.querySelector?.(`.carefood[data-care-kind="feed"][data-care-key="${foodKey}"]`);

    const btnRect = resolvedBtn?.getBoundingClientRect?.();
    const endX = btnRect ? btnRect.left + btnRect.width * 0.5 : window.innerWidth * 0.5;
    const endY = btnRect ? btnRect.top + btnRect.height * 0.5 : window.innerHeight * 0.8;
    const startTransform = ghost.style.transform;
    const match = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(startTransform);
    const startX = match ? parseFloat(match[1]) : endX;
    const startY = match ? parseFloat(match[2]) : endY;
    const startTime = performance.now();
    const duration = 200;

    function step(now) {
      if (destroyed) {
        removeInFlightGhost(ghost);
        return;
      }
      const t = clamp((now - startTime) / duration, 0, 1);
      const e = easeOutBackSoft(t);
      const x = lerp(startX, endX, e);
      const y = lerp(startY, endY, e);
      ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${lerp(1.1, 0.85, t)})`;
      ghost.style.opacity = `${1 - t * 0.7}`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        removeInFlightGhost(ghost);
        onDone?.();
      }
    }
    requestAnimationFrame(step);
  }

  function animateGhostFlyToPet(ghost, onImpact) {
    if (!ghost) {
      onImpact?.();
      return;
    }
    trackInFlightGhost(ghost);

    const rect = roomRoot.getBoundingClientRect();
    const endX = rect.left + petBaseX;
    const endY = rect.top + (petBaseY - petBoxH * 0.48);
    const match = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(ghost.style.transform);
    const startX = match ? parseFloat(match[1]) : endX;
    const startY = match ? parseFloat(match[2]) : endY;
    const startTime = performance.now();
    const duration = 280;

    function step(now) {
      if (destroyed) {
        removeInFlightGhost(ghost);
        return;
      }
      const t = clamp((now - startTime) / duration, 0, 1);
      const e = easeOutBackSoft(t);
      const x = lerp(startX, endX, e);
      const arcLift = Math.sin(t * Math.PI) * -22;
      const y = lerp(startY, endY, e) + arcLift;
      const scale = t < 0.6 ? lerp(1.0, 1.2, t / 0.6) : lerp(1.2, 0.5, (t - 0.6) / 0.4);
      ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      ghost.style.opacity = `${t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25}`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        removeInFlightGhost(ghost);
        onImpact?.();
      }
    }
    requestAnimationFrame(step);
  }

  function formatFeedSuccessLabel(res) {
    const parts = [];
    if (res.favorite) {
      const xp = typeof res.xpAwarded === 'number' && res.xpAwarded > 0 ? res.xpAwarded : 5;
      parts.push(`+${xp} 经验 最爱！`);
    } else {
      parts.push('吃得很开心！');
    }
    if (typeof res.friendshipAwarded === 'number' && res.friendshipAwarded > 0) {
      parts.push(`友好度 +${res.friendshipAwarded}`);
    }
    if (res.level?.evolved?.to) {
      parts.push(`进化成 ${res.level.evolved.to}！`);
    }
    return parts.join(' ');
  }

  async function commitFeed(drag) {
    setModuleLocked(true);
    isHoveringDropZone = false;
    hoverRingGfx.visible = false;

    const ghost = drag.ghost;
    trackInFlightGhost(ghost);

    const rect = roomRoot.getBoundingClientRect();
    const waitX = rect.left + petBaseX;
    const waitY = rect.top + (petBaseY - petBoxH * 0.55);
    if (ghost) {
      ghost.style.transform = `translate3d(${waitX}px, ${waitY}px, 0) scale(1.05)`;
    }
    oneShotAnim = { kind: 'waiting', elapsedMs: 0, durationMs: 10000 };

    let result = null;
    let failedError = null;
    try {
      if (typeof opts.api?.feed !== 'function') {
        throw new Error('api.feed is not provided');
      }
      result = await opts.api.feed(drag.key);
    } catch (err) {
      failedError = err;
    }

    if (destroyed) {
      removeInFlightGhost(ghost);
      return;
    }

    if (failedError || !result || result.ok !== true) {
      oneShotAnim = null;
      const errCode = result?.error;
      const msg =
        errCode === 'CARE_DISABLED'
          ? '照顾玩法还没开启，让爸爸妈妈在设置里打开吧'
          : errCode || failedError?.message || '操作失败，请稍后再试';

      liveRegion.textContent = msg;
      animateGhostReturn(ghost, drag.btn, drag.key, () => {
        if (!destroyed) {
          opts.onError?.({ message: msg, error: errCode });
          setModuleLocked(false);
        }
      });
      return;
    }

    // 成功：仅在收到 ok: true 后播放飞入与庆祝动画
    oneShotAnim = null;
    animateGhostFlyToPet(ghost, () => {
      if (destroyed) return;

      sound.playFeedSuccess(Boolean(result.favorite));
      try {
        navigator.vibrate?.(20);
      } catch {
        // ignore
      }

      startSquash(520);
      if (result.favorite) {
        triggerFavFlash();
      }
      spawnFeedSparks(Boolean(result.favorite));

      const hasGain = Boolean(result.favorite) || (Number(result.friendshipAwarded) || 0) > 0;
      showFloatingDomLabel(formatFeedSuccessLabel(result), hasGain);

      opts.onFed?.(result);

      safeTimeout(() => {
        setModuleLocked(false);
      }, 820);
    });
  }

  function cancelFeed(drag, didActualDrag) {
    isHoveringDropZone = false;
    hoverRingGfx.visible = false;
    if (didActualDrag) {
      startHeadTilt(320);
      try {
        navigator.vibrate?.(8);
      } catch {
        // ignore
      }
    }
    animateGhostReturn(drag.ghost, drag.btn, drag.key, null);
  }

  function bindFeedSource(el) {
    if (feedSourceCleanup) {
      feedSourceCleanup();
      feedSourceCleanup = null;
    }
    feedSourceEl = el || null;
    if (!feedSourceEl) return;

    const sanitizeTrayItems = () => {
      if (!feedSourceEl) return;
      const buttons = feedSourceEl.querySelectorAll('.carefood[data-care-kind="feed"]');
      buttons.forEach((b) => {
        b.setAttribute('draggable', 'false');
        b.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));
      });
    };
    sanitizeTrayItems();

    const onContextMenu = (e) => {
      const btn = e.target?.closest?.('.carefood[data-care-kind="feed"]');
      if (btn) {
        e.preventDefault();
      }
    };

    const onPointerDown = (e) => {
      if (destroyed || isBusyNow() || currentState.fedToday) return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

      const btn = e.target?.closest?.('.carefood[data-care-kind="feed"]');
      if (!btn || !feedSourceEl.contains(btn)) return;
      if (btn.disabled || btn.dataset.careNoitem === '1') return;

      const key = btn.dataset.careKey;
      if (!key) return;

      cleanupActiveGesture(true);
      sanitizeTrayItems();

      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      const onMove = (ev) => {
        if (destroyed) {
          cleanupActiveGesture(true);
          return;
        }
        if (!activeGesture || ev.pointerId !== activeGesture.pointerId) return;
        const dist = Math.hypot(ev.clientX - activeGesture.startX, ev.clientY - activeGesture.startY);
        if (!activeGesture.dragging && dist >= DRAG_THRESHOLD_PX) {
          activeGesture.dragging = true;
          sound.unlock();
          activeGesture.ghost = createDragGhost(activeGesture.btn, activeGesture.key);
        }
        if (activeGesture.dragging && activeGesture.ghost) {
          const offsetY = activeGesture.pointerType === 'touch' ? -48 : 0;
          const gx = ev.clientX;
          const gy = ev.clientY + offsetY;
          activeGesture.ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0) scale(1.1)`;

          const hovering = isPointInDropZone(ev.clientX, gy);
          if (hovering !== isHoveringDropZone) {
            isHoveringDropZone = hovering;
            hoverRingGfx.visible = hovering;
          }
        }
      };

      const finishGesture = (ev, cancelled) => {
        if (destroyed) {
          cleanupActiveGesture(true);
          return;
        }
        if (!activeGesture || ev.pointerId !== activeGesture.pointerId) return;
        const drag = activeGesture;
        cleanupActiveGesture(false);

        if (!drag.dragging) {
          return;
        }

        suppressNextCompatibilityClick(feedSourceEl);

        if (cancelled) {
          cancelFeed(drag, drag.dragging);
          return;
        }

        const offsetY = drag.pointerType === 'touch' ? -48 : 0;
        const overDrop = isPointInDropZone(ev.clientX, ev.clientY + offsetY);
        if (overDrop && !isBusyNow() && !currentState.fedToday) {
          commitFeed(drag);
        } else {
          cancelFeed(drag, true);
        }
      };

      const onUp = (ev) => finishGesture(ev, false);
      const onCancel = (ev) => finishGesture(ev, true);

      activeGesture = {
        pointerId: e.pointerId,
        pointerType: e.pointerType || 'mouse',
        startX: e.clientX,
        startY: e.clientY,
        key,
        btn,
        dragging: false,
        ghost: null,
        onMove,
        onUp,
        onCancel,
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };

    const boundEl = feedSourceEl;
    boundEl.addEventListener('pointerdown', onPointerDown);
    boundEl.addEventListener('contextmenu', onContextMenu);

    feedSourceCleanup = () => {
      boundEl.removeEventListener('pointerdown', onPointerDown);
      boundEl.removeEventListener('contextmenu', onContextMenu);
      cleanupActiveGesture(true);
    };
  }

  bindFeedSource(opts.feedSource || null);
  addCleanup(() => {
    if (feedSourceCleanup) {
      feedSourceCleanup();
      feedSourceCleanup = null;
    }
  });

  // FPS 监控与阶梯降级（跳过前 1000ms，2000ms 窗口中位数）
  let perfTier = '60fps'; // '60fps' | '30fps'
  let warmupUntilMs = performance.now() + 1000;
  let windowStartMs = warmupUntilMs;
  let frameDeltas = [];
  let measuredFps = 60;

  function resetFpsWindow(warmupMs = 1000) {
    const now = performance.now();
    warmupUntilMs = now + warmupMs;
    windowStartMs = warmupUntilMs;
    frameDeltas = [];
  }

  function recordFrameForFps(dtMs) {
    const now = performance.now();
    if (now < warmupUntilMs) return;
    if (dtMs > 0 && dtMs < 500) {
      frameDeltas.push(dtMs);
    }
    if (now - windowStartMs >= 2000 && frameDeltas.length >= 10) {
      const sorted = frameDeltas.slice().sort((a, b) => a - b);
      const medianDt = sorted[Math.floor(sorted.length / 2)];
      measuredFps = Math.round(1000 / Math.max(1, medianDt));
      frameDeltas = [];
      windowStartMs = now;

      if (perfTier === '60fps' && measuredFps < 30) {
        perfTier = '30fps';
        app.ticker.maxFPS = 30;
        cloudsLayer.visible = false;
      } else if (perfTier === '30fps' && measuredFps < 24) {
        triggerFallback('low-fps');
      }
    }
  }

  // 主动画循环（每帧更新）
  let elapsedTotalSec = 0;
  let nextAmbientTimerSec = 9.5;
  let glanceRemainingSec = 0;

  const onTick = (ticker) => {
    if (destroyed) return;
    const dtMs = Math.min(100, ticker.deltaMS || 16.67);
    const dtSec = dtMs / 1000;
    elapsedTotalSec += dtSec;

    recordFrameForFps(dtMs);
    if (destroyed) return;

    // 1) 背景漂浮云（30fps 模式下隐藏）
    if (perfTier === '60fps') {
      for (const c of clouds) {
        const speed = (roomW + 120) / c.periodSec;
        c.gfx.x = ((c.normX * roomW + elapsedTotalSec * speed) % (roomW + 120)) - 60;
        c.gfx.y = c.normY * roomH;
      }
    }

    // 2) 心情驱动的周期性小彩蛋（饥饿偷瞄 / 脏脏微尘 / 开心爱心）
    nextAmbientTimerSec -= dtSec;
    if (nextAmbientTimerSec <= 0) {
      if (currentMood === 'hungry') {
        glanceRemainingSec = 0.22;
        nextAmbientTimerSec = 10 + Math.random() * 4;
      } else if (currentMood === 'dirty' && perfTier === '60fps') {
        spawnParticle({
          type: 'mote',
          shape: 'dot',
          size: 3 + Math.random() * 1.5,
          color: Math.random() > 0.5 ? 0xb8b8c8 : 0xc8bfe7,
          x: petBaseX + (Math.random() - 0.5) * (petBoxW * 0.6),
          y: petBaseY - 6 - Math.random() * 14,
          vx: (Math.random() - 0.5) * 8,
          vy: -6 - Math.random() * 5,
          maxLifeMs: 4000,
          scaleStart: 0.8,
          scaleEnd: 0.4,
        });
        nextAmbientTimerSec = 1.6 + Math.random() * 1.2;
      } else if (currentMood === 'happy' || currentMood === 'max') {
        spawnParticle({
          type: 'ambient-heart',
          shape: 'heart',
          size: 7.5,
          color: 0xf25c54,
          x: petBaseX + (Math.random() - 0.5) * 26,
          y: petBaseY - petBoxH * 0.72,
          vx: (Math.random() - 0.5) * 10,
          vy: -42,
          maxLifeMs: 800,
          scaleStart: 0.75,
          scaleEnd: 1.1,
        });
        nextAmbientTimerSec = 8 + Math.random() * 4;
      } else {
        nextAmbientTimerSec = 6;
      }
    }

    // 3) 宠物待机呼吸参数（饥饿时更缓更浅、明显微倾低垂 + 思考气泡）
    let periodMs = 2400;
    let maxScaleY = 1.03;
    let minScaleX = 0.98;
    let bobAmp = 3;
    let baseRotRad = 0;

    if (currentMood === 'hungry') {
      periodMs = 3400;
      maxScaleY = 1.015;
      minScaleX = 0.992;
      bobAmp = 1.5;
      baseRotRad = (6.5 * Math.PI) / 180;
    } else if (currentMood === 'dirty') {
      periodMs = 2600;
    } else if (currentMood === 'low') {
      periodMs = 2800;
      maxScaleY = 1.015;
      minScaleX = 0.99;
      bobAmp = 1.5;
    } else if (currentMood === 'happy' || currentMood === 'max') {
      periodMs = 2200;
      maxScaleY = 1.04;
      minScaleX = 0.975;
      bobAmp = 4;
    }

    const cycle = (Math.sin((elapsedTotalSec * 1000 * Math.PI * 2) / periodMs) + 1) * 0.5;
    let sx = lerp(1.0, minScaleX, cycle);
    let sy = lerp(1.0, maxScaleY, cycle);
    let offsetY = -bobAmp * cycle;
    let rotRad = baseRotRad;

    if (glanceRemainingSec > 0) {
      glanceRemainingSec = Math.max(0, glanceRemainingSec - dtSec);
      rotRad += (3.0 * Math.PI) / 180;
      offsetY += 1.5;
    }

    if (hungryBubbleGfx.visible) {
      const bubbleBob = Math.sin(elapsedTotalSec * 2.4) * 2.2;
      const baseBubbleY = clamp(petBaseY - petBoxH * 0.84, hudBottomPx + 28, petBaseY - 24);
      hungryBubbleGfx.y = baseBubbleY + bubbleBob;
    }

    if (isHoveringDropZone) {
      sx *= 1.04;
      sy *= 1.04;
    }

    // 4) 叠加一次性交互动画（挤压 / 歪头 / 等待）
    if (oneShotAnim) {
      oneShotAnim.elapsedMs += dtMs;
      const t = clamp(oneShotAnim.elapsedMs / oneShotAnim.durationMs, 0, 1);
      if (oneShotAnim.kind === 'squash') {
        let qx = 1;
        let qy = 1;
        if (t < 0.3) {
          const u = t / 0.3;
          qx = lerp(1.0, 1.1, u);
          qy = lerp(1.0, 0.85, u);
        } else if (t < 0.55) {
          const u = (t - 0.3) / 0.25;
          qx = lerp(1.1, 0.95, u);
          qy = lerp(0.85, 1.06, u);
        } else if (t < 0.75) {
          const u = (t - 0.55) / 0.2;
          qx = lerp(0.95, 1.02, u);
          qy = lerp(1.06, 0.98, u);
        } else {
          const u = (t - 0.75) / 0.25;
          qx = lerp(1.02, 1.0, u);
          qy = lerp(0.98, 1.0, u);
        }
        sx *= qx;
        sy *= qy;
      } else if (oneShotAnim.kind === 'tilt') {
        const wave = Math.sin(t * Math.PI);
        rotRad += ((6 * Math.PI) / 180) * wave;
      } else if (oneShotAnim.kind === 'waiting') {
        const pulse = Math.sin(oneShotAnim.elapsedMs * 0.012) * 0.025;
        sx *= 1 + pulse;
        sy *= 1 - pulse;
      }

      if (t >= 1 && oneShotAnim.kind !== 'waiting') {
        oneShotAnim = null;
      }
    }

    petContainer.scale.set(sx, sy);
    petContainer.y = petBaseY + offsetY;
    petContainer.rotation = rotRad;

    // 5) 更新粒子池
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.lifeMs += dtMs;
      const t = clamp(p.lifeMs / p.maxLifeMs, 0, 1);
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.gfx.x = p.x;
      p.gfx.y = p.y;
      const sc = lerp(p.scaleStart, p.scaleEnd, easeOutCubic(t));
      p.gfx.scale.set(sc);
      p.gfx.alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

      if (t >= 1) {
        fxLayer.removeChild(p.gfx);
        p.gfx.destroy();
        particles.splice(i, 1);
      }
    }
  };

  app.ticker.add(onTick);
  addCleanup(() => app.ticker?.remove?.(onTick));

  // 页面隐藏或房间滚出视口时自动暂停 ticker
  let isTabVisible = !document.hidden;
  let isInViewport = true;

  function updateTickerRunState() {
    if (destroyed || !appInitialized) return;
    if (isTabVisible && isInViewport) {
      if (!app.ticker.started) {
        resetFpsWindow(1000);
        app.ticker.start();
      }
    } else if (app.ticker.started) {
      app.ticker.stop();
    }
  }

  const onVisibilityChange = () => {
    isTabVisible = !document.hidden;
    updateTickerRunState();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  addCleanup(() => document.removeEventListener('visibilitychange', onVisibilityChange));

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === roomRoot) {
            isInViewport = entry.isIntersecting;
            updateTickerRunState();
          }
        }
      },
      { threshold: 0.05 }
    );
    io.observe(roomRoot);
    addCleanup(() => io.disconnect());
  }

  // 初始同步 DOM、布局并加载宠物立绘
  syncDOMState(null);
  layoutScene();
  loadPetImage(petInfo.img);

  function teardownEngine() {
    if (destroyed) return;
    destroyed = true;
    clearAllTimers();

    for (const fn of Array.from(cleanups)) {
      cleanups.delete(fn);
      try {
        fn();
      } catch {
        // ignore
      }
    }

    for (const ghost of Array.from(inFlightGhosts)) {
      removeInFlightGhost(ghost);
    }

    for (const tex of Array.from(managedTextures)) {
      managedTextures.delete(tex);
      try {
        tex.destroy(true);
      } catch {
        // ignore
      }
    }
    skyTexture = null;
    petTexture = null;
    particles.length = 0;

    if (appInitialized) {
      appInitialized = false;
      try {
        app.ticker.stop();
      } catch {
        // ignore
      }
      const loseExt = glContext?.getExtension?.('WEBGL_lose_context');
      try {
        app.destroy(
          { removeView: true, releaseGlobalResources: true },
          { children: true, texture: true, textureSource: true }
        );
      } catch {
        // ignore
      }
      if (loseExt && glContext && !glContext.isContextLost()) {
        try {
          loseExt.loseContext();
        } catch {
          // ignore
        }
      }
      activeContexts = 0;
    }

    sound.close();
    releaseStyleOnce();
    if (container && container.isConnected) {
      container.innerHTML = '';
    }
  }

  function triggerFallback(reason = 'manual') {
    if (destroyed) return;
    currentMode = 'fallback';
    lastFallbackReason = reason;
    teardownEngine();
    if (activeInstance === handle) {
      activeInstance = null;
    }
    opts.onFallback?.({ reason });
  }

  const handle = {
    update(partialState = {}) {
      if (destroyed || !partialState || typeof partialState !== 'object') return;

      const nextState = {
        ...currentState,
        ...partialState,
        sceneKey: 'rainbow-meadow',
        sceneText:
          partialState.sceneText !== undefined
            ? String(partialState.sceneText)
            : currentState.sceneText,
        showHearts:
          partialState.showHearts !== undefined
            ? Boolean(partialState.showHearts)
            : currentState.showHearts,
        friendship:
          partialState.friendship !== undefined
            ? clamp(Number(partialState.friendship) || 0, 0, 255)
            : currentState.friendship,
        fedToday:
          partialState.fedToday !== undefined
            ? Boolean(partialState.fedToday)
            : currentState.fedToday,
        bathedToday:
          partialState.bathedToday !== undefined
            ? Boolean(partialState.bathedToday)
            : currentState.bathedToday,
        foods: Array.isArray(partialState.foods)
          ? structuredCloneSafe(partialState.foods)
          : currentState.foods,
      };

      const nextPet = partialState.pet
        ? {
            img: partialState.pet.img ?? petInfo.img,
            name: partialState.pet.name ?? partialState.pet.formName ?? petInfo.name,
            formName: partialState.pet.formName ?? partialState.pet.name ?? petInfo.formName,
          }
        : petInfo;

      // 状态完全一致时不重启待机或一次性动画
      if (deepEqual(nextState, currentState) && deepEqual(nextPet, petInfo)) {
        return;
      }

      const petImgChanged = nextPet.img !== petInfo.img;
      petInfo = nextPet;
      currentState = nextState;

      const prevMood = currentMood;
      currentMood = computeMood(currentState);
      syncDOMState(prevMood);
      layoutScene();

      if (petImgChanged) {
        loadPetImage(petInfo.img);
      }
    },

    setFeedSource(el) {
      if (destroyed) return;
      bindFeedSource(el);
    },

    fallback(reason = 'manual') {
      triggerFallback(reason);
    },

    unmount() {
      if (activeInstance === handle) {
        activeInstance = null;
      }
      teardownEngine();
    },

    getDiagnostics() {
      return {
        mode: currentMode,
        fps: destroyed ? 0 : measuredFps,
        dpr,
        webgl: webglAvailable,
        reducedMotion: isReducedMotion(),
        lastFallbackReason,
        textures: managedTextures.size,
        contexts: activeContexts,
        listeners: cleanups.size,
        opaqueBox: {
          width: Math.round(petBoxW),
          height: Math.round(petBoxH),
          hudBottom: Math.round(hudBottomPx),
        },
      };
    },
  };

  activeInstance = handle;
  opts.onReady?.({ fps: measuredFps, mode: 'pixi', dpr });
  return handle;
}

function structuredCloneSafe(val) {
  try {
    return structuredClone(val);
  } catch {
    return JSON.parse(JSON.stringify(val));
  }
}
