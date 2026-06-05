import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { formatCurrency } from '../../utils/currency'

interface DataPoint {
  month: string
  real: number
  simulado?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-4 py-3 text-sm space-y-1">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

export default function ProjectionLine({ data, showSimulation }: { data: DataPoint[]; showSimulation?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
        <XAxis dataKey="month" tick={{ fill: '#8b8b9e', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b8b9e', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#8b8b9e' }} iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="real" stroke="#10b981" strokeWidth={2} dot={false} name="Saldo Projetado" />
        {showSimulation && (
          <Line type="monotone" dataKey="simulado" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Com Simulações" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
