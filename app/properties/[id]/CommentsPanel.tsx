'use client'

import { useRef, useState, useTransition } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { addComment, deleteComment } from './actions'
import { timeAgo } from '@/lib/format'

export type CommentDisplay = {
  id: string
  userId: string
  displayName: string
  body: string
  created: string
}

type Props = {
  propertyId: string
  comments: CommentDisplay[]
  currentUserId: string
  currentUserDisplayName: string
}

export default function CommentsPanel({
  propertyId,
  comments,
  currentUserId,
  currentUserDisplayName,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const submit = (formData: FormData) => {
    const body = String(formData.get('body') ?? '')
    setErr(null)
    startTransition(async () => {
      const res = await addComment(propertyId, body)
      if (res.error) setErr(res.error)
      else formRef.current?.reset()
    })
  }

  const remove = (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    startTransition(async () => {
      await deleteComment(commentId, propertyId)
    })
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-display text-xl text-stone-900">Chit-chat</h3>

      <div className="mb-4 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-stone-500">No thoughts yet. Be the first to drop one.</p>
        ) : (
          comments.map((c) => {
            const isMine = c.userId === currentUserId
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar user={{ id: c.userId, display_name: c.displayName }} size="sm" />
                <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-stone-800">
                        {isMine ? 'You' : c.displayName}
                      </span>
                      <span className="text-xs text-stone-400">{timeAgo(c.created)}</span>
                    </div>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="text-stone-400 transition hover:text-rose-600"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-stone-700">{c.body}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form ref={formRef} action={submit} className="flex items-end gap-2">
        <Avatar user={{ id: currentUserId, display_name: currentUserDisplayName }} size="sm" />
        <textarea
          name="body"
          rows={2}
          maxLength={2000}
          required
          placeholder="Drop a thought…"
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-700 text-white transition hover:bg-rose-800 disabled:opacity-50"
          aria-label="Post"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
    </section>
  )
}
