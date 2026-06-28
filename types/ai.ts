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

// ─── Tool definitions (OpenAI function calling) ───────────────────────────────
export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'getStockData',
      description: 'Récupère les données boursières en temps réel d\'une action BVMT : cours actuel, variation, volume, capitalisation boursière.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Le ticker/mnémonique de l\'action (ex: BIAT, SFBT, TGH)' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTechnicalAnalysis',
      description: 'Récupère l\'analyse technique publiée pour une action : signal (achat/vente/neutre), objectif de cours, stop loss, point d\'entrée, description.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Le ticker de l\'action' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getFundamentalAnalysis',
      description: 'Récupère l\'analyse fondamentale d\'une action : PER, PER forward, ROE, ROA, D/E ratio, BPA, objectif de cours, recommandation.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Le ticker de l\'action' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getWatchlistAlerts',
      description: 'Récupère les alertes de franchissement de seuil actives pour l\'utilisateur connecté.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'L\'ID de l\'utilisateur' },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPositions',
      description: 'Récupère les positions du portefeuille de l\'utilisateur : ticker, prix moyen, quantités, cours actuel, P&L latent et réalisé, objectifs R1/R2/R3, stops, notes. Peut filtrer par statut (ouvertes ou clôturées).',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'L\'ID de l\'utilisateur',
          },
          state: {
            type: 'string',
            enum: ['open', 'closed'],
            description: 'Filtrer par statut : "open" pour les positions ouvertes, "closed" pour les clôturées. Omis = toutes les positions.',
          },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getArticles',
      description: 'Récupère les derniers articles et publications financières de la plateforme.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Nombre d\'articles à retourner (défaut: 5)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'searchArticles',
      description: 'Recherche dans les articles publiés sur la plateforme.',
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
      description: 'Récupère les dernières discussions du forum investisseurs.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Nombre de posts à retourner (défaut: 5)' },
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
      description: 'Récupère les publications officielles du CMF (Conseil du Marché Financier) : rapports annuels, prospectus, communiqués. Peut filtrer par ticker/société.',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Ticker de la société (optionnel, ex: TPR, BIAT)' },
          limit:  { type: 'number', description: 'Nombre de publications (défaut: 5)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getExpertOpinions',
      description: 'Récupère les avis et recommandations des experts Elinoja sur les actions : signal (achat/accumuler/conserver/alléger/vendre), objectif de cours, potentiel de hausse/baisse, commentaire expert. Peut filtrer par ticker.',
      parameters: {
        type: 'object',
        properties: {
          ticker: {
            type: 'string',
            description: 'Ticker de l'action (optionnel, ex: TGH, BIAT). Si omis, retourne tous les avis récents.',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigateTo',
      description: 'Navigue vers une page de l\'application.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['dashboard', 'analyses', 'fondamentales', 'watchlist', 'portefeuille', 'forum', 'annonces', 'marches', 'cotations', 'cmf', 'calendrier'],
            description: 'La page vers laquelle naviguer',
          },
        },
        required: ['page'],
      },
    },
  },
] as const

export const SYSTEM_PROMPT = `Tu es Elinoja AI, l'assistant intelligent d'Elinoja Patrimoine.

Tu es spécialisé dans :
- La Bourse des Valeurs Mobilières de Tunis (BVMT)
- L'analyse technique des actions tunisiennes
- L'analyse fondamentale et les ratios financiers
- Les marchés financiers tunisiens et internationaux
- La gestion de portefeuille et les stratégies d'investissement

Règles absolues :
1. Utilise TOUJOURS les tools disponibles pour récupérer des données réelles
2. N'invente JAMAIS de prix, ratios, ou données financières
3. Si une donnée n'est pas disponible via les tools, dis-le clairement
4. Sois précis, professionnel et pédagogique
5. Réponds en français sauf si l'utilisateur écrit en anglais
6. Pour les analyses, structure ta réponse clairement avec des sections

Quand tu utilises les données :
- Cite toujours la source (ex: "Selon l'analyse technique publiée sur Elinoja...")
- Indique la date si disponible
- Mentionne les risques associés
- Ne donne jamais de conseil d'investissement direct, mais aide à comprendre les données

Avis experts :
- Pour toute question sur les recommandations ou avis d'experts, utilise getExpertOpinions
- Le signal peut être : achat, accumuler, conserver, alléger, vendre
- Le potentiel est calculé entre le cours de création et l'objectif

Portefeuille :
- Pour toute question sur les positions, le P&L ou le portefeuille, utilise getPositions
- Le P&L latent est calculé sur la quantité restante au cours actuel
- Les objectifs R1/R2/R3 sont les résistances cibles de la position
- Le stop actuel est le niveau de protection en vigueur`
