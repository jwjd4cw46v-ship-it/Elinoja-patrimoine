# 🔧 Solution: Serveur BVMT Indisponible

**Problème:** La connexion au serveur BVMT est impossible ❌

**Cause possible:**
- Serveur BVMT (tunis-stockexchange.com) est offline
- Problème de connexion réseau/internet
- Firewall bloque l'accès
- DNS n'arrive pas à résoudre le domaine

---

## ✅ Solutions

### 1️⃣ Mode de Test (Immédiat)

Utilisez le paramètre `?test=1` pour retourner des données de test sans accéder au serveur BVMT:

```bash
# Via curl
curl http://localhost:3000/api/bvmt?test=1 | jq .

# Via navigateur
http://localhost:3000/api/bvmt?test=1
```

**Réponse:**
```json
{
  "source": "test_mock",
  "count": 10,
  "quotes": [
    {
      "ticker": "TUNINDEX",
      "price": 9842.50,
      "change": 41.20,
      "change_pct": 0.42,
      ...
    }
  ],
  "message": "Mode test - données de démonstration"
}
```

### 2️⃣ Mode Mock (Données de Secours)

Utilise les données de fallback définies dans le code:

```bash
curl http://localhost:3000/api/bvmt?mock=1 | jq .
```

### 3️⃣ Vérifier le Cache

Si des données ont été cachées auparavant:

```bash
curl http://localhost:3000/api/bvmt | jq .
```

Retourne `"source": "cache"` s'il existe un cache valide

### 4️⃣ Forcer le Fallback

En cas d'absence de cache:

```bash
curl http://localhost:3000/api/bvmt | jq .
```

Retourne `"source": "fallback"` avec les données de secours

---

## 📊 Nouveaux paramètres de requête

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `test` | `1` | Mode test - retourne directement les données mock |
| `mock` | `1` | Alias de `test=1` |
| `force` | `1` | Ignore le cache et essaie de récupérer le PDF |
| `debug` | `1` | Affiche les logs détaillés |
| `date` | `YYYY-MM-DD` | Spécifie une date pour le PDF |

### Exemples combinés

```bash
# Test mode avec les logs détaillés
curl "http://localhost:3000/api/bvmt?test=1&debug=1" | jq .

# Forcer le fallback sans cache
curl "http://localhost:3000/api/bvmt?force=1" | jq .

# Tester une date spécifique en mode test
curl "http://localhost:3000/api/bvmt?test=1&date=2025-11-21" | jq .
```

---

## 🔍 Vérifier la connectivité au serveur BVMT

Créer un test dans `app/api/bvmt/connectivity/route.ts`:

```bash
curl http://localhost:3000/api/bvmt/connectivity | jq .
```

Cet endpoint testera :
- ✅ Résolution DNS de tunis-stockexchange.com
- ✅ Accès au site BVMT principal
- ✅ Accès à une URL PDF
- ✅ Accès à l'API Anthropic (si configurée)

---

## 🚀 Utilisation immédiate

### Pour un développement local

```bash
# Terminal 1: Lancer le serveur
npm run dev

# Terminal 2: Tester le mode test
curl http://localhost:3000/api/bvmt?test=1 | jq .
```

### Pour les tests d'intégration

Modifiez vos tests pour utiliser le mode test:

```javascript
// Au lieu de:
const response = await fetch('/api/bvmt')

// Utilisez:
const response = await fetch('/api/bvmt?test=1')
```

### Pour la production

La logique en cascade fonctionne toujours :
1. ✅ Cache Supabase (24h)
2. ✅ PDF BVMT si disponible
3. ✅ Cache périmé
4. ✅ Données de fallback

---

## 📋 Réponses de l'API

### Mode test (`?test=1`)
```json
{
  "source": "test_mock",
  "count": 10,
  "quotes": [...],
  "message": "Mode test - données de démonstration"
}
```

### Cache valide
```json
{
  "source": "cache",
  "count": 15,
  "quotes": [...]
}
```

### PDF extractif
```json
{
  "source": "pdf",
  "method": "claude",
  "pdf_url": "https://...",
  "count": 25,
  "quotes": [...]
}
```

### Serveur offline (avec cache)
```json
{
  "source": "stale_cache",
  "count": 15,
  "quotes": [...],
  "warning": "PDF indisponible - Serveur BVMT offline",
  "hint": "Utilisez ?test=1 pour les données de test"
}
```

### Serveur offline (sans cache)
```json
{
  "source": "fallback",
  "count": 10,
  "quotes": [...],
  "warning": "PDF indisponible - Serveur BVMT offline",
  "hint": "Utilisez ?test=1 pour les données de test"
}
```

---

## 🐛 Dépannage

### Problème: `?test=1` ne fonctionne pas

**Solution:** Redémarrez le serveur
```bash
npm run dev
```

### Problème: Le serveur se plaint que Supabase n'est pas accessible

**Solution:** Ajouter les variables d'environnement dans `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Problème: Les données de test sont vides

**Solution:** Les données sont codées en dur - vérifiez `getDefaultQuotes()` dans le code

---

## ✨ Résumé

✅ **Court terme:** Utiliser `?test=1` pour développer
✅ **Moyen terme:** Implémenter un endpoint de test complet
✅ **Long terme:** Restaurer l'accès au serveur BVMT ou utiliser une alternative

