export type CasaRole = 'admin' | 'member'
export type City = 'Noida' | 'Greater Noida' | 'Noida Extension' | 'Other'
export type PropertyStatus =
  | 'exploring'
  | 'shortlisted'
  | 'visited'
  | 'rejected'
  | 'offered'
  | 'closed'
export type SourceSite =
  | 'magicbricks'
  | '99acres'
  | 'housing'
  | 'nobroker'
  | 'squareyards'
  | 'other'
export type TagPolarity = 'pro' | 'con' | 'neutral'

export const PROPERTY_TYPES = [
  'apartment',
  'villa',
  'builder_floor',
  'independent_house',
  'plot',
] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const TRANSACTION_TYPES = ['resale', 'new', 'under_construction'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const POSSESSION_STATUSES = ['ready_to_move', 'under_construction'] as const
export type PossessionStatus = (typeof POSSESSION_STATUSES)[number]

export const FACING_DIRECTIONS = [
  'north',
  'south',
  'east',
  'west',
  'north_east',
  'north_west',
  'south_east',
  'south_west',
] as const
export type Facing = (typeof FACING_DIRECTIONS)[number]

export const FURNISHING_LEVELS = ['furnished', 'semi_furnished', 'unfurnished'] as const
export type Furnishing = (typeof FURNISHING_LEVELS)[number]

export type BaseRecord = {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated?: string
}

export type UserRecord = BaseRecord & {
  email: string
  name: string
  avatar?: string
  verified: boolean
}

export type MemberRecord = BaseRecord & {
  user: string
  role: CasaRole
  display_name?: string
}

export type PropertyRecord = BaseRecord & {
  society_name: string
  society_name_normalized: string
  tower?: string
  unit_number?: string
  sector?: string
  city: City
  bhk: number
  carpet_sqft?: number
  super_sqft?: number
  listing_price?: number
  price_per_sqft?: number
  location?: { lat: number; lon: number }
  status: PropertyStatus
  dedup_cluster_id?: string
  image_urls?: string[]
  property_type?: PropertyType
  transaction_type?: TransactionType
  possession_status?: PossessionStatus
  age_years?: number
  floor_number?: number
  total_floors?: number
  facing?: Facing
  furnishing?: Furnishing
  bathrooms?: number
  parking_covered?: number
  parking_open?: number
  maintenance_monthly?: number
  amenities?: string[]
  description?: string
  created_by: string
}

export type ListingRecord = BaseRecord & {
  property?: string
  source_url: string
  source_site: SourceSite
  broker?: string
  raw_scrape?: Record<string, unknown>
  scraped_at?: string
  submitted_by: string
  verified_by_human: boolean
  verified_by?: string
  image_urls?: string[]
}

export type BrokerRecord = BaseRecord & {
  name: string
  phone: string
  agency?: string
  contact_count: number
  last_contacted_at?: string
  pitched_properties: string[]
  notes?: string
}

export type RatingRecord = BaseRecord & {
  property: string
  user: string
  score: number
  dimensions?: Record<string, number>
}

export type CommentRecord = BaseRecord & {
  property: string
  user: string
  body: string
}

export type TagRecord = BaseRecord & {
  label: string
  slug: string
  polarity: TagPolarity
}

export type PropertyTagRecord = BaseRecord & {
  property: string
  tag: string
  added_by: string
}

export type VisitRecord = BaseRecord & {
  property: string
  visited_at: string
  attendees: string[]
  notes?: string
  photos: string[]
  voice_notes: string[]
  created_by: string
}

export type RatingExpanded = RatingRecord & {
  expand?: { user?: UserRecord }
}

export type CommentExpanded = CommentRecord & {
  expand?: { user?: UserRecord }
}

export type MemberExpanded = MemberRecord & {
  expand?: { user?: UserRecord }
}

export type PropertyTagExpanded = PropertyTagRecord & {
  expand?: { tag?: TagRecord; added_by?: UserRecord }
}

export const COLLECTIONS = {
  users: 'users',
  members: 'sidnicasa_members',
  properties: 'sidnicasa_properties',
  listings: 'sidnicasa_listings',
  brokers: 'sidnicasa_brokers',
  ratings: 'sidnicasa_ratings',
  comments: 'sidnicasa_comments',
  tags: 'sidnicasa_tags',
  propertyTags: 'sidnicasa_property_tags',
  visits: 'sidnicasa_visits',
} as const
