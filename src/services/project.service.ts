import { createId, nowIso } from '../lib/core'
import type { CreateProjectInput, Project, WorkspaceState } from '../types'

export const projectService = {
  createProject(
    workspace: WorkspaceState,
    input: CreateProjectInput,
  ): WorkspaceState {
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
    workspace: WorkspaceState,
    projectId: string,
    patch: Partial<Project>,
  ): WorkspaceState {
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
