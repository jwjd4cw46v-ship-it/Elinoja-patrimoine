import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ─── URL du PDF ───────────────────────────────────────────────────────────────
function buildPdfUrl(date: Date): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`
}

// ─── Jours fériés ─────────────────────────────────────────────────────────────
const FIXED_HOLIDAYS = new Set([
  '01-01','01-14','03-20','04-09','05-01','07-25','08-13','10-15',
])
const VARIABLE_HOLIDAYS = new Set([
  '2025-03-30','2025-03-31','2025-04-01',
  '2025-06-06','2025-06-07','2025-06-08',
  '2025-06-26','2025-09-04',
  '2026-03-19','2026-03-20','2026-03-21',
  '2026-05-26','2026-05-27','2026-05-28',
  '2026-06-16','2026-08-25',
])

function isHoliday(date: Date): boolean {
  const mm_dd      = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const yyyy_mm_dd = `${date.getFullYear()}-${mm_dd}`
  return FIXED_HOLIDAYS.has(mm_dd) || VARIABLE_HOLIDAYS.has(yyyy_mm_dd)
}

function isBourseOpen(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 && !isHoliday(date)
}

function getLastBusinessDay(date = new Date()): Date {
  const d = new Date(date)
  let max = 14
  while (!isBourseOpen(d) && max-- > 0) d.setDate(d.getDate() - 1)
  return d
}

// ─── Extraction PDF améliorée ─────────────────────────────────────────────────
// Décode les chaînes PDF encodées en octal/hex
function decodePdfString(s: string): string {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

// Tente de lire le PDF avec claude (via l'API Anthropic) comme fallback
async function extractPdfViaAnthropic(pdfBuffer: ArrayBuffer): Promise<string | null> {
  try {
    const base64 = Buffer.from(pdfBuffer).toString('base64')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `Extrait le tableau de cotation BVMT de ce PDF.
Pour chaque valeur cotée, retourne une ligne JSON (une par ligne, pas d'array) avec ces champs exacts :
{"ticker":"SFBT","price":16.25,"open":16.1,"high":16.35,"low":16.05,"volume":12430,"change_pct":1.25}

- ticker : le code de la valeur (ex: SFBT, BNA, BIAT...)
- price : le cours de clôture (Dernier cours)
- open : le cours d'ouverture (Premier cours ou Cours Réf si absent)
- high : le plus haut
- low : le plus bas
- volume : nombre de titres échangés
- change_pct : variation en % (avec signe)

Retourne UNIQUEMENT les lignes JSON, rien d'autre.`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      console.log('[BVMT] Anthropic API error:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.content?.map((b: any) => b.text ?? '').join('\n') ?? ''
    return text.trim() || null
  } catch (e) {
    console.log('[BVMT] Anthropic extraction error:', e)
    return null
  }
}

async function fetchPdfBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://tunis-stockexchange.com/',
      },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) {
      console.log('[BVMT] PDF fetch failed:', res.status, url)
      console.log('[BVMT] Status text:', res.statusText)
      return null
    }
    return await res.arrayBuffer()
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.message?.includes('timeout')) {
      console.log('[BVMT] PDF fetch timeout - server might be down or network unreachable')
    } else if (e?.code === 'ECONNREFUSED' || e?.message?.includes('ECONNREFUSED')) {
      console.log('[BVMT] Connection refused - BVMT server is likely offline')
    } else if (e?.message?.includes('DNS') || e?.message?.includes('ENOTFOUND')) {
      console.log('[BVMT] DNS resolution failed - cannot reach tunis-stockexchange.com')
    } else {
      console.log('[BVMT] Fetch error:', e?.message || e)
    }
    return null
  }
}

// Extraction brute BT...ET (méthode originale améliorée)
function extractRawText(buffer: ArrayBuffer): string | null {
  const decoder = new TextDecoder('latin1')
  const raw     = decoder.decode(new Uint8Array(buffer))

  const textParts: string[] = []
  const btRegex = /BT([\s\S]*?)ET/g
  let m

  while ((m = btRegex.exec(raw)) !== null) {
    const block = m[1]

    // Chaînes simples (...)
    const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g
    let sm
    while ((sm = strRegex.exec(block)) !== null) {
      const decoded = decodePdfString(sm[1]).trim()
      if (decoded.length > 0) textParts.push(decoded)
    }

    // Tableaux TJ [(...) num (...) num ...]
    const tjRegex = /\[([\s\S]*?)\]\s*TJ/g
    let tj
    while ((tj = tjRegex.exec(block)) !== null) {
      const inner = tj[1]
      const parts: string[] = []
      const partRx = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g
      let pm
      while ((pm = partRx.exec(inner)) !== null) {
        const decoded = decodePdfString(pm[1]).trim()
        if (decoded) parts.push(decoded)
      }
      if (parts.length > 0) textParts.push(parts.join(''))
    }
  }

  return textParts.length > 0 ? textParts.join('\n') : null
}

