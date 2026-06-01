import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Pattern URL du PDF par date
function buildPdfUrl(date: Date): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`
}

// Jours fériés tunisiens fixes (MM-DD)
const FIXED_HOLIDAYS = new Set([
  '01-01', // Jour de l'an
  '01-14', // Fête de la Révolution
  '03-20', // Fête de l'Indépendance
  '04-09', // Journée des martyrs
  '05-01', // Fête du Travail
  '07-25', // Fête de la République
  '08-13', // Fête de la Femme
  '10-15', // Fête de l'Évacuation
])

// Jours fériés variables 2025-2026 (YYYY-MM-DD)
// Fêtes religieuses — à mettre à jour chaque année
const VARIABLE_HOLIDAYS = new Set([
  // 2025
  '2025-03-30', // Aid El Fitr
  '2025-03-31',
  '2025-04-01',
  '2025-06-06', // Aid El Idha
  '2025-06-07',
  '2025-06-08',
  '2025-06-26', // Ras El An Hégire
  '2025-09-04', // Mouled
  // 2026
  '2026-03-19', // Aid El Fitr
  '2026-03-20',
  '2026-03-21',
  '2026-05-26', // Aid El Idha
  '2026-05-27',
  '2026-05-28',
  '2026-06-16', // Ras El An Hégire
  '2026-08-25', // Mouled
])

function isHoliday(date: Date): boolean {
  const mm_dd   = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const yyyy_mm_dd = `${date.getFullYear()}-${mm_dd}`
  return FIXED_HOLIDAYS.has(mm_dd) || VARIABLE_HOLIDAYS.has(yyyy_mm_dd)
}

function isBourseOpen(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false // dimanche ou samedi
  if (isHoliday(date)) return false
  return true
}

// Retourner le dernier jour de bourse ouvré
function getLastBusinessDay(date = new Date()): Date {
  const d = new Date(date)
  // Remonter jusqu'à trouver un jour ouvré
  let maxTries = 14 // sécurité anti-boucle infinie
  while (!isBourseOpen(d) && maxTries-- > 0) {
    d.setDate(d.getDate() - 1)
  }
  return d
}

// Extraction texte brut du PDF sans librairie externe
async function extractPdfText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://tunis-stockexchange.com/',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      console.log('[BVMT] PDF fetch failed:', res.status, url)
      return null
    }

    const buffer  = await res.arrayBuffer()
    const decoder = new TextDecoder('latin1')
    const raw     = decoder.decode(new Uint8Array(buffer))

    // Extraire les blocs de texte PDF (BT...ET)
    const textParts: string[] = []
    const btRegex = /BT([\s\S]*?)ET/g
    let m
    while ((m = btRegex.exec(raw)) !== null) {
      const block    = m[1]
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g
      let sm
      while ((sm = strRegex.exec(block)) !== null) {
        const t = sm[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim()
        if (t.length > 0) textParts.push(t)
      }
    }

    return textParts.length > 0 ? textParts.join('\n') : null
  } catch (e) {
    console.log('[BVMT] Extract error:', e)
    return null
  }
}

// Parser le texte extrait — colonnes BVMT :
// Valeur | Cours réf | Premier | Dernier | + Haut | + Bas | Nbre titres | Quantités | Capitaux | Var%
function parseBvmtText(text: string): any[] {
  const quotes: any[] = []
  const seen  = new Set<string>()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Regex pour une ligne de cotation :
  // Nom (lettres/chiffres/espaces/tirets) suivi de 3+ nombres séparés par espaces
  const lineRx = /^([A-Z][A-Z0-9\s\-\.\(\)]{1,30?})\s+([\d]+[,\.][\d]{3})\s+([\d]+[,\.][\d]{3})\s+([\d]+[,\.][\d]{3})/

  for (const line of lines) {
    const m = line.match(lineRx)
    if (!m) continue

    const ticker    = m[1].trim().replace(/\s+/g, ' ').toUpperCase()
    if (seen.has(ticker)) continue

    const ref       = parseFloat(m[2].replace(',', '.'))
    const first     = parseFloat(m[3].replace(',', '.'))
    const last      = parseFloat(m[4].replace(',', '.'))
    if (!last || last <= 0) continue

    // Variation %
    const varM      = line.match(/([\+\-]?\s*\d+[,\.]\d+)\s*%/)
    const changePct = varM ? parseFloat(varM[1].replace(/\s/, '').replace(',', '.')) : ((last - ref) / ref * 100)
    const change    = last - ref

    // Volume — dernier grand entier de la ligne
    const nums      = line.match(/\d[\d\s]{3,}/g) || []
    const volume    = nums.length > 0
      ? parseInt(nums[nums.length - 1].replace(/\s/g, '')) : 0

    seen.add(ticker)
    quotes.push({
      ticker,
      name:       ticker,
      price:      Math.round(last        * 1000) / 1000,
      open:       Math.round(first       * 1000) / 1000,
      change:     Math.round(change      * 1000) / 1000,
      change_pct: Math.round(changePct   * 100)  / 100,
      volume,
      high:       last,
      low:        last,
      updated_at: new Date().toISOString(),
    })
  }

  return quotes
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const force     = searchParams.get('force') === '1'
  const dateParam = searchParams.get('date')

  try {
    const supabase = createServiceClient()

    // Cache valide 24h — la BVMT ne cote qu'une fois par jour
    if (!force) {
      const { data: cached } = await supabase
        .from('market_quotes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(80)

      if (cached && cached.length > 0) {
        const age = Date.now() - new Date(cached[0].updated_at).getTime()
        if (age < 24 * 60 * 60 * 1000) {
          return NextResponse.json({ source: 'cache', quotes: cached, count: cached.length })
        }
      }
    }

    // Construire URL du PDF
    const targetDate = dateParam ? new Date(dateParam) : getLastBusinessDay()
    const pdfUrl     = buildPdfUrl(targetDate)
    console.log('[BVMT] Fetching:', pdfUrl)

    let text = await extractPdfText(pdfUrl)

    // Essayer J-1 si PDF pas encore disponible
    if (!text) {
      const prev    = getLastBusinessDay(new Date(targetDate.getTime() - 86400000))
      const prevUrl = buildPdfUrl(prev)
      console.log('[BVMT] Trying previous day:', prevUrl)
      text = await extractPdfText(prevUrl)
    }

    if (text) {
      const quotes = parseBvmtText(text)

      if (quotes.length > 0) {
        // Upsert dans Supabase
        await supabase.from('market_quotes').upsert(
          quotes.map(q => ({
            ticker:     q.ticker,
            name:       q.name,
            price:      q.price,
            change:     q.change,
            change_pct: q.change_pct,
            volume:     q.volume,
            high:       q.high,
            low:        q.low,
            open:       q.open,
            updated_at: q.updated_at,
          })),
          { onConflict: 'ticker' }
        )

        return NextResponse.json({
          source:  'pdf',
          pdf_url: pdfUrl,
          quotes,
          count:   quotes.length,
        })
      }
    }

    // Fallback : cache périmé
    const { data: stale } = await supabase
      .from('market_quotes').select('*').order('updated_at', { ascending: false }).limit(80)

    if (stale && stale.length > 0) {
      return NextResponse.json({ source: 'stale_cache', quotes: stale, count: stale.length, warning: 'PDF indisponible — cache' })
    }

    // Dernier recours
    return NextResponse.json({ source: 'fallback', quotes: getDefaultQuotes(), count: 10 })

  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function getDefaultQuotes() {
  return [
    { ticker: 'TUNINDEX', price: 9842.50, change: 41.20,  change_pct: 0.42,  volume: 0,     high: 9860, low: 9810, open: 9820, updated_at: new Date().toISOString() },
    { ticker: 'SFBT',     price: 16.250,  change: 0.200,  change_pct: 1.25,  volume: 12430, high: 16.35,low: 16.05,open: 16.10, updated_at: new Date().toISOString() },
    { ticker: 'BNA',      price: 8.120,   change: -0.030, change_pct: -0.37, volume: 8210,  high: 8.20, low: 8.10, open: 8.15,  updated_at: new Date().toISOString() },
    { ticker: 'ATB',      price: 4.870,   change: 0.042,  change_pct: 0.87,  volume: 15670, high: 4.90, low: 4.84, open: 4.85,  updated_at: new Date().toISOString() },
    { ticker: 'BIAT',     price: 112.500, change: 1.500,  change_pct: 1.35,  volume: 3240,  high: 113,  low: 111,  open: 111.5, updated_at: new Date().toISOString() },
    { ticker: 'BT',       price: 7.400,   change: 0.050,  change_pct: 0.68,  volume: 6890,  high: 7.45, low: 7.35, open: 7.37,  updated_at: new Date().toISOString() },
    { ticker: 'PGH',      price: 9.650,   change: -0.150, change_pct: -1.53, volume: 21000, high: 9.80, low: 9.62, open: 9.78,  updated_at: new Date().toISOString() },
    { ticker: 'STB',      price: 2.850,   change: -0.010, change_pct: -0.35, volume: 7430,  high: 2.87, low: 2.84, open: 2.86,  updated_at: new Date().toISOString() },
    { ticker: 'TLS',      price: 3.120,   change: 0.020,  change_pct: 0.64,  volume: 9800,  high: 3.14, low: 3.10, open: 3.105, updated_at: new Date().toISOString() },
    { ticker: 'BH BANK',  price: 22.400,  change: 0.300,  change_pct: 1.36,  volume: 4560,  high: 22.5, low: 22.1, open: 22.2,  updated_at: new Date().toISOString() },
  ]
}
