# ✅ Tester l'API BVMT - Guide Complet

## 🎯 En 3 Étapes

### Étape 1️⃣: Ouvrir Terminal 1
```bash
npm run dev
```
Attendez le message: `> Local: http://localhost:3000` ✅

### Étape 2️⃣: Ouvrir Terminal 2
```bash
# Option A: Test rapide (Python)
python3 test-api.py

# Option B: Test rapide (Node)
node quick-test.js

# Option C: Test complet (Node)
node run-tests.js
```

### Étape 3️⃣: Lire les Résultats
```bash
# Affichage immédiat dans le terminal
# OU lire le fichier de rapport
cat TEST_REPORT.txt
```

---

## 📊 Scripts Disponibles

| Script | Langue | Temps | Commande |
|--------|--------|-------|----------|
| **test-api.py** | Python | 5s | `python3 test-api.py` |
| **quick-test.js** | Node | 5s | `node quick-test.js` |
| **run-tests.js** | Node | 30s | `node run-tests.js` |
| **test-and-save.js** | Node | 5s | `node test-and-save.js` |

---

## 🚀 Méthodes Rapides

### Méthode 1: CLI (Ligne de commande)

```bash
# Terminal 1
npm run dev

# Terminal 2
python3 test-api.py
```

### Méthode 2: Navigateur Web

**Terminal 1:**
```bash
npm run dev
```

**Navigateur, ouvrez:**
```
http://localhost:3000/api/bvmt?test=1
```

Vous devez voir un JSON avec 10 tickers BVMT ✅

### Méthode 3: Diagnostic Interactif

**Terminal 1:**
```bash
npm run dev
```

**Navigateur, ouvrez:**
```
http://localhost:3000/connectivity-diagnostic.html
```

Page de diagnostic complète avec statuts 🟢🟡🔴

---

## 📋 Résultats Attendus

### Test Mode Test (`?test=1`)
```json
{
  "source": "test_mock",
  "count": 10,
  "quotes": [
    {"ticker": "TUNINDEX", "price": 9842.5, ...},
    {"ticker": "SFBT", "price": 16.25, ...},
    ...
  ]
}
```
✅ Source: `test_mock` = Succès

### Test API Normal
```json
{
  "source": "cache",  ou "fallback"
  "count": 10,
  "quotes": [...]
}
```
✅ Count > 0 = Succès

### Test Diagnostic
```json
{
  "status": "OFFLINE",  ou "ONLINE"
  "summary": {"ok": 2, "failed": 2, ...},
  "tests": [...]
}
```
✅ Affiche le diagnostic = Succès

---

## ✨ Exemples Concrets

### Exemple 1: Test Rapide
```bash
# Terminal 1
$ npm run dev
> next dev
> Local: http://localhost:3000 ✅

# Terminal 2
$ python3 test-api.py
⏳ Test de l'API BVMT...

============================================================
🧪 RAPPORT DE TEST - API BVMT
============================================================
Date: 01/06/2026 12:00:00
URL: http://localhost:3000

──────────────────────────────────────────────────────────
RÉSULTATS DES TESTS
──────────────────────────────────────────────────────────

📌 Mode Test (?test=1)
   URL: http://localhost:3000/api/bvmt?test=1
   ✅ PASS (200)
   Data: {"source": "test_mock", "count": 10, ...

📌 API Normal
   URL: http://localhost:3000/api/bvmt
   ✅ PASS (200)
   Data: {"source": "fallback", "count": 10, ...

📌 Diagnostic Connectivité
   URL: http://localhost:3000/api/bvmt/connectivity
   ✅ PASS (200)
   Data: {"status": "OFFLINE", "summary": {

──────────────────────────────────────────────────────────
RÉSUMÉ FINAL
──────────────────────────────────────────────────────────

✅ Tests réussis: 3
❌ Tests échoués: 0
⚠️  Erreurs: 0
📈 Taux de réussite: 100%

🎉 TOUS LES TESTS SONT PASSÉS! ✨

✅ Rapport sauvegardé dans: TEST_REPORT.txt
```

### Exemple 2: Via Navigateur
```
1. Lancer: npm run dev
2. Ouvrir: http://localhost:3000/api/bvmt?test=1
3. Vous voyez le JSON ✅

ou

1. Lancer: npm run dev
2. Ouvrir: http://localhost:3000/connectivity-diagnostic.html
3. La page teste automatiquement et affiche le statut
```

---

## 🔍 Fichiers de Résultats

Après avoir lancé un test, regardez:

```bash
# Résultats du test Python
cat TEST_REPORT.txt

# Résultats du test Node complet
cat TEST_RESULTS.json

# Résultats du test API
cat API_TEST_REPORT.md
```

---

## 🐛 Troubleshooting

### ❌ "Connection refused"
```bash
# Vérifier que le serveur tourne
curl http://localhost:3000/api/bvmt?test=1

# Si erreur: lancer npm run dev dans un autre terminal
npm run dev
```

### ❌ "python3: command not found"
```bash
# Utiliser Node à la place
node quick-test.js
```

### ❌ "No such file or directory"
```bash
# Vérifier que vous êtes dans le bon dossier
pwd
cd /workspaces/Elinoja-patrimoine
ls test-api.py
```

### ❌ Port 3000 déjà utilisé
```bash
# Vérifier quel processus utilise le port
lsof -i :3000

# Tuer le processus (exemple avec PID 1234)
kill 1234

# Puis relancer
npm run dev
```

---

## 📚 Prochaines Étapes

Après avoir testé:

1. ✅ Vérifier que les tests passent
2. ✅ Consulter les fichiers de résultats
3. ✅ Lire la documentation si besoin
4. ✅ Faire des modifications si nécessaire

---

## 🎯 Résumé

```
┌─────────────────────────────────────────┐
│  TESTER L'API BVMT EN 3 ÉTAPES          │
├─────────────────────────────────────────┤
│                                         │
│  1️⃣  Terminal 1: npm run dev            │
│  2️⃣  Terminal 2: python3 test-api.py    │
│  3️⃣  Lire les résultats ✅              │
│                                         │
│  OU                                     │
│                                         │
│  1️⃣  Terminal: npm run dev              │
│  2️⃣  Navigateur:                        │
│      http://localhost:3000/api/bvmt?test=1 │
│  3️⃣  Vous voyez le JSON ✅              │
│                                         │
└─────────────────────────────────────────┘
```

---

**Vous êtes maintenant prêt à tester l'API BVMT!** 🚀

Si vous avez des questions, consultez:
- `HOW_TO_TEST.md` - Guide détaillé
- `QUICKSTART.md` - Démarrage rapide
- `GUIDE_SERVEUR_OFFLINE.md` - Guide complet
