import { z } from 'zod'

const projectTypeEnum = z.enum(['INTERIOR', 'BRANDING', 'SOCIAL', 'WEB'])

const quotationItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  rate: z.number().nonnegative('Rate cannot be negative'),
})

export const createQuotationSchema = z.object({
  clientId: z.string(),
  /** Who referred this enquiry. Empty means it came in as a direct client. */
  reference: z.string().max(120, 'Reference is too long').optional(),
  terms: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(18),
  items: z.array(quotationItemSchema).min(1, 'Add at least one line item'),
})

export const addQuotationItemSchema = z.object({
  quotationId: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  rate: z.number().nonnegative('Rate cannot be negative'),
})

export const updateQuotationItemSchema = z.object({
  itemId: z.string(),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  rate: z.number().nonnegative().optional(),
})

export const acceptQuotationSchema = z.object({
  quotationId: z.string(),
  projectTitle: z.string().min(2, 'Project title is required'),
  projectType: projectTypeEnum,
  deadline: z.coerce.date().optional(),
  /** Opt-in, matching createProject — no tasks appear unless asked for. */
  seedTasks: z.boolean().optional().default(false),
})

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>
export type AddQuotationItemInput = z.infer<typeof addQuotationItemSchema>
export type UpdateQuotationItemInput = z.infer<typeof updateQuotationItemSchema>
export type AcceptQuotationInput = z.infer<typeof acceptQuotationSchema>
