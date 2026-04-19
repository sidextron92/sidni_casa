'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PocketBase from 'pocketbase'
import { PB_COOKIE } from '@/lib/pb'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Email and password required.' }

  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL!)
  try {
    await pb.collection('users').authWithPassword(email, password)
  } catch (err) {
    const e = err as { status?: number; message?: string; response?: { message?: string } }
    console.error('[login] authWithPassword failed:', {
      status: e.status,
      message: e.message,
      response: e.response,
      url: process.env.NEXT_PUBLIC_POCKETBASE_URL,
    })
    const detail = e.response?.message || e.message || 'unknown error'
    return { error: `Login failed (${e.status ?? '?'}): ${detail}` }
  }

  const userId = pb.authStore.record?.id
  if (!userId) return { error: 'Auth succeeded but no user id returned.' }

  try {
    await pb.collection('sidnicasa_members').getFirstListItem(`user = "${userId}"`)
  } catch (err) {
    const e = err as { status?: number; message?: string }
    pb.authStore.clear()
    if (e.status === 404) {
      return { error: 'You are not authorized for sidni_casa. Ask the admin to add you.' }
    }
    console.error('[login] membership check failed:', e)
    return { error: `Membership check failed (${e.status ?? '?'}): ${e.message ?? 'unknown'}` }
  }

  const cookieHeader = pb.authStore.exportToCookie({
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  })
  const value = cookieHeader.match(/pb_auth=([^;]+)/)?.[1] ?? ''

  const store = await cookies()
  store.set(PB_COOKIE, value, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 14,
  })
  redirect('/')
}

export async function logout() {
  const store = await cookies()
  store.delete(PB_COOKIE)
  redirect('/login')
}
