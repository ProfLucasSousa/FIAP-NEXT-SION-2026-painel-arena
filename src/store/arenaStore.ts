import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { TEAM_IDS, type Arena, type ArenaSnapshot, type CompletionSnapshot, type PhaseStatus, type TeamId } from '../types/arena'
import { applyArenaOperation, createInitialArena, normalizeArena, settleArenaPhase, type ArenaOperation, type UndoAction } from '../lib/arenaOperations'
import { isArenaSnapshot, snapshotRevision } from '../lib/arenaSnapshot'

export interface ActionEntry { id: string; timestamp: number; description: string; reversible: boolean }
export const HISTORY_LIMIT = 80
export const toArenaSnapshot = ({ revision, phaseIndex, phaseTimer, phaseStatus, firstCompletionTriggered, teams }: Arena): ArenaSnapshot => ({
  revision, phaseIndex, phaseTimer, phaseStatus, firstCompletionTriggered, teams,
})

type ArenaActions = {
  setScore: (id: TeamId, score: number) => boolean
  adjustScore: (id: TeamId, delta: number) => boolean
  startPhase: () => boolean
  pausePhase: () => boolean
  resumePhase: () => boolean
  prepareNextPhase: () => boolean
  completeMission: (id: TeamId) => boolean
  activateCrystal: (id: TeamId) => boolean
  undoLastCompletion: () => boolean
  tick: () => void
  reset: () => void
  hydrateSnapshot: (snapshot: ArenaSnapshot) => void
  undoLastAction: () => void
}

export type ArenaStore = Arena & ArenaActions & {
  history: ActionEntry[]
  undo: UndoAction | null
  completionHistory: CompletionSnapshot[]
}

function validCompletionPhaseStatus(value: unknown): value is PhaseStatus {
  return value === 'ready' || value === 'running' || value === 'paused' || value === 'finished'
}

function normalizeCompletionHistory(value: unknown, phaseIndex: number): CompletionSnapshot[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry): CompletionSnapshot[] => {
    if (!entry || typeof entry !== 'object') return []
    const snapshot = entry as CompletionSnapshot
    if (snapshot.phaseIndex !== phaseIndex || !TEAM_IDS.includes(snapshot.teamId)
      || !validCompletionPhaseStatus(snapshot.phaseStatus)
      || typeof snapshot.firstCompletionTriggered !== 'boolean'
      || !snapshot.phaseTimer || !Number.isFinite(snapshot.phaseTimer.remainingMs)
      || snapshot.phaseTimer.remainingMs < 0 || typeof snapshot.phaseTimer.isRunning !== 'boolean'
      || !TEAM_IDS.every(id => typeof snapshot.teamStates?.[id]?.phaseCompleted === 'boolean'
        && typeof snapshot.teamStates[id].crystalActivated === 'boolean')) return []
    return [{
      phaseIndex: snapshot.phaseIndex,
      teamId: snapshot.teamId,
      phaseTimer: {
        remainingMs: snapshot.phaseTimer.remainingMs,
        isRunning: snapshot.phaseTimer.isRunning,
      },
      phaseStatus: snapshot.phaseStatus,
      firstCompletionTriggered: snapshot.firstCompletionTriggered,
      teamStates: Object.fromEntries(TEAM_IDS.map(id => [id, {
        phaseCompleted: snapshot.teamStates[id].phaseCompleted,
        crystalActivated: snapshot.teamStates[id].crystalActivated,
      }])) as CompletionSnapshot['teamStates'],
    }]
  }).slice(-TEAM_IDS.length)
}

