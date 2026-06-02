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
  '01-01', '01-14', '03-20', '04-09',
  '05-01', '07-25', '08-13', '10-15',
])

// Jours fériés variables 2025-2026
const VARIABLE_HOLIDAYS = new Set([
  '2025-03-30', '2025-03-31', '2025-04-01',
  '2025-06-06', '2025-06-07', '2025-06-08',
  '2025-06-26', '2025-09-04',
  '2026-03-19', '2026-03-20', '2026-03-21',
  '2026-05-26', '2026-05-27', '2026-05-28',
  '2026-06-16', '2026-08-25',
])

function isHoliday(date: Date): boolean {
  const mm_dd      = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const yyyy_mm_dd = `${date.getFullYear()}-${mm_dd}`
  return FIXED_HOLIDAYS.has(mm_dd) || VARIABLE_HOLIDAYS.has(yyyy_mm_dd)
}

function isBourseOpen(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false
  if (isHoliday(date)) return false
  return true
}

function getLastBusinessDay(date = new Date()): Date {
  const d = new Date(date)
  let maxTries = 14
  while (!isBourseOpen(d) && maxTries-- > 0) {
    d.setDate(d.getDate() - 1)
  }
  return d
}

// Extraction texte brut du PDF
async function extractPdfText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Referer': 'https://tunis-stockexchange.com/',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null

    const buffer  = await res.arrayBuffer()
    const decoder = new TextDecoder('latin1')
    const raw     = decoder.decode(new Uint8Array(buffer))

    const textParts: string[] = []
    const btRegex = /BT([\s\S]*?)ET/g
    let m
    while ((m = btRegex.exec(raw)) !== null) {
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g
      let sm
      while ((sm = strRegex.exec(m[1])) !== null) {
        const t = sm[1].replace(/\\n/g, '\n').replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim()
        if (t.length > 0) textParts.push(t)
      }
    }
    return textParts.length > 0 ? textParts.join('\n') : null
  } catch {
    return null
  }
}

