'use client'

/*
  Donut3D — donut pseudo-3D en SVG, porté du plugin historique "Donut3D.js"
  (pieTop / pieOuter / pieInner). Aucune dépendance supplémentaire (pas de
  Three.js, pas de d3 — juste du SVG + trigonométrie), donc build beaucoup
  plus simple/fiable que la version WebGL précédente.

  INTÉGRATION : strictement identique à l'ancienne version R3F, aucun
  changement requis dans page.tsx :

    import dynamic from 'next/dynamic'
    const Donut3D = dynamic(() => import('./Donut3D'), { ssr: false })
    <Donut3D data={donutData} hovTicker={hov} onHov={setHov} />

  (Le dynamic/ssr:false n'est plus strictement nécessaire ici — le SVG est
  serveur-safe — mais le garder ne casse rien et évite un changement inutile.)

  PORTAGE — différence corrigée par rapport au fichier fourni :
  Dans le plugin original, pieOuter ET pieInner clippent tous les deux sur
  le même demi-cercle [0, π]. Géométriquement, seule la paroi EXTÉRIEURE doit
  être visible sur ce demi-cercle (le "devant" du donut) ; la paroi INTÉRIEURE
  (le fond du trou) doit être visible sur le demi-cercle OPPOSÉ [π, 2π] (l'
  "arrière" du trou, qu'on aperçoit en regardant depuis au-dessus). C'est ce
  que fait ce portage — résultat plus fidèle à un vrai objet 3D.
*/

import { useId, useState } from 'react'

// ─── Couleurs par ticker (identique aux versions précédentes) ────────────
const TICKER_COLORS: Record<string, string> = {
  TINV: '#22C55E',
  SFBT: '#FACC15',
  TGH:  '#3B82F6',
}
const FALLBACK_COLORS = ['#22C55E', '#EAB308', '#3B82F6', '#A855F7', '#EF4444', '#06B6D4', '#F97316', '#EC4899']

function colorFor(ticker: string, i: number): string {
  return TICKER_COLORS[ticker] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
}

function darken(hex: string, factor = 0.72): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 0xff) * factor)
  const g = Math.round(((n >> 8) & 0xff) * factor)
  const b = Math.round((n & 0xff) * factor)
  return `rgb(${r},${g},${b})`
}

// ─── Géométrie : port direct de pieTop / pieOuter / pieInner ──────────────
// rot = décalage visuel (-π/2 → la première tranche commence en haut).
// Les tests de clip (Math.min/max(..., Math.PI)) restent sur les angles
// NON décalés : c'est ce qui détermine correctement quelle moitié est
// "devant" vs "derrière", indépendamment de la rotation visuelle.
const ep = (rx: number, ry: number, a: number, rot: number) =>
  ({ x: rx * Math.cos(a + rot), y: ry * Math.sin(a + rot) })

