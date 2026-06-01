# 🚀 Démarrage Rapide - Serveur BVMT Offline

## ⚡ En 30 secondes

```bash
# 1. Lancer le serveur
npm run dev

# 2. Tester mode test (dans un autre terminal)
curl http://localhost:3000/api/bvmt?test=1 | jq .
```

**Voilà !** Vous avez maintenant accès aux données même si BVMT est offline. ✅

---

## 📍 3 Façons de tester

### Option A: Terminal (curl)
```bash
curl http://localhost:3000/api/bvmt?test=1 | jq .
```

### Option B: Navigateur Web
Ouvrez l'URL directement:
```
http://localhost:3000/api/bvmt?test=1
```

### Option C: Voir les réponses formatées
```bash
# Juste le nombre de quotes
curl http://localhost:3000/api/bvmt?test=1 | jq '.count'

# Juste les tickers
curl http://localhost:3000/api/bvmt?test=1 | jq '.quotes[].ticker'

# Format lisible
curl http://localhost:3000/api/bvmt?test=1 | jq '.quotes[] | {ticker, price, change_pct}'
```

---

## 🔍 Diagnostiquer le problème

Ouvrez cette page dans votre navigateur:
```
http://localhost:3000/connectivity-diagnostic.html
```

Elle vous dira:
- ✅ État du serveur BVMT
- ✅ État de votre connexion internet
- ✅ Solutions proposées

Ou via API:
```bash
curl http://localhost:3000/api/bvmt/connectivity | jq .
```

---

## 📚 Paramètres disponibles

| Paramètre | Exemple | Effet |
|-----------|---------|-------|
| `test=1` | `?test=1` | Mode test → données immédiatement |
| `mock=1` | `?mock=1` | Alias de test=1 |
| `force=1` | `?force=1` | Ignore cache, essaie PDF |
| `debug=1` | `?debug=1` | Affiche logs détaillés |

### Exemples combinés
```bash
# Mode test avec logs
curl "http://localhost:3000/api/bvmt?test=1&debug=1" | jq .

# Normal (avec cache)
curl "http://localhost:3000/api/bvmt" | jq .

# Forcer extraction PDF
curl "http://localhost:3000/api/bvmt?force=1" | jq .
```

---

## 📊 Format de Réponse

### Mode test (`?test=1`)
```json
{
  "source": "test_mock",
  "count": 10,
  "quotes": [
    {
      "ticker": "TUNINDEX",
      "price": 9842.50,
      "change_pct": 0.42,
      "volume": 0,
      ...
    },
    ...
  ]
}
```

### Serveur offline (sans test)
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

## 🎯 Cas d'usage courants

### ✅ Développement local
```bash
# Utiliser le mode test
curl http://localhost:3000/api/bvmt?test=1
```

### ✅ Vérifier le cache
```bash
# Sans forcer (retourne cache si valide)
curl http://localhost:3000/api/bvmt
```

### ✅ Forcer l'extraction du PDF
```bash
# Force la récupération même si cache existe
curl "http://localhost:3000/api/bvmt?force=1"
```

### ✅ Mode debug pour les logs
```bash
# Affiche les détails (voir terminal npm run dev)
curl "http://localhost:3000/api/bvmt?debug=1"
```

---

## 💾 Données de test (tickers inclus)

Les 10 tickers disponibles en mode test:

1. **TUNINDEX** - Indice principal (9842.50)
2. **SFBT** - Tunisie Télécom (16.25)
3. **BNA** - Banque Nationale (8.12)
4. **ATB** - Bank ATB (4.87)
5. **BIAT** - Banque Int. Arab. de Tunisie (112.50)
6. **BT** - Bank of Tunisia (7.40)
7. **PGH** - Pharmacie Guelma (9.65)
8. **STB** - Société Tunisienne de Banque (2.85)
9. **TLS** - Tunisie Leasing (3.12)
10. **BH BANK** - BH Bank (22.40)

---

## 🔧 Configuration (optionnel)

Les variables d'environnement pour la production:

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Anthropic (pour extraction Claude)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📖 Documentation

| Document | Contenu |
|----------|---------|
| `SOLUTIONS_RESUME.md` | Résumé des solutions |
| `GUIDE_SERVEUR_OFFLINE.md` | Guide complet (détaillé) |
| `SOLUTION_BVMT_OFFLINE.md` | Solutions spécifiques |
| `GUIDE_RESTAURATION.txt` | (Fichier original) |

---

## ✨ Résumé visuel

```
┌─────────────────────────────────────────┐
│  API BVMT - États possibles              │
├─────────────────────────────────────────┤
│                                          │
│  ?test=1          → Mode test ✅         │
│  (pas de cache)   → Fallback ✅          │
│  (avec cache)     → Cache données ✅     │
│  ?force=1         → Essai PDF ✅         │
│                                          │
│  /connectivity    → Diagnostic 🔍        │
│  /connectivity.html → Page interactive 🌐
│                                          │
└─────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### Le serveur ne démarre pas
```bash
npm install
npm run dev
```

### La page de diagnostic charge pas
```
Vérifiez: http://localhost:3000/connectivity-diagnostic.html
Le serveur doit tourner: npm run dev
```

### Les données n'apparaissent pas
```bash
# Vérifier que c'est du JSON valide
curl http://localhost:3000/api/bvmt?test=1 | jq .

# Vérifier la source (si pas test=1)
curl http://localhost:3000/api/bvmt | jq '.source'
```

### Erreur 500 sur l'API
```bash
# Vérifier les logs
npm run dev  # Regarder le terminal

# Vérifier les variables d'environnement
cat .env.local | grep SUPABASE
```

---

## 🎉 Prochains pas

✅ **Court terme:** Utiliser `?test=1` pour développer
✅ **Moyen terme:** Monitorez `/connectivity-diagnostic.html`
✅ **Long terme:** Restaurer l'accès au serveur BVMT

---

**Questions?** Consultez les fichiers de documentation! 📚

