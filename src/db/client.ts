import { isTauri } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'
import { DAILYFORGE_DB_PATH } from './schema'

let databasePromise: Promise<Database> | null = null

export function isDesktopRuntime() {
  return isTauri()
}

export async function getDatabase() {
  if (!isDesktopRuntime()) {
    throw new Error('SQLite is only available in the Tauri runtime.')
  }

  databasePromise ??= Database.load(DAILYFORGE_DB_PATH)
  return databasePromise
}
