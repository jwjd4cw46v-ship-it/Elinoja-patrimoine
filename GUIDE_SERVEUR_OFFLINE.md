# 📋 Guide Complet - Serveur BVMT Indisponible

## 🎯 Situation

Le serveur BVMT (tunis-stockexchange.com) n'est pas accessible depuis votre environnement.

**Cause probable:**
- ❌ Serveur BVMT offline
- ❌ Problème de réseau/DNS
- ❌ Firewall bloque l'accès

**Bonne nouvelle:** L'API a été améliorée pour gérer cette situation ! 🎉

---

## ✨ Améliorations apportées

### 1️⃣ Mode de Test (`?test=1`)
Retourne directement les données de démonstration **sans** accéder au serveur BVMT.

### 2️⃣ Meilleur Fallback
Si le serveur est indisponible, retourne des données de secours avec un message explicite.

### 3️⃣ Diagnostic de Connectivité
Endpoint spécialisé pour vérifier la connectivité au serveur BVMT.

### 4️⃣ Meilleur Logging
Messages d'erreur plus clairs pour diagnostiquer le problème.

---

## 🚀 Utilisation immédiate

### Étape 1: Lancer le serveur
```bash
npm run dev
```

### Étape 2: Tester le mode test
```bash
# Option A: Utiliser curl
curl http://localhost:3000/api/bvmt?test=1 | jq .

# Option B: Navigateur
http://localhost:3000/api/bvmt?test=1

# Option C: Mode test JSON formaté
curl http://localhost:3000/api/bvmt?test=1&debug=1 | jq .
```

**Résultat attendu:**
```json
{
  "source": "test_mock",
  "count": 10,
  "quotes": [
    {
      "ticker": "TUNINDEX",
      "price": 9842.50,
      ...
    }
  ],
  "message": "Mode test - données de démonstration"
}
```

---

## 🔍 Diagnostiquer le problème

### Page de diagnostic interactive
Ouvrez dans votre navigateur:
```
http://localhost:3000/connectivity-diagnostic.html
```

Cette page va:
- ✅ Tester l'accès au serveur BVMT
- ✅ Tester votre connexion internet
- ✅ Tester l'API Anthropic (si configurée)
- ✅ Proposer des solutions

### Via l'API de diagnostic
```bash
curl http://localhost:3000/api/bvmt/connectivity | jq .
```

**Réponse possible:**
```json
{
  "status": "OFFLINE",
  "recommendation": "BVMT is offline. Use ?test=1 for mock data.",
  "summary": {
    "total": 4,
    "ok": 2,
    "failed": 2,
    "timeout": 0
  },
  "tests": [
    {
      "test": "BVMT Main Site",
      "status": "FAILED",
      "error": "Connection refused - Server is likely offline"
    },
    ...
  ]
}
```

---

## 📊 Paramètres disponibles

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `test=1` | Retourne les données de test (mock) | `?test=1` |
| `mock=1` | Alias de `test=1` | `?mock=1` |
| `force=1` | Ignore le cache, essaie PDF | `?force=1` |
| `debug=1` | Affiche logs détaillés | `?debug=1` |
| `date=YYYY-MM-DD` | Spécifie une date | `?date=2025-11-21` |

### Combinaisons utiles

```bash
# Mode test avec les logs
curl "http://localhost:3000/api/bvmt?test=1&debug=1" | jq .

# Forcer extraction (ignorant cache)
curl "http://localhost:3000/api/bvmt?force=1" | jq .

# Cache uniquement
curl "http://localhost:3000/api/bvmt" | jq '.source'
```

---

## 🔄 Flux d'exécution

### Quand le serveur est **ONLINE**
```
1. Vérifier le cache (24h)
   ↓ valide? → Retourner cache ✅
2. Télécharger le PDF
   ↓ succès? → Extraire et retourner ✅
3. Essayer J-1
   ↓ succès? → Extraire et retourner ✅
4. Retourner cache périmé
   ↓ existe? → Retourner cache périmé ⚠️
5. Retourner fallback (données codées)
```

### Quand le serveur est **OFFLINE**
```
1. Vérifier le cache (24h)
   ↓ valide? → Retourner cache ✅
2. Tenter télécharger PDF
   ↓ ERREUR CONNEXION → Sauter étapes
3. Retourner cache périmé OU fallback
   ↓ avec message d'avertissement ⚠️
```

