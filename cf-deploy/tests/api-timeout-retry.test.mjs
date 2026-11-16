// tests/api-timeout-retry.test.mjs
// 任务 111：api() 读请求默认 8 秒超时＋网络失败自动重试 1 次——挂死的请求不再无限等
// （设置页 60 秒+不渲染、每日三行 30 秒+空白的根因）。
// 用虚拟时钟跑真实 api() 源码（从 app.js.orig 抽出），不烧真实时间。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

function extractApi(src) {
  const start = src.indexOf('async function api(');
  assert.ok(start >= 0, 'api() not found in app.js.orig');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('api() braces not balanced');
}

// 虚拟时钟＋可按脚本定制的 fetch 桩
function makeApi(fetchImpl) {
  let now = 0;
  let timers = [];
  let nextId = 1;
  const clock = {
    setTimeout(fn, ms) { const id = nextId++; timers.push({ id, at: now + (ms || 0), fn }); return id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    advance(ms) {
      now += ms;
      const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
      timers = timers.filter((t) => t.at > now);
      for (const t of due) t.fn();
    },
    now: () => now,
  };
  const ctx = {
    fetch: fetchImpl,
    setTimeout: clock.setTimeout.bind(clock),
    clearTimeout: clock.clearTimeout.bind(clock),
    AbortController,
    location: { href: '' },
    state: { pinOk: true, needPin: false },
    parentRenderDepth: 0,
    goParent: () => { throw new Error('goParent must not be called'); },
    clearAllCaches: () => {},
    lcSyncSoon: undefined,
    CHILD_READ_POST: [],
  };
  vm.createContext(ctx);
  vm.runInContext(`${extractApi(SRC)}\nthis.__api = api;`, ctx);
  return { api: ctx.__api, clock };
}

// 推进虚拟时钟直到 promise 落定（按 100ms 虚拟步进，最多 500 步）
async function settle(p, clock) {
  const raced = await Promise.race([
    p.then((v) => ({ settled: true, v }), (e) => ({ settled: true, e })),
    (async () => {
      for (let i = 0; i < 500; i++) { clock.advance(100); await new Promise((r) => setImmediate(r)); }
      return { settled: false };
    })(),
  ]);
  assert.ok(raced.settled, 'api() did not settle in virtual time');
  return raced;
}

function hangingFetch() {
  let calls = 0;
  const f = (url, opt) => {
    calls++;
    return new Promise((resolve, reject) => {
      if (opt?.signal) {
        if (opt.signal.aborted) return reject(new DOMException('aborted', 'AbortError'));
        opt.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      }
    });
  };
  f.calls = () => calls;
  return f;
}

function scriptedFetch(script) {
  // script: array of ('throw' | {ok:true, ...}) per call; hanging entry = 'hang'
  let calls = 0;
  const f = (url, opt) => {
    const i = calls++;
    const step = script[Math.min(i, script.length - 1)];
    if (step === 'throw') return Promise.reject(new Error('net down'));
    if (step === 'hang') {
      return new Promise((resolve, reject) => {
        if (opt?.signal) opt.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    }
    return Promise.resolve({ json: async () => step });
  };
  f.calls = () => calls;
  return f;
}

test('GET 挂死：默认 8 秒超时、重试 1 次后抛错（总虚拟耗时约 16.5 秒）', async () => {
  const f = hangingFetch();
  const { api, clock } = makeApi(f);
  const r = await settle(api('/api/parent/settings'), clock);
  assert.ok('e' in r, 'expected rejection');
  assert.equal(f.calls(), 2, 'two attempts');
  assert.ok(clock.now() >= 16000 && clock.now() <= 17500, `virtual time ${clock.now()}ms`);
});

test('GET 第一次网络失败、第二次成功：重试后返回数据', async () => {
  const f = scriptedFetch(['throw', { ok: true, settings: {} }]);
  const { api, clock } = makeApi(f);
  const r = await settle(api('/api/parent/settings'), clock);
  assert.ok('v' in r && r.v.ok, 'expected success after retry');
  assert.equal(f.calls(), 2);
});

test('GET 立即失败两次：只重试 1 次就抛错', async () => {
  const f = scriptedFetch(['throw', 'throw']);
  const { api, clock } = makeApi(f);
  const r = await settle(api('/api/parent/settings'), clock);
  assert.ok('e' in r, 'expected rejection');
  assert.equal(f.calls(), 2);
  assert.ok(clock.now() >= 500 && clock.now() <= 1000, `retry delay ~500ms, got ${clock.now()}ms`);
});

test('POST 不自动重试（不幂等）', async () => {
  const f = scriptedFetch(['throw', { ok: true }]);
  const { api, clock } = makeApi(f);
  const r = await settle(api('/api/parent/settings/update', { careEnabled: true }), clock);
  assert.ok('e' in r, 'expected rejection');
  assert.equal(f.calls(), 1);
});

test('显式超时保持原值：100ms 超时只试 1 次', async () => {
  const f = hangingFetch();
  const { api, clock } = makeApi(f);
  const r = await settle(api('/api/battle/state', { battleId: 'x' }, undefined, 100), clock);
  assert.ok('e' in r, 'expected rejection');
  assert.equal(f.calls(), 1);
  assert.ok(clock.now() >= 100 && clock.now() <= 300, `explicit 100ms timeout, got ${clock.now()}ms`);
});

test('8 秒内回来的 GET：一次成功，不重试', async () => {
  const f = scriptedFetch([{ ok: true, settings: {} }]);
  const { api, clock } = makeApi(f);
  const r = await settle(api('/api/parent/settings'), clock);
  assert.ok('v' in r && r.v.ok);
  assert.equal(f.calls(), 1);
});
