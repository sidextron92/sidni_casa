'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '@/app/actions'

const initial: LoginState = {}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial)

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold">sidni casa</h1>
      <form action={action} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-600">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-neutral-900 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
