import { Expense, Income, CardInvoice, CreditCard } from '../types'
import { addMonthsToDate } from './dates'

function afterOrAt(month: number, year: number, fromMonth: number, fromYear: number): boolean {
  return year > fromYear || (year === fromYear && month >= fromMonth)
}

function beforeOrAt(month: number, year: number, untilMonth: number, untilYear: number): boolean {
  return year < untilYear || (year === untilYear && month <= untilMonth)
}

export function getMonthIncomes(
  incomes: Income[],
  month: number,
  year: number
): Income[] {
  return incomes.filter(inc => {
    if (!inc.isRecurring) return inc.month === month && inc.year === year

    // validFrom: se definido, a recorrência começa naquele mês
    if (inc.validFromMonth && inc.validFromYear) {
      if (!afterOrAt(month, year, inc.validFromMonth, inc.validFromYear)) return false
    }
    // validUntil: se definido, a recorrência termina naquele mês (inclusive)
    if (inc.validUntilMonth && inc.validUntilYear) {
      if (!beforeOrAt(month, year, inc.validUntilMonth, inc.validUntilYear)) return false
    }
    return true
  })
}

export function getMonthExpenses(
  expenses: Expense[],
  month: number,
  year: number
): Expense[] {
  return expenses.filter(exp => {
    if (exp.type === 'recurring') {
      // começa em billingMonth/billingYear
      if (!afterOrAt(month, year, exp.billingMonth, exp.billingYear)) return false
      // termina em validUntil (se definido)
      if (exp.validUntilMonth && exp.validUntilYear) {
        if (!beforeOrAt(month, year, exp.validUntilMonth, exp.validUntilYear)) return false
      }
      return true
    }
    return exp.billingMonth === month && exp.billingYear === year
  })
}

export function getTotalIncomes(incomes: Income[]): number {
  return incomes.reduce((sum, i) => sum + i.amount, 0)
}

export function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => {
    const amount = e.type === 'installment' ? (e.installmentAmount ?? 0) : e.totalAmount
    return sum + amount
  }, 0)
}

export function getCardInvoiceTotal(
  expenses: Expense[],
  cardId: string,
  month: number,
  year: number
): number {
  return getMonthExpenses(expenses, month, year)
    .filter(e => e.cardId === cardId)
    .reduce((sum, e) => {
      const amount = e.type === 'installment' ? (e.installmentAmount ?? 0) : e.totalAmount
      return sum + amount
    }, 0)
}

export function buildInstallments(
  base: Omit<Expense, 'id' | 'createdAt'>,
  totalInstallments: number
): Omit<Expense, 'id' | 'createdAt'>[] {
  const installmentAmount = base.totalAmount / totalInstallments
  const result: Omit<Expense, 'id' | 'createdAt'>[] = []
  for (let i = 0; i < totalInstallments; i++) {
    const { month, year } = addMonthsToDate(base.billingMonth, base.billingYear, i)
    result.push({
      ...base,
      billingMonth: month,
      billingYear: year,
      currentInstallment: i + 1,
      totalInstallments,
      installmentAmount: parseFloat(installmentAmount.toFixed(2)),
    })
  }
  return result
}

export function getCardStatus(
  card: CreditCard,
  invoices: CardInvoice[],
  month: number,
  year: number
): 'open' | 'closed' | 'paid' {
  const invoice = invoices.find(
    inv => inv.cardId === card.id && inv.month === month && inv.year === year
  )
  if (invoice?.isPaid) return 'paid'
  const today = new Date()
  const closingDate = new Date(year, month - 1, card.closingDay)
  if (today > closingDate) return 'closed'
  return 'open'
}
