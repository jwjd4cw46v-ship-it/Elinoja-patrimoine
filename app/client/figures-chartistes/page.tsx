'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle } from 'lucide-react'

const gold = '#D4AF37'
const white = '#E8E8E8'
const red = '#FF4444'
const green = '#00C853'

// ─── Placeholder SVG ─────────────────────────────────────────────
function PlaceholderSVG({ label }: { label: string }) {
  return (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <rect x="10" y="10" width="280" height="160" rx="6" fill="none" stroke={gold} strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
      <text x="150" y="85" textAnchor="middle" fill={gold} fontSize="11" fontFamily="sans-serif" opacity="0.6">Schéma à venir</text>
      <text x="150" y="102" textAnchor="middle" fill={white} fontSize="10" fontFamily="sans-serif" opacity="0.4">{label}</text>
    </svg>
  )
}

// ─── SVGs dessinés ───────────────────────────────────────────────
const SVGs: Record<string, React.ReactNode> = {

  // ── RETOURNEMENT ──────────────────────────────────────────────

  'Tête et Épaules': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="50" y1="130" x2="250" y2="125" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="255" y="128" fill={red} fontSize="8">NECKLINE</text>
      <polyline points="50,130 80,95 110,130" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
      <text x="68" y="90" fill={gold} fontSize="9">ÉG</text>
      <polyline points="110,130 150,52 190,130" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
      <text x="142" y="47" fill={gold} fontSize="9">TÊTE</text>
      <polyline points="190,130 220,95 250,130" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
      <text x="208" y="90" fill={gold} fontSize="9">ÉD</text>
      <circle cx="250" cy="127" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="250" y1="127" x2="280" y2="158" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="278,151 283,161 273,161" fill={red} />
      <text x="248" y="170" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Tête et Épaules Inversée': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="50" y1="60" x2="250" y2="55" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="255" y="58" fill={green} fontSize="8">NECKLINE</text>
      <polyline points="50,60 80,95 110,60" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
      <text x="68" y="110" fill={gold} fontSize="9">ÉG</text>
      <polyline points="110,60 150,128 190,60" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
      <text x="140" y="143" fill={gold} fontSize="9">TÊTE</text>
      <polyline points="190,60 220,95 250,60" fill="none" stroke={white} strokeWidth="2" strokeLinejoin="round" />
      <text x="208" y="110" fill={gold} fontSize="9">ÉD</text>
      <circle cx="250" cy="57" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="250" y1="57" x2="280" y2="25" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="278,32 283,22 273,22" fill={green} />
      <text x="248" y="18" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Double Sommet': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="80" y1="125" x2="220" y2="125" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="225" y="128" fill={red} fontSize="8">SUPPORT</text>
      <polyline points="50,155 90,68 130,125 170,68 210,155" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="75" y="63" fill={gold} fontSize="9">S1</text>
      <text x="155" y="63" fill={gold} fontSize="9">S2</text>
      <circle cx="210" cy="127" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="127" x2="245" y2="162" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="243,155 248,165 238,165" fill={red} />
      <text x="215" y="170" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Double Creux': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="80" y1="60" x2="220" y2="60" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="225" y="63" fill={green} fontSize="8">RÉSIST.</text>
      <polyline points="50,35 90,122 130,60 170,122 210,35" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="78" y="140" fill={gold} fontSize="9">C1</text>
      <text x="158" y="140" fill={gold} fontSize="9">C2</text>
      <circle cx="210" cy="58" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="58" x2="245" y2="22" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="243,29 248,19 238,19" fill={green} />
      <text x="215" y="16" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Triple Sommet': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="50" y1="125" x2="240" y2="125" stroke={red} strokeWidth="1.5" strokeDasharray="4,3" />
      <polyline points="30,155 70,68 105,125 140,68 175,125 210,68 250,155" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="58" y="62" fill={gold} fontSize="8">S1</text>
      <text x="130" y="62" fill={gold} fontSize="8">S2</text>
      <text x="200" y="62" fill={gold} fontSize="8">S3</text>
      <circle cx="250" cy="127" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="250" y1="127" x2="280" y2="160" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="278,153 283,163 273,163" fill={red} />
    </svg>
  ),

  'Triple Creux': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="50" y1="58" x2="240" y2="58" stroke={green} strokeWidth="1.5" strokeDasharray="4,3" />
      <polyline points="30,28 70,115 105,58 140,115 175,58 210,115 250,28" fill="none" stroke={white} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="58" y="132" fill={gold} fontSize="8">C1</text>
      <text x="130" y="132" fill={gold} fontSize="8">C2</text>
      <text x="200" y="132" fill={gold} fontSize="8">C3</text>
      <circle cx="250" cy="56" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="250" y1="56" x2="280" y2="22" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="278,29 283,19 273,19" fill={green} />
    </svg>
  ),

  'Biseau Ascendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="148" x2="210" y2="58" stroke={gold} strokeWidth="2" />
      <text x="215" y="61" fill={gold} fontSize="8">RÉSISTANCE</text>
      <line x1="30" y1="168" x2="210" y2="98" stroke={gold} strokeWidth="2" />
      <text x="215" y="101" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="30,165 60,148 90,138 120,120 150,108 180,92 210,78" fill="none" stroke={white} strokeWidth="2" opacity="0.7" />
      <circle cx="210" cy="88" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="88" x2="260" y2="145" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="258,138 263,148 253,148" fill={red} />
      <line x1="270" y1="88" x2="270" y2="148" stroke={red} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      <text x="245" y="162" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Biseau Descendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="38" x2="210" y2="108" stroke={gold} strokeWidth="2" />
      <text x="215" y="111" fill={gold} fontSize="8">SUPPORT</text>
      <line x1="30" y1="22" x2="210" y2="88" stroke={gold} strokeWidth="2" />
      <text x="215" y="91" fill={gold} fontSize="8">RÉSISTANCE</text>
      <polyline points="30,22 60,42 90,58 120,72 150,85 180,98 210,108" fill="none" stroke={white} strokeWidth="2" opacity="0.7" />
      <circle cx="210" cy="98" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="98" x2="258" y2="48" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="256,55 261,45 251,45" fill={green} />
      <text x="242" y="38" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Diamant de Sommet': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polygon points="60,90 130,35 200,90 130,145" fill="none" stroke={gold} strokeWidth="2" />
      <polyline points="60,90 80,68 100,88 120,55 140,82 160,50 180,78 200,90" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="200" cy="90" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="200" y1="90" x2="255" y2="45" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="253,52 258,42 248,42" fill={green} />
      <line x1="200" y1="90" x2="255" y2="145" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="253,138 258,148 248,148" fill={red} />
      <text x="230" y="38" fill={green} fontSize="8">↑ Haussier</text>
      <text x="230" y="158" fill={red} fontSize="8">↓ Baissier</text>
    </svg>
  ),

  'Diamant de Creux': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polygon points="60,90 130,35 200,90 130,145" fill="none" stroke={gold} strokeWidth="2" />
      <polyline points="60,90 80,112 100,72 120,118 140,78 160,115 180,95 200,90" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="200" cy="90" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="200" y1="90" x2="255" y2="45" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="253,52 258,42 248,42" fill={green} />
      <text x="230" y="38" fill={green} fontSize="8">↑ Haussier</text>
    </svg>
  ),

  // ── CONTINUATION ──────────────────────────────────────────────

  'Triangle Ascendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="50" y1="65" x2="225" y2="65" stroke={gold} strokeWidth="2" />
      <text x="230" y="68" fill={gold} fontSize="8">RÉSISTANCE</text>
      <line x1="50" y1="148" x2="225" y2="82" stroke={gold} strokeWidth="2" />
      <text x="20" y="155" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="50,148 80,120 110,110 140,95 170,82 200,72 225,65" fill="none" stroke={white} strokeWidth="1.5" strokeDasharray="2,2" opacity="0.5" />
      <circle cx="225" cy="65" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="225" y1="65" x2="270" y2="28" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="268,35 273,25 263,25" fill={green} />
      <text x="248" y="22" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Triangle Descendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="50" y1="118" x2="225" y2="118" stroke={gold} strokeWidth="2" />
      <text x="230" y="121" fill={gold} fontSize="8">SUPPORT</text>
      <line x1="50" y1="45" x2="225" y2="100" stroke={gold} strokeWidth="2" />
      <text x="20" y="42" fill={gold} fontSize="8">RÉSISTANCE</text>
      <circle cx="225" cy="118" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="225" y1="118" x2="270" y2="158" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="268,151 273,161 263,161" fill={red} />
      <text x="242" y="170" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Triangle Symétrique': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="38" x2="218" y2="90" stroke={gold} strokeWidth="2" />
      <line x1="30" y1="148" x2="218" y2="90" stroke={gold} strokeWidth="2" />
      <polyline points="30,38 55,62 80,50 110,68 140,58 170,72 200,80 218,90" fill="none" stroke={white} strokeWidth="1.5" opacity="0.6" />
      <circle cx="218" cy="90" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="218" y1="90" x2="268" y2="48" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="266,55 271,45 261,45" fill={green} />
      <line x1="218" y1="90" x2="268" y2="132" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="266,125 271,135 261,135" fill={red} />
      <text x="250" y="42" fill={green} fontSize="8">↑?</text>
      <text x="250" y="142" fill={red} fontSize="8">↓?</text>
    </svg>
  ),

  'Drapeau Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="70" y1="158" x2="155" y2="55" stroke={white} strokeWidth="3" />
      <text x="38" y="138" fill={gold} fontSize="9">MÂT</text>
      <line x1="155" y1="55" x2="205" y2="72" stroke={gold} strokeWidth="1.5" />
      <line x1="155" y1="75" x2="205" y2="92" stroke={gold} strokeWidth="1.5" />
      <polyline points="155,55 175,62 205,72 205,92 175,82 155,75 155,55" fill="rgba(212,175,55,0.1)" stroke={gold} strokeWidth="1.5" />
      <circle cx="205" cy="80" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="205" y1="80" x2="260" y2="28" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="258,35 263,25 253,25" fill={green} />
      <text x="238" y="22" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Drapeau Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="70" y1="22" x2="155" y2="125" stroke={white} strokeWidth="3" />
      <text x="38" y="42" fill={gold} fontSize="9">MÂT</text>
      <line x1="155" y1="108" x2="205" y2="92" stroke={gold} strokeWidth="1.5" />
      <line x1="155" y1="128" x2="205" y2="112" stroke={gold} strokeWidth="1.5" />
      <polyline points="155,108 175,100 205,92 205,112 175,120 155,128 155,108" fill="rgba(212,175,55,0.1)" stroke={gold} strokeWidth="1.5" />
      <circle cx="205" cy="100" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="205" y1="100" x2="260" y2="155" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="258,148 263,158 253,158" fill={red} />
      <text x="238" y="170" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Fanion Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="70" y1="158" x2="155" y2="58" stroke={white} strokeWidth="3" />
      <text x="38" y="138" fill={gold} fontSize="9">MÂT</text>
      <polygon points="155,58 200,45 200,78" fill="rgba(212,175,55,0.1)" stroke={gold} strokeWidth="1.5" />
      <circle cx="200" cy="62" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="200" y1="62" x2="258" y2="18" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="256,25 261,15 251,15" fill={green} />
      <text x="238" y="12" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Fanion Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="70" y1="22" x2="155" y2="122" stroke={white} strokeWidth="3" />
      <text x="38" y="42" fill={gold} fontSize="9">MÂT</text>
      <polygon points="155,122 200,105 200,138" fill="rgba(212,175,55,0.1)" stroke={gold} strokeWidth="1.5" />
      <circle cx="200" cy="118" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="200" y1="118" x2="258" y2="162" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="256,155 261,165 251,165" fill={red} />
      <text x="238" y="172" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Rectangle Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <rect x="40" y="62" width="170" height="68" fill="rgba(212,175,55,0.05)" stroke={gold} strokeWidth="2" />
      <text x="45" y="57" fill={gold} fontSize="8">RÉSISTANCE</text>
      <text x="45" y="148" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="40,95 65,82 90,108 115,75 140,100 165,78 200,92 210,130" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="210" cy="62" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="62" x2="260" y2="20" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="258,27 263,17 253,17" fill={green} />
      <text x="238" y="14" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Rectangle Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <rect x="40" y="52" width="170" height="68" fill="rgba(212,175,55,0.05)" stroke={gold} strokeWidth="2" />
      <text x="45" y="47" fill={gold} fontSize="8">RÉSISTANCE</text>
      <text x="45" y="138" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="40,85 65,72 90,98 115,65 140,90 165,68 200,82 210,120" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="210" cy="120" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="120" x2="260" y2="162" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="258,155 263,165 253,165" fill={red} />
      <text x="238" y="172" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Canal Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="20" y1="148" x2="240" y2="42" stroke={gold} strokeWidth="2" />
      <line x1="20" y1="168" x2="240" y2="72" stroke={gold} strokeWidth="2" strokeDasharray="4,3" />
      <text x="242" y="45" fill={gold} fontSize="8">RÉSIST.</text>
      <text x="242" y="75" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="20,162 50,138 80,118 110,95 140,78 170,60 200,50 230,42" fill="none" stroke={white} strokeWidth="2.5" />
      <circle cx="230" cy="42" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="230" y1="42" x2="272" y2="10" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="270,17 275,7 265,7" fill={green} />
    </svg>
  ),

  'Canal Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="20" y1="42" x2="240" y2="148" stroke={gold} strokeWidth="2" />
      <line x1="20" y1="22" x2="240" y2="118" stroke={gold} strokeWidth="2" strokeDasharray="4,3" />
      <text x="242" y="145" fill={gold} fontSize="8">SUPPORT</text>
      <text x="242" y="115" fill={gold} fontSize="8">RÉSIST.</text>
      <polyline points="20,28 50,48 80,65 110,88 140,105 170,120 200,132 230,142" fill="none" stroke={white} strokeWidth="2.5" />
      <circle cx="230" cy="148" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="230" y1="148" x2="272" y2="168" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="270,161 275,171 265,171" fill={red} />
    </svg>
  ),

  'Coupe avec Anse': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="40" y1="48" x2="260" y2="48" stroke={gold} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="245" y="42" fill={gold} fontSize="8">RÉSIST.</text>
      <path d="M 40,48 Q 150,158 260,48" fill="none" stroke={white} strokeWidth="2.5" />
      <path d="M 215,48 Q 230,78 248,55" fill="none" stroke={white} strokeWidth="2" />
      <text x="195" y="92" fill={gold} fontSize="8">ANSE</text>
      <text x="90" y="150" fill={gold} fontSize="8">COUPE</text>
      <circle cx="248" cy="55" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="248" y1="55" x2="280" y2="18" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,25 283,15 273,15" fill={green} />
      <text x="252" y="12" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  // ── FIGURES RARES ─────────────────────────────────────────────

  'Élargissement Ascendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="90" x2="220" y2="38" stroke={gold} strokeWidth="2" />
      <text x="225" y="41" fill={gold} fontSize="8">RÉSISTANCE</text>
      <line x1="30" y1="90" x2="220" y2="145" stroke={gold} strokeWidth="2" />
      <text x="225" y="148" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="30,90 55,70 75,102 100,55 125,115 150,42 175,130 205,38 220,90" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="220" cy="90" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="220" y1="90" x2="265" y2="45" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="263,52 268,42 258,42" fill={green} />
      <line x1="220" y1="90" x2="265" y2="140" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="263,133 268,143 258,143" fill={red} />
      <text x="248" y="40" fill={green} fontSize="8">↑?</text>
      <text x="248" y="152" fill={red} fontSize="8">↓?</text>
    </svg>
  ),

  'Élargissement Descendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="90" x2="220" y2="42" stroke={gold} strokeWidth="2" />
      <text x="225" y="45" fill={gold} fontSize="8">RÉSISTANCE</text>
      <line x1="30" y1="90" x2="220" y2="148" stroke={gold} strokeWidth="2" />
      <text x="225" y="151" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="30,90 55,72 75,108 100,60 125,120 150,48 175,135 205,42 220,90" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="220" cy="90" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="220" y1="90" x2="265" y2="48" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="263,55 268,45 258,45" fill={green} />
      <line x1="220" y1="90" x2="265" y2="142" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="263,135 268,145 258,145" fill={red} />
    </svg>
  ),

  'Mégaphone': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="80" x2="210" y2="32" stroke={gold} strokeWidth="2" />
      <text x="215" y="35" fill={gold} fontSize="8">RÉSISTANCE</text>
      <line x1="30" y1="100" x2="210" y2="152" stroke={gold} strokeWidth="2" />
      <text x="215" y="155" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="30,90 55,68 80,112 110,52 140,128 170,38 200,148 210,90" fill="none" stroke={white} strokeWidth="2" />
      <circle cx="210" cy="90" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="210" y1="90" x2="258" y2="45" stroke={green} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="256,52 261,42 251,42" fill={green} />
      <line x1="210" y1="90" x2="258" y2="142" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="256,135 261,145 251,145" fill={red} />
    </svg>
  ),

  'Coin Ascendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="148" x2="215" y2="55" stroke={gold} strokeWidth="2" />
      <text x="220" y="58" fill={gold} fontSize="8">RÉSISTANCE</text>
      <line x1="30" y1="165" x2="215" y2="95" stroke={gold} strokeWidth="2" />
      <text x="220" y="98" fill={gold} fontSize="8">SUPPORT</text>
      <polyline points="30,162 60,145 90,135 120,118 150,105 180,90 210,75" fill="none" stroke={white} strokeWidth="2" opacity="0.7" />
      <circle cx="215" cy="78" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="215" y1="78" x2="260" y2="138" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="258,131 263,141 253,141" fill={red} />
      <text x="240" y="150" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  'Coin Descendant': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <line x1="30" y1="38" x2="215" y2="108" stroke={gold} strokeWidth="2" />
      <text x="220" y="111" fill={gold} fontSize="8">SUPPORT</text>
      <line x1="30" y1="22" x2="215" y2="82" stroke={gold} strokeWidth="2" />
      <text x="220" y="85" fill={gold} fontSize="8">RÉSISTANCE</text>
      <polyline points="30,25 60,45 90,58 120,72 150,82 180,95 210,105" fill="none" stroke={white} strokeWidth="2" opacity="0.7" />
      <circle cx="215" cy="95" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="215" y1="95" x2="260" y2="45" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="258,52 263,42 253,42" fill={green} />
      <text x="240" y="38" fill={green} fontSize="8">OBJECTIF ↑</text>
    </svg>
  ),

  'Îlot de Retournement': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      {/* Bougies gauche */}
      <rect x="25" y="80" width="8" height="30" fill={green} opacity="0.8" />
      <rect x="38" y="72" width="8" height="38" fill={green} opacity="0.8" />
      <rect x="51" y="62" width="8" height="48" fill={green} opacity="0.8" />
      <rect x="64" y="55" width="8" height="42" fill={green} opacity="0.8" />
      {/* GAP */}
      <text x="80" y="48" fill={gold} fontSize="9" fontWeight="bold">GAP</text>
      <line x1="78" y1="52" x2="115" y2="52" stroke={gold} strokeWidth="1" strokeDasharray="3,2" />
      <line x1="78" y1="42" x2="115" y2="42" stroke={gold} strokeWidth="1" strokeDasharray="3,2" />
      {/* Îlot */}
      <rect x="82" y="43" width="8" height="18" fill={red} opacity="0.9" />
      <rect x="95" y="42" width="8" height="20" fill={red} opacity="0.9" />
      <rect x="108" y="44" width="8" height="16" fill={red} opacity="0.9" />
      {/* GAP 2 */}
      <line x1="120" y1="52" x2="145" y2="52" stroke={gold} strokeWidth="1" strokeDasharray="3,2" />
      <line x1="120" y1="42" x2="145" y2="42" stroke={gold} strokeWidth="1" strokeDasharray="3,2" />
      {/* Bougies droite */}
      <rect x="148" y="60" width="8" height="40" fill={red} opacity="0.8" />
      <rect x="161" y="70" width="8" height="50" fill={red} opacity="0.8" />
      <rect x="174" y="80" width="8" height="55" fill={red} opacity="0.8" />
      <rect x="187" y="90" width="8" height="55" fill={red} opacity="0.8" />
      {/* Flèche objectif */}
      <circle cx="200" cy="100" r="6" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="200" y1="100" x2="240" y2="150" stroke={red} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points="238,143 243,153 233,153" fill={red} />
      <text x="210" y="168" fill={red} fontSize="8">OBJECTIF ↓</text>
    </svg>
  ),

  // ── HARMONIQUES ───────────────────────────────────────────────

  'Gartley Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,148 90,48 140,108 200,62 250,138" fill="none" stroke={green} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="145" fill={white} fontSize="9">X</text>
      <text x="85" y="43" fill={white} fontSize="9">A</text>
      <text x="135" y="123" fill={white} fontSize="9">B</text>
      <text x="195" y="57" fill={white} fontSize="9">C</text>
      <text x="245" y="153" fill={white} fontSize="9">D</text>
      <line x1="30" y1="148" x2="250" y2="148" stroke={gold} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      <text x="60" y="100" fill={gold} fontSize="8">0.618</text>
      <text x="165" y="90" fill={gold} fontSize="8">0.786</text>
      <circle cx="250" cy="138" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="250" y1="138" x2="280" y2="98" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,105 283,95 273,95" fill={green} />
    </svg>
  ),

  'Gartley Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,38 90,138 140,78 200,122 250,48" fill="none" stroke={red} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="35" fill={white} fontSize="9">X</text>
      <text x="85" y="153" fill={white} fontSize="9">A</text>
      <text x="135" y="73" fill={white} fontSize="9">B</text>
      <text x="195" y="137" fill={white} fontSize="9">C</text>
      <text x="245" y="43" fill={white} fontSize="9">D</text>
      <text x="60" y="92" fill={gold} fontSize="8">0.618</text>
      <text x="165" y="100" fill={gold} fontSize="8">0.786</text>
      <circle cx="250" cy="48" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="250" y1="48" x2="280" y2="88" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,81 283,91 273,91" fill={red} />
    </svg>
  ),

  'Chauve-souris Haussière': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,148 90,48 145,115 200,65 252,145" fill="none" stroke={green} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="145" fill={white} fontSize="9">X</text>
      <text x="85" y="43" fill={white} fontSize="9">A</text>
      <text x="140" y="130" fill={white} fontSize="9">B</text>
      <text x="195" y="60" fill={white} fontSize="9">C</text>
      <text x="247" y="160" fill={white} fontSize="9">D</text>
      <text x="55" y="100" fill={gold} fontSize="8">0.382/0.618</text>
      <text x="162" y="95" fill={gold} fontSize="8">0.886</text>
      <circle cx="252" cy="145" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="252" y1="145" x2="280" y2="105" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,112 283,102 273,102" fill={green} />
    </svg>
  ),

  'Chauve-souris Baissière': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,38 90,138 145,72 200,122 252,42" fill="none" stroke={red} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="35" fill={white} fontSize="9">X</text>
      <text x="85" y="153" fill={white} fontSize="9">A</text>
      <text x="140" y="68" fill={white} fontSize="9">B</text>
      <text x="195" y="137" fill={white} fontSize="9">C</text>
      <text x="247" y="38" fill={white} fontSize="9">D</text>
      <text x="55" y="85" fill={gold} fontSize="8">0.382/0.618</text>
      <text x="162" y="95" fill={gold} fontSize="8">0.886</text>
      <circle cx="252" cy="42" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="252" y1="42" x2="280" y2="82" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,75 283,85 273,85" fill={red} />
    </svg>
  ),

  'Crabe Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,138 90,45 145,108 195,62 252,158" fill="none" stroke={green} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="135" fill={white} fontSize="9">X</text>
      <text x="85" y="40" fill={white} fontSize="9">A</text>
      <text x="140" y="123" fill={white} fontSize="9">B</text>
      <text x="190" y="57" fill={white} fontSize="9">C</text>
      <text x="247" y="170" fill={white} fontSize="9">D</text>
      <text x="55" y="90" fill={gold} fontSize="8">0.382/0.618</text>
      <text x="162" y="90" fill={gold} fontSize="8">2.24/3.618</text>
      <circle cx="252" cy="158" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="252" y1="158" x2="280" y2="115" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,122 283,112 273,112" fill={green} />
    </svg>
  ),

  'Crabe Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,48 90,145 145,78 195,122 252,28" fill="none" stroke={red} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="45" fill={white} fontSize="9">X</text>
      <text x="85" y="160" fill={white} fontSize="9">A</text>
      <text x="140" y="73" fill={white} fontSize="9">B</text>
      <text x="190" y="137" fill={white} fontSize="9">C</text>
      <text x="247" y="25" fill={white} fontSize="9">D</text>
      <text x="55" y="100" fill={gold} fontSize="8">0.382/0.618</text>
      <text x="162" y="100" fill={gold} fontSize="8">2.24/3.618</text>
      <circle cx="252" cy="28" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="252" y1="28" x2="280" y2="72" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,65 283,75 273,75" fill={red} />
    </svg>
  ),

  'Papillon Haussier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,138 90,42 148,118 200,68 252,148" fill="none" stroke={green} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="135" fill={white} fontSize="9">X</text>
      <text x="85" y="37" fill={white} fontSize="9">A</text>
      <text x="143" y="133" fill={white} fontSize="9">B</text>
      <text x="195" y="63" fill={white} fontSize="9">C</text>
      <text x="247" y="163" fill={white} fontSize="9">D</text>
      <text x="50" y="90" fill={gold} fontSize="8">0.786</text>
      <text x="162" y="92" fill={gold} fontSize="8">1.27/1.618</text>
      <circle cx="252" cy="148" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="252" y1="148" x2="280" y2="108" stroke={green} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,115 283,105 273,105" fill={green} />
    </svg>
  ),

  'Papillon Baissier': (
    <svg width="100%" height={180} viewBox="0 0 300 180" style={{ background: '#0A0A0A' }}>
      <polyline points="30,48 90,145 148,68 200,118 252,38" fill="none" stroke={red} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="25" y="45" fill={white} fontSize="9">X</text>
      <text x="85" y="160" fill={white} fontSize="9">A</text>
      <text x="143" y="63" fill={white} fontSize="9">B</text>
      <text x="195" y="133" fill={white} fontSize="9">C</text>
      <text x="247" y="35" fill={white} fontSize="9">D</text>
      <text x="50" y="95" fill={gold} fontSize="8">0.786</text>
      <text x="162" y="95" fill={gold} fontSize="8">1.27/1.618</text>
      <circle cx="252" cy="38" r="7" fill="none" stroke={gold} strokeWidth="1.5" />
      <line x1="252" y1="38" x2="280" y2="78" stroke={red} strokeWidth="2.5" strokeDasharray="4,3" />
      <polygon points="278,71 283,81 273,81" fill={red} />
    </svg>
  ),
}

