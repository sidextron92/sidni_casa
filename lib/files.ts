export function pbFileUrl(
  record: { collectionId: string; id: string },
  filename: string,
  thumb?: string,
): string {
  const base = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? ''
  const suffix = thumb ? `?thumb=${thumb}` : ''
  return `${base}/api/files/${record.collectionId}/${record.id}/${filename}${suffix}`
}
