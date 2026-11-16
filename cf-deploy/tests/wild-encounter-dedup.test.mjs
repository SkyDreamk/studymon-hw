/* 问答触发遭遇去重（2026-10-30 用户定）：优先未抓过，全抓齐才回落全池。
 * node --test tests/wild-encounter-dedup.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import(new URL('../src/index.js', import.meta.url));
const seq = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

test('无排除集时旧针脚不变', () => {
  assert.equal(M.pickWildSpecies(seq(0, 0)).no, 16);
  assert.equal(M.pickWildSpecies(seq(0.65, 0)).no, 54);
  assert.equal(M.pickWildSpecies(seq(0.95, 0.999)).no, 51); // 51 补进后 rare 末只为三地鼠
});

test('排除全部常见档后，roll 0 落到少见档首只', () => {
  // 常见 16/43/39/50 全排除，候选档位权重只剩 30+10=40，roll 0 应选中少见档
  const excluded = new Set([16, 43, 39, 50]);
  assert.equal(M.pickWildSpecies(seq(0, 0), excluded).no, 54);
});

test('排除除一只外的全部物种时，必抽剩下的那只', () => {
  const allButOne = M.WILD.map((w) => w.no).filter((no) => no !== 123);
  for (const roll of [0, 0.5, 0.999]) {
    assert.equal(M.pickWildSpecies(seq(roll, 0), new Set(allButOne)).no, 123);
  }
});

test('全收集排除时回落全池，不抛错', () => {
  const all = new Set(M.WILD.map((w) => w.no));
  assert.equal(M.pickWildSpecies(seq(0, 0), all).no, 16);
  assert.doesNotThrow(() => M.pickWildSpecies(seq(-1, 0), all));
});