// ─── Données complètes ───────────────────────────────────────────
interface Figure {
  nom: string
  type: 'haussière' | 'baissière' | 'neutre'
  description: string
  objectif: string
  probabilite: number
  probabiliteLabel: string
  confirmation: string[]
  invalidite: string[]
  hasImage?: boolean
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
  const svgKey     = currentFig.nom
  const svgEl      = SVGs[svgKey] || <PlaceholderSVG label={currentFig.nom} />

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
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat, i) => (
          <button key={cat.label} onClick={() => { setCatIdx(i); setFigIdx(0) }}
            className="py-2 px-1 rounded-xl text-center transition-all text-[10px] font-bold tracking-wide"
            style={{
              background: catIdx === i ? `${cat.color}18` : 'var(--noir-elevated)',
              color:      catIdx === i ? cat.color : '#5C5C5C',
              border:     `1px solid ${catIdx === i ? `${cat.color}40` : 'var(--noir-border)'}`,
            }}>
            {cat.label}
          </button>
        ))}
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

          {/* Type + SVG */}
          <div className="card-premium overflow-hidden" style={{ padding: 0 }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: tc.bg, borderBottom: `1px solid ${tc.border}` }}>
              <span className="text-base">{tc.emoji}</span>
              <span className="text-sm font-bold tracking-wider" style={{ color: tc.color }}>{tc.label}</span>
            </div>
            <div style={{ background: '#0A0A0A' }}>{svgEl}</div>
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
