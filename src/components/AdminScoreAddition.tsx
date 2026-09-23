import { useEffect, useId, useRef, useState } from 'react'

interface Props {
  teamName: string
  onAdd: (value: number) => void
}

export function AdminScoreAddition({ teamName, onAdd }: Props) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState('')
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const value = Number(draft)
  const valid = draft.trim() !== '' && Number.isFinite(value) && value > 0

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  return <form className="admin-score-addition" onSubmit={event => {
    event.preventDefault()
    if (!valid) return
    const points = Math.trunc(value)
    onAdd(points)
    setDraft('')
    setFeedback(`+${points.toLocaleString('pt-BR')} pontos adicionados`)
    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2200)
  }}>
    <label htmlFor={id}>Adicionar pontos</label>
    <div><input id={id} aria-label={`Pontos para adicionar ao ${teamName}`} type="number" min="1" step="1" placeholder="Valor" value={draft} onChange={event => { setDraft(event.target.value); setFeedback('') }} /><button type="submit" disabled={!valid}>Adicionar</button></div>
    <small role="status" aria-live="polite">{feedback}</small>
  </form>
}
