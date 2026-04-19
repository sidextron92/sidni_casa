import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/pb'
import { COLLECTIONS, type PropertyRecord } from '@/lib/types'
import { normalizeSocietyName } from '@/lib/normalize'
import { getPendingExtraction } from '@/lib/pending'
import VerifyForm from './VerifyForm'

export default async function VerifyPage() {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) redirect('/login')

  const pending = await getPendingExtraction()
  if (!pending) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <nav className="mb-6 text-sm">
          <Link href="/" className="text-neutral-500 hover:text-neutral-900">
            ← Home
          </Link>
        </nav>
        <h1 className="mb-2 text-2xl font-semibold">Nothing to verify</h1>
        <p className="mb-6 text-sm text-neutral-600">
          You haven&apos;t started an extraction — or the last one expired. Paste a URL to begin.
        </p>
        <Link
          href="/properties/add"
          className="inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          + Add property
        </Link>
      </main>
    )
  }

  const societyRaw =
    typeof pending.extracted.society_name === 'string' ? pending.extracted.society_name : ''
  const normalized = normalizeSocietyName(societyRaw)

  let candidates: PropertyRecord[] = []
  if (normalized.length >= 3) {
    try {
      const escaped = normalized.replace(/"/g, '\\"')
      const res = await pb.collection(COLLECTIONS.properties).getList<PropertyRecord>(1, 10, {
        filter: `society_name_normalized ~ "${escaped}"`,
        sort: '-created',
      })
      candidates = res.items
    } catch {}
  }

  return <VerifyForm pending={pending} candidates={candidates} />
}
