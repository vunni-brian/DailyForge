import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { cx, formatShortDate, isOverdue, priorityRank } from '../../lib/helpers'
import type { TaskStatus } from '../../types'

const boardStatuses: TaskStatus[] = [
  'Backlog',
  'Today',
  'In Progress',
  'Blocked',
  'Done',
]

export function TasksPage() {
  const { moveTask, openComposer, projects, tasks, updateTask } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All')
  const [projectId, setProjectId] = useState('all')
  const selectedTaskId = searchParams.get('task')
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  const selectedTaskProject = projects.find((project) => project.id === selectedTask?.projectId)

  const filteredTasks = [...tasks]
    .filter((task) =>
      [task.title, task.description].join(' ').toLowerCase().includes(search.toLowerCase()),
    )
    .filter((task) => (priority === 'All' ? true : task.priority === priority))
    .filter((task) => (projectId === 'all' ? true : task.projectId === projectId))
    .sort((left, right) => priorityRank(right) - priorityRank(left))
  const doneCount = filteredTasks.filter((task) => task.status === 'Done').length
  const todayCount = filteredTasks.filter((task) => task.status === 'Today').length
  const blockedCount = filteredTasks.filter((task) => task.status === 'Blocked').length
  const inProgressCount = filteredTasks.filter((task) => task.status === 'In Progress').length

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Tasks"
        title="One screen for execution"
        description="Switch between kanban and list views, filter aggressively, and keep full task editing in a right drawer."
        actions={
          <button className="primary-button" onClick={() => openComposer('task')}>
            + New Task
          </button>
        }
      />

      <section className="snapshot-grid">
        <Panel className="snapshot-card snapshot-card-accent">
          <p className="snapshot-value">{filteredTasks.length}</p>
          <p className="snapshot-label">Visible tasks</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{todayCount}</p>
          <p className="snapshot-label">Today</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{inProgressCount}</p>
          <p className="snapshot-label">In progress</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{blockedCount}</p>
          <p className="snapshot-label">Blocked</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{doneCount}</p>
          <p className="snapshot-label">Done</p>
        </Panel>
      </section>

      <Panel className="toolbar">
        <div className="toolbar-row">
          <input
            className="toolbar-search"
            placeholder="Search tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="segmented-control">
            <button
              className={cx(view === 'kanban' && 'active')}
              onClick={() => setView('kanban')}
            >
              Kanban
            </button>
            <button className={cx(view === 'list' && 'active')} onClick={() => setView('list')}>
              List
            </button>
          </div>
        </div>

        <div className="chip-row">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((value) => (
            <button
              key={value}
              className={cx('filter-chip', priority === value && 'filter-chip-active')}
              onClick={() =>
                setPriority(value as 'All' | 'Critical' | 'High' | 'Medium' | 'Low')
              }
            >
              {value}
            </button>
          ))}
        </div>

        <div className="toolbar-status-row">
          {boardStatuses.map((status) => {
            const count = filteredTasks.filter((task) => task.status === status).length

            return (
              <div key={status} className="toolbar-status-pill">
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            )
          })}
        </div>
      </Panel>

      {view === 'kanban' ? (
        <div className="kanban-grid">
          {boardStatuses.map((status) => {
            const statusTasks = filteredTasks.filter((task) => task.status === status)
            return (
              <Panel key={status} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <h3>{status}</h3>
                    <p className="kanban-column-subcopy">
                      {status === 'Blocked'
                        ? 'Needs a decision'
                        : status === 'Done'
                          ? 'Recently closed'
                          : 'Active work surface'}
                    </p>
                  </div>
                  <Badge tone={status === 'Blocked' ? 'danger' : 'info'}>{statusTasks.length}</Badge>
                </div>
                <div className="kanban-stack">
                  {statusTasks.map((task) => (
                    <button
                      key={task.id}
                      className={cx('task-card', isOverdue(task) && 'task-card-overdue')}
                      onClick={() => setSearchParams({ task: task.id })}
                    >
                      <div className="task-card-head">
                        <div className="task-card-title-row">
                          <span
                            className={cx(
                              'task-priority-marker',
                              task.priority === 'Critical' && 'task-priority-critical',
                              task.priority === 'High' && 'task-priority-high',
                              task.priority === 'Medium' && 'task-priority-medium',
                            )}
                          />
                          <strong>{task.title}</strong>
                        </div>
                        <Badge
                          tone={
                            task.priority === 'Critical'
                              ? 'danger'
                              : task.priority === 'High'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="task-card-body">
                        {task.description || 'No extra notes on this task yet.'}
                      </p>
                      <div className="task-card-meta">
                        <span className={cx(isOverdue(task) && 'text-danger')}>
                          {formatShortDate(task.dueDate)}
                        </span>
                        <span>
                          {projects.find((project) => project.id === task.projectId)?.name ??
                            'No project'}
                        </span>
                      </div>
                      <div className="task-card-footer">
                        <span>{task.status}</span>
                        <span>Open details</span>
                      </div>
                    </button>
                  ))}
                  {!statusTasks.length ? (
                    <EmptyState
                      title={`No ${status.toLowerCase()} work`}
                      description="This column is clear right now."
                    />
                  ) : null}
                </div>
              </Panel>
            )
          })}
        </div>
      ) : (
        <Panel className="list-panel">
          <div className="task-list">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                className={cx('task-list-row', selectedTaskId === task.id && 'selected')}
                onClick={() => setSearchParams({ task: task.id })}
              >
                <div className="task-list-primary">
                  <strong>{task.title}</strong>
                  <p>{task.description || 'No task description'}</p>
                </div>
                <Badge
                  tone={
                    task.priority === 'Critical'
                      ? 'danger'
                      : task.priority === 'High'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {task.priority}
                </Badge>
                <div className="task-inline-meta">
                  <span>{task.status}</span>
                  <span>{projects.find((project) => project.id === task.projectId)?.name ?? 'No project'}</span>
                </div>
                <div className="task-inline-meta task-inline-meta-right">
                  <span className={cx(isOverdue(task) && 'text-danger')}>
                    {formatShortDate(task.dueDate)}
                  </span>
                  <span>Open</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {selectedTask ? (
        <div className="drawer-backdrop" onClick={() => setSearchParams({})}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Task details</p>
                <h3>{selectedTask.title}</h3>
              </div>
              <button className="ghost-button" onClick={() => setSearchParams({})}>
                Close
              </button>
            </div>

            <div className="drawer-summary">
              <Badge
                tone={
                  selectedTask.priority === 'Critical'
                    ? 'danger'
                    : selectedTask.priority === 'High'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {selectedTask.priority}
              </Badge>
              <Badge tone={selectedTask.status === 'Blocked' ? 'danger' : 'info'}>
                {selectedTask.status}
              </Badge>
              <span>{selectedTaskProject?.name ?? 'No project'}</span>
              <span className={cx(isOverdue(selectedTask) && 'text-danger')}>
                {formatShortDate(selectedTask.dueDate)}
              </span>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                value={selectedTask.title}
                onChange={(event) =>
                  updateTask(selectedTask.id, { title: event.target.value })
                }
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={6}
                value={selectedTask.description}
                onChange={(event) =>
                  updateTask(selectedTask.id, { description: event.target.value })
                }
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(event) =>
                    moveTask(selectedTask.id, event.target.value as TaskStatus)
                  }
                >
                  {boardStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Priority</span>
                <select
                  value={selectedTask.priority}
                  onChange={(event) =>
                    updateTask(selectedTask.id, {
                      priority: event.target.value as typeof selectedTask.priority,
                    })
                  }
                >
                  {['Low', 'Medium', 'High', 'Critical'].map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Project</span>
                <select
                  value={selectedTask.projectId ?? ''}
                  onChange={(event) =>
                    updateTask(selectedTask.id, { projectId: event.target.value || null })
                  }
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Due date</span>
                <input
                  type="date"
                  value={selectedTask.dueDate ?? ''}
                  onChange={(event) =>
                    updateTask(selectedTask.id, { dueDate: event.target.value || null })
                  }
                />
              </label>
            </div>

            <div className="drawer-actions">
              {boardStatuses.map((status) => (
                <button
                  key={status}
                  className="ghost-button"
                  onClick={() => moveTask(selectedTask.id, status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
