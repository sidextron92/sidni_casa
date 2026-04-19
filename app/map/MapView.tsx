'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import type { PathOptions } from 'leaflet'
import { formatINR, formatSqft } from '@/lib/format'
import type { PropertyStatus } from '@/lib/types'
import 'leaflet/dist/leaflet.css'
import type { MapPropertyMarker } from './types'
export type { MapPropertyMarker }

const STATUS_COLOR: Record<PropertyStatus, string> = {
  exploring: '#57534e',
  shortlisted: '#be123c',
  visited: '#047857',
  offered: '#b45309',
  closed: '#4338ca',
  rejected: '#a8a29e',
}

const STATUS_LABEL: Record<PropertyStatus, string> = {
  exploring: 'Exploring',
  shortlisted: 'Shortlisted',
  visited: 'Visited',
  offered: 'Offered',
  closed: 'Closed',
  rejected: 'Passed',
}

const NOIDA_CENTER: [number, number] = [28.5706, 77.3272]
const DEFAULT_ZOOM = 11

const SECTOR_STYLE: PathOptions = {
  fillColor: '#fef3c7',
  fillOpacity: 0.15,
  color: '#b45309',
  weight: 1,
  opacity: 0.55,
}

type Props = { properties: MapPropertyMarker[] }

function ringCentroid(ring: number[][]): [number, number] | null {
  if (!ring || ring.length === 0) return null
  let sx = 0
  let sy = 0
  for (const [x, y] of ring) {
    sx += x
    sy += y
  }
  return [sx / ring.length, sy / ring.length]
}

function geometryCentroid(geom: Geometry | null | undefined): [number, number] | null {
  if (!geom) return null
  if (geom.type === 'Polygon') return ringCentroid(geom.coordinates[0])
  if (geom.type === 'MultiPolygon') return ringCentroid(geom.coordinates[0][0])
  return null
}

function sectorKey(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = /(\d+)([A-Za-z])?/.exec(raw)
  if (!m) return null
  return `${m[1]}${(m[2] ?? '').toUpperCase()}`
}

// Deterministic jitter so multiple props in one sector don't stack.
function jitterFor(id: string, radiusDeg = 0.003): [number, number] {
  let h1 = 0
  let h2 = 0
  for (let i = 0; i < id.length; i += 1) {
    h1 = (h1 * 31 + id.charCodeAt(i)) >>> 0
    h2 = (h2 * 37 + id.charCodeAt(i) * 7 + 13) >>> 0
  }
  const angle = (h1 % 3600) / 10 * (Math.PI / 180)
  const dist = ((h2 % 1000) / 1000) * radiusDeg
  return [dist * Math.cos(angle), dist * Math.sin(angle)]
}

