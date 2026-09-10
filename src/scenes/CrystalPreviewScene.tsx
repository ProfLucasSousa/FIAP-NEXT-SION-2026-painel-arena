import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useRef } from 'react'
import { Crystal } from '../components/Crystal'

interface CrystalPreviewSceneProps {
  progress: number
  comparisonColor?: string
  onFps: (fps: number) => void
}

export const PREVIEW_COLORS = [
  { name: 'VERMELHO', color: '#ff3b4f' },
  { name: 'AZUL', color: '#21a8ff' },
  { name: 'VERDE', color: '#9bdf4c' },
] as const

function FrameMeter({ onFps }: { onFps: (fps: number) => void }) {
  const sample = useRef({ seconds: 0, frames: 0 })
  useFrame((_, delta) => {
    if (document.hidden) {
      sample.current = { seconds: 0, frames: 0 }
      return
    }
    sample.current.seconds += delta
    sample.current.frames += 1
    if (sample.current.seconds >= 2) {
      onFps(Math.round(sample.current.frames / sample.current.seconds))
      sample.current = { seconds: 0, frames: 0 }
    }
  })
  return null
}

export function CrystalPreviewScene({ progress, comparisonColor, onFps }: CrystalPreviewSceneProps) {
  const crystals = comparisonColor
    ? [0, 1 / 3, 2 / 3, 1].map((stage, index) => ({ color: comparisonColor, progress: stage, x: (index - 1.5) * 2.1 }))
    : PREVIEW_COLORS.map(({ color }, index) => ({ color, progress, x: (index - 1) * 2.35 }))
  return <Canvas camera={{ position: [0, 0.15, 9.8], fov: 36 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
    <color attach="background" args={['#030910']} />
    <ambientLight intensity={0.16} />
    <directionalLight position={[3, 5, 4]} color="#c8f8ff" intensity={1.8} />
    <directionalLight position={[-4, -1, 2]} color="#1988aa" intensity={0.75} />
    {crystals.map((crystal, index) => <group position={[crystal.x, 0, 0]} key={`${comparisonColor ? 'stage' : 'team'}-${index}`}>
      <Crystal color={crystal.color} progress={crystal.progress} size={comparisonColor ? 0.84 : 0.92} />
    </group>)}
    <gridHelper args={[12, 24, '#155b71', '#0a2736']} position={[0, -1.65, 0]} />
    <OrbitControls enablePan={false} minDistance={7} maxDistance={14} target={[0, 0, 0]} />
    <FrameMeter onFps={onFps} />
    <EffectComposer multisampling={0}>
      {/* Match the arena's resting bloom; each crystal controls its own emission. */}
      <Bloom intensity={1.15} luminanceThreshold={0.09} luminanceSmoothing={0.5} mipmapBlur />
    </EffectComposer>
  </Canvas>
}
