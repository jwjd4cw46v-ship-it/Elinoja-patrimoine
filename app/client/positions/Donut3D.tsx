'use client'

/*
  Donut3D — vrai rendu 3D WebGL (React Three Fiber), maillage fermé.

  POURQUOI CE CHANGEMENT : la version précédente était du SVG "pseudo-3D"
  (des formes plates découpées à la main pour simuler la profondeur). Ça ne
  peut structurellement pas produire un volume fermé — d'où les faces
  manquantes / trous entre secteurs / fond visible à travers.

  Ici, chaque secteur est une SEULE géométrie ExtrudeGeometry : Three.js
  génère automatiquement la face du dessus, la face du dessous, la paroi
  extérieure, la paroi intérieure ET les deux faces de fermeture radiales,
  à partir d'un seul "Shape" en forme d'anneau-secteur. C'est un vrai mesh
  fermé (watertight) — aucune face manquante possible par construction.

  DÉPENDANCES : déjà présentes dans package.json (three, @react-three/fiber,
  @react-three/drei, troika-three-text) — aucune installation supplémentaire.

  INTÉGRATION : identique à avant, aucun changement dans page.tsx :
    const Donut3D = dynamic(() => import('./Donut3D'), { ssr: false })
    <Donut3D data={donutData} hovTicker={hov} onHov={setHov} />
*/

import { useMemo, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, Text } from '@react-three/drei'

// ─── Couleurs + finitions métalliques par ticker ──────────────────────────
// (metalness/roughness dans la plage demandée ; le satiné du gold est
// légèrement plus rugueux pour un rendu "or satiné" plutôt que miroir.)
const TICKER_FINISH: Record<string, { color: string; metalness: number; roughness: number }> = {
  TINV: { color: '#2ED573', metalness: 0.75, roughness: 0.20 }, // métal vert brillant
  SFBT: { color: '#E8B923', metalness: 0.80, roughness: 0.30 }, // or satiné
  TGH:  { color: '#4C8DFF', metalness: 0.68, roughness: 0.18 }, // aluminium anodisé bleu
}
const FALLBACK_FINISH = [
  { color: '#A855F7', metalness: 0.72, roughness: 0.22 },
  { color: '#EF4444', metalness: 0.72, roughness: 0.22 },
  { color: '#06B6D4', metalness: 0.72, roughness: 0.22 },
  { color: '#F97316', metalness: 0.72, roughness: 0.22 },
  { color: '#EC4899', metalness: 0.72, roughness: 0.22 },
]

function finishFor(ticker: string, i: number) {
  return TICKER_FINISH[ticker] ?? FALLBACK_FINISH[i % FALLBACK_FINISH.length]
}

// ─── Géométrie du secteur : UN seul ExtrudeGeometry = mesh fermé ─────────
const INNER_R = 0.55
const OUTER_R = 1.15
const DEPTH   = 0.34            // épaisseur — assez massive pour capter les reflets
const BEVEL   = DEPTH * 0.26    // bevel léger sur les arêtes (capte la lumière)
const CURVE_SEGMENTS = 128      // arcs lissés
const BEVEL_SEGMENTS = 6
const GAP = 0.012               // séparation fine entre secteurs (volontaire, pas un trou)
const EXPLODE_DISTANCE = 0.09

function buildSliceGeometry(startAngle: number, endAngle: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const segs = CURVE_SEGMENTS
  // Arc extérieur (aller)
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs)
    const x = Math.cos(a) * OUTER_R, y = Math.sin(a) * OUTER_R
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y)
  }
  // Arc intérieur (retour) — referme la forme en anneau-secteur.
  // Les deux segments radiaux (fin d'arc extérieur → début d'arc intérieur,
  // et fin d'arc intérieur → fermeture) deviennent, une fois extrudés,
  // les deux "faces latérales de fermeture" du secteur.
  for (let i = segs; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / segs)
    shape.lineTo(Math.cos(a) * INNER_R, Math.sin(a) * INNER_R)
  }
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: segs,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -DEPTH / 2, 0)
  geo.computeVertexNormals() // recalcul des normales — reflets corrects sur tout le volume
  return geo
}

// ─── Spring critique-amorti pour l'explosion au survol ────────────────────
function springTo(current: number, target: number, vel: { v: number }, dt: number, stiffness = 180, damping = 22) {
  const accel = (target - current) * stiffness - vel.v * damping
  vel.v += accel * dt
  return current + vel.v * dt
}

