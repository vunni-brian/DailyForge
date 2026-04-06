import { createDefaultTimerState, createSeedWorkspace } from '../data/seed'
import { getDatabase, isDesktopRuntime } from '../db/client'
import { nowIso } from '../lib/core'
import type { TimerState, WorkspaceState } from '../types'
import { tauriFocusRepository } from './focus.repository'
import { tauriNoteRepository } from './note.repository'
import { tauriProjectRepository } from './project.repository'
import { tauriReviewRepository } from './review.repository'
import { tauriSettingsRepository } from './settings.repository'
import { runInTransaction } from './sqlite-helpers'
import { tauriTaskRepository } from './task.repository'

const STORAGE_KEY = 'dailyforge.workspace'
const STORAGE_VERSION = 1

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeWorkspace(value: unknown): WorkspaceState {
  const fallback = createSeedWorkspace()

  if (!isObject(value)) {
    return fallback
  }

  return {
    tasks: Array.isArray(value.tasks) ? value.tasks : fallback.tasks,
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
    const data =
      isObject(parsed) && isObject(parsed.data) ? parsed.data : parsed

  return rehydrateTimer(normalizeWorkspace(data))
  } catch {
    if (strict) {
      throw new Error('The selected file is not a valid DailyForge backup.')
    }

    return rehydrateTimer(createSeedWorkspace())
  }
}

function isWorkspaceEmpty(workspace: WorkspaceState) {
  return (
    workspace.projects.length === 0 &&
    workspace.tasks.length === 0 &&
    workspace.notes.length === 0 &&
    workspace.reviews.length === 0 &&
    workspace.focusSessions.length === 0
  )
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

function normalizeWorkspaceForPersistence(workspace: WorkspaceState): WorkspaceState {
  return {
    ...workspace,
    timer: normalizeTimerForPersistence(workspace.timer),
  }
}

async function loadTauriWorkspace() {
  const db = await getDatabase()
  const [projects, tasks, notes, reviews, focusSessions, settings, timer] =
    await Promise.all([
      tauriProjectRepository.listProjects(db),
      tauriTaskRepository.listTasks(db),
      tauriNoteRepository.listNotes(db),
      tauriReviewRepository.listReviews(db),
      tauriFocusRepository.listFocusSessions(db),
      tauriSettingsRepository.loadSettings(db),
      tauriFocusRepository.loadTimerState(db),
    ])

  const workspace: WorkspaceState = {
    projects,
    tasks,
    notes,
    reviews,
    focusSessions,
    settings,
    timer,
  }

  if (!isWorkspaceEmpty(workspace)) {
  return rehydrateTimer(workspace)
  }

  const seeded = createSeedWorkspace()
  await saveTauriWorkspace(seeded)
  return seeded
}

async function saveTauriWorkspace(workspace: WorkspaceState) {
  const db = await getDatabase()
  const persisted = normalizeWorkspaceForPersistence(workspace)

  await runInTransaction(db, async () => {
    await tauriProjectRepository.replaceProjects(db, persisted.projects)
    await tauriTaskRepository.replaceTasks(db, persisted.tasks)
    await tauriNoteRepository.replaceNotes(db, persisted.notes)
    await tauriReviewRepository.replaceReviews(db, persisted.reviews)
    await tauriFocusRepository.replaceFocusSessions(db, persisted.focusSessions)
    await tauriSettingsRepository.saveSettings(db, persisted.settings)
    await tauriFocusRepository.saveTimerState(db, persisted.timer)
  })
}

function loadBrowserWorkspace() {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return createSeedWorkspace()
  }

  return rehydrateTimer(parseWorkspace(stored, false))
}

function loadBrowserWorkspaceSnapshot() {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return null
  }

  return rehydrateTimer(parseWorkspace(stored, false))
}

function saveBrowserWorkspace(workspace: WorkspaceState) {
  const persisted = normalizeWorkspaceForPersistence(workspace)
  window.localStorage.setItem(STORAGE_KEY, serializeWorkspace(persisted))
}

export function serializeWorkspace(workspace: WorkspaceState) {
  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      exportedAt: nowIso(),
      data: workspace,
    },
    null,
    2,
  )
}

export function getWorkspacePersistenceFingerprint(workspace: WorkspaceState) {
  return JSON.stringify(normalizeWorkspaceForPersistence(workspace))
}

export const workspaceRepository = {
  async load() {
    if (!isDesktopRuntime()) {
      return loadBrowserWorkspace()
    }

    const browserSnapshot = loadBrowserWorkspaceSnapshot()

    if (browserSnapshot) {
      void saveTauriWorkspace(browserSnapshot).catch((error) => {
        console.error('Failed to sync browser backup to SQLite.', error)
      })

      return browserSnapshot
    }

    return loadTauriWorkspace()
  },

  async save(workspace: WorkspaceState) {
    if (isDesktopRuntime()) {
      // Persist a synchronous backup first so abrupt app exits do not lose edits.
      saveBrowserWorkspace(workspace)

      await saveTauriWorkspace(workspace)
      return
    }

    saveBrowserWorkspace(workspace)
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
