import { NextResponse } from 'next/server'

// Route appelée par cron-job.org chaque jour après la clôture
// Sans protection par token — accès public

export async function GET(request: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || 'https://elinoja-patrimoine-app-v01.vercel.app'

    const res = await fetch(`${baseUrl}/api/bvmt?force=1`)
    const data = await res.json()

    return NextResponse.json({
      success: true,
      source:  data.source,
      count:   data.count,
      time:    new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
