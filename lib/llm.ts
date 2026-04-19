import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import { stripHtmlForLlm, type ExtractedProperty } from './scraper'

const GROQ_CHAR_CAP = Number(process.env.GROQ_CHAR_CAP || 50_000)
const ANTHROPIC_CHAR_CAP = Number(process.env.ANTHROPIC_CHAR_CAP || 180_000)

type Provider = 'anthropic' | 'groq'

const PROVIDER: Provider = (process.env.LLM_PROVIDER?.toLowerCase() as Provider) || 'anthropic'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

export function activeLlm() {
  return PROVIDER === 'groq'
    ? { provider: 'groq', model: GROQ_MODEL }
    : { provider: 'anthropic', model: ANTHROPIC_MODEL }
}

const EXTRACTION_SYSTEM = `You extract structured property data from Indian real-estate listing pages (MagicBricks, 99acres, Housing.com, NoBroker, Square Yards).

Input: raw HTML and/or visible text from a listing page. It may be truncated or partially rendered.

Rules:
- Return null for any field you cannot confidently extract.
- Prices are INR. Convert to plain integers: 1 crore = 10,000,000; 1 lakh = 100,000.
- carpet_sqft and super_sqft are distinct. If a single area value is given and type is unclear, put it in super_sqft and leave carpet_sqft null.
- sector should look like "Sector 150" or "Sector 44" — keep the word "Sector".
- city must be one of: "Noida", "Greater Noida", "Noida Extension", "Other". Use "Other" for Delhi / Ghaziabad / anywhere else.
- bhk is an integer count of bedrooms (1..6).
- property_type: one of "apartment", "villa", "builder_floor", "independent_house", "plot".
- transaction_type: one of "resale", "new", "under_construction". "new" means a fresh booking from the builder in a ready or near-ready project. "under_construction" if possession is in the future.
- possession_status: "ready_to_move" or "under_construction".
- age_years: integer years since completion for resale properties. Null for new/under-construction.
- floor_number: which floor the unit is on (ground = 0). total_floors: how many floors the tower has.
- facing: lowercase underscored one of "north", "south", "east", "west", "north_east", "north_west", "south_east", "south_west". Normalize "NE" or "North East" or "North-east" into "north_east".
- furnishing: "furnished", "semi_furnished", or "unfurnished".
- bathrooms: integer count.
- parking_covered and parking_open: integer counts. If the page says "2 covered + 1 open", set parking_covered=2 and parking_open=1. If only "2 parking" with no covered/open distinction, put 2 in parking_covered and 0 in parking_open.
- maintenance_monthly: integer INR per month of society maintenance / CAM charges.
- amenities: array of short lowercase underscored canonical tokens for society amenities. Prefer this canonical vocabulary when applicable: pool, gym, clubhouse, power_backup, security_24x7, kids_play_area, lift, visitor_parking, garden, jogging_track, tennis_court, basketball_court, badminton_court, indoor_games, spa, sauna, steam_room, yoga_room, banquet_hall, amphitheatre, library, cafeteria, convenience_store, rainwater_harvesting, ev_charging, intercom, cctv, gated_community, fire_safety. You MAY add other short tokens in the same format for amenities not covered. Skip generic filler like "premium", "luxury", "world-class".
- description: a one-to-three-sentence plain-text summary of the listing's description/narrative. Strip HTML. Keep under 500 chars.
- Only fill broker_* if the page clearly shows a broker/agent/listing-owner contact (not the platform's default UI).
- image_urls: extract up to 20 absolute URLs of photos of the property itself — hero images, interior/exterior photos, floor plans, amenity photos. Resolve relative URLs against the source URL (use the scheme+host from the source URL). Skip: site logos, navigation icons, user avatars, promotional banners, placeholder/loading images, ad creatives, and tracking pixels. Prefer the largest/original resolution variant when multiple sizes are offered (often in <source srcset> or data-original attributes). If uncertain, omit rather than include.
- Always fill confidence_notes with one short sentence describing anything uncertain or missing. If the page appears to be a login wall or anti-bot page, say so.`

