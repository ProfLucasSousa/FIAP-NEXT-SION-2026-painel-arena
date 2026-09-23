import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { createArenaStore, toArenaSnapshot } from '../src/store/arenaStore'
import { createInitialArena } from '../src/lib/arenaOperations'

test('actual sync hook rebinds a replaced store, rejects stale zeros and never echoes state through Admin', { timeout: 15000 }, async () => {
  // Exercise the actual hook's effects/dependencies without a browser. Only
  // transport and React's effect scheduler are substituted; stores are real.
  const modules: Record<string, string> = {
    'virtual:sync-effects': `
      let slots = [], cursor = 0;
      export function useEffect(setup, deps) {
        const index = cursor++, previous = slots[index];
        if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
          previous?.cleanup?.(); slots[index] = { deps, cleanup: setup() };
        }
      }
      export function render(callback) { cursor = 0; callback(); }
      export function unmount() { slots.forEach(slot => slot.cleanup?.()); slots = []; }
    `,
    'virtual:sync-store': `
      export { toArenaSnapshot } from '/src/store/arenaStore.ts';
      export let useArenaStore;
      export function replaceStore(store) { useArenaStore = store; }
    `,
    'virtual:sync-transport': `
      export const sent = [], messages = [], listeners = new Set();
      export const arenaSocket = {
        connected: false, handlers: new Map(),
        on(name, fn) { if (!this.handlers.has(name)) this.handlers.set(name, new Set()); this.handlers.get(name).add(fn); },
        off(name, fn) { this.handlers.get(name)?.delete(fn); },
        emit() {},
        receive(name, value) { this.handlers.get(name)?.forEach(fn => fn(value)); },
        connect() { this.connected = true; this.receive('connect'); },
        disconnect() { this.connected = false; }
      };
      export const sendArenaState = state => sent.push(structuredClone(state));
      export const publishLocalArenaMessage = message => messages.push(message);
      export const subscribeLocalArenaMessages = listener => { listeners.add(listener); return () => listeners.delete(listener); };
      export const receiveLocal = message => listeners.forEach(listener => listener(message));
    `,
  }
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', logLevel: 'error', plugins: [{
    name: 'sync-lifecycle-fixtures', enforce: 'pre',
    resolveId(id) { if (id in modules) return `\0${id}` },
    load(id) { return modules[id.slice(1)] },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/hooks/useArenaSync.ts')) return
      return code.replace("from 'react'", "from 'virtual:sync-effects'")
        .replace("from '../store/arenaStore'", "from 'virtual:sync-store'")
        .replace("from '../lib/socket'", "from 'virtual:sync-transport'")
        .replace("from '../lib/localSync'", "from 'virtual:sync-transport'")
    },
  }] })
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
  let effects: { unmount: () => void; render: (callback: () => void) => void } | undefined
  try {
    const { useArenaSync } = await vite.ssrLoadModule('/src/hooks/useArenaSync.ts')
    effects = await vite.ssrLoadModule('virtual:sync-effects') as typeof effects
    const { replaceStore } = await vite.ssrLoadModule('virtual:sync-store')
    const transport = await vite.ssrLoadModule('virtual:sync-transport')
    const original = createArenaStore(storage)
    replaceStore(original)
    effects!.render(() => useArenaSync('admin'))
    original.getState().adjustScore('red', 500)
    assert.equal(transport.sent.at(-1).teams.red.score, 500)

    // Same route, new Zustand instance after a development update.
    const replacement = createArenaStore(storage)
    replaceStore(replacement)
    effects!.render(() => useArenaSync('admin'))
    replacement.getState().adjustScore('red', 100)
    assert.equal(transport.sent.at(-1).teams.red.score, 600)
    const sentCount = transport.sent.length
    original.getState().adjustScore('green', 500)
    assert.equal(transport.sent.length, sentCount, 'old subscription was removed')
    transport.arenaSocket.receive('arena:state', createInitialArena())
    assert.equal(replacement.getState().teams.red.score, 600)
    assert.equal(transport.sent.length, sentCount, 'Admin never echoes received snapshots')

    effects!.unmount()
    const display = createArenaStore({ ...storage, getItem: () => null })
    display.getState().hydrateSnapshot(toArenaSnapshot(replacement.getState()))
    replaceStore(display)
    let activations = 0
    const activationHandler = () => activations++
    effects!.render(() => useArenaSync('display', activationHandler))
    assert.equal(transport.messages.at(-1).type, 'arena:request-state')
    transport.arenaSocket.receive('arena:state', createInitialArena())
    assert.equal(display.getState().teams.red.score, 600, 'cached zero state cannot undo the loaded score')
    transport.arenaSocket.receive('arena:state', {})
    assert.equal(display.getState().teams.red.score, 600, 'partial packet cannot reset the arena')
    const event = { activationId: 'dedup-test', teamId: 'red', emittedAt: Date.now() }
    transport.arenaSocket.receive('crystal:activate', event)
    transport.receiveLocal({ type: 'crystal:activate', payload: event })
    assert.equal(activations, 1)

    replacement.getState().reset()
    transport.arenaSocket.receive('arena:state', toArenaSnapshot(replacement.getState()))
    assert.equal(display.getState().teams.red.score, 0, 'a genuine newer reset still works')
    assert.equal(display.getState().phaseStatus, 'ready')
    effects!.unmount()
    assert.equal(transport.listeners.size, 0)
    assert.equal(transport.arenaSocket.handlers.get('connect').size, 0)
  } finally {
    effects?.unmount()
    await vite.close()
  }
})
