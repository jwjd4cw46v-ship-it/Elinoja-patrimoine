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

  const [
    { data: recentAnalyses },
    { data: recentClients },
    { data: recentFundamentals },
    { data: recentArticles },
    { data: recentCmf },
    { data: recentPosts },
  ] = await Promise.all([
    supabase
      .from('technical_analyses')
      .select('id, title, ticker, signal, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at, subscription_status')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('fundamental_analyses')
      .select('id, ticker, company_name, recommendation, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('announcements')
      .select('id, title, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('cmf_announcements')
      .select('id, title, company, ticker, category')
      .order('id', { ascending: false })
      .limit(5),
    supabase
      .from('forum_posts')
      .select('id, titre, replies_count, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

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
    recentAnalyses:     recentAnalyses     || [],
    recentClients:      recentClients      || [],
    recentFundamentals: recentFundamentals || [],
    recentArticles:     recentArticles     || [],
    recentCmf:          recentCmf          || [],
    recentPosts:        recentPosts        || [],
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardStats()
  return <AdminDashboardClient {...data} />
}
