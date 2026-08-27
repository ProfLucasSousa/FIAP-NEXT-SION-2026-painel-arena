import { TEAM_IDS, type Team, type TeamId } from '../types/arena'

export interface CoreEnergyState {
  activeCount: number
  activeTeamIds: TeamId[]
  level: number
  isMaximum: boolean
}

export function getCoreEnergyState(activeTeams: Team[]): CoreEnergyState {
  const activeIds = new Set(activeTeams.map((team) => team.id))
  const activeTeamIds = TEAM_IDS.filter((teamId) => activeIds.has(teamId))
  const activeCount = activeTeamIds.length
  return {
    activeCount,
    activeTeamIds,
    level: activeCount / TEAM_IDS.length,
    isMaximum: activeCount === TEAM_IDS.length,
  }
}
