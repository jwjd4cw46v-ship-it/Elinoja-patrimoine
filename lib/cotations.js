import { createClient } from '@/lib/supabase/client'

// ─── Côté client (composants React) ──────────────────────────────────────────

/**
 * Cotations du jour (ou d'une date donnée)
 */
export async function getCotations(date) {
  const supabase = createClient()
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('cotations')
    .select('*')
    .eq('date', targetDate)
    .order('nom', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Historique d'une action sur N jours
 */
export async function getHistorique(nom, jours = 30) {
  const supabase = createClient()
  const depuis = new Date()
  depuis.setDate(depuis.getDate() - jours)

  const { data, error } = await supabase
    .from('cotations')
    .select('*')
    .eq('nom', nom)
    .gte('date', depuis.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Dernière date disponible dans la base
 */
export async function getDerniereDateDisponible() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('cotations')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data?.date ?? null
}
