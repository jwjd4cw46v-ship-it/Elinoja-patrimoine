-- ============================================================
-- ELINOJA PATRIMOINE — SCHÉMA COMPLET SUPABASE
-- Exécuter dans l'ordre dans l'éditeur SQL de Supabase
-- ============================================================

-- ==================== EXTENSIONS ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==================== TABLE: profiles ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  avatar_url          TEXT,
  phone               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  subscription_end    TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: technical_analyses ====================
CREATE TABLE IF NOT EXISTS public.technical_analyses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  ticker          TEXT NOT NULL,
  market          TEXT NOT NULL DEFAULT 'TUNINDEX',
  signal          TEXT NOT NULL CHECK (signal IN ('buy', 'sell', 'hold', 'watch')),
  entry_price     NUMERIC(12, 3) NOT NULL,
  target_price    NUMERIC(12, 3) NOT NULL,
  stop_loss       NUMERIC(12, 3) NOT NULL,
  current_price   NUMERIC(12, 3),
  timeframe       TEXT NOT NULL DEFAULT 'Moyen terme',
  description     TEXT NOT NULL,
  chart_data      JSONB,
  indicators      JSONB,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  risk_level      TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  potential_gain  NUMERIC(8, 2),
  views_count     INTEGER NOT NULL DEFAULT 0,
  author_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: fundamental_analyses ====================
CREATE TABLE IF NOT EXISTS public.fundamental_analyses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker           TEXT NOT NULL,
  company_name     TEXT NOT NULL,
  sector           TEXT NOT NULL,
  market           TEXT NOT NULL DEFAULT 'TUNINDEX',
  recommendation   TEXT NOT NULL CHECK (recommendation IN ('strong_buy', 'buy', 'hold', 'sell', 'strong_sell')),
  target_price     NUMERIC(12, 3) NOT NULL,
  current_price    NUMERIC(12, 3),
  pe_ratio         NUMERIC(8, 2),
  forward_pe       NUMERIC(8, 2),
  roe              NUMERIC(8, 2),
  roa              NUMERIC(8, 2),
  debt_to_equity   NUMERIC(8, 2),
  revenue_growth   NUMERIC(8, 2),
  earnings_growth  NUMERIC(8, 2),
  dividend_yield   NUMERIC(8, 2),
  market_cap       NUMERIC(18, 0),
  description      TEXT NOT NULL,
  risks            TEXT NOT NULL DEFAULT '',
  catalysts        TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: cmf_announcements ====================
CREATE TABLE IF NOT EXISTS public.cmf_announcements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  company       TEXT NOT NULL,
  ticker        TEXT,
  category      TEXT NOT NULL DEFAULT 'autre' CHECK (category IN ('resultat', 'dividend', 'agm', 'opa', 'introduction', 'autre')),
  content       TEXT NOT NULL DEFAULT '',
  pdf_url       TEXT,
  pdf_filename  TEXT,
  official_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_important  BOOLEAN NOT NULL DEFAULT false,
  views_count   INTEGER NOT NULL DEFAULT 0,
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: forum_posts ====================
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Général',
  ticker        TEXT,
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  likes_count   INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  views_count   INTEGER NOT NULL DEFAULT 0,
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: forum_replies ====================
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id        UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  author_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  likes_count    INTEGER NOT NULL DEFAULT 0,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: announcements ====================
CREATE TABLE IF NOT EXISTS public.announcements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'alert', 'webinar', 'maintenance', 'performance')),
  priority         TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  show_popup       BOOLEAN NOT NULL DEFAULT false,
  target_audience  TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'clients', 'specific')),
  target_client_ids UUID[],
  scheduled_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  author_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TABLE: watchlists ====================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticker            TEXT NOT NULL,
  company_name      TEXT NOT NULL,
  market            TEXT NOT NULL DEFAULT 'TUNINDEX',
  alert_price_low   NUMERIC(12, 3),
  alert_price_high  NUMERIC(12, 3),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email       ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active      ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_ta_status            ON public.technical_analyses(status);
