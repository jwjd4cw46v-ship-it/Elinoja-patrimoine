'use client'

import { motion } from 'framer-motion'
import type { AlertLog } from '@/components/ClientHeader'

interface Props {
  logs:     AlertLog[]
  onClose:  () => void
}

export function NotifPanel({ logs, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: -8, scale: 0.97  }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        position:    'absolute',
        top:         '44px',
        right:       '0',
        zIndex:      999,
        background:  'var(--noir-elevated)',
        border:      '1px solid var(--noir-border)',
        borderRadius: '14px',
        width:       '310px',
        maxHeight:   '380px',
        overflowY:   'auto',
        boxShadow:   '0 20px 60px rgba(0,0,0,0.7)',
      }}>

      {/* Header */}
      <div style={{
        padding:       '12px 14px',
        borderBottom:  '1px solid var(--noir-border)',
        display:       'flex',
        justifyContent: 'space-between',
        alignItems:    'center',
      }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#5C5C5C', fontWeight: 600, textTransform: 'uppercase' }}>
          Alertes Prix
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#5C5C5C', cursor: 'pointer', fontSize: '13px', padding: '2px 6px', borderRadius: '4px' }}>
          ✕
        </button>
      </div>

      {/* Liste */}
      {logs.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', color: '#3A3A3A', fontSize: '12px' }}>
          Aucune alerte active
        </div>
      ) : (
        [...logs].reverse().map((log, i) => (
          <div
            key={i}
            style={{
              padding:      '10px 14px',
              borderBottom: '1px solid var(--noir-border)',
              display:      'flex',
              alignItems:   'center',
              gap:          '10px',
            }}>
            {/* Badge type */}
            <span style={{
              fontSize:    '8px',
              fontWeight:  700,
              padding:     '2px 6px',
              borderRadius: '4px',
              background:  log.type === 'low' ? 'rgba(255,59,59,0.12)' : 'rgba(0,200,83,0.1)',
              color:       log.type === 'low' ? '#FF3B3B' : '#00C853',
              letterSpacing: '0.08em',
              flexShrink:  0,
            }}>
              {log.type === 'low' ? '▼ BAS' : '▲ HAUT'}
            </span>

            {/* Infos */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#E0E0E0', fontWeight: 600 }}>{log.id}</div>
              <div style={{ fontSize: '10px', color: '#5C5C5C', marginTop: '2px' }}>
                Cours {log.current.toFixed(3)} · Seuil {log.type === 'low' ? log.low.toFixed(3) : log.high.toFixed(3)}
              </div>
            </div>

            {/* Heure */}
            <span style={{ fontSize: '9px', color: '#3A3A3A', flexShrink: 0 }}>{log.time}</span>
          </div>
        ))
      )}
    </motion.div>
  )
}
