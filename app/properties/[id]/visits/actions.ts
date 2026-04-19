'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerClient } from '@/lib/pb'
import { COLLECTIONS } from '@/lib/types'

export type CreateVisitState = { error?: string }

export async function createVisit(
  _prev: CreateVisitState,
  formData: FormData,
): Promise<CreateVisitState> {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  const userId = pb.authStore.record!.id

  const propertyId = String(formData.get('property') ?? '')
  if (!propertyId) return { error: 'No property.' }

  const visitedAt = String(formData.get('visited_at') ?? '').trim()
  if (!visitedAt) return { error: 'Pick a date.' }

  const notes = String(formData.get('notes') ?? '').trim()
  const attendees = formData
    .getAll('attendees')
    .map((v) => String(v))
    .filter(Boolean)

  const fd = new FormData()
  fd.append('property', propertyId)
  fd.append('visited_at', new Date(visitedAt).toISOString())
  fd.append('created_by', userId)
  if (notes) fd.append('notes', notes)
  for (const a of attendees) fd.append('attendees', a)

  const photos = formData.getAll('photos')
  let photoCount = 0
  for (const p of photos) {
    if (p instanceof File && p.size > 0) {
      fd.append('photos', p, p.name || `photo-${photoCount++}.jpg`)
    }
  }

  try {
    await pb.collection(COLLECTIONS.visits).create(fd)
  } catch (e) {
    const err = e as { status?: number; message?: string; response?: { data?: unknown } }
    console.error('[createVisit] failed', err)
    return { error: `Could not save the visit (${err.status ?? '?'}). ${err.message ?? ''}` }
  }

  revalidatePath(`/properties/${propertyId}`)
  redirect(`/properties/${propertyId}`)
}

export async function deleteVisit(visitId: string, propertyId: string): Promise<CreateVisitState> {
  const pb = await getServerClient()
  if (!pb.authStore.isValid) return { error: 'Not signed in.' }
  try {
    await pb.collection(COLLECTIONS.visits).delete(visitId)
  } catch (e) {
    console.error('[deleteVisit] failed', e)
    return { error: 'Could not delete.' }
  }
  revalidatePath(`/properties/${propertyId}`)
  return {}
}
