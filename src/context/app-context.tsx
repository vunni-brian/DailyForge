import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react'
import { focusService } from '../services/focus.service'
import { learningService } from '../services/learning.service'
import { noteService } from '../services/note.service'
import { projectService } from '../services/project.service'
import { reviewService } from '../services/review.service'
import { settingsService } from '../services/settings.service'
import { taskService } from '../services/task.service'
import { browserWorkspaceRepository } from '../repositories/workspace.repository'
import type {
  ComposerState,
  CreateNoteInput,
  CreateTaskInput,
  DailyReview,
  FocusSession,
  LearningItem,
  Note,
  Project,
  ReviewDraft,
  SettingsState,
  Task,
  TaskStatus,
  TimerModeId,
  TimerState,
} from '../types'

interface AppContextValue {
  tasks: Task[]
  projects: Project[]
  notes: Note[]
  learningItems: LearningItem[]
  reviews: DailyReview[]
  focusSessions: FocusSession[]
  settings: SettingsState
  timer: TimerState
  composer: ComposerState
  addTask: (input: CreateTaskInput) => void
  updateTask: (taskId: string, patch: Partial<Task>) => void
  moveTask: (taskId: string, status: TaskStatus) => void
  addProject: () => void
  updateProject: (projectId: string, patch: Partial<Project>) => void
  addNote: (input: CreateNoteInput) => void
  updateNote: (noteId: string, patch: Partial<Note>) => void
  addLearningItem: () => void
  updateLearningItem: (itemId: string, patch: Partial<LearningItem>) => void
  saveReview: (reviewDate: string, patch: ReviewDraft) => void
  updateSettings: (patch: Partial<SettingsState>) => void
  openComposer: (mode: ComposerState['mode']) => void
  closeComposer: () => void
  setTimerMode: (modeId: TimerModeId) => void
  setLinkedTask: (taskId: string | null) => void
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  exportWorkspace: () => string
  importWorkspace: (serialized: string) => void
  resetWorkspace: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState(() => browserWorkspaceRepository.load())
  const [composer, setComposer] = useState<ComposerState>({ mode: null })

  const {
    tasks,
    projects,
    notes,
    learningItems,
    reviews,
    focusSessions,
    settings,
    timer,
  } = workspace

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    browserWorkspaceRepository.save(workspace)
  }, [workspace])

  useEffect(() => {
    if (!timer.isRunning) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setWorkspace((current) => focusService.refreshTimer(current))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [timer.isRunning])

  const addTask = (input: CreateTaskInput) => {
    setWorkspace((current) => taskService.createTask(current, input))
  }

  const updateTask = (taskId: string, patch: Partial<Task>) => {
    setWorkspace((current) => taskService.updateTask(current, taskId, patch))
  }

  const moveTask = (taskId: string, status: TaskStatus) => {
    setWorkspace((current) => taskService.moveTaskStatus(current, taskId, status))
  }

  const addProject = () => {
    setWorkspace((current) => projectService.createProject(current))
  }

  const updateProject = (projectId: string, patch: Partial<Project>) => {
    setWorkspace((current) =>
      projectService.updateProject(current, projectId, patch),
    )
  }

  const addNote = (input: CreateNoteInput) => {
    setWorkspace((current) => noteService.createNote(current, input))
  }

  const updateNote = (noteId: string, patch: Partial<Note>) => {
    setWorkspace((current) => noteService.updateNote(current, noteId, patch))
  }

  const addLearningItem = () => {
    setWorkspace((current) => learningService.createLearningItem(current))
  }

  const updateLearningItem = (itemId: string, patch: Partial<LearningItem>) => {
    setWorkspace((current) =>
      learningService.updateLearningItem(current, itemId, patch),
    )
  }

  const saveReview = (reviewDate: string, patch: ReviewDraft) => {
    setWorkspace((current) => reviewService.saveReview(current, reviewDate, patch))
  }

  const updateSettings = (patch: Partial<SettingsState>) => {
    setWorkspace((current) => settingsService.updateSettings(current, patch))
  }

  const openComposer = (mode: ComposerState['mode']) => {
    setComposer({ mode })
  }

  const closeComposer = () => {
    setComposer({ mode: null })
  }

  const setTimerMode = (modeId: TimerModeId) => {
    setWorkspace((current) => focusService.setTimerMode(current, modeId))
  }

  const setLinkedTask = (taskId: string | null) => {
    setWorkspace((current) => focusService.setLinkedTask(current, taskId))
  }

  const startTimer = () => {
    setWorkspace((current) => focusService.startTimer(current))
  }

  const pauseTimer = () => {
    setWorkspace((current) => focusService.pauseTimer(current))
  }

  const resetTimer = () => {
    setWorkspace((current) => focusService.resetTimer(current))
  }

  const exportWorkspace = () => browserWorkspaceRepository.export(workspace)

  const importWorkspace = (serialized: string) => {
    setWorkspace(browserWorkspaceRepository.import(serialized))
    setComposer({ mode: null })
  }

  const resetWorkspace = () => {
    setWorkspace(browserWorkspaceRepository.reset())
    setComposer({ mode: null })
  }

  return (
    <AppContext.Provider
      value={{
        tasks,
        projects,
        notes,
        learningItems,
        reviews,
        focusSessions,
        settings,
        timer,
        composer,
        addTask,
        updateTask,
        moveTask,
        addProject,
        updateProject,
        addNote,
        updateNote,
        addLearningItem,
        updateLearningItem,
        saveReview,
        updateSettings,
        openComposer,
        closeComposer,
        setTimerMode,
        setLinkedTask,
        startTimer,
        pauseTimer,
        resetTimer,
        exportWorkspace,
        importWorkspace,
        resetWorkspace,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }

  return context
}
