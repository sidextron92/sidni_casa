import 'server-only'
import { cookies } from 'next/headers'
import PocketBase from 'pocketbase'

export const PB_COOKIE = 'pb_auth'

export async function getServerClient() {
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL!)
  const store = await cookies()
  const raw = store.get(PB_COOKIE)?.value ?? ''
  if (raw) pb.authStore.loadFromCookie(`${PB_COOKIE}=${raw}`)
  try {
    if (pb.authStore.isValid) await pb.collection('users').authRefresh()
  } catch {
    pb.authStore.clear()
  }
  return pb
}

export async function getCurrentUser() {
  const pb = await getServerClient()
  return pb.authStore.isValid ? pb.authStore.record : null
}