function pieTop(start: number, end: number, rx: number, ry: number, innerRx: number, innerRy: number, rot: number): string {
  if (end - start <= 0) return ''
  const large = end - start > Math.PI ? 1 : 0
  const o1 = ep(rx, ry, start, rot), o2 = ep(rx, ry, end, rot)
  const i2 = ep(innerRx, innerRy, end, rot), i1 = ep(innerRx, innerRy, start, rot)
  return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${rx} ${ry} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i2.x.toFixed(2)} ${i2.y.toFixed(2)} A${innerRx} ${innerRy} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)} Z`
}

// Paroi extérieure — visible seulement sur le demi-cercle "devant" [0, π]
function pieOuter(start: number, end: number, rx: number, ry: number, h: number, rot: number): string {
  const s = Math.min(Math.max(start, 0), Math.PI)
  const e = Math.min(Math.max(end, 0), Math.PI)
  if (e - s <= 0.001) return ''
  const p1 = ep(rx, ry, s, rot), p2 = ep(rx, ry, e, rot)
  return `M${p1.x.toFixed(2)} ${(h + p1.y).toFixed(2)} A${rx} ${ry} 0 0 1 ${p2.x.toFixed(2)} ${(h + p2.y).toFixed(2)} L${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A${rx} ${ry} 0 0 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`
}

// Paroi intérieure (fond du trou) — visible sur le demi-cercle opposé [π, 2π]
function pieInner(start: number, end: number, rx: number, ry: number, h: number, ir: number, rot: number): string {
  const s = Math.max(Math.min(start, 2 * Math.PI), Math.PI)
  const e = Math.max(Math.min(end, 2 * Math.PI), Math.PI)
  if (e - s <= 0.001) return ''
  const p1 = ep(ir * rx, ir * ry, s, rot), p2 = ep(ir * rx, ir * ry, e, rot)
  return `M${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A${ir * rx} ${ir * ry} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L${p2.x.toFixed(2)} ${(h + p2.y).toFixed(2)} A${ir * rx} ${ir * ry} 0 0 0 ${p1.x.toFixed(2)} ${(h + p1.y).toFixed(2)} Z`
}

// ─── Composant ─────────────────────────────────────────────────────────
export default function Donut3D({
  data, hovTicker: hovTickerProp, onHov: onHovProp,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker?: string | null
  onHov?: (t: string | null) => void
}) {
  const uid = useId().replace(/:/g, 'd')
  const [hovLocal, setHovLocal] = useState<string | null>(null)
  const [clicked, setClicked] = useState<string | null>(null)
  const hovTicker = hovTickerProp !== undefined ? hovTickerProp : hovLocal
  const onHov = onHovProp ?? setHovLocal
  const active = hovTicker ?? clicked

  // ── Dimensions (mêmes proportions éprouvées que la version SVG précédente) ─
  const VW = 380, cy = 92
  const RX = 132, RY = 79
  const rxi = 56, ryi = 34
  const H = 22                      // épaisseur d'extrusion (20–24px)
  const EXPLODE = 8
  const GAP = 0.03
  const ROT = -Math.PI / 2          // 1ère tranche commence en haut
  const cx = VW / 2
  const svgH = cy + H + 58

  const total = data.reduce((s, d) => s + d.pct, 0)
  let cum = 0
  const segs = data.map((d, i) => {
    const pct = total > 0 ? (d.pct / total) * 100 : 0
    const sweep = (pct / 100) * 2 * Math.PI - GAP
    const start = cum + GAP / 2
    const end = start + Math.max(sweep, 0.001)
    cum += (pct / 100) * 2 * Math.PI
    const mid = (start + end) / 2
    return {
      ticker: d.ticker, pct, valeur: d.valeur,
      start, end, mid,
      color: colorFor(d.ticker, i),
    }
  })

  const handleEnter = (t: string) => onHov(t)
  const handleLeave = () => onHov(null)
  const handleClick = (t: string) => setClicked(prev => prev === t ? null : t)

  return (
    <div style={{ width: '100%', maxWidth: 230, margin: '0 auto 24px' }}>
      <svg width="100%" viewBox={`0 0 ${VW} ${svgH}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}-gloss`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Ombre douce au sol */}
        <ellipse cx={cx} cy={cy + H + 20} rx={RX * 0.9} ry={13}
          fill="rgba(0,0,0,0.5)" opacity={0.2} style={{ filter: 'blur(20px)' }} />

        {segs.map((s, i) => {
          const isActive = active === s.ticker
          const ex = isActive ? Math.cos(s.mid + ROT) * EXPLODE : 0
          const ey = isActive ? Math.sin(s.mid + ROT) * EXPLODE : 0

          const outerD = pieOuter(s.start, s.end, RX, RY, H, ROT)
          const innerD = pieInner(s.start, s.end, rxi, ryi, H, 1, ROT)
          const topD = pieTop(s.start, s.end, RX, RY, rxi, ryi, ROT)

          const labR = 0.62
          const lp = ep(RX * labR, RY * labR, s.mid, ROT)

          return (
            <g key={s.ticker}
              transform={`translate(${(cx + ex).toFixed(1)} ${(cy + ey).toFixed(1)}) scale(${isActive ? 1.04 : 1})`}
              style={{
                cursor: 'pointer',
                filter: isActive
                  ? 'drop-shadow(0 12px 24px rgba(0,0,0,.5))'
                  : 'drop-shadow(0 4px 10px rgba(0,0,0,.35))',
                transition: 'transform 220ms ease, filter 220ms ease',
              }}
              onMouseEnter={() => handleEnter(s.ticker)}
              onMouseLeave={handleLeave}
              onClick={() => handleClick(s.ticker)}
              onTouchStart={e => { e.preventDefault(); handleEnter(s.ticker) }}
              onTouchEnd={handleLeave}
            >
              {outerD && <path d={outerD} fill={darken(s.color, 0.65)} />}
              {innerD && <path d={innerD} fill={darken(s.color, 0.5)} />}
              <path d={topD} fill={s.color} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
              <path d={topD} fill={`url(#${uid}-gloss)`} />
              {s.end - s.start > 0.22 && (
                <text
                  x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="Inter, system-ui, monospace"
                  fontSize={11} fontWeight={700} fill="white"
                  style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.9))' }}
                >
                  {s.pct.toFixed(0)}%
                </text>
              )}
            </g>
          )
        })}

        {/* Centre — un seul disque plat, aligné exactement sur le cutout
            des faces supérieures (pas de second disque décalé en profondeur,
            qui donnait l'illusion d'un trou décalé vers le bas). */}
        <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} fill="#050505" stroke="rgba(255,255,255,0.06)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="Inter, system-ui"
          fontSize={11} fontWeight={700} letterSpacing="0.1em" fill="#D4AF37" opacity={0.9}>PORTF.</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="Inter, monospace"
          fontSize={24} fontWeight={700} fill="#D4AF37" opacity={0.9}>{segs.length}</text>
      </svg>

      {/* Légende */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '6px', marginTop: 26, padding: '0 4px',
      }}>
        {segs.map(s => {
          const isActive = active === s.ticker
          return (
            <div key={s.ticker}
              onMouseEnter={() => handleEnter(s.ticker)}
              onMouseLeave={handleLeave}
              onClick={() => handleClick(s.ticker)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                transition: 'all 0.18s ease',
              }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: s.color, flexShrink: 0, boxShadow: `0 0 5px ${s.color}88`,
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#fff' : '#C0C0C0' }}>
                  {s.ticker}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: s.color, fontFamily: 'monospace' }}>
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
