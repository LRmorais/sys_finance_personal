import { User } from '@supabase/supabase-js'
import { Income, CreditCard, Expense, SavingsGoal, CardInvoice } from '../types'
import { AppAction } from './AppActions'
import { getCurrentMonthYear } from '../utils/dates'

export interface AppState {
  user: User | null
  incomes: Income[]
  cards: CreditCard[]
  expenses: Expense[]
  savingsGoals: SavingsGoal[]
  cardInvoices: CardInvoice[]
  selectedMonth: number
  selectedYear: number
  simulationMode: boolean
  loading: boolean
  error: string | null
}

const { month, year } = getCurrentMonthYear()

export const initialState: AppState = {
  user: null,
  incomes: [],
  cards: [],
  expenses: [],
  savingsGoals: [],
  cardInvoices: [],
  selectedMonth: month,
  selectedYear: year,
  simulationMode: false,
  loading: true,
  error: null,
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'LOAD_DATA':
      return { ...state, ...action.payload, loading: false }
    case 'SET_MONTH':
      return { ...state, selectedMonth: action.payload.month, selectedYear: action.payload.year }
    case 'SET_SIMULATION_MODE':
      return { ...state, simulationMode: action.payload }

    case 'ADD_INCOME':
      return { ...state, incomes: [action.payload, ...state.incomes] }
    case 'UPDATE_INCOME':
      return { ...state, incomes: state.incomes.map(i => i.id === action.payload.id ? action.payload : i) }
    case 'DELETE_INCOME':
      return { ...state, incomes: state.incomes.filter(i => i.id !== action.payload) }

    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] }
    case 'UPDATE_CARD':
      return { ...state, cards: state.cards.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'DELETE_CARD':
      return { ...state, cards: state.cards.filter(c => c.id !== action.payload) }

    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] }
    case 'ADD_EXPENSES':
      return { ...state, expenses: [...action.payload, ...state.expenses] }
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) }
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) }
    case 'DELETE_EXPENSES_BY_PARENT':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload && e.parentId !== action.payload) }

    case 'ADD_SAVINGS_GOAL':
      return { ...state, savingsGoals: [...state.savingsGoals, action.payload] }
    case 'UPDATE_SAVINGS_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.map(g => g.id === action.payload.id ? action.payload : g) }
    case 'DELETE_SAVINGS_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.filter(g => g.id !== action.payload) }

    case 'ADD_SAVINGS_DEPOSIT':
      return state

    case 'UPSERT_CARD_INVOICE':
      const exists = state.cardInvoices.find(inv => inv.id === action.payload.id)
      if (exists) {
        return { ...state, cardInvoices: state.cardInvoices.map(inv => inv.id === action.payload.id ? action.payload : inv) }
      }
      return { ...state, cardInvoices: [...state.cardInvoices, action.payload] }

    default:
      return state
  }
}
