CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  target_date TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT,
  project_id TEXT,
  estimated_minutes INTEGER,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  project_id TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  next_step TEXT NOT NULL DEFAULT '',
  resource_link TEXT NOT NULL DEFAULT '',
  target_completion_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_reviews (
  id TEXT PRIMARY KEY,
  review_date TEXT NOT NULL UNIQUE,
  wins TEXT NOT NULL DEFAULT '',
  blockers TEXT NOT NULL DEFAULT '',
  lessons_learned TEXT NOT NULL DEFAULT '',
  tomorrow_first_task TEXT NOT NULL DEFAULT '',
  mood_energy TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  mode_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  result TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL,
  notifications INTEGER NOT NULL DEFAULT 1,
  timer_default TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timer_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  remaining_seconds INTEGER NOT NULL,
  is_running INTEGER NOT NULL DEFAULT 0,
  linked_task_id TEXT,
  started_at TEXT,
  ends_at TEXT,
  session_started_at TEXT,
  FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
