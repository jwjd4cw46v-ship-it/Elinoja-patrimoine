# 🧪 Comment Lancer les Tests Automatisés

## Option 1: Test Rapide (Recommandé ⚡)

### Terminal 1: Lancer le serveur
```bash
npm run dev
```

### Terminal 2: Lancer le test
```bash
node quick-test.js
```

**Résultat attendu:**
```
🧪 TEST RAPIDE API BVMT

⏳ Mode Test... ✅
   → 10 quotes
   → source: test_mock
⏳ API Normal... ✅
   → 10 quotes
   → source: fallback
⏳ Diagnostic... ✅
   → source: test_mock

📊 Résultats: 3 passé(s), 0 échoué(s)
```

---

## Option 2: Suite Complète de Tests

### Terminal 1: Lancer le serveur
```bash
npm run dev
```

### Terminal 2: Lancer tous les tests
```bash
node run-tests.js
```

**Résultat attendu:**
```
╔════════════════════════════════════════════════════════════╗
║         🧪 BVMT API - Suite de Tests Automatisée           ║
╚════════════════════════════════════════════════════════════╝

🧪 Test: Mode test (?test=1)
   Status: 200
   ✅ PASS - Response OK

[... plus de détails ...]

📊 RÉSUMÉ FINAL
✅ Tests réussis: 8
❌ Tests échoués: 0
⚠️  Erreurs: 0

📈 Taux de réussite: 100%

🎉 TOUS LES TESTS SONT PASSÉS! ✨
```

Les résultats sont sauvegardés dans `TEST_RESULTS.json`

---

## Option 3: Test Automatique Complet

Lance le serveur, les tests, et ferme automatiquement:

```bash
chmod +x test-auto.sh
./test-auto.sh
```

---

## 📋 Différences entre les Scripts

| Script | Temps | Détails | Pour |
|--------|-------|---------|-----|
| **quick-test.js** | 5 sec | Minimal | Vérification rapide |
| **run-tests.js** | 30 sec | Complet | Diagnostic détaillé |
| **test-auto.sh** | 1 min | Automatique | CI/CD ou test complet |

---

## ✅ Checklist Avant de Tester

- [ ] Node.js installé: `node --version`
- [ ] Dépendances installées: `npm install`
- [ ] Fichiers créés:
  - [ ] `quick-test.js`
  - [ ] `run-tests.js`
  - [ ] `test-auto.sh`

---

## 🚀 Démarrage Rapide

```bash
# Terminal 1
npm run dev

# Terminal 2
node quick-test.js
```

Ça c'est tout! ✨

---

## 🐛 Troubleshooting

### Erreur: "Cannot connect to localhost:3000"
```bash
# Vérifier que le serveur tourne
curl http://localhost:3000/api/bvmt?test=1
```

### Erreur: "Node.js not found"
```bash
# Installer Node.js ou vérifier l'installation
node --version
```

### Erreur: "Permission denied"
```bash
# Rendre le script exécutable
chmod +x test-auto.sh
chmod +x quick-test.js
```

---

## 📊 Interprétation des Résultats

### ✅ Tous les tests passent
```
📈 Taux de réussite: 100%
🎉 TOUS LES TESTS SONT PASSÉS! ✨
```
→ L'API fonctionne correctement

### ⚠️ Certains tests échouent
```
❌ Tests échoués: 1
```
→ Vérifier les logs du serveur avec `npm run dev`

### ❌ Erreur de connexion
```
❌ ERROR - connect ECONNREFUSED 127.0.0.1:3000
```
→ Le serveur n'est pas lancé: `npm run dev`

---

## 💾 Fichier de Résultats

Après `run-tests.js`, un fichier `TEST_RESULTS.json` est créé:

```json
{
  "timestamp": "2026-06-01T12:00:00.000Z",
  "tests": [...],
  "summary": {
    "passed": 8,
    "failed": 0,
    "errors": 0
  }
}
```

---

## 🎯 Prochaines Étapes

1. ✅ Lancer le test rapide: `node quick-test.js`
2. ✅ Vérifier le résultat
3. ✅ Consulter `TEST_RESULTS.json` si besoin
4. ✅ Lancer `run-tests.js` pour un diagnostic complet

---

**Allez-y, lancez les tests maintenant!** 🚀

