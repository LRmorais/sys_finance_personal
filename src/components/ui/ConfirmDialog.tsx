import Modal from './Modal'
import Button from './Button'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  extra?: {
    label: string
    onClick: () => void
  }
}

export default function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant = 'danger',
  onConfirm,
  extra,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        {message && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {extra && (
            <Button
              variant="secondary"
              onClick={() => { extra.onClick(); onClose() }}
              className="w-full"
            >
              {extra.label}
            </Button>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={() => { onConfirm(); onClose() }}
              className="flex-1"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
