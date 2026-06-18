'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
interface Figure {
  nom: string
  type: 'haussière' | 'baissière' | 'neutre'
  emoji: string
  description: string
  objectif: string
  probabilite: number
  probabiliteLabel: string
  confirmation: string[]
  invalidite: string[]
  svg: React.ReactNode
}

// ─── SVG Figures ─────────────────────────────────────────────────
const svgStyle = { width: '100%', height: 180, viewBox: '0 0 300 180' }
const gold = '#D4AF37'
const white = '#E8E8E8'
const red = '#FF4444'
const green = '#00C853'
const gray = '#555'

const figures: Figure[] = [
  {
    nom: 'Tête et Épaules',
    type: 'baissière',
    emoji: '🐻',
    description: "La tête et épaules est une figure de retournement baissière majeure. Elle se forme après une tendance haussière et signale un retournement probable.",
    objectif: "Hauteur de la tête reportée à la baisse depuis la ligne de cou (neckline).",
    probabilite: 74,
    probabiliteLabel: 'Élevée',
    confirmation: ['Cassure de la neckline avec volume', 'Clôture sous la neckline', 'Pull-back éventuel sur la neckline', 'Volumes croissants à la cassure'],
    invalidite: ['Réintégration au-dessus de la neckline', 'Nouveau sommet supérieur à la tête', 'Volume faible à la cassure'],
    svg: (
      <svg {...svgStyle}>
        {/* Neckline */}
        <line x1="50" y1="130" x2="250" y2="125" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="255" y="128" fill={red} fontSize="9" fontFamily="sans-serif">NECKLINE</text>
        {/* Épaule gauche */}
        <polyline points="50,130 80,95 110,130" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
        <text x="68" y="90" fill={gold} fontSize="9" fontFamily="sans-serif">ÉG</text>
        {/* Tête */}
        <polyline points="110,130 150,55 190,130" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
        <text x="142" y="50" fill={gold} fontSize="9" fontFamily="sans-serif">TÊTE</text>
        {/* Épaule droite */}
        <polyline points="190,130 220,95 250,130" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
        <text x="208" y="90" fill={gold} fontSize="9" fontFamily="sans-serif">ÉD</text>
        {/* Cassure */}
        <line x1="250" y1="125" x2="280" y2="155" stroke={red} strokeWidth="2" />
        <polygon points="278,148 283,158 273,158" fill={red} />
        <text x="255" y="160" fill={red} fontSize="9" fontFamily="sans-serif">OBJECTIF ↓</text>
        {/* Flèche objectif */}
        <line x1="285" y1="125" x2="285" y2="165" stroke={red} strokeWidth="1" strokeDasharray="3,3" />
      </svg>
    ),
  },
  {
    nom: 'Tête et Épaules Inversée',
    type: 'haussière',
    emoji: '🐂',
    description: "Figure de retournement haussière se formant après une tendance baissière. Signale un probable retournement à la hausse.",
    objectif: "Hauteur de la tête reportée à la hausse depuis la ligne de cou.",
    probabilite: 72,
    probabiliteLabel: 'Élevée',
    confirmation: ['Cassure de la neckline', 'Volumes forts à la cassure', 'Pull-back sur la neckline', 'Clôture au-dessus de la résistance'],
    invalidite: ['Rechute sous la neckline', 'Nouveau plus bas inférieur à la tête', 'Volumes faibles'],
    svg: (
      <svg {...svgStyle}>
        <line x1="50" y1="60" x2="250" y2="55" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="255" y="58" fill={green} fontSize="9" fontFamily="sans-serif">NECKLINE</text>
        <polyline points="50,60 80,95 110,60" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
        <text x="68" y="108" fill={gold} fontSize="9" fontFamily="sans-serif">ÉG</text>
        <polyline points="110,60 150,125 190,60" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
        <text x="140" y="140" fill={gold} fontSize="9" fontFamily="sans-serif">TÊTE</text>
        <polyline points="190,60 220,95 250,60" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
        <text x="208" y="108" fill={gold} fontSize="9" fontFamily="sans-serif">ÉD</text>
        <line x1="250" y1="55" x2="280" y2="25" stroke={green} strokeWidth="2" />
        <polygon points="278,32 283,22 273,22" fill={green} />
        <text x="250" y="18" fill={green} fontSize="9" fontFamily="sans-serif">OBJECTIF ↑</text>
      </svg>
    ),
  },
  {
    nom: 'Double Sommet',
    type: 'baissière',
    emoji: '🐻',
    description: "Deux sommets au même niveau forment une résistance forte. Figure de retournement baissière après une tendance haussière.",
    objectif: "Hauteur du pattern reportée à la baisse depuis la ligne de support.",
    probabilite: 68,
    probabiliteLabel: 'Modérée à élevée',
    confirmation: ['Cassure du support intermédiaire', 'Volumes croissants à la cassure', 'Clôture sous le support', 'Deuxième sommet avec volume décroissant'],
    invalidite: ['Dépassement des sommets précédents', 'Réintégration du support', 'Volumes faibles'],
    svg: (
      <svg {...svgStyle}>
        <line x1="80" y1="130" x2="220" y2="130" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="225" y="133" fill={red} fontSize="9" fontFamily="sans-serif">SUPPORT</text>
        <polyline points="50,155 90,70 130,130 170,70 210,155" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="90" y1="70" x2="90" y2="55" stroke={gold} strokeWidth="1" strokeDasharray="3,3" />
        <line x1="170" y1="70" x2="170" y2="55" stroke={gold} strokeWidth="1" strokeDasharray="3,3" />
        <text x="75" y="52" fill={gold} fontSize="9" fontFamily="sans-serif">S1</text>
        <text x="155" y="52" fill={gold} fontSize="9" fontFamily="sans-serif">S2</text>
        <line x1="210" y1="130" x2="250" y2="165" stroke={red} strokeWidth="2" />
        <polygon points="248,158 253,168 243,168" fill={red} />
      </svg>
    ),
  },
  {
    nom: 'Double Creux',
    type: 'haussière',
    emoji: '🐂',
    description: "Deux creux au même niveau forment un support fort. Figure de retournement haussière après une tendance baissière.",
    objectif: "Hauteur du pattern reportée à la hausse depuis la résistance intermédiaire.",
    probabilite: 70,
    probabiliteLabel: 'Élevée',
    confirmation: ['Cassure de la résistance intermédiaire', 'Volumes croissants', 'Clôture au-dessus de la résistance', 'Deuxième creux avec RSI divergent'],
    invalidite: ['Enfoncement des creux précédents', 'Volumes faibles à la cassure'],
    svg: (
      <svg {...svgStyle}>
        <line x1="80" y1="60" x2="220" y2="60" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="225" y="63" fill={green} fontSize="9" fontFamily="sans-serif">RÉSIST.</text>
        <polyline points="50,35 90,120 130,60 170,120 210,35" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
        <text x="75" y="138" fill={gold} fontSize="9" fontFamily="sans-serif">C1</text>
        <text x="155" y="138" fill={gold} fontSize="9" fontFamily="sans-serif">C2</text>
        <line x1="210" y1="60" x2="250" y2="25" stroke={green} strokeWidth="2" />
        <polygon points="248,32 253,22 243,22" fill={green} />
      </svg>
    ),
  },
  {
    nom: 'Triple Sommet',
    type: 'baissière',
    emoji: '🐻',
    description: "Trois sommets consécutifs au même niveau signalent une résistance très forte. Indique un épuisement des acheteurs.",
    objectif: "Hauteur du pattern reportée à la baisse depuis le support.",
    probabilite: 65,
    probabiliteLabel: 'Modérée',
    confirmation: ['Trois tentatives échouées au même niveau', 'Volumes décroissants sur chaque sommet', 'Cassure du support avec volume', 'Clôture sous support'],
    invalidite: ['Dépassement de la résistance', 'Volumes croissants au 3ème sommet', 'Réintégration du support'],
    svg: (
      <svg {...svgStyle}>
        <line x1="60" y1="130" x2="240" y2="130" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
        <line x1="80" y1="68" x2="80" y2="62" stroke={gold} strokeWidth="1" />
        <line x1="150" y1="68" x2="150" y2="62" stroke={gold} strokeWidth="1" />
        <line x1="220" y1="68" x2="220" y2="62" stroke={gold} strokeWidth="1" />
        <polyline points="40,155 80,68 115,130 150,68 185,130 220,68 260,155" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
        <text x="68" y="58" fill={gold} fontSize="8" fontFamily="sans-serif">S1</text>
        <text x="140" y="58" fill={gold} fontSize="8" fontFamily="sans-serif">S2</text>
        <text x="210" y="58" fill={gold} fontSize="8" fontFamily="sans-serif">S3</text>
      </svg>
    ),
  },
  {
    nom: 'Triple Creux',
    type: 'haussière',
    emoji: '🐂',
    description: "Trois creux consécutifs au même niveau signalent un support très fort. Indique un épuisement des vendeurs.",
    objectif: "Hauteur du pattern reportée à la hausse depuis la résistance.",
    probabilite: 63,
    probabiliteLabel: 'Modérée',
    confirmation: ['Trois rebonds successifs au même niveau', 'Volumes croissants sur les rebonds', 'Cassure de la résistance', 'Clôture au-dessus'],
    invalidite: ['Enfoncement du support', 'Volumes faibles sur les rebonds'],
    svg: (
      <svg {...svgStyle}>
        <line x1="60" y1="55" x2="240" y2="55" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
        <polyline points="40,30 80,118 115,55 150,118 185,55 220,118 260,30" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
        <text x="68" y="135" fill={gold} fontSize="8" fontFamily="sans-serif">C1</text>
        <text x="140" y="135" fill={gold} fontSize="8" fontFamily="sans-serif">C2</text>
        <text x="210" y="135" fill={gold} fontSize="8" fontFamily="sans-serif">C3</text>
      </svg>
    ),
  },
  {
    nom: 'Triangle Ascendant',
    type: 'haussière',
    emoji: '🐂',
    description: "Résistance horizontale avec support montant. Les acheteurs sont de plus en plus agressifs. Continuation haussière probable.",
    objectif: "Hauteur du triangle reportée à la hausse depuis le point de cassure.",
    probabilite: 72,
    probabiliteLabel: 'Élevée',
    confirmation: ['Cassure de la résistance horizontale', 'Volumes forts à la cassure', 'Clôture au-dessus', 'Pull-back possible sur la résistance'],
    invalidite: ['Cassure du support ascendant', 'Volumes faibles', 'Réintégration du triangle'],
    svg: (
      <svg {...svgStyle}>
        <line x1="60" y1="65" x2="230" y2="65" stroke={gold} strokeWidth="2" />
        <text x="235" y="68" fill={gold} fontSize="9" fontFamily="sans-serif">RÉSIST.</text>
        <line x1="60" y1="145" x2="230" y2="85" stroke={white} strokeWidth="2" />
        <polyline points="60,145 80,120 100,110 120,100 140,93 160,88 180,80 200,75 220,70" fill="none" stroke={white} strokeWidth="1.5" strokeDasharray="2,2" opacity="0.5" />
        <line x1="230" y1="65" x2="275" y2="40" stroke={green} strokeWidth="2.5" />
        <polygon points="273,47 278,37 268,37" fill={green} />
        <text x="240" y="35" fill={green} fontSize="9" fontFamily="sans-serif">↑</text>
      </svg>
    ),
  },
  {
    nom: 'Triangle Descendant',
    type: 'baissière',
    emoji: '🐻',
    description: "Support horizontal avec résistance descendante. Les vendeurs sont de plus en plus agressifs. Continuation baissière probable.",
    objectif: "Hauteur du triangle reportée à la baisse depuis le point de cassure.",
    probabilite: 70,
    probabiliteLabel: 'Élevée',
    confirmation: ['Cassure du support horizontal', 'Volumes forts à la cassure', 'Clôture sous le support'],
    invalidite: ['Cassure de la résistance descendante', 'Volumes faibles'],
    svg: (
      <svg {...svgStyle}>
        <line x1="60" y1="120" x2="230" y2="120" stroke={gold} strokeWidth="2" />
        <text x="235" y="123" fill={gold} fontSize="9" fontFamily="sans-serif">SUPPORT</text>
        <line x1="60" y1="45" x2="230" y2="95" stroke={white} strokeWidth="2" />
        <line x1="230" y1="120" x2="275" y2="150" stroke={red} strokeWidth="2.5" />
        <polygon points="273,143 278,153 268,153" fill={red} />
        <text x="240" y="165" fill={red} fontSize="9" fontFamily="sans-serif">↓</text>
      </svg>
    ),
  },
  {
    nom: 'Triangle Symétrique',
    type: 'neutre',
    emoji: '⚖️',
    description: "Convergence de deux lignes de tendance. Figure de continuation ou retournement selon la cassure. La direction est indéterminée a priori.",
    objectif: "Hauteur du triangle reportée à partir du point de cassure, dans la direction de la cassure.",
    probabilite: 60,
    probabiliteLabel: 'Modérée',
    confirmation: ['Cassure nette d\'un côté avec volume', 'Clôture hors du triangle', 'Pull-back éventuel sur le sommet du triangle'],
    invalidite: ['Cassure du côté opposé', 'Volumes très faibles', 'Sortie sans volume'],
    svg: (
      <svg {...svgStyle}>
        <line x1="40" y1="40" x2="230" y2="90" stroke={white} strokeWidth="2" />
        <line x1="40" y1="145" x2="230" y2="90" stroke={white} strokeWidth="2" />
        <line x1="230" y1="90" x2="270" y2="55" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
        <line x1="230" y1="90" x2="270" y2="125" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
        <text x="272" y="58" fill={green} fontSize="9" fontFamily="sans-serif">↑?</text>
        <text x="272" y="128" fill={red} fontSize="9" fontFamily="sans-serif">↓?</text>
        <circle cx="230" cy="90" r="5" fill={gold} />
      </svg>
    ),
  },
  {
    nom: 'Drapeau',
    type: 'haussière',
    emoji: '🐂',
    description: "Consolidation courte contre la tendance principale après une forte impulsion. Figure de continuation très fiable.",
    objectif: "Hauteur du mât reportée à partir du point de cassure du drapeau.",
    probabilite: 78,
    probabiliteLabel: 'Élevée',
    confirmation: ['Mât fort et directionnel', 'Consolidation en canal contre la tendance', 'Cassure dans la direction du mât', 'Volumes croissants à la cassure'],
    invalidite: ['Consolidation trop longue (>3 semaines)', 'Cassure dans la mauvaise direction', 'Volumes trop faibles sur le mât'],
    svg: (
      <svg {...svgStyle}>
        {/* Mât */}
        <line x1="80" y1="155" x2="160" y2="55" stroke={white} strokeWidth="3" />
        <text x="50" y="135" fill={gold} fontSize="9" fontFamily="sans-serif">MÂT</text>
        {/* Drapeau */}
        <line x1="160" y1="55" x2="210" y2="70" stroke={gold} strokeWidth="1.5" />
        <line x1="160" y1="75" x2="210" y2="90" stroke={gold} strokeWidth="1.5" />
        <polyline points="160,55 185,62 210,70 210,90 185,82 160,75 160,55" fill="rgba(212,175,55,0.1)" stroke={gold} strokeWidth="1.5" />
        <text x="170" y="50" fill={gold} fontSize="9" fontFamily="sans-serif">DRAPEAU</text>
        {/* Continuation */}
        <line x1="210" y1="70" x2="265" y2="20" stroke={green} strokeWidth="2.5" />
        <polygon points="263,27 268,17 258,17" fill={green} />
      </svg>
    ),
  },
  {
    nom: 'Fanion',
    type: 'haussière',
    emoji: '🐂',
    description: "Similaire au drapeau mais la consolidation prend la forme d'un triangle symétrique. Figure de continuation très fiable.",
    objectif: "Hauteur du mât reportée depuis le point de cassure du fanion.",
    probabilite: 75,
    probabiliteLabel: 'Élevée',
    confirmation: ['Mât vertical et fort', 'Fanion en triangle convergent', 'Cassure haussière avec volume', 'Délai court de formation'],
    invalidite: ['Fanion trop large', 'Cassure baissière', 'Formation trop longue'],
    svg: (
      <svg {...svgStyle}>
        <line x1="80" y1="155" x2="155" y2="60" stroke={white} strokeWidth="3" />
        <text x="48" y="135" fill={gold} fontSize="9" fontFamily="sans-serif">MÂT</text>
        {/* Fanion triangle */}
        <polygon points="155,60 200,45 200,80" fill="rgba(212,175,55,0.1)" stroke={gold} strokeWidth="1.5" />
        <text x="158" y="42" fill={gold} fontSize="9" fontFamily="sans-serif">FANION</text>
        <line x1="200" y1="60" x2="260" y2="20" stroke={green} strokeWidth="2.5" />
        <polygon points="258,27 263,17 253,17" fill={green} />
      </svg>
    ),
  },
  {
    nom: 'Biseau Ascendant',
    type: 'baissière',
    emoji: '🐻',
    description: "Deux lignes convergentes ascendantes. Bien que les prix montent, la dynamique haussière faiblit. La cassure baissière de la borne basse confirme un retournement.",
    objectif: "Hauteur maximale du biseau reportée à partir du point de cassure baissière.",
    probabilite: 68,
    probabiliteLabel: 'Modérée à élevée',
    confirmation: ['Cassure nette de la borne basse', 'Clôture sous le support', 'Augmentation des volumes', 'Validation sur une unité de temps supérieure'],
    invalidite: ['Réintégration du biseau', 'Cassure haussière de la borne haute', 'Nouveau sommet supérieur à la résistance'],
    svg: (
      <svg {...svgStyle}>
        <line x1="40" y1="145" x2="210" y2="55" stroke={gold} strokeWidth="2" />
        <text x="215" y="58" fill={gold} fontSize="9" fontFamily="sans-serif">RÉSIST.</text>
        <line x1="40" y1="165" x2="210" y2="95" stroke={gold} strokeWidth="2" />
        <text x="215" y="98" fill={gold} fontSize="9" fontFamily="sans-serif">SUPPORT</text>
        <polyline points="40,165 70,148 100,138 130,118 160,105 190,88 210,75" fill="none" stroke={white} strokeWidth="2" opacity="0.6" />
        <line x1="210" y1="90" x2="265" y2="140" stroke={red} strokeWidth="2.5" />
        <polygon points="263,133 268,143 258,143" fill={red} />
        <text x="240" y="155" fill={red} fontSize="9" fontFamily="sans-serif">OBJECTIF ↓</text>
      </svg>
    ),
  },
  {
    nom: 'Biseau Descendant',
    type: 'haussière',
    emoji: '🐂',
    description: "Deux lignes convergentes descendantes. Bien que les prix baissent, la pression vendeuse faiblit. La cassure haussière de la borne haute signale un retournement.",
    objectif: "Hauteur maximale du biseau reportée à partir du point de cassure haussière.",
    probabilite: 66,
    probabiliteLabel: 'Modérée',
    confirmation: ['Cassure de la borne haute', 'Clôture au-dessus de la résistance', 'Volumes croissants', 'Confirmation sur timeframe supérieur'],
    invalidite: ['Réintégration du biseau', 'Nouveau creux inférieur', 'Volumes faibles à la cassure'],
    svg: (
      <svg {...svgStyle}>
        <line x1="40" y1="40" x2="210" y2="115" stroke={gold} strokeWidth="2" />
        <text x="215" y="118" fill={gold} fontSize="9" fontFamily="sans-serif">SUPPORT</text>
        <line x1="40" y1="25" x2="210" y2="90" stroke={gold} strokeWidth="2" />
        <text x="215" y="93" fill={gold} fontSize="9" fontFamily="sans-serif">RÉSIST.</text>
        <polyline points="40,25 70,42 100,55 130,72 160,85 190,98 210,108" fill="none" stroke={white} strokeWidth="2" opacity="0.6" />
        <line x1="210" y1="100" x2="265" y2="55" stroke={green} strokeWidth="2.5" />
        <polygon points="263,62 268,52 258,52" fill={green} />
        <text x="240" y="48" fill={green} fontSize="9" fontFamily="sans-serif">OBJECTIF ↑</text>
      </svg>
    ),
  },
  {
    nom: 'Rectangle',
    type: 'neutre',
    emoji: '⚖️',
    description: "Zone de congestion entre support et résistance horizontaux. Figure de continuation dans la direction de la tendance précédente.",
    objectif: "Hauteur du rectangle reportée dans la direction de la cassure.",
    probabilite: 62,
    probabiliteLabel: 'Modérée',
    confirmation: ['Cassure décisive avec volume', 'Clôture hors du rectangle', '2-3 touches de chaque côté avant la cassure'],
    invalidite: ['Cassure du côté opposé', 'Multiples faux signaux', 'Faible volume'],
    svg: (
      <svg {...svgStyle}>
        <rect x="50" y="65" width="180" height="70" fill="rgba(212,175,55,0.06)" stroke={gold} strokeWidth="1.5" />
        <text x="55" y="60" fill={gold} fontSize="9" fontFamily="sans-serif">RÉSISTANCE</text>
        <text x="55" y="152" fill={gold} fontSize="9" fontFamily="sans-serif">SUPPORT</text>
        <polyline points="50,100 75,90 100,115 125,80 150,110 175,85 200,105 230,100" fill="none" stroke={white} strokeWidth="2" />
        <line x1="230" y1="65" x2="270" y2="35" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
        <line x1="230" y1="135" x2="270" y2="165" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
        <text x="272" y="38" fill={green} fontSize="9" fontFamily="sans-serif">↑?</text>
        <text x="272" y="168" fill={red} fontSize="9" fontFamily="sans-serif">↓?</text>
      </svg>
    ),
  },
  {
    nom: 'Canal Haussier',
    type: 'haussière',
    emoji: '🐂',
    description: "Deux droites parallèles ascendantes encadrant les cours. Figure de continuation haussière. Les retours sur la borne basse sont des opportunités d'achat.",
    objectif: "Largeur du canal reportée à la hausse depuis la borne basse, ou cassure de la borne haute.",
    probabilite: 70,
    probabiliteLabel: 'Élevée',
    confirmation: ['Rebond répété sur la borne basse', 'Respect de la borne haute', 'Volumes dans le sens de la hausse', 'Cassure de la borne haute'],
    invalidite: ['Cassure de la borne basse', 'Volumes décroissants sur la hausse'],
    svg: (
      <svg {...svgStyle}>
        <line x1="30" y1="145" x2="250" y2="45" stroke={green} strokeWidth="1.5" />
        <line x1="30" y1="165" x2="250" y2="75" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
        <polyline points="30,160 70,128 110,105 150,82 190,60 230,50" fill="none" stroke={white} strokeWidth="2.5" />
        <text x="255" y="48" fill={green} fontSize="9" fontFamily="sans-serif">↑</text>
        <text x="255" y="78" fill={green} fontSize="9" fontFamily="sans-serif">↑</text>
      </svg>
    ),
  },
  {
    nom: 'Canal Baissier',
    type: 'baissière',
    emoji: '🐻',
    description: "Deux droites parallèles descendantes encadrant les cours. Figure de continuation baissière. Les retours sur la borne haute sont des opportunités de vente.",
    objectif: "Largeur du canal reportée à la baisse depuis la borne haute, ou cassure de la borne basse.",
    probabilite: 70,
    probabiliteLabel: 'Élevée',
    confirmation: ['Respect de la borne basse et haute', 'Volumes croissants à la baisse', 'Cassure de la borne basse', 'Clôture sous le canal'],
    invalidite: ['Cassure de la borne haute', 'Volumes décroissants sur la baisse'],
    svg: (
      <svg {...svgStyle}>
        <line x1="30" y1="45" x2="250" y2="140" stroke={red} strokeWidth="1.5" />
        <line x1="30" y1="25" x2="250" y2="120" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
        <polyline points="30,30 70,52 110,72 150,95 190,115 230,135" fill="none" stroke={white} strokeWidth="2.5" />
        <text x="255" y="123" fill={red} fontSize="9" fontFamily="sans-serif">↓</text>
        <text x="255" y="143" fill={red} fontSize="9" fontFamily="sans-serif">↓</text>
      </svg>
    ),
  },
  {
    nom: 'Coupe avec Anse',
    type: 'haussière',
    emoji: '🐂',
    description: "Consolidation en forme de U (coupe) suivie d'une courte consolidation (anse). Figure de continuation haussière très puissante sur le long terme.",
    objectif: "Profondeur de la coupe reportée à la hausse depuis la cassure de l'anse.",
    probabilite: 76,
    probabiliteLabel: 'Élevée',
    confirmation: ['Formation de la coupe en U régulier', "Anse peu profonde (max 50% de la coupe)", 'Cassure avec volumes forts', 'Volumes croissants sur la hausse droite'],
    invalidite: ["Coupe en V (trop rapide)", "Anse trop profonde", 'Cassure baissière de l\'anse'],
    svg: (
      <svg {...svgStyle}>
        {/* Résistance */}
        <line x1="50" y1="50" x2="250" y2="50" stroke={gold} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="255" y="53" fill={gold} fontSize="9" fontFamily="sans-serif">RÉSIST.</text>
        {/* Coupe en U */}
        <path d="M 50,50 Q 150,155 250,50" fill="none" stroke={white} strokeWidth="2.5" />
        {/* Anse */}
        <path d="M 205,50 Q 220,75 240,55" fill="none" stroke={white} strokeWidth="2" />
        <text x="190" y="88" fill={gold} fontSize="9" fontFamily="sans-serif">ANSE</text>
        <text x="90" y="148" fill={gold} fontSize="9" fontFamily="sans-serif">COUPE</text>
        {/* Cassure */}
        <line x1="240" y1="55" x2="275" y2="20" stroke={green} strokeWidth="2.5" />
        <polygon points="273,27 278,17 268,17" fill={green} />
      </svg>
    ),
  },
]

