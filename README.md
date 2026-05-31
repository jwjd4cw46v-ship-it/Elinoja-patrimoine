# ELINOJA PATRIMOINE — Plateforme d'Analyses Financières Premium

> Plateforme SaaS fintech de qualité institutionnelle pour la publication d'analyses financières en temps réel.

---

## 🚀 Stack Technique

| Couche       | Technologie                        |
|--------------|------------------------------------|
| Frontend     | Next.js 14 (App Router), React 18  |
| Styling      | TailwindCSS, Framer Motion         |
| Backend      | Supabase (PostgreSQL, Auth, RLS)   |
| Realtime     | Supabase Realtime (WebSocket)      |
| Storage      | Supabase Storage (PDFs)            |
| Déploiement  | Vercel                             |

---

## 📦 Installation

### 1. Cloner et installer

```bash
git clone <votre-repo>
cd elinoja-patrimoine
npm install
```

### 2. Configurer Supabase

Créez un projet sur [supabase.com](https://supabase.com), puis :

```bash
cp .env.local.example .env.local
```

Remplissez `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Initialiser la base de données

Dans Supabase Dashboard → **SQL Editor**, exécutez le fichier complet :

```
supabase/migrations/001_schema_complet.sql
```

Ce script crée :
- Toutes les tables (profiles, technical_analyses, fundamental_analyses, cmf_announcements, forum_posts, forum_replies, announcements, watchlists)
- Tous les indexes pour les performances
- Les triggers automatiques (updated_at, replies_count, auto-profile)
- Toutes les politiques RLS (Row Level Security)
- La configuration Realtime
- Le bucket Storage pour les PDFs

### 4. Créer le compte administrateur

Dans Supabase Dashboard → **Authentication → Users** :

1. Cliquez **"Add user"**
2. Email : `admin@elinoja.com` (ou votre email)
3. Password : votre mot de passe sécurisé
4. Cochez **"Auto Confirm User"**

Puis dans **SQL Editor**, exécutez :

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@elinoja.com';
```

### 5. Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

---

## 🌐 Déploiement sur Vercel

### Option A — Via CLI

```bash
npm install -g vercel
vercel
```

Configurez les variables d'environnement quand demandé.

### Option B — Via GitHub

1. Poussez le code sur GitHub
2. Importez le repo sur [vercel.com](https://vercel.com)
3. Ajoutez les variables d'environnement dans les Settings Vercel
4. Déployez

### Variables d'environnement Vercel

```
NEXT_PUBLIC_SUPABASE_URL        → Votre URL Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY   → Votre clé anon
SUPABASE_SERVICE_ROLE_KEY       → Votre clé service_role (secrète)
NEXT_PUBLIC_APP_URL             → https://votre-domaine.vercel.app
```

---

## 🗂️ Structure du projet

```
elinoja-patrimoine/
├── app/
│   ├── auth/
│   │   ├── login/               # Page de connexion premium
│   │   └── forgot-password/     # Réinitialisation mot de passe
│   ├── admin/                   # Backoffice administrateur
│   │   ├── layout.tsx           # Layout admin avec sidebar
│   │   ├── page.tsx             # Dashboard avec statistiques
│   │   ├── clients/             # Gestion complète des clients
│   │   ├── analyses-techniques/ # CRUD analyses techniques
│   │   ├── analyses-fondamentales/ # CRUD analyses fondamentales
│   │   ├── cmf/                 # Communiqués CMF + upload PDF
│   │   ├── forum/               # Modération forum + réponses admin
│   │   ├── annonces/            # Gestion des annonces
│   │   └── parametres/          # Paramètres plateforme
│   ├── client/                  # Espace investisseur
│   │   ├── layout.tsx           # Layout client avec sidebar
│   │   ├── page.tsx             # Dashboard temps réel
│   │   ├── analyses/            # Analyses techniques (vue client)
│   │   ├── fondamentales/       # Analyses fondamentales (vue client)
│   │   ├── cmf/                 # Communiqués CMF (vue client)
│   │   ├── forum/               # Forum investisseurs
│   │   ├── annonces/            # Annonces (vue client)
│   │   └── watchlist/           # Watchlist personnalisée
│   └── api/
│       └── admin/clients/       # API routes (create/update/delete)
├── components/
│   ├── admin/                   # Composants backoffice
│   └── client/                  # Composants espace client
├── hooks/
│   ├── useRealtime.ts           # Hook Supabase Realtime générique
│   └── useProfile.ts            # Hook profil utilisateur
├── lib/
│   └── supabase/
│       ├── client.ts            # Client Supabase (browser)
│       └── server.ts            # Client Supabase (serveur)
├── types/
│   └── index.ts                 # Types TypeScript complets
├── utils/
│   └── index.ts                 # Utilitaires (formatage, calculs)
├── supabase/
│   └── migrations/
│       └── 001_schema_complet.sql  # Schéma DB complet
├── middleware.ts                # Protection des routes
└── .env.local.example          # Template variables d'environnement
```

---

## ✨ Fonctionnalités

### Authentification
- Connexion sécurisée Admin / Client
- Réinitialisation de mot de passe par email
- Sessions persistantes (cookies httpOnly)
- Middleware de protection des routes par rôle

### Admin — Gestion clients
- Créer un compte client (crée automatiquement l'utilisateur Auth + profil)
- Modifier les informations d'un client
- Activer / Désactiver un compte
- Réinitialiser le mot de passe par email
- Supprimer un compte (cascade Auth + profil)
- Gestion des statuts d'abonnement (Actif / Essai / Inactif)

### Analyses techniques (Admin → Client en temps réel)
- Création avec signal (Achat / Vente / Neutre / Veille)
- Prix d'entrée, objectif, stop loss + calcul automatique gain/perte/R:R
- Marché, horizon temporel, niveau de risque
- Publication / Brouillon / Archivage
- Les clients voient les nouvelles analyses instantanément (badge "NOUVELLE ANALYSE")

### Analyses fondamentales
- Ratios complets (PER, ROE, ROA, D/E, croissance CA/BNA, dividende)
- Recommandations graduées (Fort Achat → Fort Vente)
- Analyse, risques, catalyseurs
- Calcul du potentiel de hausse automatique

### Communiqués CMF
- Publication avec catégorie (Résultats, Dividende, AGO, OPA…)
- Upload et téléchargement de PDFs (Supabase Storage)
- Marquage "Important"

### Forum investisseurs (Temps réel)
- Création de discussions avec catégorie et ticker
- Réponses en temps réel (WebSocket)
- Réponses admin identifiées (badge ADMIN)
- Épinglage et verrouillage des discussions (admin)
- Compteur de likes et de réponses automatique

### Annonces (Temps réel)
- Types : Info, Alerte, Webinaire, Maintenance, Performance
- Niveaux de priorité (Faible → Urgent)
- Date d'expiration automatique

### Watchlist clients
- Ajout de titres avec alertes de prix personnalisées
- Notes personnelles par titre
- Support multi-marchés

---

## 🔒 Sécurité

### Row Level Security (RLS)
- **Clients** : peuvent lire uniquement les contenus publiés + écrire dans le forum/watchlist
- **Admins** : accès complet en lecture/écriture sur toutes les tables
- **Isolation** : chaque client ne voit que sa propre watchlist
- **Comptes désactivés** : bloqués au niveau middleware ET RLS

### Middleware
- Vérification de session sur toutes les routes protégées
- Redirection automatique selon le rôle (admin → `/admin`, client → `/client`)
- Vérification `is_active` au niveau serveur

---

## ⚡ Realtime

Les abonnements Supabase Realtime sont configurés sur :
- `technical_analyses` → Tableau de bord et page analyses client
- `fundamental_analyses` → Page analyses fondamentales
- `cmf_announcements` → Page CMF
- `forum_posts` + `forum_replies` → Forum (bidirectionnel)
- `announcements` → Bande d'annonces
- `profiles` → Dashboard admin (compteurs)

---

## 📧 Emails Supabase

Configurez les templates email dans **Supabase Dashboard → Auth → Email Templates** :
- **Confirmation** (si nécessaire)
- **Reset Password** : personnalisez avec votre logo et couleurs

---

## 🎨 Design System

| Variable CSS            | Valeur        | Usage                  |
|-------------------------|---------------|------------------------|
| `--gold-primary`        | `#D4AF37`     | Accent principal       |
| `--noir-primary`        | `#080808`     | Fond principal         |
| `--noir-surface`        | `#111111`     | Surface (sidebar)      |
| `--noir-elevated`       | `#1A1A1A`     | Cartes, inputs         |
| `--noir-border`         | `#2A2A2A`     | Bordures               |
| `--finance-green`       | `#00C853`     | Signaux haussiers      |
| `--finance-red`         | `#FF1744`     | Signaux baissiers      |

Classes utilitaires : `.card-premium`, `.input-premium`, `.btn-gold`, `.btn-ghost`, `.badge-buy/sell/hold/watch`, `.skeleton`

---

## 📝 Licence

Projet propriétaire — © 2024 ELINOJA PATRIMOINE. Tous droits réservés.
