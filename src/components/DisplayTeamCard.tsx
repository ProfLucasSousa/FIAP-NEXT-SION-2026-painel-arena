import { getTeamStatus } from '../lib/arenaOperations'
import { MISSIONS, type PhaseStatus, type Team } from '../types/arena'

const scoreFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

interface DisplayTeamCardProps {
  team: Team
  rank: number
  phaseIndex: number
  phaseStatus: PhaseStatus
}

export function DisplayTeamCard({ team, rank, phaseIndex, phaseStatus }: DisplayTeamCardProps) {
  const score = team.score < 1000 ? team.score.toString().padStart(4, '0') : scoreFormatter.format(team.score)
  const status = getTeamStatus(team, phaseStatus)

  return <article className="scoreboard-team" data-activated={team.crystalActivated} data-status={status} style={{ '--team': team.color } as React.CSSProperties}>
    <header className="scoreboard-team__header">
      <span className="scoreboard-team__rank">{String(rank).padStart(2, '0')}</span>
      <div className="scoreboard-team__identity"><span>TITÃ // {team.id.toUpperCase()}</span><h2>{team.name}</h2></div>
      <div className="scoreboard-team__score"><strong>{score}</strong><small>PTS</small></div>
    </header>

    <div className="scoreboard-team__status">
      <div><span>FASE ATUAL // {String(phaseIndex + 1).padStart(2, '0')}</span><strong>{MISSIONS[phaseIndex]}</strong></div>
      <output><span>STATUS DA EQUIPE</span>{status}</output>
    </div>

    <div className="scoreboard-team__stages" aria-label={`Fase atual: ${MISSIONS[phaseIndex]}`}>
      {MISSIONS.map((mission, index) => <i className={`${index <= phaseIndex ? 'is-complete' : ''} ${index === phaseIndex ? 'is-current' : ''}`} title={mission} key={mission} />)}
    </div>
  </article>
}
