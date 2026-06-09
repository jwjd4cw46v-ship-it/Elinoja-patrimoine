// app/api/ai/chat/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeTool } from '@/lib/ai/tools'
import { AI_TOOLS, SYSTEM_PROMPT } from '@/types/ai'

export const runtime = 'edge'
export const maxDuration = 60

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { messages, conversationId } = await req.json()

    // Construire les messages OpenAI
    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role:    m.role,
        content: m.content,
        ...(m.toolCalls    ? { tool_calls:    m.toolCalls    } : {}),
        ...(m.tool_call_id ? { tool_call_id:  m.tool_call_id } : {}),
      })),
    ]

    // ── Appel OpenAI avec streaming ────────────────────────────────────────
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o',
        messages:    openaiMessages,
        tools:       AI_TOOLS,
        tool_choice: 'auto',
        stream:      true,
        temperature: 0.3,
        max_tokens:  2000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    // ── Streaming avec gestion du function calling ─────────────────────────
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader  = response.body!.getReader()
        const decoder = new TextDecoder()

        let buffer         = ''
        let toolCalls:     any[] = []
        let finishReason:  string | null = null
        let assistantText  = ''

        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue

              let chunk: any
              try { chunk = JSON.parse(raw) } catch { continue }

              const delta = chunk.choices?.[0]?.delta
              finishReason = chunk.choices?.[0]?.finish_reason ?? finishReason

              // Texte normal → stream au client
              if (delta?.content) {
                assistantText += delta.content
                send({ type: 'text', text: delta.content })
              }

              // Tool calls → accumuler
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!toolCalls[tc.index]) {
                    toolCalls[tc.index] = { id: '', type: 'function', function: { name: '', arguments: '' } }
                  }
                  if (tc.id)                       toolCalls[tc.index].id                          = tc.id
                  if (tc.function?.name)            toolCalls[tc.index].function.name               = tc.function.name
                  if (tc.function?.arguments)       toolCalls[tc.index].function.arguments         += tc.function.arguments
                }
              }
            }
          }

          // ── Exécuter les tools si nécessaire ─────────────────────────────
          if (finishReason === 'tool_calls' && toolCalls.length > 0) {
            // Notifier le client des tools en cours
            for (const tc of toolCalls) {
              send({ type: 'tool_start', toolName: tc.function.name, toolCallId: tc.id })
            }

            // Exécuter les tools en parallèle
            const results = await Promise.all(
              toolCalls.map(async tc => {
                let args: Record<string, any> = {}
                try { args = JSON.parse(tc.function.arguments || '{}') } catch {}

                // Injecter userId automatiquement si besoin
                if (tc.function.name === 'getWatchlistAlerts' && !args.userId) {
                  args.userId = user.id
                }

                const result = await executeTool(tc.function.name, args)

                // Gérer la navigation côté client
                if (tc.function.name === 'navigateTo' && result.url) {
                  send({ type: 'navigate', url: result.url })
                }

                send({ type: 'tool_result', toolCallId: tc.id, toolName: tc.function.name, result })
                return { tc, result }
              })
            )

            // Relancer OpenAI avec les résultats des tools
            const messagesWithTools = [
              ...openaiMessages,
              { role: 'assistant', content: assistantText || null, tool_calls: toolCalls },
              ...results.map(({ tc, result }) => ({
                role:         'tool',
                tool_call_id: tc.id,
                content:      JSON.stringify(result),
              })),
            ]

            const response2 = await fetch(OPENAI_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model:       'gpt-4o',
                messages:    messagesWithTools,
                temperature: 0.3,
                max_tokens:  2000,
                stream:      true,
              }),
            })

            // Streamer la réponse finale
            const reader2  = response2.body!.getReader()
            let finalText  = ''

            while (true) {
              const { done, value } = await reader2.read()
              if (done) break
              const text  = decoder.decode(value, { stream: true })
              const lines = text.split('\n')
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const raw = line.slice(6).trim()
                if (raw === '[DONE]') continue
                let chunk: any
                try { chunk = JSON.parse(raw) } catch { continue }
                const delta2 = chunk.choices?.[0]?.delta
                if (delta2?.content) {
                  finalText += delta2.content
                  send({ type: 'text', text: delta2.content })
                }
              }
            }

            // Sauvegarder en base
            if (conversationId) {
              await saveMessage(supabase, conversationId, user.id, 'assistant', finalText, toolCalls, results.map(r => r.result))
            }
          } else {
            // Pas de tool call — sauvegarder directement
            if (conversationId && assistantText) {
              await saveMessage(supabase, conversationId, user.id, 'assistant', assistantText)
            }
          }

          send({ type: 'done' })
          controller.close()
        } catch (err: any) {
          send({ type: 'error', message: err.message })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// ── Sauvegarde message en base ─────────────────────────────────────────────────
async function saveMessage(
  supabase: any,
  conversationId: string,
  userId: string,
  role: string,
  content: string,
  toolCalls?: any[],
  toolResults?: any[],
) {
  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id:         userId,
    role,
    content,
    tool_calls:   toolCalls   ? JSON.stringify(toolCalls)   : null,
    tool_results: toolResults ? JSON.stringify(toolResults) : null,
    created_at:   new Date().toISOString(),
  })
}
