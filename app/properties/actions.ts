'use server'

import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/pb'
import {
  COLLECTIONS,
  FACING_DIRECTIONS,
  FURNISHING_LEVELS,
  POSSESSION_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  type City,
  type Facing,
  type Furnishing,
  type PossessionStatus,
  type PropertyType,
  type TransactionType,
} from '@/lib/types'
import { detectSourceSite, fetchUrlText } from '@/lib/scraper'
import { extractProperty } from '@/lib/llm'
import { normalizeSocietyName } from '@/lib/normalize'
import {
  clearPendingExtraction,
  getPendingExtraction,
  setPendingExtraction,
} from '@/lib/pending'

export type SubmitUrlState = { error?: string }

export async function submitUrl(_prev: SubmitUrlState, formData: FormData): Promise<SubmitUrlState> {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }

  const url = String(formData.get('url') ?? '').trim()
  if (!url) return { error: 'URL required.' }
  try {
    new URL(url)
  } catch {
    return { error: 'That does not look like a valid URL.' }
  }

  // Clear any stale pending cookie before we try.
  await clearPendingExtraction()

  // Reject if URL is already a saved listing.
  try {
    await pb
      .collection(COLLECTIONS.listings)
      .getFirstListItem(`source_url = "${url.replace(/"/g, '')}"`)
    return { error: 'This URL has already been saved as a listing.' }
  } catch {
    // Not found — continue.
  }

  let html: string
  try {
    html = await fetchUrlText(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed'
    return {
      error: `Could not fetch the page: ${msg}. Nothing was saved. The site likely blocks automated requests — try a different URL.`,
    }
  }

  let extracted
  try {
    extracted = await extractProperty(url, html)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'extraction failed'
    return {
      error: `Extraction failed: ${msg}. Nothing was saved. Try again in a minute or switch LLM provider.`,
    }
  }

  await setPendingExtraction({
    url,
    sourceSite: detectSourceSite(url),
    scrapedAt: new Date().toISOString(),
    extracted,
  })

  redirect('/properties/verify')
}

export type VerifyState = { error?: string }

