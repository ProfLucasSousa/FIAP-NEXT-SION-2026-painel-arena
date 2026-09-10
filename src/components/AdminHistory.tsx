import { useArenaStore } from '../store/arenaStore'

export function AdminHistory() {
  const { history, undo, undoLastAction } = useArenaStore()
  return <section className="admin-history" aria-labelledby="admin-history-title">
    <header><div><h2 id="admin-history-title">Últimas ações</h2><p>Até 80 registros locais. Desfazer vale apenas para a última alteração de pontuação ou missão; timers retornam parados.</p></div><button disabled={!undo} title={undo?.label ?? 'A última ação não pode ser desfeita com segurança'} onClick={undoLastAction}>↶ Desfazer</button></header>
    {history.length === 0 ? <p>Nenhuma ação registrada.</p> : <ol>{history.map((entry, index) => <li key={entry.id}>
      <time dateTime={new Date(entry.timestamp).toISOString()}>{new Date(entry.timestamp).toLocaleTimeString('pt-BR')}</time><span>{entry.description}</span><small>{index === 0 && undo ? 'Desfazer disponível' : !entry.reversible ? 'Não reversível' : 'Registro'}</small>
    </li>)}</ol>}
  </section>
}
