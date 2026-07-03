'use client'

/**
 * Donut3D — port fidèle du plugin Donut3D.js (github.com/d3pie)
 * Logique pieTop / pieOuter / pieInner portée en SVG React pur.
 * Aucune dépendance externe. Stable sur tous les appareils.
 */

import { useId, useState } from 'react'

// ─── Couleurs ─────────────────────────────────────────────────────────────────
const TICKER_COLORS: Record<string, string> = {
  TINV: '#22C55E',
  SFBT: '#FACC15',
  TGH:  '#3B82F6',
}
const FALLBACK = ['#22C55E','#EAB308','#3B82F6','#A855F7','#EF4444','#06B6D4','#F97316','#EC4899']

function colorFor(ticker: string, i: number) {
  return TICKER_COLORS[ticker] ?? FALLBACK[i % FALLBACK.length]
}

/** Assombrit une couleur hex d'un facteur 0-1 */
function darker(hex: string, f = 0.65): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.round(((n >> 16) & 0xff) * f)
  const g = Math.round(((n >>  8) & 0xff) * f)
  const b = Math.round(( n        & 0xff) * f)
  return `rgb(${r},${g},${b})`
}

// ─── Fonctions de path — port exact du plugin original ───────────────────────

interface Arc { startAngle: number; endAngle: number }

/** Face supérieure (anneau elliptique) */
function pieTop(d: Arc, rx: number, ry: number, ir: number): string {
  if (d.endAngle - d.startAngle === 0) return 'M 0 0'
  const sx = rx * Math.cos(d.startAngle), sy = ry * Math.sin(d.startAngle)
  const ex = rx * Math.cos(d.endAngle),   ey = ry * Math.sin(d.endAngle)
  const large = d.endAngle - d.startAngle > Math.PI ? 1 : 0
  return [
    'M', sx, sy,
    'A', rx, ry, '0', large, '1', ex, ey,
    'L', ir*ex, ir*ey,
    'A', ir*rx, ir*ry, '0', large, '0', ir*sx, ir*sy,
    'Z'
  ].join(' ')
}

/** Paroi extérieure (demi-cercle avant, angles 0→π) */
function pieOuter(d: Arc, rx: number, ry: number, h: number): string {
  const sa = d.startAngle > Math.PI ? Math.PI : d.startAngle
  const ea = d.endAngle   > Math.PI ? Math.PI : d.endAngle
  const sx = rx * Math.cos(sa), sy = ry * Math.sin(sa)
  const ex = rx * Math.cos(ea), ey = ry * Math.sin(ea)
  return [
    'M', sx, h+sy,
    'A', rx, ry, '0 0 1', ex, h+ey,
    'L', ex, ey,
    'A', rx, ry, '0 0 0', sx, sy,
    'Z'
  ].join(' ')
}

/** Paroi intérieure (demi-cercle arrière, angles π→2π) */
function pieInner(d: Arc, rx: number, ry: number, h: number, ir: number): string {
  const sa = d.startAngle < Math.PI ? Math.PI : d.startAngle
  const ea = d.endAngle   < Math.PI ? Math.PI : d.endAngle
  const sx = ir*rx * Math.cos(sa), sy = ir*ry * Math.sin(sa)
  const ex = ir*rx * Math.cos(ea), ey = ir*ry * Math.sin(ea)
  return [
    'M', sx, sy,
    'A', ir*rx, ir*ry, '0 0 1', ex, ey,
    'L', ex, h+ey,
    'A', ir*rx, ir*ry, '0 0 0', sx, h+sy,
    'Z'
  ].join(' ')
}

