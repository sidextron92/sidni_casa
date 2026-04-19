# sidni_casa — Roadmap

A collaborative house-hunting web app for the user, his wife, and his parents — consolidates scattered listings from Indian real-estate portals, family WhatsApp forwards, and broker calls into a single shared decision space.

## Goal

Find a 3BHK+ apartment (min 1500 sqft) in a well-maintained society (pool, gym, amenities) in and around Noida. Commute from office in Okhla Industrial Area is a factor but not a hard filter.

## Stakeholders

- User
- User's wife
- User's parents

Access is allowlist-based (~4 people). No public signup.

## Core loops

1. **Ingest** — anyone pastes a listing URL; an LLM scrapes structured fields; the human verifies; dedup runs against existing properties.
2. **Evaluate** — family rates and comments on properties, tags pros/cons, schedules and logs site visits.
3. **Decide** — shortlist → visit → final pick, informed by a weighted decision matrix.

## Stack (locked)

| Area | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |
| Database + Auth + Storage | Self-hosted PocketBase 0.26 on the user's VPS |
| LLM for scraping | Anthropic Claude Haiku 4.5 (default); Groq Llama 3.3 / Llama 4 Scout pluggable via `LLM_PROVIDER` env |
| Mobile | PWA, mobile-first |
| Image storage | PocketBase local VPS storage, client-side compression before upload |
| Realtime / live updates | Deferred |

Auth reuses the shared `users` collection already on the VPS. A tiny `sidnicasa_members` allowlist collection scopes access. All app collections are prefixed `sidnicasa_` to stay isolated from other apps using the same PocketBase.

## Data model (9 collections)

All prefixed `sidnicasa_` except the shared `users`.

1. `sidnicasa_members` — allowlist (relation → `users`, role).
2. `sidnicasa_properties` — dedup anchor; society + tower + unit; physical, status, comfort, amenity, and description fields; images; coordinates.
3. `sidnicasa_listings` — one row per submitted URL; source site, raw scrape, links to property and broker when verified.
4. `sidnicasa_brokers` — name, phone (unique), agency, contact_count, last_contacted_at, pitched_properties.
5. `sidnicasa_ratings` — one row per (property, user); blind-reveal applied in app layer.
6. `sidnicasa_comments` — per-property threaded notes.
7. `sidnicasa_tags` — master preset chips (pool, noisy road, great clubhouse, …) with polarity.
8. `sidnicasa_property_tags` — join of property ↔ tag with added_by.
9. `sidnicasa_visits` — visit log with multi-file photos and voice notes.

## Build order

### Phase 1 — Ingest loop

1.1. Auth + membership gate (allowlist).
1.2. Paste URL → server fetches HTML → LLM extracts structured fields → human verifies on a form → property and listing created together on save.
1.3. Extraction captures: society/tower/unit/sector, city, BHK, carpet/super sqft, listing price, lat/lng, broker info, images, property type, transaction type, possession status, age, floor / total floors, facing, furnishing, bathrooms, parking (covered + open), monthly maintenance, amenities (free-form string array), and a description.
1.4. Dedup: substring fuzzy match on normalized society name surfaces candidates; user confirms or creates new.
1.5. Broker create-or-increment keyed by phone; links to the property via `pitched_properties`.

### Phase 2 — List view

2.1. Sortable, filterable list of properties: BHK, sector, price band, status, tags, amenity presence, facing, furnishing.
2.2. Table and card views. Thumbnail per row (first image). Row-level quick actions (shortlist, reject).
2.3. Property detail page: all fields, image gallery, linked listings, comments, ratings, visits.

### Phase 3 — Collaboration

3.1. Ratings per family member per property (1–10 + optional dimensions: location / value / condition / vibe).
3.2. Blind-reveal: everyone's rating hidden until all 4 members submit.
3.3. Comments (simple threaded) per property.
3.4. Pros/cons tag chips on property detail, filter by tag on list.

### Phase 4 — Mobile PWA + site visits

4.1. PWA manifest + install prompt, mobile-first CSS.
4.2. Site visit capture: attendees, notes, photos, voice notes. Photos compressed client-side (compressorjs) before upload to PocketBase.
4.3. Visit timeline on property detail.

### Phase 5 — Map view

5.1. Noida sector polygons overlay (source: ArcGIS public item first, OSM Overpass as fallback, hand-draw missing sectors in geojson.io).
5.2. Property markers with thumbnails, clickable to detail.
5.3. Toggleable layers: metros, schools, hospitals, grocery.
5.4. Sector color-coded by average family rating.

### Phase 6 — Decide loop

6.1. Decision matrix with hardcoded weights (not user-editable in UI v1): commute, price, size, amenities, locality.
6.2. Composite score column on list view.
6.3. Shortlist and offer-tracking status transitions (`exploring → shortlisted → visited → rejected → offered → closed`).

### Phase 7 — Fun layer and polish

7.1. Playful badges and streaks — "Mom: 12 suggestions this month", "Best scout: Dad (3 of your top 5 came from him)". Computed from existing data, no new tables.
7.2. Broker contact dashboard (counter-based; per-call event log deferred).
7.3. Commute score — auto-compute drive time to Okhla at 9am and 7pm via Google Maps Distance Matrix, surface as a first-class column.

## Deferred and explicitly out of scope for v1

- WhatsApp bot for URL ingestion.
- Per-call broker event log (collapsed to counter; revisit if the counter feels insufficient).
- S3 image storage (local VPS only for now).
- Property detail edit flow (manual field edits after save).
- Real-time subscriptions / live "someone just added" pings.
- Tier 2 property fields: balconies, possession_by, rera_id, ownership_type. Add if needed later.
- OAuth2, email verification, password reset flows on `users`.
- Headless-browser scraping (Playwright) for sites that block plain fetch. Fallback today is manual entry via the verify form; upgrade path is Anthropic `web_fetch` or Playwright if specific sites stay stubborn.

## Non-obvious decisions

- **Listing rows are created only at verify-save time**, not at URL submit. If fetch or LLM extraction fails, nothing hits the database — extraction state lives in a short-lived HttpOnly cookie.
- **Amenities are a free-form string array**, not a master-table join. Canonical vocabulary suggested in the LLM prompt (pool, gym, clubhouse, power_backup, security_24x7, …) but free values allowed. Master-table promotion possible later if filtering needs it.
- **Decision matrix weights are hardcoded in code**, not stored as a PocketBase collection.
- **Property-level fields hold the verified canonical values**; the original LLM scrape is preserved on the listing (`raw_scrape`). Divergence is intentional.
- **Link-to-existing property on dedup does NOT overwrite existing property fields**, only merges image URLs. Future option: fill only missing fields.

## Current status (as of 2026-04-19)

- Phase 1 complete: auth, URL submit, LLM extraction (Anthropic + Groq), verify form with dedup candidates, image grid with keep/exclude, broker counter, full property schema persisted.
- Phase 2–7 not started.
