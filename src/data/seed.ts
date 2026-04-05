import {
  type DailyReview,
  type FocusSession,
  type LearningItem,
  type Note,
  type Project,
  type SettingsState,
  type Task,
  type TimerModeId,
  type TimerState,
  type WorkspaceState,
  timerModes,
} from '../types'

function isoDate(offset = 0) {
  const value = new Date()
  value.setDate(value.getDate() + offset)
  return value.toISOString().slice(0, 10)
}

function isoTime(hoursOffset = 0) {
  const value = new Date()
  value.setHours(value.getHours() + hoursOffset)
  return value.toISOString()
}

function baseTimerState(modeId: TimerModeId): TimerState {
  const mode = timerModes.find((entry) => entry.id === modeId) ?? timerModes[0]

  return {
    modeId,
    durationSeconds: mode.focusMinutes * 60,
    remainingSeconds: mode.focusMinutes * 60,
    isRunning: false,
    linkedTaskId: null,
    startedAt: null,
    endsAt: null,
    sessionStartedAt: null,
  }
}

export const seedProjects: Project[] = [
  {
    id: 'project-dailyforge',
    name: 'DailyForge MVP',
    description:
      'Ship the first desktop-ready productivity workspace with tasks, notes, focus, and reviews.',
    color: '#38bdf8',
    status: 'Active',
    targetDate: isoDate(18),
    progressPercent: 68,
    createdAt: isoTime(-120),
    updatedAt: isoTime(-2),
  },
  {
    id: 'project-content-lab',
    name: 'Content Lab',
    description:
      'Build reusable assets, scripts, and learning notes for short-form editing and publishing.',
    color: '#f59e0b',
    status: 'Active',
    targetDate: isoDate(10),
    progressPercent: 41,
    createdAt: isoTime(-200),
    updatedAt: isoTime(-14),
  },
  {
    id: 'project-portfolio',
    name: 'Portfolio Refresh',
    description:
      'Update showcase case studies, screenshots, and copy for upcoming applications.',
    color: '#22c55e',
    status: 'On Hold',
    targetDate: isoDate(25),
    progressPercent: 24,
    createdAt: isoTime(-260),
    updatedAt: isoTime(-40),
  },
]

export const seedTasks: Task[] = [
  {
    id: 'task-shell',
    title: 'Lock the app shell and desktop routing flow',
    description:
      'Finalize sidebar, top bar, search trigger, and responsive layout before feature pages drift apart.',
    priority: 'Critical',
    status: 'Today',
    dueDate: isoDate(0),
    projectId: 'project-dailyforge',
    estimatedMinutes: 90,
    actualMinutes: 30,
    tags: ['layout', 'routing'],
    createdAt: isoTime(-96),
    updatedAt: isoTime(-1),
    completedAt: null,
  },
  {
    id: 'task-board',
    title: 'Shape the Tasks board interaction states',
    description:
      'Design list and kanban parity so a task can move without opening a heavy modal.',
    priority: 'High',
    status: 'In Progress',
    dueDate: isoDate(1),
    projectId: 'project-dailyforge',
    estimatedMinutes: 120,
    actualMinutes: 65,
    tags: ['tasks', 'ux'],
    createdAt: isoTime(-70),
    updatedAt: isoTime(-3),
    completedAt: null,
  },
  {
    id: 'task-overdue',
    title: 'Review overdue notification cadence',
    description:
      'Morning reminders feel noisy when more than five tasks are overdue. Tighten the rule set.',
    priority: 'High',
    status: 'Backlog',
    dueDate: isoDate(-2),
    projectId: 'project-dailyforge',
    estimatedMinutes: 45,
    actualMinutes: 0,
    tags: ['notifications'],
    createdAt: isoTime(-140),
    updatedAt: isoTime(-26),
    completedAt: null,
  },
  {
    id: 'task-review',
    title: 'Draft shutdown review prompts',
    description:
      'Keep the evening review tight: wins, blockers, lesson, and tomorrow first task.',
    priority: 'Medium',
    status: 'Today',
    dueDate: isoDate(0),
    projectId: 'project-dailyforge',
    estimatedMinutes: 35,
    actualMinutes: 0,
    tags: ['reviews', 'copy'],
    createdAt: isoTime(-32),
    updatedAt: isoTime(-4),
    completedAt: null,
  },
  {
    id: 'task-notes',
    title: 'Capture editor workflow notes from user testing',
    description:
      'Collect friction points around metadata, autosave trust, and quick note capture.',
    priority: 'Medium',
    status: 'Backlog',
    dueDate: isoDate(2),
    projectId: 'project-dailyforge',
    estimatedMinutes: 50,
    actualMinutes: 0,
    tags: ['notes', 'research'],
    createdAt: isoTime(-28),
    updatedAt: isoTime(-9),
    completedAt: null,
  },
  {
    id: 'task-learning',
    title: 'Outline CapCut transition practice routine',
    description:
      'Break the practice sequence into drills, reference clips, and export targets.',
    priority: 'Low',
    status: 'Today',
    dueDate: isoDate(3),
    projectId: 'project-content-lab',
    estimatedMinutes: 40,
    actualMinutes: 10,
    tags: ['learning'],
    createdAt: isoTime(-52),
    updatedAt: isoTime(-11),
    completedAt: null,
  },
  {
    id: 'task-export',
    title: 'Resolve broken export handoff',
    description:
      'The portfolio image export path is blocked by inconsistent file naming from the design tool.',
    priority: 'Critical',
    status: 'Blocked',
    dueDate: isoDate(1),
    projectId: 'project-portfolio',
    estimatedMinutes: 60,
    actualMinutes: 15,
    tags: ['blocked', 'assets'],
    createdAt: isoTime(-84),
    updatedAt: isoTime(-8),
    completedAt: null,
  },
  {
    id: 'task-project-tab',
    title: 'Complete project workspace tab anatomy',
    description:
      'Overview, tasks, notes, issues, and milestones need consistent empty states.',
    priority: 'Medium',
    status: 'Done',
    dueDate: isoDate(-1),
    projectId: 'project-dailyforge',
    estimatedMinutes: 80,
    actualMinutes: 92,
    tags: ['projects'],
    createdAt: isoTime(-118),
    updatedAt: isoTime(-15),
    completedAt: isoTime(-12),
  },
]

