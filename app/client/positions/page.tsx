'use client'

import React, { useEffect, useState, useMemo } from 'react'
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
  labelAlerte, messageCloture, prochainStop,
  type Position, type AlertePosition,
} from '@/lib/positions-engine'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Donut 3D (WebGL réel — React Three Fiber). Chargé côté client uniquement :
// le Canvas ne peut pas être rendu côté serveur.
// Nécessite : npm install three @react-three/fiber @react-three/drei
const Donut3D = dynamic(() => import('./Donut3D'), { ssr: false })

/* ─────────────────────── Helpers ─────────────────────────────── */
const fmt = (n: number | null | undefined, d = 3) =>
  n == null ? '—' : n.toLocaleString('fr-TN', { minimumFractionDigits: d, maximumFractionDigits: d })

const fmtPnl = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT`

const fmtPct = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`


/* ─── Palette donut ─────────────────────────────────────────────── */
const DONUT_COLORS = ['#22C55E', '#EAB308', '#3B82F6', '#A855F7', '#EF4444', '#06B6D4', '#F97316', '#EC4899']

// Dégradés [clair, milieu, sombre] par couleur de base — utilisés à la fois
// par le donut SVG et par la légende HTML pour garantir la cohérence.
const DONUT_GRADS: Record<string, [string, string, string]> = {
  '#22C55E': ['#32d26b', '#22c55e', '#15803d'],
  '#EAB308': ['#facc15', '#eab308', '#a16207'],
  '#3B82F6': ['#60a5fa', '#3b82f6', '#1d4ed8'],
  '#A855F7': ['#c084fc', '#a855f7', '#7e22ce'],
  '#EF4444': ['#f87171', '#ef4444', '#991b1b'],
  '#06B6D4': ['#22d3ee', '#06b6d4', '#0e7490'],
  '#F97316': ['#fb923c', '#f97316', '#c2410c'],
  '#EC4899': ['#f472b6', '#ec4899', '#9d174d'],
}

// Couleurs dédiées à des tickers spécifiques (règle 9). Les autres tickers
// retombent sur la palette générique ci-dessus, indexée par position.
const TICKER_GRADS: Record<string, [string, string, string]> = {
  TINV: ['#22C55E', '#1FAE57', '#16A34A'],
  SFBT: ['#FACC15', '#DFAF10', '#CA8A04'],
  TGH:  ['#3B82F6', '#2F70DA', '#2563EB'],
}

function getTickerGrad(ticker: string, i: number): [string, string, string] {
  if (TICKER_GRADS[ticker]) return TICKER_GRADS[ticker]
  const base = DONUT_COLORS[i % DONUT_COLORS.length]
  return DONUT_GRADS[base] ?? [base, base, base]
}

function getTickerColor(ticker: string, i: number): string {
  return getTickerGrad(ticker, i)[1]
}

/* ─── Helpers géométrie 3D ──────────────────────────────────────── */
function _darken(hex: string, f = 0.4) {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${Math.round(((n>>16)&0xff)*f)},${Math.round(((n>>8)&0xff)*f)},${Math.round((n&0xff)*f)})`
}
function _rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n>>16)&0xff},${(n>>8)&0xff},${n&0xff},${a})`
}

