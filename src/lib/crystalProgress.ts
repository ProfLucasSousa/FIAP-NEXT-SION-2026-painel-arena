import { MISSIONS, type Team } from '../types/arena'

// Completing a mission earns the next visual charge without starting the next
// mission. Selecting that next mission keeps the charge already earned.
export function getTeamCrystalProgress(team: Pick<Team, 'missionIndex' | 'missionCompleted'>) {
  const lastMission = MISSIONS.length - 1
  const stage = team.missionIndex + Number(team.missionCompleted)
  return Math.min(lastMission, Math.max(0, stage)) / lastMission
}
