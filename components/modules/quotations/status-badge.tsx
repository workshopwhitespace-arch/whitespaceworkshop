import type { QuotationStatus } from '@prisma/client'

const STYLES: Record<QuotationStatus, string> = {
  DRAFT: 'bg-[#F1EFE8] text-[#6B6858]',
  SENT: 'bg-[#EAF0F7] text-[#3B6CA8]',
  ACCEPTED: 'bg-[#E8F1EA] text-[#3F7A50]',
  REJECTED: 'bg-[#FBEAE6] text-[#C1443B]',
}

const LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
}

export function StatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
