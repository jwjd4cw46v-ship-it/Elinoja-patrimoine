// ─── Elinoja AI — Tool Executor ───────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  const supabase = createClient()

  switch (name) {

    // ── Données boursières ──────────────────────────────────────────────────
    case 'getStockData': {
      const { symbol } = args
      try {
        // Cotation live depuis l'API BVMT
        const res  = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cotations`, { cache: 'no-store' })
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
        .select('ticker, company_name, recommendation, entry_price, target_price, stop_loss, description, created_at, status')
        .ilike('ticker', symbol)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return { error: `Aucune analyse technique publiée pour "${symbol}"` }

      const potentiel = data.target_price && data.entry_price
        ? (((data.target_price - data.entry_price) / data.entry_price) * 100).toFixed(1) + '%'
        : null

      return {
        symbol:      data.ticker,
        société:     data.company_name,
        signal:      data.recommendation,
        entrée:      data.entry_price,
        objectif:    data.target_price,
        stop:        data.stop_loss,
        potentiel,
        description: data.description,
        publiée_le:  new Date(data.created_at).toLocaleDateString('fr-FR'),
        source:      'Elinoja Patrimoine — Analyses Techniques',
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
      const res     = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cotations`, { cache: 'no-store' })
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
      }
      return {
        action:    'navigate',
        page:      args.page,
        url:       routes[args.page] ?? '/client',
        message:   `Navigation vers ${args.page}`,
      }
    }

    default:
      return { error: `Tool inconnu: ${name}` }
  }
}
