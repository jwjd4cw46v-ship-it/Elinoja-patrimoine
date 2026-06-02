import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bvmt.com.tn/',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) throw new Error(`Erreur BVMT: ${res.status}`)

    const data = await res.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
