'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Send, Check, X, FolderKanban, UserPlus, UserRound } from 'lucide-react'
import type { ProjectType } from '@prisma/client'
import type { QuotationDetail } from '@/lib/actions/quotations'
import {
  addQuotationItem,
  removeQuotationItem,
  sendQuotation,
  rejectQuotation,
  acceptQuotation,
} from '@/lib/actions/quotations'
import { inrExact, formatDate } from '@/lib/format'
import { StatusBadge } from './status-badge'

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'BRANDING', label: 'Branding' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'WEB', label: 'Web' },
]

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'

export function QuotationDetailView({ quotation }: { quotation: QuotationDetail }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAccept, setShowAccept] = useState(false)

  // New line item
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('1')
  const [rate, setRate] = useState('')

  // Accept → project
  const [projectTitle, setProjectTitle] = useState(quotation.client.name)
  const [projectType, setProjectType] = useState<ProjectType>('INTERIOR')
  const [deadline, setDeadline] = useState('')
  const [seedTasks, setSeedTasks] = useState(false)

  /** Items stay editable only while the quotation is still a draft. */
  const editable = quotation.status === 'DRAFT'
  const ctx = { gstRate: quotation.gstRate }

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await fn()
        if (!result.success) return setError(result.error ?? 'Something went wrong.')
        router.refresh()
      } catch {
        // A record deleted elsewhere, or a dropped connection — surface it
        // inline rather than letting the error boundary take over the page.
        setError('That action could not be completed. Refresh the page and try again.')
      }
    })
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim()) {
      setError('Give the line item a description.')
      return
    }
    run(async () => {
      const result = await addQuotationItem(
        {
          quotationId: quotation.id,
          description: desc.trim(),
          quantity: Math.trunc(Number(qty) || 0),
          rate: Number(rate) || 0,
        },
        ctx
      )
      if (result.success) {
        setDesc('')
        setQty('1')
        setRate('')
      }
      return result
    })
  }

  function accept(e: React.FormEvent) {
    e.preventDefault()
    if (projectTitle.trim().length < 2) {
      setError('The project needs a title.')
      return
    }
    run(() =>
      acceptQuotation({
        quotationId: quotation.id,
        projectTitle: projectTitle.trim(),
        projectType,
        deadline: deadline ? new Date(deadline) : undefined,
        seedTasks,
      })
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[#26251F]">
                {quotation.quotationNumber}
              </h1>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="mt-1 text-sm text-[#26251F]">
              {quotation.client.name}
              {quotation.client.companyName && (
                <span className="text-[#8A8778]"> · {quotation.client.companyName}</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8778]">
              Created {formatDate(quotation.createdAt)} by {quotation.createdByName}
            </p>

            {quotation.reference ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FAEDE8] px-2.5 py-1 text-xs font-medium text-[#C1502E]">
                <UserPlus className="h-3.5 w-3.5" />
                Referred by {quotation.reference}
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1EFE8] px-2.5 py-1 text-xs font-medium text-[#6B6858]">
                <UserRound className="h-3.5 w-3.5" />
                Direct client
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {quotation.status === 'DRAFT' && (
              <button
                type="button"
                disabled={pending || quotation.items.length === 0}
                onClick={() => run(() => sendQuotation(quotation.id))}
                className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                Mark as sent
              </button>
            )}

            {quotation.status === 'SENT' && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => rejectQuotation(quotation.id))}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1443B]/40 hover:text-[#C1443B] disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Rejected
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShowAccept((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#3F7A50] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#356544] disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </button>
              </>
            )}
          </div>
        </div>

        {quotation.project && (
          <Link
            href={`/dashboard/projects/${quotation.project.id}`}
            className="mt-4 flex items-center gap-2.5 rounded-lg bg-[#E8F1EA] px-3.5 py-2.5 text-sm text-[#3F7A50] transition hover:bg-[#DDEBE0]"
          >
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span>
              Converted into project <strong>{quotation.project.title}</strong>
            </span>
          </Link>
        )}
      </div>

      {/* Accept → project form */}
      {showAccept && quotation.status === 'SENT' && (
        <form onSubmit={accept} className="rounded-xl border border-[#3F7A50]/30 bg-white p-5">
          <h2 className="text-sm font-medium text-[#26251F]">Convert to project</h2>
          <p className="mt-0.5 mb-4 text-xs text-[#8A8778]">
            Accepting creates the project this quotation funds and sets its value to{' '}
            {inrExact(quotation.totalAmount)}.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label htmlFor="ptitle" className="mb-1.5 block text-xs font-medium text-[#26251F]">
                Project title
              </label>
              <input
                id="ptitle"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="ptype" className="mb-1.5 block text-xs font-medium text-[#26251F]">
                Type
              </label>
              <select
                id="ptype"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className={field}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pdeadline" className="mb-1.5 block text-xs font-medium text-[#26251F]">
                Deadline <span className="text-[#8A8778]">(optional)</span>
              </label>
              <input
                id="pdeadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={field}
              />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={seedTasks}
              onChange={(e) => setSeedTasks(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[#C1502E]"
            />
            <span className="text-xs text-[#6B6858]">
              Also add the standard task checklist for this project type
            </span>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAccept(false)}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#3F7A50] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#356544] disabled:opacity-60"
            >
              {pending ? 'Creating project…' : 'Accept & create project'}
            </button>
          </div>
        </form>
      )}

      {/* Items */}
      <div className="rounded-xl border border-[#E8E5DC] bg-white">
        <div className="border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 className="text-sm font-medium text-[#26251F]">Line items</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#F1EFE8] text-left text-xs text-[#8A8778]">
                <th className="px-5 py-2.5 font-medium">Description</th>
                <th className="w-20 px-3 py-2.5 font-medium">Qty</th>
                <th className="w-32 px-3 py-2.5 text-right font-medium">Rate</th>
                <th className="w-32 px-3 py-2.5 text-right font-medium">Amount</th>
                {editable && <th className="w-12 px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFE8]">
              {quotation.items.length === 0 ? (
                <tr>
                  <td colSpan={editable ? 5 : 4} className="px-5 py-8 text-center text-xs text-[#8A8778]">
                    No line items yet.
                  </td>
                </tr>
              ) : (
                quotation.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-[#26251F]">{item.description}</td>
                    <td className="px-3 py-3 tabular-nums text-[#8A8778]">{item.quantity}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#8A8778]">
                      {inrExact(item.rate)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#26251F]">
                      {inrExact(item.amount)}
                    </td>
                    {editable && (
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={pending}
                          aria-label={`Remove ${item.description}`}
                          onClick={() => run(() => removeQuotationItem(item.id, ctx))}
                          className="rounded p-1.5 text-[#C9C6B8] transition hover:bg-[#FBEAE6] hover:text-[#C1443B] disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <form onSubmit={addItem} className="flex flex-wrap items-end gap-2 border-t border-[#F1EFE8] px-5 py-3.5">
            <div className="min-w-[200px] flex-1">
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Add a line item…"
                className={field}
              />
            </div>
            <input
              type="number" min="1" step="1" value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-label="Quantity"
              className={`${field} w-20`}
            />
            <input
              type="number" min="0" step="0.01" value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Rate" aria-label="Rate"
              className={`${field} w-32`}
            />
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E5DC] px-3 py-2 text-sm font-medium text-[#6B6858] transition hover:border-[#C1502E]/40 hover:text-[#C1502E] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>
        )}

        <div className="flex justify-end border-t border-[#F1EFE8] px-5 py-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#8A8778]">Subtotal</dt>
              <dd className="tabular-nums text-[#26251F]">{inrExact(quotation.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#8A8778]">GST ({quotation.gstRate}%)</dt>
              <dd className="tabular-nums text-[#26251F]">{inrExact(quotation.gstAmount)}</dd>
            </div>
            {quotation.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-[#8A8778]">Discount</dt>
                <dd className="tabular-nums text-[#26251F]">−{inrExact(quotation.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[#F1EFE8] pt-1.5">
              <dt className="font-medium text-[#26251F]">Total</dt>
              <dd className="text-base font-semibold tabular-nums text-[#26251F]">
                {inrExact(quotation.totalAmount)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {quotation.terms && (
        <div className="rounded-xl border border-[#E8E5DC] bg-white p-5">
          <h2 className="mb-2 text-sm font-medium text-[#26251F]">Terms &amp; notes</h2>
          <p className="whitespace-pre-wrap text-sm text-[#6B6858]">{quotation.terms}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
          {error}
        </p>
      )}
    </div>
  )
}
