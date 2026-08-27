import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CrystalActivationEvent, Team } from '../types/arena'

export interface CoreImpactEvent extends CrystalActivationEvent {
  color: string
}

interface PlanetaryCoreProps {
  activeTeams: Team[]
  impactEvent?: CoreImpactEvent
  coreRef: React.RefObject<THREE.Group | null>
}

interface ImpactParticles {
  geometry: THREE.BufferGeometry
  directions: Float32Array
}

const IMPACT_PARTICLES = 48

function createImpactParticles(): ImpactParticles {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(IMPACT_PARTICLES * 3)
  const directions = new Float32Array(IMPACT_PARTICLES * 3)
  let seed = 9187
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let index = 0; index < IMPACT_PARTICLES; index += 1) {
    const theta = random() * Math.PI * 2
    const y = random() * 2 - 1
    const radius = Math.sqrt(1 - y * y)
    const offset = index * 3
    directions[offset] = Math.cos(theta) * radius
    directions[offset + 1] = y
    directions[offset + 2] = Math.sin(theta) * radius
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 0)
  return { geometry, directions }
}

function CoreEnergyBand({ team, index }: { team: Team; index: number }) {
  const band = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!band.current) return
    band.current.rotation.z += delta * (0.11 + index * 0.035) * (index % 2 ? -1 : 1)
  })

  return <group rotation={[0.35 + index * 0.7, index * 0.85, index * 0.5]}>
    <mesh ref={band}>
      <torusGeometry args={[1.03 + index * 0.1, 0.018, 8, 96]} />
      <meshBasicMaterial color={team.color} transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <pointLight color={team.color} intensity={0.75} distance={3.4} decay={2} />
  </group>
}

