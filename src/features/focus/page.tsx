import { RotateCcwIcon, TimerIcon, PlayIcon } from '../../components/icons'
import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { formatMinutes, formatTimer } from '../../lib/helpers'
import { timerModes } from '../../types'

export function FocusPage() {
  const {
    focusSessions,
    resetTimer,
    setLinkedTask,
    setTimerMode,
    startTimer,
    tasks,
    timer,
  } = useAppContext()

  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = focusSessions.filter((session) => session.startTime.slice(0, 10) === today)
  const focusToday = todaySessions.reduce((total, session) => total + session.durationMinutes, 0)
  const activeMode = timerModes.find((mode) => mode.id === timer.modeId) ?? timerModes[0]

  return (
    <div className="page-stack">
      <PageIntro title="Focus Timer" />

      <div className="focus-mode-pills">
        {timerModes.map((mode) => (
          <button
            key={mode.id}
            className={mode.id === timer.modeId ? 'filter-pill filter-pill-active' : 'filter-pill'}
            onClick={() => setTimerMode(mode.id)}
          >
            {mode.label} ({mode.focusMinutes}m)
          </button>
        ))}
      </div>

      <Panel className="focus-stage-shell">
        <div className="focus-ring">
          <div className="focus-ring-inner">
            <strong>{formatTimer(timer)}</strong>
            <span>{activeMode.label}</span>
          </div>
        </div>

        <div className="focus-control-row">
          <button className="circle-ghost-button" onClick={resetTimer}>
            <RotateCcwIcon className="circle-button-icon" />
          </button>
          <button className="circle-primary-button" onClick={startTimer}>
            <PlayIcon className="circle-button-icon" />
          </button>
        </div>

        <label className="focus-link-field">
          <select
            value={timer.linkedTaskId ?? ''}
            onChange={(event) => setLinkedTask(event.target.value || null)}
          >
            <option value="">Link to a task (optional)</option>
            {tasks
              .filter((task) => task.status !== 'Done')
              .map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
          </select>
        </label>
      </Panel>

      <section className="focus-summary-grid">
        <Panel className="focus-summary-card">
          <div className="focus-summary-icon focus-summary-icon-amber">
            <TimerIcon className="metric-icon" />
          </div>
          <div className="metric-copy">
            <strong>{formatMinutes(focusToday)}</strong>
            <span>Focus today</span>
          </div>
        </Panel>
        <Panel className="focus-summary-card">
          <div className="focus-summary-icon focus-summary-icon-blue">
            <TimerIcon className="metric-icon" />
          </div>
          <div className="metric-copy">
            <strong>{todaySessions.length}</strong>
            <span>Sessions today</span>
          </div>
        </Panel>
      </section>
    </div>
  )
}
