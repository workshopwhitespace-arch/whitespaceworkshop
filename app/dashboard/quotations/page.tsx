import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listQuotations } from '@/lib/actions/quotations'
import { QuotationList } from '@/components/modules/quotations/quotation-list'

type Search = { status?: string }

const VALID = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const
type Status = (typeof VALID)[number]

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { status } = await searchParams
  const active = VALID.includes(status as Status) ? (status as Status) : undefined

  const rows = await listQuotations(active ? { status: active } : undefined)

  // Decimals can't cross into a client component, so flatten them here.
  const quotations = rows.map((q) => ({
    id: q.id,
    quotationNumber: q.quotationNumber,
    status: q.status,
    clientName: q.client.name,
    reference: q.reference,
    itemCount: q.items.length,
    totalAmount: Number(q.totalAmount),
    createdAt: q.createdAt,
  }))

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#26251F]">Quotations</h1>
          <p className="mt-0.5 text-sm text-[#8A8778]">
            Build, send and convert quotations into projects.
          </p>
        </div>

        <Link
          href="/dashboard/quotations/new"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
        >
          <Plus className="h-4 w-4" />
          New quotation
        </Link>
      </div>

      <QuotationList quotations={quotations} activeStatus={active ?? null} />
    </div>
  )
}
