import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Deployment diagnostic. Reports whether the app can reach its database,
 * which database it actually landed in, and whether the auth environment is
 * configured — without ever echoing a credential.
 *
 * DELETE THIS ROUTE once the deployment is healthy. It is unauthenticated,
 * and while it leaks nothing sensitive, a permanent public endpoint that
 * confirms your stack's internals is not something to leave lying around.
 */
export async function GET() {
  const report: Record<string, unknown> = {
    authSecretSet: Boolean(process.env.AUTH_SECRET),
    authUrl: process.env.AUTH_URL ?? '(not set)',
    nodeEnv: process.env.NODE_ENV ?? '(not set)',
    databaseUrlSet: Boolean(process.env.DATABASE_URL),
  }

  // Show only the shape of the connection string, never the password.
  const url = process.env.DATABASE_URL
  if (url) {
    try {
      const afterAt = url.split('@')[1] ?? ''
      report.databaseHost = afterAt.split('/')[0] || '(unparsed)'
      report.databaseNameInUrl = (afterAt.split('/')[1] ?? '').split('?')[0] || '(none)'
    } catch {
      report.databaseHost = '(could not parse DATABASE_URL)'
    }
  }

  try {
    const [row] = await db.$queryRawUnsafe<{ db: string }[]>('SELECT DATABASE() AS db')
    report.databaseReachable = true
    report.connectedToDatabase = row?.db ?? '(none selected)'
    report.userCount = await db.user.count()
    report.tableCount = (
      await db.$queryRawUnsafe<{ n: bigint }[]>(
        'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()'
      )
    )[0]?.n?.toString()
    report.emails = (await db.user.findMany({ select: { email: true, status: true } })).map(
      (u) => `${u.email} (${u.status})`
    )
  } catch (error) {
    report.databaseReachable = false
    report.databaseError =
      error instanceof Error ? `${error.name}: ${error.message.split('\n')[0]}` : String(error)
  }

  return NextResponse.json(report, { status: 200 })
}
