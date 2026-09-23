import { useState, type CSSProperties } from 'react'
import type { Team } from '../types/arena'
import { useArenaStore } from '../store/arenaStore'
import { sendCrystalActivation } from '../lib/socket'
import { getTeamStatus } from '../lib/arenaOperations'
import { AdminConfirmation } from './AdminConfirmation'
import { AdminNumberAdjustment } from './AdminNumberAdjustment'
import { AdminScoreAddition } from './AdminScoreAddition'

const POSITIVE_SCORES = [100, 200, 300]
const NEGATIVE_SCORES = [-25, -100, -200, -300]

export function TeamAdminCard({ team }: { team: Team }) {
  const { setScore, adjustScore, completeMission, activateCrystal, phaseIndex, phaseStatus } = useArenaStore()
  const [confirmActivation, setConfirmActivation] = useState(false)
  const status = getTeamStatus(team, phaseStatus)
  const finalPhase = phaseIndex === 3
  const finished = team.phaseCompleted || team.crystalActivated
  const canComplete = (phaseStatus === 'running' || phaseStatus === 'paused') && !finished

  const handleActivation = () => {
    if (activateCrystal(team.id)) sendCrystalActivation(team.id)
    setConfirmActivation(false)
  }

  return <section className="team-admin-card" style={{ '--team': team.color } as CSSProperties} aria-label={team.name}>
    <header><span className="status-dot" /><h2>{team.name}</h2><span className="admin-team-status" data-status={status} role="status">{status}</span></header>

    <div className="admin-score"><span className="field-label">Pontuação</span><strong>{team.score.toLocaleString('pt-BR')} <small>PTS</small></strong></div>

    <div className="admin-quick-scores">
      <div><span>Adicionar rápido</span><div className="admin-score-buttons admin-score-buttons--positive">{POSITIVE_SCORES.map(delta =>
        <button key={delta} onClick={() => adjustScore(team.id, delta)} aria-label={`Adicionar ${delta} pontos ao ${team.name}`}>+{delta}</button>)}</div></div>
      <div><span>Remover rápido</span><div className="admin-score-buttons admin-score-buttons--negative">{NEGATIVE_SCORES.map(delta =>
        <button key={delta} onClick={() => adjustScore(team.id, delta)} aria-label={`Remover ${Math.abs(delta)} pontos do ${team.name}`}>−{Math.abs(delta)}</button>)}</div></div>
    </div>

    <AdminScoreAddition teamName={team.name} onAdd={value => adjustScore(team.id, value)} />

    <p className="admin-team-hint">{team.crystalActivated
      ? 'Energia armazenada no Núcleo Planetário.'
      : team.phaseCompleted
        ? 'Equipe concluída nesta fase.'
        : phaseStatus === 'finished'
          ? 'O tempo da fase terminou.'
          : phaseStatus === 'ready'
            ? 'Aguardando o início da fase.'
            : firstCompletionHint(phaseStatus)}</p>

    <div className="action-row">{finalPhase
      ? <button className="activate" disabled={!canComplete} onClick={() => setConfirmActivation(true)}>{team.crystalActivated ? 'Cristal ativado' : 'Ativar cristal'}</button>
      : <button className="accent" disabled={!canComplete} onClick={() => completeMission(team.id)}>{team.phaseCompleted ? 'Missão concluída' : 'Concluir missão'}</button>}</div>

    <details className="admin-adjustments"><summary>Definir pontuação total</summary>
      <p>Substitui a pontuação atual pelo valor informado.</p>
      <AdminNumberAdjustment label="Definir total" value={team.score} buttonLabel="Aplicar total" onApply={value => setScore(team.id, value)} />
    </details>

    {confirmActivation && <AdminConfirmation title={`Ativar cristal do ${team.name}?`} confirmLabel="Ativar cristal" onCancel={() => setConfirmActivation(false)} onConfirm={handleActivation}><p>Esta ação concluirá a equipe na fase Ativar e iniciará a animação de convergência no telão.</p></AdminConfirmation>}
  </section>
}

function firstCompletionHint(phaseStatus: 'running' | 'paused') {
  return phaseStatus === 'paused' ? 'Fase pausada. A conclusão ainda pode ser registrada.' : 'Equipe em missão.'
}
