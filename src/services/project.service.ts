import { createId, nowIso } from '../lib/core'
import type { Project, WorkspaceState } from '../types'

export const projectService = {
  createProject(workspace: WorkspaceState): WorkspaceState {
    const createdAt = nowIso()
    const project: Project = {
      id: createId('project'),
      name: 'New Project',
      description: 'Define the scope, objective, and next milestone.',
      color: '#818cf8',
      status: 'Planned',
      targetDate: null,
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