/* ─── Composant DonutChart 3D Premium ──────────────────────────── */
function DonutChart({ data, hovTicker, onHov }: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker: string | null
  onHov: (t: string | null) => void
}) {
  // Sélection au clic (persiste sur mobile, sans nécessiter un survol)
  const [clicked, setClicked] = useState<string | null>(null)
  const active = hovTicker ?? clicked

  // ── Constantes géométriques (coordonnées elliptiques natives) ──
  // Taille réduite de ~17.5% par rapport à la version d'origine, et
  // trou central légèrement agrandi (ratio hole/outer ~0.42).
  const VW = 380, cy = 92
  const RX = 132, RY = 79        // ellipse extérieure
  const rxi = 56, ryi = 34       // ellipse intérieure (trou)
  const DEPTH = 22               // épaisseur extrusion (20–24px)
  const EXPLODE = 6               // écartement au survol
  const GAP = 0.022               // gap entre segments
  const cx = VW / 2
  const svgH = cy + DEPTH + 58

  // ── Construction des segments ─────────────────────────────────
  const total = data.reduce((s, d) => s + d.pct, 0)
  let cum = -Math.PI / 2

  const segs = data.map((d, i) => {
    const pct   = total > 0 ? (d.pct / total) * 100 : 0
    const sweep = (pct / 100) * 2 * Math.PI - GAP * 2
    const start = cum + GAP
    const end   = start + Math.max(sweep, 0.001)
    cum += (pct / 100) * 2 * Math.PI
    const mid  = (start + end) / 2
    const g    = getTickerGrad(d.ticker, i)
    return {
      ticker: d.ticker, pct, valeur: d.valeur,
      start, end, mid, g,
      midC: g[1],
      ex: Math.cos(mid) * EXPLODE,
      ey: Math.sin(mid) * EXPLODE,
    }
  })

  // ── Helper point ellipse ──────────────────────────────────────
  const ep = (ecx: number, ecy: number, erx: number, ery: number, a: number) =>
    ({ x: ecx + erx * Math.cos(a), y: ecy + ery * Math.sin(a) })

  // ── Path face supérieure ──────────────────────────────────────
  const topFace = (ecx: number, ecy: number, s: number, e: number) => {
    const lg = e - s > Math.PI ? 1 : 0
    const o1 = ep(ecx,ecy,RX,RY,s), o2 = ep(ecx,ecy,RX,RY,e)
    const i2 = ep(ecx,ecy,rxi,ryi,e), i1 = ep(ecx,ecy,rxi,ryi,s)
    return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${RX} ${RY} 0 ${lg} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i2.x.toFixed(2)} ${i2.y.toFixed(2)} A${rxi} ${ryi} 0 ${lg} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}Z`
  }

  // ── Path paroi extérieure (demi-basse 0→π) ───────────────────
  const outerWall = (ecx: number, ecy: number, s: number, e: number) => {
    const ws = Math.max(s, 0), we = Math.min(e, Math.PI)
    if (ws >= we - 0.001) return ''
    const lg = we - ws > Math.PI ? 1 : 0
    const t1 = ep(ecx,ecy,RX,RY,ws),        t2 = ep(ecx,ecy,RX,RY,we)
    const b2 = ep(ecx,ecy+DEPTH,RX,RY,we),  b1 = ep(ecx,ecy+DEPTH,RX,RY,ws)
    return `M${t1.x.toFixed(2)} ${t1.y.toFixed(2)} A${RX} ${RY} 0 ${lg} 1 ${t2.x.toFixed(2)} ${t2.y.toFixed(2)} L${b2.x.toFixed(2)} ${b2.y.toFixed(2)} A${RX} ${RY} 0 ${lg} 0 ${b1.x.toFixed(2)} ${b1.y.toFixed(2)}Z`
  }

  // ── Path paroi intérieure (demi-basse 0→π) ───────────────────
  const innerWall = (ecx: number, ecy: number, s: number, e: number) => {
    const ws = Math.max(s, 0), we = Math.min(e, Math.PI)
    if (ws >= we - 0.001) return ''
    const lg = we - ws > Math.PI ? 1 : 0
    const t1 = ep(ecx,ecy,rxi,ryi,ws),       t2 = ep(ecx,ecy,rxi,ryi,we)
    const b2 = ep(ecx,ecy+DEPTH,rxi,ryi,we), b1 = ep(ecx,ecy+DEPTH,rxi,ryi,ws)
    return `M${t1.x.toFixed(2)} ${t1.y.toFixed(2)} A${rxi} ${ryi} 0 ${lg} 1 ${t2.x.toFixed(2)} ${t2.y.toFixed(2)} L${b2.x.toFixed(2)} ${b2.y.toFixed(2)} A${rxi} ${ryi} 0 ${lg} 0 ${b1.x.toFixed(2)} ${b1.y.toFixed(2)}Z`
  }

  const handleEnter = (t: string) => onHov(t)
  const handleLeave = () => onHov(null)
  const handleClick = (t: string) => setClicked(prev => prev === t ? null : t)
  const handleTouchStart = (e: React.TouchEvent, t: string) => { e.preventDefault(); onHov(t) }
  const handleTouchEnd = () => onHov(null)

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${svgH}`}
      style={{ display: 'block', overflow: 'visible', maxWidth: 220, margin: '0 auto' }}>
      <defs>
        {segs.map((s, i) => (
          <linearGradient key={`lg-${i}`} id={`dlg-${i}`}
            x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={s.g[0]} />
            <stop offset="45%"  stopColor={s.g[1]} />
            <stop offset="100%" stopColor={s.g[2]} />
          </linearGradient>
        ))}
        {/* Dégradés verticaux pour les parois — accentuent la profondeur */}
        {segs.map((s, i) => (
          <linearGradient key={`ow-grad-${i}`} id={`dowg-${i}`}
            x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={s.g[1]} stopOpacity={0.75} />
            <stop offset="100%" stopColor={_darken(s.g[2], 0.35)} stopOpacity={0.85} />
          </linearGradient>
        ))}
        {segs.map((s, i) => (
          <linearGradient key={`iw-grad-${i}`} id={`diwg-${i}`}
            x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={_darken(s.g[1], 0.55)} stopOpacity={0.75} />
            <stop offset="100%" stopColor={_darken(s.g[2], 0.22)} stopOpacity={0.9} />
          </linearGradient>
        ))}
        <linearGradient id="d-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Anneau intérieur du trou central — simule un inset subtil */}
        <radialGradient id="d-hole-inset" cx="50%" cy="32%" r="78%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.05)" />
          <stop offset="55%"  stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
        </radialGradient>
      </defs>

      {/* ── Ombre au sol : blur 25px, opacity 0.20, rgba(0,0,0,0.5) ── */}
      <ellipse cx={cx} cy={cy + DEPTH + 20} rx={RX * 0.92} ry={14}
        fill="rgba(0,0,0,0.5)" opacity={0.20}
        style={{ filter: 'blur(25px)' }} />

      {/* ── Parois extérieures (dégradé vertical) ── */}
      {segs.map((s, i) => {
        const isH = active === s.ticker
        const ex = isH ? s.ex * 1.3 : 0
        const ey = isH ? s.ey * 1.3 : 0
        const d = outerWall(cx + ex, cy + ey, s.start, s.end)
        return d ? (
          <path key={`ow-${i}`} d={d}
            fill={`url(#dowg-${i})`}
            style={{ transition: 'all 250ms ease' }} />
        ) : null
      })}

      {/* ── Parois intérieures (dégradé vertical) ── */}
      {segs.map((s, i) => {
        const isH = active === s.ticker
        const ex = isH ? s.ex * 1.3 : 0
        const ey = isH ? s.ey * 1.3 : 0
        const d = innerWall(cx + ex, cy + ey, s.start, s.end)
        return d ? (
          <path key={`iw-${i}`} d={d}
            fill={`url(#diwg-${i})`}
            style={{ transition: 'all 250ms ease' }} />
        ) : null
      })}

      {/* ── Faces supérieures ── */}
      {segs.map((s, i) => {
        const isH = active === s.ticker
        const ex = isH ? s.ex * 1.3 : 0
        const ey = isH ? s.ey * 1.3 : 0
        const topD = topFace(cx + ex, cy + ey, s.start, s.end)

        // Label : milieu radial (innerRadius + outerRadius) / 2, translateY -6px
        const labR  = (RX  + rxi)  / 2 * 0.72
        const labRY = (RY  + ryi)  / 2 * 0.72
        const lx = cx + ex + labR  * Math.cos(s.mid)
        const ly = cy + ey + labRY * Math.sin(s.mid) - 6

        // Position du tooltip : évite tout débordement de la carte.
        // Droite → tooltip à gauche · Gauche → tooltip à droite · Haut → tooltip dessous.
        const cosM = Math.cos(s.mid), sinM = Math.sin(s.mid)
        const nearTop   = sinM < -0.55
        const rightSide = cosM > 0.12
        const leftSide  = cosM < -0.12
        const tip = ep(cx + ex, cy + ey, RX + 10, RY + 10, s.mid)
        let ttTransform = 'translate(-50%, -100%)'
        if (nearTop)       ttTransform = 'translate(-50%, 10px)'
        else if (rightSide) ttTransform = 'translate(calc(-100% - 8px), -50%)'
        else if (leftSide)  ttTransform = 'translate(8px, -50%)'

        return (
          <g key={`top-${i}`}
            style={{
              cursor:          'pointer',
              filter:          isH
                ? 'drop-shadow(0 12px 30px rgba(0,0,0,.45))'
                : 'drop-shadow(0 4px 10px rgba(0,0,0,.35))',
              transform:       isH
                ? `translate(${(s.ex * 0.25).toFixed(1)}px,-3px) scale(1.04)`
                : 'none',
              transformOrigin: `${(cx + s.ex).toFixed(1)}px ${(cy + s.ey).toFixed(1)}px`,
              transition:      'transform 250ms ease, filter 250ms ease',
            }}
            onMouseEnter={() => handleEnter(s.ticker)}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(s.ticker)}
            onTouchStart={e => handleTouchStart(e, s.ticker)}
            onTouchEnd={handleTouchEnd}>
            {/* Fond dégradé */}
            <path d={topD} fill={`url(#dlg-${i})`} />
            {/* Reflet glossy */}
            <path d={topD} fill="url(#d-gloss)" />
            {/* Contour blanc subtil */}
            <path d={topD} fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
            {/* Label % — uniquement pour les parts ≥ 10% */}
            {s.pct >= 10 && (
              <text x={lx.toFixed(1)} y={ly.toFixed(1)}
                textAnchor="middle" dominantBaseline="middle"
                fontFamily="Inter, system-ui, monospace"
                fontSize={11} fontWeight={600} fill="white"
                style={{
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))',
                }}>
                {s.pct.toFixed(0)}%
              </text>
            )}
            {/* Tooltip — largeur max 180px, ne sort jamais de la carte */}
            {isH && (
              <foreignObject x={tip.x - 100} y={tip.y - 60} width={200} height={120}
                style={{ overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: ttTransform,
                  maxWidth: 180, zIndex: 50,
                  background: 'rgba(10,10,10,0.96)',
                  border: `1px solid ${s.g[1]}55`,
                  borderRadius: 10, padding: '8px 10px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                  fontFamily: 'Inter, system-ui',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.g[1] }}>{s.ticker}</div>
                  <div style={{ fontSize: 10, color: '#D8D8D8', marginTop: 2 }}>{s.pct.toFixed(1)}%</div>
                  {s.valeur !== undefined && (
                    <div style={{ fontSize: 9, color: '#777', marginTop: 1 }}>
                      {s.valeur.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} DT
                    </div>
                  )}
                </div>
              </foreignObject>
            )}
          </g>
        )
      })}

      {/* ── Trou central ── */}
      <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi}
        fill="#050505" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      {/* Anneau interne subtil (simule inset 0 0 12px rgba(255,255,255,0.05)) */}
      <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} fill="url(#d-hole-inset)" />
      <ellipse cx={cx} cy={cy + DEPTH} rx={rxi - 1} ry={ryi - 0.4}
        fill="#040404" />
      <text x={cx} y={cy - 6} textAnchor="middle"
        fontFamily="Inter, system-ui" fontSize={11} fontWeight={700}
        letterSpacing="0.10em" fill="#D4AF37" opacity={0.9}>PORTF.</text>
      <text x={cx} y={cy + 16} textAnchor="middle"
        fontFamily="Inter, monospace" fontSize={24} fontWeight={700}
        fill="#D4AF37" opacity={0.9}>
        {segs.length}
      </text>
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

  async function handleConserverPosition() {
    if (!alerte) return
    setLoading(true)
    await supabase.from('position_alertes').delete().eq('id', alerte.id)
    toast.success('Position conservée')
    onSaved()
    setLoading(false)
    onClose()
  }

  async function handleSupprimerAlerte() {
    if (!alerte) return
    setLoading(true)
    await supabase.from('position_alertes').delete().eq('id', alerte.id)
    onSaved()
    setLoading(false)
    onClose()
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

        {/* Bandeau alerte — neutre, pas de jugement sur la décision */}
        {alerteCfg && (
          <div className="px-5 py-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--noir-border)' }}>
            <div>
              <div className="text-sm" style={{ color: '#F5F5F5' }}>
                Le seuil de stop enregistré a été atteint.
              </div>
              <div className="text-xs mt-1" style={{ color: '#707070' }}>
                Que souhaitez-vous faire ?
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={loading}
                onClick={() => setQuantite(String(qSuggestion))}
                className="flex-1 py-2 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                Appliquer le stop
              </button>
              <button type="button" disabled={loading}
                onClick={handleConserverPosition}
                className="flex-1 py-2 rounded-lg text-xs font-bold"
                style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)', color: '#A0A0A0' }}>
                Conserver ma position
              </button>
            </div>
            <button type="button" disabled={loading}
              onClick={handleSupprimerAlerte}
              className="text-xs w-full text-center underline"
              style={{ color: '#5C5C5C' }}>
              Supprimer cette alerte
            </button>
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
// ─── RepartitionBlock ────────────────────────────────────────────────────────
function RepartitionBlock({ repartition }: { repartition: { ticker: string; valeur: number; pct: number }[] }) {
  const [hov, setHov] = React.useState<string | null>(null)
  const [openTicker, setOpenTicker] = React.useState<string | null>(null)

  const totalInvesti = repartition.reduce((s, r) => s + r.valeur, 0)
  const donutData = repartition.map(r => ({ ticker: r.ticker, pct: r.pct, valeur: r.valeur }))

  return (
    <div>
      {/* Donut 3D (WebGL) — largeur/marge gérées en interne par le composant */}
      <Donut3D data={donutData} hovTicker={hov} onHov={setHov} />

      {/* Légende en grille 2 colonnes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '3px 8px',
      }}>
        {repartition.map((r, i) => {
          const color    = getTickerColor(r.ticker, i)
          const isHov    = hov === r.ticker
          const hasAlert = r.pct > 20
          const isOpen   = openTicker === r.ticker
          return (
            <div key={r.ticker}>
              <div
                onMouseEnter={() => setHov(r.ticker)}
                onMouseLeave={() => setHov(null)}
                onTouchStart={() => setHov(r.ticker)}
                onTouchEnd={() => setHov(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 7px', borderRadius: 9,
                  background: isHov ? `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.09)` : 'transparent',
                  border: `1px solid ${isHov ? color + '44' : 'transparent'}`,
                  transition: 'all 0.18s ease', cursor: 'default',
                }}>
                {/* Pastille */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: color,
                  boxShadow: isHov ? `0 0 6px ${color}` : 'none',
                  transition: 'box-shadow 0.2s',
                }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <span style={{
                      fontFamily: 'monospace', fontWeight: 700, fontSize: 10,
                      color: isHov ? color : '#D8D8D8',
                      transition: 'color 0.18s',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.ticker}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      {hasAlert && (
                        <button
                          onClick={() => setOpenTicker(isOpen ? null : r.ticker)}
                          style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: isOpen ? 'rgba(255,152,0,0.18)' : 'rgba(255,152,0,0.08)',
                            border: '1px solid rgba(255,152,0,0.35)',
                            borderRadius: 4, padding: '0px 3px', cursor: 'pointer', lineHeight: 1,
                          }}>
                          <span style={{ fontSize: 8 }}>⚠️</span>
                        </button>
                      )}
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 700, fontSize: 10,
                        color: isHov ? color : '#707070',
                        transition: 'color 0.18s',
                      }}>{r.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: '#404040', marginTop: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {r.valeur.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} DT
                  </div>
                </div>
              </div>

              {/* Alerte concentration — pleine largeur sous la cellule */}
              {hasAlert && isOpen && (
                <div style={{
                  gridColumn: '1 / -1',
                  margin: '2px 0 4px',
                  padding: '5px 8px',
                  borderRadius: 7,
                  background: 'rgba(255,152,0,0.07)',
                  border: '1px solid rgba(255,152,0,0.25)',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#FF9800' }}>
                    Exposition élevée : {r.pct.toFixed(0)}% &gt; 20%
                  </div>
                  <div style={{ fontSize: 9, color: '#8A5A20', lineHeight: 1.4, marginTop: 1 }}>
                    Risque de concentration. Diversification recommandée.
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer — positions ouvertes + mini barres */}
      <div style={{
        marginTop: 12, paddingTop: 10,
        borderTop: '1px solid #141414',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          background: 'linear-gradient(135deg, #1A1A1A, #111)',
          border: '1px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <rect x={2} y={5} width={20} height={15} rx={3} stroke="#505050" strokeWidth={1.8} />
            <path d="M2 9h20" stroke="#505050" strokeWidth={1.8} />
            <circle cx={17} cy={14} r={1.5} fill="#505050" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#C0C0C0' }}>
            {repartition.length} position{repartition.length > 1 ? 's' : ''} ouverte{repartition.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 9, color: '#2E2E2E', marginTop: 1 }}>Bourse de Tunis · Portefeuille actif</div>
        </div>
        {/* Mini barres sparkline */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
          {repartition.map((r, i) => {
            const color = getTickerColor(r.ticker, i)
            return (
              <div key={r.ticker} style={{
                width: 4, borderRadius: 2,
                height: `${Math.max(20, r.pct * 4)}%`,
                background: color,
                opacity: hov === null || hov === r.ticker ? 0.85 : 0.2,
                transition: 'opacity 0.2s',
                boxShadow: hov === r.ticker ? `0 0 4px ${color}` : 'none',
              }} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── ConcentrationRow ────────────────────────────────────────────────────────
function ConcentrationRow({ r, i, total }: {
  r: { ticker: string; valeur: number; pct: number }
  i: number
  total: number
}) {
  const [open, setOpen] = React.useState(false)
  const hasAlert = r.pct > 20
  const color = getTickerColor(r.ticker, i)
  const isLast = i === total - 1

  return (
    <div style={{ borderBottom: !isLast ? '1px solid var(--noir-border)' : 'none' }}>
      {/* Ligne ticker */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }} />
          <div>
            <div className="text-sm font-bold" style={{ color: '#F5F5F5' }}>{r.ticker}</div>
            <div className="text-xs" style={{ color: '#5C5C5C' }}>
              {r.valeur.toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} DT
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color }}>{r.pct.toFixed(0)}%</span>
          {hasAlert ? (
            <button
              onClick={() => setOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '2px',
                background: open ? 'rgba(255,152,0,0.15)' : 'rgba(255,152,0,0.08)',
                border: '1px solid rgba(255,152,0,0.35)',
                borderRadius: '6px', padding: '2px 6px',
                cursor: 'pointer', transition: 'background 0.2s',
              }}>
              <span style={{ fontSize: '11px' }}>⚠️</span>
              <svg width="10" height="10" viewBox="0 0 10 10"
                style={{ color: '#FF9800', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
          ) : (
            <ChevronRight size={12} style={{ color: '#3A3A3A' }} />
          )}
        </div>
      </div>

      {/* Panel pleine largeur — en dehors du flex row */}
      {hasAlert && open && (
        <div className="rounded-lg p-2.5 mb-2"
          style={{
            background: 'rgba(255,152,0,0.07)',
            border: '1px solid rgba(255,152,0,0.3)',
            marginLeft: '-14px',
            marginRight: '-14px',
            borderRadius: '0',
          }}>
          <div className="flex items-start gap-2" style={{ padding: '0 14px' }}>
            <span style={{ fontSize: '13px', flexShrink: 0 }}>⚠️</span>
            <div>
              <div className="text-xs font-bold" style={{ color: '#FF9800' }}>
                Exposition élevée : {r.pct.toFixed(0)}% &gt; 20%
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#A07040' }}>
                Risque de concentration. Diversification recommandée.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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

  // NOTE : la détection des franchissements (stop, R1/R2/R3, runner) ne se
  // fait plus ici. Elle est déléguée au job serveur `/api/cron/check-alerts`
  // (appelé périodiquement par cron-job.org), qui écrit dans
  // `position_alertes` et envoie les push. Ce composant ne fait plus que
  // récupérer les cours pour l'affichage (P&L, %) et refléter en temps réel
  // les lignes `position_alertes` créées côté serveur via Supabase Realtime.
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
    } catch (err) { console.error('fetchCotations error:', err) }
  }

  useEffect(() => {
    fetchAll(); fetchCotations()
    const ch = supabase.channel('pos-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'position_alertes' }, fetchAll)
      .subscribe()
    // Rafraîchissement de l'affichage des cours uniquement (pas de détection ici)
    const timer = setInterval(fetchCotations, 60 * 1000)
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
      <div className="card-premium p-4">
        {/* Stats compactes sur une ligne */}
        <div className="grid grid-cols-3 gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--noir-border)' }}>
          <div>
            <div className="text-[10px] mb-0.5" style={{ color: '#5C5C5C' }}>Capital</div>
            <div className="text-base font-bold font-mono" style={{ color: '#F5F5F5' }}>
              {(stats.capitalEngage/1000).toFixed(1)}k DT
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-0.5" style={{ color: '#5C5C5C' }}>P&L</div>
            <div className="text-base font-bold font-mono"
              style={{ color: stats.pnlGlobal >= 0 ? '#00C853' : '#FF1744' }}>
              {fmtPnl(stats.pnlGlobal)}
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-0.5" style={{ color: '#5C5C5C' }}>Perf.</div>
            <div className="text-base font-bold font-mono"
              style={{ color: stats.perf >= 0 ? '#00C853' : '#FF1744' }}>
              {fmtPct(stats.perf)}
            </div>
          </div>
        </div>

        {/* Répartition des positions */}
        {stats.repartition.length > 0 && (
          <RepartitionBlock repartition={stats.repartition} />
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
