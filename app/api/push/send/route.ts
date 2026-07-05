import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, NOTIF_TEMPLATES, NotifType } from '@/lib/notifications'

// Sécurisation par secret partagé (à définir dans Vercel : CRON_SECRET)
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, type, ticker } = await req.json() as {
    userId: string; type: NotifType; ticker?: string
  }

  if (!userId || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { title, body } = NOTIF_TEMPLATES[type]?.(ticker) ?? {
    title: 'Elinoja',
    body:  'Un événement a été détecté dans votre portefeuille.',
  }

  await sendNotification({ userId, type, ticker, title, body })
  return NextResponse.json({ ok: true })
}
