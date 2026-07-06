import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Fonction utilitaire pour configurer web-push uniquement lors de l'appel
function configureWebPush() {
  const rawVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
  // Nettoyage agressif du padding pour la validation de web-push
  const cleanVapidPublicKey = rawVapidPublicKey.replace(/=+$/, '')
  
  const rawSubject = process.env.VAPID_MAILTO ?? ''
  const vapidSubject = /^(mailto:|https?:\/\/)/i.test(rawSubject)
    ? rawSubject
    : `mailto:${rawSubject}`

  if (cleanVapidPublicKey && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      vapidSubject,
      cleanVapidPublicKey,
      process.env.VAPID_PRIVATE_KEY
    )
  }
}

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  // Initialisation différée au moment de l'envoi
  configureWebPush()
  
  const db = service()

  const { data: notif } = await db.from('notifications').insert({
    user_id: p.userId,
    type:    p.type,
    ticker:  p.ticker ?? null,
    title:   p.title,
    body:    p.body,
  }).select('id').single()

  if (!notif) return

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

export const NOTIF_TEMPLATES: Record<NotifType, (ticker?: string) => { title: string; body: string }> = {
  STOP_LOSS:      t => ({ title: `🔔 Niveau enregistré atteint — ${t}`, body: `Le cours de ${t} a atteint le niveau enregistré.` }),
  TAKE_PROFIT_R1: t => ({ title: `🔔 Niveau R1 atteint — ${t}`, body: `Le cours de ${t} a atteint le niveau R1.` }),
  TAKE_PROFIT_R2: t => ({ title: `🔔 Niveau R2 atteint — ${t}`, body: `Le cours de ${t} a atteint le niveau R2.` }),
  TAKE_PROFIT_R3: t => ({ title: `🔔 Niveau R3 atteint — ${t}`, body: `Le cours de ${t} a atteint le niveau R3.` }),
  BREAK_EVEN:     t => ({ title: `⚖️ Seuil de rentabilité atteint — ${t}`, body: `Le cours de ${t} a atteint votre prix d'entrée.` }),
  RUNNER_STOP:    t => ({ title: `🔔 Niveau runner atteint — ${t}`, body: `Le cours de ${t} a atteint le niveau runner.` }),
  EXPOSURE:       t => ({ title: `⚠️ Exposition élevée — ${t ?? 'portefeuille'}`, body: `L'exposition dépasse le seuil défini.` }),
  SYSTEM:         _ => ({ title: 'ℹ️ Elinoja Patrimoine', body: "Une mise à jour est disponible." }),
  WATCHLIST_LOW:  t => ({ title: `🔻 Seuil bas atteint — ${t}`, body: `Le cours de ${t} a atteint le seuil bas.` }),
  WATCHLIST_HIGH: t => ({ title: `🔺 Seuil haut atteint — ${t}`, body: `Le cours de ${t} a atteint le seuil haut.` }),
}
