// app/api/extract-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl } = await req.json()
    if (!pdfUrl) return NextResponse.json({ error: 'pdfUrl requis' }, { status: 400 })

    const res = await fetch(pdfUrl)
    if (!res.ok) return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 })

    const buffer = Buffer.from(await res.arrayBuffer())
    const text = extractTextFromBuffer(buffer)

    return NextResponse.json({ text: text.slice(0, 15000), pages: 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function extractTextFromBuffer(buffer: Buffer): string {
  const str = buffer.toString('latin1')
  const results: string[] = []

  // Extraire les blocs BT...ET (texte PDF)
  const btBlocks = str.match(/BT[\s\S]*?ET/g) || []

  for (const block of btBlocks) {
    // Extraire les strings entre parenthèses () et entre <> 
    const parens = block.match(/\(([^)]{1,200})\)/g) || []
    for (const p of parens) {
      const clean = p.slice(1, -1)
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\\/g, '')
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
        .trim()
      if (clean.length > 2) results.push(clean)
    }
  }

  // Fallback: chercher les streams texte
  if (results.length < 10) {
    const streams = str.match(/stream[\s\S]*?endstream/g) || []
    for (const s of streams) {
      const words = s.match(/[A-Za-z0-9\u00C0-\u024F]{3,}/g) || []
      results.push(...words.slice(0, 50))
    }
  }

  return results.join(' ')
}
