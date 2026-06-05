import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear, addMonthsToDate } from '../../utils/dates'
import { useApp } from '../../context/AppContext'

export default function MonthNavigator() {
  const { state, dispatch } = useApp()
  const { selectedMonth, selectedYear } = state

  function navigate(delta: number) {
    const { month, year } = addMonthsToDate(selectedMonth, selectedYear, delta)
    dispatch({ type: 'SET_MONTH', payload: { month, year } })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="font-display text-lg min-w-[160px] text-center">
        {formatMonthYear(selectedMonth, selectedYear)}
      </span>
      <button
        onClick={() => navigate(1)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Próximo mês"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
