import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface CrystalProps {
  color: string
  progress: number
  activated?: boolean
  size?: number
}

interface ParticleField {
  geometry: THREE.BufferGeometry
  angles: Float32Array
  phases: Float32Array
  radii: Float32Array
  speeds: Float32Array
}

const PARTICLE_COUNT = 72
const CRYSTAL_BOTTOM = -1.56
const CRYSTAL_HEIGHT = 3.28

const energyVertexShader = /* glsl */ `
  varying float vHeight;
  varying vec3 vPosition;

  void main() {
    vHeight = (position.y + 1.56) / 3.28;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const energyFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uEnergy;
  uniform float uFill;
  uniform float uTime;
  varying float vHeight;
  varying vec3 vPosition;

  void main() {
    float fill = 1.0 - smoothstep(uFill - 0.025, uFill + 0.018, vHeight);
    if (fill < 0.01) discard;

    float front = 1.0 - smoothstep(0.0, 0.055, abs(vHeight - uFill));
    float veins = pow(max(0.0, sin(vPosition.y * 13.0 + vPosition.x * 8.0 - uTime * 1.8)), 8.0);
    float body = 0.22 + uEnergy * 0.5 + front * 0.7 + veins * (0.08 + uEnergy * 0.18);
    vec3 energizedColor = uColor * (1.15 + uEnergy * 1.25 + front * 0.8);

    gl_FragColor = vec4(energizedColor, fill * body);
  }
`

const particleVertexShader = /* glsl */ `
  uniform float uSize;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (10.0 / -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
  }
`

const particleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distanceToCenter > 0.5) discard;
    float glow = 1.0 - smoothstep(0.05, 0.5, distanceToCenter);
    gl_FragColor = vec4(uColor * 1.8, glow * uOpacity);
  }
