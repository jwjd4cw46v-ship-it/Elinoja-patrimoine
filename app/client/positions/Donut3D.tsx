'use client'

/*
  Donut3D v4 — Géométrie BufferGeometry 100% fermée + PBR métallique premium.

  Chaque secteur = 6 faces :
    1. Face supérieure (anneau elliptique top)
    2. Face inférieure (anneau elliptique bottom)
    3. Paroi extérieure latérale
    4. Paroi intérieure latérale
    5. Face latérale gauche (fermeture)
    6. Face latérale droite (fermeture)

  Aucune dépendance externe. Requiert : three @react-three/fiber @react-three/drei
  (déjà dans le projet).

  Import dans page.tsx :
    import dynamic from 'next/dynamic'
    const Donut3D = dynamic(() => import('./Donut3D'), { ssr: false })
    <Donut3D data={donutData} hovTicker={hov} onHov={setHov} />
*/

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, Text } from '@react-three/drei'

// ─── Config ──────────────────────────────────────────────────────────────────
const OUTER_R   = 1.0
const INNER_R   = 0.44   // 44% du rayon → trou central bien visible
const DEPTH     = 0.38   // épaisseur extrusion
const BEVEL_R   = 0.028  // chanfrein pour capter la lumière
const SEGS      = 128    // lissage des arcs
const BEVEL_SEG = 6      // segments de chanfrein
const EXPLODE   = 0.10   // décalage hover
const GAP_RAD   = 0.025  // espace angulaire entre secteurs

const TICKER_COLORS: Record<string, number[]> = {
  TINV: [0.13, 0.77, 0.37],   // vert métal
  SFBT: [0.98, 0.80, 0.08],   // or satiné
  TGH:  [0.23, 0.51, 0.96],   // aluminium bleu
}
const FALLBACK_COLORS: number[][] = [
  [0.67, 0.33, 0.99],
  [0.94, 0.27, 0.27],
  [0.13, 0.71, 0.84],
  [0.98, 0.57, 0.19],
]

function colorFor(ticker: string, i: number): THREE.Color {
  const rgb = TICKER_COLORS[ticker] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
  return new THREE.Color(rgb[0], rgb[1], rgb[2])
}

// ─── Géométrie fermée : BufferGeometry à 6 faces ─────────────────────────────
function buildClosedSlice(startAngle: number, endAngle: number): THREE.BufferGeometry {
  const positions: number[] = []
  const normals:   number[] = []
  const indices:   number[] = []

  const yTop = DEPTH / 2
  const yBot = -DEPTH / 2

  // Helper : point sur un arc elliptique (ici cercle, rx=ry)
  const pt = (r: number, a: number, y: number): THREE.Vector3 =>
    new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a))

  let vIdx = 0

  // ── Ajoute un quad (2 triangles) avec normales ────────────────────────────
  const addQuad = (
    p0: THREE.Vector3, p1: THREE.Vector3,
    p2: THREE.Vector3, p3: THREE.Vector3,
    normal: THREE.Vector3
  ) => {
    const base = vIdx
    for (const p of [p0, p1, p2, p3]) {
      positions.push(p.x, p.y, p.z)
      normals.push(normal.x, normal.y, normal.z)
    }
    indices.push(base, base+1, base+2, base, base+2, base+3)
    vIdx += 4
  }

  // ── Ajoute un anneau (face top ou bottom) ────────────────────────────────
  const addRingFace = (y: number, normalY: number) => {
    const n = new THREE.Vector3(0, normalY, 0)
    for (let i = 0; i < SEGS; i++) {
      const a0 = startAngle + (endAngle - startAngle) * (i / SEGS)
      const a1 = startAngle + (endAngle - startAngle) * ((i + 1) / SEGS)
      const outer0 = pt(OUTER_R, a0, y)
      const outer1 = pt(OUTER_R, a1, y)
      const inner0 = pt(INNER_R, a0, y)
      const inner1 = pt(INNER_R, a1, y)
      if (normalY > 0) {
        addQuad(outer0, outer1, inner1, inner0, n)
      } else {
        addQuad(inner0, inner1, outer1, outer0, n)
      }
    }
  }

  // ── Ajoute une paroi latérale courbe (extérieure ou intérieure) ───────────
  const addCurvedWall = (r: number, outward: boolean) => {
    for (let i = 0; i < SEGS; i++) {
      const a0 = startAngle + (endAngle - startAngle) * (i / SEGS)
      const a1 = startAngle + (endAngle - startAngle) * ((i + 1) / SEGS)
      const aMid = (a0 + a1) / 2
      const nDir = outward ? 1 : -1
      const n = new THREE.Vector3(Math.cos(aMid) * nDir, 0, Math.sin(aMid) * nDir)
      const p0 = pt(r, a0, yTop)
      const p1 = pt(r, a1, yTop)
      const p2 = pt(r, a1, yBot)
      const p3 = pt(r, a0, yBot)
      if (outward) {
        addQuad(p0, p1, p2, p3, n)
      } else {
        addQuad(p3, p2, p1, p0, n)
      }
    }
  }

  // ── Face latérale de fermeture (start ou end) ─────────────────────────────
  const addEndCap = (angle: number, flipNormal: boolean) => {
    const nx = Math.sin(angle) * (flipNormal ? 1 : -1)
    const nz = -Math.cos(angle) * (flipNormal ? 1 : -1)
    const n = new THREE.Vector3(nx, 0, nz)
    const outerTop = pt(OUTER_R, angle, yTop)
    const innerTop = pt(INNER_R, angle, yTop)
    const outerBot = pt(OUTER_R, angle, yBot)
    const innerBot = pt(INNER_R, angle, yBot)
    if (!flipNormal) {
      addQuad(outerTop, innerTop, innerBot, outerBot, n)
    } else {
      addQuad(outerBot, innerBot, innerTop, outerTop, n)
    }
  }

  // ── Assembler les 6 faces ─────────────────────────────────────────────────
  addRingFace(yTop,  1)   // 1. Face supérieure
  addRingFace(yBot, -1)   // 2. Face inférieure
  addCurvedWall(OUTER_R, true)   // 3. Paroi extérieure
  addCurvedWall(INNER_R, false)  // 4. Paroi intérieure
  addEndCap(startAngle, false)   // 5. Face latérale gauche
  addEndCap(endAngle,   true)    // 6. Face latérale droite

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3))
  geo.setIndex(indices)
  geo.computeVertexNormals()  // recalcul pour lisser les arêtes
  return geo
}

