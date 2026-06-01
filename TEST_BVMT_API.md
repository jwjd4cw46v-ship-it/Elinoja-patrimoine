# Guide de Test Manuel de l'API BVMT

## 1. Démarrer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

---

## 2. Tests de l'API `/api/bvmt`

### Test 1 : Requête basique (avec cache)
```bash
curl -s http://localhost:3000/api/bvmt | jq .
```

**Résultat attendu :**
- Source : `cache`, `stale_cache`, `pdf`, ou `fallback`
- Array de quotes avec : `ticker`, `price`, `change`, `change_pct`, `volume`, `high`, `low`, `open`

---

### Test 2 : Forcer l'extraction du PDF (contourner le cache)
```bash
curl -s "http://localhost:3000/api/bvmt?force=1" | jq .
```

**Résultat attendu :**
- Source : `pdf`
- Méthode : `claude` ou `raw`
- URL du PDF téléchargé

---

### Test 3 : Mode debug (affiche les logs)
```bash
curl -s "http://localhost:3000/api/bvmt?debug=1" | jq .
```

**Résultat attendu :**
- Même réponse + détails dans les logs serveur (terminal)
- Affiche le texte brut extrait du PDF

---

### Test 4 : Spécifier une date (format YYYY-MM-DD)
```bash
curl -s "http://localhost:3000/api/bvmt?date=2025-11-21" | jq .
```

**Résultat attendu :**
- Essaie de télécharger le PDF pour cette date
- Si le PDF n'existe pas, essaie J-1

---

### Test 5 : Forcer + Debug (combinaison complète)
```bash
curl -s "http://localhost:3000/api/bvmt?force=1&debug=1" | jq .
```

---

## 3. Vérifier les logs serveur

Dans le terminal où `npm run dev` est lancé, vous verrez les logs :

```
[BVMT] Fetching PDF: https://tunis-stockexchange.com/sites/default/files/YYYY-MM/fr-physionomie-seance-YYYY-MM-DD.pdf
[BVMT] Trying Claude extraction...
[BVMT] Claude extracted X quotes
[BVMT] Raw text: ...
```

---

## 4. Vérifier les données en Supabase

Les quotes extraites sont stockées dans la table `market_quotes` :

```bash
# Via Supabase CLI (si configuré)
supabase db pull

# Ou directement en requête SQL dans Supabase Dashboard
SELECT * FROM market_quotes ORDER BY updated_at DESC LIMIT 10;
```

---

## 5. Cas d'erreur courants

### Erreur : PDF non trouvé
```json
{
  "source": "stale_cache",
  "count": 10,
  "warning": "PDF indisponible"
}
```
**Cause:** URL du PDF invalide, serveur BVMT indisponible, ou date sans séance boursière

### Erreur : Extraction échouée
```json
{
  "source": "stale_cache",
  "count": 10,
  "warning": "Extraction échouée"
}
```
**Cause:** Claude (Anthropic API) indisponible, extraction brute sans résultat

### Erreur : 500
```json
{
  "error": "Erreur serveur"
}
```
**Cause:** Vérifier les logs, peut-être une erreur Supabase

---

## 6. Vérifier les dépendances d'environnement

Vérifier que les variables d'environnement sont définies :

```bash
# Fichier .env.local (ou .env)
ANTHROPIC_API_KEY=...         # Pour l'extraction Claude
NEXT_PUBLIC_SUPABASE_URL=...   # URL de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # Clé Supabase
```

---

## 7. Tester avec jq pour formater la réponse

```bash
# Voir uniquement le nombre de quotes
curl -s http://localhost:3000/api/bvmt | jq '.count'

# Voir la source
curl -s http://localhost:3000/api/bvmt | jq '.source'

# Voir les premiers 3 tickers
curl -s http://localhost:3000/api/bvmt | jq '.quotes[0:3] | map(.ticker)'

# Voir les variations en pourcentage
curl -s http://localhost:3000/api/bvmt | jq '.quotes | map({ticker: .ticker, change_pct: .change_pct})'
```

---

## 8. Tester avec d'autres outils

### Avec Postman
- URL: `http://localhost:3000/api/bvmt`
- Méthode: `GET`
- Paramètres: `force=1`, `debug=1`, `date=2025-11-21`

### Avec VS Code REST Client
Créer un fichier `test.http` :
```http
GET http://localhost:3000/api/bvmt HTTP/1.1

###
GET http://localhost:3000/api/bvmt?force=1 HTTP/1.1

###
GET http://localhost:3000/api/bvmt?debug=1&force=1 HTTP/1.1
```
Puis cliquer "Send Request"

