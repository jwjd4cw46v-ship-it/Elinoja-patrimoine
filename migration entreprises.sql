-- ═══════════════════════════════════════════════════════════════════
-- NOTE : La table entreprises contient déjà toutes les colonnes
-- 2024→2030 pour résultat_net et dividende.
-- En 2026 : 2024 = n-2 (réel), 2025 = n-1 (réel), 2026+ = prévisions
-- Aucune migration de colonnes n'est nécessaire.
-- ═══════════════════════════════════════════════════════════════════

-- ─── RLS : Row Level Security ───────────────────────────────────────

ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié
DROP POLICY IF EXISTS "entreprises_read_authenticated" ON public.entreprises;
CREATE POLICY "entreprises_read_authenticated"
  ON public.entreprises
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Écriture : admins uniquement
DROP POLICY IF EXISTS "entreprises_write_admin" ON public.entreprises;
CREATE POLICY "entreprises_write_admin"
  ON public.entreprises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Index pour la jointure cotations ↔ entreprises ─────────────────

CREATE INDEX IF NOT EXISTS idx_entreprises_mnemo
  ON public.entreprises (mnemo);

CREATE INDEX IF NOT EXISTS idx_entreprises_code_isin
  ON public.entreprises (code_isin);

-- ─── Realtime ────────────────────────────────────────────────────────
-- Dans Supabase Dashboard → Database → Replication :
-- activer INSERT / UPDATE / DELETE sur la table "entreprises"
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.entreprises;
