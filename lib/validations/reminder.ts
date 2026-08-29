import { z } from 'zod'

export const createReminderSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  dueDate: z.coerce.date(),
  assignedToId: z.string(),
})

export const listRemindersFilterSchema = z.object({
  assignedToId: z.string().optional(),
  status: z.enum(['UPCOMING', 'DUE_TODAY', 'OVERDUE', 'DONE']).optional(),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type ListRemindersFilter = z.infer<typeof listRemindersFilterSchema>