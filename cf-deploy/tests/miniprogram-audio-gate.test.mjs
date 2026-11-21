/* Mini-program 音频预加载＋设门单测（MP-15 §7）：node --test tests/miniprogram-audio-gate.test.mjs
 * 用 mock wx 环境加载真实页面代码，验证两层修复：
 * (1) 预加载：句表一到手就给每句建一个 InnerAudioContext、立即设 src（后台缓冲）；
 *     点按时已就绪的直接播；未就绪的等该池上下文的 onCanplay；慢速不预加载。
 * (2) 设门（安全网）：预加载失败时点按改走共享上下文流式播放（等 onCanplay 才
 *     play）；流式也失败（404 URL）时 toast“音频播放失败”且不播；后台预加载失败
 *     本身不弹 toast；加载中重复点按被忽略；卸载时销毁全部上下文。
 * 测的是页面 JS 的门控逻辑，不是真机音频；真机首播仍须用户在设备上验收（任务单 §7
 * acceptance）。页面文件在 work/future-tasks/miniprogram/mp-15/project/；路径在
 * worktree（../../future-tasks）与合并后的 main（../../work/future-tasks）下都能
 * 解析；每次 loadPage 前清 require 缓存，否则同一文件第二次加载拿不到新的 Page 定义。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));

function mpRoot() {
  for (const rel of [
    '../../future-tasks/miniprogram/mp-15/project',
    '../../work/future-tasks/miniprogram/mp-15/project',
  ]) {
    const abs = path.resolve(HERE, rel);
    if (fs.existsSync(path.join(abs, 'app.json'))) return abs;
  }
  throw new Error('找不到 mp-15 project 目录');
}
const MP = mpRoot();

function makeAudioCtx(h) {
  const handlers = {};
  const calls = [];
  const ctx = {
    handlers,
    calls,
    _src: '',
    play() { calls.push('play'); },
    stop() { calls.push('stop'); },
    destroy() { calls.push('destroy'); },
    onEnded(fn) { handlers.ended = fn; },
    onStop(fn) { handlers.stop = fn; },
    onError(fn) { handlers.error = fn; },
    onCanplay(fn) { handlers.canplay = fn; },
    fire(name) { if (handlers[name]) handlers[name](); },
  };
  Object.defineProperty(ctx, 'src', {
    get() { return this._src; },
    set(v) { this._src = v; calls.push(['set-src', v]); },
  });
  h.ctxs.push(ctx);
  return ctx;
}

function installWx() {
  const h = {
    ctxs: [],
    toasts: [],
    modals: [],
    storage: { childId: '1' },
    mockResponses: {},
  };
  const rm = {
    handlers: {},
    onStop(fn) { this.handlers.stop = fn; },
    onError(fn) { this.handlers.error = fn; },
    onStart() {},
    start() {},
    stop() {},
    pause() {},
    resume() {},
  };
  globalThis.wx = {
    createInnerAudioContext: () => makeAudioCtx(h),
    getRecorderManager: () => rm,
    getStorageSync: (k) => (h.storage[k] !== undefined ? h.storage[k] : ''),
    setStorageSync: (k, v) => { h.storage[k] = v; },
    removeStorageSync: (k) => { delete h.storage[k]; },
    request: (opts) => {
      for (const [key, data] of Object.entries(h.mockResponses)) {
        if (opts.url && opts.url.includes(key)) {
          if (opts.success) opts.success({ data, header: {} });
          return;
        }
      }
      /* 未 mock 的请求：挂起（不回调）。 */
    },
    showToast: (o) => { h.toasts.push(o && o.title); },
    showModal: (o) => { h.modals.push(o); },
    authorize: (o) => { if (o && o.success) o.success(); },
    getFileSystemManager: () => ({ readFile: () => {} }),
    setNavigationBarTitle: () => {},
    openSetting: () => {},
    navigateTo: () => {},
    redirectTo: () => {},
  };
  globalThis.getApp = () => ({ globalData: {} });
  let captured = null;
  globalThis.Page = (def) => { captured = def; };
  h.shared = () => h.ctxs[0];
  h.pool = (i) => h.ctxs[1 + i];
  h.loadPage = (relPath) => {
    captured = null;
    const abs = path.join(MP, relPath);
    const resolved = require.resolve(abs);
    delete require.cache[resolved];
    require(resolved);
    assert.ok(captured, `Page 未注册：${relPath}`);
    const inst = { ...captured };
    inst.data = JSON.parse(JSON.stringify(captured.data));
    inst.setData = function (patch) { Object.assign(this.data, patch); };
    return inst;
  };
  return h;
}

