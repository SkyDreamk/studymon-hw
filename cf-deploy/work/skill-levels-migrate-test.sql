-- 测试库专用数据迁移：unlocked_moves 里每个名字 → move_levels[name]=2；其余招式不写入（默认 1 级）。
-- 只改 move_levels 一列，不动碎片、经验、unlocked_moves。正式库不用本文件。
UPDATE children SET move_levels = COALESCE((SELECT json_group_object(value, 2) FROM json_each(children.unlocked_moves)), '{}');
