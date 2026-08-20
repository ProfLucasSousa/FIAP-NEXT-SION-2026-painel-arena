import { useEffect } from 'react'
import { arenaSocket, sendArenaState } from '../lib/socket'
import { useArenaStore } from '../store/arenaStore'

export function useArenaSync(role: 'admin' | 'display') {
  useEffect(() => {
    const socket = arenaSocket
    const receiveState = (state: ReturnType<typeof useArenaStore.getState>) => useArenaStore.getState().hydrateSnapshot(state)
    socket.on('arena:state', receiveState)
    socket.connect()
    socket.on('connect', () => {
      socket.emit('arena:register', role)
      if (role === 'admin') sendArenaState(useArenaStore.getState())
      else socket.emit('arena:request-state')
    })
    return () => { socket.off('arena:state', receiveState); socket.disconnect() }
  }, [role])

  useEffect(() => {
    if (role !== 'admin') return
    return useArenaStore.subscribe((state) => sendArenaState({ teams: state.teams, arenaTimer: state.arenaTimer }))
  }, [role])
}
