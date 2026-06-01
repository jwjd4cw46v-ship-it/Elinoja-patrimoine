# 🧪 Tests Manuels API BVMT - Résumé

Trois outils de test ont été créés pour vous permettre de tester l'API BVMT de différentes façons :

## 1️⃣ Guide Complet (`TEST_BVMT_API.md`)
Fichier : [TEST_BVMT_API.md](./TEST_BVMT_API.md)

**Contient:**
- Instructions détaillées pour tous les tests
- Exemples de commandes curl
- Cas d'erreur courants
- Vérification des dépendances d'environnement
- Commandes jq pour filtrer les résultats

**Utilisation:**
```bash
# Consulter le fichier
cat TEST_BVMT_API.md
```

---

## 2️⃣ Script Automatisé de Test (`test-bvmt.sh`)
Fichier : [test-bvmt.sh](./test-bvmt.sh)

**Contient:**
- Tests automatisés avec couleurs
- Vérification de la connexion
- Affichage formaté des résultats
- Tests avec cache et sans cache

**Utilisation:**
```bash
# Rendre le script exécutable
chmod +x test-bvmt.sh

# Lancer les tests
./test-bvmt.sh
```

**Affichage:**
- ✓ Tests réussis
- ✗ Tests échoués
- Couleurs pour meilleure lisibilité

---

## 3️⃣ REST Client File (`test-bvmt.http`)
Fichier : [test-bvmt.http](./test-bvmt.http)

**Contient:**
- 7 requêtes pré-configurées
- Compatible avec VS Code REST Client

**Utilisation dans VS Code:**
1. Installer l'extension "REST Client" (Huachao Mao)
2. Ouvrir [test-bvmt.http](./test-bvmt.http)
3. Cliquer sur "Send Request" au-dessus de chaque requête

**Avantages:**
- Tests interactifs dans l'éditeur
- Visualisation des réponses JSON
- Pas besoin de terminal

---

## ⚙️ Prérequis

### 1. Serveur en cours d'exécution
```bash
npm run dev
```
L'API sera disponible sur `http://localhost:3000/api/bvmt`

### 2. Variables d'environnement (`.env.local`)
```
# Anthropic API (extraction Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Service client (pour upsert)
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Outils recommandés
- `curl` (testé dans les exemples)
- `jq` (pour formater les réponses JSON)
- VS Code REST Client (optionnel)

---

## 📊 Cas de Test Recommandés

### Test 1: Vérifier le cache
```bash
curl -s http://localhost:3000/api/bvmt | jq '.source'
```
Résultat attendu: `cache`, `stale_cache`, ou `fallback`

### Test 2: Forcer extraction PDF
```bash
curl -s "http://localhost:3000/api/bvmt?force=1" | jq '.quotes | length'
```
Résultat attendu: Nombre de quotes extraites (>0)

### Test 3: Voir les logs d'extraction
```bash
curl -s "http://localhost:3000/api/bvmt?force=1&debug=1" 
```
Vérifier le terminal `npm run dev` pour les détails

### Test 4: Vérifier les données en Supabase
- Accédez au dashboard Supabase
- Table: `market_quotes`
- Les données doivent être à jour après chaque extraction

---

## 🐛 Dépannage

### Le serveur ne démarre pas
```bash
npm install  # Assurez-vous que les dépendances sont installées
npm run dev
```

### L'API retourne une erreur 500
- Vérifier les logs du serveur (`npm run dev`)
- Vérifier que `ANTHROPIC_API_KEY` est défini
- Vérifier que Supabase est accessible

### Les données de BVMT ne s'extraient pas
- Vérifier que le PDF existe (peut être indisponible le week-end)
- Mode debug: `?force=1&debug=1`
- Vérifier les logs du serveur

### REST Client ne marche pas
- Installer l'extension: `Huachao Mao - REST Client`
- Assurez-vous que le serveur tourne sur `localhost:3000`

---

## 📝 Notes

- L'API cache les données pendant **24 heures**
- Les PDFs sont disponibles les **jours de bourse** (lun-ven, hors jours fériés)
- L'extraction Claude a priorité sur l'extraction brute
- Les données sont automatiquement stockées dans Supabase

---

## 🚀 Prochaines Étapes

1. Lancer le serveur: `npm run dev`
2. Choisir une méthode de test:
   - Terminal: `./test-bvmt.sh`
   - VS Code: Ouvrir `test-bvmt.http` et utiliser REST Client
   - Manuel: Suivre `TEST_BVMT_API.md`

