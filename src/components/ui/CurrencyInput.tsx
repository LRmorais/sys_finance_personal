import { ChangeEvent } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  label?: string
  required?: boolean
  className?: string
}

export default function CurrencyInput({ value, onChange, label, required, className = '' }: Props) {
  function format(val: number): string {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const numeric = parseInt(raw || '0', 10) / 100
    onChange(numeric)
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}{required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={format(value)}
          onChange={handleChange}
          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors ${className}`}
        />
      </div>
    </div>
  )
}
