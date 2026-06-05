import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  variant?: 'emerald' | 'red' | 'amber' | 'blue' | 'muted' | 'simulation'
}

const variants = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  red: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  muted: 'bg-white/5 text-white/50 border border-white/10',
  simulation: 'bg-amber-500/10 text-amber-400 border border-dashed border-amber-500/40',
}

export default function Badge({ children, variant = 'muted' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
