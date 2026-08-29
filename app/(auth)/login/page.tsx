import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="mb-1 text-2xl font-semibold text-[#26251F]">
            White Space Workshop
          </h1>
          <p className="mb-8 text-sm text-[#8A8778]">Sign in to your workspace</p>
          <LoginForm />
        </div>
      </div>
      <div className="hidden bg-[#1F1E1B] lg:block lg:w-1/2" />
    </div>
  )
}
