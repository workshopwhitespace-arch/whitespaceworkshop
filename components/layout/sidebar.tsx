'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@prisma/client'
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  FolderKanban,
  CheckSquare,
  Wallet,
  BarChart3,
  UserCog,
  History,
  Settings,
} from 'lucide-react'

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/leads', label: 'Leads', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/quotations', label: 'Quotations', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/clients', label: 'Clients', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
  { href: '/dashboard/ledger', label: 'Ledger', icon: Wallet, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/team', label: 'Team & Roles', icon: UserCog, roles: ['SUPER_ADMIN'] },
  { href: '/dashboard/activity', label: 'Activity Log', icon: History, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN'] },
] as const

export function Sidebar({ role, userName }: { role: Role; userName: string }) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(role)
  )

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-[#1F1E1B] text-[#D8D5C9]">
      <div className="px-5 py-6">
        <span className="text-base font-semibold text-white">White Space Workshop</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-[#C1502E] bg-white/5 text-white'
                  : 'border-transparent text-[#B5B2A6] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C1502E] text-xs font-medium text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-[#8A8778]">{ROLE_LABELS[role]}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
