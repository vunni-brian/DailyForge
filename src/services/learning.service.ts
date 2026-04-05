import { createId, nowIso } from '../lib/core'
import type { CreateLearningItemInput, LearningItem, WorkspaceState } from '../types'

export const learningService = {
  createLearningItem(
    workspace: WorkspaceState,
    input: CreateLearningItemInput,
  ): WorkspaceState {
    const createdAt = nowIso()
    const learningItem: LearningItem = {
      id: createId('learning'),
      title: input.title,
      topic: input.topic ?? '',
      stage: 'Not Started',
      progressPercent: 0,
      nextStep: input.nextStep ?? '',
      resourceLink: input.resourceLink ?? '',
      targetCompletionDate: null,
      createdAt,
      updatedAt: createdAt,
    }

    return {
      ...workspace,
      learningItems: [learningItem, ...workspace.learningItems],
    }
  },

  updateLearningItem(
    workspace: WorkspaceState,
    itemId: string,
    patch: Partial<LearningItem>,
  ): WorkspaceState {
    return {
      ...workspace,
      learningItems: workspace.learningItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              updatedAt: nowIso(),
            }
          : item,
      ),
    }
  },
}
