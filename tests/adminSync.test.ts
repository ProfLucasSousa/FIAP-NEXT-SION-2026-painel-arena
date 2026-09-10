import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Server as HttpServer } from 'node:http'
import { once } from 'node:events'
import { io, type Socket } from 'socket.io-client'
import { createArenaStore, toArenaSnapshot } from '../src/store/arenaStore'
import { getTeamCrystalProgress } from '../src/lib/crystalProgress'
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
      assert.deepEqual(wireValue(toArenaSnapshot(displayStore.getState())), wireValue(toArenaSnapshot(adminStore.getState())))
    }
    await perform(() => adminStore.getState().startArena())
    assert.equal(getTeamCrystalProgress(displayStore.getState().teams.red), 0)
    await perform(() => adminStore.getState().completeMission('red'))
    assert.equal(displayStore.getState().teams.red.missionIndex, 0)
    assert.equal(displayStore.getState().teams.red.missionTimer.isRunning, false)
    assert.equal(getTeamCrystalProgress(displayStore.getState().teams.red), 1 / 3, 'live completion changes the crystal target')
    assert.equal(getTeamCrystalProgress(displayStore.getState().teams.blue), 0)
    assert.equal(getTeamCrystalProgress(displayStore.getState().teams.green), 0)
    await perform(() => adminStore.getState().setMission('red', 1))
    assert.equal(getTeamCrystalProgress(displayStore.getState().teams.red), 1 / 3, 'selecting the next mission keeps the earned charge')
    assert.equal(displayStore.getState().teams.red.missionTimer.isRunning, false)
    await perform(() => adminStore.getState().setTeamTimer('red', { isRunning: true }))
    await perform(() => adminStore.getState().setTeamTimer('blue', { isRunning: false }))
    await perform(() => adminStore.getState().pauseArena())
    await perform(() => adminStore.getState().resumeArena())
    assert.equal(displayStore.getState().teams.blue.missionTimer.isRunning, false)
    await perform(() => adminStore.getState().adjustScore('green', 500))
    assert.equal(displayStore.getState().teams.green.score, 500)
    await perform(() => adminStore.getState().setMission('red', 3))
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
