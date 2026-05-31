'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
      toast.error('Erreur lors de l\'envoi. Vérifiez l\'adresse email.')
    } else {
      setSent(true)
      toast.success('Email de réinitialisation envoyé')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--noir-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]">

        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
            <span className="text-black font-bold text-xs">EP</span>
          </div>
          <span className="text-xs font-semibold tracking-[0.25em]" style={{ color: '#D4AF37' }}>
            ELINOJA PATRIMOINE
          </span>
        </div>

        {!sent ? (
          <>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#F5F5F5' }}>
              Réinitialisation
            </h2>
            <p className="text-sm mb-8" style={{ color: '#707070' }}>
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 tracking-wide"
                  style={{ color: '#A0A0A0' }}>ADRESSE EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="input-premium"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="btn-gold w-full flex items-center justify-center gap-2 h-11">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <><Mail size={14} /> Envoyer le lien</>
                )}
              </motion.button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-xl border"
            style={{ background: 'rgba(212,175,55,0.05)', borderColor: 'rgba(212,175,55,0.2)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(212,175,55,0.15)' }}>
              <Mail size={24} style={{ color: '#D4AF37' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#F5F5F5' }}>Email envoyé</h3>
            <p className="text-sm" style={{ color: '#707070' }}>
              Consultez votre boîte mail et suivez les instructions.
            </p>
          </motion.div>
        )}

        <div className="mt-6">
          <Link href="/auth/login"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#5C5C5C' }}
            onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
