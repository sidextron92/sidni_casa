import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
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
