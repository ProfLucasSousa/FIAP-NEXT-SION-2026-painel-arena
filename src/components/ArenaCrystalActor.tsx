import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { createCrystalActivationTimeline, type CrystalActivationVisualState } from '../animations/crystalActivation'
import { Crystal } from './Crystal'
import type { CrystalActivationEvent, Team } from '../types/arena'

interface ArenaCrystalActorProps {
  team: Team
  progress: number
  homePosition: [number, number, number]
  size: number
  activationEvent?: CrystalActivationEvent
  coreRef: React.RefObject<THREE.Group | null>
  onImpact: (event: CrystalActivationEvent, color: string) => void
}

interface AttractionParticles {
  geometry: THREE.BufferGeometry
  directions: Float32Array
  phases: Float32Array
}

const ATTRACTION_PARTICLES = 36

function createAttractionParticles(): AttractionParticles {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(ATTRACTION_PARTICLES * 3)
  const directions = new Float32Array(ATTRACTION_PARTICLES * 3)
  const phases = new Float32Array(ATTRACTION_PARTICLES)
  let seed = 4127
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let index = 0; index < ATTRACTION_PARTICLES; index += 1) {
    const theta = random() * Math.PI * 2
    const y = random() * 2 - 1
    const radius = Math.sqrt(1 - y * y)
    const offset = index * 3
    directions[offset] = Math.cos(theta) * radius
    directions[offset + 1] = y
    directions[offset + 2] = Math.sin(theta) * radius
    phases[index] = random()
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 0)
  return { geometry, directions, phases }
}

export function ArenaCrystalActor({ team, progress, homePosition, size, activationEvent, coreRef, onImpact }: ArenaCrystalActorProps) {
  const flightGroup = useRef<THREE.Group>(null)
  const visualGroup = useRef<THREE.Group>(null)
  const chargeLight = useRef<THREE.PointLight>(null)
  const chargeRing = useRef<THREE.Mesh>(null)
  const chargeRingMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const particleMaterial = useRef<THREE.PointsMaterial>(null)
  const timeline = useRef<gsap.core.Timeline>(null)
  const lastActivationId = useRef<string | undefined>(undefined)
  const animating = useRef(false)
  const fx = useRef<CrystalActivationVisualState>({ charge: 0, flight: 0, absorption: 0 })
  const particles = useMemo(createAttractionParticles, [])
  const [delivered, setDelivered] = useState(team.crystalActivated)
  const [cinematicActive, setCinematicActive] = useState(false)

  const resetAtHome = () => {
    if (!flightGroup.current) return
    flightGroup.current.position.set(...homePosition)
    flightGroup.current.scale.setScalar(1)
    flightGroup.current.visible = true
    if (visualGroup.current) visualGroup.current.rotation.set(0, 0, 0)
    fx.current.charge = 0
    fx.current.flight = 0
    fx.current.absorption = 0
  }

  useLayoutEffect(() => {
    if (animating.current) return
    if (!team.crystalActivated) {
      setDelivered(false)
      resetAtHome()
      return
    }
    if (!activationEvent) {
      setDelivered(true)
      if (flightGroup.current) flightGroup.current.visible = false
    }
  }, [activationEvent, homePosition[0], homePosition[1], homePosition[2], team.crystalActivated])

  useLayoutEffect(() => {
    if (!activationEvent || activationEvent.activationId === lastActivationId.current) return
    if (!flightGroup.current || !visualGroup.current || !coreRef.current || !flightGroup.current.parent) return

    lastActivationId.current = activationEvent.activationId
    timeline.current?.kill()
    animating.current = true
    setDelivered(false)
    setCinematicActive(true)
    resetAtHome()

    const parent = flightGroup.current.parent
    parent.updateWorldMatrix(true, false)
    coreRef.current.updateWorldMatrix(true, false)
    flightGroup.current.updateWorldMatrix(true, false)
    const startWorld = flightGroup.current.getWorldPosition(new THREE.Vector3())
    const targetWorld = coreRef.current.getWorldPosition(new THREE.Vector3())
    const startLocal = parent.worldToLocal(startWorld.clone())
    const targetLocal = parent.worldToLocal(targetWorld.clone())

    timeline.current = createCrystalActivationTimeline({
      flightGroup: flightGroup.current,
      visualGroup: visualGroup.current,
      fx: fx.current,
      startPosition: startLocal,
      targetPosition: targetLocal,
      onImpact: () => onImpact(activationEvent, team.color),
      onComplete: () => {
        animating.current = false
        setCinematicActive(false)
        setDelivered(true)
        if (flightGroup.current) flightGroup.current.visible = false
      },
    })

    return () => {
      timeline.current?.kill()
    }
  }, [activationEvent?.activationId, coreRef, onImpact, team.color])

  useFrame((state, delta) => {
    const charge = fx.current.charge
    const elapsed = state.clock.elapsedTime

    if (visualGroup.current) {
      const pulse = 1 + Math.sin(elapsed * (5 + charge * 7)) * charge * 0.025 + charge * 0.018
      visualGroup.current.scale.setScalar(pulse)
      if (fx.current.flight < 0.01) visualGroup.current.rotation.z = Math.sin(elapsed * 24) * charge * 0.012
    }

    if (chargeRing.current) {
      chargeRing.current.rotation.z += delta * (0.4 + charge * 2.2)
      chargeRing.current.scale.setScalar(0.7 + charge * 0.65 + Math.sin(elapsed * 8) * charge * 0.06)
    }
    if (chargeRingMaterial.current) chargeRingMaterial.current.opacity = charge * (0.1 + (1 - fx.current.absorption) * 0.42)
    if (chargeLight.current) chargeLight.current.intensity = charge * 9 * (1 - fx.current.absorption)

    const activeParticles = Math.floor(charge * ATTRACTION_PARTICLES)
    const positions = particles.geometry.attributes.position.array as Float32Array
    for (let index = 0; index < activeParticles; index += 1) {
      const phase = (particles.phases[index] + elapsed * (0.38 + charge * 0.36)) % 1
      const radius = 0.22 + (1 - phase) * (1.15 + charge * 0.55)
      const offset = index * 3
      const spiral = elapsed * 0.7 + index * 0.45
      positions[offset] = particles.directions[offset] * radius + Math.cos(spiral) * 0.06 * radius
      positions[offset + 1] = particles.directions[offset + 1] * radius
      positions[offset + 2] = particles.directions[offset + 2] * radius + Math.sin(spiral) * 0.06 * radius
    }
    particles.geometry.setDrawRange(0, activeParticles)
    particles.geometry.attributes.position.needsUpdate = true
    if (particleMaterial.current) particleMaterial.current.opacity = charge * 0.82 * (1 - fx.current.absorption)
  })

  return <group ref={flightGroup} visible={!delivered}>
    <group ref={visualGroup}>
      <Crystal color={team.color} progress={progress} activated={team.crystalActivated || cinematicActive} size={size} />
      <pointLight ref={chargeLight} color={team.color} intensity={0} distance={5} decay={2} />
      <mesh ref={chargeRing} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.86, 0.015, 8, 64]} />
        <meshBasicMaterial ref={chargeRingMaterial} color={team.color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <points geometry={particles.geometry}>
        <pointsMaterial ref={particleMaterial} color={team.color} size={0.055} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </points>
    </group>
  </group>
}
