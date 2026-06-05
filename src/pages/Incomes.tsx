import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useConfirm } from '../context/ConfirmContext'
import MonthNavigator from '../components/ui/MonthNavigator'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import CurrencyInput from '../components/ui/CurrencyInput'
import Badge from '../components/ui/Badge'
import { formatCurrency } from '../utils/currency'
import { getMonthIncomes, getTotalIncomes } from '../utils/calculations'
import { createIncome, updateIncome, deleteIncome } from '../services/incomes'
import { addMonthsToDate, formatMonthYear } from '../utils/dates'
import { Income } from '../types'
import { Plus, Pencil, Trash2, Repeat, Calendar } from 'lucide-react'

type EditScope = 'all' | 'from_now' | 'this_month' | 'stop'

const emptyForm = { name: '', amount: 0, dayOfMonth: 1, isRecurring: true, notes: '' }

export default function Incomes() {
  const { state, dispatch, addToast } = useApp()
  const confirm = useConfirm()
  const { incomes, selectedMonth, selectedYear, user } = state

  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<Income | null>(null)
  const [form, setForm]         = useState(emptyForm)
  const [scope, setScope]       = useState<EditScope>('all')
  const [saving, setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const monthIncomes = getMonthIncomes(incomes, selectedMonth, selectedYear)
  const total        = getTotalIncomes(monthIncomes)

  const prevMonth = addMonthsToDate(selectedMonth, selectedYear, -1)
  const nextMonth = addMonthsToDate(selectedMonth, selectedYear, +1)
  const thisLabel = formatMonthYear(selectedMonth, selectedYear)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setScope('all')
    setModal(true)
  }

  function openEdit(inc: Income) {
    setEditing(inc)
    setForm({ name: inc.name, amount: inc.amount, dayOfMonth: inc.dayOfMonth, isRecurring: inc.isRecurring, notes: inc.notes ?? '' })
    setScope('all')
    setModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.amount) return addToast('error', 'Preencha nome e valor.')
    setSaving(true)
    try {
      // ── Criação ──────────────────────────────────────────────────────────
      if (!editing) {
        const created = await createIncome({
          userId: user!.id, ...form,
          month: form.isRecurring ? null : selectedMonth,
          year:  form.isRecurring ? null : selectedYear,
        })
        dispatch({ type: 'ADD_INCOME', payload: created })
        addToast('success', 'Entrada criada.')

      // ── Edição: não-recorrente ou "todos os meses" ────────────────────────
      } else if (!editing.isRecurring || scope === 'all') {
        const updated = await updateIncome(editing.id, { ...form })
        dispatch({ type: 'UPDATE_INCOME', payload: updated })
        addToast('success', 'Entrada atualizada.')

      // ── Encerrar ──────────────────────────────────────────────────────────
      } else if (scope === 'stop') {
        const updated = await updateIncome(editing.id, {
          validUntilMonth: prevMonth.month,
          validUntilYear:  prevMonth.year,
        })
        dispatch({ type: 'UPDATE_INCOME', payload: updated })
        addToast('success', 'Recorrência encerrada.')

      // ── Deste mês em diante ───────────────────────────────────────────────
      } else if (scope === 'from_now') {
        const [updated, created] = await Promise.all([
          updateIncome(editing.id, {
            validUntilMonth: prevMonth.month,
            validUntilYear:  prevMonth.year,
          }),
          createIncome({
            userId: user!.id, ...form,
            month: null, year: null,
            validFromMonth: selectedMonth,
            validFromYear:  selectedYear,
          }),
        ])
        dispatch({ type: 'UPDATE_INCOME', payload: updated })
        dispatch({ type: 'ADD_INCOME',    payload: created })
        addToast('success', 'Alterado a partir de ' + thisLabel + '.')

      // ── Só este mês ───────────────────────────────────────────────────────
      } else if (scope === 'this_month') {
        const [updated, override, continuation] = await Promise.all([
          updateIncome(editing.id, {
            validUntilMonth: prevMonth.month,
            validUntilYear:  prevMonth.year,
          }),
          createIncome({
            userId: user!.id, ...form,
            isRecurring: false,
            month: selectedMonth,
            year:  selectedYear,
          }),
          createIncome({
            userId: user!.id,
            name:        editing.name,
            amount:      editing.amount,
            dayOfMonth:  editing.dayOfMonth,
            notes:       editing.notes,
            isRecurring: true,
            month: null, year: null,
            validFromMonth: nextMonth.month,
            validFromYear:  nextMonth.year,
          }),
        ])
        dispatch({ type: 'UPDATE_INCOME', payload: updated })
        dispatch({ type: 'ADD_INCOME',    payload: override })
        dispatch({ type: 'ADD_INCOME',    payload: continuation })
        addToast('success', 'Alterado só para ' + thisLabel + '.')
      }

      setModal(false)
    } catch {
      addToast('error', 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!await confirm({ title: 'Excluir entrada?', message: 'Esta ação não pode ser desfeita.' })) return
    setDeletingId(id)
    try {
      dispatch({ type: 'DELETE_INCOME', payload: id })
      await deleteIncome(id)
      addToast('success', 'Entrada excluída.')
    } catch { addToast('error', 'Erro ao excluir.') }
    setDeletingId(null)
  }

  const isEditingRecurring = editing?.isRecurring ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Entradas</h1>
        <div className="flex items-center gap-3">
          <MonthNavigator />
          <Button onClick={openNew} size="sm">
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total do mês</p>
        <p className="font-display text-3xl text-emerald-400 mt-1">{formatCurrency(total)}</p>
      </div>

      {monthIncomes.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Calendar size={24} className="text-emerald-400" />
          </div>
          <p className="font-medium">Nenhuma entrada este mês</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Clique em Adicionar para registrar uma entrada</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {monthIncomes.map((inc, i) => (
            <div
              key={inc.id}
              className="flex items-center justify-between px-5 py-4 border-b last:border-0 animate-slide-in"
              style={{ borderColor: 'var(--border)', animationDelay: `${i * 40}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{inc.name}</p>
                  {inc.isRecurring
                    ? <Badge variant="emerald"><Repeat size={10} /> Recorrente</Badge>
                    : <Badge variant="muted">Dia {inc.dayOfMonth}</Badge>
                  }
                </div>
                {inc.notes && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{inc.notes}</p>}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="font-display text-lg text-emerald-400">{formatCurrency(inc.amount)}</span>
                <button onClick={() => openEdit(inc)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(inc.id)} disabled={deletingId === inc.id} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer disabled:opacity-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Entrada' : 'Nova Entrada'}>
        <div className="space-y-4">

          {/* Campos do formulário */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Nome <span className="text-rose-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ex: Salário, Freela..."
            />
          </div>

          {/* Valor só aparece quando não é "encerrar" */}
          {scope !== 'stop' && (
            <CurrencyInput label="Valor" required value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Dia do mês</label>
            <input
              type="number" min={1} max={31}
              value={form.dayOfMonth}
              onChange={e => setForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {!editing && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 accent-emerald-500" />
              <span className="text-sm">Recorrente (aparece todo mês)</span>
            </label>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notas</label>
            <textarea
              rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Seletor de escopo — só aparece ao editar recorrente */}
          {isEditingRecurring && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-3">Como aplicar a alteração?</p>
              <div className="space-y-2">
                {[
                  { value: 'all',        label: 'Todos os meses',          desc: 'Altera o valor base — afeta todos os meses' },
                  { value: 'from_now',   label: `Deste mês em diante`,     desc: `A partir de ${thisLabel}` },
                  { value: 'this_month', label: `Só ${thisLabel}`,         desc: 'Retoma os valores originais no mês seguinte' },
                  { value: 'stop',       label: 'Encerrar deste mês',      desc: 'Não aparece mais a partir deste mês' },
                ] .map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${scope === opt.value ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}>
                    <input
                      type="radio" name="scope" value={opt.value}
                      checked={scope === opt.value}
                      onChange={() => setScope(opt.value as EditScope)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleSave}
              loading={saving}
              variant={scope === 'stop' ? 'danger' : 'primary'}
              className="flex-1"
            >
              {scope === 'stop' ? 'Encerrar' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
