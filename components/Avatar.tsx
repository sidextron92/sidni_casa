import { avatarColorFor, initialsFor, type AvatarSeed } from '@/lib/avatar'

type Props = {
  user: AvatarSeed
  size?: 'sm' | 'md' | 'lg'
  ring?: boolean
}

const SIZES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-base',
}

export function Avatar({ user, size = 'md', ring }: Props) {
  const color = avatarColorFor(user.id)
  const initials = initialsFor(user)
  const ringCls = ring ? 'ring-2 ring-white shadow-sm' : ''

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZES[size]} ${ringCls}`}
      style={{ backgroundColor: color }}
      title={user.display_name ?? user.name ?? user.email ?? ''}
    >
      {initials}
    </span>
  )
}
