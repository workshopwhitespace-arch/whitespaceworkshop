'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CheckSquare, Clock, GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { Priority, Role, TaskStatus } from '@prisma/client'
import { updateTaskStatus, assignTask, deleteTask } from '@/lib/actions/tasks'
import { formatDateShort } from '@/lib/format'
import { TaskForm } from './task-form'

type Task = {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  progressPercent: number
  dueDate: Date | string | null
  projectId: string
  projectTitle: string
  assignedToId: string | null
  assignedToName: string | null
}

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'TODO', label: 'To do', accent: 'bg-[#C9C6B8]' },
  { status: 'IN_PROGRESS', label: 'In progress', accent: 'bg-[#3B6CA8]' },
  { status: 'REVIEW', label: 'Review', accent: 'bg-[#A87A2E]' },
  { status: 'DONE', label: 'Done', accent: 'bg-[#3F7A50]' },
]

const PRIORITY_DOT: Record<Priority, string> = {
  HIGH: 'bg-[#C1443B]',
  MEDIUM: 'bg-[#D89B3C]',
  LOW: 'bg-[#C9C6B8]',
}

export function TaskBoard({
  tasks,
  projects,
  assignableUsers,
  canAssign,
  currentUserId,
  activeProjectId,
  onlyMine,
}: {
  tasks: Task[]
  projects: { id: string; title: string; clientName: string }[]
  assignableUsers: { id: string; name: string; role: Role }[]
  canAssign: boolean
  currentUserId: string
  activeProjectId: string | null
  onlyMine: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  function move(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === status) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await updateTaskStatus({ id: taskId, status })
        if (!result.success) return setError(result.error ?? 'Could not move that task.')
        router.refresh()
      } catch {
        setError('Could not move that task. Refresh the page and try again.')
      }
    })
  }

  function reassign(taskId: string, userId: string) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await assignTask(taskId, userId)
        if (!result.success) return setError('Could not reassign that task.')
        router.refresh()
      } catch {
        setError('Could not reassign that task. Refresh the page and try again.')
      }
    })
  }

  function remove(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteTask(task.id)
        if (!result.success) return setError(result.error ?? 'Could not delete that task.')
        router.refresh()
      } catch {
        setError('Could not delete that task. Refresh the page and try again.')
      }
    })
  }

  function filterHref(projectId: string | null, mine: boolean) {
    const params = new URLSearchParams()
    if (projectId) params.set('project', projectId)
    if (mine) params.set('mine', '1')
    const qs = params.toString()
    return qs ? `/dashboard/tasks?${qs}` : '/dashboard/tasks'
  }

  const field =
    'rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeProjectId ?? ''}
            onChange={(e) =>
              router.push(filterHref(e.target.value || null, onlyMine))
            }
            aria-label="Filter by project"
            className={field}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.clientName}
              </option>
            ))}
          </select>

          <Link
            href={filterHref(activeProjectId, !onlyMine)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              onlyMine
                ? 'border-[#C1502E] bg-[#FAEDE8] text-[#C1502E]'
                : 'border-[#E8E5DC] bg-white text-[#6B6858] hover:border-[#C1502E]/40 hover:text-[#C1502E]'
            }`}
          >
            Only mine
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={projects.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          New task
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <CheckSquare className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">No projects yet</p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              A task has to belong to a project, so create a project first.
            </p>
          </div>
          <Link
            href="/dashboard/projects"
            className="mt-1 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
          >
            Go to Projects
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.status)
            const isOver = overColumn === col.status

            return (
              <section
                key={col.status}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  setOverColumn(col.status)
                }}
                onDragLeave={() => setOverColumn((c) => (c === col.status ? null : c))}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId) move(dragId, col.status)
                  setDragId(null)
                  setOverColumn(null)
                }}
                className={`flex min-h-[140px] flex-col rounded-xl border bg-[#FAF9F6] transition ${
                  isOver ? 'border-[#C1502E] bg-[#FAEDE8]' : 'border-[#E8E5DC]'
                }`}
              >
                <header className="flex items-center gap-2 border-b border-[#E8E5DC] px-3.5 py-3">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.accent}`} />
                  <h2 className="flex-1 text-sm font-medium text-[#26251F]">{col.label}</h2>
                  <span className="text-xs tabular-nums text-[#8A8778]">{items.length}</span>
                </header>

                <div className="flex-1 space-y-2 p-2.5">
                  {items.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#C9C6B8]">
                      {isOver ? 'Drop here' : 'Nothing here'}
                    </p>
                  ) : (
                    items.map((t) => {
                      const overdue =
                        t.dueDate && t.status !== 'DONE'
                          ? new Date(t.dueDate) < new Date()
                          : false
                      const isMine = t.assignedToId === currentUserId

                      return (
                        <article
                          key={t.id}
                          className={`group rounded-lg border border-[#E8E5DC] bg-white p-3 transition ${
                            dragId === t.id ? 'opacity-40' : 'hover:border-[#C1502E]/40'
                          }`}
                        >
                          <div className="mb-1.5 flex items-start gap-2">
                            {/* Drag lives on the handle so the card body stays clickable. */}
                            <span
                              draggable
                              onDragStart={(e) => {
                                setDragId(t.id)
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('text/plain', t.id)
                              }}
                              onDragEnd={() => {
                                setDragId(null)
                                setOverColumn(null)
                              }}
                              aria-label={`Drag ${t.title}`}
                              className="mt-0.5 shrink-0 cursor-grab text-[#C9C6B8] transition hover:text-[#8A8778] active:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>

                            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[t.priority]}`} />

                            <Link
                              href={`/dashboard/tasks/${t.id}`}
                              draggable={false}
                              className={`flex-1 text-sm transition hover:text-[#C1502E] ${
                                t.status === 'DONE' ? 'text-[#8A8778] line-through' : 'text-[#26251F]'
                              }`}
                            >
                              {t.title}
                            </Link>
                          </div>

                          <div className="mb-1.5 flex items-center gap-2">
                            <Link
                              href={`/dashboard/projects/${t.projectId}`}
                              draggable={false}
                              className="min-w-0 flex-1 truncate text-xs text-[#8A8778] transition hover:text-[#C1502E]"
                            >
                              {t.projectTitle}
                            </Link>

                            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                              <Link
                                href={`/dashboard/tasks/${t.id}?edit=1`}
                                draggable={false}
                                aria-label={`Edit ${t.title}`}
                                className="rounded p-1 text-[#C9C6B8] transition hover:bg-[#FAF9F6] hover:text-[#C1502E]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                              {canAssign && (
                                <button
                                  type="button"
                                  disabled={pending}
                                  aria-label={`Delete ${t.title}`}
                                  onClick={() => remove(t)}
                                  className="rounded p-1 text-[#C9C6B8] transition hover:bg-[#FBEAE6] hover:text-[#C1443B] disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#F1EFE8] pt-2.5">
                            {canAssign ? (
                              <select
                                value={t.assignedToId ?? ''}
                                disabled={pending}
                                onChange={(e) => {
                                  if (e.target.value) reassign(t.id, e.target.value)
                                }}
                                aria-label={`Assign ${t.title}`}
                                onDragStart={(e) => e.preventDefault()}
                                className="max-w-[120px] rounded border border-[#E8E5DC] bg-white px-1.5 py-0.5 text-xs text-[#6B6858] outline-none focus:border-[#C1502E]"
                              >
                                <option value="">Unassigned</option>
                                {assignableUsers.map((u) => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`text-xs ${isMine ? 'font-medium text-[#C1502E]' : 'text-[#8A8778]'}`}>
                                {t.assignedToName ?? 'Unassigned'}
                              </span>
                            )}

                            {t.dueDate && (
                              <span
                                className={`ml-auto flex items-center gap-1 text-xs tabular-nums ${
                                  overdue ? 'font-medium text-[#C1443B]' : 'text-[#8A8778]'
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {formatDateShort(t.dueDate)}
                              </span>
                            )}
                          </div>

                          {/* Keyboard/touch fallback — dragging alone isn't enough. */}
                          <select
                            value={t.status}
                            disabled={pending}
                            onChange={(e) => move(t.id, e.target.value as TaskStatus)}
                            aria-label={`Stage of ${t.title}`}
                            className="mt-2 w-full rounded border border-[#E8E5DC] bg-white px-1.5 py-1 text-xs text-[#6B6858] outline-none focus:border-[#C1502E]"
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.status} value={c.status}>{c.label}</option>
                            ))}
                          </select>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      {formOpen && (
        <TaskForm
          projects={projects}
          assignableUsers={assignableUsers}
          canAssign={canAssign}
          defaultProjectId={activeProjectId}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
