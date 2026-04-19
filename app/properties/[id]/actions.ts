'use server'

import { revalidatePath } from 'next/cache'
import { getServerClient } from '@/lib/pb'
import { COLLECTIONS, type PropertyStatus } from '@/lib/types'

const VALID_STATUSES: PropertyStatus[] = [
  'exploring',
  'shortlisted',
  'visited',
  'rejected',
  'offered',
  'closed',
]

export async function changeStatus(
  propertyId: string,
  status: PropertyStatus,
): Promise<ActionState> {
  if (!propertyId) return { error: 'No property.' }
  if (!VALID_STATUSES.includes(status)) return { error: 'Invalid status.' }
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  try {
    await pb.collection(COLLECTIONS.properties).update(propertyId, { status })
  } catch (e) {
    console.error('[changeStatus] failed', e)
    return { error: 'Could not update status.' }
  }
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/')
  return { ok: true }
}

export type ActionState = { error?: string; ok?: boolean }

export async function rateProperty(
  propertyId: string,
  score: number,
): Promise<ActionState> {
  if (!propertyId) return { error: 'No property.' }
  if (!Number.isFinite(score) || score < 1 || score > 10) {
    return { error: 'Rating must be between 1 and 10.' }
  }
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  const userId = pb.authStore.record!.id

  try {
    const existing = await pb
      .collection(COLLECTIONS.ratings)
      .getFirstListItem(`property = "${propertyId}" && user = "${userId}"`)
    await pb.collection(COLLECTIONS.ratings).update(existing.id, { score })
  } catch {
    try {
      await pb.collection(COLLECTIONS.ratings).create({
        property: propertyId,
        user: userId,
        score,
      })
    } catch (e) {
      console.error('[rateProperty] create failed', e)
      return { error: 'Could not save rating.' }
    }
  }

  revalidatePath(`/properties/${propertyId}`)
  return { ok: true }
}

export async function addComment(propertyId: string, body: string): Promise<ActionState> {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Say something.' }
  if (trimmed.length > 2000) return { error: 'Too long — keep it under 2000 chars.' }

  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  const userId = pb.authStore.record!.id

  try {
    await pb.collection(COLLECTIONS.comments).create({
      property: propertyId,
      user: userId,
      body: trimmed,
    })
  } catch (e) {
    console.error('[addComment] failed', e)
    return { error: 'Could not post comment.' }
  }
  revalidatePath(`/properties/${propertyId}`)
  return { ok: true }
}

export async function deleteComment(commentId: string, propertyId: string): Promise<ActionState> {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  try {
    await pb.collection(COLLECTIONS.comments).delete(commentId)
  } catch (e) {
    console.error('[deleteComment] failed', e)
    return { error: 'Could not delete.' }
  }
  revalidatePath(`/properties/${propertyId}`)
  return { ok: true }
}

export async function toggleTag(propertyId: string, tagId: string): Promise<ActionState> {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  const userId = pb.authStore.record!.id

  try {
    const existing = await pb
      .collection(COLLECTIONS.propertyTags)
      .getFirstListItem(`property = "${propertyId}" && tag = "${tagId}"`)
    // Only the member who added it can remove — but for v1 anyone in family can toggle.
    await pb.collection(COLLECTIONS.propertyTags).delete(existing.id)
  } catch {
    try {
      await pb.collection(COLLECTIONS.propertyTags).create({
        property: propertyId,
        tag: tagId,
        added_by: userId,
      })
    } catch (e) {
      console.error('[toggleTag] create failed', e)
      return { error: 'Could not toggle tag.' }
    }
  }
  revalidatePath(`/properties/${propertyId}`)
  return { ok: true }
}

export async function createAndAddTag(
  propertyId: string,
  label: string,
  polarity: 'pro' | 'con' | 'neutral',
): Promise<ActionState> {
  const trimmed = label.trim()
  if (!trimmed) return { error: 'Give it a name.' }
  if (trimmed.length > 60) return { error: 'Keep it under 60 chars.' }

  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  const userId = pb.authStore.record!.id

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (!slug) return { error: 'Choose a name with letters or numbers.' }

  let tagId: string
  try {
    const existing = await pb
      .collection(COLLECTIONS.tags)
      .getFirstListItem(`slug = "${slug}"`)
    tagId = existing.id
  } catch {
    try {
      const created = await pb.collection(COLLECTIONS.tags).create({
        label: trimmed,
        slug,
        polarity,
      })
      tagId = created.id
    } catch (e) {
      console.error('[createAndAddTag] tag create failed', e)
      return { error: 'Could not create tag.' }
    }
  }

  try {
    await pb.collection(COLLECTIONS.propertyTags).create({
      property: propertyId,
      tag: tagId,
      added_by: userId,
    })
  } catch {
    // Already attached — ignore.
  }
  revalidatePath(`/properties/${propertyId}`)
  return { ok: true }
}
