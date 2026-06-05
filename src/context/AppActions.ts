import { Income, CreditCard, Expense, SavingsGoal, SavingsDeposit, CardInvoice } from '../types'
import { User } from '@supabase/supabase-js'

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_DATA'; payload: { incomes: Income[]; cards: CreditCard[]; expenses: Expense[]; savingsGoals: SavingsGoal[]; cardInvoices: CardInvoice[] } }
  | { type: 'SET_MONTH'; payload: { month: number; year: number } }
  | { type: 'SET_SIMULATION_MODE'; payload: boolean }
  | { type: 'ADD_INCOME'; payload: Income }
  | { type: 'UPDATE_INCOME'; payload: Income }
  | { type: 'DELETE_INCOME'; payload: string }
  | { type: 'ADD_CARD'; payload: CreditCard }
  | { type: 'UPDATE_CARD'; payload: CreditCard }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'ADD_EXPENSES'; payload: Expense[] }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'DELETE_EXPENSES_BY_PARENT'; payload: string }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
  | { type: 'ADD_SAVINGS_DEPOSIT'; payload: SavingsDeposit }
  | { type: 'UPSERT_CARD_INVOICE'; payload: CardInvoice }
