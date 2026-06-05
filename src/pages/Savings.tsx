import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useConfirm } from '../context/ConfirmContext'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import CurrencyInput from '../components/ui/CurrencyInput'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/dates'
import { createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../services/savingsGoals'
import { createSavingsDeposit, fetchSavingsDeposits } from '../services/savingsDeposits'
import { SavingsGoal, SavingsDeposit } from '../types'
import { Plus, PiggyBank, Pencil, Trash2, ArrowDownCircle } from 'lucide-react'

const COLORS = ['#10b981','#6366f1','#f59e0b','#f43f5e','#3b82f6','#ec4899']
const ICONS = ['🎯','🏠','✈️','🚗','📚','💍','🏋️','💻','🎓','🌍']
const emptyGoal = { name: '', targetAmount: 0, currentAmount: 0, targetDate: '', color: COLORS[0], icon: '🎯' }

export default function Savings() {
  const { state, dispatch, addToast } = useApp()
  const confirm = useConfirm()
  const { savingsGoals, user } = state
  const [goalModal, setGoalModal] = useState(false)
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null)
  const [depositModal, setDepositModal] = useState(false)
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null)
  const [deposits, setDeposits] = useState<SavingsDeposit[]>([])
  const [form, setForm] = useState(emptyGoal)
  const [depositForm, setDepositForm] = useState({ amount: 0, note: '' })
  const [saving, setSaving] = useState(false)

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0)

  function openNew() { setEditGoal(null); setForm(emptyGoal); setGoalModal(true) }
  function openEdit(g: SavingsGoal) {
    setEditGoal(g)
    setForm({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount, targetDate: g.targetDate ?? '', color: g.color, icon: g.icon ?? '🎯' })
    setGoalModal(true)
  }

  async function openDeposit(g: SavingsGoal) {
    setDepositGoal(g)
    setDepositForm({ amount: 0, note: '' })
    const deps = await fetchSavingsDeposits(user!.id)
    setDeposits(deps.filter(d => d.goalId === g.id))
    setDepositModal(true)
  }

  async function handleSaveGoal() {
    if (!form.name || !form.targetAmount) return addToast('error', 'Preencha nome e meta.')
    setSaving(true)
    try {
      if (editGoal) {
        const updated = await updateSavingsGoal(editGoal.id, { ...form, targetDate: form.targetDate || undefined })
        dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: updated })
        addToast('success', 'Meta atualizada.')
      } else {
        const created = await createSavingsGoal({ userId: user!.id, ...form, targetDate: form.targetDate || undefined })
        dispatch({ type: 'ADD_SAVINGS_GOAL', payload: created })
        addToast('success', 'Meta criada.')
      }
      setGoalModal(false)
    } catch { addToast('error', 'Erro ao salvar.') }
    setSaving(false)
  }

  async function handleDeposit() {
    if (!depositForm.amount || !depositGoal) return addToast('error', 'Informe o valor.')
    setSaving(true)
    try {
      const dep = await createSavingsDeposit({ userId: user!.id, goalId: depositGoal.id, amount: depositForm.amount, note: depositForm.note || undefined })
      const newAmount = depositGoal.currentAmount + depositForm.amount
      const updated = await updateSavingsGoal(depositGoal.id, { currentAmount: newAmount })
      dispatch({ type: 'ADD_SAVINGS_DEPOSIT', payload: dep })
      dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: updated })
      setDeposits(d => [dep, ...d])
      setDepositForm({ amount: 0, note: '' })
      addToast('success', 'Depósito registrado.')
    } catch { addToast('error', 'Erro ao depositar.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!await confirm({ title: 'Excluir meta?', message: 'O histórico de depósitos desta meta também será excluído.' })) return
    try {
      dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id })
      await deleteSavingsGoal(id)
      addToast('success', 'Meta excluída.')
    } catch { addToast('error', 'Erro ao excluir.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Poupança</h1>
        <Button onClick={openNew} size="sm"><Plus size={16} /> Nova Meta</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total poupado</p>
          <p className="font-display text-2xl text-emerald-400 mt-1">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total em metas</p>
          <p className="font-display text-2xl mt-1">{formatCurrency(totalTarget)}</p>
        </div>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <PiggyBank size={24} className="text-emerald-400" />
          </div>
          <p className="font-medium">Nenhuma meta criada</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {savingsGoals.map(g => {
            const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100)
            const remaining = g.targetAmount - g.currentAmount
            return (
              <div key={g.id} className="card card-hover p-5 animate-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <p className="font-medium">{g.name}</p>
                      {g.targetDate && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Meta: {formatDate(g.targetDate)}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: g.color }}>{formatCurrency(g.currentAmount)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(g.targetAmount)}</span>
                  </div>
                  <ProgressBar value={g.currentAmount} max={g.targetAmount} color={g.color} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}% — falta {formatCurrency(remaining)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openDeposit(g)} className="w-full">
                  <ArrowDownCircle size={14} /> Depositar
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={goalModal} onClose={() => setGoalModal(false)} title={editGoal ? 'Editar Meta' : 'Nova Meta'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nome <span className="text-rose-400">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Meta (R$)" required value={form.targetAmount} onChange={v => setForm(f => ({ ...f, targetAmount: v }))} />
            <CurrencyInput label="Já poupado" value={form.currentAmount} onChange={v => setForm(f => ({ ...f, currentAmount: v }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Data alvo</label>
            <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ícone</label>
            <div className="flex gap-2 flex-wrap">{ICONS.map(i => <button key={i} onClick={() => setForm(f => ({ ...f, icon: i }))} className={`text-xl p-1.5 rounded-lg transition-colors cursor-pointer ${form.icon === i ? 'bg-white/20' : 'hover:bg-white/10'}`}>{i}</button>)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Cor</label>
            <div className="flex gap-2">{COLORS.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110" style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />)}</div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setGoalModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaveGoal} loading={saving} className="flex-1">Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={depositModal} onClose={() => setDepositModal(false)} title={`Depositar — ${depositGoal?.name}`}>
        <div className="space-y-4">
          <CurrencyInput label="Valor" required value={depositForm.amount} onChange={v => setDepositForm(f => ({ ...f, amount: v }))} />
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nota</label>
            <input value={depositForm.note} onChange={e => setDepositForm(f => ({ ...f, note: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <Button onClick={handleDeposit} loading={saving} className="w-full">Depositar</Button>
          {deposits.length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Histórico</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {deposits.map(d => (
                  <div key={d.id} className="flex justify-between text-sm py-1 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatDate(d.depositedAt)}{d.note ? ` · ${d.note}` : ''}</span>
                    <span className="text-emerald-400">+{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
