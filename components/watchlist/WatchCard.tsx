'use client'

/**
 * WatchCard.tsx
 * Carte individuelle de la watchlist ELINOJA.
 *
 * Props :
 *   item.id        — ticker (ex: "BIAT")
 *   item.name      — nom complet
 *   item.current   — cours actuel (last)
 *   item.low       — seuil alerte bas (prix_bas en DB)
 *   item.high      — seuil alerte haut (prix_haut en DB)
 *   item.change    — variation % du jour
 *
 * Fix : conditions <= / >= pour déclencher l'alerte quand le cours
 *       touche exactement le seuil (et non plus seulement quand il
 *       le franchit strictement).
 */

import { TrendingUp, TrendingDown } from 'lucide-react'

export interface WatchItem {
  id:      string
  name:    string
  current: number
  low:     number
  high:    number
  change:  number
}

export function WatchCard({ item }: { item: WatchItem }) {
  // ── FIX : <= et >= au lieu de < et > ──────────────────────────────────────
  const isBelowLow  = item.low  > 0 && item.current <= item.low
  const isAboveHigh = item.high > 0 && item.current >= item.high
  // ──────────────────────────────────────────────────────────────────────────

  const pct = (item.high > item.low)
    ? ((item.current - item.low) / (item.high - item.low)) * 100
    : 50
  const pctClamped = Math.max(0, Math.min(100, pct))

  const fmt = (v: number) =>
    v > 0
      ? v.toLocaleString('fr-TN', { minimumFractionDigits: v > 100 ? 2 : 3, maximumFractionDigits: v > 100 ? 2 : 3 })
      : '—'

  const currentColor = isBelowLow ? '#FF3B3B' : isAboveHigh ? '#00C853' : '#F5F5F5'
  const changeColor  = item.change > 0 ? '#00C853' : item.change < 0 ? '#FF1744' : '#707070'

  return (
    <>
      <style>{`
        @keyframes pulse-low {
          0%, 100% { color: #FF3B3B; text-shadow: 0 0 8px rgba(255,59,59,0.6), 0 0 20px rgba(255,59,59,0.3); opacity: 1; }
          50%       { color: #FF6B6B; text-shadow: 0 0 14px rgba(255,59,59,0.9), 0 0 30px rgba(255,59,59,0.5); opacity: 0.72; }
        }
        @keyframes pulse-high {
          0%, 100% { color: #00E676; text-shadow: 0 0 8px rgba(0,230,118,0.6), 0 0 20px rgba(0,230,118,0.3); opacity: 1; }
          50%       { color: #69F0AE; text-shadow: 0 0 14px rgba(0,230,118,0.9), 0 0 30px rgba(0,230,118,0.5); opacity: 0.72; }
        }
        @keyframes glow-low {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,59,0); }
          50%       { box-shadow: 0 0 0 4px rgba(255,59,59,0.12); }
        }
        @keyframes glow-high {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); }
          50%       { box-shadow: 0 0 0 4px rgba(0,200,83,0.12); }
        }
        .alert-low  { animation: pulse-low  1.8s ease-in-out infinite; }
        .alert-high { animation: pulse-high 1.8s ease-in-out infinite; }
        .card-glow-low  { animation: glow-low  2s ease-in-out infinite; }
        .card-glow-high { animation: glow-high 2s ease-in-out infinite; }
      `}</style>

      <div
        className={isBelowLow ? 'card-glow-low' : isAboveHigh ? 'card-glow-high' : ''}
        style={{
          background:   'var(--noir-elevated)',
          border:       `1px solid ${isBelowLow ? 'rgba(255,59,59,0.25)' : isAboveHigh ? 'rgba(0,200,83,0.2)' : 'var(--noir-border)'}`,
          borderRadius: '14px',
          padding:      '16px 18px',
          transition:   'border-color 0.4s',
        }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#E0E0E0', letterSpacing: '0.04em' }}>
              {item.id}
            </div>
            <div style={{ fontSize: '10px', color: '#5C5C5C', marginTop: '3px' }}>
              {item.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: currentColor, fontFamily: 'monospace', transition: 'color 0.3s' }}>
              {fmt(item.current)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '3px' }}>
              {item.change > 0 ? <TrendingUp size={10} color={changeColor} /> : item.change < 0 ? <TrendingDown size={10} color={changeColor} /> : null}
              <span style={{ fontSize: '10px', color: changeColor, fontWeight: 500 }}>
                {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Barre de progression ── */}
        <div style={{
          background: 'var(--noir-surface)',
          borderRadius: '3px',
          height: '3px',
          marginBottom: '14px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pctClamped}%`,
            background: isBelowLow
              ? 'linear-gradient(90deg, #FF3B3B, #FF6B6B)'
              : isAboveHigh
              ? 'linear-gradient(90deg, #00C853, #00E676)'
              : 'linear-gradient(90deg, #2A5F8A, #3A8FD1)',
            borderRadius: '3px',
            transition: 'width 0.6s ease, background 0.4s',
          }} />
        </div>

        {/* ── Zone prix Bas | Actuel | Haut ── */}
        <div style={{
          background:    'var(--noir-surface)',
          borderRadius:  '10px',
          padding:       '11px 14px',
          display:       'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap:           '8px',
          alignItems:    'center',
        }}>

          {/* Bas */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase' }}>
              Bas
            </div>
            <div
              className={isBelowLow ? 'alert-low' : ''}
              style={{
                fontSize:   '13px',
                fontWeight: 500,
                color:      isBelowLow ? undefined : '#5C5C5C',
                fontFamily: 'monospace',
                transition: 'color 0.3s',
              }}>
              {fmt(item.low)}
            </div>
          </div>

          {/* Actuel — centre, plus grand, blanc */}
          <div style={{
            textAlign:   'center',
            borderLeft:  '1px solid var(--noir-border)',
            borderRight: '1px solid var(--noir-border)',
          }}>
            <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase' }}>
              Actuel
            </div>
            <div style={{
              fontSize:   '15px',
              fontWeight: 700,
              color:      '#FFFFFF',
              fontFamily: 'monospace',
              letterSpacing: '-0.01em',
            }}>
              {fmt(item.current)}
            </div>
          </div>

          {/* Haut */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.1em', marginBottom: '5px', textTransform: 'uppercase' }}>
              Haut
            </div>
            <div
              className={isAboveHigh ? 'alert-high' : ''}
              style={{
                fontSize:   '13px',
                fontWeight: 500,
                color:      isAboveHigh ? undefined : '#5C5C5C',
                fontFamily: 'monospace',
                transition: 'color 0.3s',
              }}>
              {fmt(item.high)}
            </div>
          </div>

        </div>

        {/* ── Statut alerte ── */}
        {(isBelowLow || isAboveHigh) && (
          <div style={{
            marginTop:  '10px',
            fontSize:   '9px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            color:      isBelowLow ? '#FF3B3B' : '#00C853',
            textAlign:  'center',
            textTransform: 'uppercase',
          }}>
            {isBelowLow ? '▼ Seuil bas franchi' : '▲ Seuil haut franchi'}
          </div>
        )}
      </div>
    </>
  )
}
