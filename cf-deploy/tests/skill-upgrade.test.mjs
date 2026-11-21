import { test, describe, beforeEach } from 'node:test';
import { readBackendSource } from './backend-src.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash, assetPath } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const src = readBackendSource();
const M = await import(new URL('../src/index.js', import.meta.url));

const app = () => readFileSync(assetPath('app.js'), 'utf8');

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0021_skill_levels.sql', '0043_pet_instances_ability.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

describe('技能等级纯函数', () => {
  test('威力公式：学会等级 × 技能等级矩阵，1 级保留旧威力', () => {
    const learned = [
      ['电光一闪', 2, 37],
      ['电击', 4, 49],
      ['十万伏特', 8, 73],
      ['打雷', 11, 91],
    ];
    for (const skillLevel of [1, 2, 5]) {
      const child = {
        line: 'pikachu',
        unlocked_moves: '[]',
        move_levels: JSON.stringify(Object.fromEntries(
          learned.map(([name]) => [name, skillLevel]),
        )),
        fairy_moves: '[]',
      };
      const moves = M.allMovesFor(child, 11);
      for (const [name, learnedLevel, oldPower] of learned) {
        const move = moves.find((m) => m.name === name);
        assert.ok(move, name);
        assert.equal(move.skillLevel, skillLevel);
        assert.equal(move.power, 25 + 6 * learnedLevel + 6 * (skillLevel - 1));
        if (skillLevel === 1) assert.equal(move.power, oldPower);
      }
    }
  });

  test('技能工具：等级边界、威力与效果表', () => {
    assert.equal(M.SKILL_MAX_LEVEL, 5);
    assert.deepEqual(M.SKILL_WEAK_MULT, [0.6, 0.55, 0.5, 0.45, 0.4]);
    assert.deepEqual(M.SKILL_CHARGE_MULT, [1.5, 1.6, 1.7, 1.8, 1.9]);
    assert.deepEqual(M.SKILL_SHELL_MULT, [0.5, 0.45, 0.4, 0.35, 0.3]);
    assert.deepEqual(M.SKILL_SMOKE_MISS, [0.5, 0.55, 0.6, 0.65, 0.7]);

    assert.equal(M.skillLevelOf({}, 'x'), 1);
    assert.equal(M.skillLevelOf({ x: 9 }, 'x'), 5);
    assert.equal(M.skillLevelOf({ x: 0 }, 'x'), 1);
    assert.equal(M.skillLevelOf({ x: '2' }, 'x'), 1);
    assert.equal(M.skillPower(8, 2), 79);

    const weak = [0.6, 0.55, 0.5, 0.45, 0.4];
    const charge = [1.5, 1.6, 1.7, 1.8, 1.9];
    const shell = [0.5, 0.45, 0.4, 0.35, 0.3];
    const smoke = [0.5, 0.55, 0.6, 0.65, 0.7];
    for (let level = 1; level <= 5; level++) {
      assert.equal(M.skillEffectFor('weak', level).effectMult, weak[level - 1]);
      assert.equal(M.skillEffectFor('charge', level).effectMult, charge[level - 1]);
      assert.equal(M.skillEffectFor('shell', level).effectMult, shell[level - 1]);
      assert.equal(M.skillEffectFor('smoke', level).effectMiss, smoke[level - 1]);
    }
    assert.equal(M.skillEffectFor('smoke', 2).effectMiss, 0.55);
    assert.equal(M.skillEffectFor('drain', 3), null);
  });

  test('consumeAttackMods 按标记技能等级查表并消费', () => {
    const st = {};
    const a = M.fxOf(st, 'A');
    const b = M.fxOf(st, 'B');

    // 标记保持布尔值，等级另存：用 applyEffectFlag 挂标记（weak 挂给对手，shell 挂给自己）
    M.applyEffectFlag(st, 'A', 'charge', 3);
    assert.equal(a.charge, true);
    assert.equal(M.consumeAttackMods(st, 'A', 100).dmg, 170);
    assert.ok(!a.charge);

    M.applyEffectFlag(st, 'B', 'weak', 2);
    assert.equal(a.weak, true);
    assert.equal(M.consumeAttackMods(st, 'A', 100).dmg, 55);
    assert.ok(!a.weak);

    M.applyEffectFlag(st, 'A', 'shell', 4);
    assert.equal(a.shell, true);
    assert.equal(M.consumeAttackMods(st, 'B', 100).dmg, 35);
    assert.ok(!a.shell);

    assert.equal(M.consumeAttackMods(st, 'A', 100).dmg, 100);
    assert.equal(b.charge, undefined);
  });

  test('newMovesBetween 过滤已解锁招式', () => {
    assert.ok(!M.newMovesBetween('pikachu', 7, 8, ['十万伏特'])
      .some((m) => m[1] === '十万伏特'));
    assert.ok(M.newMovesBetween('pikachu', 7, 8, [])
      .some((m) => m[1] === '十万伏特'));
    assert.ok(!M.newMovesBetween('pikachu', 5, 6, ['影子分身'])
      .some((m) => m[1] === '影子分身'));
  });

  test('effectiveMoves 与 allMovesFor 读取技能等级', () => {
    const effective = M.effectiveMoves('pikachu', 8, [], { '十万伏特': 2 });
    assert.equal(effective.find((m) => m.name === '十万伏特').skillLevel, 2);
    assert.equal(effective.find((m) => m.name === '电光一闪').skillLevel, 1);

    const child = {
      line: 'pikachu',
      unlocked_moves: '[]',
      move_levels: JSON.stringify({ '十万伏特': 2, '影子分身': 2 }),
      fairy_moves: '[]',
    };
    const moves = M.allMovesFor(child, 8);
    assert.equal(moves.find((m) => m.name === '十万伏特').power, 79);
    assert.equal(moves.find((m) => m.name === '影子分身').effectMiss, 0.55);
  });
});

