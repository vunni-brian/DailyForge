import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatMinutes, formatShortDate, formatTimer } from '../../lib/helpers'
import { timerModes } from '../../types'

export function FocusPage() {
  const {
    focusSessions,
    pauseTimer,
    projects,
    resetTimer,
    setLinkedTask,
    setTimerMode,
    startTimer,
    tasks,
    timer,
  } = useAppContext()

  const linkedTask = tasks.find((task) => task.id === timer.linkedTaskId)
  const today = new Date().toISOString().slice(0, 10)
  const sessionsToday = focusSessions.filter((session) => session.startTime.slice(0, 10) === today)
  const todayMinutes = sessionsToday.reduce((total, session) => total + session.durationMinutes, 0)
  const completedSessions = focusSessions.filter((session) => session.result === 'completed').length
  const activeMode = timerModes.find((mode) => mode.id === timer.modeId) ?? timerModes[0]

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Focus"
        title="Single-purpose timer"
        description="Large timer, minimal chrome, task linking, and visible session history below the fold."
      />

      <section className="snapshot-grid snapshot-grid-focus">
        <Panel className="snapshot-card snapshot-card-accent">
          <p className="snapshot-value">{formatTimer(timer)}</p>
          <p className="snapshot-label">Live timer</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{formatMinutes(todayMinutes)}</p>
          <p className="snapshot-label">Today focus</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{sessionsToday.length}</p>
          <p className="snapshot-label">Sessions today</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{completedSessions}</p>
          <p className="snapshot-label">Completed blocks</p>
        </Panel>
      </section>

      <div className="focus-shell">
        <Panel className="focus-layout focus-stage-panel">
          <div className="focus-mode-row">
            {timerModes.map((mode) => (
              <button
                key={mode.id}
                className={timer.modeId === mode.id ? 'mode-button-active' : 'mode-button'}
                onClick={() => setTimerMode(mode.id)}
              >
                <strong>{mode.label}</strong>
                <span>
                  {mode.focusMinutes}/{mode.breakMinutes}
                </span>
              </button>
            ))}
          </div>

          <div className="timer-stage">
            <p className="eyebrow">Timer</p>
            <div className="timer-display">{formatTimer(timer)}</div>
            <p className="focus-stage-copy">
              {timer.isRunning
                ? `Running ${activeMode.label.toLowerCase()} mode`
                : 'Ready to start your next block'}
            </p>
            <div className="button-row">
              <button className="primary-button" onClick={startTimer}>
                {timer.isRunning ? 'Running' : 'Start'}
              </button>
              <button className="ghost-button" onClick={pauseTimer}>
                Pause
              </button>
              <button className="ghost-button" onClick={resetTimer}>
                Reset
              </button>
            </div>
          </div>
        </Panel>

        <Panel className="focus-side-panel">
          <div className="focus-side-header">
            <div>
              <p className="eyebrow">Linked work</p>
              <h3>{linkedTask?.title ?? 'No task selected'}</h3>
            </div>
            <span className="focus-status-pill">
              {projects.find((project) => project.id === linkedTask?.projectId)?.name ?? 'Unassigned'}
            </span>
          </div>

          <label className="field focus-task-picker">
            <span>Select task</span>
            <select
              value={timer.linkedTaskId ?? ''}
              onChange={(event) => setLinkedTask(event.target.value || null)}
            >
              <option value="">No linked task</option>
              {tasks
                .filter((task) => task.status !== 'Done')
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>
          </label>

          <div className="focus-meta-panel">
            <div className="focus-meta-row">
              <span>Mode</span>
              <strong>{activeMode.label}</strong>
            </div>
            <div className="focus-meta-row">
              <span>Focus length</span>
              <strong>{activeMode.focusMinutes} min</strong>
            </div>
            <div className="focus-meta-row">
              <span>Break length</span>
              <strong>{activeMode.breakMinutes} min</strong>
            </div>
            <div className="focus-meta-row">
              <span>Linked task</span>
              <strong>{linkedTask?.title ?? 'None'}</strong>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="section-row">
          <div>
            <p className="eyebrow">Session history</p>
            <h3>Recent focus blocks</h3>
          </div>
        </div>
        <div className="stack-list">
          {focusSessions.map((session) => (
            <div key={session.id} className="stack-row">
              <div>
                <strong>
                  {tasks.find((task) => task.id === session.taskId)?.title ?? 'Unlinked session'}
                </strong>
                <p className="muted-copy">{formatShortDate(session.startTime)}</p>
              </div>
              <div className="focus-history-meta">
                <span>{timerModes.find((mode) => mode.id === session.modeId)?.label}</span>
                <strong>{session.durationMinutes} min</strong>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
