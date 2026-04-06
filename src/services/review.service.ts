import { createId, nowIso } from '../lib/core'
import type { ReviewDraft, WorkspaceCoreState } from '../types'

export const reviewService = {
  saveReview(
    workspace: WorkspaceCoreState,
    reviewDate: string,
    draft: ReviewDraft,
  ): WorkspaceCoreState {
    const existing = workspace.reviews.find((review) => review.reviewDate === reviewDate)

    if (!existing) {
      return {
        ...workspace,
        reviews: [
          {
            id: createId('review'),
            reviewDate,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...draft,
          },
          ...workspace.reviews,
        ],
      }
    }

    return {
      ...workspace,
      reviews: workspace.reviews.map((review) =>
        review.reviewDate === reviewDate
          ? {
              ...review,
              ...draft,
              updatedAt: nowIso(),
            }
          : review,
      ),
    }
  },
}
