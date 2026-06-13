import { ExpenseCategory } from '../types'

export interface CategoryMeta {
  label: string
  color: string
  subcategories: string[]
}

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  casa:        { label: 'Casa',           color: '#6366f1', subcategories: ['Aluguel', 'Condomínio', 'Energia', 'Água', 'Internet', 'Mobília', 'Mercado', 'Outros'] },
  carro:       { label: 'Carro',          color: '#f59e0b', subcategories: ['Gasolina', 'Manutenção', 'Financiamento', 'Estacionamento', 'Outros'] },
  transporte:  { label: 'Transporte',     color: '#14b8a6', subcategories: ['Uber', 'Ônibus'] },
  saude:       { label: 'Saúde',          color: '#ec4899', subcategories: ['Farmácia', 'Consultas', 'Outros'] },
  lazer:       { label: 'Lazer',          color: '#f43f5e', subcategories: ['Restaurante', 'Delivery', 'Passeios', 'Outros'] },
  viagem:      { label: 'Viagem',         color: '#f97316', subcategories: [] },
  servicos:    { label: 'Serviços',       color: '#84cc16', subcategories: ['Streaming', 'Inteligência Artificial', 'Nuvem', 'Cartão de Crédito', 'Outros'] },
  outros:      { label: 'Outros',         color: '#64748b', subcategories: [] },
}

export const CATEGORIES = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value: value as ExpenseCategory,
  label: meta.label,
  color: meta.color,
}))

export function categoryLabel(cat: ExpenseCategory): string {
  return CATEGORY_META[cat]?.label ?? cat
}

export function categoryColor(cat: ExpenseCategory): string {
  return CATEGORY_META[cat]?.color ?? '#64748b'
}

export function subcategoriesFor(cat: ExpenseCategory): string[] {
  return CATEGORY_META[cat]?.subcategories ?? []
}
