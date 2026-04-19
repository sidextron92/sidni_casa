#!/usr/bin/env node
/* eslint-disable */
import PocketBase from 'pocketbase'

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL
const EMAIL = process.env.PB_SUPERUSER_EMAIL
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD

if (!PB_URL || !EMAIL || !PASSWORD) {
  console.error(
    'Missing env. Set NEXT_PUBLIC_POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD and re-run.',
  )
  process.exit(1)
}

const TAGS = [
  // Pros — what's awesome
  { label: 'Swimming pool', polarity: 'pro' },
  { label: 'Gym', polarity: 'pro' },
  { label: 'Great clubhouse', polarity: 'pro' },
  { label: 'Kids play area', polarity: 'pro' },
  { label: 'Jogging track', polarity: 'pro' },
  { label: '24x7 security', polarity: 'pro' },
  { label: 'Power backup', polarity: 'pro' },
  { label: 'Gated community', polarity: 'pro' },
  { label: 'Covered parking', polarity: 'pro' },
  { label: 'Metro nearby', polarity: 'pro' },
  { label: 'Park view', polarity: 'pro' },
  { label: 'Corner unit', polarity: 'pro' },
  { label: 'East facing', polarity: 'pro' },
  { label: 'Cross ventilation', polarity: 'pro' },
  { label: 'Reputed builder', polarity: 'pro' },
  { label: 'Well maintained', polarity: 'pro' },
  { label: 'Low maintenance charges', polarity: 'pro' },
  { label: 'Modular kitchen', polarity: 'pro' },
  { label: 'Wardrobes included', polarity: 'pro' },
  { label: 'Close to schools', polarity: 'pro' },

  // Cons — what's iffy
  { label: 'Noisy road', polarity: 'con' },
  { label: 'Low floor', polarity: 'con' },
  { label: 'Top floor heat', polarity: 'con' },
  { label: 'Small kitchen', polarity: 'con' },
  { label: 'Small balcony', polarity: 'con' },
  { label: 'Waterlogging risk', polarity: 'con' },
  { label: 'Far from metro', polarity: 'con' },
  { label: 'Bad natural light', polarity: 'con' },
  { label: 'Old society', polarity: 'con' },
  { label: 'High maintenance charges', polarity: 'con' },
  { label: 'Limited parking', polarity: 'con' },
  { label: 'West facing', polarity: 'con' },
  { label: 'Heavy traffic area', polarity: 'con' },
  { label: 'Unreputed builder', polarity: 'con' },
  { label: 'Possession delays risk', polarity: 'con' },

  // Neutral notes
  { label: 'Resale', polarity: 'neutral' },
  { label: 'New construction', polarity: 'neutral' },
  { label: 'Under RERA', polarity: 'neutral' },
  { label: 'Pet friendly', polarity: 'neutral' },
  { label: 'Family only', polarity: 'neutral' },
]

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const pb = new PocketBase(PB_URL)
try {
  await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD)
} catch (e) {
  console.error('Superuser login failed:', e?.message ?? e)
  process.exit(1)
}

let added = 0
let skipped = 0
let failed = 0

for (const t of TAGS) {
  const slug = slugify(t.label)
  if (!slug) {
    failed += 1
    console.log(`FAIL  ${t.label}  (empty slug)`)
    continue
  }
  try {
    await pb.collection('sidnicasa_tags').create({
      label: t.label,
      slug,
      polarity: t.polarity,
    })
    added += 1
    console.log(`ADD   ${t.label}  [${t.polarity}]`)
  } catch (e) {
    const msg =
      e?.response?.data?.slug?.message ||
      e?.response?.data?.label?.message ||
      e?.message ||
      'unknown error'
    if (/unique|already exists/i.test(msg)) {
      skipped += 1
      console.log(`SKIP  ${t.label}  (exists)`)
    } else {
      failed += 1
      console.log(`FAIL  ${t.label}  ${msg}`)
    }
  }
}

console.log(`\n${added} added, ${skipped} skipped (already existed), ${failed} failed.`)
