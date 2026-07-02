'use client'

import { useMemo, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, Text } from '@react-three/drei'

// ... (Gardez les constantes INNER_R, OUTER_R, DEPTH, BEVEL, GAP identiques)

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
  const targetPos = useMemo(() => [
    active ? Math.cos(seg.mid) * 0.15 : 0, 
    0, 
    active ? Math.sin(seg.mid) * 0.15 : 0
  ], [active, seg.mid])

  useFrame(() => {
    if (group.current) {
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetPos[0], 0.1)
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetPos[2], 0.1)
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
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {`${seg.pct}%`}
      </Text>
    </group>
  )
}

// Dans votre composant principal Donut3D :
export default function Donut3D() {
  const [hovered, setHovered] = useState<string | null>(null)
  // ... (données et calcul des segs)

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