/** Pourcentage affiché si secteur assez grand */
function getPercent(d: Arc & { pct: number }): string {
  return d.endAngle - d.startAngle > 0.2 ? `${Math.round(d.pct)}%` : ''
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function Donut3D({
  data,
  hovTicker: hovProp,
  onHov: onHovProp,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker?: string | null
  onHov?: (t: string | null) => void
}) {
  const uid = useId().replace(/:/g, 'd')
  const [hovLocal, setHovLocal] = useState<string | null>(null)
  const [clicked,  setClicked]  = useState<string | null>(null)
  const hovTicker = hovProp !== undefined ? hovProp : hovLocal
  const onHov     = onHovProp ?? setHovLocal
  const active    = hovTicker ?? clicked

  // ── Dimensions (identiques au plugin : rx=130 ry=100 h=30 ir=0.4) ─────────
  const RX = 130, RY = 100   // ellipse extérieure
  const H  = 30              // hauteur extrusion
  const IR = 0.4             // inner radius (ratio)
  const EXP = 8              // explode distance px

  // Viewport : centré, assez grand pour voir les parois
  const VW = 340, VH = 260
  const cx = VW / 2, cy = VH / 2 - 10

  // ── Construction des segments (même logique que d3.layout.pie) ───────────
  const total = data.reduce((s, d) => s + d.pct, 0)
  const GAP   = 0.018  // petit espace entre secteurs
  let cum = -Math.PI / 2
  const segs = data.map((d, i) => {
    const pct   = total > 0 ? (d.pct / total) * 100 : 0
    const sweep = (pct / 100) * 2 * Math.PI - GAP
    const start = cum + GAP / 2
    const end   = start + Math.max(sweep, 0.001)
    cum += (pct / 100) * 2 * Math.PI
    return {
      ticker: d.ticker, pct, valeur: d.valeur,
      startAngle: start, endAngle: end,
      mid: (start + end) / 2,
      color: colorFor(d.ticker, i),
    }
  })

  return (
    <div style={{ width: '100%', maxWidth: 240, margin: '0 auto 0' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: 'block', overflow: 'visible' }}>

        <defs>
          {/* Reflet glossy sur la face supérieure */}
          <linearGradient id={`${uid}-gl`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
            <stop offset="60%"  stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Ombre douce sous le donut */}
          <radialGradient id={`${uid}-sh`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.45)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Ombre elliptique au sol */}
        <ellipse
          cx={cx} cy={cy + H + 18}
          rx={RX * 0.88} ry={16}
          fill={`url(#${uid}-sh)`}
          style={{ filter: 'blur(10px)', opacity: 0.35 }}
        />

        {/* ── Rendu dans l'ordre correct : inner → outer → top ── */}
        <g transform={`translate(${cx} ${cy})`}>

          {/* 1. Parois intérieures (fond du trou, demi-cercle arrière) */}
          {segs.map((s, i) => {
            const isA = active === s.ticker
            const ex  = isA ? Math.cos(s.mid) * EXP : 0
            const ey  = isA ? Math.sin(s.mid) * EXP : 0
            const d   = pieInner(s, RX + 0.5, RY + 0.5, H, IR)
            return (
              <path key={`in-${i}`}
                d={d}
                transform={`translate(${ex.toFixed(1)} ${ey.toFixed(1)})`}
                fill={darker(s.color, 0.55)}
                style={{ transition: 'transform 220ms ease' }}
              />
            )
          })}

          {/* 2. Parois extérieures (demi-cercle avant) */}
          {segs.map((s, i) => {
            const isA = active === s.ticker
            const ex  = isA ? Math.cos(s.mid) * EXP : 0
            const ey  = isA ? Math.sin(s.mid) * EXP : 0
            const d   = pieOuter(s, RX - 0.5, RY - 0.5, H)
            return (
              <path key={`out-${i}`}
                d={d}
                transform={`translate(${ex.toFixed(1)} ${ey.toFixed(1)})`}
                fill={darker(s.color, 0.68)}
                style={{ transition: 'transform 220ms ease' }}
              />
            )
          })}

          {/* 3. Faces supérieures + reflet + labels */}
          {segs.map((s, i) => {
            const isA = active === s.ticker
            const ex  = isA ? Math.cos(s.mid) * EXP : 0
            const ey  = isA ? Math.sin(s.mid) * EXP : 0
            const top = pieTop(s, RX, RY, IR)
            const pct = getPercent(s)
            const lx  = 0.62 * RX * Math.cos(s.mid)
            const ly  = 0.62 * RY * Math.sin(s.mid)
            return (
              <g key={`top-${i}`}
                transform={`translate(${ex.toFixed(1)} ${ey.toFixed(1)})`}
                style={{
                  cursor: 'pointer',
                  filter: isA
                    ? `drop-shadow(0 8px 18px rgba(0,0,0,.5)) drop-shadow(0 0 10px ${s.color}88)`
                    : 'drop-shadow(0 3px 6px rgba(0,0,0,.3))',
                  transition: 'transform 220ms cubic-bezier(.2,.8,.2,1), filter 220ms',
                }}
                onMouseEnter={() => onHov(s.ticker)}
                onMouseLeave={() => onHov(null)}
                onClick={() => setClicked(p => p === s.ticker ? null : s.ticker)}
                onTouchStart={e => { e.preventDefault(); onHov(s.ticker) }}
                onTouchEnd={() => onHov(null)}>
                {/* Face colorée */}
                <path d={top} fill={s.color} stroke={s.color} strokeWidth={0.5} />
                {/* Reflet glossy */}
                <path d={top} fill={`url(#${uid}-gl)`} style={{ pointerEvents: 'none' }} />
                {/* Contour subtil */}
                <path d={top} fill="none"
                  stroke="rgba(255,255,255,0.14)" strokeWidth={1.2}
                  style={{ pointerEvents: 'none' }} />
                {/* Label % */}
                {pct && (
                  <text
                    x={lx.toFixed(1)} y={ly.toFixed(1)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontFamily="Inter, system-ui, monospace"
                    fontSize={11} fontWeight={700} fill="white"
                    style={{
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,1))',
                    }}>
                    {pct}
                  </text>
                )}
              </g>
            )
          })}

          {/* Centre (trou) — affiché en dernier pour couvrir les artefacts */}
          <ellipse cx={0} cy={0} rx={IR * RX} ry={IR * RY}
            fill="#080808" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={0} y={-5} textAnchor="middle"
            fontFamily="Inter, system-ui" fontSize={7} fontWeight={700}
            letterSpacing="0.14em" fill="#D4AF37" opacity={0.85}>PORTF.</text>
          <text x={0} y={9} textAnchor="middle"
            fontFamily="Inter, monospace" fontSize={13} fontWeight={700}
            fill="#D4AF37" opacity={0.85}>
            {segs.length}
          </text>
        </g>
      </svg>

      {/* ── Légende ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
        gap: '6px',
        marginTop: '28px',
        padding: '0 4px',
      }}>
        {segs.map(s => {
          const isA = active === s.ticker
          return (
            <div key={s.ticker}
              onMouseEnter={() => onHov(s.ticker)}
              onMouseLeave={() => onHov(null)}
              onClick={() => setClicked(p => p === s.ticker ? null : s.ticker)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
                background: isA ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${isA ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                transition: 'all 0.18s ease',
              }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: s.color, flexShrink: 0,
                boxShadow: `0 0 5px ${s.color}99`,
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: isA ? '#fff' : '#C0C0C0',
                  transition: 'color 0.18s',
                }}>
                  {s.ticker}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: s.color, fontFamily: 'monospace',
                }}>
                  {s.pct.toFixed(1)}%
                </div>
                {s.valeur !== undefined && (
                  <div style={{ fontSize: 9, color: '#444' }}>
                    {s.valeur.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} DT
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