describe('战斗技能等级', () => {
  const pet = (name, type, hp, moves, level = 5) => ({ key: name, name, type, no: null, img: null, level, maxHp: hp, hp, moves });
  const side = (childId, childName, pets) => ({ childId, childName, battleLevel: 5, activeIdx: 0, pets });
  const __evs = (r) => (Array.isArray(r) ? r : (r && Array.isArray(r.events) ? r.events : []));
  const __fx = (st, s) => M.fxOf(st, s) || {};

  test('烟幕 5 级在 rng 0.6 落空，1 级在相同 rng 命中', () => {
    for (const skillLevel of [5, 1]) {
      const petA = pet('皮丘', '电', 200, [
        { name: '电击', type: '电', power: 50 },
      ]);
      const petB = pet('小火龙', '火', 200, [
        { name: '烟幕', type: '火', power: 43, skillLevel },
      ]);
      // 2026-11-16 取消热身：B 先攻直接出烟幕，再轮到 A 攻击（不再需要 A 空过热身）
      const st = M.createBattleState({ mode: 'pvp', firstSide: 'B', sides: { A: side(1, '大宝', [petA]), B: side(2, '小宝', [petB]) } });
      const hpA = () => st.sides.A.pets[st.sides.A.activeIdx].hp;
      const hpB = () => st.sides.B.pets[st.sides.B.activeIdx].hp;

      assert.equal(st.turn, 'B');
      M.applyBattleAction(st, 'B', '烟幕', () => 0.6);
      assert.ok(__fx(st, 'A').smoke, 'A 应被烟幕');
      assert.equal(hpA(), 200, '烟幕不造成伤害');
      assert.equal(st.turn, 'A');

      const before = hpB();
      const r = M.applyBattleAction(st, 'A', '电击', () => 0.6);
      const missed = __evs(r).some((e) => e && e.type === 'miss');
      if (skillLevel === 5) {
        assert.equal(missed, true);
        assert.equal(hpB(), before, '5 级烟幕落空不扣血');
      } else {
        assert.equal(missed, false);
        assert.ok(hpB() < before, '1 级烟幕下电击命中扣血');
      }
      assert.ok(!__fx(st, 'A').smoke, '烟幕应消耗');
    }
  });
});

