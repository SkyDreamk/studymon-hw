import * as BS from '../dist/battle-scene.min.js';
import { createMock, MOVES } from './mock-api.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);

window.__bs = BS;
const calls = [];
const state = { mock: null, handle: null, view: null, hostBusy: false, turn: 0, lastEvents: [], lastDropped: 0, override: {} };
window.__demo = { calls, state, restart: (o) => start(o), BS };

function logCall(name, arg) {
  const rec = { name, arg, t: Math.round(performance.now()) };
  calls.push(rec);
  const li = document.createElement('li');
  li.textContent = `${name} ${JSON.stringify(arg === undefined ? '' : arg)}`;
  $('cbLog').prepend(li);
}

function setStatus(t) {
  $('status').textContent = t;
}

function battleParty(view) {
  return view.sides.A.pets.map((p, i) => ({ no: p.no, name: p.name, img: p.img, backImg: p.backImg, fainted: !(p.hp > 0), petIdx: i }));
}

function describe(e) {
  switch (e.type) {
    case 'attack':
      return e.targetHp > e.startHp ? `回复 ${e.targetHp - e.startHp}` : `${e.side === 'A' ? '我方' : '对手'}使用了${e.move || '招式'}，${e.startHp} → ${e.targetHp}`;
    case 'miss':
      return `${e.side === 'A' ? '我方' : '对手'}的${e.move || '招式'}落空`;
    case 'faint':
      return `${e.name || (e.side === 'A' ? '我方' : '对手')}倒下了`;
    case 'switch':
      return `${e.side === 'A' ? '我方' : '对手'}换上场 ${e.toName || ''}`;
    case 'sendOut':
      return `${e.side === 'A' ? '我方' : '对手'}上场了 ${e.name || ''}`;
    case 'victory':
      return e.winnerSide === 'A' ? '对战结束！我方赢啦！' : '再练一次就会更熟，你可以的';
    default:
      return '';
  }
}

function logTurn(events) {
  state.turn += 1;
  const { events: kept, dropped } = BS.sanitizeEvents(events);
  state.lastDropped = dropped;
  const log = $('turnLog');
  log.replaceChildren();
  const head = document.createElement('li');
  head.className = 'turn-head';
  head.textContent = `第${state.turn}回合`;
  log.appendChild(head);
  for (const e of kept) {
    const li = document.createElement('li');
    li.className = 'turn-event';
    li.textContent = describe(e);
    log.appendChild(li);
  }
}

function renderMoves() {
  const box = $('moves');
  box.replaceChildren();
  const inBattle = state.view && !state.view.winner;
  for (let i = 0; i < MOVES.length; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn move';
    b.dataset.idx = String(i);
    b.textContent = state.hostBusy ? '出招中…' : MOVES[i].name;
    b.disabled = !inBattle || state.hostBusy;
    b.addEventListener('click', () => doMove({ moveIdx: i }));
    box.appendChild(b);
  }
}

function setBusy(b) {
  state.hostBusy = b;
  renderMoves();
}

async function doMove(body) {
  if (state.hostBusy || !state.view) return;
  setBusy(true);
  const prev = state.view;
  const j = await state.mock.post('/api/battle/move', { battleId: state.mock.battleId(), ...body });
  if (!j.ok) {
    setBusy(false);
    setStatus('刚才那一步没对上，已经帮你同步好了');
    return;
  }
  const events = BS.adaptMoveResponse(prev, j.battle, j);
  state.lastEvents = events;
  logTurn(events);
  state.view = j.battle;
  const pp = state.handle.play(events);
  state.handle.update({ view: j.battle, party: battleParty(j.battle), phase: j.battle.winner ? 'ended' : 'battle' });
  await pp;
  setBusy(false);
  setStatus(j.battle.winner ? (j.battle.winner === 'A' ? '对战结束！测试大宝赢啦！' : '再练一次就会更熟，你可以的') : '选一招吧');
}

async function onChooseLead(no) {
  logCall('onChooseLead', no);
  setBusy(true);
  setStatus(`扔出${state.mock.party.find((p) => p.no === no).name}！`);
  const j = await state.mock.post('/api/battle/gym/start', { childId: 1, stage: 3, leadNo: no });
  state.view = j.battle;
  state.turn = 0;
  state.handle.update({ view: j.battle, party: battleParty(j.battle), phase: 'battle' });
  setBusy(false);
  setStatus('选一招吧');
}

