import { createDefaultTimerState } from '../data/seed'
import type { SettingsState, WorkspaceCoreState } from '../types'

export const settingsService = {
  updateSettings(
    workspace: WorkspaceCoreState,
    patch: Partial<SettingsState>,
  ): WorkspaceCoreState {
    const settings = {
      ...workspace.settings,
      ...patch,
    }

    const nextWorkspace: WorkspaceCoreState = {
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
