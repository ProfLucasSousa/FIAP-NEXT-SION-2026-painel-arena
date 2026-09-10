import { createServer as createViteServer } from 'vite'
import './index'

const vite = await createViteServer()
await vite.listen()
vite.printUrls()

for (const scope of ['local', 'network'] as const) {
  for (const url of vite.resolvedUrls?.[scope] ?? []) {
    const label = scope === 'local' ? 'Local' : 'Rede'
    console.log(`  ${label} Admin:   ${new URL('admin', url).href}`)
    console.log(`  ${label} Display: ${new URL('display', url).href}`)
  }
}
