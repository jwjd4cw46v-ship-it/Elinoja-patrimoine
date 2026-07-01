'use client'

/*
  Donut3D — donut chart en VRAI rendu 3D (React Three Fiber / WebGL).

  Contrairement à la version SVG précédente (formes plates + dégradés
  linéaires simulant la profondeur), ce composant construit une vraie
  géométrie 3D extrudée (secteur annulaire) éclairée par un environnement
  PBR — ce qui donne des reflets spéculaires qui suivent réellement la
  courbure de la surface, comme dans l'image de référence.

  INSTALLATION REQUISE (à lancer dans le projet) :
    npm install three @react-three/fiber @react-three/drei

  INTÉGRATION (Next.js App Router) :
    Le Canvas WebGL ne doit pas être rendu côté serveur. Importer ce
    composant avec next/dynamic et ssr:false :

      import dynamic from 'next/dynamic'
      const Donut3D = dynamic(() => import('./Donut3D'), { ssr: false })

    Puis l'utiliser exactement comme l'ancien <DonutChart /> :

      <Donut3D data={donutData} hovTicker={hov} onHov={setHov} />

    où donutData = [{ ticker, pct, valeur }, ...]
*/

import { useMemo, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, Html } from '@react-three/drei'

// ─── Couleurs par ticker (mêmes règles que la version précédente) ───────────
const TICKER_COLORS: Record<string, string> = {
  TINV: '#22C55E',
  SFBT: '#FACC15',
  TGH:  '#3B82F6',
}
const FALLBACK_COLORS = ['#22C55E', '#EAB308', '#3B82F6', '#A855F7', '#EF4444', '#06B6D4', '#F97316', '#EC4899']

function colorFor(ticker: string, i: number): string {
  return TICKER_COLORS[ticker] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
}

// ─── Géométrie : secteur annulaire extrudé avec bevel (arête glossy) ───────
function buildSliceGeometry(
  startAngle: number, endAngle: number,
  innerR: number, outerR: number,
  depth: number, bevel: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const segs = 48
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs)
    const x = Math.cos(a) * outerR, y = Math.sin(a) * outerR
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y)
  }
  for (let i = segs; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / segs)
    shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR)
  }
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 48,
  })
  // Le shape est extrudé le long de Z par défaut → on couche le solide
  // à plat pour que l'épaisseur devienne la hauteur (Y), vue de dessus.
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -depth / 2, 0)
  return geo
}

// ─── Une tranche individuelle (mesh + interaction + label %) ───────────────
function Slice({
  seg, active, onEnter, onLeave, onClick,
}: {
  seg: {
    ticker: string; pct: number; valeur?: number
    start: number; end: number; mid: number; color: string
  }
  active: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const innerR = 0.95, outerR = 2.5, depth = 0.7, bevel = 0.035
  const geo = useMemo(
    () => buildSliceGeometry(seg.start, seg.end, innerR, outerR, depth, bevel),
    [seg.start, seg.end]
  )
  const group = useRef<THREE.Group>(null)
  const explodeDir = useMemo(
    () => [Math.cos(seg.mid), 0, Math.sin(seg.mid)] as const,
    [seg.mid]
  )
  const targetOffset = active ? 0.32 : 0
  const targetScale  = active ? 1.05 : 1

  useFrame(() => {
    if (!group.current) return
    const cur = group.current.position
    cur.x += (explodeDir[0] * targetOffset - cur.x) * 0.18
    cur.z += (explodeDir[2] * targetOffset - cur.z) * 0.18
    const s = group.current.scale
    s.x += (targetScale - s.x) * 0.18
    s.y += (targetScale - s.y) * 0.18
    s.z += (targetScale - s.z) * 0.18
  })

  const midR = (innerR + outerR) / 2
  const labelPos: [number, number, number] = [
    Math.cos(seg.mid) * midR, depth / 2 + 0.05, Math.sin(seg.mid) * midR,
  ]

  return (
    <group ref={group}>
      <mesh
        geometry={geo}
        castShadow
        receiveShadow
        onPointerOver={e => { e.stopPropagation(); onEnter() }}
        onPointerOut={e => { e.stopPropagation(); onLeave() }}
        onClick={e => { e.stopPropagation(); onClick() }}
      >
        <meshPhysicalMaterial
          color={seg.color}
          roughness={0.22}
          metalness={0.06}
          clearcoat={0.95}
          clearcoatRoughness={0.1}
          reflectivity={0.55}
          envMapIntensity={1.0}
        />
      </mesh>
      {/* Affiché sur toutes les tranches, y compris les petites (ex : 8%) */}
      <Html position={labelPos} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13, fontWeight: 700, color: 'white',
          textShadow: '0 2px 6px rgba(0,0,0,.5)',
          whiteSpace: 'nowrap',
        }}>
          {seg.pct.toFixed(0)}%
        </div>
      </Html>
    </group>
  )
}