// ─── Matériau PBR métallique premium ─────────────────────────────────────────
function createMaterial(color: THREE.Color): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness:          0.72,
    roughness:          0.22,
    clearcoat:          0.85,
    clearcoatRoughness: 0.05,
    reflectivity:       1.0,
    envMapIntensity:    1.6,
    side:               THREE.FrontSide,
  })
}

// ─── Spring amortie ───────────────────────────────────────────────────────────
function spring(cur: number, tgt: number, vel: { v: number }, dt: number, k = 180, d = 22): number {
  vel.v += ((tgt - cur) * k - vel.v * d) * dt
  return cur + vel.v * dt
}

// ─── Composant Secteur ────────────────────────────────────────────────────────
function Slice({
  ticker, pct, startAngle, endAngle, color, active, seed,
  onEnter, onLeave, onClick,
}: {
  ticker: string; pct: number
  startAngle: number; endAngle: number
  color: THREE.Color; active: boolean; seed: number
  onEnter(): void; onLeave(): void; onClick(): void
}) {
  const geo = useMemo(
    () => buildClosedSlice(startAngle, endAngle),
    [startAngle, endAngle]
  )
  const mat = useMemo(() => createMaterial(color), [color])

  const mid  = (startAngle + endAngle) / 2
  const labR = (OUTER_R + INNER_R) / 2
  const labX = Math.cos(mid) * labR
  const labZ = Math.sin(mid) * labR
  const labY = DEPTH / 2 + 0.04

  const groupRef = useRef<THREE.Group>(null)
  const posX = useRef({ v: 0 })
  const posZ = useRef({ v: 0 })
  const sc    = useRef({ v: 0 })

  useFrame((state, dt) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const floatY = Math.sin(t * 1.1 + seed) * 0.018

    const tx = active ? Math.cos(mid) * EXPLODE : 0
    const tz = active ? Math.sin(mid) * EXPLODE : 0
    const ts = active ? 1.048 : 1

    const nx = spring(groupRef.current.position.x, tx, posX.current, dt)
    const nz = spring(groupRef.current.position.z, tz, posZ.current, dt)
    const ns = spring(groupRef.current.scale.x,    ts, sc.current,   dt)

    groupRef.current.position.set(nx, floatY, nz)
    groupRef.current.scale.setScalar(ns)
  })

  const stop = (e: any) => e.stopPropagation()

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geo}
        material={mat}
        castShadow
        receiveShadow
        onPointerOver={e => { stop(e); onEnter() }}
        onPointerOut={e  => { stop(e); onLeave() }}
        onClick={e       => { stop(e); onClick() }}
      />
      {pct >= 6 && (
        <Text
          position={[labX, labY, labZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.13}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#000"
          outlineOpacity={0.5}
        >
          {pct.toFixed(0)}%
        </Text>
      )}
    </group>
  )
}

