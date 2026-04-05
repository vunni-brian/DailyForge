import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatShortDate, formatTimer } from '../../lib/helpers'
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

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Focus"
        title="Single-purpose timer"
        description="Large timer, minimal chrome, task linking, and visible session history below the fold."
      />

      <Panel className="focus-layout">
        <div className="focus-mode-row">
          {timerModes.map((mode) => (
            <button
              key={mode.id}
              className={timer.modeId === mode.id ? 'mode-button-active' : 'mode-button'}
              onClick={() => setTimerMode(mode.id)}
            >
              <strong>{mode.label}</strong>
              <span>{mode.focusMinutes} min</span>
            </button>
          ))}
        </div>

        <div className="timer-stage">
          <p className="eyebrow">Timer</p>
          <div className="timer-display">{formatTimer(timer)}</div>
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

        <div className="focus-meta">
          <p className="muted-copy">
            Linked task: <strong>{linkedTask?.title ?? 'None selected'}</strong>
          </p>
          <p className="muted-copy">
            Project:{' '}
            <strong>
              {projects.find((project) => project.id === linkedTask?.projectId)?.name ??
                'Unassigned'}
            </strong>
          </p>
        </div>
      </Panel>

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
