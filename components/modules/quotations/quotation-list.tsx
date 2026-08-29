'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FileText, Search } from 'lucide-react'
import type { QuotationStatus } from '@prisma/client'
import { inr, formatDate } from '@/lib/format'
import { StatusBadge } from './status-badge'

type Row = {
  id: string
  quotationNumber: string
  status: QuotationStatus
  clientName: string
  reference: string | null
  itemCount: number
  totalAmount: number
  createdAt: Date | string
}

const TABS = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
] as const

export function QuotationList({
  quotations,
  activeStatus,
}: {
  quotations: Row[]
  activeStatus: QuotationStatus | null
}) {
  const [query, setQuery] = useState('')

  const visible = quotations.filter((q) => {
    if (!query.trim()) return true
    const q2 = query.toLowerCase()
    return (
      q.quotationNumber.toLowerCase().includes(q2) ||
      q.clientName.toLowerCase().includes(q2) ||
      (q.reference ?? '').toLowerCase().includes(q2)
    )
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-lg border border-[#E8E5DC] bg-white p-1">
          {TABS.map((tab) => {
            const isActive = activeStatus === tab.value
            return (
              <Link
                key={tab.label}
                href={tab.value ? `/dashboard/quotations?status=${tab.value}` : '/dashboard/quotations'}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-[#26251F] font-medium text-white'
                    : 'text-[#6B6858] hover:bg-[#FAF9F6]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8778]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, client or reference…"
            className="w-full rounded-lg border border-[#E8E5DC] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
          <FileText className="h-6 w-6 text-[#C9C6B8]" />
          <div>
            <p className="text-sm font-medium text-[#26251F]">
              {quotations.length === 0 ? 'No quotations yet' : 'Nothing matches that search'}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              {quotations.length === 0
                ? 'Create one to send a client a priced breakdown.'
                : 'Try a different number or client name.'}
            </p>
          </div>
          {quotations.length === 0 && (
            <Link
              href="/dashboard/quotations/new"
              className="mt-1 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
            >
              New quotation
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DC] bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {visible.map((q) => (
                <tr key={q.id} className="group transition hover:bg-[#FAF9F6]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/quotations/${q.id}`}
                      className="font-medium text-[#26251F] transition group-hover:text-[#C1502E]"
                    >
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#26251F]">{q.clientName}</td>
                  <td className="px-4 py-3">
                    {q.reference ? (
                      <span className="text-xs text-[#C1502E]">via {q.reference}</span>
                    ) : (
                      <span className="text-xs text-[#8A8778]">Direct</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8A8778]">{q.itemCount}</td>
                  <td className="px-4 py-3 text-[#8A8778]">{formatDate(q.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[#26251F]">
                    {inr(q.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