const tick = () => new Promise((r) => setTimeout(r, 10));

function englishFixture() {
  const sentences = [];
  for (let i = 1; i <= 5; i++) {
    sentences.push({
      episodeId: 'ep1', sid: `s${i}`, titleEn: `T${i}`, titleZh: '',
      type: 'textbook', speaker: null, en: `Hello ${i}`, zh: `你好${i}`,
      audioNormal: `https://x/e${i}.mp3`, audioSlow: `https://x/e${i}-slow.mp3`,
    });
  }
  return { ok: true, date: '2026-11-17', sentences, completed: false, scores: {} };
}

function oakFixture() {
  const sentences = [];
  for (let i = 1; i <= 6; i++) {
    sentences.push({ id: 100 + i, en: `Hello ${i}`, zh: `你好${i}`, audio: `/static/audio/oak/${i}.mp3`, listened: false });
  }
  return {
    ok: true, childId: 1, childGrade: '三年级', date: '2026-11-17',
    episodeId: 'ep1', topic: 'Test', quizXp: 10, listenedCount: 0,
    completed: false, xpAwardedToday: 0, sentences,
    fiveStarCount: 0, fiveStarTotal: 6, drawGranted: false, assessEnabled: true,
  };
}

function modulesFixture() {
  return {
    ok: true,
    modules: [
      { key: 'english', title: '每日英语跟读', icon: '📖', kind: 'recite', unit: '句', count: 5, intro: '每天 5 句英语跟读，每句达到 75 分就能打卡。' },
      { key: 'chinese', title: '每日语文', icon: '✍️', kind: 'quiz', unit: '道题', count: 5, intro: '每天 5 道语文题，答对 4 道就能打卡。' },
      { key: 'math', title: '每日数学', icon: '🔢', kind: 'quiz', unit: '道题', count: 5, intro: '每道题想好再提交，提交后不能改；答对 4 道才能打卡。' },
    ],
  };
}

