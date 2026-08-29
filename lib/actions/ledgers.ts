'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logActivity } from '@/lib/actions/activity'
import {
  createLedgerEntrySchema,
  listLedgerEntriesFilterSchema,
  type CreateLedgerEntryInput,
  type ListLedgerEntriesFilter,
} from '@/lib/validations/ledger'

export async function createLedgerEntry(input: CreateLedgerEntryInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = createLedgerEntrySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const entry = await db.ledgerEntry.create({
    data: {
      ...parsed.data,
      recordedById: session.user.id,
    },
  })

  await logActivity(
    session.user.id,
    entry.entryType === 'CREDIT' ? 'recorded payment' : 'recorded charge',
    'ledgerEntry',
    entry.id,
    { clientId: entry.clientId, amount: Number(entry.amount) }
  )

  return { success: true as const, entry }
}

/**
 * Balance = total debits (amount owed) minus total credits (amount paid).
 * Positive means pending; zero or less means settled. Computed at query
 * time — there is no stored balance column anywhere in the schema.
 */
async function computeBalance(where: { clientId?: string; projectId?: string }) {
  const totals = await db.ledgerEntry.groupBy({
    by: ['entryType'],
    where,
    _sum: { amount: true },
  })

  const totalBilled = Number(totals.find((t) => t.entryType === 'DEBIT')?._sum.amount ?? 0)
  const totalReceived = Number(totals.find((t) => t.entryType === 'CREDIT')?._sum.amount ?? 0)

  return { totalBilled, totalReceived, pendingAmount: totalBilled - totalReceived }
}

export async function getClientBalance(clientId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])
  return computeBalance({ clientId })
}

export async function getProjectBalance(projectId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])
  return computeBalance({ projectId })
}

export async function listLedgerEntries(filters?: ListLedgerEntriesFilter) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = filters
    ? listLedgerEntriesFilterSchema.safeParse(filters)
    : { success: true as const, data: undefined }
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const f = parsed.data

  return db.ledgerEntry.findMany({
    where: {
      ...(f?.clientId ? { clientId: f.clientId } : {}),
      ...(f?.projectId ? { projectId: f.projectId } : {}),
      ...(f?.entryType ? { entryType: f.entryType } : {}),
      ...(f?.fromDate || f?.toDate
        ? {
            entryDate: {
              ...(f.fromDate ? { gte: f.fromDate } : {}),
              ...(f.toDate ? { lte: f.toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { entryDate: 'desc' },
  })
}

/**
 * Studio-wide totals for the Ledger dashboard: total billed, total
 * received, and total pending across every client.
 */
export async function getStudioTotals() {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])
  return computeBalance({})
}