import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { createServer } from 'vite'
import type { ReactElement } from 'react'

// Use the same Three module instance as R3F. Mixing CJS and ESM instances
// bypasses R3F's `instanceof ShaderMaterial` branch and hides this regression.
const require = createRequire(import.meta.url)
const THREE: typeof import('three') = require('three')
const { applyProps }: typeof import('@react-three/fiber') = require('@react-three/fiber')

test('actual Crystal frame updates mounted shader uniforms and matches a fresh mount', { timeout: 15000 }, async () => {
  // Exercise the component's real frame callback with real Three materials and
  // R3F prop application. Only hook scheduling is substituted; no GPU is mocked
  // into claiming that pixels were rendered or that GLSL was compiled.
  const fixture = `
    import gsap from 'gsap';
    let slots = [], cursor = 0, frame;
    const changed = (a, b) => !a || b.some((value, i) => !Object.is(value, a[i]));
    export function useRef(value) { return slots[cursor++] ??= { current: value }; }
    export function useMemo(create, deps) {
      const index = cursor++;
      if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { deps, value: create() };
      return slots[index].value;
    }
    export const useCallback = (callback, deps) => useMemo(() => callback, deps);
    export function useLayoutEffect(setup, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || changed(previous.deps, deps)) {
        previous?.cleanup?.(); slots[index] = { deps, cleanup: setup() };
      }
    }
    export const useEffect = useLayoutEffect;
    export function useFrame(callback) { frame = callback; }
    export function render(callback) { cursor = 0; return callback(); }
    export function tick(time) { frame({ clock: { elapsedTime: time } }, 1 / 60); }
    export function seek(time) {
      const state = slots.find(slot => slot?.current?.nodes)?.current;
      const timeline = gsap.getTweensOf(state)[0]?.parent;
      timeline?.pause().time(time);
    }
    export function unmount() {
      slots.forEach(slot => slot?.cleanup?.()); slots = []; frame = undefined;
      gsap.ticker.sleep();
    }
  `
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', logLevel: 'error', plugins: [{
    name: 'crystal-material-lifecycle', enforce: 'pre',
    resolveId(id) { if (id === 'virtual:crystal-hooks') return `\0${id}` },
    load(id) { if (id === '\0virtual:crystal-hooks') return fixture },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/components/Crystal.tsx')) return
      return code.replace("from 'react'", "from 'virtual:crystal-hooks'")
        .replace("from '@react-three/fiber'", "from 'virtual:crystal-hooks'")
    },
  }] })
  let hooks: { render: (callback: () => unknown) => unknown; tick: (time: number) => void; seek: (time: number) => void; unmount: () => void } | undefined
  const materials: import('three').Material[] = []
  try {
    const { Crystal } = await vite.ssrLoadModule('/src/components/Crystal.tsx')
    hooks = await vite.ssrLoadModule('virtual:crystal-hooks') as typeof hooks
    const mountMaterials = (tree: unknown) => {
      const shaders: import('three').ShaderMaterial[] = []
      const visit = (node: unknown) => {
        if (Array.isArray(node)) { node.forEach(visit); return }
        if (!node || typeof node !== 'object' || !('props' in node)) return
        const { type, props } = node as ReactElement<Record<string, any>>
        if (type === 'shaderMaterial') {
          const material = new THREE.ShaderMaterial()
          applyProps(material, props)
          materials.push(material)
          if (props.uniforms.uEnergy) {
            assert.notEqual(material.uniforms.uEnergy, props.uniforms.uEnergy, 'fixture must reproduce copied uniform wrappers')
            shaders.push(material)
          }
          if (typeof props.ref === 'function') props.ref(material)
          else if (props.ref) props.ref.current = material
        }
        visit(props.children)
      }
      visit(tree)
      assert.equal(shaders.length, 4, 'volume, conduits, veins and edges')
      return shaders
    }
    const values = (shaders: import('three').ShaderMaterial[]) => shaders.map(material => ({
      energy: material.uniforms.uEnergy.value,
      nodes: material.uniforms.uNodes.value.toArray(),
      burst: material.uniforms.uBurst.value,
      time: material.uniforms.uTime.value,
      color: material.uniforms.uColor.value.toArray(),
    }))
    for (const color of ['#ff3b4f', '#21a8ff', '#9bdf4c']) {
      const mounted = mountMaterials(hooks!.render(() => Crystal({ color, progress: 0 })))
      hooks!.tick(0)
      for (const progress of [1 / 3, 2 / 3, 1, 0]) {
        const start = mounted[0].uniforms.uEnergy.value
        hooks!.render(() => Crystal({ color, progress }))
        hooks!.seek(0.8)
        hooks!.tick(2)
        const target = (Math.round(progress * 3) + 1) / 4
        for (const material of mounted) {
          const energy = material.uniforms.uEnergy.value
          assert.ok(energy > Math.min(start, target) && energy < Math.max(start, target), 'rendered energy must transition, not stay at the mount value')
          assert.equal(material.uniforms.uTime.value, 2, 'animated scalar time must reach the material too')
          assert.ok(material.uniforms.uBurst.value > 0, 'transition pulse reaches every material')
        }
        hooks!.seek(4)
        hooks!.tick(5)
        for (const material of mounted) {
          assert.equal(material.uniforms.uEnergy.value, target)
          assert.equal(material.uniforms.uBurst.value, 0)
        }
      }
      // Compare live charge at mission 2 completion with a fresh mount at the
      // same progress, without relying on page reload to apply scalar values.
      hooks!.render(() => Crystal({ color, progress: 2 / 3 }))
      hooks!.seek(4)
      hooks!.tick(10)
      const live = values(mounted)
      hooks!.unmount()
      const refreshed = mountMaterials(hooks!.render(() => Crystal({ color, progress: 2 / 3 })))
      hooks!.tick(10)
      assert.deepEqual(values(refreshed), live)
      hooks!.unmount()
    }
  } finally {
    hooks?.unmount()
    for (const material of materials) material.dispose()
    await vite.close()
  }
})
