'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
import type { MapPropertyMarker } from './types'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-stone-100 text-sm text-stone-500">
      Loading map…
    </div>
  ),
})

type Props = {
  properties: MapPropertyMarker[]
  total: number
  exact: number
  approx: number
}

export default function MapClient({ properties, total, exact, approx }: Props) {
  const mapped = exact + approx
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-stone-500 transition hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <span className="h-4 w-px bg-stone-200" />
          <h1 className="font-display text-lg text-stone-900">Map</h1>
        </div>
        <span className="text-xs text-stone-500">
          {exact} exact
          {approx > 0 && <span> · {approx} in-sector</span>}
          {' · '}
          {mapped} of {total}
        </span>
      </header>
      <MapView properties={properties} />
    </main>
  )
}
