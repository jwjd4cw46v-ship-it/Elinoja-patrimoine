import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Nettoyage de la clé publique
const rawVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const cleanVapidPublicKey = rawVapidPublicKey.replace(/=+$/, '').trim();

// Déclaration de vapidSubject AVANT toute utilisation
const rawSubject = process.env.VAPID_MAILTO ?? ''
const vapidSubject = /^(mailto:|https?:\/\/)/i.test(rawSubject)
  ? rawSubject
  : `mailto:${rawSubject}`

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialisation sécurisée
if (cleanVapidPublicKey && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    vapidSubject,
    cleanVapidPublicKey,
    process.env.VAPID_PRIVATE_KEY
  )
}

export type NotifType =
  | 'STOP_LOSS' | 'TAKE_PROFIT_R1' | 'TAKE_PROFIT_R2' | 'TAKE_PROFIT_R3'
  | 'BREAK_EVEN' | 'RUNNER_STOP' | 'EXPOSURE' | 'SYSTEM'
  | 'WATCHLIST_LOW' | 'WATCHLIST_HIGH'

export interface NotifPayload {
  userId:  string
  type:    NotifType
  ticker?: string
  title:   string
  body:    string
}

/** Crée une notification en base + envoie le push à tous les appareils */
export async function sendNotification(p: NotifPayload): Promise<void> {
  const db = service()

  // 1. Insérer en base
  const { data: notif } = await db.from('notifications').insert({
    user_id: p.userId,
    type:    p.type,
    ticker:  p.ticker ?? null,
    title:   p.title,
    body:    p.body,
  }).select('id').single()

  if (!notif) return

  // 2. Récupérer les abonnements push
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', p.userId)

  if (!subs?.length) return

  const payload = JSON.stringify({
    title:   p.title,
    body:    p.body,
    ticker:  p.ticker,
    type:    p.type,
    notifId: notif.id,
  })

  // 3. Envoyer à chaque appareil
  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 3600, urgency: 'high' }
      ).catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      })
    )
  )
}

/** Templates de messages */
export const NOTIF_TEMPLATES: Record<NotifType, (ticker?: string) => { title: string; body: string }> = {
  STOP_LOSS:      t => ({
    title: `🔔 Niveau enregistré atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le niveau que vous aviez enregistré. Ouvrez l'application pour consulter le détail.`,
  }),
  TAKE_PROFIT_R1: t => ({
    title: `🔔 Niveau R1 atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le niveau de résistance R1 que vous aviez enregistré. Ouvrez l'application pour consulter le détail.`,
  }),
  TAKE_PROFIT_R2: t => ({
    title: `🔔 Niveau R2 atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le niveau de résistance R2 que vous aviez enregistré. Ouvrez l'application pour consulter le détail.`,
  }),
  TAKE_PROFIT_R3: t => ({
    title: `🔔 Niveau R3 atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le niveau de résistance R3 que vous aviez enregistré. Ouvrez l'application pour consulter le détail.`,
  }),
  BREAK_EVEN:     t => ({
    title: `⚖️ Seuil de rentabilité atteint — ${t}`,
    body:  `Le cours de ${t} a atteint votre prix d'entrée. La position est à l'équilibre.`,
  }),
  RUNNER_STOP:    t => ({
    title: `🔔 Niveau runner atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le niveau de suivi ("runner") que vous aviez défini. Ouvrez l'application pour consulter le détail.`,
  }),
  EXPOSURE:       t => ({
    title: `⚠️ Exposition élevée — ${t ?? 'portefeuille'}`,
    body:  `L'exposition à ${t ?? 'un actif'} dépasse le seuil que vous avez défini. Ouvrez l'application pour consulter la répartition.`,
  }),
  SYSTEM:         _ => ({
    title: 'ℹ️ Elinoja Patrimoine',
    body:  "Une mise à jour est disponible dans l'application.",
  }),
  WATCHLIST_LOW:  t => ({
    title: `🔻 Seuil bas atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le seuil bas que vous avez défini dans votre watchlist.`,
  }),
  WATCHLIST_HIGH: t => ({
    title: `🔺 Seuil haut atteint — ${t}`,
    body:  `Le cours de ${t} a atteint le seuil haut que vous avez défini dans votre watchlist.`,
  }),
}
