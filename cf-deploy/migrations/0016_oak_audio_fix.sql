-- studymon-hw D1 schema v16 — Oak 示范音频 404 修正（corrective；见 DEPLOY.md §27 v2 遗留①）
-- 根因：0014 生成器（work/gen-oak-migration.py）写库时取了裸文件名 s001-n-<hash>.mp3，
--   但拷贝进 bundle 时加了集前缀 <episode>__s001-n-<hash>.mp3；前端按
--   '/static/audio/oak/' + oak_audio 拼 URL，故 174 句示范音频全 404
--   （播放失败走 speechSynthesis 兜底，流程不阻塞）。
-- 本迁移把 174 行 oak_audio 补上 oak_episode 前缀；0014 原文件不动。
-- 幂等守卫用 instr() 而不用 LIKE：LIKE 里 _ 是单字符通配符，'%__%' 会误匹配一切。
-- 回滚：UPDATE quiz_questions SET oak_audio = substr(oak_audio, instr(oak_audio, '__') + 2)
--        WHERE kind='oak' AND instr(oak_audio, '__') > 0;
UPDATE quiz_questions
SET oak_audio = oak_episode || '__' || oak_audio
WHERE kind='oak'
  AND oak_audio IS NOT NULL
  AND oak_episode IS NOT NULL
  AND instr(oak_audio, '__') = 0;
