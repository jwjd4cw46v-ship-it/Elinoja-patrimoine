import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendNotification } from '@/lib/notifications'

/**
 * POST /api/webhooks/forum-notify
 * ─────────────────────────────────────────────────────────────────────────
 * Reçu depuis un Database Webhook Supabase (Database → Webhooks), configuré
 * sur INSERT pour les tables "forum_likes" et "forum_replies".
 *
 * Format du payload envoyé par Supabase (fixe, non paramétrable) :
 *   { type: 'INSERT', table: string, schema: string,
 *     record: {...}, old_record: null }
 *
 * Sécurisé par un secret partagé transmis en en-tête personnalisé
 * (configuré manuellement dans le Database Webhook, PAS le CRON_SECRET
 * utilisé pour /api/cron/* — un secret dédié pour ne rien mélanger) :
 *   x-webhook-secret: <FORUM_WEBHOOK_SECRET>
 */

const service = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, any> | null
  old_record: Record<string, any> | null
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.FORUM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = (await req.json()) as WebhookPayload
  const { table, record } = payload
  if (!record) return NextResponse.json({ ok: true, skipped: true })

  const db = service()

  // ── Like sur un post ou une réponse ─────────────────────────────────
  if (table === 'forum_likes') {
    const isReply = record.reply_id != null
    let ownerId: string | null = null
    let title: string | null = null

    if (isReply) {
      const { data } = await db
        .from('forum_replies')
        .select('author_id, forum_posts(title)')
        .eq('id', record.reply_id)
        .single()
      ownerId = data?.author_id ?? null
      title   = (data as any)?.forum_posts?.title ?? null
    } else {
      const { data } = await db
        .from('forum_posts')
        .select('author_id, title')
        .eq('id', record.post_id)
        .single()
      ownerId = data?.author_id ?? null
      title   = data?.title ?? null
    }

    // Pas de notification si on se like soi-même, ou propriétaire introuvable
    if (!ownerId || ownerId === record.user_id) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await sendNotification({
      userId: ownerId,
      type:   'FORUM_LIKE',
      title:  isReply
        ? "👍 Nouveau j'aime sur votre réponse"
        : `👍 Nouveau j'aime — ${title ?? 'votre discussion'}`,
      body: isReply
        ? `Quelqu'un a aimé votre réponse dans la discussion "${title ?? ''}".`
        : `Quelqu'un a aimé votre discussion "${title ?? ''}".`,
    })

    return NextResponse.json({ ok: true })
  }

  // ── Réponse sur un post ──────────────────────────────────────────────
  if (table === 'forum_replies') {
    const { data } = await db
      .from('forum_posts')
      .select('author_id, title')
      .eq('id', record.post_id)
      .single()

    const ownerId = data?.author_id ?? null
    if (!ownerId || ownerId === record.author_id) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await sendNotification({
      userId: ownerId,
      type:   'FORUM_REPLY',
      title:  `💬 Nouvelle réponse — ${data?.title ?? 'votre discussion'}`,
      body:   `Quelqu'un a répondu à votre discussion "${data?.title ?? ''}".`,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true, skipped: true, reason: 'unhandled table' })
}
