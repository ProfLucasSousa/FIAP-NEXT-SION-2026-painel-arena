import {
  FINAL_WINDOW_SECONDS,
  MISSIONS,
  PHASE_DURATION_SECONDS,
  TEAM_IDS,
  type Arena,
  type PhaseStatus,
  type PhaseTimer,
  type Team,
  type TeamId,
} from '../types/arena'
import { snapshotRevision } from './arenaSnapshot'

export const phaseDurationMs = (phaseIndex: number) => PHASE_DURATION_SECONDS[phaseIndex] * 1000

export function createInitialArena(): Arena {
  return {
    revision: 0,
    phaseIndex: 0,
    phaseTimer: { remainingMs: phaseDurationMs(0), isRunning: false },
    phaseStatus: 'ready',
    firstCompletionTriggered: false,
    teams: Object.fromEntries(TEAM_IDS.map((id, index) => [id, {
      id,
      name: ['Titã Vermelho', 'Titã Azul', 'Titã Verde'][index],
      color: ['#ff3b4f', '#21a8ff', '#9bdf4c'][index],
      score: 0,
      phaseCompleted: false,
      crystalActivated: false,
    }])) as Arena['teams'],
  }
}

export function settlePhaseTimer(timer: PhaseTimer, now: number): PhaseTimer {
  if (!timer.isRunning) return timer
  const elapsed = Math.max(0, now - (timer.updatedAt ?? now))
  const remainingMs = Math.max(0, timer.remainingMs - elapsed)
  return {
    remainingMs,
    isRunning: remainingMs > 0,
    updatedAt: remainingMs > 0 ? now : undefined,
  }
}

export function settleArenaPhase(current: Arena, now: number): Arena {
  if (!current.phaseTimer.isRunning) return current
  const phaseTimer = settlePhaseTimer(current.phaseTimer, now)
  return {
    ...current,
    phaseTimer,
    phaseStatus: phaseTimer.remainingMs === 0 ? 'finished' : current.phaseStatus,
  }
}

function validPhaseStatus(value: unknown): value is PhaseStatus {
  return value === 'ready' || value === 'running' || value === 'paused' || value === 'finished'
}

export function normalizeArena(value: unknown, now: number): Arena {
  const initial = createInitialArena()
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Arena>
  const phaseIndex = Number.isInteger(raw.phaseIndex) ? Math.max(0, Math.min(3, raw.phaseIndex!)) : 0
  const rawTimer = raw.phaseTimer
  const remainingMs = Number.isFinite(rawTimer?.remainingMs)
    ? Math.max(0, Math.min(phaseDurationMs(phaseIndex), rawTimer!.remainingMs))
    : phaseDurationMs(phaseIndex)
  const requestedStatus = validPhaseStatus(raw.phaseStatus) ? raw.phaseStatus : 'ready'

  initial.revision = snapshotRevision(raw)
  initial.phaseIndex = phaseIndex
  initial.phaseTimer = {
    remainingMs,
    isRunning: requestedStatus === 'running' && remainingMs > 0 && rawTimer?.isRunning === true,
    updatedAt: requestedStatus === 'running' && remainingMs > 0
      ? Number.isFinite(rawTimer?.updatedAt) ? rawTimer!.updatedAt : now
      : undefined,
  }
  initial.phaseStatus = remainingMs === 0 ? 'finished' : requestedStatus === 'running' && !initial.phaseTimer.isRunning ? 'paused' : requestedStatus
  initial.firstCompletionTriggered = raw.firstCompletionTriggered === true

  for (const id of TEAM_IDS) {
    const team = raw.teams?.[id]
    if (!team) continue
    initial.teams[id] = {
      ...initial.teams[id],
      score: Number.isFinite(team.score) ? Math.max(0, Math.trunc(team.score)) : 0,
      phaseCompleted: team.phaseCompleted === true,
      crystalActivated: team.crystalActivated === true,
    }
  }

  const normalized = settleArenaPhase(initial, now)
  if (TEAM_IDS.every(id => normalized.teams[id].phaseCompleted || normalized.teams[id].crystalActivated)) {
    return { ...normalized, phaseStatus: 'finished', phaseTimer: { ...normalized.phaseTimer, isRunning: false, updatedAt: undefined } }
  }
  return normalized
}

export function getTeamStatus(team: Team, phaseStatus: PhaseStatus) {
  if (team.crystalActivated) return 'CRISTAL ATIVADO'
  if (team.phaseCompleted) return 'CONCLUÍDO'
  if (phaseStatus === 'finished') return 'TEMPO ENCERRADO'
  return 'EM MISSÃO'
}

export type UndoAction = { kind: 'score'; teamId: TeamId; score: number; label: string }

export type ArenaOperation =
  | { type: 'start-phase' | 'pause-phase' | 'resume-phase' | 'prepare-next-phase' | 'reset' }
  | { type: 'score'; id: TeamId; value: number; relative?: boolean }
  | { type: 'complete' | 'activate'; id: TeamId }
  | { type: 'undo'; action: UndoAction }

