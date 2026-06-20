import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env manquant')
  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const { pdf_url, announcement_id } = await request.json()

    if (!pdf_url || !announcement_id) {
      return NextResponse.json({ error: 'pdf_url et announcement_id requis' }, { status: 400 })
    }

    // 1. Télécharger le PDF depuis l'URL publique
    const pdfRes = await fetch(pdf_url)
    if (!pdfRes.ok) throw new Error(`Impossible de télécharger le PDF: ${pdfRes.status}`)
    const pdfBuffer = await pdfRes.arrayBuffer()

    // 2. Extraire le texte avec pdf-parse
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(Buffer.from(pdfBuffer))

    const extractedText = data.text
      ?.replace(/\n{3,}/g, '\n\n')  // Nettoyer les sauts de ligne excessifs
      ?.trim()

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Texte non extractible — PDF probablement scanné (image)',
        announcement_id,
      })
    }

    // 3. Stocker le texte dans content (champ existant)
    const { error } = await getSupabase()
      .from('cmf_announcements')
      .update({
        content:    extractedText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', announcement_id)

    if (error) throw error

    return NextResponse.json({
      success:    true,
      pages:      data.numpages,
      chars:      extractedText.length,
      preview:    extractedText.slice(0, 200),
      announcement_id,
    })

  } catch (err: any) {
    console.error('extract-pdf error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
