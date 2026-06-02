'use client'

/**
 * useWatchlist.ts
 * Merge les cotations BVMT (/api/cotations) avec la table `watchlists` Supabase.
 * Colonnes : ticker, company_name, alert_price_low, alert_price_high
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WatchItem {
  id:      string
  ticker:  string
  name:    string
  current: number
  change:  number
  low:     number   // alert_price_low
  high:    number   // alert_price_high
}

const POLL_INTERVAL = 60_000

export function useWatchlist(userId: string) {
  const [items,   setItems]   = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    try {
      const { data: rows, error: dbErr } = await supabase
        .from('watchlists')
        .select('id, ticker, company_name, alert_price_low, alert_price_high')
        .eq('user_id', userId)

      if (dbErr) throw dbErr
      if (!rows?.length) { setItems([]); setLoading(false); return }

      const res = await fetch('/api/cotations', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const markets: any[] = data.markets ?? []

      const merged: WatchItem[] = rows.map(row => {
        const ticker = row.ticker?.toUpperCase()
        const market = markets.find(
          m => m.referentiel?.ticker?.toUpperCase() === ticker
        )
        return {
          id:      row.id,
          ticker,
          name:    row.company_name ?? ticker,
          current: market?.last   ?? 0,
          change:  market?.change ?? 0,
          low:     row.alert_price_low  ?? 0,
          high:    row.alert_price_high ?? 0,
        }
      })

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