interface OperationResult { arena: Arena; description: string; undo?: UndoAction }

export function applyArenaOperation(current: Arena, operation: ArenaOperation, now: number): OperationResult | null {
  const settled = settleArenaPhase(current, now)
  const arena: Arena = { ...settled, teams: { ...settled.teams }, phaseTimer: { ...settled.phaseTimer } }
  const result = (description: string, undo?: UndoAction): OperationResult => ({ arena, description, undo })

  switch (operation.type) {
    case 'start-phase':
      if (arena.phaseStatus !== 'ready' || arena.phaseTimer.remainingMs <= 0) return null
      arena.phaseStatus = 'running'
      arena.phaseTimer = { ...arena.phaseTimer, isRunning: true, updatedAt: now }
      return result(`Fase ${arena.phaseIndex + 1} iniciada · ${MISSIONS[arena.phaseIndex]}`)
    case 'pause-phase':
      if (arena.phaseStatus !== 'running') return null
      arena.phaseStatus = arena.phaseTimer.remainingMs === 0 ? 'finished' : 'paused'
      arena.phaseTimer = { ...arena.phaseTimer, isRunning: false, updatedAt: undefined }
      return result(arena.phaseStatus === 'finished' ? `Fase ${arena.phaseIndex + 1} encerrada por tempo` : `Fase ${arena.phaseIndex + 1} pausada`)
    case 'resume-phase':
      if (arena.phaseStatus !== 'paused' || arena.phaseTimer.remainingMs <= 0) return null
      arena.phaseStatus = 'running'
      arena.phaseTimer = { ...arena.phaseTimer, isRunning: true, updatedAt: now }
      return result(`Fase ${arena.phaseIndex + 1} continuada`)
    case 'prepare-next-phase':
      if (arena.phaseStatus !== 'finished' || arena.phaseIndex >= MISSIONS.length - 1) return null
      arena.phaseIndex += 1
      arena.phaseStatus = 'ready'
      arena.phaseTimer = { remainingMs: phaseDurationMs(arena.phaseIndex), isRunning: false }
      arena.firstCompletionTriggered = false
      for (const id of TEAM_IDS) arena.teams[id] = { ...arena.teams[id], phaseCompleted: false }
      return result(`Fase ${arena.phaseIndex + 1} preparada · ${MISSIONS[arena.phaseIndex]}`)
    case 'score': {
      if (!Number.isFinite(operation.value)) return null
      const team = arena.teams[operation.id]
      const score = Math.max(0, Math.trunc(operation.value + (operation.relative ? team.score : 0)))
      if (!Number.isFinite(score) || score === team.score) return null
      const difference = score - team.score
      arena.teams[team.id] = { ...team, score }
      return result(`${team.name} ${difference > 0 ? '+' : ''}${difference.toLocaleString('pt-BR')} pts → ${score.toLocaleString('pt-BR')}`, {
        kind: 'score', teamId: team.id, score: team.score, label: `Pontuação de ${team.name}`,
      })
    }
    case 'complete':
    case 'activate': {
      if (arena.phaseStatus !== 'running' && arena.phaseStatus !== 'paused') return null
      const team = arena.teams[operation.id]
      if (team.phaseCompleted || team.crystalActivated) return null
      const finalPhase = arena.phaseIndex === MISSIONS.length - 1
      if ((operation.type === 'activate') !== finalPhase) return null

      arena.teams[team.id] = {
        ...team,
        phaseCompleted: true,
        crystalActivated: operation.type === 'activate',
      }

      const triggersFinalWindow = !arena.firstCompletionTriggered
      if (triggersFinalWindow) {
        arena.firstCompletionTriggered = true
        arena.phaseTimer = {
          remainingMs: FINAL_WINDOW_SECONDS * 1000,
          isRunning: arena.phaseStatus === 'running',
          updatedAt: arena.phaseStatus === 'running' ? now : undefined,
        }
      }

      const allCompleted = TEAM_IDS.every(id => arena.teams[id].phaseCompleted || arena.teams[id].crystalActivated)
      if (allCompleted) {
        arena.phaseStatus = 'finished'
        arena.phaseTimer = { ...arena.phaseTimer, isRunning: false, updatedAt: undefined }
      }
      const action = operation.type === 'activate' ? 'ativou o cristal' : `concluiu ${MISSIONS[arena.phaseIndex]}`
      return result(`${team.name} ${action}${allCompleted ? ' · fase encerrada' : triggersFinalWindow ? ' · janela final 02:00' : ''}`)
    }
    case 'reset':
      return { arena: createInitialArena(), description: 'Arena resetada · fase, tempo, pontuações e ativações restaurados' }
    case 'undo': {
      const undo = operation.action
      const team = arena.teams[undo.teamId]
      arena.teams[team.id] = { ...team, score: undo.score }
      return result(`Desfeito: ${undo.label}`)
    }
  }
}
