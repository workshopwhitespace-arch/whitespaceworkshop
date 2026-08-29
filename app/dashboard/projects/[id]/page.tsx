import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getProjectDetail, listAssignableUsers } from '@/lib/actions/projects'
import { ProjectDetailView } from '@/components/modules/projects/project-detail'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const canManage = session?.user?.role !== 'EMPLOYEE'

  const project = await getProjectDetail(id)

  // Also null when an Employee isn't assigned, so 404 covers both cases.
  if (!project) notFound()

  const assignable = canManage ? await listAssignableUsers() : []

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      <ProjectDetailView
        canManage={canManage}
        currentUserId={session!.user.id}
        assignableUsers={assignable}
        project={{
          id: project.id,
          title: project.title,
          type: project.type,
          status: project.status,
          projectValue: project.projectValue === null ? null : Number(project.projectValue),
          startDate: project.startDate,
          deadline: project.deadline,
          createdAt: project.createdAt,
          createdByName: project.createdBy.name,
          client: {
            id: project.client.id,
            name: project.client.name,
            companyName: project.client.companyName,
            email: project.client.email,
            phone: project.client.phone,
          },
          quotation: project.quotation,
          assignees: project.assignees.map((a) => ({
            userId: a.userId,
            name: a.user.name,
            role: a.user.role,
          })),
          tasks: project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            progressPercent: t.progressPercent,
            dueDate: t.dueDate,
            assignedToId: t.assignedToId,
            assignedToName: t.assignedTo?.name ?? null,
          })),
          files: project.files.map((f) => ({
            id: f.id,
            fileUrl: f.fileUrl,
            fileType: f.fileType,
            version: f.version,
            approvalStatus: f.approvalStatus,
            createdAt: f.createdAt,
            uploadedByName: f.uploadedBy.name,
          })),
          revisions: project.revisions.map((r) => ({
            id: r.id,
            itemType: r.itemType,
            revisionNumber: r.revisionNumber,
            revisionLimit: r.revisionLimit,
          })),
          approvals: project.approvals.map((a) => ({
            id: a.id,
            itemType: a.itemType,
            status: a.status,
            reviewedAt: a.reviewedAt,
            notes: a.notes,
          })),
        }}
      />
    </div>
  )
}
