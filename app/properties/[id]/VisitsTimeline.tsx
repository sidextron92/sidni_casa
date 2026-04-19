import Link from 'next/link'
import { CalendarDays, CameraIcon, Plus } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { timeAgo } from '@/lib/format'
import { pbFileUrl } from '@/lib/files'
import type { VisitRecord } from '@/lib/types'

type Props = {
  propertyId: string
  visits: VisitRecord[]
  displayNameMap: Map<string, string>
}

export default function VisitsTimeline({ propertyId, visits, displayNameMap }: Props) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-stone-900">Visits</h2>
        <Link
          href={`/properties/${propertyId}/visits/new`}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-800"
        >
          <Plus className="h-4 w-4" />
          Log a visit
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-stone-400" />
          <p className="mt-2 text-sm text-stone-600">No visits logged yet. The next one goes here.</p>
        </div>
      ) : (
        <ol className="space-y-4">
          {visits.map((v) => (
            <VisitCard key={v.id} visit={v} displayNameMap={displayNameMap} />
          ))}
        </ol>
      )}
    </section>
  )
}

function VisitCard({ visit, displayNameMap }: { visit: VisitRecord; displayNameMap: Map<string, string> }) {
  const photos = Array.isArray(visit.photos) ? visit.photos : []
  const attendees = Array.isArray(visit.attendees) ? visit.attendees : []
  const visitedDate = new Date(visit.visited_at)
  const friendlyDate = visitedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'short',
  })

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-stone-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {friendlyDate}
          </div>
          <div className="text-xs text-stone-400">logged {timeAgo(visit.created)}</div>
        </div>
        {attendees.length > 0 && (
          <div className="flex -space-x-2">
            {attendees.map((uid) => (
              <Avatar
                key={uid}
                user={{ id: uid, display_name: displayNameMap.get(uid) ?? 'Family member' }}
                size="sm"
                ring
              />
            ))}
          </div>
        )}
      </div>

      {visit.notes && (
        <p className="mb-3 whitespace-pre-wrap rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
          {visit.notes}
        </p>
      )}

      {photos.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            <CameraIcon className="h-3 w-3" />
            {photos.length} photo{photos.length === 1 ? '' : 's'}
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {photos.map((filename) => {
              const thumb = pbFileUrl(visit, filename, '320x240')
              const full = pbFileUrl(visit, filename)
              return (
                <a
                  key={filename}
                  href={full}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg border border-stone-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                </a>
              )
            })}
          </div>
        </div>
      )}

    </li>
  )
}
