// tests/rec-gum-timeout.test.mjs
// 任务 90：录音启动 getUserMedia 加 10 秒超时——无麦克风/授权弹窗挂起时，
// 不再永久卡在“Getting ready…”，10 秒后走现有失败分支（现有文案、按钮恢复可点）。
// deDcRecord（每日英语/语文共用）用虚拟时钟跑真实源码；oakRecord 同 pattern，源码断言兜底。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

function extractFn(src, sig) {
  const start = src.indexOf(sig);
  assert.ok(start >= 0, sig + ' not found in app.js.orig');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error(sig + ' braces not balanced');
}

// 虚拟时钟：setTimeout/clearTimeout/setInterval/clearInterval 全可控，不烧真实时间。
function makeClock() {
  let now = 0;
  let timers = [];
  let nextId = 1;
  const clock = {
    now: () => now,
    pending: () => timers.slice(),
    setTimeout(fn, ms) { const id = nextId++; timers.push({ id, at: now + (ms || 0), fn, repeat: false }); return id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    setInterval(fn, ms) { const id = nextId++; timers.push({ id, at: now + (ms || 0), fn, repeat: true, ms }); return id; },
    clearInterval(id) { timers = timers.filter((t) => t.id !== id); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        now = due.at;
        if (due.repeat) due.at = now + due.ms;
        else timers = timers.filter((t) => t.id !== due.id);
        due.fn();
      }
      now = end;
    },
  };
  return clock;
}

function makeDeDc(getUserMediaImpl) {
  const clock = makeClock();
  const stops = [];
  const fakeStream = { getTracks: () => [{ stop: () => stops.push(1) }] };
  const sandbox = {
    window: {},
    navigator: { mediaDevices: { getUserMedia: getUserMediaImpl } },
    tr: (zh) => zh,
    setTimeout: clock.setTimeout.bind(clock),
    clearTimeout: clock.clearTimeout.bind(clock),
    setInterval: clock.setInterval.bind(clock),
    clearInterval: clock.clearInterval.bind(clock),
    Date,
    console,
  };
  sandbox.window.MediaRecorder = class {
    constructor() { this.ondataavailable = null; this.onstop = null; this.onerror = null; }
    start() {}
    stop() {}
  };
  sandbox.oakPickMime = () => null;
  sandbox.MediaRecorder = sandbox.window.MediaRecorder;
  vm.createContext(sandbox);
  const fnSrc = extractFn(SRC, 'async function deDcRecord(');
  vm.runInContext(fnSrc + '\nthis.__deDcRecord = deDcRecord;', sandbox);
  return { clock, stops, fakeStream, deDcRecord: sandbox.__deDcRecord };
}

test('deDcRecord：getUserMedia 永不 settle，10 秒后走现有失败分支、按钮恢复可点', async () => {
  const { clock, deDcRecord } = makeDeDc(() => new Promise(() => {}));
  const D = { seq: 5, done: false };
  const rec = { state: 'idle' };
  let updated = 0;
  const p = deDcRecord(() => D, rec, () => { updated++; }, () => {}, () => {});
  await new Promise((r) => setImmediate(r));
  assert.equal(rec.state, 'requesting');
  clock.advance(9999);
  await new Promise((r) => setImmediate(r));
  assert.equal(rec.state, 'requesting', '10 秒未到仍在等');
  clock.advance(1);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await p;
  assert.equal(rec.state, 'error');
  assert.equal(rec.msg, '录音没成功，检查一下麦克风再试');
  assert.equal(rec.mic, 'unknown', '超时进现有三元的 unknown 分支，不新增 mic 值');
  assert.equal(D.seq, 7, '入口 +1、超时再 +1，挂起的尝试失效');
  assert.ok(updated > 0, '失败分支调用 updateRow 刷新界面');
  assert.equal(clock.pending().length, 0, '不留野计时器');
});

test('deDcRecord：超时后迟到的 getUserMedia 音轨被停掉，不漏麦克风流', async () => {
  let resolveGum;
  const { clock, stops, fakeStream, deDcRecord } = makeDeDc(() => new Promise((r) => { resolveGum = r; }));
  const D = { seq: 1, done: false };
  const rec = { state: 'idle' };
  const p = deDcRecord(() => D, rec, () => {}, () => {}, () => {});
  await new Promise((r) => setImmediate(r));
  clock.advance(10000);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await p;
  assert.equal(rec.state, 'error');
  resolveGum(fakeStream);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.equal(stops.length, 1, '迟到的流由 seq 守卫停掉音轨');
});

test('deDcRecord：getUserMedia 正常通过，超时计时器被清掉、正常录音路径不变', async () => {
  const { clock, fakeStream, deDcRecord } = makeDeDc(() => Promise.resolve(fakeStream));
  const D = { seq: 1, done: false };
  const rec = { state: 'idle' };
  let updated = 0;
  const p = deDcRecord(() => D, rec, () => { updated++; }, () => {}, () => {});
  await p;
  assert.equal(rec.state, 'recording');
  assert.equal(rec.mic, 'ok');
  assert.equal(D.seq, 2, '入口 +1 一次，正常路径不再加');
  assert.equal(clock.pending().filter((t) => !t.repeat).length, 0, '10 秒超时计时器已清');
  assert.ok(updated > 0);
});

test('oakRecord：同 pattern 源码断言（race＋10 秒＋超时 seq 失效）', () => {
  const fnSrc = extractFn(SRC, 'async function oakRecord(');
  assert.ok(fnSrc.includes('Promise.race'), 'oakRecord 用 Promise.race 包 getUserMedia');
  assert.ok(fnSrc.includes('10000'), 'oakRecord 超时 10 秒');
  assert.ok(fnSrc.includes("new Error('getUserMedia timeout')"), 'oakRecord 超时抛错进现有 catch');
  assert.ok(fnSrc.includes("if (e.message === 'getUserMedia timeout') O.recSeq++;"), 'oakRecord 超时后 recSeq +1');
  assert.ok(fnSrc.includes("O.recError = '录音没成功，检查一下麦克风再试';"), 'oakRecord 复用现有失败文案');
  const deSrc = extractFn(SRC, 'async function deDcRecord(');
  assert.ok(deSrc.includes("if (e.message === 'getUserMedia timeout') D.seq++;"), 'deDcRecord 超时后 D.seq +1');
});
