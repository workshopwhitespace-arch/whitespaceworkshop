import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getQuotationDetail } from '@/lib/actions/quotations'
import { QuotationDetailView } from '@/components/modules/quotations/quotation-detail'

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quotation = await getQuotationDetail(id)

  if (!quotation) notFound()

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/quotations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quotations
      </Link>

      <QuotationDetailView quotation={quotation} />
    </div>
  )
}
