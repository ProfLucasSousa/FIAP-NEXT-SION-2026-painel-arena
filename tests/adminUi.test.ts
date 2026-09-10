import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('Admin renders contextual actions, collapsed corrections and destructive confirmation text', { timeout: 15000 }, async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const channelDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { protocol: 'http:', hostname: '127.0.0.1', pathname: '/admin' } } })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } })
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined })
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' })
  try {
    const { AdminPage } = await vite.ssrLoadModule('/src/pages/AdminPage.tsx')
    const { TeamAdminCard } = await vite.ssrLoadModule('/src/components/TeamAdminCard.tsx')
    const { AdminConfirmation } = await vite.ssrLoadModule('/src/components/AdminConfirmation.tsx')
    const { createInitialArena } = await vite.ssrLoadModule('/src/lib/arenaOperations.ts')
    const admin = renderToStaticMarkup(createElement(AdminPage))
    assert.match(admin, /Iniciar arena/)
    assert.match(admin, /Resetar arena/)
    assert.match(admin, /Últimas ações/)
    for (let missionIndex = 0; missionIndex < 4; missionIndex++) {
      const team = { ...createInitialArena().teams.red, missionIndex }
      const html = renderToStaticMarkup(createElement(TeamAdminCard, { team }))
      assert.match(html, /Ajustes manuais/)
      assert.match(html, /<details class="admin-adjustments">/)
      assert.match(html, /Adicionar 500 pontos/)
      if (missionIndex < 3) {
        assert.match(html, />Concluir missão<\/button>/)
        assert.doesNotMatch(html, />Ativar cristal<\/button>/)
      } else {
        assert.match(html, />Ativar cristal<\/button>/)
        assert.doesNotMatch(html, />Concluir missão<\/button>/)
      }
    }
    const dialog = renderToStaticMarkup(createElement(AdminConfirmation, {
      title: 'Resetar arena?', confirmLabel: 'Resetar arena', onConfirm: () => {}, onCancel: () => {}, children: 'Esta ação não pode ser desfeita.',
    }))
    assert.match(dialog, /<dialog/)
    assert.match(dialog, />Cancelar<\/button>/)
    assert.match(dialog, /aria-describedby/)
  } finally {
    await vite.close()
    for (const [key, descriptor] of [['window', windowDescriptor], ['localStorage', storageDescriptor], ['BroadcastChannel', channelDescriptor]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
