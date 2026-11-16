/**
 * Pure helpers (no Pixi, no DOM): host log -> module events, and play-time event gates.
 *
 * Log-align rule (documented, tested in tests/unit/adapt.test.mjs):
 *   newLog = lines of nextView.log that are not already in prevView.log.
 *   Fast path: next.length >= prev.length and next[prev.length-1] equals the last prev line
 *   -> next.slice(prev.length).
 *   Otherwise (engine trimmed to the last 40, so lengths are equal or shorter) find the offset j
 *   in next where the longest tail of prev ends; the new lines are next.slice(j+1).
 *   If no prev line is found anywhere in next, the align is lost and ALL of next is mapped.
 */

const OTHER = { A: 'B', B: 'A' };

export function hpClamp(hp, maxHp) {
  const max = Number.isFinite(Number(maxHp)) && Number(maxHp) > 0 ? Number(maxHp) : 0;
  const v = Number.isFinite(Number(hp)) ? Number(hp) : 0;
  return Math.min(Math.max(v, 0), max);
}

function sameLine(a, b) {
  return !!a && !!b && a.type === b.type && a.side === b.side && (a.text || '') === (b.text || '');
}

export function alignLog(prevLog, nextLog) {
  const prev = Array.isArray(prevLog) ? prevLog : [];
  const next = Array.isArray(nextLog) ? nextLog : [];
  if (prev.length === 0) return next.slice();
  const last = prev[prev.length - 1];
  if (next.length >= prev.length && sameLine(next[prev.length - 1], last)) {
    return next.slice(prev.length);
  }
  let bestJ = -1;
  let bestRun = 0;
  for (let j = next.length - 1; j >= 0; j--) {
    if (!sameLine(next[j], last)) continue;
    let run = 1;
    while (run < prev.length && j - run >= 0 && sameLine(next[j - run], prev[prev.length - 1 - run])) run++;
    if (run > bestRun) {
      bestRun = run;
      bestJ = j;
    }
  }
  return bestJ >= 0 ? next.slice(bestJ + 1) : next.slice();
}

function cloneSides(view) {
  const out = {};
  for (const side of ['A', 'B']) {
    const s = (view && view.sides && view.sides[side]) || {};
    out[side] = {
      activeIdx: Number.isInteger(s.activeIdx) ? s.activeIdx : 0,
      pets: (Array.isArray(s.pets) ? s.pets : []).map((p) => ({ ...p })),
    };
  }
  return out;
}

function findPet(sideState, name) {
  const i = sideState.pets.findIndex((p) => p.name === name);
  return i;
}

function petIn(view, side, name) {
  const pets = (view && view.sides && view.sides[side] && view.sides[side].pets) || [];
  return pets.find((p) => p.name === name) || null;
}

/**
 * @param {object} prevView  view before the move
 * @param {object} nextView  view after the move (response.battle when omitted)
 * @param {object} [response]
 * @returns {object[]} module events (see TASK section 7.1)
 */
