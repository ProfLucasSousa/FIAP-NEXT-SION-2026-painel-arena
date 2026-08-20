import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface CrystalProps {
  color: string
  progress: number
  size?: number
}

function createCrystalGeometry() {
  const geometry = new THREE.BufferGeometry()
  const sides = 6
  const positions: number[] = []
  const indices: number[] = []
  const rings = [
    { y: 0.78, radius: 0.38, offset: 0 },
    { y: 0.05, radius: 0.66, offset: Math.PI / sides },
    { y: -0.78, radius: 0.43, offset: 0 },
  ]

  const topIndex = 0
  positions.push(0, 1.72, 0)

  rings.forEach((ring) => {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2 + ring.offset
      positions.push(Math.cos(angle) * ring.radius, ring.y, Math.sin(angle) * ring.radius)
    }
  })

  const bottomIndex = positions.length / 3
  positions.push(0, -1.56, 0)

  const ringIndex = (ring: number, side: number) => 1 + ring * sides + (side % sides)
  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides
    indices.push(topIndex, ringIndex(0, side), ringIndex(0, next))
    for (let ring = 0; ring < rings.length - 1; ring += 1) {
      const a = ringIndex(ring, side)
      const b = ringIndex(ring, next)
      const c = ringIndex(ring + 1, side)
      const d = ringIndex(ring + 1, next)
      indices.push(a, c, b, b, c, d)
    }
    indices.push(ringIndex(rings.length - 1, next), ringIndex(rings.length - 1, side), bottomIndex)
  }

  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function Crystal({ color, progress, size = 1 }: CrystalProps) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const geometry = useMemo(createCrystalGeometry, [])
  const energy = THREE.MathUtils.clamp(progress, 0, 1)

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * (0.12 + energy * 0.35)
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.035
    if (core.current) core.current.rotation.y -= delta * 0.45
  })

  return <group ref={group} scale={size}>
    <pointLight color={color} intensity={1.5 + energy * 12} distance={3.2 + energy * 2} decay={2} />
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.04 + energy * 0.72}
        roughness={0.12}
        metalness={0.05}
        transmission={0.52 + energy * 0.26}
        thickness={0.9}
        ior={1.38}
        transparent
        opacity={0.56 + energy * 0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
    <mesh ref={core} scale={[0.31 + energy * 0.18, 0.58 + energy * 0.24, 0.31 + energy * 0.18]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={color} transparent opacity={0.12 + energy * 0.68} toneMapped={false} />
    </mesh>
    <mesh geometry={geometry} scale={1.035}>
      <meshBasicMaterial color={color} transparent opacity={energy * 0.095} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  </group>
}
