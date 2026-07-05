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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile || !profile.is_active) redirect('/auth/login?error=account_disabled')

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
