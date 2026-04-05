export const DAILYFORGE_DB_PATH = 'sqlite:dailyforge.db'

export const tableNames = {
  projects: 'projects',
  tasks: 'tasks',
  notes: 'notes',
  learningItems: 'learning_items',
  dailyReviews: 'daily_reviews',
  focusSessions: 'focus_sessions',
  settings: 'app_settings',
  timerState: 'timer_state',
} as const
