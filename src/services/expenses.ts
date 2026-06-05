import { supabase } from '../lib/supabase'
import { Expense, ExpenseCategory } from '../types'

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    parentId: row.parent_id as string | null,
    description: row.description as string,
    totalAmount: Number(row.total_amount),
    cardId: row.card_id as string | null,
    category: row.category as ExpenseCategory,
    type: row.type as 'cash' | 'installment' | 'recurring',
    totalInstallments: row.total_installments as number | undefined,
    currentInstallment: row.current_installment as number | undefined,
    installmentAmount: row.installment_amount ? Number(row.installment_amount) : undefined,
    recurringDay: row.recurring_day as number | undefined,
    purchaseDate: row.purchase_date as string,
    billingMonth: row.billing_month as number,
    billingYear: row.billing_year as number,
    isShared: row.is_shared as boolean | undefined,
    sharedWith: row.shared_with as string | undefined,
    sharedAmount: row.shared_amount ? Number(row.shared_amount) : undefined,
    isSimulation: row.is_simulation as boolean | undefined,
    isPaid: row.is_paid as boolean | undefined,
    validUntilMonth: row.valid_until_month as number | null | undefined,
    validUntilYear: row.valid_until_year as number | null | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  }
}

function toRow(data: Partial<Expense>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (data.userId !== undefined) row.user_id = data.userId
  if (data.parentId !== undefined) row.parent_id = data.parentId
  if (data.description !== undefined) row.description = data.description
  if (data.totalAmount !== undefined) row.total_amount = data.totalAmount
  if (data.cardId !== undefined) row.card_id = data.cardId
  if (data.category !== undefined) row.category = data.category
  if (data.type !== undefined) row.type = data.type
  if (data.totalInstallments !== undefined) row.total_installments = data.totalInstallments
  if (data.currentInstallment !== undefined) row.current_installment = data.currentInstallment
  if (data.installmentAmount !== undefined) row.installment_amount = data.installmentAmount
  if (data.recurringDay !== undefined) row.recurring_day = data.recurringDay
  if (data.purchaseDate !== undefined) row.purchase_date = data.purchaseDate
  if (data.billingMonth !== undefined) row.billing_month = data.billingMonth
  if (data.billingYear !== undefined) row.billing_year = data.billingYear
  if (data.isShared !== undefined) row.is_shared = data.isShared
  if (data.sharedWith !== undefined) row.shared_with = data.sharedWith
  if (data.sharedAmount !== undefined) row.shared_amount = data.sharedAmount
  if (data.isSimulation !== undefined) row.is_simulation = data.isSimulation
  if (data.isPaid !== undefined) row.is_paid = data.isPaid
  if (data.validUntilMonth !== undefined) row.valid_until_month = data.validUntilMonth
  if (data.validUntilYear !== undefined) row.valid_until_year = data.validUntilYear
  if (data.notes !== undefined) row.notes = data.notes
  return row
}

export async function fetchExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toExpense)
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const { data: row, error } = await supabase
    .from('expenses')
    .insert(toRow(data))
    .select()
    .single()
  if (error) throw error
  return toExpense(row)
}

export async function createExpensesBatch(
  items: Omit<Expense, 'id' | 'createdAt'>[]
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(items.map(toRow))
    .select()
  if (error) throw error
  return (data ?? []).map(toExpense)
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  const { data: row, error } = await supabase
    .from('expenses')
    .update(toRow(data))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toExpense(row)
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function deleteExpensesByParent(parentId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('parent_id', parentId)
  if (error) throw error
}