export default function MapView({ properties }: Props) {
  const [sectors, setSectors] = useState<FeatureCollection | null>(null)
  const [sectorStatus, setSectorStatus] = useState<'loading' | 'loaded' | 'missing'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch('/noida-sectors.geojson')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as FeatureCollection
      })
      .then((data) => {
        if (cancelled) return
        setSectors(data)
        setSectorStatus('loaded')
      })
      .catch(() => {
        if (!cancelled) setSectorStatus('missing')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sectorCentroids = useMemo(() => {
    const map = new Map<string, [number, number]>()
    if (!sectors) return map
    for (const feature of sectors.features) {
      const raw =
        (feature.properties as { sector?: string; name?: string } | null)?.sector ??
        (feature.properties as { name?: string } | null)?.name
      const key = sectorKey(raw)
      if (!key) continue
      const centroid = geometryCentroid(feature.geometry)
      if (!centroid) continue
      map.set(key, centroid)
    }
    return map
  }, [sectors])

  return (
    <div className="relative flex-1">
      <MapContainer
        center={NOIDA_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-[calc(100vh-56px)] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {sectors && (
          <GeoJSON
            data={sectors}
            style={() => SECTOR_STYLE}
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.name
              if (name) {
                layer.bindTooltip(name, { sticky: true, direction: 'center', className: 'sector-tooltip' })
              }
            }}
          />
        )}

        {properties.map((p) => {
          const color = STATUS_COLOR[p.status]
          let lat: number | null = null
          let lon: number | null = null
          let approximate = false

          if (p.lat != null && p.lon != null) {
            lat = p.lat
            lon = p.lon
          } else {
            const key = sectorKey(p.sector)
            const centroid = key ? sectorCentroids.get(key) : null
            if (centroid) {
              const [jx, jy] = jitterFor(p.id)
              lon = centroid[0] + jx
              lat = centroid[1] + jy
              approximate = true
            } else if (sectorStatus === 'loaded' && key) {
              console.warn(`[map] no polygon for sector "${key}" on property ${p.id} (${p.society_name})`)
            }
          }

          if (lat == null || lon == null) return null

          return (
            <CircleMarker
              key={p.id}
              center={[lat, lon]}
              radius={approximate ? 8 : 9}
              pathOptions={{
                fillColor: color,
                fillOpacity: approximate ? 0.55 : 0.92,
                color: '#ffffff',
                weight: 2,
                dashArray: approximate ? '4,4' : undefined,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {p.society_name}
                {approximate && ' (approx)'}
              </Tooltip>
              <Popup>
                <div className="min-w-[180px]">
                  {p.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image} alt="" className="mb-2 h-24 w-full rounded object-cover" />
                  )}
                  <div className="text-sm font-semibold text-stone-900">{p.society_name}</div>
                  <div className="text-xs text-stone-500">
                    {[p.sector, `${p.bhk}BHK`, formatSqft(p.super_sqft)].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mt-1 text-sm text-stone-800">{formatINR(p.listing_price)}</div>
                  <div className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase text-white" style={{ backgroundColor: color }}>
                    {STATUS_LABEL[p.status]}
                  </div>
                  {approximate && (
                    <div className="mt-1 text-[10px] text-amber-800">
                      Approximate — placed near sector center
                    </div>
                  )}
                  <a
                    href={`/properties/${p.id}`}
                    className="mt-2 block text-xs font-medium text-rose-700 hover:underline"
                  >
                    Open details →
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {sectorStatus === 'missing' && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-xs text-amber-900 shadow-sm">
          Sector polygons not loaded. Run <code className="font-mono">npm run fetch:sectors</code> once to populate.
        </div>
      )}

      <UnmappedPanel
        properties={properties}
        sectorCentroids={sectorCentroids}
        sectorStatus={sectorStatus}
      />
      <Legend />
    </div>
  )
}

function UnmappedPanel({
  properties,
  sectorCentroids,
  sectorStatus,
}: {
  properties: MapPropertyMarker[]
  sectorCentroids: Map<string, [number, number]>
  sectorStatus: 'loading' | 'loaded' | 'missing'
}) {
  const unmapped = properties.filter((p) => {
    if (p.lat != null && p.lon != null) return false
    const key = sectorKey(p.sector)
    if (!key) return true
    if (sectorStatus !== 'loaded') return false
    return !sectorCentroids.has(key)
  })
  if (unmapped.length === 0) return null
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 max-w-xs rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="mb-1 font-medium text-amber-900">
        {unmapped.length} not on map
      </div>
      <ul className="space-y-0.5 text-stone-700">
        {unmapped.slice(0, 4).map((p) => {
          const key = sectorKey(p.sector)
          const reason = !key
            ? 'no sector'
            : !sectorCentroids.has(key)
              ? `sector "${key}" not in polygon set`
              : 'unknown'
          return (
            <li key={p.id} className="truncate">
              <span className="font-medium">{p.society_name}</span>
              <span className="text-stone-500"> — {reason}</span>
            </li>
          )
        })}
        {unmapped.length > 4 && (
          <li className="text-stone-400">+ {unmapped.length - 4} more…</li>
        )}
      </ul>
    </div>
  )
}

function Legend() {
  const entries = Object.entries(STATUS_LABEL) as [PropertyStatus, string][]
  return (
    <div className="pointer-events-auto absolute right-3 top-3 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-500">Legend</div>
      <ul className="space-y-1">
        {entries.map(([status, label]) => (
          <li key={status} className="flex items-center gap-2 text-xs text-stone-700">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
