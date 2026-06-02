import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const response = await fetch(
      'https://www.bvmt.com.tn/rest_api/rest/market/groups/11,12,52,95,99',
      { cache: 'no-store' }
    )

    if (!response.ok) throw new Error(`Erreur BVMT: ${response.status}`)

    const data = await response.json()
    const markets = data.markets

    if (!markets || markets.length === 0) throw new Error('Aucune cotation reçue')

    const today = new Date().toISOString().split('T')[0]

    const cotations = markets.map((m) => ({
      nom:        m.referentiel?.ticker || m.referentiel?.stockName,
      ouverture:  m.open   || null,
      haut:       m.high   || null,
      bas:        m.low    || null,
      vol_titres: m.volume || null,
      vol_dt:     m.caps   || null,
      dernier:    m.last   || null,
      variation:  m.change != null ? `${m.change > 0 ? '+' : ''}${m.change}%` : null,
      date:       today,
    })).filter(c => c.nom && c.dernier)

    if (cotations.length === 0) throw new Error('Aucune cotation valide')

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('cotations')
      .upsert(cotations, { onConflict: 'nom,date' })

    if (error) throw error

    return NextResponse.json({ success: true, count: cotations.length, date: today })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
