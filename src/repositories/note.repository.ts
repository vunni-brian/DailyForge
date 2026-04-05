import type Database from '@tauri-apps/plugin-sql'
import { tableNames } from '../db/schema'
import type { Note } from '../types'
import {
  fromSqliteBool,
  parseJsonArray,
  replaceTableRows,
  stringifyJsonArray,
  toSqliteBool,
} from './sqlite-helpers'

interface NoteRow {
  id: string
  title: string
  content: string
  type: Note['type']
  project_id: string | null
  tags: string
  pinned: number
  created_at: string
  updated_at: string
}

function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    projectId: row.project_id,
    tags: parseJsonArray(row.tags),
    pinned: fromSqliteBool(row.pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const tauriNoteRepository = {
  async listNotes(db: Database) {
    const rows = await db.select<NoteRow[]>(
      `SELECT id, title, content, type, project_id, tags, pinned, created_at, updated_at
       FROM ${tableNames.notes}
       ORDER BY updated_at DESC`,
    )

    return rows.map(mapNoteRow)
  },

  async replaceNotes(db: Database, notes: Note[]) {
    await replaceTableRows(db, tableNames.notes, notes, async (note) => {
      await db.execute(
        `INSERT INTO ${tableNames.notes}
         (id, title, content, type, project_id, tags, pinned, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          note.id,
          note.title,
          note.content,
          note.type,
          note.projectId,
          stringifyJsonArray(note.tags),
          toSqliteBool(note.pinned),
          note.createdAt,
          note.updatedAt,
        ],
      )
    })
  },
}
