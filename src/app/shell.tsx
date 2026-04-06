import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookIcon,
  CheckSquareIcon,
  FlameIcon,
  FolderIcon,
  GraduationCapIcon,
  GridIcon,
  NoteIcon,
  SearchIcon,
  SettingsIcon,
  TimerIcon,
} from '../components/icons'
import { useAppContext } from '../context/app-context'
import { cx } from '../lib/helpers'
import { noteTypes, taskStatuses, type NoteType } from '../types'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', shortcut: '1', icon: GridIcon },
  { label: 'Tasks', path: '/tasks', shortcut: '2', icon: CheckSquareIcon },
  { label: 'Projects', path: '/projects', shortcut: '3', icon: FolderIcon },
  { label: 'Notes', path: '/notes', shortcut: '4', icon: NoteIcon },
  { label: 'Focus', path: '/focus', shortcut: '5', icon: TimerIcon },
  { label: 'Learning', path: '/learning', shortcut: '6', icon: GraduationCapIcon },
  { label: 'Reviews', path: '/reviews', shortcut: '7', icon: BookIcon },
  { label: 'Settings', path: '/settings', shortcut: ',', icon: SettingsIcon },
] as const

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    composer,
    closeComposer,
    openComposer,
    notes,
    projects,
    tasks,
    addNote,
    addTask,
  } = useAppContext()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }

      if ((event.ctrlKey || event.metaKey) && key === 'n' && !event.shiftKey) {
        event.preventDefault()
        openComposer('task')
      }

      if ((event.ctrlKey || event.metaKey) && key === 'n' && event.shiftKey) {
        event.preventDefault()
        openComposer('note')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openComposer])

  useEffect(() => {
    setPaletteOpen(false)
    setQuery('')
  }, [location.pathname, location.search])

  const results = [
    ...tasks
      .filter((task) =>
        [task.title, task.description].join(' ').toLowerCase().includes(query.toLowerCase()),
      )
      .map((task) => ({
        id: task.id,
        type: 'Task',
        title: task.title,
        subtitle: task.description || task.status,
        path: `/tasks?task=${task.id}`,
      })),
    ...projects
      .filter((project) =>
        [project.name, project.description].join(' ').toLowerCase().includes(query.toLowerCase()),
      )
      .map((project) => ({
        id: project.id,
        type: 'Project',
        title: project.name,
        subtitle: project.description,
        path: `/projects?project=${project.id}`,
      })),
    ...notes
      .filter((note) =>
        [note.title, note.content].join(' ').toLowerCase().includes(query.toLowerCase()),
      )
      .map((note) => ({
        id: note.id,
        type: 'Note',
        title: note.title,
        subtitle: note.type,
        path: `/notes?note=${note.id}`,
      })),
  ].slice(0, 10)

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand-block" onClick={() => navigate('/dashboard')}>
            <span className="brand-mark">
              <FlameIcon className="brand-mark-icon" />
            </span>
            <h2 className="brand-title">
              Daily<span>Forge</span>
            </h2>
          </button>

          <nav className="sidebar-nav">
            {navItems.map(({ icon: Icon, label, path }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  cx('sidebar-link', isActive && 'sidebar-link-active')
                }
              >
                <span className="sidebar-link-copy">
                  <Icon className="sidebar-nav-icon" />
                  <span>{label}</span>
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">DailyForge v1.0</div>
        </aside>

        <div className="shell-main">
          <main className="shell-content">
            <Outlet />
          </main>
        </div>
      </div>

      {paletteOpen ? (
        <div className="overlay" onClick={() => setPaletteOpen(false)}>
          <div className="palette" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Search Workspace</h3>
                <p className="modal-subcopy">Jump to any task, project, or note.</p>
              </div>
              <button className="icon-button" onClick={() => setPaletteOpen(false)}>
                ×
              </button>
            </div>
            <label className="field">
              <span>Search</span>
              <div className="input-with-icon">
                <SearchIcon className="field-icon" />
                <input
                  autoFocus
                  className="palette-input"
                  placeholder="Search tasks, projects, notes..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </label>
            <div className="palette-results">
              {!query ? <p className="muted-copy">Start typing to search your workspace.</p> : null}
              {query && !results.length ? <p className="muted-copy">No results found.</p> : null}
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="palette-result"
                  onClick={() => navigate(result.path)}
                >
                  <span className="palette-type">{result.type}</span>
                  <div>
                    <strong>{result.title}</strong>
                    <p>{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {composer.mode ? (
        <ComposerModal
          mode={composer.mode}
          onClose={closeComposer}
          onCreateTask={(payload) => {
            addTask(payload)
            closeComposer()
          }}
          onCreateNote={(payload) => {
            addNote(payload)
            closeComposer()
          }}
        />
      ) : null}
    </>
  )
}

function ComposerModal({
  mode,
  onClose,
  onCreateTask,
  onCreateNote,
}: {
  mode: 'task' | 'note'
  onClose: () => void
  onCreateTask: (payload: {
    title: string
    description?: string
    dueDate?: string | null
    projectId?: string | null
    status?: (typeof taskStatuses)[number]
  }) => void
  onCreateNote: (payload: {
    title: string
    content?: string
    type?: NoteType
  }) => void
}) {
  const { projects } = useAppContext()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<(typeof taskStatuses)[number]>('Backlog')
  const [noteType, setNoteType] = useState<NoteType>('Quick Note')

  useEffect(() => {
    setTitle('')
    setDescription('')
    setProjectId('')
    setDueDate('')
    setStatus('Backlog')
    setNoteType('Quick Note')
  }, [mode])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="composer" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{mode === 'task' ? 'Create Task' : 'Create Note'}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={mode === 'task' ? 'What needs to be done?' : 'Note title'}
          />
        </label>

        {mode === 'note' ? (
          <label className="field">
            <span>Type</span>
            <select value={noteType} onChange={(event) => setNoteType(event.target.value as NoteType)}>
              {noteTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="field">
          <span>{mode === 'task' ? 'Details' : 'Content'}</span>
          <textarea
            rows={mode === 'task' ? 4 : 7}
            value={description}
            placeholder={mode === 'task' ? 'Add task notes...' : 'Write your note...'}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {mode === 'task' ? (
          <>
            <div className="field-grid">
              <label className="field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as (typeof taskStatuses)[number])}>
                  {taskStatuses.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Project</span>
                <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </>
        ) : null}

        <button
          className="primary-button modal-submit"
          disabled={!title.trim()}
          onClick={() => {
            if (mode === 'task') {
              onCreateTask({
                title,
                description,
                dueDate: dueDate || null,
                projectId: projectId || null,
                status,
              })
              return
            }

            onCreateNote({
              title,
              content: description,
              type: noteType,
            })
          }}
        >
          {mode === 'task' ? 'Create Task' : 'Create Note'}
        </button>
      </div>
    </div>
  )
}
