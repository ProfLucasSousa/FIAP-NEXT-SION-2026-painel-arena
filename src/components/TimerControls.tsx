import type { Timer } from '../types/arena'
import { formatTime } from '../lib/time'

interface Props { timer: Timer; onChange: (patch: Partial<Timer>) => void }
export function TimerControls({ timer, onChange }: Props) {
  return <div className="timer-controls"><output>{formatTime(timer.elapsedMs)}</output><div><button onClick={() => onChange({ isRunning: !timer.isRunning })}>{timer.isRunning ? 'Pausar' : 'Iniciar'}</button><button onClick={() => onChange({ elapsedMs: 0, isRunning: false })}>Resetar</button></div></div>
}
