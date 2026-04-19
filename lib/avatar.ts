const AVATAR_COLORS = [
  '#b45309',
  '#c2410c',
  '#9f1239',
  '#166534',
  '#1e40af',
  '#6b21a8',
  '#0f766e',
  '#be185d',
] as const

export type AvatarSeed = {
  id: string
  display_name?: string | null
  name?: string | null
  email?: string | null
}

export function avatarColorFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function displayNameFor(seed: AvatarSeed): string {
  return (
    seed.display_name?.trim() ||
    seed.name?.trim() ||
    seed.email?.split('@')[0] ||
    'Family member'
  )
}

export function initialsFor(seed: AvatarSeed): string {
  const source = displayNameFor(seed)
  const parts = source.split(/\s+/).slice(0, 2)
  return (
    parts
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}
