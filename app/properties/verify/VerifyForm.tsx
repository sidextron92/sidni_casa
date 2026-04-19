'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { verifyListing, type VerifyState } from '@/app/properties/actions'
import type { PropertyRecord } from '@/lib/types'
import type { PendingExtraction } from '@/lib/pending'

type Props = {
  pending: PendingExtraction
  candidates: PropertyRecord[]
}

const initial: VerifyState = {}

export default function VerifyForm({ pending, candidates }: Props) {
  const [state, action, formPending] = useActionState(verifyListing, initial)
  const [linkTo, setLinkTo] = useState('')

  const extracted = pending.extracted as unknown as Record<string, unknown>

  const s = (k: string) => {
    const v = extracted[k]
    return typeof v === 'string' ? v : ''
  }
  const n = (k: string) => {
    const v = extracted[k]
    return typeof v === 'number' ? String(v) : ''
  }
  const arr = (k: string): string[] => {
    const v = extracted[k]
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string')
  }
  const amenitiesPrefill = arr('amenities').join(', ')

  const confidence = typeof extracted.confidence_notes === 'string' ? extracted.confidence_notes : ''
  const rawImages = Array.isArray(extracted.image_urls) ? (extracted.image_urls as unknown[]) : []
  const images = Array.from(
    new Set(
      rawImages.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)),
    ),
  )
  const [keptImages, setKeptImages] = useState<string[]>(images)
  const toggleImage = (u: string) => {
    setKeptImages((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]))
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-6 text-sm">
        <Link href="/" className="text-neutral-500 hover:text-neutral-900">
          ← Home
        </Link>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold">Verify listing</h1>
      <p className="mb-6 truncate text-sm text-neutral-600">
        Source:{' '}
        <a className="underline" href={pending.url} target="_blank" rel="noreferrer">
          {pending.url}
        </a>
      </p>

      {confidence && (
        <div className="mb-6 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Extractor notes: {confidence}
        </div>
      )}

      {images.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Extracted images ({keptImages.length} kept of {images.length})
          </h2>
          <p className="mb-3 text-xs text-neutral-500">Click a thumbnail to exclude it. Only kept images are saved.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.map((u) => {
              const kept = keptImages.includes(u)
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => toggleImage(u)}
                  className={`group relative overflow-hidden rounded border ${kept ? 'border-neutral-300' : 'border-red-300 opacity-40'}`}
                  title={u}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" loading="lazy" className="h-32 w-full object-cover" />
                  {!kept && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-semibold text-white">
                      excluded
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {candidates.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Possible duplicates</h2>
          <div className="space-y-2">
            {candidates.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-3 rounded border border-neutral-200 bg-white px-3 py-2 hover:border-neutral-400"
              >
                <input
                  type="radio"
                  name="pickCandidate"
                  className="mt-1"
                  checked={linkTo === c.id}
                  onChange={() => setLinkTo(c.id)}
                />
                <div className="text-sm">
                  <div className="font-medium">{c.society_name}</div>
                  <div className="text-neutral-500">
                    {[c.sector, c.tower, c.unit_number, `${c.bhk}BHK`, c.city].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 px-3 text-sm text-neutral-600">
              <input
                type="radio"
                name="pickCandidate"
                checked={linkTo === ''}
                onChange={() => setLinkTo('')}
              />
              None of these — create a new property.
            </label>
          </div>
        </section>
      )}

      <form action={action} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input type="hidden" name="linkTo" value={linkTo} />
        {keptImages.map((u) => (
          <input key={u} type="hidden" name="image_urls" value={u} />
        ))}

        <Field label="Society / Building name" name="society_name" defaultValue={s('society_name')} required disabled={!!linkTo} />
        <Field label="Sector" name="sector" defaultValue={s('sector')} disabled={!!linkTo} />
        <Field label="Tower" name="tower" defaultValue={s('tower')} disabled={!!linkTo} />
        <Field label="Unit number" name="unit_number" defaultValue={s('unit_number')} disabled={!!linkTo} />

        <SelectField
          label="City"
          name="city"
          defaultValue={s('city') || 'Noida'}
          disabled={!!linkTo}
          options={['Noida', 'Greater Noida', 'Noida Extension', 'Other']}
        />
        <Field label="BHK" name="bhk" type="number" defaultValue={n('bhk')} required disabled={!!linkTo} />

        <Field label="Carpet (sqft)" name="carpet_sqft" type="number" defaultValue={n('carpet_sqft')} disabled={!!linkTo} />
        <Field label="Super (sqft)" name="super_sqft" type="number" defaultValue={n('super_sqft')} disabled={!!linkTo} />
        <Field label="Listing price (₹)" name="listing_price" type="number" defaultValue={n('listing_price_inr')} />

        <Field
          label="Latitude"
          name="latitude"
          type="number"
          step="any"
          defaultValue={n('latitude')}
          disabled={!!linkTo}
        />
        <Field
          label="Longitude"
          name="longitude"
          type="number"
          step="any"
          defaultValue={n('longitude')}
          disabled={!!linkTo}
        />

        <div className="col-span-full mt-2 border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Status</h2>
        </div>
        <SelectField
          label="Property type"
          name="property_type"
          defaultValue={s('property_type')}
          disabled={!!linkTo}
          options={['', 'apartment', 'villa', 'builder_floor', 'independent_house', 'plot']}
        />
        <SelectField
          label="Transaction"
          name="transaction_type"
          defaultValue={s('transaction_type')}
          disabled={!!linkTo}
          options={['', 'resale', 'new', 'under_construction']}
        />
        <SelectField
          label="Possession"
          name="possession_status"
          defaultValue={s('possession_status')}
          disabled={!!linkTo}
          options={['', 'ready_to_move', 'under_construction']}
        />
        <Field
          label="Age (years, resale)"
          name="age_years"
          type="number"
          defaultValue={n('age_years')}
          disabled={!!linkTo}
        />

        <div className="col-span-full mt-2 border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Layout</h2>
        </div>
        <Field
          label="Floor number"
          name="floor_number"
          type="number"
          defaultValue={n('floor_number')}
          disabled={!!linkTo}
        />
        <Field
          label="Total floors in tower"
          name="total_floors"
          type="number"
          defaultValue={n('total_floors')}
          disabled={!!linkTo}
        />
        <SelectField
          label="Facing"
          name="facing"
          defaultValue={s('facing')}
          disabled={!!linkTo}
          options={[
            '',
            'north',
            'south',
            'east',
            'west',
            'north_east',
            'north_west',
            'south_east',
            'south_west',
          ]}
        />
        <Field
          label="Bathrooms"
          name="bathrooms"
          type="number"
          defaultValue={n('bathrooms')}
          disabled={!!linkTo}
        />

        <div className="col-span-full mt-2 border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Furnishing, parking & maintenance
          </h2>
        </div>
        <SelectField
          label="Furnishing"
          name="furnishing"
          defaultValue={s('furnishing')}
          disabled={!!linkTo}
          options={['', 'furnished', 'semi_furnished', 'unfurnished']}
        />
        <Field
          label="Maintenance (₹/month)"
          name="maintenance_monthly"
          type="number"
          defaultValue={n('maintenance_monthly')}
          disabled={!!linkTo}
        />
        <Field
          label="Parking (covered)"
          name="parking_covered"
          type="number"
          defaultValue={n('parking_covered')}
          disabled={!!linkTo}
        />
        <Field
          label="Parking (open)"
          name="parking_open"
          type="number"
          defaultValue={n('parking_open')}
          disabled={!!linkTo}
        />

        <div className="col-span-full mt-2 border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Amenities</h2>
          <TextareaField
            label="Comma-separated list (e.g. pool, gym, clubhouse, power_backup)"
            name="amenities"
            defaultValue={amenitiesPrefill}
            rows={2}
            disabled={!!linkTo}
          />
        </div>

        <div className="col-span-full mt-2 border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Description</h2>
          <TextareaField
            label="Summary / notes from the listing"
            name="description"
            defaultValue={s('description')}
            rows={4}
            disabled={!!linkTo}
          />
        </div>

        <div className="col-span-full mt-2 border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Broker (optional)</h2>
        </div>
        <Field label="Broker name" name="broker_name" defaultValue={s('broker_name')} />
        <Field label="Broker phone" name="broker_phone" defaultValue={s('broker_phone')} />
        <Field label="Broker agency" name="broker_agency" defaultValue={s('broker_agency')} />

        {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}

        <div className="col-span-full">
          <button
            type="submit"
            disabled={formPending}
            className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {formPending ? 'Saving…' : linkTo ? 'Link to selected property & save listing' : 'Save as new property'}
          </button>
        </div>
      </form>
    </main>
  )
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-600">{label}</label>
      <input
        {...rest}
        className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400"
      />
    </div>
  )
}

function SelectField({
  label,
  options,
  ...rest
}: { label: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-600">{label}</label>
      <select
        {...rest}
        className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === '' ? '—' : o}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextareaField({
  label,
  ...rest
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-600">{label}</label>
      <textarea
        {...rest}
        className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400"
      />
    </div>
  )
}