describe('升级接口', () => {
  beforeEach(() => {
    ({ env, raw } = makeEnv());
    raw.exec(`
      UPDATE children
      SET total_xp=0,
          unlocked_moves='["电光一闪"]',
          quiz_fragments=3,
          quiz_correct_total=10,
          move_levels='{}',
          fairy_moves='[]'
      WHERE id=1;
    `);
  });

  test('成功只扣 3 枚碎片，不改答对总数', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.move.name, '电光一闪');
    assert.equal(r.j.move.level, 2);
    assert.equal(r.j.move.skillLevel, 2);
    assert.equal(r.j.move.power, 43);
    for (const key of ['effectKind', 'effectMult', 'effectMiss']) {
      assert.ok(Object.hasOwn(r.j.move, key), `成功响应包含 ${key}`);
    }
    assert.equal(r.j.quizFragments, 0);

    const row = raw.prepare('SELECT move_levels, quiz_fragments, quiz_correct_total FROM children WHERE id=1').get();
    assert.equal(row.move_levels, '{"电光一闪":2}');
    assert.equal(row.quiz_fragments, 0);
    assert.equal(row.quiz_correct_total, 10);
  });

  test('碎片不足返回 400 且不修改数据', async () => {
    raw.exec('UPDATE children SET quiz_fragments=2 WHERE id=1;');
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪' },
    });
    assert.equal(r.status, 400);
    const row = raw.prepare('SELECT quiz_fragments, move_levels FROM children WHERE id=1').get();
    assert.equal(row.quiz_fragments, 2);
    assert.equal(row.move_levels, '{}');
  });

  test('未学会的打雷返回 400', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '打雷' },
    });
    assert.equal(r.status, 400);
  });

  test('满级返回 400 且不扣碎片', async () => {
    raw.exec(`UPDATE children SET move_levels='{"电光一闪":5}', quiz_fragments=9 WHERE id=1;`);
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪' },
    });
    assert.equal(r.status, 400);
    const row = raw.prepare('SELECT quiz_fragments, move_levels FROM children WHERE id=1').get();
    assert.equal(row.quiz_fragments, 9);
    assert.equal(row.move_levels, '{"电光一闪":5}');
  });

  test('并发相同升级恰好成功一次', async () => {
    const cookie = await parentCookie();
    const results = await Promise.all([
      call('/api/quiz/upgrade-move', {
        method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪' },
      }),
      call('/api/quiz/upgrade-move', {
        method: 'POST', cookie, body: { child_id: 1, moveName: '电光一闪' },
      }),
    ]);
    assert.equal(results.filter((r) => r.j.ok === true).length, 1);
    assert.equal(results.filter((r) => r.j.ok !== true).length, 1);
    const row = raw.prepare('SELECT quiz_fragments, move_levels FROM children WHERE id=1').get();
    assert.equal(row.quiz_fragments, 0);
    assert.equal(JSON.parse(row.move_levels)['电光一闪'], 2);
  });

  test('妖精招不纳入升级接口', async () => {
    raw.exec(`UPDATE children SET fairy_moves='[{"name":"月亮之力","level":5}]' WHERE id=1;`);
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '月亮之力' },
    });
    assert.equal(r.status, 400);
  });
});

describe('技能等级迁移', () => {
  test('0021 新列默认值与已解锁招式数据迁移，不修改碎片', () => {
    const db = new DatabaseSync(':memory:');
    try {
      for (const f of ['0001_init.sql', '0002_quiz.sql', '0021_skill_levels.sql']) {
        db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
      }
      const column = db.prepare('PRAGMA table_info(children)').all()
        .find((c) => c.name === 'move_levels');
      assert.ok(column);
      assert.equal(column.dflt_value, "'{}'");
      assert.equal(db.prepare('SELECT move_levels FROM children WHERE id=1').get().move_levels, '{}');

      db.exec(`
        UPDATE children
        SET unlocked_moves='["十万伏特","影子分身"]', quiz_fragments=1
        WHERE id=1;
        UPDATE children SET unlocked_moves='[]' WHERE id=2;
      `);
      const fragmentsBefore = db.prepare('SELECT id, quiz_fragments FROM children WHERE id IN (1,2) ORDER BY id').all();

      db.exec(readFileSync(new URL('../work/skill-levels-migrate-test.sql', import.meta.url), 'utf8'));

      assert.equal(db.prepare('SELECT move_levels FROM children WHERE id=1').get().move_levels,
        '{"十万伏特":2,"影子分身":2}');
      assert.equal(db.prepare('SELECT move_levels FROM children WHERE id=2').get().move_levels, '{}');
      assert.deepEqual(
        db.prepare('SELECT id, quiz_fragments FROM children WHERE id IN (1,2) ORDER BY id').all(),
        fragmentsBefore,
      );
    } finally {
      db.close();
    }
  });
});

describe('技能升级源码口径', () => {
  test('三处 newMovesBetween 调用都传已解锁名', () => {
    // 第三处是 Fable 优化 #5 的 fallback 重算（输掉竞态时按 bonus 0 重算等级/招式），与前两处同款入参
    const needle = 'newMovesBetween(child.line, oldLevel, newLevel, safeJsonArr(child.unlocked_moves))';
    assert.equal(src.split(needle).length - 1, 3);
  });

  test('前端显示技能升级，不再提供提前解锁入口', () => {
    const text = app();
    for (const needle of ['3枚可给一个招式升1级', 'skillbadge', '/api/quiz/upgrade-move', '已满级']) {
      assert.ok(text.includes(needle), `前端应包含 ${needle}`);
    }
    for (const needle of ['提前解锁', '/api/quiz/unlock-move', '解锁新招式']) {
      assert.ok(!text.includes(needle), `前端不应包含 ${needle}`);
    }
  });

  test('PvP 共用 allMovesFor，不另建招式表', () => {
    assert.ok(src.includes('不另建 PvP 招式表'));
    assert.ok(src.includes('allMovesFor'));
  });
});

