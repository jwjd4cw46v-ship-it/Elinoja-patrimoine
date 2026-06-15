'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, BarChart2, Bell, Bot, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
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
      router.push(profile?.role === 'admin' ? '/admin' : '/client')
    }
    setLoading(false)
  }

  const features = [
    { icon: BarChart2, title: 'Cotations BVMT',         sub: 'en temps réel' },
    { icon: Bot,       title: 'IA spécialisée',          sub: 'marché tunisien' },
    { icon: Bell,      title: 'Alertes automatiques',    sub: 'et personnalisées' },
    { icon: BarChart2, title: 'Analyses fondamentales',  sub: 'et techniques' },
    { icon: Shield,    title: 'Une stratégie intelligente', sub: 'de trading' },
  ]

  const stats = [
    { icon: BarChart2, value: '75',         label: 'Actions\nsuivies' },
    { icon: Bell,      value: 'Watch liste', label: 'avec des alertes' },
    { icon: Bot,       value: '24h/24',      label: 'Assistant IA\ndisponible' },
    { icon: Shield,    value: '100%',        label: 'Orienté\nBVMT' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0A', color: '#fff', fontFamily: '-apple-system, sans-serif' }}>

      {/* ── HERO SECTION ── */}
      <div style={{ padding: '40px 24px 0', maxWidth: 480, margin: '0 auto' }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #D4AF37, #F0D060)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, color: '#0A0A0A',
          }}>EP</div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#D4AF37' }}>
            ELINOJA PATRIMOINE
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25, marginBottom: 12 }}>
            Votre copilote intelligent<br />
            pour <span style={{ color: '#D4AF37' }}>investir à la BVMT</span>
          </h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.6 }}>
            Analysez • Investissez • Suivez en temps réel
          </p>
        </motion.div>

        {/* Features card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{
            background: '#141414', borderRadius: 16,
            border: '1px solid #222', padding: '20px',
            marginBottom: 20,
          }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#D4AF37', marginBottom: 16 }}>
            Pourquoi les investisseurs choisissent Elinoja ?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <f.icon size={16} style={{ color: '#D4AF37' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0' }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{
            background: '#141414', borderRadius: 16,
            border: '1px solid #222', padding: '16px',
            marginBottom: 28,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8,
          }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <s.icon size={16} style={{ color: '#D4AF37', margin: '0 auto 4px' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#555', marginTop: 2, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── FORM SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 40px' }}>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.12em', marginBottom: 8 }}>
              ADRESSE EMAIL
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#D4AF37' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                style={{
                  width: '100%', padding: '14px 14px 14px 42px',
                  background: '#141414', border: '1px solid #2A2A2A',
                  borderRadius: 10, color: '#F5F5F5', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#D4AF37'}
                onBlur={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.12em', marginBottom: 8 }}>
              MOT DE PASSE
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#D4AF37' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '14px 44px 14px 42px',
                  background: '#141414', border: '1px solid #2A2A2A',
                  borderRadius: 10, color: '#F5F5F5', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#D4AF37'}
                onBlur={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <a href="/auth/forgot-password"
              style={{ fontSize: 12, color: '#D4AF37', textDecoration: 'none' }}>
              Mot de passe oublié ?
            </a>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '16px',
              background: loading ? '#9A7D27' : 'linear-gradient(135deg, #D4AF37, #F0D060)',
              border: 'none', borderRadius: 12,
              color: '#0A0A0A', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              letterSpacing: '0.02em',
            }}>
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Connexion...
              </>
            ) : (
              <>Se connecter <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#333', marginTop: 28 }}>
          © 2025 ELINOJA PATRIMOINE — Accès réservé aux membres
        </p>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #3A3A3A; }
      `}</style>
    </div>
  )
}
