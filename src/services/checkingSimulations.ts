import { supabase } from '../lib/supabase'

export interface CheckingSim {
  id: string
  userId: string
  month: number
  year: number
  day: number
  description: string
  amount: number
  isIncome: boolean
  createdAt: string
}

function toSim(row: Record<string, unknown>): CheckingSim {
  return {
    id:          row.id as string,
    userId:      row.user_id as string,
    month:       row.month as number,
    year:        row.year as number,
    day:         row.day as number,
    description: row.description as string,
    amount:      row.amount as number,
    isIncome:    row.is_income as boolean,
    createdAt:   row.created_at as string,
  }
}

export async function fetchCheckingSims(
  userId: string,
  month: number,
  year: number
): Promise<CheckingSim[]> {
  const { data, error } = await supabase
    .from('checking_simulations')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .order('day')
  if (error) throw error
  return (data ?? []).map(toSim)
}

export async function createCheckingSim(
  payload: Omit<CheckingSim, 'id' | 'createdAt'>
): Promise<CheckingSim> {
  const { data, error } = await supabase
    .from('checking_simulations')
    .insert({
      user_id:     payload.userId,
      month:       payload.month,
      year:        payload.year,
      day:         payload.day,
      description: payload.description,
      amount:      payload.amount,
      is_income:   payload.isIncome,
    })
    .select()
    .single()
  if (error) throw error
  return toSim(data)
}

export async function deleteCheckingSim(id: string): Promise<void> {
  const { error } = await supabase
    .from('checking_simulations')
    .delete()
    .eq('id', id)
  if (error) throw error
}
