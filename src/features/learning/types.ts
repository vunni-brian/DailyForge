export type LearningSessionStatus = 'active' | 'paused' | 'completed' | 'archived'
export type LearningSourceType =
  | 'text'
  | 'note'
  | 'url'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'file'
export type FlashcardDifficulty = 'easy' | 'medium' | 'hard'
export type QuizQuestionType = 'mcq' | 'short_answer' | 'true_false'

export interface LearningSessionCard {
  id: string
  title: string
  subject: string
  description: string
  goals: string
  status: LearningSessionStatus | string
  completionPercent: number
  confidenceScore: number
  totalStudyMinutes: number
  createdAt: string
  updatedAt: string
  lastStudiedAt: string | null
  sourceCount: number
  flashcardCount: number
  quizCount: number
  dueFlashcards: number
  nextReviewAt: string | null
}

export interface LearningSource {
  id: string
  sessionId: string
  sourceType: LearningSourceType | string
  title: string
  rawContent: string | null
  sourceUrl: string | null
  filePath: string | null
  extractedText: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
}

export interface LearningConcept {
  term: string
  explanation: string
}

export interface LearningDefinition {
  term: string
  definition: string
}

export interface LearningSummary {
  id: string
  sessionId: string
  summaryShort: string
  summaryDetailed: string
  keyConcepts: LearningConcept[]
  definitions: LearningDefinition[]
  actionPoints: string[]
  generatedAt: string
  sourceVersionHash: string
}

export interface Flashcard {
  id: string
  sessionId: string
  front: string
  back: string
  difficulty: FlashcardDifficulty | string
  tags: string[]
  sourceRef: string
  createdAt: string
  lastReviewedAt: string | null
  nextReviewAt: string | null
  reviewCount: number
  correctCount: number
}

export interface QuizQuestion {
  id: string
  quizId: string
  questionType: QuizQuestionType | string
  prompt: string
  options: string[]
  answer: string
  explanation: string
  difficulty: FlashcardDifficulty | string
  orderIndex: number
}

export interface Quiz {
  id: string
  sessionId: string
  title: string
  instructions: string
  createdAt: string
  questionCount: number
  scorePercent: number | null
  completedAt: string | null
  questions: QuizQuestion[]
}

export interface TutorMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system' | string
  content: string
  citations: string[]
  createdAt: string
}

export interface TutorThread {
  id: string
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
  messages: TutorMessage[]
}

export interface LearningReview {
  id: string
  sessionId: string
  reviewType: string
  durationMinutes: number
  confidenceBefore: number | null
  confidenceAfter: number | null
  notes: string
  createdAt: string
}

export interface LearningProgressSnapshot {
  completionPercent: number
  confidenceScore: number
  totalStudyMinutes: number
  sourceCount: number
  flashcardCount: number
  completedQuizCount: number
  averageQuizScore: number | null
  flashcardAccuracy: number | null
  reviewCount: number
  tutorMessageCount: number
  nextReviewAt: string | null
  lastStudiedAt: string | null
  recommendedNextStep: string
}

export interface LearningSessionDetail {
  session: LearningSessionCard
  sources: LearningSource[]
  latestSummary: LearningSummary | null
  flashcards: Flashcard[]
  quizzes: Quiz[]
  threads: TutorThread[]
  reviews: LearningReview[]
  progress: LearningProgressSnapshot
  openTutorThreadId: string | null
}

export interface LearningSourceBundle {
  source: LearningSource
  fileBase64: string | null
}

export interface LearningSessionBundle {
  version: number
  exportedAt: string
  session: LearningSessionCard
  sources: LearningSourceBundle[]
  latestSummary: LearningSummary | null
  flashcards: Flashcard[]
  quizzes: Quiz[]
  threads: TutorThread[]
  reviews: LearningReview[]
}

export interface LearningFullBackup {
  version: number
  exportedAt: string
  sessions: LearningSessionBundle[]
}

export interface QuizSubmissionResult {
  scorePercent: number
  correctCount: number
  totalQuestions: number
  weakTopics: string[]
  detail: LearningSessionDetail
}
