// lib/bvmt/fetchCotations.ts
// Fonction partagée — importée par tools.ts ET /api/bvmt/route.ts
// Évite les appels HTTP inter-routes (problème d'URL sur Vercel)

export interface Cotation {
  nom:        string
  ouverture:  number | null
  haut:       number | null
  bas:        number | null
  vol_titres: number | null
  vol_dt:     number | null
  dernier:    number | null
  variation:  string | null
  date:       string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPdfUrl(date: Date): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`
}

const FIXED_HOLIDAYS = new Set([
  '01-01', '01-14', '03-20', '04-09',
  '05-01', '07-25', '08-13', '10-15',
])

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

export function getLastBusinessDay(date = new Date()): Date {
  const d = new Date(date)
  let maxTries = 14
  while (!isBourseOpen(d) && maxTries-- > 0) {
    d.setDate(d.getDate() - 1)
  }
  return d
}

// ─── Extraction PDF ───────────────────────────────────────────────────────────

export async function extractPdfText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'application/pdf,*/*',
        'Referer':    'https://tunis-stockexchange.com/',
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

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseBvmtText(text: string, date: string): Cotation[] {
  const rows: Cotation[] = []
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

    const varM      = line.match(/([\+\-]?\s*\d+[,\.]\d+)\s*%/)
    const variation = varM ? varM[1].replace(/\s/, '') + '%' : null

    const nums       = line.match(/\d[\d\s]{3,}/g) || []
    const vol_titres = nums.length > 0 ? parseInt(nums[nums.length - 1].replace(/\s/g, '')) : null
    const vol_dt     = nums.length > 1 ? parseInt(nums[nums.length - 2].replace(/\s/g, '')) : null

    seen.add(nom)
    rows.push({
      nom,
      ouverture,
      haut,
      bas:       dernier,
      vol_titres,
      vol_dt,
      dernier,
      variation,
      date,
    })
  }
  return rows
}

// ─── Fonction principale — fetch + parse ──────────────────────────────────────

export async function fetchBvmtCotations(): Promise<{ cotations: Cotation[]; date: string; source: string }> {
  const targetDate = getLastBusinessDay()
  const todayStr   = targetDate.toISOString().split('T')[0]

  // Essai J
  let text = await extractPdfText(buildPdfUrl(targetDate))
  if (text) {
    const cotations = parseBvmtText(text, todayStr)
    if (cotations.length > 0) return { cotations, date: todayStr, source: 'pdf' }
  }

  // Essai J-1
  const prev    = getLastBusinessDay(new Date(targetDate.getTime() - 86400000))
  const prevStr = prev.toISOString().split('T')[0]
  text          = await extractPdfText(buildPdfUrl(prev))
  if (text) {
    const cotations = parseBvmtText(text, prevStr)
    if (cotations.length > 0) return { cotations, date: prevStr, source: 'pdf_prev' }
  }

  return { cotations: [], date: todayStr, source: 'unavailable' }
}

// ─── Recherche par ticker ─────────────────────────────────────────────────────

export async function findCotationLive(symbol: string): Promise<Cotation | null> {
  const { cotations } = await fetchBvmtCotations()
  const upper = symbol.toUpperCase()

  // Exact match sur nom
  return cotations.find(c =>
    c.nom?.toUpperCase() === upper ||
    c.nom?.toUpperCase().startsWith(upper + ' ') ||
    c.nom?.toUpperCase().includes(upper)
  ) ?? null
}

// ─── Parse variation string → number ─────────────────────────────────────────

export function parseVariation(variation: string | null): number | null {
  if (!variation) return null
  const clean = variation.replace('%', '').replace(',', '.').replace(/\s/g, '')
  const val   = parseFloat(clean)
  return isNaN(val) ? null : val
}
