#!/bin/bash

# Script pour tester l'API BVMT automatiquement
# Ce script lance le serveur, teste l'API, et affiche les résultats

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 Test Automatique de l'API BVMT                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier si node est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Lancer le serveur en arrière-plan
echo "📌 Démarrage du serveur..."
npm run dev > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Attendre que le serveur soit prêt
echo "⏳ Attente de la réaction du serveur (max 30s)..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/bvmt?test=1 > /dev/null 2>&1; then
        echo "✅ Serveur prêt!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo ""

# Lancer les tests
echo "🧪 Lancement des tests..."
echo ""

node /workspaces/Elinoja-patrimoine/run-tests.js
TEST_EXIT_CODE=$?

echo ""

# Tuer le serveur
echo "🛑 Arrêt du serveur..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ TESTS RÉUSSIS! 🎉"
else
    echo "❌ CERTAINS TESTS ONT ÉCHOUÉ"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $TEST_EXIT_CODE
