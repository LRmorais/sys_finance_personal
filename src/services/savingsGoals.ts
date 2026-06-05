import { supabase } from '../lib/supabase'
import { SavingsGoal } from '../types'

function toGoal(row: Record<string, unknown>): SavingsGoal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    targetDate: row.target_date as string | undefined,
    color: row.color as string,
    icon: row.icon as string | undefined,
    createdAt: row.created_at as string,
  }
}

export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map(toGoal)
}

export async function createSavingsGoal(data: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal> {
  const { data: row, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: data.userId,
      name: data.name,
      target_amount: data.targetAmount,
      current_amount: data.currentAmount,
      target_date: data.targetDate,
      color: data.color,
      icon: data.icon,
    })
    .select()
    .single()
  if (error) throw error
  return toGoal(row)
}

export async function updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.targetAmount !== undefined) payload.target_amount = data.targetAmount
  if (data.currentAmount !== undefined) payload.current_amount = data.currentAmount
  if (data.targetDate !== undefined) payload.target_date = data.targetDate
  if (data.color !== undefined) payload.color = data.color
  if (data.icon !== undefined) payload.icon = data.icon
  const { data: row, error } = await supabase
    .from('savings_goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toGoal(row)
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id)
  if (error) throw error
}
