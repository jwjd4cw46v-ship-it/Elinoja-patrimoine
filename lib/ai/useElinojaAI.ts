'use client'
// hooks/useElinojaAI.ts

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Message } from '@/types/ai'

export function useElinojaAI() {
  const [messages,       setMessages]       = useState<Message[]>([])
  const [isStreaming,    setIsStreaming]     = useState(false)
  const [isToolRunning,  setIsToolRunning]  = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router   = useRouter()

  // Créer une nouvelle conversation
  const createConversation = useCallback(async (firstMessage: string) => {
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '')
    const res   = await fetch('/api/ai/conversations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title }),
    })
    const data = await res.json()
    setConversationId(data.id)
    return data.id
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return
    setError(null)

    // Ajouter le message utilisateur
    const userMsg: Message = {
      id:        crypto.randomUUID(),
      role:      'user',
      content,
      createdAt: new Date(),
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)

    // Créer conversation si première fois
    let convId = conversationId
    if (!convId) {
      convId = await createConversation(content)
    }

    // Placeholder pour la réponse assistant
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id:        assistantId,
      role:      'assistant',
      content:   '',
      createdAt: new Date(),
    }])

    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body:    JSON.stringify({
          messages:       updatedMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId: convId,
        }),
      })

      if (!res.ok) throw new Error('Erreur serveur')
      if (!res.body)  throw new Error('Pas de stream')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          let event: any
          try { event = JSON.parse(raw) } catch { continue }

          switch (event.type) {
            case 'text':
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.text }
                  : m
              ))
              break

            case 'tool_start':
              setIsToolRunning(event.toolName)
              break

            case 'tool_result':
              setIsToolRunning(null)
              break

            case 'navigate':
              router.push(event.url)
              break

            case 'error':
              setError(event.message)
              break

            case 'done':
              setIsStreaming(false)
              setIsToolRunning(null)
              break
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Désolé, une erreur est survenue. Réessayez.' }
            : m
        ))
      }
    } finally {
      setIsStreaming(false)
      setIsToolRunning(null)
    }
  }, [messages, isStreaming, conversationId, createConversation, router])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setIsToolRunning(null)
  }, [])

  const clearConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  return {
    messages,
    isStreaming,
    isToolRunning,
    conversationId,
    error,
    sendMessage,
    stopStreaming,
    clearConversation,
  }
}
