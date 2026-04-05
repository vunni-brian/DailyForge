import type { PropsWithChildren, ReactNode } from 'react'
import { cx } from '../lib/helpers'

export function Panel({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={cx('panel', className)}>{children}</section>
}

export function Badge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{ tone?: 'neutral' | 'danger' | 'success' | 'warning' | 'info' }>) {
  return <span className={cx('badge', `badge-${tone}`)}>{children}</span>
}

export function ProgressBar({
  value,
  color,
}: {
  value: number
  color?: string
}) {
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  )
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-intro">
      <div className="page-intro-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-marker" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
