'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { Priority, Role } from '@prisma/client'
import { createTask } from '@/lib/actions/tasks'

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH']
const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }

export function TaskForm({
  projects,
  assignableUsers,
  canAssign,
  defaultProjectId,
  onClose,
}: {
  projects: { id: string; title: string; clientName: string }[]
  assignableUsers: { id: string; name: string; role: Role }[]
  canAssign: boolean
  defaultProjectId?: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const first = useRef<HTMLSelectElement>(null)

  const [projectId, setProjectId] = useState(defaultProjectId ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [assignedToId, setAssignedToId] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    first.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!projectId) return setError('Choose which project this task belongs to.')
    if (!title.trim()) return setError('Give the task a title.')

    startTransition(async () => {
      const result = await createTask({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedToId: assignedToId || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      })

      if (!result.success) return setError(result.error)
      onClose()
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1F1E1B]/40 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="w-full max-w-lg rounded-xl border border-[#E8E5DC] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 id="task-form-title" className="text-sm font-medium text-[#26251F]">New task</h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded p-1 text-[#8A8778] transition hover:bg-[#FAF9F6] hover:text-[#26251F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div>
            <label htmlFor="tproject" className={label}>
              Project <span className="text-[#C1502E]">*</span>
            </label>
            <select
              id="tproject" ref={first} value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={field}
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.clientName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#8A8778]">
              A task always belongs to a project.
            </p>
          </div>

          <div>
            <label htmlFor="ttitle" className={label}>
              Title <span className="text-[#C1502E]">*</span>
            </label>
            <input
              id="ttitle" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revise lobby elevation"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="tdesc" className={label}>
              Description <span className="font-normal text-[#8A8778]">(optional)</span>
            </label>
            <textarea
              id="tdesc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What exactly needs doing? Measurements, references, anything the assignee needs."
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="tpriority" className={label}>Priority</label>
              <select
                id="tpriority" value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={field}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>

            {canAssign && (
              <div>
                <label htmlFor="tassignee" className={label}>Assignee</label>
                <select
                  id="tassignee" value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className={field}
                >
                  <option value="">Unassigned</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="tdue" className={label}>Due date</label>
              <input
                id="tdue" type="date" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={field}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={pending}
              className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
            >
              {pending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
