import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const migrations = [
  '0001_init.sql',
  '0002_quiz.sql',
  '0003_entry_roles.sql',
  '0004_subjects_photos.sql',
  '0005_battle.sql',
  '0006_borrow_pack.sql',
  '0007_coop_tables.sql',
  '0008_battles_coop_cols.sql',
  '0009_quiz_topic.sql',
  '0010_pvp_rematch.sql',
  '0011_parent_grants.sql',
  '0012_reward_checkin.sql',
  '0013_bsn_math_chapters.sql',
  '0017_diagnosis.sql',
  '0018_oak_draw.sql',
  '0019_evo_items.sql',
  '0020_sync.sql',
];

function wrap(raw) {
  return {
    prepare(sql) {
      const statement = raw.prepare(sql);
      let values = [];
      const prepared = {
        bind(...args) {
          values = args;
          return prepared;
        },
        async first(column) {
          const row = statement.get(...values);
          if (!row) return null;
          return column === undefined ? row : row[column];
        },
        async all() {
          return { results: statement.all(...values) };
        },
        async run() {
          const result = statement.run(...values);
          return {
            success: true,
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        },
      };
      return prepared;
    },
    async batch(statements) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
  };
}

let raw;
let db;

function insQ(id, kind, grade, subject, chapter, active = 1) {
  raw.prepare(`
    INSERT INTO quiz_questions
      (id, kind, grade, subject, chapter, question, options_json,
       answer_idx, active, is_custom, topic_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, NULL)
  `).run(
    id,
    kind,
    grade,
    subject,
    chapter,
    `题${id}`,
    '["A","B","C","D"]',
    active,
  );
}

const setSetting = (key, value) => raw.prepare(
  `INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value);

const seeds = [
  [251, 'study', 3, '语文', '通用复习'],
  [252, 'study', 3, '英语', '通用复习'],
  [253, 'study', 3, '语文', '三年级上册 第2单元'],
  [254, 'study', 3, '语文', '三年级上册 第3单元'],
  [255, 'study', 3, '英语', '三年级上册 Unit 2 Different families'],
  [256, 'study', 3, '英语', '三年级上册 Unit 3 Our animal friends'],
  [257, 'study', 3, '数学', '通用复习'],
];

beforeEach(() => {
  raw = new DatabaseSync(':memory:');
  db = wrap(raw);
  for (const migration of migrations) {
    raw.exec(
      readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'),
    );
  }
  raw.exec('DELETE FROM quiz_questions');
  for (const seed of seeds) insQ(...seed);
});

afterEach(() => {
  raw.close();
});

function seeded(s) {
  let state = s >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function rowsFor(ids) {
  return ids.map((id) => {
    const [, kind, grade, subject, chapter] = seeds.find(
      (seed) => seed[0] === id,
    );
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
    englishGate: M.englishGateFor(
      3,
      '三年级上册 Unit 2 Different families',
    ),
  };
}

function forwardGates() {
  return {
    ...defaultGates(),
    chineseGate: M.chineseGateFor(3, '三年级上册 第1单元'),
    englishGate: M.englishGateFor(3, '三年级上册 Unit 1 Making friends'),
  };
}

function select(rows, subjects, gates) {
  return M.selectDailyQuestions(rows, {
    gradeNum: 3,
    subjects,
    ...gates,
    history: new Map(),
    today: M.shDateStr(),
    correctWindowDays: 30,
    rng: seeded(7),
  });
}

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (cookie) headers.set('cookie', cookie);

  const request = new Request(`https://test.local${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return M.default.fetch(request, {
    DB: db,
    TEST_MODE: '1',
    ASSETS: {
      fetch: async () =>
        new Response('<html>app</html>', {
          headers: { 'content-type': 'text/html' },
        }),
    },
  });
}

