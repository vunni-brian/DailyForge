import { createDefaultTimerState, createSeedWorkspace } from '../data/seed'
import { getDatabase, isDesktopRuntime } from '../db/client'
import { nowIso } from '../lib/core'
import type { Task, TimerState, WorkspaceCoreState, WorkspaceState } from '../types'
import { tauriFocusRepository } from './focus.repository'
import { tauriNoteRepository } from './note.repository'
import { tauriProjectRepository } from './project.repository'
import { tauriReviewRepository } from './review.repository'
import { tauriSettingsRepository } from './settings.repository'
import { runInTransaction } from './sqlite-helpers'
import { tauriTaskRepository } from './task.repository'

const STORAGE_KEY = 'dailyforge.workspace'
const STORAGE_VERSION = 1

let persistenceQueue: Promise<void> = Promise.resolve()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createSeedWorkspaceCore(): WorkspaceCoreState {
  const { tasks: _tasks, ...core } = createSeedWorkspace()
  return core
}

function composeWorkspace(core: WorkspaceCoreState, tasks: Task[]): WorkspaceState {
  return {
    ...core,
    tasks,
  }
}

function splitWorkspace(workspace: WorkspaceState) {
  const { tasks, ...core } = workspace
  return { core, tasks }
}

function normalizeWorkspaceCore(value: unknown): WorkspaceCoreState {
  const fallback = createSeedWorkspaceCore()

  if (!isObject(value)) {
    return fallback
  }

  return {
    projects: Array.isArray(value.projects) ? value.projects : fallback.projects,
    notes: Array.isArray(value.notes) ? value.notes : fallback.notes,
    reviews: Array.isArray(value.reviews) ? value.reviews : fallback.reviews,
    focusSessions: Array.isArray(value.focusSessions)
      ? value.focusSessions
      : fallback.focusSessions,
    settings: isObject(value.settings)
      ? {
          ...fallback.settings,
          ...value.settings,
        }
      : fallback.settings,
    timer: isObject(value.timer)
      ? {
          ...createDefaultTimerState(fallback.settings.timerDefault),
          ...value.timer,
        }
      : fallback.timer,
  }
}

function normalizeWorkspace(value: unknown): WorkspaceState {
  const fallback = createSeedWorkspace()

  if (!isObject(value)) {
    return fallback
  }

  return composeWorkspace(
    normalizeWorkspaceCore(value),
    Array.isArray(value.tasks) ? value.tasks : fallback.tasks,
  )
}

function rehydrateTimer(workspace: WorkspaceState): WorkspaceState {
  if (!workspace.timer.isRunning || !workspace.timer.endsAt) {
    return workspace
  }

  return {
    ...workspace,
    timer: {
      ...workspace.timer,
      remainingSeconds: Math.max(
        0,
        Math.ceil((new Date(workspace.timer.endsAt).getTime() - Date.now()) / 1000),
      ),
    },
  }
}

function parseWorkspace(raw: string, strict: boolean) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const data = isObject(parsed) && isObject(parsed.data) ? parsed.data : parsed

    return rehydrateTimer(normalizeWorkspace(data))
  } catch {
    if (strict) {
      throw new Error('The selected file is not a valid DailyForge backup.')
    }

    return rehydrateTimer(createSeedWorkspace())
  }
}

function normalizeTimerForPersistence(timer: TimerState): TimerState {
  if (!timer.isRunning) {
    return timer
  }

  return {
    ...timer,
    remainingSeconds: 0,
  }
}

function normalizeWorkspaceCoreForPersistence(
  core: WorkspaceCoreState,
): WorkspaceCoreState {
  return {
    ...core,
    timer: normalizeTimerForPersistence(core.timer),
  }
}

function normalizeWorkspaceForPersistence(workspace: WorkspaceState): WorkspaceState {
  return composeWorkspace(
    normalizeWorkspaceCoreForPersistence(splitWorkspace(workspace).core),
    workspace.tasks,
  )
}

function serializeWorkspaceSnapshot(workspace: WorkspaceState) {
  return window.localStorage.setItem(STORAGE_KEY, serializeWorkspace(workspace))
}

function loadBrowserWorkspaceSnapshot() {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return null
  }

  return rehydrateTimer(parseWorkspace(stored, false))
}

function loadBrowserWorkspace() {
  return loadBrowserWorkspaceSnapshot() ?? createSeedWorkspace()
}