// ─── Composant principal ──────────────────────────────────────────
export default function FiguresChartistesPage() {
  const [selected, setSelected] = useState<Figure>(figures[11]) // Biseau Ascendant par défaut
  const [open, setOpen]         = useState(false)

  const typeConfig = {
    haussière: { label: 'FIGURE HAUSSIÈRE', color: '#00C853', bg: 'rgba(0,200,83,0.1)', border: 'rgba(0,200,83,0.25)', emoji: '🐂' },
    baissière: { label: 'FIGURE BAISSIÈRE', color: '#FF4444', bg: 'rgba(255,68,68,0.1)', border: 'rgba(255,68,68,0.25)', emoji: '🐻' },
    neutre:    { label: 'FIGURE NEUTRE',    color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', border: 'rgba(212,175,55,0.25)', emoji: '⚖️' },
  }
  const tc = typeConfig[selected.type]

  const pctColor = selected.probabilite >= 70 ? '#00C853' : selected.probabilite >= 60 ? '#D4AF37' : '#FF9800'

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#F5F5F5' }}>Figures Chartistes</h1>
        <p className="text-sm mt-0.5" style={{ color: '#707070' }}>
          Guide des {figures.length} principales formations techniques
        </p>
      </div>

      {/* Combobox */}
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left"
          style={{ background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', color: '#F5F5F5' }}>
          <span className="font-semibold">{selected.nom}</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} style={{ color: '#707070' }} />
          </motion.div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
              style={{ background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div className="max-h-72 overflow-y-auto">
                {figures.map((f) => {
                  const c = typeConfig[f.type]
                  return (
                    <button key={f.nom}
                      onClick={() => { setSelected(f); setOpen(false) }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                      style={{
                        background: selected.nom === f.nom ? 'rgba(212,175,55,0.08)' : 'transparent',
                        borderBottom: '1px solid rgba(42,42,42,0.5)',
                        color: selected.nom === f.nom ? '#D4AF37' : '#C0C0C0',
                      }}
                      onMouseEnter={e => { if (selected.nom !== f.nom) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (selected.nom !== f.nom) e.currentTarget.style.background = 'transparent' }}>
                      <span className="text-sm">{f.nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
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
        <motion.div key={selected.nom} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="space-y-4">

          {/* Type badge + SVG */}
          <div className="card-premium overflow-hidden" style={{ padding: 0 }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: tc.bg, borderBottom: `1px solid ${tc.border}` }}>
              <span className="text-base">{tc.emoji}</span>
              <span className="text-sm font-bold tracking-wider" style={{ color: tc.color }}>{tc.label}</span>
            </div>
            <div className="p-4" style={{ background: '#0A0A0A' }}>
              {selected.svg}
            </div>
            <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--noir-border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{selected.description}</p>
            </div>
          </div>

          {/* Objectif + Probabilité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎯</span>
                <span className="text-xs font-bold tracking-wider" style={{ color: gold }}>OBJECTIF TECHNIQUE</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>{selected.objectif}</p>
            </div>
            <div className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📊</span>
                <span className="text-xs font-bold tracking-wider" style={{ color: gold }}>PROBABILITÉ</span>
              </div>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: pctColor }}>
                {selected.probabilite}%
              </div>
              <div className="w-full h-1.5 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${selected.probabilite}%`, background: pctColor }} />
              </div>
              <div className="text-xs" style={{ color: '#5C5C5C' }}>{selected.probabiliteLabel}</div>
            </div>
          </div>

          {/* Confirmation + Invalidité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-4"
              style={{ borderColor: 'rgba(0,200,83,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,200,83,0.15)' }}>
                  <span style={{ color: '#00C853', fontSize: 10 }}>✓</span>
                </div>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#00C853' }}>CONDITIONS DE CONFIRMATION</span>
              </div>
              <ul className="space-y-1.5">
                {selected.confirmation.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span style={{ color: '#00C853', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span className="text-xs leading-snug" style={{ color: '#A0A0A0' }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-premium p-4"
              style={{ borderColor: 'rgba(255,68,68,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,68,68,0.15)' }}>
                  <span style={{ color: '#FF4444', fontSize: 10 }}>✕</span>
                </div>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#FF4444' }}>CONDITIONS D'INVALIDITÉ</span>
              </div>
              <ul className="space-y-1.5">
                {selected.invalidite.map((c, i) => (
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
