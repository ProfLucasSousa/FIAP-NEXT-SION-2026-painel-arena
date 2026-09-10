import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createArenaStore, HISTORY_LIMIT, toArenaSnapshot } from '../src/store/arenaStore'
import { getTeamStatus } from '../src/lib/arenaOperations'
import { TEAM_IDS } from '../src/types/arena'

function setup() {
  let now = 100_000
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
  const create = () => createArenaStore(storage, () => now)
  const store = create()
  return { store, data, create, advance: (ms: number) => { now += ms } }
}

test('start is atomic, idempotent and starts all teams in M1 without changing scores', () => {
  const { store, advance } = setup()
  store.getState().setScore('red', 500)
  store.getState().setMission('red', 2)
  let notifications = 0
  const unsubscribe = store.subscribe(() => notifications++)
  store.getState().startArena()
  assert.equal(notifications, 1)
  assert.equal(store.getState().arenaTimer.isRunning, true)
  assert.equal(store.getState().teams.red.score, 500)
  for (const id of TEAM_IDS) {
    assert.equal(store.getState().teams[id].missionIndex, 0)
    assert.equal(store.getState().teams[id].missionTimer.isRunning, true)
  }
  advance(3456)
  store.getState().tick()
  assert.equal(store.getState().arenaTimer.elapsedMs, 3456)
  store.getState().startArena()
  assert.equal(store.getState().arenaTimer.elapsedMs, 3456)
  unsubscribe()
})

test('complete keeps M1 elapsed time; selecting M2 is paused and requires manual start', () => {
  const { store, advance } = setup()
  store.getState().startArena()
  advance(222000)
  store.getState().completeMission('red')
  const red = store.getState().teams.red
  assert.equal(red.missionIndex, 0)
  assert.equal(red.missionTimer.elapsedMs, 222000)
  assert.equal(red.missionTimer.isRunning, false)
  assert.equal(getTeamStatus(red), 'MISSÃO CONCLUÍDA')
  assert.equal(store.getState().teams.blue.missionTimer.isRunning, true)
  assert.equal(store.getState().teams.green.missionTimer.isRunning, true)
  store.getState().setTeamTimer('red', { isRunning: true })
  assert.equal(store.getState().teams.red.missionTimer.isRunning, false)
  store.getState().setMission('red', 1)
  assert.equal(store.getState().teams.red.missionTimer.isRunning, false)
  assert.equal(store.getState().teams.red.missionTimer.elapsedMs, 0)
  store.getState().setTeamTimer('red', { isRunning: true })
  advance(1000)
  store.getState().tick()
  assert.equal(store.getState().teams.red.missionTimer.elapsedMs, 1000)
})

test('global pause remembers only running teams and persists across refresh', () => {
  const { store, advance, create } = setup()
  store.getState().startArena()
  advance(2000)
  store.getState().setTeamTimer('blue', { isRunning: false })
  assert.equal(store.getState().teams.red.missionTimer.isRunning, true)
  assert.equal(store.getState().teams.green.missionTimer.isRunning, true)
  advance(1000)
  store.getState().pauseArena()
  assert.deepEqual(store.getState().resumeTeamIds, ['red', 'green'])
  assert.equal(store.getState().arenaTimer.isRunning, false)
  for (const id of TEAM_IDS) assert.equal(store.getState().teams[id].missionTimer.isRunning, false)
  store.getState().setTeamTimer('blue', { isRunning: true })
  assert.equal(store.getState().teams.blue.missionTimer.isRunning, false)
  advance(9000)
  const refreshed = create()
  refreshed.getState().resumeArena()
  assert.equal(refreshed.getState().arenaTimer.elapsedMs, 3000)
  assert.equal(refreshed.getState().teams.red.missionTimer.isRunning, true)
  assert.equal(refreshed.getState().teams.blue.missionTimer.isRunning, false)
  assert.equal(refreshed.getState().teams.green.missionTimer.isRunning, true)
})

test('mission changed or completed during global pause is not restarted', () => {
  const { store } = setup()
  store.getState().startArena()
  store.getState().pauseArena()
  store.getState().setMission('red', 1)
  store.getState().completeMission('green')
  store.getState().resumeArena()
  assert.equal(store.getState().teams.red.missionTimer.isRunning, false)
  assert.equal(store.getState().teams.green.missionTimer.isRunning, false)
  assert.equal(store.getState().teams.blue.missionTimer.isRunning, true)
})

test('activation requires M4, stops time, is idempotent and cannot be undone', () => {
  const { store, advance, create } = setup()
  store.getState().startArena()
  assert.equal(store.getState().activateCrystal('red'), false)
  for (let mission = 0; mission < 3; mission++) {
    store.getState().completeMission('red')
    store.getState().setMission('red', mission + 1)
    assert.equal(store.getState().teams.red.missionTimer.isRunning, false)
    store.getState().setTeamTimer('red', { isRunning: true })
    advance(1000)
  }
  assert.equal(getTeamStatus(store.getState().teams.red), 'ATIVAÇÃO')
  assert.equal(store.getState().activateCrystal('red'), true)
  assert.equal(store.getState().activateCrystal('red'), false)
  store.getState().undoLastAction()
  assert.equal(store.getState().teams.red.missionTimer.isRunning, false)
  assert.equal(store.getState().teams.red.missionTimer.elapsedMs, 1000)
  assert.equal(getTeamStatus(store.getState().teams.red), 'CONCLUÍDA')
  assert.equal(create().getState().teams.red.crystalActivated, true)
})