export function adaptMoveResponse(prevView, nextView, response) {
  const next = nextView || (response && response.battle) || null;
  if (!next) return [];
  const prev = prevView || { sides: {}, log: [] };
  const run = cloneSides(prev);
  const events = [];
  for (const ln of alignLog(prev.log, next.log)) {
    if (!ln || typeof ln !== 'object') continue;
    const side = ln.side;
    switch (ln.type) {
      case 'attack': {
        const tSide = OTHER[side];
        if (!tSide) break;
        const ts = run[tSide];
        let ti = ln.target ? findPet(ts, ln.target) : -1;
        if (ti < 0) ti = ts.activeIdx;
        const tp = ts.pets[ti];
        const nextPet = petIn(next, tSide, tp && tp.name) || tp;
        const startHp = tp ? tp.hp : ln.targetHp;
        const maxHp = (tp && tp.maxHp) || (nextPet && nextPet.maxHp);
        events.push({
          type: 'attack',
          side,
          move: ln.move,
          moveType: ln.moveType,
          damage: ln.dmg,
          superEffective: !!ln.superEffective,
          notVeryEffective: !!ln.resisted,
          immune: !!ln.immune,
          critical: !!ln.critical,
          startHp,
          targetHp: ln.targetHp,
          maxHp,
        });
        if (tp) tp.hp = ln.targetHp;
        break;
      }
      case 'miss':
        events.push({ type: 'miss', side, move: ln.move });
        break;
      case 'faint': {
        const ss = run[side];
        if (!ss) break;
        let i = ln.pet ? findPet(ss, ln.pet) : -1;
        if (i < 0) i = ss.activeIdx;
        if (ss.pets[i]) ss.pets[i].hp = 0;
        events.push({ type: 'faint', side, name: ln.pet });
        break;
      }
      case 'swap': {
        const ss = run[side];
        if (!ss) break;
        const from = ss.pets[ss.activeIdx];
        const i = ln.pet ? findPet(ss, ln.pet) : -1;
        const to = i >= 0 ? ss.pets[i] : null;
        const toFull = petIn(next, side, ln.pet) || petIn(prev, side, ln.pet) || to || {};
        if (i >= 0) ss.activeIdx = i;
        events.push({
          type: 'switch',
          side,
          fromNo: from ? from.no : undefined,
          toNo: toFull.no,
          toName: ln.pet,
          img: toFull.img,
          backImg: toFull.backImg === undefined ? null : toFull.backImg,
        });
        break;
      }
      case 'win': {
        const cs = next.sides && next.sides[side];
        events.push({ type: 'victory', winnerSide: side, childName: cs && cs.childName });
        break;
      }
      default:
        break; // item / effect / status / note / weather ... are log-only in phase 1
    }
  }
  return events;
}

const ALIAS = { swap: 'switch', win: 'victory' };

/** Normalize aliases of one event; returns null for unknown / unusable events. */
export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = ALIAS[raw.type] || raw.type;
  const side = raw.side === 'A' || raw.side === 'B' ? raw.side : undefined;
  switch (type) {
    case 'sendOut':
      if (!side) return null;
      return { ...raw, type, side };
    case 'attack': {
      if (!side) return null;
      const maxHp = Number(raw.maxHp) > 0 ? Number(raw.maxHp) : 0;
      if (!Number.isFinite(Number(raw.startHp)) || !Number.isFinite(Number(raw.targetHp))) return null;
      return {
        ...raw,
        type,
        side,
        move: raw.move ?? raw.moveName,
        damage: raw.damage ?? raw.dmg,
        notVeryEffective: !!(raw.notVeryEffective || raw.resisted),
        maxHp,
        startHp: hpClamp(raw.startHp, maxHp),
        targetHp: hpClamp(raw.targetHp, maxHp),
      };
    }
    case 'miss':
      if (!side) return null;
      return { ...raw, type, side, move: raw.move ?? raw.moveName };
    case 'faint':
      if (!side) return null;
      return { ...raw, type, side, name: raw.name ?? raw.pet };
    case 'switch':
      if (!side) return null;
      return { ...raw, type, side, toName: raw.toName ?? raw.pet ?? raw.name };
    case 'victory':
      return { ...raw, type, winnerSide: raw.winnerSide ?? side };
    default:
      return null;
  }
}

/**
 * Play-time gates (TASK 7.2): normalize, clamp HP, drop events of a pet that is already KO,
 * drop unknown types. Returns { events, dropped }.
 */
export function sanitizeEvents(list) {
  const out = [];
  let dropped = 0;
  const ko = { A: false, B: false };
  for (const raw of Array.isArray(list) ? list : []) {
    const e = normalizeEvent(raw);
    if (!e) {
      dropped++;
      continue;
    }
    if ((e.type === 'attack' || e.type === 'miss') && ko[e.side]) {
      dropped++;
      continue;
    }
    if (e.type === 'attack' && e.targetHp <= 0 && e.targetHp < e.startHp) ko[OTHER[e.side]] = true;
    if (e.type === 'faint') ko[e.side] = true;
    if (e.type === 'switch' || e.type === 'sendOut') ko[e.side] = false;
    out.push(e);
  }
  return { events: out, dropped };
}
