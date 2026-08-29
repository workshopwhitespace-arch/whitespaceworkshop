'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/lib/validations/client'

export async function createClient(input: CreateClientInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const client = await db.client.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
    },
  })

  revalidatePath('/dashboard/clients')
  return { success: true as const, client }
}

export async function updateClient(input: UpdateClientInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateClientSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data
  const client = await db.client.update({ where: { id }, data })

  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { success: true as const, client }
}

/**
 * List all clients with their pending balance (debit - credit) attached,
 * for the Clients list screen. Employees only see clients they have an
 * assigned project under, and never see financial data — pendingAmount
 * comes back null for them.
 */
export async function listClients() {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const clients = await db.client.findMany({
    where: isEmployee
      ? { projects: { some: { assignees: { some: { userId: session.user.id } } } } }
      : undefined,
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (isEmployee) {
    return clients.map((c) => ({ ...c, pendingAmount: null as number | null }))
  }

  const withBalances = await Promise.all(
    clients.map(async (client) => {
      const totals = await db.ledgerEntry.groupBy({
        by: ['entryType'],
        where: { clientId: client.id },
        _sum: { amount: true },
      })
      const debit = Number(totals.find((t) => t.entryType === 'DEBIT')?._sum.amount ?? 0)
      const credit = Number(totals.find((t) => t.entryType === 'CREDIT')?._sum.amount ?? 0)
      return { ...client, pendingAmount: debit - credit as number | null }
    })
  )

  return withBalances
}

/**
 * Full client profile for the client detail screen. Admin/Super Admin get
 * everything: all projects, full ledger history, and computed totals.
 * Employees only see this client at all if they have an assigned project
 * under it, and even then get no ledger/financial data whatsoever.
 */
export async function getClientDetail(clientId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  const client = await db.client.findUnique({ where: { id: clientId } })
  if (!client) return null

  const projects = await db.project.findMany({
    where: {
      clientId,
      ...(isEmployee ? { assignees: { some: { userId: session.user.id } } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  if (isEmployee && projects.length === 0) {
    return null
  }

  if (isEmployee) {
    return {
      ...client,
      projects,
      ledgerEntries: [] as never[],
      totalBilled: null,
      totalReceived: null,
      pendingAmount: null,
    }
  }

  const ledgerEntries = await db.ledgerEntry.findMany({
    where: { clientId },
    orderBy: { entryDate: 'desc' },
    include: { recordedBy: { select: { name: true } } },
  })

  const totalBilled = ledgerEntries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const totalReceived = ledgerEntries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return {
    ...client,
    projects,
    ledgerEntries,
    totalBilled,
    totalReceived,
    pendingAmount: totalBilled - totalReceived,
  }
}