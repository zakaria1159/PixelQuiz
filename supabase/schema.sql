-- Questions table
-- Common fields are top-level columns; type-specific fields live in `data` (jsonb)
CREATE TABLE IF NOT EXISTS questions (
  id          TEXT NOT NULL,
  lang        TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'fr')),
  category    TEXT NOT NULL,
  type        TEXT NOT NULL,
  question    TEXT NOT NULL,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit  INTEGER,
  explanation TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (id, lang)
);

CREATE INDEX IF NOT EXISTS idx_questions_lang     ON questions (lang);
CREATE INDEX IF NOT EXISTS idx_questions_lang_cat ON questions (lang, category);
CREATE INDEX IF NOT EXISTS idx_questions_type     ON questions (type);
CREATE INDEX IF NOT EXISTS idx_questions_diff     ON questions (difficulty);

-- Row-level security: disable for service role usage (admin dashboard + game server)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow full access via service role key (used server-side only)
CREATE POLICY "service role full access"
  ON questions
  USING (true)
  WITH CHECK (true);
