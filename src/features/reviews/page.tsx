import { useEffect, useState } from 'react'
import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatLongDate } from '../../lib/helpers'

const moodOptions = ['Frustrated', 'Neutral', 'Good', 'Great', 'Unstoppable'] as const

function blankReview() {
  return {
    wins: '',
    blockers: '',
    lessonsLearned: '',
    tomorrowFirstTask: '',
    moodEnergy: '',
  }
}

export function ReviewsPage() {
  const { reviews, saveReview } = useAppContext()
  const today = new Date().toISOString().slice(0, 10)
  const [reviewDate, setReviewDate] = useState(today)
  const [draft, setDraft] = useState(blankReview())

  useEffect(() => {
    const existing = reviews.find((review) => review.reviewDate === reviewDate)
    setDraft(
      existing
        ? {
            wins: existing.wins,
            blockers: existing.blockers,
            lessonsLearned: existing.lessonsLearned,
            tomorrowFirstTask: existing.tomorrowFirstTask,
            moodEnergy: existing.moodEnergy,
          }
        : blankReview(),
    )
  }, [reviewDate, reviews])

  return (
    <div className="page-stack">
      <PageIntro title="Daily Review" />

      <Panel className="review-surface">
        <div className="review-surface-header">
          <div>
            <h3>End of Day Review</h3>
            <p className="muted-copy">{formatLongDate(reviewDate)}</p>
          </div>
          <input
            type="date"
            value={reviewDate}
            onChange={(event) => setReviewDate(event.target.value)}
          />
        </div>

        <label className="field">
          <span>🏆 What did I finish today?</span>
          <textarea
            rows={4}
            placeholder="List your wins..."
            value={draft.wins}
            onChange={(event) => setDraft((current) => ({ ...current, wins: event.target.value }))}
          />
        </label>

        <label className="field">
          <span>🚧 What blocked me?</span>
          <textarea
            rows={4}
            placeholder="Any blockers or obstacles..."
            value={draft.blockers}
            onChange={(event) =>
              setDraft((current) => ({ ...current, blockers: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>💡 What did I learn?</span>
          <textarea
            rows={4}
            placeholder="Key takeaways..."
            value={draft.lessonsLearned}
            onChange={(event) =>
              setDraft((current) => ({ ...current, lessonsLearned: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>🎯 First thing tomorrow?</span>
          <textarea
            rows={3}
            placeholder="Your #1 priority for tomorrow..."
            value={draft.tomorrowFirstTask}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                tomorrowFirstTask: event.target.value,
              }))
            }
          />
        </label>

        <div className="field">
          <span>Energy Level</span>
          <div className="mood-chip-row">
            {moodOptions.map((option) => (
              <button
                key={option}
                className={draft.moodEnergy === option ? 'mood-chip mood-chip-active' : 'mood-chip'}
                onClick={() => setDraft((current) => ({ ...current, moodEnergy: option }))}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button className="primary-button review-save-button" onClick={() => saveReview(reviewDate, draft)}>
          Save Review
        </button>
      </Panel>
    </div>
  )
}
