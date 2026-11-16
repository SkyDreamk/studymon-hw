/* 生成 migrations/0002_quiz.sql：把 quiz-bank.json 的题目转成 INSERT 语句。
 * 用法：node scripts/gen-quiz-migration.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../quiz-bank.json', import.meta.url), 'utf8'));
const esc = (s) => String(s ?? '').replace(/'/g, "''");

function check(kind, rows, grade) {
  for (const [i, r] of rows.entries()) {
    if (!r.q || !Array.isArray(r.options) || r.options.length !== 4 ||
        !Number.isInteger(r.answer) || r.answer < 0 || r.answer > 3) {
      throw new Error(`invalid entry: ${kind}[${i}]`);
    }
    if (grade && !['语文', '数学', '英语', '阅读'].includes(r.subject)) {
      throw new Error(`invalid subject: ${kind}[${i}] = ${r.subject}`);
    }
  }
}
check('riddles', bank.riddles, false);
check('grade1', bank.grade1, true);
check('grade3', bank.grade3, true);

const now = Math.floor(Date.now() / 1000);
const lines = [];
function add(kind, grade, subject, r) {
  lines.push(
    `('${kind}',${grade === null ? 'NULL' : grade},${subject === null ? 'NULL' : `'${subject}'`},` +
    `'${esc(r.q)}','${esc(JSON.stringify(r.options))}',${r.answer},'${esc(r.explain)}',1,0,${now})`
  );
}
for (const r of bank.riddles) add('riddle', null, null, r);
for (const r of bank.grade1) add('study', 1, r.subject, r);
for (const r of bank.grade3) add('study', 3, r.subject, r);

const sql = `-- studymon-hw D1 schema v2 — 每日问答系统（由 scripts/gen-quiz-migration.mjs 从 quiz-bank.json 生成）
-- 题库：riddle=脑筋急转弯（通用）/ study=年级知识题 / custom=家长自定义

CREATE TABLE quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,             -- riddle|study|custom
  grade INTEGER,                  -- NULL=通用；1=一年级；3=三年级
  subject TEXT,                   -- 语文|数学|英语|阅读；riddle 为 NULL
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,     -- JSON 数组，4 个选项
  answer_idx INTEGER NOT NULL,    -- 0..3
  explain TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER
);
CREATE INDEX idx_quiz_kind_grade ON quiz_questions(kind, grade, subject);

CREATE TABLE quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  fragments_awarded INTEGER NOT NULL DEFAULT 0,
  created_epoch INTEGER NOT NULL
);
CREATE UNIQUE INDEX ux_quiz_attempt ON quiz_attempts(child_id, question_id, date_shanghai);
CREATE INDEX idx_quiz_attempt_child_date ON quiz_attempts(child_id, date_shanghai);

-- 当日题单（按孩子×日期缓存，保证同一天多次打开题单稳定）
CREATE TABLE quiz_daily (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  question_ids TEXT NOT NULL,     -- JSON 数组，quiz_questions.id
  PRIMARY KEY (child_id, date_shanghai)
);

ALTER TABLE children ADD COLUMN quiz_fragments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE children ADD COLUMN quiz_correct_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE children ADD COLUMN unlocked_moves TEXT NOT NULL DEFAULT '[]';  -- 提前解锁的招式名 JSON 数组

INSERT OR IGNORE INTO settings(key,value) VALUES('quiz_xp','10');

-- 题库种子（${lines.length} 题）
INSERT INTO quiz_questions(kind,grade,subject,question,options_json,answer_idx,explain,active,is_custom,created_at) VALUES
${lines.join(',\n')};
`;

writeFileSync(new URL('../migrations/0002_quiz.sql', import.meta.url), sql);
console.log(`wrote migrations/0002_quiz.sql with ${lines.length} seed questions`);
