import { useId, useState } from 'react'

interface Props { label: string; value: number; onApply: (value: number) => void }
export function AdminNumberAdjustment({ label, value, onApply }: Props) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)
  const valid = text.trim() !== '' && Number.isFinite(Number(text)) && Number(text) >= 0
  return <form className="admin-number-adjustment" onSubmit={event => {
    event.preventDefault()
    if (!valid) return
    onApply(Number(text))
    setDraft(null)
  }}>
    <label htmlFor={id}>{label}</label>
    <div><input id={id} type="number" min="0" step="any" value={text} onChange={event => setDraft(event.target.value)} required /><button type="submit" disabled={!valid}>Aplicar</button></div>
  </form>
}