// Parser et mapper vers la structure de la table `cotations`
// Colonnes : nom, ouverture, haut, bas, vol_titres, vol_dt, dernier, variation, date
function parseBvmtText(text: string, date: string): any[] {
  const rows: any[] = []
  const seen  = new Set<string>()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const lineRx = /^([A-Z][A-Z0-9\s\-\.\(\)]{1,30?})\s+([\d]+[,\.][\d]{3})\s+([\d]+[,\.][\d]{3})\s+([\d]+[,\.][\d]{3})/

  for (const line of lines) {
    const m = line.match(lineRx)
    if (!m) continue

    const nom = m[1].trim().replace(/\s+/g, ' ')
    if (seen.has(nom)) continue

    const ouverture = parseFloat(m[2].replace(',', '.'))
    const haut      = parseFloat(m[3].replace(',', '.'))
    const dernier   = parseFloat(m[4].replace(',', '.'))
    if (!dernier || dernier <= 0) continue

    // Variation %
    const varM      = line.match(/([\+\-]?\s*\d+[,\.]\d+)\s*%/)
    const variation = varM ? varM[1].replace(/\s/, '') + '%' : null

    // Volumes
    const nums      = line.match(/\d[\d\s]{3,}/g) || []
    const vol_titres = nums.length > 0 ? parseInt(nums[nums.length - 1].replace(/\s/g, '')) : null
    const vol_dt     = nums.length > 1 ? parseInt(nums[nums.length - 2].replace(/\s/g, '')) : null

    seen.add(nom)
    rows.push({
      nom,
      ouverture,
      haut,
      bas:       dernier, // bas non disponible directement, on met dernier
      vol_titres,
      vol_dt,
      dernier,
      variation,
      date,
    })
  }
  return rows
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const force     = searchParams.get('force') === '1'
  const dateParam = searchParams.get('date')

  try {
    const supabase    = createServiceClient()
    const targetDate  = dateParam ? new Date(dateParam) : getLastBusinessDay()
    const todayStr    = targetDate.toISOString().split('T')[0]

    // Cache 24h — vérifier si les données du jour existent déjà
    if (!force) {
      const { data: cached } = await supabase
        .from('cotations')
        .select('*')
        .eq('date', todayStr)
        .order('nom', { ascending: true })
        .limit(80)

      if (cached && cached.length > 0) {
        return NextResponse.json({
          source: 'cache',
          quotes: cached,
          count:  cached.length,
          date:   todayStr,
        })
      }
    }

    // Fetch PDF
    const pdfUrl = buildPdfUrl(targetDate)
    let text = await extractPdfText(pdfUrl)

    // Essayer J-1
    if (!text) {
      const prev    = getLastBusinessDay(new Date(targetDate.getTime() - 86400000))
      const prevStr = prev.toISOString().split('T')[0]
      text          = await extractPdfText(buildPdfUrl(prev))

      if (text) {
        const rows = parseBvmtText(text, prevStr)
        if (rows.length > 0) {
          await supabase.from('cotations').upsert(rows, { onConflict: 'nom,date' })
          return NextResponse.json({ source: 'pdf_prev', quotes: rows, count: rows.length, date: prevStr })
        }
      }
    } else {
      const rows = parseBvmtText(text, todayStr)
      if (rows.length > 0) {
        await supabase.from('cotations').upsert(rows, { onConflict: 'nom,date' })
        return NextResponse.json({ source: 'pdf', quotes: rows, count: rows.length, date: todayStr })
      }
    }

    // Fallback : dernière date disponible en cache
    const { data: stale } = await supabase
      .from('cotations')
      .select('*')
      .order('date', { ascending: false })
      .limit(80)

    if (stale && stale.length > 0) {
      return NextResponse.json({
        source:  'stale_cache',
        quotes:  stale,
        count:   stale.length,
        warning: 'PDF indisponible — cache',
      })
    }

    // Dernier recours — données statiques dans la structure cotations
    return NextResponse.json({
      source: 'fallback',
      quotes: getDefaultRows(todayStr),
      count:  10,
    })

  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function getDefaultRows(date: string) {
  return [
    { nom: 'TUNINDEX',  ouverture: 9820,    haut: 9860,   bas: 9810,  vol_titres: null,  vol_dt: null, dernier: 9842.50, variation: '+0.42%', date },
    { nom: 'SFBT',      ouverture: 16.100,  haut: 16.350, bas: 16.050,vol_titres: 12430, vol_dt: null, dernier: 16.250,  variation: '+1.25%', date },
    { nom: 'BNA',       ouverture: 8.150,   haut: 8.200,  bas: 8.100, vol_titres: 8210,  vol_dt: null, dernier: 8.120,   variation: '-0.37%', date },
    { nom: 'ATB',       ouverture: 4.850,   haut: 4.900,  bas: 4.840, vol_titres: 15670, vol_dt: null, dernier: 4.870,   variation: '+0.87%', date },
    { nom: 'BIAT',      ouverture: 111.500, haut: 113,    bas: 111,   vol_titres: 3240,  vol_dt: null, dernier: 112.500, variation: '+1.35%', date },
    { nom: 'BT',        ouverture: 7.370,   haut: 7.450,  bas: 7.350, vol_titres: 6890,  vol_dt: null, dernier: 7.400,   variation: '+0.68%', date },
    { nom: 'PGH',       ouverture: 9.780,   haut: 9.800,  bas: 9.620, vol_titres: 21000, vol_dt: null, dernier: 9.650,   variation: '-1.53%', date },
    { nom: 'STB',       ouverture: 2.860,   haut: 2.870,  bas: 2.840, vol_titres: 7430,  vol_dt: null, dernier: 2.850,   variation: '-0.35%', date },
    { nom: 'TLS',       ouverture: 3.105,   haut: 3.140,  bas: 3.100, vol_titres: 9800,  vol_dt: null, dernier: 3.120,   variation: '+0.64%', date },
    { nom: 'BH BANK',   ouverture: 22.200,  haut: 22.500, bas: 22.100,vol_titres: 4560,  vol_dt: null, dernier: 22.400,  variation: '+1.36%', date },
  ]
}
