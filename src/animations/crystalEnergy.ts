import gsap from 'gsap'
import { MathUtils, Vector4 } from 'three'

export const CRYSTAL_ENERGY_LEVELS = [0.25, 0.5, 0.75, 1] as const
export const CRYSTAL_ROTATION_SPEEDS = [0.16, 0.216, 0.28, 0.36] as const
export const CRYSTAL_BOTTOM = -1.56
export const CRYSTAL_HEIGHT = 3.28
// Markers sit just below each fill frontier, with the last inside the upper tip.
export const CRYSTAL_SOURCE_LEVELS = [0.22, 0.47, 0.72, 0.9] as const
export const CRYSTAL_SOURCE_HEIGHTS = CRYSTAL_SOURCE_LEVELS.map(level => CRYSTAL_BOTTOM + level * CRYSTAL_HEIGHT)

export interface CrystalEnergyState {
  energy: number
  rotationSpeed: number
  burst: number
  nodes: Vector4
}

export function getCrystalStage(progress: number, activated = false) {
  return activated ? 3 : Math.round(MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * 3)
}

// A node ignites only after the advancing front has reached its region.
export function updateCrystalNodes(state: CrystalEnergyState) {
  CRYSTAL_SOURCE_LEVELS.forEach((level, index) => {
    state.nodes.setComponent(index, MathUtils.smoothstep(state.energy, level, level + 0.025))
  })
}

export function createCrystalEnergyState(stage: number): CrystalEnergyState {
  const state = { energy: CRYSTAL_ENERGY_LEVELS[stage], rotationSpeed: CRYSTAL_ROTATION_SPEEDS[stage], burst: 0, nodes: new Vector4() }
  updateCrystalNodes(state)
  return state
}

export function transitionCrystalEnergy(state: CrystalEnergyState, stage: number) {
  return gsap.timeline()
    .to(state, { energy: CRYSTAL_ENERGY_LEVELS[stage], duration: 1.65, ease: 'power2.inOut' }, 0)
    .to(state, { burst: 1, duration: 0.32, ease: 'sine.out' }, 0)
    .to(state, { burst: 0, duration: 1.1, ease: 'sine.inOut' }, 0.5)
    // Let the next sources ignite before the body gains angular speed.
    .to(state, { rotationSpeed: CRYSTAL_ROTATION_SPEEDS[stage], duration: 1.6, ease: 'sine.inOut' }, 1.45)
}
