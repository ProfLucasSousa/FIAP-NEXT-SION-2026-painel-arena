import { DisplayRanking } from '../components/DisplayRanking'
import { DisplayTeamCard } from '../components/DisplayTeamCard'
import { useArenaSync } from '../hooks/useArenaSync'
import { formatTime } from '../lib/time'
import { ArenaCrystalScene } from '../scenes/ArenaCrystalScene'
import { useArenaStore } from '../store/arenaStore'
import { TEAM_IDS, type CrystalActivationEvent, type TeamId } from '../types/arena'

export function DisplayPage() {
  const { teams, arenaTimer } = useArenaStore()
  const [activationEvents, setActivationEvents] = useState<Partial<Record<TeamId, CrystalActivationEvent>>>({})
  const [latestActivationEvent, setLatestActivationEvent] = useState<CrystalActivationEvent>()
  const handleCrystalActivation = useCallback((event: CrystalActivationEvent) => {
    setActivationEvents((current) => ({ ...current, [event.teamId]: event }))
    setLatestActivationEvent(event)
  }, [])
  useArenaSync('display', handleCrystalActivation)

  const sortedTeams = Object.values(teams).sort((a, b) => b.score - a.score)
  const rankByTeam = new Map<TeamId, number>(sortedTeams.map((team, index) => [team.id, index + 1]))
  const activeCrystals = Object.values(teams).filter((team) => team.crystalActivated).length

  return <main className="arena-display">
    <div className="arena-display__grid" />
    <header className="arena-display__header">
      <div className="arena-brand" aria-label="Symbios"><span>S</span><div><strong>SYMBIOS</strong><small>A ÚLTIMA ALIANÇA</small></div></div>
      <div className="arena-display__title"><span>COMPETIÇÃO PRESENCIAL</span><strong>ARENA // SETOR 01</strong></div>
      <div className="arena-global-time"><span>TEMPO GERAL</span><strong>{formatTime(arenaTimer.elapsedMs)}</strong></div>
      <div className="arena-partners"><b>FIAP</b><i /><b>PALO ALTO</b></div>
    </header>

    <section className="arena-stage">
      <ArenaCrystalScene teams={teams} activationEvents={activationEvents} latestActivationEvent={latestActivationEvent} />
      <div className="arena-stage__frame" />

      <div className="core-telemetry">
        <span>PROTOCOLO DE CONVERGÊNCIA</span>
        <strong>NÚCLEO PLANETÁRIO</strong>
        <small>{String(activeCrystals).padStart(2, '0')} / 03 CRISTAIS ATIVOS</small>
      </div>

      {TEAM_IDS.map((teamId) => <DisplayTeamCard team={teams[teamId]} rank={rankByTeam.get(teamId) ?? 0} key={teamId} />)}
      <DisplayRanking teams={sortedTeams} />
    </section>

    <footer className="arena-display__footer"><span>03 EQUIPES CONECTADAS</span><span>FLUXO: EQUIPES → CRISTAIS → NÚCLEO</span><span>CANAL DE CONTROLE // ONLINE</span></footer>
  </main>
}
import { useCallback, useState } from 'react'
