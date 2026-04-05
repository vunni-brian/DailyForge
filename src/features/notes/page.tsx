import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NoteIcon, PlusIcon, SearchIcon } from '../../components/icons'
import { Badge, PageIntro, Panel } from '../../components/ui'
import { useAppContext } from '../../context/app-context'
import { renderMarkdownPreview } from '../../lib/helpers'

export function NotesPage() {
  const { notes, openComposer, projects, updateNote } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(false)
  const selectedNoteId = searchParams.get('note')
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0]

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) =>
        [note.title, note.content].join(' ').toLowerCase().includes(search.toLowerCase()),
      ),
    [notes, search],
  )

  return (
    <div className="page-stack">
      <PageIntro
        title="Notes"
        actions={
          <button className="primary-button page-cta-button" onClick={() => openComposer('note')}>
            <PlusIcon className="button-icon" />
            <span>New Note</span>
          </button>
        }
      />

      <label className="page-search">
        <SearchIcon className="field-icon" />
        <input
          className="page-search-input"
          placeholder="Search notes..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {filteredNotes.length ? (
        <>
          <section className="notes-card-grid">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                className={selectedNote?.id === note.id ? 'note-summary-card note-summary-card-active' : 'note-summary-card'}
                onClick={() => setSearchParams({ note: note.id })}
              >
                <div className="note-summary-head">
                  <strong>{note.title}</strong>
                  {note.pinned ? <Badge tone="warning">Pinned</Badge> : null}
                </div>
                <p>{note.content.slice(0, 140) || 'No content yet.'}</p>
                <div className="note-summary-meta">
                  <span>{note.type}</span>
                  <span>{projects.find((project) => project.id === note.projectId)?.name ?? 'No project'}</span>
                </div>
              </button>
            ))}
          </section>

          {selectedNote ? (
            <Panel className="note-editor-surface">
              <div className="note-editor-topbar">
                <div>
                  <h3>{selectedNote.title}</h3>
                  <p className="muted-copy">{selectedNote.type}</p>
                </div>
                <div className="segmented-control">
                  <button className={preview ? '' : 'active'} onClick={() => setPreview(false)}>
                    Write
                  </button>
                  <button className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
                    Preview
                  </button>
                </div>
              </div>

              {preview ? (
                <div className="markdown-preview note-markdown-preview">
                  {renderMarkdownPreview(selectedNote.content)}
                </div>
              ) : (
                <textarea
                  className="editor-textarea"
                  value={selectedNote.content}
                  onChange={(event) => updateNote(selectedNote.id, { content: event.target.value })}
                />
              )}
            </Panel>
          ) : null}
        </>
      ) : (
        <div className="page-zero-state">
          <NoteIcon className="page-zero-icon" />
          <p>No notes yet. Create your first note to get started.</p>
        </div>
      )}
    </div>
  )
}
