import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientSidebar from '@/components/client/ClientSidebar'
import ClientHeader from '@/components/client/ClientHeader'
import { ElinojaAI } from '@/components/ai/ElinojaAI'
import PWARegister from '@/components/PWARegister'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  // 1. Tentative sécurisée de récupération de session
  let session = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data.session
  } catch (error) {
    // En cas d'erreur de cookie ou de token (refresh_token_not_found), 
    // on ignore l'erreur pour forcer la redirection vers le login.
    session = null
  }

  // 2. Vérification de l'utilisateur actif via le serveur (plus sécurisé)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // 3. Récupération du profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 4. Vérification de l'état du compte
  if (!profile || !profile.is_active) {
    redirect('/auth/login?error=account_disabled')
  }

  return (
    <div
      className="flex"
      style={{ height: '100dvh', overflow: 'hidden', background: 'var(--noir-primary)' }}>
      <div style={{ height: '100%', flexShrink: 0 } as React.CSSProperties}>
        <ClientSidebar profile={profile} />
      </div>
      <div className="flex-1 flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
        <ClientHeader profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <ElinojaAI profile={profile} />
      <PWARegister />
    </div>
  )
}