const GROQ_JSON_INSTRUCTIONS = `Output format: reply with ONLY a single JSON object matching this exact shape. No prose, no markdown fences, no wrapper keys like "parameters" or "name".

Use real JSON types:
- Integers as integers, not strings: e.g. 3 not "3".
- Missing values as JSON null, not the string "null".
- Arrays as arrays, not space-separated strings: e.g. ["url1","url2"] not "url1 url2".

Shape:
{
  "society_name": string|null,
  "tower": string|null,
  "unit_number": string|null,
  "sector": string|null,
  "city": "Noida"|"Greater Noida"|"Noida Extension"|"Other"|null,
  "bhk": integer|null,
  "carpet_sqft": integer|null,
  "super_sqft": integer|null,
  "listing_price_inr": integer|null,
  "latitude": number|null,
  "longitude": number|null,
  "broker_name": string|null,
  "broker_phone": string|null,
  "broker_agency": string|null,
  "property_type": "apartment"|"villa"|"builder_floor"|"independent_house"|"plot"|null,
  "transaction_type": "resale"|"new"|"under_construction"|null,
  "possession_status": "ready_to_move"|"under_construction"|null,
  "age_years": integer|null,
  "floor_number": integer|null,
  "total_floors": integer|null,
  "facing": "north"|"south"|"east"|"west"|"north_east"|"north_west"|"south_east"|"south_west"|null,
  "furnishing": "furnished"|"semi_furnished"|"unfurnished"|null,
  "bathrooms": integer|null,
  "parking_covered": integer|null,
  "parking_open": integer|null,
  "maintenance_monthly": integer|null,
  "amenities": [string, ...],
  "description": string|null,
  "image_urls": [string, ...],
  "confidence_notes": string
}`

const EXTRACT_PARAMETERS = {
  type: 'object',
  properties: {
    society_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    tower: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    unit_number: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    sector: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    city: {
      anyOf: [
        { type: 'string', enum: ['Noida', 'Greater Noida', 'Noida Extension', 'Other'] },
        { type: 'null' },
      ],
    },
    bhk: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    carpet_sqft: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    super_sqft: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    listing_price_inr: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    latitude: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    longitude: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    broker_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    broker_phone: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    broker_agency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    property_type: {
      anyOf: [
        {
          type: 'string',
          enum: ['apartment', 'villa', 'builder_floor', 'independent_house', 'plot'],
        },
        { type: 'null' },
      ],
    },
    transaction_type: {
      anyOf: [
        { type: 'string', enum: ['resale', 'new', 'under_construction'] },
        { type: 'null' },
      ],
    },
    possession_status: {
      anyOf: [
        { type: 'string', enum: ['ready_to_move', 'under_construction'] },
        { type: 'null' },
      ],
    },
    age_years: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    floor_number: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    total_floors: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    facing: {
      anyOf: [
        {
          type: 'string',
          enum: [
            'north',
            'south',
            'east',
            'west',
            'north_east',
            'north_west',
            'south_east',
            'south_west',
          ],
        },
        { type: 'null' },
      ],
    },
    furnishing: {
      anyOf: [
        { type: 'string', enum: ['furnished', 'semi_furnished', 'unfurnished'] },
        { type: 'null' },
      ],
    },
    bathrooms: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    parking_covered: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    parking_open: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    maintenance_monthly: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    amenities: { type: 'array', items: { type: 'string' }, maxItems: 40 },
    description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    image_urls: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    confidence_notes: { type: 'string' },
  },
  required: ['amenities', 'image_urls', 'confidence_notes'],
} as const

function userPrompt(url: string, cleaned: string) {
  return `Source URL: ${url}\n\nPage content (HTML with script/style/svg stripped, may be truncated):\n\n${cleaned}`
}

async function extractWithAnthropic(url: string, cleaned: string): Promise<unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: [
      { type: 'text', text: EXTRACTION_SYSTEM, cache_control: { type: 'ephemeral' } },
    ],
    tools: [
      {
        name: 'extract_property',
        description: 'Record the extracted property fields.',
        input_schema: EXTRACT_PARAMETERS as unknown as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_property' },
    messages: [{ role: 'user', content: userPrompt(url, cleaned) }],
  })
  const tu = resp.content.find((c) => c.type === 'tool_use')
  if (!tu || tu.type !== 'tool_use') throw new Error('Anthropic returned no tool_use block')
  return tu.input
}