export function PlanetaryCore({ activeTeams, impactEvent, coreRef }: PlanetaryCoreProps) {
  const innerCore = useRef<THREE.Mesh>(null)
  const innerMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const orbitOne = useRef<THREE.Mesh>(null)
  const orbitTwo = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.Mesh>(null)
  const flashMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const wave = useRef<THREE.Mesh>(null)
  const waveMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const impactLight = useRef<THREE.PointLight>(null)
  const impactParticleMaterial = useRef<THREE.PointsMaterial>(null)
  const impactParticles = useMemo(createImpactParticles, [])
  const impactColor = useRef(new THREE.Color('#58e8ff'))
  const impactFx = useRef({ flash: 0, wave: 0, shake: 0 })
  const lastImpactId = useRef<string | undefined>(undefined)
  const impactTimeline = useRef<gsap.core.Timeline>(null)
  const activeKey = activeTeams.map((team) => team.id).join(',')
  const accumulatedColor = useMemo(() => {
    const mixed = new THREE.Color('#0c6b7d')
    activeTeams.forEach((team) => mixed.add(new THREE.Color(team.color).multiplyScalar(0.32)))
    return mixed
  }, [activeKey])

  useLayoutEffect(() => {
    if (!impactEvent || impactEvent.activationId === lastImpactId.current) return
    lastImpactId.current = impactEvent.activationId
    impactColor.current.set(impactEvent.color)
    impactTimeline.current?.kill()
    impactFx.current.flash = 0
    impactFx.current.wave = 0
    impactFx.current.shake = 0
    impactTimeline.current = gsap.timeline()
      .to(impactFx.current, { flash: 1, shake: 1, duration: 0.08, ease: 'power3.out' })
      .to(impactFx.current, { flash: 0, duration: 0.48, ease: 'power3.out' })
      .to(impactFx.current, { wave: 1, duration: 0.72, ease: 'power3.out' }, 0)
      .to(impactFx.current, { shake: 0, duration: 0.5, ease: 'power2.out' }, 0.1)

    return () => {
      impactTimeline.current?.kill()
    }
  }, [impactEvent])

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime
    const fx = impactFx.current
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.035
      coreRef.current.position.x = Math.sin(elapsed * 71) * fx.shake * 0.035
      coreRef.current.position.y = Math.cos(elapsed * 63) * fx.shake * 0.025
      coreRef.current.scale.setScalar(1 + fx.flash * 0.065)
    }
    if (innerCore.current) {
      innerCore.current.rotation.y -= delta * 0.08
      innerCore.current.rotation.x = Math.sin(elapsed * 0.35) * 0.08
    }
    if (innerMaterial.current) {
      innerMaterial.current.color.copy(accumulatedColor).multiplyScalar(0.28)
      innerMaterial.current.emissive.copy(accumulatedColor)
      innerMaterial.current.emissiveIntensity = 0.32 + activeTeams.length * 0.18 + fx.flash * 1.8
    }
    if (orbitOne.current) orbitOne.current.rotation.z += delta * 0.07
    if (orbitTwo.current) orbitTwo.current.rotation.z -= delta * 0.045
    if (flash.current) flash.current.scale.setScalar(0.85 + fx.flash * 1.3)
    if (flashMaterial.current) {
      flashMaterial.current.color.copy(impactColor.current)
      flashMaterial.current.opacity = fx.flash * 0.82
    }
    if (wave.current) wave.current.scale.setScalar(0.3 + fx.wave * 2.45)
    if (waveMaterial.current) {
      waveMaterial.current.color.copy(impactColor.current)
      waveMaterial.current.opacity = Math.max(0, (1 - fx.wave) * 0.72)
    }
    if (impactLight.current) {
      impactLight.current.color.copy(impactColor.current)
      impactLight.current.intensity = fx.flash * 18
    }

    const particleVisibility = fx.wave > 0 && fx.wave < 0.98
    const positions = impactParticles.geometry.attributes.position.array as Float32Array
    if (particleVisibility) {
      for (let index = 0; index < IMPACT_PARTICLES; index += 1) {
        const radius = 0.65 + fx.wave * (2.1 + (index % 5) * 0.08)
        const offset = index * 3
        positions[offset] = impactParticles.directions[offset] * radius
        positions[offset + 1] = impactParticles.directions[offset + 1] * radius
        positions[offset + 2] = impactParticles.directions[offset + 2] * radius
      }
      impactParticles.geometry.attributes.position.needsUpdate = true
    }
    impactParticles.geometry.setDrawRange(0, particleVisibility ? IMPACT_PARTICLES : 0)
    if (impactParticleMaterial.current) {
      impactParticleMaterial.current.color.copy(impactColor.current)
      impactParticleMaterial.current.opacity = Math.max(0, (1 - fx.wave) * 0.9)
    }
  })

  return <group ref={coreRef}>
    <pointLight color="#35dfff" intensity={2.2 + activeTeams.length * 0.45} distance={5.5} decay={2} />
    <pointLight ref={impactLight} color="#ffffff" intensity={0} distance={7} decay={2} />

    <mesh ref={innerCore}>
      <icosahedronGeometry args={[0.92, 3]} />
      <meshPhysicalMaterial ref={innerMaterial} color="#071d29" emissive="#128eaa" emissiveIntensity={0.36} roughness={0.2} metalness={0.42} transmission={0.16} thickness={0.7} />
    </mesh>
    <mesh scale={1.025}>
      <icosahedronGeometry args={[0.92, 2]} />
      <meshBasicMaterial color="#56e8ff" transparent opacity={0.22} wireframe toneMapped={false} />
    </mesh>
    {activeTeams.map((team, index) => <CoreEnergyBand team={team} index={index} key={team.id} />)}

    <mesh ref={orbitOne} rotation={[Math.PI / 2.55, 0.15, 0]}>
      <torusGeometry args={[1.38, 0.012, 6, 96]} />
      <meshBasicMaterial color="#48e3f8" transparent opacity={0.48} toneMapped={false} />
    </mesh>
    <mesh ref={orbitTwo} rotation={[Math.PI / 1.75, -0.22, Math.PI / 2]}>
      <torusGeometry args={[1.18, 0.009, 6, 96]} />
      <meshBasicMaterial color="#238ea9" transparent opacity={0.44} toneMapped={false} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.62, 1.65, 96]} />
      <meshBasicMaterial color="#174e61" transparent opacity={0.24} side={THREE.DoubleSide} />
    </mesh>

    <mesh ref={flash}>
      <sphereGeometry args={[0.78, 24, 24]} />
      <meshBasicMaterial ref={flashMaterial} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={wave} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.75, 0.82, 96]} />
      <meshBasicMaterial ref={waveMaterial} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
    <points geometry={impactParticles.geometry}>
      <pointsMaterial ref={impactParticleMaterial} color="#ffffff" size={0.065} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  </group>
}
