'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { TechnicalAnalysis } from '@/types'

interface ClosedTrade extends TechnicalAnalysis {
  closed_at:    string
  close_reason: 'objectif' | 'stop'
  close_price:  number
}

export default function ClientTradesCloturesPage() {
  const [trades, setTrades]   = useState<ClosedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre]   = useState<'all' | 'objectif' | 'stop'>('all')
  const supabase = createClient()

  async function fetchTrades() {
    const { data } = await supabase
      .from('technical_analyses').select('*')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
    if (data) setTrades(data as any)
    setLoading(false)
  }

  useEffect(() => { fetchTrades() }, [])

  const filtered = trades.filter(t => filtre === 'all' || t.close_reason === filtre)

  const stats = {
    total:    trades.length,
    objectif: trades.filter(t => t.close_reason === 'objectif').length,
    stop:     trades.filter(t => t.close_reason === 'stop').length,
  }
  const winrate = stats.total > 0 ? ((stats.objectif / stats.total) * 100).toFixed(0) : '—'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <a href="/client/analyses" className="p-2 rounded-lg" style={{ color: '#5C5C5C', background: 'var(--noir-elevated)' }}>
          <ArrowLeft size={16} />
        </a>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Trades clôturés</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {filtered.length} trade{filtered.length !== 1 ? 's' : ''} clôturé{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
          <div className="text-xl font-bold" style={{ color: '#F5F5F5' }}>{stats.total}</div>
          <div className="text-[11px] mt-1" style={{ color: '#5C5C5C' }}>Trades clôturés</div>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.2)' }}>
          <div className="text-xl font-bold" style={{ color: '#00C853' }}>{winrate}%</div>
          <div className="text-[11px] mt-1" style={{ color: '#5C5C5C' }}>Taux de réussite</div>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,23,68,0.06)', border: '1px solid rgba(255,23,68,0.2)' }}>
          <div className="text-xl font-bold" style={{ color: '#FF1744' }}>{stats.stop}</div>
          <div className="text-[11px] mt-1" style={{ color: '#5C5C5C' }}>Stops touchés</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'objectif', 'stop'] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filtre === f ? (f === 'objectif' ? 'rgba(0,200,83,0.1)' : f === 'stop' ? 'rgba(255,23,68,0.1)' : 'rgba(212,175,55,0.1)') : 'var(--noir-elevated)',
              color: filtre === f ? (f === 'objectif' ? '#00C853' : f === 'stop' ? '#FF1744' : '#D4AF37') : '#707070',
              border: `1px solid ${filtre === f ? 'currentColor' : 'var(--noir-border)'}`,
            }}>
            {f === 'all' ? 'Tous' : f === 'objectif' ? 'Objectifs atteints' : 'Stops touchés'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="skeleton h-4 w-24" /><div className="skeleton h-4 w-full" /><div className="skeleton h-10 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucun trade clôturé pour l'instant</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t, i) => {
            const gagnant = t.close_reason === 'objectif'
            const pct = t.entry_price
              ? (((t.close_price - t.entry_price) / t.entry_price) * 100).toFixed(2)
              : null

            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-premium p-5 space-y-3">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                      {t.ticker.slice(0, 4)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>{t.ticker}</div>
                      <div className="text-[10px]" style={{ color: '#4A4A4A' }}>{t.market} · {t.timeframe}</div>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-medium line-clamp-2 leading-snug" style={{ color: '#C0C0C0' }}>{t.title}</h3>

                <div className="rounded-lg flex items-center justify-center gap-2 py-3"
                  style={{
                    background: gagnant ? 'rgba(0,200,83,0.1)' : 'rgba(255,23,68,0.1)',
                    border: `1px solid ${gagnant ? 'rgba(0,200,83,0.4)' : 'rgba(255,23,68,0.4)'}`,
                  }}>
                  {gagnant
                    ? <CheckCircle2 size={16} style={{ color: '#00C853' }} />
                    : <AlertTriangle size={16} style={{ color: '#FF1744' }} />}
                  <span className="text-sm font-bold" style={{ color: gagnant ? '#00C853' : '#FF1744' }}>
                    {gagnant ? 'Objectif atteint' : 'Stop atteint'}
                    {pct != null && ` · ${gagnant ? '+' : ''}${pct}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]" style={{ color: '#4A4A4A' }}>
                  <span>Clôturé à {t.close_price?.toLocaleString()}</span>
                  <span>{format(new Date(t.closed_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