async function onSwitch(info) {
  logCall('onSwitch', info);
  await doMove({ swapToIdx: info.swapToIdx });
}

async function start(override = {}) {
  state.override = override;
  if (state.handle) state.handle.unmount();
  state.mock = createMock();
  state.view = null;
  state.hostBusy = false;
  state.turn = 0;
  $('turnLog').replaceChildren();
  setStatus('请选一只先发出场');
  renderMoves();
  state.handle = await BS.mount($('battleStage'), {
    mode: 'gym',
    phase: 'select-lead',
    view: state.mock.stubView(),
    party: state.mock.party,
    testHooks: true,
    debug: q.get('debug') === 'bounds',
    isBusy: () => state.hostBusy,
    onBusy: (b) => logCall('onBusy', b),
    onChooseLead,
    onSwitch,
    onFallback: (i) => logCall('onFallback', i),
    onReady: (i) => logCall('onReady', i),
    onError: (e) => logCall('onError', e),
    ...override,
  });
  window.__demo.handle = state.handle;
  return state.handle;
}

// fixture self-check (visible pass/fail)
async function checkFixture() {
  try {
    const fx = await (await fetch('fixtures/move-response.gym.json')).json();
    const got = BS.adaptMoveResponse(fx.prevView, fx.response.battle, fx.response);
    const ok = JSON.stringify(got) === JSON.stringify(fx.expectedEvents);
    $('fixtureResult').textContent = `夹具 adaptMoveResponse：${ok ? '通过' : '不一致'}`;
    $('fixtureResult').dataset.ok = String(ok);
  } catch {
    $('fixtureResult').textContent = '夹具：读取失败';
    $('fixtureResult').dataset.ok = 'false';
  }
}

$('skipBtn').addEventListener('click', () => state.handle && state.handle.skip());
$('devFallback').addEventListener('click', () => state.handle.fallback('manual'));
$('devLowFps').addEventListener('click', () => {
  const t = state.handle.__test;
  t.forceFrameMs(Array(130).fill(32));
  t.forceFrameMs(Array(130).fill(42));
});
$('devReset').addEventListener('click', () => start());
$('devDebug').addEventListener('change', (e) => state.handle.update({ debug: e.target.checked }));
$('devMute').addEventListener('change', (e) => state.handle.update({ muted: e.target.checked }));
$('devMiss').addEventListener('click', () => state.handle.play([{ type: 'miss', side: 'A', move: '电光一闪' }]));
$('devFaint').addEventListener('click', () => state.handle.play([{ type: 'faint', side: 'B' }]));
$('devSwitch').addEventListener('click', () => {
  const v = state.view;
  if (!v) return;
  const other = v.sides.B.pets.find((_, i) => i !== v.sides.B.activeIdx);
  if (other) state.handle.play([{ type: 'switch', side: 'B', toNo: other.no, toName: other.name, img: other.img }]);
});
$('devVictory').addEventListener('click', () => state.handle.play([{ type: 'victory', winnerSide: 'A', childName: '测试大宝' }]));
$('devRemount').addEventListener('click', async () => {
  const snaps = [];
  for (let i = 0; i < 10; i++) {
    await start(state.override);
    await state.handle.__test.whenIdle();
    snaps.push(state.handle.getDiagnostics());
  }
  const a = snaps[0];
  const z = snaps[9];
  $('diag').textContent = `重挂载 ×10：textures ${z.textures - a.textures}，contexts ${z.contexts - a.contexts}，listeners ${z.listeners - a.listeners}（应全为 0）`;
});

setInterval(() => {
  if (!state.handle) return;
  const d = state.handle.getDiagnostics();
  $('fpsLine').textContent = `模式：${d.mode} ｜ FPS：${d.fps}`;
  if (!$('diag').textContent.startsWith('重挂载')) $('diag').textContent = JSON.stringify(d);
}, 500);

checkFixture();
start().then(() => {
  document.body.dataset.ready = '1';
});
