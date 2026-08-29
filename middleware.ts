import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

// Middleware runs on the Edge runtime, so it builds its own NextAuth
// instance from the Prisma-free config rather than importing `@/lib/auth`.
const { auth } = NextAuth(authConfig)

const EMPLOYEE_BLOCKED_PREFIXES = [
  '/dashboard/team',
  '/dashboard/settings',
  '/dashboard/ledger',
  '/dashboard/reports',
]
const ADMIN_BLOCKED_PREFIXES = ['/dashboard/team', '/dashboard/settings']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard')

  if (isDashboardRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn && isDashboardRoute) {
    const role = req.auth?.user?.role

    if (role === 'EMPLOYEE') {
      const blocked = EMPLOYEE_BLOCKED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p)
      )
      if (blocked) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
    }

    if (role === 'ADMIN') {
      const blocked = ADMIN_BLOCKED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p)
      )
      if (blocked) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*'],
}