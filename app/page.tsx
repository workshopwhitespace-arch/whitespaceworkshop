import { redirect } from 'next/navigation'

export default function HomePage() {
  // Middleware sends unauthenticated visitors on to /login.
  redirect('/dashboard')
}
