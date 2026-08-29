import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-[#FAF9F6]">
      <Sidebar role={session.user.role} userName={session.user.name ?? 'User'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={session.user.name ?? 'User'} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
