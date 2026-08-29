import { z } from 'zod'

const approvalStatusEnum = z.enum(['PENDING', 'APPROVED', 'CHANGES_REQUESTED'])

export const createClientApprovalSchema = z.object({
  projectId: z.string(),
  fileId: z.string().optional(),
  itemType: z.string().min(1, 'Item type is required'),
})

export const updateApprovalStatusSchema = z.object({
  id: z.string(),
  status: approvalStatusEnum,
  notes: z.string().optional(),
})

export const incrementRevisionSchema = z.object({
  projectId: z.string(),
  itemType: z.string().min(1, 'Item type is required'),
  revisionLimit: z.number().int().positive().optional(),
})

export type CreateClientApprovalInput = z.infer<typeof createClientApprovalSchema>
export type UpdateApprovalStatusInput = z.infer<typeof updateApprovalStatusSchema>
export type IncrementRevisionInput = z.infer<typeof incrementRevisionSchema>