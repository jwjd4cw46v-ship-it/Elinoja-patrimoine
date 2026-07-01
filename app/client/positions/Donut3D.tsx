'use client'

/*
  Donut3D — rendu 3D premium façon Cinema4D / marketing Apple.

  DÉPENDANCES REQUISES (à ajouter dans package.json) :
    npm install three @react-three/fiber @react-three/drei troika-three-text

  (three, @react-three/fiber, @react-three/drei sont déjà dans le projet.
   troika-three-text est requis par <Text> de drei pour le rendu de texte 3D —
   à ajouter explicitement pour éviter un module manquant au build.)

  INTÉGRATION (inchangée) :
    import dynamic from 'next/dynamic'
    const Donut3D = dynamic(() => import('./Donut3D'), { ssr: false })
    <Donut3D data={donutData} hovTicker={hov} onHov={setHov} />
    où donutData = [{ ticker, pct, valeur }, ...]

  NOTES D'IMPLÉMENTATION (pour référence) :
  - InstancedMesh n'est pas utilisé : chaque tranche a un ANGLE D'ARC différent,
    donc une géométrie réellement différente (pas seulement une transform
    différente). L'instancing ne s'applique qu'à une géométrie partagée.
    À la place : géométries ET matériaux sont mémoïsés (useMemo) par tranche,
    donc rien n'est recréé inutilement au re-render — c'est l'équivalent
    pratique pour ce cas de figure.
  - Ambient Occlusion "vraie" (SSAO) demande un pass de postprocessing
    (@react-three/postprocessing + postprocessing). Pour ne pas complexifier
    davantage le pipeline de build, l'AO est approximée ici par
    AccumulativeShadows (contact shadow accumulé, très proche visuellement).
    Je peux ajouter le vrai SSAO ensuite si tu veux pousser plus loin.
  - La caméra demandée (position [0,4.2,5], fov 25) est BEAUCOUP plus basse
    et plus serrée que la précédente version : le donut a donc été redimensionné
    (rayon ~1 au lieu de ~2.5) pour rester dans le cadre. Sans ça, avec les
    anciennes dimensions, l'objet aurait été très largement hors-champ.
*/

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment, ContactShadows, AccumulativeShadows, RandomizedLight, Text,
} from '@react-three/drei'

// ─── Couleurs par ticker ──────────────────────────────────────────────────
const TICKER_COLORS: Record<string, string> = {
  TINV: '#22C55E',
  SFBT: '#FACC15',
  TGH:  '#3B82F6',
}
const FALLBACK_COLORS = ['#22C55E', '#EAB308', '#3B82F6', '#A855F7', '#EF4444', '#06B6D4', '#F97316', '#EC4899']

function colorFor(ticker: string, i: number): string {
  return TICKER_COLORS[ticker] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
}

// ─── Échelle du donut dans l'espace 3D (recalibrée pour la nouvelle caméra) ─
const INNER_R = 0.42
const OUTER_R = 1.05
const DEPTH   = 0.42          // épaisseur — massif par rapport au rayon
const BEVEL   = DEPTH * 0.32  // chanfrein large et doux
const CURVE_SEGMENTS = 180    // 128–256 : lissage des arcs
const BEVEL_SEGMENTS = 10     // arêtes jamais anguleuses
const EXPLODE_DISTANCE = 0.11 // ≈ 8–12px à l'échelle de cette caméra

// ─── Géométrie : secteur annulaire extrudé, chanfrein large ───────────────
function buildSliceGeometry(startAngle: number, endAngle: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const segs = CURVE_SEGMENTS
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs)
    const x = Math.cos(a) * OUTER_R, y = Math.sin(a) * OUTER_R
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y)
  }
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
    bevelOffset: 0,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: segs,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -DEPTH / 2, 0)
  geo.computeVertexNormals()
  return geo
}

// ─── Spring critique-amorti (évite d'ajouter @react-spring/three) ─────────
function springTo(current: number, target: number, vel: { v: number }, dt: number, stiffness = 170, damping = 20) {
  const accel = (target - current) * stiffness - vel.v * damping
  vel.v += accel * dt
  return current + vel.v * dt
}

