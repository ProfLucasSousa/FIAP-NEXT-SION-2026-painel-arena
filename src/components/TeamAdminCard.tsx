import { useState, type CSSProperties } from 'react'
import { MISSIONS, type Team } from '../types/arena'
import { useArenaStore } from '../store/arenaStore'
import { sendCrystalActivation } from '../lib/socket'
import { TimerControls } from './TimerControls'
import { getTeamStatus } from '../lib/arenaOperations'
import { AdminConfirmation } from './AdminConfirmation'
import { AdminNumberAdjustment } from './AdminNumberAdjustment'

export function TeamAdminCard({ team }: { team: Team }) {
  const { setScore, adjustScore, setMission, setTeamTimer, completeMission, activateCrystal, arenaStatus, resumeTeamIds } = useArenaStore()
  const [confirmation, setConfirmation] = useState<'activate' | 'mission' | null>(null)
  const [pendingMission, setPendingMission] = useState(0)
  const scheduledResume = resumeTeamIds.includes(team.id)
  const status = getTeamStatus(team, scheduledResume)
  const finished = team.missionCompleted || team.crystalActivated
  const handleActivation = () => {
    if (activateCrystal(team.id)) sendCrystalActivation(team.id)
    setConfirmation(null)
  }

  return <section className="team-admin-card" style={{ '--team': team.color } as CSSProperties} aria-label={team.name}>
    <header><span className="status-dot" /><h2>{team.name}</h2><span className="admin-team-status" data-running={team.missionTimer.isRunning} role="status">{status}</span></header>
    <div className="admin-score"><span className="field-label">Pontuação</span><strong>{team.score.toLocaleString('pt-BR')} <small>PTS</small></strong></div>
    <div className="admin-score-buttons" aria-label={`Pontuação rápida de ${team.name}`}>{[-500, -100, 100, 500].map(delta =>
      <button key={delta} onClick={() => adjustScore(team.id, delta)} aria-label={`${delta > 0 ? 'Adicionar' : 'Remover'} ${Math.abs(delta)} pontos de ${team.name}`}>{delta > 0 ? '+' : '−'}{Math.abs(delta)}</button>)}</div>
    <div className="admin-mission"><span className="field-label">Missão atual</span><h3>{String(team.missionIndex + 1).padStart(2, '0')} — {MISSIONS[team.missionIndex]}</h3></div>
    <span className="field-label">Tempo da missão</span>
    <TimerControls timer={team.missionTimer} disabled={finished || arenaStatus === 'paused'} onChange={patch => setTeamTimer(team.id, patch)} />
    <p className="admin-team-hint">{team.crystalActivated ? 'Equipe concluída. Ativação enviada ao telão.' : team.missionCompleted ? 'Selecione a próxima missão em Ajustes manuais. Depois, clique em Iniciar.' : arenaStatus === 'paused' ? scheduledResume ? 'Retomará ao continuar a arena.' : 'Pausa global. Esta equipe não será iniciada automaticamente.' : 'A conclusão não avança para a próxima missão.'}</p>
    <div className="action-row">{team.missionIndex === 3
      ? <button className="activate" disabled={finished} onClick={() => setConfirmation('activate')}>{team.crystalActivated ? 'Cristal ativado' : 'Ativar cristal'}</button>
      : <button className="accent" disabled={finished} onClick={() => completeMission(team.id)}>{team.missionCompleted ? 'Missão concluída' : 'Concluir missão'}</button>}</div>
    <details className="admin-adjustments"><summary>Ajustes manuais</summary>
      <AdminNumberAdjustment label="Pontuação manual" value={team.score} onApply={value => setScore(team.id, value)} />
      <label>Alterar missão<select value={team.missionIndex} onChange={event => {
        const index = Number(event.target.value)
        if (team.crystalActivated) { setPendingMission(index); setConfirmation('mission') }
        else setMission(team.id, index)
      }}>{MISSIONS.map((mission, index) => <option key={mission} value={index}>{index + 1}. {mission}</option>)}</select></label>
      <p>Trocar de missão zera e para o timer desta equipe.</p>
      <AdminNumberAdjustment label="Tempo da missão (segundos)" value={Math.floor(team.missionTimer.elapsedMs / 1000)} onApply={value => setTeamTimer(team.id, { elapsedMs: value * 1000 })} />
      <button onClick={() => setTeamTimer(team.id, { elapsedMs: 0, isRunning: false })}>Zerar e parar timer</button>
      {scheduledResume && <button onClick={() => setTeamTimer(team.id, { isRunning: false })}>Manter pausada após pausa global</button>}
    </details>
    {confirmation === 'activate' && <AdminConfirmation title={`Ativar cristal do ${team.name}?`} confirmLabel="Ativar cristal" onCancel={() => setConfirmation(null)} onConfirm={handleActivation}><p>Esta ação encerrará a equipe e iniciará a animação de ativação no telão. Não pode ser desfeita pelo histórico.</p></AdminConfirmation>}
    {confirmation === 'mission' && <AdminConfirmation title={`Alterar missão do ${team.name}?`} confirmLabel="Alterar missão" onCancel={() => setConfirmation(null)} onConfirm={() => { setMission(team.id, pendingMission); setConfirmation(null) }}><p>O estado de ativação será removido e o timer zerado. Esta correção não pode ser desfeita pelo histórico.</p></AdminConfirmation>}
  </section>
}
