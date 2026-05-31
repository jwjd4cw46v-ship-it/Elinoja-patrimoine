#!/bin/sh

echo ""
echo "====================================="
echo "  ELINOJA PATRIMOINE - RESTAURATION  "
echo "====================================="
echo ""

echo "[1/3] Creation des repertoires..."

mkdir -p app/auth/login
mkdir -p app/auth/forgot-password
mkdir -p app/admin/clients
mkdir -p app/admin/analyses-techniques
mkdir -p app/admin/analyses-fondamentales
mkdir -p app/admin/cmf
mkdir -p app/admin/forum
mkdir -p app/admin/annonces
mkdir -p app/admin/parametres
mkdir -p app/client/analyses
mkdir -p app/client/fondamentales
mkdir -p app/client/cmf
mkdir -p app/client/forum
mkdir -p app/client/annonces
mkdir -p app/client/watchlist
mkdir -p app/api/admin/clients/create
mkdir -p app/api/admin/clients/update
mkdir -p app/api/admin/clients/delete
mkdir -p components/admin
mkdir -p components/client
mkdir -p hooks
mkdir -p lib/supabase
mkdir -p types
mkdir -p utils
mkdir -p supabase/migrations

echo "OK - Repertoires crees"
echo ""
echo "[2/3] Deplacement des fichiers..."

mv app_globals.css app/globals.css
mv app_layout.tsx app/layout.tsx
mv app_page.tsx app/page.tsx

mv app_auth_login_page.tsx app/auth/login/page.tsx
mv app_auth_forgot-password_page.tsx app/auth/forgot-password/page.tsx

mv app_admin_layout.tsx app/admin/layout.tsx
mv app_admin_page.tsx app/admin/page.tsx
mv app_admin_clients_page.tsx app/admin/clients/page.tsx
mv app_admin_analyses-techniques_page.tsx app/admin/analyses-techniques/page.tsx
mv app_admin_analyses-fondamentales_page.tsx app/admin/analyses-fondamentales/page.tsx
mv app_admin_cmf_page.tsx app/admin/cmf/page.tsx
mv app_admin_forum_page.tsx app/admin/forum/page.tsx
mv app_admin_annonces_page.tsx app/admin/annonces/page.tsx
mv app_admin_parametres_page.tsx app/admin/parametres/page.tsx

mv app_client_layout.tsx app/client/layout.tsx
mv app_client_page.tsx app/client/page.tsx
mv app_client_analyses_page.tsx app/client/analyses/page.tsx
mv app_client_fondamentales_page.tsx app/client/fondamentales/page.tsx
mv app_client_cmf_page.tsx app/client/cmf/page.tsx
mv app_client_forum_page.tsx app/client/forum/page.tsx
mv app_client_annonces_page.tsx app/client/annonces/page.tsx
mv app_client_watchlist_page.tsx app/client/watchlist/page.tsx

mv app_api_admin_clients_create_route.ts app/api/admin/clients/create/route.ts
mv app_api_admin_clients_update_route.ts app/api/admin/clients/update/route.ts
mv app_api_admin_clients_delete_route.ts app/api/admin/clients/delete/route.ts

mv components_admin_AdminSidebar.tsx components/admin/AdminSidebar.tsx
mv components_admin_AdminHeader.tsx components/admin/AdminHeader.tsx
mv components_admin_AdminDashboardClient.tsx components/admin/AdminDashboardClient.tsx
mv components_admin_TechnicalAnalysisForm.tsx components/admin/TechnicalAnalysisForm.tsx
mv components_client_ClientSidebar.tsx components/client/ClientSidebar.tsx
mv components_client_ClientHeader.tsx components/client/ClientHeader.tsx

mv hooks_useRealtime.ts hooks/useRealtime.ts
mv hooks_useProfile.ts hooks/useProfile.ts

mv lib_supabase_client.ts lib/supabase/client.ts
mv lib_supabase_server.ts lib/supabase/server.ts

mv types_index.ts types/index.ts
mv utils_index.ts utils/index.ts
mv supabase_migrations_001_schema_complet.sql supabase/migrations/001_schema_complet.sql

echo "OK - Fichiers deplaces"
echo ""
echo "[3/3] Verification..."
echo ""

ERRORS=0

check_file() {
  if [ -f "$1" ]; then
    echo "  OK : $1"
  else
    echo "  MANQUANT : $1"
    ERRORS=$(( ERRORS + 1 ))
  fi
}

check_file "package.json"
check_file "middleware.ts"
check_file "tailwind.config.js"
check_file "next.config.js"
check_file "app/globals.css"
check_file "app/layout.tsx"
check_file "app/auth/login/page.tsx"
check_file "app/auth/forgot-password/page.tsx"
check_file "app/admin/layout.tsx"
check_file "app/admin/page.tsx"
check_file "app/admin/clients/page.tsx"
check_file "app/admin/analyses-techniques/page.tsx"
check_file "app/admin/analyses-fondamentales/page.tsx"
check_file "app/admin/cmf/page.tsx"
check_file "app/admin/forum/page.tsx"
check_file "app/admin/annonces/page.tsx"
check_file "app/admin/parametres/page.tsx"
check_file "app/client/layout.tsx"
check_file "app/client/page.tsx"
check_file "app/client/analyses/page.tsx"
check_file "app/client/fondamentales/page.tsx"
check_file "app/client/cmf/page.tsx"
check_file "app/client/forum/page.tsx"
check_file "app/client/annonces/page.tsx"
check_file "app/client/watchlist/page.tsx"
check_file "app/api/admin/clients/create/route.ts"
check_file "app/api/admin/clients/update/route.ts"
check_file "app/api/admin/clients/delete/route.ts"
check_file "components/admin/AdminSidebar.tsx"
check_file "components/admin/AdminHeader.tsx"
check_file "components/admin/AdminDashboardClient.tsx"
check_file "components/admin/TechnicalAnalysisForm.tsx"
check_file "components/client/ClientSidebar.tsx"
check_file "components/client/ClientHeader.tsx"
check_file "hooks/useRealtime.ts"
check_file "hooks/useProfile.ts"
check_file "lib/supabase/client.ts"
check_file "lib/supabase/server.ts"
check_file "types/index.ts"
check_file "utils/index.ts"
check_file "supabase/migrations/001_schema_complet.sql"

echo ""

if [ "$ERRORS" -eq 0 ]; then
  echo "====================================="
  echo "  SUCCES - STRUCTURE COMPLETE        "
  echo "====================================="
  echo ""
  echo "Prochaines etapes :"
  echo "  1. cp .env.local.example .env.local"
  echo "  2. Remplir .env.local avec vos cles Supabase"
  echo "  3. npm install"
  echo "  4. npm run dev"
else
  echo "====================================="
  echo "  ATTENTION : $ERRORS fichier(s) manquant(s)"
  echo "====================================="
  echo ""
  echo "Verifiez que tous les fichiers du ZIP"
  echo "sont dans le meme dossier que ce script."
fi

echo ""
