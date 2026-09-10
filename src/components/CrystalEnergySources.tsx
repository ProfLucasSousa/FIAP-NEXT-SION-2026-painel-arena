import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { CRYSTAL_SOURCE_HEIGHTS, type CrystalEnergyState } from '../animations/crystalEnergy'
import { haloFragmentShader, haloVertexShader } from './crystalShaders'

interface Props {
  color: THREE.Color
  visual: RefObject<CrystalEnergyState>
}

// Four diffuse sources: no solid luminous bead or visible light geometry.
export function CrystalEnergySources({ color, visual }: Props) {
  const halos = useRef<Array<THREE.Mesh | null>>([])
  const glowMaterials = useRef<Array<THREE.ShaderMaterial | null>>([])
  const uniforms = useMemo(() => CRYSTAL_SOURCE_HEIGHTS.map(() => ({ uColor: { value: color.clone() }, uStrength: { value: 0 } })), [])

  useFrame(({ clock }) => {
    const { energy, nodes } = visual.current
    const overload = THREE.MathUtils.smoothstep(energy, 0.84, 1)
    CRYSTAL_SOURCE_HEIGHTS.forEach((_, index) => {
      const strength = nodes.getComponent(index)
      const wave = Math.sin(clock.elapsedTime * (1.3 + overload * 2.1) - index * 0.6)
      const irregular = Math.sin(clock.elapsedTime * 7.3 + index * 1.4) * overload
      const arrival = Math.sin(strength * Math.PI)
      const pulse = 1 + wave * (0.025 + overload * 0.045) + irregular * 0.018 + arrival * 0.24
      const tipScale = index === 3 ? 0.35 : 1
      const halo = halos.current[index]
      if (halo) {
        halo.visible = strength > 0.002
        halo.scale.set(0.22 * tipScale * pulse, 0.25 * tipScale * pulse, 0.22 * tipScale * pulse)
      }
      const glow = glowMaterials.current[index]
      if (glow) {
        glow.uniforms.uColor.value.copy(color)
        glow.uniforms.uStrength.value = strength * (0.45 + energy * 0.25) * pulse
      }
    })
  })

  return <group>
    {CRYSTAL_SOURCE_HEIGHTS.map((height, index) => <group position={[0, height, 0]} key={height}>
      <mesh ref={(mesh) => { halos.current[index] = mesh }} renderOrder={2}>
        <sphereGeometry args={[1, 12, 8]} />
        <shaderMaterial ref={(material) => { glowMaterials.current[index] = material }} uniforms={uniforms[index]} vertexShader={haloVertexShader} fragmentShader={haloFragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>)}
  </group>
}
