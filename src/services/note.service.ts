import { createId, nowIso } from '../lib/core'
import type { CreateNoteInput, Note, WorkspaceCoreState } from '../types'

export const noteService = {
  createNote(
    workspace: WorkspaceCoreState,
    input: CreateNoteInput,
  ): WorkspaceCoreState {
    const createdAt = nowIso()
    const note: Note = {
      id: createId('note'),
      title: input.title,
      content: input.content ?? '',
      type: input.type ?? 'Quick Note',
      projectId: input.projectId ?? null,
      tags: [],
      pinned: false,
      createdAt,
      updatedAt: createdAt,
    }

    return {
      ...workspace,
      notes: [note, ...workspace.notes],
    }
  },

  updateNote(
    workspace: WorkspaceCoreState,
    noteId: string,
    patch: Partial<Note>,
  ): WorkspaceCoreState {
    return {
      ...workspace,
      notes: workspace.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...patch,
              updatedAt: nowIso(),
            }
          : note,
      ),
    }
  },
}
