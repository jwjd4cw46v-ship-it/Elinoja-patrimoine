import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendNotification } from '@/lib/notifications'

/**
 * POST /api/forum/broadcast
 * ─────────────────────────────────────────────────────────────────────────
 * Notifie TOUS les utilisateurs (sauf l'auteur lui-même), pour deux cas :
 *   - type: 'FORUM_NEW_POST'  → un nouveau sujet vient d'être créé
 *   - type: 'FORUM_BROADCAST' → une publication (sujet ou réponse) commence
 *     par "@tous"
 *
 * Sécurisée par la session utilisateur classique (comme /api/forum/notify),
 * pas par un secret partagé — c'est un utilisateur connecté qui déclenche
 * l'action depuis l'app, pas un job serveur.
 *
 * Utilise la service role pour lire tous les profils et écrire les
 * notifications/push (comme sendNotification le fait déjà).
 */

const service = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, postTitle, excerpt } = await req.json() as {
    type:      'FORUM_NEW_POST' | 'FORUM_BROADCAST'
    postTitle: string
    excerpt?:  string
  }

  if (!type || !postTitle) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: authorProfile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single()
  const fromName = authorProfile?.full_name || 'Un membre'

  const title = type === 'FORUM_NEW_POST'
    ? `🆕 Nouveau sujet — ${postTitle}`
    : `📢 Message à tous — ${postTitle}`
  const body = type === 'FORUM_NEW_POST'
    ? `${fromName} a publié une nouvelle discussion : « ${postTitle} ».`
    : `${fromName} a un message pour tout le monde${excerpt ? ` : « ${excerpt} »` : ''}.`

  const db = service()
  const { data: profiles, error } = await db.from('profiles').select('id').neq('id', user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (profiles ?? []).map(p =>
      sendNotification({ userId: p.id, type, title, body })
    )
  )
  const notified = results.filter(r => r.status === 'fulfilled').length

  return NextResponse.json({ ok: true, notified, total: profiles?.length ?? 0 })
}
