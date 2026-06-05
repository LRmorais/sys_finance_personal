import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error: <XCircle size={16} className="text-rose-400" />,
  info: <Info size={16} className="text-blue-400" />,
}

const colors = {
  success: 'border-emerald-500/30',
  error: 'border-rose-500/30',
  info: 'border-blue-500/30',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`card flex items-center gap-3 px-4 py-3 animate-fade-in border ${colors[toast.type]} min-w-[260px] max-w-sm`}
        >
          {icons[toast.type]}
          <span className="flex-1 text-sm">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="cursor-pointer opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
