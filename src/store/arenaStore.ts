import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { TEAM_IDS, type Arena, type ArenaSnapshot, type TeamId, type Timer } from '../types/arena'
import { applyArenaOperation, createInitialArena, normalizeArena, settleTimer, type ArenaOperation, type UndoAction } from '../lib/arenaOperations'
import { isArenaSnapshot, snapshotRevision } from '../lib/arenaSnapshot'

export interface ActionEntry { id: string; timestamp: number; description: string; reversible: boolean }
export const HISTORY_LIMIT = 80
export const toArenaSnapshot = ({ teams, arenaTimer, arenaStatus, resumeTeamIds, revision }: Arena): ArenaSnapshot => ({ teams, arenaTimer, arenaStatus, resumeTeamIds, revision })

type ArenaActions = {
  setScore: (id: TeamId, score: number) => void
  adjustScore: (id: TeamId, delta: number) => void
  startArena: () => void
  pauseArena: () => void
  resumeArena: () => void
  setMission: (id: TeamId, missionIndex: number) => void
  setTeamTimer: (id: TeamId, patch: Partial<Timer>) => void
  setArenaTimer: (patch: Partial<Timer>) => void
  completeMission: (id: TeamId) => void
  activateCrystal: (id: TeamId) => boolean
  tick: () => void
  reset: () => void
  hydrateSnapshot: (snapshot: ArenaSnapshot) => void
  undoLastAction: () => void
}
export type ArenaStore = Arena & ArenaActions & { history: ActionEntry[]; undo: UndoAction | null }

export function createArenaStore(storage?: StateStorage, now: () => number = Date.now) {
  return create<ArenaStore>()(persist((set, get) => {
    const perform = (operation: ArenaOperation) => {
      const timestamp = now()
      const result = applyArenaOperation(get(), operation, timestamp)
      if (!result) return false
      set(state => ({ ...result.arena, revision: Math.max(state.revision + 1, timestamp), undo: result.undo ?? null, history: [{
        id: globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${state.history.length}-${Math.random()}`,
        timestamp, description: result.description, reversible: !!result.undo,
      }, ...state.history].slice(0, HISTORY_LIMIT) }))
      return true
    }
    return {
      ...createInitialArena(), history: [], undo: null,
      startArena: () => { perform({ type: 'start' }) },
      pauseArena: () => { perform({ type: 'pause' }) },
      resumeArena: () => { perform({ type: 'resume' }) },
      setScore: (id, value) => { perform({ type: 'score', id, value }) },
      adjustScore: (id, value) => { perform({ type: 'score', id, value, relative: true }) },
      setMission: (id, index) => { perform({ type: 'mission', id, index }) },
      setTeamTimer: (id, patch) => { perform({ type: 'team-timer', id, patch }) },
      setArenaTimer: (patch) => { perform({ type: 'arena-timer', patch }) },
      completeMission: (id) => { perform({ type: 'complete', id }) },
      activateCrystal: (id) => perform({ type: 'activate', id }),
      reset: () => { perform({ type: 'reset' }) },
      undoLastAction: () => { const undo = get().undo; if (undo) perform({ type: 'undo', action: undo }) },
      tick: () => {
        const state = get()
        if (!state.arenaTimer.isRunning && !TEAM_IDS.some(id => state.teams[id].missionTimer.isRunning)) return
        const timestamp = now()
        set({ revision: Math.max(state.revision + 1, timestamp), arenaTimer: settleTimer(state.arenaTimer, timestamp), teams: Object.fromEntries(TEAM_IDS.map(id => {
          const team = state.teams[id]
          return [id, team.missionTimer.isRunning ? { ...team, missionTimer: settleTimer(team.missionTimer, timestamp) } : team]
        })) as Arena['teams'] })
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
    storage: createJSONStorage(() => {
      if (storage) return storage
      const local = localStorage
      // Display may read a saved snapshot, but must never overwrite the
      // controller's operational history when both tabs share this origin.
      return {
        getItem: (key: string) => local.getItem(key),
        setItem: (key: string, value: string) => { if (window.location.pathname === '/admin') local.setItem(key, value) },
        removeItem: (key: string) => { if (window.location.pathname === '/admin') local.removeItem(key) },
      }
    }),
    partialize: state => ({ ...toArenaSnapshot(state), history: state.history }),
    merge: (persisted, current) => {
      const saved = persisted as { history?: ActionEntry[] } | undefined
      const history = Array.isArray(saved?.history) ? saved.history.filter(entry => entry && typeof entry.description === 'string' && Number.isFinite(entry.timestamp)).slice(0, HISTORY_LIMIT) : []
      const arena = normalizeArena(persisted, now())
      // Old saves have no revision: use their recorded action/timer times,
      // never the refresh time (which would make stale saves look newer).
      if (!arena.revision) arena.revision = Math.max(0, ...history.map(entry => entry.timestamp), arena.arenaTimer.updatedAt ?? 0, ...TEAM_IDS.map(id => arena.teams[id].missionTimer.updatedAt ?? 0))
      return { ...current, ...arena, history, undo: null }
    },
  }))
}

export const useArenaStore = createArenaStore()
