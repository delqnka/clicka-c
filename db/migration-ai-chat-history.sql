ALTER TABLE salons ADD COLUMN IF NOT EXISTS ai_chat_history jsonb DEFAULT '[]'::jsonb;
