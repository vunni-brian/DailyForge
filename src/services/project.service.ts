import { createId, nowIso } from '../lib/core'
import type { CreateProjectInput, Project, WorkspaceCoreState } from '../types'

export const projectService = {
  createProject(
    workspace: WorkspaceCoreState,
    input: CreateProjectInput,
  ): WorkspaceCoreState {
    const createdAt = nowIso()
    const project: Project = {
      id: createId('project'),
      name: input.name,
      description: input.description ?? '',
      color: input.color ?? '#f2a52b',
      status: input.status ?? 'Planned',
      targetDate: input.targetDate ?? null,
      progressPercent: 0,
      createdAt,
      updatedAt: createdAt,
    }

    return {
      ...workspace,
      projects: [project, ...workspace.projects],
    }
  },

  updateProject(
    workspace: WorkspaceCoreState,
    projectId: string,
    patch: Partial<Project>,
  ): WorkspaceCoreState {
    return {
      ...workspace,
      projects: workspace.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              ...patch,
              updatedAt: nowIso(),
            }
          : project,
      ),
    }
  },
}
