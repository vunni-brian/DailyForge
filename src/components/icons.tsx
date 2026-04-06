import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function FlameIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3c2.4 2.4 4.2 4.8 4.2 7.6A4.2 4.2 0 1 1 8 9.6c0-1.7.7-3.1 2-4.6.2 1.8 1.3 3.1 2 3.9C13.2 7.8 13.1 5.7 12 3Z" />
    </BaseIcon>
  )
}

export function GridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </BaseIcon>
  )
}

export function CheckSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </BaseIcon>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l1.6 2H17.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M9 12v3M12 11v4M15 13v2" />
    </BaseIcon>
  )
}

export function NoteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3.8h7.2L19 8.6V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" />
      <path d="M14 3.8v4.6h5" />
      <path d="M8.5 12.5h7M8.5 16h7" />
    </BaseIcon>
  )
}

export function TimerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 13V9.5M9.5 3.5h5" />
    </BaseIcon>
  )
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3.8 9.5 8.2-4 8.2 4-8.2 4Z" />
      <path d="M7.5 11.3v3.5c1.1 1.2 2.8 1.8 4.5 1.8s3.4-.6 4.5-1.8v-3.5" />
      <path d="M20.2 10.3v4.4" />
    </BaseIcon>
  )
}

export function BookIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21Z" />
      <path d="M5 5.5V21M12 6.5h4" />
    </BaseIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L14.4 3h-4.8l-.4 3a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 3h4.8l.4-3a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" />
    </BaseIcon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </BaseIcon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m14.5 6.5-5 5.5 5 5.5" />
    </BaseIcon>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4v10" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M5 19h14" />
    </BaseIcon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 7h15" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M7.5 7.5 8.3 19a2 2 0 0 0 2 1.8h3.4a2 2 0 0 0 2-1.8l.8-11.5" />
      <path d="M10 11v5M14 11v5" />
    </BaseIcon>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 7 8 5-8 5Z" />
    </BaseIcon>
  )
}

export function RotateCcwIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 10V5.5H9" />
      <path d="M5.2 14.2A7 7 0 1 0 6 8.3L4.5 10" />
    </BaseIcon>
  )
}

export function TargetIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}
