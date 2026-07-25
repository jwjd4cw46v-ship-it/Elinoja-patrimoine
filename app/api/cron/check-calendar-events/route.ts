import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendNotification, type NotifType } from '@/lib/notifications'

/**
 * GET /api/cron/check-calendar-events
 * ─────────────────────────────────────────────────────────────────────────
 * Vérifie, pour chaque société détenue en position par un utilisateur,
 * si une assemblée générale (event_date) ou un détachement de dividende
 * (detachement) tombe dans exactement 7 jours ou 1 jour, et envoie une
 * notification (in-app + push) le cas échéant.
 *
 * Contrairement à check-alerts (prix, toutes les 1-5 min), cette route n'a
 * besoin de tourner qu'une fois par jour — les dates ne changent pas en
 * cours de journée. À configurer sur cron-job.org avec une fréquence
 * quotidienne (ex : 7h00 Tunisie).
 *
 * Anti-doublon : une ligne calendar_event_notifs est insérée pour chaque
 * (event_id, user_id, champ de date, fenêtre) envoyé. La contrainte UNIQUE
 * empêche un second envoi si le cron tourne plusieurs fois le même jour.
 *
 * Sécurisé par le même secret partagé que les autres routes cron :
 * Authorization: Bearer <CRON_SECRET>
 */

const service = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

