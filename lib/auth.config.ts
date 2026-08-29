import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@prisma/client'

/**
 * Edge-safe half of the auth setup. Middleware runs on the Edge runtime,
 * where Prisma can't run — so this file must never import `@/lib/db`.
 * The Credentials provider is declared here without an `authorize`
 * implementation; the real DB-backed one is added in `lib/auth.ts`.
 */
export const authConfig = {
  /**
   * Auth.js only infers the deployment host automatically on Vercel. Behind
   * any other reverse proxy (Hostinger, a VPS with Nginx) it must be told to
   * trust the forwarded host, or every callback fails with UntrustedHost.
   */
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [Credentials({})],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
} satisfies NextAuthConfig
