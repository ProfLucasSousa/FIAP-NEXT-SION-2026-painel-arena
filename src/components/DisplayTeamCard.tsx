import { MISSIONS, type Team } from '../types/arena'
import { formatTime } from '../lib/time'

const scoreFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function DisplayTeamCard({ team, rank }: { team: Team; rank: number }) {
  const mission = MISSIONS[team.missionIndex]
  const score = team.score < 1000 ? team.score.toString().padStart(4, '0') : scoreFormatter.format(team.score)

  return <article className="scoreboard-team" data-activated={team.crystalActivated} style={{ '--team': team.color } as React.CSSProperties}>
    <header className="scoreboard-team__header">
      <span className="scoreboard-team__rank">{String(rank).padStart(2, '0')}</span>
      <div className="scoreboard-team__identity"><span>TITÃ // {team.id.toUpperCase()}</span><h2>{team.name}</h2></div>
      <div className="scoreboard-team__score"><strong>{score}</strong><small>PTS</small></div>
    </header>

    <div className="scoreboard-team__status">
      <div>
        <span>MISSÃO ATUAL // {String(team.missionIndex + 1).padStart(2, '0')}</span>
        <strong>{mission}</strong>
      </div>
      <time dateTime={`PT${Math.floor(team.missionTimer.elapsedMs / 1000)}S`}><span>TEMPO DA MISSÃO</span>{formatTime(team.missionTimer.elapsedMs)}</time>
    </div>

    <div className="scoreboard-team__stages" aria-label={`Etapa atual: ${mission}`}>
      {MISSIONS.map((mission, index) => <i className={`${index <= team.missionIndex ? 'is-complete' : ''} ${index === team.missionIndex ? 'is-current' : ''}`} title={mission} key={mission} />)}
    </div>
  </article>
}
