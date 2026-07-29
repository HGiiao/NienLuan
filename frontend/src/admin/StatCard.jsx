import { motion } from 'framer-motion'

export default function StatCard({
  icon: Icon, label, value, change, changeLabel,
  sparkline = [], color = 'primary',
}) {
  const isPositive = change != null && change >= 0

  const colorMap = {
    primary: { icon: 'bg-primary-50 text-primary-500', badge: isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]', line: 'var(--color-chart-2)' },
    sky: { icon: 'bg-primary-50 text-primary-500', badge: isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]', line: '#0EA5E9' },
    emerald: { icon: 'bg-primary-50 text-primary-500', badge: isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]', line: 'var(--color-chart-3)' },
    amber: { icon: 'bg-primary-50 text-primary-500', badge: isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]', line: 'var(--color-chart-2)' },
    rose: { icon: 'bg-primary-50 text-primary-500', badge: isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]', line: 'var(--color-chart-1)' },
    violet: { icon: 'bg-primary-50 text-primary-500', badge: isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]', line: 'var(--color-chart-6)' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <motion.div
      whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      className="relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.icon}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {sparkline.length > 1 && (
          <Sparkline data={sparkline} color={c.line} />
        )}
      </div>
      <p className="text-xs font-medium text-[var(--color-text-tertiary)] mb-0.5">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-[var(--color-text-primary)]">{value}</span>
        {change != null && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${c.badge}`}>
            {isPositive ? '+' : ''}{change}%
          </span>
        )}
        {changeLabel && (
          <span className="text-[11px] text-[var(--color-text-tertiary)]">{changeLabel}</span>
        )}
      </div>
    </motion.div>
  )
}

function Sparkline({ data, color }) {
  if (!data.length) return null
  const max = Math.max(...data) || 1
  const min = Math.min(...data) || 0
  const range = max - min || 1
  const w = 64, h = 28
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-40"
      />
    </svg>
  )
}
