'use client'

/*
  Donut3D — donut pseudo-3D en SVG pur (pieTop / pieOuter / pieInner).
  Aucune dépendance supplémentaire. Pas de WebGL — stable sur tous les
  navigateurs/appareils, build simple et fiable.

  Ce composant N'A PAS de légende intégrée — RepartitionBlock (dans
  page.tsx) affiche déjà la légende juste après <Donut3D />.

  Historique des fixes accumulés dans cette version :
  - pieTop utilise les rayons intérieurs exacts (rxi/ryi), plus de ratio
    imprécis → le trou central est parfaitement aligné avec les tranches.
  - Une seule ellipse pour le trou central (pas de second disque décalé
    en profondeur qui donnait l'illusion d'un trou décalé).
  - Anneau de fond plein (backingD), correctement centré via
    <g transform="translate(cx,cy)">, comble tout espace résiduel entre
    les tranches (notamment au point de couture dernière/première tranche).
  - Couleurs éclaircies (face du dessus) et parois moins assombries pour
    un rendu plus lumineux.
*/

import { useId, useState } from 'react'

const TICKER_COLORS: Record<string, string> = {
  TINV: '#22C55E',
  SFBT: '#FACC15',
  TGH:  '#3B82F6',
}
const FALLBACK_COLORS = ['#22C55E','#EAB308','#3B82F6','#A855F7','#EF4444','#06B6D4','#F97316','#EC4899']

function colorFor(ticker: string, i: number): string {
  return TICKER_COLORS[ticker] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
}
function darken(hex: string, f = 0.72): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${Math.round(((n>>16)&0xff)*f)},${Math.round(((n>>8)&0xff)*f)},${Math.round((n&0xff)*f)})`
}
function lighten(hex: string, amt = 0.1): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff
  const mix = (c: number) => Math.round(c + (255 - c) * amt)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

// rot = décalage visuel (-π/2 → la première tranche commence en haut).
const ep = (rx: number, ry: number, a: number, rot: number) =>
  ({ x: rx * Math.cos(a + rot), y: ry * Math.sin(a + rot) })

function pieTop(start: number, end: number, rx: number, ry: number, irx: number, iry: number, rot: number): string {
  if (end - start <= 0) return ''
  const large = end - start > Math.PI ? 1 : 0
  const o1 = ep(rx, ry, start, rot), o2 = ep(rx, ry, end, rot)
  const i2 = ep(irx, iry, end, rot), i1 = ep(irx, iry, start, rot)
  return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${rx} ${ry} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i2.x.toFixed(2)} ${i2.y.toFixed(2)} A${irx} ${iry} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)} Z`
}

// Paroi extérieure — visible sur le demi-cercle "devant" [0, π]
function pieOuter(start: number, end: number, rx: number, ry: number, h: number, rot: number): string {
  if (end - start <= 0.001) return ''
  const large = end - start > Math.PI ? 1 : 0
  const p1 = ep(rx, ry, start, rot), p2 = ep(rx, ry, end, rot)
  return `M${p1.x.toFixed(2)} ${(h + p1.y).toFixed(2)} A${rx} ${ry} 0 ${large} 1 ${p2.x.toFixed(2)} ${(h + p2.y).toFixed(2)} L${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A${rx} ${ry} 0 ${large} 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`
}

