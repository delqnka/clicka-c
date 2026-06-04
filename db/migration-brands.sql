-- Brand domains selected by each salon (Clearbit logo API)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS brand_domains jsonb NOT NULL DEFAULT '[]'::jsonb;
