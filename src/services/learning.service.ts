import { createId, nowIso } from '../lib/core'
import type { LearningItem, WorkspaceState } from '../types'

export const learningService = {
  createLearningItem(workspace: WorkspaceState): WorkspaceState {
    const createdAt = nowIso()
    const learningItem: LearningItem = {
      id: createId('learning'),
      title: 'New Learning Item',
      topic: 'Topic',
      stage: 'Not Started',
      progressPercent: 0,
      nextStep: 'Define the very next deliberate practice step.',
      resourceLink: '',
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
