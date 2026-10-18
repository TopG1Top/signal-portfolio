ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'unknown';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS uncertainties jsonb NOT NULL DEFAULT '[]';
