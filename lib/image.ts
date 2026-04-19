'use client'

import Compressor from 'compressorjs'

export async function compressImage(
  file: File,
  opts: { maxWidth?: number; quality?: number; mimeType?: string } = {},
): Promise<Blob> {
  const { maxWidth = 1600, quality = 0.8, mimeType = 'image/jpeg' } = opts
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      maxWidth,
      maxHeight: maxWidth,
      quality,
      mimeType,
      convertTypes: ['image/png', 'image/webp'],
      convertSize: 500_000,
      success: (result) => resolve(result as Blob),
      error: reject,
    })
  })
}
