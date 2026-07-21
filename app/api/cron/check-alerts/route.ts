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

// Hystérésis anti-flapping : marge (en % du seuil) que le cours doit
// franchir dans l'autre sens avant qu'une alerte watchlist ne soit
// réarmée. Sans cette marge, un cours qui oscille d'un tick autour du
// seuil fait basculer triggered → false → true à chaque cycle de cron,
// et donc renvoie une notification push pour le MÊME franchissement.
const REARM_BUFFER_PCT = 0.005 // 0.5%

/**
 * Statut d'un trade (analyse technique) par rapport au cours actuel.
 * Même logique que côté front (ClientAnalysesPage/getStatutNiveau) —
 * dupliquée ici volontairement car le cron n'importe pas de code React.
 * Le sens (haussier/baissier) est déduit de la position de l'objectif
 * par rapport à l'entrée plutôt que du seul champ `signal`.
 *
 * NOTE : cette fonction suppose que `current` est déjà un prix valide et
 * non nul — c'est à l'appelant de le garantir (voir `if (!current) continue`
 * dans la boucle PART C plus bas). Si un `current = 0` lui était transmis,
 * `current <= stop` serait toujours vrai côté baissier et déclencherait un
 * faux "stop" pour n'importe quel trade : c'est exactement le bug corrigé
 * ici (l'ancien garde-fou testait `current == null`, ce qui laissait passer
 * les cotations à 0 renvoyées par /api/cotations pour un ticker fermé ou
 * en glitch).
 */
function getStatutNiveau(
  entry?: number | null, target?: number | null, stop?: number | null, current?: number
): 'objectif' | 'stop' | null {
  if (!entry || !target || !stop || !current) return null
  const haussier = target > entry
  if (haussier) {
    if (current >= target) return 'objectif'
    if (current <= stop) return 'stop'
  } else {
    if (current <= target) return 'objectif'
    if (current >= stop) return 'stop'
  }
  return null
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
    trades:    { checked: 0, closed: 0 },
  }

  // ═══════════════════════ PART A — WATCHLIST ═══════════════════════════
  const { data: watchlists, error: wlErr } = await db
    .from('watchlists')
    .select('id, user_id, ticker, alert_price_low, alert_price_high, low_triggered, high_triggered')

  if (wlErr) console.error('watchlists fetch error:', wlErr.message)

  for (const w of watchlists ?? []) {
    const ticker  = w.ticker?.toUpperCase()
    const current = ticker ? prixMap[ticker] : undefined
    if (!ticker || !current) continue
    result.watchlist.checked++

    const low  = w.alert_price_low  ?? 0
    const high = w.alert_price_high ?? 0
    const patch: Record<string, boolean> = {}

    if (low > 0 && current <= low) {
      if (!w.low_triggered) {
        const { title, body } = NOTIF_TEMPLATES.WATCHLIST_LOW(ticker)
        await sendNotification({ userId: w.user_id, type: 'WATCHLIST_LOW', ticker, title, body })
        result.watchlist.notified++
      }
      patch.low_triggered = true
    } else if (low > 0 && w.low_triggered && current > low * (1 + REARM_BUFFER_PCT)) {
      patch.low_triggered = false
    }

    if (high > 0 && current >= high) {
      if (!w.high_triggered) {
        const { title, body } = NOTIF_TEMPLATES.WATCHLIST_HIGH(ticker)
        await sendNotification({ userId: w.user_id, type: 'WATCHLIST_HIGH', ticker, title, body })
        result.watchlist.notified++
      }
      patch.high_triggered = true
    } else if (high > 0 && w.high_triggered && current < high * (1 - REARM_BUFFER_PCT)) {
      patch.high_triggered = false
    }

    if (Object.keys(patch).length > 0) {
      await db.from('watchlists').update(patch).eq('id', w.id)
    }
  }

  // ═══════════════════════ PART B — POSITIONS ═══════════════════════════
  const { data: positions, error: posErr } = await db
    .from('positions').select('*').neq('state', 'CLOSED')
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

  // ═══════════════════════ PART C — TRADES (ANALYSES) ════════════════════
  // Un trade publié se clôture automatiquement dès que le cours atteint
  // l'objectif ou le stop. La clôture est définitive (closed_at figé) :
  // même si le cours revient ensuite dans la zone, le trade reste clôturé
  // avec le résultat constaté au moment du franchissement — contrairement
  // aux alertes watchlist/positions plus haut, qui elles se réarment.
  const { data: trades, error: trErr } = await db
    .from('technical_analyses')
    .select('id, ticker, entry_price, target_price, stop_loss')
    .eq('status', 'published')
    .is('closed_at', null)

  if (trErr) console.error('technical_analyses fetch error:', trErr.message)

  for (const t of trades ?? []) {
    const current = t.ticker ? prixMap[t.ticker.toUpperCase()] : undefined
    // IMPORTANT : `!current` exclut à la fois `undefined` (ticker absent des
    // cotations) ET `0` (cotation invalide/marché fermé/glitch de l'API).
    // C'était `current == null` avant : un `current = 0` passait ce garde-fou
    // et déclenchait un faux "stop" pour tout trade avec un stop_loss > 0,
    // ce qui a provoqué la clôture en masse observée en base (close_price: 0).
    if (!current) continue
    result.trades.checked++

    const statut = getStatutNiveau(t.entry_price, t.target_price, t.stop_loss, current)
    if (!statut) continue

    const { error: closeErr } = await db
      .from('technical_analyses')
      .update({
        closed_at:    new Date().toISOString(),
        close_reason: statut,
        close_price:  current,
      })
      .eq('id', t.id)
      .is('closed_at', null) // garde-fou anti double-clôture si deux cycles se chevauchent

    if (closeErr) {
      console.error('close technical_analysis error:', closeErr.message)
      continue
    }
    result.trades.closed++
  }

  return NextResponse.json({ ok: true, result })
}
