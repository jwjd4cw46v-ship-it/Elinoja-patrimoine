'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, X, RefreshCw, DollarSign, Coins } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Asset {
  id:       string
  label:    string
  sublabel: string
  value:    number | null
  change:   number | null
  unit:     string
  category: 'forex' | 'crypto' | 'commodity'
  color:    string
}

interface HistoryPoint {
  date:  string
  value: number
}

const ALPHA_KEY = 'H0K0DX8A7K57G5EE'
const ONE_HOUR  = 60 * 60 * 1000

// ─── Config assets ────────────────────────────────────────────────────────────
const ASSET_CONFIG = [
  { id: 'USD_TND', label: 'Dollar / Dinar',   sublabel: 'USD / TND', unit: 'TND',     category: 'forex'     as const, color: '#4FC3F7' },
  { id: 'EUR_TND', label: 'Euro / Dinar',     sublabel: 'EUR / TND', unit: 'TND',     category: 'forex'     as const, color: '#81C784' },
  { id: 'BTC_USD', label: 'Bitcoin / Dollar', sublabel: 'BTC / USD', unit: 'USD',     category: 'crypto'    as const, color: '#FFB74D' },
  { id: 'BRENT',   label: 'Brent',            sublabel: 'Pétrole brut', unit: 'USD/bbl', category: 'commodity' as const, color: '#EF9A9A' },
  { id: 'GOLD',    label: 'Or',               sublabel: 'XAU / USD', unit: 'USD/oz',  category: 'commodity' as const, color: '#D4AF37' },
  { id: 'SILVER',  label: 'Argent',           sublabel: 'XAG / USD', unit: 'USD/oz',  category: 'commodity' as const, color: '#B0BEC5' },
  { id: 'ALUM',    label: 'Aluminium',        sublabel: 'LME Spot',  unit: 'USD/t',   category: 'commodity' as const, color: '#90CAF9' },
  { id: 'LEAD',    label: 'Plomb',            sublabel: 'LME Spot',  unit: 'USD/t',   category: 'commodity' as const, color: '#CE93D8' },
]

// ─── TradingView symbol map ───────────────────────────────────────────────────
const TV_SYMBOLS: Record<string, string> = {
  USD_TND: 'FX_IDC:USDTND',
  EUR_TND: 'FX_IDC:EURTND',
  BTC_USD: 'BITSTAMP:BTCUSD',
  BRENT:   'OANDA:BCOUSD',
  GOLD:    'OANDA:XAUUSD',
  SILVER:  'OANDA:XAGUSD',
  ALUM:    'COMEX:ALI1!',
  LEAD:    'COMEX:LE1!',
}

// ─── Fetch multi-sources ─────────────────────────────────────────────────────

// ExchangeRate-API (illimité, sans clé) → USD/TND, EUR/TND
async function fetchFrankfurter(from: string, to: string): Promise<{ value: number; change: number } | null> {
  try {
    const res  = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`, { cache: 'no-store' })
    const data = res.ok ? await res.json() : null
    if (!data?.rates?.[to]) return null
    const value = parseFloat(data.rates[to].toFixed(4))
    return { value, change: 0 }
  } catch { return null }
}

// CoinGecko (illimité, sans clé) → BTC/USD
async function fetchCoinGecko(): Promise<{ value: number; change: number } | null> {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', { cache: 'no-store' })
    const data = res.ok ? await res.json() : null
    if (!data?.bitcoin?.usd) return null
    return {
      value:  parseFloat(data.bitcoin.usd.toFixed(0)),
      change: parseFloat((data.bitcoin.usd_24h_change ?? 0).toFixed(2)),
    }
  } catch { return null }
}

// Frankfurter (ECB) → Brent via conversion indirecte non dispo,
// On utilise Alpha Vantage pour BRENT uniquement (commodity endpoint)
async function fetchBrent(): Promise<{ value: number; change: number } | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=BRENT&interval=daily&apikey=${ALPHA_KEY}`
    const res  = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    if (Array.isArray(data?.data) && data.data.length >= 2) {
      const latest = data.data[0]
      const prev   = data.data[1]
      const value  = parseFloat(latest.value)
      if (isNaN(value)) return null
      const change = prev ? ((value - parseFloat(prev.value)) / parseFloat(prev.value)) * 100 : 0
      return { value, change: parseFloat(change.toFixed(2)) }
    }
    return null
  } catch { return null }
}