// ─── Parser le texte JSON retourné par Claude ─────────────────────────────────
function parseAnthropicResponse(text: string): any[] {
  const quotes: any[] = []
  const seen = new Set<string>()
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    try {
      const obj = JSON.parse(trimmed)
      if (!obj.ticker || !obj.price) continue
      if (seen.has(obj.ticker)) continue
      seen.add(obj.ticker)

      const ref    = obj.open ?? obj.price
      const last   = obj.price
      const change = Math.round((last - ref) * 1000) / 1000

      quotes.push({
        ticker:     obj.ticker.trim().toUpperCase(),
        name:       obj.ticker.trim().toUpperCase(),
        price:      Math.round(last * 1000) / 1000,
        open:       Math.round(ref  * 1000) / 1000,
        change,
        change_pct: obj.change_pct ?? Math.round((change / ref) * 10000) / 100,
        volume:     obj.volume ?? 0,
        high:       obj.high ?? last,
        low:        obj.low  ?? last,
        updated_at: new Date().toISOString(),
      })
    } catch {
      // ligne non-JSON, on ignore
    }
  }

  return quotes
}

// ─── Parser le texte brut (méthode de secours) ───────────────────────────────
function parseBvmtText(text: string): any[] {
  const quotes: any[] = []
  const seen  = new Set<string>()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const lineRx = /^([A-Z][A-Z0-9\s\-\.]{1,25})\s+([\d]+[,\.][\d]{2,3})\s+([\d]+[,\.][\d]{2,3})\s+([\d]+[,\.][\d]{2,3})/

  for (const line of lines) {
    const m = line.match(lineRx)
    if (!m) continue

    const ticker = m[1].trim().replace(/\s+/g, ' ').toUpperCase()
    if (seen.has(ticker)) continue

    const ref   = parseFloat(m[2].replace(',', '.'))
    const first = parseFloat(m[3].replace(',', '.'))
    const last  = parseFloat(m[4].replace(',', '.'))
    if (!last || last <= 0) continue

    const varM      = line.match(/([\+\-]?\s*\d+[,\.]\d+)\s*%/)
    const changePct = varM
      ? parseFloat(varM[1].replace(/\s/g, '').replace(',', '.'))
      : Math.round((last - ref) / ref * 10000) / 100
    const change    = Math.round((last - ref) * 1000) / 1000

    const nums   = line.match(/\d[\d\s]{3,}/g) || []
    const volume = nums.length > 0 ? parseInt(nums[nums.length - 1].replace(/\s/g, '')) : 0

    seen.add(ticker)
    quotes.push({
      ticker,
      name:       ticker,
      price:      Math.round(last      * 1000) / 1000,
      open:       Math.round(first     * 1000) / 1000,
      change,
      change_pct: changePct,
      volume,
      high:       last,
      low:        last,
      updated_at: new Date().toISOString(),
    })
  }

  return quotes
}

