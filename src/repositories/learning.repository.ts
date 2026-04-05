import type Database from '@tauri-apps/plugin-sql'
import { tableNames } from '../db/schema'
import type { LearningItem } from '../types'
import { replaceTableRows } from './sqlite-helpers'

interface LearningRow {
  id: string
  title: string
  topic: string
  stage: LearningItem['stage']
  progress_percent: number
  next_step: string
  resource_link: string
  target_completion_date: string | null
  created_at: string
  updated_at: string
}

function mapLearningRow(row: LearningRow): LearningItem {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    stage: row.stage,
    progressPercent: row.progress_percent,
    nextStep: row.next_step,
    resourceLink: row.resource_link,
    targetCompletionDate: row.target_completion_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const tauriLearningRepository = {
  async listLearningItems(db: Database) {
    const rows = await db.select<LearningRow[]>(
      `SELECT id, title, topic, stage, progress_percent, next_step, resource_link, target_completion_date, created_at, updated_at
       FROM ${tableNames.learningItems}
       ORDER BY updated_at DESC`,
    )

    return rows.map(mapLearningRow)
  },

  async replaceLearningItems(db: Database, items: LearningItem[]) {
    await replaceTableRows(db, tableNames.learningItems, items, async (item) => {
      await db.execute(
        `INSERT INTO ${tableNames.learningItems}
         (id, title, topic, stage, progress_percent, next_step, resource_link, target_completion_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.id,
          item.title,
          item.topic,
          item.stage,
          item.progressPercent,
          item.nextStep,
          item.resourceLink,
          item.targetCompletionDate,
          item.createdAt,
          item.updatedAt,
        ],
      )
    })
  },
}
