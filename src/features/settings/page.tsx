import { type ChangeEvent, useState } from 'react'
import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'

export function SettingsPage() {
  const {
    exportWorkspace,
    importWorkspace,
    resetWorkspace,
    settings,
    updateSettings,
  } = useAppContext()
  const [message, setMessage] = useState('')

  const handleExport = () => {
    const blob = new Blob([exportWorkspace()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dailyforge-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Workspace exported.')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const contents = await file.text()
      importWorkspace(contents)
      setMessage('Workspace imported.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Import failed. Check the backup file.',
      )
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Settings"
        title="Workspace preferences"
        description="Theme, notifications, timer defaults, backup/export, and keyboard-friendly defaults all live here."
      />

      <div className="settings-grid">
        <Panel className="subpanel">
          <p className="eyebrow">Theme</p>
          <div className="segmented-control">
            <button
              className={settings.theme === 'dark' ? 'active' : ''}
              onClick={() => updateSettings({ theme: 'dark' })}
            >
              Dark
            </button>
            <button
              className={settings.theme === 'light' ? 'active' : ''}
              onClick={() => updateSettings({ theme: 'light' })}
            >
              Light
            </button>
          </div>
        </Panel>

        <Panel className="subpanel">
          <p className="eyebrow">Notifications</p>
          <button
            className="ghost-button"
            onClick={() => updateSettings({ notifications: !settings.notifications })}
          >
            {settings.notifications ? 'Disable notifications' : 'Enable notifications'}
          </button>
        </Panel>

        <Panel className="subpanel">
          <p className="eyebrow">Timer defaults</p>
          <select
            value={settings.timerDefault}
            onChange={(event) =>
              updateSettings({
                timerDefault: event.target.value as typeof settings.timerDefault,
              })
            }
          >
            <option value="pomodoro">Pomodoro 25/5</option>
            <option value="deep-work">Deep Work 50/10</option>
            <option value="custom">Custom 40/10</option>
          </select>
        </Panel>

        <Panel className="subpanel">
          <p className="eyebrow">Backup / Export</p>
          <div className="stack-list">
            <button className="primary-button" onClick={handleExport}>
              Export workspace JSON
            </button>
            <label className="ghost-button file-trigger">
              Import backup
              <input type="file" accept=".json" onChange={handleImport} />
            </label>
            <button className="ghost-button" onClick={resetWorkspace}>
              Reset to sample workspace
            </button>
            {message ? <p className="muted-copy">{message}</p> : null}
          </div>
        </Panel>

        <Panel className="subpanel">
          <p className="eyebrow">Keyboard shortcuts</p>
          <ul className="mini-list">
            <li>Ctrl + K for search</li>
            <li>Ctrl + N for quick task</li>
            <li>Ctrl + Shift + N for quick note</li>
            <li>Ctrl + 1..7 reserved for navigation in the desktop build</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
