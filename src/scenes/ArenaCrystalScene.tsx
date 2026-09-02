import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import gsap from 'gsap'
import type { BloomEffect } from 'postprocessing'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ArenaCrystalActor } from '../components/ArenaCrystalActor'
import { PlanetaryCore, type CoreImpactEvent } from '../components/PlanetaryCore'
import { MISSIONS, TEAM_IDS, type CrystalActivationEvent, type TeamId, type Team } from '../types/arena'

interface ArenaCrystalSceneProps {
  teams: Record<TeamId, Team>
  activationEvents: Partial<Record<TeamId, CrystalActivationEvent>>
  latestActivationEvent?: CrystalActivationEvent
}

function missionProgress(missionIndex: number) {
  return missionIndex / (MISSIONS.length - 1)
}

function ArenaBloom({ activationEvent }: { activationEvent?: CrystalActivationEvent }) {
  const bloom = useRef<BloomEffect>(null)
  const lastActivationId = useRef<string | undefined>(undefined)

  useLayoutEffect(() => {
    if (!bloom.current || !activationEvent || activationEvent.activationId === lastActivationId.current) return
    lastActivationId.current = activationEvent.activationId
    const timeline = gsap.timeline()
      .to(bloom.current, { intensity: 1.5, duration: 0.9, ease: 'sine.inOut' })
      .to(bloom.current, { intensity: 1.9, duration: 0.42, ease: 'power2.in' })
      .to(bloom.current, { intensity: 1.72, duration: 1.74, ease: 'sine.inOut' })
      .to(bloom.current, { intensity: 2.65, duration: 0.08, ease: 'power3.out' })
      .to(bloom.current, { intensity: 1.15, duration: 0.75, ease: 'power3.out' })
    return () => {
      timeline.kill()
    }
  }, [activationEvent])

  return <Bloom ref={bloom} intensity={1.15} luminanceThreshold={0.09} luminanceSmoothing={0.5} mipmapBlur />
}

function ArenaContents({ teams, activationEvents }: Omit<ArenaCrystalSceneProps, 'latestActivationEvent'>) {
  const { size } = useThree()
  const coreRef = useRef<THREE.Group>(null)
  const completedActivationIds = useRef<Partial<Record<TeamId, string>>>({})
  const [impactEvent, setImpactEvent] = useState<CoreImpactEvent>()
  const [deliveredTeams, setDeliveredTeams] = useState<Record<TeamId, boolean>>(() => ({
    red: teams.red.crystalActivated,
    blue: teams.blue.crystalActivated,
    green: teams.green.crystalActivated,
  }))
  const compact = size.width / size.height < 1.02
  const shortStage = size.height < 650
  const sideX = compact ? 2.02 : 2.38
  const topY = shortStage ? 1.62 : 1.82
  const bottomY = shortStage ? -1.68 : -1.88
  const crystalSize = compact ? 0.72 : shortStage ? 0.76 : 0.82
  const crystalPositions: Record<TeamId, [number, number, number]> = {
    red: [0, topY, 0],
    blue: [-sideX, bottomY, 0],
    green: [sideX, bottomY, 0],
  }

  useEffect(() => {
    setDeliveredTeams((current) => {
      const next = { ...current }
      let changed = false
      TEAM_IDS.forEach((teamId) => {
        const event = activationEvents[teamId]
        const delivered = teams[teamId].crystalActivated
          && (!event || completedActivationIds.current[teamId] === event.activationId)
        if (next[teamId] !== delivered) {
          next[teamId] = delivered
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [activationEvents, teams])

  const handleImpact = useCallback((event: CrystalActivationEvent, color: string) => {
    completedActivationIds.current[event.teamId] = event.activationId
    setDeliveredTeams((current) => ({ ...current, [event.teamId]: true }))
    setImpactEvent({ ...event, color })
  }, [])

  const activeCoreTeams = TEAM_IDS.filter((teamId) => deliveredTeams[teamId]).map((teamId) => teams[teamId])

  return <>
    <ambientLight intensity={0.13} />
    <directionalLight position={[2, 5, 5]} color="#b8f4ff" intensity={1.25} />
    <directionalLight position={[-5, -1, 2]} color="#0b637b" intensity={0.6} />

    <PlanetaryCore activeTeams={activeCoreTeams} impactEvent={impactEvent} coreRef={coreRef} />

    {TEAM_IDS.map((teamId) => {
      const team = teams[teamId]
      return <ArenaCrystalActor
        team={team}
        progress={missionProgress(team.missionIndex)}
        homePosition={crystalPositions[teamId]}
        size={crystalSize}
        activationEvent={activationEvents[teamId]}
        coreRef={coreRef}
        onImpact={handleImpact}
        key={team.id}
      />
    })}

    <gridHelper args={[18, 36, '#12495a', '#071d28']} position={[0, -3.3, 0]} />
  </>
}

export function ArenaCrystalScene({ teams, activationEvents, latestActivationEvent }: ArenaCrystalSceneProps) {
  return <div className="arena-crystal-scene" aria-label="Três cristais de equipe ao redor do Núcleo Planetário">
    <Canvas camera={{ position: [0, 0.05, 11], fov: 38 }} dpr={[1, 1.4]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#02070c']} />
      <fog attach="fog" args={['#02070c', 9, 17]} />
      <ArenaContents teams={teams} activationEvents={activationEvents} />
      <EffectComposer multisampling={0}>
        <ArenaBloom activationEvent={latestActivationEvent} />
      </EffectComposer>
    </Canvas>
  </div>
}
