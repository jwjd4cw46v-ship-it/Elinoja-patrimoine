import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// URL officielle du PDF BVMT
const BVMT_PDF_URL = 'https://www.bvmt.com.tn/sites/default/files/calendrier/calendrier-assemblees.pdf'

function parseCalDate(raw: string | null, year = 2026): string | null {
  if (!raw) return null
  const MONTHS: Record<string, number> = {
    'jan': 1, 'janv': 1, 'fév': 2, 'fevr': 2,
    'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
    'juil': 7, 'août': 8, 'aout': 8, 'sept': 9,
    'oct': 10, 'nov': 11, 'déc': 12, 'dec': 12,
  }
  const clean = raw.trim().replace('.', '').toLowerCase()
  const parts  = clean.split('-')
  if (parts.length < 2) return null
  const day   = parseInt(parts[0])
  const month = MONTHS[parts[1]]
  if (!day || !month) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || '2026')

  try {
    const supabase = createServiceClient()

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('year', year)
      .order('event_date', { ascending: true, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Vérifier accessibilité du PDF
    let pdfAccessible = false
    try {
      const ping = await fetch(BVMT_PDF_URL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)',
          'Referer': 'https://www.bvmt.com.tn/',
        },
      })
      pdfAccessible = ping.ok
    } catch {
      pdfAccessible = false
    }

    return NextResponse.json({
      events:         events || [],
      total:          events?.length || 0,
      pdf_accessible: pdfAccessible,
      pdf_url:        BVMT_PDF_URL,
      source:         'supabase',
      year,
    })

  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()
    const { action, event, events: bulkEvents } = body

    if (action === 'upsert_bulk' && Array.isArray(bulkEvents)) {
      const rows = bulkEvents.map((e: any) => ({
        company_name: e.company_name,
        ticker:       e.ticker || null,
        event_type:   e.event_type || 'ago',
        event_date:   parseCalDate(e.event_date_raw) || e.event_date || null,
        event_time:   e.event_time || null,
        location:     e.location || null,
        dividende:    e.dividende || null,
        detachement:  parseCalDate(e.detachement_raw) || e.detachement || null,
        year:         e.year || 2026,
        source:       'bvmt_import',
        is_confirmed: true,
        author_id:    e.author_id || null,
      }))

      const { error } = await supabase
        .from('calendar_events')
        .upsert(rows, { onConflict: 'company_name,event_type,year' })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, imported: rows.length })
    }

    if (action === 'upsert' && event) {
      const { error } = await supabase
        .from('calendar_events')
        .upsert({ ...event, updated_at: new Date().toISOString() },
          { onConflict: 'company_name,event_type,year' })

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete' && event?.id) {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })

  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
