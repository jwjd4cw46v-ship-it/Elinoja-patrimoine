'use client'

/**
 * useWatchlist.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook qui :
 *  1. Récupère les cotations depuis /api/cotations (API BVMT)
 *  2. Récupère les seuils d'alerte de l'utilisateur depuis Supabase
 *     (table watchlists: user_id, ticker, alert_price_low, alert_price_high)
 *  3. Merge les deux et expose la liste enrichie
 *
 * Usage :
 *   const { items, loading, error, refresh } = useWatchlist(userId)
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WatchItem } from '@/components/watchlist/WatchCard'

const POLL_INTERVAL = 60_000 // 60 secondes

export function useWatchlist(userId: string) {
  const [items,   setItems]   = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    try {
      // 1. Récupérer les seuils de l'utilisateur
      // FIX : lecture depuis 'watchlists' (et non 'watchlist_alertes')
      //       avec les colonnes alert_price_low / alert_price_high
      const { data: alertes, error: dbErr } = await supabase
        .from('watchlists')
        .select('ticker, alert_price_low, alert_price_high')
        .eq('user_id', userId)

      if (dbErr) throw dbErr
      if (!alertes?.length) { setItems([]); setLoading(false); return }

      // 2. Récupérer les cotations
      const res = await fetch('/api/cotations', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // L'API BVMT retourne { markets: [...] }
      // Chaque market : { isin, last, change, referentiel: { ticker, stockName } }
      const markets: any[] = data.markets ?? []

      // 3. Merger
      const merged: WatchItem[] = alertes
        .map(alerte => {
          const ticker = alerte.ticker?.toUpperCase()
          const market = markets.find(m => m.referentiel?.ticker?.toUpperCase() === ticker)
          if (!market) return null
          return {
            id:      ticker,
            name:    market.referentiel?.stockName ?? ticker,
            current: market.last   ?? 0,
            change:  market.change ?? 0,
            // FIX : colonnes correctes
            low:     alerte.alert_price_low  ?? 0,
            high:    alerte.alert_price_high ?? 0,
          }
        })
        .filter(Boolean) as WatchItem[]

      setItems(merged)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll])

  return { items, loading, error, refresh: fetchAll }
}
