-- 每日英语跟读评分记录（2026-11-09 新建）：每孩每天每句一行，记最好发音分与尝试次数。
-- 打卡线 80 分（4 星，跟读站 85 分线区分，用户 2026-11-09 定，条件宽松一些）；打卡须当日 5 句 best 全 ≥80。
-- sid 与 daily_english_logs.sids 同一格式 episodeId:sid；评测走站里已有的讯飞主/Azure 备管线，不另建。
-- 只应用到测试库；回滚：DROP TABLE daily_english_assessments;
CREATE TABLE IF NOT EXISTS daily_english_assessments (
  child_id INTEGER NOT NULL,
  sid TEXT NOT NULL,
  date_shanghai TEXT NOT NULL,
  best_pron REAL NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  updated_epoch INTEGER NOT NULL,
  PRIMARY KEY (child_id, sid, date_shanghai)
);
