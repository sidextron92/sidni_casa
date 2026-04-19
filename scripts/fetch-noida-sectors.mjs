#!/usr/bin/env node
/* eslint-disable */
// Pulls Noida sector polygons from LivingAtlas India's ArcGIS MapServer and
// writes them to public/noida-sectors.geojson.
// Run: npm run fetch:sectors

import fs from 'node:fs'
import path from 'node:path'

const OUTPUT = path.resolve('public', 'noida-sectors.geojson')

const ESRI_URL =
  'https://livingatlas.esri.in/server/rest/services/Sectors/Noida/MapServer/0/query' +
  '?where=1%3D1&outFields=sectornumber%2Cobjectid&returnGeometry=true&outSR=4326&f=geojson'

console.log(`Fetching ${ESRI_URL}`)
const res = await fetch(ESRI_URL, {
  headers: { 'User-Agent': 'sidni-casa/1.0', Accept: 'application/json' },
})

if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`)
  process.exit(1)
}

const raw = await res.json()
if (!raw || raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
  console.error('Unexpected response shape.')
  process.exit(1)
}

console.log(`Got ${raw.features.length} features`)

function normalizeSectorNumber(input) {
  const s = String(input ?? '').trim().replace(/\s+/g, '')
  const m = /^(\d+)([A-Za-z])?$/.exec(s)
  if (!m) return null
  return `${m[1]}${(m[2] ?? '').toUpperCase()}`
}

const cleaned = raw.features
  .filter((f) => {
    if (!f.geometry) return false
    if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') return false
    return normalizeSectorNumber(f.properties?.sectornumber) !== null
  })
  .map((f) => ({
    type: 'Feature',
    properties: {
      name: `Sector ${normalizeSectorNumber(f.properties.sectornumber)}`,
      sector: normalizeSectorNumber(f.properties.sectornumber),
      source_id: `esri/${f.properties.objectid}`,
    },
    geometry: f.geometry,
  }))
  .sort((a, b) => {
    const na = parseInt(a.properties.sector.match(/\d+/)?.[0] ?? '0', 10)
    const nb = parseInt(b.properties.sector.match(/\d+/)?.[0] ?? '0', 10)
    if (na !== nb) return na - nb
    return a.properties.sector.localeCompare(b.properties.sector)
  })

const out = { type: 'FeatureCollection', features: cleaned }

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
fs.writeFileSync(OUTPUT, JSON.stringify(out))
const bytes = fs.statSync(OUTPUT).size
console.log(
  `Saved ${cleaned.length} sectors to ${OUTPUT} (${(bytes / 1024).toFixed(1)} KB).`,
)
console.log('Sectors:', cleaned.map((f) => f.properties.sector).join(', '))
