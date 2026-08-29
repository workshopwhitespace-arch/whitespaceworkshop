import type { ProjectType } from '@prisma/client'

export const TASK_TEMPLATES: Record<ProjectType, string[]> = {
  INTERIOR: [
    'Site measurement',
    'Planning',
    '3D',
    'Approval',
    'Drawing',
    'Execution',
    'Handover',
  ],
  BRANDING: [
    'Research',
    'Moodboard',
    'Logo',
    'Revision',
    'Approval',
    'Guidelines',
    'Delivery',
  ],
  SOCIAL: [
    'Content strategy',
    'Content calendar',
    'Design assets',
    'Approval',
    'Scheduling',
    'Posting',
  ],
  WEB: [
    'Requirements',
    'Wireframes',
    'Design',
    'Approval',
    'Development',
    'Testing',
    'Launch',
  ],
}