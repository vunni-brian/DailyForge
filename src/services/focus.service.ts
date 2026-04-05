import { createDefaultTimerState } from '../data/seed'
import { createId, nowIso } from '../lib/core'
import { timerModes, type TimerModeId, type WorkspaceState } from '../types'

function durationSecondsFor(modeId: TimerModeId) {
  const mode = timerModes.find((entry) => entry.id === modeId) ?? timerModes[0]
  return mode.focusMinutes * 60
}

export const focusService = {
  setTimerMode(workspace: WorkspaceState, modeId: TimerModeId): WorkspaceState {
    if (workspace.timer.isRunning) {
      return workspace
    }

    return {
      ...workspace,
      timer: {
        ...createDefaultTimerState(modeId),
        linkedTaskId: workspace.timer.linkedTaskId,
      },
    }
  },

  setLinkedTask(workspace: WorkspaceState, taskId: string | null): WorkspaceState {
    return {
      ...workspace,
      timer: {
        ...workspace.timer,
        linkedTaskId: taskId,
      },
    }
  },

  startTimer(workspace: WorkspaceState): WorkspaceState {
    const sessionStartedAt = workspace.timer.sessionStartedAt ?? nowIso()

    return {
      ...workspace,
      timer: {
        ...workspace.timer,
        isRunning: true,
        startedAt: nowIso(),
        endsAt: new Date(
          Date.now() + workspace.timer.remainingSeconds * 1000,
        ).toISOString(),
        sessionStartedAt,
      },
    }
  },

  pauseTimer(workspace: WorkspaceState): WorkspaceState {
    if (!workspace.timer.isRunning || !workspace.timer.endsAt) {
      return workspace
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((new Date(workspace.timer.endsAt).getTime() - Date.now()) / 1000),
    )

    return {
      ...workspace,
      timer: {
        ...workspace.timer,
        isRunning: false,
        remainingSeconds,
        endsAt: null,
      },
    }
  },

  resetTimer(workspace: WorkspaceState): WorkspaceState {
    return {
      ...workspace,
      timer: {
        ...createDefaultTimerState(workspace.timer.modeId),
        linkedTaskId: workspace.timer.linkedTaskId,
      },
    }
  },

  refreshTimer(workspace: WorkspaceState): WorkspaceState {
    if (!workspace.timer.isRunning || !workspace.timer.endsAt) {
      return workspace
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((new Date(workspace.timer.endsAt).getTime() - Date.now()) / 1000),
    )

    if (remainingSeconds > 0) {
      if (remainingSeconds === workspace.timer.remainingSeconds) {
        return workspace
      }

      return {
        ...workspace,
        timer: {
          ...workspace.timer,
          remainingSeconds,
        },
      }
    }

    if (!workspace.timer.sessionStartedAt) {
      return {
        ...workspace,
        timer: {
          ...workspace.timer,
          isRunning: false,
          endsAt: null,
          remainingSeconds: 0,
        },
      }
    }

    const completedAt = nowIso()
    const durationMinutes = Math.round(workspace.timer.durationSeconds / 60)

    return {
      ...workspace,
      focusSessions: [
        {
          id: createId('session'),
          taskId: workspace.timer.linkedTaskId,
          modeId: workspace.timer.modeId,
          startTime: workspace.timer.sessionStartedAt,
          endTime: completedAt,
          durationMinutes,
          result: 'completed',
        },
        ...workspace.focusSessions,
      ],
      timer: {
        ...createDefaultTimerState(workspace.timer.modeId),
        durationSeconds: durationSecondsFor(workspace.timer.modeId),
        linkedTaskId: workspace.timer.linkedTaskId,
      },
    }
  },
}
