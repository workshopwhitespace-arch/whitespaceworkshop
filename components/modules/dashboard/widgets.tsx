'use client'

import Link from 'next/link'
import {
  Users,
  FileText,
  Building2,
  FolderKanban,
  CheckSquare,
  Wallet,
  BarChart3,
  UserCog,
  History,
  ArrowRight,
  AlertTriangle,
  Clock,
  Inbox,
} from 'lucide-react'
import type { DashboardData } from '@/lib/actions/dashboard'
import { inr, formatDateShort as formatDate } from '@/lib/format'

function daysUntil(d: Date | string) {
  const ms = new Date(d).getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

/** Shared empty state so every widget degrades the same way on a fresh database. */
function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Inbox className="h-5 w-5 text-[#C9C6B8]" />
      <p className="text-xs text-[#8A8778]">{label}</p>
    </div>
  )
}

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'good' | 'accent' }) {
  const tones = {
    neutral: 'bg-[#F1EFE8] text-[#6B6858]',
    warn: 'bg-[#FBEAE6] text-[#C1443B]',
    good: 'bg-[#E8F1EA] text-[#3F7A50]',
    accent: 'bg-[#FAEDE8] text-[#C1502E]',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

/* ---------------------------------------------------------------- stats -- */

export function StatsWidget({ data }: { data: DashboardData }) {
  const { counts, ledger } = data
  const tiles = [
    { label: 'Active projects', value: counts.activeProjects, href: '/dashboard/projects', icon: FolderKanban },
    { label: 'Open tasks', value: counts.openTasks, href: '/dashboard/tasks', icon: CheckSquare },
    { label: 'Overdue', value: counts.overdueTasks, href: '/dashboard/tasks', icon: AlertTriangle, alert: counts.overdueTasks > 0 },
    ledger
      ? { label: 'Outstanding', value: inr(ledger.outstanding), href: '/dashboard/ledger', icon: Wallet }
      : { label: 'New leads', value: counts.newLeads, href: '/dashboard/leads', icon: Users },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon
        return (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-xl border border-[#E8E5DC] bg-white p-4 transition hover:border-[#C1502E]/40 hover:shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <Icon className={`h-4 w-4 ${'alert' in t && t.alert ? 'text-[#C1443B]' : 'text-[#8A8778]'}`} />
              <ArrowRight className="h-3.5 w-3.5 text-[#C9C6B8] opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${'alert' in t && t.alert ? 'text-[#C1443B]' : 'text-[#26251F]'}`}>
              {t.value}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">{t.label}</p>
          </Link>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ shortcuts -- */

const MODULES = [
  { href: '/dashboard/leads', label: 'Leads', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/quotations', label: 'Quotations', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/clients', label: 'Clients', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/ledger', label: 'Ledger', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/team', label: 'Team', icon: UserCog, roles: ['SUPER_ADMIN'] },
  { href: '/dashboard/activity', label: 'Activity', icon: History, roles: ['SUPER_ADMIN', 'ADMIN'] },
] as const

export function ShortcutsWidget({ data }: { data: DashboardData }) {
  const items = MODULES.filter((m) => (m.roles as readonly string[]).includes(data.role))

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((m) => {
        const Icon = m.icon
        return (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center gap-2 rounded-lg border border-transparent px-2 py-3 text-center transition hover:border-[#E8E5DC] hover:bg-[#FAF9F6]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1EFE8] text-[#6B6858]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium text-[#26251F]">{m.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------- my tasks -- */

export function MyTasksWidget({ data }: { data: DashboardData }) {
  if (data.myTasks.length === 0) return <Empty label="No open tasks assigned to you." />

  return (
    <ul className="divide-y divide-[#F1EFE8]">
      {data.myTasks.map((t) => {
        const overdue = t.dueDate ? new Date(t.dueDate) < new Date() : false
        return (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                t.priority === 'HIGH' ? 'bg-[#C1443B]' : t.priority === 'MEDIUM' ? 'bg-[#D89B3C]' : 'bg-[#C9C6B8]'
              }`}
            />
            <Link href={`/dashboard/tasks/${t.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#26251F] transition hover:text-[#C1502E]">{t.title}</p>
              <p className="truncate text-xs text-[#8A8778]">{t.projectTitle}</p>
            </Link>
            <span className={`shrink-0 text-xs tabular-nums ${overdue ? 'font-medium text-[#C1443B]' : 'text-[#8A8778]'}`}>
              {formatDate(t.dueDate)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/* -------------------------------------------------------------- projects -- */

export function ProjectsWidget({ data }: { data: DashboardData }) {
  if (data.recentProjects.length === 0) return <Empty label="No projects yet." />

  return (
    <ul className="space-y-3">
      {data.recentProjects.map((p) => {
        const pct = p.totalTasks === 0 ? 0 : Math.round((p.doneTasks / p.totalTasks) * 100)
        return (
          <li key={p.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#26251F]">{p.title}</p>
                <p className="truncate text-xs text-[#8A8778]">{p.clientName}</p>
              </div>
              <StatusPill>{p.status.toLowerCase()}</StatusPill>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1EFE8]">
                <div className="h-full rounded-full bg-[#C1502E] transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-[#8A8778]">
                {p.doneTasks}/{p.totalTasks} done
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------- deadlines -- */

export function DeadlinesWidget({ data }: { data: DashboardData }) {
  if (data.upcomingDeadlines.length === 0) return <Empty label="Nothing due in the next 7 days." />

  return (
    <ul className="space-y-2.5">
      {data.upcomingDeadlines.map((p) => {
        const days = p.deadline ? daysUntil(p.deadline) : null
        return (
          <li key={p.id} className="flex items-center gap-3">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#8A8778]" />
            <p className="min-w-0 flex-1 truncate text-sm text-[#26251F]">{p.title}</p>
            <StatusPill tone={days !== null && days <= 2 ? 'warn' : 'neutral'}>
              {days === 0 ? 'today' : `${days}d`}
            </StatusPill>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------------------------------------------------------------- ledger -- */

export function LedgerWidget({ data }: { data: DashboardData }) {
  if (!data.ledger) return null
  const { debit, credit, outstanding } = data.ledger

  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-[#26251F]">{inr(outstanding)}</p>
      <p className="mt-0.5 text-xs text-[#8A8778]">Outstanding across all clients</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#FAF9F6] p-3">
          <p className="text-xs text-[#8A8778]">Billed</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-[#26251F]">{inr(debit)}</p>
        </div>
        <div className="rounded-lg bg-[#FAF9F6] p-3">
          <p className="text-xs text-[#8A8778]">Received</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-[#3F7A50]">{inr(credit)}</p>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- leads -- */

export function LeadsWidget({ data }: { data: DashboardData }) {
  if (data.recentLeads.length === 0) return <Empty label="No leads captured yet." />

  const tone = { NEW: 'accent', CONTACTED: 'neutral', QUOTATION: 'neutral', WON: 'good', LOST: 'warn' } as const

  return (
    <ul className="divide-y divide-[#F1EFE8]">
      {data.recentLeads.map((l) => (
        <li key={l.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[#26251F]">{l.name}</p>
            <p className="truncate text-xs text-[#8A8778]">{l.service}</p>
          </div>
          {l.budget !== null && (
            <span className="shrink-0 text-xs tabular-nums text-[#8A8778]">{inr(l.budget)}</span>
          )}
          <StatusPill tone={tone[l.status]}>{l.status.toLowerCase()}</StatusPill>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------- activity -- */

export function ActivityWidget({ data }: { data: DashboardData }) {
  if (!data.recentActivity) return null
  if (data.recentActivity.length === 0) return <Empty label="No activity recorded yet." />

  return (
    <ul className="space-y-2.5">
      {data.recentActivity.map((a) => (
        <li key={a.id} className="flex gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9C6B8]" />
          <div className="min-w-0">
            <p className="truncate text-sm text-[#26251F]">
              <span className="font-medium">{a.userName}</span> {a.action}
            </p>
            <p className="text-xs text-[#8A8778]">{formatDate(a.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
