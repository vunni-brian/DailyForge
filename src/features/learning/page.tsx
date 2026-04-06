import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DownloadIcon,
  GraduationCapIcon,
  PlusIcon,
} from '../../components/icons'
import { Badge, PageIntro, Panel } from '../../components/ui'
import { formatMinutes, formatShortDate } from '../../lib/helpers'
import { learningApi } from './api'
import type { LearningSessionCard } from './types'

export function LearningPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const importRef = useRef<HTMLInputElement | null>(null)
  const [sessions, setSessions] = useState<LearningSessionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState('')
  const [busyAction, setBusyAction] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadSessions = async () => {
      try {
        const nextSessions = await learningApi.listSessions()
        if (!active) {
          return
        }

        setSessions(nextSessions)
        setError(null)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Could not load Learning.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadSessions()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const action = searchParams.get('action')

    if (action !== 'create') {
      return
    }

    setCreateOpen(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('action')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesQuery =
        [session.title, session.subject, session.description]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ? true : session.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [query, sessions, statusFilter])

  const averageConfidence = sessions.length
    ? Math.round(
        sessions.reduce((sum, session) => sum + session.confidenceScore, 0) /
          sessions.length,
      )
    : 0
  const dueReviews = sessions.reduce(
    (sum, session) => sum + session.dueFlashcards,
    0,
  )
  const totalStudyMinutes = sessions.reduce(
    (sum, session) => sum + session.totalStudyMinutes,
    0,
  )

  const closeCreateModal = () => {
    setCreateOpen(false)
    setTitle('')
    setSubject('')
    setDescription('')
    setGoals('')
  }

  const handleCreateSession = async () => {
    setBusyAction('create')
    try {
      const created = await learningApi.createSession({
        title,
        subject,
        description,
        goals,
      })
      setSessions((current) => [created, ...current])
      closeCreateModal()
      navigate(`/learning/${created.id}`)
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Could not create the session.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleCreateFromFile = async () => {
    setBusyAction('create-from-file')
    try {
      const created = await learningApi.createSessionFromDialog()
      if (!created) {
        return
      }

      setSessions((current) => [created, ...current])
      setError(null)
      navigate(`/learning/${created.id}`)
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Could not create a session from the selected file.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleImportSession = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setBusyAction('import')
    try {
      const raw = await file.text()
      const bundle = JSON.parse(raw)
      const imported = await learningApi.importSessionBundle(bundle)
      const nextSessions = await learningApi.listSessions()
      setSessions(nextSessions)
      navigate(`/learning/${imported.id}`)
      setError(null)
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Could not import the session bundle.',
      )
    } finally {
      setBusyAction(null)
      event.target.value = ''
    }
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Learning"
        description="Build study sessions, generate summaries, run quizzes, and review flashcards from one desktop workspace."
        actions={
          <>
            <button
              className="ghost-button"
              onClick={() => void handleCreateFromFile()}
              disabled={busyAction === 'create-from-file'}
            >
              <PlusIcon className="button-icon" />
              <span>
                {busyAction === 'create-from-file' ? 'Opening...' : 'Create From File'}
              </span>
            </button>
            <button
              className="ghost-button"
              onClick={() => importRef.current?.click()}
              disabled={busyAction === 'import' || busyAction === 'create-from-file'}
            >
              <DownloadIcon className="button-icon" />
              <span>Import Session</span>
            </button>
            <button
              className="primary-button page-cta-button"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="button-icon" />
              <span>New Session</span>
            </button>
          </>
        }
      />

      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="visually-hidden"
        onChange={handleImportSession}
      />

      <div className="learning-metric-grid">
        <Panel className="learning-metric-card">
          <strong>{sessions.length}</strong>
          <span>Active sessions</span>
        </Panel>
        <Panel className="learning-metric-card">
          <strong>{dueReviews}</strong>
          <span>Flashcards due</span>
        </Panel>
        <Panel className="learning-metric-card">
          <strong>{averageConfidence}%</strong>
          <span>Average confidence</span>
        </Panel>
        <Panel className="learning-metric-card">
          <strong>{formatMinutes(totalStudyMinutes)}</strong>
          <span>Total study time</span>
        </Panel>
      </div>

      <Panel className="learning-toolbar-panel">
        <div className="learning-toolbar">
          <label className="field learning-toolbar-search">
            <span>Search sessions</span>
            <input
              placeholder="Find by title, subject, or notes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field learning-toolbar-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </Panel>

      {error ? <p className="text-danger">{error}</p> : null}

      {loading ? (
        <Panel className="learning-empty-panel">
          <p>Loading learning sessions...</p>
        </Panel>
      ) : filteredSessions.length ? (
        <div className="learning-session-grid">
          {filteredSessions.map((session) => (
            <button
              key={session.id}
              className="learning-session-card"
              onClick={() => navigate(`/learning/${session.id}`)}
            >
              <div className="learning-session-head">
                <Badge tone={session.status === 'completed' ? 'success' : 'info'}>
                  {session.status}
                </Badge>
                <span>{session.completionPercent}% complete</span>
              </div>
              <h3>{session.title}</h3>
              <p>{session.subject || 'No subject yet'}</p>
              <p className="learning-session-description">
                {session.description || 'No session notes yet.'}
              </p>
              <div className="learning-session-stats">
                <span>{session.sourceCount} sources</span>
                <span>{session.flashcardCount} cards</span>
                <span>{session.quizCount} quizzes</span>
              </div>
              <div className="learning-session-foot">
                <strong>{session.confidenceScore}% confidence</strong>
                <span>{formatShortDate(session.lastStudiedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="page-zero-state">
          <GraduationCapIcon className="page-zero-icon" />
          <p>No learning sessions yet. Create one to start building a study workspace.</p>
        </div>
      )}

      {createOpen ? (
        <div className="overlay" onClick={closeCreateModal}>
          <div className="composer" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>New Learning Session</h3>
                <p className="modal-subcopy">
                  Create a topic workspace for sources, summaries, quizzes, and tutor chat.
                </p>
              </div>
              <button className="icon-button" onClick={closeCreateModal}>
                x
              </button>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Cellular Respiration"
              />
            </label>

            <label className="field">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Biology"
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this session about?"
              />
            </label>

            <label className="field">
              <span>Goals</span>
              <textarea
                rows={3}
                value={goals}
                onChange={(event) => setGoals(event.target.value)}
                placeholder="What should you be able to explain after studying?"
              />
            </label>

            <button
              className="primary-button modal-submit"
              disabled={!title.trim() || busyAction === 'create'}
              onClick={() => void handleCreateSession()}
            >
              {busyAction === 'create' ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
