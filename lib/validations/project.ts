import { z } from 'zod'

const projectTypeEnum = z.enum(['INTERIOR', 'BRANDING', 'SOCIAL', 'WEB'])
const projectStatusEnum = z.enum([
  'BRIEF',
  'CONCEPT',
  'DRAFT',
  'REVISION',
  'FINAL',
  'DELIVERED',
])

export const createProjectSchema = z.object({
  clientId: z.string(),
  quotationId: z.string().optional(),
  title: z.string().min(2, 'Title is required'),
  type: projectTypeEnum,
  projectValue: z.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  /**
   * Opt-in only. Creating a project no longer seeds tasks automatically —
   * teams that don't run the standard checklist were getting tasks they
   * had to delete by hand.
   */
  seedTasks: z.boolean().optional().default(false),
})

export const updateProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(2).optional(),
  projectValue: z.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
})

export const updateProjectStatusSchema = z.object({
  id: z.string(),
  status: projectStatusEnum,
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>