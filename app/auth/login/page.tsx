'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
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

  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0A', color: '#fff', fontFamily: '-apple-system, sans-serif' }}>

      {/* ── IMAGE HERO ── */}
      <div style={{ width: '100%', position: 'relative' }}>
        <Image
          src="/login-hero.jpeg"
          alt="Elinoja Patrimoine — Votre copilote intelligent pour investir à la BVMT"
          width={1080}
          height={1080}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          priority
        />
        {/* Fondu bas vers le fond */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(to bottom, transparent, #0A0A0A)',
        }} />
      </div>

      {/* ── FORMULAIRE ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ maxWidth: 480, margin: '0 auto', padding: '8px 24px 48px' }}>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 700,
              color: '#666', letterSpacing: '0.12em', marginBottom: 8,
            }}>
              ADRESSE EMAIL
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)', color: '#D4AF37',
              }} />
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
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#D4AF37'}
                onBlur={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 10 }}>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 700,
              color: '#666', letterSpacing: '0.12em', marginBottom: 8,
            }}>
              MOT DE PASSE
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)', color: '#D4AF37',
              }} />
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
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#D4AF37'}
                onBlur={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#555', padding: 0,
                }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot */}
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
              background: loading
                ? '#9A7D27'
                : 'linear-gradient(135deg, #C9A227, #F0D060)',
              border: 'none', borderRadius: 12,
              color: '#0A0A0A', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              letterSpacing: '0.02em',
              boxShadow: '0 4px 24px rgba(212,175,55,0.25)',
            }}>
            {loading ? (
              <>
                <div style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(0,0,0,0.3)',
                  borderTopColor: '#000', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
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
