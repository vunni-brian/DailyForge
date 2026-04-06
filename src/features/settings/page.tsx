import { DownloadIcon, TrashIcon } from '../../components/icons'
import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'

export function SettingsPage() {
  const { exportWorkspace, resetWorkspace, settings, updateSettings } = useAppContext()

  const handleExport = () => {
    const blob = new Blob([exportWorkspace()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dailyforge-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-stack">
      <PageIntro title="Settings" />

      <Panel className="settings-surface">
        <h3>Preferences</h3>

        <div className="settings-row">
          <div>
            <strong>Default Timer Mode</strong>
            <p>Timer mode when opening Focus</p>
          </div>
          <select
            className="settings-select"
            value={settings.timerDefault}
            onChange={(event) =>
              updateSettings({
                timerDefault: event.target.value as typeof settings.timerDefault,
              })
            }
          >
            <option value="pomodoro">Pomodoro</option>
            <option value="deep-work">Deep Work</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="settings-row">
          <div>
            <strong>Notifications</strong>
            <p>Enable desktop notifications</p>
          </div>
          <button
            className={settings.notifications ? 'toggle-switch toggle-switch-active' : 'toggle-switch'}
            onClick={() => updateSettings({ notifications: !settings.notifications })}
            aria-pressed={settings.notifications}
          >
            <span />
          </button>
        </div>
      </Panel>

      <Panel className="settings-surface">
        <h3>Data Management</h3>

        <button className="settings-action-button" onClick={handleExport}>
          <DownloadIcon className="settings-action-icon" />
          <span>Export All Data</span>
        </button>

        <button
          className="settings-action-button settings-action-button-danger"
          onClick={async () => {
            await resetWorkspace()
          }}
        >
          <TrashIcon className="settings-action-icon" />
          <span>Clear All Data</span>
        </button>
      </Panel>

      <Panel className="settings-footer-panel">
        DailyForge v1.0 — All data stored locally in your browser
      </Panel>
    </div>
  )
}
