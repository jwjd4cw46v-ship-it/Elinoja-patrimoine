'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, PieChart, Target, Building2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const INTERMEDIAIRES = [
  'AFC', 'AMEN INVEST', 'ATTIJARI INTERMEDIATION', 'BNA CAPITAUX', 'BEST INVEST',
  'BH INVEST', 'BMCE CAPITAL SECURITIES', 'CGI', 'CGF', 'COFIB CAPITAL',
  'FINACORP', 'MAC SA', 'MAXULA BOURSE', 'MENA CAPITAL PARTENER', 'SBT',
  'BTK CONSEIL', 'STB FINANCE', 'TSI', 'TUNISIE VALEURS', 'UNION FINANCIERE',
  'UBCI BOURSE', 'UIB FINANCE',
]

interface PfTypeRow { id: string; societe: string; ticker: string | null; poids: number }
interface RecoRow   { id: string; societe: string; ticker: string | null; cours_cible: number }

export default function AdminIntermediairesPage() {
  const [selected, setSelected]   = useState(INTERMEDIAIRES[0])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tab, setTab]             = useState<'pf' | 'reco'>('pf')
  const [pfRows, setPfRows]       = useState<PfTypeRow[]>([])
  const [recoRows, setRecoRows]   = useState<RecoRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [newSociete, setNewSociete] = useState('')
  const [newTicker, setNewTicker]   = useState('')
  const [newValue, setNewValue]     = useState('')
  const [saving, setSaving]         = useState(false)
  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const [pf, reco] = await Promise.all([
      supabase.from('intermediaire_pf_type').select('id, societe, ticker, poids')
        .eq('intermediaire', selected).order('poids', { ascending: false }),
      supabase.from('intermediaire_recommandations').select('id, societe, ticker, cours_cible')
        .eq('intermediaire', selected).order('societe', { ascending: true }),
    ])
    setPfRows((pf.data as any) ?? [])
    setRecoRows((reco.data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selected])

  async function handleAdd() {
    if (!newSociete.trim() || !newValue.trim()) {
      toast.error('Société et valeur requises')
      return
    }
    const value = parseFloat(newValue.replace(',', '.'))
    if (isNaN(value)) {
      toast.error('Valeur numérique invalide')
      return
    }
    setSaving(true)
    const { error } = tab === 'pf'
      ? await supabase.from('intermediaire_pf_type').insert({
          intermediaire: selected, societe: newSociete.trim().toUpperCase(),
          ticker: newTicker.trim().toUpperCase() || null, poids: value,
        })
      : await supabase.from('intermediaire_recommandations').insert({
          intermediaire: selected, societe: newSociete.trim().toUpperCase(),
          ticker: newTicker.trim().toUpperCase() || null, cours_cible: value,
        })
    setSaving(false)
    if (error) { toast.error(`Échec : ${error.message}`); return }
    toast.success('Ligne ajoutée')
    setNewSociete(''); setNewTicker(''); setNewValue('')
    fetchData()
  }

  async function handleDelete(id: string) {
    const table = tab === 'pf' ? 'intermediaire_pf_type' : 'intermediaire_recommandations'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { toast.error(`Échec : ${error.message}`); return }
    fetchData()
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>
          Recommandations & PF Type des Intermédiaires
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
          Gestion des lignes affichées aux clients.
        </p>
      </div>

      {/* Combobox intermédiaire */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border card-premium"
          style={{ borderColor: 'var(--noir-border)' }}>
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: '#F5F5F5' }}>
            <Building2 size={15} style={{ color: '#D4AF37' }} />
            {selected}
          </span>
          <ChevronDown size={15} style={{ color: '#5C5C5C', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute left-0 right-0 mt-2 rounded-xl border z-20 overflow-y-auto"
              style={{
                background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)',
                maxHeight: 320, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              }}>
              {INTERMEDIAIRES.map(name => (
                <button
                  key={name}
                  onClick={() => { setSelected(name); setDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={{
                    color: name === selected ? '#D4AF37' : '#C0C0C0',
                    background: name === selected ? 'rgba(212,175,55,0.08)' : 'transparent',
                  }}>
                  {name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button onClick={() => setTab('pf')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: tab === 'pf' ? 'rgba(212,175,55,0.12)' : 'var(--noir-elevated)',
            color:      tab === 'pf' ? '#D4AF37' : '#707070',
            border:     `1px solid ${tab === 'pf' ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}`,
          }}>
          <PieChart size={14} /> Portefeuille type
        </button>
        <button onClick={() => setTab('reco')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: tab === 'reco' ? 'rgba(212,175,55,0.12)' : 'var(--noir-elevated)',
            color:      tab === 'reco' ? '#D4AF37' : '#707070',
            border:     `1px solid ${tab === 'reco' ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}`,
          }}>
          <Target size={14} /> Recommandations
        </button>
      </div>

      {/* Formulaire d'ajout */}
      <div className="card-premium p-4">
        <div className="text-xs font-semibold mb-3" style={{ color: '#D4AF37' }}>
          Ajouter une ligne — {tab === 'pf' ? 'Portefeuille type' : 'Recommandation'}
        </div>
        <div className="flex gap-2">
          <input
            value={newTicker}
            onChange={e => setNewTicker(e.target.value)}
            placeholder="Ticker"
            className="input-premium w-24 text-sm"
          />
          <input
            value={newSociete}
            onChange={e => setNewSociete(e.target.value)}
            placeholder="Société (ex: SFBT)"
            className="input-premium flex-1 text-sm"
          />
          <input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder={tab === 'pf' ? 'Poids (%)' : 'Cours cible'}
            inputMode="decimal"
            className="input-premium w-32 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="btn-gold px-4 flex items-center gap-1.5 flex-shrink-0"
            style={{ opacity: saving ? 0.6 : 1 }}>
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-9 w-full rounded-lg" />)}
          </div>
        ) : tab === 'pf' ? (
          pfRows.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: '#5C5C5C' }}>
              Aucune ligne pour {selected}.
            </p>
          ) : (
            <table className="table-premium w-full">
              <thead><tr><th>Ticker</th><th>Société</th><th style={{ textAlign: 'right' }}>Poids</th><th style={{ width: 50 }}></th></tr></thead>
              <tbody>
                {pfRows.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#D4AF37', fontWeight: 600, fontFamily: 'monospace' }}>{r.ticker || '—'}</td>
                    <td style={{ color: '#F5F5F5' }}>{r.societe}</td>
                    <td style={{ textAlign: 'right', color: '#D4AF37', fontWeight: 600 }}>{r.poids.toFixed(1)}%</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleDelete(r.id)} style={{ color: '#5C5C5C' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                        onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          recoRows.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: '#5C5C5C' }}>
              Aucune ligne pour {selected}.
            </p>
          ) : (
            <table className="table-premium w-full">
              <thead><tr><th>Ticker</th><th>Société</th><th style={{ textAlign: 'right' }}>Cours cible</th><th style={{ width: 50 }}></th></tr></thead>
              <tbody>
                {recoRows.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#D4AF37', fontWeight: 600, fontFamily: 'monospace' }}>{r.ticker || '—'}</td>
                    <td style={{ color: '#F5F5F5' }}>{r.societe}</td>
                    <td style={{ textAlign: 'right', color: '#00C853', fontWeight: 600, fontFamily: 'monospace' }}>
                      {r.cours_cible.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleDelete(r.id)} style={{ color: '#5C5C5C' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#FF1744')}
                        onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
