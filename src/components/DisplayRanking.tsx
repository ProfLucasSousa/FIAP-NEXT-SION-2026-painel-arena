import type { Team } from '../types/arena'

export function DisplayRanking({ teams }: { teams: Team[] }) {
  return <aside className="arena-ranking" aria-label="Ranking ao vivo">
    <header><div><span>CLASSIFICAÇÃO</span><strong>RANKING AO VIVO</strong></div><i>LIVE</i></header>
    <ol>{teams.map((team, index) => <li key={team.id} style={{ '--team': team.color } as React.CSSProperties}>
      <span className="ranking-position">{String(index + 1).padStart(2, '0')}</span>
      <span className="ranking-team"><i />{team.name}</span>
      <strong>{team.score.toString().padStart(3, '0')}<small> PTS</small></strong>
    </li>)}</ol>
  </aside>
}