async function extractWithGroq(url: string, cleaned: string): Promise<unknown> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  const resp = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${EXTRACTION_SYSTEM}\n\n${GROQ_JSON_INSTRUCTIONS}` },
      { role: 'user', content: userPrompt(url, cleaned) },
    ],
  })
  const content = resp.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq returned empty content')
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error(`Groq returned invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`)
  }
}

export async function extractProperty(url: string, html: string): Promise<ExtractedProperty> {
  const cleaned = stripHtmlForLlm(html)
  const raw =
    PROVIDER === 'groq'
      ? await extractWithGroq(url, cleaned.slice(0, GROQ_CHAR_CAP))
      : await extractWithAnthropic(url, cleaned.slice(0, ANTHROPIC_CHAR_CAP))
  return coerceExtraction(raw)
}

function coerceExtraction(raw: unknown): ExtractedProperty {
  let obj: Record<string, unknown> = {}
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null) {
    obj = raw[0] as Record<string, unknown>
  } else if (typeof raw === 'object' && raw !== null) {
    obj = raw as Record<string, unknown>
  }
  // Unwrap wrappers like { parameters: {...} } or { input: {...} } or { arguments: {...} }
  for (const key of ['parameters', 'input', 'arguments']) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj = obj[key] as Record<string, unknown>
      break
    }
  }

  return {
    society_name: coerceString(obj.society_name),
    tower: coerceString(obj.tower),
    unit_number: coerceString(obj.unit_number),
    sector: coerceString(obj.sector),
    city: coerceCity(obj.city),
    bhk: coerceInt(obj.bhk),
    carpet_sqft: coerceInt(obj.carpet_sqft),
    super_sqft: coerceInt(obj.super_sqft),
    listing_price_inr: coerceInt(obj.listing_price_inr),
    latitude: coerceFloat(obj.latitude),
    longitude: coerceFloat(obj.longitude),
    broker_name: coerceString(obj.broker_name),
    broker_phone: coerceString(obj.broker_phone),
    broker_agency: coerceString(obj.broker_agency),
    property_type: coerceEnum(obj.property_type, [
      'apartment',
      'villa',
      'builder_floor',
      'independent_house',
      'plot',
    ]),
    transaction_type: coerceEnum(obj.transaction_type, [
      'resale',
      'new',
      'under_construction',
    ]),
    possession_status: coerceEnum(obj.possession_status, [
      'ready_to_move',
      'under_construction',
    ]),
    age_years: coerceInt(obj.age_years),
    floor_number: coerceInt(obj.floor_number),
    total_floors: coerceInt(obj.total_floors),
    facing: coerceFacing(obj.facing),
    furnishing: coerceEnum(obj.furnishing, ['furnished', 'semi_furnished', 'unfurnished']),
    bathrooms: coerceInt(obj.bathrooms),
    parking_covered: coerceInt(obj.parking_covered),
    parking_open: coerceInt(obj.parking_open),
    maintenance_monthly: coerceInt(obj.maintenance_monthly),
    amenities: coerceStringArray(obj.amenities),
    description: coerceString(obj.description),
    image_urls: coerceImageUrls(obj.image_urls),
    confidence_notes: coerceString(obj.confidence_notes) ?? '',
  }
}

function coerceEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  const s = coerceString(v)
  if (!s) return null
  const normalized = s.toLowerCase().replace(/[\s\-]+/g, '_')
  const direct = allowed.find((x) => x === normalized)
  if (direct) return direct
  return null
}

function coerceFacing(
  v: unknown,
):
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north_east'
  | 'north_west'
  | 'south_east'
  | 'south_west'
  | null {
  const s = coerceString(v)
  if (!s) return null
  const normalized = s.toLowerCase().trim().replace(/[\s\-]+/g, '_')
  const aliases: Record<string, 'north' | 'south' | 'east' | 'west' | 'north_east' | 'north_west' | 'south_east' | 'south_west'> = {
    ne: 'north_east',
    nw: 'north_west',
    se: 'south_east',
    sw: 'south_west',
    northeast: 'north_east',
    northwest: 'north_west',
    southeast: 'south_east',
    southwest: 'south_west',
  }
  if (aliases[normalized]) return aliases[normalized]
  const valid = [
    'north',
    'south',
    'east',
    'west',
    'north_east',
    'north_west',
    'south_east',
    'south_west',
  ] as const
  return (valid as readonly string[]).includes(normalized)
    ? (normalized as (typeof valid)[number])
    : null
}

function coerceStringArray(v: unknown): string[] {
  const out: string[] = []
  if (!v) return out
  const add = (s: string) => {
    const t = s.trim()
    if (!t) return
    if (t.toLowerCase() === 'null') return
    out.push(t)
  }
  if (typeof v === 'string') {
    for (const part of v.split(/[,;\n]+/)) add(part)
  } else if (Array.isArray(v)) {
    for (const item of v) {
      if (typeof item === 'string') {
        for (const part of item.split(/[,;\n]+/)) add(part)
      }
    }
  }
  return Array.from(new Set(out))
}

function coerceString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t || t.toLowerCase() === 'null') return null
    return t
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return null
}

function coerceInt(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t || t.toLowerCase() === 'null') return null
    const cleaned = t.replace(/[^\d.-]/g, '')
    if (!cleaned) return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  return null
}

function coerceFloat(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t || t.toLowerCase() === 'null') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function coerceImageUrls(v: unknown): string[] {
  const out: string[] = []
  if (!v) return out
  if (typeof v === 'string') {
    for (const part of v.split(/[\s,]+/)) {
      if (/^https?:\/\//.test(part)) out.push(part)
    }
    return out
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      if (typeof item === 'string') {
        for (const part of item.split(/[\s,]+/)) {
          if (/^https?:\/\//.test(part)) out.push(part)
        }
      }
    }
    return out
  }
  return out
}

function coerceCity(v: unknown): ExtractedProperty['city'] {
  const s = coerceString(v)
  if (!s) return null
  const valid = ['Noida', 'Greater Noida', 'Noida Extension', 'Other'] as const
  const match = valid.find((x) => x.toLowerCase() === s.toLowerCase())
  return match ?? null
}
