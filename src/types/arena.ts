export const TEAM_IDS = ['red', 'blue', 'green'] as const
export type TeamId = (typeof TEAM_IDS)[number]

export const MISSIONS = ['Encontrar', 'Proteger', 'Levar', 'Ativar'] as const
export type Mission = (typeof MISSIONS)[number]

export interface Timer { elapsedMs: number; isRunning: boolean; updatedAt?: number }
export interface Team {
  id: TeamId
  name: string
  color: string
  score: number
  missionIndex: number
  missionTimer: Timer
  crystalActivated: boolean
  missionCompleted: boolean
}
export type ArenaStatus = 'waiting' | 'running' | 'paused'
export interface Arena {
  revision: number
  teams: Record<TeamId, Team>
  arenaTimer: Timer
  arenaStatus: ArenaStatus
  resumeTeamIds: TeamId[]
}
export type ArenaSnapshot = Arena

export interface CrystalActivationEvent {
  activationId: string
  teamId: TeamId
  emittedAt: number
}
