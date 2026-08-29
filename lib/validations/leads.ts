'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
  type UpdateLeadStatusInput,
} from '@/lib/validations/lead'

export async function createLead(input: CreateLeadInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const lead = await db.lead.create({
    data: {
      ...parsed.data,
      assignedToId: parsed.data.assignedToId ?? session.user.id,
    },
  })

  revalidatePath('/dashboard/leads')
  return { success: true as const, lead }
}

export async function updateLead(input: UpdateLeadInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, ...data } = parsed.data
  const lead = await db.lead.update({ where: { id }, data })

  revalidatePath('/dashboard/leads')
  return { success: true as const, lead }
}

export async function updateLeadStatus(input: UpdateLeadStatusInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateLeadStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const lead = await db.lead.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  })

  revalidatePath('/dashboard/leads')
  return { success: true as const, lead }
}

export async function listLeads(filters?: { status?: 'NEW' | 'CONTACTED' | 'QUOTATION' | 'WON' | 'LOST' }) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])
  const isEmployee = session.user.role === 'EMPLOYEE'

  return db.lead.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(isEmployee ? { assignedToId: session.user.id } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Creates a Client from a Lead and marks the lead WON. Call this when a lead
 * is ready to move forward — typically right before creating a quotation.
 * Client creation + lead update happen in one transaction so they can't
 * partially succeed.
 */
export async function convertLeadToClient(leadId: string) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const lead = await db.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    return { success: false as const, error: 'Lead not found' }
  }
  if (lead.clientId) {
    return { success: false as const, error: 'This lead is already linked to a client' }
  }

  const client = await db.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        createdById: session.user.id,
      },
    })

    await tx.lead.update({
      where: { id: leadId },
      data: { clientId: newClient.id, status: 'WON' },
    })

    return newClient
  })

  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard/clients')
  return { success: true as const, client }
}