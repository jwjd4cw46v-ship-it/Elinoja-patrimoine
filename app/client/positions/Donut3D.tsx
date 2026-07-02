'use client'

import { useMemo, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, Text } from '@react-three/drei'

// --- Constantes ---
const INNER_R = 0.50
const OUTER_R = 1.20
const DEPTH   = 0.45
const BEVEL   = 0.08
const GAP     = 0.04
const EXPLODE_DISTANCE = 0.15

// --- Fonction de création de géométrie ---
function buildSliceGeometry(startAngle: number, endAngle: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const segs = 128
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs)
    shape.lineTo(Math.cos(a) * OUTER_R, Math.sin(a) * OUTER_R)
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
    bevelSegments: 8,
    curveSegments: segs,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -DEPTH / 2, 0)
  return geo
}

// --- Composant Slice (avec animation) ---
function Slice({ seg, active, onHover }: { seg: any; active: boolean; onHover: (id: string | null) => void }) {
  const geo = useMemo(() => buildSliceGeometry(seg.start, seg.end), [seg.start, seg.end])
  
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: seg.color,
    metalness: 0.2,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0,
    reflectivity: 1.0,
    envMapIntensity: 1.2,
  }), [seg.color])

  const group = useRef<THREE.Group>(null)
  
  useFrame(() => {
    if (group.current) {
      const targetX = active ? Math.cos(seg.mid) * EXPLODE_DISTANCE : 0
      const targetZ = active ? Math.sin(seg.mid) * EXPLODE_DISTANCE : 0
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, 0.1)
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetZ, 0.1)
    }
  })

  return (
    <group ref={group}>
      <mesh 
        geometry={geo} 
        material={material} 
        castShadow 
        receiveShadow 
        onPointerOver={() => onHover(seg.ticker)}
        onPointerOut={() => onHover(null)}
      />
      <Text
        position={[Math.cos(seg.mid) * 0.9, DEPTH / 2 + BEVEL + 0.05, Math.sin(seg.mid) * 0.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        fontWeight="bold"
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {`${seg.pct}%`}
      </Text>
    </group>
  )
}

// --- Éclairage ---
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={2.5} castShadow />
      <spotLight position={[-5, 2, -5]} intensity={2} angle={0.3} penumbra={1} color="#ffffff" />
      <spotLight position={[0, 5, 0]} intensity={1.5} angle={0.5} />
    </>
  )
}

// --- Composant principal ---
export default function Donut3D() {
  const [hovered, setHovered] = useState<string | null>(null)
  
  const data = [
    { ticker: 'VERT', pct: 42, color: '#4ADE80' },
    { ticker: 'JAUNE', pct: 25, color: '#FACC15' },
    { ticker: 'BLEU', pct: 18, color: '#3B82F6' },
    { ticker: 'VIOLET', pct: 10, color: '#A855F7' },
    { ticker: 'ROUGE', pct: 5, color: '#EF4444' },
  ]

  const segs = useMemo(() => {
    let cum = -Math.PI / 2
    return data.map(d => {
      const sweep = (d.pct / 100) * 2 * Math.PI - GAP
      const start = cum + GAP / 2
      const end = start + sweep
      cum += (d.pct / 100) * 2 * Math.PI
      return { ...d, start, end, mid: (start + end) / 2 }
    })
  }, [])

  return (
    <div style={{ width: '100%', height: '500px', background: '#000' }}>
      <Canvas shadows camera={{ position: [0, 4.5, 5], fov: 25 }}>
        <Suspense fallback={null}>
          <Lighting />
          <Environment preset="studio" />
          {segs.map(s => (
            <Slice 
              key={s.ticker} 
              seg={s} 
              active={hovered === s.ticker} 
              onHover={setHovered} 
            />
          ))}
          <ContactShadows position={[0, -DEPTH / 2, 0]} opacity={0.6} scale={10} blur={2} far={1} />
        </Suspense>
      </Canvas>
    </div>
  )
}
