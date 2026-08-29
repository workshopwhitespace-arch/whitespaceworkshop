import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']),
})

export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>