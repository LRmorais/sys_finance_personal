import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { fetchIncomes } from '../services/incomes'
import { fetchCreditCards } from '../services/creditCards'
import { fetchExpenses } from '../services/expenses'
import { fetchSavingsGoals } from '../services/savingsGoals'
import { fetchCardInvoices } from '../services/cardInvoices'
import { Download, Upload, LogOut, User, Info } from 'lucide-react'

export default function Settings() {
  const { state, addToast } = useApp()
  const { user } = state
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!user) return
    setExporting(true)
    try {
      const [incomes, cards, expenses, savingsGoals, cardInvoices] = await Promise.all([
        fetchIncomes(user.id),
        fetchCreditCards(user.id),
        fetchExpenses(user.id),
        fetchSavingsGoals(user.id),
        fetchCardInvoices(user.id),
      ])
      const data = { incomes, cards, expenses, savingsGoals, cardInvoices, exportedAt: new Date().toISOString() }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financas-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast('success', 'Dados exportados com sucesso.')
    } catch { addToast('error', 'Erro ao exportar dados.') }
    setExporting(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-3xl">Configurações</h1>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <User size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Conta</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>Dados</h2>
        <Button variant="secondary" onClick={handleExport} loading={exporting} className="w-full justify-start gap-3">
          <Download size={16} />
          Exportar dados como JSON
        </Button>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await file.text()
                JSON.parse(text)
                addToast('info', 'Importação em breve. Por enquanto use o SQL Editor do Supabase.')
              } catch {
                addToast('error', 'Arquivo JSON inválido.')
              }
            }}
          />
          <div className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            <Upload size={16} />
            Importar dados de JSON
          </div>
        </label>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>Sessão</h2>
        <Button variant="danger" onClick={handleLogout} className="w-full justify-start gap-3">
          <LogOut size={16} />
          Sair da conta
        </Button>
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <div className="text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
            <p className="font-medium text-white">Sobre</p>
            <p>Sistema de finanças pessoais. Construído com React + Vite + Supabase.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
