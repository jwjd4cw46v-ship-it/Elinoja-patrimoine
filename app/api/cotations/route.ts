import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error(`Supabase env manquant: url=${!!url} key=${!!key}`)
  return createClient(url, key)
}

const BVMT_URL = 'https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99'

const JOURS_FERIES = [
  '01-01', '03-20', '04-09', '05-01',
  '07-25', '08-13', '10-15',
]

function isBvmtOuverte() {
  const now      = new Date()
  // UTC+1 fixe (Tunisie)
  const tunisie  = new Date(now.getTime() + 60 * 60 * 1000)
  const jour     = tunisie.getUTCDay()
  const mois     = String(tunisie.getUTCMonth() + 1).padStart(2, '0')
  const jourd    = String(tunisie.getUTCDate()).padStart(2, '0')
  const cle      = `${mois}-${jourd}`
  const totalMin = tunisie.getUTCHours() * 60 + tunisie.getUTCMinutes()

  if (jour === 0 || jour === 6)      return false
  if (JOURS_FERIES.includes(cle))    return false
  if (totalMin < 9 * 60)             return false
  if (totalMin > 14 * 60 + 15)       return false
  return true
}

function getToday() {
  const now     = new Date()
  const tunisie = new Date(now.getTime() + 60 * 60 * 1000)
  const y = tunisie.getUTCFullYear()
  const m = String(tunisie.getUTCMonth() + 1).padStart(2, '0')
  const d = String(tunisie.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function getFromBase(today) {
  const { data, error } = await getSupabase()
    .from('cotations')
    .select('*')
    .eq('date', today)
    .order('nom')
  if (error) throw error
  return data || []
}

// Récupère les cotations de la dernière date disponible en base, toute date confondue
async function getLatestFromBase() {
  const { data: lastRow } = await getSupabase()
    .from('cotations')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lastRow?.date) return { rows: [], date: null }

  const { data, error } = await getSupabase()
    .from('cotations')
    .select('*')
    .eq('date', lastRow.date)
    .order('nom')

  if (error) throw error
  return { rows: data || [], date: lastRow.date }
}

// FIX : fraîcheur mesurée sur la ligne la PLUS ANCIENNE du jour, pas la plus récente.
// Avant, un seul ticker fraîchement upserté suffisait à faire passer ageSec < 60
// pour TOUTE la base, alors que d'autres tickers (ex: TGH) pouvaient être bloqués
// sur une valeur ancienne. En prenant le minimum (la ligne la moins fraîche),
// on ne sert le cache que si TOUS les titres ont été mis à jour récemment.
async function getAgeSecondes(today) {
  const { data } = await getSupabase()
    .from('cotations')
    .select('updated_at')
    .eq('date', today)
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!data?.updated_at) return Infinity
  return (Date.now() - new Date(data.updated_at).getTime()) / 1000
}

