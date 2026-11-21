-- studymon-hw D1 schema v43 — pet_instances gains ability (Batch 0, ability model foundation)
-- 实例实际带的特性名（首特性／第二特性／隐藏特性三槽位中的一个）。
-- NULL = 旧实例（未掷出），战斗回落首特性；不回填、不改数据。
ALTER TABLE pet_instances ADD COLUMN ability TEXT;
