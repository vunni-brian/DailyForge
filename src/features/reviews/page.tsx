import { useEffect, useState } from 'react'
import { Badge, PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatLongDate } from '../../lib/helpers'

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
      <PageIntro
        eyebrow="Reviews"
        title="Daily review"
        description="Close the loop on the day: capture completed work, blockers, lessons, and tomorrow’s first move."
      />

      <Panel className="review-form">
        <div className="section-row">
          <div>
            <p className="eyebrow">Review date</p>
            <h3>{formatLongDate(reviewDate)}</h3>
          </div>
          <input
            type="date"
            value={reviewDate}
            onChange={(event) => setReviewDate(event.target.value)}
          />
        </div>

        <label className="field">
          <span>What did I finish?</span>
          <textarea
            rows={4}
            value={draft.wins}
            onChange={(event) => setDraft((current) => ({ ...current, wins: event.target.value }))}
          />
        </label>

        <label className="field">
          <span>What blocked me?</span>
          <textarea
            rows={4}
            value={draft.blockers}
            onChange={(event) =>
              setDraft((current) => ({ ...current, blockers: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>What did I learn?</span>
          <textarea
            rows={4}
            value={draft.lessonsLearned}
            onChange={(event) =>
              setDraft((current) => ({ ...current, lessonsLearned: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Tomorrow&apos;s first task</span>
          <input
            value={draft.tomorrowFirstTask}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                tomorrowFirstTask: event.target.value,
              }))
            }
          />
        </label>

        <button className="primary-button" onClick={() => saveReview(reviewDate, draft)}>
          Save Review
        </button>
      </Panel>

      <Panel>
        <div className="section-row">
          <div>
            <p className="eyebrow">History</p>
            <h3>Recent reviews</h3>
          </div>
        </div>
        <div className="stack-list">
          {reviews.map((review) => (
            <div key={review.id} className="stack-row stack-row-column">
              <div className="section-row">
                <strong>{formatLongDate(review.reviewDate)}</strong>
                <Badge tone="info">{review.moodEnergy || 'Captured'}</Badge>
              </div>
              <p>{review.wins}</p>
              <p className="muted-copy">Tomorrow: {review.tomorrowFirstTask}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
