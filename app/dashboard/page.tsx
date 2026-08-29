import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDashboardData } from '@/lib/actions/dashboard'
import { DashboardGrid } from '@/components/modules/dashboard/dashboard-grid'

export default async function DashboardHomePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const data = await getDashboardData()

  return <DashboardGrid data={data} userId={session.user.id} />
}
