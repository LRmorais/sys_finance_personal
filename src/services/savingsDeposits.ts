import { supabase } from '../lib/supabase'
import { SavingsDeposit } from '../types'

function toDeposit(row: Record<string, unknown>): SavingsDeposit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    goalId: row.goal_id as string,
    amount: Number(row.amount),
    note: row.note as string | undefined,
    depositedAt: row.deposited_at as string,
  }
}

export async function fetchSavingsDeposits(userId: string): Promise<SavingsDeposit[]> {
  const { data, error } = await supabase
    .from('savings_deposits')
    .select('*')
    .eq('user_id', userId)
    .order('deposited_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toDeposit)
}

export async function createSavingsDeposit(
  data: Omit<SavingsDeposit, 'id' | 'depositedAt'>
): Promise<SavingsDeposit> {
  const { data: row, error } = await supabase
    .from('savings_deposits')
    .insert({
      user_id: data.userId,
      goal_id: data.goalId,
      amount: data.amount,
      note: data.note,
    })
    .select()
    .single()
  if (error) throw error
  return toDeposit(row)
}
