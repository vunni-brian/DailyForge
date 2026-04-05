import { createId, nowIso } from '../lib/core'
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  WorkspaceState,
} from '../types'

export const taskService = {
  createTask(workspace: WorkspaceState, input: CreateTaskInput): WorkspaceState {
    const createdAt = nowIso()
    const task: Task = {
      id: createId('task'),
      title: input.title,
      description: input.description ?? '',
      priority: input.priority ?? 'Medium',
      status: input.status ?? 'Backlog',
      dueDate: input.dueDate ?? null,
      projectId: input.projectId ?? null,
      estimatedMinutes: null,
      actualMinutes: 0,
      tags: [],
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    }

    return {
      ...workspace,
      tasks: [task, ...workspace.tasks],
    }
  },

  updateTask(
    workspace: WorkspaceState,
    taskId: string,
    patch: Partial<Task>,
  ): WorkspaceState {
    return {
      ...workspace,
      tasks: workspace.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...patch,
              updatedAt: nowIso(),
            }
          : task,
      ),
    }
  },

  moveTaskStatus(
    workspace: WorkspaceState,
    taskId: string,
    status: TaskStatus,
  ): WorkspaceState {
    return this.updateTask(workspace, taskId, {
      status,
      completedAt: status === 'Done' ? nowIso() : null,
    })
  },
}
