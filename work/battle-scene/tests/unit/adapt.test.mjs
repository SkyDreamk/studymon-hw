import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptMoveResponse, sanitizeEvents, normalizeEvent, alignLog, hpClamp } from '../../src/adapt-move-response.js';

const fx = JSON.parse(readFileSync(new URL('../../demo/fixtures/move-response.gym.json', import.meta.url), 'utf8'));
const norm = (list) => list.map((e) => normalizeEvent(e));

test('adaptMoveResponse matches fixture expectedEvents (with alias normalization)', () => {
  const got = adaptMoveResponse(fx.prevView, fx.response.battle, fx.response);
  assert.deepEqual(norm(got), norm(fx.expectedEvents));
  assert.deepEqual(got, fx.expectedEvents); // exact too
});

test('response.battle used when nextView omitted; pure (inputs not mutated)', () => {
  const before = JSON.stringify(fx.prevView);
  const got = adaptMoveResponse(fx.prevView, null, fx.response);
  assert.equal(got.length, 3);
  assert.equal(JSON.stringify(fx.prevView), before);
});

test('log align: engine trimmed to last 40 (equal lengths) still finds only the new lines', () => {
  const mk = (i) => ({ type: 'note', side: 'A', text: `line ${i}` });
  const prevLog = Array.from({ length: 40 }, (_, i) => mk(i));
  const newLine = { type: 'miss', side: 'A', move: '撞击', text: 'miss' };
  const nextLog = [...prevLog.slice(1), newLine];
  assert.deepEqual(alignLog(prevLog, nextLog), [newLine]);
});

test('log align: shorter next log and lost align', () => {
  const a = { type: 'note', side: 'A', text: 'a' };
  const b = { type: 'note', side: 'A', text: 'b' };
  const n = { type: 'miss', side: 'B', move: 'x', text: 'n' };
  assert.deepEqual(alignLog([a, b], [b, n]), [n]);
  assert.deepEqual(alignLog([a, b], [n]), [n]); // not found anywhere: map all
  assert.deepEqual(alignLog([], [n]), [n]);
});

test('miss / win / own-side swap map to module events; running HP carried across lines', () => {
  const prev = { sides: { A: { activeIdx: 0, childName: '大宝', pets: [{ no: 26, name: '雷丘', hp: 20, maxHp: 60 }, { no: 34, name: '尼多王', hp: 70, maxHp: 70, img: 'i' }] }, B: { activeIdx: 0, childName: '馆主', pets: [{ no: 95, name: '大岩蛇', hp: 50, maxHp: 90 }] } }, log: [] };
  const next = {
    sides: prev.sides,
    log: [
      { type: 'swap', side: 'A', pet: '尼多王', text: 's' },
      { type: 'attack', side: 'B', pet: '大岩蛇', move: '岩崩', moveType: 'rock', dmg: 10, target: '尼多王', targetHp: 60, text: 't' },
      { type: 'miss', side: 'A', move: '撞击', text: 'm' },
      { type: 'attack', side: 'B', pet: '大岩蛇', move: '岩崩', dmg: 20, target: '尼多王', targetHp: 40, text: 't2' },
      { type: 'win', side: 'B', text: 'w' },
    ],
  };
  const ev = adaptMoveResponse(prev, next);
  assert.equal(ev[0].type, 'switch');
  assert.equal(ev[0].fromNo, 26);
  assert.equal(ev[0].toNo, 34);
  assert.equal(ev[1].startHp, 70); // swapped-in pet's own HP, not the old active
  assert.equal(ev[3].startHp, 60); // running HP carried from the previous attack line
  assert.equal(ev[2].type, 'miss');
  assert.deepEqual(ev[4], { type: 'victory', winnerSide: 'B', childName: '馆主' });
});

test('sanitizeEvents: clamp HP, drop events of a KO pet, keep follow-up swap, count unknown', () => {
  const base = { type: 'attack', startHp: 30, targetHp: -4, maxHp: 40 };
  const { events, dropped } = sanitizeEvents([
    { ...base, side: 'A' }, // B ends at 0 => B KO
    { type: 'attack', side: 'B', startHp: 10, targetHp: 5, maxHp: 10 }, // dropped (fainted pet)
    { type: 'miss', side: 'B' }, // dropped
    { type: 'faint', side: 'B', pet: 'x' },
    { type: 'swap', side: 'B', pet: 'y' }, // kept, clears KO
    { type: 'attack', side: 'B', startHp: 1, targetHp: 120, maxHp: 40 },
    { type: 'dance', side: 'A' }, // unknown
  ]);
  assert.equal(dropped, 3);
  assert.equal(events[0].targetHp, 0);
  assert.equal(events[0].startHp, 30);
  assert.equal(events.at(-1).targetHp, 40);
  assert.equal(events.map((e) => e.type).join(), 'attack,faint,switch,attack');
});

test('hpClamp: missing maxHp never divides by zero', () => {
  assert.equal(hpClamp(5, 0), 0);
  assert.equal(hpClamp(-3, 10), 0);
  assert.equal(hpClamp(99, 10), 10);
});
