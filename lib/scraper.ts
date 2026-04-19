import 'server-only'
import type { SourceSite } from './types'

export type ExtractedProperty = {
  society_name: string | null
  tower: string | null
  unit_number: string | null
  sector: string | null
  city: 'Noida' | 'Greater Noida' | 'Noida Extension' | 'Other' | null
  bhk: number | null
  carpet_sqft: number | null
  super_sqft: number | null
  listing_price_inr: number | null
  latitude: number | null
  longitude: number | null
  broker_name: string | null
  broker_phone: string | null
  broker_agency: string | null
  property_type:
    | 'apartment'
    | 'villa'
    | 'builder_floor'
    | 'independent_house'
    | 'plot'
    | null
  transaction_type: 'resale' | 'new' | 'under_construction' | null
  possession_status: 'ready_to_move' | 'under_construction' | null
  age_years: number | null
  floor_number: number | null
  total_floors: number | null
  facing:
    | 'north'
    | 'south'
    | 'east'
    | 'west'
    | 'north_east'
    | 'north_west'
    | 'south_east'
    | 'south_west'
    | null
  furnishing: 'furnished' | 'semi_furnished' | 'unfurnished' | null
  bathrooms: number | null
  parking_covered: number | null
  parking_open: number | null
  maintenance_monthly: number | null
  amenities: string[]
  description: string | null
  image_urls: string[]
  confidence_notes: string
}

export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const html = await res.text()
  return html.slice(0, 200_000)
}

export function stripHtmlForLlm(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function emptyExtraction(): ExtractedProperty {
  return {
    society_name: null,
    tower: null,
    unit_number: null,
    sector: null,
    city: null,
    bhk: null,
    carpet_sqft: null,
    super_sqft: null,
    listing_price_inr: null,
    latitude: null,
    longitude: null,
    broker_name: null,
    broker_phone: null,
    broker_agency: null,
    property_type: null,
    transaction_type: null,
    possession_status: null,
    age_years: null,
    floor_number: null,
    total_floors: null,
    facing: null,
    furnishing: null,
    bathrooms: null,
    parking_covered: null,
    parking_open: null,
    maintenance_monthly: null,
    amenities: [],
    description: null,
    image_urls: [],
    confidence_notes: '',
  }
}

export function detectSourceSite(url: string): SourceSite {
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (h.includes('magicbricks')) return 'magicbricks'
    if (h.includes('99acres')) return '99acres'
    if (h.includes('housing.com')) return 'housing'
    if (h.includes('nobroker')) return 'nobroker'
    if (h.includes('squareyards')) return 'squareyards'
  } catch {}
  return 'other'
}
