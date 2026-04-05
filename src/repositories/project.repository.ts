import type Database from '@tauri-apps/plugin-sql'
import { tableNames } from '../db/schema'
import type { Project } from '../types'
import { replaceTableRows } from './sqlite-helpers'

interface ProjectRow {
  id: string
  name: string
  description: string
  color: string
  status: Project['status']
  target_date: string | null
  progress_percent: number
  created_at: string
  updated_at: string
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    status: row.status,
    targetDate: row.target_date,
    progressPercent: row.progress_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const tauriProjectRepository = {
  async listProjects(db: Database) {
    const rows = await db.select<ProjectRow[]>(
      `SELECT id, name, description, color, status, target_date, progress_percent, created_at, updated_at
       FROM ${tableNames.projects}
       ORDER BY updated_at DESC`,
    )

    return rows.map(mapProjectRow)
  },

  async replaceProjects(db: Database, projects: Project[]) {
    await replaceTableRows(db, tableNames.projects, projects, async (project) => {
      await db.execute(
        `INSERT INTO ${tableNames.projects}
         (id, name, description, color, status, target_date, progress_percent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          project.id,
          project.name,
          project.description,
          project.color,
          project.status,
          project.targetDate,
          project.progressPercent,
          project.createdAt,
          project.updatedAt,
        ],
      )
    })
  },
}
