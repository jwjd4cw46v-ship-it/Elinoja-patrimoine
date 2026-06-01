#!/usr/bin/env python3

import requests
from datetime import datetime, timedelta

# Configuration
FIXED_HOLIDAYS = {'01-01','01-14','03-20','04-09','05-01','07-25','08-13','10-15'}
VARIABLE_HOLIDAYS = {
    '2025-03-30','2025-03-31','2025-04-01',
    '2025-06-06','2025-06-07','2025-06-08',
    '2025-06-26','2025-09-04',
    '2026-03-19','2026-03-20','2026-03-21',
    '2026-05-26','2026-05-27','2026-05-28',
    '2026-06-16','2026-08-25',
}

def is_holiday(date):
    mm_dd = date.strftime('%m-%d')
    yyyy_mm_dd = date.strftime('%Y-%m-%d')
    return mm_dd in FIXED_HOLIDAYS or yyyy_mm_dd in VARIABLE_HOLIDAYS

def is_bourse_open(date):
    day_of_week = date.weekday()  # 0=lun, 6=dim
    return day_of_week < 5 and not is_holiday(date)  # lun-ven

def get_last_business_day(date=None):
    if date is None:
        date = datetime.now()
    d = date
    max_tries = 14
    while not is_bourse_open(d) and max_tries > 0:
        d -= timedelta(days=1)
        max_tries -= 1
    return d

def build_pdf_url(date):
    year = date.strftime('%Y')
    month = date.strftime('%m')
    day = date.strftime('%d')
    return f'https://tunis-stockexchange.com/sites/default/files/{year}-{month}/fr-physionomie-seance-{year}-{month}-{day}.pdf'

def test_url(url):
    print(f"\n🔗 URL: {url}")
    print("⏳ Test en cours...\n")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://tunis-stockexchange.com/',
    }
    
    try:
        response = requests.head(url, headers=headers, timeout=10, allow_redirects=True)
        
        print(f"📊 Code HTTP: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'N/A')}")
        print(f"Content-Length: {response.headers.get('content-length', 'N/A')}")
        print(f"Last-Modified: {response.headers.get('last-modified', 'N/A')}")
        
        if response.status_code == 200:
            print("\n✅ URL FONCTIONNE! Le PDF est accessible")
            return True
        elif response.status_code == 404:
            print("\n❌ Erreur 404 - PDF non trouvé")
            return False
        elif response.status_code == 403:
            print("\n⚠️  Erreur 403 - Accès refusé")
            return False
        else:
            print(f"\n⚠️  Code HTTP: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Timeout - Le serveur ne répond pas")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Erreur de connexion - Serveur indisponible")
        return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🧪 TEST URL PDF BVMT")
    print("="*60)
    
    # Date d'aujourd'hui
    last_business_day = get_last_business_day()
    date_str = last_business_day.strftime('%Y-%m-%d')
    day_name = last_business_day.strftime('%A')
    
    print(f"\n📅 Dernier jour ouvrable: {date_str} ({day_name})")
    
    # URL pour aujourd'hui
    url = build_pdf_url(last_business_day)
    result1 = test_url(url)
    
    # Si ça ne marche pas, essayer J-1
    if not result1:
        print("\n🔄 Essai J-1 (fallback)...")
        prev_date = last_business_day - timedelta(days=1)
        max_tries = 5
        while not is_bourse_open(prev_date) and max_tries > 0:
            prev_date -= timedelta(days=1)
            max_tries -= 1
        
        prev_url = build_pdf_url(prev_date)
        test_url(prev_url)
    
    print("\n" + "="*60)
    print("✅ Test terminé")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
