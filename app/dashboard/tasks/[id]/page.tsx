import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getTaskDetail } from '@/lib/actions/tasks'
import { listAssignableUsers } from '@/lib/actions/projects'
import { TaskDetailView } from '@/components/modules/tasks/task-detail'

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  const session = await auth()
  const canAssign = session?.user?.role !== 'EMPLOYEE'

  const task = await getTaskDetail(id)

  // Also null when an Employee has no claim on this task.
  if (!task) notFound()

  const assignableUsers = canAssign ? await listAssignableUsers() : []

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Tasks
      </Link>

      <TaskDetailView
        startEditing={edit === '1'}
        canAssign={canAssign}
        isMine={task.assignedToId === session!.user.id}
        assignableUsers={assignableUsers}
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          progressPercent: task.progressPercent,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          assignedToId: task.assignedToId,
          assignedToName: task.assignedTo?.name ?? null,
          project: {
            id: task.project.id,
            title: task.project.title,
            type: task.project.type,
            status: task.project.status,
            deadline: task.project.deadline,
            clientId: task.project.client.id,
            clientName: task.project.client.name,
          },
        }}
      />
    </div>
  )
}
