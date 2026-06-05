import { supabase } from '../lib/supabase'
import { CardInvoice } from '../types'

function toInvoice(row: Record<string, unknown>): CardInvoice {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    cardId: row.card_id as string,
    month: row.month as number,
    year: row.year as number,
    isPaid: row.is_paid as boolean,
    paidAt: row.paid_at as string | undefined,
  }
}

export async function fetchCardInvoices(userId: string): Promise<CardInvoice[]> {
  const { data, error } = await supabase
    .from('card_invoices')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map(toInvoice)
}

export async function upsertCardInvoice(
  data: Omit<CardInvoice, 'id'>
): Promise<CardInvoice> {
  const { data: row, error } = await supabase
    .from('card_invoices')
    .upsert({
      user_id: data.userId,
      card_id: data.cardId,
      month: data.month,
      year: data.year,
      is_paid: data.isPaid,
      paid_at: data.paidAt,
    }, { onConflict: 'card_id,month,year' })
    .select()
    .single()
  if (error) throw error
  return toInvoice(row)
}
