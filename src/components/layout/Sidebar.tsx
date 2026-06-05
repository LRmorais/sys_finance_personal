import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, CreditCard, Receipt,
  PiggyBank, BarChart3, Settings, LogOut, Menu, CalendarDays, Landmark
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monthly', icon: CalendarDays, label: 'Mensal Fixo' },
  { to: '/checking', icon: Landmark, label: 'Conta Corrente' },
  { to: '/incomes', icon: TrendingUp, label: 'Entradas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/expenses', icon: Receipt, label: 'Gastos' },
  { to: '/savings', icon: PiggyBank, label: 'Poupança' },
  { to: '/projections', icon: BarChart3, label: 'Projeções' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const content = (
    <aside
      className="flex flex-col h-full py-6 px-4"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="mb-8 px-2">
        <h1 className="font-display text-xl text-emerald-400">Finanças</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Controle Pessoal</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'hover:bg-white/5 text-white/60 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer mt-4"
      >
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block w-56 shrink-0 h-screen sticky top-0">
        {content}
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl cursor-pointer"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="w-64 h-full" onClick={e => e.stopPropagation()}>
            {content}
          </div>
          <div className="flex-1 bg-black/50" />
        </div>
      )}
    </>
  )
}