// Même logique de date Tunisie (UTC+1 fixe) que /api/cotations, dupliquée
// volontairement pour garder cette route cron autonome.
function getTodayTunisie(): string {
  const now     = new Date()
  const tunisie = new Date(now.getTime() + 60 * 60 * 1000)
  const y = tunisie.getUTCFullYear()
  const m = String(tunisie.getUTCMonth() + 1).padStart(2, '0')
  const d = String(tunisie.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Différence en jours entre deux dates 'YYYY-MM-DD' (minuit UTC des deux côtés,
// donc pas d'effet de fuseau horaire sur le calcul lui-même).
function daysBetween(dateStr: string, todayStr: string): number {
  const d1 = new Date(`${dateStr}T00:00:00Z`).getTime()
  const d2 = new Date(`${todayStr}T00:00:00Z`).getTime()
  return Math.round((d1 - d2) / 86_400_000)
}

interface CalendarEvent {
  id:           string
  company_name: string
  ticker:       string | null
  event_type:   string
  event_date:   string | null
  location:     string | null
  dividende:    number | null
  detachement:  string | null
  is_confirmed: boolean
}

interface PositionRow {
  user_id: string
  ticker:  string
}

// (event_id, field, window) déjà envoyés, pour filtrage en mémoire avant insert
interface NotifLog {
  event_id: string
  user_id:  string
  field:    string
  notif_window:   string
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db    = service()
  const today = getTodayTunisie()

  const result = { events: 0, usersChecked: 0, notified: 0 }

  // ── 1. Événements confirmés dans les 8 prochains jours ──────────────────
  // (marge de sécurité autour de J7 pour ne rater aucun cas si le cron
  // tourne juste avant/après minuit)
  const inEightDays = new Date(new Date(`${today}T00:00:00Z`).getTime() + 8 * 86_400_000)
    .toISOString().slice(0, 10)

  const { data: events, error: evErr } = await db
    .from('calendar_events')
    .select('id, company_name, ticker, event_type, event_date, location, dividende, detachement, is_confirmed')
    .eq('is_confirmed', true)
    .not('ticker', 'is', null)
    .or(
      `and(event_date.gte.${today},event_date.lte.${inEightDays}),` +
      `and(detachement.gte.${today},detachement.lte.${inEightDays})`
    )

  if (evErr) {
    console.error('calendar_events fetch error:', evErr.message)
    return NextResponse.json({ error: evErr.message }, { status: 500 })
  }
  if (!events?.length) {
    return NextResponse.json({ ok: true, result })
  }
  result.events = events.length

  const tickers = Array.from(
    new Set((events as CalendarEvent[]).map(e => e.ticker!.toUpperCase()))
  )

  // ── 2. Utilisateurs détenant ces tickers en position ouverte ────────────
  const { data: positions, error: posErr } = await db
    .from('positions')
    .select('user_id, ticker')
    .neq('state', 'CLOSED')
    .in('ticker', tickers)

  if (posErr) {
    console.error('positions fetch error:', posErr.message)
    return NextResponse.json({ error: posErr.message }, { status: 500 })
  }
  if (!positions?.length) {
    return NextResponse.json({ ok: true, result })
  }

  // ticker -> liste des user_id qui le détiennent
  const holdersByTicker: Record<string, Set<string>> = {}
  for (const p of positions as PositionRow[]) {
    const t = p.ticker.toUpperCase()
    if (!holdersByTicker[t]) holdersByTicker[t] = new Set()
    holdersByTicker[t].add(p.user_id)
  }

  // ── 3. Déjà notifiés (anti-doublon) ──────────────────────────────────────
  const eventIds = (events as CalendarEvent[]).map(e => e.id)
  const { data: alreadySent, error: logErr } = await db
    .from('calendar_event_notifs')
    .select('event_id, user_id, field, notif_window')
    .in('event_id', eventIds)

  if (logErr) console.error('calendar_event_notifs fetch error:', logErr.message)

  const sentSet = new Set(
    ((alreadySent ?? []) as NotifLog[]).map(
      l => `${l.event_id}|${l.user_id}|${l.field}|${l.notif_window}`
    )
  )

  // ── 4. Pour chaque événement, chaque champ de date, chaque détenteur ────
  const toInsertLog: { event_id: string; user_id: string; field: string; notif_window: string }[] = []

  for (const ev of events as CalendarEvent[]) {
    const ticker  = ev.ticker!.toUpperCase()
    const holders = holdersByTicker[ticker]
    if (!holders?.size) continue

    // (champ de date, libellé, type notif J7, type notif J1)
    const champs: {
      field: 'event_date' | 'detachement'
      dateVal: string | null
      typeJ7: NotifType
      typeJ1: NotifType
      buildBody: (daysLeft: number) => string
      buildTitle: (daysLeft: number) => string
    }[] = [
      {
        field: 'event_date',
        dateVal: ev.event_date,
        typeJ7: 'CALENDAR_AG_J7',
        typeJ1: 'CALENDAR_AG_J1',
        buildTitle: days => `📅 ${ev.event_type || 'Assemblée générale'} ${days === 1 ? 'demain' : `dans ${days} jours`} — ${ticker}`,
        buildBody: days => {
          const lieu = ev.location ? ` (${ev.location})` : ''
          return `${ev.event_type || 'Une assemblée générale'} de ${ev.company_name} est prévue le ${formatDateFr(ev.event_date!)}${lieu}.`
        },
      },
      {
        field: 'detachement',
        dateVal: ev.detachement,
        typeJ7: 'CALENDAR_DIV_J7',
        typeJ1: 'CALENDAR_DIV_J1',
        buildTitle: days => `💰 Détachement de dividende ${days === 1 ? 'demain' : `dans ${days} jours`} — ${ticker}`,
        buildBody: () => {
          const montant = ev.dividende ? ` de ${ev.dividende.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} DT` : ''
          return `Le détachement de dividende${montant} de ${ev.company_name} est prévu le ${formatDateFr(ev.detachement!)}.`
        },
      },
    ]

    for (const champ of champs) {
      if (!champ.dateVal) continue
      const daysLeft = daysBetween(champ.dateVal, today)
      if (daysLeft !== 7 && daysLeft !== 1) continue

      const notifWindow = daysLeft === 7 ? 'J7' : 'J1'
      const type    = daysLeft === 7 ? champ.typeJ7 : champ.typeJ1

      for (const userId of holders) {
        result.usersChecked++
        const key = `${ev.id}|${userId}|${champ.field}|${notifWindow}`
        if (sentSet.has(key)) continue

        await sendNotification({
          userId,
          type,
          ticker,
          title: champ.buildTitle(daysLeft),
          body:  champ.buildBody(daysLeft),
        })

        toInsertLog.push({ event_id: ev.id, user_id: userId, field: champ.field, notif_window: notifWindow })
        result.notified++
      }
    }
  }

  if (toInsertLog.length) {
    const { error: insLogErr } = await db.from('calendar_event_notifs').insert(toInsertLog)
    if (insLogErr) console.error('calendar_event_notifs insert error:', insLogErr.message)
  }

  return NextResponse.json({ ok: true, result })
}

function formatDateFr(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
