import { useState } from 'react'
import { Badge, PageIntro, Panel, ProgressBar } from '../../components/ui'
import { useAppContext } from '../../context/app-context'

export function LearningPage() {
  const { addLearningItem, learningItems, updateLearningItem } = useAppContext()
  const [selectedId, setSelectedId] = useState(learningItems[0]?.id ?? '')
  const selectedItem = learningItems.find((item) => item.id === selectedId) ?? learningItems[0]

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

      <div className="learning-layout">
        <section className="learning-grid">
          {learningItems.map((item) => (
            <button
              key={item.id}
              className={`learning-card ${selectedItem?.id === item.id ? 'learning-card-active' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="section-row">
                <Badge tone="info">{item.stage}</Badge>
                <span>{item.progressPercent}%</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.topic}</p>
              <ProgressBar value={item.progressPercent} />
              <p className="muted-copy">{item.nextStep}</p>
            </button>
          ))}
        </section>

        {selectedItem ? (
          <Panel className="learning-detail">
            <div>
              <p className="eyebrow">Current item</p>
              <h3>{selectedItem.title}</h3>
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
          </Panel>
        ) : null}
      </div>
    </div>
  )
}
