// ─── Elinoja AI — Types ───────────────────────────────────────────────────────

export interface Message {
  id:        string
  role:      'user' | 'assistant' | 'tool'
  content:   string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  createdAt: Date
}

export interface ToolCall {
  id:       string
  name:     string
  args:     Record<string, any>
}

export interface ToolResult {
  toolCallId: string
  name:       string
  result:     any
}

export interface Conversation {
  id:        string
  userId:    string
  title:     string
  messages:  Message[]
  createdAt: Date
  updatedAt: Date
}

export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'getStockData',
      description: "Recupere les donnees boursieres en temps reel d'une action BVMT : cours actuel, variation, capitalisation.",
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Le ticker de action (ex: BIAT, SFBT, TGH)' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTechnicalAnalysis',
      description: "Recupere l'analyse technique publiee pour une action : signal, objectif de cours, stop loss, point d'entree.",
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Le ticker de action' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getFundamentalAnalysis',
      description: "Recupere l'analyse fondamentale d'une action : PER, ROE, ROA, BPA, objectif de cours.",
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Le ticker de action' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getWatchlistAlerts',
      description: "Recupere les alertes de franchissement de seuil actives pour l'utilisateur connecte.",
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: "L'ID de l'utilisateur" },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getArticles',
      description: 'Recupere les derniers articles et publications financieres de la plateforme.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: "Nombre d'articles a retourner (defaut: 5)" },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'searchArticles',
      description: 'Recherche dans les articles publies sur la plateforme.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termes de recherche' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getForumPosts',
      description: 'Recupere les dernieres discussions du forum investisseurs.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Nombre de posts a retourner (defaut: 5)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'searchForum',
      description: 'Recherche dans les discussions du forum.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termes de recherche' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCMFAnnouncements',
      description: 'Recupere les publications officielles du CMF. Peut filtrer par ticker.',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Ticker de la societe (optionnel)' },
          limit:  { type: 'number', description: 'Nombre de publications (defaut: 5)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPositions',
      description: "Recupere toutes les positions boursieres actives de l'utilisateur avec cours live, P&L latent et niveaux R1/R2/R3.",
      parameters: {
        type: 'object',
        properties: {
          state: {
            type: 'string',
            enum: ['OPEN', 'PARTIALLY_SOLD', 'RUNNING', 'CLOSED'],
            description: 'Filtrer par etat (defaut: toutes sauf CLOSED)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPositionDetail',
      description: "Recupere le detail complet d'une position : niveaux, stops, historique des ventes, alertes.",
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: "Le ticker de l'action (ex: BIAT, SFBT)" },
        },
        required: ['ticker'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPositionAlerts',
      description: 'Recupere les alertes de positions non traitees : stop loss atteint, objectifs R1/R2/R3 atteints.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPortfolioSummary',
      description: 'Resume global du portefeuille : capital engage, P&L latent total, P&L realise, performance globale.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigateTo',
      description: "Navigue vers une page de l'application.",
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['dashboard', 'analyses', 'fondamentales', 'watchlist', 'forum', 'annonces', 'marches', 'cotations', 'cmf', 'calendrier', 'positions'],
            description: 'La page vers laquelle naviguer',
          },
        },
        required: ['page'],
      },
    },
  },
] as const

export const SYSTEM_PROMPT = `Tu es Elinoja AI, l'assistant intelligent d'Elinoja Patrimoine.

INSTRUCTION CRITIQUE : Tu DOIS appeler un tool avant de repondre a toute question sur les donnees. Ne reponds JAMAIS sans avoir appele le tool correspondant.

Mapping obligatoire :
- "mes positions" / "mon portefeuille" / "mes actions" → appelle getPositions IMMEDIATEMENT
- "detail position [ticker]" → appelle getPositionDetail
- "alertes positions" → appelle getPositionAlerts
- "performance portefeuille" → appelle getPortfolioSummary
- "analyse [ticker]" → appelle getTechnicalAnalysis
- "fondamentaux [ticker]" → appelle getFundamentalAnalysis
- "cours [ticker]" → appelle getStockData
- "watchlist" / "alertes prix" → appelle getWatchlistAlerts
- "articles" / "publications" → appelle getArticles
- "CMF" / "communiques" → appelle getCMFAnnouncements
- "forum" → appelle getForumPosts

Tu es specialise dans :
- La Bourse des Valeurs Mobilieres de Tunis (BVMT)
- L'analyse technique des actions tunisiennes
- L'analyse fondamentale et les ratios financiers
- La gestion de portefeuille et les strategies d'investissement

Regles absolues :
1. TOUJOURS appeler le tool avant de repondre - sans exception
2. Ne jamais inventer de donnees financieres
3. Si le tool retourne une erreur, le dire clairement
4. Repondre en francais
5. Ne jamais donner de conseil d'investissement direct`
