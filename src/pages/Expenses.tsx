import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useConfirm } from '../context/ConfirmContext'
import MonthNavigator from '../components/ui/MonthNavigator'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import CurrencyInput from '../components/ui/CurrencyInput'
import { formatCurrency } from '../utils/currency'
import { getMonthExpenses, getTotalExpenses, buildInstallments } from '../utils/calculations'
import { calculateBillingMonth } from '../utils/dates'
import { createExpense, createExpensesBatch, updateExpense, deleteExpense } from '../services/expenses'
import { Expense, ExpenseCategory } from '../types'
import { Plus, Trash2, Pencil, Receipt, AlertTriangle } from 'lucide-react'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'moradia', label: 'Moradia' }, { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte' }, { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' }, { value: 'lazer', label: 'Lazer' },
  { value: 'vestuario', label: 'Vestuário' }, { value: 'viagem', label: 'Viagem' },
  { value: 'servicos', label: 'Serviços' }, { value: 'familiar', label: 'Familiar' },
  { value: 'outros', label: 'Outros' },
]

const emptyForm = {
  description: '', totalAmount: 0, cardId: '', category: 'outros' as ExpenseCategory,
  type: 'cash' as 'cash' | 'installment' | 'recurring',
  totalInstallments: 2, recurringDay: 1, purchaseDate: new Date().toISOString().split('T')[0],
  isShared: false, sharedWith: '', sharedAmount: 0, isSimulation: false, notes: '',
}

