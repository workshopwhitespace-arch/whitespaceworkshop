import { z } from 'zod'

const ledgerEntryTypeEnum = z.enum(['DEBIT', 'CREDIT'])

export const createLedgerEntrySchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional(),
  entryType: ledgerEntryTypeEnum,
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  entryDate: z.coerce.date().optional(),
})

export const listLedgerEntriesFilterSchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  entryType: ledgerEntryTypeEnum.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
})

export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>
export type ListLedgerEntriesFilter = z.infer<typeof listLedgerEntriesFilterSchema>