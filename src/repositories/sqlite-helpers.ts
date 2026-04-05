import type Database from '@tauri-apps/plugin-sql'

export function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    return []
  }
}

export function stringifyJsonArray(value: string[]) {
  return JSON.stringify(value)
}

export function fromSqliteBool(value: number | boolean | null | undefined) {
  return Boolean(value)
}

export function toSqliteBool(value: boolean) {
  return value ? 1 : 0
}

export async function replaceTableRows<T>(
  db: Database,
  tableName: string,
  rows: T[],
  insertRow: (row: T) => Promise<void>,
) {
  await db.execute(`DELETE FROM ${tableName}`)

  for (const row of rows) {
    await insertRow(row)
  }
}

export async function runInTransaction(
  db: Database,
  action: () => Promise<void>,
) {
  await db.execute('BEGIN')

  try {
    await action()
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}
