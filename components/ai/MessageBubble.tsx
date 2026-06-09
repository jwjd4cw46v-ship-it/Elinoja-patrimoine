'use client'
// components/ai/MessageBubble.tsx

import { motion } from 'framer-motion'
import type { Message } from '@/types/ai'

// Parser markdown simple sans dépendance externe
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Titre h3
    if (line.startsWith('### ')) {
      elements.push(
        <div key={i} style={{ fontSize: '13px', fontWeight: 600, color: '#D4AF37', margin: '10px 0 4px' }}>
          {renderInline(line.slice(4))}
        </div>
      )
    }
    // Titre h4
    else if (line.startsWith('#### ')) {
      elements.push(
        <div key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#A0A0A0', margin: '8px 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
          {renderInline(line.slice(5))}
        </div>
      )
    }
    // Séparateur
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />)
    }
    // Liste
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} style={{ paddingLeft: '16px', margin: '4px 0' }}>
          {items.map((item, j) => (
            <li key={j} style={{ marginBottom: '2px' }}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }
    // Ligne vide
    else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '4px' }} />)
    }
    // Paragraphe normal
    else {
      elements.push(
        <p key={i} style={{ margin: '0 0 6px' }}>{renderInline(line)}</p>
      )
    }
    i++
  }

  return elements
}

function renderInline(text: string): React.ReactNode {
  // Gras **texte**
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#F5F5F5', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} style={{ color: '#D4AF37' }}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(212,175,55,0.1)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', color: '#D4AF37' }}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

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
          ? 'linear-gradient(135deg, #B8942A, #D4AF37)'
          : 'rgba(255,255,255,0.04)',
        border:       isUser
          ? 'none'
          : '1px solid rgba(255,255,255,0.06)',
        fontSize:     '13px',
        color:        isUser ? '#000' : '#E0E0E0',
        lineHeight:   '1.6',
        fontWeight:   isUser ? 500 : 400,
      }}>
        {isUser ? (
          <span>{m.content}</span>
        ) : m.content ? (
          <div>{renderMarkdown(m.content)}</div>
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