// metals.live (gratuit, sans clé) → XAU, XAG en USD
async function fetchMetalsLive(metal: 'gold' | 'silver'): Promise<{ value: number; change: number } | null> {
  try {
    const res  = await fetch('https://metals.live/api/spot', { cache: 'no-store' })
    if (!res.ok) return null
    const data: Array<Record<string, number>> = await res.json()
    // Retourne un tableau [{gold: 1234, silver: 12, ...}, ...]
    const entry = data?.[0]
    if (!entry) return null
    const value = entry[metal]
    if (!value || isNaN(value)) return null
    return { value: parseFloat(value.toFixed(2)), change: 0 }
  } catch { return null }
}

// Alpha Vantage fallback → XAU / XAG (CURRENCY_EXCHANGE_RATE)
async function fetchAlphaMetals(symbol: 'XAU' | 'XAG'): Promise<{ value: number; change: number } | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_KEY}`
    const res  = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    const rate = data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']
    if (!rate) return null
    return { value: parseFloat(parseFloat(rate).toFixed(2)), change: 0 }
  } catch { return null }
}

// Open Exchange Rates (gratuit, sans clé requise pour XAU) → fallback
// On utilise GoldAPI public endpoint (sans clé, limité)
async function fetchGoldAPI(symbol: 'XAU' | 'XAG'): Promise<{ value: number; change: number } | null> {
  try {
    // gold-api.com propose un endpoint public
    const res  = await fetch(`https://data-asg.goldprice.org/dbXRates/USD`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    // { items: [{ xauPrice: 1234, xagPrice: 12 }] }
    const item = data?.items?.[0]
    if (!item) return null
    const value = symbol === 'XAU' ? item.xauPrice : item.xagPrice
    if (!value || isNaN(value)) return null
    return { value: parseFloat(value.toFixed(2)), change: 0 }
  } catch { return null }
}

// Aluminium & Plomb via Alpha Vantage commodity (metals industriels)
// Fallback: LME via stooq.com (CSV public)
async function fetchStooq(ticker: string): Promise<{ value: number; change: number } | null> {
  try {
    // stooq.com fournit CSV public pour de nombreux symboles
    const res  = await fetch(`https://stooq.com/q/d/l/?s=${ticker}&i=d`, { cache: 'no-store' })
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n')
    // Format: Date,Open,High,Low,Close,Volume
    if (lines.length < 3) return null
    const last  = lines[lines.length - 1].split(',')
    const prev  = lines[lines.length - 2].split(',')
    const value = parseFloat(last[4]) // Close
    const pVal  = parseFloat(prev[4])
    if (isNaN(value) || value <= 0) return null
    const change = pVal ? ((value - pVal) / pVal) * 100 : 0
    return { value: parseFloat(value.toFixed(2)), change: parseFloat(change.toFixed(2)) }
  } catch { return null }
}

// Or: metals.live → goldprice.org → Alpha Vantage
async function fetchGold(): Promise<{ value: number; change: number } | null> {
  return (
    (await fetchMetalsLive('gold')) ??
    (await fetchGoldAPI('XAU')) ??
    (await fetchAlphaMetals('XAU'))
  )
}

// Argent: metals.live → goldprice.org → Alpha Vantage
async function fetchSilver(): Promise<{ value: number; change: number } | null> {
  return (
    (await fetchMetalsLive('silver')) ??
    (await fetchGoldAPI('XAG')) ??
    (await fetchAlphaMetals('XAG'))
  )
}

// Aluminium: stooq LMAHDS03 (LME Aluminium)
async function fetchAluminium(): Promise<{ value: number; change: number } | null> {
  // Stooq ticker pour Aluminium LME
  return fetchStooq('lmahds03.lme')
}

// Plomb: stooq (LME Lead)
async function fetchLead(): Promise<{ value: number; change: number } | null> {
  return fetchStooq('lmpbds03.lme')
}

async function fetchFromAlpha(assetId: string): Promise<{ value: number; change: number } | null> {
  if (assetId === 'USD_TND') return fetchFrankfurter('USD', 'TND')
  if (assetId === 'EUR_TND') return fetchFrankfurter('EUR', 'TND')
  if (assetId === 'BTC_USD') return fetchCoinGecko()
  if (assetId === 'BRENT')   return fetchBrent()
  if (assetId === 'GOLD')    return fetchGold()
  if (assetId === 'SILVER')  return fetchSilver()
  if (assetId === 'ALUM')    return fetchAluminium()
  if (assetId === 'LEAD')    return fetchLead()
  return null
}


