-- 0023_care_qa_and_friendship.sql
ALTER TABLE pet_instances ADD COLUMN friendship INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS care_qa_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  friendship_awarded INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_epoch INTEGER NOT NULL,
  UNIQUE(child_id, date_shanghai, question_id)
);
CREATE INDEX IF NOT EXISTS idx_care_qa_logs_child_date
  ON care_qa_logs(child_id, date_shanghai);
