import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { readFileSync } from 'node:fs'

test('Admin exposes the shared phase clock, exact scores and separate manual total', { timeout: 15000 }, async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const channelDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { protocol: 'http:', hostname: '127.0.0.1', pathname: '/admin' }, setInterval: () => 1, clearInterval: () => {} } })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } })
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined })
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' })
  try {
    const { AdminPage } = await vite.ssrLoadModule('/src/pages/AdminPage.tsx')
    const { TeamAdminCard } = await vite.ssrLoadModule('/src/components/TeamAdminCard.tsx')
    const { AdminConfirmation } = await vite.ssrLoadModule('/src/components/AdminConfirmation.tsx')
    const { createInitialArena } = await vite.ssrLoadModule('/src/lib/arenaOperations.ts')

    const admin = renderToStaticMarkup(createElement(AdminPage))
    assert.match(admin, /Iniciar fase/)
    assert.match(admin, /08:00/)
    assert.match(admin, /Encontrar/)
    assert.match(admin, /Resetar arena/)
    assert.doesNotMatch(admin, /Ajustar tempo/)

    const regularCard = renderToStaticMarkup(createElement(TeamAdminCard, { team: createInitialArena().teams.red }))
    for (const value of ['+100', '+200', '+300', '−25', '−100', '−200', '−300']) assert.match(regularCard, new RegExp(value.replace('+', '\\+')))
    assert.match(regularCard, /Adicionar pontos/)
    assert.match(regularCard, /Definir pontuação total/)
    assert.match(regularCard, />Concluir missão<\/button>/)
    assert.doesNotMatch(regularCard, />Ativar cristal<\/button>/)

    const cardSource = readFileSync(new URL('../src/components/TeamAdminCard.tsx', import.meta.url), 'utf8')
    assert.match(cardSource, /phaseIndex === 3/)
    assert.match(cardSource, /Ativar cristal/)

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
