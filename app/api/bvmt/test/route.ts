import { NextResponse } from 'next/server'

/**
 * Endpoint de diagnostic pour tester l'URL du PDF BVMT
 * Accès: GET /api/bvmt/test
 */

function buildPdfUrl(date: Date): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`
}

async function testUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://tunis-stockexchange.com/',
      },
      signal: AbortSignal.timeout(15000),
    })

    return {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
      lastModified: response.headers.get('last-modified'),
    }
  } catch (error: any) {
    return {
      status: 0,
      ok: false,
      error: error?.message || 'Unknown error',
    }
  }
}

export async function GET() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Test plusieurs dates
  const testDates = [
    today, // Aujourd'hui
    new Date(today.getTime() - 86400000), // Hier
    new Date(today.getTime() - 172800000), // Avant-hier
    new Date(today.getTime() - 259200000), // 3 jours avant
  ]

  const results = []

  for (const date of testDates) {
    const url = buildPdfUrl(date)
    const dateStr = date.toISOString().split('T')[0]
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

    console.log(`[DIAGNOSTIC] Testing ${dateStr} (${dayName}): ${url}`)

    const result = await testUrl(url)

    results.push({
      date: dateStr,
      dayOfWeek: dayName,
      url,
      ...result,
    })
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    tests: results,
    summary: {
      working: results.filter(r => r.ok).length,
      total: results.length,
    }
  }, { status: 200 })
}
