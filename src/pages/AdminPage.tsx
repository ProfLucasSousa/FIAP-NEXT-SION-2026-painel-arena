import { useEffect } from 'react'
import { useArenaSync } from '../hooks/useArenaSync'
import { useArenaStore } from '../store/arenaStore'
import { TimerControls } from '../components/TimerControls'
import { TeamAdminCard } from '../components/TeamAdminCard'

export function AdminPage() { const { teams, arenaTimer, setArenaTimer, tick, reset } = useArenaStore(); useArenaSync('admin'); useEffect(() => { const id = window.setInterval(tick, 1000); return () => window.clearInterval(id) }, [tick]); return <main className="admin-shell"><header className="admin-header"><div><span className="eyebrow">SYMBIOS ARENA · CONTROLE OPERACIONAL</span><h1>Centro de comando</h1></div><button className="danger" onClick={reset}>Resetar arena</button></header><section className="arena-clock"><div><span className="field-label">Tempo geral da arena</span><TimerControls timer={arenaTimer} onChange={setArenaTimer} /></div><p>As alterações são transmitidas instantaneamente para os telões conectados.</p></section><div className="team-admin-grid">{Object.values(teams).map((team) => <TeamAdminCard team={team} key={team.id} />)}</div></main> }
