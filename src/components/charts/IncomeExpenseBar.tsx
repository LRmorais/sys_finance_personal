import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '../../utils/currency'

interface DataPoint {
  month: string
  entradas: number
  gastos: number
}

interface Props {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-4 py-3 text-sm space-y-1">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function IncomeExpenseBar({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis
          dataKey="month"
          tick={{ fill: '#8b8b9e', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8b8b9e', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#8b8b9e' }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="entradas" fill="#10b981" radius={[6, 6, 0, 0]} name="Entradas" />
        <Bar dataKey="gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Gastos" />
      </BarChart>
    </ResponsiveContainer>
  )
}
