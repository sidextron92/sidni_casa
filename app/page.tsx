import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Home as HomeIcon, Map as MapIcon } from 'lucide-react'
import { getServerClient } from '@/lib/pb'
import {
  COLLECTIONS,
  type MemberRecord,
  type PropertyRecord,
  type PropertyTagExpanded,
  type RatingRecord,
} from '@/lib/types'
import { buildScoreContext, computeScore } from '@/lib/score'
import PropertyListControls from './PropertyListControls'
import { logout } from './actions'

export default async function Home() {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) redirect('/login')
  const user = pb.authStore.record

  const [properties, ratings, propertyTags, members] = await Promise.all([
    pb.collection(COLLECTIONS.properties).getFullList<PropertyRecord>({ sort: '-created' }).catch(() => []),
    pb.collection(COLLECTIONS.ratings).getFullList<RatingRecord>().catch(() => []),
    pb.collection(COLLECTIONS.propertyTags).getFullList<PropertyTagExpanded>({ expand: 'tag' }).catch(() => []),
    pb.collection(COLLECTIONS.members).getFullList<MemberRecord>().catch(() => []),
  ])

  const context = buildScoreContext(properties, members.length || 1)

  const ratingsByProp = new Map<string, RatingRecord[]>()
  for (const r of ratings) {
    const arr = ratingsByProp.get(r.property) ?? []
    arr.push(r)
    ratingsByProp.set(r.property, arr)
  }
  const tagsByProp = new Map<string, PropertyTagExpanded[]>()
  for (const pt of propertyTags) {
    const arr = tagsByProp.get(pt.property) ?? []
    arr.push(pt)
    tagsByProp.set(pt.property, arr)
  }

  const items = properties.map((p) => ({
    ...p,
    score: computeScore(p, ratingsByProp.get(p.id) ?? [], tagsByProp.get(p.id) ?? [], context),
  }))

  const firstName = (user?.name || user?.email?.split('@')[0] || 'there').split(/\s+/)[0]

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-stone-900 sm:text-5xl">sidni casa</h1>
          <p className="mt-1 text-sm text-stone-600">Hey {firstName} — let&apos;s find the one.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400"
          >
            <MapIcon className="h-4 w-4" />
            Map
          </Link>
          <Link
            href="/properties/add"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-800"
          >
            <Plus className="h-4 w-4" />
            Add property
          </Link>
          <form action={logout}>
            <button className="text-sm text-stone-500 hover:text-stone-900">Sign out</button>
          </form>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <HomeIcon className="mx-auto h-8 w-8 text-stone-400" />
          <h3 className="mt-3 font-display text-xl text-stone-900">Nothing yet</h3>
          <p className="mt-1 text-sm text-stone-600">
            Drop a listing URL to kick things off. We&apos;ll do the typing.
          </p>
          <Link
            href="/properties/add"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
          >
            <Plus className="h-4 w-4" />
            Paste a URL
          </Link>
        </div>
      ) : (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-stone-900">The shortlist so far</h2>
            <span className="text-sm text-stone-500">
              {items.length} {items.length === 1 ? 'property' : 'properties'}
            </span>
          </div>
          <PropertyListControls items={items} />
        </section>
      )}
    </main>
  )
}
