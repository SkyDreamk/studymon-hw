-- studymon-hw D1 schema v9 — 题库知识点标注（批次 2 引进 cn-math-taxonomy 数学题）
-- topic_id：cn-math-taxonomy 知识点 ID（如 cnm_p001）；chapter：年级/册/单元文本。
-- 仅新增列，老题为 NULL；出题逻辑不依赖这两列（SELECT * 读取、多带字段无影响）。
ALTER TABLE quiz_questions ADD COLUMN topic_id TEXT;
ALTER TABLE quiz_questions ADD COLUMN chapter TEXT;
CREATE INDEX idx_quiz_topic ON quiz_questions(topic_id);
