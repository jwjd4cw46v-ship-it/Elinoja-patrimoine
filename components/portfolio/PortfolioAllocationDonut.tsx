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

// ─── Palette & dégradés ──────────────────────────────────────────────────────
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
  const uid = useId().replace(/:/g, 'd')

  // Dimensions
  const VW    = 380, cy = 112
  const RX    = 160, RY    = 96
  const rxi   = 65,  ryi   = 39
  const DEPTH = 18
  const EXP   = 6
  const GAP   = 0.022
  const cx    = VW / 2
  const svgH  = cy + DEPTH + 64

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
    const g   = GRADS[i % GRADS.length]
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

      <svg width="100%" viewBox={`0 0 ${VW} ${svgH}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {segs.map((s, i) => (
            <linearGradient key={i} id={`${uid}-lg-${i}`}
              x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor={s.g[0]} />
              <stop offset="45%"  stopColor={s.g[1]} />
              <stop offset="100%" stopColor={s.g[2]} />
            </linearGradient>
          ))}
          <linearGradient id={`${uid}-gloss`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
            <stop offset="55%"  stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Ombre au sol — discrète */}
        <ellipse cx={cx} cy={cy + DEPTH + 22} rx={140} ry={14}
          fill="rgba(0,200,83,0.55)" opacity={0.08}
          style={{ filter: 'blur(18px)' }} />

        {/* Parois extérieures */}
        {segs.map((s, i) => {
          const isH = hov === s.ticker
          const ex = isH ? s.ex * 1.3 : s.ex
          const ey = isH ? s.ey * 1.3 : s.ey
          const d = outerWall(cx+ex, cy+ey, RX, RY, s.start, s.end, DEPTH)
          return d ? (
            <path key={`ow-${i}`} d={d}
              fill={s.g[2]} opacity={0.55}
              style={{ transition: 'all 0.22s ease' }} />
          ) : null
        })}

        {/* Parois intérieures */}
        {segs.map((s, i) => {
          const isH = hov === s.ticker
          const ex = isH ? s.ex * 1.3 : s.ex
          const ey = isH ? s.ey * 1.3 : s.ey
          const d = innerWall(cx+ex, cy+ey, rxi, ryi, s.start, s.end, DEPTH)
          return d ? (
            <path key={`iw-${i}`} d={d}
              fill={darken(s.g[1], 0.28)} opacity={0.55}
              style={{ transition: 'all 0.22s ease' }} />
          ) : null
        })}

        {/* Faces supérieures + labels */}
        {segs.map((s, i) => {
          const isH = hov === s.ticker
          const ex = isH ? s.ex * 1.3 : s.ex
          const ey = isH ? s.ey * 1.3 : s.ey
          const topD = topFace(cx+ex, cy+ey, RX, RY, rxi, ryi, s.start, s.end)

          // Label : (innerRadius + outerRadius) / 2, translateY -8px
          const labR  = (RX  + rxi)  / 2 * 0.62
          const labRY = (RY  + ryi)  / 2 * 0.62
          const lx = cx + ex + labR  * Math.cos(s.mid)
          const ly = cy + ey + labRY * Math.sin(s.mid) - 8

          return (
            <g key={`seg-${i}`}
              style={{
                cursor:          'pointer',
                filter:          isH
                  ? `drop-shadow(0 8px 16px rgba(0,0,0,.45)) drop-shadow(0 0 16px ${s.g[1]})`
                  : 'drop-shadow(0 4px 10px rgba(0,0,0,.35))',
                transform:       isH
                  ? `translate(${(s.ex * 0.3).toFixed(1)}px,-4px)`
                  : 'none',
                transformOrigin: `${(cx+s.ex).toFixed(1)}px ${(cy+s.ey).toFixed(1)}px`,
                transition:      'transform 220ms cubic-bezier(.2,.8,.2,1), filter 220ms',
              }}
              onMouseEnter={() => setHov(s.ticker)}
              onMouseLeave={() => setHov(null)}
              onTouchStart={e => { e.preventDefault(); setHov(s.ticker) }}
              onTouchEnd={() => setHov(null)}>
              <path d={topD} fill={`url(#${uid}-lg-${i})`} />
              <path d={topD} fill={`url(#${uid}-gloss)`} />
              <path d={topD} fill="none"
                stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
              {s.pct >= 5 && (
                <text
                  x={lx.toFixed(1)} y={ly.toFixed(1)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="Inter, system-ui, monospace"
                  fontSize={11} fontWeight={700} fill="white"
                  style={{
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))',
                  }}>
                  {s.pct.toFixed(0)}%
                </text>
              )}
            </g>
          )
        })}

        {/* Trou central */}
        <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi}
          fill="#090909" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <ellipse cx={cx} cy={cy+DEPTH} rx={rxi-1} ry={ryi-0.4}
          fill="#060606" />
        <text x={cx} y={cy-3} textAnchor="middle"
          fontFamily="Inter, system-ui" fontSize={7} fontWeight={700}
          letterSpacing="0.12em" fill="rgba(255,255,255,0.18)">PORTEF.</text>
        <text x={cx} y={cy+8} textAnchor="middle"
          fontFamily="Inter, monospace" fontSize={13} fontWeight={800}
          fill="rgba(255,255,255,0.45)">{segs.length}</text>
      </svg>

      {/* Légende */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '6px', marginTop: '10px', padding: '0 4px',
      }}>
        {segs.map((s, i) => {
          const isH = hov === s.ticker
          return (
            <div key={s.ticker}
              onMouseEnter={() => setHov(s.ticker)}
              onMouseLeave={() => setHov(null)}
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
