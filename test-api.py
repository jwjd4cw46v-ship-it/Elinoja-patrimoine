#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
from pathlib import Path

BASE_URL = "http://localhost:3000"
REPORT_FILE = "TEST_REPORT.txt"

def log(msg):
    print(msg)
    with open(REPORT_FILE, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')

def test_api():
    # Effacer le rapport précédent
    Path(REPORT_FILE).unlink(missing_ok=True)
    
    log('='*60)
    log('🧪 RAPPORT DE TEST - API BVMT')
    log('='*60)
    log(f'Date: {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}')
    log(f'URL: {BASE_URL}\n')

    tests = [
        {
            'name': 'Mode Test (?test=1)',
            'url': f'{BASE_URL}/api/bvmt?test=1',
            'check': lambda d: d.get('source') == 'test_mock' and d.get('count') == 10
        },
        {
            'name': 'API Normal',
            'url': f'{BASE_URL}/api/bvmt',
            'check': lambda d: d.get('count') and d.get('quotes')
        },
        {
            'name': 'Diagnostic Connectivité',
            'url': f'{BASE_URL}/api/bvmt/connectivity',
            'check': lambda d: d.get('summary') and d.get('status')
        },
    ]

    results = {'passed': 0, 'failed': 0, 'error': 0}

    log('\n' + '─'*60)
    log('RÉSULTATS DES TESTS')
    log('─'*60 + '\n')

    for test in tests:
        log(f"📌 {test['name']}")
        log(f"   URL: {test['url']}")
        
        try:
            response = requests.get(test['url'], timeout=5)
            data = response.json()

            if response.status_code == 200:
                if test['check'](data):
                    log(f"   ✅ PASS ({response.status_code})")
                    log(f"   Data: {json.dumps(data, ensure_ascii=False)[:150]}...")
                    results['passed'] += 1
                else:
                    log(f"   ❌ FAIL - Validation failed")
                    results['failed'] += 1
            else:
                log(f"   ❌ FAIL ({response.status_code})")
                results['failed'] += 1
        except requests.exceptions.Timeout:
            log(f"   ⚠️ ERROR - Timeout")
            results['error'] += 1
        except requests.exceptions.ConnectionError:
            log(f"   ⚠️ ERROR - Impossible de se connecter")
            results['error'] += 1
        except Exception as e:
            log(f"   ⚠️ ERROR - {str(e)}")
            results['error'] += 1
        
        log('')

    log('─'*60)
    log('RÉSUMÉ FINAL')
    log('─'*60 + '\n')
    
    log(f"✅ Tests réussis: {results['passed']}")
    log(f"❌ Tests échoués: {results['failed']}")
    log(f"⚠️  Erreurs: {results['error']}")
    
    total = len(tests)
    percentage = round((results['passed'] / total) * 100) if total > 0 else 0
    log(f"📈 Taux de réussite: {percentage}%\n")

    if results['failed'] == 0 and results['error'] == 0:
        log('🎉 TOUS LES TESTS SONT PASSÉS! ✨\n')
        return True
    else:
        log('⚠️ Certains tests ont échoué\n')
        return False

if __name__ == '__main__':
    try:
        print(f'⏳ Test de l\'API BVMT...\n')
        success = test_api()
        print(f'\n✅ Rapport sauvegardé dans: {REPORT_FILE}')
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f'❌ Erreur: {e}')
        sys.exit(1)
