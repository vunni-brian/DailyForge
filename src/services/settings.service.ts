import { createDefaultTimerState } from '../data/seed'
import type { SettingsState, WorkspaceState } from '../types'

export const settingsService = {
  updateSettings(
    workspace: WorkspaceState,
    patch: Partial<SettingsState>,
  ): WorkspaceState {
    const settings = {
      ...workspace.settings,
      ...patch,
    }

    const nextWorkspace: WorkspaceState = {
      ...workspace,
      settings,
    }

    if (patch.timerDefault && !workspace.timer.isRunning) {
      return {
        ...nextWorkspace,
        timer: {
          ...createDefaultTimerState(patch.timerDefault),
          linkedTaskId: workspace.timer.linkedTaskId,
        },
      }
    }

    return nextWorkspace
  },
}