async function parentCookie() {
  const response = await call('/api/parent/login', {
    method: 'POST',
    body: { pin: '0000' },
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie.split(';')[0];
}

test('默认进度门直接放行语文、英语通用复习', () => {
  const gates = defaultGates();

  assert.equal(
    M.chineseGatePass(
      { subject: '语文', chapter: '通用复习' },
      gates.chineseGate,
    ),
    true,
  );
  assert.equal(
    M.englishGatePass(
      { subject: '英语', chapter: '通用复习' },
      gates.englishGate,
    ),
    true,
  );
});

test('前移进度门仍放行语文、英语通用复习，数学门保持不变', () => {
  const gates = forwardGates();

  assert.equal(
    M.chineseGatePass(
      { subject: '语文', chapter: '通用复习' },
      gates.chineseGate,
    ),
    true,
  );
  assert.equal(
    M.englishGatePass(
      { subject: '英语', chapter: '通用复习' },
      gates.englishGate,
    ),
    true,
  );
  assert.equal(
    M.mathGatePass(
      { subject: '数学', chapter: '通用复习' },
      gates.mathGate,
    ),
    false,
  );
});

test('每日问答默认门保留两科通用复习', () => {
  assert.deepEqual(
    sortedIds(
      select(rowsFor([251, 252]), ['语文', '英语'], defaultGates()),
    ),
    [251, 252],
  );
});

test('每日问答前移门保留通用复习，同时挡住第2单元对照题', () => {
  const gates = forwardGates();

  assert.deepEqual(
    sortedIds(select(rowsFor([251, 252]), ['语文', '英语'], gates)),
    [251, 252],
  );
  assert.deepEqual(
    sortedIds(select(rowsFor([253]), ['语文'], gates)),
    [],
  );
});

test('抓捕默认门保留通用复习和门内题，排除超门题', async () => {
  const questions = await M.pickCatchQuestions(
    db,
    { id: 1, grade_label: '三年级' },
    50,
    seeded(7),
  );

  assert.deepEqual(sortedIds(questions), [251, 252, 253, 255]);
});

test('抓捕前移门仅保留语文、英语通用复习', async () => {
  await setSetting('chinese_progress_1', '三年级上册 第1单元');
  await setSetting(
    'english_progress_1',
    '三年级上册 Unit 1 Making friends',
  );

  const questions = await M.pickCatchQuestions(
    db,
    { id: 1, grade_label: '三年级' },
    50,
    seeded(7),
  );

  assert.deepEqual(sortedIds(questions), [251, 252]);
});

test('防守复现始终可选通用复习，并按当前进度挡住对照题', async () => {
  const today = M.shDateStr();
  const ws = M.weekStartMon(today);
  const insertAttempt = raw.prepare(`
    INSERT INTO quiz_attempts
      (child_id, question_id, date_shanghai, correct,
       xp_awarded, fragments_awarded, created_epoch)
    VALUES (?, ?, ?, 1, 0, 0, 1)
  `);

  for (const id of [251, 252, 254]) {
    insertAttempt.run(1, id, today);
  }

  for (let i = 0; i < 30; i += 1) {
    const question = await M.pickDefenseQuestion(db, 1, today, ws);
    assert.ok(question);
    assert.ok([251, 252].includes(question.id));
  }

  await setSetting('chinese_progress_1', '三年级上册 第1单元');
  await setSetting(
    'english_progress_1',
    '三年级上册 Unit 1 Making friends',
  );
  insertAttempt.run(1, 253, today);

  for (let i = 0; i < 30; i += 1) {
    const question = await M.pickDefenseQuestion(db, 1, today, ws);
    assert.ok(question);
    assert.ok([251, 252].includes(question.id));
  }
});

test('语文、英语单元测试显式排除通用复习', async () => {
  const child = { id: 1, grade_label: '三年级' };

  assert.deepEqual(
    sortedIds(
      await M.pickUnitTestQuestions(
        db,
        child,
        '语文',
        '三年级上册 第2单元',
        20,
      ),
    ),
    [253],
  );
  assert.deepEqual(
    sortedIds(
      await M.pickUnitTestQuestions(db, child, '语文', '通用复习', 20),
    ),
    [],
  );
  assert.deepEqual(
    sortedIds(
      await M.pickUnitTestQuestions(
        db,
        child,
        '英语',
        '三年级上册 Unit 2 Different families',
        20,
      ),
    ),
    [255],
  );
  assert.deepEqual(
    sortedIds(
      await M.pickUnitTestQuestions(db, child, '英语', '通用复习', 20),
    ),
    [],
  );
});

test('设置保存拒绝通用复习，保持默认进度且章节列表不包含它', async () => {
  const cookie = await parentCookie();

  const chineseResponse = await call('/api/parent/settings/update', {
    method: 'POST',
    cookie,
    body: {
      chineseProgress: [{ id: 1, chapter: '通用复习' }],
    },
  });
  assert.equal(chineseResponse.status, 400);

  const afterChineseResponse = await call('/api/parent/settings', { cookie });
  assert.equal(afterChineseResponse.status, 200);
  const afterChinese = await afterChineseResponse.json();
  const chineseChild = afterChinese.settings.children[0];

  assert.equal(chineseChild.id, 1);
  assert.equal(
    chineseChild.chineseProgress.current,
    '三年级上册 第2单元',
  );
  assert.equal(chineseChild.chineseProgress.isDefault, true);

  const englishResponse = await call('/api/parent/settings/update', {
    method: 'POST',
    cookie,
    body: {
      englishProgress: [{ id: 1, chapter: '通用复习' }],
    },
  });
  assert.equal(englishResponse.status, 400);

  const settingsResponse = await call('/api/parent/settings', { cookie });
  assert.equal(settingsResponse.status, 200);
  const settings = await settingsResponse.json();
  const child = settings.settings.children[0];

  assert.equal(child.id, 1);
  assert.equal(
    child.englishProgress.current,
    '三年级上册 Unit 2 Different families',
  );
  assert.equal(child.englishProgress.isDefault, true);
  assert.equal(child.chineseProgress.current, '三年级上册 第2单元');
  assert.equal(child.chineseProgress.isDefault, true);

  assert.equal(child.chineseProgress.chapters.length, 16);
  assert.equal(child.chineseProgress.chapters.includes('通用复习'), false);
  assert.equal(child.englishProgress.chapters.length, 13);
  assert.equal(child.englishProgress.chapters.includes('通用复习'), false);
});
