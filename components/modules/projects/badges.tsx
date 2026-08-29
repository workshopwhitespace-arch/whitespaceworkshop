import type { ProjectStatus, ProjectType, TaskStatus } from '@prisma/client'

export const PROJECT_STATUSES: ProjectStatus[] = [
  'BRIEF',
  'CONCEPT',
  'DRAFT',
  'REVISION',
  'FINAL',
  'DELIVERED',
]

export const PROJECT_TYPES: ProjectType[] = ['INTERIOR', 'BRANDING', 'SOCIAL', 'WEB']

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  BRIEF: 'Brief',
  CONCEPT: 'Concept',
  DRAFT: 'Draft',
  REVISION: 'Revision',
  FINAL: 'Final',
  DELIVERED: 'Delivered',
}

export const TYPE_LABEL: Record<ProjectType, string> = {
  INTERIOR: 'Interior',
  BRANDING: 'Branding',
  SOCIAL: 'Social',
  WEB: 'Web',
}

const STATUS_STYLE: Record<ProjectStatus, string> = {
  BRIEF: 'bg-[#F1EFE8] text-[#6B6858]',
  CONCEPT: 'bg-[#EAF0F7] text-[#3B6CA8]',
  DRAFT: 'bg-[#F3EEF7] text-[#7A5AA8]',
  REVISION: 'bg-[#FBF0E2] text-[#A87A2E]',
  FINAL: 'bg-[#FAEDE8] text-[#C1502E]',
  DELIVERED: 'bg-[#E8F1EA] text-[#3F7A50]',
}

const TYPE_STYLE: Record<ProjectType, string> = {
  INTERIOR: 'bg-[#F1EFE8] text-[#6B6858]',
  BRANDING: 'bg-[#F1EFE8] text-[#6B6858]',
  SOCIAL: 'bg-[#F1EFE8] text-[#6B6858]',
  WEB: 'bg-[#F1EFE8] text-[#6B6858]',
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ProjectTypeBadge({ type }: { type: ProjectType }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLE[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  )
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
}

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  TODO: 'bg-[#F1EFE8] text-[#6B6858]',
  IN_PROGRESS: 'bg-[#EAF0F7] text-[#3B6CA8]',
  REVIEW: 'bg-[#FBF0E2] text-[#A87A2E]',
  DONE: 'bg-[#E8F1EA] text-[#3F7A50]',
}
