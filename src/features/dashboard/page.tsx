import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquareIcon,
  FolderIcon,
  PlusIcon,
  TargetIcon,
  TimerIcon,
} from '../../components/icons'
import { PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatLongDate, formatMinutes, getProjectProgress, getTodayFocusMinutes } from '../../lib/helpers'

export function DashboardPage() {
  const { focusSessions, projects, tasks } = useAppContext()
  const now = new Date()
  const todayTasks = tasks.filter((task) => task.status === 'Today' || task.status === 'In Progress')
  const completedToday = tasks.filter((task) => task.completedAt?.startsWith(now.toISOString().slice(0, 10))).length
  const focusToday = getTodayFocusMinutes(focusSessions)
  const activeProjects = projects.filter((project) => project.status === 'Active')
  const greeting =
    now.getHours() < 12 ? 'Good morning ☀️' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page-stack">
      <PageIntro
        title={greeting}
        description={formatLongDate(now)}
        actions={
          <>
            <Link className="ghost-button page-cta-button" to="/tasks">
              <PlusIcon className="button-icon" />
              <span>New Task</span>
            </Link>
            <Link className="primary-button page-cta-button" to="/focus">
              <TimerIcon className="button-icon" />
              <span>Focus</span>
            </Link>
          </>
        }
      />

      <section className="dashboard-metrics">
        <MetricCard
          icon={<TargetIcon className="metric-icon" />}
          value={todayTasks.length}
          label="Today's Tasks"
          accent
        />
        <MetricCard
          icon={<CheckSquareIcon className="metric-icon" />}
          value={completedToday}
          label="Completed Today"
        />
        <MetricCard
          icon={<TimerIcon className="metric-icon" />}
          value={formatMinutes(focusToday)}
          label="Focus Time"
        />
        <MetricCard
          icon={<FolderIcon className="metric-icon" />}
          value={activeProjects.length}
          label="Active Projects"
        />
      </section>

      <section className="dashboard-main-grid">
        <Panel className="dashboard-surface">
          <div className="surface-header">
            <div className="surface-title">
              <CheckSquareIcon className="surface-icon surface-icon-accent" />
              <h3>Today's Tasks</h3>
            </div>
          </div>

          {todayTasks.length ? (
            <div className="stack-list">
              {todayTasks.map((task) => (
                <div key={task.id} className="list-surface-row">
                  <strong>{task.title}</strong>
                  <p>{task.description || 'No task notes yet.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty-copy">No tasks for today. Plan your day!</div>
          )}
        </Panel>

        <Panel className="dashboard-surface">
          <div className="surface-header">
            <div className="surface-title">
              <FolderIcon className="surface-icon surface-icon-accent" />
              <h3>Project Progress</h3>
            </div>
          </div>

          {activeProjects.length ? (
            <div className="stack-list">
              {activeProjects.map((project) => (
                <div key={project.id} className="project-progress-row">
                  <div className="section-row">
                    <strong>{project.name}</strong>
                    <span>{getProjectProgress(project, tasks)}%</span>
                  </div>
                  <ProgressBar value={getProjectProgress(project, tasks)} color={project.color} />
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-empty-copy">No active projects yet.</div>
          )}
        </Panel>
      </section>
    </div>
  )
}

function MetricCard({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: ReactNode
  value: number | string
  label: string
  accent?: boolean
}) {
  return (
    <Panel className={accent ? 'metric-card metric-card-accent' : 'metric-card'}>
      <div className={accent ? 'metric-icon-wrap metric-icon-wrap-accent' : 'metric-icon-wrap'}>
        {icon}
      </div>
      <div className="metric-copy">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </Panel>
  )
}
