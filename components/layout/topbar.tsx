'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Search, Bell, Plus, ChevronDown } from 'lucide-react'

export function Topbar({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E8E5DC] bg-white px-6">
      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8778]" />
        <input
          type="search"
          placeholder="Search…"
          className="w-full rounded-lg border border-[#E8E5DC] bg-[#FAF9F6] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C1502E] focus:ring-2 focus:ring-[#C1502E]/20"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-2 text-[#26251F] hover:bg-[#FAF9F6]"
        >
          <Bell className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-[#C1502E] px-3 py-2 text-sm font-medium text-white hover:bg-[#A8431F]"
        >
          <Plus className="h-4 w-4" />
          New
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#26251F] hover:bg-[#FAF9F6]"
          >
            {userName}
            <ChevronDown className="h-4 w-4 text-[#8A8778]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-[#E8E5DC] bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full px-3 py-2 text-left text-sm text-[#26251F] hover:bg-[#FAF9F6]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
