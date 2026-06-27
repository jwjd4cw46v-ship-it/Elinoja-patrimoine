/**
 * POSITIONS ENGINE — ELINOJA PATRIMOINE
 * State machine de gestion de position
 */

// ─── Types ────────────────────────────────────────────────────────
export type PositionState = 'OPEN' | 'PARTIALLY_SOLD' | 'RUNNING' | 'CLOSED'
export type AlertType = 'STOP_LOSS' | 'TAKE_PROFIT_R1' | 'TAKE_PROFIT_R2' | 'TAKE_PROFIT_R3' | 'RUNNER_STOP'
export type VenteNiveau = 'R1' | 'R2' | 'R3' | 'RUNNER' | 'STOP' | 'MANUEL'

export interface PositionInput {
  ticker:   string
  p0:       number  // prix d'entrée
  quantite: number  // quantité totale
  support:  number
  r1:       number
  r2?:      number
  r3?:      number
  note?:    string
}

export interface Position {
  id:                string
  user_id:           string
  ticker:            string
  state:             PositionState
  prix_moyen:        number
  quantite_totale:   number
  quantite_restante: number
  support:           number
  r1:                number
  r2?:               number | null
  r3?:               number | null
  stop_initial:      number
  stop_actuel:       number
  stop_runner?:      number | null
  q1_cible:          number
  q2_cible?:         number | null
  q3_cible?:         number | null
  runner_cible:      number
  r1_atteint:        boolean
  r2_atteint:        boolean
  r3_atteint:        boolean
  pnl_realise:       number
  prix_max_observe?: number | null
  note?:             string
  created_at:        string
  updated_at:        string
  closed_at?:        string | null
}

export interface VenteInput {
  quantite:   number
  prix_vente: number
  niveau:     VenteNiveau
}

export interface AlertePosition {
  id:           string
  position_id:  string
  type:         AlertType
  prix_trigger: number
  prix_marche:  number
  is_read:      boolean
  is_acted:     boolean
  created_at:   string
}

// ─── Calculs ──────────────────────────────────────────────────────

/**
 * Répartition des quantités selon le nombre de résistances
 */
export function calculerRepartition(Q: number, r1: number, r2?: number, r3?: number) {
  if (r3 && r2) {
    // 3 résistances : Fibonacci complet
    return {
      q1:     Math.round(Q * 0.236 * 100) / 100,  // 23.6%
      q2:     Math.round(Q * 0.382 * 100) / 100,  // 38.2%
      q3:     Math.round(Q * 0.236 * 100) / 100,  // 23.6%
      runner: Math.round(Q * 0.146 * 100) / 100,  // 14.6%
    }
  } else if (r2) {
    // 2 résistances
    return {
      q1:     Math.round(Q * 0.618 * 100) / 100,  // 61.8%
      q2:     Math.round(Q * 0.232 * 100) / 100,  // 23.2%
      q3:     null,
      runner: Math.round(Q * 0.150 * 100) / 100,  // 15%
    }
  } else {
    // 1 résistance
    return {
      q1:     Math.round(Q * 0.786 * 100) / 100,  // 78.6%
      q2:     null,
      q3:     null,
      runner: Math.round(Q * 0.214 * 100) / 100,  // 21.4%
    }
  }
}

/**
 * Stops dynamiques selon le niveau atteint
 */
export function calculerStops(
  support: number, r1: number, r2?: number, r3?: number,
  prixMax?: number
) {
  const stop0 = support * (1 - 0.03)                          // Stop initial
  const stop1 = r1 - 0.618 * (r1 - support)                   // Après R1
  const stop2 = r2 ? r2 - 0.618 * (r2 - r1) : null           // Après R2
  const stop3 = r3 && r2 ? r3 - 0.618 * (r3 - r2) : null     // Après R3
  const stopRunner = prixMax ? prixMax * (1 - 0.03) : null    // Trailing -3%
  return { stop0, stop1, stop2, stop3, stopRunner }
}

/**
 * Prix moyen pondéré (DCA)
 */
export function calculerPrixMoyen(
  achats: { quantite: number; prix_achat: number }[]
): number {
  const totalVal = achats.reduce((s, a) => s + a.quantite * a.prix_achat, 0)
  const totalQte = achats.reduce((s, a) => s + a.quantite, 0)
  return totalQte > 0 ? totalVal / totalQte : 0
}

