import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const migrations = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0013_bsn_math_chapters.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql'];

let raw;
let db;
let env;

function wrap(raw) {
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first() {
          return raw.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: raw.prepare(sql).all(...args) };
        },
        async run() {
          const { changes, lastInsertRowid } = raw.prepare(sql).run(...args);
          return { meta: { changes, last_row_id: Number(lastInsertRowid) } };
        },
      };
    },
    async batch(stmts) {
      const results = [];
      for (const stmt of stmts) results.push(await stmt.run());
      return results;
    },
  };
}

const insQ = (id, kind, grade, subject, chapter, active = 1) => raw.prepare(
  `INSERT INTO quiz_questions(id,kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at,topic_id,chapter)
   VALUES(?,?,?,?,?,?,?,?,?,0,1,?,?)`).run(id, kind, grade, subject, `题${id}`, '["A","B","C","D"]', 0, '', active, null, chapter);
const insAttempt = (child, qid, date, correct = 1) => raw.prepare(
  `INSERT INTO quiz_attempts(child_id,question_id,date_shanghai,correct,xp_awarded,fragments_awarded,created_epoch)
   VALUES(?,?,?,?,0,0,1)`).run(child, qid, date, correct);
const setSetting = (key, value) => raw.prepare(
  `INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value);

const seeds = [
  [201, 'study', 3, '数学', '三年级上册 第2单元 观察物体'],
  [202, 'study', 3, '数学', '三年级上册 第3单元 加减法'],
  [211, 'study', 3, '语文', '三年级上册 第2单元'],
  [212, 'study', 3, '语文', '三年级上册 第3单元'],
  [213, 'study', 3, '语文', '三年级下册 第1单元'],
  [214, 'study', 3, '语文', null],
  [215, 'study', 3, '语文', '胡言乱语'],
  [221, 'study', 3, '英语', '三年级上册 Unit 2 Different families'],
  [222, 'study', 3, '英语', '三年级上册 Unit 3 Our animal friends'],
  [223, 'study', 3, '英语', '三年级下册 Unit 1 Meeting new people'],
  [224, 'study', 3, '英语', null],
  [225, 'study', 3, '英语', 'Unit 3'],
  [226, 'study', 3, '英语', '三年级上册 Unit 2 Different families'],
  [230, 'study', 3, '英语', '三年级下册 Unit 2 My words and actions'],
  [231, 'study', 3, '阅读', null],
  [232, 'riddle', null, null, null],
  [241, 'study', 1, '数学', '一年级上册 第2单元 比较'],
  [242, 'study', 1, '语文', '一年级上册 第2单元'],
  [243, 'study', 1, '英语', '一年级上册 Unit 2 My Body'],
  [244, 'study', 1, '语文', '一年级上册 第3单元'],
];

const seeded = (s) => () => (s = (s * 1103515245 + 13579) % 2147483648) / 2147483648;

function rowsFor(ids) {
  return ids.map((id) => {
    const [, kind, grade, subject, chapter] = seeds.find((seed) => seed[0] === id);
    return { id, kind, grade, subject, chapter, active: 1 };
  });
}

function sortedIds(rows) {
  return rows.map((row) => row.id).sort((a, b) => a - b);
}

function defaultGates() {
  return {
    mathGate: M.mathGateFor(3, '三年级上册 第2单元 观察物体'),
    chineseGate: M.chineseGateFor(3, '三年级上册 第2单元'),
    englishGate: M.englishGateFor(3, '三年级上册 Unit 2 Different families'),
  };
}

function select(rows, subjects, gates) {
  return M.selectDailyQuestions(rows, {
    gradeNum: 3,
    subjects,
    history: new Map(),
    today: M.shDateStr(),
    correctWindowDays: 30,
    ...gates,
    rng: seeded(7),
  });
}

beforeEach(() => {
  raw = new DatabaseSync(':memory:');
  for (const migration of migrations) {
    raw.exec(readFileSync(new URL('../migrations/' + migration, import.meta.url), 'utf8'));
  }
  db = wrap(raw);
  env = { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
  raw.exec('DELETE FROM quiz_questions');
  for (const seed of seeds) insQ(...seed);
});

afterEach(() => {
  raw.close();
});

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}
async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200, '家长登录应成功');
  return r.cookie;
}

describe('每日选题：三科学习进度门', () => {
  test('默认门只放行门内各科题（脑筋急转弯不再进每日选题）', () => {
    const rows = rowsFor([
      201, 202, 211, 212, 213, 214, 215,
      221, 222, 223, 224, 225, 232,
    ]);
    const picked = select(rows, ['语文', '数学', '英语'], defaultGates());
    assert.deepEqual(
      sortedIds(picked), [201, 211, 221],
      '三门应排除超进度题，语文和英语还应排除空标签及无法解析标签；2026-11-09 起谜语只进兄弟对战防守题，不进每日选题',
    );
  });

  test('不传语文和英语门时保留旧行为', () => {
    const picked = select(rowsFor([214]), ['语文'], { mathGate: null });
    assert.deepEqual(sortedIds(picked), [214], '未传语文门时空标签语文题仍可出题');
  });

  test('数学门仍放行空标签数学题', () => {
    const rows = [{
      id: 203, kind: 'study', grade: 3, subject: '数学', chapter: null, active: 1,
    }];
    const picked = select(rows, ['数学'], {
      mathGate: M.mathGateFor(3, '三年级上册 第2单元 观察物体'),
    });
    assert.deepEqual(sortedIds(picked), [203], '数学空标签沿用放行规则');
  });

  test('三门不约束非对应科目', () => {
    assert.deepEqual(
      sortedIds(select(rowsFor([231]), ['阅读'], defaultGates())),
      [231], '阅读题不受三科学习进度门约束',
    );
    assert.deepEqual(
      sortedIds(select(rowsFor([201]), ['数学'], defaultGates())),
      [201], '数学门内题不应被语文门或英语门拦截',
    );
  });

  test('脑筋急转弯仍直接放行进度门，但不再进每日选题', () => {
    // 门本身仍放行谜语（防守题要靠它）；每日选题的谜语槽已于 2026-11-09 移除
    const gates = defaultGates();
    const riddle = { id: 232, kind: 'riddle', subject: null, chapter: null };
    assert.equal(M.mathGatePass(riddle, gates.mathGate), true);
    assert.equal(M.chineseGatePass(riddle, gates.chineseGate), true);
    assert.equal(M.englishGatePass(riddle, gates.englishGate), true);
    assert.deepEqual(sortedIds(select(rowsFor([232]), ['数学'], defaultGates())), [], '每日选题不再出谜语');
  });
});

describe('进度门加载与移动', () => {
  test('无设置时三年级和一年级回退到默认门', async () => {
    const big = { id: 1, grade_label: '三年级' };
    const small = { id: 2, grade_label: '一年级' };
    assert.equal(
      (await M.loadMathGate(db, big)).chapter,
      '三年级上册 第2单元 观察物体', '三年级数学默认到上册第2单元',
    );
    assert.equal(
      (await M.loadChineseGate(db, big)).chapter,
      '三年级上册 第2单元', '三年级语文默认到上册第2单元',
    );
    assert.equal(
      (await M.loadEnglishGate(db, big)).chapter,
      '三年级上册 Unit 2 Different families', '三年级英语默认到上册Unit 2',
    );
    assert.equal(
      (await M.loadChineseGate(db, small)).chapter,
      '一年级上册 第2单元', '一年级语文默认到上册第2单元',
    );
    assert.equal(
      (await M.loadEnglishGate(db, small)).chapter,
      '一年级上册 Unit 2 My Body（自产）', '一年级英语默认到上册Unit 2',
    );
  });

  test('设置移动语文和英语门并按新进度筛题', async () => {
    setSetting('chinese_progress_1', '三年级上册 第3单元');
    setSetting('english_progress_1', '三年级下册 Unit 1 Meeting new people');
    const child = { id: 1, grade_label: '三年级' };
    const chineseGate = await M.loadChineseGate(db, child);
    const englishGate = await M.loadEnglishGate(db, child);
    assert.equal(chineseGate.chapter, '三年级上册 第3单元', '语文加载器应读取设置');
    assert.equal(
      englishGate.chapter, '三年级下册 Unit 1 Meeting new people',
      '英语加载器应读取设置',
    );
    const gates = { ...defaultGates(), chineseGate, englishGate };
    assert.deepEqual(
      sortedIds(select(rowsFor([212]), ['语文'], gates)),
      [212], '语文上册第3单元到达新门后可出题',
    );
    assert.deepEqual(
      sortedIds(select(rowsFor([213]), ['语文'], gates)),
      [], '语文下册第1单元仍超出新门',
    );
    assert.deepEqual(
      sortedIds(select(rowsFor([223]), ['英语'], gates)),
      [223], '英语下册Unit 1到达新门后可出题',
    );
    assert.deepEqual(
      sortedIds(select(rowsFor([230]), ['英语'], gates)),
      [], '英语下册Unit 2仍超出新门',
    );
  });
});

describe('数据库选题入口共用学习进度门', () => {
  test('抓捕题按孩子年级应用三门', async () => {
    const big = await M.pickCatchQuestions(
      db, { id: 1, grade_label: '三年级' }, 50, seeded(7),
    );
    assert.deepEqual(
      sortedIds(big), [201, 211, 221, 226, 231],
      '三年级抓捕仅含三科门内题和阅读题（2026-11-13 起抓捕不再出脑筋急转弯）',
    );
    const small = await M.pickCatchQuestions(
      db, { id: 2, grade_label: '一年级' }, 50, seeded(7),
    );
    assert.deepEqual(
      sortedIds(small), [241, 242, 243],
      '一年级抓捕应使用一年级默认门并排除语文第3单元',
    );
  });

  test('防守题排除超门和空标签的答对题', async () => {
    const today = M.shDateStr();
    for (const qid of [211, 212, 221, 224]) insAttempt(1, qid, today);
    for (let i = 0; i < 30; i++) {
      // rng 恒 0.9 → 不走谜语分支（1/3），只验历史池过滤；谜语混合另见 gate.test.mjs
      const picked = await M.pickDefenseQuestion(db, 1, today, M.weekStartMon(today), () => 0.9);
      assert.notEqual(picked, null, `第${i + 1}次防守应有门内答对题可用`);
      assert.ok(
        [211, 221].includes(picked.id),
        `第${i + 1}次防守只能选211或221，不能选超门212或空标签224`,
      );
    }
  });

  test('单元测试语文和英语严格匹配单元，阅读保留旧规则', async () => {
    const child = { id: 1, grade_label: '三年级' };
    const chinese = await M.pickUnitTestQuestions(
      db, child, '语文', '三年级上册 第2单元', 20, seeded(7),
    );
    assert.deepEqual(
      sortedIds(chinese), [211], '语文单元测试只选标签匹配且门内的题',
    );
    const english = await M.pickUnitTestQuestions(
      db, child, '英语', '三年级上册 Unit 2 Different families', 20, seeded(7),
    );
    assert.deepEqual(
      sortedIds(english), [221, 226], '英语单元测试只选标签匹配且门内的题',
    );
    const reading = await M.pickUnitTestQuestions(
      db, child, '阅读', '第1单元', 20, seeded(7),
    );
    assert.deepEqual(
      sortedIds(reading), [231], '阅读无进度门，空标签题沿用旧规则可出',
    );
  });
});

describe('家长设置接口：语文和英语学习进度', () => {
  test('读取默认进度及各年级章节数量', async () => {
    const cookie = await parentCookie();
    const r = await call('/api/parent/settings', { cookie });
    assert.equal(r.status, 200, '家长设置读取应成功');
    const [big, small] = r.j.settings.children;

    assert.deepEqual(
      { current: big.chineseProgress.current, isDefault: big.chineseProgress.isDefault },
      { current: '三年级上册 第2单元', isDefault: true },
      '大宝语文应显示默认进度',
    );
    assert.equal(big.chineseProgress.chapters.length, 16, '三年级语文章节共16单元');
    assert.deepEqual(
      { current: big.englishProgress.current, isDefault: big.englishProgress.isDefault },
      { current: '三年级上册 Unit 2 Different families', isDefault: true },
      '大宝英语应显示默认进度',
    );
    assert.equal(big.englishProgress.chapters.length, 13, '三年级英语章节共13单元');

    assert.equal(
      small.chineseProgress.current, '一年级上册 第2单元',
      '小宝语文应显示一年级默认进度',
    );
    assert.equal(small.chineseProgress.chapters.length, 16, '一年级语文章节共16单元');
    assert.equal(
      small.englishProgress.current, '一年级上册 Unit 2 My Body（自产）',
      '小宝英语应显示一年级默认进度',
    );
    assert.equal(small.englishProgress.chapters.length, 12, '一年级英语章节共12单元');
  });

  test('更新进度并以空字符串恢复默认', async () => {
    const cookie = await parentCookie();
    const updated = await call('/api/parent/settings/update', {
      method: 'POST',
      cookie,
      body: {
        chineseProgress: [{ id: 1, chapter: '三年级上册 第3单元' }],
        englishProgress: [{ id: 1, chapter: '三年级下册 Unit 1 Meeting new people' }],
      },
    });
    assert.equal(updated.status, 200, '合法语文和英语进度更新应成功');

    const saved = await call('/api/parent/settings', { cookie });
    assert.equal(saved.status, 200, '更新后应可读取设置');
    const big = saved.j.settings.children[0];
    assert.equal(big.chineseProgress.current, '三年级上册 第3单元', '语文进度应保存');
    assert.equal(big.chineseProgress.isDefault, false, '已设置语文进度不应标记默认');
    assert.equal(
      big.englishProgress.current, '三年级下册 Unit 1 Meeting new people',
      '英语进度应保存',
    );
    assert.equal(big.englishProgress.isDefault, false, '已设置英语进度不应标记默认');

    const reset = await call('/api/parent/settings/update', {
      method: 'POST',
      cookie,
      body: {
        chineseProgress: [{ id: 1, chapter: '' }],
        englishProgress: [{ id: 1, chapter: '' }],
      },
    });
    assert.equal(reset.status, 200, '空字符串恢复默认应成功');

    const restored = await call('/api/parent/settings', { cookie });
    assert.equal(restored.status, 200, '恢复后应可读取设置');
    const defaults = restored.j.settings.children[0];
    assert.equal(
      defaults.chineseProgress.current, '三年级上册 第2单元',
      '语文应恢复默认第2单元',
    );
    assert.equal(defaults.chineseProgress.isDefault, true, '语文应重新标记默认');
    assert.equal(
      defaults.englishProgress.current, '三年级上册 Unit 2 Different families',
      '英语应恢复默认Unit 2',
    );
    assert.equal(defaults.englishProgress.isDefault, true, '英语应重新标记默认');
  });

  test('整体校验通过前不写入，并拒绝非法章节及非数组', async () => {
    const cookie = await parentCookie();
    const mixed = await call('/api/parent/settings/update', {
      method: 'POST',
      cookie,
      body: {
        chineseProgress: [
          { id: 1, chapter: '三年级上册 第3单元' },
          { id: 1, chapter: '四年级上册 第1单元' },
        ],
      },
    });
    assert.equal(mixed.status, 400, '含不属于孩子年级的章节应整体拒绝');

    const unchanged = await call('/api/parent/settings', { cookie });
    assert.equal(unchanged.status, 200, '校验失败后应可读取设置');
    assert.equal(
      unchanged.j.settings.children[0].chineseProgress.current,
      '三年级上册 第2单元',
      '整体校验失败时前面的合法项也不得写入',
    );

    const invalidEnglish = await call('/api/parent/settings/update', {
      method: 'POST',
      cookie,
      body: { englishProgress: [{ id: 1, chapter: '三年级上册 Unit 99' }] },
    });
    assert.equal(invalidEnglish.status, 400, '不存在的英语Unit应拒绝');

    const invalidShape = await call('/api/parent/settings/update', {
      method: 'POST',
      cookie,
      body: { chineseProgress: 'x' },
    });
    assert.equal(invalidShape.status, 400, '语文进度不是数组时应拒绝');
  });

  test('同一合法进度可重复提交', async () => {
    const cookie = await parentCookie();
    const body = { chineseProgress: [{ id: 1, chapter: '三年级上册 第3单元' }] };
    for (let i = 0; i < 2; i++) {
      const r = await call('/api/parent/settings/update', {
        method: 'POST', cookie, body,
      });
      assert.equal(r.status, 200, `第${i + 1}次提交相同合法进度应成功`);
    }
    const saved = await call('/api/parent/settings', { cookie });
    assert.equal(saved.status, 200, '重复提交后应可读取设置');
    assert.equal(
      saved.j.settings.children[0].chineseProgress.current,
      '三年级上册 第3单元',
      '重复提交后语文进度应保持所设值',
    );
  });
});