// ─── Texte central "PORTF. / N" (overlay HTML ancré au centre 3D) ─────────
function CenterLabel({ count }: { count: number }) {
  return (
    <Html position={[0, 0.5, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
          color: '#D4AF37', opacity: 0.9,
        }}>PORTF.</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#D4AF37', opacity: 0.9 }}>
          {count}
        </div>
      </div>
    </Html>
  )
}

// ─── Scène ──────────────────────────────────────────────────────────────────
function DonutScene({
  data, hovTicker, onHov,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker: string | null
  onHov: (t: string | null) => void
}) {
  const [clicked, setClicked] = useState<string | null>(null)
  const active = hovTicker ?? clicked

  const segs = useMemo(() => {
    const total = data.reduce((s, d) => s + d.pct, 0)
    const gap = 0.035
    let cum = -Math.PI / 2
    return data.map((d, i) => {
      const pct = total > 0 ? (d.pct / total) * 100 : 0
      const sweep = (pct / 100) * 2 * Math.PI - gap
      const start = cum + gap / 2
      const end = start + Math.max(sweep, 0.001)
      cum += (pct / 100) * 2 * Math.PI
      return {
        ticker: d.ticker, pct, valeur: d.valeur,
        start, end, mid: (start + end) / 2,
        color: colorFor(d.ticker, i),
      }
    })
  }, [data])

  return (
    <>
      {/* Pas de <color attach="background"> : le Canvas est transparent
          (gl alpha:true) et laisse voir le fond sombre de la carte. */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 3]} intensity={1.7} castShadow />
      <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#D4AF37" />
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} />
      </Suspense>

      <group rotation={[0, 0, 0]}>
        {segs.map((s, i) => (
          <Slice
            key={s.ticker}
            seg={s}
            active={active === s.ticker}
            onEnter={() => onHov(s.ticker)}
            onLeave={() => onHov(null)}
            onClick={() => setClicked(prev => prev === s.ticker ? null : s.ticker)}
          />
        ))}
        <CenterLabel count={segs.length} />
      </group>

      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.55}
        scale={9}
        blur={2.6}
        far={2}
        color="#000000"
      />
    </>
  )
}

// ─── Export : Canvas + caméra inclinée façon référence ─────────────────────
export default function Donut3D({
  data, hovTicker: hovTickerProp, onHov: onHovProp,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker?: string | null
  onHov?: (t: string | null) => void
}) {
  // Le composant fonctionne aussi bien contrôlé (props) que non contrôlé.
  const [hovLocal, setHovLocal] = useState<string | null>(null)
  const hovTicker = hovTickerProp !== undefined ? hovTickerProp : hovLocal
  const onHov = onHovProp ?? setHovLocal

  return (
    <div style={{
      width: '100%', maxWidth: 230, margin: '0 auto 24px',
      aspectRatio: '1 / 0.85',
      borderRadius: 20, overflow: 'hidden',   // garantit qu'il ne déborde jamais de la carte
      background: 'transparent',
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 6.4, 8.0], fov: 34 }}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ background: 'transparent' }}
        onCreated={({ gl, scene }) => {
          // Force la transparence même si un preset d'Environment tente
          // de forcer un fond (bug rencontré avec certaines versions de drei).
          gl.setClearColor(0x000000, 0)
          scene.background = null
        }}
      >
        <DonutScene data={data} hovTicker={hovTicker} onHov={onHov} />
      </Canvas>
    </div>
  )
}
