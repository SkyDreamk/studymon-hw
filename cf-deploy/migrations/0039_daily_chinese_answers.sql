CREATE TABLE IF NOT EXISTS daily_chinese_answers (
  child_id INTEGER NOT NULL,
  date_shanghai TEXT NOT NULL,
  qindex INTEGER NOT NULL,
  answer INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  answered_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, date_shanghai, qindex)
);