async function fetchBvmt() {
  const res = await fetch(BVMT_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer':    'https://www.bvmt.com.tn/',
      'Accept':     'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`BVMT ${res.status}`)
  const json = await res.json()
  return json.markets || []
}

async function upsertMarkets(markets, today) {
  const now = new Date().toISOString()

  const { data: existing } = await getSupabase()
    .from('cotations')
    .select('nom, plus_haut, plus_bas')
    .eq('date', today)

  const map = {}
  for (const r of existing || []) map[r.nom] = r

  const rows = markets.map((m) => {
    const nom  = m.referentiel?.ticker || m.referentiel?.stockName || ''
    const last = m.last ?? null
    const high = m.high ?? null
    const low  = m.low  ?? null
    const prev = map[nom]

    const plus_haut = prev?.plus_haut != null
      ? Math.max(prev.plus_haut, high ?? 0, last ?? 0)
      : (high ?? last ?? null)

    const plus_bas = prev?.plus_bas != null
      ? Math.min(prev.plus_bas, ...[low, last].filter(v => v != null))
      : (low ?? last ?? null)

    return {
      nom,
      ouverture:  m.open   ?? null,
      haut:       high,
      bas:        low,
      plus_haut,
      plus_bas,
      vol_titres: m.volume ?? null,
      vol_dt:     m.caps   ?? null,
      dernier:    last,
      variation:  m.change != null
        ? `${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}%`
        : null,
      date:       today,
      updated_at: now,
    }
  })

  const { error } = await getSupabase()
    .from('cotations')
    .upsert(rows, { onConflict: 'nom,date' })

  if (error) throw error
  return rows.length
}

function dbToMarkets(rows) {
  return rows.map((r) => ({
    isin:       r.nom,
    last:       r.dernier,
    change:     parseFloat((r.variation || '0').replace('%', '')),
    high:       r.haut,
    low:        r.bas,
    plus_haut:  r.plus_haut,
    plus_bas:   r.plus_bas,
    open:       r.ouverture,
    volume:     r.vol_titres,
    caps:       r.vol_dt,
    updated_at: r.updated_at,
    referentiel: { stockName: r.nom, ticker: r.nom, valGroup: '' },
  }))
}

export async function GET() {
  const today = getToday()
  const bvmtOuverte = isBvmtOuverte()

  try {
    // Étape 1 : lire la base pour aujourd'hui
    const baseData = await getFromBase(today)
    const baseVide = baseData.length === 0

    // Étape 2 : si base vide → appel API obligatoire
    if (baseVide) {
      try {
        const markets = await fetchBvmt()
        await upsertMarkets(markets, today)
        const fresh = await getFromBase(today)
        return NextResponse.json(
          { source: 'api', bvmt_ouverte: bvmtOuverte, count: fresh.length, markets: dbToMarkets(fresh) },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      } catch (apiErr) {
        // API morte ET pas de données aujourd'hui
        // → fallback sur la dernière séance disponible en base (ex : vendredi)
        const { rows: latestData, date: latestDate } = await getLatestFromBase()
        return NextResponse.json(
          {
            source:      'fallback_base',
            bvmt_error:  apiErr.message,
            bvmt_ouverte: bvmtOuverte,
            fallback_date: latestDate,
            count:       latestData.length,
            markets:     dbToMarkets(latestData),
          },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      }
    }

    // FIX : pendant les heures de marché, on ne sert JAMAIS le cache sans
    // revérifier BVMT. Avant, un cache < 60s pouvait figer un titre précis
    // (ex: TGH) sur une ancienne valeur pendant que les autres se rafraîchissaient,
    // car la fraîcheur était mesurée globalement (MAX updated_at) au lieu
    // d'être garantie pour CHAQUE titre. Hors séance, le marché ne bouge pas :
    // le cache reste sûr et évite des appels BVMT inutiles.
    if (!bvmtOuverte) {
      const ageSec = await getAgeSecondes(today)
      if (ageSec < 60) {
        return NextResponse.json(
          {
            source:        'cache',
            bvmt_ouverte:  bvmtOuverte,
            cached_il_y_a: Math.round(ageSec) + 's',
            count:         baseData.length,
            markets:       dbToMarkets(baseData),
          },
          { headers: { 'Cache-Control': 'public, max-age=30' } }
        )
      }
    }

    // Marché ouvert (ou cache hors-séance expiré) → appel API, puis stockage
    try {
      const markets = await fetchBvmt()
      await upsertMarkets(markets, today)
      const fresh = await getFromBase(today)
      return NextResponse.json(
        { source: 'api', bvmt_ouverte: bvmtOuverte, count: fresh.length, markets: dbToMarkets(fresh) },
        { headers: { 'Cache-Control': 'public, max-age=30' } }
      )
    } catch (apiErr) {
      // API morte → fallback sur les données du jour en base
      return NextResponse.json(
        { source: 'fallback_base', bvmt_error: apiErr.message, bvmt_ouverte: bvmtOuverte, count: baseData.length, markets: dbToMarkets(baseData) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

  } catch (err) {
    console.error('ERREUR cotations:', err.message)
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
