'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Search, ExternalLink, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CmfAnnouncement } from '@/types'

const categoryConfig: Record<string, { label: string; color: string }> = {
  resultat:    { label: 'Résultats',   color: '#2196F3' },
  dividend:    { label: 'Dividende',   color: '#00C853' },
  agm:         { label: 'AGO/AGE',     color: '#9C27B0' },
  opa:         { label: 'OPA',         color: '#FF9800' },
  introduction:{ label: 'Introduction',color: '#D4AF37' },
  autre:       { label: 'Autre',       color: '#707070' },
}

export default function CmfPage() {
  const [announcements, setAnnouncements] = useState<CmfAnnouncement[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [category, setCategory]           = useState('all')
  const supabase = createClient()

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('cmf_announcements')
      .select('*')
      .order('official_date', { ascending: false })
    if (data) setAnnouncements(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnnouncements()

    const channel = supabase
      .channel('cmf-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cmf_announcements' },
        () => fetchAnnouncements())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = announcements.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      (a.ticker || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || a.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Communiqués CMF</h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
          Publications officielles du Conseil du Marché Financier
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5C5C5C' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Société, ticker..." className="input-premium pl-9 w-52" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategory('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: category === 'all' ? 'rgba(212,175,55,0.12)' : 'var(--noir-elevated)', color: category === 'all' ? '#D4AF37' : '#707070', border: `1px solid ${category === 'all' ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}` }}>
            Tous
          </button>
          {Object.entries(categoryConfig).map(([k, v]) => (
            <button key={k} onClick={() => setCategory(k)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: category === k ? `${v.color}18` : 'var(--noir-elevated)', color: category === k ? v.color : '#707070', border: `1px solid ${category === k ? v.color + '40' : 'var(--noir-border)'}` }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card-premium p-5 flex gap-4">
              <div className="skeleton w-12 h-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#5C5C5C' }} />
          <p style={{ color: '#5C5C5C' }}>Aucun communiqué trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann, i) => {
            const cat = categoryConfig[ann.category] || categoryConfig.autre
            return (
              <motion.div key={ann.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-premium p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
                    <FileText size={18} style={{ color: cat.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${cat.color}15`, color: cat.color }}>
                          {cat.label}
                        </span>
                        {ann.ticker && (
                          <span className="badge-watch text-[10px] font-bold px-2 py-0.5 rounded">
                            {ann.ticker}
                          </span>
                        )}
                        {ann.is_important && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded badge-sell">
                            <AlertCircle size={9} /> IMPORTANT
                          </span>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: '#5C5C5C' }}>
                        {format(new Date(ann.official_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm mb-1" style={{ color: '#F5F5F5' }}>{ann.title}</h3>
                    <p className="text-xs mb-1" style={{ color: '#707070' }}>{ann.company}</p>
                    {ann.content && (
                      <p className="text-xs leading-relaxed line-clamp-2 mt-2" style={{ color: '#5C5C5C' }}>
                        {ann.content}
                      </p>
                    )}

                    {ann.pdf_url && (
                      <div className="mt-3">
                        <a href={ann.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: 'var(--noir-elevated)', color: '#A0A0A0', border: '1px solid var(--noir-border)' }}
                          onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'; (e.currentTarget as HTMLElement).style.color = '#D4AF37' }}
                          onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--noir-border)'; (e.currentTarget as HTMLElement).style.color = '#A0A0A0' }}>
                          <Download size={12} />
                          {ann.pdf_filename || 'Télécharger le PDF'}
                        </a>
                      </div>
                    )}
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
