import type Database from '@tauri-apps/plugin-sql'
import { seedSettings } from '../data/seed'
import { tableNames } from '../db/schema'
import type { SettingsState } from '../types'
import { fromSqliteBool, toSqliteBool } from './sqlite-helpers'

interface SettingsRow {
  theme: SettingsState['theme']
  notifications: number
  timer_default: SettingsState['timerDefault']
}

function mapSettingsRow(row: SettingsRow): SettingsState {
  return {
    theme: row.theme,
    notifications: fromSqliteBool(row.notifications),
    timerDefault: row.timer_default,
  }
}

export const tauriSettingsRepository = {
  async loadSettings(db: Database) {
    const rows = await db.select<SettingsRow[]>(
      `SELECT theme, notifications, timer_default
       FROM ${tableNames.settings}
       WHERE id = 1`,
    )

    if (!rows.length) {
      return seedSettings
    }

    return mapSettingsRow(rows[0])
  },

  async saveSettings(db: Database, settings: SettingsState) {
    await db.execute(`DELETE FROM ${tableNames.settings}`)
    await db.execute(
      `INSERT INTO ${tableNames.settings}
       (id, theme, notifications, timer_default)
       VALUES (1, $1, $2, $3)`,
      [
        settings.theme,
        toSqliteBool(settings.notifications),
        settings.timerDefault,
      ],
    )
  },
}
