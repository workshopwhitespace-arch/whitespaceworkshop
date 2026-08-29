import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'
import type { Role } from '@prisma/client'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || user.status !== 'active') return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
})

/**
 * Call this first in every server action. Throws if the session is missing
 * or the caller's role isn't in the allowed list.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED')
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}
