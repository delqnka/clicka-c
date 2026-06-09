-- Add image support to salon chat messages
ALTER TABLE salon_chat_messages
  ADD COLUMN IF NOT EXISTS image_url text;
