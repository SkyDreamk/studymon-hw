// tests/gym-resume.test.mjs
// 任务 128：刷新/重登后从道馆页接回进行中的道馆对战（静态 grep 风格）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readBackendSource } from './backend-src.mjs';
const SRC = readBackendSource();
const APP = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const fnBody = (s, head, len = 4000) => { const i = s.indexOf(head); assert.ok(i >= 0, head); return s.slice(i, i + len); };

test('apiGymStatus 返回 activeBattle（最新一场进行中的道馆对战或 null）', () => {
  const b = fnBody(SRC, 'async function apiGymStatus', 4500);
  assert.match(b, /FROM battles WHERE mode='gym' AND child_a=\? AND status='active' ORDER BY id DESC LIMIT 1/);
  assert.match(b, /activeBattle = activeRow \? \{ battleId: activeRow\.id, stage: activeRow\.stage \} : null/);
  assert.match(b, /finalEggAwarded, activeBattle,/);
});

test('renderGymPage 有 activeBattle 时在徽章墙之前渲染续战入口', () => {
  const b = fnBody(APP, 'function renderGymPage', 20000);
  const iResume = b.indexOf('j.activeBattle ?');
  const iWall = b.indexOf('badge-wall.webp');
  assert.ok(iResume > 0 && iWall > iResume, '续战入口应在徽章墙/关卡列表之前');
  assert.match(b, /onclick="resumeGymBattle\(\$\{Number\(j\.activeBattle\.battleId\)\}, \$\{G\.id\}\)"/);
  assert.match(b, /继续第 \$\{Number\(j\.activeBattle\.stage\)\} 关对战/);
  assert.match(b, /Continue Gym stage/);
});

test('resumeGymBattle：先 /api/battle/state 再 enterBattleView，失效/已结束回道馆', () => {
  const b = fnBody(APP, 'async function resumeGymBattle', 900);
  const iApi = b.indexOf("api('/api/battle/state', { battleId })");
  const iEnter = b.indexOf('enterBattleView(j.battle, childId)');
  assert.ok(iApi > 0 && iEnter > iApi);
  assert.match(b, /!j\.ok[\s\S]*goGym\(childId\)/);
  assert.match(b, /status !== 'active'[\s\S]*goGym\(childId\)/);
  assert.match(APP, /window\.resumeGymBattle = resumeGymBattle/);
});