// ─── Upsert Supabase ──────────────────────────────────────────────────────────
async function saveToSupabase(supabase: any, quotes: any[]): Promise<void> {
  const { error } = await supabase.from('market_quotes').upsert(
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
  if (error) console.error('[BVMT] Supabase upsert error:', error)
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const force     = searchParams.get('force') === '1'
  const dateParam = searchParams.get('date')
  const debug     = searchParams.get('debug') === '1'
  const testMode  = searchParams.get('test') === '1' || searchParams.get('mock') === '1'

  try {
    // ── MODE TEST: Retourner directement les données de secours ──
    if (testMode) {
      console.log('[BVMT] TEST MODE: Returning mock data')
      return NextResponse.json({
        source: 'test_mock',
        quotes: getDefaultQuotes(),
        count: 10,
        message: 'Mode test - données de démonstration'
      })
    }

    const supabase = createServiceClient()

    // ── 1. Cache Supabase valide 24h ──
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

    // ── 2. Télécharger le PDF ──
    const targetDate = dateParam ? new Date(dateParam) : getLastBusinessDay()
    const pdfUrl     = buildPdfUrl(targetDate)
    console.log('[BVMT] Fetching PDF:', pdfUrl)

    let pdfBuffer = await fetchPdfBuffer(pdfUrl)

    // Essai J-1 si PDF absent
    if (!pdfBuffer) {
      const prev    = getLastBusinessDay(new Date(targetDate.getTime() - 86400000))
      const prevUrl = buildPdfUrl(prev)
      console.log('[BVMT] Trying J-1:', prevUrl)
      pdfBuffer = await fetchPdfBuffer(prevUrl)
    }

    if (!pdfBuffer) {
      console.log('[BVMT] No PDF available')
      console.log('[BVMT] BVMT Server appears to be offline or unreachable')
      console.log('[BVMT] Using fallback cache or test data')
      const { data: stale } = await supabase
        .from('market_quotes').select('*').order('updated_at', { ascending: false }).limit(80)
      if (stale && stale.length > 0) {
        return NextResponse.json({
          source: 'stale_cache',
          quotes: stale,
          count: stale.length,
          warning: 'PDF indisponible - Serveur BVMT offline',
          hint: 'Utilisez ?test=1 pour les données de test'
        })
      }
      return NextResponse.json({
        source: 'fallback',
        quotes: getDefaultQuotes(),
        count: 10,
        warning: 'PDF indisponible - Serveur BVMT offline',
        hint: 'Utilisez ?test=1 pour les données de test'
      })
    }

    // ── 3. Extraction via Claude (priorité) ──
    let quotes: any[] = []
    let extractionMethod = 'none'

    if (process.env.ANTHROPIC_API_KEY) {
      console.log('[BVMT] Trying Claude extraction...')
      const claudeText = await extractPdfViaAnthropic(pdfBuffer)
      if (claudeText) {
        if (debug) console.log('[BVMT] Claude raw output:\n', claudeText)
        quotes = parseAnthropicResponse(claudeText)
        extractionMethod = 'claude'
        console.log(`[BVMT] Claude extracted ${quotes.length} quotes`)
      }
    }

    // ── 4. Fallback : extraction brute ──
    if (quotes.length === 0) {
      console.log('[BVMT] Falling back to raw text extraction...')
      const rawText = extractRawText(pdfBuffer)
      if (debug && rawText) console.log('[BVMT] Raw text:\n', rawText.slice(0, 2000))
      if (rawText) {
        quotes = parseBvmtText(rawText)
        extractionMethod = 'raw'
        console.log(`[BVMT] Raw extraction: ${quotes.length} quotes`)
      }
    }

    // ── 5. Sauvegarde et réponse ──
    if (quotes.length > 0) {
      await saveToSupabase(supabase, quotes)
      return NextResponse.json({
        source:    'pdf',
        method:    extractionMethod,
        pdf_url:   pdfUrl,
        quotes,
        count:     quotes.length,
      })
    }

    // ── 6. Cache périmé ──
    const { data: stale } = await supabase
      .from('market_quotes').select('*').order('updated_at', { ascending: false }).limit(80)
    if (stale && stale.length > 0) {
      return NextResponse.json({
        source: 'stale_cache',
        quotes: stale,
        count: stale.length,
        warning: 'Extraction échouée - Serveur BVMT indisponible',
        hint: 'Utilisez ?test=1 pour afficher les données de test'
      })
    }

    return NextResponse.json({
      source: 'fallback',
      quotes: getDefaultQuotes(),
      count: 10,
      warning: 'Serveur BVMT indisponible - Données de secours',
      hint: 'Utilisez ?test=1 pour afficher les données de test'
    })

  } catch (e) {
    console.error('[BVMT] Erreur:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── Données de secours ───────────────────────────────────────────────────────
function getDefaultQuotes() {
  return [
    { ticker: 'TUNINDEX', price: 9842.50, change: 41.20,  change_pct: 0.42,  volume: 0,     high: 9860,  low: 9810,  open: 9820,  updated_at: new Date().toISOString() },
    { ticker: 'SFBT',     price: 16.250,  change: 0.200,  change_pct: 1.25,  volume: 12430, high: 16.35, low: 16.05, open: 16.10, updated_at: new Date().toISOString() },
    { ticker: 'BNA',      price: 8.120,   change: -0.030, change_pct: -0.37, volume: 8210,  high: 8.20,  low: 8.10,  open: 8.15,  updated_at: new Date().toISOString() },
    { ticker: 'ATB',      price: 4.870,   change: 0.042,  change_pct: 0.87,  volume: 15670, high: 4.90,  low: 4.84,  open: 4.85,  updated_at: new Date().toISOString() },
    { ticker: 'BIAT',     price: 112.500, change: 1.500,  change_pct: 1.35,  volume: 3240,  high: 113,   low: 111,   open: 111.5, updated_at: new Date().toISOString() },
    { ticker: 'BT',       price: 7.400,   change: 0.050,  change_pct: 0.68,  volume: 6890,  high: 7.45,  low: 7.35,  open: 7.37,  updated_at: new Date().toISOString() },
    { ticker: 'PGH',      price: 9.650,   change: -0.150, change_pct: -1.53, volume: 21000, high: 9.80,  low: 9.62,  open: 9.78,  updated_at: new Date().toISOString() },
    { ticker: 'STB',      price: 2.850,   change: -0.010, change_pct: -0.35, volume: 7430,  high: 2.87,  low: 2.84,  open: 2.86,  updated_at: new Date().toISOString() },
    { ticker: 'TLS',      price: 3.120,   change: 0.020,  change_pct: 0.64,  volume: 9800,  high: 3.14,  low: 3.10,  open: 3.105, updated_at: new Date().toISOString() },
    { ticker: 'BH BANK',  price: 22.400,  change: 0.300,  change_pct: 1.36,  volume: 4560,  high: 22.5,  low: 22.1,  open: 22.2,  updated_at: new Date().toISOString() },
  ]
}
