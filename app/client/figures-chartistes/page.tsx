'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle } from 'lucide-react'

const gold = '#D4AF37'

// ─── Types ───────────────────────────────────────────────────────
interface Figure {
  nom: string
  type: 'haussière' | 'baissière' | 'neutre'
  description: string
  objectif: string
  probabilite: number
  probabiliteLabel: string
  confirmation: string[]
  invalidite: string[]
}

// ─── Image figure depuis /public/figures/ ────────────────────────
function nomToSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function FigureImage({ nom }: { nom: string }) {
  const slug = nomToSlug(nom)
  const [exists, setExists] = useState<boolean | null>(null)

  useEffect(() => {
    const img = new window.Image()
    img.onload  = () => setExists(true)
    img.onerror = () => setExists(false)
    img.src = `/figures/${slug}.jpeg`
  }, [slug])

  if (exists === null) return <div style={{ height: 180, background: '#0A0A0A' }} />
  if (exists === false) return null

  return (
    <img
      src={`/figures/${slug}.jpeg`}
      alt={nom}
      style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'contain', background: '#0A0A0A' }}
    />
  )
}

const categories = [
  {
    label: 'RETOURNEMENT',
    color: '#FF6B35',
    figures: [
      { nom: 'Biseau Ascendant',           type: 'baissière', description: "Deux lignes convergentes ascendantes. La dynamique haussière s'essouffle. La cassure de la borne basse confirme le retournement baissier.", objectif: "Hauteur maximale du biseau reportée depuis le point de cassure baissière.", probabilite: 68, probabiliteLabel: 'Modérée à élevée', confirmation: ['Cassure nette de la borne basse','Clôture sous le support','Augmentation des volumes','Validation sur timeframe supérieur'], invalidite: ['Réintégration du biseau','Cassure haussière de la borne haute','Nouveau sommet supérieur'] },
      { nom: 'Biseau Descendant',           type: 'haussière', description: "Deux lignes convergentes descendantes. La pression vendeuse faiblit. La cassure de la borne haute signale un retournement haussier.", objectif: "Hauteur maximale du biseau reportée depuis le point de cassure haussière.", probabilite: 66, probabiliteLabel: 'Modérée', confirmation: ['Cassure de la borne haute','Clôture au-dessus de la résistance','Volumes croissants','Confirmation sur timeframe supérieur'], invalidite: ['Réintégration du biseau','Nouveau creux inférieur','Volumes faibles'] },
      { nom: 'Tête et Épaules',             type: 'baissière', description: "Figure majeure de retournement baissière après tendance haussière. Trois sommets dont le central est le plus élevé.", objectif: "Hauteur de la tête reportée à la baisse depuis la neckline.", probabilite: 74, probabiliteLabel: 'Élevée', confirmation: ['Cassure de la neckline avec volume','Clôture sous la neckline','Pull-back éventuel sur la neckline'], invalidite: ['Réintégration au-dessus de la neckline','Nouveau sommet supérieur à la tête'] },
      { nom: 'Tête et Épaules Inversée',    type: 'haussière', description: "Figure de retournement haussière après tendance baissière. Trois creux dont le central est le plus bas.", objectif: "Hauteur de la tête reportée à la hausse depuis la neckline.", probabilite: 72, probabiliteLabel: 'Élevée', confirmation: ['Cassure de la neckline','Volumes forts à la cassure','Pull-back sur la neckline'], invalidite: ['Rechute sous la neckline','Nouveau plus bas inférieur à la tête'] },
      { nom: 'Double Sommet',               type: 'baissière', description: "Deux sommets au même niveau forment une résistance forte. Retournement baissier probable après tendance haussière.", objectif: "Hauteur du pattern reportée à la baisse depuis le support.", probabilite: 68, probabiliteLabel: 'Modérée à élevée', confirmation: ['Cassure du support intermédiaire','Volumes croissants à la cassure','Deuxième sommet avec volume décroissant'], invalidite: ['Dépassement des sommets précédents','Réintégration du support'] },
      { nom: 'Double Creux',                type: 'haussière', description: "Deux creux au même niveau forment un support fort. Retournement haussier probable après tendance baissière.", objectif: "Hauteur du pattern reportée à la hausse depuis la résistance.", probabilite: 70, probabiliteLabel: 'Élevée', confirmation: ['Cassure de la résistance intermédiaire','Volumes croissants','RSI divergent au deuxième creux'], invalidite: ['Enfoncement des creux','Volumes faibles à la cassure'] },
      { nom: 'Triple Sommet',               type: 'baissière', description: "Trois sommets consécutifs au même niveau. Épuisement des acheteurs très marqué.", objectif: "Hauteur du pattern reportée à la baisse depuis le support.", probabilite: 65, probabiliteLabel: 'Modérée', confirmation: ['Trois tentatives échouées','Volumes décroissants sur chaque sommet','Cassure du support avec volume'], invalidite: ['Dépassement de la résistance','Volumes croissants au 3ème sommet'] },
      { nom: 'Triple Creux',                type: 'haussière', description: "Trois creux consécutifs au même niveau. Épuisement des vendeurs très marqué.", objectif: "Hauteur du pattern reportée à la hausse depuis la résistance.", probabilite: 63, probabiliteLabel: 'Modérée', confirmation: ['Trois rebonds successifs','Volumes croissants sur les rebonds','Cassure de la résistance'], invalidite: ['Enfoncement du support','Volumes faibles sur les rebonds'] },
      { nom: 'Diamant de Sommet',           type: 'neutre', description: "Formation en losange au sommet d'une tendance. Signale un retournement possible dans les deux directions.", objectif: "Hauteur maximale du losange reportée depuis le point de cassure.", probabilite: 62, probabiliteLabel: 'Modérée', confirmation: ['Cassure nette d\'un côté','Volumes forts à la cassure','Clôture hors du losange'], invalidite: ['Retour à l\'intérieur du losange','Volumes faibles'] },
      { nom: 'Diamant de Creux',            type: 'haussière', description: "Formation en losange en bas de tendance. Signale un retournement haussier probable.", objectif: "Hauteur maximale du losange reportée à la hausse.", probabilite: 60, probabiliteLabel: 'Modérée', confirmation: ['Cassure haussière','Volumes croissants','Clôture au-dessus du losange'], invalidite: ['Rechute à l\'intérieur','Volumes faibles'] },
    ] as Figure[],
  },
  {
    label: 'CONTINUATION',
    color: '#00C853',
    figures: [
      { nom: 'Triangle Ascendant',   type: 'haussière', description: "Résistance horizontale avec support montant. Les acheteurs deviennent de plus en plus agressifs.", objectif: "Hauteur du triangle reportée à la hausse depuis le point de cassure.", probabilite: 72, probabiliteLabel: 'Élevée', confirmation: ['Cassure de la résistance horizontale','Volumes forts à la cassure','Pull-back possible sur la résistance'], invalidite: ['Cassure du support ascendant','Volumes faibles'] },
      { nom: 'Triangle Descendant',  type: 'baissière', description: "Support horizontal avec résistance descendante. Les vendeurs deviennent de plus en plus agressifs.", objectif: "Hauteur du triangle reportée à la baisse depuis le point de cassure.", probabilite: 70, probabiliteLabel: 'Élevée', confirmation: ['Cassure du support horizontal','Volumes forts','Clôture sous le support'], invalidite: ['Cassure de la résistance descendante','Volumes faibles'] },
      { nom: 'Triangle Symétrique',  type: 'neutre',    description: "Convergence des deux lignes de tendance. La direction est indéterminée avant la cassure.", objectif: "Hauteur du triangle reportée dans la direction de la cassure.", probabilite: 60, probabiliteLabel: 'Modérée', confirmation: ['Cassure nette d\'un côté avec volume','Clôture hors du triangle'], invalidite: ['Cassure du côté opposé','Volumes très faibles'] },
      { nom: 'Drapeau Haussier',     type: 'haussière', description: "Consolidation courte contre la tendance principale après une forte impulsion haussière. Très fiable.", objectif: "Hauteur du mât reportée depuis la cassure du drapeau.", probabilite: 78, probabiliteLabel: 'Très élevée', confirmation: ['Mât fort et directionnel','Consolidation en canal contre la tendance','Cassure avec volumes'], invalidite: ['Consolidation trop longue (>3 semaines)','Cassure dans la mauvaise direction'] },
      { nom: 'Drapeau Baissier',     type: 'baissière', description: "Consolidation courte contre la tendance principale après une forte impulsion baissière. Très fiable.", objectif: "Hauteur du mât reportée à la baisse depuis la cassure.", probabilite: 76, probabiliteLabel: 'Très élevée', confirmation: ['Mât baissier fort','Consolidation haussière en canal','Cassure baissière avec volume'], invalidite: ['Cassure haussière','Formation trop longue'] },
      { nom: 'Fanion Haussier',      type: 'haussière', description: "Similaire au drapeau mais en triangle symétrique. Figure de continuation haussière très fiable.", objectif: "Hauteur du mât reportée depuis la cassure du fanion.", probabilite: 75, probabiliteLabel: 'Élevée', confirmation: ['Mât vertical fort','Fanion en triangle convergent','Cassure haussière avec volume'], invalidite: ['Fanion trop large','Cassure baissière'] },
      { nom: 'Fanion Baissier',      type: 'baissière', description: "Triangle symétrique formé après un mât baissier. Figure de continuation baissière fiable.", objectif: "Hauteur du mât reportée à la baisse depuis la cassure.", probabilite: 73, probabiliteLabel: 'Élevée', confirmation: ['Mât baissier fort','Triangle convergent','Cassure baissière avec volume'], invalidite: ['Cassure haussière','Fanion trop large'] },
      { nom: 'Rectangle Haussier',   type: 'haussière', description: "Zone de congestion horizontale dans une tendance haussière. Continuation probable à la hausse.", objectif: "Hauteur du rectangle reportée à la hausse depuis la cassure.", probabilite: 65, probabiliteLabel: 'Modérée', confirmation: ['Cassure de la résistance avec volume','2-3 touches de chaque côté'], invalidite: ['Cassure du support','Multiples faux signaux'] },
      { nom: 'Rectangle Baissier',   type: 'baissière', description: "Zone de congestion horizontale dans une tendance baissière. Continuation probable à la baisse.", objectif: "Hauteur du rectangle reportée à la baisse depuis la cassure.", probabilite: 63, probabiliteLabel: 'Modérée', confirmation: ['Cassure du support avec volume','2-3 touches de chaque côté'], invalidite: ['Cassure de la résistance','Volumes faibles'] },
      { nom: 'Canal Haussier',       type: 'haussière', description: "Deux droites parallèles ascendantes. Les retours sur la borne basse sont des opportunités d'achat.", objectif: "Largeur du canal reportée à la hausse depuis la borne basse.", probabilite: 70, probabiliteLabel: 'Élevée', confirmation: ['Rebond répété sur la borne basse','Volumes dans le sens de la hausse'], invalidite: ['Cassure de la borne basse','Volumes décroissants sur la hausse'] },
      { nom: 'Canal Baissier',       type: 'baissière', description: "Deux droites parallèles descendantes. Les retours sur la borne haute sont des opportunités de vente.", objectif: "Largeur du canal reportée à la baisse depuis la borne haute.", probabilite: 70, probabiliteLabel: 'Élevée', confirmation: ['Respect des deux bornes','Volumes croissants à la baisse'], invalidite: ['Cassure de la borne haute','Volumes décroissants sur la baisse'] },
      { nom: 'Coupe avec Anse',      type: 'haussière', description: "Consolidation en U (coupe) suivie d'une courte correction (anse). Figure de continuation haussière puissante.", objectif: "Profondeur de la coupe reportée à la hausse depuis la cassure de l'anse.", probabilite: 76, probabiliteLabel: 'Élevée', confirmation: ['Coupe en U régulier','Anse peu profonde','Cassure avec volumes forts'], invalidite: ['Coupe en V trop rapide','Anse trop profonde'] },
    ] as Figure[],
  },
  {
    label: 'FIGURES RARES',
    color: '#D4AF37',
    figures: [
      { nom: 'Élargissement Ascendant',  type: 'neutre',    description: "Deux lignes divergentes avec résistance montante et support montant. Volatilité croissante. Direction incertaine.", objectif: "Hauteur maximale de la figure reportée depuis le point de cassure.", probabilite: 55, probabiliteLabel: 'Faible à modérée', confirmation: ['Cassure nette d\'un côté avec volume fort','Clôture hors de la figure'], invalidite: ['Retour à l\'intérieur','Volumes faibles'] },
      { nom: 'Élargissement Descendant', type: 'neutre',    description: "Deux lignes divergentes avec résistance descendante et support descendant. Signal de désordre du marché.", objectif: "Hauteur maximale de la figure reportée depuis le point de cassure.", probabilite: 55, probabiliteLabel: 'Faible à modérée', confirmation: ['Cassure nette avec volume','Clôture hors de la figure'], invalidite: ['Retour à l\'intérieur','Volumes trop faibles'] },
      { nom: 'Mégaphone',               type: 'neutre',    description: "Élargissement symétrique avec oscillations croissantes. Signal de forte volatilité et d'incertitude.", objectif: "Hauteur maximale de la figure reportée depuis le point de cassure.", probabilite: 52, probabiliteLabel: 'Faible', confirmation: ['Cassure avec fort volume','Minimum 5 points de contact','Clôture hors de la figure'], invalidite: ['Retour à l\'intérieur','Volumes insuffisants'] },
      { nom: 'Coin Ascendant',          type: 'baissière', description: "Canal convergent ascendant. Bien que les prix montent, la dynamique s'essoufle. Signal de retournement baissier.", objectif: "Hauteur de la figure reportée à la baisse depuis le point de cassure.", probabilite: 65, probabiliteLabel: 'Modérée', confirmation: ['Cassure baissière de la borne basse','Volumes croissants','Clôture sous le support'], invalidite: ['Cassure haussière (rare mais possible)','Réintégration du coin'] },
      { nom: 'Coin Descendant',         type: 'haussière', description: "Canal convergent descendant. Bien que les prix baissent, la pression vendeuse s'affaiblit. Signal de retournement haussier.", objectif: "Hauteur de la figure reportée à la hausse depuis le point de cassure.", probabilite: 65, probabiliteLabel: 'Modérée', confirmation: ['Cassure haussière de la borne haute','Volumes croissants','Clôture au-dessus'], invalidite: ['Cassure baissière','Réintégration du coin'] },
      { nom: 'Îlot de Retournement',    type: 'baissière', description: "Gap à la hausse puis gap à la baisse formant un îlot isolé. Signal de retournement très puissant.", objectif: "Hauteur de l'îlot reportée depuis le point de cassure.", probabilite: 78, probabiliteLabel: 'Très élevée', confirmation: ['Gap de rupture confirmé','Volumes très forts sur les gaps','Clôture hors de l\'îlot'], invalidite: ['Comblement du gap','Volumes faibles'] },
    ] as Figure[],
  },
  {
    label: 'HARMONIQUES',
    color: '#9C27B0',
    figures: [
      { nom: 'Gartley Haussier',          type: 'haussière', description: "Pattern XABCD avec retracements de Fibonacci précis (XA=0.618, AB=0.382-0.886, BC=0.382-0.886, CD=0.786). Signal haussier en zone D.", objectif: "Extension de AD vers les niveaux 0.618 et 1.27 de XA.", probabilite: 70, probabiliteLabel: 'Élevée', confirmation: ['Zone D alignée avec 0.786 de XA','RSI en survente','Volumes décroissants sur AD'], invalidite: ['Dépassement du point X','Ratios Fibonacci non respectés'] },
      { nom: 'Gartley Baissier',          type: 'baissière', description: "Pattern XABCD inversé avec retracements de Fibonacci précis. Signal baissier en zone D.", objectif: "Extension de AD vers les niveaux 0.618 et 1.27 de XA.", probabilite: 68, probabiliteLabel: 'Modérée à élevée', confirmation: ['Zone D alignée avec 0.786 de XA','RSI en surachat','Volumes décroissants'], invalidite: ['Dépassement du point X','Ratios non respectés'] },
      { nom: 'Chauve-souris Haussière',   type: 'haussière', description: "Pattern harmonique avec AB=0.382-0.500 de XA et CD=0.886 de XA. Zone D plus profonde que le Gartley.", objectif: "Extension vers 1.618-2.618 de BC.", probabilite: 72, probabiliteLabel: 'Élevée', confirmation: ['Zone D à 0.886 de XA','AB à 0.382-0.500','Volumes décroissants en D'], invalidite: ['AB dépasse 0.618 de XA','Dépassement du point X'] },
      { nom: 'Chauve-souris Baissière',   type: 'baissière', description: "Pattern harmonique baissier avec AB=0.382-0.500 et CD=0.886 de XA. Retournement à la baisse attendu en zone D.", objectif: "Extension vers 1.618-2.618 de BC.", probabilite: 70, probabiliteLabel: 'Élevée', confirmation: ['Zone D à 0.886 de XA','RSI en surachat','AB à 0.382-0.500'], invalidite: ['AB dépasse 0.618','Dépassement du point X'] },
      { nom: 'Crabe Haussier',            type: 'haussière', description: "Pattern harmonique avec CD=1.618 ou plus de XA. L'un des patterns les plus précis avec une zone D très étendue.", objectif: "Retour vers 0.382-0.618 de AD.", probabilite: 68, probabiliteLabel: 'Modérée à élevée', confirmation: ['Zone D à 1.618-3.618 de XA','AB à 0.382-0.618','Volumes très faibles en D'], invalidite: ['Dépassement du point X','CD inférieur à 1.618 de XA'] },
      { nom: 'Crabe Baissier',            type: 'baissière', description: "Pattern harmonique baissier avec extension CD extrême. Signal de retournement fort depuis une zone de résistance étendue.", objectif: "Retour vers 0.382-0.618 de AD.", probabilite: 66, probabiliteLabel: 'Modérée', confirmation: ['Zone D à 1.618-3.618 de XA','RSI en surachat extrême','AB à 0.382-0.618'], invalidite: ['Dépassement de la zone D','Ratios non respectés'] },
      { nom: 'Papillon Haussier',         type: 'haussière', description: "Pattern harmonique avec AB=0.786 de XA et D dépassant le point X. Retournement haussier puissant.", objectif: "Extension vers 1.27-1.618 de XA depuis D.", probabilite: 65, probabiliteLabel: 'Modérée', confirmation: ['AB à 0.786 de XA','D dépasse le point X','CD à 1.27-1.618'], invalidite: ['AB différent de 0.786','D très éloigné de X'] },
      { nom: 'Papillon Baissier',         type: 'baissière', description: "Pattern harmonique baissier avec AB=0.786 et D dépassant X. Retournement baissier puissant.", objectif: "Extension vers 1.27-1.618 de XA depuis D.", probabilite: 63, probabiliteLabel: 'Modérée', confirmation: ['AB à 0.786 de XA','D dépasse le point X','RSI en surachat'], invalidite: ['AB différent de 0.786','Volumes croissants en D'] },
      { nom: 'Shark Haussier',             type: 'haussière', description: "Pattern harmonique OXABC avec AB=1.13-1.618 de XA et BC=0.886-1.13 de OX. La zone C constitue le point d'entrée haussier. Figure récente et très précise.", objectif: "Retour vers 0.50 et 0.886 de BC depuis le point C.", probabilite: 67, probabiliteLabel: 'Modérée', confirmation: ['BC à 0.886-1.13 de OX','AB à 1.13-1.618 de XA','RSI en survente en zone C','Volumes décroissants vers C'], invalidite: ['Dépassement du point O','Ratios Fibonacci non respectés','Volumes croissants vers C'] },
      { nom: 'Shark Baissier',             type: 'baissière', description: "Pattern harmonique OXABC inversé avec AB=1.13-1.618 de XA et BC=0.886-1.13 de OX. La zone C constitue le point d'entrée baissier.", objectif: "Retour vers 0.50 et 0.886 de BC depuis le point C.", probabilite: 65, probabiliteLabel: 'Modérée', confirmation: ['BC à 0.886-1.13 de OX','AB à 1.13-1.618 de XA','RSI en surachat en zone C','Volumes décroissants vers C'], invalidite: ['Dépassement du point O','Ratios non respectés','Volumes croissants vers C'] },
      { nom: 'Cypher Haussier',            type: 'haussière', description: "Pattern harmonique XABCD avec AB=0.382-0.618 de XA, BC=1.13-1.414 de XA et CD=0.786 de XC. Figure très précise avec un excellent ratio risque/rendement.", objectif: "Extension vers 0.382 et 0.618 de CD depuis le point D.", probabilite: 69, probabiliteLabel: 'Modérée à élevée', confirmation: ['CD à 0.786 de XC','BC à 1.13-1.414 de XA','RSI divergent en zone D','Volumes faibles vers D'], invalidite: ['CD ne respecte pas 0.786 de XC','Dépassement du point X','Volumes croissants vers D'] },
      { nom: 'Cypher Baissier',            type: 'baissière', description: "Pattern harmonique XABCD inversé avec CD=0.786 de XC. Figure très précise signalant un retournement baissier depuis la zone D.", objectif: "Extension vers 0.382 et 0.618 de CD depuis le point D.", probabilite: 67, probabiliteLabel: 'Modérée', confirmation: ['CD à 0.786 de XC','BC à 1.13-1.414 de XA','RSI en surachat en zone D','Volumes faibles vers D'], invalidite: ['CD ne respecte pas 0.786 de XC','Dépassement du point X','Volumes croissants vers D'] },
    ] as Figure[],
  },
]

