import * as THREE from 'three'
import { CRYSTAL_SOURCE_HEIGHTS } from '../animations/crystalEnergy'

export function createCrystalGeometry() {
  const geometry = new THREE.BufferGeometry()
  const sides = 8
  const positions: number[] = [0.04, 1.72, -0.02]
  const indices: number[] = []
  const rings = [
    { y: 1.02, radius: 0.32, offset: 0.08 },
    { y: 0.57, radius: 0.53, offset: Math.PI / sides },
    { y: 0.02, radius: 0.67, offset: 0.03 },
    { y: -0.57, radius: 0.58, offset: Math.PI / sides + 0.04 },
    { y: -1.03, radius: 0.36, offset: -0.03 },
  ]
  rings.forEach((ring) => {
    for (let side = 0; side < sides; side += 1) {
      const angle = side / sides * Math.PI * 2 + ring.offset
      const radius = ring.radius * (1 + Math.sin(side * 12.9898 + ring.y * 7.31) * 0.09)
      positions.push(Math.cos(angle) * radius, ring.y + Math.sin(side * 4.71 + ring.y * 3.9) * 0.06, Math.sin(angle) * radius)
    }
  })
  const bottom = positions.length / 3
  positions.push(-0.03, -1.56, 0.02)
  const ringIndex = (ring: number, side: number) => 1 + ring * sides + side % sides
  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides
    // Outward winding is essential for the facets to catch external lighting.
    indices.push(0, ringIndex(0, next), ringIndex(0, side))
    for (let ring = 0; ring < rings.length - 1; ring += 1) {
      const a = ringIndex(ring, side)
      const b = ringIndex(ring, next)
      const c = ringIndex(ring + 1, side)
      const d = ringIndex(ring + 1, next)
      indices.push(a, b, c, b, d, c)
    }
    indices.push(ringIndex(4, next), bottom, ringIndex(4, side))
  }
  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createCrystalLinks() {
  const positions: number[] = []
  // Three bent conduits, with short branches, contained inside the shell.
  for (let link = 0; link < 3; link += 1) {
    const bottom = CRYSTAL_SOURCE_HEIGHTS[link]
    const top = CRYSTAL_SOURCE_HEIGHTS[link + 1]
    const points: THREE.Vector3[] = []
    for (let step = 0; step <= 8; step += 1) {
      const t = step / 8
      const height = THREE.MathUtils.lerp(bottom, top, t)
      const envelope = Math.sin(t * Math.PI) * (1 - THREE.MathUtils.smoothstep(height, 0.8, 1.4) * 0.6)
      points.push(new THREE.Vector3(Math.sin(step * 2.1 + link) * envelope * 0.12, height, Math.cos(step * 1.7 + link) * envelope * 0.1))
    }
    for (let step = 1; step < points.length; step += 1) {
      positions.push(...points[step - 1].toArray(), ...points[step].toArray())
      if (step === 3 || step === 6) {
        const p = points[step]
        const taper = 1 - THREE.MathUtils.smoothstep(p.y + 0.09, 0.8, 1.4) * 0.7
        positions.push(p.x, p.y, p.z, p.x + (step === 3 ? -0.16 : 0.16) * taper, p.y + 0.09, p.z + 0.08 * taper)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}
