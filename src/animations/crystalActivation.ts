import gsap from 'gsap'
import * as THREE from 'three'

export interface CrystalActivationVisualState {
  charge: number
  flight: number
  absorption: number
}

interface CrystalActivationTimelineOptions {
  flightGroup: THREE.Group
  visualGroup: THREE.Group
  fx: CrystalActivationVisualState
  startPosition: THREE.Vector3
  targetPosition: THREE.Vector3
  onImpact: () => void
  onComplete: () => void
}

export function createCrystalActivationTimeline({
  flightGroup,
  visualGroup,
  fx,
  startPosition,
  targetPosition,
  onImpact,
  onComplete,
}: CrystalActivationTimelineOptions) {
  const liftPosition = startPosition.clone().add(new THREE.Vector3(0, 0.38, 0))
  const controlPoint = liftPosition.clone().lerp(targetPosition, 0.48)
  const travelDistance = liftPosition.distanceTo(targetPosition)
  controlPoint.y += Math.min(1.35, 0.58 + travelDistance * 0.1)
  controlPoint.z += startPosition.x < -0.1 ? 0.55 : startPosition.x > 0.1 ? -0.55 : 0.72
  const flight = { progress: 0 }

  const updateFlightPosition = () => {
    const t = flight.progress
    const inverse = 1 - t
    flightGroup.position.set(
      inverse * inverse * liftPosition.x + 2 * inverse * t * controlPoint.x + t * t * targetPosition.x,
      inverse * inverse * liftPosition.y + 2 * inverse * t * controlPoint.y + t * t * targetPosition.y,
      inverse * inverse * liftPosition.z + 2 * inverse * t * controlPoint.z + t * t * targetPosition.z,
    )
    fx.flight = t
  }

  const timeline = gsap.timeline()
  timeline
    .set(flightGroup, { visible: true })
    .set(flightGroup.position, { x: startPosition.x, y: startPosition.y, z: startPosition.z })
    .set(flightGroup.scale, { x: 1, y: 1, z: 1 })
    .set(visualGroup.rotation, { x: 0, y: 0, z: 0 })
    .set(fx, { charge: 0, flight: 0, absorption: 0 })
    .to(fx, { charge: 0.72, duration: 0.9, ease: 'sine.inOut' })
    .to(fx, { charge: 1, duration: 0.42, ease: 'power2.in' })
    .to(flightGroup.scale, { x: 1.055, y: 1.055, z: 1.055, duration: 0.42, ease: 'sine.inOut' }, '<')
    .to(flightGroup.position, { y: liftPosition.y, duration: 0.34, ease: 'power2.out' })
    .to({}, { duration: 0.12 })
    .to(flight, { progress: 1, duration: 1.28, ease: 'power3.inOut', onUpdate: updateFlightPosition })
    .to(visualGroup.rotation, { x: Math.PI * 0.45, y: Math.PI * 2.4, duration: 1.28, ease: 'power2.inOut' }, '<')
    .to(flightGroup.scale, { x: 0.88, y: 0.88, z: 0.88, duration: 1.28, ease: 'sine.inOut' }, '<')
    .call(onImpact)
    .to(fx, { absorption: 1, duration: 0.28, ease: 'power3.in' })
    .to(flightGroup.scale, { x: 0.08, y: 0.08, z: 0.08, duration: 0.28, ease: 'power3.in' }, '<')
    .to(fx, { charge: 0, duration: 0.16, ease: 'power2.out' }, '<')
    .call(onComplete)

  return timeline
}
