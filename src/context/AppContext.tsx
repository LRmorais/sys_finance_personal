import { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react'
import { supabase } from '../lib/supabase'
import { appReducer, initialState, AppState } from './AppReducer'
import { AppAction } from './AppActions'
import { fetchIncomes } from '../services/incomes'
import { fetchCreditCards } from '../services/creditCards'
import { fetchExpenses } from '../services/expenses'
import { fetchSavingsGoals } from '../services/savingsGoals'
import { fetchCardInvoices } from '../services/cardInvoices'
import { ToastMessage } from '../types'

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  toasts: ToastMessage[]
  addToast: (type: ToastMessage['type'], message: string) => void
  removeToast: (id: string) => void
  reloadData: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  function addToast(type: ToastMessage['type'], message: string) {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => removeToast(id), 4000)
  }

  function removeToast(id: string) {
    setToasts(t => t.filter(m => m.id !== id))
  }

  async function reloadData(userId?: string) {
    const uid = userId ?? state.user?.id
    if (!uid) return
    try {
      const [incomes, cards, expenses, savingsGoals, cardInvoices] = await Promise.all([
        fetchIncomes(uid),
        fetchCreditCards(uid),
        fetchExpenses(uid),
        fetchSavingsGoals(uid),
        fetchCardInvoices(uid),
      ])
      dispatch({ type: 'LOAD_DATA', payload: { incomes, cards, expenses, savingsGoals, cardInvoices } })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar dados.' })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_USER', payload: session?.user ?? null })
      if (session?.user) {
        reloadData(session.user.id)
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_USER', payload: session?.user ?? null })
      if (session?.user) {
        reloadData(session.user.id)
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, toasts, addToast, removeToast, reloadData: () => reloadData() }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
