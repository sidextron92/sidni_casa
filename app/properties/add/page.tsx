'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { submitUrl, type SubmitUrlState } from '../actions'

const initial: SubmitUrlState = {}

export default function AddPropertyPage() {
  const [state, action, pending] = useActionState(submitUrl, initial)

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-6 text-sm">
        <Link href="/" className="text-neutral-500 hover:text-neutral-900">
          ← Home
        </Link>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold">Add a property</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Paste a listing URL from MagicBricks, 99acres, Housing.com, NoBroker, or Square Yards. We&apos;ll scrape it with
        Claude and you&apos;ll verify the extracted details on the next screen.
      </p>

      <form action={action} className="space-y-4">
        <input
          name="url"
          type="url"
          placeholder="https://www.magicbricks.com/propertyDetails/…"
          required
          className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Scraping…' : 'Scrape & continue'}
        </button>
      </form>
    </main>
  )
}
