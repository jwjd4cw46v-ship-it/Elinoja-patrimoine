'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Search, Filter, MoreVertical,
  Edit, Trash2, UserX, UserCheck, Mail, RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Profile } from '@/types'

export default function ClientsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchClients() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    if (!error && data) setClients(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()

    const channel = supabase
      .channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },
        () => { fetchClients() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleActive(client: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !client.is_active })
      .eq('id', client.id)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success(client.is_active ? 'Client désactivé' : 'Client activé')
      fetchClients()
    }
  }

  async function deleteClient(client: Profile) {
    if (!confirm(`Supprimer ${client.full_name} ? Cette action est irréversible.`)) return

    const res = await fetch('/api/admin/clients/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: client.id }),
    })

    if (res.ok) {
      toast.success('Client supprimé')
      fetchClients()
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function resetPassword(client: Profile) {
    const { error } = await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })
    if (error) {
      toast.error('Erreur lors de l\'envoi')
    } else {
      toast.success(`Email de réinitialisation envoyé à ${client.email}`)
    }
  }

  const subscriptionLabel = (s: string) => ({
    active:   { label: 'ACTIF',   className: 'badge-buy'  },
    trial:    { label: 'ESSAI',   className: 'badge-watch' },
    inactive: { label: 'INACTIF', className: 'badge-sell' },
  }[s] || { label: s, className: 'badge-hold' })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setEditingClient(null); setShowModal(true) }}
          className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouveau client
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#5C5C5C' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="input-premium pl-9"
          />
        </div>
        <button className="btn-ghost flex items-center gap-2">
          <Filter size={14} /> Filtrer
        </button>
        <button onClick={fetchClients} className="btn-ghost p-2.5">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-56" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#5C5C5C' }} />
            <p className="text-sm" style={{ color: '#5C5C5C' }}>
              {search ? 'Aucun client trouvé' : 'Aucun client enregistré'}
            </p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Client</th>
                <th>Abonnement</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const sub = subscriptionLabel(client.subscription_status)
                return (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                          {client.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: '#F5F5F5' }}>
                            {client.full_name}
                          </div>
                          <div className="text-xs" style={{ color: '#5C5C5C' }}>{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${sub.className} text-[10px] font-bold px-2 py-0.5 rounded`}>
                        {sub.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${client.is_active ? 'status-online' : 'status-offline'}`} />
                        <span className="text-xs" style={{ color: client.is_active ? '#00C853' : '#5C5C5C' }}>
                          {client.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: '#707070' }}>
                        {format(new Date(client.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </td>
                    <td>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#5C5C5C' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#F5F5F5')}
                          onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
                          <MoreVertical size={14} />
                        </button>

                        <AnimatePresence>
                          {menuOpen === client.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full mt-1 w-44 rounded-xl border z-20 py-1"
                              style={{ background: 'var(--noir-elevated)', borderColor: 'var(--noir-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                              <button onClick={() => { setEditingClient(client); setShowModal(true); setMenuOpen(null) }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors text-left"
                                style={{ color: '#A0A0A0' }}
                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                <Edit size={12} /> Modifier
                              </button>
                              <button onClick={() => { resetPassword(client); setMenuOpen(null) }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors text-left"
                                style={{ color: '#A0A0A0' }}
                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                <Mail size={12} /> Réinit. mot de passe
                              </button>
                              <button onClick={() => { toggleActive(client); setMenuOpen(null) }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors text-left"
                                style={{ color: '#A0A0A0' }}
                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                {client.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                                {client.is_active ? 'Désactiver' : 'Activer'}
                              </button>
                              <div className="border-t my-1" style={{ borderColor: 'var(--noir-border)' }} />
                              <button onClick={() => { deleteClient(client); setMenuOpen(null) }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors text-left"
                                style={{ color: '#FF1744' }}
                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,23,68,0.05)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                <Trash2 size={12} /> Supprimer
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <ClientFormModal
            client={editingClient}
            onClose={() => setShowModal(false)}
            onSaved={fetchClients}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ClientFormModal({ client, onClose, onSaved }: {
  client: Profile | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    full_name:           client?.full_name || '',
    email:               client?.email || '',
    phone:               client?.phone || '',
    password:            '',
    subscription_status: client?.subscription_status || 'active',
    is_active:           client?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const endpoint = client ? '/api/admin/clients/update' : '/api/admin/clients/create'
    const body = client ? { ...form, userId: client.id } : form

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la sauvegarde')
    } else {
      toast.success(client ? 'Client modifié' : 'Client créé avec succès')
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: 'var(--noir-surface)', borderColor: 'var(--noir-border)' }}>

        <h2 className="text-lg font-semibold mb-5" style={{ color: '#F5F5F5' }}>
          {client ? 'Modifier le client' : 'Nouveau client'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              NOM COMPLET
            </label>
            <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Mohamed Ben Ali" required className="input-premium" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              ADRESSE EMAIL
            </label>
            <input type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="client@email.com" required disabled={!!client}
              className="input-premium" style={{ opacity: client ? 0.6 : 1 }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              TÉLÉPHONE
            </label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+216 XX XXX XXX" className="input-premium" />
          </div>

          {!client && (
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
                MOT DE PASSE INITIAL
              </label>
              <input type="password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Min. 8 caractères" required minLength={8}
                className="input-premium" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#A0A0A0' }}>
              STATUT ABONNEMENT
            </label>
            <select
              value={form.subscription_status}
              onChange={e => setForm(p => ({ ...p, subscription_status: e.target.value as any }))}
              className="input-premium">
              <option value="active">Actif</option>
              <option value="trial">Essai</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--noir-elevated)', border: '1px solid var(--noir-border)' }}>
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm cursor-pointer" style={{ color: '#A0A0A0' }}>
              Compte actif (peut se connecter)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Annuler
            </button>
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (client ? 'Sauvegarder' : 'Créer le compte')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
