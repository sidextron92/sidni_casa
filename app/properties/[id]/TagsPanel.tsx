'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, ThumbsUp, ThumbsDown, Minus, X } from 'lucide-react'
import { createAndAddTag, toggleTag } from './actions'
import type { PropertyTagExpanded, TagPolarity, TagRecord } from '@/lib/types'

type Props = {
  propertyId: string
  propertyTags: PropertyTagExpanded[]
  masterTags: TagRecord[]
}

const POLARITY_STYLES: Record<TagPolarity, { bg: string; border: string; text: string; icon: typeof ThumbsUp }> = {
  pro: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: ThumbsUp },
  con: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: ThumbsDown },
  neutral: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-700', icon: Minus },
}

export default function TagsPanel({ propertyId, propertyTags, masterTags }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingPolarity, setPendingPolarity] = useState<TagPolarity>('neutral')
  const [pending, startTransition] = useTransition()

  const attachedTagIds = useMemo(
    () => new Set(propertyTags.map((pt) => pt.expand?.tag?.id).filter(Boolean) as string[]),
    [propertyTags],
  )

  const attachedByPolarity: Record<TagPolarity, PropertyTagExpanded[]> = { pro: [], con: [], neutral: [] }
  for (const pt of propertyTags) {
    const pol = (pt.expand?.tag?.polarity as TagPolarity) || 'neutral'
    attachedByPolarity[pol].push(pt)
  }

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return masterTags.filter((t) => !attachedTagIds.has(t.id)).slice(0, 8)
    return masterTags
      .filter((t) => !attachedTagIds.has(t.id) && t.label.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, masterTags, attachedTagIds])

  const toggle = (tagId: string) => {
    startTransition(async () => {
      await toggleTag(propertyId, tagId)
    })
  }

  const create = () => {
    const label = query.trim()
    if (!label) return
    startTransition(async () => {
      const res = await createAndAddTag(propertyId, label, pendingPolarity)
      if (!res.error) {
        setQuery('')
        setShowAdd(false)
      }
    })
  }

  const renderSection = (polarity: TagPolarity, heading: string) => {
    const items = attachedByPolarity[polarity]
    if (items.length === 0) return null
    const style = POLARITY_STYLES[polarity]
    const Icon = style.icon
    return (
      <div className="mb-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
          <Icon className="h-3.5 w-3.5" />
          {heading}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((pt) => {
            const tag = pt.expand?.tag
            if (!tag) return null
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => toggle(tag.id)}
                disabled={pending}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition ${style.bg} ${style.border} ${style.text} hover:brightness-95 disabled:opacity-50`}
                title="Click to remove"
              >
                {tag.label}
                <X className="h-3 w-3 opacity-60" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-display text-xl text-stone-900">Pros &amp; cons</h3>

      {propertyTags.length === 0 && !showAdd && (
        <p className="mb-3 text-sm text-stone-500">No tags yet. Click below to highlight what&apos;s great or iffy.</p>
      )}

      {renderSection('pro', "What's awesome")}
      {renderSection('con', "What's iffy")}
      {renderSection('neutral', 'Notes')}

      {showAdd ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            {(['pro', 'con', 'neutral'] as TagPolarity[]).map((p) => {
              const s = POLARITY_STYLES[p]
              const Icon = s.icon
              const active = pendingPolarity === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPendingPolarity(p)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    active ? `${s.bg} ${s.border} ${s.text}` : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {p === 'pro' ? 'Pro' : p === 'con' ? 'Con' : 'Neutral'}
                </button>
              )
            })}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="e.g. great clubhouse, noisy road…"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                create()
              }
            }}
          />

          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((t) => {
                const s = POLARITY_STYLES[t.polarity as TagPolarity]
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    disabled={pending}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition ${s.bg} ${s.border} ${s.text} hover:brightness-95 disabled:opacity-50`}
                  >
                    + {t.label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={pending || !query.trim()}
              className="rounded-full bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              Add &quot;{query.trim() || '…'}&quot;
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false)
                setQuery('')
              }}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:border-stone-500 hover:bg-stone-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a tag
        </button>
      )}
    </section>
  )
}
