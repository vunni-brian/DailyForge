import type Database from '@tauri-apps/plugin-sql'
import { tableNames } from '../db/schema'
import type { DailyReview } from '../types'
import { replaceTableRows } from './sqlite-helpers'

interface ReviewRow {
  id: string
  review_date: string
  wins: string
  blockers: string
  lessons_learned: string
  tomorrow_first_task: string
  mood_energy: string
  created_at: string
  updated_at: string
}

function mapReviewRow(row: ReviewRow): DailyReview {
  return {
    id: row.id,
    reviewDate: row.review_date,
    wins: row.wins,
    blockers: row.blockers,
    lessonsLearned: row.lessons_learned,
    tomorrowFirstTask: row.tomorrow_first_task,
    moodEnergy: row.mood_energy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const tauriReviewRepository = {
  async listReviews(db: Database) {
    const rows = await db.select<ReviewRow[]>(
      `SELECT id, review_date, wins, blockers, lessons_learned, tomorrow_first_task, mood_energy, created_at, updated_at
       FROM ${tableNames.dailyReviews}
       ORDER BY review_date DESC`,
    )

    return rows.map(mapReviewRow)
  },

  async replaceReviews(db: Database, reviews: DailyReview[]) {
    await replaceTableRows(db, tableNames.dailyReviews, reviews, async (review) => {
      await db.execute(
        `INSERT INTO ${tableNames.dailyReviews}
         (id, review_date, wins, blockers, lessons_learned, tomorrow_first_task, mood_energy, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          review.id,
          review.reviewDate,
          review.wins,
          review.blockers,
          review.lessonsLearned,
          review.tomorrowFirstTask,
          review.moodEnergy,
          review.createdAt,
          review.updatedAt,
        ],
      )
    })
  },
}