// Paroi intérieure (fond du trou) — dessinée sur toute la tranche (360°),
// pas seulement sur un demi-cercle : chaque secteur garde son épaisseur
// visible tout autour, comme les visuels de référence.
function pieInner(start: number, end: number, irx: number, iry: number, h: number, rot: number): string {
  if (end - start <= 0.001) return ''
  const large = end - start > Math.PI ? 1 : 0
  const p1 = ep(irx, iry, start, rot), p2 = ep(irx, iry, end, rot)
  return `M${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A${irx} ${iry} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L${p2.x.toFixed(2)} ${(h + p2.y).toFixed(2)} A${irx} ${iry} 0 ${large} 0 ${p1.x.toFixed(2)} ${(h + p1.y).toFixed(2)} Z`
}

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

  const VW = 280, cy = 80, cx = VW / 2
  const RX = 118, RY = 70
  const rxi = 50, ryi = 30
  const H = 20
  const EXPLODE = 7
  const GAP = 0.006  // quasi nul : la séparation visuelle vient du contour blanc, pas d'un vrai espace
  const ROT = -Math.PI / 2
  const svgH = cy + H + 40

  const total = data.reduce((s, d) => s + d.pct, 0)
  let cum = 0
  const segs = data.map((d, i) => {
    const pct = total > 0 ? (d.pct / total) * 100 : 0
    const sweep = (pct / 100) * 2 * Math.PI - GAP
    const start = cum + GAP / 2
    const end = start + Math.max(sweep, 0.001)
    cum += (pct / 100) * 2 * Math.PI
    const mid = (start + end) / 2
    return { ticker: d.ticker, pct, valeur: d.valeur, start, end, mid, color: colorFor(d.ticker, i) }
  })

  // Anneau de fond plein (0 → 2π, sans gap) — comble tout espace résiduel
  // entre les tranches, notamment au point de couture dernière/première tranche.

  return (
    <div style={{ width: '100%', maxWidth: 230, margin: '0 auto 28px' }}>
      <svg width="100%" viewBox={`0 0 ${VW} ${svgH}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}-gl`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Ombre au sol */}
        <ellipse cx={cx} cy={cy + H + 16} rx={RX * 0.82} ry={9}
          fill="rgba(0,0,0,0.55)" opacity={0.18}
          style={{ filter: 'blur(18px)' }} />

        {/* Anneau de fond — centré sur le donut, masque les micro-espaces
            entre tranches (IMPORTANT : bien wrappé dans le translate ici,
            c'est l'oubli de ce translate qui causait le bug précédent) */}

        {/* Fond de l'anneau — masque les artefacts entre tranches */}
        <ellipse cx={cx} cy={cy} rx={RX + 1} ry={RY + 1} fill="#141414" />
        <ellipse cx={cx} cy={cy} rx={rxi - 1} ry={ryi - 1} fill="#141414" />

        {/* Segments */}
        {segs.map((s, i) => {
          const isA = active === s.ticker
          const ex = isA ? Math.cos(s.mid + ROT) * EXPLODE : 0
          const ey = isA ? Math.sin(s.mid + ROT) * EXPLODE : 0
          // Léger chevauchement (pas juste un espace réduit) : élimine tout
          // filet d'anti-aliasing entre tranches adjacentes, quel que soit
          // l'endroit où il se produirait sur le cercle.
          const OVERLAP = 0.004
          const WALL_OVERLAP = 0.003
          const rs = s.start - OVERLAP, re = s.end + OVERLAP
          const ws = s.start - WALL_OVERLAP, we = s.end + WALL_OVERLAP
          const outerD = pieOuter(ws, we, RX, RY, H, ROT)
          const innerD = pieInner(ws, we, rxi, ryi, H, ROT)
          const topD = pieTop(rs, re, RX, RY, rxi, ryi, ROT)
          const lp = ep(RX * 0.63, RY * 0.63, s.mid, ROT)
          return (
            <g key={s.ticker}
              transform={`translate(${(cx + ex).toFixed(1)} ${(cy + ey).toFixed(1)}) scale(${isA ? 1.04 : 1})`}
              style={{
                cursor: 'pointer',
                filter: isA
                  ? `drop-shadow(0 10px 22px rgba(0,0,0,.5)) drop-shadow(0 0 12px ${s.color}88)`
                  : 'drop-shadow(0 3px 8px rgba(0,0,0,.3))',
                transition: 'transform 220ms ease, filter 220ms ease',
              }}
              onMouseEnter={() => onHov(s.ticker)}
              onMouseLeave={() => onHov(null)}
              onClick={() => setClicked(p => p === s.ticker ? null : s.ticker)}
              onTouchStart={e => { e.preventDefault(); onHov(s.ticker) }}
              onTouchEnd={() => onHov(null)}>
              {outerD && <path d={outerD} fill={darken(s.color, 0.72)} />}
              {innerD && <path d={innerD} fill={darken(s.color, 0.58)} />}
              <path d={topD} fill={lighten(s.color, 0.1)} stroke="rgba(0,0,0,0.35)" strokeWidth={2} />
              <path d={topD} fill={`url(#${uid}-gl)`} />
              {s.end - s.start > 0.20 && (
                <text x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="Inter,system-ui,monospace"
                  fontSize={10} fontWeight={700} fill="white"
                  style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,1))' }}>
                  {s.pct.toFixed(0)}%
                </text>
              )}
            </g>
          )
        })}

        {/* Trou central — une seule ellipse, alignée exactement sur la
            découpe des faces supérieures */}
        <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi}
          fill="#050505" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <text x={cx} y={cy - 4} textAnchor="middle"
          fontFamily="Inter,system-ui" fontSize={7} fontWeight={700}
          letterSpacing="0.14em" fill="#D4AF37" opacity={0.85}>PORTF.</text>
        <text x={cx} y={cy + 9} textAnchor="middle"
          fontFamily="Inter,monospace" fontSize={13} fontWeight={700}
          fill="#D4AF37" opacity={0.85}>{segs.length}</text>
      </svg>
    </div>
  )
}
