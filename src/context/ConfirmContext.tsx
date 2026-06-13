import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'
import ConfirmDialog from '../components/ui/ConfirmDialog'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  extra?: { label: string }
}

type ConfirmResult = 'confirm' | 'extra' | false
type ConfirmFn = (opts: ConfirmOptions) => Promise<ConfirmResult>

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false))

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen]       = useState(false)
  const [opts, setOpts]       = useState<ConfirmOptions>({ title: '' })
  const resolveRef            = useRef<(v: ConfirmResult) => void>(() => {})

  const confirm = useCallback((options: ConfirmOptions): Promise<ConfirmResult> => {
    setOpts(options)
    setOpen(true)
    return new Promise(resolve => { resolveRef.current = resolve })
  }, [])

  function handleConfirm() { setOpen(false); resolveRef.current('confirm') }
  function handleExtra()   { setOpen(false); resolveRef.current('extra')   }
  function handleClose()   { setOpen(false); resolveRef.current(false)     }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={opts.title}
        message={opts.message}
        confirmLabel={opts.confirmLabel}
        variant={opts.variant ?? 'danger'}
        extra={opts.extra ? { label: opts.extra.label, onClick: handleExtra } : undefined}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}
