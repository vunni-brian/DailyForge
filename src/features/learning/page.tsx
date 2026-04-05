import { useMemo, useState } from 'react'
import { GraduationCapIcon, PlusIcon } from '../../components/icons'
import { Badge, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'

export function LearningPage() {
  const { addLearningItem, learningItems, updateLearningItem } = useAppContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(learningItems[0]?.id ?? null)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [resourceLink, setResourceLink] = useState('')
  const selectedItem = learningItems.find((item) => item.id === selectedId) ?? learningItems[0]

  const sortedItems = useMemo(
    () => [...learningItems].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [learningItems],
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setTitle('')
    setTopic('')
    setNextStep('')
    setResourceLink('')
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Learning Tracker"
        actions={
          <button className="primary-button page-cta-button" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="button-icon" />
            <span>Add Topic</span>
          </button>
        }
      />

      {sortedItems.length ? (
        <div className="learning-screen-grid">
          <section className="learning-topic-grid">
            {sortedItems.map((item) => (
              <button
                key={item.id}
                className={selectedItem?.id === item.id ? 'learning-topic-card learning-topic-card-active' : 'learning-topic-card'}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="learning-topic-head">
                  <Badge tone="info">{item.stage}</Badge>
                  <span>{item.progressPercent}%</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.topic || 'No category'}</p>
                <ProgressBar value={item.progressPercent} />
                <small>{item.nextStep || 'No next step yet.'}</small>
              </button>
            ))}
          </section>

          {selectedItem ? (
            <Panel className="learning-edit-panel">
              <div className="modal-header">
                <div>
                  <h3>{selectedItem.title}</h3>
                  <p className="modal-subcopy">{selectedItem.topic || 'Learning topic'}</p>
                </div>
                <Badge tone="info">{selectedItem.stage}</Badge>
              </div>

              <label className="field">
                <span>Title</span>
                <input
                  value={selectedItem.title}
                  onChange={(event) =>
                    updateLearningItem(selectedItem.id, { title: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Topic / Category</span>
                <input
                  value={selectedItem.topic}
                  onChange={(event) =>
                    updateLearningItem(selectedItem.id, { topic: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Next Step</span>
                <textarea
                  rows={4}
                  value={selectedItem.nextStep}
                  onChange={(event) =>
                    updateLearningItem(selectedItem.id, { nextStep: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Resource Link</span>
                <input
                  value={selectedItem.resourceLink}
                  onChange={(event) =>
                    updateLearningItem(selectedItem.id, { resourceLink: event.target.value })
                  }
                />
              </label>
            </Panel>
          ) : null}
        </div>
      ) : (
        <div className="page-zero-state">
          <GraduationCapIcon className="page-zero-icon" />
          <p>No learning topics yet. Add one to start tracking progress.</p>
        </div>
      )}

      {isModalOpen ? (
        <div className="overlay" onClick={closeModal}>
          <div className="composer" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Learning Topic</h3>
              <button className="icon-button" onClick={closeModal}>
                ×
              </button>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. React Server Components"
              />
            </label>

            <label className="field">
              <span>Topic / Category</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. Frontend"
              />
            </label>

            <label className="field">
              <span>Next Step</span>
              <input
                value={nextStep}
                onChange={(event) => setNextStep(event.target.value)}
                placeholder="What to do next?"
              />
            </label>

            <label className="field">
              <span>Resource Link</span>
              <input
                value={resourceLink}
                onChange={(event) => setResourceLink(event.target.value)}
                placeholder="https://..."
              />
            </label>

            <button
              className="primary-button modal-submit"
              disabled={!title.trim()}
              onClick={() => {
                addLearningItem({
                  title,
                  topic,
                  nextStep,
                  resourceLink,
                })
                closeModal()
              }}
            >
              Add Topic
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
