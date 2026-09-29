import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTeamStatus } from '../src/lib/arenaOperations'
import { createArenaStore, HISTORY_LIMIT, toArenaSnapshot } from '../src/store/arenaStore'
import { PHASE_DURATION_SECONDS, TEAM_IDS } from '../src/types/arena'

function setup() {
  let now = 100_000
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
  }
  const create = () => createArenaStore(storage, () => now)
  return { store: create(), data, create, advance: (ms: number) => { now += ms } }
}

function finishPhase(store: ReturnType<typeof createArenaStore>) {
  assert.equal(store.getState().startPhase(), true)
  const complete = store.getState().phaseIndex === 3
    ? (id: (typeof TEAM_IDS)[number]) => store.getState().activateCrystal(id)
    : (id: (typeof TEAM_IDS)[number]) => store.getState().completeMission(id)
  assert.equal(complete('red'), true)
  assert.equal(complete('blue'), true)
  assert.equal(complete('green'), true)
  assert.equal(store.getState().phaseStatus, 'finished')
}

test('each phase starts manually with its configured shared duration', () => {
  const { store } = setup()
  for (const [phaseIndex, duration] of PHASE_DURATION_SECONDS.entries()) {
    assert.equal(store.getState().phaseIndex, phaseIndex)
    assert.equal(store.getState().phaseStatus, 'ready')
    assert.equal(store.getState().phaseTimer.remainingMs, duration * 1000)
    finishPhase(store)
    if (phaseIndex < PHASE_DURATION_SECONDS.length - 1) assert.equal(store.getState().prepareNextPhase(), true)
  }
})

test('the first completion changes any remaining value to exactly 02:00', () => {
  for (const [elapsed, expectedBefore] of [[139_000, 341_000], [461_000, 19_000]] as const) {
    const { store, advance } = setup()
    store.getState().startPhase()
    advance(elapsed)
    store.getState().tick()
    assert.equal(store.getState().phaseTimer.remainingMs, expectedBefore)
    assert.equal(store.getState().completeMission('red'), true)
    assert.equal(store.getState().phaseTimer.remainingMs, 120_000)
    assert.equal(store.getState().phaseTimer.isRunning, true)
    assert.equal(store.getState().firstCompletionTriggered, true)
  }
})

test('second completion preserves the clock and third completion ends the phase', () => {
  const { store, advance } = setup()
  store.getState().startPhase()
  store.getState().completeMission('red')
  advance(37_000)
  assert.equal(store.getState().completeMission('blue'), true)
  assert.equal(store.getState().phaseTimer.remainingMs, 83_000)
  advance(66_000)
  assert.equal(store.getState().completeMission('green'), true)
  assert.equal(store.getState().phaseTimer.remainingMs, 17_000)
  assert.equal(store.getState().phaseTimer.isRunning, false)
  assert.equal(store.getState().phaseStatus, 'finished')
})

test('undoing the first completion restores 05:30 and removes the final window', () => {
  const { store, advance } = setup()
  store.getState().startPhase()
  advance(150_000)
  store.getState().tick()
  assert.equal(store.getState().phaseTimer.remainingMs, 330_000)

  assert.equal(store.getState().completeMission('red'), true)
  assert.equal(store.getState().phaseTimer.remainingMs, 120_000)
  assert.equal(store.getState().undoLastCompletion(), true)
  assert.equal(store.getState().phaseTimer.remainingMs, 330_000)
  assert.equal(store.getState().phaseTimer.isRunning, true)
  assert.equal(store.getState().phaseStatus, 'running')
  assert.equal(store.getState().firstCompletionTriggered, false)
  assert.equal(store.getState().teams.red.phaseCompleted, false)
})

test('undoing the first completion restores 00:24 even though completion raised it to 02:00', () => {
  const { store, advance } = setup()
  store.getState().startPhase()
  advance(456_000)
  store.getState().tick()
  assert.equal(store.getState().phaseTimer.remainingMs, 24_000)

  store.getState().completeMission('red')
  assert.equal(store.getState().phaseTimer.remainingMs, 120_000)
  store.getState().undoLastCompletion()
  assert.equal(store.getState().phaseTimer.remainingMs, 24_000)
  assert.equal(store.getState().firstCompletionTriggered, false)
})

