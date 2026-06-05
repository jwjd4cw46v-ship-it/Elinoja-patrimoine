'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ImagePlus, X, Loader2, CheckCircle } from 'lucide-react'
import type { TechnicalAnalysis } from '@/types'

const MARKETS   = ['TUNINDEX', 'TUNINDEX20', 'NASDAQ', 'CAC40', 'DAX', 'CRYPTO', 'FOREX', 'MATIERES_PREMIERES']
const TIMEFRAMES = ['Intraday', 'Court terme', 'Moyen terme', 'Long terme']

export default function TechnicalAnalysisForm({
  analysis,
  onClose,
  onSaved,
}: {
  analysis: TechnicalAnalysis | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title:        analysis?.title        || '',
    ticker:       analysis?.ticker       || '',
    market:       analysis?.market       || 'TUNINDEX',
    signal:       analysis?.signal       || 'buy',
    entry_price:  analysis?.entry_price?.toString()  || '',
    target_price: analysis?.target_price?.toString() || '',
    stop_loss:    analysis?.stop_loss?.toString()    || '',
    timeframe:    analysis?.timeframe    || 'Moyen terme',
    risk_level:   analysis?.risk_level   || 'medium',
    description:  analysis?.description  || '',
  })

  // L'URL finale confirmée (déjà uploadée dans Storage)
  // On distingue l'URL existante en BDD de la nouvelle uploadée
  const [chartImageUrl, setChartImageUrl] = useState<string>(
    analysis?.chart_image_url || ''
  )
  // Preview locale (blob URL) avant upload confirmé
  const [imagePreview, setImagePreview]   = useState<string>(
    analysis?.chart_image_url || ''
  )
  const [uploading, setUploading]         = useState(false)
  const [uploadDone, setUploadDone]       = useState(!!analysis?.chart_image_url)
  const [loading, setLoading]             = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  /* ── Computed ── */
  const entry   = parseFloat(form.entry_price)  || 0
  const target  = parseFloat(form.target_price) || 0
  const stop    = parseFloat(form.stop_loss)    || 0
  const gainPct = entry > 0 ? (((target - entry) / entry) * 100).toFixed(1) : null
  const lossPct = entry > 0 ? (((entry - stop)   / entry) * 100).toFixed(1) : null
  const rr      = stop < entry && target > entry
    ? ((target - entry) / (entry - stop)).toFixed(2) : null

  /* ── Upload immédiat à la sélection du fichier ── */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide — PNG, JPG, WEBP uniquement')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image trop lourde — maximum 10 Mo')
      return
    }

    // Aperçu local immédiat
    const localUrl = URL.createObjectURL(file)
    setImagePreview(localUrl)
    setUploadDone(false)
    setUploading(true)

    try {
      // Nom de fichier SANS sous-dossier — le bucket s'appelle déjà "charts"
      const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filename = `${Date.now()}_${form.ticker.toUpperCase() || 'IMG'}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('charts')           // ← bucket "charts"
        .upload(filename, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) throw uploadError

      // URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('charts')
        .getPublicUrl(filename)

      console.log('[Upload OK] publicUrl:', publicUrl)

      setChartImageUrl(publicUrl)
      setImagePreview(publicUrl)  // remplace le blob par l'URL réelle
      setUploadDone(true)
      toast.success('Image uploadée ✓')
    } catch (err: any) {
      toast.error('Erreur upload : ' + err.message)
      console.error('[Upload]', err)
      // Revenir à l'état précédent
      setImagePreview(chartImageUrl)
      setUploadDone(!!chartImageUrl)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeImage() {
    setChartImageUrl('')
    setImagePreview('')
    setUploadDone(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ── Submit — statut passé explicitement pour éviter la closure ── */
  async function handleSubmit(submitStatus: 'draft' | 'published') {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Session expirée — veuillez vous reconnecter')
      setLoading(false)
      return
    }

    const payload = {
      title:           form.title,
      ticker:          form.ticker.toUpperCase(),
      market:          form.market,
      signal:          form.signal,
      entry_price:     parseFloat(form.entry_price)  || null,
      target_price:    parseFloat(form.target_price) || null,
      stop_loss:       parseFloat(form.stop_loss)    || null,
      timeframe:       form.timeframe,
      risk_level:      form.risk_level,
      description:     form.description,
      status:          submitStatus,
      chart_image_url: chartImageUrl || null,   // ← URL déjà uploadée
      author_id:       session.user.id,
      published_at:    submitStatus === 'published' ? new Date().toISOString() : null,
    }

    console.log('[Submit] chart_image_url:', payload.chart_image_url)

    let error
    if (analysis) {
      ;({ error } = await supabase
        .from('technical_analyses')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', analysis.id))
    } else {
      ;({ error } = await supabase
        .from('technical_analyses')
        .insert(payload))
    }

    if (error) {
      toast.error(error.message)
      console.error('[Save]', error)
    } else {
      toast.success(
        analysis
          ? 'Analyse modifiée ✓'
          : submitStatus === 'published'
            ? 'Analyse publiée ✓'
            : 'Brouillon sauvegardé'
      )
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl border my-8"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--noir-border)', background: 'rgba(212,175,55,0.02)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#F5F5F5' }}>
              {analysis ? `Modifier · ${analysis.ticker}` : 'Nouvelle analyse technique'}
            </h2>
            {analysis && (
              <p className="text-xs mt-0.5" style={{ color: '#5C5C5C' }}>
                Créée le {new Date(analysis.created_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#5C5C5C' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form — pas de onSubmit, on gère via les boutons */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              TITRE DE L'ANALYSE *
            </label>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              placeholder="Opportunité haussière sur SFBT…" className="input-premium" />
          </div>

          {/* Ticker + Marché */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>TICKER *</label>
              <input value={form.ticker} onChange={e => f('ticker', e.target.value.toUpperCase())}
                placeholder="SFBT" className="input-premium font-mono" />
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

          {/* Prix */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>PRIX D'ENTRÉE *</label>
              <input type="number" step="0.001" value={form.entry_price}
                onChange={e => f('entry_price', e.target.value)}
                placeholder="15.250" className="input-premium font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>OBJECTIF *</label>
              <input type="number" step="0.001" value={form.target_price}
                onChange={e => f('target_price', e.target.value)}
                placeholder="17.500" className="input-premium font-mono" />
              {gainPct && <div className="text-xs mt-1 font-mono" style={{ color: '#00C853' }}>+{gainPct}%</div>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>STOP LOSS *</label>
              <input type="number" step="0.001" value={form.stop_loss}
                onChange={e => f('stop_loss', e.target.value)}
                placeholder="14.000" className="input-premium font-mono" />
              {lossPct && <div className="text-xs mt-1 font-mono" style={{ color: '#FF1744' }}>-{lossPct}%</div>}
            </div>
          </div>

          {/* R/R */}
          {rr && (
            <div className="p-3 rounded-lg"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#A0A0A0' }}>Ratio Risque / Rendement</span>
                <span className="font-bold font-mono"
                  style={{ color: parseFloat(rr) >= 2 ? '#00C853' : parseFloat(rr) >= 1 ? '#D4AF37' : '#FF1744' }}>
                  1 : {rr}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              ANALYSE & COMMENTAIRES *
            </label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)}
              placeholder="Description détaillée, niveaux techniques, contexte de marché…"
              rows={5} className="input-premium resize-none" />
          </div>

          {/* ── Image ── */}
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              GRAPHIQUE / IMAGE TECHNIQUE
            </label>

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden"
                style={{ border: `1px solid ${uploadDone ? 'rgba(0,200,83,0.3)' : 'var(--noir-border)'}` }}>

                <img src={imagePreview} alt="Graphique"
                  className="w-full object-contain"
                  style={{ maxHeight: 280, background: 'var(--noir-elevated)' }} />

                {/* Spinner pendant upload */}
                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <Loader2 size={28} className="animate-spin" style={{ color: '#D4AF37' }} />
                    <span className="text-xs font-medium" style={{ color: '#D4AF37' }}>Upload en cours…</span>
                  </div>
                )}

                {/* Badge statut */}
                {!uploading && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium"
                    style={{
                      background: uploadDone ? 'rgba(0,200,83,0.85)' : 'rgba(0,0,0,0.7)',
                      color: uploadDone ? '#000' : '#D4AF37',
                    }}>
                    {uploadDone
                      ? <><CheckCircle size={9} /> Sauvegardée</>
                      : 'Aperçu local'}
                  </div>
                )}

                {/* Actions */}
                {!uploading && (
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <label htmlFor="chart-upload" className="cursor-pointer p-1.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#D4AF37' }}
                      title="Remplacer">
                      <ImagePlus size={13} />
                    </label>
                    <button type="button" onClick={removeImage}
                      className="p-1.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#FF1744' }}
                      title="Supprimer">
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label htmlFor="chart-upload"
                className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl cursor-pointer transition-all"
                style={{ border: '2px dashed var(--noir-border)', background: 'var(--noir-elevated)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) {
                    // Créer un faux event pour réutiliser handleImageUpload
                    const dt = new DataTransfer()
                    dt.items.add(file)
                    const fakeEvent = { target: { files: dt.files } } as any
                    handleImageUpload(fakeEvent)
                  }
                }}>
                <ImagePlus size={28} style={{ color: '#5C5C5C' }} />
                <div className="text-sm" style={{ color: '#5C5C5C' }}>Ajouter un graphique</div>
                <div className="text-xs" style={{ color: '#3A3A3A' }}>PNG · JPG · WEBP · max 10 Mo</div>
              </label>
            )}

            <input
              ref={fileInputRef}
              id="chart-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* ── Boutons — statut passé directement, pas via state ── */}
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--noir-border)' }}>
            <button type="button" onClick={onClose} disabled={loading || uploading}
              className="btn-ghost flex-1">
              Annuler
            </button>
            <button type="button"
              onClick={() => handleSubmit('draft')}
              disabled={loading || uploading}
              className="btn-ghost flex-1" style={{ color: '#A0A0A0' }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              ) : 'Brouillon'}
            </button>
            <motion.button type="button"
              onClick={() => handleSubmit('published')}
              disabled={loading || uploading}
              whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : uploading ? (
                <><Loader2 size={13} className="animate-spin" /> Upload…</>
              ) : analysis ? 'Mettre à jour' : 'Publier'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
