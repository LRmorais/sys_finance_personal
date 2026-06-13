import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import MonthNavigator from '../components/ui/MonthNavigator'
import IncomeExpenseBar from '../components/charts/IncomeExpenseBar'
import CategoryDonut from '../components/charts/CategoryDonut'
import { formatCurrency } from '../utils/currency'
import { getMonthIncomes, getMonthExpenses, getTotalIncomes, getTotalExpenses, getCardInvoiceTotal } from '../utils/calculations'
import { addMonthsToDate, formatMonthYear, MONTHS_PT } from '../utils/dates'
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import { ExpenseCategory } from '../types'
import { categoryLabel } from '../utils/categories'

function SummaryCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: any; color: string; sub?: string
}) {
  return (
    <div className="card card-hover p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="font-display text-2xl" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { state } = useApp()
  const { expenses, incomes, cards, savingsGoals, cardInvoices, selectedMonth, selectedYear, simulationMode } = state

  // Mês anterior — faturas geradas lá são pagas neste mês
  const prevMonth = useMemo(
    () => addMonthsToDate(selectedMonth, selectedYear, -1),
    [selectedMonth, selectedYear]
  )

  const monthIncomes = useMemo(
    () => getMonthIncomes(incomes, selectedMonth, selectedYear),
    [incomes, selectedMonth, selectedYear]
  )

  // Gastos do mês corrente visíveis na tela (para gráficos / categoria)
  const monthExpenses = useMemo(
    () => getMonthExpenses(expenses, selectedMonth, selectedYear).filter(e => !e.isSimulation),
    [expenses, selectedMonth, selectedYear]
  )

  // Gastos em dinheiro/débito do mês corrente → saem imediatamente do saldo
  const cashExpenses = useMemo(
    () => monthExpenses.filter(e => !e.cardId),
    [monthExpenses]
  )

  // Faturas a PAGAR este mês = despesas no cartão do mês ANTERIOR
  // (a fatura do mês passado fecha agora e vence agora)
  const prevMonthCardExpenses = useMemo(
    () => getMonthExpenses(expenses, prevMonth.month, prevMonth.year)
           .filter(e => e.cardId && !e.isSimulation),
    [expenses, prevMonth]
  )

  const totalIncome    = getTotalIncomes(monthIncomes)
  const totalCash      = getTotalExpenses(cashExpenses)
  const totalInvoices  = getTotalExpenses(prevMonthCardExpenses)   // faturas DO MÊS PASSADO, pagas agora
  const balance        = totalIncome - totalCash - totalInvoices   // saldo real do mês
  const totalSaved     = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)

  // Gráfico de barras: gastos em dinheiro + total de cartão DO MÊS ANTERIOR (o que sai do bolso)
  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const cur  = addMonthsToDate(selectedMonth, selectedYear, i - 5)
      const prev = addMonthsToDate(cur.month, cur.year, -1)
      const mi   = getMonthIncomes(incomes, cur.month, cur.year)
      const cash = getMonthExpenses(expenses, cur.month, cur.year).filter(e => !e.cardId && !e.isSimulation)
      const card = getMonthExpenses(expenses, prev.month, prev.year).filter(e => e.cardId && !e.isSimulation)
      return {
        month: MONTHS_PT[cur.month - 1].slice(0, 3),
        entradas: getTotalIncomes(mi),
        gastos: getTotalExpenses(cash) + getTotalExpenses(card),
      }
    })
  }, [incomes, expenses, selectedMonth, selectedYear])

  // Rosca: distribuição por categoria dos gastos lançados neste mês (débito + cartão corrente)
  const donutData = useMemo(() => {
    const map: Record<string, number> = {}
    monthExpenses.forEach(e => {
      const amount = e.type === 'installment' ? (e.installmentAmount ?? 0) : e.totalAmount
      map[e.category] = (map[e.category] ?? 0) + amount
    })
    return Object.entries(map)
      .map(([cat, value]) => ({ name: categoryLabel(cat as ExpenseCategory), value }))
      .sort((a, b) => b.value - a.value)
  }, [monthExpenses])

  // Próximos vencimentos: dueDay do cartão neste mês, valor = fatura do MÊS ANTERIOR
  const upcoming = useMemo(() => {
    const now   = new Date()
    const limit = new Date(now)
    limit.setDate(limit.getDate() + 15)
    const results: { label: string; date: Date; amount: number }[] = []

    cards.forEach(card => {
      // A fatura que vence agora é a do mês passado
      const invoice = cardInvoices.find(
        inv => inv.cardId === card.id && inv.month === prevMonth.month && inv.year === prevMonth.year
      )
      if (!invoice?.isPaid) {
        const due = new Date(selectedYear, selectedMonth - 1, card.dueDay)
        if (due >= now && due <= limit) {
          const amount = getCardInvoiceTotal(expenses, card.id, prevMonth.month, prevMonth.year)
          if (amount > 0) {
            results.push({ label: `Fatura ${card.name}`, date: due, amount })
          }
        }
      }
    })

    return results.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [cards, cardInvoices, expenses, prevMonth, selectedMonth, selectedYear])

  const prevMonthLabel = formatMonthYear(prevMonth.month, prevMonth.year)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <MonthNavigator />
      </div>

      {simulationMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">Modo Simulação ativo — gastos simulados não estão incluídos nos totais</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Entradas"
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          color="#10b981"
        />
        <SummaryCard
          label="Faturas a pagar"
          value={formatCurrency(totalInvoices)}
          icon={TrendingDown}
          color="#f43f5e"
          sub={`Ref. ${prevMonthLabel}`}
        />
        <SummaryCard
          label="Saldo Disponível"
          value={formatCurrency(balance)}
          icon={Wallet}
          color={balance >= 0 ? '#10b981' : '#f43f5e'}
          sub="Entradas − débito − faturas"
        />
        <SummaryCard
          label="Total Poupado"
          value={formatCurrency(totalSaved)}
          icon={PiggyBank}
          color="#6366f1"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display text-lg mb-4">Entradas vs Gastos</h2>
          <IncomeExpenseBar data={barData} />
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg mb-4">Gastos por Categoria</h2>
          <CategoryDonut data={donutData} />
          <div className="mt-3 grid grid-cols-2 gap-1">
            {donutData.slice(0, 6).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ['#10b981','#6366f1','#f59e0b','#f43f5e','#3b82f6','#ec4899'][i] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg mb-4">Próximos Vencimentos (15 dias)</h2>
          <div className="space-y-3">
            {upcoming.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Vence dia {item.date.getDate()}/{String(item.date.getMonth() + 1).padStart(2, '0')}
                  </p>
                </div>
                <span className="font-display text-rose-400">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
