import type { ArenaSnapshot, CrystalActivationEvent } from '../types/arena'

type ArenaLocalMessage =
  | { type: 'arena:state'; payload: ArenaSnapshot }
  | { type: 'crystal:activate'; payload: CrystalActivationEvent }

const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('symbios-arena-sync')

export function publishLocalArenaMessage(message: ArenaLocalMessage) {
  channel?.postMessage(message)
}

export function subscribeLocalArenaMessages(listener: (message: ArenaLocalMessage) => void) {
  if (!channel) return () => undefined
  const receiveMessage = (event: MessageEvent<ArenaLocalMessage>) => listener(event.data)
  channel.addEventListener('message', receiveMessage)
  return () => channel.removeEventListener('message', receiveMessage)
}
