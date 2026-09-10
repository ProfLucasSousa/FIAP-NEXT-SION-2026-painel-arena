import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void }
export function AdminConfirmation({ title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    cancel.current?.focus()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog className="admin-confirmation" ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id={titleId}>{title}</h2>
    <div id={descriptionId}>{children}</div>
    <div className="admin-confirmation__actions"><button ref={cancel} onClick={onCancel}>Cancelar</button><button className="danger" onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>
}
