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

  useEffect(() => {
    if (!selectedNote && notes[0]) {
      setSearchParams({ note: notes[0].id })
    }
  }, [notes, selectedNote, setSearchParams])

  const filteredNotes = notes.filter((note) =>
    [note.title, note.content].join(' ').toLowerCase().includes(search.toLowerCase()),
  )

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

      <div className="notes-layout">
        <Panel className="notes-list-panel">
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
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="notes-editor-panel">
          {selectedNote ? (
            <>
              <div className="section-row">
                <div>
                  <p className="eyebrow">Editor</p>
                  <input
                    className="note-title-input"
                    value={selectedNote.title}
                    onChange={(event) =>
                      updateNote(selectedNote.id, { title: event.target.value })
                    }
                  />
                </div>
                <div className="segmented-control">
                  <button className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
                    Write
                  </button>
                  <button className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
                    Preview
                  </button>
                </div>
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
              <div>
                <p className="eyebrow">Metadata</p>
                <h3>Context</h3>
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
              <p className="muted-copy">
                Autosave is immediate in this prototype through local storage.
              </p>
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  )
}
