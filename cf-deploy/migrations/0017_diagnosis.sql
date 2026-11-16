-- studymon-hw D1 schema v17 — 先修回溯诊断：诊断行（见 DESIGN-先修回溯诊断-方案-v1.md §5.1）
-- 诊断行是派生快照，不是第二事实源：作答事实只在 quiz_attempts；诊断行删了可随时由作答记录重算。
-- 一孩一根因同时只留一行 pending（部分唯一索引兜底；并发触发以先落库者为准，后者复用）。
-- 回滚：DROP TABLE quiz_diagnoses（诊断行可由作答记录重算，无需备份）。
CREATE TABLE quiz_diagnoses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  trigger_topic_id TEXT NOT NULL,   -- 触发点：窗口统计判薄弱的知识点
  root_topic_id TEXT NOT NULL,      -- 根因：回溯终点
  chain_json TEXT NOT NULL DEFAULT '[]',  -- 回溯链：[触发点, ..., 根因]，每项 {topicId, name, chapter, strength, reason}
  status TEXT NOT NULL DEFAULT 'pending', -- pending | done | expired
  review_question_ids TEXT NOT NULL DEFAULT '[]', -- 当日出的复习题 id（JSON 数组；次日重算后重新选）
  review_correct INTEGER NOT NULL DEFAULT 0,      -- 复习题累计答对数
  created_date TEXT NOT NULL,        -- 上海日期 YYYY-MM-DD
  resolved_date TEXT,                -- done/expired 的上海日期
  created_epoch INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_diag_pending ON quiz_diagnoses(child_id, root_topic_id) WHERE status='pending';
CREATE INDEX idx_diag_child_date ON quiz_diagnoses(child_id, created_date);
