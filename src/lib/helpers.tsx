import type { ReactNode } from 'react'
import type { FocusSession, Project, Task, TimerState } from '../types'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function formatLongDate(input: Date | string) {
  const value = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(value)
}

export function formatShortDate(input: string | null) {
  if (!input) {
    return 'No deadline'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(input))
}

export function formatMinutes(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export function formatTimer(timer: TimerState) {
  const minutes = Math.floor(timer.remainingSeconds / 60)
  const seconds = timer.remainingSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

export function isToday(dateValue: string | null) {
  if (!dateValue) {
    return false
  }

  return dateValue === new Date().toISOString().slice(0, 10)
}

export function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'Done') {
    return false
  }

  return new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10))
}

export function priorityRank(task: Task) {
  const map = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  }

  return map[task.priority]
}

export function getTopPriorities(tasks: Task[]) {
  return [...tasks]
    .filter((task) => task.status !== 'Done')
    .sort((left, right) => {
      const overdueScore = Number(isOverdue(right)) - Number(isOverdue(left))

      if (overdueScore !== 0) {
        return overdueScore
      }

      return priorityRank(right) - priorityRank(left)
    })
    .slice(0, 3)
}

export function getTodayFocusMinutes(sessions: FocusSession[]) {
  const today = new Date().toISOString().slice(0, 10)

  return sessions
    .filter((session) => session.startTime.slice(0, 10) === today)
    .reduce((total, session) => total + session.durationMinutes, 0)
}

export function getProjectProgress(project: Project, tasks: Task[]) {
  const linkedTasks = tasks.filter((task) => task.projectId === project.id)

  if (!linkedTasks.length) {
    return project.progressPercent
  }

  const weighted = linkedTasks.reduce((score, task) => {
    if (task.status === 'Done') {
      return score + 1
    }

    if (task.status === 'In Progress') {
      return score + 0.5
    }

    return score
  }, 0)

  return Math.round((weighted / linkedTasks.length) * 100)
}

export function renderMarkdownPreview(content: string) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let listItems: ReactNode[] = []

  const flushList = () => {
    if (!listItems.length) {
      return
    }

    elements.push(
      <ul key={`list-${elements.length}`} className="markdown-list">
        {listItems}
      </ul>,
    )
    listItems = []
  }

  lines.forEach((line, index) => {
    if (!line.trim()) {
      flushList()
      return
    }

    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={`h3-${index}`} className="markdown-h3">
          {line.replace('## ', '')}
        </h3>,
      )
      return
    }

    if (line.startsWith('# ')) {
      flushList()
      elements.push(
        <h2 key={`h2-${index}`} className="markdown-h2">
          {line.replace('# ', '')}
        </h2>,
      )
      return
    }

    if (line.startsWith('- [ ] ')) {
      listItems.push(
        <li key={`todo-${index}`} className="markdown-check">
          <span className="check-pill" />
          {line.replace('- [ ] ', '')}
        </li>,
      )
      return
    }

    if (line.startsWith('- ')) {
      listItems.push(<li key={`li-${index}`}>{line.replace('- ', '')}</li>)
      return
    }

    flushList()
    elements.push(
      <p key={`p-${index}`} className="markdown-p">
        {line}
      </p>,
    )
  })

  flushList()

  if (!elements.length) {
    return <p className="muted-copy">Nothing to preview yet.</p>
  }

  return elements
}