`

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

function createParticleField(): ParticleField {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const angles = new Float32Array(PARTICLE_COUNT)
  const phases = new Float32Array(PARTICLE_COUNT)
  const radii = new Float32Array(PARTICLE_COUNT)
  const speeds = new Float32Array(PARTICLE_COUNT)
  let seed = 7291

  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    angles[index] = random() * Math.PI * 2
    phases[index] = random()
    radii[index] = 0.7 + random() * 0.42
    speeds[index] = 0.06 + random() * 0.12
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 8)
  return { geometry, angles, phases, radii, speeds }
}

export function Crystal({ color, progress, activated = false, size = 1 }: CrystalProps) {
  const group = useRef<THREE.Group>(null)
  const nucleus = useRef<THREE.Mesh>(null)
  const nucleusMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const shellMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const auraMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const energyFront = useRef<THREE.Mesh>(null)
  const energyFrontMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const energyMaterial = useRef<THREE.ShaderMaterial>(null)
  const particleMaterial = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(createCrystalGeometry, [])
  const particleField = useMemo(createParticleField, [])
  const teamColor = useMemo(() => new THREE.Color(color), [color])
  const dormantColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.16), [color])
  const initialProgress = activated ? 1 : THREE.MathUtils.clamp(progress, 0, 1)
  const visual = useRef({ energy: 0.18 + initialProgress * 0.82, burst: 0 })
  const mounted = useRef(false)

  const energyUniforms = useMemo(() => ({
      uColor: { value: new THREE.Color(color) },
      uEnergy: { value: visual.current.energy },
      uFill: { value: visual.current.energy },
      uTime: { value: 0 },
  }), [])

  const particleUniforms = useMemo(() => ({
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.3 },
      uSize: { value: 10 },
  }), [])

  useLayoutEffect(() => {
    const targetProgress = activated ? 1 : THREE.MathUtils.clamp(progress, 0, 1)
    const targetEnergy = 0.18 + targetProgress * 0.82

    if (!mounted.current) {
      mounted.current = true
      visual.current.energy = targetEnergy
      return
    }

    const timeline = gsap.timeline()
    timeline
      .to(visual.current, { burst: 1, duration: 0.24, ease: 'power2.out' })
      .to(visual.current, { energy: targetEnergy, duration: 1.35, ease: 'power2.inOut' }, 0)
      .to(visual.current, { burst: 0, duration: 0.95, ease: 'power3.out' }, 0.3)

    return () => {
      timeline.kill()
    }
  }, [activated, progress])

  useFrame((state, delta) => {
    if (!group.current) return

    const elapsed = state.clock.elapsedTime
    const energy = visual.current.energy
    const burst = visual.current.burst
    const pulseSpeed = 1.05 + energy * 1.8
    const pulseAmount = 0.008 + energy * 0.045 + burst * 0.065
    const pulse = 1 + Math.sin(elapsed * pulseSpeed) * pulseAmount

    group.current.rotation.y += delta * (0.08 + energy * 0.24 + burst * 0.08)
    group.current.rotation.z = Math.sin(elapsed * 0.55) * (0.018 + energy * 0.018)

    if (shellMaterial.current) {
      shellMaterial.current.color.copy(dormantColor).lerp(teamColor, 0.2 + energy * 0.68)
      shellMaterial.current.emissive.copy(teamColor)
      shellMaterial.current.emissiveIntensity = 0.025 + energy * 1.08 + burst * 0.28
      shellMaterial.current.opacity = 0.46 + energy * 0.3
      shellMaterial.current.transmission = 0.42 + energy * 0.28
      shellMaterial.current.roughness = 0.28 - energy * 0.16
    }

    if (energyMaterial.current) {
      energyMaterial.current.uniforms.uColor.value.copy(teamColor)
      energyMaterial.current.uniforms.uEnergy.value = energy + burst * 0.12
      energyMaterial.current.uniforms.uFill.value = energy
      energyMaterial.current.uniforms.uTime.value = elapsed
    }

    if (nucleus.current) {
      const nucleusScale = (0.18 + energy * 0.16) * pulse
      nucleus.current.position.y = -1.18 + energy * 1.05
      nucleus.current.scale.set(nucleusScale, nucleusScale * (1.18 + energy * 0.45), nucleusScale)
      nucleus.current.rotation.y -= delta * (0.22 + energy * 0.62)
      nucleus.current.rotation.x += delta * (0.08 + energy * 0.22)
    }

    if (nucleusMaterial.current) {
      nucleusMaterial.current.color.copy(teamColor)
      nucleusMaterial.current.opacity = 0.18 + energy * 0.66 + burst * 0.12
    }

    if (auraMaterial.current) {
      auraMaterial.current.color.copy(teamColor)
      auraMaterial.current.opacity = 0.018 + energy * 0.1 + burst * 0.05
    }

    if (energyFront.current) {
      const radius = 0.18 + Math.sin(energy * Math.PI) * 0.43
      energyFront.current.position.y = CRYSTAL_BOTTOM + energy * CRYSTAL_HEIGHT
      energyFront.current.scale.setScalar((radius / 0.48) * (1 + burst * 0.12))
      energyFront.current.rotation.z += delta * (0.18 + energy * 0.55)
    }

    if (energyFrontMaterial.current) {
      energyFrontMaterial.current.color.copy(teamColor)
      energyFrontMaterial.current.opacity = 0.06 + energy * 0.18 + burst * 0.3
    }

    if (light.current) {
      light.current.color.copy(teamColor)
      light.current.intensity = 0.5 + energy * 8.5 + burst * 2.4
      light.current.distance = 2.4 + energy * 2.8
    }

    const activeParticles = Math.min(PARTICLE_COUNT, Math.floor(5 + energy * 48 + burst * 18))
    const positions = particleField.geometry.attributes.position.array as Float32Array
    const particleCeiling = CRYSTAL_BOTTOM + energy * CRYSTAL_HEIGHT
    const travelHeight = Math.max(0.25, particleCeiling - CRYSTAL_BOTTOM)
    for (let index = 0; index < activeParticles; index += 1) {
      const angle = particleField.angles[index] + elapsed * (0.08 + energy * 0.16) * (index % 2 ? 1 : -1)
      const y = CRYSTAL_BOTTOM + ((particleField.phases[index] * travelHeight + elapsed * particleField.speeds[index] * (0.8 + energy)) % travelHeight)
      const radius = particleField.radii[index] * (0.8 + Math.sin(elapsed * 0.7 + index) * 0.08)
      const offset = index * 3
      positions[offset] = Math.cos(angle) * radius
      positions[offset + 1] = y
      positions[offset + 2] = Math.sin(angle) * radius
    }
    particleField.geometry.setDrawRange(0, activeParticles)
    particleField.geometry.attributes.position.needsUpdate = true
    if (particleMaterial.current) {
      particleMaterial.current.uniforms.uColor.value.copy(teamColor)
      particleMaterial.current.uniforms.uOpacity.value = 0.22 + energy * 0.5 + burst * 0.22
      particleMaterial.current.uniforms.uSize.value = 7 + energy * 8 + burst * 4
    }
  })

  return <group ref={group} scale={size}>
    <pointLight ref={light} color={color} intensity={1} distance={3} decay={2} />
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        ref={shellMaterial}
        color={color}
        emissive={color}
        emissiveIntensity={0.1}
        roughness={0.22}
        metalness={0.08}
        transmission={0.5}
        thickness={0.9}
        ior={1.38}
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
      />
    </mesh>

    <mesh geometry={geometry} scale={0.91} renderOrder={1}>
      <shaderMaterial
        ref={energyMaterial}
        uniforms={energyUniforms}
        vertexShader={energyVertexShader}
        fragmentShader={energyFragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>

    <mesh ref={nucleus}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial ref={nucleusMaterial} color={color} transparent opacity={0.2} toneMapped={false} />
    </mesh>

    <mesh ref={energyFront} rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
      <torusGeometry args={[0.48, 0.018, 8, 48]} />
      <meshBasicMaterial ref={energyFrontMaterial} color={color} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>

    <points geometry={particleField.geometry} renderOrder={3}>
      <shaderMaterial
        ref={particleMaterial}
        uniforms={particleUniforms}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>

    <mesh geometry={geometry} scale={1.035}>
      <meshBasicMaterial ref={auraMaterial} color={color} transparent opacity={0.04} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  </group>
}
