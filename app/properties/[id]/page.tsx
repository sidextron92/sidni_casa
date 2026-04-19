import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Bath,
  Building2,
  CalendarCheck,
  Car,
  Compass,
  ExternalLink,
  Home,
  Layers,
  MapPin,
  Phone,
  Sofa,
  Wallet,
} from 'lucide-react'
import { getServerClient } from '@/lib/pb'
import {
  COLLECTIONS,
  type BrokerRecord,
  type CommentRecord,
  type ListingRecord,
  type MemberRecord,
  type PropertyRecord,
  type PropertyTagExpanded,
  type RatingRecord,
  type TagRecord,
  type UserRecord,
} from '@/lib/types'
import { displayNameFor } from '@/lib/avatar'
import { formatINR, formatPerSqft, formatSqft, humanizeEnum } from '@/lib/format'
import RatingsPanel from './RatingsPanel'
import CommentsPanel from './CommentsPanel'
import TagsPanel from './TagsPanel'
import VisitsTimeline from './VisitsTimeline'
import StatusBar from './StatusBar'
import ScoreCard from './ScoreCard'
import { buildScoreContext, computeScore } from '@/lib/score'
import type { VisitRecord } from '@/lib/types'

type PageProps = { params: Promise<{ id: string }> }

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params
  const pb = await getServerClient()
  if (!pb.authStore.isValid) redirect('/login')
  const currentUser = pb.authStore.record as unknown as UserRecord

  let property: PropertyRecord
  try {
    property = await pb.collection(COLLECTIONS.properties).getOne<PropertyRecord>(id)
  } catch {
    notFound()
  }

  const [listings, ratings, comments, propertyTags, masterTags, members, visits] = await Promise.all([
    pb.collection(COLLECTIONS.listings).getFullList<ListingRecord>({
      filter: `property = "${id}"`,
      sort: '-created',
    }).catch(() => []),
    pb.collection(COLLECTIONS.ratings).getFullList<RatingRecord>({
      filter: `property = "${id}"`,
    }).catch(() => []),
    pb.collection(COLLECTIONS.comments).getFullList<CommentRecord>({
      filter: `property = "${id}"`,
      sort: 'created',
    }).catch(() => []),
    pb.collection(COLLECTIONS.propertyTags).getFullList<PropertyTagExpanded>({
      filter: `property = "${id}"`,
      expand: 'tag',
    }).catch(() => []),
    pb.collection(COLLECTIONS.tags).getFullList<TagRecord>({ sort: 'label' }).catch(() => []),
    pb.collection(COLLECTIONS.members).getFullList<MemberRecord>().catch(() => []),
    pb.collection(COLLECTIONS.visits).getFullList<VisitRecord>({
      filter: `property = "${id}"`,
      sort: '-visited_at',
    }).catch(() => []),
  ])

  // Build user-id → display name map from members. Fall back to current auth user for self.
  const displayNameMap = new Map<string, string>()
  for (const m of members) {
    const name = m.display_name?.trim() || `Member ${m.id.slice(-4)}`
    displayNameMap.set(m.user, name)
  }
  const currentUserDisplayName = displayNameFor({
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    display_name: displayNameMap.get(currentUser.id),
  })
  displayNameMap.set(currentUser.id, currentUserDisplayName)

  const memberSlots = members.map((m) => ({
    userId: m.user,
    displayName: displayNameMap.get(m.user) ?? 'Family member',
  }))
  // Ensure current user is represented even if their member row has no display_name yet.
  if (!memberSlots.some((m) => m.userId === currentUser.id)) {
    memberSlots.unshift({ userId: currentUser.id, displayName: currentUserDisplayName })
  }

  const ratingByUserId: Record<string, number> = {}
  for (const r of ratings) ratingByUserId[r.user] = r.score

  const commentsDisplay = comments.map((c) => ({
    id: c.id,
    userId: c.user,
    displayName: displayNameMap.get(c.user) ?? 'Family member',
    body: c.body,
    created: c.created,
  }))

  const displayNameMapForTimeline = new Map(displayNameMap)

  const allProperties = await pb
    .collection(COLLECTIONS.properties)
    .getFullList<PropertyRecord>()
    .catch(() => [property])
  const context = buildScoreContext(allProperties, members.length || 1)
  const score = computeScore(property, ratings, propertyTags, context)

  const brokerIds = Array.from(new Set(listings.map((l) => l.broker).filter(Boolean) as string[]))
  const brokers: BrokerRecord[] = []
  for (const bid of brokerIds) {
    try {
      brokers.push(await pb.collection(COLLECTIONS.brokers).getOne<BrokerRecord>(bid))
    } catch {}
  }

  const images = (property.image_urls ?? []).filter((u) => /^https?:\/\//.test(u))
  const cover = images[0]
  const amenities = property.amenities ?? []

  const subtitle = [property.sector, property.city].filter(Boolean).join(' · ')

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="mb-6 text-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-stone-500 transition hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </nav>

      {/* Hero */}
      <section className="mb-8">
        {cover ? (
          <div className="mb-4 grid grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="col-span-4 row-span-2 h-64 w-full object-cover sm:col-span-2 sm:h-[420px]"
              loading="eager"
            />
            {images.slice(1, 5).map((u, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={u}
                src={u}
                alt=""
                className={`hidden sm:block h-[207px] w-full object-cover ${i === 1 || i === 3 ? '' : ''}`}
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className="mb-4 h-56 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200" />
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-900">
              {humanizeEnum(property.status)}
            </span>
            <h1 className="mt-2 font-display text-4xl leading-tight text-stone-900 sm:text-5xl">
              {property.society_name}
            </h1>
            {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-stone-900">{formatINR(property.listing_price)}</div>
            <div className="text-sm text-stone-500">{formatPerSqft(property.price_per_sqft)}</div>
          </div>
        </div>
      </section>

      <StatusBar propertyId={property.id} status={property.status} />

      {/* Quick facts */}
      <section className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact icon={Home} label="Configuration" value={`${property.bhk}BHK`} />
        <Fact icon={Layers} label="Size" value={formatSqft(property.super_sqft || property.carpet_sqft)} />
        <Fact
          icon={Building2}
          label="Floor"
          value={
            property.floor_number != null || property.total_floors != null
              ? `${property.floor_number ?? '?'}${property.total_floors ? ` of ${property.total_floors}` : ''}`
              : '—'
          }
        />
        <Fact icon={Compass} label="Facing" value={humanizeEnum(property.facing)} />
      </section>

      <ScoreCard score={score} />

      {/* Family says — Phase 3 trio */}
      <section className="mb-10 space-y-5">
        <TagsPanel propertyId={property.id} propertyTags={propertyTags} masterTags={masterTags} />
        <RatingsPanel
          propertyId={property.id}
          members={memberSlots}
          ratingByUserId={ratingByUserId}
          currentUserId={currentUser.id}
        />
        <CommentsPanel
          propertyId={property.id}
          comments={commentsDisplay}
          currentUserId={currentUser.id}
          currentUserDisplayName={currentUserDisplayName}
        />
      </section>

      <VisitsTimeline
        propertyId={property.id}
        visits={visits}
        displayNameMap={displayNameMapForTimeline}
      />

      {/* Amenities */}
      {amenities.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl text-stone-900">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {amenities.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 shadow-sm"
              >
                {humanizeEnum(a)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Details grid */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-stone-900">The specifics</h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <DetailRow icon={Home} label="Property type" value={humanizeEnum(property.property_type)} />
          <DetailRow icon={CalendarCheck} label="Transaction" value={humanizeEnum(property.transaction_type)} />
          <DetailRow icon={CalendarCheck} label="Possession" value={humanizeEnum(property.possession_status)} />
          <DetailRow icon={CalendarCheck} label="Age" value={property.age_years != null ? `${property.age_years} yrs` : '—'} />
          <DetailRow icon={Layers} label="Carpet area" value={formatSqft(property.carpet_sqft)} />
          <DetailRow icon={Layers} label="Super area" value={formatSqft(property.super_sqft)} />
          <DetailRow icon={Sofa} label="Furnishing" value={humanizeEnum(property.furnishing)} />
          <DetailRow icon={Bath} label="Bathrooms" value={property.bathrooms != null ? String(property.bathrooms) : '—'} />
          <DetailRow
            icon={Car}
            label="Parking"
            value={
              property.parking_covered == null && property.parking_open == null
                ? '—'
                : `${property.parking_covered ?? 0} covered · ${property.parking_open ?? 0} open`
            }
          />
          <DetailRow
            icon={Wallet}
            label="Maintenance"
            value={property.maintenance_monthly ? `${formatINR(property.maintenance_monthly)}/month` : '—'}
          />
          {property.tower && <DetailRow icon={Building2} label="Tower" value={property.tower} />}
          {property.unit_number && <DetailRow icon={Home} label="Unit" value={property.unit_number} />}
          {property.location && (
            <DetailRow
              icon={MapPin}
              label="Coordinates"
              value={
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${property.location.lat},${property.location.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-rose-700"
                >
                  Open in Maps
                </a>
              }
            />
          )}
        </div>
      </section>

      {property.description && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl text-stone-900">The pitch</h2>
          <p className="whitespace-pre-wrap rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-700 shadow-sm">
            {property.description}
          </p>
        </section>
      )}

      {brokers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl text-stone-900">Brokers who pitched this</h2>
          <div className="space-y-2">
            {brokers.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <div className="font-medium text-stone-900">{b.name}</div>
                  <div className="text-xs text-stone-500">
                    {[b.agency, `${b.contact_count ?? 0} contact${b.contact_count === 1 ? '' : 's'}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <a
                  href={`tel:${b.phone}`}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-700 hover:bg-stone-50"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {b.phone}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {listings.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl text-stone-900">Listing sources</h2>
          <ul className="space-y-1.5">
            {listings.map((l) => (
              <li key={l.id}>
                <a
                  href={l.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-rose-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {l.source_site} · {new URL(l.source_url).pathname.slice(0, 60)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-stone-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-display text-xl text-stone-900">{value}</div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
      <div className="inline-flex items-center gap-2 text-sm text-stone-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-right text-sm font-medium text-stone-800">{value}</div>
    </div>
  )
}
