import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Instancié à la demande pour éviter l'erreur "supabaseUrl is required" au build
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const BVMT_URL = 'https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99'

// Jours fériés tunisiens (MM-DD)
const JOURS_FERIES = [
  '01-01', // Jour de l'an
  '03-20', // Fête de l'indépendance
  '04-09', // Journée des martyrs
  '05-01', // Fête du travail
  '07-25', // Fête de la République
  '08-13', // Fête de la femme
  '10-15', // Fête de l'Evacuation
]

function isBvmtOuverte() {
  const now = new Date()

  // Tunisie = UTC+1 fixe (pas de changement d'heure)
  const utcMs   = now.getTime() + now.getTimezoneOffset() * 60000
  const tunisie = new Date(utcMs + 3600000)

  const jour     = tunisie.getUTCDay()
  const mois     = String(tunisie.getUTCMonth() + 1).padStart(2, '0')
  const jourd    = String(tunisie.getUTCDate()).padStart(2, '0')
  const cle      = `${mois}-${jourd}`
  const totalMin = tunisie.getUTCHours() * 60 + tunisie.getUTCMinutes()

  if (jour === 0 || jour === 6)   return false  // Week-end
  if (JOURS_FERIES.includes(cle)) return false  // Férié
  if (totalMin < 9 * 60)          return false  // Avant 9h
  if (totalMin > 14 * 60 + 15)    return false  // Après 14h15

  return true
}

async function getFromBase(today) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cotations')
    .select('*')
    .eq('date', today)
    .order('nom')

  if (error) throw error
  return data || []
}

async function getLastUpdateFromBase(today) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('cotations')
    .select('updated_at')
    .eq('date', today)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.updated_at ? new Date(data.updated_at) : null
}

async function fetchFromBvmt() {
  const res = await fetch(BVMT_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer':    'https://www.bvmt.com.tn/',
      'Accept':     'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Erreur BVMT: ${res.status}`)
  return res.json()
}

async function upsertCotations(markets, today) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  // Récupérer les plus_haut/plus_bas existants pour la journée
  const { data: existing } = await supabase
    .from('cotations')
    .select('nom, plus_haut, plus_bas')
    .eq('date', today)

  const existingMap = {}
  for (const row of existing || []) {
    existingMap[row.nom] = row
  }

  const rows = markets.map((m) => {
    const ticker = m.referentiel?.ticker || m.referentiel?.stockName || ''
    const last   = m.last || null
    const high   = m.high || null
    const low    = m.low  || null
    const prev   = existingMap[ticker]

    // Calculer plus_haut / plus_bas cumulés sur la séance
    const plusHaut = prev?.plus_haut != null
      ? Math.max(prev.plus_haut, high ?? 0, last ?? 0)
      : (high ?? last ?? null)

    const plusBas = prev?.plus_bas != null
      ? Math.min(prev.plus_bas, low ?? Infinity, last ?? Infinity)
      : (low ?? last ?? null)

    return {
      nom:        ticker,
      ouverture:  m.open   || null,
      haut:       high,
      bas:        low,
      plus_haut:  plusHaut,
      plus_bas:   plusBas,
      vol_titres: m.volume || null,
      vol_dt:     m.caps   || null,
      dernier:    last,
      variation:  m.change != null ? `${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}%` : null,
      date:       today,
      updated_at: now,
    }
  })

  const { error } = await getSupabase()
    .from('cotations')
    .upsert(rows, { onConflict: 'nom,date' })

  if (error) throw error
  return rows
}

export async function GET() {
  const now   = new Date()
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Tunis' }) // YYYY-MM-DD

  // Debug timezone
  const utcMs    = now.getTime() + now.getTimezoneOffset() * 60000
  const tunisie  = new Date(utcMs + 3600000)
  const debugInfo = {
    utcHeure:     now.toISOString(),
    tunisieHeure: `${tunisie.getUTCHours()}:${String(tunisie.getUTCMinutes()).padStart(2,'0')}`,
    jour:         tunisie.getUTCDay(),
    totalMin:     tunisie.getUTCHours() * 60 + tunisie.getUTCMinutes(),
    ouverte:      isBvmtOuverte(),
    today,
  }
  console.log('DEBUG cotations:', JSON.stringify(debugInfo))

  try {
    // 1. Si BVMT fermée → base directement
    if (!isBvmtOuverte()) {
      const data = await getFromBase(today)
      return NextResponse.json(
        { source: 'base', bvmt_ouverte: false, count: data.length, markets: dbToMarkets(data) },
        { headers: { 'Cache-Control': 'public, max-age=300' } }
      )
    }

    // 2. BVMT ouverte → vérifier fraîcheur du cache (< 1 min)
    const lastUpdate = await getLastUpdateFromBase(today)
    const ageSec = lastUpdate ? (Date.now() - lastUpdate.getTime()) / 1000 : Infinity

    if (ageSec < 60) {
      // Données fraîches en base, on les retourne directement
      const data = await getFromBase(today)
      // Si la base est vide malgré un updated_at récent, on force l'API
      if (data.length > 0) {
        return NextResponse.json(
          {
            source:        'cache',
            bvmt_ouverte:  true,
            cached_il_y_a: Math.round(ageSec) + 's',
            count:         data.length,
            markets:       dbToMarkets(data),
          },
          { headers: { 'Cache-Control': 'public, max-age=30' } }
        )
      }
    }

    // 3. Cache absent/vide/périmé → appel API BVMT
    let bvmtData
    try {
      bvmtData = await fetchFromBvmt()
    } catch (apiErr) {
      // 4. Fallback base si API indisponible
      console.warn('BVMT API indisponible, fallback base:', apiErr.message)
      const data = await getFromBase(today)
      return NextResponse.json(
        { source: 'fallback_base', bvmt_error: apiErr.message, count: data.length, markets: dbToMarkets(data) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const markets = bvmtData.markets || []
    await upsertCotations(markets, today)

    // Retourner depuis la base (avec plus_haut/plus_bas mis à jour)
    const data = await getFromBase(today)
    return NextResponse.json(
      { source: 'api', bvmt_ouverte: true, count: data.length, markets: dbToMarkets(data) },
      { headers: { 'Cache-Control': 'public, max-age=30' } }
    )

  } catch (err) {
    console.error('Erreur cotations route:', err)
    // Dernier recours : base
    try {
      const data = await getFromBase(today)
      return NextResponse.json(
        { source: 'fallback_base', error: err.message, count: data.length, markets: dbToMarkets(data) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    } catch {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }
}

// Convertir les lignes DB au format Market attendu par le frontend
function dbToMarkets(rows) {
  return rows.map((r) => ({
    isin:      r.nom,
    last:      r.dernier,
    change:    parseFloat((r.variation || '0').replace('%', '')),
    high:      r.haut,
    low:       r.bas,
    plus_haut: r.plus_haut,
    plus_bas:  r.plus_bas,
    open:      r.ouverture,
    volume:    r.vol_titres,
    caps:      r.vol_dt,
    updated_at: r.updated_at,
    referentiel: {
      stockName: r.nom,
      ticker:    r.nom,
      valGroup:  '',
    },
  }))
}
