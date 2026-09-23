import { useEffect, useState } from 'react'
import { useArenaSync } from '../hooks/useArenaSync'
import { useArenaStore } from '../store/arenaStore'
import { TeamAdminCard } from '../components/TeamAdminCard'
import { AdminConfirmation } from '../components/AdminConfirmation'
import { AdminHistory } from '../components/AdminHistory'
import { formatTime } from '../lib/time'
import { MISSIONS, TEAM_IDS } from '../types/arena'
import './admin.css'

const PHASE_STATUS_LABEL = {
  ready: 'AGUARDANDO INÍCIO',
  running: 'FASE EM ANDAMENTO',
  paused: 'FASE PAUSADA',
  finished: 'FASE ENCERRADA',
} as const

export function AdminPage() {
  const {
    teams, phaseIndex, phaseTimer, phaseStatus, firstCompletionTriggered,
    startPhase, pausePhase, resumePhase, prepareNextPhase, tick, reset,
  } = useArenaStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const finalPhase = phaseIndex === MISSIONS.length - 1

  useArenaSync('admin')
  useEffect(() => {
    tick()
    const id = window.setInterval(tick, 250)
    const refresh = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [tick])

  const phaseAction = phaseStatus === 'ready'
    ? startPhase
    : phaseStatus === 'running'
      ? pausePhase
      : phaseStatus === 'paused'
        ? resumePhase
        : prepareNextPhase
  const phaseActionLabel = phaseStatus === 'ready'
    ? '▶ Iniciar fase'
    : phaseStatus === 'running'
      ? '❚❚ Pausar fase'
      : phaseStatus === 'paused'
        ? '▶ Continuar fase'
        : finalPhase
          ? 'Competição concluída'
          : `Preparar fase ${String(phaseIndex + 2).padStart(2, '0')}`

  return <main className="admin-shell">
    <header className="admin-header">
      <div><span className="eyebrow">SYMBIOS ARENA · CONTROLE OPERACIONAL</span><h1>Centro de comando</h1></div>
      <button className="danger" onClick={() => setConfirmReset(true)}>Resetar arena</button>
    </header>

    <section className="arena-clock" aria-label="Controle da fase atual" data-final-window={firstCompletionTriggered || undefined}>
      <div className="arena-clock__phase">
        <span className="field-label">Fase {String(phaseIndex + 1).padStart(2, '0')}</span>
        <strong>{MISSIONS[phaseIndex]}</strong>
      </div>
      <div className="arena-clock__timer">
        <span className="field-label">{firstCompletionTriggered ? 'Janela final' : 'Tempo da fase'}</span>
        <output>{formatTime(phaseTimer.remainingMs)}</output>
      </div>
      <div className="arena-clock__operation">
        <span className="admin-arena-status" role="status">{PHASE_STATUS_LABEL[phaseStatus]}</span>
        <button className="admin-primary" disabled={phaseStatus === 'finished' && finalPhase} onClick={phaseAction}>{phaseActionLabel}</button>
      </div>
      <p>{phaseStatus === 'ready'
        ? 'O cronômetro compartilhado começa somente com o acionamento manual.'
        : phaseStatus === 'finished'
          ? finalPhase ? 'A fase final foi encerrada.' : 'Prepare a próxima fase quando a operação estiver pronta.'
          : firstCompletionTriggered
            ? 'A primeira conclusão definiu o tempo restante em 02:00. As demais equipes compartilham esta janela.'
            : 'A primeira equipe a concluir definirá o tempo restante em exatamente 02:00.'}</p>
    </section>

    <h2 className="admin-section-title">Equipes na fase atual</h2>
    <div className="team-admin-grid">{TEAM_IDS.map(id => <TeamAdminCard team={teams[id]} key={id} />)}</div>
    <AdminHistory />

    {confirmReset && <AdminConfirmation title="Resetar arena?" confirmLabel="Resetar arena" onCancel={() => setConfirmReset(false)} onConfirm={() => { reset(); setConfirmReset(false) }}>
      <p>Esta ação irá restaurar:</p>
      <ul><li>Fase 01 — Encontrar, com 08:00</li><li>Pontuações e status das equipes</li><li>Ativações e estado dos cristais</li></ul>
      <p>Esta ação não pode ser desfeita. O histórico recente será mantido para consulta.</p>
    </AdminConfirmation>}
  </main>
}