// ─── Une tranche : mesh fermé unique + matériau PBR métallique ────────────
function Slice({
  seg, active, onEnter, onLeave, onClick,
}: {
  seg: { ticker: string; pct: number; start: number; end: number; mid: number; finish: { color: string; metalness: number; roughness: number } }
  active: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const geo = useMemo(() => buildSliceGeometry(seg.start, seg.end), [seg.start, seg.end])

  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: seg.finish.color,
    metalness: seg.finish.metalness,
    roughness: seg.finish.roughness,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    reflectivity: 1,
    envMapIntensity: 1.5,
  }), [seg.finish.color, seg.finish.metalness, seg.finish.roughness])

  const group = useRef<THREE.Group>(null)
  const velX = useRef({ v: 0 }); const velZ = useRef({ v: 0 }); const velScale = useRef({ v: 0 })
  const dir = useMemo(() => [Math.cos(seg.mid), Math.sin(seg.mid)] as const, [seg.mid])

  useFrame((_, dt) => {
    if (!group.current) return
    const targetOffset = active ? EXPLODE_DISTANCE : 0
    const targetScale = active ? 1.04 : 1
    const nx = springTo(group.current.position.x, dir[0] * targetOffset, velX.current, dt)
    const nz = springTo(group.current.position.z, dir[1] * targetOffset, velZ.current, dt)
    const ns = springTo(group.current.scale.x, targetScale, velScale.current, dt)
    group.current.position.set(nx, 0, nz)
    group.current.scale.setScalar(ns)
  })

  const midR = (INNER_R + OUTER_R) / 2
  const lx = Math.cos(seg.mid) * midR
  const lz = Math.sin(seg.mid) * midR

  const stop = (e: any) => e.stopPropagation()

  return (
    <group ref={group}>
      <mesh
        geometry={geo}
        material={material}
        castShadow
        receiveShadow
        onPointerOver={e => { stop(e); onEnter() }}
        onPointerOut={e => { stop(e); onLeave() }}
        onClick={e => { stop(e); onClick() }}
      />
      <Text
        position={[lx, DEPTH / 2 + BEVEL + 0.01, lz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#000000"
        outlineOpacity={0.4}
      >
        {seg.pct.toFixed(0)}%
      </Text>
    </group>
  )
}

// ─── Centre ────────────────────────────────────────────────────────────
function Center({ count }: { count: number }) {
  const holeMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0a0a0a', metalness: 0.4, roughness: 0.4, clearcoat: 0.4, envMapIntensity: 0.6,
  }), [])
  return (
    <>
      <mesh position={[0, -DEPTH / 2 - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={holeMat}>
        <circleGeometry args={[INNER_R, 96]} />
      </mesh>
      <Text position={[0, DEPTH / 2 + BEVEL + 0.012, 0.11]} rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.09} letterSpacing={0.15} color="#D4AF37" anchorX="center" anchorY="middle">
        PORTF.
      </Text>
      <Text position={[0, DEPTH / 2 + BEVEL + 0.012, -0.1]} rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2} color="#D4AF37" anchorX="center" anchorY="middle">
        {count}
      </Text>
    </>
  )
}

// ─── Éclairage : HDRI + lumière clé + rim light ───────────────────────────
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      {/* Lumière clé */}
      <directionalLight position={[2.5, 3.5, 2]} intensity={1.6} castShadow />
      {/* Rim light — accroche le bord, détache le métal du fond */}
      <directionalLight position={[-2.2, 1.4, -2.6]} intensity={1.3} color="#ffffff" />
      {/* Touche dorée très légère */}
      <directionalLight position={[0.5, 1.2, 2.2]} intensity={0.15} color="#D4AF37" />
    </>
  )
}

// ─── Scène ─────────────────────────────────────────────────────────────
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
    let cum = -Math.PI / 2
    return data.map((d, i) => {
      const pct = total > 0 ? (d.pct / total) * 100 : 0
      const sweep = (pct / 100) * 2 * Math.PI - GAP
      const start = cum + GAP / 2
      const end = start + Math.max(sweep, 0.001)
      cum += (pct / 100) * 2 * Math.PI
      return {
        ticker: d.ticker, pct, start, end, mid: (start + end) / 2,
        finish: finishFor(d.ticker, i),
      }
    })
  }, [data])

  return (
    <>
      <Lighting />
      <Suspense fallback={null}>
        {/* HDRI — indispensable pour des reflets métalliques crédibles */}
        <Environment preset="city" background={false} />
      </Suspense>

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
      <Center count={segs.length} />

      {/* Ombre douce sous le donut */}
      <ContactShadows position={[0, -DEPTH / 2 - 0.01, 0]} opacity={0.55} scale={4.5} blur={2.4} far={1.4} color="#000000" />
    </>
  )
}

// ─── Export ────────────────────────────────────────────────────────────
export default function Donut3D({
  data, hovTicker: hovTickerProp, onHov: onHovProp,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker?: string | null
  onHov?: (t: string | null) => void
}) {
  const [hovLocal, setHovLocal] = useState<string | null>(null)
  const hovTicker = hovTickerProp !== undefined ? hovTickerProp : hovLocal
  const onHov = onHovProp ?? setHovLocal

  return (
    <div style={{
      width: '100%', maxWidth: 260, margin: '0 auto 28px',
      aspectRatio: '1 / 0.85',
      borderRadius: 20, overflow: 'hidden',
      background: 'transparent',
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 3.6, 4.4], fov: 30 }}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ background: 'transparent' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0)
          scene.background = null
        }}
      >
        <DonutScene data={data} hovTicker={hovTicker} onHov={onHov} />
      </Canvas>
    </div>
  )
}
