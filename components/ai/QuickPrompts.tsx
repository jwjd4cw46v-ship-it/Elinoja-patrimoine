'use client'
// components/ai/QuickPrompts.tsx

const PROMPTS = [
  '📈 Analyse BIAT',
  '🔍 Comparer SFBT et BNA',
  '🔔 Mes alertes actives',
  '📰 Derniers articles',
  '💡 Opportunités du marché',
  '📊 Analyse SFBT',
]

const FULL_PROMPTS: Record<string, string> = {
  '📈 Analyse BIAT':           'Fais-moi une analyse complète de l\'action BIAT',
  '🔍 Comparer SFBT et BNA':  'Compare les actions SFBT et BNA',
  '🔔 Mes alertes actives':   'Quelles sont mes alertes de watchlist actives ?',
  '📰 Derniers articles':     'Quels sont les derniers articles publiés sur la plateforme ?',
  '💡 Opportunités du marché':'Quelles sont les opportunités d\'achat sur la BVMT en ce moment ?',
  '📊 Analyse SFBT':          'Donne-moi l\'analyse technique et fondamentale de SFBT',
}

export function QuickPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '320px' }}>
      {PROMPTS.map(p => (
        <button
          key={p}
          onClick={() => onSelect(FULL_PROMPTS[p] ?? p)}
          style={{
            background:   'rgba(212,175,55,0.06)',
            border:       '1px solid rgba(212,175,55,0.15)',
            borderRadius: '20px',
            padding:      '5px 10px',
            fontSize:     '11px',
            color:        '#A0A0A0',
            cursor:       'pointer',
            transition:   'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = 'rgba(212,175,55,0.12)'
            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'
            e.currentTarget.style.color       = '#D4AF37'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = 'rgba(212,175,55,0.06)'
            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'
            e.currentTarget.style.color       = '#A0A0A0'
          }}>
          {p}
        </button>
      ))}
    </div>
  )
}
