import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'sidni casa',
    short_name: 'sidni casa',
    description: 'House hunting, together',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafaf9',
    theme_color: '#be123c',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
