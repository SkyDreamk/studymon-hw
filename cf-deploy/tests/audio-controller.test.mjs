/* 精致化③ 音频集中管理（2026-11-19）
 * node --test tests/audio-controller.test.mjs
 * 读 app.js.orig 真实源码（moveSoundMuted / 三单例 / AudioController / dePlay / playMoveSound / playOakAudio /
 * oakPlayback / oakStopPlayback），假 Audio / speechSynthesis / localStorage 跑真实函数。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const APP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'static', 'app.js.orig'), 'utf8');
function slice(from, to) {
  const a = APP.indexOf(from); const b = APP.indexOf(to, a + from.length);
  assert.ok(a > 0 && b > a, '找不到源码 ' + from);
  return APP.slice(a, b);
}

function load() {
  const store = {};
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const plays = []; const pauses = []; const speaks = []; let cancels = 0; let renders = 0;
  // 假 Audio：play() 记录并立即触发 'ended'；pause() 记录并触发 'pause'（与真实 oakAudioFinished 的监听配合）
  class Audio {
    constructor(src) { this.l = {}; this.src = src || ''; }
    addEventListener(t, f) { this.l[t] = f; }
    removeEventListener(t) { delete this.l[t]; }
    play() { plays.push(this.src); const e = this.l.ended; if (e) setTimeout(e, 0); return Promise.resolve(); }
    pause() { pauses.push(this.src); }
  }
  const speechSynthesis = { speak: (u) => { speaks.push(u); setTimeout(() => u.onend && u.onend(), 0); }, cancel: () => { cancels++; } };
  class SpeechSynthesisUtterance { constructor(t) { this.text = t; } }
  const win = { _oak: null };
  const src = [
    slice('let _deAudio = null;', 'window.dePlay'),
    slice('let _moveManifest = null;', 'async function loadMoveManifest'),
    'async function loadMoveManifest() { return { 火花: "spark.mp3" }; }',
    slice('let _moveAudio = null;', 'function unlockMoveAudio'),
    slice('let _oakAudio = null;', "document.addEventListener('pointerdown', unlockOakAudio)"),
    slice('const AudioController = {', 'async function playOakAudio'),
    slice('async function playOakAudio', '\nasync function playMoveSound'),
    slice('async function playMoveSound', '/* 手感打磨'),
    slice('function oakStopPlayback', 'function oakReset'),
    slice('function oakAudioFinished', 'window.oakPlayback'),
    'function oakRenderControls() {}',
  ].join('\n');
  const fns = new Function('localStorage', 'Audio', 'speechSynthesis', 'SpeechSynthesisUtterance', 'window', 'renderBattleView',
    src + `\nreturn { dePlay, playMoveSound, playOakAudio, oakPlayback, oakStopPlayback, AudioController,
      toggleMoveSound: window.toggleMoveSound, toggleGlobalMute: window.toggleGlobalMute,
      set: (k, v) => { if (k === 'de') _deAudio = v; if (k === 'oak') _oakAudio = v; if (k === 'move') _moveAudio = v; } };`)(
    localStorage, Audio, speechSynthesis, SpeechSynthesisUtterance, win, () => { renders++; });
  const oak = (hasAudio) => {
    const O = { playSeq: 0, idx: 0, rec: { url: 'rec.webm' }, recState: 'idle', data: { sentences: [hasAudio ? { en: 'Hi', audio: 'oak.mp3' } : { en: 'Hi' }] } };
    win._oak = O; return O;
  };
  return { store, plays, pauses, speaks, fns, win, oak, Audio, cancels: () => cancels, renders: () => renders };
}
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('全局静音门', () => {
  test('默认有声：dePlay / 招式音 / Oak 句子音频 / Oak TTS 都放', async () => {
    const t = load();
    t.fns.dePlay('de.mp3');
    await t.fns.playMoveSound('火花');
    t.oak(true); await t.fns.playOakAudio();
    t.oak(false); await t.fns.playOakAudio();
    assert.deepEqual(t.plays, ['de.mp3', '/static/audio/moves/spark.mp3', 'oak.mp3']);
    assert.equal(t.speaks.length, 1);
  });
  test('全局静音：三路音频＋TTS 全不出声', async () => {
    const t = load(); t.store.sm_global_muted = '1';
    t.fns.dePlay('de.mp3');
    await t.fns.playMoveSound('火花');
    t.oak(true); await t.fns.playOakAudio();
    t.oak(false); await t.fns.playOakAudio();
    assert.deepEqual(t.plays, []); assert.equal(t.speaks.length, 0);
  });
  test('全局静音：Oak 对比播放（compare）不放示范音/TTS，只放自己的录音', async () => {
    const t = load(); t.store.sm_global_muted = '1';
    t.oak(true); await t.fns.oakPlayback(true);
    assert.deepEqual(t.plays, ['rec.webm']); assert.equal(t.speaks.length, 0);
  });
  test('有声时 Oak 对比播放：示范音 + 录音', async () => {
    const t = load();
    t.oak(true); await t.fns.oakPlayback(true);
    assert.deepEqual(t.plays, ['oak.mp3', 'rec.webm']);
  });
  test('speak 在全局静音下不调用 speechSynthesis.speak，并触发 onend 免悬住', () => {
    const t = load(); t.store.sm_global_muted = '1';
    let ended = 0; t.fns.AudioController.speak({ onend: () => ended++ });
    assert.equal(t.speaks.length, 0); assert.equal(ended, 1);
  });
});

describe('sm_move_muted 只关招式音', () => {
  test('喊招开关静音：招式音不放，Oak 音频／TTS／dePlay 照放', async () => {
    const t = load(); t.store.sm_move_muted = '1';
    await t.fns.playMoveSound('火花');
    t.fns.dePlay('de.mp3');
    t.oak(true); await t.fns.playOakAudio();
    t.oak(false); await t.fns.playOakAudio();
    t.oak(true); await t.fns.oakPlayback(true);
    assert.deepEqual(t.plays, ['de.mp3', 'oak.mp3', 'oak.mp3', 'rec.webm']);
    assert.equal(t.speaks.length, 1);
  });
  test('两个开关都开着：招式音不放；仅全局静音：招式音也不放', async () => {
    const t = load(); t.store.sm_move_muted = '1'; t.store.sm_global_muted = '1';
    await t.fns.playMoveSound('火花');
    t.store.sm_move_muted = '0';
    await t.fns.playMoveSound('火花');
    assert.deepEqual(t.plays, []);
  });
  test('moveSoundMuted 不读 sm_global_muted', () => {
    const t = load(); t.store.sm_global_muted = '1';
    assert.equal(t.fns.AudioController.canPlayMove(), false);
    t.store.sm_global_muted = '0';
    assert.equal(t.fns.AudioController.canPlayMove(), true);
  });
});

describe('stopAll / stopOak / 开关', () => {
  test('stopAll：pause 三路已存在的 audio ＋ cancel TTS；未创建的单例跳过不报错', () => {
    const t = load();
    t.fns.AudioController.stopAll(); assert.equal(t.pauses.length, 0); assert.equal(t.cancels(), 1);
    t.fns.set('de', Object.assign(new t.Audio(), { src: 'd' }));
    t.fns.set('oak', Object.assign(new t.Audio(), { src: 'o' }));
    t.fns.set('move', Object.assign(new t.Audio(), { src: 'm' }));
    t.fns.AudioController.stopAll();
    assert.deepEqual(t.pauses, ['d', 'o', 'm']); assert.equal(t.cancels(), 2);
  });
  test('stopOak：只停 Oak 音频＋TTS，不碰另两路', () => {
    const t = load();
    t.fns.set('de', Object.assign(new t.Audio(), { src: 'd' }));
    t.fns.set('oak', Object.assign(new t.Audio(), { src: 'o' }));
    t.fns.set('move', Object.assign(new t.Audio(), { src: 'm' }));
    t.fns.AudioController.stopOak();
    assert.deepEqual(t.pauses, ['o']); assert.equal(t.cancels(), 1);
  });
  test('oakStopPlayback 经控制器停 Oak 音频＋cancel', () => {
    const t = load(); const O = t.oak(true);
    t.fns.set('oak', Object.assign(new t.Audio(), { src: 'o' }));
    t.fns.oakStopPlayback(O);
    assert.deepEqual(t.pauses, ['o']); assert.equal(t.cancels(), 1);
  });
  test('toggleGlobalMute：写 sm_global_muted，开启时立即 stopAll，关闭时不停；每次重绘', () => {
    const t = load();
    t.fns.set('de', Object.assign(new t.Audio(), { src: 'd' }));
    t.fns.toggleGlobalMute();
    assert.equal(t.store.sm_global_muted, '1'); assert.deepEqual(t.pauses, ['d']); assert.equal(t.cancels(), 1); assert.equal(t.renders(), 1);
    t.fns.toggleGlobalMute();
    assert.equal(t.store.sm_global_muted, '0'); assert.deepEqual(t.pauses, ['d']); assert.equal(t.cancels(), 1); assert.equal(t.renders(), 2);
  });
  test('toggleMoveSound 只写 sm_move_muted，不动全局键、不 stopAll', () => {
    const t = load();
    t.fns.toggleMoveSound();
    assert.equal(t.store.sm_move_muted, '1'); assert.equal('sm_global_muted' in t.store, false); assert.equal(t.cancels(), 0);
  });
  test('源码里 speechSynthesis.cancel 只剩控制器一处，speak 只剩一处', () => {
    assert.equal((APP.match(/speechSynthesis\.cancel\(/g) || []).length, 1);
    assert.equal((APP.match(/speechSynthesis\.speak\(/g) || []).length, 1);
  });
});
