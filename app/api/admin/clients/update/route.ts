import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: adminProfile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single()
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { userId, full_name, phone, subscription_status, is_active } = await request.json()

    const serviceSupabase = createServiceClient()
    const { error } = await serviceSupabase
      .from('profiles')
      .update({ full_name, phone: phone || null, subscription_status, is_active, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
