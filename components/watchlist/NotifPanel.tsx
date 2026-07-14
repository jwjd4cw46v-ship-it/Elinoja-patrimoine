'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

/**
 * Format consommé depuis la table `notifications` (source de vérité côté
 * serveur, remplace l'ancien AlertLog basé sur current/low/high qui ne
 * fonctionnait qu'avec les seuils watchlist calculés côté client).
 */
export interface NotifItem {
  id:      string
  type:    string   // NotifType complet : STOP_LOSS, TAKE_PROFIT_R1, WATCHLIST_LOW, ...
  ticker?: string | null
  title:   string
  body:    string
  time:    string
  isRead?: boolean
  link?:   string | null
}

interface Props {
  logs:    NotifItem[]
  onClose: () => void
}

// Types "bas / danger" → rouge ; types "haut / objectif" → vert ; le reste → doré neutre
const DOWN_TYPES = new Set(['STOP_LOSS', 'RUNNER_STOP', 'WATCHLIST_LOW'])
const UP_TYPES   = new Set(['TAKE_PROFIT_R1', 'TAKE_PROFIT_R2', 'TAKE_PROFIT_R3', 'WATCHLIST_HIGH', 'BREAK_EVEN'])

function badgeFor(type: string) {
  if (DOWN_TYPES.has(type)) return { label: 'SEUIL BAS',  color: '#FF3B3B', bg: 'rgba(255,59,59,0.12)' }
  if (UP_TYPES.has(type))   return { label: 'SEUIL HAUT', color: '#00C853', bg: 'rgba(0,200,83,0.1)'  }
  return { label: 'INFO', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' }
}

// Destination par défaut si la notification n'a pas de `link` enregistré
// (anciennes notifications créées avant l'ajout de cette colonne).
function fallbackLink(type: string): string {
  if (type.startsWith('FORUM_')) return '/client/forum'
  if (type === 'WATCHLIST_LOW' || type === 'WATCHLIST_HIGH') return '/client/watchlist'
  if (
    type === 'STOP_LOSS' || type === 'RUNNER_STOP' || type === 'BREAK_EVEN' ||
    type === 'EXPOSURE' || type === 'TAKE_PROFIT_R1' || type === 'TAKE_PROFIT_R2' || type === 'TAKE_PROFIT_R3'
  ) return '/client/positions'
  return '/client'
}

export function NotifPanel({ logs, onClose }: Props) {
  const router = useRouter()

  function handleClick(log: NotifItem) {
    router.push(log.link || fallbackLink(log.type))
    onClose()
  }

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
          Notifications
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
          Aucune notification
        </div>
      ) : (
        logs.map(log => {
          const badge = badgeFor(log.type)
          return (
            <div
              key={log.id}
              onClick={() => handleClick(log)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick(log) }}
              style={{
                padding:      '10px 14px',
                borderBottom: '1px solid var(--noir-border)',
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '10px',
                background:   log.isRead === false ? 'rgba(212,175,55,0.04)' : 'transparent',
                cursor:       'pointer',
              }}>
              {/* Badge type */}
              <span style={{
                fontSize:    '8px',
                fontWeight:  700,
                padding:     '2px 6px',
                borderRadius: '4px',
                background:  badge.bg,
                color:       badge.color,
                letterSpacing: '0.08em',
                flexShrink:  0,
                marginTop:   '2px',
              }}>
                {badge.label}
              </span>

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#E0E0E0', fontWeight: 600 }}>
                  {log.title}
                </div>
                <div style={{
                  fontSize: '10px', color: '#5C5C5C', marginTop: '2px',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {log.body}
                </div>
              </div>

              {/* Heure */}
              <span style={{ fontSize: '9px', color: '#3A3A3A', flexShrink: 0, marginTop: '2px' }}>
                {log.time}
              </span>
            </div>
          )
        })
      )}
    </motion.div>
  )
}
