import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const updateClientSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>