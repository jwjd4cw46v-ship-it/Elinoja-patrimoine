// ─── Elinoja AI — Tool Executor ───────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  const supabase = createClient()

  switch (name) {

    // ── Données boursières ──────────────────────────────────────────────────
    case 'getStockData': {
      const { symbol } = args
      try {
        const res  = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cotations`, { cache: 'no-store' })
        const data = res.ok ? await res.json() : null
        const market = data?.markets?.find((m: any) =>
          m.referentiel?.ticker?.toUpperCase() === symbol.toUpperCase()
        )
        const { data: entreprise } = await supabase
          .from('entreprises')
          .select('valeur, secteur, titres_admis, resultat_net_2025, dividende_2025')
          .ilike('mnemo', symbol)
          .single()
        if (!market && !entreprise) return { error: `Action "${symbol}" non trouvée sur la BVMT` }
        const cours = market?.last ?? null
        const titres = entreprise?.titres_admis ?? null
        const capitalisation = cours && titres ? (cours * titres / 1_000_000).toFixed(1) + ' M TND' : null
        return {
          symbol: symbol.toUpperCase(),
          nom: market?.referentiel?.stockName ?? entreprise?.valeur ?? symbol,
          secteur: entreprise?.secteur ?? 'N/A',
          cours, variation: market?.change ?? null, seance: market?.seance ?? null,
          capitalisation, titres_admis: titres,
          dividende_2025: entreprise?.dividende_2025 ?? null,
          source: 'BVMT / Elinoja Patrimoine', timestamp: new Date().toISOString(),
        }
      } catch (e: any) { return { error: e.message } }
    }

    // ── Analyse technique ───────────────────────────────────────────────────
    case 'getTechnicalAnalysis': {
      const { symbol } = args
      const { data, error } = await supabase
        .from('technical_analyses')
        .select('ticker, title, signal, entry_price, target_price, stop_loss, description, created_at, status, potential_gain, risk_level')
        .ilike('ticker', symbol).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(1).single()
      if (error || !data) return { error: `Aucune analyse technique publiée pour "${symbol}"` }
      const potentiel = data.target_price && data.entry_price
        ? (((data.target_price - data.entry_price) / data.entry_price) * 100).toFixed(1) + '%'
        : data.potential_gain ? data.potential_gain + '%' : null
      return {
        symbol: data.ticker, titre: data.title, signal: data.signal,
        entrée: data.entry_price, objectif: data.target_price, stop: data.stop_loss,
        potentiel, risque: data.risk_level, description: data.description,
        publiée_le: new Date(data.created_at).toLocaleDateString('fr-FR'),
        source: 'Elinoja Patrimoine — Analyses Techniques',
      }
    }

    // ── Analyse fondamentale ────────────────────────────────────────────────
    case 'getFundamentalAnalysis': {
      const { symbol } = args
      const { data: fa } = await supabase
        .from('fundamental_analyses')
        .select('ticker, company_name, recommendation, target_price, pe_ratio, forward_pe, roe, roa, debt_to_equity, dividend_yield, earnings_growth, description, created_at')
        .ilike('ticker', symbol).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(1).single()
      const { data: ent } = await supabase
        .from('entreprises')
        .select('resultat_net_2025, titres_admis, benefice_par_action')
        .ilike('mnemo', symbol).single()
      if (!fa) return { error: `Aucune analyse fondamentale publiée pour "${symbol}"` }
      const bpa = ent?.benefice_par_action
        ?? (ent?.resultat_net_2025 && ent?.titres_admis
          ? ((ent.resultat_net_2025 * 1_000_000) / ent.titres_admis).toFixed(3) : null)
      return {
        symbol: fa.ticker, société: fa.company_name, recommandation: fa.recommendation,
        objectif_cours: fa.target_price,
        ratios: {
          PER: fa.pe_ratio, PER_forward: fa.forward_pe,
          ROE: fa.roe ? fa.roe + '%' : null, ROA: fa.roa ? fa.roa + '%' : null,
          DE_ratio: fa.debt_to_equity, BPA: bpa,
          rendement_div: fa.dividend_yield ? fa.dividend_yield + '%' : null,
          croissance_BN: fa.earnings_growth ? fa.earnings_growth + '%' : null,
        },
        description: fa.description,
        publiée_le: new Date(fa.created_at).toLocaleDateString('fr-FR'),
        source: 'Elinoja Patrimoine — Analyses Fondamentales',
      }
    }

    // ── Portefeuille type d'un intermédiaire ────────────────────────────────
    case 'getIntermediairePfType': {
      const { intermediaire } = args
      // Essai d'abord en correspondance exacte (insensible à la casse), puis
      // en partiel si rien trouvé — tolère les variations de saisie du user
      // ou du modèle (ex: "Amen Invest" vs "AMEN INVEST").
      let { data } = await supabase
        .from('intermediaire_pf_type')
        .select('societe, ticker, poids')
        .ilike('intermediaire', intermediaire)
        .order('poids', { ascending: false })
      if (!data?.length) {
        const fallback = await supabase
          .from('intermediaire_pf_type')
          .select('societe, ticker, poids')
          .ilike('intermediaire', `%${intermediaire}%`)
          .order('poids', { ascending: false })
        data = fallback.data ?? []
      }
      if (!data.length) return { message: `Aucun portefeuille type trouvé pour "${intermediaire}". Utilise listIntermediaires pour voir les intermédiaires disponibles.`, portefeuille: [] }
      return {
        intermediaire: intermediaire.toUpperCase(),
        nombre_lignes: data.length,
        portefeuille: data.map(r => ({ société: r.societe, ticker: r.ticker, poids: r.poids + '%' })),
        source: 'Elinoja Patrimoine — Portefeuilles Types des Intermédiaires',
      }
    }

    // ── Recommandations d'un intermédiaire ──────────────────────────────────
    case 'getIntermediaireRecommandations': {
      const { intermediaire } = args
      let { data } = await supabase
        .from('intermediaire_recommandations')
        .select('societe, ticker, cours_cible')
        .ilike('intermediaire', intermediaire)
        .order('societe', { ascending: true })
      if (!data?.length) {
        const fallback = await supabase
          .from('intermediaire_recommandations')
          .select('societe, ticker, cours_cible')
          .ilike('intermediaire', `%${intermediaire}%`)
          .order('societe', { ascending: true })
        data = fallback.data ?? []
      }
      if (!data.length) return { message: `Aucune recommandation trouvée pour "${intermediaire}". Utilise listIntermediaires pour voir les intermédiaires disponibles.`, recommandations: [] }
      return {
        intermediaire: intermediaire.toUpperCase(),
        nombre_lignes: data.length,
        recommandations: data.map(r => ({ société: r.societe, ticker: r.ticker, cours_cible: r.cours_cible })),
        source: 'Elinoja Patrimoine — Recommandations des Intermédiaires',
      }
    }

    // ── Liste des intermédiaires disponibles ────────────────────────────────
    case 'listIntermediaires': {
      const [pf, reco] = await Promise.all([
        supabase.from('intermediaire_pf_type').select('intermediaire'),
        supabase.from('intermediaire_recommandations').select('intermediaire'),
      ])
      const set = new Set<string>()
      ;(pf.data ?? []).forEach((r: any) => set.add(r.intermediaire))
      ;(reco.data ?? []).forEach((r: any) => set.add(r.intermediaire))
      const intermediaires = Array.from(set).sort()
      if (!intermediaires.length) return { message: 'Aucun intermédiaire n\'a encore de données publiées.', intermediaires: [] }
      return { total: intermediaires.length, intermediaires, source: 'Elinoja Patrimoine — Intermédiaires en Bourse' }
    }

    // ── Alertes watchlist ───────────────────────────────────────────────────
    case 'getWatchlistAlerts': {
      const { userId } = args
      const { data: watchlist } = await supabase
        .from('watchlists').select('ticker, alert_price_low, alert_price_high')
        .eq('user_id', userId)
      if (!watchlist?.length) return { message: 'Aucun titre dans la watchlist', alertes: [] }
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cotations`, { cache: 'no-store' })
      const cotData = res.ok ? await res.json() : null
      const markets = cotData?.markets ?? []
      const alertes = watchlist.map(w => {
        const market = markets.find((m: any) => m.referentiel?.ticker?.toUpperCase() === w.ticker?.toUpperCase())
        const cours = market?.last ?? null
        const status =
          cours && w.alert_price_low  && cours <= w.alert_price_low  ? '▼ SEUIL BAS FRANCHI' :
          cours && w.alert_price_high && cours >= w.alert_price_high ? '▲ SEUIL HAUT FRANCHI' : 'Dans la zone'
        return { ticker: w.ticker, cours, seuil_bas: w.alert_price_low, seuil_haut: w.alert_price_high, statut: status, alerte: status !== 'Dans la zone' }
      })
      return { total_titres: watchlist.length, alertes_actives: alertes.filter(a => a.alerte).length, détails: alertes, source: 'Watchlist personnelle Elinoja' }
    }

    // ── Positions / Portefeuille ────────────────────────────────────────────
    case 'getPositions': {
      const { userId, state } = args
      let query = supabase.from('positions')
        .select('id, ticker, state, prix_moyen, quantite_totale, quantite_restante, support, r1, r2, r3, stop_initial, stop_actuel, stop_runner, q1_cible, q2_cible, q3_cible, runner_cible, r1_atteint, r2_atteint, r3_atteint, pnl_realise, prix_max_observe, note, created_at, updated_at, closed_at')
        .eq('user_id', userId).order('created_at', { ascending: false })
      if (state) query = query.eq('state', state)
      const { data: positions, error } = await query
      if (error) return { error: error.message }
      if (!positions?.length) return { message: state ? `Aucune position ${state === 'open' ? 'ouverte' : 'clôturée'} trouvée` : 'Aucune position trouvée', positions: [] }
      let markets: any[] = []
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cotations`, { cache: 'no-store' })
        const cotData = res.ok ? await res.json() : null
        markets = cotData?.markets ?? []
      } catch {}
      const enriched = positions.map(p => {
        const market = markets.find((m: any) => m.referentiel?.ticker?.toUpperCase() === p.ticker?.toUpperCase())
        const coursActuel = market?.last ?? null
        const pnlLatent = coursActuel && p.prix_moyen && p.quantite_restante ? +((coursActuel - p.prix_moyen) * p.quantite_restante).toFixed(3) : null
        const pnlPct = coursActuel && p.prix_moyen ? +(((coursActuel - p.prix_moyen) / p.prix_moyen) * 100).toFixed(2) : null
        const objectifsAtteints = [p.r1_atteint ? 'R1' : null, p.r2_atteint ? 'R2' : null, p.r3_atteint ? 'R3' : null].filter(Boolean)
        return {
          ticker: p.ticker, statut: p.state === 'open' ? 'Ouverte' : 'Clôturée',
          prix_moyen: p.prix_moyen, quantite_totale: p.quantite_totale, quantite_restante: p.quantite_restante,
          cours_actuel: coursActuel, pnl_latent_tnd: pnlLatent, pnl_pct: pnlPct !== null ? pnlPct + '%' : null,
          pnl_realise: p.pnl_realise, support: p.support,
          objectifs: { r1: p.r1, r2: p.r2, r3: p.r3, runner: p.runner_cible },
          stops: { initial: p.stop_initial, actuel: p.stop_actuel, runner: p.stop_runner },
          quantites_cibles: { q1: p.q1_cible, q2: p.q2_cible, q3: p.q3_cible },
          objectifs_atteints: objectifsAtteints, prix_max_observe: p.prix_max_observe, note: p.note,
          ouvert_le: new Date(p.created_at).toLocaleDateString('fr-FR'),
          cloture_le: p.closed_at ? new Date(p.closed_at).toLocaleDateString('fr-FR') : null,
        }
      })
      const ouvertes = enriched.filter(p => p.statut === 'Ouverte')
      const pnlTotal = ouvertes.reduce((sum, p) => sum + (p.pnl_latent_tnd ?? 0), 0)
      return { total_positions: positions.length, positions_ouvertes: ouvertes.length, pnl_latent_total: +pnlTotal.toFixed(3) + ' TND', positions: enriched, source: 'Portefeuille Elinoja Patrimoine' }
    }

    // ── Avis d'experts ──────────────────────────────────────────────────────
    case 'getExpertOpinions': {
      const { symbol } = args

      const { data: opinions, error } = await supabase
        .from('expert_opinions')
        .select('ticker, signal, target_price, comment, cours_creation, created_at, updated_at, expires_at, profiles(full_name)')
        .ilike('ticker', symbol)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })

      if (error) return { error: error.message }
      if (!opinions?.length) return { message: `Aucun avis d'expert actif pour "${symbol}"`, avis: [] }

      // Cours live
      let coursActuel: number | null = null
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cotations`, { cache: 'no-store' })
        const data = res.ok ? await res.json() : {}
        const market = (data.markets ?? []).find((m: any) => m.referentiel?.ticker?.toUpperCase() === symbol.toUpperCase())
        coursActuel = market?.last ?? null
      } catch {}

      const SIGNAL_LABELS: Record<string, string> = {
        buy: 'Acheter', accumulate: 'Accumuler', hold: 'Conserver', reduce: 'Alléger', sell: 'Vendre',
      }
      const SIGNAL_SCORE: Record<string, number> = { buy: 5, accumulate: 4, hold: 3, reduce: 2, sell: 1 }

      const avis = (opinions as any[]).map(o => {
        const upside = o.target_price && coursActuel
          ? +(((o.target_price - coursActuel) / coursActuel) * 100).toFixed(2)
          : null
        const daysLeft = Math.ceil((new Date(o.expires_at).getTime() - Date.now()) / 86400000)
        return {
          expert:         o.profiles?.full_name ?? 'Expert',
          recommandation: SIGNAL_LABELS[o.signal] ?? o.signal,
          cours_cible:    o.target_price,
          upside:         upside !== null ? upside + '%' : null,
          commentaire:    o.comment,
          cours_à_la_création: o.cours_creation,
          publié_le:      new Date(o.created_at).toLocaleDateString('fr-FR'),
          mis_à_jour_le:  new Date(o.updated_at).toLocaleDateString('fr-FR'),
          expire_dans:    daysLeft + ' jours',
        }
      })

      // Consensus
      const counts: Record<string, number> = { buy: 0, accumulate: 0, hold: 0, reduce: 0, sell: 0 }
      let scoreSum = 0
      opinions.forEach((o: any) => { counts[o.signal]++; scoreSum += SIGNAL_SCORE[o.signal] })
      const avg = scoreSum / opinions.length
      const dominant = avg >= 4.5 ? 'buy' : avg >= 3.5 ? 'accumulate' : avg >= 2.5 ? 'hold' : avg >= 1.5 ? 'reduce' : 'sell'

      const withTarget = (opinions as any[]).filter(o => o.target_price)
      const objMoyen = withTarget.length
        ? withTarget.reduce((s: number, o: any) => s + o.target_price, 0) / withTarget.length
        : null
      const upsideMoyen = objMoyen && coursActuel
        ? +(((objMoyen - coursActuel) / coursActuel) * 100).toFixed(2)
        : null

      return {
        ticker:           symbol.toUpperCase(),
        cours_actuel:     coursActuel,
        nombre_experts:   opinions.length,
        consensus: {
          recommandation: SIGNAL_LABELS[dominant],
          score:          +avg.toFixed(2) + '/5',
          répartition:    counts,
        },
        objectif_moyen:   objMoyen ? +objMoyen.toFixed(3) : null,
        upside_moyen:     upsideMoyen !== null ? upsideMoyen + '%' : null,
        avis,
        source:           'Elinoja Patrimoine — Avis d\'Experts',
      }
    }

    // ── Articles ────────────────────────────────────────────────────────────
    case 'getArticles': {
      const limit = args.limit ?? 5
      const { data } = await supabase.from('announcements').select('title, content, created_at, type').order('created_at', { ascending: false }).limit(limit)
      return { articles: data?.map(a => ({ titre: a.title, résumé: a.content?.slice(0, 200) + (a.content?.length > 200 ? '…' : ''), type: a.type, date: new Date(a.created_at).toLocaleDateString('fr-FR') })) ?? [], source: 'Elinoja Patrimoine — Publications' }
    }

    // ── Recherche articles ──────────────────────────────────────────────────
    case 'searchArticles': {
      const { query } = args
      const { data } = await supabase.from('announcements').select('title, content, created_at').or(`title.ilike.%${query}%,content.ilike.%${query}%`).order('created_at', { ascending: false }).limit(5)
      return { query, résultats: data?.length ?? 0, articles: data?.map(a => ({ titre: a.title, résumé: a.content?.slice(0, 150) + '…', date: new Date(a.created_at).toLocaleDateString('fr-FR') })) ?? [] }
    }

    // ── Forum ───────────────────────────────────────────────────────────────
    case 'getForumPosts': {
      const limit = args.limit ?? 5
      const { data } = await supabase.from('forum_posts').select('titre, contenu, created_at, likes_count, replies_count, profiles(full_name)').order('created_at', { ascending: false }).limit(limit)
      return { posts: data?.map((p: any) => ({ titre: p.titre, résumé: p.contenu?.slice(0, 200) + '…', auteur: p.profiles?.full_name ?? 'Anonyme', date: new Date(p.created_at).toLocaleDateString('fr-FR'), likes: p.likes_count ?? 0, réponses: p.replies_count ?? 0 })) ?? [], source: 'Forum Elinoja Patrimoine' }
    }

    // ── Recherche forum ─────────────────────────────────────────────────────
    case 'searchForum': {
      const { query } = args
      const { data } = await supabase.from('forum_posts').select('titre, contenu, created_at, profiles(full_name)').or(`titre.ilike.%${query}%,contenu.ilike.%${query}%`).order('created_at', { ascending: false }).limit(5)
      return { query, résultats: data?.length ?? 0, posts: data?.map((p: any) => ({ titre: p.titre, résumé: p.contenu?.slice(0, 150) + '…', auteur: p.profiles?.full_name ?? 'Anonyme', date: new Date(p.created_at).toLocaleDateString('fr-FR') })) ?? [] }
    }

    // ── Publications CMF ────────────────────────────────────────────────────
    case 'getCMFAnnouncements': {
      const { ticker, limit = 5 } = args
      let query = supabase.from('cmf_announcements').select('title, company, ticker, category, content, pdf_url').order('id', { ascending: false }).limit(limit)
      if (ticker) query = query.ilike('ticker', ticker)
      const { data } = await query
      if (!data?.length) return { message: ticker ? `Aucune publication CMF pour "${ticker}"` : 'Aucune publication CMF disponible', publications: [] }
      return { total: data.length, publications: data.map(p => ({ titre: p.title, société: p.company, ticker: p.ticker, catégorie: p.category, résumé: p.content?.slice(0, 200) + (p.content?.length > 200 ? '…' : ''), pdf: p.pdf_url ?? null })), source: 'CMF — Conseil du Marché Financier Tunisien' }
    }

    // ── Navigation ──────────────────────────────────────────────────────────
    case 'navigateTo': {
      const routes: Record<string, string> = {
        dashboard: '/client', analyses: '/client/analyses', fondamentales: '/client/fondamentales',
        watchlist: '/client/watchlist', portefeuille: '/client/portefeuille',
        forum: '/client/forum', annonces: '/client/annonces', marches: '/client/marches',
        cotations: '/client/cotations', cmf: '/client/cmf', calendrier: '/client/calendrier',
        'avis-experts': '/client/avis-experts',
      }
      return { action: 'navigate', page: args.page, url: routes[args.page] ?? '/client', message: `Navigation vers ${args.page}` }
    }

    default:
      return { error: `Tool inconnu: ${name}` }
  }
}
