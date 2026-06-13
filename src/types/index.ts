export type ExpenseCategory =
  | 'casa'
  | 'carro'
  | 'transporte'
  | 'saude'
  | 'lazer'
  | 'viagem'
  | 'servicos'
  | 'outros'

export interface Income {
  id: string
  userId: string
  name: string
  amount: number
  dayOfMonth: number
  month: number | null
  year: number | null
  isRecurring: boolean
  // segmento de validade para recorrentes
  validFromMonth?: number | null
  validFromYear?: number | null
  validUntilMonth?: number | null
  validUntilYear?: number | null
  notes?: string
  createdAt: string
}

export interface CreditCard {
  id: string
  userId: string
  name: string
  lastDigits: string
  closingDay: number
  dueDay: number
  color: string
  limit?: number
  createdAt: string
}

export interface Expense {
  id: string
  userId: string
  parentId?: string | null
  description: string
  totalAmount: number
  cardId: string | null
  category: ExpenseCategory
  type: 'cash' | 'installment' | 'recurring'
  totalInstallments?: number
  currentInstallment?: number
  installmentAmount?: number
  recurringDay?: number
  purchaseDate: string
  billingMonth: number
  billingYear: number
  isShared?: boolean
  sharedWith?: string
  sharedAmount?: number
  isSimulation?: boolean
  isPaid?: boolean
  subcategory?: string | null
  // limite de validade para recorrentes
  validUntilMonth?: number | null
  validUntilYear?: number | null
  notes?: string
  createdAt: string
}

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  color: string
  icon?: string
  createdAt: string
}

export interface SavingsDeposit {
  id: string
  userId: string
  goalId: string
  amount: number
  note?: string
  depositedAt: string
}

export interface CardInvoice {
  id: string
  userId: string
  cardId: string
  month: number
  year: number
  isPaid: boolean
  paidAt?: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}
