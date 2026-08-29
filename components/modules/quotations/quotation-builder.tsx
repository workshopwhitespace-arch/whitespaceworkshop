'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Building2 } from 'lucide-react'
import { createQuotation } from '@/lib/actions/quotations'
import { inrExact } from '@/lib/format'

type ClientOption = { id: string; name: string; companyName: string | null }

type Draft = { key: string; description: string; quantity: string; rate: string }

const emptyRow = (): Draft => ({
  key: Math.random().toString(36).slice(2),
  description: '',
  quantity: '1',
  rate: '',
})

/** Blank and malformed inputs are treated as zero while typing. */
function num(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function QuotationBuilder({
  clients,
  defaultClientId,
}: {
  clients: ClientOption[]
  defaultClientId?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [clientId, setClientId] = useState(defaultClientId ?? '')
  const [reference, setReference] = useState('')
  const [gstRate, setGstRate] = useState('18')
  const [terms, setTerms] = useState('')
  const [rows, setRows] = useState<Draft[]>([emptyRow()])
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const subtotal = rows.reduce((sum, r) => sum + num(r.quantity) * num(r.rate), 0)
    const gstAmount = Math.round(subtotal * (num(gstRate) / 100) * 100) / 100
    return { subtotal, gstAmount, total: subtotal + gstAmount }
  }, [rows, gstRate])

  function updateRow(key: string, patch: Partial<Draft>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((r) => r.key !== key)))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) {
      setError('Choose a client first.')
      return
    }

    const items = rows
      .filter((r) => r.description.trim() !== '')
      .map((r) => ({
        description: r.description.trim(),
        quantity: Math.trunc(num(r.quantity)),
        rate: num(r.rate),
      }))

    if (items.length === 0) {
      setError('Add at least one line item with a description.')
      return
    }
    if (items.some((i) => i.quantity < 1)) {
      setError('Every line item needs a quantity of at least 1.')
      return
    }

    startTransition(async () => {
      const result = await createQuotation({
        clientId,
        reference: reference.trim() || undefined,
        terms: terms.trim() || undefined,
        gstRate: num(gstRate),
        items,
      })

      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/dashboard/quotations/${result.quotation.id}`)
      router.refresh()
    })
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#E8E5DC] bg-white py-16 text-center">
        <Building2 className="h-6 w-6 text-[#C9C6B8]" />
        <div>
          <p className="text-sm font-medium text-[#26251F]">No clients yet</p>
          <p className="mt-0.5 text-xs text-[#8A8778]">
            A quotation is always addressed to a client, so add one first.
          </p>
        </div>
        <Link
          href="/dashboard/clients"
          className="mt-1 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
        >
          Go to Clients
        </Link>
      </div>
    )
  }

  const field =
    'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
  const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label htmlFor="client" className={label}>Client</label>
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={field}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName ? `${c.name} — ${c.companyName}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reference" className={label}>
              Reference <span className="font-normal text-[#8A8778]">(optional)</span>
            </label>
            <input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Who referred them?"
              className={field}
            />
            <p className="mt-1 text-xs text-[#8A8778]">Leave blank for a direct client.</p>
          </div>

          <div>
            <label htmlFor="gst" className={label}>GST rate (%)</label>
            <input
              id="gst"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              className={field}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E5DC] bg-white">
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 className="text-sm font-medium text-[#26251F]">Line items</h2>
          <button
            type="button"
            onClick={() => setRows((c) => [...c, emptyRow()])}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-2.5 py-1.5 text-xs font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-5 py-2.5 font-medium">Description</th>
                <th className="w-24 px-3 py-2.5 font-medium">Qty</th>
                <th className="w-36 px-3 py-2.5 font-medium">Rate</th>
                <th className="w-32 px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-5 py-2">
                    <input
                      value={r.description}
                      onChange={(e) => updateRow(r.key, { description: e.target.value })}
                      placeholder="e.g. Living room 3D visualisation"
                      className={field}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                      className={field}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.rate}
                      onChange={(e) => updateRow(r.key, { rate: e.target.value })}
                      placeholder="0.00"
                      className={field}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#26251F]">
                    {inrExact(num(r.quantity) * num(r.rate))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      disabled={rows.length === 1}
                      aria-label="Remove line item"
                      className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FBEAE6] hover:text-[#C1443B] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#C9C6B8]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-[#F1EFE8] px-5 py-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#8A8778]">Subtotal</dt>
              <dd className="tabular-nums text-[#26251F]">{inrExact(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#8A8778]">GST ({num(gstRate)}%)</dt>
              <dd className="tabular-nums text-[#26251F]">{inrExact(totals.gstAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-[#F1EFE8] pt-1.5">
              <dt className="font-medium text-[#26251F]">Total</dt>
              <dd className="text-base font-semibold tabular-nums text-[#26251F]">
                {inrExact(totals.total)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <label htmlFor="terms" className={label}>Terms &amp; notes</label>
        <textarea
          id="terms"
          rows={4}
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Payment schedule, revision limits, delivery timeline…"
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dashboard/quotations"
          className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create quotation'}
        </button>
      </div>
    </form>
  )
}
