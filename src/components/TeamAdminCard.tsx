import { MISSIONS, type Team } from '../types/arena'
import { useArenaStore } from '../store/arenaStore'
import { sendCrystalActivation } from '../lib/socket'
import { TimerControls } from './TimerControls'

export function TeamAdminCard({ team }: { team: Team }) {
  const { setScore, setMission, setTeamTimer, completeMission, activateCrystal } = useArenaStore()
  const handleActivation = () => {
    if (team.crystalActivated) return
    sendCrystalActivation(team.id)
    activateCrystal(team.id)
  }

  return <section className="team-admin-card" style={{ '--team': team.color } as React.CSSProperties}><header><span className="status-dot" /><h2>{team.name}</h2></header><label>Pontuação<input type="number" min="0" value={team.score} onChange={(e) => setScore(team.id, Number(e.target.value))} /></label><label>Missão atual<select value={team.missionIndex} onChange={(e) => setMission(team.id, Number(e.target.value))}>{MISSIONS.map((mission, index) => <option value={index} key={mission}>{index + 1}. {mission}</option>)}</select></label><span className="field-label">Tempo da missão</span><TimerControls timer={team.missionTimer} onChange={(patch) => setTeamTimer(team.id, patch)} /><div className="action-row"><button className="accent" onClick={() => completeMission(team.id)}>Concluir missão</button><button className="activate" disabled={team.crystalActivated} onClick={handleActivation}>{team.crystalActivated ? 'Cristal ativado' : 'Ativar cristal'}</button></div></section>
}
