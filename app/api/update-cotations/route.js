import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request) {
  // Sécuriser l'endpoint
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const response = await fetch('https://www.ilboursa.com/marches/aaz', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Erreur ilboursa: ${response.status}`)
    }

    const html = await response.text()
    const rows = html.split('<tr>').slice(2)
    const cotations = []
    const today = new Date().toISOString().split('T')[0]

    for (const row of rows) {
      if (!row.includes('cotation_')) break

      const nom = row.match(/">(.+?)<\/a>/)?.[1]
      const tds = row.split('<td>')
      if (!nom || tds.length < 9) continue

      const parseNum = (str) => {
        const clean = str.split('</td>')[0].replace(/[^\d.,-]/g, '').replace(',', '.')
        const val = parseFloat(clean)
        return isNaN(val) ? null : val
      }

      const parseEntier = (str) => {
        const clean = str.split('</td>')[0].replace(/\D/g, '')
        const val = parseInt(clean)
        return isNaN(val) ? null : val
      }

      cotations.push({
        nom: nom.trim(),
        ouverture:  parseNum(tds[2]),
        haut:       parseNum(tds[3]),
        bas:        parseNum(tds[4]),
        vol_titres: parseEntier(tds[5]),
        vol_dt:     parseEntier(tds[6]),
        dernier:    parseNum(tds[7].replace(/<\/?b>/g, '')),
        variation:  tds[8].match(/>(.+?)</)?.[1]?.trim() ?? null,
        date:       today,
      })
    }

    if (cotations.length === 0) {
      throw new Error('Aucune cotation extraite')
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('cotations')
      .upsert(cotations, { onConflict: 'nom,date' })

    if (error) throw error

    return Response.json({
      success: true,
      count: cotations.length,
      date: today,
    })

  } catch (err) {
    console.error('[update-cotations]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
