import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Crystal } from '../components/Crystal'

interface CrystalPreviewSceneProps {
  color: string
  progress: number
}

export function CrystalPreviewScene({ color, progress }: CrystalPreviewSceneProps) {
  return <Canvas camera={{ position: [0, 0.1, 5.8], fov: 36 }} dpr={[1, 2]} gl={{ antialias: true }}>
    <color attach="background" args={['#030910']} />
    <fog attach="fog" args={['#030910', 4, 11]} />
    <ambientLight intensity={0.22} />
    <directionalLight position={[3, 4, 3]} color="#b8f5ff" intensity={2.2} />
    <directionalLight position={[-4, -1, 1]} color={color} intensity={1.4} />
    <Crystal color={color} progress={progress} size={1.15} />
    <gridHelper args={[9, 18, '#155b71', '#0a2736']} position={[0, -1.75, 0]} />
    <OrbitControls enablePan={false} minDistance={3.8} maxDistance={8} />
    <EffectComposer>
      <Bloom intensity={0.7 + progress * 1.5} luminanceThreshold={0.12} luminanceSmoothing={0.4} mipmapBlur />
    </EffectComposer>
  </Canvas>
}
