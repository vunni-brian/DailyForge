export const taskStatuses = [
  'Backlog',
  'Today',
  'In Progress',
  'Blocked',
  'Done',
] as const

export const taskPriorities = ['Low', 'Medium', 'High', 'Critical'] as const

export const projectStatuses = [
  'Planned',
  'Active',
  'On Hold',
  'Completed',
  'Archived',
] as const

export const noteTypes = [
  'Quick Note',
  'Research Note',
  'Meeting Note',
  'Feature Spec',
  'Learning Note',
  'Decision Log',
  'Issue Log',
] as const

export const learningStages = [
  'Not Started',
  'Beginner',
  'Intermediate',
  'Advanced',
  'Applied Practice',
  'Completed',
] as const

export const timerModes = [
  { id: 'pomodoro', label: 'Pomodoro', focusMinutes: 25, breakMinutes: 5 },
  { id: 'deep-work', label: 'Deep Work', focusMinutes: 50, breakMinutes: 10 },
  { id: 'custom', label: 'Custom', focusMinutes: 40, breakMinutes: 10 },
] as const

export type TaskStatus = (typeof taskStatuses)[number]
export type TaskPriority = (typeof taskPriorities)[number]
export type ProjectStatus = (typeof projectStatuses)[number]
export type NoteType = (typeof noteTypes)[number]
export type LearningStage = (typeof learningStages)[number]
export type TimerModeId = (typeof timerModes)[number]['id']
export type Theme = 'dark' | 'light'

export interface Project {
  id: string
  name: string
  description: string
  color: string
  status: ProjectStatus
  targetDate: string | null
  progressPercent: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  projectId: string | null
  estimatedMinutes: number | null
  actualMinutes: number
  tags: string[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface Note {
  id: string
  title: string
  content: string
  type: NoteType
  projectId: string | null
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface LearningItem {
  id: string
  title: string
  topic: string
  stage: LearningStage
  progressPercent: number
  nextStep: string
  resourceLink: string
  targetCompletionDate: string | null
  createdAt: string
  updatedAt: string
}

export interface DailyReview {
  id: string
  reviewDate: string
  wins: string
  blockers: string
  lessonsLearned: string
  tomorrowFirstTask: string
  moodEnergy: string
  createdAt: string
  updatedAt: string
}

export interface FocusSession {
  id: string
  taskId: string | null
  modeId: TimerModeId
  startTime: string
  endTime: string
  durationMinutes: number
  result: 'completed' | 'interrupted'
}

export interface TimerState {
  modeId: TimerModeId
  durationSeconds: number
  remainingSeconds: number
  isRunning: boolean
  linkedTaskId: string | null
  startedAt: string | null
  endsAt: string | null
  sessionStartedAt: string | null
}

export interface SettingsState {
  theme: Theme
  notifications: boolean
  timerDefault: TimerModeId
}

export interface ComposerState {
  mode: 'task' | 'note' | null
}

export interface WorkspaceState {
  tasks: Task[]
  projects: Project[]
  notes: Note[]
  learningItems: LearningItem[]
  reviews: DailyReview[]
  focusSessions: FocusSession[]
  settings: SettingsState
  timer: TimerState
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  dueDate?: string | null
  projectId?: string | null
}

export interface CreateNoteInput {
  title: string
  content?: string
  projectId?: string | null
}

export interface ReviewDraft {
  wins: string
  blockers: string
  lessonsLearned: string
  tomorrowFirstTask: string
  moodEnergy: string
}
