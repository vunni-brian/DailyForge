import type Database from '@tauri-apps/plugin-sql'
import { tableNames } from '../db/schema'
import type { Task } from '../types'
import { parseJsonArray, replaceTableRows, stringifyJsonArray } from './sqlite-helpers'

interface TaskRow {
  id: string
  title: string
  description: string
  priority: Task['priority']
  status: Task['status']
  due_date: string | null
  project_id: string | null
  estimated_minutes: number | null
  actual_minutes: number
  tags: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    projectId: row.project_id,
    estimatedMinutes: row.estimated_minutes,
    actualMinutes: row.actual_minutes,
    tags: parseJsonArray(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

export const tauriTaskRepository = {
  async listTasks(db: Database) {
    const rows = await db.select<TaskRow[]>(
      `SELECT id, title, description, priority, status, due_date, project_id, estimated_minutes, actual_minutes, tags, created_at, updated_at, completed_at
       FROM ${tableNames.tasks}
       ORDER BY updated_at DESC`,
    )

    return rows.map(mapTaskRow)
  },

  async replaceTasks(db: Database, tasks: Task[]) {
    await replaceTableRows(db, tableNames.tasks, tasks, async (task) => {
      await db.execute(
        `INSERT INTO ${tableNames.tasks}
         (id, title, description, priority, status, due_date, project_id, estimated_minutes, actual_minutes, tags, created_at, updated_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          task.id,
          task.title,
          task.description,
          task.priority,
          task.status,
          task.dueDate,
          task.projectId,
          task.estimatedMinutes,
          task.actualMinutes,
          stringifyJsonArray(task.tags),
          task.createdAt,
          task.updatedAt,
          task.completedAt,
        ],
      )
    })
  },
}
