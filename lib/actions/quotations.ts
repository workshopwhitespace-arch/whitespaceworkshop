'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { seedTasksForProject } from '@/lib/actions/tasks'
import { logActivity } from '@/lib/actions/activity'
import {
  createQuotationSchema,
  addQuotationItemSchema,
  updateQuotationItemSchema,
  acceptQuotationSchema,
  type CreateQuotationInput,
  type AddQuotationItemInput,
  type UpdateQuotationItemInput,
  type AcceptQuotationInput,
} from '@/lib/validations/quotation'

async function generateQuotationNumber() {
  const year = new Date().getFullYear()
  const count = await db.quotation.count({
    where: { quotationNumber: { startsWith: `QT-${year}-` } },
  })
  const sequence = String(count + 1).padStart(3, '0')
  return `QT-${year}-${sequence}`
}

function calculateTotals(items: { quantity: number; rate: number }[], gstRate: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.rate, 0)
  const gstAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100
  const totalAmount = subtotal + gstAmount
  return { subtotal, gstAmount, totalAmount }
}

export async function createQuotation(input: CreateQuotationInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createQuotationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { clientId, reference, terms, gstRate, items } = parsed.data
  const { gstAmount, totalAmount } = calculateTotals(items, gstRate)
  const quotationNumber = await generateQuotationNumber()

  const quotation = await db.quotation.create({
    data: {
      quotationNumber,
      clientId,
      reference,
      terms,
      gstAmount,
      totalAmount,
      createdById: session.user.id,
      items: {
        create: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
      },
    },
    include: { items: true },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

/**
 * gstRate comes from the quotation builder's live input (it isn't stored
 * per-item), so every item mutation takes it as context and recalculates
 * the whole quotation from scratch — never trust a client-sent total.
 */
async function recalculateQuotation(quotationId: string, gstRate: number) {
  const items = await db.quotationItem.findMany({ where: { quotationId } })
  const { gstAmount, totalAmount } = calculateTotals(
    items.map((i) => ({ quantity: i.quantity, rate: Number(i.rate) })),
    gstRate
  )

  const quotation = await db.quotation.update({
    where: { id: quotationId },
    data: { gstAmount, totalAmount },
    include: { items: true },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

export async function addQuotationItem(
  input: AddQuotationItemInput,
  context: { gstRate: number }
) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = addQuotationItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { quotationId, description, quantity, rate } = parsed.data
  await db.quotationItem.create({
    data: { quotationId, description, quantity, rate, amount: quantity * rate },
  })

  return recalculateQuotation(quotationId, context.gstRate)
}

export async function updateQuotationItem(
  input: UpdateQuotationItemInput,
  context: { gstRate: number }
) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateQuotationItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { itemId, ...data } = parsed.data
  const existing = await db.quotationItem.findUniqueOrThrow({ where: { id: itemId } })
  const quantity = data.quantity ?? existing.quantity
  const rate = data.rate ?? Number(existing.rate)

  await db.quotationItem.update({
    where: { id: itemId },
    data: { ...data, amount: quantity * rate },
  })

  return recalculateQuotation(existing.quotationId, context.gstRate)
}

export async function removeQuotationItem(itemId: string, context: { gstRate: number }) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const item = await db.quotationItem.delete({ where: { id: itemId } })
  return recalculateQuotation(item.quotationId, context.gstRate)
}

export async function sendQuotation(quotationId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const quotation = await db.quotation.update({
    where: { id: quotationId },
    data: { status: 'SENT' },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

export async function rejectQuotation(quotationId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const quotation = await db.quotation.update({
    where: { id: quotationId },
    data: { status: 'REJECTED' },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

/**
 * The one action with a side effect on another table: accepting a
 * quotation marks it ACCEPTED and creates the Project it funds, with
 * projectValue set from the quotation total, optionally seeding that
 * project's tasks from its type's template when asked. Both the status
 * change and project creation happen in one transaction so a quotation can
 * never end up ACCEPTED without its project existing.
 */
export async function acceptQuotation(input: AcceptQuotationInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = acceptQuotationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { quotationId, projectTitle, projectType, deadline, seedTasks } = parsed.data

  const quotation = await db.quotation.findUnique({ where: { id: quotationId } })
  if (!quotation) {
    return { success: false as const, error: 'Quotation not found' }
  }
  if (quotation.status === 'ACCEPTED') {
    return { success: false as const, error: 'This quotation was already accepted' }
  }

  const project = await db.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED' },
    })

    return tx.project.create({
      data: {
        clientId: quotation.clientId,
        quotationId: quotation.id,
        title: projectTitle,
        type: projectType,
        projectValue: quotation.totalAmount,
        deadline,
        createdById: session.user.id,
      },
    })
  })

  if (seedTasks) {
    await seedTasksForProject(project.id, project.type)
  }
  await logActivity(session.user.id, 'accepted quotation', 'quotation', quotation.id, {
    projectId: project.id,
  })

  revalidatePath('/dashboard/quotations')
  revalidatePath('/dashboard/projects')
  return { success: true as const, project }
}

export async function listQuotations(filters?: {
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'
}) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  return db.quotation.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    include: {
      client: { select: { id: true, name: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}
/**
 * Full quotation for the detail screen.
 *
 * `gstRate` isn't a column — only the computed `gstAmount` is stored — so it
 * is derived back out of the saved totals here. Every screen that mutates
 * items needs a rate to pass as context, and deriving it in one place keeps
 * the UI from having to guess or re-prompt for it. A quotation with no items
 * yet has no derivable rate, so it falls back to the 18% default.
 */
export async function getQuotationDetail(quotationId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const quotation = await db.quotation.findUnique({
    where: { id: quotationId },
    include: {
      client: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
      items: { orderBy: { id: 'asc' } },
      createdBy: { select: { name: true } },
      projects: { select: { id: true, title: true, type: true, status: true } },
    },
  })

  if (!quotation) return null

  const subtotal = quotation.items.reduce(
    (sum, i) => sum + i.quantity * Number(i.rate),
    0
  )
  const gstAmount = Number(quotation.gstAmount)
  const gstRate =
    subtotal > 0 ? Math.round((gstAmount / subtotal) * 100 * 100) / 100 : 18

  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    status: quotation.status,
    reference: quotation.reference,
    terms: quotation.terms,
    createdAt: quotation.createdAt,
    createdByName: quotation.createdBy.name,
    client: quotation.client,
    items: quotation.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      rate: Number(i.rate),
      amount: Number(i.amount),
    })),
    subtotal,
    gstRate,
    gstAmount,
    discount: Number(quotation.discount),
    totalAmount: Number(quotation.totalAmount),
    project: quotation.projects[0] ?? null,
  }
}

export type QuotationDetail = NonNullable<Awaited<ReturnType<typeof getQuotationDetail>>>
