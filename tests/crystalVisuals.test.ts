import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import gsap from 'gsap'
import * as THREE from 'three'
import { CRYSTAL_ENERGY_LEVELS, CRYSTAL_ROTATION_SPEEDS, CRYSTAL_SOURCE_LEVELS, CRYSTAL_SOURCE_HEIGHTS, createCrystalEnergyState, getCrystalStage, transitionCrystalEnergy, updateCrystalNodes } from '../src/animations/crystalEnergy'
import { createCrystalActivationTimeline } from '../src/animations/crystalActivation'
import { createCrystalGeometry, createCrystalLinks } from '../src/components/crystalGeometry'
import { applyCrystalShellEnergy, crystalFillGLSL, energyFragmentShader } from '../src/components/crystalShaders'

after(() => gsap.ticker.sleep())

test('normalized stages activate exactly 1, 2, 3 and 4 sources', () => {
  for (const [index, progress] of [0, 0.33, 0.66, 1].entries()) {
    assert.equal(getCrystalStage(progress), index)
    const state = createCrystalEnergyState(index)
    assert.equal(state.energy, [0.25, 0.5, 0.75, 1][index])
    assert.deepEqual(state.nodes.toArray(), Array.from({ length: 4 }, (_, node) => Number(node <= index)))
    assert.ok(Math.abs(state.rotationSpeed / CRYSTAL_ROTATION_SPEEDS[0] - [1, 1.35, 1.75, 2.25][index]) < 1e-10)
  }
  assert.equal(getCrystalStage(1, false), 3, 'Ativar must not require the final activation flag')
  assert.equal(getCrystalStage(0, true), 3)
  assert.equal(getCrystalStage(-5), 0)
  assert.equal(getCrystalStage(5), 3)
  assert.equal(getCrystalStage(NaN), 0)
})

test('energy rises in order, sources fade in, rotation follows, burst settles', () => {
  const state = createCrystalEnergyState(0)
  const timeline = transitionCrystalEnergy(state, 3).pause()
  const firstLit = [-1, -1, -1, -1]
  const partial = [false, false, false, false]
  for (let frame = 0; frame <= 330; frame++) {
    const time = frame / 100
    timeline.time(time)
    updateCrystalNodes(state)
    const nodes = state.nodes.toArray()
    nodes.forEach((value, node) => {
      if (value > 0 && firstLit[node] < 0) firstLit[node] = time
      if (value > 0 && value < 1) partial[node] = true
      if (node > 0) assert.ok(value <= nodes[node - 1])
    })
    if (time <= 1.45) assert.equal(state.rotationSpeed, CRYSTAL_ROTATION_SPEEDS[0])
  }
  assert.ok(firstLit[1] < firstLit[2] && firstLit[2] < firstLit[3])
  assert.deepEqual(partial.slice(1), [true, true, true])
  assert.deepEqual(state.nodes.toArray(), [1, 1, 1, 1])
  assert.equal(state.rotationSpeed, CRYSTAL_ROTATION_SPEEDS[3])
  assert.equal(state.burst, 0)
  timeline.kill()
})

test('markers react to the actual fill height, never ahead of the energy front', () => {
  for (const [index, level] of CRYSTAL_SOURCE_LEVELS.entries()) {
    const state = createCrystalEnergyState(0)
    state.energy = level
    updateCrystalNodes(state)
    assert.equal(state.nodes.getComponent(index), 0)
    state.energy = level + 0.0125
    updateCrystalNodes(state)
    assert.ok(Math.abs(state.nodes.getComponent(index) - 0.5) < 1e-10)
    state.energy = CRYSTAL_ENERGY_LEVELS[index]
    updateCrystalNodes(state)
    assert.equal(state.nodes.getComponent(index), 1)
  }
})