describe('MP-15 §7：音频预加载＋设门（每日英语页）', () => {
  test('预加载：句表一到手，5 句各一个上下文、src 已设；共享上下文不动', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    assert.equal(page.data.sentences.length, 5);
    assert.equal(h.ctxs.length, 6, '共享 1 个＋每句 1 个');
    assert.deepEqual(h.shared().calls, [], '共享上下文不应被预加载');
    for (let i = 0; i < 5; i++) {
      assert.deepEqual(h.pool(i).calls, [['set-src', `https://x/e${i + 1}.mp3`]], `第 ${i + 1} 句应预加载`);
    }
    assert.deepEqual(h.toasts, [], '预加载不应弹 toast');
  });

  test('就绪后点按：直接播（池上下文 play），不等 onCanplay、无 loading', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    h.pool(0).fire('canplay');
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://x/e1.mp3'], 'play']);
    assert.deepEqual(h.shared().calls, [], '就绪时不应走共享上下文');
    assert.equal(page.data.playingIndex, 0);
    assert.equal(page.data.loadingIndex, -1);
    assert.deepEqual(h.toasts, []);
    /* 再点一次：切停；第三次：已就绪，直接再播。 */
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://x/e1.mp3'], 'play', 'stop']);
    assert.equal(page.data.playingIndex, -1);
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://x/e1.mp3'], 'play', 'stop', 'play']);
  });

  test('未就绪点按：不立即 play，等该池上下文 onCanplay 才播一次', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    page.onPlayDemo({ currentTarget: { dataset: { index: 1, speed: 'normal' } } });
    assert.deepEqual(h.pool(1).calls, [['set-src', 'https://x/e2.mp3']], '未就绪时不应 play');
    assert.equal(page.data.loadingIndex, 1);
    assert.equal(page.data.loadingSpeed, 'normal');
    h.pool(1).fire('canplay');
    assert.deepEqual(h.pool(1).calls, [['set-src', 'https://x/e2.mp3'], 'play']);
    assert.equal(page.data.playingIndex, 1);
    assert.equal(page.data.loadingIndex, -1);
    assert.deepEqual(h.toasts, []);
  });

  test('加载中重复点按被忽略，不会重复触发', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'slow' } } });
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://x/e1.mp3']]);
    assert.deepEqual(h.shared().calls, []);
    assert.equal(page.data.loadingIndex, 0);
    h.pool(0).fire('canplay');
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://x/e1.mp3'], 'play']);
  });

  test('池失败静默，点按改走共享流式兜底（设门播），无 toast', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    h.pool(0).fire('error');
    assert.deepEqual(h.toasts, [], '后台预加载失败不应弹 toast');
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/e1.mp3']], '应改走共享上下文流式');
    assert.equal(page.data.loadingIndex, 0);
    h.shared().fire('canplay');
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/e1.mp3'], 'play']);
    assert.equal(page.data.playingIndex, 0);
    assert.deepEqual(h.toasts, []);
  });

  test('404 URL：池失败＋流式也失败才 toast，不播', async () => {
    const h = installWx();
    const fx = englishFixture();
    fx.sentences[0].audioNormal = 'https://x/404.mp3';
    h.mockResponses['/api/daily-english'] = fx;
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    h.pool(0).fire('error');
    assert.deepEqual(h.toasts, [], '后台预加载失败不应弹 toast');
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/404.mp3']]);
    h.shared().fire('error');
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/404.mp3']], '失败时不应调用 play');
    assert.deepEqual(h.toasts, ['音频播放失败']);
    assert.equal(page.data.loadingIndex, -1);
    assert.equal(page.data.playingIndex, -1);
  });

  test('慢速不预加载：点按走共享设门，onCanplay 后以慢速播', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'slow' } } });
    assert.equal(h.shared().src, 'https://x/e1-slow.mp3');
    assert.equal(page.data.loadingSpeed, 'slow');
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/e1-slow.mp3']]);
    h.shared().fire('canplay');
    assert.equal(page.data.playingSpeed, 'slow');
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/e1-slow.mp3'], 'play']);
  });

  test('卸载：销毁全部池上下文与共享上下文', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-english/daily-english.js');
    page.onLoad({});
    page.onShow();
    await tick();
    page.onUnload();
    for (let i = 0; i < 5; i++) {
      assert.ok(h.pool(i).calls.includes('destroy'), `池 ${i} 应销毁`);
    }
    assert.ok(h.shared().calls.includes('destroy'), '共享上下文应销毁');
  });
});

