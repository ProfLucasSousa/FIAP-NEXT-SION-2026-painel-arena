import { useArenaSync } from '../hooks/useArenaSync'
import { useArenaStore } from '../store/arenaStore'
import { formatTime } from '../lib/time'
import { DisplayTeamCard } from '../components/DisplayTeamCard'
import { PlanetaryCore } from '../components/PlanetaryCore'

export function DisplayPage() {
  const { teams, arenaTimer } = useArenaStore()
  useArenaSync('display')
  const sorted = Object.values(teams).sort((a, b) => b.score - a.score)
  const activeCrystals = Object.values(teams).filter((team) => team.crystalActivated).length

  return <main className="display-shell">
    <div className="display-noise" />
    <header className="display-header">
      <div className="brand" aria-label="Symbios"><span className="brand-mark">S</span>SYMBIOS</div>
      <div className="display-title"><span>COMPETIÇÃO PRESENCIAL</span><strong>SYMBIOS ARENA</strong></div>
      <div className="arena-time"><span>TEMPO GERAL DA ARENA</span><strong>{formatTime(arenaTimer.elapsedMs)}</strong></div>
      <div className="partners"><b>FIAP</b><i /><b>PALO ALTO</b></div>
    </header>
    <div className="display-content">
      <section className="ranking panel-frame">
        <header className="panel-heading"><span className="heading-icon">⌁</span><div><small>STATUS DA COMPETIÇÃO</small><h1>RANKING AO VIVO</h1></div><span className="live-indicator">AO VIVO</span></header>
        <div className="team-list">{sorted.map((team, index) => <DisplayTeamCard team={team} rank={index + 1} key={team.id} />)}</div>
        <footer className="ranking-footer"><span>03 EQUIPES CONECTADAS</span><span>ATUALIZAÇÃO EM TEMPO REAL</span></footer>
      </section>
      <section className="core-area">
        <div className="core-heading"><span>PROTOCOLO DE CONVERGÊNCIA</span><i /><span>SETOR 01</span></div>
        <PlanetaryCore />
        <div className="core-status"><span>CRISTAIS ATIVOS</span><strong>{String(activeCrystals).padStart(2, '0')}<small>/03</small></strong><p>Sincronize os três fluxos de energia<br />para restaurar o núcleo.</p></div>
      </section>
    </div>
    <footer className="display-footer"><span>SYMBIOS // A ÚLTIMA ALIANÇA</span><span>CANAL DE CONTROLE: ONLINE</span></footer>
  </main>
}
