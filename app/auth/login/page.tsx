'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Eye, EyeOff, TrendingUp, Shield, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : error.message
      )
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

      if (!profile?.is_active) {
        await supabase.auth.signOut()
        toast.error('Votre compte est désactivé. Contactez l\'administrateur.')
        setLoading(false)
        return
      }

      toast.success('Connexion réussie')
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/client')
      }
    }
    setLoading(false)
  }

  const stats = [
    { icon: TrendingUp, label: 'Analyses publiées', value: '450+' },
    { icon: Shield,     label: 'Sécurité maximale', value: 'AES-256' },
    { icon: Zap,        label: 'Temps réel',         value: '<100ms' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--noir-primary)' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #080808 0%, #111111 60%, #0A0A0A 100%)' }}>

        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10">
          <Image
            src="/logo.jpeg"
            alt="Elinoja Patrimoine"
            width={180}
            height={80}
            style={{ objectFit: 'contain' }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10">
          <h1 className="text-5xl font-bold mb-6 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            <span style={{ color: '#F5F5F5' }}>Analyses</span>
            <br />
            <span className="text-gold">Institutionnelles</span>
            <br />
            <span style={{ color: '#F5F5F5' }}>Premium</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#707070', maxWidth: '360px' }}>
            Accédez aux analyses financières de qualité institutionnelle, suivis en temps réel des marchés tunisiens et internationaux.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10 grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="p-4 rounded-xl border"
              style={{ background: 'rgba(212,175,55,0.04)', borderColor: 'rgba(212,175,55,0.12)' }}>
              <s.icon size={16} style={{ color: '#D4AF37', marginBottom: '8px' }} />
              <div className="text-xl font-bold mb-1" style={{ color: '#D4AF37' }}>{s.value}</div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8"
        style={{ background: 'var(--noir-surface)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-10">
            <Image
              src="/logo.jpeg"
              alt="Elinoja Patrimoine"
              width={160}
              height={70}
              style={{ objectFit: 'contain' }}
            />
          </div>

          <h2 className="text-2xl font-semibold mb-2" style={{ color: '#F5F5F5' }}>
            Connexion
          </h2>
          <p className="text-sm mb-8" style={{ color: '#707070' }}>
            Accédez à votre espace investisseur sécurisé
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2 tracking-wide"
                style={{ color: '#A0A0A0' }}>
                ADRESSE EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 tracking-wide"
                style={{ color: '#A0A0A0' }}>
                MOT DE PASSE
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-premium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#5C5C5C' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="/auth/forgot-password"
                className="text-xs transition-colors"
                style={{ color: '#5C5C5C' }}
                onMouseOver={e => (e.currentTarget.style.color = '#D4AF37')}
                onMouseOut={e => (e.currentTarget.style.color = '#5C5C5C')}>
                Mot de passe oublié ?
              </a>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="btn-gold w-full flex items-center justify-center gap-2 h-11 mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Connexion...
                </>
              ) : 'Se connecter'}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t text-center"
            style={{ borderColor: 'var(--noir-border)' }}>
            <p className="text-xs" style={{ color: '#3A3A3A' }}>
              © 2024 ELINOJA PATRIMOINE — Accès réservé aux membres
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