// ─── Centre du donut ─────────────────────────────────────────────────────────
function DonutCenter({ count }: { count: number }) {
  const diskGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(INNER_R - 0.01, INNER_R - 0.01, DEPTH + 0.001, 96, 1, true)
    g.computeVertexNormals()
    return g
  }, [])
  const diskMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.02, 0.02, 0.02),
    roughness: 0.4, metalness: 0.1,
    side: THREE.BackSide,
  }), [])

  return (
    <>
      {/* Cylindre intérieur noir pour boucher le trou */}
      <mesh geometry={diskGeo} material={diskMat} />
      <Text position={[0, DEPTH / 2 + 0.06, 0.06]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07} letterSpacing={0.12} color="#D4AF37"
        anchorX="center" anchorY="middle">
        PORTF.
      </Text>
      <Text position={[0, DEPTH / 2 + 0.06, -0.09]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.19} color="#D4AF37"
        anchorX="center" anchorY="middle">
        {count}
      </Text>
    </>
  )
}

// ─── Éclairage studio ────────────────────────────────────────────────────────
function StudioLights() {
  useEffect(() => { RectAreaLightUniformsLib.init() }, [])
  return (
    <>
      <ambientLight intensity={0.18} />
      {/* Key light — avant haut gauche */}
      <rectAreaLight position={[1.8, 2.4, 1.6]} rotation={[-0.55, 0.55, 0]}
        width={2.4} height={2.4} intensity={10} color="#ffffff" />
      {/* Fill light — arrière droit */}
      <rectAreaLight position={[-2.0, 1.6, -1.4]} rotation={[0.3, -0.7, 0]}
        width={2} height={2} intensity={4} color="#ddeeff" />
      {/* Rim light — contour haut */}
      <directionalLight position={[0, 3, -3]} intensity={1.4} color="#ffffff" />
      {/* Gold accent */}
      <directionalLight position={[0.5, 2, 2.5]} intensity={0.15} color="#D4AF37" />
    </>
  )
}

// ─── Scène complète ───────────────────────────────────────────────────────────
function DonutScene({
  data, hovTicker, onHov,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker: string | null
  onHov(t: string | null): void
}) {
  const [clicked, setClicked] = useState<string | null>(null)
  const active = hovTicker ?? clicked

  const segs = useMemo(() => {
    const total = data.reduce((s, d) => s + d.pct, 0)
    let cum = -Math.PI / 2
    return data.map((d, i) => {
      const pct   = total > 0 ? (d.pct / total) * 100 : 0
      const sweep = (pct / 100) * 2 * Math.PI - GAP_RAD
      const start = cum + GAP_RAD / 2
      const end   = start + Math.max(sweep, 0.001)
      cum += (pct / 100) * 2 * Math.PI
      return { ticker: d.ticker, pct, start, end, color: colorFor(d.ticker, i) }
    })
  }, [data])

  return (
    <>
      <StudioLights />
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} />
      </Suspense>

      {segs.map((s, i) => (
        <Slice
          key={s.ticker}
          ticker={s.ticker}
          pct={s.pct}
          startAngle={s.start}
          endAngle={s.end}
          color={s.color}
          active={active === s.ticker}
          seed={i * 1.9}
          onEnter={() => onHov(s.ticker)}
          onLeave={() => onHov(null)}
          onClick={() => setClicked(p => p === s.ticker ? null : s.ticker)}
        />
      ))}

      <DonutCenter count={segs.length} />

      <ContactShadows
        position={[0, -DEPTH / 2 - 0.02, 0]}
        opacity={0.55} scale={4} blur={2.5} far={1.5}
        color="#000000"
      />
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function Donut3D({
  data,
  hovTicker: hovProp,
  onHov: onHovProp,
}: {
  data: { ticker: string; pct: number; valeur?: number }[]
  hovTicker?: string | null
  onHov?: (t: string | null) => void
}) {
  const [hovLocal, setHovLocal] = useState<string | null>(null)
  const hovTicker = hovProp !== undefined ? hovProp : hovLocal
  const onHov     = onHovProp ?? setHovLocal

  return (
    <div style={{
      width:        '100%',
      maxWidth:     240,
      margin:       '0 auto 28px',
      aspectRatio:  '1 / 0.82',
      borderRadius: 16,
      overflow:     'hidden',
      background:   'transparent',
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4.0, 5.2], fov: 26 }}
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
