import { useEffect, useState } from 'react'
import { useArenaSync } from '../hooks/useArenaSync'
import { useArenaStore } from '../store/arenaStore'
import { TeamAdminCard } from '../components/TeamAdminCard'
import { AdminConfirmation } from '../components/AdminConfirmation'
import { AdminNumberAdjustment } from '../components/AdminNumberAdjustment'
import { AdminHistory } from '../components/AdminHistory'
import { formatTime } from '../lib/time'
import { TEAM_IDS } from '../types/arena'
import './admin.css'

export function AdminPage() {
  const { teams, arenaTimer, arenaStatus, setArenaTimer, startArena, pauseArena, resumeArena, tick, reset } = useArenaStore()
  const [confirmReset, setConfirmReset] = useState(false)
  useArenaSync('admin')
  useEffect(() => {
    tick()
    const id = window.setInterval(tick, 1000)
    const refresh = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', refresh) }
  }, [tick])
  const waiting = arenaStatus === 'waiting'
  const running = arenaStatus === 'running'
  return <main className="admin-shell">
    <header className="admin-header"><div><span className="eyebrow">SYMBIOS ARENA · CONTROLE OPERACIONAL</span><h1>Centro de comando</h1></div><button className="danger" onClick={() => setConfirmReset(true)}>Resetar arena</button></header>
    <section className="arena-clock" aria-label="Controle geral da arena">
      <div><span className="field-label">Tempo da arena</span><output>{formatTime(arenaTimer.elapsedMs)}</output></div>
      <div className="arena-clock__operation"><span className="admin-arena-status" role="status">{waiting ? 'AGUARDANDO INÍCIO' : running ? 'ARENA EM ANDAMENTO' : 'ARENA PAUSADA'}</span><button className="admin-primary" onClick={waiting ? startArena : running ? pauseArena : resumeArena}>{waiting ? '▶ Iniciar arena' : running ? '❚❚ Pausar arena' : '▶ Continuar arena'}</button></div>
      <p>{waiting ? 'Inicia o tempo geral e as três equipes em Encontrar.' : running ? 'As próximas missões são selecionadas e iniciadas manualmente.' : 'Continuar retoma somente as equipes que estavam rodando antes da pausa.'}</p>
      <details className="admin-adjustments"><summary>Ajustar tempo geral</summary><AdminNumberAdjustment label="Tempo geral (segundos)" value={Math.floor(arenaTimer.elapsedMs / 1000)} onApply={value => setArenaTimer({ elapsedMs: value * 1000 })} /><button onClick={() => setArenaTimer({ elapsedMs: 0, isRunning: false })}>Zerar e parar tempo geral</button></details>
    </section>
    <h2 className="admin-section-title">Ações durante a arena</h2>
    <div className="team-admin-grid">{TEAM_IDS.map(id => <TeamAdminCard team={teams[id]} key={id} />)}</div>
    <AdminHistory />
    {confirmReset && <AdminConfirmation title="Resetar arena?" confirmLabel="Resetar arena" onCancel={() => setConfirmReset(false)} onConfirm={() => { reset(); setConfirmReset(false) }}><p>Esta ação irá zerar:</p><ul><li>Tempo geral e timers das equipes</li><li>Pontuações e missões</li><li>Ativações e estado dos cristais</li></ul><p>Esta ação não pode ser desfeita. O histórico recente será mantido para consulta.</p></AdminConfirmation>}
  </main>
}
