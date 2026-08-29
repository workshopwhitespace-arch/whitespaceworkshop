import { auth } from '@/lib/auth'
import { listProjects } from '@/lib/actions/projects'
import { listClients } from '@/lib/validations/clients'
import { ProjectList } from '@/components/modules/projects/project-list'
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/components/modules/projects/badges'
import type { ProjectStatus, ProjectType } from '@prisma/client'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const { type, status } = await searchParams
  const session = await auth()
  const canManage = session?.user?.role !== 'EMPLOYEE'

  const activeType = PROJECT_TYPES.includes(type as ProjectType)
    ? (type as ProjectType)
    : undefined
  const activeStatus = PROJECT_STATUSES.includes(status as ProjectStatus)
    ? (status as ProjectStatus)
    : undefined

  const rows = await listProjects({ type: activeType, status: activeStatus })

  // Only Admins can create projects, so only they need the client list.
  const clients = canManage
    ? (await listClients()).map((c) => ({ id: c.id, name: c.name, companyName: c.companyName }))
    : []

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Projects</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          {canManage
            ? 'Every accepted quotation becomes a project here.'
            : 'Projects you are assigned to.'}
        </p>
      </div>

      <ProjectList
        canManage={canManage}
        clients={clients}
        activeType={activeType ?? null}
        activeStatus={activeStatus ?? null}
        projects={rows.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          clientId: p.client.id,
          clientName: p.client.name,
          deadline: p.deadline,
          startDate: p.startDate,
          projectValue: p.projectValue === null ? null : Number(p.projectValue),
          taskCount: p._count.tasks,
          assignees: p.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
        }))}
      />
    </div>
  )
}
