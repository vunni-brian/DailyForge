import { createId, nowIso } from '../lib/core'
import type { CreateNoteInput, Note, WorkspaceState } from '../types'

export const noteService = {
  createNote(workspace: WorkspaceState, input: CreateNoteInput): WorkspaceState {
    const createdAt = nowIso()
    const note: Note = {
      id: createId('note'),
      title: input.title,
      content: input.content ?? '',
      type: 'Quick Note',
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
    workspace: WorkspaceState,
    noteId: string,
    patch: Partial<Note>,
  ): WorkspaceState {
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
