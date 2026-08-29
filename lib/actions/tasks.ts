'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, type ProjectType } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { TASK_TEMPLATES } from '@/lib/task-templates'
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type UpdateTaskStatusInput,
} from '@/lib/validations/task'

/**
 * Prisma throws P2025 when an update targets a row that no longer exists —
 * a board left open after someone else deleted the task, a second tab, a
 * stale refresh. That's an ordinary race, not a crash, so it comes back as
 * a normal failed result the UI can show inline.
 */
function missingRecord(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  )
}

export async function createTask(input: CreateTaskInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const task = await db.task.create({ data: parsed.data })

  revalidatePath('/dashboard/tasks')
  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`)
  return { success: true as const, task }
}

export async function updateTask(input: UpdateTaskInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data

  try {
    const task = await db.task.update({ where: { id }, data })

    revalidatePath('/dashboard/tasks')
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task no longer exists — refresh to see the current board.',
      }
    }
    throw error
  }
}

export async function updateTaskStatus(input: UpdateTaskStatusInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateTaskStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  try {
    const task = await db.task.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    })

    revalidatePath('/dashboard/tasks')
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task no longer exists — refresh to see the current board.',
      }
    }
    throw error
  }
}

export async function assignTask(taskId: string, userId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  try {
    const task = await db.task.update({
      where: { id: taskId },
      data: { assignedToId: userId },
    })

    revalidatePath('/dashboard/tasks')
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task no longer exists — refresh to see the current board.',
      }
    }
    throw error
  }
}

export async function listTasks(filters?: { projectId?: string; assignedToId?: string }) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  return db.task.findMany({
    where: {
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      ...(isEmployee ? { assignedToId: session.user.id } : {}),
    },
    include: {
      project: { select: { id: true, title: true, type: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Called once, right after a Project is created — from createProject
 * directly, or from acceptQuotation when a quotation converts into a
 * project — to seed its task list from the matching template.
 */
export async function seedTasksForProject(projectId: string, type: ProjectType) {
  const template = TASK_TEMPLATES[type]

  await db.task.createMany({
    data: template.map((title) => ({
      projectId,
      title,
      status: 'TODO' as const,
    })),
  })
}
/**
 * A single task with everything its detail screen shows.
 *
 * Scoping mirrors what an Employee can already reach elsewhere: their own
 * assigned tasks, plus any task on a project they're an assignee of — which
 * is exactly the set the project detail screen already lists for them.
 * Anything else returns null so the page 404s.
 */
export async function getTaskDetail(taskId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          deadline: true,
          client: { select: { id: true, name: true } },
          assignees: { select: { userId: true } },
        },
      },
    },
  })

  if (!task) return null

  if (isEmployee) {
    const isAssignee = task.assignedToId === session.user.id
    const onProject = task.project.assignees.some((a) => a.userId === session.user.id)
    if (!isAssignee && !onProject) return null
  }

  return task
}

/**
 * Deleting a task is destructive and has no undo, so it follows the same
 * rule as assignment: Admins only. Employees can still create tasks and
 * drive their own through the stages, but not remove them.
 */
export async function deleteTask(taskId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  try {
    const task = await db.task.delete({ where: { id: taskId } })

    revalidatePath('/dashboard/tasks')
    revalidatePath(`/dashboard/projects/${task.projectId}`)
    return { success: true as const, task }
  } catch (error) {
    if (missingRecord(error)) {
      return {
        success: false as const,
        error: 'That task has already been deleted.',
      }
    }
    throw error
  }
}
