import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useConfirm } from '../context/ConfirmContext'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import MonthNavigator from '../components/ui/MonthNavigator'
import CurrencyInput from '../components/ui/CurrencyInput'
import { formatCurrency } from '../utils/currency'
import { getMonthExpenses, getCardInvoiceTotal, getCardStatus } from '../utils/calculations'
import { createCreditCard, updateCreditCard, deleteCreditCard } from '../services/creditCards'
import { upsertCardInvoice } from '../services/cardInvoices'
import { CreditCard, Expense } from '../types'
import { Plus, CreditCard as CardIcon, Pencil, Trash2, CheckCircle } from 'lucide-react'

const COLORS = ['#6366f1','#10b981','#f43f5e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#8b5cf6','#111111']
const emptyForm = { name: '', lastDigits: '', closingDay: 10, dueDay: 15, color: COLORS[0], limit: 0 }

const STATUS_LABELS = { open: 'Aberta', closed: 'Fechada', paid: 'Paga' }
const STATUS_COLORS = { open: 'amber', closed: 'blue', paid: 'emerald' } as const

export default function Cards() {
  const { state, dispatch, addToast } = useApp()
  const confirm = useConfirm()
  const { cards, expenses, cardInvoices, selectedMonth, selectedYear, user } = state
  const [tab, setTab] = useState<'cards' | 'limits'>('cards')
  const [modal, setModal] = useState(false)
  const [detailCard, setDetailCard] = useState<CreditCard | null>(null)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(c: CreditCard) {
    setEditing(c)
    setForm({ name: c.name, lastDigits: c.lastDigits, closingDay: c.closingDay, dueDay: c.dueDay, color: c.color, limit: c.limit ?? 0 })
    setModal(true)
  }

  async function handleSave() {
    if (!form.name) return addToast('error', 'Informe o nome do cartão.')
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateCreditCard(editing.id, { ...form })
        dispatch({ type: 'UPDATE_CARD', payload: updated })
        addToast('success', 'Cartão atualizado.')
      } else {
        const created = await createCreditCard({ userId: user!.id, ...form })
        dispatch({ type: 'ADD_CARD', payload: created })
        addToast('success', 'Cartão criado.')
      }
      setModal(false)
    } catch { addToast('error', 'Erro ao salvar.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!await confirm({ title: 'Excluir cartão?', message: 'Todos os gastos vinculados a este cartão também serão desvinculados.' })) return
    try {
      dispatch({ type: 'DELETE_CARD', payload: id })
      await deleteCreditCard(id)
      addToast('success', 'Cartão excluído.')
    } catch { addToast('error', 'Erro ao excluir.') }
  }

  async function markPaid(card: CreditCard) {
    try {
      const inv = await upsertCardInvoice({
        userId: user!.id, cardId: card.id, month: selectedMonth, year: selectedYear,
        isPaid: true, paidAt: new Date().toISOString(),
      })
      dispatch({ type: 'UPSERT_CARD_INVOICE', payload: inv })
      addToast('success', 'Fatura marcada como paga.')
    } catch { addToast('error', 'Erro ao marcar fatura.') }
  }

  function getExpensesByType(cardId: string) {
    const me = getMonthExpenses(expenses, selectedMonth, selectedYear).filter(e => e.cardId === cardId)
    return {
      cash: me.filter(e => e.type === 'cash'),
      installment: me.filter(e => e.type === 'installment'),
      recurring: me.filter(e => e.type === 'recurring'),
    }
  }

  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${tab === t ? 'bg-white/10 text-white' : 'text-[var(--text-muted)] hover:text-white'}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl">Cartões</h1>
        <div className="flex items-center gap-3">
          <MonthNavigator />
          <Button onClick={openNew} size="sm"><Plus size={16} /> Adicionar</Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        <button className={tabCls('cards')} onClick={() => setTab('cards')}>Cartões</button>
        <button className={tabCls('limits')} onClick={() => setTab('limits')}>Limites</button>
      </div>

      {tab === 'cards' && (
        cards.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <CardIcon size={24} className="text-indigo-400" />
            </div>
            <p className="font-medium">Nenhum cartão cadastrado</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => {
              const total = getCardInvoiceTotal(expenses, card.id, selectedMonth, selectedYear)
              const status = getCardStatus(card, cardInvoices, selectedMonth, selectedYear)
              return (
                <div
                  key={card.id}
                  className="card card-hover p-5 cursor-pointer animate-fade-in relative overflow-hidden"
                  onClick={() => setDetailCard(card)}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-8 translate-x-8" style={{ background: card.color }} />
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}25` }}>
                      <CardIcon size={20} style={{ color: card.color }} />
                    </div>
                    <Badge variant={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                  </div>
                  <p className="font-medium">{card.name}</p>
                  {card.lastDigits && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>•••• {card.lastDigits}</p>}
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fatura do mês</p>
                    <p className="font-display text-xl mt-0.5 text-white">{formatCurrency(total)}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Fecha dia {card.closingDay}</span>
                    <span className="mx-1">·</span>
                    <span>Vence dia {card.dueDay}</span>
                  </div>
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(card)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(card.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                    {status !== 'paid' && (
                      <button onClick={() => markPaid(card)} className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer">
                        <CheckCircle size={12} /> Marcar pago
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'limits' && (() => {
        const rows = cards.map(card => {
          const used = getCardInvoiceTotal(expenses, card.id, selectedMonth, selectedYear)
          const limit = card.limit ?? 0
          const available = limit - used
          const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
          return { card, used, limit, available, pct }
        })
        const totalLimit = rows.reduce((s, r) => s + r.limit, 0)
        const totalUsed = rows.reduce((s, r) => s + r.used, 0)
        const totalAvailable = totalLimit - totalUsed

        return cards.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <CardIcon size={24} className="text-indigo-400" />
            </div>
            <p className="font-medium">Nenhum cartão cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(({ card, used, limit, available, pct }) => (
              <div key={card.id} className="card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${card.color}25` }}>
                    <CardIcon size={16} style={{ color: card.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{card.name}</p>
                    {card.lastDigits && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>•••• {card.lastDigits}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Limite</p>
                    <p className="font-display text-sm">{limit > 0 ? formatCurrency(limit) : '—'}</p>
                  </div>
                </div>
                {limit > 0 && (
                  <>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct > 80 ? '#f43f5e' : pct > 50 ? '#f59e0b' : card.color }}
                      />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>Usado: <span className="text-rose-400 font-medium">{formatCurrency(used)}</span></span>
                      <span>Disponível: <span className="text-emerald-400 font-medium">{formatCurrency(available)}</span></span>
                    </div>
                  </>
                )}
                {limit === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fatura do mês: <span className="text-white">{formatCurrency(used)}</span></p>
                )}
              </div>
            ))}

            {totalLimit > 0 && (
              <div className="card p-5 border border-white/10">
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Total</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Limite total</p>
                    <p className="font-display text-lg">{formatCurrency(totalLimit)}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Usado</p>
                    <p className="font-display text-lg text-rose-400">{formatCurrency(totalUsed)}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Disponível</p>
                    <p className="font-display text-lg text-emerald-400">{formatCurrency(totalAvailable)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Card detail modal */}
      {detailCard && (
        <Modal open={!!detailCard} onClose={() => setDetailCard(null)} title={detailCard.name} size="lg">
          <div className="space-y-4">
            {Object.entries(getExpensesByType(detailCard.id)).map(([type, items]) => {
              if (!items.length) return null
              const labels = { cash: 'À Vista', installment: 'Parceladas', recurring: 'Recorrentes' }
              return (
                <div key={type}>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{labels[type as keyof typeof labels]}</h3>
                  <div className="space-y-1">
                    {(items as Expense[]).map(exp => (
                      <div key={exp.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm" style={{ borderColor: 'var(--border)' }}>
                        <span>{exp.description}{exp.type === 'installment' ? ` (${exp.currentInstallment}/${exp.totalInstallments})` : ''}</span>
                        <span className="text-rose-400 font-medium">{formatCurrency(exp.type === 'installment' ? (exp.installmentAmount ?? 0) : exp.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t flex justify-between font-display text-lg" style={{ borderColor: 'var(--border)' }}>
              <span>Total</span>
              <span className="text-rose-400">{formatCurrency(getCardInvoiceTotal(expenses, detailCard.id, selectedMonth, selectedYear))}</span>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Cartão' : 'Novo Cartão'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nome <span className="text-rose-400">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Ex: Nubank, XP..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Últimos 4 dígitos</label>
              <input maxLength={4} value={form.lastDigits} onChange={e => setForm(f => ({ ...f, lastDigits: e.target.value.replace(/\D/, '') }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" placeholder="0000" />
            </div>
            <CurrencyInput label="Limite" value={form.limit} onChange={v => setForm(f => ({ ...f, limit: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Dia de fechamento</label>
              <input type="number" min={1} max={31} value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: Number(e.target.value) }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Dia de vencimento</label>
              <input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: Number(e.target.value) }))} className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110" style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
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
