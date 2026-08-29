'use server'

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

/**
 * Internal helper — not called directly from the UI. Other server actions
 * call this after a significant write (quotation accepted, ledger entry
 * recorded, project status changed, etc.) to build the audit trail.
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue
) {
  await db.activityLog.create({
    data: { userId, action, entityType, entityId, metadata },
  })
}

export async function listActivityLog(filters?: { entityType?: string; userId?: string }) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  return db.activityLog.findMany({
    where: {
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}