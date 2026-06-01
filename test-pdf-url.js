#!/usr/bin/env node

/**
 * Test de l'URL PDF BVMT
 * Récupère le dernier jour ouvrable et teste l'accès au PDF
 */

// Jours fériés fixes (MM-DD)
const FIXED_HOLIDAYS = new Set([
  '01-01','01-14','03-20','04-09','05-01','07-25','08-13','10-15',
])

// Jours fériés variables 2025-2026
const VARIABLE_HOLIDAYS = new Set([
  '2025-03-30','2025-03-31','2025-04-01',
  '2025-06-06','2025-06-07','2025-06-08',
  '2025-06-26','2025-09-04',
  '2026-03-19','2026-03-20','2026-03-21',
  '2026-05-26','2026-05-27','2026-05-28',
  '2026-06-16','2026-08-25',
])

function isHoliday(date) {
  const mm_dd      = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const yyyy_mm_dd = `${date.getFullYear()}-${mm_dd}`
  return FIXED_HOLIDAYS.has(mm_dd) || VARIABLE_HOLIDAYS.has(yyyy_mm_dd)
}

function isBourseOpen(date) {
  const day = date.getDay()
  return day !== 0 && day !== 6 && !isHoliday(date)
}

function getLastBusinessDay(date = new Date()) {
  const d = new Date(date)
  let max = 14
  while (!isBourseOpen(d) && max-- > 0) d.setDate(d.getDate() - 1)
  return d
}

function buildPdfUrl(date) {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`
}

async function testUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://tunis-stockexchange.com/',
      },
      signal: AbortSignal.timeout(15000),
    })

    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    }
  }
}

async function main() {
  console.log('\n🧪 Test de l\'URL PDF BVMT')
  console.log('===========================\n')

  // Récupérer le dernier jour ouvrable
  const lastBusinessDay = getLastBusinessDay()
  const dateStr = lastBusinessDay.toISOString().split('T')[0]
  console.log(`📅 Dernier jour ouvrable: ${dateStr} (${lastBusinessDay.toLocaleDateString('fr-FR', { weekday: 'long' })})`)

  // Construire l'URL
  const pdfUrl = buildPdfUrl(lastBusinessDay)
  console.log(`\n🔗 URL construite:`)
  console.log(`   ${pdfUrl}\n`)

  // Tester l'URL
  console.log('⏳ Test de connexion...\n')
  const result = await testUrl(pdfUrl)

  console.log('📊 Résultat:')
  console.log(`   Code HTTP: ${result.status}`)
  
  if (result.ok) {
    console.log('   ✅ PDF trouvé et accessible!')
    if (result.headers['content-length']) {
      const sizeMB = (parseInt(result.headers['content-length']) / 1024 / 1024).toFixed(2)
      console.log(`   Taille: ${sizeMB} MB`)
    }
    if (result.headers['last-modified']) {
      console.log(`   Modifié: ${result.headers['last-modified']}`)
    }
  } else if (result.status === 404) {
    console.log('   ❌ PDF non trouvé (erreur 404)')
    console.log('   → Aucun PDF pour cette date sur le serveur BVMT')
  } else if (result.status === 403) {
    console.log('   ⚠️  Accès refusé (erreur 403)')
    console.log('   → Le serveur bloque les requêtes')
  } else if (result.error) {
    console.log(`   ⚠️  Erreur: ${result.error}`)
    console.log('   → Le serveur BVMT pourrait être indisponible')
  } else {
    console.log(`   ⚠️  Code HTTP: ${result.status}`)
  }

  // Essai J-1
  console.log('\n🔍 Essai J-1 (fallback)...\n')
  const prevDate = new Date(lastBusinessDay)
  prevDate.setDate(prevDate.getDate() - 1)

  // Trouver le jour ouvrable précédent
  let maxRetry = 5
  while (!isBourseOpen(prevDate) && maxRetry-- > 0) {
    prevDate.setDate(prevDate.getDate() - 1)
  }

  const prevDateStr = prevDate.toISOString().split('T')[0]
  const prevUrl = buildPdfUrl(prevDate)

  console.log(`📅 Date précédente: ${prevDateStr}`)
  console.log(`🔗 URL: ${prevUrl}\n`)

  const prevResult = await testUrl(prevUrl)
  console.log(`📊 Résultat J-1:`)
  console.log(`   Code HTTP: ${prevResult.status}`)

  if (prevResult.ok) {
    console.log('   ✅ PDF J-1 accessible (fallback OK)')
  } else {
    console.log('   ❌ PDF J-1 non trouvé')
  }

  console.log('\n✅ Test terminé\n')
}

main().catch(console.error)
