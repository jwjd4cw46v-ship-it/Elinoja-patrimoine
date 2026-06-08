// app/api/market-prices/route.ts
// Fetch côté serveur → pas de CORS, pas de rate limit navigateur
import { NextResponse } from 'next/server'

const ALPHA_KEY = 'H0K0DX8A7K57G5EE'

interface PriceResult {
  value: number
  change: number
}

// ─── Fetchers individuels ────────────────────────────────────────────────────

async function fetchExchangeRate(from: string, to: string): Promise<PriceResult | null> {
  try {
    const res  = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`, { next: { revalidate: 3600 } })
    const data = res.ok ? await res.json() : null
    const value = data?.rates?.[to]
    if (!value) return null
    return { value: parseFloat(value.toFixed(4)), change: 0 }
  } catch { return null }
}

async function fetchBitcoin(): Promise<PriceResult | null> {
  try {
    const res  = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 300 } }
    )
    const data = res.ok ? await res.json() : null
    if (!data?.bitcoin?.usd) return null
    return {
      value:  Math.round(data.bitcoin.usd),
      change: parseFloat((data.bitcoin.usd_24h_change ?? 0).toFixed(2)),
    }
  } catch { return null }
}

async function fetchBrent(): Promise<PriceResult | null> {
  try {
    const res  = await fetch(
      `https://www.alphavantage.co/query?function=BRENT&interval=daily&apikey=${ALPHA_KEY}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    if (!Array.isArray(data?.data) || data.data.length < 2) return null
    const value  = parseFloat(data.data[0].value)
    const prev   = parseFloat(data.data[1].value)
    if (isNaN(value)) return null
    const change = prev ? ((value - prev) / prev) * 100 : 0
    return { value: parseFloat(value.toFixed(2)), change: parseFloat(change.toFixed(2)) }
  } catch { return null }
}

// metals.live — gratuit, sans clé, données spot LME/COMEX
async function fetchMetalsLive(metal: 'gold' | 'silver'): Promise<PriceResult | null> {
  try {
    const res  = await fetch('https://metals.live/api/spot', { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data: Array<Record<string, number>> = await res.json()
    const value = data?.[0]?.[metal]
    if (!value || isNaN(value)) return null
    return { value: parseFloat(value.toFixed(2)), change: 0 }
  } catch { return null }
}

// goldprice.org — fallback pour or & argent
async function fetchGoldPrice(symbol: 'XAU' | 'XAG'): Promise<PriceResult | null> {
  try {
    const res  = await fetch('https://data-asg.goldprice.org/dbXRates/USD', { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data = await res.json()
    const item  = data?.items?.[0]
    if (!item) return null
    const value = symbol === 'XAU' ? item.xauPrice : item.xagPrice
    if (!value || isNaN(value)) return null
    return { value: parseFloat(value.toFixed(2)), change: 0 }
  } catch { return null }
}

// Alpha Vantage fallback pour XAU / XAG
async function fetchAlphaMetals(symbol: 'XAU' | 'XAG'): Promise<PriceResult | null> {
  try {
    const res  = await fetch(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_KEY}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    const rate  = data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']
    if (!rate) return null
    return { value: parseFloat(parseFloat(rate).toFixed(2)), change: 0 }
  } catch { return null }
}

// stooq.com — CSV public pour métaux industriels LME
async function fetchStooq(ticker: string): Promise<PriceResult | null> {
  try {
    const res  = await fetch(`https://stooq.com/q/d/l/?s=${ticker}&i=d`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const text  = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 3) return null
    const last  = lines[lines.length - 1].split(',')
    const prev  = lines[lines.length - 2].split(',')
    const value = parseFloat(last[4])
    const pVal  = parseFloat(prev[4])
    if (isNaN(value) || value <= 0) return null
    const change = pVal ? ((value - pVal) / pVal) * 100 : 0
    return { value: parseFloat(value.toFixed(2)), change: parseFloat(change.toFixed(2)) }
  } catch { return null }
}

// ─── Orchestration avec fallbacks ────────────────────────────────────────────

async function resolveAsset(id: string): Promise<PriceResult | null> {
  switch (id) {
    case 'USD_TND': return fetchExchangeRate('USD', 'TND')
    case 'EUR_TND': return fetchExchangeRate('EUR', 'TND')
    case 'BTC_USD': return fetchBitcoin()
    case 'BRENT':   return fetchBrent()
    case 'GOLD':
      return (await fetchMetalsLive('gold'))
          ?? (await fetchGoldPrice('XAU'))
          ?? (await fetchAlphaMetals('XAU'))
    case 'SILVER':
      return (await fetchMetalsLive('silver'))
          ?? (await fetchGoldPrice('XAG'))
          ?? (await fetchAlphaMetals('XAG'))
    case 'ALUM':    return fetchStooq('lmahds03.lme')
    case 'LEAD':    return fetchStooq('lmpbds03.lme')
    default:        return null
  }
}

// ─── Handler GET ─────────────────────────────────────────────────────────────

export async function GET() {
  const ASSET_IDS = ['USD_TND', 'EUR_TND', 'BTC_USD', 'BRENT', 'GOLD', 'SILVER', 'ALUM', 'LEAD']

  // Fetch tous les actifs en parallèle côté serveur
  const results = await Promise.allSettled(
    ASSET_IDS.map(id => resolveAsset(id))
  )

  const prices: Record<string, PriceResult | null> = {}
  ASSET_IDS.forEach((id, i) => {
    const r = results[i]
    prices[id] = r.status === 'fulfilled' ? r.value : null
  })

  return NextResponse.json(prices, {
    headers: {
      // Cache 30 min côté CDN / navigateur
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
    },
  })
}
