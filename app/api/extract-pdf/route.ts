// app/api/extract-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl } = await req.json()
    if (!pdfUrl) return NextResponse.json({ error: 'pdfUrl requis' }, { status: 400 })

    // Télécharger le PDF
    const res = await fetch(pdfUrl)
    if (!res.ok) return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 })

    const buffer = await res.arrayBuffer()

    // Extraire le texte avec pdfjs en mode Node
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any)
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

    let fullText = ''
    const maxPages = Math.min(pdf.numPages, 10)

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += `\n--- Page ${i} ---\n${pageText}`
    }

    return NextResponse.json({
      text: fullText.slice(0, 15000),
      pages: maxPages,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
