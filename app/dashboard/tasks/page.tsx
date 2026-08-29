import { auth } from '@/lib/auth'
import { listTasks } from '@/lib/actions/tasks'
import { listProjects, listAssignableUsers } from '@/lib/actions/projects'
import { TaskBoard } from '@/components/modules/tasks/task-board'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; mine?: string }>
}) {
  const { project, mine } = await searchParams
  const session = await auth()
  const userId = session!.user.id
  const canAssign = session?.user?.role !== 'EMPLOYEE'

  // Projects double as the filter list and the create form's picker, and are
  // already scoped — an Employee only ever sees their own assignments.
  const projects = await listProjects()
  const activeProject = projects.some((p) => p.id === project) ? project : undefined
  const onlyMine = mine === '1'

  const tasks = await listTasks({
    projectId: activeProject,
    assignedToId: onlyMine ? userId : undefined,
  })

  const assignableUsers = canAssign ? await listAssignableUsers() : []

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Tasks</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          {canAssign
            ? 'Every task belongs to a project. Drag a card to change its stage.'
            : 'Tasks assigned to you. Drag a card to change its stage.'}
        </p>
      </div>

      <TaskBoard
        canAssign={canAssign}
        currentUserId={userId}
        activeProjectId={activeProject ?? null}
        onlyMine={onlyMine}
        assignableUsers={assignableUsers}
        projects={projects.map((p) => ({
          id: p.id,
          title: p.title,
          clientName: p.client.name,
        }))}
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          progressPercent: t.progressPercent,
          dueDate: t.dueDate,
          projectId: t.projectId,
          projectTitle: t.project.title,
          assignedToId: t.assignedToId,
          assignedToName: t.assignedTo?.name ?? null,
        }))}
      />
    </div>
  )
}
