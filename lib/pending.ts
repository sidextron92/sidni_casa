import 'server-only'
import { cookies } from 'next/headers'
import type { ExtractedProperty } from './scraper'
import type { SourceSite } from './types'

const COOKIE_NAME = 'sidnicasa_pending'
const MAX_AGE_SEC = 60 * 60 * 2
const MAX_IMAGES_IN_COOKIE = 10

export type PendingExtraction = {
  url: string
  sourceSite: SourceSite
  scrapedAt: string
  extracted: ExtractedProperty
}

export async function setPendingExtraction(p: PendingExtraction) {
  const capped: PendingExtraction = {
    ...p,
    extracted: {
      ...p.extracted,
      image_urls: Array.from(new Set(p.extracted.image_urls)).slice(0, MAX_IMAGES_IN_COOKIE),
    },
  }
  const store = await cookies()
  store.set(COOKIE_NAME, JSON.stringify(capped), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  })
}

export async function getPendingExtraction(): Promise<PendingExtraction | null> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingExtraction
  } catch {
    return null
  }
}

export async function clearPendingExtraction() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
