import { io } from 'socket.io-client'
import type { ArenaSnapshot } from '../types/arena'

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`
export const arenaSocket = io(socketUrl, { autoConnect: false })
export const sendArenaState = (state: ArenaSnapshot) => arenaSocket.emit('arena:state', state)
