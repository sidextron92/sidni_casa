# sidni_casa

Family house-hunting app for Noida. Next.js 15 + PocketBase.

## One-time setup

1. **Import the schema.** Open your PocketBase admin UI → Settings → Import collections → paste the contents of `pb_schema.json` → Review → Confirm.
2. **Add family members.** In `sidnicasa_members` (admin UI), add one row per allowlisted user with the `user` relation pointing to their row in the shared `users` collection.
3. **Install deps:** `npm install` (or `pnpm install`).
4. **Env:** copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_POCKETBASE_URL` — your PocketBase URL (public, used by both server and browser).
   - `ANTHROPIC_API_KEY` — for the URL scraper (unused until the scraper lands).
5. **Dev:** `npm run dev` → http://localhost:3000.

## CORS note

For production deploy on Vercel, make sure your PocketBase instance allows the Vercel app's origin. PocketBase by default accepts all origins; if you've restricted it, add the Vercel domain.

## Architecture

- `lib/pb.ts` — server-side PocketBase client. Reads the `pb_auth` cookie and refreshes the session.
- `lib/pb-browser.ts` — browser-side PocketBase client (for realtime subscriptions and file uploads).
- `app/actions.ts` — Server Actions. `login` verifies credentials AND membership in `sidnicasa_members`.
- `middleware.ts` — fast cookie-presence check; redirects unauthenticated users to `/login`.
- `lib/types.ts` — hand-written TypeScript types matching the PocketBase schema.

## Feature roadmap

1. Property add-from-URL flow (scrape with Claude Haiku → create listing → verify → property).
2. List view with filters (bhk, sector, price, status, tags).
3. Ratings + comments with blind-reveal.
4. PWA manifest + site-visit capture (photos compressed via compressorjs before upload).
5. Map view with Noida sector polygons.
6. Broker counter, decision matrix, badges.
