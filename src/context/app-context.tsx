import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createSeedWorkspace } from '../data/seed'
import { focusService } from '../services/focus.service'
import { noteService } from '../services/note.service'
import { projectService } from '../services/project.service'
import { reviewService } from '../services/review.service'
import { settingsService } from '../services/settings.service'
import { taskService } from '../services/task.service'
import {
  getWorkspacePersistenceFingerprint,
  workspaceRepository,
} from '../repositories/workspace.repository'
import type {
  ComposerState,
  CreateNoteInput,
  CreateProjectInput,
  CreateTaskInput,
  DailyReview,
  FocusSession,
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
  reviews: DailyReview[]
  focusSessions: FocusSession[]
  settings: SettingsState
  timer: TimerState
  composer: ComposerState
  addTask: (input: CreateTaskInput) => void
  updateTask: (taskId: string, patch: Partial<Task>) => void
  moveTask: (taskId: string, status: TaskStatus) => void
  addProject: (input: CreateProjectInput) => void
  updateProject: (projectId: string, patch: Partial<Project>) => void
  addNote: (input: CreateNoteInput) => void
  updateNote: (noteId: string, patch: Partial<Note>) => void
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
  importWorkspace: (serialized: string) => Promise<void>
  resetWorkspace: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState(createSeedWorkspace)
  const [composer, setComposer] = useState<ComposerState>({ mode: null })
  const [hydrated, setHydrated] = useState(false)
  const lastSavedFingerprint = useRef('')
  const pendingSave = useRef<Promise<void>>(Promise.resolve())

  const {
    tasks,
    projects,
    notes,
    reviews,
    focusSessions,
    settings,
    timer,
  } = workspace

  useEffect(() => {
    let active = true

    void workspaceRepository
      .load()
      .then((loadedWorkspace) => {
        if (!active) {
          return
        }

        setWorkspace(loadedWorkspace)
        lastSavedFingerprint.current =
          getWorkspacePersistenceFingerprint(loadedWorkspace)
        setHydrated(true)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        console.error('Failed to load persisted workspace.', error)
        lastSavedFingerprint.current =
          getWorkspacePersistenceFingerprint(createSeedWorkspace())
        setHydrated(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const nextFingerprint = getWorkspacePersistenceFingerprint(workspace)

    if (nextFingerprint === lastSavedFingerprint.current) {
      return
    }

    pendingSave.current = pendingSave.current
      .catch(() => undefined)
      .then(async () => {
        if (nextFingerprint === lastSavedFingerprint.current) {
          return
        }

        await workspaceRepository.save(workspace)
        lastSavedFingerprint.current = nextFingerprint
      })
      .catch((error) => {
        console.error('Failed to persist workspace.', error)
      })
  }, [hydrated, workspace])

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

  const addProject = (input: CreateProjectInput) => {
    setWorkspace((current) => projectService.createProject(current, input))
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

  const exportWorkspace = () => workspaceRepository.export(workspace)

  const importWorkspace = async (serialized: string) => {
    const nextWorkspace = await workspaceRepository.import(serialized)
    lastSavedFingerprint.current =
      getWorkspacePersistenceFingerprint(nextWorkspace)
    setWorkspace(nextWorkspace)
    setComposer({ mode: null })
  }

  const resetWorkspace = async () => {
    const nextWorkspace = await workspaceRepository.reset()
    lastSavedFingerprint.current =
      getWorkspacePersistenceFingerprint(nextWorkspace)
    setWorkspace(nextWorkspace)
    setComposer({ mode: null })
  }

  if (!hydrated) {
    return (
      <div className="app-loading-screen">
        <div className="panel app-loading-panel">
          <strong>Opening your workspace...</strong>
          <p>DailyForge is loading saved tasks, projects, notes, and settings.</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider
      value={{
        tasks,
        projects,
        notes,
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
