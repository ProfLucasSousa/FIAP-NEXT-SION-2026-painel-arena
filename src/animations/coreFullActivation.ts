import gsap from 'gsap'

export interface CoreFullActivationVisualState {
  surge: number
  acceleration: number
  globalWave: number
}

export function createCoreFullActivationTimeline(state: CoreFullActivationVisualState) {
  return gsap.timeline()
    .set(state, { surge: 0, acceleration: 0, globalWave: 0 })
    .to(state, { surge: 1, acceleration: 1, duration: 0.18, ease: 'power3.out' })
    .to(state, { surge: 0.35, duration: 0.24, ease: 'power2.out' })
    .to(state, { surge: 1, duration: 0.12, ease: 'power3.out' })
    .to(state, { globalWave: 1, duration: 1.15, ease: 'power3.out' }, 0.18)
    .to(state, { surge: 0, acceleration: 0, duration: 0.82, ease: 'power3.out' }, 0.54)
}
