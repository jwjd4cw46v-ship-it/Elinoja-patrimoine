import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendNotification, NOTIF_TEMPLATES } from '@/lib/notifications'
import { detecterAlertes, type Position, type AlertePosition } from '@/lib/positions-engine'

/**
 * GET /api/cron/check-alerts
 * ─────────────────────────────────────────────────────────────────────────
 * Remplace toute la détection qui vivait côté client (ClientHeader.tsx
 * pour la watchlist, page.tsx/detecterEtCreerAlertes pour les positions).
 *
 * Appelé par cron-job.org toutes les 1 à 5 minutes (à régler selon la
 * fréquence de rafraîchissement souhaitée des cotations BVMT).
 *
 * Sécurisé par le même secret partagé que la route d'envoi existante :
 * Authorization: Bearer <CRON_SECRET>
 */

const service = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

interface Market {
  last: number
  change: number
  referentiel: { ticker: string; stockName: string }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = service()

  // ── 0. Une seule lecture des cotations pour tout le monde ──────────────
  const cotUrl = new URL('/api/cotations', req.url)
  const cotRes = await fetch(cotUrl, { cache: 'no-store' })
  if (!cotRes.ok) {
    return NextResponse.json({ error: 'cotations fetch failed' }, { status: 502 })
  }
  const cotJson = await cotRes.json()
  const markets: Market[] = cotJson.markets ?? []

  const prixMap: Record<string, number> = {}
  markets.forEach(m => {
    const t = m.referentiel?.ticker?.toUpperCase()
    if (t && m.last != null) prixMap[t] = m.last
  })

  const result = {
    watchlist: { checked: 0, notified: 0 },
    positions: { checked: 0, notified: 0 },
  }

  // ═══════════════════════ PART A — WATCHLIST ═══════════════════════════
  const { data: watchlists, error: wlErr } = await db
    .from('watchlists')
    .select('id, user_id, ticker, alert_price_low, alert_price_high, low_triggered, high_triggered')

  if (wlErr) console.error('watchlists fetch error:', wlErr.message)

  for (const w of watchlists ?? []) {
    const ticker  = w.ticker?.toUpperCase()
    const current = ticker ? prixMap[ticker] : undefined
    if (!ticker || current == null) continue
    result.watchlist.checked++

    const low  = w.alert_price_low  ?? 0
    const high = w.alert_price_high ?? 0
    const patch: Record<string, boolean> = {}

    // Seuil bas — franchissement <=, comme dans WatchCard/ClientHeader
    if (low > 0 && current <= low) {
      if (!w.low_triggered) {
        const { title, body } = NOTIF_TEMPLATES.WATCHLIST_LOW(ticker)
        await sendNotification({ userId: w.user_id, type: 'WATCHLIST_LOW', ticker, title, body })
        result.watchlist.notified++
      }
      patch.low_triggered = true
    } else if (low > 0 && current > low && w.low_triggered) {
      patch.low_triggered = false // repasse au-dessus → réarme l'alerte
    }

    // Seuil haut — franchissement >=
    if (high > 0 && current >= high) {
      if (!w.high_triggered) {
        const { title, body } = NOTIF_TEMPLATES.WATCHLIST_HIGH(ticker)
        await sendNotification({ userId: w.user_id, type: 'WATCHLIST_HIGH', ticker, title, body })
        result.watchlist.notified++
      }
      patch.high_triggered = true
    } else if (high > 0 && current < high && w.high_triggered) {
      patch.high_triggered = false // redescend en dessous → réarme l'alerte
    }

    if (Object.keys(patch).length > 0) {
      await db.from('watchlists').update(patch).eq('id', w.id)
    }
  }

  // ═══════════════════════ PART B — POSITIONS ═══════════════════════════
  const { data: positions, error: posErr } = await db
    .from('positions').select('*').neq('state', 'CLOSED')
  // IMPORTANT : on ne filtre plus sur is_acted=false ici. Une alerte
  // "conservée" par l'utilisateur (is_acted=true, cf. handleConserverPosition
  // côté client) doit rester visible à cette détection tant que le prix
  // reste dans la zone de déclenchement — sinon ce cron la recréait (et
  // renvoyait un NOUVEAU push) alors même que l'utilisateur venait de la
  // traiter côté app. Le nettoyage juste en dessous continue de supprimer
  // ces alertes (traitées ou non) dès que le prix repasse hors zone, ce qui
  // réarme normalement la détection pour un futur franchissement.
  const { data: alertesExist, error: alErr } = await db
    .from('position_alertes').select('*')

  if (posErr) console.error('positions fetch error:', posErr.message)
  if (alErr)  console.error('position_alertes fetch error:', alErr.message)

  for (const p of (positions ?? []) as Position[]) {
    const prix = prixMap[p.ticker.toUpperCase()]
    if (!prix) continue
    result.positions.checked++

    const alertesDeja = (alertesExist ?? []).filter(a => a.position_id === p.id) as AlertePosition[]
    const nouvelles   = detecterAlertes(p, prix, alertesDeja)

    // Nettoyage : alertes qui ne sont plus valides (cours revenu dans la zone)
    for (const alerteDeja of alertesDeja) {
      const encoreValide =
        (alerteDeja.type === 'STOP_LOSS'      && prix <= alerteDeja.prix_trigger) ||
        (alerteDeja.type === 'RUNNER_STOP'    && prix <= alerteDeja.prix_trigger) ||
        (alerteDeja.type === 'TAKE_PROFIT_R1' && prix >= alerteDeja.prix_trigger) ||
        (alerteDeja.type === 'TAKE_PROFIT_R2' && prix >= alerteDeja.prix_trigger) ||
        (alerteDeja.type === 'TAKE_PROFIT_R3' && prix >= alerteDeja.prix_trigger)

      if (!encoreValide) {
        await db.from('position_alertes').delete().eq('id', alerteDeja.id)
      }
    }

    // Nouvelles alertes → insertion + push
    for (const a of nouvelles) {
      const { data: inserted, error: insErr } = await db
        .from('position_alertes')
        .insert({
          position_id:  p.id,
          user_id:      p.user_id,
          type:         a.type,
          prix_trigger: a.prix_trigger,
          prix_marche:  prix,
          is_read:      false,
          is_acted:     false,
        })
        .select('id')
        .single()

      if (insErr) {
        console.error('insert position_alerte error:', insErr.message)
        continue
      }

      const { title, body } = NOTIF_TEMPLATES[a.type]?.(p.ticker) ?? {
        title: 'Elinoja',
        body:  'Un événement a été détecté sur votre position.',
      }
      await sendNotification({ userId: p.user_id, type: a.type, ticker: p.ticker, title, body })
      result.positions.notified++
    }
  }

  return NextResponse.json({ ok: true, result })
}
