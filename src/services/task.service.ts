import { createId, nowIso } from '../lib/core'
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
} from '../types'

export const taskService = {
  createTask(tasks: Task[], input: CreateTaskInput): Task[] {
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

    return [task, ...tasks]
  },

  updateTask(tasks: Task[], taskId: string, patch: Partial<Task>): Task[] {
    return tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...patch,
            updatedAt: nowIso(),
          }
        : task,
    )
  },

  moveTaskStatus(tasks: Task[], taskId: string, status: TaskStatus): Task[] {
    return this.updateTask(tasks, taskId, {
      status,
      completedAt: status === 'Done' ? nowIso() : null,
    })
  },
}
