/* 迁移 0004 守恒测试：node --test tests/migration.test.mjs
 * 用旧结构 fixture（多科行 / 全部完成行 / 驳回+重交同日行 / 待审行）建库，
 * 应用 0004 后断言：经验总和、已通过天数集合、children 状态迁移前后一致，
 * 展开行数与去重结果正确，新表/新设置/唯一索引就位。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

function buildOldDb() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  // 孩子状态（经验/连击是迁移不得触碰的权威值）
  raw.exec("UPDATE children SET total_xp=144, streak=3, last_checkin_date='2026-10-19' WHERE id=1");
  raw.exec("UPDATE children SET total_xp=0, streak=0 WHERE id=2");
  const ins = (child, date, subjects, at, early, status, xp, reason) => {
    raw.prepare('INSERT INTO checkins(child_id,date,subjects,submitted_at,submitted_epoch,is_early,status,xp_awarded,reason,reviewed_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(child, date, JSON.stringify(subjects), at, 1760000000, early, status, xp, reason, '20:00');
  };
  // 大宝 10-17：两科一次提交，通过 +48
  ins(1, '2026-10-17', ['语文', '数学'], '19:00', 1, 'approved', 48, null);
  // 大宝 10-18：全部完成，通过 +48
  ins(1, '2026-10-18', ['全部完成'], '19:10', 1, 'approved', 48, null);
  // 大宝 10-19：英语先被驳回，改后重交（英语+阅读）通过 +48
  ins(1, '2026-10-19', ['英语'], '18:00', 1, 'rejected', null, '英语作业没写完');
  ins(1, '2026-10-19', ['英语', '阅读'], '19:20', 1, 'approved', 48, null);
  // 小宝 10-19：其他，待审核
  ins(2, '2026-10-19', ['其他'], '20:05', 1, 'pending', null, null);
  return raw;
}

function snapshot(raw) {
  const perChild = {};
  for (const cid of [1, 2]) {
    const xpSum = raw.prepare("SELECT IFNULL(SUM(xp_awarded),0) s FROM checkins WHERE child_id=? AND status='approved'").get(cid).s;
    const days = raw.prepare("SELECT date FROM checkins WHERE child_id=? AND status='approved' GROUP BY date ORDER BY date").all(cid).map((r) => r.date);
    const c = raw.prepare('SELECT total_xp, streak, last_checkin_date FROM children WHERE id=?').get(cid);
    perChild[cid] = { xpSum, days, child: c };
  }
  return perChild;
}

describe('迁移 0004（旧 checkins 按科展开）', () => {
  test('经验总和 / 已通过天数 / children 状态守恒，展开与去重正确', () => {
    const raw = buildOldDb();
    const before = snapshot(raw);
    assert.equal(before[1].xpSum, 144);
    assert.deepEqual(before[1].days, ['2026-10-17', '2026-10-18', '2026-10-19']);

    raw.exec(readFileSync(new URL('../migrations/0004_subjects_photos.sql', import.meta.url), 'utf8'));

    const after = snapshot(raw);
    assert.deepEqual(after, before); // 三项守恒 + children 一字未动

    // 展开行数：大宝 2（17日）+5（18日全部完成）+2（19日：英语去重后 approved + 阅读）= 9；小宝 1
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM checkins WHERE child_id=1').get().n, 9);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM checkins WHERE child_id=2').get().n, 1);

    // 17 日：语文挂 48、数学挂 0（科序第一科挂 xp）
    const d17 = raw.prepare("SELECT subject, xp_awarded FROM checkins WHERE child_id=1 AND date='2026-10-17' ORDER BY subject").all();
    assert.equal(d17.length, 2);
    assert.equal(d17.find((r) => r.subject === '语文').xp_awarded, 48);
    assert.equal(d17.find((r) => r.subject === '数学').xp_awarded, 0);

    // 18 日：五科齐全，均 approved；xp 只在语文行
    const d18 = raw.prepare("SELECT subject, xp_awarded, status FROM checkins WHERE child_id=1 AND date='2026-10-18'").all();
    assert.equal(d18.length, 5);
    assert.ok(d18.every((r) => r.status === 'approved'));
    assert.equal(d18.reduce((a, r) => a + (r.xp_awarded || 0), 0), 48);
    assert.equal(d18.find((r) => r.subject === '语文').xp_awarded, 48);

    // 19 日：英语只剩一行且是 approved（驳回行被去重，优先保留 approved），阅读 approved
    const d19 = raw.prepare("SELECT subject, status FROM checkins WHERE child_id=1 AND date='2026-10-19'").all();
    assert.equal(d19.length, 2);
    assert.equal(d19.find((r) => r.subject === '英语').status, 'approved');
    assert.equal(d19.find((r) => r.subject === '阅读').status, 'approved');

    // 小宝待审行保留，subject 与 note 就位
    const xb = raw.prepare('SELECT subject, status, note FROM checkins WHERE child_id=2').get();
    assert.equal(xb.subject, '其他');
    assert.equal(xb.status, 'pending');
    assert.equal(xb.note, '');

    // 旧 subjects 数组已被改写为单科数组（兼容读取）
    const one = raw.prepare("SELECT subjects FROM checkins WHERE child_id=1 AND date='2026-10-17' AND subject='数学'").get();
    assert.deepEqual(JSON.parse(one.subjects), ['数学']);
  });

  test('唯一索引固化「一孩一天一科一行」', () => {
    const raw = buildOldDb();
    raw.exec(readFileSync(new URL('../migrations/0004_subjects_photos.sql', import.meta.url), 'utf8'));
    assert.throws(() => {
      raw.prepare("INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,status) VALUES(1,'2026-10-17','[\"语文\"]','语文','19:00',1,'pending')").run();
    });
  });

  test('照片表与新设置就位', () => {
    const raw = buildOldDb();
    raw.exec(readFileSync(new URL('../migrations/0004_subjects_photos.sql', import.meta.url), 'utf8'));
    const t = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='checkin_photos'").get();
    assert.ok(t);
    assert.equal(raw.prepare("SELECT value FROM settings WHERE key='subject_xp'").get().value, '15');
    assert.equal(raw.prepare("SELECT value FROM settings WHERE key='quiz_repeat_days'").get().value, '30');
  });
});

describe('迁移 0006（借鉴包 v1：高级球 + 掉球记账 + 遭遇答题状态）', () => {
  test('balls_super 默认 0、ball_drops 表与 quiz_state 列就位，旧数据不回填不动账', () => {
    const raw = new DatabaseSync(':memory:');
    for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql']) {
      raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
    }
    raw.exec("UPDATE children SET total_xp=144, balls=5 WHERE id=1");
    raw.exec("INSERT INTO encounters(child_id, date, pokemon_no, name, balls_used, hits, status) VALUES(1, '2026-10-19', 39, '胖丁', 3, 2, 'caught')");

    raw.exec(readFileSync(new URL('../migrations/0006_borrow_pack.sql', import.meta.url), 'utf8'));

    const c = raw.prepare('SELECT balls, balls_super, total_xp FROM children WHERE id=1').get();
    assert.equal(c.balls, 5); // 普通球库存不动
    assert.equal(c.balls_super, 0); // 高级球默认 0
    assert.equal(c.total_xp, 144); // 经验不动
    assert.ok(raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ball_drops'").get());
    const enc = raw.prepare('SELECT hits, quiz_state FROM encounters WHERE id=1').get();
    assert.equal(enc.hits, 2); // 旧行 hits（旧口径）不回填
    assert.equal(enc.quiz_state, null);
  });
});
