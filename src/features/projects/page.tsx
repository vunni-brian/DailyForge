import { useMemo, useState } from 'react'
import { FolderIcon, PlusIcon } from '../../components/icons'
import { Badge, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { getProjectProgress } from '../../lib/helpers'
import type { ProjectStatus } from '../../types'

const projectStatuses: ProjectStatus[] = ['Planned', 'Active', 'On Hold', 'Completed', 'Archived']

export function ProjectsPage() {
  const { addProject, projects, tasks } = useAppContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('Planned')

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'Archived'),
    [projects],
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setName('')
    setDescription('')
    setStatus('Planned')
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Projects"
        actions={
          <button className="primary-button page-cta-button" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="button-icon" />
            <span>New Project</span>
          </button>
        }
      />

      {activeProjects.length ? (
        <section className="project-card-grid">
          {activeProjects.map((project) => {
            const progress = getProjectProgress(project, tasks)
            const activeTaskCount = tasks.filter(
              (task) => task.projectId === project.id && task.status !== 'Done',
            ).length

            return (
              <Panel key={project.id} className="project-showcase-card">
                <div className="project-showcase-header">
                  <div className="project-showcase-mark" style={{ backgroundColor: project.color }} />
                  <Badge tone={project.status === 'Active' ? 'success' : 'neutral'}>
                    {project.status}
                  </Badge>
                </div>
                <h3>{project.name}</h3>
                <p>{project.description || 'No description provided yet.'}</p>
                <ProgressBar value={progress} color={project.color} />
                <div className="project-showcase-meta">
                  <span>{activeTaskCount} active tasks</span>
                  <span>{progress}%</span>
                </div>
              </Panel>
            )
          })}
        </section>
      ) : (
        <div className="page-zero-state">
          <FolderIcon className="page-zero-icon" />
          <p>No projects yet. Create one to organize your work!</p>
        </div>
      )}

      {isModalOpen ? (
        <div className="overlay" onClick={closeModal}>
          <div className="composer" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Project</h3>
              <button className="icon-button" onClick={closeModal}>
                ×
              </button>
            </div>

            <label className="field">
              <span>Project Name</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. DailyForge Launch"
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project about?"
              />
            </label>

            <label className="field">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
                {projectStatuses.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="primary-button modal-submit"
              disabled={!name.trim()}
              onClick={() => {
                addProject({
                  name,
                  description,
                  status,
                })
                closeModal()
              }}
            >
              Create Project
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
