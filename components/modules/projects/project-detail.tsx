'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, FileText, UserPlus, X, Plus, Clock, Wallet, CalendarDays, Trash2,
  CheckCircle2, Paperclip, RefreshCw, ExternalLink, UserRound,
} from 'lucide-react'
import type {
  ApprovalStatus, Priority, ProjectStatus, ProjectType, Role, TaskStatus,
} from '@prisma/client'
import { updateProjectStatus, assignUserToProject, removeAssignee } from '@/lib/actions/projects'
import { createTask, updateTaskStatus, assignTask, deleteTask } from '@/lib/actions/tasks'
import { inr, formatDate } from '@/lib/format'
import {
  ProjectStatusBadge, ProjectTypeBadge, PROJECT_STATUSES, STATUS_LABEL,
  TASK_STATUS_LABEL, TASK_STATUS_STYLE,
} from './badges'

type Detail = {
  id: string
  title: string
  type: ProjectType
  status: ProjectStatus
  projectValue: number | null
  startDate: Date | string | null
  deadline: Date | string | null
  createdAt: Date | string
  createdByName: string
  client: {
    id: string; name: string; companyName: string | null
    email: string | null; phone: string | null
  }
  quotation: { id: string; quotationNumber: string; reference: string | null } | null
  assignees: { userId: string; name: string; role: Role }[]
  tasks: {
    id: string; title: string; status: TaskStatus; priority: Priority
    progressPercent: number; dueDate: Date | string | null
    assignedToId: string | null; assignedToName: string | null
  }[]
  files: {
    id: string; fileUrl: string; fileType: string | null; version: number
    approvalStatus: ApprovalStatus; createdAt: Date | string; uploadedByName: string
  }[]
  revisions: { id: string; itemType: string; revisionNumber: number; revisionLimit: number }[]
  approvals: {
    id: string; itemType: string; status: ApprovalStatus
    reviewedAt: Date | string | null; notes: string | null
  }[]
}

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
const field =
  'rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'

