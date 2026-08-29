'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Search, FolderKanban, Clock, Users } from 'lucide-react'
import type { ProjectStatus, ProjectType } from '@prisma/client'
import { inr, formatDate } from '@/lib/format'
import { ProjectForm } from './project-form'
import {
  ProjectStatusBadge,
  ProjectTypeBadge,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  STATUS_LABEL,
  TYPE_LABEL,
} from './badges'

type Row = {
  id: string
  title: string
  type: ProjectType
  status: ProjectStatus
  clientId: string
  clientName: string
  deadline: Date | string | null
  startDate: Date | string | null
  projectValue: number | null
  taskCount: number
  assignees: { id: string; name: string }[]
}

function buildHref(type: ProjectType | null, status: ProjectStatus | null) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (status) params.set('status', status)
  const qs = params.toString()
  return qs ? `/dashboard/projects?${qs}` : '/dashboard/projects'
}

function daysUntil(d: Date | string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export function ProjectList({
  projects,
  clients,
  canManage,
  activeType,
  activeStatus,
}: {
  projects: Row[]
  clients: { id: string; name: string; companyName: string | null }[]
  canManage: boolean
  activeType: ProjectType | null
  activeStatus: ProjectStatus | null
}) {
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const visible = projects.filter((p) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return p.title.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
  })

  const pill = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm transition ${
      active ? 'bg-[#26251F] font-medium text-white' : 'text-[#6B6858] hover:bg-[#FAF9F6]'
    }`

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1 rounded-lg border border-[#E8E5DC] bg-white p-1">
            <Link href={buildHref(null, activeStatus)} className={pill(activeType === null)}>
              All types
            </Link>
            {PROJECT_TYPES.map((t) => (
              <Link key={t} href={buildHref(t, activeStatus)} className={pill(activeType === t)}>
                {TYPE_LABEL[t]}
              </Link>
            ))}
          </nav>

          {canManage && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
            >
              <Plus className="h-4 w-4" />
              New project
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1 rounded-lg border border-[#E8E5DC] bg-white p-1">
            <Link href={buildHref(activeType, null)} className={pill(activeStatus === null)}>
              All stages
            </Link>
            {PROJECT_STATUSES.map((s) => (
              <Link key={s} href={buildHref(activeType, s)} className={pill(activeStatus === s)}>
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </nav>

          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8778]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project or client…"
              className="w-full rounded-lg border border-[#E8E5DC] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <FolderKanban className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">
              {projects.length === 0 ? 'No projects here' : 'Nothing matches that search'}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              {projects.length === 0
                ? canManage
                  ? 'Accept a quotation to create one, or add a project directly.'
                  : 'You have not been assigned to a project yet.'
                : 'Try a different project or client name.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => {
            const days = p.deadline ? daysUntil(p.deadline) : null
            const overdue = days !== null && days < 0 && p.status !== 'DELIVERED'

            return (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.id}`}
                className="group flex flex-col rounded-xl border border-[#E8E5DC] bg-white p-4 transition hover:border-[#C1502E]/40 hover:shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <ProjectTypeBadge type={p.type} />
                  <ProjectStatusBadge status={p.status} />
                </div>

                <h2 className="text-sm font-medium text-[#26251F] transition group-hover:text-[#C1502E]">
                  {p.title}
                </h2>
                <p className="mt-0.5 text-xs text-[#8A8778]">{p.clientName}</p>

                <div className="mt-3 flex items-center gap-3 border-t border-[#F1EFE8] pt-3 text-xs text-[#8A8778]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {p.deadline ? (
                      <span className={overdue ? 'font-medium text-[#C1443B]' : ''}>
                        {overdue ? `${Math.abs(days!)}d late` : formatDate(p.deadline)}
                      </span>
                    ) : (
                      'No deadline'
                    )}
                  </span>

                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {p.assignees.length}
                  </span>

                  <span>{p.taskCount} tasks</span>

                  {p.projectValue !== null && (
                    <span className="ml-auto font-medium tabular-nums text-[#26251F]">
                      {inr(p.projectValue)}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {formOpen && <ProjectForm clients={clients} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
