import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Verify admin
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: adminProfile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single()
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { full_name, email, phone, password, subscription_status, is_active } = await request.json()

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Create user with service role
    const serviceSupabase = createServiceClient()
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Upsert profile — handles case where trigger already created the row
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .upsert({
        id:                  authData.user.id,
        email,
        full_name,
        phone:               phone || null,
        role:                'client',
        subscription_status: subscription_status || 'active',
        is_active:           is_active ?? true,
      }, { onConflict: 'id' })

    if (profileError) {
      // Rollback: delete auth user
      await serviceSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