function Card({ title, count, action, children }: {
  title: string; count?: number; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-[#E8E5DC] bg-white">
      <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
        <h2 className="text-sm font-medium text-[#26251F]">
          {title}
          {count !== undefined && <span className="ml-1.5 text-[#8A8778]">({count})</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ProjectDetailView({
  project, canManage, currentUserId, assignableUsers,
}: {
  project: Detail
  canManage: boolean
  currentUserId: string
  assignableUsers: { id: string; name: string; role: Role }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newTask, setNewTask] = useState('')
  const [assigneeToAdd, setAssigneeToAdd] = useState('')

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await fn()
        if (!result.success) return setError(result.error ?? 'Something went wrong.')
        router.refresh()
      } catch {
        // A record deleted elsewhere, or a dropped connection — surface it
        // inline rather than letting the error boundary take over the page.
        setError('That action could not be completed. Refresh the page and try again.')
      }
    })
  }

  const done = project.tasks.filter((t) => t.status === 'DONE').length
  const pct = project.tasks.length === 0 ? 0 : Math.round((done / project.tasks.length) * 100)
  const overdue =
    project.deadline && project.status !== 'DELIVERED'
      ? new Date(project.deadline) < new Date()
      : false

  const unassigned = assignableUsers.filter(
    (u) => !project.assignees.some((a) => a.userId === u.id)
  )

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- header */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <ProjectTypeBadge type={project.type} />
              <ProjectStatusBadge status={project.status} />
            </div>
            <h1 className="text-xl font-semibold text-[#26251F]">{project.title}</h1>
            <Link
              href={`/dashboard/clients/${project.client.id}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
            >
              <Building2 className="h-3.5 w-3.5" />
              {project.client.name}
              {project.client.companyName && ` · ${project.client.companyName}`}
            </Link>
          </div>

          {project.quotation && (
            <Link
              href={`/dashboard/quotations/${project.quotation.id}`}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
            >
              <FileText className="h-3.5 w-3.5" />
              {project.quotation.quotationNumber}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Origin — inherited from the quotation this project came from */}
        <div className="mt-3">
          {project.quotation ? (
            project.quotation.reference ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAEDE8] px-2.5 py-1 text-xs font-medium text-[#C1502E]">
                <UserPlus className="h-3.5 w-3.5" />
                Referred by {project.quotation.reference}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EFE8] px-2.5 py-1 text-xs font-medium text-[#6B6858]">
                <UserRound className="h-3.5 w-3.5" />
                Direct client
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EFE8] px-2.5 py-1 text-xs font-medium text-[#6B6858]">
              <UserRound className="h-3.5 w-3.5" />
              Added directly — no quotation
            </span>
          )}
        </div>

        {/* Meta */}
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[#F1EFE8] pt-4 sm:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[#8A8778]">
              <Wallet className="h-3 w-3" /> Value
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-[#26251F]">
              {project.projectValue === null ? '—' : inr(project.projectValue)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[#8A8778]">
              <CalendarDays className="h-3 w-3" /> Start
            </dt>
            <dd className="mt-0.5 text-sm text-[#26251F]">{formatDate(project.startDate)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[#8A8778]">
              <Clock className="h-3 w-3" /> Deadline
            </dt>
            <dd className={`mt-0.5 text-sm ${overdue ? 'font-medium text-[#C1443B]' : 'text-[#26251F]'}`}>
              {formatDate(project.deadline)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-[#8A8778]">
              <CheckCircle2 className="h-3 w-3" /> Progress
            </dt>
            <dd className="mt-0.5 text-sm tabular-nums text-[#26251F]">
              {done}/{project.tasks.length} · {pct}%
            </dd>
          </div>
        </dl>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F1EFE8]">
          <div className="h-full rounded-full bg-[#C1502E] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ------------------------------------------------------- pipeline */}
      <Card title="Stage">
        <div className="flex flex-wrap gap-2 p-5">
          {PROJECT_STATUSES.map((s) => {
            const isCurrent = project.status === s
            const index = PROJECT_STATUSES.indexOf(s)
            const currentIndex = PROJECT_STATUSES.indexOf(project.status)
            const isPast = index < currentIndex

            return (
              <button
                key={s}
                type="button"
                disabled={!canManage || pending || isCurrent}
                onClick={() => run(() => updateProjectStatus({ id: project.id, status: s }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isCurrent
                    ? 'bg-[#26251F] text-white'
                    : isPast
                      ? 'bg-[#E8F1EA] text-[#3F7A50] hover:bg-[#DDEBE0]'
                      : 'border border-[#E8E5DC] text-[#6B6858] hover:border-[#C1502E]/40 hover:text-[#C1502E]'
                } ${!canManage || isCurrent ? 'cursor-default' : ''} disabled:opacity-100`}
              >
                {STATUS_LABEL[s]}
              </button>
            )
          })}
        </div>
        {!canManage && (
          <p className="border-t border-[#F1EFE8] px-5 py-2.5 text-xs text-[#8A8778]">
            Only an Admin can move a project between stages.
          </p>
        )}
      </Card>

      {/* ----------------------------------------------------------- tasks */}
      <Card title="Tasks" count={project.tasks.length}>
        {project.tasks.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-[#8A8778]">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-[#F1EFE8]">
            {project.tasks.map((t) => {
              const isMine = t.assignedToId === currentUserId
              const canEditTask = canManage || isMine
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      t.priority === 'HIGH' ? 'bg-[#C1443B]'
                        : t.priority === 'MEDIUM' ? 'bg-[#D89B3C]' : 'bg-[#C9C6B8]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/tasks/${t.id}`}
                      className={`block truncate text-sm transition hover:text-[#C1502E] ${
                        t.status === 'DONE' ? 'text-[#8A8778] line-through' : 'text-[#26251F]'
                      }`}
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-[#8A8778]">
                      {t.assignedToName ?? 'Unassigned'}
                      {t.dueDate && ` · due ${formatDate(t.dueDate)}`}
                    </p>
                  </div>

                  {canManage && (
                    <select
                      value={t.assignedToId ?? ''}
                      disabled={pending}
                      onChange={(e) => {
                        if (e.target.value) run(() => assignTask(t.id, e.target.value))
                      }}
                      aria-label={`Assign ${t.title}`}
                      className={`${field} py-1 text-xs`}
                    >
                      <option value="">Unassigned</option>
                      {assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  )}

                  {canEditTask ? (
                    <select
                      value={t.status}
                      disabled={pending}
                      onChange={(e) =>
                        run(() => updateTaskStatus({ id: t.id, status: e.target.value as TaskStatus }))
                      }
                      aria-label={`Status of ${t.title}`}
                      className={`${field} py-1 text-xs`}
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS_STYLE[t.status]}`}>
                      {TASK_STATUS_LABEL[t.status]}
                    </span>
                  )}

                  {canManage && (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Delete ${t.title}`}
                      onClick={() => {
                        if (!window.confirm(`Delete "${t.title}"? This cannot be undone.`)) return
                        run(() => deleteTask(t.id))
                      }}
                      className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FBEAE6] hover:text-[#C1443B] disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {canManage && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newTask.trim()) return
              run(async () => {
                const r = await createTask({
                  projectId: project.id,
                  title: newTask.trim(),
                  priority: 'MEDIUM',
                })
                if (r.success) setNewTask('')
                return r
              })
            }}
            className="flex gap-2 border-t border-[#F1EFE8] px-5 py-3.5"
          >
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task…"
              className={`${field} flex-1`}
            />
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>
        )}
      </Card>

      {/* ------------------------------------------------------------ team */}
      <Card title="Team" count={project.assignees.length}>
        {project.assignees.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-[#8A8778]">Nobody assigned yet.</p>
        ) : (
          <ul className="divide-y divide-[#F1EFE8]">
            {project.assignees.map((a) => (
              <li key={a.userId} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C1502E] text-xs font-medium text-white">
                  {a.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#26251F]">{a.name}</p>
                  <p className="text-xs text-[#8A8778]">{a.role.replace('_', ' ').toLowerCase()}</p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Remove ${a.name}`}
                    onClick={() => run(() => removeAssignee(project.id, a.userId))}
                    className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FBEAE6] hover:text-[#C1443B] disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && unassigned.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!assigneeToAdd) return
              run(async () => {
                const r = await assignUserToProject(project.id, assigneeToAdd)
                if (r.success) setAssigneeToAdd('')
                return r
              })
            }}
            className="flex gap-2 border-t border-[#F1EFE8] px-5 py-3.5"
          >
            <select
              value={assigneeToAdd}
              onChange={(e) => setAssigneeToAdd(e.target.value)}
              className={`${field} flex-1`}
            >
              <option value="">Add someone to this project…</option>
              {unassigned.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role.replace('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending || !assigneeToAdd}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E] disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              Assign
            </button>
          </form>
        )}
      </Card>

      {/* ----------------------------------------------------------- files */}
      <Card title="Design files" count={project.files.length}>
        {project.files.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-[#8A8778]">
            No files uploaded yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#F1EFE8]">
            {project.files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                <Paperclip className="h-4 w-4 shrink-0 text-[#C9C6B8]" />
                <div className="min-w-0 flex-1">
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-[#26251F] transition hover:text-[#C1502E]"
                  >
                    {f.fileType ?? 'File'} · v{f.version}
                  </a>
                  <p className="text-xs text-[#8A8778]">
                    {f.uploadedByName} · {formatDate(f.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    f.approvalStatus === 'APPROVED'
                      ? 'bg-[#E8F1EA] text-[#3F7A50]'
                      : f.approvalStatus === 'CHANGES_REQUESTED'
                        ? 'bg-[#FBEAE6] text-[#C1443B]'
                        : 'bg-[#F1EFE8] text-[#6B6858]'
                  }`}
                >
                  {f.approvalStatus.replace('_', ' ').toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------------- revisions */}
      {project.revisions.length > 0 && (
        <Card title="Revisions" count={project.revisions.length}>
          <ul className="divide-y divide-[#F1EFE8]">
            {project.revisions.map((r) => {
              const atLimit = r.revisionNumber >= r.revisionLimit
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <RefreshCw className={`h-4 w-4 shrink-0 ${atLimit ? 'text-[#C1443B]' : 'text-[#C9C6B8]'}`} />
                  <p className="min-w-0 flex-1 truncate text-sm text-[#26251F]">{r.itemType}</p>
                  <span className={`text-xs tabular-nums ${atLimit ? 'font-medium text-[#C1443B]' : 'text-[#8A8778]'}`}>
                    {r.revisionNumber} of {r.revisionLimit}
                    {atLimit && ' · limit reached'}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* ------------------------------------------------------- approvals */}
      {project.approvals.length > 0 && (
        <Card title="Client approvals" count={project.approvals.length}>
          <ul className="divide-y divide-[#F1EFE8]">
            {project.approvals.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#26251F]">{a.itemType}</p>
                  {a.notes && <p className="truncate text-xs text-[#8A8778]">{a.notes}</p>}
                </div>
                <span className="shrink-0 text-xs text-[#8A8778]">
                  {a.reviewedAt ? formatDate(a.reviewedAt) : 'Awaiting review'}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.status === 'APPROVED'
                      ? 'bg-[#E8F1EA] text-[#3F7A50]'
                      : a.status === 'CHANGES_REQUESTED'
                        ? 'bg-[#FBEAE6] text-[#C1443B]'
                        : 'bg-[#F1EFE8] text-[#6B6858]'
                  }`}
                >
                  {a.status.replace('_', ' ').toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="px-1 text-xs text-[#8A8778]">
        Created {formatDate(project.createdAt)} by {project.createdByName}
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}
    </div>
  )
}
