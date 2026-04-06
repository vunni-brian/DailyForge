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
import {
  getWorkspaceCorePersistenceFingerprint,
  workspaceRepository,
} from '../repositories/workspace.repository'
import type {
  ComposerState,
  CreateNoteInput,
  CreateProjectInput,
  DailyReview,
  FocusSession,
  Note,
  Project,
  ReviewDraft,
  SettingsState,
  TimerModeId,
  TimerState,
  WorkspaceCoreState,
} from '../types'
import { useTasks } from '../features/tasks/context'

interface AppContextValue {
  projects: Project[]
  notes: Note[]
  reviews: DailyReview[]
  focusSessions: FocusSession[]
  settings: SettingsState
  timer: TimerState
  composer: ComposerState
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

function createSeedWorkspaceCore(): WorkspaceCoreState {
  const { tasks: _tasks, ...core } = createSeedWorkspace()
  return core
}

export function AppProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState<WorkspaceCoreState>(createSeedWorkspaceCore)
  const [composer, setComposer] = useState<ComposerState>({ mode: null })
  const [hydrated, setHydrated] = useState(false)
  const lastSavedFingerprint = useRef('')
  const pendingSave = useRef<Promise<void>>(Promise.resolve())
  const { hydrated: tasksHydrated, replaceTasks, tasks } = useTasks()

  const { projects, notes, reviews, focusSessions, settings, timer } = workspace

  useEffect(() => {
    let active = true

    void workspaceRepository
      .loadCore()
      .then((loadedWorkspace) => {
        if (!active) {
          return
        }

        setWorkspace(loadedWorkspace)
        lastSavedFingerprint.current =
          getWorkspaceCorePersistenceFingerprint(loadedWorkspace)
        setHydrated(true)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        console.error('Failed to load persisted workspace core.', error)
        lastSavedFingerprint.current =
          getWorkspaceCorePersistenceFingerprint(createSeedWorkspaceCore())
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

    const nextFingerprint = getWorkspaceCorePersistenceFingerprint(workspace)

    if (nextFingerprint === lastSavedFingerprint.current) {
      return
    }

    pendingSave.current = pendingSave.current
      .catch(() => undefined)
      .then(async () => {
        if (nextFingerprint === lastSavedFingerprint.current) {
          return
        }

        await workspaceRepository.saveCore(workspace)
        lastSavedFingerprint.current = nextFingerprint
      })
      .catch((error) => {
        console.error('Failed to persist workspace core.', error)
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

  const exportWorkspace = () => workspaceRepository.export({ ...workspace, tasks })

  const importWorkspace = async (serialized: string) => {
    const nextWorkspace = workspaceRepository.parse(serialized)
    const { tasks: nextTasks, ...nextCore } = nextWorkspace

    await workspaceRepository.saveCore(nextCore)
    await workspaceRepository.saveTasks(nextTasks)

    lastSavedFingerprint.current =
      getWorkspaceCorePersistenceFingerprint(nextCore)
    setWorkspace(nextCore)
    replaceTasks(nextTasks, { persisted: true })
    setComposer({ mode: null })
  }

  const resetWorkspace = async () => {
    const nextWorkspace = createSeedWorkspace()
    const { tasks: nextTasks, ...nextCore } = nextWorkspace

    await workspaceRepository.saveCore(nextCore)
    await workspaceRepository.saveTasks(nextTasks)

    lastSavedFingerprint.current =
      getWorkspaceCorePersistenceFingerprint(nextCore)
    setWorkspace(nextCore)
    replaceTasks(nextTasks, { persisted: true })
    setComposer({ mode: null })
  }

  if (!hydrated || !tasksHydrated) {
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
        projects,
        notes,
        reviews,
        focusSessions,
        settings,
        timer,
        composer,
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