describe('技能5级满级压力（fix97，Sol三次拒写后由统筹按已有测试写法补）', () => {
  beforeEach(() => {
    ({ env, raw } = makeEnv());
  });

  test('5级威力矩阵与1级旧威力对照', () => {
    const learned = [
      ['电光一闪', 2, 37],
      ['电击', 4, 49],
      ['十万伏特', 8, 73],
      ['打雷', 11, 91],
    ];
    const child5 = {
      line: 'pikachu', unlocked_moves: '[]',
      move_levels: JSON.stringify(Object.fromEntries(learned.map(([name]) => [name, 5]))),
      fairy_moves: '[]',
    };
    const moves5 = M.allMovesFor(child5, 11);
    for (const [name, lv, oldPower] of learned) {
      const mv = moves5.find((m) => m.name === name);
      assert.ok(mv, name);
      assert.equal(mv.skillLevel, 5);
      assert.equal(mv.power, 25 + 6 * lv + 24);
    }
    const child1 = { ...child5, move_levels: '{}' };
    for (const [name, , oldPower] of learned) {
      assert.equal(M.allMovesFor(child1, 11).find((m) => m.name === name).power, oldPower);
    }
    assert.equal(M.skillLevelOf({}, 'x'), 1);
    assert.equal(M.skillLevelOf({ x: 0 }, 'x'), 1);
    assert.equal(M.skillLevelOf({ x: 6 }, 'x'), 5);
    assert.equal(M.skillLevelOf({ x: 9 }, 'x'), 5);
    assert.equal(M.skillLevelOf({ x: 2.5 }, 'x'), 1);
    assert.equal(M.skillLevelOf({ x: '2' }, 'x'), 1);
  });

  test('5级效果表端点与drain为null', () => {
    assert.equal(M.skillEffectFor('weak', 5).effectMult, 0.4);
    assert.equal(M.skillEffectFor('charge', 5).effectMult, 1.9);
    assert.equal(M.skillEffectFor('shell', 5).effectMult, 0.3);
    assert.equal(M.skillEffectFor('smoke', 5).effectMiss, 0.7);
    assert.equal(M.skillEffectFor('drain', 5), null);
  });

  test('5级十万伏特再升级返回400且数据不变', async () => {
    raw.exec(`UPDATE children SET move_levels='{"十万伏特":5}', quiz_fragments=9, total_xp=1120 WHERE id=1;`);
    const cookie = await parentCookie();
    const r = await call('/api/quiz/upgrade-move', {
      method: 'POST', cookie, body: { child_id: 1, moveName: '十万伏特' },
    });
    assert.equal(r.status, 400);
    const row = raw.prepare('SELECT quiz_fragments, move_levels FROM children WHERE id=1').get();
    assert.equal(row.quiz_fragments, 9);
    assert.equal(row.move_levels, '{"十万伏特":5}');
  });

  test('5级伤害有限且无非法威力', () => {
    const mv = { name: '十万伏特', type: '电', power: 25 + 6 * 8 + 24 };
    const d = M.calcDamage(mv, { level: 10, type: '电', stats: null }, { level: 10, type: '火', stats: null }, () => 0.5);
    assert.ok(d && Number.isFinite(d.dmg), `满级伤害应有限，实际 ${JSON.stringify(d)}`);
    assert.notEqual(d.error, 'INVALID_MOVE_POWER');
  });

  test('调试重置清 move_levels（技能等级已不在调试快照/面板展示，见问题 2 简化）', async () => {
    raw.exec(`UPDATE children SET total_xp=1120, move_levels='{"电光一闪":5}', unlocked_moves='[]' WHERE id=1;`);
    const cookie = await parentCookie();
    const rst = await call('/api/parent/debug-reset', { method: 'POST', cookie, body: { confirm: true } });
    assert.equal(rst.j.ok, true);
    assert.equal(raw.prepare('SELECT move_levels FROM children WHERE id=1').get().move_levels, '{}');
  });

  test('前端调试面板不再展示技能等级行（问题 2 简化）', () => {
    assert.ok(!app().includes('技能等级：'), '调试面板不应再含技能等级展示行');
  });
});
