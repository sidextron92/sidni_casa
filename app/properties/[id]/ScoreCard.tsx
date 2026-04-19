import { Scale } from 'lucide-react'
import { SCORE_WEIGHTS, type ScoreBreakdown } from '@/lib/score'

type Props = {
  score: ScoreBreakdown
}

type Row = {
  key: keyof typeof SCORE_WEIGHTS
  label: string
  value: number
}

export default function ScoreCard({ score }: Props) {
  const rows: Row[] = [
    { key: 'rating', label: 'Family rating', value: score.rating },
    { key: 'value', label: 'Value for price', value: score.value },
    { key: 'size', label: 'Size', value: score.size },
    { key: 'tags', label: 'Pros vs cons', value: score.tags },
  ]

  return (
    <section className="mb-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-stone-900">Decision score</h3>
        {!score.hasFullRatings && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            Rating uses neutral until everyone votes
          </span>
        )}
      </div>

      <div className="mb-5 flex items-end gap-4">
        <div>
          <div className="font-display text-5xl text-stone-900">
            {score.composite.toFixed(1)}
            <span className="text-xl text-stone-400">/10</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500">
            <Scale className="h-3 w-3" />
            weighted composite
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {rows.map((r) => {
          const weightPct = Math.round(SCORE_WEIGHTS[r.key] * 100)
          const pct = Math.max(0, Math.min(100, (r.value / 10) * 100))
          return (
            <li key={r.key}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-stone-700">
                  {r.label}
                  <span className="ml-1.5 text-xs text-stone-400">· {weightPct}%</span>
                </span>
                <span className="font-medium text-stone-800">{r.value.toFixed(1)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-600 transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
