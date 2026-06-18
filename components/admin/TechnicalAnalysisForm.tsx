'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ImagePlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { TechnicalAnalysis } from '@/types'

const MARKETS = ['TUNINDEX', 'TUNINDEX20', 'NASDAQ', 'CAC40', 'DAX', 'CRYPTO', 'FOREX', 'MATIERES_PREMIERES']
const TIMEFRAMES = ['Intraday', 'Court terme', 'Moyen terme', 'Long terme']

export default function TechnicalAnalysisForm({
  analysis, onClose, onSaved,
}: {
  analysis: TechnicalAnalysis | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title:        analysis?.title || '',
    ticker:       analysis?.ticker || '',
    market:       analysis?.market || 'TUNINDEX',
    signal:       analysis?.signal || 'buy',
    entry_price:  analysis?.entry_price?.toString() || '',
    target_price: analysis?.target_price?.toString() || '',
    stop_loss:    analysis?.stop_loss?.toString() || '',
    support:      (analysis as any)?.support?.toString() || '',
    r1:           (analysis as any)?.r1?.toString() || '',
    r2:           (analysis as any)?.r2?.toString() || '',
    r3:           (analysis as any)?.r3?.toString() || '',
    timeframe:    analysis?.timeframe || 'Moyen terme',
    risk_level:   analysis?.risk_level || 'medium',
    description:  analysis?.description || '',
    status:       analysis?.status || 'draft',
  })

  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const supabase = createClient()

  const entry   = parseFloat(form.entry_price)  || 0
  const target  = parseFloat(form.target_price) || 0
  const stop    = parseFloat(form.stop_loss)    || 0
  const gainPct = entry > 0 ? (((target - entry) / entry) * 100).toFixed(1) : null
  const lossPct = entry > 0 ? (((entry - stop)   / entry) * 100).toFixed(1) : null
  const rr      = stop < entry && target > entry
    ? ((target - entry) / (entry - stop)).toFixed(2) : null

  function handleImageChange(file: File | null) {
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { toast.error('Session expirée'); setLoading(false); return }

    let chart_image_url = (analysis as any)?.chart_image_url || null

    if (imageFile) {
      const ext      = imageFile.name.split('.').pop()
      const filename = `charts/${Date.now()}_${form.ticker}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('charts').upload(filename, imageFile, { upsert: true })
      if (uploadError) { toast.error('Erreur upload : ' + uploadError.message); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('charts').getPublicUrl(filename)
      chart_image_url = publicUrl
    }

    const payload = {
      title:        form.title,
      ticker:       form.ticker,
      market:       form.market,
      signal:       form.signal,
      entry_price:  parseFloat(form.entry_price),
      target_price: parseFloat(form.target_price),
      stop_loss:    parseFloat(form.stop_loss),
      support:      form.support ? parseFloat(form.support) : null,
      r1:           form.r1     ? parseFloat(form.r1)     : null,
      r2:           form.r2     ? parseFloat(form.r2)     : null,
      r3:           form.r3     ? parseFloat(form.r3)     : null,
      timeframe:    form.timeframe,
      risk_level:   form.risk_level,
      description:  form.description,
      status:       form.status,
      chart_image_url,
      author_id:    session.user.id,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
    }

    let error
    if (analysis) {
      ({ error } = await supabase.from('technical_analyses')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', analysis.id))
    } else {
      ({ error } = await supabase.from('technical_analyses').insert(payload))
    }

    if (error) toast.error(error.message)
    else {
      toast.success(analysis ? 'Analyse modifiée' : form.status === 'published' ? 'Analyse publiée ✓' : 'Brouillon sauvegardé')
      onSaved(); onClose()
    }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
            {analysis ? "Modifier l'analyse" : 'Nouvelle analyse technique'}
          </h2>
          <button onClick={onClose} style={{ color: '#5C5C5C' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>TITRE *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              placeholder="Opportunité haussière sur SFBT..." required className="input-premium" />
          </div>

          {/* Ticker + Marché */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>TICKER *</label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
                placeholder="SFBT" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>MARCHÉ</label>
              <select value={form.market} onChange={e => f('market', e.target.value)} className="input-premium">
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Signal + Horizon + Risque */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>SIGNAL</label>
              <select value={form.signal} onChange={e => f('signal', e.target.value)} className="input-premium">
                <option value="buy">📈 Achat</option>
                <option value="sell">📉 Vente</option>
                <option value="hold">⏸ Neutre</option>
                <option value="watch">👁 Veille</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>HORIZON</label>
              <select value={form.timeframe} onChange={e => f('timeframe', e.target.value)} className="input-premium">
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>RISQUE</label>
              <select value={form.risk_level} onChange={e => f('risk_level', e.target.value)} className="input-premium">
                <option value="low">🟢 Faible</option>
                <option value="medium">🟡 Modéré</option>
                <option value="high">🔴 Élevé</option>
              </select>
            </div>
          </div>

          {/* Prix d'entrée / Objectif / Stop */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>PRIX D'ENTRÉE *</label>
              <input type="number" step="0.001" value={form.entry_price}
                onChange={e => f('entry_price', e.target.value)} placeholder="15.250" required className="input-premium" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>OBJECTIF *</label>
              <input type="number" step="0.001" value={form.target_price}
                onChange={e => f('target_price', e.target.value)} placeholder="17.500" required className="input-premium" />
              {gainPct && <div className="text-xs mt-1" style={{ color: '#00C853' }}>+{gainPct}%</div>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>STOP LOSS *</label>
              <input type="number" step="0.001" value={form.stop_loss}
                onChange={e => f('stop_loss', e.target.value)} placeholder="14.000" required className="input-premium" />
              {lossPct && <div className="text-xs mt-1" style={{ color: '#FF1744' }}>-{lossPct}%</div>}
            </div>
          </div>

          {/* Ratio R/R */}
          {rr && (
            <div className="p-3 rounded-lg"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#A0A0A0' }}>Ratio Risque/Rendement</span>
                <span className="font-bold"
                  style={{ color: parseFloat(rr) >= 2 ? '#00C853' : parseFloat(rr) >= 1 ? '#D4AF37' : '#FF1744' }}>
                  1 : {rr}
                </span>
              </div>
            </div>
          )}

          {/* Support + Résistances */}
          <div>
            <div className="text-xs font-semibold mb-3 tracking-wider" style={{ color: '#5C5C5C' }}>
              NIVEAUX TECHNIQUES (pour la création de position)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                  SUPPORT *
                </label>
                <input type="number" step="0.001" value={form.support}
                  onChange={e => f('support', e.target.value)}
                  placeholder="Zone de support" required className="input-premium"
                  style={{ borderColor: form.support ? 'rgba(255,23,68,0.3)' : undefined }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                  RÉSISTANCE 1 *
                </label>
                <input type="number" step="0.001" value={form.r1}
                  onChange={e => f('r1', e.target.value)}
                  placeholder="1er objectif" required className="input-premium"
                  style={{ borderColor: form.r1 ? 'rgba(0,200,83,0.3)' : undefined }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                  RÉSISTANCE 2 <span style={{ color: '#4A4A4A' }}>(optionnelle)</span>
                </label>
                <input type="number" step="0.001" value={form.r2}
                  onChange={e => f('r2', e.target.value)}
                  placeholder="2ème objectif" className="input-premium"
                  style={{ borderColor: form.r2 ? 'rgba(0,200,83,0.2)' : undefined }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                  RÉSISTANCE 3 <span style={{ color: '#4A4A4A' }}>(optionnelle)</span>
                </label>
                <input type="number" step="0.001" value={form.r3}
                  onChange={e => f('r3', e.target.value)}
                  placeholder="3ème objectif" className="input-premium"
                  style={{ borderColor: form.r3 ? 'rgba(212,175,55,0.2)' : undefined }} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              ANALYSE & COMMENTAIRES *
            </label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)}
              placeholder="Description détaillée de l'analyse..." required rows={5} className="input-premium resize-none" />
          </div>

          {/* Upload image */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              GRAPHIQUE / IMAGE TECHNIQUE
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--noir-border)' }}>
                <img src={imagePreview} alt="Graphique" className="w-full max-h-64 object-contain"
                  style={{ background: 'var(--noir-elevated)' }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-2 right-2 p-1.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#F5F5F5' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label htmlFor="chart-upload"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer"
                style={{ border: '2px dashed var(--noir-border)', background: 'var(--noir-elevated)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) handleImageChange(file) }}>
                <ImagePlus size={24} style={{ color: '#5C5C5C' }} />
                <div className="text-sm" style={{ color: '#5C5C5C' }}>Ajouter un graphique (PNG, JPG)</div>
                <input id="chart-upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => handleImageChange(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
            <button type="submit" onClick={() => f('status', 'draft')} disabled={loading}
              className="btn-ghost flex-1" style={{ color: '#A0A0A0' }}>Brouillon</button>
            <motion.button type="submit" onClick={() => f('status', 'published')} disabled={loading}
              whileTap={{ scale: 0.97 }} className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Publier'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
