import { PrismaClient, type Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const SEED_USERS: { name: string; email: string; role: Role }[] = [
  { name: 'Super Admin', email: 'superadmin@whitespace.test', role: 'SUPER_ADMIN' },
  { name: 'Admin', email: 'admin@whitespace.test', role: 'ADMIN' },
  { name: 'Employee', email: 'employee@whitespace.test', role: 'EMPLOYEE' },
]

async function main() {
  const password = process.env.SEED_PASSWORD ?? 'password123'
  const passwordHash = await bcrypt.hash(password, 10)

  for (const user of SEED_USERS) {
    await db.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, status: 'active' },
      create: { ...user, passwordHash, status: 'active' },
    })
    console.log(`seeded ${user.role.padEnd(11)} ${user.email}`)
  }

  console.log(`\nAll seed users share the password: ${password}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
