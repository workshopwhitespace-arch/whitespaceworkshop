import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listClients } from '@/lib/validations/clients'
import { QuotationBuilder } from '@/components/modules/quotations/quotation-builder'

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const { clientId } = await searchParams
  const clients = await listClients()
  // Only honour the hint if that client is actually visible to this user.
  const preselected = clients.some((c) => c.id === clientId) ? clientId : undefined

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/quotations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quotations
      </Link>

      <h1 className="text-xl font-semibold text-[#26251F]">New quotation</h1>
      <p className="mt-0.5 mb-5 text-sm text-[#8A8778]">
        Add line items — the subtotal, GST and total are calculated as you type.
      </p>

      <QuotationBuilder
        defaultClientId={preselected}
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName,
        }))}
      />
    </div>
  )
}
