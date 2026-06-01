#!/usr/bin/env node

/**
 * Vérification de la connexion au serveur BVMT
 */

async function checkConnectivity() {
  console.log('\n🔍 Vérification de la connectivité\n')

  const tests = [
    {
      name: 'DNS tunis-stockexchange.com',
      test: async () => {
        try {
          const response = await fetch('https://tunis-stockexchange.com/', { timeout: 5000 })
          return response.ok ? 'OK' : `HTTP ${response.status}`
        } catch (e) {
          return e.message
        }
      }
    },
    {
      name: 'DNS google.com (test réseau)',
      test: async () => {
        try {
          const response = await fetch('https://google.com/', { timeout: 5000 })
          return response.ok ? 'OK' : `HTTP ${response.status}`
        } catch (e) {
          return e.message
        }
      }
    },
    {
      name: 'URL PDF BVMT (2026-05-22)',
      test: async () => {
        try {
          const url = 'https://tunis-stockexchange.com/sites/default/files/2026-05/fr-physionomie-seance-2026-05-22.pdf'
          const response = await fetch(url, { method: 'HEAD', timeout: 5000 })
          return `HTTP ${response.status}`
        } catch (e) {
          return e.message
        }
      }
    },
    {
      name: 'Anthropic API (test accès externe)',
      test: async () => {
        try {
          const response = await fetch('https://api.anthropic.com/', { timeout: 5000 })
          return response.ok ? 'OK' : `HTTP ${response.status}`
        } catch (e) {
          return e.message
        }
      }
    }
  ]

  for (const test of tests) {
    process.stdout.write(`${test.name}... `)
    try {
      const result = await test.test()
      console.log(result)
    } catch (e) {
      console.log(`ERREUR: ${e.message}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('💡 CONCLUSION:')
  console.log('='.repeat(60))
  console.log(`
Si BVMT n'est pas accessible:
  ✅ Solution 1: Utiliser des données de fallback
  ✅ Solution 2: Ajouter un mode "test" avec données mock
  ✅ Solution 3: Implémenter un cache plus robuste

Si tout est inaccessible:
  ⚠️  Problème de connexion internet
  ⚠️  Firewall/proxy bloque l'accès
  ⚠️  DNS ne résout pas les domaines
  `)
}

checkConnectivity().catch(console.error)
