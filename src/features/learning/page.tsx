import { useState } from 'react'
import { Badge, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'

export function LearningPage() {
  const { addLearningItem, learningItems, updateLearningItem } = useAppContext()
  const [selectedId, setSelectedId] = useState(learningItems[0]?.id ?? '')
  const selectedItem = learningItems.find((item) => item.id === selectedId) ?? learningItems[0]
  const activeItems = learningItems.filter((item) => item.stage !== 'Completed').length
  const averageProgress = learningItems.length
    ? Math.round(
        learningItems.reduce((total, item) => total + item.progressPercent, 0) /
          learningItems.length,
      )
    : 0

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Learning"
        title="Learning tracker"
        description="Turn vague learning goals into tracked stages, visible progress, and an explicit next step."
        actions={
          <button className="primary-button" onClick={addLearningItem}>
            + Add Learning Item
          </button>
        }
      />

      <section className="snapshot-grid snapshot-grid-learning">
        <Panel className="snapshot-card snapshot-card-accent">
          <p className="snapshot-value">{learningItems.length}</p>
          <p className="snapshot-label">Tracks</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{activeItems}</p>
          <p className="snapshot-label">Active</p>
        </Panel>
        <Panel className="snapshot-card">
          <p className="snapshot-value">{averageProgress}%</p>
          <p className="snapshot-label">Average progress</p>
        </Panel>
      </section>

      <div className="learning-layout">
        <section className="learning-grid">
          {learningItems.map((item) => (
            <button
              key={item.id}
              className={`learning-card ${selectedItem?.id === item.id ? 'learning-card-active' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="learning-card-head">
                <Badge tone="info">{item.stage}</Badge>
                <span>{item.progressPercent}%</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.topic}</p>
              <ProgressBar value={item.progressPercent} />
              <p className="muted-copy">{item.nextStep}</p>
              <div className="learning-card-footer">
                <span>{item.resourceLink ? 'Resource linked' : 'No resource yet'}</span>
                <span>{item.targetCompletionDate ?? 'No target date'}</span>
              </div>
            </button>
          ))}
        </section>

        {selectedItem ? (
          <Panel className="learning-detail">
            <div className="learning-detail-header">
              <div>
                <p className="eyebrow">Current item</p>
                <h3>{selectedItem.title}</h3>
              </div>
              <Badge tone="info">{selectedItem.stage}</Badge>
            </div>
            <div className="learning-detail-metrics">
              <div className="project-metric">
                <span>Progress</span>
                <strong>{selectedItem.progressPercent}%</strong>
              </div>
              <div className="project-metric">
                <span>Target</span>
                <strong>{selectedItem.targetCompletionDate ?? 'None'}</strong>
              </div>
            </div>
            <div>
              <p className="eyebrow">Current item</p>
              <h3>Details</h3>
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
              <span>Stage</span>
              <select
                value={selectedItem.stage}
                onChange={(event) =>
                  updateLearningItem(selectedItem.id, {
                    stage: event.target.value as typeof selectedItem.stage,
                  })
                }
              >
                {[
                  'Not Started',
                  'Beginner',
                  'Intermediate',
                  'Advanced',
                  'Applied Practice',
                  'Completed',
                ].map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Progress</span>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedItem.progressPercent}
                onChange={(event) =>
                  updateLearningItem(selectedItem.id, {
                    progressPercent: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Next step</span>
              <textarea
                rows={5}
                value={selectedItem.nextStep}
                onChange={(event) =>
                  updateLearningItem(selectedItem.id, { nextStep: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Resource link</span>
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
    </div>
  )
}
