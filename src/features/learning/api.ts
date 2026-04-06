import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { isDesktopRuntime } from '../../db/client'
import type {
  LearningFullBackup,
  LearningSessionBundle,
  LearningSessionCard,
  LearningSessionDetail,
  QuizSubmissionResult,
} from './types'

function ensureDesktop() {
  if (!isDesktopRuntime()) {
    throw new Error('Learning is only available in the desktop app.')
  }
}

async function invokeLearning<T>(command: string, args?: Record<string, unknown>) {
  ensureDesktop()

  try {
    return await invoke<T>(command, args)
  } catch (error) {
    throw new Error(extractLearningError(error))
  }
}

export const learningApi = {
  listSessions() {
    return invokeLearning<LearningSessionCard[]>('learning_list_sessions')
  },

  createSession(input: {
    title: string
    subject?: string
    description?: string
    goals?: string
  }) {
    return invokeLearning<LearningSessionCard>('learning_create_session', { input })
  },

  async createSessionFromDialog() {
    ensureDesktop()

    const selected = await open({
      directory: false,
      multiple: false,
      filters: [studyFileFilter],
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    return invokeLearning<LearningSessionCard>('learning_create_session_from_file', {
      input: {
        filePath: selected,
      },
    })
  },

  getSessionDetail(sessionId: string) {
    return invokeLearning<LearningSessionDetail>('learning_get_session_detail', {
      sessionId,
    })
  },

  updateSession(
    sessionId: string,
    patch: {
      title?: string
      subject?: string
      description?: string
      goals?: string
      status?: string
    },
  ) {
    return invokeLearning<LearningSessionDetail>('learning_update_session', {
      sessionId,
      patch,
    })
  },

  deleteSession(sessionId: string) {
    return invokeLearning<void>('learning_delete_session', { sessionId })
  },

  addSource(input: {
    sessionId: string
    sourceType: string
    title: string
    rawContent?: string
    sourceUrl?: string
  }) {
    return invokeLearning<LearningSessionDetail>('learning_add_source', { input })
  },

  async attachFile(sessionId: string, file: File) {
    const buffer = await file.arrayBuffer()
    const base64Data = arrayBufferToBase64(buffer)

    return invokeLearning<LearningSessionDetail>('learning_attach_file', {
      input: {
        sessionId,
        fileName: file.name,
        mimeType: file.type || null,
        base64Data,
      },
    })
  },

  async attachFileFromDialog(sessionId: string) {
    ensureDesktop()

    const selected = await open({
      directory: false,
      multiple: false,
      filters: [studyFileFilter],
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    return invokeLearning<LearningSessionDetail>('learning_attach_file_from_path', {
      input: {
        sessionId,
        filePath: selected,
      },
    })
  },

  async importFolderFromDialog(sessionId: string) {
    ensureDesktop()

    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select a folder of study materials',
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    return invokeLearning<LearningSessionDetail>('learning_import_folder', {
      input: {
        sessionId,
        folderPath: selected,
      },
    })
  },

  deleteSource(sessionId: string, sourceId: string) {
    return invokeLearning<LearningSessionDetail>('learning_delete_source', {
      sessionId,
      sourceId,
    })
  },

  generateSummary(sessionId: string) {
    return invokeLearning<LearningSessionDetail>('learning_generate_summary', {
      sessionId,
    })
  },

  generateFlashcards(sessionId: string) {
    return invokeLearning<LearningSessionDetail>('learning_generate_flashcards', {
      sessionId,
    })
  },

  reviewFlashcard(sessionId: string, flashcardId: string, correct: boolean) {
    return invokeLearning<LearningSessionDetail>('learning_review_flashcard', {
      input: {
        sessionId,
        flashcardId,
        correct,
      },
    })
  },

  generateQuiz(sessionId: string, questionCount: number, difficulty: string) {
    return invokeLearning<LearningSessionDetail>('learning_generate_quiz', {
      input: {
        sessionId,
        questionCount,
        difficulty,
      },
    })
  },

  submitQuiz(
    sessionId: string,
    quizId: string,
    answers: Array<{ questionId: string; answer: string }>,
  ) {
    return invokeLearning<QuizSubmissionResult>('learning_submit_quiz', {
      input: {
        sessionId,
        quizId,
        answers,
      },
    })
  },

  createTutorThread(sessionId: string, title?: string) {
    return invokeLearning<LearningSessionDetail>('learning_create_tutor_thread', {
      input: {
        sessionId,
        title,
      },
    })
  },

  sendTutorMessage(sessionId: string, threadId: string, message: string) {
    return invokeLearning<LearningSessionDetail>('learning_send_tutor_message', {
      input: {
        sessionId,
        threadId,
        message,
      },
    })
  },

  exportSessionBundle(sessionId: string) {
    return invokeLearning<LearningSessionBundle>('learning_export_session_bundle', {
      sessionId,
    })
  },

  exportFlashcardsCsv(sessionId: string) {
    return invokeLearning<string>('learning_export_flashcards_csv', {
      sessionId,
    })
  },

  importSessionBundle(bundle: LearningSessionBundle) {
    return invokeLearning<LearningSessionCard>('learning_import_session_bundle', {
      bundle,
    })
  },

  exportFullBackup() {
    return invokeLearning<LearningFullBackup>('learning_export_full_backup')
  },

  importFullBackup(backup: LearningFullBackup) {
    return invokeLearning<LearningSessionCard[]>('learning_import_full_backup', {
      backup,
    })
  },
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return window.btoa(binary)
}

const studyFileFilter = {
  name: 'Study files',
  extensions: [
    'txt',
    'md',
    'csv',
    'json',
    'yaml',
    'yml',
    'xml',
    'html',
    'htm',
    'rtf',
    'pdf',
    'docx',
    'docm',
    'doc',
    'pptx',
    'pptm',
    'ppt',
    'xls',
    'xlsx',
    'xlsm',
    'ods',
    'odt',
    'odp',
    'epub',
    'pages',
    'numbers',
    'key',
    'ini',
    'log',
    'tex',
    'rst',
    'jpeg',
    'jpg',
    'png',
    'gif',
    'bmp',
    'webp',
    'heic',
    'mp3',
    'wav',
    'm4a',
    'mp4',
    'mov',
    'webm',
  ],
}

function extractLearningError(error: unknown) {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }

    if ('error' in error && typeof error.error === 'string') {
      return error.error
    }
  }

  return 'Learning action failed.'
}
