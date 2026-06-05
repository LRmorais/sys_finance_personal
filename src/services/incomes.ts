import { supabase } from '../lib/supabase'
import { Income } from '../types'

function toIncome(row: Record<string, unknown>): Income {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    amount: Number(row.amount),
    dayOfMonth: row.day_of_month as number,
    month: row.month as number | null,
    year: row.year as number | null,
    isRecurring: row.is_recurring as boolean,
    validFromMonth: row.valid_from_month as number | null,
    validFromYear: row.valid_from_year as number | null,
    validUntilMonth: row.valid_until_month as number | null,
    validUntilYear: row.valid_until_year as number | null,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  }
}

function toPayload(data: Partial<Income>): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  if (data.userId !== undefined)        p.user_id = data.userId
  if (data.name !== undefined)          p.name = data.name
  if (data.amount !== undefined)        p.amount = data.amount
  if (data.dayOfMonth !== undefined)    p.day_of_month = data.dayOfMonth
  if (data.month !== undefined)         p.month = data.month
  if (data.year !== undefined)          p.year = data.year
  if (data.isRecurring !== undefined)   p.is_recurring = data.isRecurring
  if (data.validFromMonth !== undefined) p.valid_from_month = data.validFromMonth
  if (data.validFromYear !== undefined)  p.valid_from_year = data.validFromYear
  if (data.validUntilMonth !== undefined) p.valid_until_month = data.validUntilMonth
  if (data.validUntilYear !== undefined)  p.valid_until_year = data.validUntilYear
  if (data.notes !== undefined)         p.notes = data.notes
  return p
}

export async function fetchIncomes(userId: string): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toIncome)
}

export async function createIncome(data: Omit<Income, 'id' | 'createdAt'>): Promise<Income> {
  const { data: row, error } = await supabase
    .from('incomes')
    .insert(toPayload(data))
    .select()
    .single()
  if (error) throw error
  return toIncome(row)
}

export async function updateIncome(id: string, data: Partial<Income>): Promise<Income> {
  const { data: row, error } = await supabase
    .from('incomes')
    .update(toPayload(data))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toIncome(row)
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id)
  if (error) throw error
}
