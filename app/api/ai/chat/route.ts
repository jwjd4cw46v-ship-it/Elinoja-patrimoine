// app/api/ai/chat/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeTool } from '@/lib/ai/tools'
import { AI_TOOLS, SYSTEM_PROMPT } from '@/types/ai'

export const maxDuration = 60

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'
const MODEL = 'mistral-small-latest'
const MAX_HISTORY = 12          // nombre max de messages d'historique envoyés
const MAX_TOOL_RESULT = 8000    // taille max (caractères) d'un résultat d'outil renvoyé au modèle

const USER_ID_TOOLS = [
  'getWatchlistAlerts',
  'getPositions',
  'getPositionDetail',
  'getPositionAlerts',
  'getPortfolioSummary',
]

// Garde les derniers messages, en commençant toujours par un message "user"
// (évite un message "tool" orphelin, que Mistral refuserait)
function trimHistory(messages: any[]) {
  let trimmed = messages.slice(-MAX_HISTORY)
  const firstUser = trimmed.findIndex(m => m.role === 'user')
  if (firstUser > 0) trimmed = trimmed.slice(firstUser)
  return trimmed
}

function truncate(str: string, max = MAX_TOOL_RESULT) {
  return str.length > max ? str.slice(0, max) + '…[tronqué]' : str
}

// fetch Mistral avec retry automatique sur 429 (limite de débit du palier gratuit)
async function fetchMistral(body: object, headers: Record<string, string>, maxRetries = 3) {
  let res: Response
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    res = await fetch(MISTRAL_API_URL, { method: 'POST', headers, body: JSON.stringify(body) })
    if (res.status !== 429 || attempt === maxRetries) return res
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait = retryAfter > 0 ? retryAfter * 1000 : 1500 * (attempt + 1)
    console.warn(`MISTRAL 429, nouvelle tentative dans ${wait} ms (${attempt + 1}/${maxRetries})`)
    await new Promise(r => setTimeout(r, wait))
  }
  return res!
}

// Lit un flux SSE Mistral avec buffer et appelle onChunk pour chaque chunk JSON
async function readSSE(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: any) => void,
) {
  const reader  = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = (line: string) => {
    if (!line.startsWith('data: ')) return
    const raw = line.slice(6).trim()
    if (!raw || raw === '[DONE]') return
    try { onChunk(JSON.parse(raw)) } catch { /* chunk partiel ignoré */ }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) handleLine(line)
  }
  if (buffer) handleLine(buffer)
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) {
      console.error('MISTRAL_API_KEY manquante')
      return new Response(
        JSON.stringify({ error: 'MISTRAL_API_KEY manquante côté serveur' }),
        { status: 500 },
      )
    }

    // await : fonctionne que createClient soit sync ou async
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { messages, conversationId } = await req.json()

    const openaiMessages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + `\n\nContexte utilisateur:\n- userId: ${user.id}\n- email: ${user.email}`,
      },
      ...trimHistory(messages ?? []).map((m: any) => ({
        role:    m.role,
        content: m.content ?? '',
        ...(m.toolCalls    ? { tool_calls:   m.toolCalls    } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ]

    const headers = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    console.log('MISTRAL PAYLOAD chars:', JSON.stringify({ m: openaiMessages, t: AI_TOOLS }).length, 'messages:', openaiMessages.length)

    const response = await fetchMistral({
      model:       MODEL,
      messages:    openaiMessages,
      tools:       AI_TOOLS,
      tool_choice: 'auto',
      stream:      true,
      temperature: 0.3,
      max_tokens:  2000,
    }, headers)

    if (!response.ok || !response.body) {
      const err = await response.text()
      console.error('MISTRAL ERROR', response.status, err)
      return new Response(JSON.stringify({ error: err }), { status: response.status === 429 ? 429 : 500 })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let toolCalls: any[] = []
        let finishReason: string | null = null
        let assistantText = ''

        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // 1er appel : texte + tool calls
          await readSSE(response.body!, chunk => {
            const choice = chunk.choices?.[0]
            const delta  = choice?.delta
            finishReason = choice?.finish_reason ?? finishReason

            if (delta?.content) {
              assistantText += delta.content
              send({ type: 'text', text: delta.content })
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const i = tc.index ?? 0
                if (!toolCalls[i]) {
                  toolCalls[i] = { id: '', type: 'function', function: { name: '', arguments: '' } }
                }
                if (tc.id)                  toolCalls[i].id                  = tc.id
                if (tc.function?.name)      toolCalls[i].function.name       = tc.function.name
                if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments
              }
            }
          })

          toolCalls = toolCalls.filter(Boolean)

          if (toolCalls.length > 0) {
            for (const tc of toolCalls) {
              send({ type: 'tool_start', toolName: tc.function.name, toolCallId: tc.id })
            }

            const results = await Promise.all(
              toolCalls.map(async tc => {
                let args: Record<string, any> = {}
                try { args = JSON.parse(tc.function.arguments || '{}') } catch {}

                // Injection forcée du userId
                if (USER_ID_TOOLS.includes(tc.function.name)) {
                  args.userId = user.id
                }

                let result: any
                try {
                  result = await executeTool(tc.function.name, args)
                } catch (e: any) {
                  console.error('TOOL ERROR', tc.function.name, e)
                  result = { error: e?.message ?? 'Erreur outil' }
                }

                if (tc.function.name === 'navigateTo' && result?.url) {
                  send({ type: 'navigate', url: result.url })
                }

                send({ type: 'tool_result', toolCallId: tc.id, toolName: tc.function.name, result })
                return { tc, result }
              }),
            )

            const messagesWithTools = [
              ...openaiMessages,
              { role: 'assistant', content: assistantText || '', tool_calls: toolCalls },
              ...results.map(({ tc, result }) => ({
                role:         'tool',
                tool_call_id: tc.id,
                name:         tc.function.name,
                content:      truncate(JSON.stringify(result)),
              })),
            ]

            // 2e appel : réponse finale
            const response2 = await fetchMistral({
              model:       MODEL,
              messages:    messagesWithTools,
              temperature: 0.3,
              max_tokens:  2000,
              stream:      true,
            }, headers)

            if (!response2.ok || !response2.body) {
              const err = await response2.text()
              console.error('MISTRAL ERROR (2e appel)', response2.status, err)
              throw new Error(`Mistral ${response2.status}: ${err}`)
            }

            let finalText = ''
            await readSSE(response2.body, chunk => {
              const content = chunk.choices?.[0]?.delta?.content
              if (content) {
                finalText += content
                send({ type: 'text', text: content })
              }
            })

            if (conversationId) {
              await saveMessage(
                supabase, conversationId, user.id, 'assistant',
                finalText, toolCalls, results.map(r => r.result),
              )
            }
          } else if (conversationId && assistantText) {
            await saveMessage(supabase, conversationId, user.id, 'assistant', assistantText)
          }

          send({ type: 'done' })
          controller.close()
        } catch (err: any) {
          console.error('STREAM ERROR', err)
          send({ type: 'error', message: err?.message ?? String(err) })
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
    console.error('CHAT ROUTE ERROR', err)
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 })
  }
}

async function saveMessage(
  supabase: any,
  conversationId: string,
  userId: string,
  role: string,
  content: string,
  toolCalls?: any[],
  toolResults?: any[],
) {
  const { error } = await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id:         userId,
    role,
    content,
    tool_calls:   toolCalls   ? JSON.stringify(toolCalls)   : null,
    tool_results: toolResults ? JSON.stringify(toolResults) : null,
    created_at:   new Date().toISOString(),
  })
  if (error) console.error('SAVE MESSAGE ERROR', error)
}
