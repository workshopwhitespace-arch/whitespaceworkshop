'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import cloudinary from '@/lib/cloudinary'
import {
  createClientApprovalSchema,
  updateApprovalStatusSchema,
  incrementRevisionSchema,
  type CreateClientApprovalInput,
  type UpdateApprovalStatusInput,
  type IncrementRevisionInput,
} from '@/lib/validations/file'

/**
 * Uploads a design file to Cloudinary and records it against a project.
 * Version auto-increments per project + fileType, so re-uploading a
 * revised logo becomes v2 without overwriting v1.
 */
export async function uploadProjectFile(formData: FormData) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const fileType = (formData.get('fileType') as string | null) ?? undefined

  if (!file || !projectId) {
    return { success: false as const, error: 'A file and project are required' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `white-space-workshop/${projectId}`, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) return reject(error)
        resolve(result)
      }
    )
    stream.end(buffer)
  })

  const latest = await db.projectFile.findFirst({
    where: { projectId, fileType },
    orderBy: { version: 'desc' },
  })
  const nextVersion = (latest?.version ?? 0) + 1

  const projectFile = await db.projectFile.create({
    data: {
      projectId,
      uploadedById: session.user.id,
      fileUrl: uploadResult.secure_url,
      fileType,
      version: nextVersion,
    },
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true as const, file: projectFile }
}

export async function listProjectFiles(projectId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  return db.projectFile.findMany({
    where: { projectId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: [{ fileType: 'asc' }, { version: 'desc' }],
  })
}

export async function createClientApproval(input: CreateClientApprovalInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = createClientApprovalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const approval = await db.clientApproval.create({ data: parsed.data })

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`)
  return { success: true as const, approval }
}

/**
 * Updates a ClientApproval's status. When it's tied to a specific file,
 * also syncs that file's own approvalStatus so the two never disagree —
 * the file list and the approvals tab always show the same state.
 */
export async function updateApprovalStatus(input: UpdateApprovalStatusInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = updateApprovalStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const approval = await db.clientApproval.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      reviewedAt: new Date(),
    },
  })

  if (approval.fileId) {
    await db.projectFile.update({
      where: { id: approval.fileId },
      data: { approvalStatus: approval.status },
    })
  }

  revalidatePath(`/dashboard/projects/${approval.projectId}`)
  return { success: true as const, approval }
}

/**
 * Bumps a project's revision counter for a deliverable type (e.g. "Logo"),
 * creating the Revision row on first use. Returns atLimit: true once
 * revisionNumber reaches revisionLimit, so the UI can switch to its
 * warning state.
 */
export async function incrementRevision(input: IncrementRevisionInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  const parsed = incrementRevisionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { projectId, itemType, revisionLimit } = parsed.data
  const existing = await db.revision.findFirst({ where: { projectId, itemType } })

  const revision = existing
    ? await db.revision.update({
        where: { id: existing.id },
        data: { revisionNumber: { increment: 1 } },
      })
    : await db.revision.create({
        data: { projectId, itemType, revisionNumber: 1, revisionLimit: revisionLimit ?? 3 },
      })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return {
    success: true as const,
    revision,
    atLimit: revision.revisionNumber >= revision.revisionLimit,
  }
}

export async function listRevisions(projectId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'])

  return db.revision.findMany({ where: { projectId } })
}