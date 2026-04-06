import { type ChangeEvent, useRef, useState } from 'react'
import { DownloadIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { isDesktopRuntime } from '../../db/client'
import { learningApi } from '../learning/api'
import type { LearningFullBackup } from '../learning/types'

export function SettingsPage() {
  const importRef = useRef<HTMLInputElement | null>(null)
  const { exportWorkspace, importWorkspace, resetWorkspace, settings, updateSettings } =
    useAppContext()
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setBusyAction('export')
    setStatusMessage(null)
    setError(null)

    try {
      const workspaceBackup = JSON.parse(exportWorkspace())
      const backup = isDesktopRuntime()
        ? {
            version: 2,
            exportedAt: new Date().toISOString(),
            workspace: workspaceBackup,
            learning: await learningApi.exportFullBackup(),
          }
        : workspaceBackup

      downloadText(
        `dailyforge-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      )
      setStatusMessage('Backup exported successfully.')
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : 'Could not export the backup.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setBusyAction('import')
    setStatusMessage(null)
    setError(null)

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw) as unknown

      if (isRecord(parsed) && 'workspace' in parsed) {
        if (parsed.workspace) {
          await importWorkspace(JSON.stringify(parsed.workspace))
        }

        if (isDesktopRuntime() && parsed.learning) {
          await learningApi.importFullBackup(parsed.learning as LearningFullBackup)
        }
      } else {
        await importWorkspace(raw)
      }

      setStatusMessage('Backup imported successfully.')
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : 'Could not import the backup.',
      )
    } finally {
      setBusyAction(null)
      event.target.value = ''
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Clear all workspace data and all Learning sessions from this device?')) {
      return
    }

    setBusyAction('reset')
    setStatusMessage(null)
    setError(null)

    try {
      await resetWorkspace()

      if (isDesktopRuntime()) {
        await learningApi.importFullBackup({
          version: 1,
          exportedAt: new Date().toISOString(),
          sessions: [],
        })
      }

      setStatusMessage('All local DailyForge data has been cleared.')
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : 'Could not clear local data.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="page-stack">
      <PageIntro title="Settings" />

      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="visually-hidden"
        onChange={handleImport}
      />

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

        <button
          className="settings-action-button"
          onClick={() => void handleExport()}
          disabled={busyAction !== null}
        >
          <DownloadIcon className="settings-action-icon" />
          <span>{busyAction === 'export' ? 'Exporting...' : 'Export Full Backup'}</span>
        </button>

        <button
          className="settings-action-button"
          onClick={() => importRef.current?.click()}
          disabled={busyAction !== null}
        >
          <PlusIcon className="settings-action-icon" />
          <span>{busyAction === 'import' ? 'Importing...' : 'Import Backup'}</span>
        </button>

        <button
          className="settings-action-button settings-action-button-danger"
          disabled={busyAction !== null}
          onClick={() => void handleReset()}
        >
          <TrashIcon className="settings-action-icon" />
          <span>{busyAction === 'reset' ? 'Clearing...' : 'Clear All Data'}</span>
        </button>

        {statusMessage ? <p className="settings-status-copy">{statusMessage}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
      </Panel>

      <Panel className="settings-footer-panel">
        DailyForge stores core data locally on this device. Learning AI actions send
        session content to the local AI backend only when you trigger them.
      </Panel>
    </div>
  )
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
