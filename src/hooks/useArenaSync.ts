import { useEffect } from 'react'
import { arenaSocket, sendArenaState } from '../lib/socket'
import { subscribeLocalArenaMessages } from '../lib/localSync'
import { useArenaStore } from '../store/arenaStore'
import type { ArenaSnapshot, CrystalActivationEvent } from '../types/arena'

export function useArenaSync(role: 'admin' | 'display', onCrystalActivation?: (event: CrystalActivationEvent) => void) {
  useEffect(() => {
    const socket = arenaSocket
    const receivedActivationIds = new Set<string>()
    const receiveState = (state: ArenaSnapshot) => useArenaStore.getState().hydrateSnapshot(state)
    const receiveActivation = (event: CrystalActivationEvent) => {
      if (receivedActivationIds.has(event.activationId)) return
      receivedActivationIds.add(event.activationId)
      onCrystalActivation?.(event)
    }
    const unsubscribeLocal = subscribeLocalArenaMessages((message) => {
      if (role !== 'display') return
      if (message.type === 'arena:state') receiveState(message.payload)
      else receiveActivation(message.payload)
    })
    const register = () => {
      socket.emit('arena:register', role)
      if (role === 'admin') sendArenaState(useArenaStore.getState())
      else socket.emit('arena:request-state')
    }
    socket.on('arena:state', receiveState)
    socket.on('crystal:activate', receiveActivation)
    socket.on('connect', register)
    socket.connect()
    if (socket.connected) register()
    return () => {
      socket.off('arena:state', receiveState)
      socket.off('crystal:activate', receiveActivation)
      socket.off('connect', register)
      unsubscribeLocal()
      socket.disconnect()
    }
  }, [onCrystalActivation, role])

  useEffect(() => {
    if (role !== 'admin') return
    return useArenaStore.subscribe((state) => sendArenaState({ teams: state.teams, arenaTimer: state.arenaTimer }))
  }, [role])
}
