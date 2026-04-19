'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Home as HomeIcon, MapPin, Sparkles } from 'lucide-react'
import type { PropertyRecord, PropertyStatus } from '@/lib/types'
import type { ScoreBreakdown } from '@/lib/score'
import { formatINR, formatSqft } from '@/lib/format'

type Item = PropertyRecord & { score: ScoreBreakdown }

type SortKey = 'newest' | 'score' | 'price_asc' | 'price_desc' | 'size_desc'

type Filter = 'all' | PropertyStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'exploring', label: 'Exploring' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'visited', label: 'Visited' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Passed' },
  { value: 'closed', label: 'Closed' },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'score', label: 'Highest score' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
  { value: 'size_desc', label: 'Largest first' },
]

export default function PropertyListControls({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: items.length,
      exploring: 0,
      shortlisted: 0,
      visited: 0,
      offered: 0,
      rejected: 0,
      closed: 0,
    }
    for (const i of items) c[i.status] += 1
    return c
  }, [items])

  const view = useMemo(() => {
    let list = filter === 'all' ? [...items] : items.filter((i) => i.status === filter)
    list = list.sort((a, b) => {
      switch (sort) {
        case 'score':
          return b.score.composite - a.score.composite
        case 'price_asc':
          return (a.listing_price ?? Infinity) - (b.listing_price ?? Infinity)
        case 'price_desc':
          return (b.listing_price ?? -1) - (a.listing_price ?? -1)
        case 'size_desc':
          return (
            (b.super_sqft ?? b.carpet_sqft ?? 0) - (a.super_sqft ?? a.carpet_sqft ?? 0)
          )
        case 'newest':
        default:
          return new Date(b.created).getTime() - new Date(a.created).getTime()
      }
    })
    return list
  }, [items, filter, sort])

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 whitespace-nowrap">
            {FILTERS.map((f) => {
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    active
                      ? 'border-rose-700 bg-rose-700 text-white shadow-sm'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {f.label}
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                      active ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {counts[f.value]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 outline-none focus:border-stone-400"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
          Nothing under this filter yet.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {view.map((p) => (
            <Card key={p.id} item={p} />
          ))}
        </ul>
      )}
    </>
  )
}

function Card({ item: p }: { item: Item }) {
  const cover = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null
  const subtitle = [p.sector, p.city].filter(Boolean).join(' · ')
  return (
    <li>
      <Link
        href={`/properties/${p.id}`}
        className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
      >
        <div className="relative aspect-[4/3] bg-stone-100">
          {cover ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-300">
              <HomeIcon className="h-10 w-10" />
            </div>
          )}
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 font-display text-sm text-white backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            {p.score.composite.toFixed(1)}
          </div>
        </div>
        <div className="p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
              {p.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-stone-500">{p.bhk}BHK</span>
          </div>
          <h3 className="truncate font-display text-lg text-stone-900">{p.society_name}</h3>
          {subtitle && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-500">
              <MapPin className="h-3 w-3" />
              {subtitle}
            </p>
          )}
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-lg text-stone-900">{formatINR(p.listing_price)}</div>
            <div className="text-xs text-stone-500">
              {formatSqft(p.super_sqft || p.carpet_sqft)}
            </div>
          </div>
        </div>
      </Link>
    </li>
  )
}