// Génère historique simulé
function generateHistory(baseValue: number, days = 30): HistoryPoint[] {
  const points: HistoryPoint[] = []
  let v = baseValue * 0.95
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    v = v * (1 + (Math.random() - 0.48) * 0.025)
    points.push({
      date:  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: parseFloat(v.toFixed(baseValue > 1000 ? 0 : baseValue > 10 ? 2 : 4)),
    })
  }
  if (points.length > 0) points[points.length - 1].value = baseValue
  return points
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function MarchesPage() {
  const [assets,     setAssets]     = useState<Asset[]>(
    ASSET_CONFIG.map(a => ({ ...a, value: null, change: null }))
  )
  const [selected,   setSelected]   = useState<Asset | null>(null)
  const [spinning,   setSpinning]   = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [status,     setStatus]     = useState<'cache' | 'fresh' | 'loading'>('loading')

  const supabase = createClient()

  const loadData = useCallback(async (forceRefresh = false) => {
    setStatus('loading')

    // 1. Lire le cache Supabase
    const { data: cached } = await supabase
      .from('marches_data')
      .select('asset_id, value, change, updated_at')

    const cacheMap: Record<string, { value: number; change: number; updated_at: string }> = {}
    cached?.forEach(r => { cacheMap[r.asset_id] = r })

    // 2. Vérifier si le cache est frais (< 1h)
    const now        = Date.now()
    const firstEntry = cached?.[0]
    const cacheAge   = firstEntry
      ? now - new Date(firstEntry.updated_at).getTime()
      : Infinity

    const useCache = !forceRefresh && cacheAge < ONE_HOUR

    if (useCache && cached?.length) {
      setAssets(ASSET_CONFIG.map(a => ({
        ...a,
        value:  cacheMap[a.id]?.value  ?? null,
        change: cacheMap[a.id]?.change ?? null,
      })))
      setLastUpdate(new Date(firstEntry!.updated_at))
      setStatus('cache')
      return
    }

    // 3. Fetch via route API serveur (un seul appel, pas de CORS, parallel)
    setStatus('fresh')
    const updates: Asset[] = [...ASSET_CONFIG.map(a => ({ ...a, value: cacheMap[a.id]?.value ?? null, change: cacheMap[a.id]?.change ?? null }))]

    try {
      const res    = await fetch('/api/market-prices', { cache: 'no-store' })
      const prices = res.ok ? await res.json() : {}

      for (let i = 0; i < ASSET_CONFIG.length; i++) {
        const cfg    = ASSET_CONFIG[i]
        const result = prices[cfg.id]
        if (result?.value != null) {
          updates[i] = { ...updates[i], value: result.value, change: result.change ?? 0 }
          // Upsert en base
          await supabase.from('marches_data').upsert({
            asset_id:   cfg.id,
            value:      result.value,
            change:     result.change ?? 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'asset_id' })
        }
      }
    } catch (e) {
      console.error('market-prices fetch error', e)
    }

    setAssets([...updates])

    setLastUpdate(new Date())
    setStatus('cache')
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleRefresh() {
    setSpinning(true)
    loadData(true).then(() => setTimeout(() => setSpinning(false), 600))
  }

  function handleSelect(asset: Asset) {
    setSelected(asset)
  }

  const forex       = assets.filter(a => a.category === 'forex' || a.category === 'crypto')
  const commodities = assets.filter(a => a.category === 'commodity')

  const fmt = (v: number, unit: string) => {
    if (unit === 'TND') return v.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    if (v > 10000)      return v.toLocaleString('fr-FR', { minimumFractionDigits: 0,  maximumFractionDigits: 0  })
    if (v > 100)        return v.toLocaleString('fr-FR', { minimumFractionDigits: 2,  maximumFractionDigits: 2  })
    return v.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  }

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
              Devises &amp; Matières premières
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm" style={{ color: '#5C5C5C' }}>
                Cliquez sur un actif pour voir l'historique
              </p>
              {status === 'cache' && lastUpdate && (
                <span style={{ fontSize: '10px', color: '#3A3A3A', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '4px' }}>
                  Cache · {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {status === 'fresh' && (
                <span style={{ fontSize: '10px', color: '#D4AF37', background: 'rgba(212,175,55,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
                  Mise à jour…
                </span>
              )}
            </div>
          </div>
          <button onClick={handleRefresh} title="Forcer la mise à jour" style={{
            background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)',
            borderRadius: '8px', padding: '7px', color: '#707070', cursor: 'pointer', display: 'flex',
          }}>
            <RefreshCw size={14} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          </button>
        </div>

        {/* Devises */}
        <Section title="Devises & Crypto" icon={<DollarSign size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {forex.map(a => <AssetCard key={a.id} asset={a} fmt={fmt} onClick={() => handleSelect(a)} />)}
          </div>
        </Section>

        {/* Matières premières */}
        <Section title="Matières premières" icon={<Coins size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commodities.map(a => <AssetCard key={a.id} asset={a} fmt={fmt} onClick={() => handleSelect(a)} />)}
          </div>
        </Section>

      </div>

      {/* Modal historique */}
      <AnimatePresence>
        {selected && (
          <HistoryModal asset={selected} fmt={fmt} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: '#D4AF37' }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#5C5C5C', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── AssetCard ────────────────────────────────────────────────────────────────
function AssetCard({ asset: a, fmt, onClick }: { asset: Asset; fmt: (v: number, u: string) => string; onClick: () => void }) {
  const isPos = (a.change ?? 0) > 0
  const isNeg = (a.change ?? 0) < 0
  const changeColor = isPos ? '#00C853' : isNeg ? '#FF1744' : '#707070'

  return (
    <motion.div
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)',
        borderRadius: '14px', padding: '16px 18px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = a.color + '55')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--noir-border)')}>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${a.color}, transparent)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#E0E0E0' }}>{a.label}</div>
          <div style={{ fontSize: '10px', color: '#5C5C5C', marginTop: '2px' }}>{a.sublabel}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {a.value != null ? (
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#F5F5F5', fontFamily: 'monospace' }}>
              {fmt(a.value, a.unit)}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#3A3A3A' }}>Chargement…</div>
          )}
          <div style={{ fontSize: '10px', color: '#3A3A3A', marginTop: '2px' }}>{a.unit}</div>
        </div>
      </div>

      {a.change != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
          {isPos ? <TrendingUp size={11} color={changeColor} /> : isNeg ? <TrendingDown size={11} color={changeColor} /> : null}
          <span style={{ fontSize: '11px', color: changeColor, fontWeight: 500 }}>
            {isPos ? '+' : ''}{a.change.toFixed(2)}% aujourd'hui
          </span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Modal historique (TradingView) ──────────────────────────────────────────
function HistoryModal({ asset, fmt, onClose }: {
  asset: Asset
  fmt: (v: number, u: string) => string
  onClose: () => void
}) {
  const isPos      = (asset.change ?? 0) >= 0
  const containerRef = useRef<HTMLDivElement>(null)
  const symbol     = TV_SYMBOLS[asset.id] ?? 'OANDA:XAUUSD'

  useEffect(() => {
    if (!containerRef.current) return

    // Inject TradingView script once
    const scriptId = 'tradingview-widget-script'
    const load = () => {
      if (!containerRef.current) return
      // @ts-ignore
      new (window as any).TradingView.widget({
        container_id:   'tv-chart-container',
        symbol,
        interval:       'D',
        theme:          'dark',
        style:          '1',
        locale:         'fr',
        toolbar_bg:     '#1A1A1A',
        hide_top_toolbar: false,
        hide_legend:    false,
        save_image:     false,
        width:          '100%',
        height:         280,
        backgroundColor: '#111111',
        gridColor:      'rgba(255,255,255,0.04)',
      })
    }

    if (document.getElementById(scriptId)) {
      load()
    } else {
      const script    = document.createElement('script')
      script.id       = scriptId
      script.src      = 'https://s3.tradingview.com/tv.js'
      script.async    = true
      script.onload   = load
      document.head.appendChild(script)
    }
  }, [symbol])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        style={{ width: '100%', maxWidth: '640px', background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', borderRadius: '20px', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--noir-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(135deg, ${asset.color}08, transparent)` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: asset.color }} />
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F5' }}>{asset.label}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#5C5C5C', marginTop: '3px' }}>{asset.sublabel} · Données temps réel TradingView</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5F5F5', fontFamily: 'monospace' }}>
                {asset.value != null ? fmt(asset.value, asset.unit) : '—'}
              </div>
              {asset.change != null && (
                <div style={{ fontSize: '11px', color: isPos ? '#00C853' : '#FF1744', marginTop: '2px' }}>
                  {isPos ? '+' : ''}{asset.change.toFixed(2)}% aujourd'hui
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#5C5C5C', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Graphique TradingView */}
        <div ref={containerRef} style={{ padding: '16px 16px 0' }}>
          <div id="tv-chart-container" />
        </div>

        {/* Infos bas */}
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#3A3A3A' }}>
            Symbole : <span style={{ color: '#5C5C5C', fontFamily: 'monospace' }}>{symbol}</span>
          </span>
          <span style={{ fontSize: '10px', color: '#3A3A3A' }}>
            Powered by TradingView
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