export default function Expenses() {
  const { state, dispatch, addToast } = useApp()
  const confirm = useConfirm()
  const { expenses, cards, selectedMonth, selectedYear, user } = state
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<ExpenseCategory | ''>('')
  const [filterCard, setFilterCard] = useState('')
  const [filterSim, setFilterSim] = useState(false)

  const monthExpenses = useMemo(() => {
    let list = getMonthExpenses(expenses, selectedMonth, selectedYear)
    if (filterCat) list = list.filter(e => e.category === filterCat)
    if (filterCard) list = list.filter(e => e.cardId === filterCard)
    if (filterSim) list = list.filter(e => e.isSimulation)
    return list
  }, [expenses, selectedMonth, selectedYear, filterCat, filterCard, filterSim])

  const total = getTotalExpenses(monthExpenses)

  function openNew() { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(exp: Expense) {
    setEditing(exp)
    setForm({
      description: exp.description, totalAmount: exp.totalAmount, cardId: exp.cardId ?? '',
      category: exp.category, type: exp.type, totalInstallments: exp.totalInstallments ?? 2,
      recurringDay: exp.recurringDay ?? 1, purchaseDate: exp.purchaseDate,
      isShared: exp.isShared ?? false, sharedWith: exp.sharedWith ?? '',
      sharedAmount: exp.sharedAmount ?? 0, isSimulation: exp.isSimulation ?? false, notes: exp.notes ?? '',
    })
    setModal(true)
  }

  async function handleSave() {
    if (!form.description || !form.totalAmount) return addToast('error', 'Preencha descrição e valor.')
    setSaving(true)
    try {
      const card = cards.find(c => c.id === form.cardId)
      const purchaseDate = new Date(form.purchaseDate + 'T12:00:00')
      const { month: bm, year: by } = card
        ? calculateBillingMonth(purchaseDate, card.closingDay)
        : { month: selectedMonth, year: selectedYear }

      const base = {
        userId: user!.id, description: form.description, totalAmount: form.totalAmount,
        cardId: form.cardId || null, category: form.category, type: form.type,
        purchaseDate: form.purchaseDate, billingMonth: bm, billingYear: by,
        isShared: form.isShared, sharedWith: form.sharedWith || undefined,
        sharedAmount: form.sharedAmount || undefined, isSimulation: form.isSimulation,
        notes: form.notes || undefined, recurringDay: form.type === 'recurring' ? form.recurringDay : undefined,
      }

      if (editing) {
        const updated = await updateExpense(editing.id, base)
        dispatch({ type: 'UPDATE_EXPENSE', payload: updated })
        addToast('success', 'Gasto atualizado.')
      } else if (form.type === 'installment') {
        const items = buildInstallments({ ...base, parentId: null, totalInstallments: form.totalInstallments }, form.totalInstallments)
        const created = await createExpensesBatch(items)
        const [first, ...rest] = created
        const withParent = rest.map(e => ({ ...e, parentId: first.id }))
        dispatch({ type: 'ADD_EXPENSES', payload: [first, ...withParent] })
        addToast('success', `${form.totalInstallments}x parcelas criadas.`)
      } else {
        const created = await createExpense({ ...base, parentId: null })
        dispatch({ type: 'ADD_EXPENSE', payload: created })
        addToast('success', 'Gasto criado.')
      }
      setModal(false)
    } catch { addToast('error', 'Erro ao salvar.') }
    setSaving(false)
  }

  async function handleDelete(exp: Expense) {
    if (exp.type === 'installment' && exp.parentId) {
      if (!await confirm({
        title: 'Excluir parcela?',
        message: `Parcela ${exp.currentInstallment}/${exp.totalInstallments}. Apenas esta parcela será removida.`,
        confirmLabel: 'Excluir esta parcela',
      })) return
    } else if (!await confirm({ title: 'Excluir gasto?', message: 'Esta ação não pode ser desfeita.' })) return

    try {
      dispatch({ type: 'DELETE_EXPENSE', payload: exp.id })
      await deleteExpense(exp.id)
      addToast('success', 'Gasto excluído.')
    } catch { addToast('error', 'Erro ao excluir.') }
  }

  const cardName = (id: string | null) => id ? (cards.find(c => c.id === id)?.name ?? 'Cartão') : 'Débito'
  const categoryLabel = (cat: ExpenseCategory) => CATEGORIES.find(c => c.value === cat)?.label ?? cat

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Gastos</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthNavigator />
          <Button onClick={openNew} size="sm"><Plus size={16} /> Adicionar</Button>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total do mês</p>
        <p className="font-display text-3xl text-rose-400 mt-1">{formatCurrency(total)}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value as ExpenseCategory | '')} className="px-3 py-1.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none cursor-pointer">
          <option value="">Todas categorias</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterCard} onChange={e => setFilterCard(e.target.value)} className="px-3 py-1.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none cursor-pointer">
          <option value="">Todos cartões</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <input type="checkbox" checked={filterSim} onChange={e => setFilterSim(e.target.checked)} className="accent-amber-500" />
          Simulações
        </label>
      </div>

      {monthExpenses.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Receipt size={24} className="text-rose-400" />
          </div>
          <p className="font-medium">Nenhum gasto encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {monthExpenses.map((exp, i) => {
            const amount = exp.type === 'installment' ? (exp.installmentAmount ?? 0) : exp.totalAmount
            return (
              <div
                key={exp.id}
                className={`flex items-center gap-3 px-5 py-4 border-b last:border-0 animate-slide-in ${exp.isSimulation ? 'border-l-2 border-l-amber-500/40' : ''}`}
                style={{ borderColor: 'var(--border)', animationDelay: `${i * 30}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{exp.description}</p>
                    {exp.type === 'installment' && <Badge variant="blue">{exp.currentInstallment}/{exp.totalInstallments}x</Badge>}
                    {exp.type === 'recurring' && <Badge variant="emerald">Recorrente</Badge>}
                    {exp.isSimulation && <Badge variant="simulation"><AlertTriangle size={10} /> Simulação</Badge>}
                    {exp.isShared && <Badge variant="muted">Compartilhado</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{categoryLabel(exp.category)}</span>
                    <span>·</span>
                    <span>{cardName(exp.cardId)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-display text-rose-400">{formatCurrency(amount)}</span>
                  <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(exp)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Gasto' : 'Novo Gasto'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Descrição <span className="text-rose-400">*</span></label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <CurrencyInput label="Valor total" required value={form.totalAmount} onChange={v => setForm(f => ({ ...f, totalAmount: v }))} />
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Data da compra</label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Cartão</label>
              <select value={form.cardId} onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                <option value="">Débito / Dinheiro</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer" disabled={!!editing}>
                <option value="cash">À vista</option>
                <option value="installment">Parcelado</option>
                <option value="recurring">Recorrente</option>
              </select>
            </div>
            {form.type === 'installment' && !editing && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nº de parcelas</label>
                <input type="number" min={2} max={48} value={form.totalInstallments} onChange={e => setForm(f => ({ ...f, totalInstallments: Number(e.target.value) }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Parcela: {formatCurrency(form.totalAmount / form.totalInstallments)}</p>
              </div>
            )}
            {form.type === 'recurring' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Dia de cobrança</label>
                <input type="number" min={1} max={31} value={form.recurringDay} onChange={e => setForm(f => ({ ...f, recurringDay: Number(e.target.value) }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isShared} onChange={e => setForm(f => ({ ...f, isShared: e.target.checked }))} className="w-4 h-4 accent-emerald-500" />
              <span className="text-sm">Emprestei para familiar</span>
            </label>
            {form.isShared && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nome</label>
                  <input value={form.sharedWith} onChange={e => setForm(f => ({ ...f, sharedWith: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <CurrencyInput label="Valor a receber" value={form.sharedAmount} onChange={v => setForm(f => ({ ...f, sharedAmount: v }))} />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isSimulation} onChange={e => setForm(f => ({ ...f, isSimulation: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
              <span className="text-sm">É uma simulação</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notas</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
