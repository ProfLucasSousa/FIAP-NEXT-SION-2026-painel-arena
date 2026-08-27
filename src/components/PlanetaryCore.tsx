import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createCoreFullActivationTimeline, type CoreFullActivationVisualState } from '../animations/coreFullActivation'
import { createCoreImpactTimeline, type CoreImpactVisualState } from '../animations/coreImpact'
import { CoreAmbientParticles, CoreEnergyChannel, type CoreStableVisualState } from './PlanetCoreEnergy'
import { getCoreEnergyState } from '../lib/coreEnergy'
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

export function PlanetaryCore({ activeTeams, impactEvent, coreRef }: PlanetaryCoreProps) {
  const innerCore = useRef<THREE.Mesh>(null)
  const innerMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const latticeMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const machineShell = useRef<THREE.Mesh>(null)
  const machineShellMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const orbitOne = useRef<THREE.Mesh>(null)
  const orbitTwo = useRef<THREE.Mesh>(null)
  const orbitThree = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.Mesh>(null)
  const flashMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const impactWave = useRef<THREE.Mesh>(null)
  const impactWaveMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const fullWave = useRef<THREE.Mesh>(null)
  const fullWaveMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const impactLight = useRef<THREE.PointLight>(null)
  const coreLight = useRef<THREE.PointLight>(null)
  const impactParticleMaterial = useRef<THREE.PointsMaterial>(null)
  const impactParticles = useMemo(createImpactParticles, [])
  const impactColor = useRef(new THREE.Color('#58e8ff'))
  const stableFx = useRef<CoreStableVisualState>({ energy: activeTeams.length / 3, motion: activeTeams.length / 3 })
  const impactFx = useRef<CoreImpactVisualState>({ flash: 0, wave: 0, shake: 0, burst: 0 })
  const fullFx = useRef<CoreFullActivationVisualState>({ surge: 0, acceleration: 0, globalWave: 0 })
  const mounted = useRef(false)
  const lastImpactId = useRef<string | undefined>(undefined)
  const stableTimeline = useRef<gsap.core.Tween>(null)
  const impactTimeline = useRef<gsap.core.Timeline>(null)
  const fullTimeline = useRef<gsap.core.Timeline>(null)
  const activeKey = activeTeams.map((team) => team.id).join(',')
  const energyState = useMemo(() => getCoreEnergyState(activeTeams), [activeKey])
  const activeCount = energyState.activeCount
  const accumulatedColor = useMemo(() => {
    const mixed = new THREE.Color('#0b6577')
    activeTeams.forEach((team) => mixed.add(new THREE.Color(team.color).multiplyScalar(0.24)))
    return mixed
  }, [activeKey])

  useLayoutEffect(() => {
    const target = energyState.level
    if (!mounted.current) {
      mounted.current = true
      stableFx.current.energy = target
      stableFx.current.motion = target
      return
    }
    stableTimeline.current?.kill()
    stableTimeline.current = gsap.to(stableFx.current, {
      energy: target,
      motion: target,
      duration: 1.25,
      ease: 'power2.inOut',
    })
    if (activeCount < 3) {
      fullTimeline.current?.kill()
      fullFx.current.surge = 0
      fullFx.current.acceleration = 0
      fullFx.current.globalWave = 0
    }
    return () => {
      stableTimeline.current?.kill()
    }
  }, [activeCount, energyState.level])

  useLayoutEffect(() => {
    if (!impactEvent || impactEvent.activationId === lastImpactId.current) return
    lastImpactId.current = impactEvent.activationId
    impactColor.current.set(impactEvent.color)
    impactTimeline.current?.kill()
    impactTimeline.current = createCoreImpactTimeline(impactFx.current)

    if (energyState.isMaximum) {
      fullTimeline.current?.kill()
      fullTimeline.current = createCoreFullActivationTimeline(fullFx.current)
    }

    return () => {
      impactTimeline.current?.kill()
      fullTimeline.current?.kill()
    }
  }, [activeCount, energyState.isMaximum, impactEvent])

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime
    const stable = stableFx.current
    const impact = impactFx.current
    const maximum = fullFx.current
    const calmPulse = Math.sin(elapsed * (0.75 + stable.energy * 0.8)) * (0.004 + stable.energy * 0.014)
    const motionSpeed = 0.018 + stable.motion * 0.07 + maximum.acceleration * 0.16

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * motionSpeed
      coreRef.current.position.x = Math.sin(elapsed * 71) * impact.shake * 0.035
      coreRef.current.position.y = Math.cos(elapsed * 63) * impact.shake * 0.025
      coreRef.current.scale.setScalar(1 + calmPulse + impact.flash * 0.065 + maximum.surge * 0.055)
    }
    if (innerCore.current) {
      innerCore.current.rotation.y -= delta * (0.045 + stable.motion * 0.11 + maximum.acceleration * 0.16)
      innerCore.current.rotation.x = Math.sin(elapsed * 0.35) * (0.05 + stable.energy * 0.04)
    }
    if (innerMaterial.current) {
      innerMaterial.current.color.copy(accumulatedColor).multiplyScalar(0.2 + stable.energy * 0.12)
      innerMaterial.current.emissive.copy(accumulatedColor)
      innerMaterial.current.emissiveIntensity = 0.2 + stable.energy * 0.72 + impact.flash * 1.8 + maximum.surge * 1.15
      innerMaterial.current.transmission = 0.1 + stable.energy * 0.16
    }
    if (latticeMaterial.current) latticeMaterial.current.opacity = 0.16 + stable.energy * 0.2 + maximum.surge * 0.24
    if (machineShell.current) machineShell.current.rotation.z -= delta * (0.012 + stable.motion * 0.045 + maximum.acceleration * 0.08)
    if (machineShellMaterial.current) machineShellMaterial.current.opacity = 0.08 + stable.energy * 0.15
    if (orbitOne.current) orbitOne.current.rotation.z += delta * (0.035 + stable.motion * 0.1 + maximum.acceleration * 0.24)
    if (orbitTwo.current) orbitTwo.current.rotation.z -= delta * (0.026 + stable.motion * 0.075 + maximum.acceleration * 0.2)
    if (orbitThree.current) orbitThree.current.rotation.z += delta * (0.018 + stable.motion * 0.06 + maximum.acceleration * 0.16)
    if (coreLight.current) coreLight.current.intensity = 1.2 + stable.energy * 3.5 + maximum.surge * 4

    if (flash.current) flash.current.scale.setScalar(0.85 + impact.flash * 1.3 + maximum.surge * 0.35)
    if (flashMaterial.current) {
      flashMaterial.current.color.copy(impactColor.current)
      flashMaterial.current.opacity = impact.flash * 0.82 + maximum.surge * 0.28
    }
    if (impactWave.current) impactWave.current.scale.setScalar(0.3 + impact.wave * 2.45)
    if (impactWaveMaterial.current) {
      impactWaveMaterial.current.color.copy(impactColor.current)
      impactWaveMaterial.current.opacity = Math.sin(impact.wave * Math.PI) * 0.72
    }
    if (fullWave.current) fullWave.current.scale.setScalar(0.4 + maximum.globalWave * 3.3)
    if (fullWaveMaterial.current) fullWaveMaterial.current.opacity = Math.sin(maximum.globalWave * Math.PI) * 0.58
    if (impactLight.current) {
      impactLight.current.color.copy(impactColor.current)
      impactLight.current.intensity = impact.flash * 18 + maximum.surge * 9
    }

    const particleVisibility = impact.wave > 0 && impact.wave < 0.98
    const positions = impactParticles.geometry.attributes.position.array as Float32Array
    if (particleVisibility) {
      for (let index = 0; index < IMPACT_PARTICLES; index += 1) {
        const radius = 0.65 + impact.wave * (2.1 + (index % 5) * 0.08)
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
      impactParticleMaterial.current.opacity = Math.max(0, (1 - impact.wave) * (0.65 + impact.burst * 0.3))
    }
  })

  return <group ref={coreRef}>
    <pointLight ref={coreLight} color="#35dfff" intensity={1.2} distance={5.5} decay={2} />
    <pointLight ref={impactLight} color="#ffffff" intensity={0} distance={7} decay={2} />

    <mesh ref={innerCore}>
      <icosahedronGeometry args={[0.9, 4]} />
      <meshPhysicalMaterial ref={innerMaterial} color="#031017" emissive="#0b6577" emissiveIntensity={0.2} roughness={0.22} metalness={0.48} transmission={0.1} thickness={0.8} />
    </mesh>
    <mesh scale={1.025}>
      <icosahedronGeometry args={[0.92, 2]} />
      <meshBasicMaterial ref={latticeMaterial} color="#64eaff" transparent opacity={0.16} wireframe toneMapped={false} />
    </mesh>
    <mesh ref={machineShell} scale={1.18} rotation={[0.35, 0.4, 0]}>
      <dodecahedronGeometry args={[0.95, 0]} />
      <meshBasicMaterial ref={machineShellMaterial} color="#2a8296" transparent opacity={0.08} wireframe />
    </mesh>

    {activeTeams.map((team) => <CoreEnergyChannel team={team} stableFx={stableFx} fullFx={fullFx} key={team.id} />)}
    <CoreAmbientParticles stableFx={stableFx} fullFx={fullFx} />

    <mesh ref={orbitOne} rotation={[Math.PI / 2.55, 0.15, 0]}>
      <torusGeometry args={[1.4, 0.012, 6, 96, Math.PI * 1.72]} />
      <meshBasicMaterial color="#48e3f8" transparent opacity={0.44} toneMapped={false} />
    </mesh>
    <mesh ref={orbitTwo} rotation={[Math.PI / 1.75, -0.22, Math.PI / 2]}>
      <torusGeometry args={[1.22, 0.009, 6, 96, Math.PI * 1.48]} />
      <meshBasicMaterial color="#238ea9" transparent opacity={0.4} toneMapped={false} />
    </mesh>
    <mesh ref={orbitThree} rotation={[0.4, Math.PI / 2, -0.3]}>
      <torusGeometry args={[1.6, 0.007, 6, 96, Math.PI * 1.24]} />
      <meshBasicMaterial color="#1c6072" transparent opacity={0.3} toneMapped={false} />
    </mesh>

    <mesh ref={flash}>
      <sphereGeometry args={[0.78, 24, 24]} />
      <meshBasicMaterial ref={flashMaterial} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={impactWave} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.75, 0.82, 96]} />
      <meshBasicMaterial ref={impactWaveMaterial} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={fullWave} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.83, 0.88, 96]} />
      <meshBasicMaterial ref={fullWaveMaterial} color="#d9fbff" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
    <points geometry={impactParticles.geometry}>
      <pointsMaterial ref={impactParticleMaterial} color="#ffffff" size={0.065} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  </group>
}
