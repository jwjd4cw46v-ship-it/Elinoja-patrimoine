import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: adminProfile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single()
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { userId } = await request.json()

    const serviceSupabase = createServiceClient()
    // Delete auth user (cascades to profile via FK)
    const { error } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
