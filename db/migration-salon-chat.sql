-- Live chat between salon clients and salon owner via Telegram

CREATE TABLE IF NOT EXISTS salon_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  client_name text NOT NULL DEFAULT 'Клиент',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_chat_sessions_salon_id_idx ON salon_chat_sessions(salon_id);

CREATE TABLE IF NOT EXISTS salon_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES salon_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('client', 'salon')),
  content text NOT NULL,
  telegram_message_id integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_chat_messages_session_id_idx ON salon_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS salon_chat_messages_telegram_id_idx ON salon_chat_messages(telegram_message_id);
