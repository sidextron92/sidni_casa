import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getServerClient } from '@/lib/pb'
import { COLLECTIONS, type MemberRecord, type PropertyRecord, type UserRecord } from '@/lib/types'
import { displayNameFor } from '@/lib/avatar'
import VisitForm from './VisitForm'

type PageProps = { params: Promise<{ id: string }> }

export default async function NewVisitPage({ params }: PageProps) {
  const { id } = await params
  const pb = await getServerClient()
  if (!pb.authStore.isValid) redirect('/login')
  const currentUser = pb.authStore.record as unknown as UserRecord

  let property: PropertyRecord
  try {
    property = await pb.collection(COLLECTIONS.properties).getOne<PropertyRecord>(id)
  } catch {
    notFound()
  }

  const members = await pb
    .collection(COLLECTIONS.members)
    .getFullList<MemberRecord>()
    .catch(() => [])

  const memberSlots = members.map((m) => ({
    userId: m.user,
    displayName: m.display_name?.trim() || `Member ${m.id.slice(-4)}`,
  }))
  const currentUserDisplayName = displayNameFor({
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    display_name: memberSlots.find((s) => s.userId === currentUser.id)?.displayName,
  })
  if (!memberSlots.some((s) => s.userId === currentUser.id)) {
    memberSlots.unshift({ userId: currentUser.id, displayName: currentUserDisplayName })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <nav className="mb-6 text-sm">
        <Link
          href={`/properties/${id}`}
          className="inline-flex items-center gap-1.5 text-stone-500 transition hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {property.society_name}
        </Link>
      </nav>

      <h1 className="mb-1 font-display text-3xl text-stone-900 sm:text-4xl">Log a visit</h1>
      <p className="mb-6 text-sm text-stone-600">{property.society_name}</p>

      <VisitForm
        propertyId={property.id}
        memberSlots={memberSlots}
        currentUserId={currentUser.id}
      />
    </main>
  )
}
