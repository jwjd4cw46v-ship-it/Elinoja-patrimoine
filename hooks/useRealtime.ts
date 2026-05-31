import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface RealtimeOptions {
  table: string
  event?: EventType
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  onChange?: (payload: any) => void
}

export function useRealtime(channelName: string, options: RealtimeOptions | RealtimeOptions[]) {
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const opts = Array.isArray(options) ? options : [options]
    let channel = supabase.channel(channelName)

    opts.forEach(opt => {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: opt.event || '*',
          schema: 'public',
          table: opt.table,
          ...(opt.filter ? { filter: opt.filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          opt.onChange?.(payload)
          if (payload.eventType === 'INSERT') opt.onInsert?.(payload.new)
          if (payload.eventType === 'UPDATE') opt.onUpdate?.(payload.new)
          if (payload.eventType === 'DELETE') opt.onDelete?.(payload.old)
        }
      )
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName])
}
