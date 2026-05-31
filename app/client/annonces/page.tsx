'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, Info, Calendar, Megaphone, Wrench, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Announcement } from '@/types'

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  info:        { icon: Info,          label: 'Information',  color: '#2196F3' },
  alert:       { icon: AlertTriangle, label: 'Alerte',       color: '#FF9800' },
  webinar:     { icon: Calendar,      label: 'Webinaire',    color: '#9C27B0' },
  maintenance: { icon: Wrench,        label: 'Maintenance',  color: '#607D8B' },
  performance: { icon: TrendingUp,    label: 'Performance',  color: '#D4AF37' },
}

const priorityBadge: Record<string, string> = {
  low:    'badge-hold',
  medium: 'badge-watch',
  high:   'badge-buy',
  urgent: 'badge-sell',
}

export default function AnnoncesPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) setAnnouncements(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnnouncements()

    const channel = supabase
      .channel('announcements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' },
        () => fetchAnnouncements())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Annonces</h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
          Actualités et informations importantes de la plateforme
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-premium p-6 space-y-3">
              <div className="flex gap-3"><div className="skeleton w-12 h-12 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-56" /><div className="skeleton h-4 w-32" /></div></div>
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 card-premium">
          <Bell size={48} className="mx-auto mb-4 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucune annonce pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, i) => {
            const type = typeConfig[ann.type] || typeConfig.info
            const pBadge = priorityBadge[ann.priority] || 'badge-hold'
            const TypeIcon = type.icon

            return (
              <motion.div key={ann.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card-premium p-6"
                style={ann.priority === 'urgent' ? { borderColor: 'rgba(255,23,68,0.3)' } : {}}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${type.color}15`, border: `1px solid ${type.color}30` }}>
                    <TypeIcon size={20} style={{ color: type.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: `${type.color}15`, color: type.color }}>
                        {type.label}
                      </span>
                      <span className={`${pBadge} text-[10px] font-bold px-2 py-0.5 rounded uppercase`}>
                        {ann.priority === 'low' ? 'Info' : ann.priority === 'medium' ? 'Important' : ann.priority === 'high' ? 'Prioritaire' : '🚨 Urgent'}
                      </span>
                    </div>

                    <h2 className="text-base font-semibold mb-2" style={{ color: '#F5F5F5' }}>{ann.title}</h2>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: '#A0A0A0' }}>{ann.content}</p>

                    <div className="flex items-center gap-4 text-xs" style={{ color: '#5C5C5C' }}>
                      <span>{format(new Date(ann.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                      {ann.expires_at && (
                        <span>· Expire le {format(new Date(ann.expires_at), 'dd MMM yyyy', { locale: fr })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
