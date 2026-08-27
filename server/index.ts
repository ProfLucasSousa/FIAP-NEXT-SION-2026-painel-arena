import { createServer } from 'node:http'
import { Server } from 'socket.io'
import type { CrystalActivationEvent } from '../src/types/arena'

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok', service: 'symbios-socket' }))
    return
  }

  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end('Symbios Socket.IO ativo. Abra a aplicação em http://localhost:5173.')
})
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
  socket.on('crystal:activate', (event: CrystalActivationEvent) => {
    if (role !== 'admin') return
    socket.broadcast.emit('crystal:activate', event)
  })
  socket.on('arena:request-state', () => {
    if (latestArenaState) socket.emit('arena:state', latestArenaState)
  })
})

httpServer.listen(3001, '0.0.0.0', () => {
  console.log('Symbios Socket.IO ativo em http://localhost:3001')
  console.log('Aplicação local: http://localhost:5173')
})
