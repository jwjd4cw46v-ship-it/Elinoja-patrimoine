#!/bin/bash

# Script pour tester l'URL du PDF BVMT
# Récupère le dernier jour ouvrable et teste l'URL

echo "🧪 Test de l'URL PDF BVMT"
echo "========================="
echo ""

# Fonction pour déterminer le dernier jour ouvrable (lun-ven, hors fériés)
get_last_business_day() {
    local current_date=$(date '+%Y-%m-%d')
    local day_of_week=$(date '+%u') # 1=lun, 7=dim
    
    # Jours fériés fixes
    declare -A fixed_holidays=([01-01]=1 [01-14]=1 [03-20]=1 [04-09]=1 [05-01]=1 [07-25]=1 [08-13]=1 [10-15]=1)
    
    # Jours fériés variables 2025-2026
    declare -A variable_holidays=(
        [2025-03-30]=1 [2025-03-31]=1 [2025-04-01]=1
        [2025-06-06]=1 [2025-06-07]=1 [2025-06-08]=1
        [2025-06-26]=1 [2025-09-04]=1
        [2026-03-19]=1 [2026-03-20]=1 [2026-03-21]=1
        [2026-05-26]=1 [2026-05-27]=1 [2026-05-28]=1
        [2026-06-16]=1 [2026-08-25]=1
    )
    
    local test_date=$(date '+%Y-%m-%d')
    local count=0
    
    while [ $count -lt 14 ]; do
        local test_dow=$(date -d "$test_date" '+%u' 2>/dev/null || echo "")
        local test_mmdd=$(date -d "$test_date" '+%m-%d' 2>/dev/null || echo "")
        local test_yyyymmdd="$test_date"
        
        # Vérifie si c'est un jour ouvrable (lun-ven, pas de fériés)
        if [[ $test_dow -lt 6 ]] && [[ -z ${fixed_holidays[$test_mmdd]:-} ]] && [[ -z ${variable_holidays[$test_yyyymmdd]:-} ]]; then
            echo "$test_date"
            return
        fi
        
        test_date=$(date -d "$test_date - 1 day" '+%Y-%m-%d')
        ((count++))
    done
    
    echo "$current_date"
}

# Fonction pour construire l'URL
build_pdf_url() {
    local date=$1
    local year=$(echo $date | cut -d'-' -f1)
    local month=$(echo $date | cut -d'-' -f2)
    local day=$(echo $date | cut -d'-' -f3)
    
    echo "https://tunis-stockexchange.com/sites/default/files/${year}-${month}/fr-physionomie-seance-${year}-${month}-${day}.pdf"
}

# Récupérer le dernier jour ouvrable
echo "📅 Détermination du dernier jour ouvrable..."
LAST_BUSINESS_DAY=$(get_last_business_day)
echo "   Date: $LAST_BUSINESS_DAY"
echo ""

# Construire l'URL
PDF_URL=$(build_pdf_url "$LAST_BUSINESS_DAY")
echo "🔗 URL construite:"
echo "   $PDF_URL"
echo ""

# Tester l'URL avec curl
echo "⏳ Test de connexion à l'URL..."
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -H "Accept: application/pdf,*/*" \
    -H "Accept-Language: fr-FR,fr;q=0.9" \
    -H "Referer: https://tunis-stockexchange.com/" \
    --max-time 10 \
    "$PDF_URL")

echo "📊 Résultat:"
echo "   Code HTTP: $HTTP_CODE"

case $HTTP_CODE in
    200)
        echo "   ✅ PDF trouvé et accessible!"
        
        # Vérifier la taille du fichier
        SIZE=$(curl -s -I -H "User-Agent: Mozilla/5.0" "$PDF_URL" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
        if [ -n "$SIZE" ]; then
            SIZE_MB=$(echo "scale=2; $SIZE / 1024 / 1024" | bc)
            echo "   Taille: ${SIZE_MB} MB"
        fi
        ;;
    404)
        echo "   ❌ PDF non trouvé (erreur 404)"
        echo "   Le serveur BVMT n'a pas de PDF pour cette date"
        ;;
    403)
        echo "   ⚠️  Accès refusé (erreur 403)"
        echo "   Le serveur bloque les requêtes"
        ;;
    000)
        echo "   ⚠️  Erreur de connexion (timeout ou connexion refusée)"
        echo "   Le serveur BVMT pourrait être indisponible"
        ;;
    *)
        echo "   ⚠️  Code HTTP: $HTTP_CODE"
        ;;
esac

echo ""
echo "🔍 Informations supplémentaires:"
echo "   Essai J-1 si le PDF n'existe pas..."

# Essai J-1
PREV_DATE=$(date -d "$LAST_BUSINESS_DAY - 1 day" '+%Y-%m-%d' 2>/dev/null || echo "")
if [ -n "$PREV_DATE" ]; then
    PREV_PDF_URL=$(build_pdf_url "$PREV_DATE")
    echo "   Date J-1: $PREV_DATE"
    echo "   URL: $PREV_PDF_URL"
    
    PREV_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "User-Agent: Mozilla/5.0" \
        --max-time 10 \
        "$PREV_PDF_URL")
    
    echo "   Code HTTP: $PREV_HTTP_CODE"
    if [ "$PREV_HTTP_CODE" = "200" ]; then
        echo "   ✅ PDF J-1 accessible (fallback OK)"
    else
        echo "   ❌ PDF J-1 non trouvé"
    fi
fi

echo ""
echo "✅ Test terminé"