export function createArenaStore(storage?: StateStorage, now: () => number = Date.now) {
  return create<ArenaStore>()(persist((set, get) => {
    const perform = (operation: ArenaOperation) => {
      const timestamp = now()
      const result = applyArenaOperation(get(), operation, timestamp)
      if (!result) return false
      set(state => ({
        ...result.arena,
        revision: Math.max(state.revision + 1, timestamp),
        undo: result.undo ?? null,
        completionHistory: operation.type === 'prepare-next-phase' || operation.type === 'start-phase' || operation.type === 'reset'
          ? []
          : operation.type === 'undo-completion'
            ? state.completionHistory.slice(0, -1)
            : result.completionSnapshot
              ? [...state.completionHistory, result.completionSnapshot].slice(-TEAM_IDS.length)
              : state.completionHistory,
        history: [{
          id: globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${state.history.length}-${Math.random()}`,
          timestamp,
          description: result.description,
          reversible: !!result.undo,
        }, ...state.history].slice(0, HISTORY_LIMIT),
      }))
      return true
    }

    return {
      ...createInitialArena(), history: [], undo: null, completionHistory: [],
      startPhase: () => perform({ type: 'start-phase' }),
      pausePhase: () => perform({ type: 'pause-phase' }),
      resumePhase: () => perform({ type: 'resume-phase' }),
      prepareNextPhase: () => perform({ type: 'prepare-next-phase' }),
      setScore: (id, value) => perform({ type: 'score', id, value }),
      adjustScore: (id, value) => perform({ type: 'score', id, value, relative: true }),
      completeMission: (id) => perform({ type: 'complete', id }),
      activateCrystal: (id) => perform({ type: 'activate', id }),
      undoLastCompletion: () => {
        const snapshot = get().completionHistory.at(-1)
        return snapshot ? perform({ type: 'undo-completion', snapshot }) : false
      },
      reset: () => { perform({ type: 'reset' }) },
      undoLastAction: () => { const undo = get().undo; if (undo) perform({ type: 'undo', action: undo }) },
      tick: () => {
        const state = get()
        if (!state.phaseTimer.isRunning) return
        const timestamp = now()
        const settled = settleArenaPhase(state, timestamp)
        set({
          ...settled,
          revision: Math.max(state.revision + 1, timestamp),
          history: settled.phaseStatus === 'finished' && state.phaseStatus !== 'finished'
            ? [{ id: `${timestamp}-timeout`, timestamp, description: `Fase ${state.phaseIndex + 1} encerrada por tempo`, reversible: false }, ...state.history].slice(0, HISTORY_LIMIT)
            : state.history,
          undo: null,
        })
      },
      hydrateSnapshot: (snapshot) => {
        if (!isArenaSnapshot(snapshot)) return
        const current = get()
        const revision = snapshotRevision(snapshot)
        if (revision < current.revision || (revision > 0 && revision === current.revision)) return
        set({ ...normalizeArena(snapshot, now()), undo: null })
      },
    }
  }, {
    name: 'symbios-arena-state',
    version: 3,
    storage: createJSONStorage(() => {
      if (storage) return storage
      const local = localStorage
      return {
        getItem: (key: string) => local.getItem(key),
        setItem: (key: string, value: string) => { if (window.location.pathname === '/admin') local.setItem(key, value) },
        removeItem: (key: string) => { if (window.location.pathname === '/admin') local.removeItem(key) },
      }
    }),
    partialize: state => ({ ...toArenaSnapshot(state), history: state.history, completionHistory: state.completionHistory }),
    migrate: persisted => {
      const saved = persisted as { history?: ActionEntry[]; completionHistory?: CompletionSnapshot[] } | undefined
      const arena = normalizeArena(persisted, now())
      return {
        ...arena,
        history: saved?.history ?? [],
        completionHistory: normalizeCompletionHistory(saved?.completionHistory, arena.phaseIndex),
        undo: null,
      }
    },
    merge: (persisted, current) => {
      const saved = persisted as { history?: ActionEntry[]; completionHistory?: CompletionSnapshot[] } | undefined
      const history = Array.isArray(saved?.history)
        ? saved.history.filter(entry => entry && typeof entry.description === 'string' && Number.isFinite(entry.timestamp)).slice(0, HISTORY_LIMIT)
        : []
      const arena = normalizeArena(persisted, now())
      if (!arena.revision) arena.revision = Math.max(0, ...history.map(entry => entry.timestamp), arena.phaseTimer.updatedAt ?? 0)
      return {
        ...current,
        ...arena,
        history,
        completionHistory: normalizeCompletionHistory(saved?.completionHistory, arena.phaseIndex),
        undo: null,
      }
    },
  }))
}

export const useArenaStore = createArenaStore()