/**
 * P&L d'une vente
 */
export function calculerPnlVente(
  quantite: number, prixVente: number, prixMoyen: number
): number {
  return Math.round((quantite * (prixVente - prixMoyen)) * 1000) / 1000
}

/**
 * Détection des alertes à partir du prix courant (t-15min)
 * Retourne la liste des alertes à déclencher (idempotent)
 * Alertes : STOP_LOSS, TAKE_PROFIT_R1/R2/R3, RUNNER_STOP uniquement
 */
export function detecterAlertes(
  position: Position,
  prixCourant: number,
  alertesExistantes: AlertePosition[]
): { type: AlertType; prix_trigger: number }[] {
  const alertes: { type: AlertType; prix_trigger: number }[] = []
  const deja = (type: AlertType) =>
    alertesExistantes.some(a => a.type === type && !a.is_acted)

  // Stop loss — prix <= stop actuel
  if (prixCourant <= position.stop_actuel && !deja('STOP_LOSS')) {
    alertes.push({ type: 'STOP_LOSS', prix_trigger: position.stop_actuel })
  }

  // R1 — prix >= R1 et R1 pas encore atteint
  if (!position.r1_atteint && prixCourant >= position.r1 && !deja('TAKE_PROFIT_R1')) {
    alertes.push({ type: 'TAKE_PROFIT_R1', prix_trigger: position.r1 })
  }

  // R2 — R1 déjà atteint, prix >= R2 et R2 pas encore atteint
  if (position.r1_atteint && position.r2 &&
      !position.r2_atteint && prixCourant >= position.r2 && !deja('TAKE_PROFIT_R2')) {
    alertes.push({ type: 'TAKE_PROFIT_R2', prix_trigger: position.r2 })
  }

  // R3 — R2 déjà atteint, prix >= R3 et R3 pas encore atteint
  if (position.r2_atteint && position.r3 &&
      !position.r3_atteint && prixCourant >= position.r3 && !deja('TAKE_PROFIT_R3')) {
    alertes.push({ type: 'TAKE_PROFIT_R3', prix_trigger: position.r3 })
  }

  // Runner stop — position en mode RUNNING et prix <= stop runner
  if (position.state === 'RUNNING' && position.stop_runner &&
      prixCourant <= position.stop_runner && !deja('RUNNER_STOP')) {
    alertes.push({ type: 'RUNNER_STOP', prix_trigger: position.stop_runner })
  }

  return alertes
}

/**
 * Libellé humain d'une alerte
 */
export function labelAlerte(type: AlertType): { titre: string; couleur: string; emoji: string } {
  const map: Record<AlertType, { titre: string; couleur: string; emoji: string }> = {
    STOP_LOSS:       { titre: 'Stop Loss atteint',       couleur: '#FF1744', emoji: '🛑' },
    TAKE_PROFIT_R1:  { titre: 'Objectif R1 atteint',     couleur: '#00C853', emoji: '🎯' },
    TAKE_PROFIT_R2:  { titre: 'Objectif R2 atteint',     couleur: '#00C853', emoji: '🎯' },
    TAKE_PROFIT_R3:  { titre: 'Objectif R3 atteint',     couleur: '#D4AF37', emoji: '🏆' },
    RUNNER_STOP:     { titre: 'Stop Runner déclenché',   couleur: '#FF9800', emoji: '🏃' },
  }
  return map[type]
}

/**
 * Message de clôture
 */
export function messageCloture(pnl: number, ticker: string): string {
  if (pnl >= 0) {
    return `🎉 Félicitations ! Vous avez gagné ${pnl.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT brut sur votre position ${ticker}.`
  } else {
    return `📉 Malheureusement, vous avez perdu ${Math.abs(pnl).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DT brut sur votre position ${ticker}.`
  }
}

/**
 * Prochain stop selon l'état
 */
export function prochainStop(position: Position): number {
  const { stop0, stop1, stop2, stop3 } = calculerStops(
    position.support, position.r1, position.r2 ?? undefined, position.r3 ?? undefined
  )
  if (position.r3_atteint) return stop3 ?? stop2 ?? stop1 ?? stop0
  if (position.r2_atteint) return stop2 ?? stop1 ?? stop0
  if (position.r1_atteint) return stop1
  return stop0
}
