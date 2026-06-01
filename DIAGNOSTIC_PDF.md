# 🔧 Guide de Diagnostic - URL PDF BVMT

## Problème identifié
L'URL du PDF BVMT ne fonctionne pas. Voici comment diagnostiquer le problème.

---

## 🚀 Méthode 1 : Page de diagnostic interactive (Recommandée)

### Étape 1 : Lancer le serveur
```bash
npm run dev
```

### Étape 2 : Ouvrir la page de diagnostic
Ouvrez votre navigateur et allez à :
```
http://localhost:3000/diagnostic-pdf.html
```

### Étape 3 : Tester les URLs
La page va automatiquement :
- ✅ Afficher la date actuelle et le dernier jour ouvrable
- ✅ Afficher toutes les URLs générées
- ✅ Tester l'accès (bouton "Tester")
- ✅ Montrer les erreurs de code HTTP

---

## 📋 Méthode 2 : Test manuel avec curl

### Test simple
```bash
# Test pour aujourd'hui (1er juin 2026)
curl -I "https://tunis-stockexchange.com/sites/default/files/2026-06/fr-physionomie-seance-2026-06-01.pdf"
```

**Résultats possibles :**
- `HTTP/2 200` → ✅ PDF accessible
- `HTTP/2 404` → ❌ PDF non trouvé
- `HTTP/2 403` → ⚠️ Accès refusé
- `Connection refused` → ⚠️ Serveur indisponible

### Test avec headers
```bash
curl -v "https://tunis-stockexchange.com/sites/default/files/2026-06/fr-physionomie-seance-2026-06-01.pdf"
```

---

## 🔍 Comprendre le problème

### Possible Issue 1: Date n'est pas un jour ouvrable
Aujourd'hui c'est **1er juin 2026 = dimanche** 🚫 La bourse est fermée!

**Solution:** Le code appelle `getLastBusinessDay()` qui cherche le dernier jour ouvrable
```javascript
function getLastBusinessDay(date = new Date()): Date {
  const d = new Date(date)
  let max = 14
  while (!isBourseOpen(d) && max-- > 0) d.setDate(d.getDate() - 1)
  return d
}
```

**Dernier jour ouvrable avant le 1er juin:**
- 31 mai (samedi) ❌
- 30 mai (vendredi) ✅ **Mais vérifier si jour ouvrable**
- 29 mai (jeudi) ✅ **Mais vérifier si jour ouvrable**
- 28 mai (mercredi) ❌ **Jour férié variable!** (liste: 2026-05-28)
- 27 mai (mardi) ❌ **Jour férié variable!** (liste: 2026-05-27)
- 26 mai (lundi) ❌ **Jour férié variable!** (liste: 2026-05-26)
- 22 mai (jeudi) ✅ **Probablement le dernier jour ouvrable**

**URL générée:**
```
https://tunis-stockexchange.com/sites/default/files/2026-05/fr-physionomie-seance-2026-05-22.pdf
```

### Possible Issue 2: Le serveur BVMT n'a pas de PDF ce jour-là
- Le serveur BVMT publie les PDF en fin de journée
- Si le PDF n'existe pas, l'API essaie J-1

### Possible Issue 3: Problème de connectivité
- Le serveur BVMT pourrait être offline
- Problème de DNS
- Proxy/firewall bloque l'accès

---

## 📊 Vérifier les jours fériés

Les jours fériés définis dans le code :

**Jours fériés fixes (tous les ans) :**
- 01-01 : Jour de l'an
- 01-14 : Fête de la Révolution
- 03-20 : Fête Indépendance
- 04-09 : Fête Martyrs
- 05-01 : Fête Travail
- 07-25 : Fête République
- 08-13 : Fête Femme
- 10-15 : Fête Évacuation

**Jours fériés variables 2025-2026 :**
```
2025: 30-31 mars, 1 avril, 6-8 juin, 26 juin, 4 septembre
2026: 19-21 mars, 26-28 mai, 16 juin, 25 août
```

---

## 🛠️ Comment réparer

### Option 1: Utiliser une date avec PDF disponible
```bash
curl "http://localhost:3000/api/bvmt?date=2025-11-21"
```

### Option 2: Modifier le code pour ignorer les jours fériés (temporairement)
Dans `app/api/bvmt/route.ts`, modifier :
```typescript
const VARIABLE_HOLIDAYS = new Set([
  // Commenter les dates récentes si pas de PDF
  // '2026-05-26','2026-05-27','2026-05-28',
])
```

### Option 3: Forcer l'extraction depuis une date spécifique
```bash
curl "http://localhost:3000/api/bvmt?date=2025-11-21&force=1"
```

---

## ✅ Résumé du diagnostic

| Problème | Symptôme | Solution |
|----------|----------|----------|
| Date non ouvrable | Erreur 404 | Utiliser une date avec jour ouvrable |
| PDF absent | HTTP 404 | Essayer J-1 (automatique) |
| Serveur offline | Timeout | Vérifier BVMT site web |
| Accès refusé | HTTP 403 | Vérifier User-Agent, Referer |
| Cache périmé | Données anciennes | Ajouter `?force=1` |

---

## 🔗 Ressources

- **Site BVMT :** https://tunis-stockexchange.com/
- **Fichier dossier PDF :** `/sites/default/files/YYYY-MM/`
- **Format PDF :** `fr-physionomie-seance-YYYY-MM-DD.pdf`

---

## 📞 Besoin d'aide?

1. Testez la page `/diagnostic-pdf.html`
2. Vérifiez le code HTTP retourné
3. Consultez les logs du serveur : `npm run dev`
4. Testez manuellement une URL dans le navigateur

