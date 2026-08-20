import { MISSIONS, type Team } from '../types/arena'
import { formatTime } from '../lib/time'

export function DisplayTeamCard({ team, rank }: { team: Team; rank: number }) {
  const progress = ((team.missionIndex + (team.crystalActivated ? 1 : 0)) / MISSIONS.length) * 100

  return <article className="display-team" style={{ '--team': team.color, '--progress': `${progress}%` } as React.CSSProperties}>
    <div className="rank">{String(rank).padStart(2, '0')}</div>
    <div className="team-emblem" aria-hidden="true"><span /></div>
    <div className="team-info">
      <div className="team-title"><p>{team.name}</p><span>POSIÇÃO {rank}</span></div>
      <div className="team-score"><strong>{team.score.toString().padStart(3, '0')}</strong><small>PTS</small></div>
      <div className="team-mission"><span>MISSÃO {String(team.missionIndex + 1).padStart(2, '0')}</span><b>{MISSIONS[team.missionIndex]}</b><time>{formatTime(team.missionTimer.elapsedMs)}</time></div>
      <div className="mission-progress"><i /></div>
    </div>
  </article>
}
