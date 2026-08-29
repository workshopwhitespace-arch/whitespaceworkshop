'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban, Building2, Clock, Pencil, Check, X, AlignLeft, Trash2,
} from 'lucide-react'
import type { Priority, ProjectStatus, ProjectType, Role, TaskStatus } from '@prisma/client'
import { updateTask, updateTaskStatus, assignTask, deleteTask } from '@/lib/actions/tasks'
import { formatDate } from '@/lib/format'
import { TASK_STATUS_LABEL, TASK_STATUS_STYLE, TYPE_LABEL } from '../projects/badges'

type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  progressPercent: number
  dueDate: Date | string | null
  createdAt: Date | string
  assignedToId: string | null
  assignedToName: string | null
  project: {
    id: string
    title: string
    type: ProjectType
    status: ProjectStatus
    deadline: Date | string | null
    clientId: string
    clientName: string
  }
}

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH']
const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }
const PRIORITY_STYLE: Record<Priority, string> = {
  HIGH: 'bg-[#FBEAE6] text-[#C1443B]',
  MEDIUM: 'bg-[#FBF0E2] text-[#A87A2E]',
  LOW: 'bg-[#F1EFE8] text-[#6B6858]',
}

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'

export function TaskDetailView({
  task, canAssign, isMine, assignableUsers, startEditing = false,
}: {
  task: Task
  canAssign: boolean
  isMine: boolean
  assignableUsers: { id: string; name: string; role: Role }[]
  /** Set by ?edit=1 so the board's pencil opens straight into the form. */
  startEditing?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(startEditing)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [progress, setProgress] = useState(String(task.progressPercent))
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
  )

  // Whoever owns the task can edit its detail; so can any Admin.
  const canEdit = canAssign || isMine

  function run(fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await fn()
        if (!result.success) return setError(result.error ?? 'Something went wrong.')
        after?.()
        router.refresh()
      } catch {
        setError('That action could not be completed. Refresh the page and try again.')
      }
    })
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('The task needs a title.')

    run(
      () =>
        updateTask({
          id: task.id,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          progressPercent: Number(progress) || 0,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        }),
      () => setEditing(false)
    )
  }

  function remove() {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteTask(task.id)
        if (!result.success) return setError(result.error ?? 'Could not delete that task.')
        router.push('/dashboard/tasks')
        router.refresh()
      } catch {
        setError('Could not delete that task. Refresh the page and try again.')
      }
    })
  }

  const overdue =
    task.dueDate && task.status !== 'DONE' ? new Date(task.dueDate) < new Date() : false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS_STYLE[task.status]}`}>
            {TASK_STATUS_LABEL[task.status]}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLE[task.priority]}`}>
            {PRIORITY_LABEL[task.priority]} priority
          </span>
        </div>

        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="etitle" className="mb-1.5 block text-sm font-medium text-[#26251F]">
                Title
              </label>
              <input id="etitle" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            </div>

            <div>
              <label htmlFor="edesc" className="mb-1.5 block text-sm font-medium text-[#26251F]">
                Description
              </label>
              <textarea
                id="edesc" rows={6} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What exactly needs doing?"
                className={field}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="eprio" className="mb-1.5 block text-sm font-medium text-[#26251F]">Priority</label>
                <select id="eprio" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={field}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="eprog" className="mb-1.5 block text-sm font-medium text-[#26251F]">Progress (%)</label>
                <input id="eprog" type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="edue" className="mb-1.5 block text-sm font-medium text-[#26251F]">Due date</label>
                <input id="edue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setTitle(task.title)
                  setDescription(task.description ?? '')
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="submit" disabled={pending}
                className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                {pending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-semibold text-[#26251F]">{task.title}</h1>
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {canAssign && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={remove}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1443B]/40 hover:text-[#C1443B] disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Description — the point of the screen */}
            <div className="mt-4 border-t border-[#F1EFE8] pt-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8A8778]">
                <AlignLeft className="h-3.5 w-3.5" />
                Description
              </h2>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#26251F]">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-[#8A8778]">
                  No description yet.
                  {canEdit && ' Use Edit to explain what needs doing.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="sstatus" className="mb-1.5 block text-xs font-medium text-[#8A8778]">Stage</label>
            {canEdit ? (
              <select
                id="sstatus" value={task.status} disabled={pending}
                onChange={(e) => run(() => updateTaskStatus({ id: task.id, status: e.target.value as TaskStatus }))}
                className={field}
              >
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
              </select>
            ) : (
              <p className="text-sm text-[#26251F]">{TASK_STATUS_LABEL[task.status]}</p>
            )}
          </div>

          <div>
            <label htmlFor="sassignee" className="mb-1.5 block text-xs font-medium text-[#8A8778]">Assignee</label>
            {canAssign ? (
              <select
                id="sassignee" value={task.assignedToId ?? ''} disabled={pending}
                onChange={(e) => { if (e.target.value) run(() => assignTask(task.id, e.target.value)) }}
                className={field}
              >
                <option value="">Unassigned</option>
                {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : (
              <p className={`text-sm ${isMine ? 'font-medium text-[#C1502E]' : 'text-[#26251F]'}`}>
                {task.assignedToName ?? 'Unassigned'}{isMine && ' (you)'}
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#8A8778]">Due</p>
            <p className={`flex items-center gap-1.5 text-sm ${overdue ? 'font-medium text-[#C1443B]' : 'text-[#26251F]'}`}>
              <Clock className="h-3.5 w-3.5" />
              {formatDate(task.dueDate)}
              {overdue && ' · overdue'}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-[#F1EFE8] pt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[#8A8778]">Progress</span>
            <span className="tabular-nums text-[#26251F]">{task.progressPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EFE8]">
            <div className="h-full rounded-full bg-[#C1502E] transition-all" style={{ width: `${task.progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Context */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white">
        <div className="border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 className="text-sm font-medium text-[#26251F]">Belongs to</h2>
        </div>
        <div className="divide-y divide-[#F1EFE8]">
          <Link
            href={`/dashboard/projects/${task.project.id}`}
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#FAF9F6]"
          >
            <FolderKanban className="h-4 w-4 shrink-0 text-[#C9C6B8]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#26251F]">{task.project.title}</p>
              <p className="text-xs text-[#8A8778]">
                {TYPE_LABEL[task.project.type]} · {task.project.status.toLowerCase()}
                {task.project.deadline && ` · due ${formatDate(task.project.deadline)}`}
              </p>
            </div>
          </Link>
          <Link
            href={`/dashboard/clients/${task.project.clientId}`}
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#FAF9F6]"
          >
            <Building2 className="h-4 w-4 shrink-0 text-[#C9C6B8]" />
            <p className="min-w-0 flex-1 truncate text-sm text-[#26251F]">{task.project.clientName}</p>
          </Link>
        </div>
      </div>

      <p className="px-1 text-xs text-[#8A8778]">Created {formatDate(task.createdAt)}</p>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}
    </div>
  )
}
