'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import {
  createReminderSchema,
  listRemindersFilterSchema,
  type CreateReminderInput,
  type ListRemindersFilter,
} from '@/lib/validations/reminder'

export async function createReminder(input: CreateReminderInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createReminderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const reminder = await db.reminder.create({ data: parsed.data })

  revalidatePath('/dashboard')
  return { success: true as const, reminder }
}

export async function listReminders(filters?: ListRemindersFilter) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const parsed = filters
    ? listRemindersFilterSchema.safeParse(filters)
    : { success: true as const, data: undefined }
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const f = parsed.data

  return db.reminder.findMany({
    where: {
      ...(f?.status ? { status: f.status } : {}),
      // Employees only ever see their own reminders, regardless of what's requested.
      assignedToId: isEmployee ? session.user.id : f?.assignedToId,
    },
    orderBy: { dueDate: 'asc' },
  })
}

export async function markReminderDone(reminderId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const reminder = await db.reminder.update({
    where: { id: reminderId },
    data: { status: 'DONE' },
  })

  revalidatePath('/dashboard')
  return { success: true as const, reminder }
}