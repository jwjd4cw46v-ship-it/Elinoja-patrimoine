#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function testPdfUrl() {
  const output = [];
  const log = (msg) => {
    console.log(msg);
    output.push(msg);
  };

  log('\n🧪 TEST URL PDF BVMT');
  log('='.repeat(60));

  const testDates = [
    '2026-06-01', // Aujourd'hui (dimanche - pas de bourse!)
    '2026-05-29', // Vendredi
    '2026-05-28', // Jeudi
    '2025-11-21', // Date passée
  ];

  for (const dateStr of testDates) {
    const [year, month, day] = dateStr.split('-');
    const url = `https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf`;

    log(`\n📅 Date: ${dateStr}`);
    log(`🔗 ${url}`);
    log('⏳ Test...');

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
      });

      log(`📊 Status: ${response.status} ${response.statusText}`);
      
      const headers = {
        'Content-Type': response.headers.get('content-type'),
        'Content-Length': response.headers.get('content-length'),
        'Last-Modified': response.headers.get('last-modified'),
      };

      if (response.ok) {
        log('✅ PDF ACCESSIBLE');
        if (headers['Content-Length']) {
          const mb = (parseInt(headers['Content-Length']) / 1024 / 1024).toFixed(2);
          log(`   Size: ${mb} MB`);
        }
      } else if (response.status === 404) {
        log('❌ 404 - PDF not found');
      } else if (response.status === 403) {
        log('⚠️  403 - Access denied');
      } else {
        log(`⚠️  Status: ${response.status}`);
      }
    } catch (error) {
      log(`❌ Error: ${error.message}`);
    }
  }

  log('\n' + '='.repeat(60));
  log('✅ Test completed');
  log('='.repeat(60));

  // Écrire dans un fichier
  const outputFile = path.join(process.cwd(), 'PDF_TEST_RESULTS.txt');
  fs.writeFileSync(outputFile, output.join('\n'));
  log(`\n📄 Results written to: ${outputFile}`);
}

testPdfUrl().catch(console.error);
