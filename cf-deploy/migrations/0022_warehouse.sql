-- migrations/0022_warehouse.sql
ALTER TABLE pokedex ADD COLUMN carried INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pokedex_child_carried ON pokedex(child_id, carried);

-- 回填存量数据：主宠形态行（form:*）不计入；
-- 每个孩子按获得顺序（优先 species_acquisitions.first_epoch，缺失则用 pokedex.unlocked_at）最早 4 只留携带 (carried=1)，其余进仓库 (carried=0)。
WITH collection_entries AS (
  SELECT
    p.child_id,
    p.entry_key,
    CAST(SUBSTR(p.entry_key, INSTR(p.entry_key, ':') + 1) AS INTEGER) AS species_no,
    p.unlocked_at
  FROM pokedex p
  WHERE p.entry_key NOT LIKE 'form:%'
),
ranked AS (
  SELECT
    ce.child_id,
    ce.entry_key,
    ROW_NUMBER() OVER (
      PARTITION BY ce.child_id
      ORDER BY
        COALESCE(
          sa.first_epoch,
          CAST(strftime('%s', ce.unlocked_at) AS INTEGER),
          9999999999
        ) ASC,
        COALESCE(ce.unlocked_at, '9999-99-99') ASC,
        ce.species_no ASC
    ) AS rn
  FROM collection_entries ce
  LEFT JOIN species_acquisitions sa
    ON sa.child_id = ce.child_id AND sa.species_no = ce.species_no
)
UPDATE pokedex
SET carried = CASE
  WHEN EXISTS (
    SELECT 1 FROM ranked r
    WHERE r.child_id = pokedex.child_id
      AND r.entry_key = pokedex.entry_key
      AND r.rn <= 4
  ) THEN 1
  ELSE 0
END;
