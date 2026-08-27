import { createServer as createViteServer } from 'vite'
import './index'

const vite = await createViteServer()
await vite.listen()
vite.printUrls()
