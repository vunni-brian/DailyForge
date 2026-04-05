import type Database from '@tauri-apps/plugin-sql'
import { createDefaultTimerState } from '../data/seed'
import { tableNames } from '../db/schema'
import type { FocusSession, TimerState } from '../types'
import {
  fromSqliteBool,
  replaceTableRows,
  toSqliteBool,
} from './sqlite-helpers'

interface FocusSessionRow {
  id: string
  task_id: string | null
  mode_id: FocusSession['modeId']
  start_time: string
  end_time: string
  duration_minutes: number
  result: FocusSession['result']
}

interface TimerStateRow {
  mode_id: TimerState['modeId']
  duration_seconds: number
  remaining_seconds: number
  is_running: number
  linked_task_id: string | null
  started_at: string | null
  ends_at: string | null
  session_started_at: string | null
}

function mapFocusSessionRow(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.task_id,
    modeId: row.mode_id,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    result: row.result,
  }
}

function mapTimerStateRow(row: TimerStateRow): TimerState {
  return {
    modeId: row.mode_id,
    durationSeconds: row.duration_seconds,
    remainingSeconds: row.remaining_seconds,
    isRunning: fromSqliteBool(row.is_running),
    linkedTaskId: row.linked_task_id,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    sessionStartedAt: row.session_started_at,
  }
}

export const tauriFocusRepository = {
  async listFocusSessions(db: Database) {
    const rows = await db.select<FocusSessionRow[]>(
      `SELECT id, task_id, mode_id, start_time, end_time, duration_minutes, result
       FROM ${tableNames.focusSessions}
       ORDER BY start_time DESC`,
    )

    return rows.map(mapFocusSessionRow)
  },

  async replaceFocusSessions(db: Database, sessions: FocusSession[]) {
    await replaceTableRows(db, tableNames.focusSessions, sessions, async (session) => {
      await db.execute(
        `INSERT INTO ${tableNames.focusSessions}
         (id, task_id, mode_id, start_time, end_time, duration_minutes, result)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session.id,
          session.taskId,
          session.modeId,
          session.startTime,
          session.endTime,
          session.durationMinutes,
          session.result,
        ],
      )
    })
  },

  async loadTimerState(db: Database) {
    const rows = await db.select<TimerStateRow[]>(
      `SELECT mode_id, duration_seconds, remaining_seconds, is_running, linked_task_id, started_at, ends_at, session_started_at
       FROM ${tableNames.timerState}
       WHERE id = 1`,
    )

    if (!rows.length) {
      return createDefaultTimerState()
    }

    return mapTimerStateRow(rows[0])
  },

  async saveTimerState(db: Database, timer: TimerState) {
    await db.execute(`DELETE FROM ${tableNames.timerState}`)
    await db.execute(
      `INSERT INTO ${tableNames.timerState}
       (id, mode_id, duration_seconds, remaining_seconds, is_running, linked_task_id, started_at, ends_at, session_started_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        timer.modeId,
        timer.durationSeconds,
        timer.remainingSeconds,
        toSqliteBool(timer.isRunning),
        timer.linkedTaskId,
        timer.startedAt,
        timer.endsAt,
        timer.sessionStartedAt,
      ],
    )
  },
}
