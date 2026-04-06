import { workspaceRepository } from '../../repositories/workspace.repository'
import { taskService } from '../../services/task.service'
import type { CreateTaskInput, Task, TaskStatus } from '../../types'

export const tasksApi = {
  listTasks() {
    return workspaceRepository.loadTasks()
  },

  saveTasks(tasks: Task[]) {
    return workspaceRepository.saveTasks(tasks)
  },

  createTask(tasks: Task[], input: CreateTaskInput) {
    return taskService.createTask(tasks, input)
  },

  updateTask(tasks: Task[], taskId: string, patch: Partial<Task>) {
    return taskService.updateTask(tasks, taskId, patch)
  },

  moveTask(tasks: Task[], taskId: string, status: TaskStatus) {
    return taskService.moveTaskStatus(tasks, taskId, status)
  },
}