### Avec **?test=1**
```
Retourner directement les données de test
(Pas d'accès au serveur, pas de cache)
```

---

## 💾 Données de secours (Fallback)

Ces données sont retournées quand aucun PDF n'est accessible:

```json
{
  "TUNINDEX": {"price": 9842.50, "change_pct": 0.42, ...},
  "SFBT": {"price": 16.25, "change_pct": 1.25, ...},
  "BNA": {"price": 8.12, "change_pct": -0.37, ...},
  "ATB": {"price": 4.87, "change_pct": 0.87, ...},
  "BIAT": {"price": 112.50, "change_pct": 1.35, ...},
  "BT": {"price": 7.40, "change_pct": 0.68, ...},
  "PGH": {"price": 9.65, "change_pct": -1.53, ...},
  "STB": {"price": 2.85, "change_pct": -0.35, ...},
  "TLS": {"price": 3.12, "change_pct": 0.64, ...},
  "BH BANK": {"price": 22.40, "change_pct": 1.36, ...}
}
```

---

## 🛠️ Pour les développeurs

### Modifier les données de test

**Fichier:** `app/api/bvmt/route.ts` → fonction `getDefaultQuotes()`

```typescript
function getDefaultQuotes() {
  return [
    { 
      ticker: 'TUNINDEX', 
      price: 9842.50,    // Modifier le prix
      change: 41.20,
      change_pct: 0.42,  // Modifier la variation %
      volume: 0,
      high: 9860,
      low: 9810,
      open: 9820,
      updated_at: new Date().toISOString()
    },
    // ... autres tickers
  ]
}
```

### Ajouter un nouveau ticker

```typescript
{
  ticker: 'NEW_TICKER',
  name: 'New Company',
  price: 50.00,
  open: 49.50,
  change: 0.50,
  change_pct: 1.01,
  volume: 10000,
  high: 50.25,
  low: 49.75,
  updated_at: new Date().toISOString()
}
```

---

## ✅ Checklist de test

- [ ] Démarrer le serveur: `npm run dev`
- [ ] Tester mode test: `http://localhost:3000/api/bvmt?test=1`
- [ ] Tester diagnostic: `http://localhost:3000/connectivity-diagnostic.html`
- [ ] Vérifier les logs du serveur pour les erreurs
- [ ] Tester avec cache: `http://localhost:3000/api/bvmt`
- [ ] Tester mode force: `http://localhost:3000/api/bvmt?force=1`

---

## 📞 Support

### Problème: `?test=1` retourne une erreur 500

**Solution:** 
```bash
# Redémarrer le serveur
npm run dev
```

### Problème: Le diagnostic page ne charge pas

**Solution:**
```bash
# Vérifier que le serveur tourne
ps aux | grep next

# Redémarrer
npm run dev
```

### Problème: Les données ne changent jamais

**Solution:**
Les données de secours sont codées en dur. Ils changent seulement quand:
1. Le PDF BVMT est extrait ✅
2. Les données sont cachées en Supabase ✅
3. Vous modifiez `getDefaultQuotes()` ⚠️

---

## 🎯 Plan d'action recommandé

### Court terme (développement local)
```bash
# Utiliser le mode test
curl http://localhost:3000/api/bvmt?test=1
```

### Moyen terme (robustesse)
- Vérifier la connectivité via `/connectivity-diagnostic.html`
- S'assurer que le cache Supabase fonctionne
- Tester le fallback

### Long terme (production)
- Restaurer l'accès au serveur BVMT
- Ajouter un endpoint alternative de données BVMT
- Configurer des alertes si l'API est indisponible

---

## 📚 Ressources

- **Page de diagnostic interactive:** `/connectivity-diagnostic.html`
- **Endpoint API fallback:** `/api/bvmt?test=1`
- **Endpoint diagnostic API:** `/api/bvmt/connectivity`
- **Code:** `app/api/bvmt/route.ts`

---

## ✨ Résumé

| Problème | Solution | Commande |
|----------|----------|----------|
| Serveur BVMT offline | Utiliser mode test | `?test=1` |
| Vérifier connectivité | Page diagnostic | `/connectivity-diagnostic.html` |
| Voir les logs | Mode debug | `?debug=1` |
| Forcer extraction | Ignorer cache | `?force=1` |
| Données anciennes | Vérifier le cache | Supabase |