test('completion undo is LIFO and preserves the first completion final window', () => {
  const { store, advance } = setup()
  store.getState().startPhase()
  store.getState().completeMission('red')
  advance(45_000)
  store.getState().completeMission('blue')
  assert.equal(store.getState().phaseTimer.remainingMs, 75_000)
  assert.deepEqual(store.getState().completionHistory.map(entry => entry.teamId), ['red', 'blue'])

  store.getState().undoLastCompletion()
  assert.equal(store.getState().phaseTimer.remainingMs, 75_000)
  assert.equal(store.getState().teams.red.phaseCompleted, true)
  assert.equal(store.getState().teams.blue.phaseCompleted, false)
  assert.equal(store.getState().firstCompletionTriggered, true)
  assert.equal(store.getState().completionHistory.at(-1)?.teamId, 'red')

  store.getState().undoLastCompletion()
  assert.equal(store.getState().teams.red.phaseCompleted, false)
  assert.equal(store.getState().firstCompletionTriggered, false)
  assert.equal(store.getState().phaseTimer.remainingMs, 480_000)
  assert.equal(store.getState().completionHistory.length, 0)
})

test('undoing the third completion reopens the phase with its prior running or paused timer', () => {
  for (const paused of [false, true]) {
    const { store, advance } = setup()
    store.getState().startPhase()
    store.getState().completeMission('red')
    store.getState().completeMission('blue')
    advance(94_000)
    if (paused) store.getState().pausePhase()

    store.getState().completeMission('green')
    assert.equal(store.getState().phaseStatus, 'finished')
    assert.equal(store.getState().undoLastCompletion(), true)
    assert.equal(store.getState().teams.green.phaseCompleted, false)
    assert.equal(store.getState().phaseStatus, paused ? 'paused' : 'running')
    assert.equal(store.getState().phaseTimer.isRunning, !paused)
    assert.equal(store.getState().phaseTimer.remainingMs, 26_000)
  }
})

test('completion undo never restores score from its snapshot', () => {
  const { store } = setup()
  store.getState().startPhase()
  store.getState().completeMission('red')
  store.getState().adjustScore('red', 300)
  store.getState().undoLastCompletion()
  assert.equal(store.getState().teams.red.score, 300)
  assert.equal(store.getState().teams.red.phaseCompleted, false)
  assert.match(store.getState().history[0].description, /Conclusão do Titã Vermelho desfeita/)
  assert.match(store.getState().history[2].description, /concluiu Encontrar/)
})

test('completion history survives refresh and is cleared for a new phase or arena reset', () => {
  const { store, create } = setup()
  finishPhase(store)
  const refreshed = create()
  assert.deepEqual(refreshed.getState().completionHistory.map(entry => entry.teamId), ['red', 'blue', 'green'])
  assert.equal(refreshed.getState().undoLastCompletion(), true)
  assert.equal(refreshed.getState().teams.green.phaseCompleted, false)
  refreshed.getState().completeMission('green')
  assert.equal(refreshed.getState().prepareNextPhase(), true)
  assert.equal(refreshed.getState().completionHistory.length, 0)

  refreshed.getState().startPhase()
  refreshed.getState().completeMission('red')
  assert.equal(refreshed.getState().completionHistory.length, 1)
  refreshed.getState().reset()
  assert.equal(refreshed.getState().completionHistory.length, 0)
})

test('duplicate completion is rejected without changing revision, history or timer', () => {
  const { store, advance } = setup()
  store.getState().startPhase()
  assert.equal(store.getState().completeMission('red'), true)
  advance(10_000)
  store.getState().tick()
  const before = store.getState()
  assert.equal(store.getState().completeMission('red'), false)
  assert.equal(store.getState().revision, before.revision)
  assert.equal(store.getState().history.length, before.history.length)
  assert.equal(store.getState().phaseTimer.remainingMs, before.phaseTimer.remainingMs)
})

