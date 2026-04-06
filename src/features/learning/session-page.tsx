import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DownloadIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  TargetIcon,
  TrashIcon,
} from '../../components/icons'
import { Badge, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { formatMinutes, formatShortDate } from '../../lib/helpers'
import { learningApi } from './api'
import type {
  LearningSessionDetail,
  LearningSource,
  Quiz,
} from './types'

const learningTabs = [
  'Overview',
  'Sources',
  'Summary',
  'Flashcards',
  'Quiz',
  'Tutor',
  'Progress',
] as const

export function LearningSessionPage() {
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const [detail, setDetail] = useState<LearningSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] =
    useState<(typeof learningTabs)[number]>('Overview')
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editGoals, setEditGoals] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [sourceType, setSourceType] = useState('text')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceContent, setSourceContent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [studyIndex, setStudyIndex] = useState(0)
  const [studyRevealed, setStudyRevealed] = useState(false)
  const [quizDifficulty, setQuizDifficulty] = useState('mixed')
  const [quizQuestionCount, setQuizQuestionCount] = useState(8)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizResult, setQuizResult] = useState<{
    scorePercent: number
    weakTopics: string[]
  } | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadTitle, setThreadTitle] = useState('')
  const [tutorInput, setTutorInput] = useState('')

  useEffect(() => {
    let active = true

    const loadDetail = async () => {
      setLoading(true)
      try {
        const nextDetail = await learningApi.getSessionDetail(sessionId)
        if (!active) {
          return
        }

        setDetail(nextDetail)
        setError(null)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load the session.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      active = false
    }
  }, [sessionId])

  useEffect(() => {
    if (!detail?.threads.length) {
      setSelectedThreadId(null)
      return
    }

    setSelectedThreadId((current) => {
      if (current && detail.threads.some((thread) => thread.id === current)) {
        return current
      }

      return detail.openTutorThreadId ?? detail.threads[0].id
    })
  }, [detail])

  const activeThread = useMemo(() => {
    if (!detail?.threads.length) {
      return null
    }

    return (
      detail.threads.find((thread) => thread.id === selectedThreadId) ??
      detail.threads[0]
    )
  }, [detail?.threads, selectedThreadId])

  const currentQuiz = detail?.quizzes[0] ?? null
  const currentCard = detail?.flashcards[studyIndex] ?? null

  const applyDetail = (
    nextDetail: LearningSessionDetail,
    options?: { studyIndex?: number },
  ) => {
    setDetail(nextDetail)
    setStudyIndex((current) =>
      Math.max(
        0,
        Math.min(
          typeof options?.studyIndex === 'number' ? options.studyIndex : current,
          Math.max(nextDetail.flashcards.length - 1, 0),
        ),
      ),
    )
    setStudyRevealed(false)
  }

  const runAction = async (
    actionName: string,
    action: () => Promise<LearningSessionDetail>,
  ) => {
    setBusyAction(actionName)
    try {
      const nextDetail = await action()
      applyDetail(nextDetail)
      setError(null)
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Learning action failed.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const openEditModal = () => {
    if (!detail) {
      return
    }

    setEditTitle(detail.session.title)
    setEditSubject(detail.session.subject)
    setEditDescription(detail.session.description)
    setEditGoals(detail.session.goals)
    setEditStatus(detail.session.status)
    setEditOpen(true)
  }

  const handleSaveSession = async () => {
    if (!detail) {
      return
    }

    await runAction('save-session', () =>
      learningApi.updateSession(detail.session.id, {
        title: editTitle,
        subject: editSubject,
        description: editDescription,
        goals: editGoals,
        status: editStatus,
      }),
    )
    setEditOpen(false)
  }

  const handleAddSource = async () => {
    if (!detail) {
      return
    }

    await runAction('add-source', () =>
      learningApi.addSource({
        sessionId: detail.session.id,
        sourceType,
        title: sourceTitle,
        rawContent: sourceContent,
        sourceUrl,
      }),
    )
    setSourceTitle('')
    setSourceContent('')
    setSourceUrl('')
  }

  const handleAttachFile = async () => {
    if (!detail) {
      return
    }

    setBusyAction('attach-file')
    try {
      const nextDetail = await learningApi.attachFileFromDialog(detail.session.id)
      if (!nextDetail) {
        return
      }
      applyDetail(nextDetail)
      setError(null)
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : 'Could not attach the file.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!detail) {
      return
    }

    await runAction('delete-source', () =>
      learningApi.deleteSource(detail.session.id, sourceId),
    )
  }

  const handleReviewFlashcard = async (correct: boolean) => {
    if (!detail || !currentCard) {
      return
    }

    const nextIndex =
      detail.flashcards.length > 1
        ? studyIndex >= detail.flashcards.length - 1
          ? 0
          : studyIndex + 1
        : 0

    setBusyAction('review-flashcard')
    try {
      const nextDetail = await learningApi.reviewFlashcard(
        detail.session.id,
        currentCard.id,
        correct,
      )
      applyDetail(nextDetail, { studyIndex: nextIndex })
      setError(null)
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Could not save the flashcard review.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!detail) {
      return
    }

    await runAction('generate-quiz', () =>
      learningApi.generateQuiz(
        detail.session.id,
        quizQuestionCount,
        quizDifficulty,
      ),
    )
    setQuizAnswers({})
    setQuizResult(null)
  }

  const handleSubmitQuiz = async (quiz: Quiz) => {
    if (!detail) {
      return
    }

    setBusyAction('submit-quiz')
    try {
      const result = await learningApi.submitQuiz(
        detail.session.id,
        quiz.id,
        quiz.questions.map((question) => ({
          questionId: question.id,
          answer: quizAnswers[question.id] ?? '',
        })),
      )
      applyDetail(result.detail)
      setQuizResult({
        scorePercent: result.scorePercent,
        weakTopics: result.weakTopics,
      })
      setError(null)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit the quiz.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleCreateThread = async () => {
    if (!detail) {
      return
    }

    await runAction('create-thread', () =>
      learningApi.createTutorThread(detail.session.id, threadTitle || undefined),
    )
    setThreadTitle('')
  }

  const handleSendTutorMessage = async () => {
    if (!detail || !activeThread) {
      return
    }

    setBusyAction('send-message')
    try {
      const nextDetail = await learningApi.sendTutorMessage(
        detail.session.id,
        activeThread.id,
        tutorInput,
      )
      applyDetail(nextDetail)
      setTutorInput('')
      setError(null)
    } catch (messageError) {
      setError(
        messageError instanceof Error
          ? messageError.message
          : 'Could not send the tutor message.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportSession = async () => {
    if (!detail) {
      return
    }

    setBusyAction('export-session')
    try {
      const bundle = await learningApi.exportSessionBundle(detail.session.id)
      downloadText(
        `${detail.session.title.replace(/\s+/g, '-').toLowerCase()}-session.json`,
        JSON.stringify(bundle, null, 2),
        'application/json',
      )
      setError(null)
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Could not export the session bundle.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportFlashcards = async () => {
    if (!detail) {
      return
    }

    setBusyAction('export-csv')
    try {
      const csv = await learningApi.exportFlashcardsCsv(detail.session.id)
      downloadText(
        `${detail.session.title.replace(/\s+/g, '-').toLowerCase()}-flashcards.csv`,
        csv,
        'text/csv',
      )
      setError(null)
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Could not export the flashcards.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteSession = async () => {
    if (!detail) {
      return
    }

    if (!window.confirm('Delete this learning session and all of its study data?')) {
      return
    }

    setBusyAction('delete-session')
    try {
      await learningApi.deleteSession(detail.session.id)
      navigate('/learning')
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete the session.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return (
      <Panel className="learning-empty-panel">
        <p>Loading the session workspace...</p>
      </Panel>
    )
  }

  if (!detail) {
    return (
      <Panel className="learning-empty-panel">
        <p>{error ?? 'This session could not be loaded.'}</p>
      </Panel>
    )
  }

  const quizScore = quizResult?.scorePercent ?? currentQuiz?.scorePercent ?? null
  const weakTopics = quizResult?.weakTopics ?? []

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Learning Session"
        title={detail.session.title}
        description={detail.session.subject || 'Learning workspace'}
        actions={
          <>
            <button className="ghost-button" onClick={() => navigate('/learning')}>
              Back
            </button>
            <button className="ghost-button" onClick={() => void handleExportSession()}>
              <DownloadIcon className="button-icon" />
              <span>Export JSON</span>
            </button>
            <button className="ghost-button" onClick={() => void handleExportFlashcards()}>
              <DownloadIcon className="button-icon" />
              <span>Flashcards CSV</span>
            </button>
            <button className="primary-button" onClick={openEditModal}>
              Edit Session
            </button>
          </>
        }
      />

      {error ? <p className="text-danger">{error}</p> : null}

      <Panel className="learning-session-header">
        <div className="learning-session-overview">
          <div>
            <Badge tone={detail.session.status === 'completed' ? 'success' : 'info'}>
              {detail.session.status}
            </Badge>
            <p className="modal-subcopy">{detail.progress.recommendedNextStep}</p>
          </div>
          <div className="learning-session-progress">
            <strong>{detail.progress.completionPercent}% complete</strong>
            <ProgressBar value={detail.progress.completionPercent} />
          </div>
        </div>
        <div className="learning-quick-actions">
          <button
            className="ghost-button"
            onClick={() =>
              void runAction('generate-summary', () =>
                learningApi.generateSummary(detail.session.id),
              )
            }
          >
            <RotateCcwIcon className="button-icon" />
            <span>{busyAction === 'generate-summary' ? 'Working...' : 'Generate Summary'}</span>
          </button>
          <button
            className="ghost-button"
            onClick={() =>
              void runAction('generate-flashcards', () =>
                learningApi.generateFlashcards(detail.session.id),
              )
            }
          >
            <TargetIcon className="button-icon" />
            <span>{busyAction === 'generate-flashcards' ? 'Working...' : 'Generate Flashcards'}</span>
          </button>
          <button className="ghost-button" onClick={() => void handleGenerateQuiz()}>
            <PlayIcon className="button-icon" />
            <span>{busyAction === 'generate-quiz' ? 'Working...' : 'Generate Quiz'}</span>
          </button>
        </div>
      </Panel>

      <div className="filter-bar">
        {learningTabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'filter-pill filter-pill-active' : 'filter-pill'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' ? (
        <div className="learning-session-layout">
          <Panel className="learning-session-pane">
            <h3>Overview</h3>
            <p>{detail.session.description || 'No description yet.'}</p>
            <p>{detail.session.goals || 'No study goal set yet.'}</p>
            <div className="learning-key-metrics">
              <span>{detail.sources.length} sources</span>
              <span>{detail.flashcards.length} flashcards</span>
              <span>{detail.quizzes.length} quizzes</span>
              <span>{detail.threads.length} tutor threads</span>
            </div>
          </Panel>

          <Panel className="learning-session-pane">
            <h3>Progress Snapshot</h3>
            <div className="learning-progress-list">
              <span>Confidence: {detail.progress.confidenceScore}%</span>
              <span>Study time: {formatMinutes(detail.progress.totalStudyMinutes)}</span>
              <span>
                Next review: {detail.progress.nextReviewAt ? formatShortDate(detail.progress.nextReviewAt) : 'Not scheduled'}
              </span>
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'Sources' ? (
        <div className="learning-session-layout">
          <Panel className="learning-session-pane">
            <h3>Add Source</h3>
            <div className="field-grid">
              <label className="field">
                <span>Type</span>
                <select
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="note">Note</option>
                  <option value="url">URL</option>
                </select>
              </label>
              <label className="field">
                <span>Title</span>
                <input
                  value={sourceTitle}
                  onChange={(event) => setSourceTitle(event.target.value)}
                  placeholder="Source title"
                />
              </label>
            </div>

            {sourceType === 'url' ? (
              <label className="field">
                <span>URL</span>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
            ) : null}

            <label className="field">
              <span>{sourceType === 'url' ? 'Notes' : 'Content'}</span>
              <textarea
                rows={6}
                value={sourceContent}
                onChange={(event) => setSourceContent(event.target.value)}
                placeholder={
                  sourceType === 'url'
                    ? 'Optional notes about what this source contains.'
                    : 'Paste your study material here.'
                }
              />
            </label>

            <div className="learning-inline-actions">
              <button
                className="primary-button"
                disabled={
                  !sourceTitle.trim() ||
                  (sourceType === 'url' && !sourceUrl.trim()) ||
                  busyAction === 'add-source'
                }
                onClick={() => void handleAddSource()}
              >
                {busyAction === 'add-source' ? 'Saving...' : 'Save Source'}
              </button>
              <button
                className="ghost-button learning-file-button"
                onClick={() => void handleAttachFile()}
              >
                <span>{busyAction === 'attach-file' ? 'Uploading...' : 'Attach File'}</span>
              </button>
            </div>
          </Panel>
          <Panel className="learning-session-pane">
            <h3>Source Library</h3>
            {detail.sources.length ? (
              <div className="learning-source-list">
                {detail.sources.map((source) => (
                  <article key={source.id} className="learning-source-card">
                    <div className="learning-source-head">
                      <div>
                        <h4>{source.title}</h4>
                        <div className="learning-source-meta">
                          <Badge tone="info">{source.sourceType}</Badge>
                          <span>{formatShortDate(source.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => void handleDeleteSource(source.id)}
                        aria-label={`Delete ${source.title}`}
                      >
                        <TrashIcon className="button-icon" />
                      </button>
                    </div>
                    <p className="learning-source-preview">{sourcePreview(source)}</p>
                    {source.sourceUrl ? (
                      <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                        {source.sourceUrl}
                      </a>
                    ) : null}
                    {source.filePath ? <small>{source.filePath}</small> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-copy">Add notes, links, or files to build the study context.</p>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'Summary' ? (
        detail.latestSummary ? (
          <div className="learning-summary-grid">
            <Panel className="learning-session-pane">
              <div className="learning-source-head">
                <div>
                  <h3>Quick Summary</h3>
                  <p className="modal-subcopy">
                    Generated {formatShortDate(detail.latestSummary.generatedAt)}
                  </p>
                </div>
                <button
                  className="ghost-button"
                  onClick={() =>
                    void runAction('generate-summary', () =>
                      learningApi.generateSummary(detail.session.id),
                    )
                  }
                >
                  <RotateCcwIcon className="button-icon" />
                  <span>Regenerate</span>
                </button>
              </div>
              <p>{detail.latestSummary.summaryShort}</p>
              <h4>Detailed Notes</h4>
              <p>{detail.latestSummary.summaryDetailed}</p>
            </Panel>

            <Panel className="learning-session-pane">
              <h3>Key Concepts</h3>
              <ul className="learning-bullet-list">
                {detail.latestSummary.keyConcepts.map((concept) => (
                  <li key={concept.term}>
                    <strong>{concept.term}</strong>
                    <p>{concept.explanation}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="learning-session-pane">
              <h3>Definitions</h3>
              <ul className="learning-bullet-list">
                {detail.latestSummary.definitions.map((definition) => (
                  <li key={definition.term}>
                    <strong>{definition.term}</strong>
                    <p>{definition.definition}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="learning-session-pane">
              <h3>Action Points</h3>
              <ul className="learning-bullet-list">
                {detail.latestSummary.actionPoints.map((item) => (
                  <li key={item}>
                    <p>{item}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : (
          <Panel className="learning-empty-panel">
            <p>No summary yet. Generate one after adding source material.</p>
          </Panel>
        )
      ) : null}

      {activeTab === 'Flashcards' ? (
        detail.flashcards.length ? (
          <div className="learning-session-layout">
            <Panel className="learning-session-pane learning-study-card">
              <div className="learning-source-head">
                <div>
                  <h3>Study Mode</h3>
                  <p className="modal-subcopy">
                    Card {studyIndex + 1} of {detail.flashcards.length}
                  </p>
                </div>
                <Badge tone="warning">{currentCard?.difficulty ?? 'medium'}</Badge>
              </div>

              {currentCard ? (
                <>
                  <strong>{currentCard.front}</strong>
                  <p>
                    {studyRevealed
                      ? currentCard.back
                      : 'Reveal the answer when you are ready.'}
                  </p>
                  <div className="learning-progress-list">
                    <span>Reviews: {currentCard.reviewCount}</span>
                    <span>
                      Accuracy:{' '}
                      {currentCard.reviewCount
                        ? `${Math.round((currentCard.correctCount / currentCard.reviewCount) * 100)}%`
                        : 'No reviews yet'}
                    </span>
                  </div>
                  <div className="learning-inline-actions">
                    <button
                      className="ghost-button"
                      onClick={() =>
                        setStudyIndex((current) =>
                          current === 0 ? detail.flashcards.length - 1 : current - 1,
                        )
                      }
                    >
                      Previous
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => setStudyRevealed((current) => !current)}
                    >
                      {studyRevealed ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={busyAction === 'review-flashcard'}
                      onClick={() => void handleReviewFlashcard(false)}
                    >
                      Needs Review
                    </button>
                    <button
                      className="primary-button"
                      disabled={busyAction === 'review-flashcard'}
                      onClick={() => void handleReviewFlashcard(true)}
                    >
                      Mark Correct
                    </button>
                  </div>
                </>
              ) : null}
            </Panel>

            <Panel className="learning-session-pane">
              <div className="learning-source-head">
                <div>
                  <h3>Card Library</h3>
                  <p className="modal-subcopy">
                    Accuracy:{' '}
                    {detail.progress.flashcardAccuracy !== null
                      ? `${detail.progress.flashcardAccuracy}%`
                      : 'Not enough data yet'}
                  </p>
                </div>
                <button
                  className="ghost-button"
                  onClick={() =>
                    void runAction('generate-flashcards', () =>
                      learningApi.generateFlashcards(detail.session.id),
                    )
                  }
                >
                  <RotateCcwIcon className="button-icon" />
                  <span>Regenerate</span>
                </button>
              </div>
              <div className="learning-flashcard-list">
                {detail.flashcards.map((card, index) => (
                  <button
                    key={card.id}
                    className={
                      index === studyIndex
                        ? 'learning-flashcard-row selected'
                        : 'learning-flashcard-row'
                    }
                    onClick={() => {
                      setStudyIndex(index)
                      setStudyRevealed(false)
                    }}
                  >
                    <div>
                      <strong>{card.front}</strong>
                      <p>{card.back}</p>
                    </div>
                    <div className="learning-review-meta">
                      <span>{card.difficulty}</span>
                      <span>{card.reviewCount} reviews</span>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        ) : (
          <Panel className="learning-empty-panel">
            <p>No flashcards yet. Generate a deck from your sources or summary.</p>
          </Panel>
        )
      ) : null}

      {activeTab === 'Quiz' ? (
        <div className="learning-session-layout">
          <Panel className="learning-session-pane">
            <h3>Generate Quiz</h3>
            <div className="field-grid">
              <label className="field">
                <span>Difficulty</span>
                <select
                  value={quizDifficulty}
                  onChange={(event) => setQuizDifficulty(event.target.value)}
                >
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="field">
                <span>Question count</span>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={quizQuestionCount}
                  onChange={(event) =>
                    setQuizQuestionCount(
                      Math.max(4, Math.min(12, Number(event.target.value) || 4)),
                    )
                  }
                />
              </label>
            </div>
            <button className="primary-button modal-submit" onClick={() => void handleGenerateQuiz()}>
              {busyAction === 'generate-quiz' ? 'Generating...' : 'Generate Quiz'}
            </button>
          </Panel>

          <Panel className="learning-session-pane">
            {currentQuiz ? (
              <div className="learning-quiz-panel">
                <div className="learning-source-head">
                  <div>
                    <h3>{currentQuiz.title}</h3>
                    <p className="modal-subcopy">{currentQuiz.instructions}</p>
                  </div>
                  <Badge tone={quizScore !== null ? 'success' : 'info'}>
                    {quizScore !== null
                      ? `${quizScore}%`
                      : `${currentQuiz.questionCount} questions`}
                  </Badge>
                </div>

                {currentQuiz.questions.map((question, index) => {
                  const choiceOptions =
                    question.options.length > 0
                      ? question.options
                      : question.questionType === 'true_false'
                        ? ['True', 'False']
                        : []

                  return (
                    <div key={question.id} className="learning-quiz-question">
                      <div className="learning-source-head">
                        <strong>
                          {index + 1}. {question.prompt}
                        </strong>
                        <span>{question.questionType}</span>
                      </div>

                      {choiceOptions.length ? (
                        <div className="learning-choice-list">
                          {choiceOptions.map((option) => (
                            <label key={option} className="learning-choice-item">
                              <input
                                type="radio"
                                name={question.id}
                                checked={(quizAnswers[question.id] ?? '') === option}
                                onChange={() =>
                                  setQuizAnswers((current) => ({
                                    ...current,
                                    [question.id]: option,
                                  }))
                                }
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          rows={3}
                          value={quizAnswers[question.id] ?? ''}
                          onChange={(event) =>
                            setQuizAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Write your answer..."
                        />
                      )}

                      {quizScore !== null || currentQuiz.completedAt ? (
                        <div className="learning-quiz-explanation">
                          <p>
                            <strong>Answer:</strong> {question.answer}
                          </p>
                          <p>{question.explanation}</p>
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                <button
                  className="primary-button"
                  disabled={busyAction === 'submit-quiz'}
                  onClick={() => void handleSubmitQuiz(currentQuiz)}
                >
                  {busyAction === 'submit-quiz' ? 'Submitting...' : 'Submit Quiz'}
                </button>

                {quizScore !== null ? (
                  <div className="learning-quiz-result">
                    <strong>Score: {quizScore}%</strong>
                    <span>
                      Weak topics:{' '}
                      {weakTopics.length
                        ? weakTopics.join(', ')
                        : 'No clear weak spots detected.'}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="muted-copy">
                No quiz yet. Generate one when you are ready to test yourself.
              </p>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'Tutor' ? (
        <div className="learning-session-layout">
          <Panel className="learning-session-pane">
            <h3>Tutor Threads</h3>
            <label className="field">
              <span>New thread title</span>
              <input
                value={threadTitle}
                onChange={(event) => setThreadTitle(event.target.value)}
                placeholder="Leave blank for an automatic title"
              />
            </label>
            <button
              className="primary-button modal-submit"
              onClick={() => void handleCreateThread()}
            >
              <PlusIcon className="button-icon" />
              <span>{busyAction === 'create-thread' ? 'Creating...' : 'Create Thread'}</span>
            </button>

            <div className="learning-thread-list">
              {detail.threads.length ? (
                detail.threads.map((thread) => (
                  <button
                    key={thread.id}
                    className={
                      thread.id === activeThread?.id
                        ? 'learning-thread-item learning-thread-item-active'
                        : 'learning-thread-item'
                    }
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <strong>{thread.title}</strong>
                    <span>{formatShortDate(thread.updatedAt)}</span>
                  </button>
                ))
              ) : (
                <p className="muted-copy">Create a thread to start grounded tutor chat.</p>
              )}
            </div>
          </Panel>

          <Panel className="learning-session-pane">
            <div className="learning-source-head">
              <div>
                <h3>{activeThread?.title ?? 'Tutor Chat'}</h3>
                <p className="modal-subcopy">
                  Answers stay grounded in this session&apos;s saved study material.
                </p>
              </div>
              {activeThread ? (
                <Badge tone="info">{activeThread.messages.length} messages</Badge>
              ) : null}
            </div>

            <div className="learning-inline-actions">
              {[
                'Explain this simply.',
                'Test me on the hardest concept here.',
                'What are the weak points in this material?',
                'Give me a real-world example.',
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="filter-pill"
                  onClick={() => setTutorInput(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {activeThread ? (
              <>
                <div className="learning-chat-log">
                  {activeThread.messages.length ? (
                    activeThread.messages.map((message) => (
                      <article
                        key={message.id}
                        className={
                          message.role === 'assistant'
                            ? 'learning-chat-message learning-chat-message-assistant'
                            : 'learning-chat-message'
                        }
                      >
                        <strong>{message.role === 'assistant' ? 'Tutor' : 'You'}</strong>
                        <p>{message.content}</p>
                        <span>{formatShortDate(message.createdAt)}</span>
                      </article>
                    ))
                  ) : (
                    <p className="muted-copy">
                      Ask the tutor to explain, test, or clarify this topic.
                    </p>
                  )}
                </div>

                <label className="field">
                  <span>Message</span>
                  <textarea
                    rows={4}
                    value={tutorInput}
                    onChange={(event) => setTutorInput(event.target.value)}
                    placeholder="Ask a question about this session..."
                  />
                </label>
                <button
                  className="primary-button modal-submit"
                  disabled={!tutorInput.trim() || busyAction === 'send-message'}
                  onClick={() => void handleSendTutorMessage()}
                >
                  {busyAction === 'send-message' ? 'Sending...' : 'Send to Tutor'}
                </button>
              </>
            ) : (
              <p className="muted-copy">No active thread selected.</p>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'Progress' ? (
        <div className="learning-session-layout">
          <Panel className="learning-session-pane">
            <h3>Progress Metrics</h3>
            <div className="learning-metric-grid">
              <div className="learning-metric-card">
                <strong>{detail.progress.completionPercent}%</strong>
                <span>Completion</span>
              </div>
              <div className="learning-metric-card">
                <strong>{detail.progress.confidenceScore}%</strong>
                <span>Confidence</span>
              </div>
              <div className="learning-metric-card">
                <strong>
                  {detail.progress.averageQuizScore !== null
                    ? `${detail.progress.averageQuizScore}%`
                    : 'N/A'}
                </strong>
                <span>Average quiz score</span>
              </div>
              <div className="learning-metric-card">
                <strong>
                  {detail.progress.flashcardAccuracy !== null
                    ? `${detail.progress.flashcardAccuracy}%`
                    : 'N/A'}
                </strong>
                <span>Flashcard accuracy</span>
              </div>
            </div>
            <div className="learning-progress-list">
              <span>Study time: {formatMinutes(detail.progress.totalStudyMinutes)}</span>
              <span>Reviews logged: {detail.progress.reviewCount}</span>
              <span>Completed quizzes: {detail.progress.completedQuizCount}</span>
              <span>Tutor answers: {detail.progress.tutorMessageCount}</span>
            </div>
          </Panel>

          <Panel className="learning-session-pane">
            <h3>Review Timeline</h3>
            {detail.reviews.length ? (
              <div className="learning-review-log">
                {detail.reviews.map((review) => (
                  <div key={review.id} className="learning-review-row">
                    <div>
                      <strong>{review.reviewType.replace(/_/g, ' ')}</strong>
                      <p>{review.notes || 'Study activity recorded.'}</p>
                    </div>
                    <div className="learning-review-meta">
                      <span>{formatMinutes(review.durationMinutes)}</span>
                      <span>{formatShortDate(review.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy">No review history yet.</p>
            )}
          </Panel>
        </div>
      ) : null}

      <Panel className="learning-session-pane learning-session-danger">
        <h3>Delete Session</h3>
        <p>
          Remove this session, its attached files, flashcards, quizzes, tutor threads,
          and review history.
        </p>
        <button
          className="settings-action-button settings-action-button-danger"
          disabled={busyAction === 'delete-session'}
          onClick={() => void handleDeleteSession()}
        >
          <TrashIcon className="settings-action-icon" />
          <span>{busyAction === 'delete-session' ? 'Deleting...' : 'Delete Session'}</span>
        </button>
      </Panel>

      {editOpen ? (
        <div className="overlay" onClick={() => setEditOpen(false)}>
          <div className="composer" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit Learning Session</h3>
                <p className="modal-subcopy">Update the session title, focus, and status.</p>
              </div>
              <button className="icon-button" onClick={() => setEditOpen(false)}>
                x
              </button>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Subject</span>
                <input
                  value={editSubject}
                  onChange={(event) => setEditSubject(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={4}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Goals</span>
              <textarea
                rows={3}
                value={editGoals}
                onChange={(event) => setEditGoals(event.target.value)}
              />
            </label>

            <button
              className="primary-button modal-submit"
              disabled={!editTitle.trim() || busyAction === 'save-session'}
              onClick={() => void handleSaveSession()}
            >
              {busyAction === 'save-session' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function sourcePreview(source: LearningSource) {
  const content =
    source.extractedText ||
    source.rawContent ||
    source.sourceUrl ||
    source.filePath ||
    'No preview available.'

  return content.length > 220 ? `${content.slice(0, 220)}...` : content
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
