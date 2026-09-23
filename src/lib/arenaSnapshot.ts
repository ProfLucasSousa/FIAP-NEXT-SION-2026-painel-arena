import { TEAM_IDS, type ArenaSnapshot } from '../types/arena'

export function snapshotRevision(value: unknown): number {
  const revision = (value as Partial<ArenaSnapshot> | null)?.revision
  return Number.isSafeInteger(revision) && revision! >= 0 ? revision! : 0
}

export function isArenaSnapshot(value: unknown): value is ArenaSnapshot {
  if (!value || typeof value !== 'object') return false
  const state = value as ArenaSnapshot
  const validStatus = state.phaseStatus === 'ready' || state.phaseStatus === 'running'
    || state.phaseStatus === 'paused' || state.phaseStatus === 'finished'
  const timer = state.phaseTimer
  return Number.isInteger(state.phaseIndex) && state.phaseIndex >= 0 && state.phaseIndex < 4
    && !!timer && Number.isFinite(timer.remainingMs) && timer.remainingMs >= 0 && typeof timer.isRunning === 'boolean'
    && validStatus && typeof state.firstCompletionTriggered === 'boolean'
    && TEAM_IDS.every(id => {
      const team = state.teams?.[id]
      return team && team.id === id && Number.isFinite(team.score) && team.score >= 0
        && typeof team.phaseCompleted === 'boolean' && typeof team.crystalActivated === 'boolean'
    })
}
