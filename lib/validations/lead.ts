import { z } from 'zod'

export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  service: z.string().min(1, 'Select a service'),
  budget: z.number().positive().optional(),
  followUpDate: z.coerce.date().optional(),
  assignedToId: z.string().optional(),
})

export const updateLeadSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  service: z.string().optional(),
  budget: z.number().positive().optional(),
  followUpDate: z.coerce.date().optional(),
  assignedToId: z.string().optional(),
})

export const updateLeadStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['NEW', 'CONTACTED', 'QUOTATION', 'WON', 'LOST']),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>