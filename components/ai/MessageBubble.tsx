'use client'
// components/ai/MessageBubble.tsx

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { Message } from '@/types/ai'

export function MessageBubble({ message: m }: { message: Message }) {
  const isUser = m.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        display:        'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        gap:            '8px',
        alignItems:     'flex-start',
      }}>

      {/* Avatar assistant */}
      {!isUser && (
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4AF37, #8B6914)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', flexShrink: 0, marginTop: '2px',
        }}>✦</div>
      )}

      <div style={{
        maxWidth:     '85%',
        padding:      isUser ? '9px 13px' : '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background:   isUser
          ? 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.1))'
          : 'rgba(255,255,255,0.04)',
        border:       isUser
          ? '1px solid rgba(212,175,55,0.25)'
          : '1px solid rgba(255,255,255,0.06)',
        fontSize:     '13px',
        color:        '#E0E0E0',
        lineHeight:   '1.6',
      }}>
        {isUser ? (
          <span>{m.content}</span>
        ) : m.content ? (
          <div className="ai-markdown">
            <ReactMarkdown
              components={{
                p:      ({ children }) => <p style={{ margin: '0 0 8px', lastChild: { margin: 0 } } as any}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: '#F5F5F5', fontWeight: 600 }}>{children}</strong>,
                em:     ({ children }) => <em style={{ color: '#D4AF37' }}>{children}</em>,
                ul:     ({ children }) => <ul style={{ paddingLeft: '16px', margin: '4px 0' }}>{children}</ul>,
                ol:     ({ children }) => <ol style={{ paddingLeft: '16px', margin: '4px 0' }}>{children}</ol>,
                li:     ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
                h3:     ({ children }) => <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37', margin: '10px 0 4px' }}>{children}</h3>,
                h4:     ({ children }) => <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#A0A0A0', margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</h4>,
                code:   ({ children, className }) => className
                  ? <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', overflow: 'auto', margin: '6px 0' }}><code>{children}</code></pre>
                  : <code style={{ background: 'rgba(212,175,55,0.1)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', color: '#D4AF37' }}>{children}</code>,
                hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />,
              }}>
              {m.content}
            </ReactMarkdown>
          </div>
        ) : (
          // Typing indicator
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px' }}>
            <span className="dot1" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#D4AF37', display: 'inline-block' }} />
            <span className="dot2" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#D4AF37', display: 'inline-block' }} />
            <span className="dot3" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#D4AF37', display: 'inline-block' }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