CREATE INDEX IF NOT EXISTS idx_ta_ticker            ON public.technical_analyses(ticker);
CREATE INDEX IF NOT EXISTS idx_ta_published         ON public.technical_analyses(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ta_signal            ON public.technical_analyses(signal);

CREATE INDEX IF NOT EXISTS idx_fa_status            ON public.fundamental_analyses(status);
CREATE INDEX IF NOT EXISTS idx_fa_ticker            ON public.fundamental_analyses(ticker);

CREATE INDEX IF NOT EXISTS idx_cmf_date             ON public.cmf_announcements(official_date DESC);
CREATE INDEX IF NOT EXISTS idx_cmf_category         ON public.cmf_announcements(category);

CREATE INDEX IF NOT EXISTS idx_fp_author            ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_fp_pinned            ON public.forum_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_fp_created           ON public.forum_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fr_post              ON public.forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_fr_author            ON public.forum_replies(author_id);

CREATE INDEX IF NOT EXISTS idx_ann_active           ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_ann_expires          ON public.announcements(expires_at);

CREATE INDEX IF NOT EXISTS idx_wl_user              ON public.watchlists(user_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_ta_search ON public.technical_analyses USING gin(to_tsvector('french', title || ' ' || ticker || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_fa_search ON public.fundamental_analyses USING gin(to_tsvector('french', ticker || ' ' || company_name));
CREATE INDEX IF NOT EXISTS idx_fp_search ON public.forum_posts USING gin(to_tsvector('french', title || ' ' || COALESCE(content, '')));

-- ==================== TRIGGERS: updated_at ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'technical_analyses', 'fundamental_analyses',
    'cmf_announcements', 'forum_posts', 'forum_replies', 'announcements'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ==================== TRIGGER: auto-create profile on signup ====================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==================== TRIGGER: update replies_count ====================
CREATE OR REPLACE FUNCTION update_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_replies_count ON public.forum_replies;
CREATE TRIGGER trg_replies_count
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_replies_count();

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundamental_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmf_announcements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists           ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is active client
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==================== POLICIES: profiles ====================
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (is_admin());

CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR is_admin());

-- ==================== POLICIES: technical_analyses ====================
CREATE POLICY "ta_select_published" ON public.technical_analyses
  FOR SELECT USING (status = 'published' AND is_active_user());

CREATE POLICY "ta_select_admin" ON public.technical_analyses
  FOR SELECT USING (is_admin());

CREATE POLICY "ta_insert_admin" ON public.technical_analyses
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "ta_update_admin" ON public.technical_analyses
  FOR UPDATE USING (is_admin());

CREATE POLICY "ta_delete_admin" ON public.technical_analyses
  FOR DELETE USING (is_admin());

-- ==================== POLICIES: fundamental_analyses ====================
CREATE POLICY "fa_select_published" ON public.fundamental_analyses
  FOR SELECT USING (status = 'published' AND is_active_user());

CREATE POLICY "fa_select_admin" ON public.fundamental_analyses
  FOR SELECT USING (is_admin());

CREATE POLICY "fa_insert_admin" ON public.fundamental_analyses
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "fa_update_admin" ON public.fundamental_analyses
  FOR UPDATE USING (is_admin());

CREATE POLICY "fa_delete_admin" ON public.fundamental_analyses
  FOR DELETE USING (is_admin());

-- ==================== POLICIES: cmf_announcements ====================
CREATE POLICY "cmf_select_all_active" ON public.cmf_announcements
  FOR SELECT USING (is_active_user());

CREATE POLICY "cmf_insert_admin" ON public.cmf_announcements
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "cmf_update_admin" ON public.cmf_announcements
  FOR UPDATE USING (is_admin());

CREATE POLICY "cmf_delete_admin" ON public.cmf_announcements
  FOR DELETE USING (is_admin());

-- ==================== POLICIES: forum_posts ====================
CREATE POLICY "fp_select_all_active" ON public.forum_posts
  FOR SELECT USING (is_active_user());

CREATE POLICY "fp_insert_active" ON public.forum_posts
  FOR INSERT WITH CHECK (is_active_user() AND auth.uid() = author_id);

CREATE POLICY "fp_update_own" ON public.forum_posts
  FOR UPDATE USING (auth.uid() = author_id AND NOT is_locked);

CREATE POLICY "fp_update_admin" ON public.forum_posts
  FOR UPDATE USING (is_admin());

CREATE POLICY "fp_delete_own" ON public.forum_posts
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "fp_delete_admin" ON public.forum_posts
  FOR DELETE USING (is_admin());

-- ==================== POLICIES: forum_replies ====================
CREATE POLICY "fr_select_all" ON public.forum_replies
  FOR SELECT USING (is_active_user());

CREATE POLICY "fr_insert_active" ON public.forum_replies
  FOR INSERT WITH CHECK (
    is_active_user()
    AND auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.forum_posts WHERE id = post_id AND NOT is_locked)
  );

CREATE POLICY "fr_insert_admin" ON public.forum_replies
  FOR INSERT WITH CHECK (is_admin() AND auth.uid() = author_id);

CREATE POLICY "fr_update_own" ON public.forum_replies
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "fr_delete_own" ON public.forum_replies
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "fr_delete_admin" ON public.forum_replies
  FOR DELETE USING (is_admin());

-- ==================== POLICIES: announcements ====================
CREATE POLICY "ann_select_active" ON public.announcements
  FOR SELECT USING (is_active = true AND is_active_user());

CREATE POLICY "ann_select_admin" ON public.announcements
  FOR SELECT USING (is_admin());

CREATE POLICY "ann_insert_admin" ON public.announcements
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "ann_update_admin" ON public.announcements
  FOR UPDATE USING (is_admin());

CREATE POLICY "ann_delete_admin" ON public.announcements
  FOR DELETE USING (is_admin());

-- ==================== POLICIES: watchlists ====================
CREATE POLICY "wl_select_own" ON public.watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wl_insert_own" ON public.watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "wl_update_own" ON public.watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "wl_delete_own" ON public.watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== REALTIME ====================
-- Activer Realtime sur les tables nécessaires
-- (Dans Supabase Dashboard > Database > Replication)
-- Ou via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.technical_analyses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fundamental_analyses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cmf_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ==================== STORAGE ====================
-- Créer le bucket 'documents' pour les PDFs CMF
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: upload for admins
CREATE POLICY "documents_upload_admin" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND is_admin()
  );

-- Policy: read public
CREATE POLICY "documents_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- Policy: delete for admins
CREATE POLICY "documents_delete_admin" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND is_admin());

-- ==================== DATA D'INITIALISATION ====================
-- Créer le compte admin initial
-- IMPORTANT: Créez d'abord un utilisateur dans Supabase Auth avec:
-- Email: admin@elinoja.com
-- Password: (votre mot de passe)
-- Puis exécutez ce script pour assigner le rôle admin.
-- Remplacez 'ADMIN_USER_UUID' par l'UUID réel de l'utilisateur créé.

-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@elinoja.com';

-- ==================== VÉRIFICATION ====================
-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
