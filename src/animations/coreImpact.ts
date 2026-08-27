import gsap from 'gsap'

export interface CoreImpactVisualState {
  flash: number
  wave: number
  shake: number
  burst: number
}

export function createCoreImpactTimeline(state: CoreImpactVisualState) {
  return gsap.timeline()
    .set(state, { flash: 0, wave: 0, shake: 0, burst: 0 })
    .to(state, { flash: 1, shake: 1, burst: 1, duration: 0.08, ease: 'power3.out' })
    .to(state, { flash: 0, duration: 0.48, ease: 'power3.out' })
    .to(state, { wave: 1, duration: 0.78, ease: 'power3.out' }, 0)
    .to(state, { shake: 0, burst: 0, duration: 0.52, ease: 'power2.out' }, 0.1)
}