// ─── Composant principal ──────────────────────────────────────────
export default function FiguresChartistesPage() {
  const [catIdx,   setCatIdx]   = useState(0)
  const [figIdx,   setFigIdx]   = useState(0)
  const [comboOpen, setComboOpen] = useState(false)

  const currentCat = categories[catIdx]
  const currentFig = currentCat.figures[figIdx]
  const typeConfig = {
    haussière: { label: 'FIGURE HAUSSIÈRE', color: '#00C853', bg: 'rgba(0,200,83,0.08)',    border: 'rgba(0,200,83,0.2)',    emoji: '🐂' },
    baissière: { label: 'FIGURE BAISSIÈRE', color: '#FF4444', bg: 'rgba(255,68,68,0.08)',   border: 'rgba(255,68,68,0.2)',   emoji: '🐻' },
    neutre:    { label: 'FIGURE NEUTRE',    color: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.2)', emoji: '⚖️' },
  }
  const tc  = typeConfig[currentFig.type]
  const pctColor = currentFig.probabilite >= 70 ? '#00C853' : currentFig.probabilite >= 60 ? '#D4AF37' : '#FF9800'

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Figures Chartistes</h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
          {categories.reduce((s, c) => s + c.figures.length, 0)} figures réparties en {categories.length} catégories
        </p>
      </div>

      {/* Catégories */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat, i) => {
          const isActive = catIdx === i
          return (
            <button
              key={cat.label}
              onClick={() => { setCatIdx(i); setFigIdx(0) }}
              className="text-center text-[10px] font-bold tracking-wide"
              style={{
                position: 'relative',
                padding: '6px 4px',
                borderRadius: 12,
                border: `1px solid ${isActive ? `${cat.color}35` : 'rgba(255,255,255,0.07)'}`,
                background: isActive
                  ? `rgba(${cat.color === '#FF6B35' ? '255,107,53' : cat.color === '#00C853' ? '0,200,83' : cat.color === '#D4AF37' ? '212,175,55' : '156,39,176'},0.07)`
                  : 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: isActive ? cat.color : 'rgba(255,255,255,0.35)',
                boxShadow: isActive
                  ? `0 0 10px ${cat.color}18, inset 0 1px 0 rgba(255,255,255,0.06)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {cat.label}
              {/* Trait lumineux doré sous l'onglet actif */}
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: isActive ? '10%' : '50%',
                width: isActive ? '80%' : '0%',
                height: 2,
                borderRadius: 2,
                background: `linear-gradient(90deg, transparent, ${cat.color}, transparent)`,
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                opacity: isActive ? 1 : 0,
              }} />
            </button>
          )
        })}
      </div>

      {/* Combobox */}
      <div className="relative">
        <button onClick={() => setComboOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left"
          style={{ background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', color: '#F5F5F5' }}>
          <span className="font-semibold">{currentFig.nom}</span>
          <motion.div animate={{ rotate: comboOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} style={{ color: '#707070' }} />
          </motion.div>
        </button>
        <AnimatePresence>
          {comboOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
              style={{ background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <div className="max-h-64 overflow-y-auto">
                {currentCat.figures.map((f, i) => {
                  const c = typeConfig[f.type]
                  return (
                    <button key={f.nom} onClick={() => { setFigIdx(i); setComboOpen(false) }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                      style={{
                        background:   figIdx === i ? 'rgba(212,175,55,0.08)' : 'transparent',
                        borderBottom: '1px solid rgba(42,42,42,0.5)',
                        color:        figIdx === i ? '#D4AF37' : '#C0C0C0',
                      }}>
                      <span className="text-sm">{f.nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {f.type.toUpperCase()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentFig.nom} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="space-y-4">

          {/* Type + Image */}
          <div className="card-premium overflow-hidden" style={{ padding: 0 }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: tc.bg, borderBottom: `1px solid ${tc.border}` }}>
              <span className="text-base">{tc.emoji}</span>
              <span className="text-sm font-bold tracking-wider" style={{ color: tc.color }}>{tc.label}</span>
            </div>
            <FigureImage nom={currentFig.nom} />
            <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--noir-border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{currentFig.description}</p>
            </div>
          </div>

          {/* Objectif + Probabilité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎯</span>
                <span className="text-xs font-bold tracking-wider" style={{ color: gold }}>OBJECTIF TECHNIQUE</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>{currentFig.objectif}</p>
            </div>
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📊</span>
                <span className="text-xs font-bold tracking-wider" style={{ color: gold }}>PROBABILITÉ</span>
              </div>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: pctColor }}>{currentFig.probabilite}%</div>
              <div className="w-full h-1.5 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentFig.probabilite}%`, background: pctColor }} />
              </div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>{currentFig.probabiliteLabel}</div>
            </div>
          </div>

          {/* Confirmation + Invalidité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-4" style={{ borderColor: 'rgba(0,200,83,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,200,83,0.15)' }}>
                  <span style={{ color: '#00C853', fontSize: 10 }}>✓</span>
                </div>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#00C853' }}>CONDITIONS DE CONFIRMATION</span>
              </div>
              <ul className="space-y-1.5">
                {currentFig.confirmation.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span style={{ color: '#00C853', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span className="text-xs leading-snug" style={{ color: '#A0A0A0' }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-premium p-4" style={{ borderColor: 'rgba(255,68,68,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,68,68,0.15)' }}>
                  <span style={{ color: '#FF4444', fontSize: 10 }}>✕</span>
                </div>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#FF4444' }}>CONDITIONS D'INVALIDITÉ</span>
              </div>
              <ul className="space-y-1.5">
                {currentFig.invalidite.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span style={{ color: '#FF4444', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✕</span>
                    <span className="text-xs leading-snug" style={{ color: '#A0A0A0' }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
            <AlertTriangle size={16} style={{ color: gold, flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="text-xs font-bold mb-0.5" style={{ color: gold }}>AIDE À LA DÉCISION UNIQUEMENT</div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>
                Cette information ne constitue en aucun cas une recommandation d'achat ou de vente.
              </div>
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
