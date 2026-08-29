import { z } from 'zod'

const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'])
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const createTaskSchema = z.object({
  /** A task always belongs to a project — a blank id must not reach Prisma. */
  projectId: z.string().min(1, 'Choose which project this task belongs to'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(2000, 'Description is too long').optional(),
  assignedToId: z.string().optional(),
  priority: priorityEnum.default('MEDIUM'),
  dueDate: z.coerce.date().optional(),
})

export const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().max(2000, 'Description is too long').optional(),
  assignedToId: z.string().optional(),
  priority: priorityEnum.optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  dueDate: z.coerce.date().optional(),
})

export const updateTaskStatusSchema = z.object({
  id: z.string(),
  status: taskStatusEnum,
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>