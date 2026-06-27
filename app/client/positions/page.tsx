'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Bell, TrendingUp, TrendingDown, Shield,
  ChevronRight, Target, Activity, DollarSign,
  CheckCircle, AlertTriangle, X, BarChart2,
  Clock, Zap, Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  calculerRepartition, calculerStops, calculerPnlVente,
  detecterAlertes, labelAlerte, messageCloture, prochainStop,
  type Position, type AlertePosition,
} from '@/lib/positions-engine'
import Link from 'next/link'

/* ─────────────────────── Helpers ─────────────────────────────── */
const fmt = (n: number | null | undefined, d = 3) =>
  n == null ? '—' : n.toLocaleString('fr-TN', { minimumFractionDigits: d, maximumFractionDigits: d })

const fmtPnl = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT`

const fmtPct = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`


/* ─── Palette donut ─────────────────────────────────────────────── */
const DONUT_COLORS = ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0', '#F44336', '#00BCD4', '#FF9800', '#E91E63']

/* ─── Composant DonutChart SVG ──────────────────────────────────── */
function DonutChart({ data }: { data: { ticker: string; pct: number }[] }) {
  const size   = 140
  const cx     = size / 2
  const cy     = size / 2
  const r      = 52
  const rInner = 32
  const gap    = 2 // gap entre segments en degrés

  let cumul = 0
  const segments = data.map((d, i) => {
    const startDeg = cumul * 3.6
    cumul += d.pct
    const endDeg = cumul * 3.6
    return { ...d, startDeg, endDeg, color: DONUT_COLORS[i % DONUT_COLORS.length] }
  })

  function polarToCartesian(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(startDeg: number, endDeg: number) {
    const s1 = polarToCartesian(startDeg + gap / 2, r)
    const e1 = polarToCartesian(endDeg - gap / 2, r)
    const s2 = polarToCartesian(endDeg - gap / 2, rInner)
    const e2 = polarToCartesian(startDeg + gap / 2, rInner)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return [
      \`M \${s1.x} \${s1.y}\`,
      \`A \${r} \${r} 0 \${large} 1 \${e1.x} \${e1.y}\`,
      \`L \${s2.x} \${s2.y}\`,
      \`A \${rInner} \${rInner} 0 \${large} 0 \${e2.x} \${e2.y}\`,
      'Z',
    ].join(' ')
  }

  // Label du plus grand segment au centre
  const biggest = data.reduce((a, b) => a.pct > b.pct ? a : b, data[0])

  return (
    <svg width={size} height={size} viewBox={\`0 0 \${size} \${size}\`} style={{ flexShrink: 0 }}>
      {segments.map((seg, i) => (
        <path key={seg.ticker} d={arcPath(seg.startDeg, seg.endDeg)}
          fill={seg.color}
          style={{ filter: \`drop-shadow(0 2px 6px \${seg.color}55)\`, transition: 'opacity 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        />
      ))}
      {/* Label centre */}
      {biggest && (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#F5F5F5" fontSize="13" fontWeight="700" fontFamily="monospace">
            {biggest.pct.toFixed(0)}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#5C5C5C" fontSize="9">
            {biggest.ticker}
          </text>
        </>
      )}
    </svg>
  )
}

/* ─────────────── PositionCard — carte principale ──────────────── */
function PositionCard({
  pos,
  prix,
  alertes,
  onVendre,
  onDetail,
}: {
  pos: Position
  prix: number | null
  alertes: AlertePosition[]
  onVendre: (pos: Position, alerte: AlertePosition | null) => void
  onDetail: (pos: Position) => void
}) {
  const pnlBrut    = prix != null ? (prix - pos.prix_moyen) * pos.quantite_restante : null
  const pnlPct     = prix != null ? ((prix - pos.prix_moyen) / pos.prix_moyen) * 100 : null
  const valeurRest = prix != null ? prix * pos.quantite_restante : null
  const stopActuel = prochainStop(pos)
  const alerteActive = alertes.find(a => a.position_id === pos.id && !a.is_acted)

  // Progression S → R1 → R2 → R3 → Runner
  const niveaux = [
    { label: 'S',      value: pos.support, atteint: true,           color: '#5C5C5C' },
    { label: 'R1',     value: pos.r1,      atteint: pos.r1_atteint, color: '#D4AF37' },
    { label: 'R2',     value: pos.r2,      atteint: pos.r2_atteint, color: '#D4AF37' },
    { label: 'R3',     value: pos.r3,      atteint: pos.r3_atteint, color: '#D4AF37' },
    { label: 'Runner', value: null,         atteint: pos.state === 'RUNNING', color: '#00C853' },
  ].filter(n => n.label === 'S' || n.label === 'R1' || n.label === 'Runner' || n.value != null)

  // Largeur de la barre de progression
  const progressPct = pos.r3_atteint ? 90
    : pos.r2_atteint ? 70
    : pos.r1_atteint ? 45
    : prix && pos.support
    ? Math.min(40, Math.max(0, ((prix - pos.support) / (pos.r1 - pos.support)) * 40))
    : 5

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card-premium overflow-hidden cursor-pointer group"
      onClick={() => onDetail(pos)}>

      {/* Alerte badge */}
      {alerteActive && (
        <div className="px-4 py-2 flex items-center gap-2"
          style={{ background: 'rgba(255,152,0,0.08)', borderBottom: '1px solid rgba(255,152,0,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FF9800' }} />
          <span className="text-xs font-medium" style={{ color: '#FF9800' }}>
            {labelAlerte(alerteActive.type).emoji} {labelAlerte(alerteActive.type).titre}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onVendre(pos, alerteActive) }}
            className="ml-auto text-[10px] px-2.5 py-1 rounded-lg font-bold"
            style={{ background: '#FF9800', color: '#000' }}>
            Agir
          </button>
        </div>
      )}

      <div className="p-4">
        {/* Row 1 : Ticker + P&L */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar ticker */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{
                background: `conic-gradient(${pnlPct != null && pnlPct >= 0 ? '#00C853' : '#FF1744'} ${Math.min(Math.abs(pnlPct ?? 0) * 3.6, 360)}deg, rgba(255,255,255,0.05) 0deg)`,
                padding: 2,
              }}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--noir-surface)', color: '#D4AF37' }}>
                {pos.ticker.slice(0, 4)}
              </div>
            </div>
            <div>
              <div className="font-bold text-base" style={{ color: '#F5F5F5' }}>{pos.ticker}</div>
              <div className="text-[11px]" style={{ color: '#5C5C5C' }}>
                Entrée : {fmt(pos.prix_moyen)} · Qté restante : {pos.quantite_restante} ({((pos.quantite_restante/pos.quantite_totale)*100).toFixed(0)}%)
              </div>
            </div>
          </div>

          {/* P&L */}
          <div className="text-right">
            <div className="text-base font-bold font-mono"
              style={{ color: pnlPct != null ? (pnlPct >= 0 ? '#00C853' : '#FF1744') : '#707070' }}>
              {pnlPct != null ? fmtPct(pnlPct) : '—'}
            </div>
            <div className="text-xs font-mono"
              style={{ color: pnlBrut != null ? (pnlBrut >= 0 ? '#00C853' : '#FF1744') : '#707070' }}>
              {pnlBrut != null ? fmtPnl(pnlBrut) : '—'}
            </div>
          </div>
        </div>

        {/* Barre de progression S → R1 → R2 → R3 → Runner */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            {niveaux.map((n, i) => (
              <div key={n.label} className="flex flex-col items-center" style={{ flex: 1 }}>
                <div className="text-[9px] mb-1"
                  style={{ color: n.atteint ? n.color : '#3A3A3A', fontWeight: n.atteint ? 700 : 400 }}>
                  {n.label}
                </div>
              </div>
            ))}
          </div>

          {/* Track */}
          <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #D4AF37, #00C853)' }}
            />
            {/* Markers */}
            {niveaux.map((n, i) => {
              const pctPos = [0, 33, 55, 75, 95][i] ?? 0
              return (
                <div key={n.label}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center"
                  style={{ left: `${pctPos}%` }}>
                  {n.atteint ? (
                    <CheckCircle size={12} style={{ color: '#00C853' }} />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full border-2"
                      style={{ background: 'var(--noir-surface)', borderColor: '#3A3A3A' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Labels valeurs */}
          <div className="flex items-center justify-between mt-1">
            {niveaux.map((n, i) => (
              <div key={n.label} className="flex-1 text-center">
                <div className="text-[9px] font-mono"
                  style={{ color: n.atteint ? '#D4AF37' : '#3A3A3A' }}>
                  {n.value ? fmt(n.value, 3) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stop actuel */}
        <div className="flex items-center justify-between p-2 rounded-lg mb-3"
          style={{ background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.12)' }}>
          <div className="flex items-center gap-1.5">
            <Shield size={11} style={{ color: '#FF1744' }} />
            <span className="text-[11px]" style={{ color: '#707070' }}>Stop actuel</span>
          </div>
          <span className="text-sm font-bold font-mono" style={{ color: '#FF9800' }}>
            {fmt(stopActuel)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => onDetail(pos)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#A0A0A0', border: '1px solid var(--noir-border)' }}>
            <BarChart2 size={11} /> Détail
          </button>
          <button onClick={() => onVendre(pos, null)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
            style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>
            <TrendingDown size={11} /> Vendre
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ──────────────── Détail Position Modal ──────────────────────── */
function PositionDetailModal({
  pos, prix, onClose, onVendre,
}: {
  pos: Position
  prix: number | null
  onClose: () => void
  onVendre: (pos: Position, alerte: AlertePosition | null) => void
}) {
  const pnlBrut = prix != null ? (prix - pos.prix_moyen) * pos.quantite_restante : null
  const pnlPct  = prix != null ? ((prix - pos.prix_moyen) / pos.prix_moyen) * 100 : null
  const valeur  = prix != null ? prix * pos.quantite_restante : null
  const stops   = calculerStops(pos.support, pos.r1, pos.r2 ?? undefined, pos.r3 ?? undefined)
  const stopAct = prochainStop(pos)

  // Prochain objectif
  const prochainObj = !pos.r1_atteint ? { label: 'R1', value: pos.r1, qte: pos.q1_cible }
    : !pos.r2_atteint && pos.r2 ? { label: 'R2', value: pos.r2, qte: pos.q2_cible }
    : !pos.r3_atteint && pos.r3 ? { label: 'R3', value: pos.r3, qte: pos.q3_cible }
    : pos.runner_cible ? { label: 'Runner', value: null, qte: pos.runner_cible }
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }}
        className="w-full max-w-lg rounded-2xl border my-4 overflow-hidden"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)', background: 'rgba(212,175,55,0.03)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
              {pos.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: '#F5F5F5' }}>{pos.ticker}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C853' }} />
                <span className="text-xs" style={{ color: '#5C5C5C' }}>Position ouverte</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: '#5C5C5C' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 140px)' }}>

          {/* Prix + P&L */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl col-span-1"
              style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
              <div className="text-[10px] mb-1" style={{ color: '#5C5C5C' }}>Prix actuel (t-15min)</div>
              <div className="text-xl font-bold font-mono" style={{ color: '#F5F5F5' }}>
                {prix ? fmt(prix) : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl"
              style={{ background: pnlBrut != null && pnlBrut >= 0 ? 'rgba(0,200,83,0.08)' : 'rgba(255,23,68,0.08)', border: `1px solid ${pnlBrut != null && pnlBrut >= 0 ? 'rgba(0,200,83,0.2)' : 'rgba(255,23,68,0.2)'}` }}>
              <div className="text-[10px] mb-1" style={{ color: '#5C5C5C' }}>P&L brut</div>
              <div className="text-base font-bold font-mono"
                style={{ color: pnlBrut != null ? (pnlBrut >= 0 ? '#00C853' : '#FF1744') : '#707070' }}>
                {pnlBrut != null ? fmtPnl(pnlBrut) : '—'}
              </div>
              <div className="text-xs font-mono"
                style={{ color: pnlPct != null ? (pnlPct >= 0 ? '#00C853' : '#FF1744') : '#707070' }}>
                {pnlPct != null ? fmtPct(pnlPct) : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl"
              style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
              <div className="text-[10px] mb-1" style={{ color: '#5C5C5C' }}>Valeur restante</div>
              <div className="text-base font-bold font-mono" style={{ color: '#D4AF37' }}>
                {valeur ? `${(valeur/1000).toFixed(1)}k DT` : '—'}
              </div>
            </div>
          </div>

          {/* Infos position */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Entrée moyenne', value: fmt(pos.prix_moyen) },
              { label: 'Quantité restante', value: `${pos.quantite_restante} (${((pos.quantite_restante/pos.quantite_totale)*100).toFixed(0)}%)` },
              { label: 'Quantité totale', value: String(pos.quantite_totale) },
              { label: 'P&L réalisé', value: fmtPnl(pos.pnl_realise) },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--noir-border)' }}>
                <div className="text-[10px] mb-1" style={{ color: '#5C5C5C' }}>{label}</div>
                <div className="text-sm font-bold font-mono" style={{ color: '#F5F5F5' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Niveaux de prix */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--noir-border)' }}>
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--noir-border)' }}>
              <span className="text-xs font-semibold tracking-wider" style={{ color: '#5C5C5C' }}>
                NIVEAUX DE PRIX
              </span>
              <span className="text-xs font-mono" style={{ color: '#FF9800' }}>
                Stop actuel : {fmt(stopAct)}
              </span>
            </div>
            {[
              pos.r3 && { label: 'R3', value: pos.r3, atteint: pos.r3_atteint, stop: stops.stop3 },
              pos.r2 && { label: 'R2', value: pos.r2, atteint: pos.r2_atteint, stop: stops.stop2 },
              { label: 'R1', value: pos.r1, atteint: pos.r1_atteint, stop: stops.stop1 },
              { label: 'Entrée', value: pos.prix_moyen, atteint: true, stop: null },
              { label: 'Support (S)', value: pos.support, atteint: false, stop: stops.stop0 },
            ].filter(Boolean).map((n: any) => (
              <div key={n.label} className="flex items-center px-4 py-2.5 border-b last:border-0"
                style={{ borderColor: 'var(--noir-border)' }}>
                <div className="w-16 text-xs font-medium" style={{ color: '#707070' }}>{n.label}</div>
                <div className="flex-1 mx-3">
                  <div className="h-px" style={{ background: n.atteint ? '#00C853' : 'rgba(255,255,255,0.06)' }}>
                    {n.atteint && <div className="w-full h-full opacity-30" style={{ background: '#00C853' }} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono" style={{ color: n.label === 'Support (S)' ? '#FF1744' : n.atteint ? '#00C853' : '#D4AF37' }}>
                    {fmt(n.value)}
                  </div>
                  {n.atteint && n.label !== 'Entrée' && n.label !== 'Support (S)' && (
                    <div className="text-[10px]" style={{ color: '#00C853' }}>ATTEINT</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progression du trade */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--noir-border)' }}>
            <div className="text-xs font-semibold mb-3 tracking-wider" style={{ color: '#5C5C5C' }}>
              PROGRESSION DU TRADE
            </div>
            <div className="flex items-center justify-between mb-2">
              {['Entrée', 'R1', 'R2', 'R3', 'Runner'].map((step, i) => {
                const atteint = i === 0 || (i === 1 && pos.r1_atteint) || (i === 2 && pos.r2_atteint) || (i === 3 && pos.r3_atteint) || (i === 4 && pos.state === 'RUNNING')
                const existe  = i === 0 || i === 1 || (i === 2 && pos.r2) || (i === 3 && pos.r3) || i === 4
                return (
                  <div key={step} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                    {atteint ? (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: '#00C853' }}>
                        <CheckCircle size={14} style={{ color: '#000' }} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: existe ? '#3A3A3A' : '#1A1A1A', background: 'var(--noir-elevated)' }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: existe ? '#3A3A3A' : '#1A1A1A' }} />
                      </div>
                    )}
                    <span className="text-[10px]" style={{ color: atteint ? '#00C853' : '#3A3A3A' }}>{step}</span>
                  </div>
                )
              })}
            </div>
            {prochainObj && (
              <div className="text-xs text-center mt-2" style={{ color: '#707070' }}>
                Prochain objectif : <span style={{ color: '#D4AF37' }}>
                  {prochainObj.label}{prochainObj.value ? ` à ${fmt(prochainObj.value)}` : ''}
                </span>
                {prochainObj.qte && (
                  <span> · Qté prévue : <span style={{ color: '#D4AF37' }}>{prochainObj.qte} ({((Number(prochainObj.qte)/pos.quantite_totale)*100).toFixed(1)}%)</span></span>
                )}
              </div>
            )}
          </div>

          {/* Stop dynamique */}
          <div className="p-4 rounded-xl flex items-center justify-between"
            style={{ background: 'rgba(255,152,0,0.05)', border: '1px solid rgba(255,152,0,0.2)' }}>
            <div>
              <div className="text-xs font-semibold" style={{ color: '#FF9800' }}>Stop dynamique</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#5C5C5C' }}>
                Basé sur 61.8% du mouvement précédent
              </div>
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: '#FF9800' }}>
              {fmt(stopAct)}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Fermer</button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => onVendre(pos, null)}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
              <TrendingDown size={14} /> Saisir une vente
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ──────────────── Modal Vente ─────────────────────────────────── */
function VenteModal({
  pos, alerte, onClose, onSaved,
}: {
  pos: Position
  alerte: AlertePosition | null
  onClose: () => void
  onSaved: () => void
}) {
  const [quantite,  setQuantite]  = useState('')
  const [prixVente, setPrixVente] = useState(alerte ? String(alerte.prix_trigger) : '')
  const [loading,   setLoading]   = useState(false)
  const supabase = createClient()

  const qMax = pos.quantite_restante
  const pnlPrev = quantite && prixVente
    ? calculerPnlVente(parseFloat(quantite), parseFloat(prixVente), pos.prix_moyen)
    : null

  // Suggestion quantité selon alerte
  const qSuggestion = alerte?.type === 'TAKE_PROFIT_R1' ? pos.q1_cible
    : alerte?.type === 'TAKE_PROFIT_R2' ? pos.q2_cible
    : alerte?.type === 'TAKE_PROFIT_R3' ? pos.q3_cible
    : alerte ? qMax : null

  const niveauVente = () => {
    if (!alerte) return 'MANUEL'
    if (alerte.type === 'STOP_LOSS' || alerte.type === 'RUNNER_STOP') return 'STOP'
    if (alerte.type === 'TAKE_PROFIT_R1') return 'R1'
    if (alerte.type === 'TAKE_PROFIT_R2') return 'R2'
    if (alerte.type === 'TAKE_PROFIT_R3') return 'R3'
    return 'MANUEL'
  }

  async function handleVente(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const Q  = parseFloat(quantite)
    const PV = parseFloat(prixVente)

    if (Q > qMax) { toast.error(`Max : ${qMax}`); setLoading(false); return }

    const pnl      = calculerPnlVente(Q, PV, pos.prix_moyen)
    const qRest    = pos.quantite_restante - Q
    const niveau   = niveauVente()
    const stops    = calculerStops(pos.support, pos.r1, pos.r2 ?? undefined, pos.r3 ?? undefined)

    let newStop    = pos.stop_actuel
    let newState   = pos.state
    let r1_atteint = pos.r1_atteint
    let r2_atteint = pos.r2_atteint
    let r3_atteint = pos.r3_atteint

    if (niveau === 'R1') { newStop = stops.stop1; r1_atteint = true; newState = 'PARTIALLY_SOLD' }
    if (niveau === 'R2') { newStop = stops.stop2 ?? newStop; r2_atteint = true }
    if (niveau === 'R3') { newStop = stops.stop3 ?? newStop; r3_atteint = true; newState = 'RUNNING' }

    await supabase.from('position_ventes').insert({
      position_id: pos.id, user_id: session.user.id,
      niveau, prix_vente: PV, quantite: Q, pnl,
    })

    const isClosed = qRest <= 0
    await supabase.from('positions').update({
      quantite_restante: Math.max(0, qRest),
      pnl_realise:       (pos.pnl_realise || 0) + pnl,
      stop_actuel:       newStop,
      state:             isClosed ? 'CLOSED' : newState,
      r1_atteint, r2_atteint, r3_atteint,
      closed_at:         isClosed ? new Date().toISOString() : null,
    }).eq('id', pos.id)

    if (alerte) {
      await supabase.from('position_alertes').update({ is_acted: true, is_read: true }).eq('id', alerte.id)
    }

    if (isClosed) {
      toast.success(messageCloture((pos.pnl_realise || 0) + pnl, pos.ticker), { duration: 6000 })
    } else {
      toast.success(`Vente enregistrée ✓ · ${fmtPnl(pnl)}`)
    }

    onSaved()
    setLoading(false)
  }

  const alerteCfg = alerte ? labelAlerte(alerte.type) : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border overflow-hidden"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Header alerte */}
        {alerteCfg && (
          <div className="px-5 py-3 flex items-center gap-2"
            style={{ background: `${alerteCfg.couleur}18`, borderBottom: `1px solid ${alerteCfg.couleur}30` }}>
            <span className="text-lg">{alerteCfg.emoji}</span>
            <div>
              <div className="font-bold text-sm" style={{ color: alerteCfg.couleur }}>{alerteCfg.titre}</div>
              <div className="text-xs" style={{ color: '#707070' }}>
                {pos.ticker} · Déclencheur : {alerte ? fmt(alerte.prix_trigger) : '—'}
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div>
            <div className="font-semibold" style={{ color: '#F5F5F5' }}>SAISIR UNE VENTE</div>
            <div className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>
              Prix moyen : {fmt(pos.prix_moyen)} · Restant : {qMax}
            </div>
          </div>
          <button onClick={onClose}><X size={15} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleVente} className="p-5 space-y-4">

          {/* Suggestion */}
          {qSuggestion != null && (
            <div className="flex items-center justify-between p-3 rounded-lg text-xs"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <span style={{ color: '#707070' }}>
                Action recommandée : vendre {qSuggestion} actions ({((Number(qSuggestion)/pos.quantite_totale)*100).toFixed(1)}%)
              </span>
              <button type="button" className="font-bold ml-2" style={{ color: '#D4AF37' }}
                onClick={() => setQuantite(String(qSuggestion))}>
                Utiliser
              </button>
            </div>
          )}

          {/* Niveau atteint label */}
          {alerte && (
            <div className="text-xs p-2 rounded text-center font-medium"
              style={{ background: 'rgba(255,255,255,0.03)', color: '#A0A0A0' }}>
              Niveau atteint : <span style={{ color: '#D4AF37' }}>
                {niveauVente()} ({alerte ? fmt(alerte.prix_trigger) : '—'})
              </span>
            </div>
          )}

          {/* Quantité */}
          <div>
            <label className="field-label">QUANTITÉ À VENDRE</label>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setQuantite(v => String(Math.max(1, parseInt(v || '0') - 1)))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#A0A0A0' }}>
                −
              </button>
              <input type="number" value={quantite} onChange={e => setQuantite(e.target.value)}
                min={1} max={qMax} required className="input-premium font-mono text-center text-lg font-bold" />
              <button type="button"
                onClick={() => setQuantite(v => String(Math.min(qMax, parseInt(v || '0') + 1)))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#A0A0A0' }}>
                +
              </button>
            </div>
            {quantite && (
              <div className="text-xs text-center mt-1" style={{ color: '#5C5C5C' }}>
                ({((parseFloat(quantite)/pos.quantite_totale)*100).toFixed(1)}% de la position)
              </div>
            )}
          </div>

          {/* Prix de vente */}
          <div>
            <label className="field-label">PRIX DE VENTE</label>
            <input type="number" step="0.001" value={prixVente}
              onChange={e => setPrixVente(e.target.value)}
              placeholder="0.000" required className="input-premium font-mono text-center text-lg font-bold" />
          </div>

          {/* Preview P&L */}
          <AnimatePresence>
            {pnlPrev != null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl text-center overflow-hidden"
                style={{
                  background: pnlPrev >= 0 ? 'rgba(0,200,83,0.06)' : 'rgba(255,23,68,0.06)',
                  border: `1px solid ${pnlPrev >= 0 ? 'rgba(0,200,83,0.2)' : 'rgba(255,23,68,0.2)'}`,
                }}>
                <div className="text-xs mb-1" style={{ color: '#5C5C5C' }}>P&L estimé</div>
                <div className="text-2xl font-bold font-mono"
                  style={{ color: pnlPrev >= 0 ? '#00C853' : '#FF1744' }}>
                  {fmtPnl(pnlPrev)}
                </div>
                {pnlPrev >= 0
                  ? <div className="text-xs mt-1" style={{ color: '#00C853' }}>Stop mis à jour automatiquement</div>
                  : <div className="text-xs mt-1" style={{ color: '#FF1744' }}>Perte estimée · Sortie recommandée</div>
                }
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F5D76E, #B8960C)', color: '#000' }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              : <><CheckCircle size={15} /> Confirmer la vente</>}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────── Page principale ──────────────────────── */
export default function PositionsDashboard() {
  const [positions,  setPositions]  = useState<Position[]>([])
  const [alertes,    setAlertes]    = useState<AlertePosition[]>([])
  const [cotations,  setCotations]  = useState<Record<string, number>>({})
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [detailPos,  setDetailPos]  = useState<Position | null>(null)
  const [venteData,  setVenteData]  = useState<{ pos: Position; alerte: AlertePosition | null } | null>(null)
  const supabase = createClient()

  async function fetchAll() {
    const [{ data: pos }, { data: al }] = await Promise.all([
      supabase.from('positions').select('*').neq('state', 'CLOSED').order('created_at', { ascending: false }),
      supabase.from('position_alertes').select('*').eq('is_read', false).order('created_at', { ascending: false }),
    ])
    if (pos) setPositions(pos as Position[])
    if (al)  setAlertes(al as AlertePosition[])
    setLoading(false)
  }

  async function fetchCotations() {
    try {
      const res = await fetch('/api/cotations')
      if (!res.ok) return
      const json = await res.json()
      const markets = Array.isArray(json) ? json : (json.markets ?? [])
      const map: Record<string, number> = {}
      markets.forEach((m: any) => {
        const nom = (m.referentiel?.ticker || m.nom || '').toUpperCase()
        const last = m.last ?? m.dernier ?? null
        if (nom && last != null) map[nom] = last
      })
      setCotations(map)
      // Détecter et créer les alertes pour chaque position
      await detecterEtCreerAlertes(map)
    } catch (err) { console.error('fetchCotations error:', err) }
  }

  async function detecterEtCreerAlertes(cotationsMap: Record<string, number>) {
    try {
      const { data: pos } = await supabase
        .from('positions').select('*').neq('state', 'CLOSED')
      const { data: alertesExist } = await supabase
        .from('position_alertes').select('*').eq('is_acted', false)
      if (!pos) return

      for (const p of pos as Position[]) {
        const prix = cotationsMap[p.ticker.toUpperCase()]
        if (!prix) continue

        const alertesDeja = (alertesExist || []).filter(a => a.position_id === p.id) as AlertePosition[]
        const nouvelles   = detecterAlertes(p, prix, alertesDeja)

        // Supprimer les alertes qui ne sont plus valides
        // (le prix est revenu dans la zone normale depuis la dernière cotation)
        for (const alerteDeja of alertesDeja) {
          const encoreValide =
            (alerteDeja.type === 'STOP_LOSS'      && prix <= alerteDeja.prix_trigger) ||
            (alerteDeja.type === 'RUNNER_STOP'    && prix <= alerteDeja.prix_trigger) ||
            (alerteDeja.type === 'TAKE_PROFIT_R1' && prix >= alerteDeja.prix_trigger) ||
            (alerteDeja.type === 'TAKE_PROFIT_R2' && prix >= alerteDeja.prix_trigger) ||
            (alerteDeja.type === 'TAKE_PROFIT_R3' && prix >= alerteDeja.prix_trigger)

          if (!encoreValide) {
            await supabase
              .from('position_alertes')
              .delete()
              .eq('id', alerteDeja.id)
          }
        }

        // Insérer les nouvelles alertes valides
        for (const a of nouvelles) {
          const { data: { user } } = await supabase.auth.getUser()
          const { error: insErr } = await supabase.from('position_alertes').insert({
            position_id:  p.id,
            user_id:      user?.id ?? null,
            type:         a.type,
            prix_trigger: a.prix_trigger,
            prix_marche:  prix,
            is_read:      false,
            is_acted:     false,
          })
          if (insErr) console.error('insert alerte error:', insErr.message, insErr.code)
        }
      }
      if (pos.length > 0) fetchAll()
    } catch (err) { console.error('detecterAlertes error:', err) }
  }

  useEffect(() => {
    fetchAll(); fetchCotations()
    const ch = supabase.channel('pos-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'position_alertes' }, fetchAll)
      .subscribe()
    const timer = setInterval(fetchCotations, 15 * 60 * 1000)
    return () => { supabase.removeChannel(ch); clearInterval(timer) }
  }, [])

  // Stats portefeuille
  const stats = useMemo(() => {
    const capitalEngage = positions.reduce((s, p) => s + p.prix_moyen * p.quantite_restante, 0)
    const pnlGlobal = positions.reduce((s, p) => {
      const prix = cotations[p.ticker.toUpperCase()]
      return s + (prix ? (prix - p.prix_moyen) * p.quantite_restante : 0) + p.pnl_realise
    }, 0)
    const perf = capitalEngage > 0 ? (pnlGlobal / capitalEngage) * 100 : 0
    // Répartition par ticker
    const repartition = positions.map(p => {
      const valeur = p.prix_moyen * p.quantite_restante
      return {
        ticker: p.ticker,
        valeur,
        pct: capitalEngage > 0 ? (valeur / capitalEngage) * 100 : 0,
      }
    }).sort((a, b) => b.pct - a.pct)

    return { capitalEngage, pnlGlobal, perf, alertes: alertes.length, repartition }
  }, [positions, cotations, alertes])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Mes Positions</h1>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#5C5C5C' }}>
            <Clock size={10} /> Données temps réel retardées de 15 minutes (BVMT)
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/client/positions/historique"
            className="p-2 rounded-lg text-xs font-medium flex items-center gap-1"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#707070' }}>
            Historique
          </Link>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)}
            className="btn-gold flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Nouvelle position
          </motion.button>
        </div>
      </div>

      {/* Résumé portefeuille */}
      <div className="card-premium p-5">
        <div className="text-xs font-bold tracking-wider mb-4" style={{ color: '#5C5C5C' }}>
          RÉSUMÉ PORTEFEUILLE
        </div>
        <div className="grid grid-cols-3 gap-4 pb-4 mb-4" style={{ borderBottom: '1px solid var(--noir-border)' }}>
          <div>
            <div className="text-xs mb-1" style={{ color: '#707070' }}>Capital engagé</div>
            <div className="text-xl font-bold font-mono" style={{ color: '#F5F5F5' }}>
              {(stats.capitalEngage/1000).toFixed(1)}k DT
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#707070' }}>P&L global</div>
            <div className="text-xl font-bold font-mono"
              style={{ color: stats.pnlGlobal >= 0 ? '#00C853' : '#FF1744' }}>
              {fmtPnl(stats.pnlGlobal)}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#707070' }}>Performance</div>
            <div className="text-xl font-bold font-mono"
              style={{ color: stats.perf >= 0 ? '#00C853' : '#FF1744' }}>
              {fmtPct(stats.perf)}
            </div>
          </div>
        </div>

        {/* Répartition des positions */}
        {stats.repartition.length > 0 && (
          <div>
            <div className="text-xs font-bold tracking-wider mb-4" style={{ color: '#5C5C5C' }}>
              RÉPARTITION DES POSITIONS
            </div>
            <div className="flex items-center gap-6">
              {/* Donut SVG */}
              <DonutChart data={stats.repartition} />
              {/* Légende */}
              <div className="flex-1 space-y-2">
                {stats.repartition.map((r, i) => (
                  <div key={r.ticker}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: i < stats.repartition.length - 1 ? '1px solid var(--noir-border)' : 'none' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <div>
                        <div className="text-sm font-bold" style={{ color: '#F5F5F5' }}>{r.ticker}</div>
                        <div className="text-xs" style={{ color: '#5C5C5C' }}>
                          {r.valeur.toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} DT
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold" style={{ color: DONUT_COLORS[i % DONUT_COLORS.length] }}>
                        {r.pct.toFixed(0)}%
                      </span>
                      <ChevronRight size={12} style={{ color: '#3A3A3A' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alertes */}
      {stats.alertes > 0 && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.25)' }}>
          <Bell size={16} style={{ color: '#FF9800', flexShrink: 0 }} />
          <span className="text-sm font-medium flex-1" style={{ color: '#FF9800' }}>
            {stats.alertes} alerte{stats.alertes > 1 ? 's' : ''} en attente d'action
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: '#FF9800', color: '#000' }}>
            {stats.alertes}
          </span>
        </div>
      )}

      {/* Positions */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="card-premium p-4 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-20" /><div className="skeleton h-3 w-40" />
                </div>
              </div>
              <div className="skeleton h-3 rounded-full" />
              <div className="grid grid-cols-2 gap-2">
                <div className="skeleton h-8 rounded-lg" /><div className="skeleton h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <Target size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p className="font-medium" style={{ color: '#5C5C5C' }}>Aucune position ouverte</p>
          <p className="text-xs mt-1" style={{ color: '#3A3A3A' }}>
            Cliquez sur "Nouvelle position" pour commencer
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider" style={{ color: '#5C5C5C' }}>
              POSITIONS OUVERTES
            </span>
            <Link href="/client/positions/historique"
              className="text-xs flex items-center gap-1" style={{ color: '#D4AF37' }}>
              Voir tout <ChevronRight size={11} />
            </Link>
          </div>
          {positions.map(pos => (
            <PositionCard
              key={pos.id}
              pos={pos}
              prix={cotations[pos.ticker.toUpperCase()] ?? null}
              alertes={alertes}
              onVendre={(p, a) => setVenteData({ pos: p, alerte: a })}
              onDetail={p => setDetailPos(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <NouvellePositionModal
            onClose={() => setShowForm(false)}
            onSaved={() => { fetchAll(); setShowForm(false) }}
          />
        )}
        {detailPos && (
          <PositionDetailModal
            pos={detailPos}
            prix={cotations[detailPos.ticker.toUpperCase()] ?? null}
            onClose={() => setDetailPos(null)}
            onVendre={(p, a) => { setDetailPos(null); setVenteData({ pos: p, alerte: a }) }}
          />
        )}
        {venteData && (
          <VenteModal
            pos={venteData.pos}
            alerte={venteData.alerte}
            onClose={() => setVenteData(null)}
            onSaved={() => { fetchAll(); setVenteData(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Nouvelle Position Modal ─────────────────────────────────── */
function NouvellePositionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ticker:'', p0:'', quantite:'', support:'', r1:'', r2:'', r3:'', note:'' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const n = (v: string) => v !== '' ? parseFloat(v) : undefined

  const preview = useMemo(() => {
    const Q = parseFloat(form.quantite) || 0
    const r1 = parseFloat(form.r1) || 0
    const r2 = n(form.r2)
    const r3 = n(form.r3)
    const S  = parseFloat(form.support) || 0
    if (!Q || !r1 || !S) return null
    return {
      rep:   calculerRepartition(Q, r1, r2, r3),
      stops: calculerStops(S, r1, r2, r3),
    }
  }, [form])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const Q  = parseFloat(form.quantite)
    const P0 = parseFloat(form.p0)
    const S  = parseFloat(form.support)
    const r1 = parseFloat(form.r1)
    const r2 = n(form.r2)
    const r3 = n(form.r3)

    const { data: existing } = await supabase
      .from('positions').select('id')
      .eq('ticker', form.ticker.toUpperCase())
      .eq('user_id', session.user.id)
      .neq('state', 'CLOSED').single()

    if (existing) {
      toast.error(`Position déjà active sur ${form.ticker.toUpperCase()}`)
      setLoading(false); return
    }

    const rep   = calculerRepartition(Q, r1, r2, r3)
    const stops = calculerStops(S, r1, r2, r3)

    const { data: pos, error } = await supabase.from('positions').insert({
      user_id: session.user.id, ticker: form.ticker.toUpperCase(),
      state: 'OPEN', prix_moyen: P0, quantite_totale: Q, quantite_restante: Q,
      support: S, r1, r2: r2 ?? null, r3: r3 ?? null,
      stop_initial: stops.stop0, stop_actuel: stops.stop0,
      q1_cible: rep.q1, q2_cible: rep.q2 ?? null, q3_cible: rep.q3 ?? null, runner_cible: rep.runner,
      pnl_realise: 0, note: form.note || null,
    }).select().single()

    if (error) { toast.error(error.message); setLoading(false); return }

    await supabase.from('position_achats').insert({
      position_id: pos.id, user_id: session.user.id, prix_achat: P0, quantite: Q,
    })

    toast.success(`Position ${form.ticker.toUpperCase()} créée ✓`)
    onSaved(); setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 30 }} animate={{ y: 0 }}
        className="w-full max-w-sm rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)' }}>
          <div>
            <div className="text-xs font-bold tracking-wider" style={{ color: '#D4AF37' }}>NOUVELLE POSITION</div>
          </div>
          <button onClick={onClose}><X size={15} style={{ color: '#5C5C5C' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto max-h-[80vh]">

          {/* Ticker */}
          <div>
            <label className="field-label">TICKER</label>
            <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
              placeholder="BIAT" required className="input-premium font-mono font-bold text-center text-lg" />
          </div>

          {/* Prix + Quantité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">PRIX D'ENTRÉE</label>
              <input type="number" step="0.001" value={form.p0}
                onChange={e => f('p0', e.target.value)} placeholder="90.250" required className="input-premium font-mono" />
            </div>
            <div>
              <label className="field-label">QUANTITÉ TOTALE</label>
              <input type="number" step="1" value={form.quantite}
                onChange={e => f('quantite', e.target.value)} placeholder="100" required className="input-premium font-mono" />
            </div>
          </div>

          {/* Support */}
          <div>
            <label className="field-label">SUPPORT (S)</label>
            <input type="number" step="0.001" value={form.support}
              onChange={e => f('support', e.target.value)} placeholder="89.300" required className="input-premium font-mono" />
          </div>

          {/* R1 */}
          <div>
            <label className="field-label">R1 (OBLIGATOIRE)</label>
            <input type="number" step="0.001" value={form.r1}
              onChange={e => f('r1', e.target.value)} placeholder="92.000" required className="input-premium font-mono" />
          </div>

          {/* R2 + R3 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">R2 (optionnel)</label>
              <input type="number" step="0.001" value={form.r2}
                onChange={e => f('r2', e.target.value)} placeholder="95.500" className="input-premium font-mono" />
            </div>
            <div>
              <label className="field-label">R3 (optionnel)</label>
              <input type="number" step="0.001" value={form.r3}
                onChange={e => f('r3', e.target.value)} placeholder="98.000" className="input-premium font-mono" />
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3 rounded-xl space-y-2"
              style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: 'Q1', v: preview.rep.q1 },
                  { l: 'Q2', v: preview.rep.q2 ?? '—' },
                  { l: 'Q3', v: preview.rep.q3 ?? '—' },
                  { l: 'Run', v: preview.rep.runner },
                ].map(({ l, v }) => (
                  <div key={l} className="text-center p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-xs font-bold font-mono" style={{ color: '#D4AF37' }}>{v}</div>
                    <div className="text-[9px]" style={{ color: '#5C5C5C' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span style={{ color: '#5C5C5C' }}>Stop initial : <span className="font-mono" style={{ color: '#FF1744' }}>{fmt(preview.stops.stop0)}</span></span>
                <span style={{ color: '#5C5C5C' }}>Après R1 : <span className="font-mono" style={{ color: '#FF9800' }}>{fmt(preview.stops.stop1)}</span></span>
              </div>
            </motion.div>
          )}

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F5D76E, #B8960C)', color: '#000' }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              : 'Créer la position'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}
