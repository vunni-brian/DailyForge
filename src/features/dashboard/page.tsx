import { Link } from 'react-router-dom'
import { Badge, EmptyState, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import {
  formatMinutes,
  formatShortDate,
  formatTimer,
  getProjectProgress,
  getTodayFocusMinutes,
  getTopPriorities,
  isOverdue,
} from '../../lib/helpers'

export function DashboardPage() {
  const {
    addNote,
    addTask,
    focusSessions,
    learningItems,
    moveTask,
    notes,
    projects,
    resetTimer,
    startTimer,
    pauseTimer,
    tasks,
    timer,
  } = useAppContext()

  const topPriorities = getTopPriorities(tasks)
  const todayTasks = tasks.filter((task) => task.status === 'Today')
  const overdueTasks = tasks.filter(isOverdue)
  const activeProjects = projects.filter((project) => project.status !== 'Archived')
  const focusToday = getTodayFocusMinutes(focusSessions)
  const nextLearning = [...learningItems].sort(
    (left, right) => right.progressPercent - left.progressPercent,
  )[0]
  const latestNote = notes[0]

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Dashboard"
        title="Daily control center"
        description="See the work that matters, start focus quickly, and keep active projects visible without scrolling."
      />

      <section className="dashboard-priorities">
        {topPriorities.map((task) => (
          <Panel key={task.id} className="priority-card">
            <div className="priority-head">
              <Badge tone={task.priority === 'Critical' ? 'danger' : 'warning'}>
                {task.priority}
              </Badge>
              <span className="muted-copy">{task.status}</span>
            </div>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div className="priority-meta">
              <span>{formatShortDate(task.dueDate)}</span>
              <button
                className="ghost-button"
                onClick={() => moveTask(task.id, task.status === 'Done' ? 'Today' : 'Done')}
              >
                {task.status === 'Done' ? 'Reopen' : 'Mark done'}
              </button>
            </div>
          </Panel>
        ))}
      </section>

      <section className="dashboard-grid">
        <Panel className="dashboard-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Today tasks</p>
              <h3>Execution list</h3>
            </div>
            <Link className="ghost-button" to="/tasks">
              Open tasks
            </Link>
          </div>
          {todayTasks.length ? (
            <div className="task-checklist">
              {todayTasks.map((task) => (
                <button
                  key={task.id}
                  className="task-check"
                  onClick={() => moveTask(task.id, task.status === 'Done' ? 'Today' : 'Done')}
                >
                  <span className={`task-checkbox ${task.status === 'Done' ? 'checked' : ''}`} />
                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {task.projectId
                        ? projects.find((project) => project.id === task.projectId)?.name
                        : 'No project'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tasks in Today"
              description="Push a few backlog items into Today so the dashboard becomes a real execution board."
              action={
                <button
                  className="primary-button"
                  onClick={() => addTask({ title: 'Plan today priorities', status: 'Today' })}
                >
                  Add first task
                </button>
              }
            />
          )}
        </Panel>

        <Panel className="dashboard-card focus-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Focus timer</p>
              <h3>{formatTimer(timer)}</h3>
            </div>
            <Badge tone="info">{formatMinutes(focusToday)} today</Badge>
          </div>
          <p className="muted-copy">
            Minimal, visible, and always one click away from starting.
          </p>
          <div className="button-row">
            <button className="primary-button" onClick={startTimer}>
              {timer.isRunning ? 'Running...' : 'Start'}
            </button>
            <button className="ghost-button" onClick={pauseTimer}>
              Pause
            </button>
            <button className="ghost-button" onClick={resetTimer}>
              Reset
            </button>
          </div>
          <Link className="text-link" to="/focus">
            Open Focus page
          </Link>
        </Panel>

        <Panel className="dashboard-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Overdue tasks</p>
              <h3>Needs attention</h3>
            </div>
            <Badge tone="danger">{overdueTasks.length} overdue</Badge>
          </div>
          {overdueTasks.length ? (
            <div className="stack-list">
              {overdueTasks.map((task) => (
                <div key={task.id} className="stack-row">
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted-copy">{formatShortDate(task.dueDate)}</p>
                  </div>
                  <button className="ghost-button" onClick={() => moveTask(task.id, 'Today')}>
                    Move to Today
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No overdue work. Keep the surface clean.</p>
          )}
        </Panel>

        <Panel className="dashboard-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Quick capture</p>
              <h3>Capture in seconds</h3>
            </div>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => addTask({ title: 'New quick task', status: 'Backlog' })}
            >
              + Task
            </button>
            <button
              className="ghost-button"
              onClick={() => addNote({ title: 'Quick note', content: 'Write here...' })}
            >
              + Note
            </button>
          </div>
          <p className="muted-copy">
            Latest note: <strong>{latestNote?.title ?? 'Nothing captured yet'}</strong>
          </p>
        </Panel>

        <Panel className="dashboard-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Project progress</p>
              <h3>Active workspaces</h3>
            </div>
            <Link className="ghost-button" to="/projects">
              View all
            </Link>
          </div>
          <div className="stack-list">
            {activeProjects.map((project) => {
              const progress = getProjectProgress(project, tasks)

              return (
                <div key={project.id} className="stack-row stack-row-column">
                  <div className="section-row">
                    <strong>{project.name}</strong>
                    <span className="muted-copy">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} color={project.color} />
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel className="dashboard-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Learning next</p>
              <h3>{nextLearning?.title ?? 'No learning tracked yet'}</h3>
            </div>
            <Badge tone="success">{nextLearning?.stage ?? 'Idle'}</Badge>
          </div>
          <p>{nextLearning?.nextStep ?? 'Add a learning item to keep momentum visible.'}</p>
          <div className="button-row">
            <Link className="ghost-button" to="/learning">
              Open tracker
            </Link>
            <Link className="text-link" to="/reviews">
              Review today
            </Link>
          </div>
        </Panel>
      </section>
    </div>
  )
}
