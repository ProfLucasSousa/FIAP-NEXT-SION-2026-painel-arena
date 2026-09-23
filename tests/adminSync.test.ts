import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Server as HttpServer } from 'node:http'
import { once } from 'node:events'
import { io, type Socket } from 'socket.io-client'
import { createArenaStore, toArenaSnapshot } from '../src/store/arenaStore'
import { getCrystalProgress } from '../src/lib/crystalProgress'
import type { ArenaSnapshot, CrystalActivationEvent } from '../src/types/arena'

test('actual Socket.IO relay synchronizes operations and reconnected display without touching the live arena', { timeout: 15000 }, async () => {
  // Run the existing relay unchanged, but bind only this test to an ephemeral
  // loopback port. Never send fixture scores or activations to port 3001.
  const originalListen = HttpServer.prototype.listen
  let server: HttpServer | undefined
  HttpServer.prototype.listen = function (...args: unknown[]) {
    server = this
    const callback = args.find(arg => typeof arg === 'function') as (() => void) | undefined
    return originalListen.call(this, 0, '127.0.0.1', callback)
  } as typeof originalListen
  try { await import('../server/index') } finally { HttpServer.prototype.listen = originalListen }
  assert.ok(server)
  if (!server.listening) await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const clients: Socket[] = []
  const memory = () => {
    const data = new Map<string, string>()
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
  }
  const adminStore = createArenaStore(memory())
  const displayStore = createArenaStore(memory())
  const connect = async (role: 'admin' | 'display') => {
    const client = io(url, { autoConnect: false, forceNew: true, transports: ['websocket'], reconnection: false })
    clients.push(client)
    const connected = once(client, 'connect')
    client.connect()
    await connected
    client.emit('arena:register', role)
    return client
  }
  let unsubscribe = () => {}
  const wireValue = (value: unknown) => JSON.parse(JSON.stringify(value))
  try {
    const admin = await connect('admin')
    const display = await connect('display')
    display.on('arena:state', (snapshot: ArenaSnapshot) => displayStore.getState().hydrateSnapshot(snapshot))
    unsubscribe = adminStore.subscribe(state => admin.emit('arena:state', toArenaSnapshot(state)))
    const perform = async (operation: () => void) => {
      const received = once(display, 'arena:state')
      operation()
      await received
      const displaySnapshot = wireValue(toArenaSnapshot(displayStore.getState()))
      const adminSnapshot = wireValue(toArenaSnapshot(adminStore.getState()))
      assert.equal(displaySnapshot.revision, adminSnapshot.revision)
      assert.equal(displaySnapshot.phaseIndex, adminSnapshot.phaseIndex)
      assert.equal(displaySnapshot.phaseStatus, adminSnapshot.phaseStatus)
      assert.equal(displaySnapshot.firstCompletionTriggered, adminSnapshot.firstCompletionTriggered)
      assert.deepEqual(displaySnapshot.teams, adminSnapshot.teams)
      assert.ok(Math.abs(displaySnapshot.phaseTimer.remainingMs - adminSnapshot.phaseTimer.remainingMs) < 100)
      assert.equal(displaySnapshot.phaseTimer.isRunning, adminSnapshot.phaseTimer.isRunning)
    }
    await perform(() => adminStore.getState().startPhase())
    assert.equal(getCrystalProgress(displayStore.getState().phaseIndex), 0)
    await perform(() => adminStore.getState().completeMission('red'))
    assert.equal(displayStore.getState().teams.red.phaseCompleted, true)
    assert.ok(displayStore.getState().phaseTimer.remainingMs <= 120_000)
    assert.ok(displayStore.getState().phaseTimer.remainingMs > 119_900)
    assert.equal(getCrystalProgress(displayStore.getState().phaseIndex), 0, 'completion does not change the shared visual phase')
    await perform(() => adminStore.getState().pausePhase())
    assert.equal(displayStore.getState().phaseStatus, 'paused')
    await perform(() => adminStore.getState().resumePhase())
    assert.equal(displayStore.getState().phaseStatus, 'running')
    await perform(() => adminStore.getState().adjustScore('green', 500))
    assert.equal(displayStore.getState().teams.green.score, 500)

    await perform(() => adminStore.getState().completeMission('blue'))
    await perform(() => adminStore.getState().completeMission('green'))
    for (let phase = 1; phase < 4; phase++) {
      await perform(() => adminStore.getState().prepareNextPhase())
      assert.equal(getCrystalProgress(displayStore.getState().phaseIndex), phase / 3)
      await perform(() => adminStore.getState().startPhase())
      if (phase < 3) {
        await perform(() => adminStore.getState().completeMission('red'))
        await perform(() => adminStore.getState().completeMission('blue'))
        await perform(() => adminStore.getState().completeMission('green'))
      }
    }
    await perform(() => adminStore.getState().activateCrystal('red'))
    const activation: CrystalActivationEvent = { activationId: 'isolated-test-activation', teamId: 'red', emittedAt: Date.now() }
    const animated = once(display, 'crystal:activate')
    admin.emit('crystal:activate', activation)
    assert.deepEqual((await animated)[0], activation)
    display.disconnect()
    const reconnected = await connect('display')
    const snapshot = once(reconnected, 'arena:state')
    reconnected.emit('arena:request-state')
    assert.deepEqual((await snapshot)[0], wireValue(toArenaSnapshot(adminStore.getState())))
  } finally {
    unsubscribe()
    for (const client of clients) client.disconnect()
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()))
  }
})
