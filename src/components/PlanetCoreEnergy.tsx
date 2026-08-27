import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Team } from '../types/arena'
import type { CoreFullActivationVisualState } from '../animations/coreFullActivation'

export interface CoreStableVisualState {
  energy: number
  motion: number
}

interface CoreEnergyProps {
  stableFx: React.RefObject<CoreStableVisualState>
  fullFx: React.RefObject<CoreFullActivationVisualState>
}

const channelRotation: Record<Team['id'], [number, number, number]> = {
  red: [0.3, 0.15, -0.8],
  blue: [1.15, -0.25, 0.45],
  green: [0.65, 1.2, 1.6],
}

const channelDirection: Record<Team['id'], [number, number, number]> = {
  red: [-0.72, 0.48, 0.5],
  blue: [0.72, 0.48, 0.5],
  green: [0, -0.82, 0.58],
}

interface ChannelParticles {
  geometry: THREE.BufferGeometry
  phases: Float32Array
}

function createChannelParticles(): ChannelParticles {
  const geometry = new THREE.BufferGeometry()
  const phases = new Float32Array(16)
  const positions = new Float32Array(16 * 3)
  for (let index = 0; index < phases.length; index += 1) phases[index] = index / phases.length
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return { geometry, phases }
}

export function CoreEnergyChannel({ team, stableFx, fullFx }: { team: Team } & CoreEnergyProps) {
  const band = useRef<THREE.Mesh>(null)
  const bandMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const node = useRef<THREE.Mesh>(null)
  const nodeMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const particleMaterial = useRef<THREE.PointsMaterial>(null)
  const particles = useMemo(createChannelParticles, [])
  const direction = channelDirection[team.id]

  useFrame((state, delta) => {
    const energy = stableFx.current.energy
    const boost = fullFx.current.acceleration
    const elapsed = state.clock.elapsedTime
    if (band.current) band.current.rotation.z += delta * (0.16 + energy * 0.22 + boost * 0.48)
    if (bandMaterial.current) bandMaterial.current.opacity = 0.48 + energy * 0.28 + fullFx.current.surge * 0.22
    if (node.current) node.current.scale.setScalar(0.78 + Math.sin(elapsed * (1.8 + energy * 1.2)) * 0.08 + fullFx.current.surge * 0.22)
    if (nodeMaterial.current) nodeMaterial.current.opacity = 0.68 + fullFx.current.surge * 0.28

    const positions = particles.geometry.attributes.position.array as Float32Array
    for (let index = 0; index < particles.phases.length; index += 1) {
      const angle = (particles.phases[index] + elapsed * (0.035 + energy * 0.055 + boost * 0.1)) * Math.PI * 2
      const offset = index * 3
      positions[offset] = Math.cos(angle) * 1.08
      positions[offset + 1] = Math.sin(angle) * 1.08
      positions[offset + 2] = Math.sin(angle * 2 + index) * 0.07
    }
    particles.geometry.attributes.position.needsUpdate = true
    if (particleMaterial.current) particleMaterial.current.opacity = 0.35 + energy * 0.42 + fullFx.current.surge * 0.2
  })

  return <group rotation={channelRotation[team.id]}>
    <mesh ref={band}>
      <torusGeometry args={[1.08, 0.026, 8, 72, Math.PI * 1.42]} />
      <meshBasicMaterial ref={bandMaterial} color={team.color} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <points geometry={particles.geometry}>
      <pointsMaterial ref={particleMaterial} color={team.color} size={0.048} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
    <mesh ref={node} position={direction}>
      <octahedronGeometry args={[0.115, 0]} />
      <meshBasicMaterial ref={nodeMaterial} color={team.color} transparent opacity={0.75} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
    <pointLight position={direction} color={team.color} intensity={0.72} distance={3.1} decay={2} />
  </group>
}

interface AmbientParticles {
  geometry: THREE.BufferGeometry
  radii: Float32Array
  phases: Float32Array
  heights: Float32Array
  speeds: Float32Array
}

const AMBIENT_PARTICLES = 78

function createAmbientParticles(): AmbientParticles {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(AMBIENT_PARTICLES * 3)
  const radii = new Float32Array(AMBIENT_PARTICLES)
  const phases = new Float32Array(AMBIENT_PARTICLES)
  const heights = new Float32Array(AMBIENT_PARTICLES)
  const speeds = new Float32Array(AMBIENT_PARTICLES)
  let seed = 6323
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let index = 0; index < AMBIENT_PARTICLES; index += 1) {
    radii[index] = 1.25 + random() * 0.72
    phases[index] = random() * Math.PI * 2
    heights[index] = (random() - 0.5) * 1.25
    speeds[index] = 0.045 + random() * 0.085
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 14)
  return { geometry, radii, phases, heights, speeds }
}

export function CoreAmbientParticles({ stableFx, fullFx }: CoreEnergyProps) {
  const particles = useMemo(createAmbientParticles, [])
  const material = useRef<THREE.PointsMaterial>(null)

  useFrame((state) => {
    const energy = stableFx.current.energy
    const boost = fullFx.current.acceleration
    const elapsed = state.clock.elapsedTime
    const count = Math.min(AMBIENT_PARTICLES, Math.floor(14 + energy * 54 + fullFx.current.surge * 10))
    const positions = particles.geometry.attributes.position.array as Float32Array
    for (let index = 0; index < count; index += 1) {
      const angle = particles.phases[index] + elapsed * particles.speeds[index] * (1 + energy * 1.5 + boost * 2.2)
      const offset = index * 3
      positions[offset] = Math.cos(angle) * particles.radii[index]
      positions[offset + 1] = particles.heights[index] + Math.sin(angle * 1.6) * 0.12
      positions[offset + 2] = Math.sin(angle) * particles.radii[index]
    }
    particles.geometry.setDrawRange(0, count)
    particles.geometry.attributes.position.needsUpdate = true
    if (material.current) {
      material.current.opacity = 0.2 + energy * 0.42 + fullFx.current.surge * 0.18
      material.current.size = 0.026 + energy * 0.022
    }
  })

  return <points geometry={particles.geometry}>
    <pointsMaterial ref={material} color="#73eaff" size={0.03} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </points>
}
