import { NextResponse } from 'next/server'

const MONTHS: Record<string, number> = {
  'jan': 1, 'janv': 1, 'janvier': 1,
  'fév': 2, 'fevr': 2, 'février': 2,
  'mars': 3,
  'avr': 4, 'avril': 4,
  'mai': 5,
  'juin': 6,
  'juil': 7, 'juillet': 7,
  'août': 8, 'aout': 8,
  'sept': 9, 'septembre': 9,
  'oct': 10, 'octobre': 10,
  'nov': 11, 'novembre': 11,
  'déc': 12, 'dec': 12, 'décembre': 12,
}

function parseDate(raw: string, year = 2026): string | null {
  if (!raw) return null
  const clean = raw.trim().toLowerCase().replace(/[./]/g, '-')
  // Format: "21-avr" ou "21/04" ou "21-04"
  const parts = clean.split('-')
  if (parts.length < 2) return null
  const day = parseInt(parts[0])
  let month: number
  if (isNaN(parseInt(parts[1]))) {
    month = MONTHS[parts[1].replace('.', '')] || 0
  } else {
    month = parseInt(parts[1])
  }
  if (!day || !month) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDividende(raw: string): number | null {
  if (!raw || raw.trim() === '-' || raw.trim() === '') return null
  const num = parseFloat(raw.replace(',', '.'))
  return isNaN(num) ? null : num
}

// Extraction simple basée sur les patterns textuels du PDF BVMT
function extractEventsFromText(text: string): any[] {
  const events: any[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Détecter les lignes qui ressemblent à des entrées du calendrier
    // Pattern typique BVMT: "NOM SOCIETE | date | heure | dividende | detachement"
    // On cherche des lignes avec des dates (ex: 21-avr, 15/04)
    const datePattern = /\d{1,2}[-/](avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec|jan|fév|fevr|mars|\d{2})/i

    if (!datePattern.test(line) && !line.match(/\d{1,2}\/\d{2}\/\d{4}/)) continue

    // Essayer de découper la ligne en colonnes (séparées par espaces multiples ou |)
    const cols = line.split(/\s{2,}|\|/).map(c => c.trim()).filter(Boolean)

    if (cols.length < 2) continue

    // La première colonne est souvent le nom de la société
    const company = cols[0]
    if (!company || company.length < 2) continue

    // Chercher la date dans les colonnes
    let eventDate: string | null = null
    let dividende: number | null = null
    let detachement: string | null = null
    let eventTime: string | null = null

    for (const col of cols.slice(1)) {
      if (datePattern.test(col) && !eventDate) {
        eventDate = parseDate(col)
      } else if (/^\d{1,2}[hH]\d{0,2}$/.test(col)) {
        eventTime = col
      } else if (/^\d+[.,]\d{3}$/.test(col)) {
        dividende = parseDividende(col)
      } else if (datePattern.test(col) && eventDate) {
        detachement = parseDate(col)
      }
    }

    if (company && (eventDate || dividende)) {
      events.push({
        company_name: company,
        ticker:       null,
        event_type:   'ago',
        event_date:   eventDate,
        event_time:   eventTime,
        dividende,
        detachement,
        year:         2026,
        source:       'pdf_import',
      })
    }
  }

  return events
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
    }

    // Lire le PDF comme ArrayBuffer
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Extraction du texte brut du PDF (méthode simple sans librairie)
    // On cherche les chaînes de texte entre les marqueurs BT/ET du PDF
    const pdfText = extractTextFromPdfBytes(bytes)

    if (!pdfText || pdfText.length < 50) {
      return NextResponse.json({
        error: 'Impossible d\'extraire le texte du PDF. Le fichier est peut-être protégé ou scanné.',
        events: [],
      }, { status: 422 })
    }

    const events = extractEventsFromText(pdfText)

    return NextResponse.json({
      events,
      total:     events.length,
      raw_chars: pdfText.length,
    })

  } catch (err) {
    console.error('PDF import error:', err)
    return NextResponse.json({ error: 'Erreur lors du traitement du PDF' }, { status: 500 })
  }
}

// Extraction basique du texte d'un PDF sans librairie externe
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder('latin1')
  const raw = decoder.decode(bytes)

  let text = ''
  const btRegex = /BT([\s\S]*?)ET/g
  let match

  while ((match = btRegex.exec(raw)) !== null) {
    const block = match[1]
    // Extraire les chaînes entre parenthèses : (texte)Tj
    const strRegex = /\(([^)]*)\)\s*(?:Tj|TJ|'|")/g
    let sm
    while ((sm = strRegex.exec(block)) !== null) {
      text += sm[1] + ' '
    }
    text += '\n'
  }

  // Nettoyer les caractères d'échappement PDF
  text = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')

  return text
}
