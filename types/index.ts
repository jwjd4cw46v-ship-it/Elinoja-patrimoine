export type UserRole = 'admin' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  subscription_status: 'active' | 'inactive' | 'trial'
  subscription_end?: string
  last_seen_at?: string
  created_at: string
  updated_at: string
}

export interface TechnicalAnalysis {
  id: string
  title: string
  ticker: string
  market: string
  signal: 'buy' | 'sell' | 'hold' | 'watch'
  entry_price: number
  target_price: number
  stop_loss: number
  current_price?: number
  timeframe: string
  description: string
  chart_data?: CandleData[]
  indicators?: IndicatorData[]
  status: 'draft' | 'published' | 'archived'
  risk_level: 'low' | 'medium' | 'high'
  potential_gain?: number
  chart_image_url?: string        // ← URL image stockée dans Supabase Storage
  views_count: number
  author_id: string
  author?: Profile
  published_at?: string
  created_at: string
  updated_at: string
}

export interface FundamentalAnalysis {
  id: string
  ticker: string
  company_name: string
  sector: string
  market: string
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  target_price: number
  current_price?: number
  pe_ratio?: number
  forward_pe?: number
  roe?: number
  roa?: number
  debt_to_equity?: number
  revenue_growth?: number
  earnings_growth?: number
  dividend_yield?: number
  market_cap?: number
  description: string
  risks: string
  catalysts: string
  status: 'draft' | 'published' | 'archived'
  author_id: string
  author?: Profile
  published_at?: string
  created_at: string
  updated_at: string
}

export interface CmfAnnouncement {
  id: string
  title: string
  company: string
  ticker?: string
  category: 'resultat' | 'dividend' | 'agm' | 'opa' | 'introduction' | 'autre'
  content: string
  pdf_url?: string
  pdf_filename?: string
  official_date: string
  is_important: boolean
  views_count: number
  author_id: string
  author?: Profile
  created_at: string
  updated_at: string
}

export interface ForumPost {
  id: string
  title: string
  content: string
  category: string
  ticker?: string
  author_id: string
  author?: Profile
  likes_count: number
  replies_count: number
  views_count: number
  is_pinned: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
  replies?: ForumReply[]
  user_liked?: boolean
}

export interface ForumReply {
  id: string
  post_id: string
  content: string
  author_id: string
  author?: Profile
  likes_count: number
  is_admin_reply: boolean
  created_at: string
  updated_at: string
  user_liked?: boolean
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'alert' | 'webinar' | 'maintenance' | 'performance'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_active: boolean
  show_popup: boolean
  target_audience: 'all' | 'clients' | 'specific'
  target_client_ids?: string[]
  scheduled_at?: string
  expires_at?: string
  author_id: string
  author?: Profile
  created_at: string
  updated_at: string
}

export interface Watchlist {
  id: string
  user_id: string
  ticker: string
  company_name: string
  market: string
  alert_price_low?: number
  alert_price_high?: number
  notes?: string
  created_at: string
}

export interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface IndicatorData {
  name: string
  type: 'rsi' | 'macd' | 'sma' | 'ema' | 'bollinger'
  values: { time: string; value: number }[]
}

export interface DashboardStats {
  total_clients: number
  active_clients: number
  online_clients: number
  total_analyses: number
  published_analyses: number
  total_posts: number
  new_clients_this_month: number
  analyses_this_month: number
}

export interface Notification {
  id: string
  type: 'analysis' | 'announcement' | 'forum' | 'cmf' | 'system'
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export type SortOrder = 'asc' | 'desc'

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
