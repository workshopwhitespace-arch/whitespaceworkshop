import { listClients } from '@/lib/validations/clients'
import { auth } from '@/lib/auth'
import { ClientList } from '@/components/modules/clients/client-list'

export default async function ClientsPage() {
  const session = await auth()
  const clients = await listClients()

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Clients</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Every quotation, project and payment is filed under a client.
        </p>
      </div>

      <ClientList
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName,
          email: c.email,
          phone: c.phone,
          address: c.address,
          notes: c.notes,
          projectCount: c._count.projects,
          pendingAmount: c.pendingAmount,
          createdAt: c.createdAt,
        }))}
        canSeeMoney={session?.user?.role !== 'EMPLOYEE'}
      />
    </div>
  )
}
