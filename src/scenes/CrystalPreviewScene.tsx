import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import gsap from 'gsap'
import type { BloomEffect } from 'postprocessing'
import { useLayoutEffect, useRef } from 'react'
import { Crystal } from '../components/Crystal'

interface CrystalPreviewSceneProps {
  progress: number
}

const previewCrystals = [
  { color: '#ff3b4f', position: [-2.35, 0, 0] as const },
  { color: '#21a8ff', position: [0, 0, 0] as const },
  { color: '#73e66a', position: [2.35, 0, 0] as const },
]

function AnimatedBloom({ progress }: { progress: number }) {
  const bloom = useRef<BloomEffect>(null)

  useLayoutEffect(() => {
    if (!bloom.current) return
    const target = 0.48 + progress * 1.42
    const timeline = gsap.timeline()
    timeline
      .to(bloom.current, { intensity: target + 0.28, duration: 0.3, ease: 'power2.out' })
      .to(bloom.current, { intensity: target, duration: 1, ease: 'power3.out' })
    return () => {
      timeline.kill()
    }
  }, [progress])

  return <Bloom ref={bloom} intensity={0.48 + progress * 1.42} luminanceThreshold={0.1} luminanceSmoothing={0.48} mipmapBlur />
}

export function CrystalPreviewScene({ progress }: CrystalPreviewSceneProps) {
  return <Canvas camera={{ position: [0, 0.15, 8.4], fov: 36 }} dpr={[1, 2]} gl={{ antialias: true }}>
    <color attach="background" args={['#030910']} />
    <fog attach="fog" args={['#030910', 5.5, 13]} />
    <ambientLight intensity={0.16} />
    <directionalLight position={[3, 5, 4]} color="#c8f8ff" intensity={1.8} />
    <directionalLight position={[-4, -1, 2]} color="#1988aa" intensity={0.75} />
    {previewCrystals.map((crystal) => <group position={crystal.position} key={crystal.color}>
      <Crystal color={crystal.color} progress={progress} size={0.92} />
    </group>)}
    <gridHelper args={[12, 24, '#155b71', '#0a2736']} position={[0, -1.65, 0]} />
    <OrbitControls enablePan={false} minDistance={6.2} maxDistance={11} target={[0, 0, 0]} />
    <EffectComposer>
      <AnimatedBloom progress={progress} />
    </EffectComposer>
  </Canvas>
}
