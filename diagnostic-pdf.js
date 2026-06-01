/**
 * Diagnostic - Test direct de l'URL PDF BVMT
 * Exécution: node diagnostic-pdf.js
 */

async function testPdfUrl() {
  console.log('\n🧪 Diagnostic URL PDF BVMT\n')

  const testDates = [
    '2026-06-01', // Aujourd'hui
    '2026-05-29', // Jeudi (jour ouvrable avant le week-end)
    '2026-05-28',
    '2025-11-21', // Une date passée valide
  ]

  for (const dateStr of testDates) {
    const [year, month, day] = dateStr.split('-')
    const url = `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`

    console.log(`\n📅 Date: ${dateStr}`)
    console.log(`🔗 URL: ${url}`)
    console.log('⏳ Test...')

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/pdf,*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'Referer': 'https://tunis-stockexchange.com/',
        },
        signal: AbortSignal.timeout(10000),
      })

      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        console.log('✅ PDF ACCESSIBLE')
        const contentLength = response.headers.get('content-length')
        if (contentLength) {
          const mb = (parseInt(contentLength) / 1024 / 1024).toFixed(2)
          console.log(`   Taille: ${mb} MB`)
        }
      } else if (response.status === 404) {
        console.log('❌ Erreur 404 - PDF non trouvé')
      } else if (response.status === 403) {
        console.log('⚠️  Erreur 403 - Accès refusé')
      } else {
        console.log(`⚠️  Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Erreur: ${error.message}`)
    }
  }

  console.log('\n✅ Diagnostic terminé\n')
}

// Exécuter le test
testPdfUrl().catch(console.error)
