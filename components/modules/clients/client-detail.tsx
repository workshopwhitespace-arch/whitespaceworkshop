'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail, Phone, MapPin, Pencil, FilePlus2, FolderKanban, Wallet } from 'lucide-react'
import type { ProjectStatus, ProjectType, LedgerEntryType } from '@prisma/client'
import { inr, inrExact, formatDate } from '@/lib/format'
import { ClientForm } from './client-form'

type Detail = {
  id: string
  name: string
  companyName: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  createdAt: Date | string
  totalBilled: number | null
  totalReceived: number | null
  pendingAmount: number | null
  projects: {
    id: string
    title: string
    type: ProjectType
    status: ProjectStatus
    deadline: Date | string | null
    projectValue: number | null
  }[]
  ledgerEntries: {
    id: string
    entryType: LedgerEntryType
    amount: number
    description: string
    entryDate: Date | string
    recordedByName: string
  }[]
}

export function ClientDetailView({ client }: { client: Detail }) {
  const [editing, setEditing] = useState(false)
  const canSeeMoney = client.pendingAmount !== null

  return (
    <div className="space-y-4">
      {/* Profile */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C1502E] text-base font-medium text-white">
              {client.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-semibold text-[#26251F]">{client.name}</h1>
              {client.companyName && (
                <p className="text-sm text-[#8A8778]">{client.companyName}</p>
              )}
              <p className="mt-0.5 text-xs text-[#8A8778]">
                Client since {formatDate(client.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <Link
              href={`/dashboard/quotations/new?clientId=${client.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              New quotation
            </Link>
          </div>
        </div>

        {(client.email || client.phone || client.address) && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#F1EFE8] pt-4 text-sm">
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-[#6B6858] transition hover:text-[#C1502E]">
                <Mail className="h-3.5 w-3.5 text-[#C9C6B8]" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-[#6B6858] transition hover:text-[#C1502E]">
                <Phone className="h-3.5 w-3.5 text-[#C9C6B8]" />
                {client.phone}
              </a>
            )}
            {client.address && (
              <span className="flex items-center gap-2 text-[#6B6858]">
                <MapPin className="h-3.5 w-3.5 text-[#C9C6B8]" />
                {client.address}
              </span>
            )}
          </div>
        )}

        {client.notes && (
          <p className="mt-4 whitespace-pre-wrap border-t border-[#F1EFE8] pt-4 text-sm text-[#6B6858]">
            {client.notes}
          </p>
        )}
      </div>

      {/* Money — withheld from Employees by getClientDetail */}
      {canSeeMoney && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Billed', value: client.totalBilled ?? 0, tone: 'text-[#26251F]' },
            { label: 'Received', value: client.totalReceived ?? 0, tone: 'text-[#3F7A50]' },
            { label: 'Pending', value: client.pendingAmount ?? 0, tone: (client.pendingAmount ?? 0) > 0 ? 'text-[#C1443B]' : 'text-[#26251F]' },
          ].map((t) => (
            <div key={t.label} className="rounded-xl border border-[#E8E5DC] bg-white p-4">
              <p className="text-xs text-[#8A8778]">{t.label}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${t.tone}`}>{inr(t.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white">
        <div className="border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 className="text-sm font-medium text-[#26251F]">
            Projects <span className="text-[#8A8778]">({client.projects.length})</span>
          </h2>
        </div>

        {client.projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FolderKanban className="h-5 w-5 text-[#C9C6B8]" />
            <p className="text-xs text-[#8A8778]">
              No projects yet — accepting a quotation creates one.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F1EFE8]">
            {client.projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#FAF9F6]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#26251F]">{p.title}</p>
                    <p className="text-xs text-[#8A8778]">
                      {p.type.toLowerCase()} · {p.status.toLowerCase()}
                      {p.deadline && ` · due ${formatDate(p.deadline)}`}
                    </p>
                  </div>
                  {canSeeMoney && p.projectValue !== null && (
                    <span className="shrink-0 text-sm tabular-nums text-[#6B6858]">
                      {inr(p.projectValue)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ledger */}
      {canSeeMoney && (
        <div className="rounded-xl border border-[#E8E5DC] bg-white">
          <div className="border-b border-[#F1EFE8] px-5 py-3.5">
            <h2 className="text-sm font-medium text-[#26251F]">Payment history</h2>
          </div>

          {client.ledgerEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Wallet className="h-5 w-5 text-[#C9C6B8]" />
              <p className="text-xs text-[#8A8778]">No ledger entries for this client yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1EFE8]">
              {client.ledgerEntries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      e.entryType === 'CREDIT' ? 'bg-[#3F7A50]' : 'bg-[#C1502E]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#26251F]">{e.description}</p>
                    <p className="text-xs text-[#8A8778]">
                      {formatDate(e.entryDate)} · {e.recordedByName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      e.entryType === 'CREDIT' ? 'text-[#3F7A50]' : 'text-[#26251F]'
                    }`}
                  >
                    {e.entryType === 'CREDIT' ? '+' : '−'}
                    {inrExact(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <ClientForm
          initial={{
            id: client.id,
            name: client.name,
            companyName: client.companyName,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
