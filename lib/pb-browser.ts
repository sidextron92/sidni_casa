'use client'

import PocketBase from 'pocketbase'

let pb: PocketBase | null = null

export function getBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserClient called on the server')
  }
  if (!pb) {
    pb = new PocketBase('/pb')
    pb.autoCancellation(false)
  }
  return pb
}
