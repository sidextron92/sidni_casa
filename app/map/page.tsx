import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/pb'
import { COLLECTIONS, type PropertyRecord } from '@/lib/types'
import MapClient from './MapClient'

export default async function MapPage() {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) redirect('/login')

  const properties = await pb
    .collection(COLLECTIONS.properties)
    .getFullList<PropertyRecord>({ sort: '-created' })
    .catch(() => [])

  // Treat (0, 0) geoPoint as unset — PocketBase's geoPoint defaults there
  // when the field is omitted at create time.
  const hasRealLocation = (loc: PropertyRecord['location']) =>
    !!loc &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lon) &&
    !(loc.lat === 0 && loc.lon === 0)

  const mapProps = properties
    .filter((p) => hasRealLocation(p.location) || (!!p.sector && p.sector.trim() !== ''))
    .map((p) => ({
      id: p.id,
      society_name: p.society_name,
      sector: p.sector ?? null,
      bhk: p.bhk,
      status: p.status,
      listing_price: p.listing_price ?? null,
      super_sqft: p.super_sqft ?? null,
      lat: hasRealLocation(p.location) ? p.location!.lat : null,
      lon: hasRealLocation(p.location) ? p.location!.lon : null,
      image: Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null,
    }))

  const totalCount = properties.length
  const exactCount = mapProps.filter((p) => p.lat != null && p.lon != null).length
  const approxCount = mapProps.length - exactCount

  return (
    <MapClient properties={mapProps} total={totalCount} exact={exactCount} approx={approxCount} />
  )
}
