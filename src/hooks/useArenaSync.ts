import { useEffect } from 'react'
import { arenaSocket, sendArenaState } from '../lib/socket'
import { publishLocalArenaMessage, subscribeLocalArenaMessages } from '../lib/localSync'
import { toArenaSnapshot, useArenaStore } from '../store/arenaStore'
import type { ArenaSnapshot, CrystalActivationEvent } from '../types/arena'

export function useArenaSync(role: 'admin' | 'display', onCrystalActivation?: (event: CrystalActivationEvent) => void) {
  useEffect(() => {
    const socket = arenaSocket
    const store = useArenaStore
    const receivedActivationIds = new Set<string>()
    // Admin is the manual source of truth, not a consumer of relay snapshots.
    const receiveState = (state: ArenaSnapshot) => { if (role === 'display') store.getState().hydrateSnapshot(state) }
    const publishState = () => sendArenaState(toArenaSnapshot(store.getState()))
    const receiveActivation = (event: CrystalActivationEvent) => {
      if (receivedActivationIds.has(event.activationId)) return
      receivedActivationIds.add(event.activationId)
      onCrystalActivation?.(event)
    }
    const unsubscribeLocal = subscribeLocalArenaMessages((message) => {
      if (message.type === 'arena:request-state') {
        if (role === 'admin') publishState()
        return
      }
      if (role !== 'display') return
      if (message.type === 'arena:state') receiveState(message.payload)
      else receiveActivation(message.payload)
    })
    const register = () => {
      socket.emit('arena:register', role)
      if (role === 'admin') publishState()
      else socket.emit('arena:request-state')
    }
    socket.on('arena:state', receiveState)
    socket.on('crystal:activate', receiveActivation)
    socket.on('connect', register)
    // Capture the same store for registration and ongoing publication. Rebind
    // the entire lifecycle if HMR replaces that store or the socket instance.
    const unsubscribeStore = role === 'admin' ? store.subscribe(publishState) : () => {}
    if (socket.connected) register()
    else socket.connect()
    if (role === 'display') publishLocalArenaMessage({ type: 'arena:request-state' })
    return () => {
      socket.off('arena:state', receiveState)
      socket.off('crystal:activate', receiveActivation)
      socket.off('connect', register)
      unsubscribeLocal()
      unsubscribeStore()
      socket.disconnect()
    }
  }, [onCrystalActivation, role, useArenaStore, arenaSocket, sendArenaState, subscribeLocalArenaMessages, publishLocalArenaMessage])
}