export const seedNotes: Note[] = [
  {
    id: 'note-wireframes',
    title: 'Dashboard tension points',
    content:
      '# Core rule\nKeep every morning action above the fold.\n\n- Top priorities need visual weight\n- Overdue items must read as risk, not noise\n- Quick capture cannot open a full page\n\n- [ ] Test mobile collapse for the sidebar',
    type: 'Feature Spec',
    projectId: 'project-dailyforge',
    tags: ['dashboard', 'ux'],
    pinned: true,
    createdAt: isoTime(-44),
    updatedAt: isoTime(-2),
  },
  {
    id: 'note-focus',
    title: 'Focus session experiment',
    content:
      '## Observation\nThe timer works better when the linked task is chosen before the countdown starts.\n\n- Use a calm page\n- Surface session history below the fold\n- Persist interruptions for honest review',
    type: 'Research Note',
    projectId: 'project-dailyforge',
    tags: ['focus'],
    pinned: false,
    createdAt: isoTime(-60),
    updatedAt: isoTime(-18),
  },
  {
    id: 'note-capcut',
    title: 'CapCut practice log',
    content:
      '## Drill list\n- Speed ramp basics\n- Mask transitions\n- Subtitle timing\n\nNext: recreate two transitions from a saved reference clip.',
    type: 'Learning Note',
    projectId: 'project-content-lab',
    tags: ['capcut', 'practice'],
    pinned: false,
    createdAt: isoTime(-22),
    updatedAt: isoTime(-6),
  },
  {
    id: 'note-portfolio',
    title: 'Portfolio case study rewrite',
    content:
      'Need a cleaner story arc:\n1. Challenge\n2. Constraints\n3. Decisions\n4. Outcome\n\nCurrent copy sounds like a task list, not a case study.',
    type: 'Decision Log',
    projectId: 'project-portfolio',
    tags: ['portfolio', 'writing'],
    pinned: false,
    createdAt: isoTime(-80),
    updatedAt: isoTime(-24),
  },
]

export const seedLearningItems: LearningItem[] = [
  {
    id: 'learning-capcut',
    title: 'CapCut motion editing',
    topic: 'CapCut',
    stage: 'Intermediate',
    progressPercent: 56,
    nextStep: 'Rebuild three reference transitions from scratch and compare timing.',
    resourceLink: 'https://example.com/capcut-playlist',
    targetCompletionDate: isoDate(12),
    createdAt: isoTime(-88),
    updatedAt: isoTime(-5),
  },
  {
    id: 'learning-tauri',
    title: 'Tauri desktop integration',
    topic: 'Rust + Tauri',
    stage: 'Beginner',
    progressPercent: 22,
    nextStep: 'Wire local notification APIs after the task detail drawer is stable.',
    resourceLink: 'https://example.com/tauri-guide',
    targetCompletionDate: isoDate(16),
    createdAt: isoTime(-48),
    updatedAt: isoTime(-12),
  },
  {
    id: 'learning-writing',
    title: 'Product UX writing',
    topic: 'UX',
    stage: 'Applied Practice',
    progressPercent: 78,
    nextStep: 'Tighten empty states so each one gives a next action, not just an explanation.',
    resourceLink: 'https://example.com/ux-writing',
    targetCompletionDate: isoDate(8),
    createdAt: isoTime(-110),
    updatedAt: isoTime(-20),
  },
]

export const seedReviews: DailyReview[] = [
  {
    id: 'review-yesterday',
    reviewDate: isoDate(-1),
    wins: 'Finished the project workspace tab structure and clarified the DailyForge MVP screen list.',
    blockers: 'Timer persistence still feels brittle when the app refreshes during a session.',
    lessonsLearned: 'The dashboard only works when task priorities and project states are already trustworthy.',
    tomorrowFirstTask: 'Ship the app shell and tasks page skeleton before touching more modules.',
    moodEnergy: 'Focused',
    createdAt: isoTime(-16),
    updatedAt: isoTime(-16),
  },
]

export const seedFocusSessions: FocusSession[] = [
  {
    id: 'session-1',
    taskId: 'task-board',
    modeId: 'pomodoro',
    startTime: isoTime(-7),
    endTime: isoTime(-6.5),
    durationMinutes: 25,
    result: 'completed',
  },
  {
    id: 'session-2',
    taskId: 'task-shell',
    modeId: 'deep-work',
    startTime: isoTime(-30),
    endTime: isoTime(-29.17),
    durationMinutes: 50,
    result: 'completed',
  },
]

export const seedSettings: SettingsState = {
  theme: 'dark',
  notifications: true,
  timerDefault: 'pomodoro',
}

export function createDefaultTimerState(
  modeId: TimerModeId = seedSettings.timerDefault,
) {
  return baseTimerState(modeId)
}

export function createSeedWorkspace(): WorkspaceState {
  return {
    tasks: seedTasks,
    projects: seedProjects,
    notes: seedNotes,
    learningItems: seedLearningItems,
    reviews: seedReviews,
    focusSessions: seedFocusSessions,
    settings: seedSettings,
    timer: createDefaultTimerState(seedSettings.timerDefault),
  }
}
