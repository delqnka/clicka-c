-- FAQ, удобства за посетители и допълнителна информация за публичния сайт
-- Пусни всички редове по-долу в Neon SQL Editor (не само имената на колоните).

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS faq_items jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS visitor_info jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS visitor_additional_info text;
