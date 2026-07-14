import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'

// Contrairement à /api/notifications/send (protégé par CRON_SECRET, pour un
// appel serveur-à-serveur), cette route est appelée directement par le
// client juste après la création d'une réponse au forum. Elle est donc
// sécurisée par la session utilisateur classique, pas par un secret partagé.
//
// C'est désormais la SEULE source de notification pour les réponses
// (le trigger SQL équivalent sur forum_replies a été retiré — voir
// 015_remove_reply_webhook_trigger.sql — car les deux ensemble créaient
// une notification en double pour chaque réponse).
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId, postId, postTitle, mention } = await req.json() as {
    targetUserId: string
    postId:       string
    postTitle:    string
    mention:      boolean // true = réponse ciblée à cette personne, false = auteur du sujet
  }

  if (!targetUserId || !postId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // On ne se notifie jamais soi-même (ex: l'auteur du sujet répond à sa
  // propre discussion, ou répond à sa propre réponse).
  if (targetUserId === user.id) {
    return NextResponse.json({ ok: true, skipped: 'self' })
  }

  // Nom affiché dans le message (au format "quelqu'un")
  const { data: authorProfile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single()
  const fromName = authorProfile?.full_name || 'Un membre'

  const title = mention
    ? '💬 Vous avez été mentionné'
    : `💬 Nouvelle réponse — ${postTitle}`
  const body  = mention
    ? `${fromName} vous a répondu directement dans « ${postTitle} ».`
    : `${fromName} a répondu à votre discussion « ${postTitle} ».`

  await sendNotification({
    userId: targetUserId,
    type:   mention ? 'FORUM_MENTION' : 'FORUM_REPLY',
    title,
    body,
    link:   `/client/forum?post=${postId}`,
  })

  return NextResponse.json({ ok: true })
}
