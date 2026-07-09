import { NextResponse } from 'next/server'

// POST /api/webhooks/forum-notify
export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // TODO: validate payload / signature if your webhook provider supports signing
    // TODO: add processing logic (enqueue a job, send email/notification, persist to DB, etc.)

    // For now, just log the payload and return a 200 OK acknowledgement
    // eslint-disable-next-line no-console
    console.log('Received forum-notify webhook:', JSON.stringify(payload))

    return NextResponse.json({ success: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('forum-notify webhook error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 400 })
  }
}
