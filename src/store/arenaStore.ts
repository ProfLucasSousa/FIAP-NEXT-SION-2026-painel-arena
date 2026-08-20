import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MISSIONS, type Arena, type ArenaSnapshot, type TeamId, type Timer } from '../types/arena'

const createTimer = (): Timer => ({ elapsedMs: 0, isRunning: false })
const initialArena: Arena = {
  arenaTimer: createTimer(),
  teams: {
    red: { id: 'red', name: 'Titã Vermelho', color: '#ff3b4f', score: 0, missionIndex: 0, missionTimer: createTimer(), crystalActivated: false },
    blue: { id: 'blue', name: 'Titã Azul', color: '#21a8ff', score: 0, missionIndex: 0, missionTimer: createTimer(), crystalActivated: false },
    green: { id: 'green', name: 'Titã Verde', color: '#9bdf4c', score: 0, missionIndex: 0, missionTimer: createTimer(), crystalActivated: false },
  },
}

type ArenaActions = {
  setScore: (id: TeamId, score: number) => void
  setMission: (id: TeamId, missionIndex: number) => void
  setTeamTimer: (id: TeamId, patch: Partial<Timer>) => void
  setArenaTimer: (patch: Partial<Timer>) => void
  completeMission: (id: TeamId) => void
  activateCrystal: (id: TeamId) => void
  tick: () => void
  reset: () => void
  hydrateSnapshot: (snapshot: ArenaSnapshot) => void
}
export type ArenaStore = Arena & ArenaActions

export const useArenaStore = create<ArenaStore>()(persist((set) => ({
  ...initialArena,
  setScore: (id, score) => set((state) => ({ teams: { ...state.teams, [id]: { ...state.teams[id], score: Math.max(0, score) } } })),
  setMission: (id, missionIndex) => set((state) => ({ teams: { ...state.teams, [id]: { ...state.teams[id], missionIndex: Math.max(0, Math.min(MISSIONS.length - 1, missionIndex)), crystalActivated: false } } })),
  setTeamTimer: (id, patch) => set((state) => ({ teams: { ...state.teams, [id]: { ...state.teams[id], missionTimer: { ...state.teams[id].missionTimer, ...patch } } } })),
  setArenaTimer: (patch) => set((state) => ({ arenaTimer: { ...state.arenaTimer, ...patch } })),
  completeMission: (id) => set((state) => ({ teams: { ...state.teams, [id]: { ...state.teams[id], missionIndex: Math.min(MISSIONS.length - 1, state.teams[id].missionIndex + 1), missionTimer: createTimer() } } })),
  activateCrystal: (id) => set((state) => ({ teams: { ...state.teams, [id]: { ...state.teams[id], crystalActivated: true, missionIndex: MISSIONS.length - 1 } } })),
  tick: () => set((state) => ({
    arenaTimer: state.arenaTimer.isRunning ? { ...state.arenaTimer, elapsedMs: state.arenaTimer.elapsedMs + 1000 } : state.arenaTimer,
    teams: Object.fromEntries(Object.entries(state.teams).map(([id, team]) => [id, { ...team, missionTimer: team.missionTimer.isRunning ? { ...team.missionTimer, elapsedMs: team.missionTimer.elapsedMs + 1000 } : team.missionTimer }])) as Arena['teams'],
  })),
  reset: () => set(initialArena),
  hydrateSnapshot: (snapshot) => set(snapshot),
}), { name: 'symbios-arena-state', partialize: (state) => ({ teams: state.teams, arenaTimer: state.arenaTimer }) }))
