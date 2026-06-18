'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Position } from '@/lib/positions-engine'

const fmt = (n: number | null | undefined, d = 3) =>
  n == null ? '—' : n.toLocaleString('fr-TN', { minimumFractionDigits: d, maximumFractionDigits: d })

const fmtPnl = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT`

const fmtPct = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

export default function HistoriquePage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchHistorique() {
      const { data } = await supabase
        .from('positions')
        .select('*')
        .eq('state', 'CLOSED')
        .order('closed_at', { ascending: false })
      if (data) setPositions(data as Position[])
      setLoading(false)
    }
    fetchHistorique()
  }, [])

  const totalPnl      = positions.reduce((s, p) => s + (p.pnl_realise || 0), 0)
  const totalCapital  = positions.reduce((s, p) => s + p.prix_moyen * p.quantite_totale, 0)
  const performance   = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0
  const nbGagnantes   = positions.filter(p => p.pnl_realise > 0).length
  const nbPerdantes   = positions.filter(p => p.pnl_realise < 0).length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/client/positions"
          className="p-2 rounded-lg transition-all"
          style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#707070' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Historique</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {positions.length} position{positions.length !== 1 ? 's' : ''} clôturée{positions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Résumé global */}
      {!loading && positions.length > 0 && (
        <div className="card-premium p-5">
          <div className="text-xs font-semibold tracking-wider mb-4" style={{ color: '#5C5C5C' }}>
            BILAN GLOBAL
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs mb-1" style={{ color: '#5C5C5C' }}>P&L total réalisé</div>
              <div className="text-2xl font-bold font-mono"
                style={{ color: totalPnl >= 0 ? '#00C853' : '#FF1744' }}>
                {fmtPnl(totalPnl)}
              </div>
              <div className="text-sm font-mono mt-0.5"
                style={{ color: performance >= 0 ? '#00C853' : '#FF1744' }}>
                {fmtPct(performance)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#00C853' }}>
                  <TrendingUp size={12} /> Gagnantes
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: '#00C853' }}>{nbGagnantes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#FF1744' }}>
                  <TrendingDown size={12} /> Perdantes
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: '#FF1744' }}>{nbPerdantes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#707070' }}>
                  <Award size={12} /> Win rate
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: '#D4AF37' }}>
                  {positions.length > 0 ? ((nbGagnantes / positions.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="flex justify-between">
                <div className="skeleton w-16 h-6 rounded" />
                <div className="skeleton w-24 h-6 rounded" />
              </div>
              <div className="skeleton w-full h-4 rounded" />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucune position clôturée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos, i) => {
            const isGain    = pos.pnl_realise >= 0
            const prixEntree = pos.prix_moyen
            const pctReel   = ((pos.pnl_realise) / (prixEntree * pos.quantite_totale)) * 100
            const duree     = pos.closed_at && pos.created_at
              ? formatDistanceToNow(new Date(pos.created_at), { locale: fr })
              : null

            return (
              <motion.div key={pos.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-premium p-5"
                style={{ borderColor: isGain ? 'rgba(0,200,83,0.15)' : 'rgba(255,23,68,0.1)' }}>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ background: isGain ? 'rgba(0,200,83,0.1)' : 'rgba(255,23,68,0.08)', color: isGain ? '#00C853' : '#FF1744' }}>
                      {pos.ticker.slice(0, 4)}
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: '#F5F5F5' }}>{pos.ticker}</div>
                      {pos.closed_at && (
                        <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#5C5C5C' }}>
                          <Calendar size={10} />
                          {format(new Date(pos.closed_at), 'dd MMM yyyy', { locale: fr })}
                          {duree && <span>· {duree}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono" style={{ color: isGain ? '#00C853' : '#FF1744' }}>
                      {fmtPnl(pos.pnl_realise)}
                    </div>
                    <div className="text-xs font-mono" style={{ color: isGain ? '#00C853' : '#FF1744' }}>
                      {fmtPct(pctReel)}
                    </div>
                  </div>
                </div>

                {/* Détails */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ color: '#5C5C5C' }}>Entrée moy.</div>
                    <div className="font-mono font-semibold mt-0.5" style={{ color: '#A0A0A0' }}>
                      {fmt(pos.prix_moyen)}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ color: '#5C5C5C' }}>Qté totale</div>
                    <div className="font-mono font-semibold mt-0.5" style={{ color: '#A0A0A0' }}>
                      {pos.quantite_totale}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ color: '#5C5C5C' }}>Niveaux</div>
                    <div className="font-mono font-semibold mt-0.5" style={{ color: '#A0A0A0' }}>
                      R1{pos.r2 ? ' R2' : ''}{pos.r3 ? ' R3' : ''}
                    </div>
                  </div>
                </div>

                {/* Résistances atteintes */}
                <div className="flex items-center gap-2 mt-3">
                  {[
                    { label: 'R1', atteint: pos.r1_atteint },
                    pos.r2 && { label: 'R2', atteint: pos.r2_atteint },
                    pos.r3 && { label: 'R3', atteint: pos.r3_atteint },
                  ].filter(Boolean).map((r: any) => (
                    <span key={r.label}
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: r.atteint ? 'rgba(0,200,83,0.1)' : 'rgba(255,255,255,0.04)',
                        color: r.atteint ? '#00C853' : '#3A3A3A',
                        border: `1px solid ${r.atteint ? 'rgba(0,200,83,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {r.label} {r.atteint ? '✓' : '✗'}
                    </span>
                  ))}
                  <span className="text-[10px] ml-auto" style={{ color: '#3A3A3A' }}>
                    {isGain ? '🎉 Profitable' : '📉 Perte'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
