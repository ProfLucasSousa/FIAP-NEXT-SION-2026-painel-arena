import { useCallback, useMemo, useState } from 'react'
import fiapLogo from '../../docs/logo_fiap.png'
import symbiosLogo from '../../docs/logo_symbios.png'
import paloAltoLogo from '../../docs/logo_paloalto.png'
import '../display.css'
import { DisplayScoreboard } from '../components/DisplayScoreboard'
import { useArenaSync } from '../hooks/useArenaSync'
import { formatArenaTime } from '../lib/time'
import { ArenaCrystalScene } from '../scenes/ArenaCrystalScene'
import { useArenaStore } from '../store/arenaStore'
import { MISSIONS, TEAM_IDS, type CrystalActivationEvent, type TeamId } from '../types/arena'

export function DisplayPage() {
  const { teams, arenaTimer } = useArenaStore()
  const [activationEvents, setActivationEvents] = useState<Partial<Record<TeamId, CrystalActivationEvent>>>({})
  const [latestActivationEvent, setLatestActivationEvent] = useState<CrystalActivationEvent>()
  const handleCrystalActivation = useCallback((event: CrystalActivationEvent) => {
    setActivationEvents((current) => ({ ...current, [event.teamId]: event }))
    setLatestActivationEvent(event)
  }, [])
  useArenaSync('display', handleCrystalActivation)

  const sortedTeams = useMemo(() => Object.values(teams).sort((a, b) => b.score - a.score), [teams])
  const activeCrystals = Object.values(teams).filter((team) => team.crystalActivated).length

  return <main className="arena-display">
    <div className="arena-display__grid" />
    <header className="arena-display__header">
      <div className="arena-brand">
        <img src={symbiosLogo} alt="Symbios" />
        <div><span>PROTOCOLO DE ARENA</span><strong>SETOR // 01</strong></div>
      </div>
      <div className="arena-display__title"><span>COMPETIÇÃO PRESENCIAL</span><strong>CONVERGÊNCIA TITÃ</strong></div>
      <div className="arena-global-time">
        <span>TEMPO DA ARENA</span>
        <time dateTime={`PT${Math.floor(arenaTimer.elapsedMs / 1000)}S`}>{formatArenaTime(arenaTimer.elapsedMs)}</time>
      </div>
      <div className="arena-partners" aria-label="Apoio institucional">
        <span>REALIZAÇÃO</span>
        <img className="arena-partners__fiap" src={fiapLogo} alt="FIAP" />
        <i />
        <img className="arena-partners__palo-alto" src={paloAltoLogo} alt="Palo Alto Networks" />
      </div>
    </header>

    <section className="arena-display__body">
      <DisplayScoreboard teams={sortedTeams} />

      <section className="arena-visual" aria-label="Arena dos cristais">
        <ArenaCrystalScene teams={teams} activationEvents={activationEvents} latestActivationEvent={latestActivationEvent} />
        <div className="arena-visual__frame" />
        <div className="arena-visual__axis" aria-hidden="true" />
        {TEAM_IDS.map((teamId) => {
          const team = teams[teamId]
          return <div className={`crystal-label crystal-label--${teamId}`} style={{ '--team': team.color } as React.CSSProperties} key={teamId}>
            <span>{team.crystalActivated ? 'ENERGIA INTEGRADA' : `MISSÃO 0${team.missionIndex + 1}`}</span>
            <strong>{team.name}</strong>
            <small>{MISSIONS[team.missionIndex]}</small>
          </div>
        })}
        <div className="core-telemetry">
          <span>CONVERGÊNCIA // ONLINE</span>
          <strong>NÚCLEO PLANETÁRIO</strong>
          <small><b>{String(activeCrystals).padStart(2, '0')}</b> / 03 ENERGIAS</small>
        </div>
      </section>
    </section>

    <footer className="arena-display__footer">
      <span><i />03 EQUIPES CONECTADAS</span>
      <span>FLUXO // EQUIPES → CRISTAIS → NÚCLEO</span>
      <span>CANAL DE CONTROLE // ONLINE</span>
    </footer>
  </main>
}
