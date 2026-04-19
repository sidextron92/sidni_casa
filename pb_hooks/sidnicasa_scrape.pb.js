/// <reference path="../pb_data/types.d.ts" />

// Registers GET /api/sidnicasa/proxy-fetch on the PocketBase VPS.
// Fetches a target URL server-side using the VPS's IP (not Vercel's) so that
// real-estate portals which IP-block cloud ranges still return real HTML.
//
// Security:
//   - Requires an authenticated PB user (middleware: $apis.requireAuth("users")).
//   - Additionally requires the user to be allowlisted in sidnicasa_members.
//   - Refuses private / link-local / loopback hostnames.
//   - Hard-caps response body to 500 KB to prevent memory abuse.
//
// Deploy:
//   - Copy this file to your PB instance at pb_hooks/sidnicasa_scrape.pb.js.
//   - Restart PocketBase (e.g. `docker compose restart pocketbase`).

routerAdd(
  'GET',
  '/api/sidnicasa/proxy-fetch',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { message: 'unauthenticated' })
    }

    // Membership check.
    let member
    try {
      member = $app.findFirstRecordByFilter(
        'sidnicasa_members',
        'user = {:uid}',
        { uid: authRecord.id },
      )
    } catch {
      member = null
    }
    if (!member) {
      return e.json(403, { message: 'not a sidni_casa member' })
    }

    const raw = e.request.url.query().get('url')
    if (!raw) {
      return e.json(400, { message: "query param 'url' is required" })
    }

    // Goja-safe URL parsing (no new URL() available in PocketBase's JS runtime).
    // Captures: [full, scheme, host, port?]
    const urlMatch = /^(https?):\/\/([^\/\?#:\s]+)(?::(\d+))?(?:[\/\?#]|$)/i.exec(raw)
    if (!urlMatch) {
      return e.json(400, { message: 'invalid url' })
    }
    const host = urlMatch[2].toLowerCase()

    const privateRe =
      /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/
    if (privateRe.test(host) || host.endsWith('.internal') || host.endsWith('.local')) {
      return e.json(400, { message: 'private / loopback addresses are not allowed' })
    }

    let res
    try {
      res = $http.send({
        url: raw,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua':
            '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 25,
      })
    } catch (err) {
      return e.json(502, {
        message: 'upstream fetch failed',
        detail: String(err && err.message ? err.message : err),
      })
    }

    if (res.statusCode >= 400) {
      return e.json(res.statusCode, {
        message: 'upstream returned error',
        upstreamStatus: res.statusCode,
      })
    }

    // res.body is a Go []byte in Goja — stringifying it joins with commas.
    // Forward the raw bytes via e.blob to preserve UTF-8.
    return e.blob(200, 'text/html; charset=utf-8', res.body)
  },
  $apis.requireAuth('users'),
)
