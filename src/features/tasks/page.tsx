import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckSquareIcon, PlusIcon } from '../../components/icons'
import { Badge, PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { useTasks } from './context'
import { cx, formatShortDate, isOverdue, priorityRank } from '../../lib/helpers'
import type { TaskStatus } from '../../types'

const taskFilters = ['All', 'Backlog', 'Today', 'In Progress', 'Blocked', 'Done'] as const

export function TasksPage() {
  const { openComposer, projects } = useAppContext()
  const { moveTask, tasks, updateTask } = useTasks()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<(typeof taskFilters)[number]>('All')
  const selectedTaskId = searchParams.get('task')
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)

  const filteredTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => (filter === 'All' ? true : task.status === filter))
        .sort((left, right) => priorityRank(right) - priorityRank(left)),
    [filter, tasks],
  )

  return (
    <div className="page-stack">
      <PageIntro
        title="Tasks"
        actions={
          <button className="primary-button page-cta-button" onClick={() => openComposer('task')}>
            <PlusIcon className="button-icon" />
            <span>New Task</span>
          </button>
        }
      />

      <div className="filter-bar">
        {taskFilters.map((entry) => {
          const count =
            entry === 'All' ? tasks.length : tasks.filter((task) => task.status === entry).length

          return (
            <button
              key={entry}
              className={cx('filter-pill', filter === entry && 'filter-pill-active')}
              onClick={() => setFilter(entry)}
            >
              {entry} ({count})
            </button>
          )
        })}
      </div>

      {filteredTasks.length ? (
        <Panel className="task-board-panel">
          <div className="task-simple-list">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                className={cx('task-simple-row', selectedTaskId === task.id && 'selected')}
                onClick={() => setSearchParams({ task: task.id })}
              >
                <div className="task-simple-main">
                  <div className="task-simple-title">
                    <span className={cx('task-status-bullet', isOverdue(task) && 'task-status-bullet-danger')} />
                    <strong>{task.title}</strong>
                  </div>
                  <p>{task.description || 'No description yet.'}</p>
                </div>
                <div className="task-simple-meta">
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
                  <span>{projects.find((project) => project.id === task.projectId)?.name ?? 'No project'}</span>
                  <span className={cx(isOverdue(task) && 'text-danger')}>
                    {formatShortDate(task.dueDate)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      ) : (
        <div className="page-zero-state">
          <CheckSquareIcon className="page-zero-icon" />
          <p>No tasks yet. Create your first task to get started!</p>
        </div>
      )}

      {selectedTask ? (
        <div className="drawer-backdrop" onClick={() => setSearchParams({})}>
          <aside className="drawer task-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Task Details</h3>
                <p className="modal-subcopy">{selectedTask.title}</p>
              </div>
              <button className="icon-button" onClick={() => setSearchParams({})}>
                ×
              </button>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                value={selectedTask.title}
                onChange={(event) => updateTask(selectedTask.id, { title: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={5}
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
                  {taskFilters
                    .filter((entry): entry is TaskStatus => entry !== 'All')
                    .map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                </select>
              </label>

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
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
