import { useState, useMemo, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import MonthNavigator from '../components/ui/MonthNavigator'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import CurrencyInput from '../components/ui/CurrencyInput'
import Badge from '../components/ui/Badge'
import { formatCurrency } from '../utils/currency'
import { getMonthIncomes, getMonthExpenses, getCardInvoiceTotal } from '../utils/calculations'
import { addMonthsToDate } from '../utils/dates'
import { upsertCardInvoice } from '../services/cardInvoices'
import {
  fetchPaidExpenseIds,
  markRecurringPaid,
  markRecurringUnpaid,
} from '../services/recurringPayments'
import {
  CheckingSim,
  fetchCheckingSims,
  createCheckingSim,
  deleteCheckingSim,
} from '../services/checkingSimulations'
import { getSetting, setSetting } from '../services/userSettings'
import { CreditCard } from '../types'
import {
  Trash2, Landmark, TrendingUp, TrendingDown,
  CreditCard as CardIcon, Repeat, FlaskConical,
  CheckCircle2, Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type EntrySource = 'income' | 'cash' | 'invoice' | 'recurring' | 'sim'

interface LedgerRow {
  id: string
  day: number
  description: string
  amount: number
  source: EntrySource
  isPaid: boolean
  expenseId?: string       // recurring → para toggle
  invoiceCard?: CreditCard // invoice   → para toggle
  balanceReal: number      // saldo acumulando só o que já foi pago/confirmado
  balanceEst: number       // saldo acumulando tudo (incluindo pendentes e sims)
}

// ─── Badge meta ───────────────────────────────────────────────────────────────

const SOURCE_META: Record<EntrySource, { label: string; variant: any; Icon: any }> = {
  income:    { label: 'Entrada',   variant: 'emerald', Icon: TrendingUp  },
  cash:      { label: 'Débito',    variant: 'red',     Icon: TrendingDown },
  invoice:   { label: 'Fatura',    variant: 'red',     Icon: CardIcon     },
  recurring: { label: 'Fixa',      variant: 'blue',    Icon: Repeat       },
  sim:       { label: 'Simulação', variant: 'amber',   Icon: FlaskConical },
}

const START_BAL_KEY = 'checking_start_balance'
const emptySimForm  = { day: 1, description: '', amount: 0, isIncome: false }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Checking() {
  const { state, dispatch, addToast } = useApp()
  const { incomes, expenses, cards, cardInvoices, selectedMonth, selectedYear, user } = state

  // ── Dados locais (carregados do Supabase) ──────────────────────────────────
  const [paidExpenseIds, setPaidExpenseIds] = useState<Set<string>>(new Set())
  const [sims, setSims]                     = useState<CheckingSim[]>([])
  const [startBalance, setStartBalance]     = useState(0)
  const [loadingData, setLoadingData]       = useState(true)

  // ── Modais ────────────────────────────────────────────────────────────────
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceDraft, setBalanceDraft]     = useState(0)
  const [simModal, setSimModal]             = useState(false)
  const [simForm, setSimForm]               = useState(emptySimForm)
  const [simSaving, setSimSaving]           = useState(false)

  const prevMonth = useMemo(
    () => addMonthsToDate(selectedMonth, selectedYear, -1),
    [selectedMonth, selectedYear]
  )

  // ── Carregar dados do Supabase ─────────────────────────────────────────────

  const loadPageData = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    try {
      const [paidIds, simList, balVal] = await Promise.all([
        fetchPaidExpenseIds(user.id, selectedMonth, selectedYear),
        fetchCheckingSims(user.id, selectedMonth, selectedYear),
        getSetting(user.id, START_BAL_KEY),
      ])
      setPaidExpenseIds(new Set(paidIds))
      setSims(simList)
      setStartBalance(balVal ? parseFloat(balVal) : 0)
    } catch { addToast('error', 'Erro ao carregar dados da conta.') }
    finally { setLoadingData(false) }
  }, [user, selectedMonth, selectedYear])

  useEffect(() => { loadPageData() }, [loadPageData])

  // ── Dados do mês ───────────────────────────────────────────────────────────

  const monthIncomes = useMemo(
    () => getMonthIncomes(incomes, selectedMonth, selectedYear),
    [incomes, selectedMonth, selectedYear]
  )

  const cashExpenses = useMemo(
    () => getMonthExpenses(expenses, selectedMonth, selectedYear)
            .filter(e => !e.cardId && e.type !== 'recurring' && !e.isSimulation),
    [expenses, selectedMonth, selectedYear]
  )

  const recurringExpenses = useMemo(
    () => getMonthExpenses(expenses, selectedMonth, selectedYear)
            .filter(e => e.type === 'recurring' && !e.isSimulation),
    [expenses, selectedMonth, selectedYear]
  )

  const cardRows = useMemo(
    () => cards
      .map(card => ({
        card,
        amount: getCardInvoiceTotal(expenses, card.id, prevMonth.month, prevMonth.year),
        isPaid: cardInvoices.find(
          inv => inv.cardId === card.id && inv.month === prevMonth.month && inv.year === prevMonth.year
        )?.isPaid ?? false,
      }))
      .filter(r => r.amount > 0),
    [cards, expenses, cardInvoices, prevMonth]
  )

  // ── Ledger ─────────────────────────────────────────────────────────────────

  const ledger = useMemo<LedgerRow[]>(() => {
    const rows: Omit<LedgerRow, 'balanceReal' | 'balanceEst'>[] = []

    monthIncomes.forEach(inc => rows.push({
      id: inc.id, day: inc.dayOfMonth,
      description: inc.name, amount: inc.amount,
      source: 'income', isPaid: false,
    }))

    cashExpenses.forEach(exp => {
      const day = exp.purchaseDate ? new Date(exp.purchaseDate + 'T00:00:00').getDate() : 1
      const val = exp.type === 'installment' ? (exp.installmentAmount ?? exp.totalAmount) : exp.totalAmount
      rows.push({
        id: exp.id, day, description: exp.description,
        amount: -val, source: 'cash', isPaid: false,
      })
    })

    recurringExpenses.forEach(exp => rows.push({
      id: exp.id, day: exp.recurringDay ?? 1,
      description: exp.description, amount: -exp.totalAmount,
      source: 'recurring', isPaid: paidExpenseIds.has(exp.id),
      expenseId: exp.id,
    }))

    cardRows.forEach(({ card, amount, isPaid }) => rows.push({
      id: `inv-${card.id}`, day: card.dueDay,
      description: `Fatura ${card.name}`, amount: -amount,
      source: 'invoice', isPaid,
      invoiceCard: card,
    }))

    sims.forEach(sim => rows.push({
      id: sim.id, day: sim.day,
      description: sim.description,
      amount: sim.isIncome ? sim.amount : -sim.amount,
      source: 'sim', isPaid: false,
    }))

    rows.sort((a, b) => a.day - b.day || (a.amount > 0 ? -1 : 1))

    let balReal = startBalance
    let balEst  = startBalance
    return rows.map(r => {
      // Real: income e cash sempre confirmados; recurring/invoice só se marcados como pago; sim nunca
      const confirmedInReal =
        r.source === 'income' ||
        r.source === 'cash'   ||
        (r.source === 'recurring' && r.isPaid) ||
        (r.source === 'invoice'   && r.isPaid)
      if (confirmedInReal) balReal += r.amount
      balEst += r.amount
      return { ...r, balanceReal: balReal, balanceEst: balEst }
    })
  }, [monthIncomes, cashExpenses, recurringExpenses, cardRows, sims, paidExpenseIds, startBalance])

  // ── Resumos ────────────────────────────────────────────────────────────────

  const last         = ledger[ledger.length - 1]
  const finalReal    = last?.balanceReal ?? startBalance
  const finalEst     = last?.balanceEst  ?? startBalance
  const totalCredits = ledger.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const totalDebits  = ledger.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)

  const toggleableRows = ledger.filter(r => r.source === 'recurring' || r.source === 'invoice')
  const paidCount      = toggleableRows.filter(r => r.isPaid).length
  const pendingTotal   = toggleableRows.filter(r => !r.isPaid).reduce((s, r) => s + r.amount, 0)

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function confirmBalance() {
    if (!user) return
    try {
      await setSetting(user.id, START_BAL_KEY, String(balanceDraft))
      setStartBalance(balanceDraft)
      setEditingBalance(false)
    } catch { addToast('error', 'Erro ao salvar saldo.') }
  }

  async function toggleRecurringPaid(expenseId: string, currentlyPaid: boolean) {
    if (!user) return
    try {
      if (currentlyPaid) {
        await markRecurringUnpaid(user.id, expenseId, selectedMonth, selectedYear)
        setPaidExpenseIds(s => { const n = new Set(s); n.delete(expenseId); return n })
      } else {
        await markRecurringPaid(user.id, expenseId, selectedMonth, selectedYear)
        setPaidExpenseIds(s => new Set([...s, expenseId]))
      }
    } catch { addToast('error', 'Erro ao atualizar status.') }
  }

  async function toggleInvoicePaid(card: CreditCard, currentlyPaid: boolean) {
    if (!user) return
    try {
      const inv = await upsertCardInvoice({
        userId: user.id, cardId: card.id,
        month: prevMonth.month, year: prevMonth.year,
        isPaid: !currentlyPaid,
        paidAt: !currentlyPaid ? new Date().toISOString() : undefined,
      })
      dispatch({ type: 'UPSERT_CARD_INVOICE', payload: inv })
    } catch { addToast('error', 'Erro ao atualizar fatura.') }
  }

  async function handleTogglePaid(row: LedgerRow) {
    if (row.source === 'recurring' && row.expenseId) {
      await toggleRecurringPaid(row.expenseId, row.isPaid)
    } else if (row.source === 'invoice' && row.invoiceCard) {
      await toggleInvoicePaid(row.invoiceCard, row.isPaid)
    }
  }

  async function addSim() {
    if (!simForm.description || !simForm.amount || !user) return
    setSimSaving(true)
    try {
      const created = await createCheckingSim({
        userId: user.id,
        month: selectedMonth,
        year: selectedYear,
        ...simForm,
      })
      setSims(s => [...s, created])
      setSimModal(false)
      setSimForm(emptySimForm)
    } catch { addToast('error', 'Erro ao criar simulação.') }
    finally { setSimSaving(false) }
  }

  async function removeSim(id: string) {
    try {
      await deleteCheckingSim(id)
      setSims(s => s.filter(x => x.id !== id))
    } catch { addToast('error', 'Erro ao remover simulação.') }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Landmark size={20} className="text-emerald-400" />
          </div>
          <h1 className="font-display text-3xl">Conta Corrente</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator />
          <Button size="sm" variant="secondary" onClick={() => setSimModal(true)}>
            <FlaskConical size={15} /> Simular
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          className="card px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => { setBalanceDraft(startBalance); setEditingBalance(true) }}
          title="Clique para editar"
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Saldo inicial</p>
          <p className="font-display text-lg" style={{ color: startBalance >= 0 ? '#10b981' : '#f43f5e' }}>
            {formatCurrency(startBalance)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>clique para editar</p>
        </div>

        <div className="card px-4 py-3">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Entradas</p>
          <p className="font-display text-lg text-emerald-400">+{formatCurrency(totalCredits)}</p>
        </div>

        <div className="card px-4 py-3">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Saídas</p>
          <p className="font-display text-lg text-rose-400">{formatCurrency(totalDebits)}</p>
        </div>

        <div className="card px-4 py-3">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Saldo Real</p>
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>o que já saiu da conta</p>
          <p className="font-display text-lg" style={{ color: finalReal >= 0 ? '#10b981' : '#f43f5e' }}>
            {formatCurrency(finalReal)}
          </p>
        </div>

        <div className="card px-4 py-3">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Saldo Estimado</p>
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>quando tudo for pago</p>
          <p className="font-display text-lg" style={{ color: finalEst >= 0 ? '#10b981' : '#f43f5e' }}>
            {formatCurrency(finalEst)}
          </p>
        </div>
      </div>

      {/* Status pills */}
      {toggleableRows.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span style={{ color: 'var(--text-muted)' }}>
              {paidCount} de {toggleableRows.length} pagos
            </span>
          </div>
          {pendingTotal < 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              <Clock size={14} className="text-amber-400" />
              <span style={{ color: 'var(--text-muted)' }}>
                A pagar: <span className="text-rose-400 font-medium">{formatCurrency(-pendingTotal)}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ledger */}
      <div className="card overflow-hidden animate-fade-in">
        {loadingData ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Carregando...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-14" style={{ color: 'var(--text-muted)' }}>Dia</th>
                <th className="px-4 py-3 text-left   text-xs font-semibold uppercase tracking-wider"      style={{ color: 'var(--text-muted)' }}>Descrição</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"      style={{ color: 'var(--text-muted)' }}>Tipo</th>
                <th className="px-4 py-3 text-right  text-xs font-semibold uppercase tracking-wider"      style={{ color: 'var(--text-muted)' }}>Valor</th>
                <th className="px-4 py-3 text-right  text-xs font-semibold uppercase tracking-wider"      style={{ color: 'var(--text-muted)' }}>Saldo Real</th>
                <th className="px-4 py-3 text-right  text-xs font-semibold uppercase tracking-wider"      style={{ color: 'var(--text-muted)' }}>Saldo Estimado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-24" style={{ color: 'var(--text-muted)' }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {/* Saldo inicial */}
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-2.5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>—</td>
                <td className="px-4 py-2.5 text-xs italic" style={{ color: 'var(--text-muted)' }}>Saldo inicial do mês</td>
                <td /><td />
                <td className="px-4 py-2.5 text-right">
                  <span className="font-display text-sm" style={{ color: startBalance >= 0 ? '#10b981' : '#f43f5e' }}>
                    {formatCurrency(startBalance)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="font-display text-sm" style={{ color: startBalance >= 0 ? '#10b981' : '#f43f5e' }}>
                    {formatCurrency(startBalance)}
                  </span>
                </td>
                <td />
              </tr>

              {ledger.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    Nenhum lançamento neste mês
                  </td>
                </tr>
              )}

              {ledger.map(row => {
                const meta    = SOURCE_META[row.source]
                const isSim   = row.source === 'sim'
                const canTgl  = row.source === 'recurring' || row.source === 'invoice'

                return (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      background: isSim ? 'rgba(245,158,11,0.03)' : row.isPaid ? 'rgba(16,185,129,0.03)' : undefined,
                      opacity: row.isPaid ? 0.55 : 1,
                    }}
                  >
                    {/* Dia */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full tabular-nums"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                        {String(row.day).padStart(2, '0')}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${isSim ? 'italic' : ''} ${row.isPaid ? 'line-through' : ''}`}>
                        {row.description}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant={meta.variant}>
                        <meta.Icon size={10} /> {meta.label}
                      </Badge>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-display text-base tabular-nums"
                        style={{ color: row.amount >= 0 ? '#10b981' : '#f43f5e' }}>
                        {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
                      </span>
                    </td>

                    {/* Saldo Real */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-display text-base tabular-nums"
                        style={{ color: row.balanceReal >= 0 ? '#10b981' : '#f43f5e' }}>
                        {formatCurrency(row.balanceReal)}
                      </span>
                    </td>

                    {/* Saldo Estimado */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-display text-base tabular-nums"
                        style={{ color: row.balanceEst >= 0 ? '#10b981' : '#f43f5e', opacity: 0.65 }}>
                        {formatCurrency(row.balanceEst)}
                      </span>
                    </td>

                    {/* Status / ação */}
                    <td className="px-4 py-3 text-center">
                      {canTgl && (
                        <button
                          onClick={() => handleTogglePaid(row)}
                          title={row.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            row.isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-white/5 text-white/40 hover:bg-amber-500/15 hover:text-amber-400'
                          }`}
                        >
                          {row.isPaid
                            ? <><CheckCircle2 size={12} /> Pago</>
                            : <><Clock size={12} /> Pendente</>
                          }
                        </button>
                      )}
                      {isSim && (
                        <button
                          onClick={() => removeSim(row.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer opacity-60 hover:opacity-100"
                          title="Remover simulação"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td colSpan={4} className="px-4 py-4">
                  <span className="text-sm font-semibold">Saldo final do mês</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Real</p>
                  <span className="font-display text-xl tabular-nums"
                    style={{ color: finalReal >= 0 ? '#10b981' : '#f43f5e' }}>
                    {formatCurrency(finalReal)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Estimado</p>
                  <span className="font-display text-xl tabular-nums"
                    style={{ color: finalEst >= 0 ? '#10b981' : '#f43f5e', opacity: 0.75 }}>
                    {formatCurrency(finalEst)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {sims.length > 0 && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          <FlaskConical size={11} className="inline mr-1 text-amber-400" />
          {sims.length} simulação{sims.length > 1 ? 'ões' : ''} ativa{sims.length > 1 ? 's' : ''} neste mês — não afetam outros relatórios.
        </p>
      )}

      {/* Modal: saldo inicial */}
      <Modal open={editingBalance} onClose={() => setEditingBalance(false)} title="Saldo inicial" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Informe o saldo que você tinha no início do período. Este valor é global e serve como ponto de partida do extrato.
          </p>
          <CurrencyInput label="Saldo inicial" value={balanceDraft} onChange={setBalanceDraft} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEditingBalance(false)} className="flex-1">Cancelar</Button>
            <Button onClick={confirmBalance} className="flex-1">Confirmar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: simulação */}
      <Modal open={simModal} onClose={() => setSimModal(false)} title="Novo lançamento simulado" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Simulações aparecem no extrato mas não afetam outros relatórios.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Tipo</label>
            <div className="flex gap-2">
              {[{ label: 'Saída', value: false }, { label: 'Entrada', value: true }].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setSimForm(f => ({ ...f, isIncome: opt.value }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                    simForm.isIncome === opt.value
                      ? opt.value
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-rose-500/50   bg-rose-500/10   text-rose-400'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Descrição <span className="text-rose-400">*</span>
            </label>
            <input
              value={simForm.description}
              onChange={e => setSimForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Bônus, Conta de água..."
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <CurrencyInput label="Valor" required value={simForm.amount} onChange={v => setSimForm(f => ({ ...f, amount: v }))} />

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Dia do mês</label>
            <input
              type="number" min={1} max={31}
              value={simForm.day}
              onChange={e => setSimForm(f => ({ ...f, day: Number(e.target.value) }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setSimModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={addSim} loading={simSaving} className="flex-1">Adicionar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
