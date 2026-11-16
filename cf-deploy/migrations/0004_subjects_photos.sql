-- studymon-hw D1 schema v4 — 打卡改版（按科独立）+ 拍照上传索引 + 每科经验/去重设置
--
-- checkins 从「一天一条、subjects 多科数组」改为「一天一科一行」：
--   新增 subject（该行科目，五科之一）、note（孩子提交的一句话备注）。
--   旧行按科展开：一行多科 → 多行，每行 subjects=json_array(该科)；
--   旧「全部完成」行（且不含五科）→ 展开为五科五行。
--   xp_awarded 只挂在展开组的第一行（按 语文→数学→英语→阅读→其他 科序取第一科），
--   其余展开行 xp_awarded=0，保证「已通过行的 xp_awarded 总和」迁移前后不变；
--   children.total_xp / streak / last_checkin_date 本迁移完全不动，经验总数与连击天然守恒。
--   展开后同一 (child_id, date, subject) 可能出现多行（旧流程驳回后重交留下的），
--   按状态优先级 approved > pending > rejected、同状态取 xp 大者、再取 id 大者去重保留一行，
--   保证「已通过天数集合（distinct date）」不变，最后建唯一索引固化一行一科。

ALTER TABLE checkins ADD COLUMN subject TEXT;
ALTER TABLE checkins ADD COLUMN note TEXT NOT NULL DEFAULT '';

-- 展开 A：subjects 含五科中至少一科的旧行，逐科成行
INSERT INTO checkins(child_id, date, subjects, subject, submitted_at, submitted_epoch, is_early, status, xp_awarded, reason, reviewed_at, note)
SELECT c.child_id, c.date, json_array(j.value), j.value, c.submitted_at, c.submitted_epoch, c.is_early, c.status,
  CASE WHEN (CASE j.value WHEN '语文' THEN 0 WHEN '数学' THEN 1 WHEN '英语' THEN 2 WHEN '阅读' THEN 3 ELSE 4 END)
       = (SELECT MIN(CASE j2.value WHEN '语文' THEN 0 WHEN '数学' THEN 1 WHEN '英语' THEN 2 WHEN '阅读' THEN 3 ELSE 4 END)
          FROM json_each(c.subjects) j2
          WHERE j2.value IN ('语文','数学','英语','阅读','其他'))
       THEN c.xp_awarded ELSE 0 END,
  c.reason, c.reviewed_at, ''
FROM checkins c, json_each(c.subjects) j
WHERE c.subject IS NULL AND j.value IN ('语文','数学','英语','阅读','其他');

-- 展开 B：只有「全部完成」的旧行 → 展开为五科，xp 挂在语文行（key=0）
INSERT INTO checkins(child_id, date, subjects, subject, submitted_at, submitted_epoch, is_early, status, xp_awarded, reason, reviewed_at, note)
SELECT c.child_id, c.date, json_array(j5.value), j5.value, c.submitted_at, c.submitted_epoch, c.is_early, c.status,
  CASE WHEN j5.key = 0 THEN c.xp_awarded ELSE 0 END,
  c.reason, c.reviewed_at, ''
FROM checkins c, json_each('["语文","数学","英语","阅读","其他"]') j5
WHERE c.subject IS NULL
  AND EXISTS (SELECT 1 FROM json_each(c.subjects) j WHERE j.value = '全部完成')
  AND NOT EXISTS (SELECT 1 FROM json_each(c.subjects) j WHERE j.value IN ('语文','数学','英语','阅读','其他'));

-- 删除原始旧行（subject 仍为 NULL 的都是旧结构行）
DELETE FROM checkins WHERE subject IS NULL;

-- 去重：同一孩子、同一天、同一科只保留一行（状态优先 approved>pending>rejected，同级 xp 大者、id 大者）
DELETE FROM checkins
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY child_id, date, subject
      ORDER BY CASE status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
               IFNULL(xp_awarded, -1) DESC, id DESC
    ) AS rn FROM checkins
  ) WHERE rn = 1
);

CREATE UNIQUE INDEX ux_checkins_child_date_subject ON checkins(child_id, date, subject);
CREATE INDEX idx_checkins_child_date_status ON checkins(child_id, date, status);

-- 照片索引：照片本体存 R2（对象 key），库里只存索引；经 Worker 鉴权路由读取
CREATE TABLE checkin_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size INTEGER NOT NULL DEFAULT 0,
  created_epoch INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_photos_checkin ON checkin_photos(checkin_id);

-- 新设置：每科经验（默认 15）、问答答对去重窗口天数（默认 30）
INSERT OR IGNORE INTO settings(key, value) VALUES('subject_xp', '15');
INSERT OR IGNORE INTO settings(key, value) VALUES('quiz_repeat_days', '30');
