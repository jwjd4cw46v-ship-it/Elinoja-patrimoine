#!/usr/bin/env node

/**
 * Test l'API BVMT et sauvegarde les résultats dans un fichier
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const resultsFile = path.join(process.cwd(), 'API_TEST_REPORT.md');

let report = `# 📊 Rapport de Test - API BVMT\n\n`;
report += `**Date:** ${new Date().toLocaleString('fr-FR')}\n`;
report += `**URL:** ${BASE_URL}\n\n`;

const log = (msg) => {
  console.log(msg);
  report += msg + '\n';
};

async function test() {
  log('## 🧪 Tests en cours...\n');

  const tests = [
    {
      name: 'Mode Test',
      url: `${BASE_URL}/api/bvmt?test=1`,
      checks: (data) => data.source === 'test_mock' && data.count === 10
    },
    {
      name: 'API Normal',
      url: `${BASE_URL}/api/bvmt`,
      checks: (data) => data.count > 0 && data.quotes
    },
    {
      name: 'Diagnostic Connectivité',
      url: `${BASE_URL}/api/bvmt/connectivity`,
      checks: (data) => data.summary && data.tests
    }
  ];

  let results = { passed: 0, failed: 0, error: 0 };

  for (const test of tests) {
    log(`### ${test.name}`);
    log(`- URL: \`${test.url}\``);
    
    try {
      const response = await fetch(test.url, { signal: AbortSignal.timeout(5000) });
      const data = await response.json();

      if (response.ok) {
        if (test.checks(data)) {
          log(`- Status: **✅ PASS** (${response.status})`);
          log(`- Response: Valid`);
          results.passed++;
        } else {
          log(`- Status: **❌ FAIL** - Data validation failed`);
          log(`- Response: ${JSON.stringify(data).substring(0, 100)}`);
          results.failed++;
        }
      } else {
        log(`- Status: **❌ FAIL** (${response.status})`);
        results.failed++;
      }
    } catch (error) {
      log(`- Status: **⚠️ ERROR** - ${error.message}`);
      results.error++;
    }
    log('');
  }

  log('\n## 📈 Résultats Finaux\n');
  log(`- ✅ Tests réussis: **${results.passed}**`);
  log(`- ❌ Tests échoués: **${results.failed}**`);
  log(`- ⚠️ Erreurs: **${results.error}**`);
  log(`- Taux de réussite: **${Math.round((results.passed / tests.length) * 100)}%**`);

  if (results.failed === 0 && results.error === 0) {
    log('\n### 🎉 TOUS LES TESTS SONT PASSÉS!\n');
  } else {
    log('\n### ⚠️ Certains tests ont échoué\n');
  }

  log('---');
  log(`Généré le ${new Date().toLocaleString('fr-FR')}`);

  fs.writeFileSync(resultsFile, report);
  console.log(`\n✅ Résultats sauvegardés dans: ${resultsFile}`);
}

// Checker si le serveur est accessible
fetch(`${BASE_URL}/api/bvmt?test=1`, { signal: AbortSignal.timeout(3000) })
  .then(() => test().catch(console.error))
  .catch(() => {
    console.error(`\n❌ Erreur: Serveur non accessible sur ${BASE_URL}`);
    console.error('Assurez-vous de lancer: npm run dev\n');
    report += `\n## ❌ Erreur\n\nServeur non accessible sur ${BASE_URL}\n`;
    fs.writeFileSync(resultsFile, report);
    process.exit(1);
  });
