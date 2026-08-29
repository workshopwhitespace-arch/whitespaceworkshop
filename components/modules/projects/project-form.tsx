'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { ProjectType } from '@prisma/client'
import { createProject } from '@/lib/actions/projects'
import { PROJECT_TYPES, TYPE_LABEL } from './badges'

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

export function ProjectForm({
  clients,
  onClose,
}: {
  clients: { id: string; name: string; companyName: string | null }[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const first = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [type, setType] = useState<ProjectType>('INTERIOR')
  const [projectValue, setProjectValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [seedTasks, setSeedTasks] = useState(false)

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

    if (title.trim().length < 2) return setError('Give the project a title.')
    if (!clientId) return setError('Choose a client.')

    startTransition(async () => {
      const result = await createProject({
        title: title.trim(),
        clientId,
        type,
        projectValue: projectValue ? Number(projectValue) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        seedTasks,
      })

      if (!result.success) return setError(result.error)
      onClose()
      router.push(`/dashboard/projects/${result.project.id}`)
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
        aria-labelledby="project-form-title"
        className="w-full max-w-lg rounded-xl border border-[#E8E5DC] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 id="project-form-title" className="text-sm font-medium text-[#26251F]">
            New project
          </h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="rounded p-1 text-[#8A8778] transition hover:bg-[#FAF9F6] hover:text-[#26251F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div>
            <label htmlFor="ptitle" className={label}>
              Title <span className="text-[#C1502E]">*</span>
            </label>
            <input
              id="ptitle" ref={first} value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Joshi Store Revamp"
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pclient" className={label}>
                Client <span className="text-[#C1502E]">*</span>
              </label>
              <select id="pclient" value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.name} — ${c.companyName}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ptype" className={label}>Type</label>
              <select
                id="ptype" value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                className={field}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>

            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="pvalue" className={label}>Value (₹)</label>
              <input
                id="pvalue" type="number" min="0" step="0.01" value={projectValue}
                onChange={(e) => setProjectValue(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="pstart" className={label}>Start</label>
              <input id="pstart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="pdead" className={label}>Deadline</label>
              <input id="pdead" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#E8E5DC] bg-[#FAF9F6] p-3">
            <input
              type="checkbox"
              checked={seedTasks}
              onChange={(e) => setSeedTasks(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#C1502E]"
            />
            <span>
              <span className="block text-sm font-medium text-[#26251F]">
                Start from the {TYPE_LABEL[type]} checklist
              </span>
              <span className="block text-xs text-[#8A8778]">
                Adds the standard {TYPE_LABEL[type]} tasks. Leave off to start with an
                empty task list.
              </span>
            </span>
          </label>

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
              {pending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
