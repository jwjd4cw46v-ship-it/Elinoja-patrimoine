'use client'
// components/ai/ElinojaAI.tsx

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Square, Trash2, ChevronDown, Loader2, Zap } from 'lucide-react'
import { useElinojaAI } from '@/lib/ai/useElinojaAI'
import { MessageBubble } from './MessageBubble'
import { ToolIndicator } from './ToolIndicator'
import { QuickPrompts }  from './QuickPrompts'
import type { Profile }  from '@/types'

interface Props {
  profile: Profile
}

export function ElinojaAI({ profile }: Props) {
  const [isOpen,    setIsOpen]    = useState(false)
  const [input,     setInput]     = useState('')
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)

  const {
    messages,
    isStreaming,
    isToolRunning,
    error,
    sendMessage,
    stopStreaming,
    clearConversation,
  } = useElinojaAI()

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isToolRunning])

  // Focus input à l'ouverture
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200)
  }, [isOpen])

  async function handleSend() {
    if (!input.trim() || isStreaming) return
    const msg = input.trim()
    setInput('')
    await sendMessage(msg)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <>
      <style>{`
        .ai-scrollbar::-webkit-scrollbar { width: 3px; }
        .ai-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .ai-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 99px; }
        @keyframes ai-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(212,175,55,0); }
        }
        .ai-fab { animation: ai-pulse 2.5s ease-in-out infinite; }
        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30%            { opacity: 1;   transform: translateY(-3px); }
        }
        .dot1 { animation: typing 1.2s infinite 0s; }
        .dot2 { animation: typing 1.2s infinite 0.2s; }
        .dot3 { animation: typing 1.2s infinite 0.4s; }
      `}</style>

      {/* ── FAB bouton flottant ── */}
      <motion.button
        className="ai-fab"
        onClick={() => setIsOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position:     'fixed',
          bottom:       '24px',
          right:        '24px',
          zIndex:       100,
          width:        '52px',
          height:       '52px',
          borderRadius: '50%',
          background:   'linear-gradient(135deg, #D4AF37, #B8942A)',
          border:       'none',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          boxShadow:    '0 4px 20px rgba(212,175,55,0.35)',
        }}>
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <ChevronDown size={22} color="#000" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>✦</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Fenêtre chat ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1     }}
            exit={{    opacity: 0, y: 20, scale: 0.95  }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position:     'fixed',
              bottom:       '88px',
              right:        '16px',
              zIndex:       99,
              width:        'min(420px, calc(100vw - 32px))',
              height:       'min(600px, calc(100vh - 120px))',
              background:   '#0A0A0A',
              border:       '1px solid rgba(212,175,55,0.2)',
              borderRadius: '20px',
              display:      'flex',
              flexDirection: 'column',
              overflow:     'hidden',
              boxShadow:    '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.05)',
            }}>

            {/* Header */}
            <div style={{
              padding:      '14px 16px',
              borderBottom: '1px solid rgba(212,175,55,0.1)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              background:   'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, transparent 100%)',
              flexShrink:   0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4AF37, #8B6914)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', flexShrink: 0,
                }}>
                  ✦
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F5', letterSpacing: '0.02em' }}>
                    Elinoja AI
                  </div>
                  <div style={{ fontSize: '10px', color: '#5C5C5C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00C853', display: 'inline-block' }} />
                    Copilot BVMT · GPT-4o
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    title="Nouvelle conversation"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3A3A3A', padding: '5px', borderRadius: '6px', display: 'flex' }}>
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3A3A3A', padding: '5px', borderRadius: '6px', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="ai-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {isEmpty && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                    border: '1px solid rgba(212,175,55,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px',
                  }}>✦</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#E0E0E0', marginBottom: '6px' }}>
                      Bonjour, {profile.full_name?.split(' ')[0]} 👋
                    </div>
                    <div style={{ fontSize: '12px', color: '#5C5C5C', lineHeight: 1.5 }}>
                      Je suis votre Copilot BVMT.<br />Posez-moi une question sur les marchés tunisiens.
                    </div>
                  </div>
                  <QuickPrompts onSelect={p => { setInput(p); inputRef.current?.focus() }} />
                </div>
              )}

              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isToolRunning && <ToolIndicator toolName={isToolRunning} />}

              {error && (
                <div style={{ fontSize: '11px', color: '#FF1744', background: 'rgba(255,23,68,0.08)', padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding:      '12px',
              borderTop:    '1px solid rgba(212,175,55,0.08)',
              background:   '#0A0A0A',
              flexShrink:   0,
            }}>
              <div style={{
                display:      'flex',
                alignItems:   'flex-end',
                gap:          '8px',
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(212,175,55,0.15)',
                borderRadius: '12px',
                padding:      '8px 10px',
                transition:   'border-color 0.2s',
              }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.35)')}
              onBlurCapture={e  => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)')}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Analysez BIAT, comparez SFBT et BNA…"
                  rows={1}
                  style={{
                    flex:       1,
                    background: 'none',
                    border:     'none',
                    outline:    'none',
                    color:      '#F5F5F5',
                    fontSize:   '13px',
                    resize:     'none',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    maxHeight:  '80px',
                    overflowY:  'auto',
                  }}
                />
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    style={{ background: 'rgba(255,23,68,0.15)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#FF1744', display: 'flex', flexShrink: 0 }}>
                    <Square size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    style={{
                      background:   input.trim() ? 'linear-gradient(135deg, #D4AF37, #B8942A)' : 'rgba(255,255,255,0.05)',
                      border:       'none',
                      borderRadius: '8px',
                      padding:      '6px',
                      cursor:       input.trim() ? 'pointer' : 'default',
                      color:        input.trim() ? '#000' : '#3A3A3A',
                      display:      'flex',
                      flexShrink:   0,
                      transition:   'all 0.2s',
                    }}>
                    <Send size={14} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: '9px', color: '#2A2A2A', textAlign: 'center', marginTop: '6px' }}>
                Elinoja AI · Données BVMT en temps réel · Ne constitue pas un conseil en investissement
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
