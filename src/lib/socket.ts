import { io } from 'socket.io-client'
import type { ArenaSnapshot, CrystalActivationEvent, TeamId } from '../types/arena'
import { publishLocalArenaMessage } from './localSync'

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`
export const arenaSocket = io(socketUrl, { autoConnect: false })
export const sendArenaState = (state: ArenaSnapshot) => {
  arenaSocket.emit('arena:state', state)
  publishLocalArenaMessage({ type: 'arena:state', payload: state })
}
export const sendCrystalActivation = (teamId: TeamId) => {
  const event: CrystalActivationEvent = {
    activationId: globalThis.crypto?.randomUUID?.() ?? `${teamId}-${Date.now()}`,
    teamId,
    emittedAt: Date.now(),
  }
  arenaSocket.emit('crystal:activate', event)
  publishLocalArenaMessage({ type: 'crystal:activate', payload: event })
}
