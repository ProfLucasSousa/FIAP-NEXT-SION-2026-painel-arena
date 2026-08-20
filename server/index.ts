import { createServer } from 'node:http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, { cors: { origin: '*' } })
let latestArenaState: unknown

io.on('connection', (socket) => {
  let role: 'admin' | 'display' | undefined
  socket.on('arena:register', (nextRole: 'admin' | 'display') => { role = nextRole })
  socket.on('arena:state', (state) => {
    if (role !== 'admin') return
    latestArenaState = state
    socket.broadcast.emit('arena:state', state)
  })
  socket.on('arena:request-state', () => {
    if (latestArenaState) socket.emit('arena:state', latestArenaState)
  })
})

httpServer.listen(3001, '0.0.0.0', () => console.log('Symbios Socket server: http://0.0.0.0:3001'))
