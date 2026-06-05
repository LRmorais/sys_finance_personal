interface Props {
  value: number
  max: number
  color?: string
  showLabel?: boolean
}

export default function ProgressBar({ value, max, color = '#10b981', showLabel = false }: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
