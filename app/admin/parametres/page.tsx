'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Shield, Database, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AdminParametresPage() {
  const [form, setForm] = useState({
    app_name: 'ELINOJA PATRIMOINE',
    contact_email: '',
    maintenance_mode: false,
    registration_open: false,
    default_subscription: 'active',
  })
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const supabase = createClient()

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.new !== pwForm.confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (pwForm.new.length < 8) {
      toast.error('Minimum 8 caractères')
      return
    }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.new })
    if (error) toast.error(error.message)
    else {
      toast.success('Mot de passe mis à jour')
      setPwForm({ current: '', new: '', confirm: '' })
    }
    setPwLoading(false)
  }

  const sections = [
    { icon: Database, title: 'Général', content: (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>NOM DE L'APPLICATION</label>
          <input value={form.app_name} onChange={e => setForm(p => ({ ...p, app_name: e.target.value }))} className="input-premium max-w-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>EMAIL DE CONTACT</label>
          <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="admin@elinoja.com" className="input-premium max-w-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>ABONNEMENT PAR DÉFAUT</label>
          <select value={form.default_subscription} onChange={e => setForm(p => ({ ...p, default_subscription: e.target.value }))} className="input-premium max-w-xs">
            <option value="active">Actif</option>
            <option value="trial">Essai</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
          <input type="checkbox" id="maintenance" checked={form.maintenance_mode} onChange={e => setForm(p => ({ ...p, maintenance_mode: e.target.checked }))} />
          <label htmlFor="maintenance" className="text-sm cursor-pointer" style={{ color: '#A0A0A0' }}>Mode maintenance (bloque l'accès client)</label>
        </div>
      </div>
    )},
    { icon: Shield, title: 'Sécurité — Changer le mot de passe', content: (
      <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>NOUVEAU MOT DE PASSE</label>
          <input type="password" value={pwForm.new} onChange={e => setPwForm(p => ({ ...p, new: e.target.value }))} placeholder="Min. 8 caractères" required minLength={8} className="input-premium" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>CONFIRMER LE MOT DE PASSE</label>
          <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Répétez le mot de passe" required className="input-premium" />
        </div>
        <motion.button type="submit" disabled={pwLoading} whileTap={{ scale: 0.97 }} className="btn-gold flex items-center gap-2">
          {pwLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Save size={14} /> Mettre à jour</>}
        </motion.button>
      </form>
    )},
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Paramètres</h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>Configuration de la plateforme</p>
      </div>

      {sections.map((section, i) => (
        <motion.div key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="card-premium p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: 'var(--noir-border)' }}>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>
              <section.icon size={16} style={{ color: '#D4AF37' }} />
            </div>
            <h2 className="font-semibold" style={{ color: '#F5F5F5' }}>{section.title}</h2>
          </div>
          {section.content}
        </motion.div>
      ))}

      {/* Supabase info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card-premium p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'var(--noir-border)' }}>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(0,200,83,0.1)' }}>
            <Database size={16} style={{ color: '#00C853' }} />
          </div>
          <h2 className="font-semibold" style={{ color: '#F5F5F5' }}>Infrastructure</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { l: 'Base de données', v: 'PostgreSQL 15', ok: true },
            { l: 'Auth',            v: 'Supabase Auth', ok: true },
            { l: 'Realtime',        v: 'WebSocket',     ok: true },
            { l: 'Storage',         v: 'Supabase S3',   ok: true },
          ].map(item => (
            <div key={item.l} className="p-3 rounded-lg" style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C853' }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#5C5C5C' }}>{item.l}</span>
              </div>
              <div className="text-sm font-medium" style={{ color: '#A0A0A0' }}>{item.v}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
