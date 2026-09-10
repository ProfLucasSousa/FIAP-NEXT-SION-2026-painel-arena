import { MISSIONS, TEAM_IDS, type Arena, type Team, type TeamId, type Timer } from '../types/arena'
import { snapshotRevision } from './arenaSnapshot'

export const createTimer = (): Timer => ({ elapsedMs: 0, isRunning: false })
export function createInitialArena(): Arena {
  return {
    revision: 0,
    arenaTimer: createTimer(), arenaStatus: 'waiting', resumeTeamIds: [],
    teams: Object.fromEntries(TEAM_IDS.map((id, index) => [id, {
      id, name: ['Titã Vermelho', 'Titã Azul', 'Titã Verde'][index], color: ['#ff3b4f', '#21a8ff', '#9bdf4c'][index],
      score: 0, missionIndex: 0, missionTimer: createTimer(), crystalActivated: false, missionCompleted: false,
    }])) as Arena['teams'],
  }
}

export function settleTimer(timer: Timer, now: number): Timer {
  return timer.isRunning ? { ...timer, elapsedMs: timer.elapsedMs + Math.max(0, now - (timer.updatedAt ?? now)), updatedAt: now } : timer
}

function patchTimer(timer: Timer, patch: Partial<Timer>, now: number): Timer {
  const settled = settleTimer(timer, now)
  const next = { ...settled, ...patch, updatedAt: settled.updatedAt }
  if (next.isRunning || timer.isRunning) next.updatedAt = now
  if (patch.elapsedMs === 0 && patch.isRunning === false) next.updatedAt = undefined
  return next
}

// Accepts the previous localStorage schema without discarding existing scores/timers.
export function normalizeArena(value: unknown, now: number): Arena {
  const initial = createInitialArena()
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Arena>
  initial.revision = snapshotRevision(raw)
  const normalizeTimer = (timer?: Timer): Timer => ({
    elapsedMs: Number.isFinite(timer?.elapsedMs) ? Math.max(0, timer!.elapsedMs) : 0,
    isRunning: timer?.isRunning === true,
    updatedAt: Number.isFinite(timer?.updatedAt) ? timer!.updatedAt : timer?.isRunning ? now : undefined,
  })
  for (const id of TEAM_IDS) {
    const team = raw.teams?.[id]
    if (!team) continue
    const activated = team.crystalActivated === true
    initial.teams[id] = { ...initial.teams[id],
      score: Number.isFinite(team.score) ? Math.max(0, team.score) : 0,
      missionIndex: activated ? 3 : Number.isFinite(team.missionIndex) ? Math.max(0, Math.min(3, Math.trunc(team.missionIndex))) : 0,
      missionTimer: normalizeTimer(team.missionTimer), crystalActivated: activated,
      missionCompleted: activated || team.missionCompleted === true,
    }
    if (initial.teams[id].missionCompleted) initial.teams[id].missionTimer.isRunning = false
  }
  initial.arenaTimer = normalizeTimer(raw.arenaTimer)
  const started = initial.arenaTimer.elapsedMs > 0 || TEAM_IDS.some(id => {
    const team = initial.teams[id]
    return team.missionIndex > 0 || team.missionTimer.elapsedMs > 0 || team.missionCompleted
  })
  initial.arenaStatus = ['waiting', 'running', 'paused'].includes(raw.arenaStatus ?? '') ? raw.arenaStatus!
    : initial.arenaTimer.isRunning || TEAM_IDS.some(id => initial.teams[id].missionTimer.isRunning) ? 'running' : started ? 'paused' : 'waiting'
  initial.resumeTeamIds = initial.arenaStatus === 'paused' && Array.isArray(raw.resumeTeamIds)
    ? TEAM_IDS.filter(id => raw.resumeTeamIds!.includes(id) && !initial.teams[id].missionCompleted) : []
  return initial
}

