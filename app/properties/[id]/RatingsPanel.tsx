'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { rateProperty } from './actions'

type MemberSlot = {
  userId: string
  displayName: string
}

type Props = {
  propertyId: string
  members: MemberSlot[]
  ratingByUserId: Record<string, number>
  currentUserId: string
}

export default function RatingsPanel({ propertyId, members, ratingByUserId, currentUserId }: Props) {
  const everyoneRated =
    members.length > 0 && members.every((m) => ratingByUserId[m.userId] != null)

  const myRating = ratingByUserId[currentUserId] ?? null
  const [selectedScore, setSelectedScore] = useState<number | null>(myRating)
  const [pending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const submit = (score: number) => {
    setSelectedScore(score)
    setErrorMsg(null)
    startTransition(async () => {
      const res = await rateProperty(propertyId, score)
      if (res.error) setErrorMsg(res.error)
    })
  }

  const scores = Object.values(ratingByUserId)
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const remaining = Math.max(0, members.length - scores.length)

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-stone-900">What does the fam think?</h3>
        {everyoneRated ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" />
            All in — revealed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            <EyeOff className="h-3.5 w-3.5" />
            {remaining} left · scores hidden
          </span>
        )}
      </div>

      {members.length === 0 ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No family members visible. Ask the admin to add rows to <code>sidnicasa_members</code> and fill <code>display_name</code>.
        </p>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {members.map((m) => {
            const score = ratingByUserId[m.userId]
            const submitted = score != null
            const isMe = m.userId === currentUserId
            const revealed = everyoneRated || isMe

            return (
              <div
                key={m.userId}
                className={`relative flex flex-col items-center rounded-xl border p-3 text-center transition ${
                  submitted ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200 bg-stone-50'
                }`}
              >
                <Avatar user={{ id: m.userId, display_name: m.displayName }} size="lg" ring />
                <div className="mt-2 text-sm font-medium text-stone-800">
                  {isMe ? 'You' : m.displayName}
                </div>
                <div className="mt-1 h-7 text-xl font-display">
                  {submitted && revealed ? (
                    <span className={everyoneRated ? 'animate-pop-in inline-block' : ''}>
                      {score}
                      <span className="text-sm text-stone-500">/10</span>
                    </span>
                  ) : submitted ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      submitted
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">not yet</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {everyoneRated && avg !== null && (
        <div className="mb-5 flex items-center gap-4 rounded-xl bg-gradient-to-br from-amber-50 to-rose-50 px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-stone-500">Family average</div>
            <div className="font-display text-3xl text-stone-900">
              {avg.toFixed(1)}
              <span className="text-base text-stone-500">/10</span>
            </div>
          </div>
          <div className="ml-auto text-xs text-stone-500">
            Range: {Math.min(...scores)}–{Math.max(...scores)}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
          <Eye className="h-3.5 w-3.5" />
          Your score {myRating !== null && <span className="normal-case text-stone-400">· tap to change</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const active = selectedScore === n
            return (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => submit(n)}
                className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${
                  active
                    ? 'border-rose-700 bg-rose-700 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-rose-300 hover:bg-rose-50'
                } disabled:opacity-50`}
              >
                {n}
              </button>
            )
          })}
        </div>
        {errorMsg && <p className="mt-2 text-sm text-rose-700">{errorMsg}</p>}
      </div>
    </section>
  )
}
