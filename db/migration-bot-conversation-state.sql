ALTER TABLE salons ADD COLUMN IF NOT EXISTS bot_conversation_state jsonb DEFAULT NULL;