// ─── Une tranche : géométrie + matériaux mémoïsés, animation spring ───────
function Slice({
  seg, active, seed, onEnter, onLeave, onClick,
}: {
  seg: { ticker: string; pct: number; start: number; end: number; mid: number; color: string }
  active: boolean
  seed: number
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const geo = useMemo(() => buildSliceGeometry(seg.start, seg.end), [seg.start, seg.end])

  const [sideMat, topMat] = useMemo(() => {
    const base = new THREE.Color(seg.color)
    const top = base.clone().offsetHSL(0, 0, 0.04)
    const side = base.clone().offsetHSL(0, 0.02, -0.10)
    const common = {
      transmission: 0.06,
      thickness: 0.3,
      ior: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      roughness: 0.15,
      metalness: 0.05,
      reflectivity: 0.85,
      envMapIntensity: 1.6,
    }
    return [
      new THREE.MeshPhysicalMaterial({ color: side, ...common }),
      new THREE.MeshPhysicalMaterial({ color: top, ...common }),
    ]
  }, [seg.color])

  const group = useRef<THREE.Group>(null)
  const velX = useRef({ v: 0 }); const velZ = useRef({ v: 0 })
  const velScale = useRef({ v: 0 }); const velTilt = useRef({ v: 0 })
  const dir = useMemo(() => [Math.cos(seg.mid), Math.sin(seg.mid)] as const, [seg.mid])

  useFrame((state, dt) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const floatY = Math.sin(t * 1.15 + seed) * 0.025

    const targetOffset = active ? EXPLODE_DISTANCE : 0
    const targetScale = active ? 1.045 : 1
    const targetTilt = active ? 0.07 : 0

    const nx = springTo(group.current.position.x, dir[0] * targetOffset, velX.current, dt)
    const nz = springTo(group.current.position.z, dir[1] * targetOffset, velZ.current, dt)
    const ns = springTo(group.current.scale.x, targetScale, velScale.current, dt)
    const nt = springTo(group.current.rotation.x, targetTilt * Math.sin(seg.mid), velTilt.current, dt)

    group.current.position.set(nx, floatY, nz)
    group.current.scale.setScalar(ns)
    group.current.rotation.x = nt
    group.current.rotation.z = springTo(group.current.rotation.z, targetTilt * Math.cos(seg.mid) * -1, velTilt.current, dt)
  })

  const midR = (INNER_R + OUTER_R) / 2
  const lx = Math.cos(seg.mid) * midR
  const lz = Math.sin(seg.mid) * midR

  const stop = (e: any) => e.stopPropagation()

  return (
    <group ref={group}>
      <mesh
        geometry={geo}
        material={[sideMat, topMat]}
        castShadow
        receiveShadow
        onPointerOver={e => { stop(e); onEnter() }}
        onPointerOut={e => { stop(e); onLeave() }}
        onClick={e => { stop(e); onClick() }}
      />
      <Text
        position={[lx, DEPTH / 2 + BEVEL + 0.012, lz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.155}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#000000"
        outlineOpacity={0.35}
      >
        {seg.pct.toFixed(0)}%
      </Text>
    </group>
  )
}

// ─── Centre : texte 3D + léger reflet dans le trou (pas de contour noir) ──
function Center({ count }: { count: number }) {
  const holeMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#050505',
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.5,
  }), [])

  return (
    <>
      <mesh position={[0, -DEPTH / 2 - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={holeMat}>
        <circleGeometry args={[INNER_R, 96]} />
      </mesh>

      <Text
        position={[0, DEPTH / 2 + BEVEL + 0.014, 0.09]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.085}
        letterSpacing={0.15}
        fontWeight={700 as any}
        color="#D4AF37"
        anchorX="center"
        anchorY="middle"
      >
        PORTF.
      </Text>
      <Text
        position={[0, DEPTH / 2 + BEVEL + 0.014, -0.08]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.19}
        color="#D4AF37"
        anchorX="center"
        anchorY="middle"
      >
        {count}
      </Text>
    </>
  )
}

// ─── Lumières : rig studio (area lights, rim light, dorée très faible) ────
function StudioLighting() {
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])

  return (
    <>
      <ambientLight intensity={0.22} />
      <rectAreaLight position={[1.6, 2.2, 1.4]} rotation={[-0.6, 0.5, 0]} width={2.2} height={2.2} intensity={9} color="#ffffff" />
      <rectAreaLight position={[-1.8, 1.4, -1.2]} rotation={[0.3, -0.8, 0]} width={2} height={2} intensity={4} color="#dfe8ff" />
      <directionalLight position={[-2.4, 1.2, -2.8]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[0.5, 1.8, 2.5]} intensity={0.12} color="#D4AF37" />
    </>
  )
}

// ─── Scène ──────────────────────────────────────────────────────────────
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
    const gap = 0.045
    let cum = -Math.PI / 2
    return data.map((d, i) => {
      const pct = total > 0 ? (d.pct / total) * 100 : 0
      const sweep = (pct / 100) * 2 * Math.PI - gap
      const start = cum + gap / 2
      const end = start + Math.max(sweep, 0.001)
      cum += (pct / 100) * 2 * Math.PI
      return {
        ticker: d.ticker, pct, start, end, mid: (start + end) / 2,
        color: colorFor(d.ticker, i),
      }
    })
  }, [data])

  return (
    <>
      <StudioLighting />
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} />
      </Suspense>

      {segs.map((s, i) => (
        <Slice
          key={s.ticker}
          seg={s}
          seed={i * 1.7}
          active={active === s.ticker}
          onEnter={() => onHov(s.ticker)}
          onLeave={() => onHov(null)}
          onClick={() => setClicked(prev => prev === s.ticker ? null : s.ticker)}
        />
      ))}
      <Center count={segs.length} />

      <ContactShadows position={[0, -DEPTH / 2 - 0.01, 0]} opacity={0.5} scale={4} blur={2.2} far={1.4} color="#000000" />
      <AccumulativeShadows position={[0, -DEPTH / 2 - 0.011, 0]} temporal frames={40} alphaTest={0.85} scale={4} color="#000000" opacity={0.55}>
        <RandomizedLight amount={6} radius={2.5} intensity={1} position={[2, 3, 2]} bias={0.001} />
      </AccumulativeShadows>
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
      width: '100%', maxWidth: 230, margin: '0 auto 24px',
      aspectRatio: '1 / 0.85',
      borderRadius: 20, overflow: 'hidden',
      background: 'transparent',
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4.2, 5], fov: 25 }}
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
