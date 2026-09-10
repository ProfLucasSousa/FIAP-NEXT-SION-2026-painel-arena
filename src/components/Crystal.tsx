import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createCrystalEnergyState, getCrystalStage, isCrystalEnergySettled, transitionCrystalEnergy, updateCrystalNodes } from '../animations/crystalEnergy'
import { CrystalEnergySources } from './CrystalEnergySources'
import { createCrystalGeometry, createCrystalLinks } from './crystalGeometry'
import { applyCrystalShellEnergy, crystalVertexShader, edgeFragmentShader, energyFragmentShader, linkFragmentShader, particleFragmentShader, particleVertexShader, veinFragmentShader } from './crystalShaders'

export interface CrystalProps {
  color: string
  progress: number
  activated?: boolean
  size?: number
}

const PARTICLE_COUNT = 12

function createParticles() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
  geometry.setDrawRange(0, 0)
  return geometry
}

export function Crystal({ color, progress, activated = false, size = 1 }: CrystalProps) {
  const stage = getCrystalStage(progress, activated)
  const group = useRef<THREE.Group>(null)
  const shell = useRef<THREE.MeshPhysicalMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const particles = useRef<THREE.ShaderMaterial>(null)
  const energyMaterials = useRef<Array<THREE.ShaderMaterial | null>>([])
  const geometry = useMemo(createCrystalGeometry, [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 12), [geometry])
  const links = useMemo(createCrystalLinks, [])
  const particleGeometry = useMemo(createParticles, [])
  const teamColor = useMemo(() => new THREE.Color(color), [color])
  const visual = useRef(createCrystalEnergyState(stage))
  const uniforms = useMemo(() => ({
    uColor: { value: teamColor.clone() },
    uNodes: { value: visual.current.nodes },
    uEnergy: { value: visual.current.energy },
    uTime: { value: 0 },
    uBurst: { value: 0 },
  }), [])
  const particleUniforms = useMemo(() => ({
    uColor: { value: teamColor.clone() },
    uOpacity: { value: 0 },
    uSize: { value: 6 },
  }), [])
  const shadeShell = useCallback<THREE.MeshPhysicalMaterial['onBeforeCompile']>((shader) => {
    applyCrystalShellEnergy(shader, uniforms)
  }, [uniforms])

  useEffect(() => () => {
    geometry.dispose()
    edges.dispose()
    links.dispose()
    particleGeometry.dispose()
  }, [geometry, edges, links, particleGeometry])

  useLayoutEffect(() => {
    // Check the actual visual state, not just the last requested stage: an
    // effect cleanup can interrupt a tween before it reaches that stage.
    if (isCrystalEnergySettled(visual.current, stage)) return
    const timeline = transitionCrystalEnergy(visual.current, stage)
    return () => { timeline.kill() }
  }, [stage])

  useFrame(({ clock }, delta) => {
    const state = visual.current
    updateCrystalNodes(state)
    const { energy, burst } = state
    const elapsed = clock.elapsedTime
    const overload = THREE.MathUtils.smoothstep(energy, 0.84, 1)
    const irregularPulse = Math.sin(elapsed * 4.7) * 0.65 + Math.sin(elapsed * 8.3) * 0.35

    if (group.current) {
      group.current.rotation.y += Math.min(delta, 0.05) * state.rotationSpeed
      group.current.rotation.z = Math.sin(elapsed * 0.38) * 0.022
      group.current.rotation.x = Math.sin(elapsed * 0.29) * 0.018
      group.current.position.x = irregularPulse * overload * 0.004
      group.current.position.y = Math.sin(elapsed * 11.4) * overload * 0.004
    }
    if (shell.current) {
      shell.current.color.copy(teamColor).multiplyScalar(0.26)
      shell.current.emissive.copy(teamColor)
      shell.current.emissiveIntensity = 0.008
      shell.current.opacity = 0.38
    }
    uniforms.uColor.value.copy(teamColor)
    uniforms.uNodes.value.copy(state.nodes)
    uniforms.uEnergy.value = energy
    uniforms.uTime.value = elapsed
    uniforms.uBurst.value = burst

    // R3F copies uniform wrappers when applying ShaderMaterial props. Updating
    // the memoized input alone leaves scalar values on the GPU at mount-time
    // values, even though the shell and shared vectors are already changing.
    for (const material of energyMaterials.current) {
      if (!material) continue
      material.uniforms.uColor.value.copy(teamColor)
      material.uniforms.uNodes.value.copy(state.nodes)
      material.uniforms.uEnergy.value = energy
      material.uniforms.uTime.value = elapsed
      material.uniforms.uBurst.value = burst
    }

    // Only a gentle spill light; the shader fills the entire charged region.
    if (light.current) {
      light.current.color.copy(teamColor)
      light.current.position.y = -1.05 + energy * 1.05
      light.current.intensity = 0.2 + energy * 0.55 + burst * 0.15
    }

    const count = Math.min(PARTICLE_COUNT, Math.floor(overload * 4 + burst * 5))
    const positions = particleGeometry.attributes.position.array as Float32Array
    for (let index = 0; index < count; index += 1) {
      const phase = (index * 0.618 + elapsed * 0.07) % 1
      const angle = index * 2.4 + elapsed * 0.15
      const radius = 0.65 + Math.sin(index * 3.1) * 0.15
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = -1.3 + phase * (0.3 + energy * 2.6)
      positions[index * 3 + 2] = Math.sin(angle) * radius
    }
    particleGeometry.setDrawRange(0, count)
    particleGeometry.attributes.position.needsUpdate = count > 0
    if (particles.current) {
      particles.current.uniforms.uColor.value.copy(teamColor)
      particles.current.uniforms.uOpacity.value = 0.2 + burst * 0.2
    }
  })

  return <group ref={group} scale={size}>
    <pointLight ref={light} color={color} intensity={0.5} distance={2.8} decay={2} />
    <mesh geometry={geometry} scale={0.985} renderOrder={1}>
      <shaderMaterial ref={(material) => { energyMaterials.current[0] = material }} uniforms={uniforms} vertexShader={crystalVertexShader} fragmentShader={energyFragmentShader} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
    <CrystalEnergySources color={teamColor} visual={visual} />
    <lineSegments geometry={links} renderOrder={2}>
      <shaderMaterial ref={(material) => { energyMaterials.current[1] = material }} uniforms={uniforms} vertexShader={crystalVertexShader} fragmentShader={linkFragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </lineSegments>
    <mesh geometry={geometry} scale={0.96} renderOrder={3}>
      <shaderMaterial ref={(material) => { energyMaterials.current[2] = material }} uniforms={uniforms} vertexShader={crystalVertexShader} fragmentShader={veinFragmentShader} transparent depthWrite={false} side={THREE.FrontSide} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
    <mesh geometry={geometry} renderOrder={4}>
      <meshPhysicalMaterial ref={shell} onBeforeCompile={shadeShell} color={color} roughness={0.24} metalness={0.26} transmission={0.25} thickness={0.65} ior={1.4} clearcoat={0.55} clearcoatRoughness={0.18} flatShading transparent opacity={0.38} depthWrite={false} side={THREE.FrontSide} />
    </mesh>
    <lineSegments geometry={edges} scale={1.002} renderOrder={5}>
      <shaderMaterial ref={(material) => { energyMaterials.current[3] = material }} uniforms={uniforms} vertexShader={crystalVertexShader} fragmentShader={edgeFragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </lineSegments>
    <points geometry={particleGeometry} renderOrder={6}>
      <shaderMaterial ref={particles} uniforms={particleUniforms} vertexShader={particleVertexShader} fragmentShader={particleFragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  </group>
}
