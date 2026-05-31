import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

async function getDashboardStats() {
  const supabase = createClient()

  const [
    { count: totalClients },
    { count: activeClients },
    { count: publishedAnalyses },
    { count: totalPosts },
    { count: technicalCount },
    { count: fundamentalCount },
    { count: cmfCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client').eq('is_active', true),
    supabase.from('technical_analyses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
    supabase.from('technical_analyses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('fundamental_analyses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('cmf_announcements').select('*', { count: 'exact', head: true }),
  ])

  const { data: recentAnalyses } = await supabase
    .from('technical_analyses')
    .select('id, title, ticker, signal, created_at, status')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentClients } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at, subscription_status')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    stats: {
      totalClients:      totalClients || 0,
      activeClients:     activeClients || 0,
      publishedAnalyses: publishedAnalyses || 0,
      totalPosts:        totalPosts || 0,
      technicalCount:    technicalCount || 0,
      fundamentalCount:  fundamentalCount || 0,
      cmfCount:          cmfCount || 0,
    },
    recentAnalyses: recentAnalyses || [],
    recentClients:  recentClients || [],
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardStats()
  return <AdminDashboardClient {...data} />
}
