import { supabase } from '../lib/supabase'

export async function fetchPaidExpenseIds(
  userId: string,
  month: number,
  year: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('expense_id')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
  if (error) throw error
  return (data ?? []).map(r => r.expense_id as string)
}

export async function markRecurringPaid(
  userId: string,
  expenseId: string,
  month: number,
  year: number
): Promise<void> {
  const { error } = await supabase
    .from('recurring_payments')
    .upsert({ user_id: userId, expense_id: expenseId, month, year },
             { onConflict: 'user_id,expense_id,month,year' })
  if (error) throw error
}

export async function markRecurringUnpaid(
  userId: string,
  expenseId: string,
  month: number,
  year: number
): Promise<void> {
  const { error } = await supabase
    .from('recurring_payments')
    .delete()
    .eq('user_id', userId)
    .eq('expense_id', expenseId)
    .eq('month', month)
    .eq('year', year)
  if (error) throw error
}
