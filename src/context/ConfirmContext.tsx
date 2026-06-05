import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'
import ConfirmDialog from '../components/ui/ConfirmDialog'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false))

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen]       = useState(false)
  const [opts, setOpts]       = useState<ConfirmOptions>({ title: '' })
  const resolveRef            = useRef<(v: boolean) => void>(() => {})

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options)
    setOpen(true)
    return new Promise(resolve => { resolveRef.current = resolve })
  }, [])

  function handleConfirm() {
    setOpen(false)
    resolveRef.current(true)
  }

  function handleClose() {
    setOpen(false)
    resolveRef.current(false)
  }

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
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}
