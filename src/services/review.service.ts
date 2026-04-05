import { createId, nowIso } from '../lib/core'
import type { ReviewDraft, WorkspaceState } from '../types'

export const reviewService = {
  saveReview(
    workspace: WorkspaceState,
    reviewDate: string,
    draft: ReviewDraft,
  ): WorkspaceState {
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