export async function verifyListing(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  const userId = pb.authStore.record!.id

  const pending = await getPendingExtraction()
  if (!pending) {
    return { error: 'No pending extraction. Paste a URL first.' }
  }

  const linkTo = String(formData.get('linkTo') ?? '').trim()
  const imageUrls = Array.from(
    new Set(
      formData
        .getAll('image_urls')
        .map((v) => String(v))
        .filter((u) => /^https?:\/\//.test(u)),
    ),
  ).slice(0, 20)

  let propertyId: string

  if (linkTo) {
    propertyId = linkTo
    if (imageUrls.length > 0) {
      try {
        const existing = await pb.collection(COLLECTIONS.properties).getOne(linkTo)
        const prev: string[] = Array.isArray(existing.image_urls) ? (existing.image_urls as string[]) : []
        const merged = Array.from(new Set([...prev, ...imageUrls])).slice(0, 40)
        if (merged.length !== prev.length) {
          await pb.collection(COLLECTIONS.properties).update(linkTo, { image_urls: merged })
        }
      } catch (e) {
        console.error('[verifyListing] merge images failed', e)
      }
    }
  } else {
    const society = String(formData.get('society_name') ?? '').trim()
    const bhkRaw = String(formData.get('bhk') ?? '')
    const bhk = Number(bhkRaw)
    if (!society) return { error: 'Society name is required.' }
    if (!bhk || !Number.isFinite(bhk)) return { error: 'BHK is required.' }

    const sector = String(formData.get('sector') ?? '').trim()
    const tower = String(formData.get('tower') ?? '').trim()
    const unit = String(formData.get('unit_number') ?? '').trim()
    const cityRaw = String(formData.get('city') ?? 'Noida') as City
    const carpet = toOptInt(formData.get('carpet_sqft'))
    const superSqft = toOptInt(formData.get('super_sqft'))
    const price = toOptInt(formData.get('listing_price'))
    const pricePerSqft = price && superSqft ? Math.round(price / superSqft) : undefined
    const lat = toOptFloat(formData.get('latitude'))
    const lon = toOptFloat(formData.get('longitude'))
    const location =
      lat !== undefined && lon !== undefined && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
        ? { lat, lon }
        : undefined

    const propertyType = toEnum<PropertyType>(formData.get('property_type'), PROPERTY_TYPES)
    const transactionType = toEnum<TransactionType>(
      formData.get('transaction_type'),
      TRANSACTION_TYPES,
    )
    const possessionStatus = toEnum<PossessionStatus>(
      formData.get('possession_status'),
      POSSESSION_STATUSES,
    )
    const ageYears = toOptInt(formData.get('age_years'))
    const floorNumber = toOptInt(formData.get('floor_number'))
    const totalFloors = toOptInt(formData.get('total_floors'))
    const facing = toEnum<Facing>(formData.get('facing'), FACING_DIRECTIONS)
    const furnishing = toEnum<Furnishing>(formData.get('furnishing'), FURNISHING_LEVELS)
    const bathrooms = toOptInt(formData.get('bathrooms'))
    const parkingCovered = toOptInt(formData.get('parking_covered'))
    const parkingOpen = toOptInt(formData.get('parking_open'))
    const maintenanceMonthly = toOptInt(formData.get('maintenance_monthly'))
    const amenitiesRaw = String(formData.get('amenities') ?? '')
    const amenities = Array.from(
      new Set(
        amenitiesRaw
          .split(/[,\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    )
    const description = String(formData.get('description') ?? '').trim().slice(0, 5000)

    try {
      const p = await pb.collection(COLLECTIONS.properties).create({
        society_name: society,
        society_name_normalized: normalizeSocietyName(society),
        tower: tower || undefined,
        unit_number: unit || undefined,
        sector: sector || undefined,
        city: cityRaw,
        bhk,
        carpet_sqft: carpet,
        super_sqft: superSqft,
        listing_price: price,
        price_per_sqft: pricePerSqft,
        location,
        status: 'exploring',
        image_urls: imageUrls,
        property_type: propertyType,
        transaction_type: transactionType,
        possession_status: possessionStatus,
        age_years: ageYears,
        floor_number: floorNumber,
        total_floors: totalFloors,
        facing,
        furnishing,
        bathrooms,
        parking_covered: parkingCovered,
        parking_open: parkingOpen,
        maintenance_monthly: maintenanceMonthly,
        amenities,
        description: description || undefined,
        created_by: userId,
      })
      propertyId = p.id
    } catch (e) {
      console.error('[verifyListing] property create failed', e)
      return { error: 'Could not create property.' }
    }
  }

  const brokerName = String(formData.get('broker_name') ?? '').trim()
  const brokerPhone = String(formData.get('broker_phone') ?? '').trim()
  const brokerAgency = String(formData.get('broker_agency') ?? '').trim()
  let brokerId: string | undefined

  if (brokerName && brokerPhone) {
    try {
      const existing = await pb
        .collection(COLLECTIONS.brokers)
        .getFirstListItem(`phone = "${brokerPhone.replace(/"/g, '')}"`)
      brokerId = existing.id
      const currentProps: string[] = Array.isArray(existing.pitched_properties)
        ? (existing.pitched_properties as string[])
        : []
      await pb.collection(COLLECTIONS.brokers).update(existing.id, {
        contact_count: (existing.contact_count ?? 0) + 1,
        last_contacted_at: new Date().toISOString(),
        pitched_properties: Array.from(new Set([...currentProps, propertyId])),
      })
    } catch {
      try {
        const b = await pb.collection(COLLECTIONS.brokers).create({
          name: brokerName,
          phone: brokerPhone,
          agency: brokerAgency || undefined,
          contact_count: 1,
          last_contacted_at: new Date().toISOString(),
          pitched_properties: [propertyId],
        })
        brokerId = b.id
      } catch (e) {
        console.error('[verifyListing] broker create failed', e)
      }
    }
  }

  try {
    await pb.collection(COLLECTIONS.listings).create({
      source_url: pending.url,
      source_site: pending.sourceSite,
      raw_scrape: pending.extracted,
      scraped_at: pending.scrapedAt,
      submitted_by: userId,
      verified_by_human: true,
      verified_by: userId,
      property: propertyId,
      broker: brokerId,
      image_urls: imageUrls,
    })
  } catch (e) {
    const err = e as { status?: number; response?: { data?: Record<string, unknown> } }
    if (err.status === 400 && err.response?.data && 'source_url' in err.response.data) {
      await clearPendingExtraction()
      return { error: 'This URL was already saved by someone else in the meantime.' }
    }
    console.error('[verifyListing] listing create failed', e)
    return { error: 'Could not create the listing.' }
  }

  await clearPendingExtraction()
  redirect('/')
}

function toOptInt(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n) : undefined
}

function toOptFloat(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function toEnum<T extends string>(v: FormDataEntryValue | null, allowed: readonly T[]): T | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  return (allowed as readonly string[]).includes(s) ? (s as T) : undefined
}
