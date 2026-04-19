import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async rewrites() {
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL
    if (!pbUrl) return []
    return [
      {
        source: '/pb/:path*',
        destination: `${pbUrl}/:path*`,
      },
    ]
  },
}

export default config
