/* 入口改造集成测试：node --test tests/access.test.mjs
 * 用 node:sqlite 内存库依次应用 0001+0002+0003+0004 迁移，再以 D1 适配层驱动
 * Worker 的真实 fetch 处理函数，验证角色会话与服务端隔离行为。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { assetHash } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  // 与测试环境一致的孩子名（种子在部署时改名，非迁移内容）
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
beforeEach(() => { ({ env, raw } = makeEnv()); });

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

async function setupChildPasswords(pCookie) {
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pCookie,
    body: { childPasswords: [{ id: 1, password: '0000' }, { id: 2, password: '0000' }] },
  });
  assert.equal(r.j.ok, true);
}

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}

describe('入口与会话', () => {
  test('未登录访问 API → 401 NEED_LOGIN', async () => {
    const r = await call('/api/overview');
    assert.equal(r.status, 401);
    assert.equal(r.j.error, 'NEED_LOGIN');
  });

  test('家庭密码接口已下线（/api/login 不再发会话）', async () => {
    // 无会话：被 API 门拦下 401，拿不到会话（家庭密码不能再登录）
    const r = await call('/api/login', { method: 'POST', body: { password: 'YOUR_PASSWORD' } });
    assert.equal(r.status, 401);
    assert.equal(r.cookie, undefined);
    // 有会话：路由里已无此接口 → 404
    const pc = await parentCookie();
    const r2 = await call('/api/login', { method: 'POST', cookie: pc, body: { password: 'YOUR_PASSWORD' } });
    assert.equal(r2.status, 404);
  });

  test('未设密码的孩子登录 → PWD_NOT_SET 提示分支', async () => {
    const r = await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '0000' } });
    assert.equal(r.status, 403);
    assert.equal(r.j.error, 'PWD_NOT_SET');
  });

  test('旧格式会话（kind 为 NULL）一律作废', async () => {
    raw.exec("INSERT INTO sessions(token, created_at) VALUES('legacy-token', 1)");
    const r = await call('/api/overview', { cookie: 'famsess=legacy-token' });
    assert.equal(r.status, 401);
  });

  test('家长 PIN 登录 → parent 会话，全量接口可用', async () => {
    const bad = await call('/api/parent/login', { method: 'POST', body: { pin: '9999' } });
    assert.equal(bad.status, 401);
    assert.equal(bad.j.error, 'PIN_WRONG');
    const pc = await parentCookie();
    const pend = await call('/api/parent/pending', { cookie: pc });
    assert.equal(pend.j.ok, true);
    const ov = await call('/api/overview', { cookie: pc });
    assert.equal(ov.j.session.kind, 'parent');
    assert.equal(ov.j.children.length, 2);
    const cd = await call('/api/child?id=2', { cookie: pc });
    assert.equal(cd.status, 200);
  });

  test('家长 PIN 错 5 次锁定（既有逻辑保持）', async () => {
    for (let i = 0; i < 4; i++) {
      const r = await call('/api/parent/login', { method: 'POST', body: { pin: '9999' } });
      assert.equal(r.status, 401);
    }
    const fifth = await call('/api/parent/login', { method: 'POST', body: { pin: '9999' } });
    assert.equal(fifth.status, 429);
    assert.equal(fifth.j.error, 'PIN_LOCKED');
    const correct = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
    assert.equal(correct.status, 429);
  });
});

describe('孩子密码与隔离', () => {
  test('家长设置孩子密码 → hasPassword 标记 → 孩子可登录', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const s = await call('/api/parent/settings', { cookie: pc });
    assert.equal(s.j.settings.children[0].hasPassword, true);
    assert.equal(s.j.settings.children[1].hasPassword, true);
    const cc = await childCookie(1, '0000');
    const ov = await call('/api/overview', { cookie: cc });
    assert.equal(ov.j.session.kind, 'child');
    assert.equal(ov.j.session.childId, 1);
    assert.equal(ov.j.children.length, 1);
    assert.equal(ov.j.children[0].id, 1);
  });

  test('家长设置伙伴怪兽线带精灵立绘（2026-10-27 美化修正：五条线用站内立绘）', async () => {
    const pc = await parentCookie();
    const s = await call('/api/parent/settings', { cookie: pc });
    assert.equal(s.j.ok, true);
    const expect = { pikachu: 'p172', charmander: 'p4', squirtle: 'p7', bulbasaur: 'p1', eevee: 'p133' };
    assert.equal(s.j.settings.lines.length, 5);
    for (const l of s.j.settings.lines) {
      assert.equal(l.img, '/static/img/' + expect[l.key] + '.' + H + '.webp');
    }
    // 紧凑版标签：去“线”字后缀（“妙蛙种子线”6 字在 61px 格子里一行放不下），一行小字用 short
    const short = { pikachu: '皮卡丘', charmander: '小火龙', squirtle: '杰尼龟', bulbasaur: '妙蛙种子', eevee: '伊布' };
    for (const l of s.j.settings.lines) {
      assert.equal(l.short, short[l.key]);
    }
  });

  test('家长改孩子密码 → 该孩子旧会话立即作废（2026-10-21 iPhone 免密码直进 bug）', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    // 孩子用旧密码登录，拿到有效会话
    const oldSession = await childCookie(1, '0000');
    const ok1 = await call('/api/overview', { cookie: oldSession });
    assert.equal(ok1.status, 200);
    // 家长改掉该孩子的密码
    const upd = await call('/api/parent/settings/update', {
      method: 'POST', cookie: pc, body: { childPasswords: [{ id: 1, password: '4321' }] },
    });
    assert.equal(upd.j.ok, true);
    // 旧会话立刻失效：再调接口应被拦回未登录
    const dead = await call('/api/overview', { cookie: oldSession });
    assert.equal(dead.status, 401);
    assert.equal(dead.j.error, 'NEED_LOGIN');
    // 兄弟（孩子 2）的会话不受影响
    const sib = await childCookie(2, '0000');
    const upd2 = await call('/api/parent/settings/update', {
      method: 'POST', cookie: pc, body: { childPasswords: [{ id: 1, password: '9999' }] },
    });
    assert.equal(upd2.j.ok, true);
    const sibOk = await call('/api/overview', { cookie: sib });
    assert.equal(sibOk.status, 200);
    // 新密码可登录，旧密码不行
    const wrongPw = await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '0000' } });
    assert.equal(wrongPw.j.ok, false);
    const newCc = await childCookie(1, '9999');
    const ov = await call('/api/overview', { cookie: newCc });
    assert.equal(ov.j.session.kind, 'child');
    assert.equal(ov.j.session.childId, 1);
  });

  test('孩子 A 会话请求孩子 B 的数据全部被拒（403 FORBIDDEN）', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const a = await childCookie(1, '0000');
    const checks = [
      await call('/api/child?id=2', { cookie: a }),
      await call('/api/checkin', { method: 'POST', cookie: a, body: { childId: 2, subjects: ['语文'] } }),
      await call('/api/quiz/today?child_id=2', { cookie: a }),
      await call('/api/quiz/answer', { method: 'POST', cookie: a, body: { child_id: 2, question_id: 1, answer_idx: 0 } }),
      await call('/api/quiz/upgrade-move', { method: 'POST', cookie: a, body: { child_id: 2, moveName: '电光一闪' } }),
      await call('/api/eggs', { method: 'POST', cookie: a, body: { childId: 2 } }),
      await call('/api/pokedex', { method: 'POST', cookie: a, body: { childId: 2 } }),
      await call('/api/gym/status', { method: 'POST', cookie: a, body: { childId: 2 } }),
      await call('/api/encounter/pending', { method: 'POST', cookie: a, body: { childId: 2 } }),
    ];
    for (const r of checks) {
      assert.equal(r.status, 403);
      assert.equal(r.j.error, 'FORBIDDEN');
    }
    // 自己的数据正常
    const own = await call('/api/child?id=1', { cookie: a });
    assert.equal(own.status, 200);
    // 孩子会话碰家长接口 → 403 NEED_PIN
    const pr = await call('/api/parent/pending', { cookie: a });
    assert.equal(pr.status, 403);
    assert.equal(pr.j.error, 'NEED_PIN');
  });

  test('按 id 猜别人的遭遇/对战也被拒', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    raw.exec("INSERT INTO encounters(child_id, date, pokemon_no, name) VALUES(2, '2026-01-01', 39, '胖丁')");
    raw.exec("INSERT INTO gym_battles(child_id, week_start, created_at) VALUES(2, '2025-12-29', 1)");
    const a = await childCookie(1, '0000');
    const t = await call('/api/encounter/throw', { method: 'POST', cookie: a, body: { encounterId: 1 } });
    assert.equal(t.status, 403);
    // 旧 /api/gym/round 已下线（对战修复批 #2），不再有“按 id 猜战斗”的入口：路由不存在 → 404
    const g = await call('/api/gym/round', { method: 'POST', cookie: a, body: { battleId: 1, moveName: '撞击' } });
    assert.equal(g.status, 404);
  });

  test('孩子密码错 5 次锁定 5 分钟，锁内输对也进不去；计数按孩子独立', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    for (let i = 0; i < 4; i++) {
      const r = await call('/api/child/login', { method: 'POST', body: { childId: 2, password: '9999' } });
      assert.equal(r.status, 401);
      assert.equal(r.j.error, 'PWD_WRONG');
      assert.equal(r.j.attemptsLeft, 4 - i);
    }
    const fifth = await call('/api/child/login', { method: 'POST', body: { childId: 2, password: '9999' } });
    assert.equal(fifth.status, 429);
    assert.equal(fifth.j.error, 'CHILD_LOCKED');
    assert.ok(fifth.j.retryAfter > 0 && fifth.j.retryAfter <= 300);
    const correct = await call('/api/child/login', { method: 'POST', body: { childId: 2, password: '0000' } });
    assert.equal(correct.status, 429);
    // 孩子 1 不受孩子 2 锁定影响
    await childCookie(1, '0000');
  });

  test('孩子会话输 PIN 可升级为家长会话（同一 cookie）', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const a = await childCookie(1, '0000');
    const before = await call('/api/parent/pending', { cookie: a });
    assert.equal(before.status, 403);
    const up = await call('/api/parent/verify-pin', { method: 'POST', cookie: a, body: { pin: '0000' } });
    assert.equal(up.j.ok, true);
    const after = await call('/api/parent/pending', { cookie: a });
    assert.equal(after.j.ok, true);
    const ov = await call('/api/overview', { cookie: a });
    assert.equal(ov.j.session.kind, 'parent');
    assert.equal(ov.j.children.length, 2);
  });

  test('家长清除孩子密码 → 回到未设置状态', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const clr = await call('/api/parent/settings/update', {
      method: 'POST', cookie: pc, body: { childPasswords: [{ id: 1, password: '' }] },
    });
    assert.equal(clr.j.ok, true);
    const r = await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '0000' } });
    assert.equal(r.status, 403);
    assert.equal(r.j.error, 'PWD_NOT_SET');
    const badFmt = await call('/api/parent/settings/update', {
      method: 'POST', cookie: pc, body: { childPasswords: [{ id: 1, password: '00005' }] },
    });
    assert.equal(badFmt.status, 400);
  });
});

describe('连击里程碑通知（小修①）', () => {
  test('审核触发 7 天宝箱 → 孩子端收到通知 → 确认后清除；别人不能代确认', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const yesterday = M.addDays(M.shDateStr(), -1);
    raw.exec(`UPDATE children SET streak=6, last_checkin_date='${yesterday}' WHERE id=1`);
    const a = await childCookie(1, '0000');
    const sub = await call('/api/checkin', { method: 'POST', cookie: a, body: { childId: 1, subjects: ['语文'] } });
    assert.equal(sub.j.ok, true);
    const rev = await call('/api/parent/review', {
      method: 'POST', cookie: pc,
      body: { checkinId: sub.j.checkinId, decision: 'approve' },
    });
    assert.equal(rev.j.ok, true);
    assert.equal(rev.j.streak, 7);
    assert.ok(rev.j.streakBox);

    const detail = await call('/api/child?id=1', { cookie: a });
    assert.equal(detail.j.child.notices.length, 1);
    assert.equal(detail.j.child.notices[0].kind, 'streak_box');
    assert.equal(detail.j.child.notices[0].payload.streak, 7);
    const noticeId = detail.j.child.notices[0].id;

    // 孩子 2 的会话不能确认孩子 1 的通知
    const b = await childCookie(2, '0000');
    await call('/api/notices/ack', { method: 'POST', cookie: b, body: { ids: [noticeId] } });
    const still = await call('/api/child?id=1', { cookie: a });
    assert.equal(still.j.child.notices.length, 1);

    // 本人确认后消失
    const ack = await call('/api/notices/ack', { method: 'POST', cookie: a, body: { ids: [noticeId] } });
    assert.equal(ack.j.ok, true);
    const gone = await call('/api/child?id=1', { cookie: a });
    assert.equal(gone.j.child.notices.length, 0);
  });
});

describe('测试模式与重置（小修②相关链路）', () => {
  test('debug-reset 接口在 PIN 会话下可用，并清掉孩子密码回未设置', async () => {
    const pc = await parentCookie();
    await setupChildPasswords(pc);
    const s = await call('/api/parent/settings', { cookie: pc });
    assert.equal(s.j.settings.testMode, true);
    const r = await call('/api/parent/debug-reset', { method: 'POST', cookie: pc, body: { confirm: true } });
    assert.equal(r.j.ok, true);
    const login = await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '0000' } });
    assert.equal(login.status, 403);
    assert.equal(login.j.error, 'PWD_NOT_SET');
    // PIN 重置后仍可用（保留 PIN）
    await parentCookie();
  });

  test('debug-reset 需要确认体，缺 confirm 被拒', async () => {
    const pc = await parentCookie();
    const r = await call('/api/parent/debug-reset', { method: 'POST', cookie: pc, body: {} });
    assert.equal(r.status, 400);
  });
});

describe('选人页隐私（未登录不下发姓名）', () => {
  test('未登录 GET / 的选人页只有虚拟形象、年级与宠物等级，无真实姓名', async () => {
    const res = await M.default.fetch(new Request('https://test.local/'), env);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes(`avatar-pikachu.${H}.webp`), '应有皮丘线虚拟形象');
    assert.ok(html.includes(`avatar-charmander.${H}.webp`), '应有小火龙线虚拟形象');
    assert.ok(html.includes('宠物 Lv.'), '应显示宠物等级');
    assert.ok(html.includes('三年级') && html.includes('一年级'), '应显示年级');
    assert.ok(!html.includes('测试大宝'), '选人页不得出现大宝姓名');
    assert.ok(!html.includes('测试小宝'), '选人页不得出现小宝姓名');
  });
});
