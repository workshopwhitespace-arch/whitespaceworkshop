'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Search, Building2, Mail, Phone } from 'lucide-react'
import { inr, formatDate } from '@/lib/format'
import { ClientForm, type ClientFormValues } from './client-form'

type Row = ClientFormValues & {
  id: string
  projectCount: number
  pendingAmount: number | null
  createdAt: Date | string
}

export function ClientList({
  clients,
  canSeeMoney,
}: {
  clients: Row[]
  canSeeMoney: boolean
}) {
  const [query, setQuery] = useState('')
  const [formFor, setFormFor] = useState<ClientFormValues | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const visible = clients.filter((c) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.companyName ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    )
  })

  function openNew() {
    setFormFor(null)
    setFormOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8778]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, email…"
            className="w-full rounded-lg border border-[#E8E5DC] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20"
          />
        </div>

        <button
          type="button"
          onClick={openNew}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
        >
          <Plus className="h-4 w-4" />
          New client
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <Building2 className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">
              {clients.length === 0 ? 'No clients yet' : 'Nothing matches that search'}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              {clients.length === 0
                ? 'Add a client before writing their first quotation.'
                : 'Try a different name, company or email.'}
            </p>
          </div>
          {clients.length === 0 && (
            <button
              type="button"
              onClick={openNew}
              className="mt-1 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
            >
              New client
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Projects</th>
                <th className="px-4 py-3 font-medium">Added</th>
                {canSeeMoney && <th className="px-4 py-3 text-right font-medium">Pending</th>}
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {visible.map((c) => (
                <tr key={c.id} className="group transition hover:bg-[#FAF9F6]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clients/${c.id}`}
                      className="font-medium text-[#26251F] transition group-hover:text-[#C1502E]"
                    >
                      {c.name}
                    </Link>
                    {c.companyName && (
                      <p className="text-xs text-[#8A8778]">{c.companyName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.email && (
                      <p className="flex items-center gap-1.5 text-xs text-[#6B6858]">
                        <Mail className="h-3 w-3 shrink-0 text-[#C9C6B8]" />
                        {c.email}
                      </p>
                    )}
                    {c.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-[#6B6858]">
                        <Phone className="h-3 w-3 shrink-0 text-[#C9C6B8]" />
                        {c.phone}
                      </p>
                    )}
                    {!c.email && !c.phone && <span className="text-xs text-[#C9C6B8]">—</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#6B6858]">{c.projectCount}</td>
                  <td className="px-4 py-3 text-[#8A8778]">{formatDate(c.createdAt)}</td>
                  {canSeeMoney && (
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        (c.pendingAmount ?? 0) > 0 ? 'text-[#C1443B]' : 'text-[#8A8778]'
                      }`}
                    >
                      {c.pendingAmount === null ? '—' : inr(c.pendingAmount)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setFormFor(c)
                        setFormOpen(true)
                      }}
                      className="text-xs font-medium text-[#8A8778] transition hover:text-[#C1502E]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ClientForm
          initial={formFor ?? undefined}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
