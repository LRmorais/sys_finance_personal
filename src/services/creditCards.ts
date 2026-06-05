import { supabase } from '../lib/supabase'
import { CreditCard } from '../types'

function toCard(row: Record<string, unknown>): CreditCard {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    lastDigits: row.last_digits as string,
    closingDay: row.closing_day as number,
    dueDay: row.due_day as number,
    color: row.color as string,
    limit: row.card_limit ? Number(row.card_limit) : undefined,
    createdAt: row.created_at as string,
  }
}

export async function fetchCreditCards(userId: string): Promise<CreditCard[]> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map(toCard)
}

export async function createCreditCard(data: Omit<CreditCard, 'id' | 'createdAt'>): Promise<CreditCard> {
  const { data: row, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: data.userId,
      name: data.name,
      last_digits: data.lastDigits,
      closing_day: data.closingDay,
      due_day: data.dueDay,
      color: data.color,
      card_limit: data.limit,
    })
    .select()
    .single()
  if (error) throw error
  return toCard(row)
}

export async function updateCreditCard(id: string, data: Partial<CreditCard>): Promise<CreditCard> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.lastDigits !== undefined) payload.last_digits = data.lastDigits
  if (data.closingDay !== undefined) payload.closing_day = data.closingDay
  if (data.dueDay !== undefined) payload.due_day = data.dueDay
  if (data.color !== undefined) payload.color = data.color
  if (data.limit !== undefined) payload.card_limit = data.limit
  const { data: row, error } = await supabase
    .from('credit_cards')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toCard(row)
}

export async function deleteCreditCard(id: string): Promise<void> {
  const { error } = await supabase.from('credit_cards').delete().eq('id', id)
  if (error) throw error
}
