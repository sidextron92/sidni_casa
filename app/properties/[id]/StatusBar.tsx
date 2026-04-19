'use client'

import { useState, useTransition } from 'react'
import { Eye, Heart, CheckCircle2, XCircle, Banknote, KeyRound } from 'lucide-react'
import { changeStatus } from './actions'
import type { PropertyStatus } from '@/lib/types'

type Props = {
  propertyId: string
  status: PropertyStatus
}

type Step = {
  value: PropertyStatus
  label: string
  icon: typeof Eye
  activeClass: string
}

const STEPS: Step[] = [
  { value: 'exploring', label: 'Exploring', icon: Eye, activeClass: 'bg-stone-700 text-white border-stone-700' },
  { value: 'shortlisted', label: 'Shortlisted', icon: Heart, activeClass: 'bg-rose-700 text-white border-rose-700' },
  { value: 'visited', label: 'Visited', icon: CheckCircle2, activeClass: 'bg-emerald-700 text-white border-emerald-700' },
  { value: 'offered', label: 'Offered', icon: Banknote, activeClass: 'bg-amber-700 text-white border-amber-700' },
  { value: 'closed', label: 'Closed', icon: KeyRound, activeClass: 'bg-indigo-700 text-white border-indigo-700' },
  { value: 'rejected', label: 'Passed', icon: XCircle, activeClass: 'bg-stone-500 text-white border-stone-500' },
]

export default function StatusBar({ propertyId, status }: Props) {
  const [current, setCurrent] = useState<PropertyStatus>(status)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const pick = (next: PropertyStatus) => {
    if (next === current) return
    setErr(null)
    const prev = current
    setCurrent(next)
    startTransition(async () => {
      const res = await changeStatus(propertyId, next)
      if (res.error) {
        setCurrent(prev)
        setErr(res.error)
      }
    })
  }

  return (
    <section className="mb-8">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
        Where are we with this one?
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((s) => {
          const Icon = s.icon
          const active = s.value === current
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => pick(s.value)}
              disabled={pending}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                active
                  ? s.activeClass
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          )
        })}
      </div>
      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
    </section>
  )
}
