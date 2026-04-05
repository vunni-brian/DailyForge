import { useEffect, useState } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAppContext } from '../context/app-context'
import { cx, formatLongDate } from '../lib/helpers'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', shortcut: '1' },
  { label: 'Tasks', path: '/tasks', shortcut: '2' },
  { label: 'Projects', path: '/projects', shortcut: '3' },
  { label: 'Notes', path: '/notes', shortcut: '4' },
  { label: 'Learning', path: '/learning', shortcut: '5' },
  { label: 'Focus', path: '/focus', shortcut: '6' },
  { label: 'Reviews', path: '/reviews', shortcut: '7' },
  { label: 'Settings', path: '/settings', shortcut: ',' },
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
    settings,
    tasks,
    addNote,
    addTask,
    updateSettings,
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
        [project.name, project.description]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()),
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
          <div className="brand-block">
            <div className="brand-mark">DF</div>
            <div>
              <p className="brand-kicker">Daily execution OS</p>
              <h2>DailyForge</h2>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cx('sidebar-link', isActive && 'sidebar-link-active')
                }
              >
                <span>{item.label}</span>
                <kbd>{item.shortcut}</kbd>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer panel">
            <p className="eyebrow">Daily rhythm</p>
            <h3>Morning clarity, evening closure.</h3>
            <p className="muted-copy">
              Build from one place. Capture fast. Finish deliberately.
            </p>
          </div>
        </aside>

        <div className="shell-main">
          <header className="topbar">
            <div className="topbar-copy">
              <p className="eyebrow">Today</p>
              <h2>{formatLongDate(new Date())}</h2>
            </div>

            <div className="topbar-actions">
              <button className="ghost-button search-trigger" onClick={() => setPaletteOpen(true)}>
                Search
                <span>Ctrl + K</span>
              </button>
              <button className="primary-button" onClick={() => openComposer('task')}>
                + Quick Add
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  updateSettings({
                    theme: settings.theme === 'dark' ? 'light' : 'dark',
                  })
                }
              >
                {settings.theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button className="ghost-button" onClick={() => navigate('/settings')}>
                Settings
              </button>
            </div>
          </header>

          <main className="shell-content">
            <Outlet />
          </main>
        </div>
      </div>

      {paletteOpen ? (
        <div className="overlay" onClick={() => setPaletteOpen(false)}>
          <div className="palette" onClick={(event) => event.stopPropagation()}>
            <input
              autoFocus
              className="palette-input"
              placeholder="Search tasks, projects, notes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="palette-results">
              {!query ? (
                <p className="muted-copy">Start typing to search across your workspace.</p>
              ) : null}
              {query && !results.length ? (
                <p className="muted-copy">No results matched that search.</p>
              ) : null}
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
  }) => void
  onCreateNote: (payload: {
    title: string
    content?: string
    projectId?: string | null
  }) => void
}) {
  const { projects } = useAppContext()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    setTitle('')
    setDescription('')
    setProjectId('')
    setDueDate('')
  }, [mode])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="composer" onClick={(event) => event.stopPropagation()}>
        <div className="composer-header">
          <div>
            <p className="eyebrow">Quick capture</p>
            <h3>{mode === 'task' ? 'Create task' : 'Create note'}</h3>
          </div>
          <button className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span>{mode === 'task' ? 'Details' : 'Content'}</span>
          <textarea
            rows={mode === 'task' ? 4 : 8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
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

        {mode === 'task' ? (
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        ) : null}

        <div className="composer-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={!title.trim()}
            onClick={() => {
              if (mode === 'task') {
                onCreateTask({
                  title,
                  description,
                  dueDate: dueDate || null,
                  projectId: projectId || null,
                })
                return
              }

              onCreateNote({
                title,
                content: description,
                projectId: projectId || null,
              })
            }}
          >
            Create {mode}
          </button>
        </div>
      </div>
    </div>
  )
}
