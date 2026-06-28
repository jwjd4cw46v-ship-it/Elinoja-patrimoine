// ─── Elinoja AI — Tool Executor ───────────────────────────────────────────────
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  const supabase = createClient()
  const serviceSupabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  switch (name) {

    // ── Données boursières ──────────────────────────────────────────────────
    case 'getStockData': {
      const { symbol } = args
      try {
        // Cotation live depuis l'API BVMT
        const res  = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://elinoja-patrimoine-app-v02-286iv7tg6-iteb-ouerghi-s-projects.vercel.app'}/api/cotations`, { cache: 'no-store' })
        const data = res.ok ? await res.json() : null
        const market = data?.markets?.find((m: any) =>
          m.referentiel?.ticker?.toUpperCase() === symbol.toUpperCase()
        )

        // Données entreprise depuis Supabase
        const { data: entreprise } = await supabase
          .from('entreprises')
          .select('valeur, secteur, titres_admis, resultat_net_2025, dividende_2025')
          .ilike('mnemo', symbol)
          .single()

        if (!market && !entreprise) {
          return { error: `Action "${symbol}" non trouvée sur la BVMT` }
        }

        const cours = market?.last ?? null
        const titres = entreprise?.titres_admis ?? null
        const capitalisation = cours && titres ? (cours * titres / 1_000_000).toFixed(1) + ' M TND' : null

        return {
          symbol:         symbol.toUpperCase(),
          nom:            market?.referentiel?.stockName ?? entreprise?.valeur ?? symbol,
          secteur:        entreprise?.secteur ?? 'N/A',
          cours:          cours,
          variation:      market?.change ?? null,
          seance:         market?.seance ?? null,
          capitalisation,
          titres_admis:   titres,
          dividende_2025: entreprise?.dividende_2025 ?? null,
          source:         'BVMT / Elinoja Patrimoine',
          timestamp:      new Date().toISOString(),
        }
      } catch (e: any) {
        return { error: e.message }
      }
    }

    // ── Analyse technique ───────────────────────────────────────────────────
    case 'getTechnicalAnalysis': {
      const { symbol } = args
      const { data, error } = await supabase
        .from('technical_analyses')
        .select('ticker, title, signal, entry_price, target_price, stop_loss, description, created_at, status, potential_gain, risk_level')
        .ilike('ticker', symbol)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return { error: `Aucune analyse technique publiée pour "${symbol}"` }

      const potentiel = data.target_price && data.entry_price
        ? (((data.target_price - data.entry_price) / data.entry_price) * 100).toFixed(1) + '%'
        : data.potential_gain ? data.potential_gain + '%' : null

      return {
        symbol:        data.ticker,
        titre:         data.title,
        signal:        data.signal,
        entrée:        data.entry_price,
        objectif:      data.target_price,
        stop:          data.stop_loss,
        potentiel,
        risque:        data.risk_level,
        description:   data.description,
        publiée_le:    new Date(data.created_at).toLocaleDateString('fr-FR'),
        source:        'Elinoja Patrimoine — Analyses Techniques',
      }
    }

    // ── Analyse fondamentale ────────────────────────────────────────────────
    case 'getFundamentalAnalysis': {
      const { symbol } = args

      const { data: fa } = await supabase
        .from('fundamental_analyses')
        .select('ticker, company_name, recommendation, target_price, pe_ratio, forward_pe, roe, roa, debt_to_equity, dividend_yield, earnings_growth, description, created_at')
        .ilike('ticker', symbol)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { data: ent } = await supabase
        .from('entreprises')
        .select('resultat_net_2025, titres_admis, benefice_par_action')
        .ilike('mnemo', symbol)
        .single()

      if (!fa) return { error: `Aucune analyse fondamentale publiée pour "${symbol}"` }

      const bpa = ent?.benefice_par_action
        ?? (ent?.resultat_net_2025 && ent?.titres_admis
          ? ((ent.resultat_net_2025 * 1_000_000) / ent.titres_admis).toFixed(3)
          : null)

      return {
        symbol:         fa.ticker,
        société:        fa.company_name,
        recommandation: fa.recommendation,
        objectif_cours: fa.target_price,
        ratios: {
          PER:           fa.pe_ratio,
          PER_forward:   fa.forward_pe,
          ROE:           fa.roe ? fa.roe + '%' : null,
          ROA:           fa.roa ? fa.roa + '%' : null,
          DE_ratio:      fa.debt_to_equity,
          BPA:           bpa,
          rendement_div: fa.dividend_yield ? fa.dividend_yield + '%' : null,
          croissance_BN: fa.earnings_growth ? fa.earnings_growth + '%' : null,
        },
        description: fa.description,
        publiée_le:  new Date(fa.created_at).toLocaleDateString('fr-FR'),
        source:      'Elinoja Patrimoine — Analyses Fondamentales',
      }
    }

    // ── Alertes watchlist ───────────────────────────────────────────────────
    case 'getWatchlistAlerts': {
      const { userId } = args
      const { data: watchlist } = await supabase
        .from('watchlists')
        .select('ticker, alert_price_low, alert_price_high')
        .eq('user_id', userId)

      if (!watchlist?.length) return { message: 'Aucun titre dans la watchlist', alertes: [] }

      // Cotations live
      const res     = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://elinoja-patrimoine-app-v02-286iv7tg6-iteb-ouerghi-s-projects.vercel.app'}/api/cotations`, { cache: 'no-store' })
      const cotData = res.ok ? await res.json() : null
      const markets = cotData?.markets ?? []

      const alertes = watchlist
        .map(w => {
          const market = markets.find((m: any) =>
            m.referentiel?.ticker?.toUpperCase() === w.ticker?.toUpperCase()
          )
          const cours = market?.last ?? null
          const status =
            cours && w.alert_price_low  && cours < w.alert_price_low  ? '▼ SEUIL BAS FRANCHI' :
            cours && w.alert_price_high && cours > w.alert_price_high ? '▲ SEUIL HAUT FRANCHI' :
            'Dans la zone'

          return {
            ticker:    w.ticker,
            cours,
            seuil_bas:  w.alert_price_low,
            seuil_haut: w.alert_price_high,
            statut:    status,
            alerte:    status !== 'Dans la zone',
          }
        })

      const actives = alertes.filter(a => a.alerte)
      return {
        total_titres:   watchlist.length,
        alertes_actives: actives.length,
        détails:         alertes,
        source:         'Watchlist personnelle Elinoja',
      }
    }

    // ── Articles ────────────────────────────────────────────────────────────
    case 'getArticles': {
      const limit = args.limit ?? 5
      const { data } = await supabase
        .from('announcements')
        .select('title, content, created_at, type')
        .order('created_at', { ascending: false })
        .limit(limit)

      return {
        articles: data?.map(a => ({
          titre:    a.title,
          résumé:   a.content?.slice(0, 200) + (a.content?.length > 200 ? '…' : ''),
          type:     a.type,
          date:     new Date(a.created_at).toLocaleDateString('fr-FR'),
        })) ?? [],
        source: 'Elinoja Patrimoine — Publications',
      }
    }

    // ── Recherche articles ──────────────────────────────────────────────────
    case 'searchArticles': {
      const { query } = args
      const { data } = await supabase
        .from('announcements')
        .select('title, content, created_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      return {
        query,
        résultats: data?.length ?? 0,
        articles: data?.map(a => ({
          titre:   a.title,
          résumé:  a.content?.slice(0, 150) + '…',
          date:    new Date(a.created_at).toLocaleDateString('fr-FR'),
        })) ?? [],
      }
    }

    // ── Forum ───────────────────────────────────────────────────────────────
    case 'getForumPosts': {
      const limit = args.limit ?? 5
      const { data } = await supabase
        .from('forum_posts')
        .select('titre, contenu, created_at, likes_count, replies_count, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)

      return {
        posts: data?.map((p: any) => ({
          titre:    p.titre,
          résumé:   p.contenu?.slice(0, 200) + '…',
          auteur:   p.profiles?.full_name ?? 'Anonyme',
          date:     new Date(p.created_at).toLocaleDateString('fr-FR'),
          likes:    p.likes_count ?? 0,
          réponses: p.replies_count ?? 0,
        })) ?? [],
        source: 'Forum Elinoja Patrimoine',
      }
    }

    // ── Recherche forum ─────────────────────────────────────────────────────
    case 'searchForum': {
      const { query } = args
      const { data } = await supabase
        .from('forum_posts')
        .select('titre, contenu, created_at, profiles(full_name)')
        .or(`titre.ilike.%${query}%,contenu.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      return {
        query,
        résultats: data?.length ?? 0,
        posts: data?.map((p: any) => ({
          titre:  p.titre,
          résumé: p.contenu?.slice(0, 150) + '…',
          auteur: p.profiles?.full_name ?? 'Anonyme',
          date:   new Date(p.created_at).toLocaleDateString('fr-FR'),
        })) ?? [],
      }
    }

    // ── Publications CMF ────────────────────────────────────────────────────
    case 'getCMFAnnouncements': {
      const { ticker, limit = 5 } = args
      let query = supabase
        .from('cmf_announcements')
        .select('title, company, ticker, category, content, pdf_url, pdf_filename')
        .order('id', { ascending: false })
        .limit(limit)

      if (ticker) query = query.ilike('ticker', ticker)

      const { data } = await query

      if (!data?.length) return { message: ticker ? `Aucune publication CMF pour "${ticker}"` : 'Aucune publication CMF disponible', publications: [] }

      return {
        total:        data.length,
        publications: data.map(p => ({
          titre:    p.title,
          société:  p.company,
          ticker:   p.ticker,
          catégorie: p.category,
          résumé:   p.content?.slice(0, 200) + (p.content?.length > 200 ? '…' : ''),
          pdf:      p.pdf_url ?? null,
        })),
        source: 'CMF — Conseil du Marché Financier Tunisien',
      }
    }


    // ── Navigation ──────────────────────────────────────────────────────────
    case 'navigateTo': {
      const routes: Record<string, string> = {
        dashboard:     '/client',
        analyses:      '/client/analyses',
        fondamentales: '/client/fondamentales',
        watchlist:     '/client/watchlist',
        forum:         '/client/forum',
        annonces:      '/client/annonces',
        marches:       '/client/marches',
        cotations:     '/client/cotations',
        cmf:           '/client/cmf',
        calendrier:    '/client/calendrier',
        positions:     '/client/positions',
      }
      return {
        action:    'navigate',
        page:      args.page,
        url:       routes[args.page] ?? '/client',
        message:   `Navigation vers ${args.page}`,
      }
    }

    // ── Positions de trading ────────────────────────────────────────────────
    case 'getPositions': {
      const { state } = args
      const userId = args.userId || user?.id
      if (!userId) return { error: 'Utilisateur non connecté' }

      let query = serviceSupabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (state) query = query.eq('state', state)
      else        query = query.neq('state', 'CLOSED')

      const { data, error } = await query
      console.log('[getPositions] userId:', userId, 'error:', error?.message, 'count:', data?.length ?? 0)
      if (error || !data?.length) return { message: 'Aucune position ouverte', positions: [] }

      const res     = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://elinoja-patrimoine-app-v02-286iv7tg6-iteb-ouerghi-s-projects.vercel.app'}/api/cotations`, { cache: 'no-store' })
      const cotData = res.ok ? await res.json() : null
      const markets = cotData?.markets ?? []

      return {
        total: data.length,
        positions: data.map((p: any) => {
          const market    = markets.find((m: any) => m.referentiel?.ticker?.toUpperCase() === p.ticker?.toUpperCase())
          const cours     = market?.last ?? null
          const pnlLatent = cours ? ((cours - p.prix_moyen) * p.quantite_restante).toFixed(2) : null
          const pnlPct    = cours ? (((cours - p.prix_moyen) / p.prix_moyen) * 100).toFixed(2) : null
          return {
            ticker:            p.ticker,
            état:              p.state,
            prix_entrée:       p.prix_moyen,
            cours_actuel:      cours,
            quantité_restante: p.quantite_restante,
            quantité_totale:   p.quantite_totale,
            stop_actuel:       p.stop_actuel,
            résistances:       { R1: p.r1, R2: p.r2 ?? null, R3: p.r3 ?? null },
            niveaux_atteints:  { R1: p.r1_atteint, R2: p.r2_atteint, R3: p.r3_atteint },
            pnl_latent:        pnlLatent ? `${pnlLatent} DT` : 'N/A',
            pnl_pct:           pnlPct    ? `${pnlPct}%`      : 'N/A',
            pnl_réalisé:       `${p.pnl_realise ?? 0} DT`,
            ouvert_le:         new Date(p.created_at).toLocaleDateString('fr-FR'),
          }
        }),
        source: 'Elinoja Patrimoine — Gestion de positions',
      }
    }

    // ── Détail d'une position ───────────────────────────────────────────────
    case 'getPositionDetail': {
      const { ticker } = args
      const userId = args.userId || user?.id
      if (!userId) return { error: 'Utilisateur non connecté' }

      const { data: pos } = await serviceSupabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .ilike('ticker', ticker)
        .neq('state', 'CLOSED')
        .single()

      if (!pos) return { error: `Aucune position active sur ${ticker}` }

      const [{ data: ventes }, { data: alertes }] = await Promise.all([
        serviceSupabase.from('position_ventes')
          .select('niveau, prix_vente, quantite, pnl, created_at')
          .eq('position_id', pos.id)
          .order('created_at', { ascending: true }),
        serviceSupabase.from('position_alertes')
          .select('type, prix_trigger, prix_marche, is_acted, created_at')
          .eq('position_id', pos.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const res    = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://elinoja-patrimoine-app-v02-286iv7tg6-iteb-ouerghi-s-projects.vercel.app'}/api/cotations`, { cache: 'no-store' })
      const data   = res.ok ? await res.json() : null
      const market = data?.markets?.find((m: any) => m.referentiel?.ticker?.toUpperCase() === ticker.toUpperCase())
      const cours  = market?.last ?? null
      const pnlLatent = cours ? (cours - pos.prix_moyen) * pos.quantite_restante : null

      return {
        ticker:      pos.ticker,
        état:        pos.state,
        cours,
        prix_moyen:  pos.prix_moyen,
        support:     pos.support,
        résistances: { R1: pos.r1, R2: pos.r2 ?? null, R3: pos.r3 ?? null },
        niveaux_atteints: { R1: pos.r1_atteint, R2: pos.r2_atteint, R3: pos.r3_atteint },
        stop_actuel: pos.stop_actuel,
        quantités: {
          totale:   pos.quantite_totale,
          restante: pos.quantite_restante,
          vendue:   pos.quantite_totale - pos.quantite_restante,
          q1_cible: pos.q1_cible,
          q2_cible: pos.q2_cible ?? null,
          q3_cible: pos.q3_cible ?? null,
          runner:   pos.runner_cible,
        },
        pnl: {
          latent:  pnlLatent ? `${pnlLatent.toFixed(2)} DT` : 'N/A',
          réalisé: `${pos.pnl_realise ?? 0} DT`,
          total:   pnlLatent
            ? `${(pnlLatent + (pos.pnl_realise ?? 0)).toFixed(2)} DT`
            : `${pos.pnl_realise ?? 0} DT`,
        },
        historique_ventes: ventes?.map((v: any) => ({
          niveau: v.niveau, prix: v.prix_vente,
          quantité: v.quantite, pnl: `${v.pnl} DT`,
          date: new Date(v.created_at).toLocaleDateString('fr-FR'),
        })) ?? [],
        alertes_récentes: alertes?.map((a: any) => ({
          type: a.type, trigger: a.prix_trigger,
          marché: a.prix_marche, traitée: a.is_acted,
          date: new Date(a.created_at).toLocaleDateString('fr-FR'),
        })) ?? [],
        source: 'Elinoja Patrimoine — Gestion de positions',
      }
    }

    // ── Alertes positions non traitées ──────────────────────────────────────
    case 'getPositionAlerts': {
      const userId = args.userId || user?.id
      if (!userId) return { error: 'Utilisateur non connecté' }

      const { data: alertes } = await serviceSupabase
        .from('position_alertes')
        .select('type, prix_trigger, prix_marche, is_acted, created_at, positions(ticker, stop_actuel, quantite_restante)')
        .eq('user_id', userId)
        .eq('is_acted', false)
        .order('created_at', { ascending: false })

      if (!alertes?.length) return { message: "Aucune alerte en attente d'action", alertes: [] }

      const labelMap: Record<string, string> = {
        STOP_LOSS:      '🛑 Stop Loss atteint — sortie recommandée immédiatement',
        TAKE_PROFIT_R1: '🎯 Objectif R1 atteint — vente partielle recommandée',
        TAKE_PROFIT_R2: '🎯 Objectif R2 atteint — vente partielle recommandée',
        TAKE_PROFIT_R3: '🏆 Objectif R3 atteint — vente partielle recommandée',
        BREAK_EVEN:     '⚖️ Break Even atteint — position sécurisée',
        RUNNER_STOP:    '🏃 Stop Runner déclenché — sortir le runner',
      }

      return {
        total:   alertes.length,
        message: `${alertes.length} alerte(s) en attente d'action`,
        alertes: alertes.map((a: any) => ({
          ticker:       (a.positions as any)?.ticker ?? 'N/A',
          type:         labelMap[a.type] ?? a.type,
          prix_trigger: a.prix_trigger,
          prix_marché:  a.prix_marche,
          qté_restante: (a.positions as any)?.quantite_restante ?? 'N/A',
          date:         new Date(a.created_at).toLocaleDateString('fr-FR'),
        })),
        source: 'Elinoja Patrimoine — Alertes positions',
      }
    }

    // ── Résumé portefeuille ─────────────────────────────────────────────────
    case 'getPortfolioSummary': {
      const userId = args.userId || user?.id
      if (!userId) return { error: 'Utilisateur non connecté' }

      const { data: positions } = await serviceSupabase
        .from('positions')
        .select('ticker, state, prix_moyen, quantite_restante, quantite_totale, pnl_realise')
        .eq('user_id', userId)

      if (!positions?.length) return { message: 'Aucune position dans le portefeuille', portefeuille: null }

      const res     = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://elinoja-patrimoine-app-v02-286iv7tg6-iteb-ouerghi-s-projects.vercel.app'}/api/cotations`, { cache: 'no-store' })
      const cotData = res.ok ? await res.json() : null
      const markets = cotData?.markets ?? []

      let capitalEngage = 0, pnlLatentTotal = 0, pnlRealiseTotal = 0

      const détails = positions.map((p: any) => {
        const market   = markets.find((m: any) => m.referentiel?.ticker?.toUpperCase() === p.ticker?.toUpperCase())
        const cours    = market?.last ?? null
        const latent   = cours ? (cours - p.prix_moyen) * p.quantite_restante : 0
        capitalEngage   += p.prix_moyen * p.quantite_restante
        pnlLatentTotal  += latent
        pnlRealiseTotal += p.pnl_realise ?? 0
        return {
          ticker:      p.ticker,
          état:        p.state,
          cours,
          pnl_latent:  `${latent.toFixed(2)} DT`,
          pnl_réalisé: `${p.pnl_realise ?? 0} DT`,
        }
      })

      const pnlTotal   = pnlLatentTotal + pnlRealiseTotal
      const perfGlobal = capitalEngage > 0 ? ((pnlTotal / capitalEngage) * 100).toFixed(2) : '0'

      return {
        résumé: {
          positions_totales:  positions.length,
          positions_ouvertes: positions.filter((p: any) => p.state !== 'CLOSED').length,
          capital_engagé:     `${capitalEngage.toFixed(0)} DT`,
          pnl_latent:         `${pnlLatentTotal.toFixed(2)} DT`,
          pnl_réalisé:        `${pnlRealiseTotal.toFixed(2)} DT`,
          pnl_total:          `${pnlTotal.toFixed(2)} DT`,
          performance:        `${perfGlobal}%`,
        },
        détails,
        source: 'Elinoja Patrimoine — Portefeuille',
      }
    }

        default:
      return { error: `Tool inconnu: ${name}` }
  }
}
