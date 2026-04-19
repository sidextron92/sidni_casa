import type { PropertyStatus } from '@/lib/types'

export type MapPropertyMarker = {
  id: string
  society_name: string
  sector: string | null
  bhk: number
  status: PropertyStatus
  listing_price: number | null
  super_sqft: number | null
  lat: number | null
  lon: number | null
  image: string | null
}
