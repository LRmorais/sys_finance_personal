import { format, addMonths, isWithinInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  return format(date, 'MMMM yyyy', { locale: ptBR })
    .replace(/^\w/, c => c.toUpperCase())
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

export function calculateBillingMonth(
  purchaseDate: Date,
  closingDay: number
): { month: number; year: number } {
  const day = purchaseDate.getDate()
  if (day <= closingDay) {
    return {
      month: purchaseDate.getMonth() + 1,
      year: purchaseDate.getFullYear(),
    }
  }
  const next = addMonths(purchaseDate, 1)
  return {
    month: next.getMonth() + 1,
    year: next.getFullYear(),
  }
}

export function addMonthsToDate(month: number, year: number, n: number): { month: number; year: number } {
  const date = addMonths(new Date(year, month - 1, 1), n)
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

export function isUpcoming(dateStr: string, days = 15): boolean {
  const date = parseISO(dateStr)
  const now = new Date()
  const future = new Date(now)
  future.setDate(future.getDate() + days)
  return isWithinInterval(date, { start: now, end: future })
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