test('safe single-step undo affects only its field, not other clocks or activations', () => {
  const { store, advance } = setup()
  store.getState().startArena()
  store.getState().adjustScore('blue', 500)
  advance(1500)
  store.getState().tick()
  store.getState().undoLastAction()
  assert.equal(store.getState().teams.blue.score, 0)
  assert.equal(store.getState().arenaTimer.elapsedMs, 1500)
  store.getState().setMission('red', 1)
  store.getState().undoLastAction()
  assert.equal(store.getState().teams.red.missionIndex, 0)
  assert.equal(store.getState().teams.red.missionTimer.isRunning, false)
  assert.equal(store.getState().teams.blue.missionTimer.isRunning, true)
  store.getState().adjustScore('red', -500)
  assert.equal(store.getState().teams.red.score, 0)
  store.getState().setScore('red', NaN)
  assert.equal(store.getState().teams.red.score, 0)
})

test('running refresh catches up real elapsed time; history bounded and reset recorded', () => {
  const { store, advance, create } = setup()
  store.getState().startArena()
  advance(12500)
  const refreshed = create()
  refreshed.getState().tick()
  assert.equal(refreshed.getState().arenaTimer.elapsedMs, 12500)
  assert.equal(refreshed.getState().teams.red.missionTimer.elapsedMs, 12500)
  for (let i = 0; i < 100; i++) refreshed.getState().adjustScore('red', 100)
  assert.equal(refreshed.getState().history.length, HISTORY_LIMIT)
  refreshed.getState().reset()
  assert.equal(refreshed.getState().arenaStatus, 'waiting')
  assert.equal(refreshed.getState().arenaTimer.elapsedMs, 0)
  for (const id of TEAM_IDS) {
    assert.equal(refreshed.getState().teams[id].score, 0)
    assert.equal(refreshed.getState().teams[id].missionCompleted, false)
  }
  assert.match(create().getState().history[0].description, /resetada/)
  assert.equal(refreshed.getState().undo, null)
})

test('old storage migrates without losing score, mission or timer and snapshots contain no actions', () => {
  const { store, data, create } = setup()
  const previous = { teams: store.getState().teams, arenaTimer: { elapsedMs: 4500, isRunning: true } }
  previous.teams.red = { ...previous.teams.red, score: 3450, missionIndex: 2 }
  data.set('symbios-arena-state', JSON.stringify({ state: previous, version: 0 }))
  const migrated = create()
  assert.equal(migrated.getState().arenaStatus, 'running')
  assert.equal(migrated.getState().teams.red.score, 3450)
  assert.equal(migrated.getState().teams.red.missionIndex, 2)
  assert.equal(migrated.getState().arenaTimer.elapsedMs, 4500)
  const snapshot = toArenaSnapshot(migrated.getState())
  assert.doesNotThrow(() => structuredClone(snapshot))
  assert.equal('history' in snapshot, false)
  assert.equal('tick' in snapshot, false)
})

test('manual arena timer reset coordinates pause atomically without resetting team scores', () => {
  const { store, advance } = setup()
  store.getState().setArenaTimer({ isRunning: true })
  advance(2000)
  store.getState().adjustScore('red', 500)
  store.getState().setTeamTimer('blue', { isRunning: false })
  let changes = 0
  const unsubscribe = store.subscribe(() => changes++)
  store.getState().setArenaTimer({ elapsedMs: 0, isRunning: false })
  assert.equal(changes, 1)
  assert.equal(store.getState().arenaTimer.elapsedMs, 0)
  assert.equal(store.getState().teams.red.score, 500)
  assert.equal(store.getState().teams.red.missionTimer.elapsedMs, 2000)
  assert.deepEqual(store.getState().resumeTeamIds, ['red', 'green'])
  store.getState().setArenaTimer({ isRunning: true })
  assert.equal(store.getState().teams.blue.missionTimer.isRunning, false)
  unsubscribe()
})

test('Display hydration cannot overwrite the controller history in shared localStorage', () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value),
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/admin' } } })
  try {
    const admin = createArenaStore()
    admin.getState().adjustScore('blue', 500)
    const controllerSave = data.get('symbios-arena-state')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/display' } } })
    const display = createArenaStore()
    display.getState().hydrateSnapshot(toArenaSnapshot(admin.getState()))
    assert.equal(data.get('symbios-arena-state'), controllerSave)
  } finally {
    for (const [key, descriptor] of [['window', windowDescriptor], ['localStorage', storageDescriptor]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
