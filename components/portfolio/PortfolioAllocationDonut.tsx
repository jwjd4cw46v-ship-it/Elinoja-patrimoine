'use client'

import { useState, useId } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DonutSlice {
  ticker:  string
  label?:  string
  pct:     number
  valeur?: number
  color?:  string
}

interface Props {
  data:    DonutSlice[]
  title?:  string
}

// ─── Palette & dégradés génériques (fallback) ────────────────────────────────
const GRADS: [string, string, string][] = [
  ['#32d26b', '#22c55e', '#15803d'],
  ['#facc15', '#eab308', '#a16207'],
  ['#60a5fa', '#3b82f6', '#1d4ed8'],
  ['#c084fc', '#a855f7', '#7e22ce'],
  ['#f87171', '#ef4444', '#991b1b'],
  ['#22d3ee', '#06b6d4', '#0e7490'],
  ['#fb923c', '#f97316', '#c2410c'],
  ['#f472b6', '#ec4899', '#9d174d'],
]

// Couleurs dédiées à certains tickers (règle 9) — les autres tickers
// retombent sur la palette générique ci-dessus, indexée par position.
const TICKER_GRADS: Record<string, [string, string, string]> = {
  TINV: ['#22C55E', '#1FAE57', '#16A34A'],
  SFBT: ['#FACC15', '#DFAF10', '#CA8A04'],
  TGH:  ['#3B82F6', '#2F70DA', '#2563EB'],
}

function gradFor(ticker: string, i: number): [string, string, string] {
  return TICKER_GRADS[ticker] ?? GRADS[i % GRADS.length]
}

// ─── Helpers géométrie ────────────────────────────────────────────────────────
const ep = (cx: number, cy: number, rx: number, ry: number, a: number) =>
  ({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) })

