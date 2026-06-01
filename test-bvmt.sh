#!/bin/bash

# Script de test automatisé pour l'API BVMT
# Utilisation: ./test-bvmt.sh

API_URL="http://localhost:3000/api/bvmt"
RESET='\033[0m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

echo -e "${BLUE}=== Tests API BVMT ===${RESET}\n"

# Test 1: Vérifier que le serveur est accessible
echo -e "${BLUE}Test 1: Vérifier la connexion au serveur${RESET}"
if curl -s -o /dev/null -w "%{http_code}" "$API_URL" | grep -q "200"; then
    echo -e "${GREEN}✓ Serveur accessible${RESET}\n"
else
    echo -e "${RED}✗ Serveur non accessible${RESET}"
    echo "   Lancez: npm run dev"
    exit 1
fi

# Test 2: Requête basique avec cache
echo -e "${BLUE}Test 2: Requête basique (avec cache)${RESET}"
RESPONSE=$(curl -s "$API_URL")
SOURCE=$(echo "$RESPONSE" | jq -r '.source' 2>/dev/null)
COUNT=$(echo "$RESPONSE" | jq -r '.count' 2>/dev/null)
echo -e "   Source: ${YELLOW}$SOURCE${RESET}"
echo -e "   Quotes: ${GREEN}$COUNT${RESET}\n"

# Test 3: Forcer l'extraction du PDF
echo -e "${BLUE}Test 3: Forcer l'extraction du PDF (force=1)${RESET}"
RESPONSE=$(curl -s "${API_URL}?force=1")
SOURCE=$(echo "$RESPONSE" | jq -r '.source' 2>/dev/null)
METHOD=$(echo "$RESPONSE" | jq -r '.method' 2>/dev/null)
COUNT=$(echo "$RESPONSE" | jq -r '.count' 2>/dev/null)
PDF_URL=$(echo "$RESPONSE" | jq -r '.pdf_url' 2>/dev/null)
echo -e "   Source: ${YELLOW}$SOURCE${RESET}"
echo -e "   Méthode: ${YELLOW}$METHOD${RESET}"
echo -e "   Quotes: ${GREEN}$COUNT${RESET}"
if [ "$PDF_URL" != "null" ] && [ -n "$PDF_URL" ]; then
    echo -e "   PDF: ${YELLOW}$PDF_URL${RESET}"
fi
echo ""

# Test 4: Debug mode
echo -e "${BLUE}Test 4: Mode debug (debug=1)${RESET}"
RESPONSE=$(curl -s "${API_URL}?debug=1")
echo -e "   Réponse complète:"
echo "$RESPONSE" | jq '.' | head -30
echo -e "   (voir le terminal npm run dev pour les logs complets)\n"

# Test 5: Afficher les tickers
echo -e "${BLUE}Test 5: Tickers disponibles${RESET}"
TICKERS=$(curl -s "$API_URL" | jq -r '.quotes[].ticker' 2>/dev/null)
COUNT=$(echo "$TICKERS" | wc -l)
echo -e "   Nombre de tickers: ${GREEN}$COUNT${RESET}"
echo -e "   Tickers:"
echo "$TICKERS" | sed 's/^/   - /'
echo ""

# Test 6: Afficher les variations
echo -e "${BLUE}Test 6: Variations (change_pct)${RESET}"
echo "$RESPONSE" | jq '.quotes | sort_by(.change_pct) | reverse | .[0:3]' | \
  jq -r '.[] | "   \(.ticker): \(.change_pct)% (\(.price))"'
echo ""

# Test 7: Vérifier la structure des données
echo -e "${BLUE}Test 7: Structure des données (premier quote)${RESET}"
echo "$RESPONSE" | jq '.quotes[0]'
echo ""

echo -e "${GREEN}✓ Tests terminés!${RESET}"

