// tests/gym-clear-refresh.test.mjs
// 问题 1：道馆通关只认小火龙——根因是打赢后回道馆页读了旧缓存（静态 grep 风格）。
// 后端通关逻辑不认先发（awardGymClear/settleGymCore/finalizeBattle 均不校验先发），
// 真正原因是 goGym 先读本地快照、再读 45 秒内存缓存，打赢后 45 秒内回道馆页
// 仍渲染旧状态（已通的关显示“开始挑战”、下一关锁着），用户以为“下一关没开”。
// 修法：打赢后清内存道馆缓存，goGym(opts.forceGym) 跳过快照与缓存强制重拉。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const APP = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const fnBody = (s, head, len = 4000) => { const i = s.indexOf(head); assert.ok(i >= 0, head); return s.slice(i, i + len); };

test('invalidateGymCache：清掉内存里的 gymCache 与 gymCacheAt', () => {
  const b = fnBody(APP, 'function invalidateGymCache', 400);
  assert.match(b, /delete cacheMap\('gymCache'\)\[id\]/);
  assert.match(b, /delete cacheMap\('gymCacheAt'\)\[id\]/);
});

test('goGym(opts.forceGym)：强制重拉时跳过本地快照与 45 秒内存缓存', () => {
  const b = fnBody(APP, 'async function goGym', 3000);
  assert.match(b, /const forceGym = !!\(opts && opts\.forceGym\)/);
  assert.match(b, /const snap = \(!forceGym && lcAvailable\(\)\) \? await lcSnapshot\(id\) : null/);
  assert.match(b, /const gymFresh = !forceGym && gymC && cacheFresh\(cacheMap\('gymCacheAt'\)\[id\]\)/);
});

test('在线道馆胜场（applyBattleResponse）：清缓存＋关弹窗后 goGym({ forceGym: true })', () => {
  const b = fnBody(APP, 'async function applyBattleResponse', 2500);
  assert.match(b, /postView\.mode === 'gym' && postView\.winnerSide === 'A'/);
  assert.match(b, /invalidateGymCache\(B\.childId\)/);
  assert.match(b, /goGym\(B\.childId, \{ forceGym: true \}\)/);
  // 败场不强制重拉（通关状态没变，缓存仍有效）
  assert.match(b, /else \{\s*modalCloseHook = \(\) => \{ window\._battle = null; goGym\(B\.childId\); \};/);
});

test('本地道馆胜场（lcFinishLocalBattle）：清缓存＋先同步再强制重拉', () => {
  const b = fnBody(APP, 'async function lcFinishLocalBattle', 2500);
  assert.match(b, /if \(B\.view\.winnerSide === 'A'\) \{\s*invalidateGymCache\(B\.childId\)/);
  assert.match(b, /await lcSyncChild\(B\.childId, \{ rerender: false \}\)/);
  assert.match(b, /goGym\(B\.childId, \{ forceGym: true \}\)/);
});

test('goGym 默认调用不变：其余调用点仍走快照/缓存（只胜场强制重拉）', () => {
  // resumeGymBattle 失效回道馆、pvp 结算等仍用普通 goGym，不强制重拉
  assert.match(APP, /goGym\(childId\)/);
  assert.doesNotMatch(APP, /goGym\(childId, \{ forceGym: true \}\)/);
});