function topFace(
  cx: number, cy: number,
  RX: number, RY: number,
  rx: number, ry: number,
  s: number, e: number
): string {
  const lg = e - s > Math.PI ? 1 : 0
  const o1 = ep(cx,cy,RX,RY,s), o2 = ep(cx,cy,RX,RY,e)
  const i2 = ep(cx,cy,rx,ry,e), i1 = ep(cx,cy,rx,ry,s)
  return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${RX} ${RY} 0 ${lg} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i2.x.toFixed(2)} ${i2.y.toFixed(2)} A${rx} ${ry} 0 ${lg} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}Z`
}

function outerWall(
  cx: number, cy: number,
  RX: number, RY: number,
  s: number, e: number, depth: number
): string {
  const ws = Math.max(s, 0), we = Math.min(e, Math.PI)
  if (ws >= we - 0.001) return ''
  const lg = we - ws > Math.PI ? 1 : 0
  const t1 = ep(cx,cy,RX,RY,ws),        t2 = ep(cx,cy,RX,RY,we)
  const b2 = ep(cx,cy+depth,RX,RY,we),  b1 = ep(cx,cy+depth,RX,RY,ws)
  return `M${t1.x.toFixed(2)} ${t1.y.toFixed(2)} A${RX} ${RY} 0 ${lg} 1 ${t2.x.toFixed(2)} ${t2.y.toFixed(2)} L${b2.x.toFixed(2)} ${b2.y.toFixed(2)} A${RX} ${RY} 0 ${lg} 0 ${b1.x.toFixed(2)} ${b1.y.toFixed(2)}Z`
}

function innerWall(
  cx: number, cy: number,
  rx: number, ry: number,
  s: number, e: number, depth: number
): string {
  const ws = Math.max(s, 0), we = Math.min(e, Math.PI)
  if (ws >= we - 0.001) return ''
  const lg = we - ws > Math.PI ? 1 : 0
  const t1 = ep(cx,cy,rx,ry,ws),       t2 = ep(cx,cy,rx,ry,we)
  const b2 = ep(cx,cy+depth,rx,ry,we), b1 = ep(cx,cy+depth,rx,ry,ws)
  return `M${t1.x.toFixed(2)} ${t1.y.toFixed(2)} A${rx} ${ry} 0 ${lg} 1 ${t2.x.toFixed(2)} ${t2.y.toFixed(2)} L${b2.x.toFixed(2)} ${b2.y.toFixed(2)} A${rx} ${ry} 0 ${lg} 0 ${b1.x.toFixed(2)} ${b1.y.toFixed(2)}Z`
}

function darken(hex: string, f = 0.35): string {
  const c = hex.startsWith('#') ? parseInt(hex.slice(1), 16) : 0
  return `rgb(${Math.round(((c>>16)&0xff)*f)},${Math.round(((c>>8)&0xff)*f)},${Math.round((c&0xff)*f)})`
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function PortfolioAllocationDonut({ data, title }: Props) {
  const [hov, setHov] = useState<string | null>(null)
  const [clicked, setClicked] = useState<string | null>(null)
  const uid = useId().replace(/:/g, 'd')
  const active = hov ?? clicked

  // Dimensions — réduites de ~17.5% par rapport à la version précédente,
  // trou central légèrement agrandi, épaisseur maintenue entre 20 et 24px.
  const VW    = 380, cy = 92
  const RX    = 132, RY    = 79
  const rxi   = 56,  ryi   = 34
  const DEPTH = 22
  const EXP   = 6
  const GAP   = 0.022
  const cx    = VW / 2
  const svgH  = cy + DEPTH + 58

  // Segments
  const total = data.reduce((s, d) => s + d.pct, 0)
  let cum = -Math.PI / 2
  const segs = data.map((d, i) => {
    const pct   = total > 0 ? (d.pct / total) * 100 : 0
    const sweep = (pct / 100) * 2 * Math.PI - GAP * 2
    const start = cum + GAP
    const end   = start + Math.max(sweep, 0.001)
    cum += (pct / 100) * 2 * Math.PI
    const mid = (start + end) / 2
    const g   = gradFor(d.ticker, i)
    return {
      ...d, pct, start, end, mid, g,
      ex: Math.cos(mid) * EXP,
      ey: Math.sin(mid) * EXP,
    }
  })

  return (
    <div style={{
      background:   '#090909',
      border:       '1px solid rgba(212,175,55,0.25)',
      borderRadius: '24px',
      padding:      '20px 16px 16px',
      width:        '100%',
      overflow:     'hidden', // garantit qu'aucun élément ne déborde de la carte
    }}>
      {title && (
        <div style={{
          fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.14em', color: '#5C5C5C',
          textTransform: 'uppercase', marginBottom: '14px', paddingLeft: '4px',
        }}>
          {title}
        </div>
      )}

      {/* Donut — centré, largeur max 220px pour rester compact sur mobile */}
      <div style={{ width: '100%', maxWidth: 220, margin: '0 auto', marginBottom: 24 }}>
        <svg width="100%" viewBox={`0 0 ${VW} ${svgH}`}
          style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            {segs.map((s, i) => (
              <linearGradient key={`top-${i}`} id={`${uid}-lg-${i}`}
                x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor={s.g[0]} />
                <stop offset="45%"  stopColor={s.g[1]} />
                <stop offset="100%" stopColor={s.g[2]} />
              </linearGradient>
            ))}
            {/* Dégradés verticaux pour les parois — accentuent la profondeur 3D */}
            {segs.map((s, i) => (
              <linearGradient key={`ow-${i}`} id={`${uid}-owg-${i}`}
                x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor={s.g[1]} stopOpacity={0.75} />
                <stop offset="100%" stopColor={darken(s.g[2], 0.35)} stopOpacity={0.85} />
              </linearGradient>
            ))}
            {segs.map((s, i) => (
              <linearGradient key={`iw-${i}`} id={`${uid}-iwg-${i}`}
                x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor={darken(s.g[1], 0.55)} stopOpacity={0.75} />
                <stop offset="100%" stopColor={darken(s.g[2], 0.22)} stopOpacity={0.9} />
              </linearGradient>
            ))}
            <linearGradient id={`${uid}-gloss`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
              <stop offset="55%"  stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            {/* Anneau interne du trou central — simule un inset subtil */}
            <radialGradient id={`${uid}-hole-inset`} cx="50%" cy="32%" r="78%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.05)" />
              <stop offset="55%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
            </radialGradient>
          </defs>

          {/* Ombre elliptique douce sous le donut : blur 25px, opacity 0.20, rgba(0,0,0,0.5) */}
          <ellipse cx={cx} cy={cy + DEPTH + 20} rx={RX * 0.92} ry={14}
            fill="rgba(0,0,0,0.5)" opacity={0.20}
            style={{ filter: 'blur(25px)' }} />

          {/* Parois extérieures (dégradé vertical) */}
          {segs.map((s, i) => {
            const isH = active === s.ticker
            const ex = isH ? s.ex * 1.15 : s.ex
            const ey = isH ? s.ey * 1.15 : s.ey
            const d = outerWall(cx+ex, cy+ey, RX, RY, s.start, s.end, DEPTH)
            return d ? (
              <path key={`ow-${i}`} d={d}
                fill={`url(#${uid}-owg-${i})`}
                style={{ transition: 'all 250ms ease' }} />
            ) : null
          })}

          {/* Parois intérieures (dégradé vertical) */}
          {segs.map((s, i) => {
            const isH = active === s.ticker
            const ex = isH ? s.ex * 1.15 : s.ex
            const ey = isH ? s.ey * 1.15 : s.ey
            const d = innerWall(cx+ex, cy+ey, rxi, ryi, s.start, s.end, DEPTH)
            return d ? (
              <path key={`iw-${i}`} d={d}
                fill={`url(#${uid}-iwg-${i})`}
                style={{ transition: 'all 250ms ease' }} />
            ) : null
          })}

          {/* Faces supérieures + labels + tooltip */}
          {segs.map((s, i) => {
            const isH = active === s.ticker
            const ex = isH ? s.ex * 1.15 : s.ex
            const ey = isH ? s.ey * 1.15 : s.ey
            const topD = topFace(cx+ex, cy+ey, RX, RY, rxi, ryi, s.start, s.end)

            // Label : (innerRadius + outerRadius) / 2, translateY -6px
            const labR  = (RX  + rxi)  / 2 * 0.62
            const labRY = (RY  + ryi)  / 2 * 0.62
            const lx = cx + ex + labR  * Math.cos(s.mid)
            const ly = cy + ey + labRY * Math.sin(s.mid) - 6

            // Tooltip : jamais hors de la carte.
            // Part à droite → tooltip à gauche · à gauche → tooltip à droite · proche du haut → dessous.
            const cosM = Math.cos(s.mid), sinM = Math.sin(s.mid)
            const nearTop   = sinM < -0.55
            const rightSide = cosM > 0.12
            const leftSide  = cosM < -0.12
            const tip = ep(cx+ex, cy+ey, RX + 10, RY + 10, s.mid)
            let ttTransform = 'translate(-50%, -100%)'
            if (nearTop)        ttTransform = 'translate(-50%, 10px)'
            else if (rightSide) ttTransform = 'translate(calc(-100% - 8px), -50%)'
            else if (leftSide)  ttTransform = 'translate(8px, -50%)'

            return (
              <g key={`seg-${i}`}
                style={{
                  cursor:          'pointer',
                  filter:          isH
                    ? 'drop-shadow(0 12px 30px rgba(0,0,0,.45))'
                    : 'drop-shadow(0 4px 10px rgba(0,0,0,.35))',
                  transform:       isH
                    ? `translate(${(s.ex * 0.25).toFixed(1)}px,-3px) scale(1.04)`
                    : 'none',
                  transformOrigin: `${(cx+s.ex).toFixed(1)}px ${(cy+s.ey).toFixed(1)}px`,
                  transition:      'transform 250ms ease, filter 250ms ease',
                }}
                onMouseEnter={() => setHov(s.ticker)}
                onMouseLeave={() => setHov(null)}
                onClick={() => setClicked(prev => prev === s.ticker ? null : s.ticker)}
                onTouchStart={e => { e.preventDefault(); setHov(s.ticker) }}
                onTouchEnd={() => setHov(null)}>
                <path d={topD} fill={`url(#${uid}-lg-${i})`} />
                <path d={topD} fill={`url(#${uid}-gloss)`} />
                <path d={topD} fill="none"
                  stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
                {/* Pourcentage — uniquement pour les parts ≥ 10% */}
                {s.pct >= 10 && (
                  <text
                    x={lx.toFixed(1)} y={ly.toFixed(1)}
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
                {/* Tooltip — largeur max 180px, z-index au-dessus du donut */}
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

          {/* Trou central */}
          <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi}
            fill="#050505" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          {/* Anneau interne subtil (simule inset 0 0 12px rgba(255,255,255,0.05)) */}
          <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} fill={`url(#${uid}-hole-inset)`} />
          <ellipse cx={cx} cy={cy+DEPTH} rx={rxi-1} ry={ryi-0.4}
            fill="#040404" />
          <text x={cx} y={cy-6} textAnchor="middle"
            fontFamily="Inter, system-ui" fontSize={11} fontWeight={700}
            letterSpacing="0.10em" fill="#D4AF37" opacity={0.9}>PORTF.</text>
          <text x={cx} y={cy+16} textAnchor="middle"
            fontFamily="Inter, monospace" fontSize={24} fontWeight={700}
            fill="#D4AF37" opacity={0.9}>{segs.length}</text>
        </svg>
      </div>

      {/* Légende */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '6px', padding: '0 4px',
      }}>
        {segs.map((s, i) => {
          const isH = active === s.ticker
          return (
            <div key={s.ticker}
              onMouseEnter={() => setHov(s.ticker)}
              onMouseLeave={() => setHov(null)}
              onClick={() => setClicked(prev => prev === s.ticker ? null : s.ticker)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 8px', borderRadius: '8px', cursor: 'pointer',
                background:  isH ? 'rgba(255,255,255,0.05)' : 'transparent',
                border:      `1px solid ${isH ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                transition:  'all 0.18s ease',
              }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: s.g[1], flexShrink: 0,
                boxShadow: `0 0 5px ${s.g[1]}88`,
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700,
                  color: isH ? '#fff' : '#C0C0C0',
                  transition: 'color 0.18s',
                }}>
                  {s.ticker}
                </div>
                <div style={{
                  fontSize: '10px', fontWeight: 600,
                  color: s.g[1], fontFamily: 'monospace',
                }}>
                  {s.pct.toFixed(1)}%
                </div>
                {s.valeur !== undefined && (
                  <div style={{ fontSize: '9px', color: '#444' }}>
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
