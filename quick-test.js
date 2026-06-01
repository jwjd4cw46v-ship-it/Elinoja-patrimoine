#!/usr/bin/env node

/**
 * Test rapide et simple de l'API BVMT
 * Usage: node quick-test.js
 */

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
  console.log('\n🧪 TEST RAPIDE API BVMT\n');

  const tests = [
    { name: 'Mode Test', url: `${BASE_URL}/api/bvmt?test=1` },
    { name: 'API Normal', url: `${BASE_URL}/api/bvmt` },
    { name: 'Diagnostic', url: `${BASE_URL}/api/bvmt/connectivity` },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`⏳ ${test.name}... `);
    try {
      const response = await fetch(test.url, { signal: AbortSignal.timeout(5000) });
      const data = await response.json();

      if (response.ok) {
        console.log('✅');
        if (data.count) console.log(`   → ${data.count} quotes`);
        if (data.source) console.log(`   → source: ${data.source}`);
        passed++;
      } else {
        console.log(`❌ (${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ (${error.message.split(':')[0]})`);
      failed++;
    }
  }

  console.log(`\n📊 Résultats: ${passed} passé(s), ${failed} échoué(s)\n`);
  process.exit(failed === 0 ? 0 : 1);
}

quickTest().catch(console.error);
