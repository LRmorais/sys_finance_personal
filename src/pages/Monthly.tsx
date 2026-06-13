import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import MonthNavigator from '../components/ui/MonthNavigator'
import Badge from '../components/ui/Badge'
import { formatCurrency } from '../utils/currency'
import { getMonthIncomes, getMonthExpenses, getTotalIncomes, getTotalExpenses, getCardInvoiceTotal } from '../utils/calculations'
import { addMonthsToDate } from '../utils/dates'
import { TrendingUp, Wallet, CreditCard, Repeat } from 'lucide-react'

// ─── sub-components ───────────────────────────────────────────────────────────

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card px-5 py-4 flex items-center justify-between gap-6 animate-fade-in">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-display text-xl" style={{ color }}>{formatCurrency(value)}</span>
    </div>
  )
}

function GroupHeader({ label, total, icon: Icon, color }: {
  label: string; total: number; icon: any; color: string
}) {
  return (
    <tr>
      <td colSpan={5} className="pt-6 pb-2 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
          </div>
          <span className="text-xs font-medium" style={{ color }}>{formatCurrency(total)}</span>
        </div>
      </td>
    </tr>
  )
}

function Row({ description, badge, day, value, valueColor }: {
  description: string
  badge?: React.ReactNode
  day?: number | string
  value: number
  valueColor: string
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)' }}>
      <td className="px-5 py-3.5">
        <span className="text-sm font-medium">{description}</span>
      </td>
      <td className="px-3 py-3.5 text-center">
        {badge}
      </td>
      <td className="px-3 py-3.5 text-center">
        {day !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
            dia {day}
          </span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className="font-display text-base" style={{ color: valueColor }}>{formatCurrency(value)}</span>
      </td>
    </tr>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={5} className="px-5 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        {message}
      </td>
    </tr>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Monthly() {
  const { state } = useApp()
  const { incomes, expenses, cards, cardInvoices, selectedMonth, selectedYear } = state

  // mês anterior → faturas a pagar este mês
  const prevMonth = useMemo(
    () => addMonthsToDate(selectedMonth, selectedYear, -1),
    [selectedMonth, selectedYear]
  )

  // ── Entradas do mês (recorrentes + específicas do mês) ───────────────────
  const monthIncomes = useMemo(
    () => getMonthIncomes(incomes, selectedMonth, selectedYear)
            .slice().sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [incomes, selectedMonth, selectedYear]
  )
  const totalIncomes = getTotalIncomes(monthIncomes)

  // ── Cartões: fatura do mês anterior vencendo agora ───────────────────────
  const cardRows = useMemo(() =>
    cards.map(card => {
      const amount  = getCardInvoiceTotal(expenses, card.id, prevMonth.month, prevMonth.year)
      const invoice = cardInvoices.find(
        inv => inv.cardId === card.id && inv.month === prevMonth.month && inv.year === prevMonth.year
      )
      return { card, amount, isPaid: invoice?.isPaid ?? false }
    }).filter(r => r.amount > 0)
      .sort((a, b) => a.card.dueDay - b.card.dueDay),
    [cards, expenses, cardInvoices, prevMonth]
  )
  const totalCards = cardRows.reduce((s, r) => s + r.amount, 0)

  // ── Fixas: expenses recorrentes visíveis neste mês ───────────────────────
  const recurringExpenses = useMemo(
    () => getMonthExpenses(expenses, selectedMonth, selectedYear)
            .filter(e => e.type === 'recurring' && !e.isSimulation && !e.cardId)
            .slice().sort((a, b) => (a.recurringDay ?? 0) - (b.recurringDay ?? 0)),
    [expenses, selectedMonth, selectedYear]
  )
  const totalRecurring = getTotalExpenses(recurringExpenses)

  // ── Totais gerais ─────────────────────────────────────────────────────────
  const totalOut  = totalCards + totalRecurring
  const balance   = totalIncomes - totalOut

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Mensal Fixo</h1>
        <MonthNavigator />
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryPill label="Total Entradas"  value={totalIncomes} color="#10b981" />
        <SummaryPill label="Total Saídas"    value={totalOut}     color="#f43f5e" />
        <SummaryPill
          label="Saldo"
          value={balance}
          color={balance >= 0 ? '#10b981' : '#f43f5e'}
        />
      </div>

      {/* Main table */}
      <div className="card overflow-hidden animate-fade-in">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Descrição
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Status
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Dia
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Valor
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ── Entradas ─────────────────────────────────────────── */}
            <GroupHeader label="Entradas" total={totalIncomes} icon={TrendingUp} color="#10b981" />
            {monthIncomes.length === 0
              ? <EmptyRow message="Nenhuma entrada neste mês" />
              : monthIncomes.map(inc => (
                  <Row
                    key={inc.id}
                    description={inc.name}
                    badge={inc.isRecurring
                      ? <Badge variant="emerald"><Repeat size={10} /> Recorrente</Badge>
                      : undefined
                    }
                    day={inc.dayOfMonth}
                    value={inc.amount}
                    valueColor="#10b981"
                  />
                ))
            }

            {/* ── Faturas de Cartão ─────────────────────────────────── */}
            <GroupHeader label="Faturas de Cartão" total={totalCards} icon={CreditCard} color="#f43f5e" />
            {cardRows.length === 0
              ? <EmptyRow message="Nenhuma fatura a pagar este mês" />
              : cardRows.map(({ card, amount, isPaid }) => (
                  <Row
                    key={card.id}
                    description={card.name}
                    badge={
                      isPaid
                        ? <Badge variant="emerald">Paga</Badge>
                        : <Badge variant="red">Em aberto</Badge>
                    }
                    day={card.dueDay}
                    value={amount}
                    valueColor={isPaid ? 'var(--text-muted)' : '#f43f5e'}
                  />
                ))
            }

            {/* ── Fixas / Recorrentes ───────────────────────────────── */}
            <GroupHeader label="Despesas Fixas" total={totalRecurring} icon={Repeat} color="#6366f1" />
            {recurringExpenses.length === 0
              ? <EmptyRow message="Nenhuma despesa recorrente neste mês" />
              : recurringExpenses.map(exp => (
                  <Row
                    key={exp.id}
                    description={exp.description}
                    badge={<Badge variant="blue">Fixa</Badge>}
                    day={exp.recurringDay}
                    value={exp.totalAmount}
                    valueColor="#6366f1"
                  />
                ))
            }
          </tbody>

          {/* Footer totals */}
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)' }}>
              <td className="px-5 py-4" colSpan={3}>
                <div className="flex items-center gap-2">
                  <Wallet size={14} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-semibold">Saldo do mês</span>
                </div>
              </td>
              <td className="px-5 py-4 text-right">
                <span className="font-display text-xl" style={{ color: balance >= 0 ? '#10b981' : '#f43f5e' }}>
                  {formatCurrency(balance)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Faturas de cartão referem-se ao mês anterior — o que você paga agora.
      </p>
    </div>
  )
}
