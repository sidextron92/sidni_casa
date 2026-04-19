import type { PropertyRecord, RatingRecord, PropertyTagExpanded, TagPolarity } from './types'

export const SCORE_WEIGHTS = {
  rating: 0.4,
  value: 0.25,
  size: 0.2,
  tags: 0.15,
} as const

export type ScoreBreakdown = {
  composite: number
  rating: number
  value: number
  size: number
  tags: number
  ratingCount: number
  totalMembers: number
  hasFullRatings: boolean
}

export type ScoreContext = {
  priceRanks: Map<string, number>
  priceN: number
  sizeRanks: Map<string, number>
  sizeN: number
  totalMembers: number
}

export function buildScoreContext(
  properties: PropertyRecord[],
  totalMembers: number,
): ScoreContext {
  const byPrice = properties
    .filter((p) => p.price_per_sqft != null && Number.isFinite(p.price_per_sqft))
    .sort((a, b) => (a.price_per_sqft ?? 0) - (b.price_per_sqft ?? 0))
  const priceRanks = new Map<string, number>()
  byPrice.forEach((p, i) => priceRanks.set(p.id, i))

  const bySize = properties
    .filter((p) => {
      const s = p.super_sqft ?? p.carpet_sqft
      return s != null && Number.isFinite(s)
    })
    .sort((a, b) => (b.super_sqft ?? b.carpet_sqft ?? 0) - (a.super_sqft ?? a.carpet_sqft ?? 0))
  const sizeRanks = new Map<string, number>()
  bySize.forEach((p, i) => sizeRanks.set(p.id, i))

  return {
    priceRanks,
    priceN: byPrice.length,
    sizeRanks,
    sizeN: bySize.length,
    totalMembers,
  }
}

function rankToScore(rank: number | undefined, total: number): number {
  if (rank == null || total <= 1) return 5
  return 10 - (rank / (total - 1)) * 8
}

export function computeScore(
  property: PropertyRecord,
  ratings: RatingRecord[],
  propertyTags: PropertyTagExpanded[],
  context: ScoreContext,
): ScoreBreakdown {
  const ratingCount = ratings.length
  const avgRating =
    ratingCount > 0 ? ratings.reduce((s, r) => s + r.score, 0) / ratingCount : 5
  const hasFullRatings = context.totalMembers > 0 && ratingCount >= context.totalMembers

  const valueScore = rankToScore(context.priceRanks.get(property.id), context.priceN)
  const sizeScore = rankToScore(context.sizeRanks.get(property.id), context.sizeN)

  let pro = 0
  let con = 0
  for (const pt of propertyTags) {
    const polarity = pt.expand?.tag?.polarity as TagPolarity | undefined
    if (polarity === 'pro') pro += 1
    else if (polarity === 'con') con += 1
  }
  const tagsScore = Math.max(0, Math.min(10, pro - con + 5))

  const composite =
    avgRating * SCORE_WEIGHTS.rating +
    valueScore * SCORE_WEIGHTS.value +
    sizeScore * SCORE_WEIGHTS.size +
    tagsScore * SCORE_WEIGHTS.tags

  return {
    composite: Math.round(composite * 10) / 10,
    rating: Math.round(avgRating * 10) / 10,
    value: Math.round(valueScore * 10) / 10,
    size: Math.round(sizeScore * 10) / 10,
    tags: Math.round(tagsScore * 10) / 10,
    ratingCount,
    totalMembers: context.totalMembers,
    hasFullRatings,
  }
}
