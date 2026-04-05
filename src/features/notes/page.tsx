import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { renderMarkdownPreview } from '../../lib/helpers'

export function NotesPage() {
  const { notes, openComposer, projects, updateNote } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(false)
  const selectedNoteId = searchParams.get('note') ?? notes[0]?.id
  const selectedNote = notes.find((note) => note.id === selectedNoteId)
  const selectedProject = projects.find((project) => project.id === selectedNote?.projectId)

  useEffect(() => {
    if (!selectedNote && notes[0]) {
      setSearchParams({ note: notes[0].id })
    }
  }, [notes, selectedNote, setSearchParams])

  const filteredNotes = notes.filter((note) =>
    [note.title, note.content].join(' ').toLowerCase().includes(search.toLowerCase()),
  )
  const pinnedCount = notes.filter((note) => note.pinned).length
  const researchCount = notes.filter((note) => note.type === 'Research Note').length

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Notes"
        title="Notes vault"
        description="A three-pane knowledge view with fast switching, direct editing, and metadata that stays visible."
        actions={
          <button className="primary-button" onClick={() => openComposer('note')}>
            + New Note
          </button>
        }
      />

      <section className="snapshot-grid snapshot-grid-notes">
        <Panel className="snapshot-card snapshot-card-accent">
          <p className="snapshot-value">{notes.length}</p>
          <p className="snapshot-label">Total notes</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{pinnedCount}</p>
          <p className="snapshot-label">Pinned</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{filteredNotes.length}</p>
          <p className="snapshot-label">Visible</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{researchCount}</p>
          <p className="snapshot-label">Research notes</p>
        </Panel>
      </section>

      <div className="notes-layout">
        <Panel className="notes-list-panel">
          <div className="notes-sidebar-header">
            <div>
              <p className="eyebrow">Library</p>
              <h3>All notes</h3>
            </div>
            <Badge tone="info">{filteredNotes.length}</Badge>
          </div>
          <input
            className="toolbar-search"
            placeholder="Search notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="notes-list">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                className={`note-list-item ${selectedNote?.id === note.id ? 'note-list-item-active' : ''}`}
                onClick={() => setSearchParams({ note: note.id })}
              >
                <div className="section-row">
                  <strong>{note.title}</strong>
                  {note.pinned ? <Badge tone="success">Pinned</Badge> : null}
                </div>
                <p>{note.type}</p>
                <div className="note-list-meta">
                  <span>
                    {projects.find((project) => project.id === note.projectId)?.name ?? 'No project'}
                  </span>
                  <span>{note.tags.length} tags</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="notes-editor-panel">
          {selectedNote ? (
            <>
              <div className="notes-editor-header">
                <div className="notes-editor-title">
                  <p className="eyebrow">Editor</p>
                  <input
                    className="note-title-input"
                    value={selectedNote.title}
                    onChange={(event) =>
                      updateNote(selectedNote.id, { title: event.target.value })
                    }
                  />
                </div>
                <div className="notes-editor-actions">
                  <Badge tone="neutral">{selectedNote.type}</Badge>
                  <div className="segmented-control">
                    <button className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
                      Write
                    </button>
                    <button className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
                      Preview
                    </button>
                  </div>
                </div>
              </div>
              <div className="notes-editor-caption">
                <span>{selectedProject?.name ?? 'No linked project'}</span>
                <span>{selectedNote.tags.length} tags</span>
                <span>{selectedNote.pinned ? 'Pinned note' : 'Autosave on change'}</span>
              </div>

              {preview ? (
                <div className="markdown-preview">{renderMarkdownPreview(selectedNote.content)}</div>
              ) : (
                <textarea
                  className="editor-textarea"
                  value={selectedNote.content}
                  onChange={(event) =>
                    updateNote(selectedNote.id, { content: event.target.value })
                  }
                />
              )}
            </>
          ) : null}
        </Panel>

        <Panel className="notes-meta-panel">
          {selectedNote ? (
            <>
              <div className="notes-meta-header">
                <div>
                  <p className="eyebrow">Metadata</p>
                  <h3>Context</h3>
                </div>
                <Badge tone={selectedNote.pinned ? 'success' : 'info'}>
                  {selectedNote.pinned ? 'Pinned' : 'Active'}
                </Badge>
              </div>
              <div className="note-meta-chips">
                <span>{selectedProject?.name ?? 'No project'}</span>
                <span>{selectedNote.type}</span>
                <span>{selectedNote.tags.length} tags</span>
              </div>
              <label className="field">
                <span>Type</span>
                <select
                  value={selectedNote.type}
                  onChange={(event) =>
                    updateNote(selectedNote.id, {
                      type: event.target.value as typeof selectedNote.type,
                    })
                  }
                >
                  {[
                    'Quick Note',
                    'Research Note',
                    'Meeting Note',
                    'Feature Spec',
                    'Learning Note',
                    'Decision Log',
                    'Issue Log',
                  ].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Project</span>
                <select
                  value={selectedNote.projectId ?? ''}
                  onChange={(event) =>
                    updateNote(selectedNote.id, { projectId: event.target.value || null })
                  }
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tags</span>
                <input
                  value={selectedNote.tags.join(', ')}
                  onChange={(event) =>
                    updateNote(selectedNote.id, {
                      tags: event.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <button
                className="ghost-button"
                onClick={() => updateNote(selectedNote.id, { pinned: !selectedNote.pinned })}
              >
                {selectedNote.pinned ? 'Unpin note' : 'Pin note'}
              </button>
              <div className="note-context-list">
                <div className="note-context-row">
                  <span>Autosave</span>
                  <strong>Immediate</strong>
                </div>
                <div className="note-context-row">
                  <span>Project</span>
                  <strong>{selectedProject?.name ?? 'Unassigned'}</strong>
                </div>
                <div className="note-context-row">
                  <span>Tags</span>
                  <strong>{selectedNote.tags.join(', ') || 'None'}</strong>
                </div>
              </div>
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  )
}
