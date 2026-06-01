#!/usr/bin/env node

/**
 * Script de test automatisé pour l'API BVMT
 * Teste tous les endpoints et affiche les résultats
 */

const fs = require('fs');
const path = require('path');

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { passed: 0, failed: 0, errors: 0 }
};

const log = (message) => {
  console.log(message);
  results.tests.push(message);
};

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, url, expectedStatusCode = 200) {
  log(`\n🧪 Test: ${name}`);
  log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000)
    });

    log(`   Status: ${response.status}`);

    if (response.status === expectedStatusCode) {
      const data = await response.json();
      log(`   ✅ PASS - Response OK`);
      log(`   Data: ${JSON.stringify(data).substring(0, 200)}...`);
      results.summary.passed++;
      return { success: true, data };
    } else {
      log(`   ❌ FAIL - Expected ${expectedStatusCode}, got ${response.status}`);
      results.summary.failed++;
      return { success: false };
    }
  } catch (error) {
    log(`   ❌ ERROR - ${error.message}`);
    results.summary.errors++;
    return { success: false };
  }
}

async function runTests() {
  log('╔════════════════════════════════════════════════════════════╗');
  log('║         🧪 BVMT API - Suite de Tests Automatisée           ║');
  log('╚════════════════════════════════════════════════════════════╝');
  log(`\n⏰ Démarrage: ${new Date().toLocaleString('fr-FR')}`);
  log(`📍 Base URL: ${BASE_URL}\n`);

  // Test 1: Mode test
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('📋 GROUPE 1: Mode Test');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const test1 = await testEndpoint(
    'Mode test (?test=1)',
    `${BASE_URL}/api/bvmt?test=1`
  );

  if (test1.success && test1.data) {
    const { count, source, quotes } = test1.data;
    log(`   Count: ${count}`);
    log(`   Source: ${source}`);
    log(`   First ticker: ${quotes?.[0]?.ticker}`);
    log(`   ✅ Mode test fonctionne correctement`);
  }

  // Test 2: API normal
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('📋 GROUPE 2: API Normal');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const test2 = await testEndpoint(
    'API normal (/api/bvmt)',
    `${BASE_URL}/api/bvmt`
  );

  if (test2.success && test2.data) {
    const { count, source } = test2.data;
    log(`   Count: ${count}`);
    log(`   Source: ${source}`);
  }

  // Test 3: Force mode
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('📋 GROUPE 3: Force Mode');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const test3 = await testEndpoint(
    'Force extraction (?force=1)',
    `${BASE_URL}/api/bvmt?force=1`
  );

  if (test3.success && test3.data) {
    const { source, warning } = test3.data;
    log(`   Source: ${source}`);
    if (warning) log(`   Warning: ${warning}`);
  }

  // Test 4: Diagnostic connectivité
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('📋 GROUPE 4: Diagnostic');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const test4 = await testEndpoint(
    'Diagnostic connectivité (/api/bvmt/connectivity)',
    `${BASE_URL}/api/bvmt/connectivity`
  );

  if (test4.success && test4.data) {
    const { status, recommendation, summary } = test4.data;
    log(`   Status: ${status}`);
    log(`   Tests: ${summary.ok}/${summary.total} OK`);
    if (recommendation) log(`   Recommandation: ${recommendation}`);
  }

  // Test 5: Vérifier les données
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('📋 GROUPE 5: Validation des Données');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (test1.success && test1.data) {
    const { quotes } = test1.data;
    
    log(`\n✅ Validation des tickers:`);
    const tickers = quotes.map(q => q.ticker);
    log(`   ${tickers.join(', ')}`);
    
    const expectedTickers = ['TUNINDEX', 'SFBT', 'BNA', 'ATB', 'BIAT', 'BT', 'PGH', 'STB', 'TLS', 'BH BANK'];
    const allPresent = expectedTickers.every(t => tickers.includes(t));
    
    if (allPresent) {
      log(`   ✅ Tous les tickers attendus sont présents`);
      results.summary.passed++;
    } else {
      log(`   ❌ Certains tickers manquent`);
      results.summary.failed++;
    }

    log(`\n✅ Structure des données:`);
    const firstQuote = quotes[0];
    const requiredFields = ['ticker', 'price', 'change', 'change_pct', 'volume', 'high', 'low', 'open', 'updated_at'];
    const hasAllFields = requiredFields.every(f => f in firstQuote);
    
    if (hasAllFields) {
      log(`   ✅ Tous les champs requis sont présents`);
      log(`   Exemple: ${JSON.stringify(firstQuote, null, 2).split('\n').slice(0, 5).join('\n   ')}`);
      results.summary.passed++;
    } else {
      log(`   ❌ Certains champs manquent`);
      results.summary.failed++;
    }
  }

  // Résumé final
  log('\n╔════════════════════════════════════════════════════════════╗');
  log('║                    📊 RÉSUMÉ FINAL                         ║');
  log('╚════════════════════════════════════════════════════════════╝');
  log(`\n✅ Tests réussis: ${results.summary.passed}`);
  log(`❌ Tests échoués: ${results.summary.failed}`);
  log(`⚠️  Erreurs: ${results.summary.errors}`);

  const total = results.summary.passed + results.summary.failed + results.summary.errors;
  const percentage = Math.round((results.summary.passed / total) * 100);
  
  log(`\n📈 Taux de réussite: ${percentage}%`);

  if (results.summary.failed === 0 && results.summary.errors === 0) {
    log(`\n🎉 TOUS LES TESTS SONT PASSÉS! ✨`);
  } else if (results.summary.passed > 0) {
    log(`\n⚠️  Certains tests ont échoué`);
  } else {
    log(`\n❌ Tous les tests ont échoué - Vérifiez le serveur`);
  }

  log(`\n⏰ Fin: ${new Date().toLocaleString('fr-FR')}`);
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Sauvegarder les résultats
  const reportPath = path.join(process.cwd(), 'TEST_RESULTS.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`📄 Résultats sauvegardés dans: ${reportPath}`);

  return percentage >= 80;
}

// Vérifier si le serveur est accessible
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/bvmt?test=1`, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('⏳ Vérification du serveur...\n');

  const serverReady = await checkServer();

  if (!serverReady) {
    console.log('❌ ERREUR: Le serveur n\'est pas accessible sur http://localhost:3000');
    console.log('   Assurez-vous de lancer: npm run dev\n');
    process.exit(1);
  }

  console.log('✅ Serveur accessible! Lancement des tests...\n');

  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