describe('MP-15 §7：音频预加载＋设门（Oak 页）', () => {
  test('预加载 6 句；就绪后点按直接播', async () => {
    const h = installWx();
    h.mockResponses['/api/oak/today'] = oakFixture();
    const page = h.loadPage('pages/oak/oak.js');
    page.onLoad();
    await tick();
    assert.equal(page.data.sentences.length, 6);
    assert.equal(h.ctxs.length, 7, '共享 1 个＋每句 1 个');
    assert.deepEqual(h.shared().calls, []);
    for (let i = 0; i < 6; i++) {
      assert.deepEqual(
        h.pool(i).calls,
        [['set-src', `https://example.com/static/audio/oak/${i + 1}.mp3`]],
        `第 ${i + 1} 句应预加载`,
      );
    }
    h.pool(0).fire('canplay');
    page.onPlayTap({ currentTarget: { dataset: { id: 101 } } });
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://example.com/static/audio/oak/1.mp3'], 'play']);
    assert.equal(page.data.playingId, 101);
    assert.equal(page.data.loadingId, null);
    assert.deepEqual(h.toasts, []);
  });

  test('未就绪点按：等该池上下文 onCanplay 才播', async () => {
    const h = installWx();
    h.mockResponses['/api/oak/today'] = oakFixture();
    const page = h.loadPage('pages/oak/oak.js');
    page.onLoad();
    await tick();
    page.onPlayTap({ currentTarget: { dataset: { id: 102 } } });
    assert.deepEqual(h.pool(1).calls, [['set-src', 'https://example.com/static/audio/oak/2.mp3']]);
    assert.equal(page.data.loadingId, 102);
    h.pool(1).fire('canplay');
    assert.deepEqual(h.pool(1).calls, [['set-src', 'https://example.com/static/audio/oak/2.mp3'], 'play']);
    assert.equal(page.data.playingId, 102);
    assert.equal(page.data.loadingId, null);
    assert.deepEqual(h.toasts, []);
  });

  test('404 URL：池失败＋流式也失败才 toast，不播', async () => {
    const h = installWx();
    const fx = oakFixture();
    fx.sentences[0].audio = '/static/audio/oak/404.mp3';
    h.mockResponses['/api/oak/today'] = fx;
    const page = h.loadPage('pages/oak/oak.js');
    page.onLoad();
    await tick();
    h.pool(0).fire('error');
    assert.deepEqual(h.toasts, [], '后台预加载失败不应弹 toast');
    page.onPlayTap({ currentTarget: { dataset: { id: 101 } } });
    assert.deepEqual(h.shared().calls, [['set-src', 'https://example.com/static/audio/oak/404.mp3']]);
    h.shared().fire('error');
    assert.deepEqual(h.shared().calls, [['set-src', 'https://example.com/static/audio/oak/404.mp3']]);
    assert.deepEqual(h.toasts, ['音频播放失败']);
    assert.equal(page.data.loadingId, null);
    assert.equal(page.data.playingId, null);
  });
});

describe('MP-15 §7：音频预加载＋设门（通用页 recite 渲染器）', () => {
  test('跟读句预加载；就绪后点按直接播', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-modules'] = modulesFixture();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-generic/daily-generic.js');
    page.onLoad({ key: 'english' });
    await tick();
    assert.equal(page.data.sentences.length, 5);
    assert.equal(page.data.reciteShape, 'sentences');
    assert.equal(h.ctxs.length, 6, '共享 1 个＋每句 1 个');
    assert.deepEqual(h.shared().calls, []);
    h.pool(0).fire('canplay');
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'normal' } } });
    assert.deepEqual(h.pool(0).calls, [['set-src', 'https://x/e1.mp3'], 'play']);
    assert.equal(page.data.playingIndex, 0);
    assert.deepEqual(h.toasts, []);
  });

  test('通用页慢速同样走共享设门', async () => {
    const h = installWx();
    h.mockResponses['/api/daily-modules'] = modulesFixture();
    h.mockResponses['/api/daily-english'] = englishFixture();
    const page = h.loadPage('pages/daily-generic/daily-generic.js');
    page.onLoad({ key: 'english' });
    await tick();
    page.onPlayDemo({ currentTarget: { dataset: { index: 0, speed: 'slow' } } });
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/e1-slow.mp3']]);
    h.shared().fire('canplay');
    assert.equal(page.data.playingSpeed, 'slow');
    assert.deepEqual(h.shared().calls, [['set-src', 'https://x/e1-slow.mp3'], 'play']);
  });
});
