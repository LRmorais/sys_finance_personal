import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useConfirm } from '../context/ConfirmContext'
import ProjectionLine from '../components/charts/ProjectionLine'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatCurrency } from '../utils/currency'
import { addMonthsToDate, MONTHS_PT } from '../utils/dates'
import { getMonthIncomes, getMonthExpenses, getTotalIncomes, getTotalExpenses } from '../utils/calculations'
import { updateExpense, deleteExpense } from '../services/expenses'
import { Expense } from '../types'
import { CheckCircle, Trash2, AlertTriangle } from 'lucide-react'

export default function Projections() {
  const { state, dispatch, addToast } = useApp()
  const confirm = useConfirm()
  const { incomes, expenses, selectedMonth, selectedYear, simulationMode } = state

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => addMonthsToDate(selectedMonth, selectedYear, i)),
    [selectedMonth, selectedYear]
  )

  const projections = useMemo(() =>
    months.map(({ month, year }) => {
      const prev = addMonthsToDate(month, year, -1)
      const mi   = getMonthIncomes(incomes, month, year)
      // Cash/débito do mês corrente + faturas do mês anterior (o que sai do bolso este mês)
      const cash    = getMonthExpenses(expenses, month, year).filter(e => !e.cardId && !e.isSimulation)
      const invoice = getMonthExpenses(expenses, prev.month, prev.year).filter(e => e.cardId && !e.isSimulation)
      const cashSim    = getMonthExpenses(expenses, month, year).filter(e => !e.cardId)
      const invoiceSim = getMonthExpenses(expenses, prev.month, prev.year).filter(e => e.cardId)
      const income  = getTotalIncomes(mi)
      const expense = getTotalExpenses(cash) + getTotalExpenses(invoice)
      const expenseSim = getTotalExpenses(cashSim) + getTotalExpenses(invoiceSim)
      return {
        month: `${MONTHS_PT[month - 1].slice(0, 3)}/${String(year).slice(2)}`,
        monthFull: MONTHS_PT[month - 1],
        year,
        income,
        expense,
        balance: income - expense,
        balanceSim: income - expenseSim,
      }
    }),
    [incomes, expenses, months]
  )

  const lineData = projections.map(p => ({
    month: p.month,
    real: p.balance,
    simulado: p.balanceSim,
  }))

  const simExpenses = useMemo(() =>
    expenses.filter(e => e.isSimulation),
    [expenses]
  )

  async function effectuate(exp: Expense) {
    try {
      const updated = await updateExpense(exp.id, { isSimulation: false })
      dispatch({ type: 'UPDATE_EXPENSE', payload: updated })
      addToast('success', 'Gasto efetivado.')
    } catch { addToast('error', 'Erro ao efetivar.') }
  }

  async function remove(exp: Expense) {
    if (!await confirm({ title: 'Remover simulação?', message: 'Este gasto simulado será excluído permanentemente.' })) return
    try {
      dispatch({ type: 'DELETE_EXPENSE', payload: exp.id })
      await deleteExpense(exp.id)
      addToast('success', 'Simulação removida.')
    } catch { addToast('error', 'Erro ao remover.') }
  }

  function toggleSimMode() {
    dispatch({ type: 'SET_SIMULATION_MODE', payload: !simulationMode })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Projeções</h1>
        <Button
          variant={simulationMode ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleSimMode}
          className={simulationMode ? 'border-amber-500/40 text-amber-400' : ''}
        >
          <AlertTriangle size={14} />
          {simulationMode ? 'Desativar Simulação' : 'Modo Simulação'}
        </Button>
      </div>

      {simulationMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">Modo Simulação ativo — gastos simulados mostram impacto no gráfico</p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-display text-lg mb-4">Saldo Projetado — 12 meses</h2>
        <ProjectionLine data={lineData} showSimulation={simExpenses.length > 0} />
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-3" style={{ minWidth: 'max-content' }}>
          {projections.map((p, i) => (
            <div key={i} className="card p-4 w-44 shrink-0">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>{p.monthFull} {p.year}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-muted)' }}>Entrada</span>
                  <span className="text-emerald-400 text-xs font-medium">{formatCurrency(p.income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-muted)' }}>Gastos</span>
                  <span className="text-rose-400 text-xs font-medium">{formatCurrency(p.expense)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-medium">Saldo</span>
                  <span className={`text-xs font-display ${p.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(p.balance)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {simExpenses.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg mb-4">Gastos Simulados</h2>
          <div className="space-y-2">
            {simExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{exp.description}</p>
                    <Badge variant="simulation"><AlertTriangle size={10} /> Sim</Badge>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {MONTHS_PT[exp.billingMonth - 1]} {exp.billingYear}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm text-rose-400">{formatCurrency(exp.totalAmount)}</span>
                  <button onClick={() => effectuate(exp)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer">
                    <CheckCircle size={12} /> Efetivar
                  </button>
                  <button onClick={() => remove(exp)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
