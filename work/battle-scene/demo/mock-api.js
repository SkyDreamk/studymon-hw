// Local mock of POST /api/battle/gym/start and POST /api/battle/move (no network, no damage formula).
// All HP numbers are hard-coded scripted outcomes; the response shape follows the live engine log.
const A = 'assets/';
export const PARTY = [
  { no: 26, name: '雷丘', img: `${A}p26.10a23721.webp`, backImg: `${A}back-26.10a23721.webp`, maxHp: 60 },
  { no: 34, name: '尼多王', img: `${A}p34.10a23721.webp`, backImg: null, maxHp: 70 },
  { no: 208, name: '大钢蛇', img: `${A}p208.10a23721.webp`, backImg: null, maxHp: 100 },
  { no: 126, name: '鸭嘴火兽', img: `${A}p126.10a23721.webp`, backImg: null, maxHp: 65 },
  { no: 151, name: '梦幻', img: `${A}p151.10a23721.webp`, backImg: null, maxHp: 80 },
];
const BOSS = [
  { no: 95, name: '大岩蛇', img: `${A}p95.10a23721.webp`, backImg: null, maxHp: 90 },
  { no: 208, name: '大钢蛇', img: `${A}p208.10a23721.webp`, backImg: null, maxHp: 100 },
];
// scripted moves: damage is a constant, not a formula
export const MOVES = [
  { name: '铁尾', type: 'steel', dmg: 40, mult: 2 },
  { name: '十万伏特', type: 'electric', dmg: 24, mult: 1 },
  { name: '撞击', type: 'normal', dmg: 10, mult: 1 },
  { name: '电光一闪', type: 'electric', dmg: 0, miss: true },
];
const BOSS_ATTACK = { name: '岩崩', type: 'rock', dmg: 12 };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function createMock() {
  let battle = null;
  const childName = '测试大宝';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const view = () => battle.view;
  const push = (line) => {
    battle.view.log.push(line);
    if (battle.view.log.length > 40) battle.view.log = battle.view.log.slice(-40);
  };
  const act = (st, side) => st.sides[side].pets[st.sides[side].activeIdx];

  function bossStrike() {
    const st = view();
    const b = act(st, 'B');
    const a = act(st, 'A');
    if (!(b.hp > 0) || !(a.hp > 0)) return;
    a.hp = Math.max(0, a.hp - BOSS_ATTACK.dmg);
    push({ type: 'attack', side: 'B', pet: b.name, move: BOSS_ATTACK.name, moveType: BOSS_ATTACK.type, dmg: BOSS_ATTACK.dmg, mult: 1, superEffective: false, resisted: false, immune: false, critical: false, target: a.name, targetHp: a.hp, text: `${b.name} 用了「${BOSS_ATTACK.name}」！对 ${a.name} 造成 ${BOSS_ATTACK.dmg} 点伤害。`, mods: [] });
    if (a.hp <= 0) {
      push({ type: 'faint', side: 'A', pet: a.name, text: `${a.name} 倒下了！` });
      const next = st.sides.A.pets.findIndex((p) => p.hp > 0);
      if (next >= 0) {
        st.sides.A.activeIdx = next;
        push({ type: 'swap', side: 'A', pet: st.sides.A.pets[next].name, text: `${st.sides.A.pets[next].name} 上场啦！` });
      } else {
        st.winner = 'B';
        push({ type: 'win', side: 'B', text: '岩石道馆馆主 赢啦！' });
      }
    }
  }

  async function post(path, body) {
    await delay(120);
    if (path === '/api/battle/gym/start') {
      const lead = PARTY.findIndex((p) => p.no === body.leadNo);
      if (lead < 0) return { ok: false, error: 'NO_LEAD' };
      const order = [PARTY[lead], ...PARTY.filter((_, i) => i !== lead)];
      battle = {
        id: 'demo-1',
        view: {
          mode: 'gym',
          stage: body.stage || 3,
          weather: { kind: 'sand' },
          turnNo: 1,
          winner: null,
          sides: {
            A: { childName, line: '测试大宝的队伍', activeIdx: 0, pets: order.map((p) => ({ no: p.no, name: p.name, img: p.img, backImg: p.backImg, hp: p.maxHp, maxHp: p.maxHp })) },
            B: { childName: '岩石道馆馆主', line: '岩石道馆', activeIdx: 0, pets: BOSS.map((p) => ({ no: p.no, name: p.name, img: p.img, backImg: p.backImg, hp: p.maxHp, maxHp: p.maxHp })) },
          },
          log: [{ type: 'weather', kind: 'sand', text: '沙暴天气扬起了满天风沙！' }],
        },
      };
      return { ok: true, battleId: battle.id, battle: clone(view()) };
    }
    if (path === '/api/battle/move') {
      if (!battle || body.battleId !== battle.id) return { ok: false, error: 'NO_BATTLE' };
      const st = view();
      if (st.winner) return { ok: false, error: 'ENDED' };
      st.turnNo += 1;
      if (Number.isInteger(body.swapToIdx)) {
        const i = body.swapToIdx;
        const p = st.sides.A.pets[i];
        if (!p || p.hp <= 0 || i === st.sides.A.activeIdx) return { ok: false, error: 'BAD_SWAP' };
        st.sides.A.activeIdx = i;
        push({ type: 'swap', side: 'A', pet: p.name, text: `${p.name} 上场啦！` });
        bossStrike();
        return { ok: true, battle: clone(st) };
      }
      const mv = MOVES[body.moveIdx];
      if (!mv) return { ok: false, error: 'BAD_MOVE' };
      const a = act(st, 'A');
      const b = act(st, 'B');
      if (mv.miss) {
        push({ type: 'miss', side: 'A', move: mv.name, text: `${a.name} 用了「${mv.name}」，却打中了烟幕和分身——落空啦！` });
      } else {
        b.hp = Math.max(0, b.hp - mv.dmg);
        push({ type: 'attack', side: 'A', pet: a.name, move: mv.name, moveType: mv.type, dmg: mv.dmg, mult: mv.mult, superEffective: mv.mult > 1, resisted: false, immune: false, critical: false, target: b.name, targetHp: b.hp, text: `${a.name} 用了「${mv.name}」！对 ${b.name} 造成 ${mv.dmg} 点伤害。`, mods: [] });
        if (b.hp <= 0) {
          push({ type: 'faint', side: 'B', pet: b.name, text: `${b.name} 倒下了！` });
          const next = st.sides.B.pets.findIndex((p) => p.hp > 0);
          if (next >= 0) {
            st.sides.B.activeIdx = next;
            push({ type: 'swap', side: 'B', pet: st.sides.B.pets[next].name, text: `${st.sides.B.pets[next].name} 上场啦！` });
          } else {
            st.winner = 'A';
            push({ type: 'win', side: 'A', text: `${childName} 赢啦！🎉` });
          }
          return { ok: true, battle: clone(st) };
        }
      }
      bossStrike();
      return { ok: true, battle: clone(st) };
    }
    return { ok: false, error: 'UNKNOWN_PATH' };
  }

  return {
    party: PARTY,
    childName,
    battleId: () => (battle ? battle.id : null),
    stubView: () => ({
      mode: 'gym',
      stage: 3,
      weather: { kind: 'sand' },
      sides: {
        A: { childName, line: '', activeIdx: 0, pets: [] },
        B: { childName: '岩石道馆馆主', line: '岩石道馆', activeIdx: 0, pets: BOSS.map((p) => ({ no: p.no, name: p.name, img: p.img, backImg: p.backImg, hp: p.maxHp, maxHp: p.maxHp })) },
      },
    }),
    post,
  };
}
