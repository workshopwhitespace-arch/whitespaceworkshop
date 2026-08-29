'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { seedTasksForProject } from '@/lib/actions/tasks'
import { logActivity } from '@/lib/actions/activity'
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type UpdateProjectStatusInput,
} from '@/lib/validations/project'

export async function createProject(input: CreateProjectInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = createProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { seedTasks, ...data } = parsed.data

  const project = await db.project.create({
    data: {
      ...data,
      createdById: session.user.id,
    },
  })

  // Only seed the type's checklist when the creator asked for it.
  if (seedTasks) {
    await seedTasksForProject(project.id, project.type)
  }

  revalidatePath('/dashboard/projects')
  return { success: true as const, project }
}

export async function updateProject(input: UpdateProjectInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = updateProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data
  const project = await db.project.update({ where: { id }, data })

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${id}`)
  return { success: true as const, project }
}

export async function updateProjectStatus(input: UpdateProjectStatusInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = updateProjectStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const project = await db.project.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  })

  await logActivity(
    session.user.id,
    `changed project status to ${project.status}`,
    'project',
    project.id
  )

  revalidatePath('/dashboard/projects')
  return { success: true as const, project }
}

export async function assignUserToProject(projectId: string, userId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const assignment = await db.projectAssignee.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId },
    update: {},
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true as const, assignment }
}

export async function removeAssignee(projectId: string, userId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  await db.projectAssignee.delete({
    where: { projectId_userId: { projectId, userId } },
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true as const }
}

export async function listProjects(filters?: {
  type?: 'INTERIOR' | 'BRANDING' | 'SOCIAL' | 'WEB'
  status?: 'BRIEF' | 'CONCEPT' | 'DRAFT' | 'REVISION' | 'FINAL' | 'DELIVERED'
}) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  return db.project.findMany({
    where: {
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(isEmployee ? { assignees: { some: { userId: session.user.id } } } : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Full project for the detail screen.
 *
 * Employees are scoped to their own assignments here, the same way
 * listProjects and getClientDetail scope theirs — without this an Employee
 * could read any project by guessing its id, which the role rules forbid.
 * A project they aren't on returns null, so the page 404s rather than
 * confirming it exists.
 */
export async function getProjectDetail(projectId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      quotation: { select: { id: true, quotationNumber: true, reference: true } },
      createdBy: { select: { name: true } },
      assignees: { include: { user: { select: { id: true, name: true, role: true } } } },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      files: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: [{ fileType: 'asc' }, { version: 'desc' }],
      },
      approvals: true,
      revisions: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) return null

  if (isEmployee && !project.assignees.some((a) => a.userId === session.user.id)) {
    return null
  }

  return project
}

/**
 * Minimal directory of active users for the assignee picker.
 *
 * `listUsers` in team.ts is Super Admin only, but assignUserToProject is
 * open to Admins too — so Admins need a way to see who they can assign
 * without gaining access to the full Team & Roles data.
 */
export async function listAssignableUsers() {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  return db.user.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })
}