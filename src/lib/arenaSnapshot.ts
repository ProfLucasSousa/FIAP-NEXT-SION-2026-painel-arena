import { TEAM_IDS, type ArenaSnapshot } from '../types/arena'

export function snapshotRevision(value: unknown): number {
  const revision = (value as Partial<ArenaSnapshot> | null)?.revision
  return Number.isSafeInteger(revision) && revision! >= 0 ? revision! : 0
}

// Network payloads must be complete. Persistence migration is intentionally
// more forgiving, but a malformed message must never become an empty arena.
export function isArenaSnapshot(value: unknown): value is ArenaSnapshot {
  if (!value || typeof value !== 'object') return false
  const state = value as ArenaSnapshot
  const validTimer = (timer: ArenaSnapshot['arenaTimer']) => timer && Number.isFinite(timer.elapsedMs) && timer.elapsedMs >= 0 && typeof timer.isRunning === 'boolean'
  return !!validTimer(state.arenaTimer) && TEAM_IDS.every(id => {
    const team = state.teams?.[id]
    return team && team.id === id && Number.isFinite(team.score) && team.score >= 0
      && Number.isInteger(team.missionIndex) && team.missionIndex >= 0 && team.missionIndex < 4
      && typeof team.crystalActivated === 'boolean' && validTimer(team.missionTimer)
  })
}
