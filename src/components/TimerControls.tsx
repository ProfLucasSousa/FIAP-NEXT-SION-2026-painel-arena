import type { Timer } from '../types/arena'
import { formatTime } from '../lib/time'

interface Props { timer: Timer; onChange: (patch: Partial<Timer>) => void; disabled?: boolean }
export function TimerControls({ timer, onChange, disabled = false }: Props) {
  const started = timer.updatedAt !== undefined || timer.elapsedMs > 0
  return <div className="timer-controls"><output aria-label="Tempo da missão">{formatTime(timer.elapsedMs)}</output><button disabled={disabled} onClick={() => onChange({ isRunning: !timer.isRunning })}>{timer.isRunning ? 'Pausar' : started ? 'Continuar' : 'Iniciar'}</button></div>
}
