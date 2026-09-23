import { MISSIONS } from '../types/arena'

// A carga visual é determinada apenas pela fase compartilhada da arena.
// Os quatro estágios normalizados selecionam cargas internas de 25%, 50%, 75% e 100%.
export function getCrystalProgress(phaseIndex: number) {
  const boundedPhase = Math.min(MISSIONS.length - 1, Math.max(0, Math.trunc(phaseIndex)))
  return boundedPhase / (MISSIONS.length - 1)
}
