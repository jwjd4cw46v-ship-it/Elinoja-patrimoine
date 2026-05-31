'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Plus, Trash2, Edit, Bell, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Watchlist } from '@/types'

export default function WatchlistPage() {
  const [items, setItems]   = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchWatchlist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchWatchlist()
  }, [])

  async function removeItem(id: string) {
    await supabase.from('watchlists').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Retiré de la watchlist')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Ma Watchlist</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {items.length} titre{items.length !== 1 ? 's' : ''} suivi{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(true)}
          className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Ajouter un titre
        </motion.button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-20" /><div className="skeleton h-3 w-28" /></div></div>
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20 card-premium">
          <Star size={48} className="mx-auto mb-4 opacity-20" style={{ color: '#D4AF37' }} />
          <h3 className="text-base font-medium mb-2" style={{ color: '#F5F5F5' }}>Watchlist vide</h3>
          <p className="text-sm mb-6" style={{ color: '#5C5C5C' }}>
            Ajoutez des titres pour suivre leur évolution
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-gold">
            Ajouter mon premier titre
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card-premium p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                    {item.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: '#F5F5F5' }}>{item.ticker}</div>
                    <div className="text-xs" style={{ color: '#5C5C5C' }}>{item.market}</div>
                  </div>
                </div>
                <button onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                  style={{ color: '#FF1744' }}>
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="font-medium text-sm mb-3" style={{ color: '#C0C0C0' }}>{item.company_name}</div>

              {(item.alert_price_low || item.alert_price_high) && (
                <div className="p-3 rounded-lg mb-3"
                  style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <div className="flex items-center gap-1 text-[10px] font-medium mb-2"
                    style={{ color: '#D4AF37' }}>
                    <Bell size={10} /> ALERTES PRIX
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {item.alert_price_low && (
                      <div>
                        <div style={{ color: '#5C5C5C' }}>Bas</div>
                        <div className="font-mono font-bold" style={{ color: '#FF1744' }}>
                          {item.alert_price_low.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {item.alert_price_high && (
                      <div>
                        <div style={{ color: '#5C5C5C' }}>Haut</div>
                        <div className="font-mono font-bold" style={{ color: '#00C853' }}>
                          {item.alert_price_high.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.notes && (
                <p className="text-xs leading-relaxed" style={{ color: '#5C5C5C' }}>{item.notes}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && userId && (
          <AddWatchlistModal
            userId={userId}
            onClose={() => setShowAdd(false)}
            onAdded={fetchWatchlist}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AddWatchlistModal({ userId, onClose, onAdded }: { userId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    ticker: '', company_name: '', market: 'TUNINDEX',
    alert_price_low: '', alert_price_high: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('watchlists').insert({
      user_id:          userId,
      ticker:           form.ticker.toUpperCase(),
      company_name:     form.company_name,
      market:           form.market,
      alert_price_low:  form.alert_price_low  ? parseFloat(form.alert_price_low)  : null,
      alert_price_high: form.alert_price_high ? parseFloat(form.alert_price_high) : null,
      notes:            form.notes || null,
    })
    if (error) toast.error('Erreur lors de l\'ajout')
    else { toast.success(`${form.ticker.toUpperCase()} ajouté à votre watchlist`); onAdded(); onClose() }
    setLoading(false)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>Ajouter un titre</h2>
          <button onClick={onClose}><X size={16} style={{ color: '#5C5C5C' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>TICKER *</label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
                placeholder="SFBT" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>MARCHÉ</label>
              <select value={form.market} onChange={e => f('market', e.target.value)} className="input-premium">
                {['TUNINDEX','TUNINDEX20','NASDAQ','CAC40','CRYPTO','FOREX'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>SOCIÉTÉ *</label>
            <input value={form.company_name} onChange={e => f('company_name', e.target.value)}
              placeholder="Société Frigorifique et Brasserie de Tunis" required className="input-premium" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#FF1744' }}>ALERTE BAS</label>
              <input type="number" step="0.001" value={form.alert_price_low}
                onChange={e => f('alert_price_low', e.target.value)}
                placeholder="Optionnel" className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#00C853' }}>ALERTE HAUT</label>
              <input type="number" step="0.001" value={form.alert_price_high}
                onChange={e => f('alert_price_high', e.target.value)}
                placeholder="Optionnel" className="input-premium" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>NOTES</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
              placeholder="Vos notes personnelles..." rows={2} className="input-premium resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Ajouter'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
