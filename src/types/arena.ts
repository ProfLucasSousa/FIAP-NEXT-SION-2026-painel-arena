export const TEAM_IDS = ['red', 'blue', 'green'] as const
export type TeamId = (typeof TEAM_IDS)[number]

export const MISSIONS = ['Encontrar', 'Proteger', 'Levar', 'Ativar'] as const
export type Mission = (typeof MISSIONS)[number]

export const PHASE_DURATION_SECONDS = [8 * 60, 6 * 60 + 30, 6 * 60 + 30, 4 * 60 + 30] as const
export const FINAL_WINDOW_SECONDS = 2 * 60

export interface PhaseTimer {
  remainingMs: number
  isRunning: boolean
  updatedAt?: number
}

export interface Team {
  id: TeamId
  name: string
  color: string
  score: number
  phaseCompleted: boolean
  crystalActivated: boolean
}

export type PhaseStatus = 'ready' | 'running' | 'paused' | 'finished'

export interface Arena {
  revision: number
  phaseIndex: number
  phaseTimer: PhaseTimer
  phaseStatus: PhaseStatus
  firstCompletionTriggered: boolean
  teams: Record<TeamId, Team>
}

export type ArenaSnapshot = Arena

export interface CrystalActivationEvent {
  activationId: string
  teamId: TeamId
  emittedAt: number
}
