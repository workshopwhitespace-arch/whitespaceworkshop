'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { GripVertical, RotateCcw, ArrowRight } from 'lucide-react'
import type { DashboardData } from '@/lib/actions/dashboard'
import {
  StatsWidget,
  ShortcutsWidget,
  MyTasksWidget,
  ProjectsWidget,
  DeadlinesWidget,
  LedgerWidget,
  LeadsWidget,
  ActivityWidget,
} from './widgets'

type WidgetId =
  | 'stats'
  | 'shortcuts'
  | 'my-tasks'
  | 'projects'
  | 'deadlines'
  | 'ledger'
  | 'leads'
  | 'activity'

type WidgetDef = {
  id: WidgetId
  title: string
  /** Column span on large screens; the grid is 6 columns wide. */
  span: 2 | 3 | 4 | 6
  href?: string
  /** Withheld from Employees, who can't reach Ledger/Reports at all. */
  adminOnly?: boolean
  render: (data: DashboardData) => React.ReactNode
}

const WIDGETS: WidgetDef[] = [
  { id: 'stats', title: 'At a glance', span: 6, render: (d) => <StatsWidget data={d} /> },
  { id: 'shortcuts', title: 'Modules', span: 2, render: (d) => <ShortcutsWidget data={d} /> },
  { id: 'my-tasks', title: 'My tasks', span: 2, href: '/dashboard/tasks', render: (d) => <MyTasksWidget data={d} /> },
  { id: 'deadlines', title: 'Due this week', span: 2, href: '/dashboard/projects', render: (d) => <DeadlinesWidget data={d} /> },
  { id: 'projects', title: 'Active projects', span: 4, href: '/dashboard/projects', render: (d) => <ProjectsWidget data={d} /> },
  { id: 'ledger', title: 'Payments', span: 2, href: '/dashboard/ledger', adminOnly: true, render: (d) => <LedgerWidget data={d} /> },
  { id: 'leads', title: 'Recent leads', span: 3, href: '/dashboard/leads', render: (d) => <LeadsWidget data={d} /> },
  { id: 'activity', title: 'Recent activity', span: 3, href: '/dashboard/activity', adminOnly: true, render: (d) => <ActivityWidget data={d} /> },
]

const SPAN_CLASS: Record<WidgetDef['span'], string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
}

const storageKey = (userId: string) => `wsw:dashboard-order:${userId}`

/**
 * Widget order is a per-person preference, so it lives in that browser's
 * localStorage rather than the database — the schema has no place for UI
 * layout, and adding one wasn't part of the brief. Order is reconciled with
 * the widget list on every load so newly shipped widgets still appear and
 * removed ones drop out.
 */
function reconcile(stored: string[] | null, available: WidgetId[]): WidgetId[] {
  if (!stored) return available
  const known = stored.filter((id): id is WidgetId => available.includes(id as WidgetId))
  const missing = available.filter((id) => !known.includes(id))
  return [...known, ...missing]
}

export function DashboardGrid({ data, userId }: { data: DashboardData; userId: string }) {
  const available = useMemo(
    () =>
      WIDGETS.filter((w) => !(w.adminOnly && data.role === 'EMPLOYEE')).map((w) => w.id),
    [data.role]
  )

  const [order, setOrder] = useState<WidgetId[]>(available)
  const [loaded, setLoaded] = useState(false)
  const [dragId, setDragId] = useState<WidgetId | null>(null)
  const [overId, setOverId] = useState<WidgetId | null>(null)
  const liveRegion = useRef<HTMLParagraphElement>(null)

  // Read saved order after mount so server and client render the same markup.
  useEffect(() => {
    let stored: string[] | null = null
    try {
      const raw = window.localStorage.getItem(storageKey(userId))
      if (raw) stored = JSON.parse(raw) as string[]
    } catch {
      stored = null
    }
    setOrder(reconcile(stored, available))
    setLoaded(true)
  }, [available, userId])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(order))
    } catch {
      // A private window or blocked storage just means the order isn't remembered.
    }
  }, [order, loaded, userId])

  function move(from: WidgetId, to: WidgetId) {
    if (from === to) return
    setOrder((current) => {
      const next = [...current]
      const fromIndex = next.indexOf(from)
      const toIndex = next.indexOf(to)
      if (fromIndex === -1 || toIndex === -1) return current
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, from)
      return next
    })
  }

  /** Keyboard equivalent of dragging, so the layout isn't mouse-only. */
  function nudge(id: WidgetId, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(id)
      const target = index + direction
      if (index === -1 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      if (liveRegion.current) {
        liveRegion.current.textContent = `Moved to position ${target + 1} of ${next.length}.`
      }
      return next
    })
  }

  function reset() {
    setOrder(available)
    try {
      window.localStorage.removeItem(storageKey(userId))
    } catch {
      // ignore
    }
  }

  const byId = new Map(WIDGETS.map((w) => [w.id, w]))
  const isCustomised = order.join() !== available.join()

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#26251F]">
            Welcome back, {data.userName}
          </h1>
          <p className="mt-0.5 text-sm text-[#8A8778]">
            Drag a card by its handle to reorder — your layout is remembered on this device.
          </p>
        </div>

        {isCustomised && (
          <button
            type="button"
            onClick={reset}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E8E5DC] bg-white px-3 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset layout
          </button>
        )}
      </div>

      <p ref={liveRegion} aria-live="polite" className="sr-only" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        {order.map((id) => {
          const widget = byId.get(id)
          if (!widget) return null

          const isDragging = dragId === id
          const isOver = overId === id && dragId !== id

          return (
            <section
              key={id}
              onDragOver={(e) => {
                if (!dragId) return
                e.preventDefault()
                setOverId(id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) move(dragId, id)
                setDragId(null)
                setOverId(null)
              }}
              className={`rounded-xl border bg-white transition ${SPAN_CLASS[widget.span]} ${
                isDragging
                  ? 'border-[#C1502E] opacity-40'
                  : isOver
                    ? 'border-[#C1502E] shadow-[0_0_0_3px_rgba(193,80,46,0.12)]'
                    : 'border-[#E8E5DC]'
              }`}
            >
              <header
                draggable
                onDragStart={(e) => {
                  setDragId(id)
                  e.dataTransfer.effectAllowed = 'move'
                  // Firefox needs data set for a drag to start at all.
                  e.dataTransfer.setData('text/plain', id)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setOverId(null)
                }}
                className="flex cursor-grab items-center gap-2 border-b border-[#F1EFE8] px-4 py-3 active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-[#C9C6B8]" />
                <h2 className="flex-1 text-sm font-medium text-[#26251F]">{widget.title}</h2>

                <span className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Move ${widget.title} earlier`}
                    onClick={() => nudge(id, -1)}
                    className="rounded px-1 py-0.5 text-xs text-[#C9C6B8] transition hover:bg-[#FAF9F6] hover:text-[#6B6858]"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${widget.title} later`}
                    onClick={() => nudge(id, 1)}
                    className="rounded px-1 py-0.5 text-xs text-[#C9C6B8] transition hover:bg-[#FAF9F6] hover:text-[#6B6858]"
                  >
                    ↓
                  </button>
                </span>

                {widget.href && (
                  <Link
                    href={widget.href}
                    className="ml-1 flex items-center gap-1 text-xs text-[#8A8778] transition hover:text-[#C1502E]"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </header>

              <div className="p-4">{widget.render(data)}</div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
