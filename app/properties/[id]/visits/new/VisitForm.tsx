'use client'

import { useState, useTransition } from 'react'
import { Camera, ImagePlus, Save, X } from 'lucide-react'
import { createVisit, type CreateVisitState } from '../actions'
import { compressImage } from '@/lib/image'
import { Avatar } from '@/components/Avatar'

type MemberSlot = {
  userId: string
  displayName: string
}

type Props = {
  propertyId: string
  memberSlots: MemberSlot[]
  currentUserId: string
}

type PhotoItem = { id: string; blob: Blob; url: string; name: string }

const todayInputValue = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function VisitForm({ propertyId, memberSlots, currentUserId }: Props) {
  const [visitedAt, setVisitedAt] = useState(todayInputValue())
  const [notes, setNotes] = useState('')
  const [attendees, setAttendees] = useState<Set<string>>(() => new Set([currentUserId]))
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const toggleAttendee = (id: string) => {
    setAttendees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onPickPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy('Compressing photos…')
    setError(null)
    try {
      const toAdd: PhotoItem[] = []
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue
        const compressed = await compressImage(f, { maxWidth: 1600, quality: 0.8 })
        toAdd.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          blob: compressed,
          url: URL.createObjectURL(compressed),
          name: f.name.replace(/\.[^.]+$/, '') + '.jpg',
        })
      }
      setPhotos((prev) => [...prev, ...toAdd])
    } catch (e) {
      setError(`Compression failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setBusy(null)
    }
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('property', propertyId)
      fd.append('visited_at', visitedAt)
      fd.append('notes', notes)
      for (const uid of attendees) fd.append('attendees', uid)
      for (const p of photos) fd.append('photos', p.blob, p.name)
      const state: CreateVisitState = await createVisit({}, fd)
      if (state?.error) setError(state.error)
    })
  }

  const totalBytes = photos.reduce((s, p) => s + p.blob.size, 0)
  const totalMb = totalBytes / (1024 * 1024)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-stone-700">When?</label>
        <input
          type="date"
          value={visitedAt}
          onChange={(e) => setVisitedAt(e.target.value)}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-stone-400"
          required
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-medium text-stone-700">Who went?</div>
        <div className="flex flex-wrap gap-2">
          {memberSlots.map((m) => {
            const active = attendees.has(m.userId)
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => toggleAttendee(m.userId)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? 'border-rose-700 bg-rose-50 text-rose-900'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                }`}
              >
                <Avatar user={{ id: m.userId, display_name: m.displayName }} size="sm" />
                {m.userId === currentUserId ? 'You' : m.displayName}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-stone-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="First impressions, smells, neighbours, weird wiring…"
          className="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:bg-white"
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-stone-700">Photos</div>
          <div className="text-xs text-stone-400">{photos.length} queued</div>
        </div>

        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white transition hover:bg-rose-700"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-700 bg-rose-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-800">
            <Camera className="h-4 w-4" />
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => onPickPhotos(e.target.files)}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:border-stone-400">
            <ImagePlus className="h-4 w-4" />
            From gallery
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPickPhotos(e.target.files)}
            />
          </label>
        </div>
        {busy && <p className="mt-2 text-xs text-stone-500">{busy}</p>}
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-stone-500">
          {photos.length} photo{photos.length === 1 ? '' : 's'} · {totalMb.toFixed(1)} MB total
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || busy != null}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:opacity-50"
        >
          {pending ? (
            <>
              <span className="shimmer h-4 w-4 rounded-full bg-white/50" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save visit
            </>
          )}
        </button>
      </div>
    </div>
  )
}
