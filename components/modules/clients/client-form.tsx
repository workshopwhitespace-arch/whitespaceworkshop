'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient, updateClient } from '@/lib/validations/clients'

export type ClientFormValues = {
  id?: string
  name: string
  companyName: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
}

const field =
  'w-full rounded-lg border border-[#E8E5DC] bg-white px-3 py-2 text-sm text-[#26251F] outline-none transition focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20'
const label = 'mb-1.5 block text-sm font-medium text-[#26251F]'

/** Blank optional fields are sent as undefined rather than empty strings. */
function trimmed(value: string) {
  const v = value.trim()
  return v === '' ? undefined : v
}

export function ClientForm({
  initial,
  onClose,
}: {
  initial?: ClientFormValues
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const firstField = useRef<HTMLInputElement>(null)

  const isEdit = Boolean(initial?.id)

  const [name, setName] = useState(initial?.name ?? '')
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  useEffect(() => {
    firstField.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        companyName: trimmed(companyName),
        email: trimmed(email),
        phone: trimmed(phone),
        address: trimmed(address),
        notes: trimmed(notes),
      }

      const result = initial?.id
        ? await updateClient({ id: initial.id, ...payload })
        : await createClient(payload)

      if (!result.success) {
        setError(result.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1F1E1B]/40 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-form-title"
        className="w-full max-w-lg rounded-xl border border-[#E8E5DC] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#F1EFE8] px-5 py-3.5">
          <h2 id="client-form-title" className="text-sm font-medium text-[#26251F]">
            {isEdit ? 'Edit client' : 'New client'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-[#8A8778] transition hover:bg-[#FAF9F6] hover:text-[#26251F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cname" className={label}>
                Name <span className="text-[#C1502E]">*</span>
              </label>
              <input
                id="cname"
                ref={firstField}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contact person"
                className={field}
              />
            </div>
            <div>
              <label htmlFor="ccompany" className={label}>Company</label>
              <input
                id="ccompany"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Optional"
                className={field}
              />
            </div>
            <div>
              <label htmlFor="cemail" className={label}>Email</label>
              <input
                id="cemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="cphone" className={label}>Phone</label>
              <input
                id="cphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="caddress" className={label}>Address</label>
            <input
              id="caddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="cnotes" className={label}>Notes</label>
            <textarea
              id="cnotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral source, preferences, anything worth remembering…"
              className={field}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[#FBEAE6] px-3.5 py-2.5 text-sm text-[#C1443B]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E8E5DC] px-3.5 py-2 text-sm font-medium text-[#6B6858] transition hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#C1502E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F] disabled:opacity-60"
            >
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
