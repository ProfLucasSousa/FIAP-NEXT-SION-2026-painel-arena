import { MISSIONS, type Team } from '../types/arena'
import { formatTime } from '../lib/time'

export function DisplayTeamCard({ team, rank }: { team: Team; rank: number }) {
  return <article className={`team-telemetry team-telemetry--${team.id}`} style={{ '--team': team.color } as React.CSSProperties}>
    <header>
      <span className="team-signal"><i />EQUIPE {team.id.toUpperCase()}</span>
      <span className="team-placement">RANK {String(rank).padStart(2, '0')}</span>
    </header>

    <div className="team-telemetry__title">
      <h2>{team.name}</h2>
      <div className="team-telemetry__score"><strong>{team.score.toString().padStart(3, '0')}</strong><small>PTS</small></div>
    </div>

    <div className="team-telemetry__mission">
      <div><span>MISSÃO {String(team.missionIndex + 1).padStart(2, '0')}</span><strong>{MISSIONS[team.missionIndex]}</strong></div>
      <time><span>TEMPO</span>{formatTime(team.missionTimer.elapsedMs)}</time>
    </div>

    <div className="team-stage-pips" aria-label={`Etapa atual: ${MISSIONS[team.missionIndex]}`}>
      {MISSIONS.map((mission, index) => <i className={`${index <= team.missionIndex ? 'is-complete' : ''} ${index === team.missionIndex ? 'is-current' : ''}`} title={mission} key={mission} />)}
    </div>
  </article>
}