test('00:00 only ends the phase and marks unfinished teams as timed out', () => {
  const { store, advance } = setup()
  store.getState().adjustScore('red', 300)
  store.getState().startPhase()
  advance(480_000)
  store.getState().tick()
  assert.equal(store.getState().phaseStatus, 'finished')
  assert.equal(store.getState().phaseTimer.remainingMs, 0)
  assert.equal(store.getState().teams.red.score, 300)
  for (const id of TEAM_IDS) {
    assert.equal(store.getState().teams[id].phaseCompleted, false)
    assert.equal(getTeamStatus(store.getState().teams[id], store.getState().phaseStatus), 'TEMPO ENCERRADO')
  }
})

test('scoring supports every quick value, relative manual addition and separate total definition', () => {
  const { store } = setup()
  store.getState().setScore('blue', 1000)
  for (const [delta, expected] of [[100, 1100], [200, 1300], [300, 1600], [-25, 1575], [-100, 1475], [-200, 1275], [-300, 975]] as const) {
    store.getState().adjustScore('blue', delta)
    assert.equal(store.getState().teams.blue.score, expected)
  }
  store.getState().adjustScore('blue', 175)
  assert.equal(store.getState().teams.blue.score, 1150)
  store.getState().setScore('blue', 4000)
  assert.equal(store.getState().teams.blue.score, 4000)
  store.getState().undoLastAction()
  assert.equal(store.getState().teams.blue.score, 1150)
})

test('running countdown catches up after refresh and persists only the new model', () => {
  const { store, advance, create } = setup()
  store.getState().startPhase()
  advance(12_500)
  const refreshed = create()
  assert.equal(refreshed.getState().phaseTimer.remainingMs, 467_500)
  assert.equal(refreshed.getState().phaseStatus, 'running')
  const snapshot = toArenaSnapshot(refreshed.getState())
  assert.doesNotThrow(() => structuredClone(snapshot))
  assert.equal('arenaTimer' in snapshot, false)
  assert.equal('missionTimer' in snapshot.teams.red, false)
  assert.equal('history' in snapshot, false)
  assert.equal('tick' in snapshot, false)
})

test('old timers are discarded while scores survive migration', () => {
  const { store, data, create } = setup()
  const legacy = {
    arenaTimer: { elapsedMs: 4500, isRunning: true },
    teams: { ...store.getState().teams, red: { ...store.getState().teams.red, score: 3450, missionIndex: 2, missionTimer: { elapsedMs: 99_000, isRunning: true } } },
  }
  data.set('symbios-arena-state', JSON.stringify({ state: legacy, version: 0 }))
  const migrated = create()
  assert.equal(migrated.getState().teams.red.score, 3450)
  assert.equal(migrated.getState().phaseIndex, 0)
  assert.equal(migrated.getState().phaseTimer.remainingMs, 480_000)
  assert.equal(migrated.getState().phaseStatus, 'ready')
})

test('history is bounded and reset restores phase 1, scores and activations', () => {
  const { store, create } = setup()
  for (let index = 0; index < 100; index++) store.getState().adjustScore('red', 100)
  assert.equal(store.getState().history.length, HISTORY_LIMIT)
  store.getState().reset()
  assert.equal(store.getState().phaseIndex, 0)
  assert.equal(store.getState().phaseStatus, 'ready')
  assert.equal(store.getState().phaseTimer.remainingMs, 480_000)
  for (const id of TEAM_IDS) {
    assert.equal(store.getState().teams[id].score, 0)
    assert.equal(store.getState().teams[id].phaseCompleted, false)
    assert.equal(store.getState().teams[id].crystalActivated, false)
  }
  assert.match(create().getState().history[0].description, /resetada/)
})

test('Display hydration cannot overwrite the controller persistence', () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
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