export function getTeamStatus(team: Team, globallyPaused = false) {
  if (team.crystalActivated) return 'CONCLUÍDA'
  if (team.missionCompleted) return 'MISSÃO CONCLUÍDA'
  if (team.missionTimer.isRunning) return team.missionIndex === 3 ? 'ATIVAÇÃO' : 'EM MISSÃO'
  if (globallyPaused || team.missionTimer.elapsedMs > 0 || team.missionTimer.updatedAt !== undefined) return 'PAUSADA'
  return 'AGUARDANDO'
}

export type UndoAction =
  | { kind: 'score'; teamId: TeamId; score: number; label: string }
  | { kind: 'mission'; teamId: TeamId; missionIndex: number; missionTimer: Timer; missionCompleted: boolean; label: string }

export type ArenaOperation =
  | { type: 'start' | 'pause' | 'resume' | 'reset' }
  | { type: 'score'; id: TeamId; value: number; relative?: boolean }
  | { type: 'mission'; id: TeamId; index: number }
  | { type: 'team-timer'; id: TeamId; patch: Partial<Timer> }
  | { type: 'arena-timer'; patch: Partial<Timer> }
  | { type: 'complete' | 'activate'; id: TeamId }
  | { type: 'undo'; action: UndoAction }

interface OperationResult { arena: Arena; description: string; undo?: UndoAction }
export function applyArenaOperation(current: Arena, operation: ArenaOperation, now: number): OperationResult | null {
  const arena: Arena = { ...current, teams: { ...current.teams }, resumeTeamIds: [...current.resumeTeamIds] }
  const result = (description: string, undo?: UndoAction): OperationResult => ({ arena, description, undo })
  const forgetResume = (id: TeamId) => { arena.resumeTeamIds = arena.resumeTeamIds.filter(teamId => teamId !== id) }
  switch (operation.type) {
    case 'start':
      if (arena.arenaStatus !== 'waiting') return null
      arena.arenaStatus = 'running'
      arena.arenaTimer = patchTimer(arena.arenaTimer, { isRunning: true }, now)
      arena.resumeTeamIds = []
      for (const id of TEAM_IDS) arena.teams[id] = { ...arena.teams[id], missionIndex: 0, missionCompleted: false, crystalActivated: false, missionTimer: { elapsedMs: 0, isRunning: true, updatedAt: now } }
      return result('Arena iniciada · três equipes em Encontrar')
    case 'pause':
      if (arena.arenaStatus !== 'running') return null
      arena.arenaStatus = 'paused'
      arena.arenaTimer = patchTimer(arena.arenaTimer, { isRunning: false }, now)
      arena.resumeTeamIds = TEAM_IDS.filter(id => arena.teams[id].missionTimer.isRunning)
      for (const id of arena.resumeTeamIds) arena.teams[id] = { ...arena.teams[id], missionTimer: patchTimer(arena.teams[id].missionTimer, { isRunning: false }, now) }
      return result('Arena pausada')
    case 'resume':
      if (arena.arenaStatus !== 'paused') return null
      arena.arenaStatus = 'running'
      arena.arenaTimer = patchTimer(arena.arenaTimer, { isRunning: true }, now)
      for (const id of arena.resumeTeamIds) if (!arena.teams[id].missionCompleted && !arena.teams[id].crystalActivated) {
        arena.teams[id] = { ...arena.teams[id], missionTimer: patchTimer(arena.teams[id].missionTimer, { isRunning: true }, now) }
      }
      arena.resumeTeamIds = []
      return result('Arena continuada')
    case 'score': {
      if (!Number.isFinite(operation.value)) return null
      const team = arena.teams[operation.id]
      const score = Math.max(0, operation.value + (operation.relative ? team.score : 0))
      if (!Number.isFinite(score) || score === team.score) return null
      const difference = score - team.score
      arena.teams[team.id] = { ...team, score }
      return result(`${team.name} ${difference > 0 ? '+' : ''}${difference.toLocaleString('pt-BR')} pts → ${score.toLocaleString('pt-BR')}`, { kind: 'score', teamId: team.id, score: team.score, label: `Pontuação de ${team.name}` })
    }
    case 'mission': {
      if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index >= MISSIONS.length) return null
      const team = arena.teams[operation.id]
      if (operation.index === team.missionIndex) return null
      arena.teams[team.id] = { ...team, missionIndex: operation.index, missionTimer: createTimer(), missionCompleted: false, crystalActivated: false }
      forgetResume(team.id)
      return result(`${team.name} selecionou ${MISSIONS[operation.index]} · timer parado`, team.crystalActivated ? undefined : {
        kind: 'mission', teamId: team.id, missionIndex: team.missionIndex, missionTimer: { ...settleTimer(team.missionTimer, now), isRunning: false }, missionCompleted: team.missionCompleted, label: `Missão de ${team.name}`,
      })
    }
    case 'team-timer': {
      const team = arena.teams[operation.id]
      const patch = operation.patch
      if (patch.elapsedMs === undefined && patch.isRunning === undefined) return null
      if (patch.elapsedMs !== undefined && (!Number.isFinite(patch.elapsedMs) || patch.elapsedMs < 0)) return null
      if (patch.isRunning && (arena.arenaStatus === 'paused' || team.missionCompleted || team.crystalActivated)) return null
      if (patch.elapsedMs === undefined && patch.isRunning === team.missionTimer.isRunning && !arena.resumeTeamIds.includes(team.id)) return null
      arena.teams[team.id] = { ...team, missionTimer: patchTimer(team.missionTimer, patch, now) }
      if (patch.isRunning === false) forgetResume(team.id)
      const label = patch.elapsedMs !== undefined ? `ajustou tempo para ${Math.floor(patch.elapsedMs / 1000)} s`
        : patch.isRunning ? team.missionTimer.updatedAt !== undefined || team.missionTimer.elapsedMs > 0 ? 'continuou a missão' : 'iniciou a missão' : 'pausou a missão'
      return result(`${team.name} ${label}`)
    }
    case 'arena-timer': {
      const { elapsedMs, isRunning } = operation.patch
      if (elapsedMs !== undefined && (!Number.isFinite(elapsedMs) || elapsedMs < 0)) return null
      // Keep the existing timer API, but route start/pause through coordination.
      const control = isRunning === true ? arena.arenaStatus === 'waiting' ? 'start' : arena.arenaStatus === 'paused' ? 'resume' : null
        : isRunning === false && arena.arenaStatus === 'running' ? 'pause' : null
      const coordinated = control ? applyArenaOperation(current, { type: control }, now) : null
      if (elapsedMs === undefined) return coordinated
      const target = coordinated?.arena ?? arena
      target.arenaTimer = patchTimer(target.arenaTimer, { elapsedMs }, now)
      return { arena: target, description: `${coordinated ? `${coordinated.description} · ` : ''}Tempo geral ajustado para ${Math.floor(elapsedMs / 1000)} s` }
    }
    case 'complete':
    case 'activate': {
      const team = arena.teams[operation.id]
      if (team.missionCompleted || team.crystalActivated) return null
      if (operation.type === 'activate' && team.missionIndex !== 3) return null
      if (operation.type === 'complete' && team.missionIndex === 3) return null
      arena.teams[team.id] = { ...team, missionCompleted: true, crystalActivated: operation.type === 'activate', missionTimer: patchTimer(team.missionTimer, { isRunning: false }, now) }
      forgetResume(team.id)
      return result(operation.type === 'activate' ? `${team.name} ativou o cristal` : `${team.name} concluiu ${MISSIONS[team.missionIndex]}`)
    }
    case 'reset':
      return { arena: createInitialArena(), description: 'Arena resetada · tempos, pontuações, missões e ativações zerados' }
    case 'undo': {
      const undo = operation.action
      const team = arena.teams[undo.teamId]
      if (undo.kind === 'score') arena.teams[team.id] = { ...team, score: undo.score }
      else {
        if (team.crystalActivated) return null
        arena.teams[team.id] = { ...team, missionIndex: undo.missionIndex, missionTimer: { ...undo.missionTimer, isRunning: false }, missionCompleted: undo.missionCompleted }
        forgetResume(team.id)
      }
      return result(`Desfeito: ${undo.label}${undo.kind === 'mission' ? ' · timer mantido parado' : ''}`)
    }
  }
}