function queuePersistence<T>(write: () => Promise<T>): Promise<T> {
  const next = persistenceQueue.catch(() => undefined).then(write)
  persistenceQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

async function loadTauriWorkspaceCore() {
  const db = await getDatabase()
  const [projects, notes, reviews, focusSessions, settings, timer] =
    await Promise.all([
      tauriProjectRepository.listProjects(db),
      tauriNoteRepository.listNotes(db),
      tauriReviewRepository.listReviews(db),
      tauriFocusRepository.listFocusSessions(db),
      tauriSettingsRepository.loadSettings(db),
      tauriFocusRepository.loadTimerState(db),
    ])

  return splitWorkspace(
    rehydrateTimer({
      tasks: [],
      projects,
      notes,
      reviews,
      focusSessions,
      settings,
      timer,
    }),
  ).core
}

async function loadTauriTasks() {
  const db = await getDatabase()
  return tauriTaskRepository.listTasks(db)
}

async function saveTauriWorkspaceCore(core: WorkspaceCoreState) {
  const db = await getDatabase()
  const persisted = normalizeWorkspaceCoreForPersistence(core)

  await runInTransaction(db, async () => {
    await tauriProjectRepository.replaceProjects(db, persisted.projects)
    await tauriNoteRepository.replaceNotes(db, persisted.notes)
    await tauriReviewRepository.replaceReviews(db, persisted.reviews)
    await tauriFocusRepository.replaceFocusSessions(db, persisted.focusSessions)
    await tauriSettingsRepository.saveSettings(db, persisted.settings)
    await tauriFocusRepository.saveTimerState(db, persisted.timer)
  })
}

async function saveTauriTasks(tasks: Task[]) {
  const db = await getDatabase()
  await tauriTaskRepository.replaceTasks(db, tasks)
}

function mergeBrowserWorkspace(mutator: (current: WorkspaceState) => WorkspaceState) {
  const current = loadBrowserWorkspaceSnapshot() ?? createSeedWorkspace()
  const next = normalizeWorkspaceForPersistence(mutator(current))
  serializeWorkspaceSnapshot(next)
}

export function serializeWorkspace(workspace: WorkspaceState) {
  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      exportedAt: nowIso(),
      data: normalizeWorkspaceForPersistence(workspace),
    },
    null,
    2,
  )
}

export function getWorkspacePersistenceFingerprint(workspace: WorkspaceState) {
  return JSON.stringify(normalizeWorkspaceForPersistence(workspace))
}

export function getWorkspaceCorePersistenceFingerprint(core: WorkspaceCoreState) {
  return JSON.stringify(normalizeWorkspaceCoreForPersistence(core))
}

export const workspaceRepository = {
  parse(serialized: string) {
    return parseWorkspace(serialized, true)
  },

  async loadCore() {
    if (!isDesktopRuntime()) {
      return splitWorkspace(loadBrowserWorkspace()).core
    }

    const browserSnapshot = loadBrowserWorkspaceSnapshot()

    if (browserSnapshot) {
      const { core } = splitWorkspace(browserSnapshot)
      void this.saveCore(core).catch((error) => {
        console.error('Failed to sync browser backup core to SQLite.', error)
      })
      return core
    }

    return loadTauriWorkspaceCore()
  },

  async loadTasks() {
    if (!isDesktopRuntime()) {
      return loadBrowserWorkspace().tasks
    }

    const browserSnapshot = loadBrowserWorkspaceSnapshot()

    if (browserSnapshot) {
      void this.saveTasks(browserSnapshot.tasks).catch((error) => {
        console.error('Failed to sync browser backup tasks to SQLite.', error)
      })
      return browserSnapshot.tasks
    }

    return loadTauriTasks()
  },

  async saveCore(core: WorkspaceCoreState) {
    await queuePersistence(async () => {
      mergeBrowserWorkspace((current) => composeWorkspace(core, current.tasks))

      if (isDesktopRuntime()) {
        await saveTauriWorkspaceCore(core)
      }
    })
  },

  async saveTasks(tasks: Task[]) {
    await queuePersistence(async () => {
      mergeBrowserWorkspace((current) => composeWorkspace(splitWorkspace(current).core, tasks))

      if (isDesktopRuntime()) {
        await saveTauriTasks(tasks)
      }
    })
  },

  async load() {
    const [core, tasks] = await Promise.all([this.loadCore(), this.loadTasks()])
    return composeWorkspace(core, tasks)
  },

  async save(workspace: WorkspaceState) {
    const { core, tasks } = splitWorkspace(workspace)
    await this.saveCore(core)
    await this.saveTasks(tasks)
  },

  export(workspace: WorkspaceState) {
    return serializeWorkspace(workspace)
  },

  async import(serialized: string) {
    const workspace = parseWorkspace(serialized, true)
    await this.save(workspace)
    return workspace
  },

  async reset() {
    const workspace = createSeedWorkspace()
    await this.save(workspace)
    return workspace
  },
}
