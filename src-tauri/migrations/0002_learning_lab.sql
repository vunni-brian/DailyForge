CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  completion_percent INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  total_study_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_studied_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_sources (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  raw_content TEXT,
  source_url TEXT,
  file_path TEXT,
  extracted_text TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  summary_short TEXT NOT NULL DEFAULT '',
  summary_detailed TEXT NOT NULL DEFAULT '',
  key_concepts_json TEXT NOT NULL DEFAULT '[]',
  definitions_json TEXT NOT NULL DEFAULT '[]',
  action_points_json TEXT NOT NULL DEFAULT '[]',
  generated_at TEXT NOT NULL,
  source_version_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_flashcards (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  tags_json TEXT NOT NULL DEFAULT '[]',
  source_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_quizzes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  score_percent INTEGER,
  completed_at TEXT,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  order_index INTEGER NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES learning_quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_tutor_threads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_tutor_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES learning_tutor_threads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_reviews (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  review_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  confidence_before INTEGER,
  confidence_after INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_sources_session_id ON learning_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_summaries_session_id ON learning_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_flashcards_session_id ON learning_flashcards(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_quizzes_session_id ON learning_quizzes(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_tutor_threads_session_id ON learning_tutor_threads(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_reviews_session_id ON learning_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_flashcards_next_review_at ON learning_flashcards(next_review_at);

INSERT INTO learning_sessions (
  id,
  title,
  subject,
  description,
  goals,
  status,
  completion_percent,
  confidence_score,
  total_study_minutes,
  created_at,
  updated_at,
  last_studied_at
)
SELECT
  id,
  title,
  topic,
  next_step,
  '',
  CASE
    WHEN stage = 'Completed' THEN 'completed'
    ELSE 'active'
  END,
  progress_percent,
  0,
  0,
  created_at,
  updated_at,
  updated_at
FROM learning_items
WHERE NOT EXISTS (
  SELECT 1
  FROM learning_sessions
  WHERE learning_sessions.id = learning_items.id
);

INSERT INTO learning_sources (
  id,
  session_id,
  type,
  title,
  raw_content,
  source_url,
  file_path,
  extracted_text,
  metadata_json,
  created_at
)
SELECT
  id || '-legacy-note',
  id,
  CASE
    WHEN COALESCE(resource_link, '') <> '' THEN 'url'
    ELSE 'note'
  END,
  CASE
    WHEN COALESCE(resource_link, '') <> '' THEN 'Imported resource'
    ELSE 'Imported tracker note'
  END,
  CASE
    WHEN COALESCE(next_step, '') = '' THEN description
    WHEN COALESCE(description, '') = '' THEN next_step
    ELSE description || char(10) || char(10) || 'Next step: ' || next_step
  END,
  NULLIF(resource_link, ''),
  NULL,
  CASE
    WHEN COALESCE(next_step, '') = '' THEN description
    WHEN COALESCE(description, '') = '' THEN next_step
    ELSE description || char(10) || char(10) || 'Next step: ' || next_step
  END,
  json_object('importedFrom', 'learning_items'),
  updated_at
FROM (
  SELECT
    id,
    COALESCE(topic, '') AS topic,
    COALESCE(next_step, '') AS next_step,
    COALESCE(resource_link, '') AS resource_link,
    COALESCE(title, '') AS title,
    COALESCE('', '') AS description,
    updated_at
  FROM learning_items
) legacy_items
WHERE (
  COALESCE(next_step, '') <> ''
  OR COALESCE(resource_link, '') <> ''
)
AND NOT EXISTS (
  SELECT 1
  FROM learning_sources
  WHERE learning_sources.id = legacy_items.id || '-legacy-note'
);