test('body emission is independent of markers and shell shares its fill uniforms', () => {
  const volumeMain = energyFragmentShader.slice(energyFragmentShader.indexOf('void main()')).replace(/\/\/[^\n]*/g, '')
  assert.ok(!volumeMain.includes('nodeField('))
  assert.ok(!volumeMain.includes('uNodes'))
  assert.ok(volumeMain.includes('crystalFill(p)'))
  const shader: Pick<THREE.WebGLProgramParametersWithUniforms, 'uniforms' | 'vertexShader' | 'fragmentShader'> = {
    uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  }
  const uniforms = { uEnergy: { value: 0.25 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#ff3b4f') } }
  applyCrystalShellEnergy(shader, uniforms)
  assert.equal(shader.uniforms['uEnergy'], uniforms.uEnergy)
  assert.equal(shader.uniforms['uTime'], uniforms.uTime)
  assert.ok(shader.fragmentShader.includes(crystalFillGLSL))
  assert.ok(shader.vertexShader.includes('vCrystalPosition = position'))
  assert.ok(shader.fragmentShader.includes('roughnessFactor = mix'))
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance += uColor * crystalFill'))
})

test('all stage pairs settle correctly and interrupted transitions resume without a jump', () => {
  for (let from = 0; from < 4; from++) for (let to = 0; to < 4; to++) {
    const state = createCrystalEnergyState(from)
    const timeline = transitionCrystalEnergy(state, to).pause()
    timeline.totalProgress(1)
    updateCrystalNodes(state)
    assert.deepEqual(state.nodes.toArray(), createCrystalEnergyState(to).nodes.toArray())
    assert.equal(state.rotationSpeed, CRYSTAL_ROTATION_SPEEDS[to])
    timeline.kill()
  }
  const state = createCrystalEnergyState(0)
  const up = transitionCrystalEnergy(state, 3).pause().time(0.8)
  const energyAtInterrupt = state.energy
  up.kill()
  const down = transitionCrystalEnergy(state, 0).pause()
  assert.equal(state.energy, energyAtInterrupt)
  down.totalProgress(1)
  updateCrystalNodes(state)
  assert.deepEqual(state.nodes.toArray(), [1, 0, 0, 0])
  down.kill()
})

test('80 nondegenerate outward facets, restrained real edges and contained sources/links', () => {
  const geometry = createCrystalGeometry()
  const positions = geometry.getAttribute('position')
  const indices = geometry.getIndex()!
  assert.equal(indices.count / 3, 80)
  for (let triangle = 0; triangle < indices.count; triangle += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(triangle))
    const b = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(triangle + 1))
    const c = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(triangle + 2))
    const normal = b.clone().sub(a).cross(c.clone().sub(a))
    assert.ok(normal.lengthSq() > 0.0001)
    assert.ok(normal.dot(a.clone().add(b).add(c).divideScalar(3)) > 0, 'outward normal')
  }
  const edges = new THREE.EdgesGeometry(geometry, 12)
  assert.ok(edges.getAttribute('position').count / 2 >= 40)
  assert.ok(edges.getAttribute('position').count / 2 <= 120)
  const shell = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  shell.updateMatrixWorld()
  const links = createCrystalLinks()
  const linkPositions = links.getAttribute('position')
  const interiorPoints = CRYSTAL_SOURCE_HEIGHTS.flatMap((height, index) => Array.from({ length: 16 }, (_, side) => {
    const haloRadius = 0.29 * (index === 3 ? 0.35 : 1)
    return new THREE.Vector3(Math.cos(side / 8 * Math.PI) * haloRadius, height, Math.sin(side / 8 * Math.PI) * haloRadius)
  }))
  for (let vertex = 0; vertex < linkPositions.count; vertex++) interiorPoints.push(new THREE.Vector3().fromBufferAttribute(linkPositions, vertex))
  for (const point of interiorPoints) {
    const ray = new THREE.Raycaster(new THREE.Vector3(point.x, point.y, 3), new THREE.Vector3(0, 0, -1))
    const hit = ray.intersectObject(shell)[0]
    assert.ok(hit && hit.point.z > point.z, 'source halos and conduits stay inside the shell')
  }
  geometry.dispose()
  edges.dispose()
  links.dispose()
  shell.material.dispose()
})

test('existing activation still reaches core and invokes impact/completion once', () => {
  const flightGroup = new THREE.Group()
  const visualGroup = new THREE.Group()
  const crystalLocalGroup = new THREE.Group()
  flightGroup.add(visualGroup)
  visualGroup.add(crystalLocalGroup)
  const fx = { charge: 0, flight: 0, absorption: 0 }
  const target = new THREE.Vector3(0, -0.6, 0)
  let impacts = 0
  let completions = 0
  const timeline = createCrystalActivationTimeline({ flightGroup, visualGroup, fx,
    startPosition: new THREE.Vector3(-2.4, 1.5, 0), targetPosition: target,
    onImpact: () => impacts++, onComplete: () => completions++,
  }).pause()
  const state = createCrystalEnergyState(2)
  const energyTimeline = transitionCrystalEnergy(state, 3).pause()
  for (let frame = 0; frame <= 500; frame++) {
    energyTimeline.time(frame / 100)
    crystalLocalGroup.rotation.y += state.rotationSpeed / 100
    timeline.time(frame / 100, false)
  }
  assert.ok(flightGroup.position.distanceTo(target) < 0.00001)
  assert.equal(impacts, 1)
  assert.equal(completions, 1)
  assert.equal(fx.absorption, 1)
  assert.equal(flightGroup.scale.x, 0.08)
  timeline.kill()
  energyTimeline.kill()
})
