export const TEAM_IDS = ['red', 'blue', 'green'] as const
export type TeamId = (typeof TEAM_IDS)[number]

export const MISSIONS = ['Encontrar', 'Proteger', 'Levar', 'Ativar'] as const
export type Mission = (typeof MISSIONS)[number]

export interface Timer { elapsedMs: number; isRunning: boolean }
export interface Team {
  id: TeamId
  name: string
  color: string
  score: number
  missionIndex: number
  missionTimer: Timer
  crystalActivated: boolean
}
export interface Arena { teams: Record<TeamId, Team>; arenaTimer: Timer }
export type ArenaSnapshot = Arena
