import { createDefaultTimerState, createSeedWorkspace } from '../data/seed'
import type { WorkspaceState } from '../types'

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
    learningItems: Array.isArray(value.learningItems)
      ? value.learningItems
      : fallback.learningItems,
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

function parseWorkspace(raw: string, strict: boolean) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const data =
      isObject(parsed) && isObject(parsed.data) ? parsed.data : parsed

    return normalizeWorkspace(data)
  } catch (error) {
    if (strict) {
      throw new Error('The selected file is not a valid DailyForge backup.')
    }

    return createSeedWorkspace()
  }
}

export const browserWorkspaceRepository = {
  load(): WorkspaceState {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      const seeded = createSeedWorkspace()
      this.save(seeded)
      return seeded
    }

    return parseWorkspace(stored, false)
  },

  save(workspace: WorkspaceState) {
    window.localStorage.setItem(STORAGE_KEY, this.export(workspace))
  },

  export(workspace: WorkspaceState) {
    return JSON.stringify(
      {
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        data: workspace,
      },
      null,
      2,
    )
  },

  import(serialized: string) {
    const workspace = parseWorkspace(serialized, true)
    this.save(workspace)
    return workspace
  },

  reset() {
    const workspace = createSeedWorkspace()
    this.save(workspace)
    return workspace
  },
}
