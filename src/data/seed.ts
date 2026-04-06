import {
  type SettingsState,
  type TimerModeId,
  type TimerState,
  type WorkspaceState,
  timerModes,
} from '../types'

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
    tasks: [],
    projects: [],
    notes: [],
    reviews: [],
    focusSessions: [],
    settings: seedSettings,
    timer: createDefaultTimerState(seedSettings.timerDefault),
  }
}
