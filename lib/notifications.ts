import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// VAPID keys — générer avec : npx web-push generate-vapid-keys
// Ajouter dans Vercel : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO
// NOTE : web-push exige un "subject" au format URL (mailto:... ou https://...).
// On normalise ici pour éviter un crash de build si la variable ne contient
// qu'une adresse email brute (ex: VAPID_MAILTO="iteb.ouerghi@neuf.fr").
//
// IMPORTANT : on n'appelle PAS setVapidDetails() au niveau du module.
// Next.js importe ce fichier pendant "Collecting page data" au build,
// AVANT que les variables d'env runtime ne soient garanties disponibles/valides.
// Si la clé est vide ou mal formée à ce moment-là, ça fait planter tout
// le build (déjà vu : "Vapid public key must be a URL safe Base 64").
// On initialise donc paresseusement, une seule fois, à la première utilisation réelle.
let vapidInitialized = false

function ensureVapidConfigured() {
  if (vapidInitialized) return

  const rawSubject = (process.env.VAPID_MAILTO ?? '').trim()
  const vapidSubject = /^(mailto:|https?:\/\/)/i.test(rawSubject)
    ? rawSubject
    : `mailto:${rawSubject}`

  const publicKey  = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? '').trim()

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID non configuré : NEXT_PUBLIC_VAPID_PUBLIC_KEY et/ou VAPID_PRIVATE_KEY sont manquants.'
    )
  }

  webpush.setVapidDetails(vapidSubject, publicKey, privateKey)
  vapidInitialized = true
}

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type NotifType =
  | 'STOP_LOSS' | 'TAKE_PROFIT_R1' | 'TAKE_PROFIT_R2' | 'TAKE_PROFIT_R3'
  | 'BREAK_EVEN' | 'RUNNER_STOP' | 'EXPOSURE' | 'SYSTEM'
  | 'WATCHLIST_LOW' | 'WATCHLIST_HIGH'
  | 'FORUM_LIKE' | 'FORUM_REPLY' | 'FORUM_MENTION'

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

  // Nombre total de notifications non lues pour ce user — utilisé pour le
  // badge sur l'icône de l'app (Badging API, iOS 16.4+ / Android / desktop).
  // Calculé ici plutôt qu'un simple incrément local, pour rester toujours
  // synchronisé avec l'état réel en base.
  const { count: unreadCount } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', p.userId)
    .eq('is_read', false)

  // On configure VAPID seulement maintenant, au moment de l'envoi réel,
  // pour ne jamais impacter le build ni les routes qui n'envoient pas de push.
  ensureVapidConfigured()

  const payload = JSON.stringify({
    title:      p.title,
    body:       p.body,
    ticker:     p.ticker,
    type:       p.type,
    notifId:    notif.id,
    badgeCount: unreadCount ?? 1,
  })

  // 3. Envoyer à chaque appareil
  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 3600, urgency: 'high' }
      ).catch(async err => {
        // Abonnement expiré → nettoyage
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      })
    )
  )
}

/** Templates de messages — informatifs, jamais directifs */
export const NOTIF_TEMPLATES: Record<NotifType, (ticker?: string) => { title: string; body: string }> = {
  STOP_LOSS:      t => ({
    title: `🛑 Stop enregistré atteint — ${t}`,
    body:  `Le niveau de stop que vous avez enregistré sur ${t} a été atteint. Ouvrez l'application pour examiner la situation.`,
  }),
  TAKE_PROFIT_R1: t => ({
    title: `🎯 Objectif R1 atteint — ${t}`,
    body:  `Le premier objectif de résistance que vous avez enregistré sur ${t} a été atteint. Ouvrez l'application pour revoir votre plan.`,
  }),
  TAKE_PROFIT_R2: t => ({
    title: `🎯 Objectif R2 atteint — ${t}`,
    body:  `Le deuxième objectif de résistance que vous avez enregistré sur ${t} a été atteint. Ouvrez l'application pour revoir votre plan.`,
  }),
  TAKE_PROFIT_R3: t => ({
    title: `🏆 Objectif R3 atteint — ${t}`,
    body:  `Le troisième objectif de résistance que vous avez enregistré sur ${t} a été atteint. Ouvrez l'application pour revoir votre plan.`,
  }),
  BREAK_EVEN:     t => ({
    title: `⚖️ Seuil de rentabilité atteint — ${t}`,
    body:  `Le cours de ${t} a atteint votre prix d'entrée. La position est à l'équilibre.`,
  }),
  RUNNER_STOP:    t => ({
    title: `🏃 Stop runner déclenché — ${t}`,
    body:  `Le stop runner que vous avez défini sur ${t} a été déclenché. Ouvrez l'application pour voir les détails.`,
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
  FORUM_LIKE:     _ => ({
    title: `👍 Nouveau j'aime`,
    body:  `Quelqu'un a aimé une de vos publications sur le forum.`,
  }),
  FORUM_REPLY:    _ => ({
    title: '💬 Nouvelle réponse',
    body:  'Quelqu\'un a répondu à votre discussion sur le forum.',
  }),
  FORUM_MENTION:  _ => ({
    title: '💬 Vous avez été mentionné',
    body:  'Quelqu\'un vous a répondu directement sur le forum.',
  }),
}
