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
import { calculateBillingMonth, formatDate } from '../utils/dates'
import { createExpense, createExpensesBatch, updateExpense, deleteExpense, deleteExpensesByParent } from '../services/expenses'
import { Expense, ExpenseCategory } from '../types'
import { CATEGORIES, categoryLabel, subcategoriesFor } from '../utils/categories'
import { Plus, Trash2, Pencil, Receipt, AlertTriangle } from 'lucide-react'

const emptyForm = {
  description: '', totalAmount: 0, cardId: '', category: 'outros' as ExpenseCategory,
  subcategory: '',
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
  const [filterRecurring, setFilterRecurring] = useState(false)
  const [filterInstallment, setFilterInstallment] = useState(false)
  const [filterCash, setFilterCash] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk] = useState(false)

  const monthExpenses = useMemo(() => {
    let list = getMonthExpenses(expenses, selectedMonth, selectedYear)
    if (filterCat) list = list.filter(e => e.category === filterCat)
    if (filterCard) list = list.filter(e => e.cardId === filterCard)
    if (filterSim) list = list.filter(e => e.isSimulation)
    if (filterRecurring || filterInstallment || filterCash) {
      list = list.filter(e =>
        (filterRecurring && e.type === 'recurring') ||
        (filterInstallment && e.type === 'installment') ||
        (filterCash && e.type === 'cash')
      )
    }
    return list.sort((a, b) => (b.purchaseDate ?? '').localeCompare(a.purchaseDate ?? ''))
  }, [expenses, selectedMonth, selectedYear, filterCat, filterCard, filterSim, filterRecurring, filterInstallment, filterCash])

  const total = getTotalExpenses(monthExpenses)

  function openNew() { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(exp: Expense) {
    setEditing(exp)
    setForm({
      description: exp.description, totalAmount: exp.totalAmount, cardId: exp.cardId ?? '',
      category: exp.category, subcategory: exp.subcategory ?? '',
      type: exp.type, totalInstallments: exp.totalInstallments ?? 2,
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

      const installmentAmount = editing?.type === 'installment' && editing.totalInstallments
        ? form.totalAmount / editing.totalInstallments
        : undefined

      const base = {
        userId: user!.id, description: form.description, totalAmount: form.totalAmount,
        cardId: form.cardId || null, category: form.category,
        subcategory: form.subcategory || undefined,
        type: form.type, purchaseDate: form.purchaseDate, billingMonth: bm, billingYear: by,
        isShared: form.isShared, sharedWith: form.sharedWith || undefined,
        sharedAmount: form.sharedAmount || undefined, isSimulation: form.isSimulation,
        notes: form.notes || undefined, recurringDay: form.type === 'recurring' ? form.recurringDay : undefined,
        installmentAmount,
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
      const result = await confirm({
        title: 'Excluir parcela?',
        message: `Parcela ${exp.currentInstallment}/${exp.totalInstallments}.`,
        confirmLabel: 'Só esta parcela',
        extra: { label: 'Todas as parcelas' },
      })
      if (!result) return
      try {
        if (result === 'extra') {
          dispatch({ type: 'DELETE_EXPENSES_BY_PARENT', payload: exp.parentId })
          await deleteExpensesByParent(exp.parentId)
          addToast('success', 'Todas as parcelas excluídas.')
        } else {
          dispatch({ type: 'DELETE_EXPENSE', payload: exp.id })
          await deleteExpense(exp.id)
          addToast('success', 'Parcela excluída.')
        }
      } catch { addToast('error', 'Erro ao excluir.') }
    } else {
      if (!await confirm({ title: 'Excluir gasto?', message: 'Esta ação não pode ser desfeita.' })) return
      try {
        dispatch({ type: 'DELETE_EXPENSE', payload: exp.id })
        await deleteExpense(exp.id)
        addToast('success', 'Gasto excluído.')
      } catch { addToast('error', 'Erro ao excluir.') }
    }
  }

  async function handleBulkDelete() {
    if (!await confirm({
      title: `Excluir ${selectedIds.size} gasto${selectedIds.size > 1 ? 's' : ''}?`,
      message: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir todos',
    })) return
    setDeletingBulk(true)
    try {
      await Promise.all([...selectedIds].map(id => deleteExpense(id)))
      ;[...selectedIds].forEach(id => dispatch({ type: 'DELETE_EXPENSE', payload: id }))
      addToast('success', `${selectedIds.size} gastos excluídos.`)
      setSelectedIds(new Set())
    } catch { addToast('error', 'Erro ao excluir.') }
    setDeletingBulk(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    setSelectedIds(s => s.size === monthExpenses.length ? new Set() : new Set(monthExpenses.map(e => e.id)))
  }

  const cardName = (id: string | null) => id ? (cards.find(c => c.id === id)?.name ?? 'Cartão') : 'Débito'

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
          <input type="checkbox" checked={filterRecurring} onChange={e => setFilterRecurring(e.target.checked)} className="accent-emerald-500" />
          Recorrentes
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <input type="checkbox" checked={filterInstallment} onChange={e => setFilterInstallment(e.target.checked)} className="accent-blue-500" />
          Parceladas
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <input type="checkbox" checked={filterCash} onChange={e => setFilterCash(e.target.checked)} className="accent-indigo-500" />
          À vista
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <input type="checkbox" checked={filterSim} onChange={e => setFilterSim(e.target.checked)} className="accent-amber-500" />
          Simulações
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-sm text-rose-400 font-medium">{selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}</span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete} loading={deletingBulk}>
            <Trash2 size={14} /> Excluir selecionados
          </Button>
        </div>
      )}

      {monthExpenses.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Receipt size={24} className="text-rose-400" />
          </div>
          <p className="font-medium">Nenhum gasto encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            <input
              type="checkbox"
              className="accent-rose-500 w-4 h-4 cursor-pointer"
              checked={selectedIds.size === monthExpenses.length && monthExpenses.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size > 0 ? `${selectedIds.size} de ${monthExpenses.length} selecionados` : 'Selecionar todos'}
            </span>
          </div>

          {monthExpenses.map((exp, i) => {
            const amount = exp.type === 'installment' ? (exp.installmentAmount ?? 0) : exp.totalAmount
            const isSelected = selectedIds.has(exp.id)
            return (
              <div
                key={exp.id}
                className={`flex items-center gap-3 px-5 py-4 border-b last:border-0 animate-slide-in ${exp.isSimulation ? 'border-l-2 border-l-amber-500/40' : ''} ${isSelected ? 'bg-rose-500/5' : ''}`}
                style={{ borderColor: 'var(--border)', animationDelay: `${i * 30}ms` }}
              >
                <input
                  type="checkbox"
                  className="accent-rose-500 w-4 h-4 cursor-pointer shrink-0"
                  checked={isSelected}
                  onChange={() => toggleSelect(exp.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{exp.description}</p>
                    {exp.type === 'installment' && <Badge variant="blue">{exp.currentInstallment}/{exp.totalInstallments}x</Badge>}
                    {exp.type === 'recurring' && <Badge variant="emerald">Recorrente</Badge>}
                    {exp.isSimulation && <Badge variant="simulation"><AlertTriangle size={10} /> Simulação</Badge>}
                    {exp.isShared && <Badge variant="muted">Compartilhado</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{categoryLabel(exp.category)}{exp.subcategory ? ` · ${exp.subcategory}` : ''}</span>
                    <span>·</span>
                    <span>{cardName(exp.cardId)}</span>
                    {exp.purchaseDate && <><span>·</span><span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400">{formatDate(exp.purchaseDate)}</span></>}
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
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory, subcategory: '' }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {subcategoriesFor(form.category).length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Subcategoria</label>
                <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                  <option value="">— Sem subcategoria —</option>
                  {subcategoriesFor(form.category).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
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
