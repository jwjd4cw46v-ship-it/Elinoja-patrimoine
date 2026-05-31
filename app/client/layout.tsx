import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientSidebar from '@/components/client/ClientSidebar'
import ClientHeader from '@/components/client/ClientHeader'

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
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--noir-primary)' }}>
      <ClientSidebar profile={profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClientHeader profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
