import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatShortDate, getProjectProgress } from '../../lib/helpers'

const tabs = ['Overview', 'Tasks', 'Notes', 'Issues'] as const

export function ProjectsPage() {
  const { addProject, notes, projects, tasks, updateProject } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Overview')
  const selectedProjectId = searchParams.get('project') ?? projects[0]?.id
  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const activeProjectsCount = projects.filter((project) => project.status === 'Active').length
  const blockedTasksCount = tasks.filter((task) => task.status === 'Blocked').length
  const linkedNotesCount = notes.filter((note) => note.projectId).length

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Projects"
        title="Project workspaces"
        description="Keep each project as a home for tasks, notes, progress, and blockers instead of scattering context across screens."
        actions={
          <button className="primary-button" onClick={addProject}>
            + New Project
          </button>
        }
      />

      <section className="snapshot-grid snapshot-grid-projects">
        <Panel className="snapshot-card snapshot-card-accent">
          <p className="snapshot-value">{projects.length}</p>
          <p className="snapshot-label">Tracked projects</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{activeProjectsCount}</p>
          <p className="snapshot-label">Active</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{blockedTasksCount}</p>
          <p className="snapshot-label">Blocked tasks</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{linkedNotesCount}</p>
          <p className="snapshot-label">Linked notes</p>
        </Panel>
      </section>

      <section className="project-grid">
        {projects.map((project) => {
          const linkedTasks = tasks.filter((task) => task.projectId === project.id)
          const progress = getProjectProgress(project, tasks)

          return (
            <button
              key={project.id}
              className={`project-card ${selectedProjectId === project.id ? 'project-card-active' : ''}`}
              onClick={() => setSearchParams({ project: project.id })}
            >
              <div className="project-card-header">
                <div className="project-card-title">
                  <div className="project-accent" style={{ background: project.color }} />
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                  </div>
                </div>
                <Badge tone={project.status === 'Active' ? 'success' : 'warning'}>{project.status}</Badge>
              </div>
              <ProgressBar value={progress} color={project.color} />
              <div className="project-card-stats">
                <span>{linkedTasks.filter((task) => task.status !== 'Done').length} active tasks</span>
                <span>{linkedTasks.filter((task) => task.status === 'Blocked').length} blocked</span>
                <span>{progress}%</span>
              </div>
            </button>
          )
        })}
      </section>

      {selectedProject ? (
        <Panel className="project-detail">
          <div className="project-detail-header">
            <div>
              <p className="eyebrow">Project detail</p>
              <input
                className="project-title-input"
                value={selectedProject.name}
                onChange={(event) =>
                  updateProject(selectedProject.id, { name: event.target.value })
                }
              />
              <p className="muted-copy">{selectedProject.description}</p>
            </div>
            <div className="project-summary">
              <Badge tone={selectedProject.status === 'Active' ? 'success' : 'warning'}>
                {selectedProject.status}
              </Badge>
              <strong>{getProjectProgress(selectedProject, tasks)}%</strong>
              <span className="muted-copy">{formatShortDate(selectedProject.targetDate)}</span>
            </div>
          </div>

          <div className="project-hero-metrics">
            <div className="project-metric">
              <span>Tasks</span>
              <strong>{tasks.filter((task) => task.projectId === selectedProject.id).length}</strong>
            </div>
            <div className="project-metric">
              <span>Open</span>
              <strong>
                {
                  tasks.filter(
                    (task) => task.projectId === selectedProject.id && task.status !== 'Done',
                  ).length
                }
              </strong>
            </div>
            <div className="project-metric">
              <span>Notes</span>
              <strong>{notes.filter((note) => note.projectId === selectedProject.id).length}</strong>
            </div>
            <div className="project-metric">
              <span>Blocked</span>
              <strong>
                {
                  tasks.filter(
                    (task) => task.projectId === selectedProject.id && task.status === 'Blocked',
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="tab-row">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'tab-active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' ? (
            <div className="overview-grid">
              <Panel className="subpanel">
                <p className="eyebrow">Status</p>
                <select
                  value={selectedProject.status}
                  onChange={(event) =>
                    updateProject(selectedProject.id, {
                      status: event.target.value as typeof selectedProject.status,
                    })
                  }
                >
                  {['Planned', 'Active', 'On Hold', 'Completed', 'Archived'].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Panel>
              <Panel className="subpanel">
                <p className="eyebrow">Target date</p>
                <input
                  type="date"
                  value={selectedProject.targetDate ?? ''}
                  onChange={(event) =>
                    updateProject(selectedProject.id, {
                      targetDate: event.target.value || null,
                    })
                  }
                />
              </Panel>
              <Panel className="subpanel">
                <p className="eyebrow">Description</p>
                <textarea
                  rows={5}
                  value={selectedProject.description}
                  onChange={(event) =>
                    updateProject(selectedProject.id, { description: event.target.value })
                  }
                />
              </Panel>
              <Panel className="subpanel">
                <p className="eyebrow">Health</p>
                <ul className="mini-list">
                  <li>{tasks.filter((task) => task.projectId === selectedProject.id).length} total tasks</li>
                  <li>{notes.filter((note) => note.projectId === selectedProject.id).length} linked notes</li>
                  <li>
                    {
                      tasks.filter(
                        (task) => task.projectId === selectedProject.id && task.status === 'Blocked',
                      ).length
                    }{' '}
                    blockers
                  </li>
                </ul>
              </Panel>
            </div>
          ) : null}

          {activeTab === 'Tasks' ? (
            <div className="stack-list">
              {tasks
                .filter((task) => task.projectId === selectedProject.id)
                .map((task) => (
                  <div key={task.id} className="stack-row">
                    <div>
                      <strong>{task.title}</strong>
                      <p className="muted-copy">{task.status} · {formatShortDate(task.dueDate)}</p>
                    </div>
                    <Badge tone={task.status === 'Blocked' ? 'danger' : 'info'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : null}

          {activeTab === 'Notes' ? (
            <div className="stack-list">
              {notes.filter((note) => note.projectId === selectedProject.id).length ? (
                notes.filter((note) => note.projectId === selectedProject.id).map((note) => (
                  <div key={note.id} className="stack-row">
                    <div>
                      <strong>{note.title}</strong>
                      <p className="muted-copy">{note.type}</p>
                    </div>
                    <Badge tone={note.pinned ? 'success' : 'neutral'}>
                      {note.pinned ? 'Pinned' : 'Open'}
                    </Badge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No project notes yet"
                  description="Link notes to this project to keep the working context together."
                />
              )}
            </div>
          ) : null}

          {activeTab === 'Issues' ? (
            <div className="stack-list">
              {tasks
                .filter((task) => task.projectId === selectedProject.id && task.status === 'Blocked')
                .map((task) => (
                  <div key={task.id} className="stack-row">
                    <div>
                      <strong>{task.title}</strong>
                      <p className="muted-copy">{task.description}</p>
                    </div>
                    <Badge tone="danger">Blocked</Badge>
                  </div>
                ))}
              {!tasks.some(
                (task) => task.projectId === selectedProject.id && task.status === 'Blocked',
              ) ? (
                <EmptyState
                  title="No active blockers"
                  description="Issues will surface here when a project task gets marked as blocked."
                />
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  )
}
