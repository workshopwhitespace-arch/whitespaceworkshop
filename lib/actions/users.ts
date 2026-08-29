'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/validations/user'

export async function createUser(input: CreateUserInput) {
  await requireRole(['SUPER_ADMIN'])

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return { success: false as const, error: 'A user with this email already exists' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    },
  })

  revalidatePath('/dashboard/team')
  return {
    success: true as const,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

export async function updateUser(input: UpdateUserInput) {
  await requireRole(['SUPER_ADMIN'])

  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data

  const user = await db.user.update({
    where: { id },
    data,
  })

  revalidatePath('/dashboard/team')
  return {
    success: true as const,
    user: { id: user.id, name: user.name, role: user.role, status: user.status },
  }
}

export async function deactivateUser(userId: string) {
  await requireRole(['SUPER_ADMIN'])

  const user = await db.user.update({
    where: { id: userId },
    data: { status: 'inactive' },
  })

  revalidatePath('/dashboard/team')
  return { success: true as const, user: { id: user.id, status: user.status } }
}

export async function listUsers() {
  await requireRole(['SUPER_ADMIN'])

  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { projectAssignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSessionUser() {
  return getCurrentUser()
}